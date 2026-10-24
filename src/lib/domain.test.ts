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
  computeAdminChartData,
  computeInstitutionChartData,
  getLocalTodayDate,
  addDaysToLocalDate,
  sanitizeUserForStorage,
} from './domain';
import { getRoleChatbotConfig, generateFallbackRoleResponse } from './chatbotData';
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
      fullName: 'Karan Saini',
      username: 'karan.saini',
      phone: '+91 98110 44210',
      normalizedPhone: '+919811044210',
      email: 'karan.saini@veridex-aicte.example.org.in',
      dob: '1992-03-14',
      status: 'Active',
      role: 'admin',
      password: 'karan.saini',
      isSystemAccount: true,
      createdAt: '2026-01-10',
    },
    {
      id: 'u2',
      fullName: 'Shreya Kaulgud',
      username: 'shreya.kaulgud',
      phone: '+91 98201 11200',
      normalizedPhone: '+919820111200',
      email: 'shreya.kaulgud23@vesit.example.edu.in',
      dob: '2004-08-19',
      status: 'Active',
      role: 'student',
      password: 'shreya.kaulgud',
      isSystemAccount: true,
      createdAt: '2026-02-01',
    },
  ];

  // Duplicate username (case-insensitive)
  const dupUser = validateAccountUniqueness(
    { username: 'KARAN.SAINI', phone: '9899012345' },
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
    { username: 'nandini.deshpande', phone: '+91 97654 32109' },
    existingUsers
  );
  assert.equal(uniqueCandidate.valid, true);
  assert.equal(uniqueCandidate.normalizedPhone, '+919765432109');
});

test('calculateExpiryDetails handles expiry today, within 45 days, beyond 45 days, and already expired relative to local today', () => {
  const today = getLocalTodayDate();

  // Expiry today (0 days remaining -> Expiring Soon)
  const expiringToday = calculateExpiryDetails(today, today);
  assert.equal(expiringToday.daysRemaining, 0);
  assert.equal(expiringToday.status, 'Expiring Soon');
  assert.equal(expiringToday.label, 'Expires today');

  // Expiry within 45 days (exactly 45 days -> Expiring Soon)
  const expiringIn45 = calculateExpiryDetails(addDaysToLocalDate(today, 45), today);
  assert.equal(expiringIn45.daysRemaining, 45);
  assert.equal(expiringIn45.status, 'Expiring Soon');

  // Expiry just beyond 45 days (46 days -> Valid)
  const validBeyond45 = calculateExpiryDetails(addDaysToLocalDate(today, 46), today);
  assert.equal(validBeyond45.daysRemaining, 46);
  assert.equal(validBeyond45.status, 'Valid');

  // Already expired (-1 day -> Expired)
  const expiredYesterday = calculateExpiryDetails(addDaysToLocalDate(today, -1), today);
  assert.equal(expiredYesterday.daysRemaining, -1);
  assert.equal(expiredYesterday.status, 'Expired');
  assert.equal(expiredYesterday.label, 'Expired 1d ago');
});

test('sanitizeUserForStorage removes plaintext password before localStorage persistence', () => {
  const user: UserAccount = {
    id: 'USR-1',
    fullName: 'Dr. Aashay Khadkikar',
    username: 'aashay.khadkikar',
    phone: '+91 98220 33445',
    normalizedPhone: '+919822033445',
    email: 'aashay.khadkikar@vesit.example.edu.in',
    dob: '1984-06-10',
    status: 'Active',
    role: 'institutional_rep',
    password: 'aashay.khadkikar',
    createdAt: '2026-01-01',
  };
  const sanitized = sanitizeUserForStorage(user);
  assert.equal(sanitized.password, undefined);
  assert.equal('password' in sanitized, false);
});

test('generateInternalDocumentCode produces sequential unique codes for same person/category', () => {
  const existing = ['FAC-QUA-KHA-01', 'FAC-QUA-KHA-02'];
  const nextCode = generateInternalDocumentCode('Qualifications', 'Dr. Aashay Khadkikar', existing);
  assert.equal(nextCode, 'FAC-QUA-KHA-03');
});

test('RBAC data isolation restricts institutional reps and students to authorized VESIT records', () => {
  const repVesit: UserAccount = {
    id: 'u-rep-vesit',
    fullName: 'Dr. Aashay Khadkikar',
    username: 'aashay.khadkikar',
    phone: '+919822033445',
    normalizedPhone: '+919822033445',
    email: 'aashay.khadkikar@vesit.example.edu.in',
    dob: '1984-06-10',
    status: 'Active',
    role: 'institutional_rep',
    institutionId: 'INST-VESIT-104',
    password: 'aashay.khadkikar',
    isSystemAccount: true,
    createdAt: '2026-01-01',
  };

  const appVesit = { id: 'APP-1', institutionId: 'INST-VESIT-104' } as ApplicationRecord;
  const appBlr = { id: 'APP-2', institutionId: 'INST-BLR-209' } as ApplicationRecord;

  assert.equal(canUserAccessApplication(repVesit, appVesit), true);
  assert.equal(canUserAccessApplication(repVesit, appBlr), false);

  const studentUser: UserAccount = {
    ...repVesit,
    id: 'u-stu-1',
    role: 'student',
    fullName: 'Shreya Kaulgud',
  };
  const ownDoc = {
    id: 'DOC-1',
    institutionId: 'INST-VESIT-104',
    personUserId: 'u-stu-1',
    personName: 'Shreya Kaulgud',
  } as DocumentRecord;
  const otherDoc = {
    id: 'DOC-2',
    institutionId: 'INST-VESIT-104',
    personUserId: 'u-fac-1',
    personName: 'Dr. Shravani Salunkhe',
  } as DocumentRecord;

  assert.equal(canUserAccessDocument(studentUser, ownDoc), true);
  assert.equal(canUserAccessDocument(studentUser, otherDoc), false);
});

test('computeDashboardMetrics aggregates counts accurately from records', () => {
  const today = getLocalTodayDate();
  const apps = [
    { status: 'Submitted' },
    { status: 'Additional Information Required' },
    { status: 'Decision Recorded' },
  ] as ApplicationRecord[];
  const docs = [
    {
      issuerVerificationStatus: 'Verified',
      humanReviewStatus: 'Reviewed',
      expiryDate: addDaysToLocalDate(today, 180),
    },
    {
      issuerVerificationStatus: 'Pending',
      humanReviewStatus: 'Pending',
      expiryDate: addDaysToLocalDate(today, -10),
    },
  ] as DocumentRecord[];

  const metrics = computeDashboardMetrics(apps, docs, today);
  assert.equal(metrics.totalApplications, 3);
  assert.equal(metrics.pendingReview, 1);
  assert.equal(metrics.requiringAdditionalInfo, 1);
  assert.equal(metrics.documentsVerified, 1);
  assert.equal(metrics.expiringDocuments, 1);
});

test('computeAdminChartData and computeInstitutionChartData generate valid Recharts series', () => {
  const today = getLocalTodayDate();
  const apps = [
    {
      id: 'APP-2026-0101',
      category: 'Extension of Approval (EoA)',
      status: 'Additional Information Required',
      checklist: [
        { id: 'c1', status: 'Verified' },
        { id: 'c2', status: 'Flagged for Review' },
      ],
    },
    {
      id: 'APP-2026-0103',
      category: 'New Course Approval (AI & Data Science)',
      status: 'Decision Recorded',
      checklist: [
        { id: 'c3', status: 'Verified' },
        { id: 'c4', status: 'Uploaded' },
      ],
    },
  ] as unknown as ApplicationRecord[];

  const docs = [
    {
      category: 'Approvals',
      issuerVerificationStatus: 'Verified',
      humanReviewStatus: 'Reviewed',
      consistencyStatus: 'Consistent',
      completenessStatus: 'Complete',
      anomalyStatus: 'No Anomaly Detected',
      expiryDate: addDaysToLocalDate(today, 200),
    },
    {
      category: 'Infrastructure',
      issuerVerificationStatus: 'Pending',
      humanReviewStatus: 'Pending',
      consistencyStatus: 'Mismatch Flagged',
      completenessStatus: 'Complete',
      anomalyStatus: 'No Anomaly Detected',
      expiryDate: addDaysToLocalDate(today, -5),
    },
  ] as unknown as DocumentRecord[];

  const adminCharts = computeAdminChartData(apps, docs, today);
  assert.equal(adminCharts.statusDistribution.length, 7);
  assert.equal(adminCharts.processingTrends.length, 6);
  assert.equal(adminCharts.processingTrends[5].uploaded, 2);

  const instCharts = computeInstitutionChartData(apps, docs, today);
  assert.equal(instCharts.dossierReadiness.length, 2);
  assert.equal(instCharts.dossierReadiness[0].completionPct, 50);
  assert.equal(instCharts.dossierReadiness[1].completionPct, 100);
  assert.equal(instCharts.expirySummary.length, 3);
});

test('getRoleChatbotConfig provides distinct prompts, questions, and answers for admin, institutional_rep, faculty, and student', () => {
  const ctx = {
    currentUser: null,
    applications: [],
    documents: [],
  };

  const adminCfg = getRoleChatbotConfig('admin', ctx);
  const instCfg = getRoleChatbotConfig('institutional_rep', ctx);
  const facCfg = getRoleChatbotConfig('faculty', ctx);
  const stuCfg = getRoleChatbotConfig('student', ctx);

  assert.equal(adminCfg.prompts.length >= 4, true);
  assert.equal(instCfg.prompts.length >= 4, true);
  assert.equal(facCfg.prompts.length >= 4, true);
  assert.equal(stuCfg.prompts.length >= 4, true);

  // Ensure every role has unique prompt IDs and distinct first questions
  const firstQuestions = new Set([
    adminCfg.prompts[0].question,
    instCfg.prompts[0].question,
    facCfg.prompts[0].question,
    stuCfg.prompts[0].question,
  ]);
  assert.equal(firstQuestions.size, 4);

  const fallbackReply = generateFallbackRoleResponse('student', 'How do I check my GATE scholarship status?', ctx);
  assert.ok(fallbackReply.length > 30);
});

test('every registered account in SEED_USERS has both username and password formatted as firstname.lastname', async () => {
  const { SEED_USERS } = await import('../data/seedData');
  assert.ok(SEED_USERS.length >= 6);
  for (const user of SEED_USERS) {
    assert.match(user.username, /^[a-z]+\.[a-z]+$/);
    assert.equal(user.password, user.username);
  }
});

