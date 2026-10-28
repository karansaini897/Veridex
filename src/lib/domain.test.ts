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
import {
  ApplicationRecord,
  DocumentRecord,
  UserAccount,
  VaultDocumentRecord,
  StudentRequestSubmission,
  DocumentRequirement,
} from '../types/portal';

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

  // Ensure every role has unique prompt IDs
  const allPromptIds = new Set([
    ...adminCfg.prompts.map((p) => p.id),
    ...instCfg.prompts.map((p) => p.id),
    ...facCfg.prompts.map((p) => p.id),
    ...stuCfg.prompts.map((p) => p.id),
  ]);
  const totalPrompts =
    adminCfg.prompts.length +
    instCfg.prompts.length +
    facCfg.prompts.length +
    stuCfg.prompts.length;
  assert.equal(allPromptIds.size, totalPrompts);

  // Requirement: "What's my agenda for the day?" visible to Admin, Institutional Manager, Faculty; strictly NOT Student
  assert.ok(adminCfg.prompts.some((p) => p.question === "What's my agenda for the day?"));
  assert.ok(instCfg.prompts.some((p) => p.question === "What's my agenda for the day?"));
  assert.ok(facCfg.prompts.some((p) => p.question === "What's my agenda for the day?"));
  assert.equal(
    stuCfg.prompts.some((p) => p.question === "What's my agenda for the day?"),
    false
  );

  // Requirement: "Do I have any pending requests?" visible to all 4 roles
  assert.ok(adminCfg.prompts.some((p) => p.question === 'Do I have any pending requests?'));
  assert.ok(instCfg.prompts.some((p) => p.question === 'Do I have any pending requests?'));
  assert.ok(facCfg.prompts.some((p) => p.question === 'Do I have any pending requests?'));
  assert.ok(stuCfg.prompts.some((p) => p.question === 'Do I have any pending requests?'));

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

test('SEED_INSTITUTIONS, SEED_USERS, SEED_APPLICATIONS, and SEED_DOCUMENTS use the exact 6 required colleges and user role mappings', async () => {
  const { SEED_INSTITUTIONS, SEED_USERS, SEED_APPLICATIONS, SEED_DOCUMENTS } = await import('../data/seedData');

  const expectedCollegeNames = [
    'VESIT',
    'D.J. Sanghvi',
    'Veermata Jijabai Technological Institute (VJTI)',
    'NMIMS',
    'University of Mumbai',
    'ST. Xaviers',
  ];
  assert.deepEqual(
    SEED_INSTITUTIONS.map((i) => i.name),
    expectedCollegeNames
  );

  const validIds = new Set(SEED_INSTITUTIONS.map((i) => i.id));
  const validNames = new Set(expectedCollegeNames);

  for (const app of SEED_APPLICATIONS) {
    assert.ok(validIds.has(app.institutionId), `Invalid institutionId on ${app.id}`);
    assert.ok(validNames.has(app.institutionName), `Invalid institutionName on ${app.id}: ${app.institutionName}`);
  }

  for (const doc of SEED_DOCUMENTS) {
    assert.ok(validIds.has(doc.institutionId), `Invalid institutionId on ${doc.id}`);
    assert.ok(validNames.has(doc.institutionName), `Invalid institutionName on ${doc.id}: ${doc.institutionName}`);
  }

  const karan = SEED_USERS.find((u) => u.username === 'karan.saini');
  const aashay = SEED_USERS.find((u) => u.username === 'aashay.khadkikar');
  const shravani = SEED_USERS.find((u) => u.username === 'shravani.salunkhe');
  const shreya = SEED_USERS.find((u) => u.username === 'shreya.kaulgud');
  const rutvi = SEED_USERS.find((u) => u.username === 'rutvi.patkar');
  const gauri = SEED_USERS.find((u) => u.username === 'gauri.sardal');

  assert.equal(karan?.role, 'admin');
  assert.equal(aashay?.role, 'institutional_rep');
  assert.equal(aashay?.institutionName, 'VESIT');

  assert.equal(shravani?.role, 'faculty');
  assert.equal(shravani?.institutionName, 'VESIT');
  assert.equal(shravani?.academicDepartment, 'CMPN');
  assert.equal(shravani?.academicYear, 'Second Year');
  assert.equal(shravani?.classTeacherDivision, 'A');

  assert.equal(shreya?.role, 'student');
  assert.equal(shreya?.institutionName, 'VESIT');
  assert.equal(shreya?.academicDepartment, 'CMPN');
  assert.equal(shreya?.academicYear, 'Second Year');
  assert.equal(shreya?.division, 'A');

  assert.equal(rutvi?.role, 'institutional_rep');
  assert.equal(rutvi?.institutionName, 'Veermata Jijabai Technological Institute (VJTI)');

  assert.equal(gauri?.role, 'institutional_rep');
  assert.equal(gauri?.institutionName, 'D.J. Sanghvi');
});

test('validateSignupSubmission enforces role-specific fields and blocks duplicates across fullName, username, phone, email, and dob', async () => {
  const { SEED_USERS, SEED_APPROVAL_REQUESTS } = await import('../data/seedData');
  const { validateSignupSubmission, ACADEMIC_DEPARTMENTS } = await import('./domain');

  assert.deepEqual([...ACADEMIC_DEPARTMENTS], ['CMPN', 'IT', 'AURO', 'EXTC', 'AIDS']);

  // Missing student academic fields
  const missingStudentScope = validateSignupSubmission(
    {
      requestedRole: 'student',
      fullName: 'Aarav Kulkarni',
      username: 'aarav.kulkarni',
      phone: '+91 98209 55112',
      email: 'aarav.kulkarni@vesit.example.edu.in',
      dob: '2005-04-12',
      gender: 'Male',
      password: 'aarav.kulkarni',
      confirmPassword: 'aarav.kulkarni',
      institutionId: 'INST-VESIT-104',
    },
    SEED_USERS,
    SEED_APPROVAL_REQUESTS
  );
  assert.equal(missingStudentScope.valid, false);
  assert.ok(missingStudentScope.errors.academicDepartment);
  assert.ok(missingStudentScope.errors.academicYear);
  assert.ok(missingStudentScope.errors.division);

  // Duplicate against existing user (fullName, username, phone, email, dob)
  const shreya = SEED_USERS.find((u) => u.username === 'shreya.kaulgud')!;
  const dupAgainstShreya = validateSignupSubmission(
    {
      requestedRole: 'student',
      fullName: 'shreya kaulgud',
      username: 'SHREYA.KAULGUD',
      phone: '098201-11200',
      email: shreya.email.toUpperCase(),
      dob: shreya.dob,
      gender: 'Female',
      password: 'password123',
      confirmPassword: 'password123',
      institutionId: 'INST-VESIT-104',
      academicDepartment: 'CMPN',
      academicYear: 'Second Year',
      division: 'A',
    },
    SEED_USERS,
    SEED_APPROVAL_REQUESTS
  );
  assert.equal(dupAgainstShreya.valid, false);
  assert.ok(dupAgainstShreya.errors.fullName);
  assert.ok(dupAgainstShreya.errors.username);
  assert.ok(dupAgainstShreya.errors.phone);
  assert.ok(dupAgainstShreya.errors.email);
  assert.ok(dupAgainstShreya.errors.dob);

  // Valid unique student submission
  const validStudent = validateSignupSubmission(
    {
      requestedRole: 'student',
      fullName: 'Aarav Kulkarni',
      username: 'aarav.kulkarni',
      phone: '+91 98209 55112',
      email: 'aarav.kulkarni@vesit.example.edu.in',
      dob: '2005-04-12',
      gender: 'Male',
      password: 'aarav.kulkarni',
      confirmPassword: 'aarav.kulkarni',
      institutionId: 'INST-VESIT-104',
      academicDepartment: 'CMPN',
      academicYear: 'Second Year',
      division: 'A',
    },
    SEED_USERS,
    SEED_APPROVAL_REQUESTS
  );
  assert.equal(validStudent.valid, true);
});

test('resolveApprovalRouting, canUserActionApprovalRequest, and buildApprovedUserAccountFromRequest enforce multi-tier approval chain', async () => {
  const { SEED_INSTITUTIONS, SEED_USERS } = await import('../data/seedData');
  const {
    resolveApprovalRouting,
    canUserActionApprovalRequest,
    buildApprovedUserAccountFromRequest,
    computeCredentialDigest,
    verifyUserCredential,
  } = await import('./domain');

  const karan = SEED_USERS.find((u) => u.username === 'karan.saini')!;
  const aashay = SEED_USERS.find((u) => u.username === 'aashay.khadkikar')!;
  const shravani = SEED_USERS.find((u) => u.username === 'shravani.salunkhe')!;
  const shreya = SEED_USERS.find((u) => u.username === 'shreya.kaulgud')!;

  // 1. Student in VESIT CMPN Second Year Div A routes to Class Teacher Dr. Shravani Salunkhe
  const stuRouting = resolveApprovalRouting(
    {
      requestedRole: 'student',
      institutionId: 'INST-VESIT-104',
      academicDepartment: 'CMPN',
      academicYear: 'Second Year',
      division: 'A',
    },
    SEED_USERS,
    SEED_INSTITUTIONS
  );
  assert.equal(stuRouting.approverRole, 'faculty');
  assert.equal(stuRouting.noApproverAssigned, false);
  assert.deepEqual(stuRouting.routedApproverUserIds, [shravani.id]);

  // 2. Faculty in VESIT routes to Institutional Manager Dr. Aashay Khadkikar
  const facRouting = resolveApprovalRouting(
    {
      requestedRole: 'faculty',
      institutionId: 'INST-VESIT-104',
      academicDepartment: 'AURO',
      academicYear: 'Third Year',
      classTeacherDivision: 'B',
    },
    SEED_USERS,
    SEED_INSTITUTIONS
  );
  assert.equal(facRouting.approverRole, 'institutional_rep');
  assert.equal(facRouting.noApproverAssigned, false);
  assert.deepEqual(facRouting.routedApproverUserIds, [aashay.id]);

  // 3. Institutional Manager for NMIMS routes to Admin Karan Saini
  const mgrRouting = resolveApprovalRouting(
    {
      requestedRole: 'institutional_rep',
      institutionId: 'INST-NMIMS-401',
    },
    SEED_USERS,
    SEED_INSTITUTIONS
  );
  assert.equal(mgrRouting.approverRole, 'admin');
  assert.equal(mgrRouting.noApproverAssigned, false);
  assert.deepEqual(mgrRouting.routedApproverUserIds, [karan.id]);

  // Verify authorization checks and account creation upon approval
  const mockStudentReq = {
    id: 'REQ-TEST-101',
    requestedRole: 'student' as const,
    status: 'Pending Approval' as const,
    submittedAt: '2026-10-24 10:00 IST',
    fullName: 'Aarav Kulkarni',
    username: 'aarav.kulkarni',
    phone: '+91 98209 55112',
    normalizedPhone: '+919820955112',
    email: 'aarav.kulkarni@vesit.example.edu.in',
    dob: '2005-04-12',
    gender: 'Male' as const,
    credentialDigest: computeCredentialDigest('aarav.kulkarni', 'aarav.kulkarni'),
    institutionId: 'INST-VESIT-104',
    institutionName: 'VESIT',
    officialInstitutionCode: 'INST-VESIT-104',
    academicDepartment: 'CMPN' as const,
    academicYear: 'Second Year' as const,
    division: 'A' as const,
    approverRole: stuRouting.approverRole,
    routedApproverUserIds: stuRouting.routedApproverUserIds,
    routedApproverLabel: stuRouting.routedApproverLabel,
    noApproverAssigned: stuRouting.noApproverAssigned,
    history: [],
  };

  assert.equal(canUserActionApprovalRequest(shravani, mockStudentReq), true);
  assert.equal(canUserActionApprovalRequest(shreya, mockStudentReq), false);
  assert.equal(canUserActionApprovalRequest(aashay, mockStudentReq), false); // Assigned faculty exists, so manager cannot bypass

  const approvedAccount = buildApprovedUserAccountFromRequest(mockStudentReq, shravani);
  assert.equal(approvedAccount.status, 'Active');
  assert.equal(approvedAccount.role, 'student');
  assert.equal(approvedAccount.institutionName, 'VESIT');
  assert.equal(approvedAccount.academicDepartment, 'CMPN');
  assert.equal(approvedAccount.academicYear, 'Second Year');
  assert.equal(approvedAccount.division, 'A');
  assert.equal(approvedAccount.approvedByUserId, shravani.id);
  assert.equal(verifyUserCredential(approvedAccount, 'aarav.kulkarni'), true);
  assert.equal(verifyUserCredential(approvedAccount, 'wrong.password'), false);
});

test('loadUsersPreservingSeedAccounts preserves all seed user credentials even when storage is missing or partial', async () => {
  const { SEED_USERS } = await import('../data/seedData');
  const { loadUsersPreservingSeedAccounts } = await import('./storage');

  // Even without window.localStorage in Node, seed accounts are preserved intact
  const loadedUsers = loadUsersPreservingSeedAccounts(SEED_USERS);
  assert.equal(loadedUsers.length, SEED_USERS.length);
  for (const seed of SEED_USERS) {
    const found = loadedUsers.find((u) => u.username === seed.username);
    assert.ok(found, `Expected seed user ${seed.username} to be preserved`);
    assert.equal(found.password, seed.password);
    assert.equal(found.role, seed.role);
  }
});

test('Personal Document Vault stores, isolates by ownerUserId, retrieves binary blobs, and deletes cleanly', async () => {
  const {
    saveVaultDocumentWithBlob,
    getVaultDocumentsForUser,
    getVaultDocumentBlob,
    deleteVaultDocument,
    clearMemoryVaultForTesting,
  } = await import('./vaultStorage');
  clearMemoryVaultForTesting();

  const blobContent = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]);
  const sampleRecord = {
    id: 'VAULT-TEST-001',
    ownerUserId: 'USR-STU-SHREYA',
    ownerName: 'Shreya Kaulgud',
    ownerRole: 'student' as const,
    institutionId: 'INST-VESIT-104',
    institutionName: 'VESIT',
    title: 'VESIT Semester IV Marksheet',
    documentType: 'Marksheet / Grade Card',
    category: 'Qualifications' as const,
    originalFileName: 'vesit_sem4_marksheet.pdf',
    mimeType: 'application/pdf' as const,
    fileSizeBytes: blobContent.byteLength,
    fileSizeLabel: '8 B',
    dateAdded: '2026-10-25 10:00 IST',
    updatedAt: '2026-10-25 10:00 IST',
    ocrStatus: 'Completed' as const,
    ocrExtractedText: 'Name: Shreya Kaulgud\nRoll No: 2024CMPN042\nInstitution: VESIT',
    editableDetails: {
      title: 'VESIT Semester IV Marksheet',
      documentType: 'Marksheet / Grade Card',
      category: 'Qualifications' as const,
      holderName: 'Shreya Kaulgud',
      certificateNumber: 'MRK-2026-042',
      issuingAuthority: 'VESIT',
      issueDate: '2026-05-20',
      expiryDate: '',
      notes: 'Verified by user',
    },
    verificationStatus: 'Pending Verification' as const,
    approvalStatus: 'Not Submitted' as const,
    hasStoredBlob: true,
    captureSource: 'file_upload' as const,
  } satisfies VaultDocumentRecord;

  const saveRes = await saveVaultDocumentWithBlob(
    sampleRecord,
    new Blob([blobContent], { type: 'application/pdf' })
  );
  assert.equal(saveRes.ok, true);

  const shreyaDocs = await getVaultDocumentsForUser('USR-STU-SHREYA');
  const otherDocs = await getVaultDocumentsForUser('USR-OTHER-999');

  assert.equal(shreyaDocs.length, 1);
  assert.equal(shreyaDocs[0].title, 'VESIT Semester IV Marksheet');
  assert.equal(otherDocs.length, 0);

  const retrievedBlob = await getVaultDocumentBlob('VAULT-TEST-001');
  assert.ok(retrievedBlob);
  assert.equal(retrievedBlob.size, blobContent.byteLength);

  await deleteVaultDocument('VAULT-TEST-001', 'USR-STU-SHREYA');
  const afterDelete = await getVaultDocumentsForUser('USR-STU-SHREYA');
  assert.equal(afterDelete.length, 0);
});

test('parseSuggestedFieldsFromOcrText extracts draft fields and extractTextFromPdfInBrowser reads selectable PDF text', async () => {
  const { parseSuggestedFieldsFromOcrText, extractTextFromPdfInBrowser } = await import('./ocrEngine');

  const rawText = [
    'Vivekanand Education Society Institute of Technology (VESIT)',
    'Semester IV Grade Card & Marksheet',
    'Student Name: Shreya Kaulgud',
    'Certificate No: CERT-VESIT-8891',
    'Date of Issue: 2026-04-15',
  ].join('\n');

  const parsed = parseSuggestedFieldsFromOcrText(rawText, 'sem4_marksheet.pdf', 'Shreya Kaulgud');
  assert.equal(parsed.holderName, 'Shreya Kaulgud');
  assert.equal(parsed.certificateNumber, 'CERT-VESIT-8891');
  assert.equal(parsed.issueDate, '2026-04-15');
  assert.ok(parsed.issuingAuthority?.includes('VESIT'));

  // Create a synthetic PDF blob with a BT ... (text) Tj ... ET text stream
  const pdfString = `%PDF-1.4
1 0 obj
<< /Length 74 >>
stream
BT
/F1 12 Tf
72 712 Td
(Shreya Kaulgud VESIT Semester IV Marksheet) Tj
ET
endstream
endobj
%%EOF`;
  const encoder = new TextEncoder();
  const pdfBlob = new Blob([encoder.encode(pdfString)], { type: 'application/pdf' });
  const pdfRes = await extractTextFromPdfInBrowser(pdfBlob);
  assert.equal(pdfRes.isScannedOrEmpty, false);
  assert.ok(pdfRes.text.includes('Shreya Kaulgud VESIT Semester IV Marksheet'));
});

test('Verification vs Approval separation and independent per-request reuse of Vault documents', async () => {
  const {
    buildSubmittedFileFromVaultDocument,
    resolveRepositoryStatusesFromSubmission,
    applyReviewerDecisionToSubmission,
  } = await import('./domain');

  const vaultDoc: VaultDocumentRecord = {
    id: 'VAULT-REUSE-101',
    ownerUserId: 'USR-STU-SHREYA',
    ownerName: 'Shreya Kaulgud',
    ownerRole: 'student',
    institutionId: 'INST-VESIT-104',
    institutionName: 'VESIT',
    title: 'VESIT Student ID Card',
    documentType: 'Student ID Card',
    category: 'Student Records',
    originalFileName: 'shreya_vesit_id.png',
    mimeType: 'image/png',
    fileSizeBytes: 84200,
    fileSizeLabel: '82.2 KB',
    dateAdded: '2026-10-25 09:30 IST',
    updatedAt: '2026-10-25 09:30 IST',
    ocrStatus: 'Completed',
    ocrExtractedText: 'VESIT Student ID - Shreya Kaulgud - CMPN',
    editableDetails: {
      title: 'VESIT Student ID Card',
      documentType: 'Student ID Card',
      category: 'Student Records',
      holderName: 'Shreya Kaulgud',
      certificateNumber: 'ID-2026-042',
      issuingAuthority: 'VESIT',
      issueDate: '2025-07-01',
      expiryDate: '2028-06-30',
      notes: '',
    },
    verificationStatus: 'Pending Verification',
    approvalStatus: 'Not Submitted',
    hasStoredBlob: true,
    captureSource: 'file_upload',
  };

  const requirement: DocumentRequirement = {
    id: 'REQ-DOC-ID',
    name: 'College ID Card',
    description: 'Valid college identity card',
    required: true,
  };

  // Reuse the same vault document across two different requests
  const fileForReq1 = buildSubmittedFileFromVaultDocument(
    requirement,
    vaultDoc,
    '2026-10-25 10:15 IST',
    'Verified in demo'
  );
  const fileForReq2 = buildSubmittedFileFromVaultDocument(
    requirement,
    vaultDoc,
    '2026-10-25 10:20 IST',
    'Verified in demo'
  );

  // Verify Demo Verification does NOT auto-approve the file
  assert.equal(fileForReq1.verificationOutcome, 'Verified in demo');
  assert.equal(fileForReq1.approvalStatus, 'Pending Approval');
  assert.equal(fileForReq1.vaultDocumentId, 'VAULT-REUSE-101');
  assert.equal(fileForReq1.sourceType, 'vault');

  const sub1: StudentRequestSubmission = {
    id: 'SUB-1',
    requestId: 'REQ-TYPE-BONAFIDE',
    studentId: 'USR-STU-SHREYA',
    studentName: 'Shreya Kaulgud',
    studentUsername: 'shreya.kaulgud',
    submittedAt: '2026-10-25 10:15 IST',
    status: 'Under Review',
    approvalStatus: 'Pending Approval',
    documents: [fileForReq1],
  };

  const sub2: StudentRequestSubmission = {
    ...sub1,
    id: 'SUB-2',
    requestId: 'REQ-TYPE-INTERNSHIP',
    submittedAt: '2026-10-25 10:20 IST',
    documents: [fileForReq2],
  };

  // Repository status mapping when Demo Verification completes:
  // issuerVerificationStatus is 'Verified', but humanReviewStatus MUST remain 'Pending' (never auto-approved)
  const initialRepoStatus = resolveRepositoryStatusesFromSubmission(fileForReq1);
  assert.equal(initialRepoStatus.verificationStatusLabel, 'Verified in demo');
  assert.equal(initialRepoStatus.issuerVerificationStatus, 'Verified');
  assert.equal(initialRepoStatus.humanReviewStatus, 'Pending');
  assert.equal(initialRepoStatus.approvalStatusLabel, 'Under Review');

  // Reviewer approves Request 1 (sub1)
  const updatedSubmissions = applyReviewerDecisionToSubmission(
    [sub1, sub2],
    'SUB-1',
    'Approved',
    { fullName: 'Dr. Shravani Salunkhe', role: 'faculty' },
    'Verified against department roll list.'
  );

  const approvedSub1 = updatedSubmissions.find((s) => s.id === 'SUB-1')!;
  const untouchedSub2 = updatedSubmissions.find((s) => s.id === 'SUB-2')!;

  assert.equal(approvedSub1.status, 'Approved');
  assert.equal(approvedSub1.approvalStatus, 'Approved');
  assert.equal(approvedSub1.documents[0].approvalStatus, 'Approved');

  // Request 2 (sub2) and the Vault record remain completely unaffected by Request 1's approval
  assert.equal(untouchedSub2.status, 'Under Review');
  assert.equal(untouchedSub2.approvalStatus, 'Pending Approval');
  assert.equal(untouchedSub2.documents[0].approvalStatus, 'Pending Approval');
  assert.equal(vaultDoc.approvalStatus, 'Not Submitted');
});

test('SIH PPT 6-Pillar evaluation, Document-to-Form Prefill, and Legacy Vault Record Normalization', async () => {
  const {
    extractDocumentPrefillSuggestion,
    evaluateDocumentCompleteness,
    runCrossDocumentConsistencyChecks,
    runRuleBasedAnomalyScreening,
    evaluateDocumentSixPillars,
  } = await import('./domain');
  const { normalizeVaultDocumentRecord } = await import('./vaultStorage');
  const { SEED_DOCUMENTS, SEED_APPLICATIONS } = await import('../data/seedData');

  // 1. Backward-compatible Vault record normalization
  const legacyVaultRaw = {
    id: 'VAULT-LEGACY-77',
    ownerUserId: 'USR-FAC-SHRAVANI',
    ownerName: 'Dr. Shravani Salunkhe',
    institutionId: 'INST-VESIT-104',
    institutionName: 'VESIT',
    fileName: 'legacy_phd_degree.pdf',
    title: 'Ph.D. Degree Scroll',
    documentCategory: 'Qualifications',
    mimeType: 'application/pdf',
    fileSizeBytes: 124000,
    fileSizeLabel: '121 KB',
    hasStoredFileBlob: true,
    editableDetails: {
      documentNumber: 'UOM-PHD-2021-904',
      holderName: 'Dr. Shravani Salunkhe',
      issuingAuthority: 'University of Mumbai',
      issueDate: '2021-08-14',
    },
  };

  const normalized = normalizeVaultDocumentRecord(legacyVaultRaw);
  assert.equal(normalized.originalFileName, 'legacy_phd_degree.pdf');
  assert.equal(normalized.fileName, 'legacy_phd_degree.pdf');
  assert.equal(normalized.category, 'Qualifications');
  assert.equal(normalized.editableDetails.title, 'Ph.D. Degree Scroll');
  assert.equal(normalized.editableDetails.certificateNumber, 'UOM-PHD-2021-904');
  assert.equal(normalized.hasStoredBlob, true);

  // 2. Document-to-form prefill extraction
  const prefill = extractDocumentPrefillSuggestion(normalized, 'Dr. Shravani Salunkhe');
  assert.equal(prefill.title, 'Ph.D. Degree Scroll');
  assert.equal(prefill.certificateNumber, 'UOM-PHD-2021-904');
  assert.equal(prefill.holderName, 'Dr. Shravani Salunkhe');
  assert.equal(prefill.issuingAuthority, 'University of Mumbai');
  assert.equal(prefill.category, 'Qualifications');

  // 3. Completeness & Rule-Based Anomaly Screening (inverted dates + duplicate certificate number)
  const sampleExistingDoc = SEED_DOCUMENTS[0];
  const anomalousDoc = {
    ...sampleExistingDoc,
    id: 'DOC-ANOMALY-TEST-99',
    internalCode: 'APR-VES-99',
    name: 'Test Fire NOC Certificate',
    personName: `${sampleExistingDoc.personName} MiddleName`, // Name variation across same application/category!
    certificateNumber: sampleExistingDoc.certificateNumber, // Duplicate cert number across records!
    issueDate: '2026-09-15',
    expiryDate: '2026-04-01', // Expiry date earlier than issue date!
    issuerVerificationStatus: 'Not Checked' as const,
    humanReviewStatus: 'Pending' as const,
    findings: [],
  };

  const completeness = evaluateDocumentCompleteness(anomalousDoc);
  assert.equal(completeness.completenessStatus, 'Complete');

  const consistency = runCrossDocumentConsistencyChecks(
    anomalousDoc,
    [sampleExistingDoc],
    SEED_APPLICATIONS
  );
  assert.equal(consistency.consistencyStatus, 'Mismatch Flagged');
  assert.ok(consistency.findings.some((f) => f.pillar === 'Consistency'));

  const anomaly = runRuleBasedAnomalyScreening(
    anomalousDoc,
    [sampleExistingDoc],
    '2026-05-15'
  );
  assert.equal(anomaly.anomalyStatus, 'Suspected Alteration / Duplicate');
  assert.ok(anomaly.findings.some((f) => f.pillar === 'Anomaly'));

  const sixPillars = evaluateDocumentSixPillars(
    anomalousDoc,
    [sampleExistingDoc],
    SEED_APPLICATIONS,
    '2026-05-15'
  );
  assert.equal(sixPillars.completenessStatus, 'Complete');
  assert.equal(sixPillars.consistencyStatus, 'Mismatch Flagged');
  assert.equal(sixPillars.anomalyStatus, 'Suspected Alteration / Duplicate');
  // Strict separation: Issuer Verification remains 'Not Checked' and Human Review remains 'Pending'
  assert.equal(sixPillars.issuerVerificationStatus, 'Not Checked');
  assert.equal(sixPillars.humanReviewStatus, 'Pending');
  assert.ok(sixPillars.findings.some((f) => f.pillar === 'Expiry'));
});

test('Zero em dashes in seed records, chatbot responses, and non-destructive localStorage normalization', async () => {
  const { SEED_USERS, SEED_DOCUMENTS, SEED_APPLICATIONS, SEED_AUDIT_EVENTS } = await import(
    '../data/seedData'
  );
  const { loadValidatedArrayFromStorage, isValidStoredApplication } = await import('./storage');

  const emDashChar = '\u2014';

  const serializedSeeds = JSON.stringify({
    SEED_USERS,
    SEED_DOCUMENTS,
    SEED_APPLICATIONS,
    SEED_AUDIT_EVENTS,
  });
  assert.equal(
    serializedSeeds.includes(emDashChar),
    false,
    'Seed records must not contain any em dashes'
  );

  const ctx = {
    currentUser: SEED_USERS[0],
    applications: SEED_APPLICATIONS,
    documents: SEED_DOCUMENTS,
  };
  for (const role of ['public', 'admin', 'institutional_rep', 'faculty', 'student'] as const) {
    const cfg = getRoleChatbotConfig(role, ctx);
    for (const p of cfg.prompts) {
      assert.equal(p.question.includes(emDashChar), false);
      assert.equal(p.answer.includes(emDashChar), false);
    }
  }

  // Verify legacy cached localStorage records have em dashes normalized non-destructively on load
  const fakeStorage = {
    getItem: () =>
      JSON.stringify([
        {
          id: 'APP-LEGACY-1',
          institutionId: 'INST-VESIT-104',
          institutionName: 'VESIT',
          officialInstitutionCode: 'W-MH-VESIT-104',
          category: 'New Course Approval',
          submittedDate: emDashChar,
          lastUpdated: '2026-10-20',
          status: 'Draft',
          assignedReviewer: 'Karan Saini',
          decisionOutcome: `Compliance Verified ${emDashChar} Recommended`,
          checklist: [],
          documentIds: [],
          reviewNotes: [],
          statusHistory: [],
        },
      ]),
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 1,
  } as Storage;

  const loadedApps = loadValidatedArrayFromStorage(
    'test_apps',
    [],
    isValidStoredApplication,
    fakeStorage
  );
  assert.equal(loadedApps.length, 1);
  assert.equal(loadedApps[0].submittedDate, 'Not Submitted');
  assert.equal(loadedApps[0].decisionOutcome, 'Compliance Verified: Recommended');
});

test('Institutional Role Uniqueness enforces one active Institutional Manager per college and frees vacated slots', async () => {
  const { SEED_USERS, SEED_INSTITUTIONS, SEED_APPROVAL_REQUESTS } = await import(
    '../data/seedData'
  );
  const {
    getInstitutionRoleAvailability,
    validateSignupSubmission,
    removePersonnelFromAssignment,
  } = await import('./domain');

  const availabilityList = getInstitutionRoleAvailability(
    'institutional_rep',
    SEED_INSTITUTIONS,
    SEED_USERS,
    SEED_APPROVAL_REQUESTS
  );
  const vesitAvail = availabilityList.find((a) => a.institution.id === 'INST-VESIT-104')!;
  const nmimsAvail = availabilityList.find((a) => a.institution.id === 'INST-NMIMS-401')!;

  // 1. VESIT already has an active Institutional Manager (Dr. Aashay Khadkikar)
  assert.equal(vesitAvail.available, false);
  assert.equal(vesitAvail.occupiedByUser?.username, 'aashay.khadkikar');

  // 2. NMIMS has no active Institutional Manager
  assert.equal(nmimsAvail.available, true);
  assert.equal(nmimsAvail.occupiedByUser, null);

  // 3. Sign-Up validation blocks applying for Institutional Manager at VESIT
  const blockedRes = validateSignupSubmission(
    {
      requestedRole: 'institutional_rep',
      fullName: 'Dr. Vikramaditya Kulkarni',
      username: 'vikramaditya.kulkarni',
      password: 'vikramaditya.kulkarni',
      confirmPassword: 'vikramaditya.kulkarni',
      phone: '+91 98190 77889',
      email: 'vikramaditya.kulkarni@vesit.edu.in',
      dob: '1981-04-12',
      gender: 'Male',
      institutionId: 'INST-VESIT-104',
    },
    SEED_USERS,
    SEED_APPROVAL_REQUESTS,
    SEED_INSTITUTIONS,
    '2026-10-25'
  );
  assert.equal(blockedRes.valid, false);
  assert.ok(blockedRes.errors.institutionId?.includes('Dr. Aashay Khadkikar'));

  // 4. Sign-Up validation allows applying for Institutional Manager at NMIMS
  const allowedRes = validateSignupSubmission(
    {
      requestedRole: 'institutional_rep',
      fullName: 'Dr. Vikramaditya Kulkarni',
      username: 'vikramaditya.kulkarni',
      password: 'vikramaditya.kulkarni',
      confirmPassword: 'vikramaditya.kulkarni',
      phone: '+91 98190 77889',
      email: 'vikramaditya.kulkarni@nmims.edu.in',
      dob: '1981-04-12',
      gender: 'Male',
      institutionId: 'INST-NMIMS-401',
    },
    SEED_USERS,
    SEED_APPROVAL_REQUESTS,
    SEED_INSTITUTIONS,
    '2026-10-25'
  );
  assert.equal(allowedRes.valid, true);

  // 5. Vacating Dr. Aashay Khadkikar's position frees VESIT for a new Institutional Manager
  const admin = SEED_USERS.find((u) => u.role === 'admin')!;
  const aashay = SEED_USERS.find((u) => u.username === 'aashay.khadkikar')!;
  const vacatedRes = removePersonnelFromAssignment({
    actor: admin,
    targetUserId: aashay.id,
    users: SEED_USERS,
    reason: 'Completed term as nodal signatory.',
    timestamp: '25 Oct 2026, 12:00 IST',
  });
  assert.equal(vacatedRes.success, true);

  const availAfterVacate = getInstitutionRoleAvailability(
    'institutional_rep',
    SEED_INSTITUTIONS,
    vacatedRes.users,
    SEED_APPROVAL_REQUESTS
  ).find((a) => a.institution.id === 'INST-VESIT-104')!;
  assert.equal(availAfterVacate.available, true);
});

test('Hierarchical Authority enforces rank and institutional scope boundaries', async () => {
  const { SEED_USERS } = await import('../data/seedData');
  const { canManagePersonnel } = await import('./domain');

  const admin = SEED_USERS.find((u) => u.username === 'karan.saini')!;
  const vesitIr = SEED_USERS.find((u) => u.username === 'aashay.khadkikar')!;
  const djsIr = SEED_USERS.find((u) => u.username === 'gauri.sardal')!;
  const vesitFac1 = SEED_USERS.find((u) => u.username === 'shravani.salunkhe')!;
  const vesitFac2 = SEED_USERS.find((u) => u.username === 'rajesh.nayak')!;
  const vesitStu = SEED_USERS.find((u) => u.username === 'shreya.kaulgud')!;

  // Admin can manage IR, Faculty, and Student across any institution
  assert.equal(canManagePersonnel(admin, vesitIr, 'edit_assignment').allowed, true);
  assert.equal(canManagePersonnel(admin, djsIr, 'edit_assignment').allowed, true);
  assert.equal(canManagePersonnel(admin, vesitFac1, 'edit_assignment').allowed, true);

  // Institutional Manager can manage Faculty and Students in their own college, but NOT other colleges or Admins
  assert.equal(canManagePersonnel(vesitIr, vesitFac1, 'edit_assignment').allowed, true);
  assert.equal(canManagePersonnel(vesitIr, vesitStu, 'edit_assignment').allowed, true);
  assert.equal(canManagePersonnel(vesitIr, djsIr, 'edit_assignment').allowed, false);
  assert.equal(canManagePersonnel(djsIr, vesitFac1, 'edit_assignment').allowed, false);
  assert.equal(canManagePersonnel(vesitIr, admin, 'edit_assignment').allowed, false);

  // Faculty can manage subordinate Students in their department, but NOT fellow Faculty or Superiors
  assert.equal(canManagePersonnel(vesitFac1, vesitStu, 'edit_assignment').allowed, true);
  assert.equal(canManagePersonnel(vesitFac1, vesitFac2, 'edit_assignment').allowed, false);
  assert.equal(canManagePersonnel(vesitFac1, vesitIr, 'edit_assignment').allowed, false);

  // No self-management via subordinate hierarchy controls
  assert.equal(canManagePersonnel(vesitIr, vesitIr, 'edit_assignment').allowed, false);
});

test('Organisational Assignment Conflict Resolution and Remove from Assignment vs Remove Institutional Association', async () => {
  const { SEED_USERS, SEED_INSTITUTIONS } = await import('../data/seedData');
  const {
    detectAssignmentConflict,
    applyOrganisationalAssignmentChange,
    removePersonnelFromAssignment,
    removeInstitutionalAssociation,
    getEffectiveAssignmentStatus,
    getEffectiveAssociationStatus,
  } = await import('./domain');

  const vesitIr = SEED_USERS.find((u) => u.username === 'aashay.khadkikar')!;
  const rajesh = SEED_USERS.find((u) => u.username === 'rajesh.nayak')!; // CMPN · Third Year · Div B

  // 1. Attempting to assign Rajesh to CMPN · Second Year · Div A detects conflict with Dr. Shravani Salunkhe
  const conflict = detectAssignmentConflict(
    rajesh,
    {
      institutionId: 'INST-VESIT-104',
      academicDepartment: 'CMPN',
      academicYear: 'Second Year',
      classTeacherDivision: 'A',
    },
    SEED_USERS,
    SEED_INSTITUTIONS
  );
  assert.equal(conflict.hasConflict, true);
  assert.equal(conflict.conflictingUser?.username, 'shravani.salunkhe');

  // 2. Calling applyOrganisationalAssignmentChange without conflictResolution blocks silent overwrite
  const blockedChange = applyOrganisationalAssignmentChange({
    actor: vesitIr,
    targetUserId: rajesh.id,
    patch: {
      academicDepartment: 'CMPN',
      academicYear: 'Second Year',
      classTeacherDivision: 'A',
    },
    users: SEED_USERS,
    institutions: SEED_INSTITUTIONS,
    timestamp: '25 Oct 2026, 12:05 IST',
  });
  assert.equal(blockedChange.success, false);
  assert.equal(blockedChange.requiresConflictResolution, true);
  assert.ok(blockedChange.conflict?.hasConflict);

  // 3. Resolving conflict via 'release_conflicting_holder' releases Shravani ('Reassignment Required') and assigns Rajesh
  const resolvedChange = applyOrganisationalAssignmentChange({
    actor: vesitIr,
    targetUserId: rajesh.id,
    patch: {
      academicDepartment: 'CMPN',
      academicYear: 'Second Year',
      classTeacherDivision: 'A',
      note: 'Reassigned to Second Year Div A Class Teacher.',
    },
    users: SEED_USERS,
    institutions: SEED_INSTITUTIONS,
    conflictResolution: 'release_conflicting_holder',
    timestamp: '25 Oct 2026, 12:10 IST',
  });
  assert.equal(resolvedChange.success, true);

  const updatedShravani = resolvedChange.users.find(
    (u) => u.username === 'shravani.salunkhe'
  )!;
  const updatedRajesh = resolvedChange.users.find(
    (u) => u.username === 'rajesh.nayak'
  )!;
  assert.equal(getEffectiveAssignmentStatus(updatedShravani), 'Reassignment Required');
  assert.equal(updatedShravani.classTeacherDivision, undefined);
  assert.equal(getEffectiveAssociationStatus(updatedShravani), 'Active'); // Still affiliated with VESIT!
  assert.equal(getEffectiveAssignmentStatus(updatedRajesh), 'Assigned');
  assert.equal(updatedRajesh.classTeacherDivision, 'A');
  assert.equal(updatedRajesh.academicYear, 'Second Year');

  // 4. Students in CMPN · Second Year · Div A (e.g., Shreya Kaulgud) automatically sync to the new Class Teacher (Rajesh)
  const updatedShreya = resolvedChange.users.find(
    (u) => u.username === 'shreya.kaulgud'
  )!;
  assert.equal(updatedShreya.assignedTeacherUserId, updatedRajesh.id);

  // 5. Remove from Assignment vs Remove Institutional Association
  const sunita = resolvedChange.users.find((u) => u.username === 'sunita.kulkarni')!;
  const assignRemoved = removePersonnelFromAssignment({
    actor: vesitIr,
    targetUserId: sunita.id,
    users: resolvedChange.users,
    reason: 'Sabbatical leave from departmental teaching.',
    timestamp: '25 Oct 2026, 12:15 IST',
  });
  assert.equal(assignRemoved.success, true);
  const sunitaAfterAssignRemoval = assignRemoved.users.find(
    (u) => u.username === 'sunita.kulkarni'
  )!;
  assert.equal(getEffectiveAssignmentStatus(sunitaAfterAssignRemoval), 'Reassignment Required');
  assert.equal(getEffectiveAssociationStatus(sunitaAfterAssignRemoval), 'Active');
  assert.equal(sunitaAfterAssignRemoval.institutionId, 'INST-VESIT-104');

  const assocRemoved = removeInstitutionalAssociation({
    actor: vesitIr,
    targetUserId: sunitaAfterAssignRemoval.id,
    users: assignRemoved.users,
    reason: 'Transferred out of institution.',
    timestamp: '25 Oct 2026, 12:20 IST',
  });
  assert.equal(assocRemoved.success, true);
  const sunitaAfterAssocRemoval = assocRemoved.users.find(
    (u) => u.username === 'sunita.kulkarni'
  )!;
  assert.equal(getEffectiveAssociationStatus(sunitaAfterAssocRemoval), 'Removed');
  assert.equal(getEffectiveAssignmentStatus(sunitaAfterAssocRemoval), 'Unassigned');
  assert.equal(sunitaAfterAssocRemoval.status, 'Suspended');
  assert.equal(sunitaAfterAssocRemoval.previousInstitutionId, 'INST-VESIT-104');
  // Historical identity and credentials remain intact
  assert.equal(sunitaAfterAssocRemoval.username, 'sunita.kulkarni');
});

test('SIH26261: evaluateCrossDocumentConsistencyMatrix, evaluateDocumentAuthenticityChecks, evaluateApplicationComplianceMatrix, and resolveDocumentFindingWithJustification work accurately and honestly', async () => {
  const { SEED_APPLICATIONS, SEED_DOCUMENTS, SEED_COMPLIANCE_RULES } = await import('../data/seedData');
  const {
    evaluateCrossDocumentConsistencyMatrix,
    evaluateDocumentAuthenticityChecks,
    evaluateApplicationComplianceMatrix,
    resolveDocumentFindingWithJustification,
    computeSihValidationSummary,
  } = await import('./domain');

  const app = SEED_APPLICATIONS[0];
  const linkedDocs = SEED_DOCUMENTS.filter(
    (d) => app.documentIds.includes(d.id) || d.relatedApplicationId === app.id
  );

  // 1. Cross-Document Consistency Matrix
  const matrix = evaluateCrossDocumentConsistencyMatrix(app, linkedDocs);
  assert.ok(matrix.length >= 4);
  const instRow = matrix.find((r) => r.fieldName.includes('Institution Name'));
  assert.ok(instRow);
  assert.equal(instRow.status, 'Passed');

  // 2. Document Authenticity Checks with honest status labels
  const sampleDoc = linkedDocs[0] || SEED_DOCUMENTS[0];
  const authChecks = evaluateDocumentAuthenticityChecks(sampleDoc, SEED_DOCUMENTS, '2026-10-28');
  assert.equal(authChecks.length, 8);
  const dscCheck = authChecks.find((c) => c.category === 'Digital Signature Validation');
  const qrCheck = authChecks.find((c) => c.category === 'QR Code Detection & Validation');
  assert.equal(dscCheck?.status, 'Unable to verify');
  assert.equal(dscCheck?.requiresExternalAuthority, true);
  assert.equal(qrCheck?.status, 'Unable to verify');
  assert.equal(qrCheck?.requiresExternalAuthority, true);

  // 3. Regulatory Compliance Matrix
  const complianceRows = evaluateApplicationComplianceMatrix(
    app,
    linkedDocs,
    SEED_COMPLIANCE_RULES,
    '2026-10-28'
  );
  assert.ok(complianceRows.length > 0);
  for (const row of complianceRows) {
    assert.ok(row.ruleCode);
    assert.ok(row.ruleVersion);
    assert.ok(['Passed', 'Review required', 'Failed', 'Pending'].includes(row.status));
  }

  // 4. Reviewer Finding Resolution requires justification and updates finding status
  const flaggedDoc = SEED_DOCUMENTS.find((d) => d.findings.some((f) => f.status === 'Flagged')) || SEED_DOCUMENTS[0];
  const targetFinding = flaggedDoc.findings[0];
  assert.throws(() =>
    resolveDocumentFindingWithJustification(
      flaggedDoc,
      targetFinding.id,
      { fullName: 'Karan Saini', role: 'admin' },
      'Resolved',
      '   '
    )
  );

  const resolvedDoc = resolveDocumentFindingWithJustification(
    flaggedDoc,
    targetFinding.id,
    { fullName: 'Karan Saini', role: 'admin' },
    'Resolved',
    'Verified original gazette notification and university scroll; middle initial expansion confirmed.',
    '28 Oct 2026, 10:30 IST'
  );
  const updatedFinding = resolvedDoc.findings.find((f) => f.id === targetFinding.id)!;
  assert.equal(updatedFinding.status, 'Passed');
  assert.equal(updatedFinding.resolutionDecision, 'Resolved');
  assert.ok(updatedFinding.resolvedByReviewer?.includes('Karan Saini'));

  // 5. Validation Summary
  const summary = computeSihValidationSummary(SEED_APPLICATIONS, SEED_DOCUMENTS, '2026-10-28');
  assert.equal(typeof summary.awaitingReview, 'number');
  assert.equal(typeof summary.missingDocumentsCount, 'number');
  assert.equal(typeof summary.validationFlagsCount, 'number');
  assert.equal(typeof summary.findingsRequiringHumanReview, 'number');
});

test('validateContactEnquiryInput validates required fields, email format, category, and optional reference', async () => {
  const { validateContactEnquiryInput } = await import('./domain');

  const invalid = validateContactEnquiryInput({
    name: 'A',
    email: 'invalid-email',
    category: 'Unknown category',
    subject: 'Hi',
    message: 'Too short',
    applicationReference: 'BAD REF $$$',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.category);
  assert.ok(invalid.errors.subject);
  assert.ok(invalid.errors.message);
  assert.ok(invalid.errors.applicationReference);

  const valid = validateContactEnquiryInput({
    name: 'Dr. Aashay Khadkikar',
    email: 'aashay.khadkikar@vesit.example.edu.in',
    category: 'Document verification concern',
    subject: 'Clarification on Fire NOC renewal window',
    message: 'We have uploaded the renewed municipal fire safety certificate for APP-2026-0104 and request re-verification.',
    applicationReference: 'APP-2026-0104',
  });
  assert.equal(valid.valid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
  assert.equal(valid.sanitized.applicationReference, 'APP-2026-0104');
});



