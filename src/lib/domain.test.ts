import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhoneNumber,
  calculateAgeFromDob,
  validateAccountUniqueness,
  calculateExpiryDetails,
  generateInternalDocumentCode,
  canUserAccessApplication,
  canUserAccessDocument,
  computeDashboardMetrics,
} from './domain';
import { ApplicationRecord, DocumentRecord, UserAccount } from '../types/portal';

test('normalizePhoneNumber normalizes formatting variants to identical canonical format', () => {
  assert.equal(normalizePhoneNumber('98201 11200'), '+919820111200');
  assert.equal(normalizePhoneNumber('+91-98201-11200'), '+919820111200');
  assert.equal(normalizePhoneNumber('09820111200'), '+919820111200');
  assert.equal(normalizePhoneNumber('(98201) 11200'), '+919820111200');
});

test('calculateAgeFromDob calculates exact age from date of birth', () => {
  assert.equal(calculateAgeFromDob('1980-05-14', '2026-10-23'), 46);
  assert.equal(calculateAgeFromDob('1980-11-02', '2026-10-23'), 45);
  assert.equal(calculateAgeFromDob('invalid-date', '2026-10-23'), null);
});

test('validateAccountUniqueness detects duplicate username and normalized phone across roles', () => {
  const existingUsers: UserAccount[] = [
    {
      id: 'u1',
      fullName: 'Rajeshwari Sharma',
      username: 'admin.sharma',
      phone: '+91 98110 44210',
      normalizedPhone: '+919811044210',
      email: 'r.sharma@aicte-demo.org.in',
      dob: '1978-03-12',
      status: 'Active',
      role: 'admin',
      password: 'demo',
      isDemoAccount: true,
      createdAt: '2026-01-10',
    },
    {
      id: 'u2',
      fullName: 'Ananya Deshmukh',
      username: 'stu.deshmukh',
      phone: '+91 98201 11200',
      normalizedPhone: '+919820111200',
      email: 'ananya@vitpune-demo.edu.in',
      dob: '2004-08-19',
      status: 'Active',
      role: 'student',
      password: 'demo',
      isDemoAccount: true,
      createdAt: '2026-02-01',
    },
  ];

  // Duplicate username (case-insensitive)
  const dupUser = validateAccountUniqueness(
    { username: 'ADMIN.SHARMA', phone: '9899012345' },
    existingUsers
  );
  assert.equal(dupUser.valid, false);
  assert.ok(dupUser.errors.username);

  // Duplicate phone formatted differently across student role
  const dupPhone = validateAccountUniqueness(
    { username: 'new.faculty', phone: '098201-11200' },
    existingUsers
  );
  assert.equal(dupPhone.valid, false);
  assert.ok(dupPhone.errors.phone);

  // Valid unique candidate
  const uniqueCandidate = validateAccountUniqueness(
    { username: 'fac.joshi', phone: '+91 97654 32109' },
    existingUsers
  );
  assert.equal(uniqueCandidate.valid, true);
  assert.equal(uniqueCandidate.normalizedPhone, '+919765432109');
});

test('calculateExpiryDetails computes Valid, Expiring Soon, and Expired accurately', () => {
  const expired = calculateExpiryDetails('2026-10-03', '2026-10-23');
  assert.equal(expired.status, 'Expired');
  assert.equal(expired.daysRemaining, -20);

  const soon = calculateExpiryDetails('2026-11-12', '2026-10-23');
  assert.equal(soon.status, 'Expiring Soon');
  assert.equal(soon.daysRemaining, 20);

  const valid = calculateExpiryDetails('2027-06-30', '2026-10-23');
  assert.equal(valid.status, 'Valid');
  assert.ok((valid.daysRemaining ?? 0) > 200);
});

test('generateInternalDocumentCode produces sequential unique codes for same person/category', () => {
  const existing = ['FAC-QUA-KAS-01', 'FAC-QUA-KAS-02'];
  const nextCode = generateInternalDocumentCode('Qualifications', 'Dr. Arvind Kashyap', existing);
  assert.equal(nextCode, 'FAC-QUA-KAS-03');
});

test('RBAC data isolation restricts institutional reps and students to authorized records', () => {
  const repPune: UserAccount = {
    id: 'u-rep-pune',
    fullName: 'Dr. Arvind Kashyap',
    username: 'rep.kashyap',
    phone: '+919822033445',
    normalizedPhone: '+919822033445',
    email: 'registrar@vitpune-demo.edu.in',
    dob: '1975-06-10',
    status: 'Active',
    role: 'institutional_rep',
    institutionId: 'INST-PUNE-104',
    password: 'demo',
    isDemoAccount: true,
    createdAt: '2026-01-01',
  };

  const appPune = { id: 'APP-1', institutionId: 'INST-PUNE-104' } as ApplicationRecord;
  const appBlr = { id: 'APP-2', institutionId: 'INST-BLR-209' } as ApplicationRecord;

  assert.equal(canUserAccessApplication(repPune, appPune), true);
  assert.equal(canUserAccessApplication(repPune, appBlr), false);

  const studentUser: UserAccount = {
    ...repPune,
    id: 'u-stu-1',
    role: 'student',
    fullName: 'Ananya Deshmukh',
  };
  const ownDoc = {
    id: 'DOC-1',
    institutionId: 'INST-PUNE-104',
    personUserId: 'u-stu-1',
    personName: 'Ananya Deshmukh',
  } as DocumentRecord;
  const otherDoc = {
    id: 'DOC-2',
    institutionId: 'INST-PUNE-104',
    personUserId: 'u-fac-1',
    personName: 'Dr. Siddharth Kulkarni',
  } as DocumentRecord;

  assert.equal(canUserAccessDocument(studentUser, ownDoc), true);
  assert.equal(canUserAccessDocument(studentUser, otherDoc), false);
});

test('computeDashboardMetrics aggregates counts accurately from records', () => {
  const apps = [
    { status: 'Submitted' },
    { status: 'Additional Information Required' },
    { status: 'Decision Recorded' },
  ] as ApplicationRecord[];
  const docs = [
    {
      issuerVerificationStatus: 'Verified (Simulated)',
      humanReviewStatus: 'Reviewed',
      expiryDate: '2027-08-01',
    },
    {
      issuerVerificationStatus: 'Pending',
      humanReviewStatus: 'Pending',
      expiryDate: '2026-10-01',
    },
  ] as DocumentRecord[];

  const metrics = computeDashboardMetrics(apps, docs, '2026-10-23');
  assert.equal(metrics.totalApplications, 3);
  assert.equal(metrics.pendingReview, 1);
  assert.equal(metrics.requiringAdditionalInfo, 1);
  assert.equal(metrics.documentsVerified, 1);
  assert.equal(metrics.expiringDocuments, 1);
});
