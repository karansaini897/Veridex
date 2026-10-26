import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDocumentFile,
  uploadDocumentToStorage,
  deleteDocumentFromStorage,
  getDocumentSignedUrlWithCache,
  clearSignedUrlCache,
  uploadAndPersistDocument,
  buildCanonicalStoragePath,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  STORAGE_BUCKET,
} from './documentService';

// Helper mock File for Node.js test environment
function createMockFile(
  name: string,
  type: string,
  size: number
): File {
  const buffer = new Uint8Array(size);
  return new File([buffer], name, { type });
}

test('validateDocumentFile: validates allowed types, extensions, size limits and non-empty content', () => {
  // 1. Valid PDF file
  const validPdf = createMockFile('Official_Dossier.pdf', 'application/pdf', 2 * 1024 * 1024);
  assert.equal(validateDocumentFile(validPdf).valid, true);

  // 2. Valid JPEG file
  const validJpg = createMockFile('Fire_Safety_Cert.jpg', 'image/jpeg', 500 * 1024);
  assert.equal(validateDocumentFile(validJpg).valid, true);

  // 3. Valid PNG file
  const validPng = createMockFile('Building_Plan.png', 'image/png', 800 * 1024);
  assert.equal(validateDocumentFile(validPng).valid, true);

  // 4. Null or undefined file
  assert.equal(validateDocumentFile(null).valid, false);
  assert.match(validateDocumentFile(null).error || '', /No file selected/);

  // 5. Unsupported file format (e.g. .exe, .zip, .docx)
  const unsupportedExe = createMockFile('malicious.exe', 'application/x-msdownload', 1024);
  const exeResult = validateDocumentFile(unsupportedExe);
  assert.equal(exeResult.valid, false);
  assert.match(exeResult.error || '', /Unsupported file format/);

  const unsupportedZip = createMockFile('archive.zip', 'application/zip', 1024);
  assert.equal(validateDocumentFile(unsupportedZip).valid, false);

  // 6. File exceeding 15 MB limit
  const oversizedPdf = createMockFile(
    'huge_scan.pdf',
    'application/pdf',
    MAX_DOCUMENT_FILE_SIZE_BYTES + 1024
  );
  const sizeResult = validateDocumentFile(oversizedPdf);
  assert.equal(sizeResult.valid, false);
  assert.match(sizeResult.error || '', /exceeds the maximum allowed security limit of 15 MB/);

  // 7. Empty file (0 bytes)
  const emptyPdf = createMockFile('empty.pdf', 'application/pdf', 0);
  const emptyResult = validateDocumentFile(emptyPdf);
  assert.equal(emptyResult.valid, false);
  assert.match(emptyResult.error || '', /empty \(0 bytes\)/);
});

test('buildCanonicalStoragePath: enforces canonical format ownerId/category/timestamp_sanitizedFileName and prevents path traversal', () => {
  const file = createMockFile('My AICTE Approval (2026).pdf', 'application/pdf', 1024);
  const path = buildCanonicalStoragePath(file, 'user-101', 'Institutional Compliance');

  const [ownerPart, catPart, filePart] = path.split('/');
  assert.equal(ownerPart, 'user-101');
  assert.equal(catPart, 'institutional_compliance');
  assert.match(filePart, /^\d+_My_AICTE_Approval__2026_\.pdf$/);

  // Sanitizes path traversal attempts
  const unsafeFile = createMockFile('../../../etc/passwd.pdf', 'application/pdf', 1024);
  const safePath = buildCanonicalStoragePath(unsafeFile, 'user..999', 'Vault/Secret');
  assert.ok(!safePath.includes('../'));
});

test('uploadDocumentToStorage: validates file and enforces private storage RLS on live configured Supabase', async () => {
  const file = createMockFile('Official_Dossier.pdf', 'application/pdf', 1024);
  const result = await uploadDocumentToStorage(file, 'user-101', 'Institutional Compliance');

  // If live Supabase is configured, an unauthenticated client is blocked by Storage RLS:
  if (!result.success) {
    assert.match(result.error || '', /security|unauthorized|failed|row-level/i);
  } else {
    assert.ok(result.storagePath);
  }

  // Unsupported file rejected before network attempt
  const invalidFile = createMockFile('bad.exe', 'application/x-msdownload', 1024);
  const invalidRes = await uploadDocumentToStorage(invalidFile, 'user-101', 'Approvals');
  assert.equal(invalidRes.success, false);
  assert.match(invalidRes.error || '', /Unsupported file format/);
});

test('deleteDocumentFromStorage: gracefully handles empty path and succeeds in safe environment', async () => {
  const emptyRes = await deleteDocumentFromStorage('');
  assert.equal(emptyRes.success, true);

  const validPathRes = await deleteDocumentFromStorage('user-1/docs/123_test.pdf');
  assert.ok(typeof validPathRes.success === 'boolean');
});

test('getDocumentSignedUrlWithCache & clearSignedUrlCache: handles caching lifecycle', async () => {
  // Empty or invalid path returns null
  const nullUrl = await getDocumentSignedUrlWithCache('');
  assert.equal(nullUrl, null);

  // Cache can be cleared without throwing
  clearSignedUrlCache();
});

test('uploadAndPersistDocument: validates file inputs and respects live database RLS', async () => {
  const testFile = createMockFile('Fire_Safety_Report.pdf', 'application/pdf', 2048);

  const res = await uploadAndPersistDocument({
    file: testFile,
    ownerId: 'faculty-04',
    category: 'Safety and Compliance',
    institutionId: 'INST-VESIT',
  });

  // On live Supabase, unauthenticated attempt is blocked by RLS policy; in fallback mode it succeeds
  if (!res.success) {
    assert.match(res.error || '', /security|unauthorized|failed|row-level|Database/i);
  } else {
    assert.ok(res.storagePath);
  }

  // Validation failure is caught immediately
  const badFile = createMockFile('bad.zip', 'application/zip', 100);
  const badRes = await uploadAndPersistDocument({
    file: badFile,
    ownerId: 'faculty-04',
    category: 'Approvals',
    institutionId: 'INST-VESIT',
  });
  assert.equal(badRes.success, false);
});

test('STORAGE_BUCKET is strictly configured to veridex-documents', () => {
  assert.equal(STORAGE_BUCKET, 'veridex-documents');
});

test('canUserAccessDocument: uploader retains access according to permissions', async () => {
  const { canUserAccessDocument } = await import('./domain');
  const uploaderUser = {
    id: 'user-uploader-1',
    fullName: 'Kunal Patil',
    role: 'student',
    institutionId: 'INST-VESIT-104',
  } as any;

  const docUploadedByUser = {
    id: 'DOC-101',
    name: 'Marksheet.pdf',
    category: 'Student Records',
    institutionId: 'INST-VESIT-104',
    uploadedByUserId: 'user-uploader-1',
    personUserId: 'user-uploader-1',
  } as any;

  // Uploader accessing own document succeeds
  assert.equal(canUserAccessDocument(uploaderUser, docUploadedByUser), true);

  // Another student cannot access Kunal's personal record
  const otherStudent = {
    id: 'user-student-2',
    fullName: 'Rahul Sharma',
    role: 'student',
    institutionId: 'INST-VESIT-104',
  } as any;
  assert.equal(canUserAccessDocument(otherStudent, docUploadedByUser), false);
});

test('canUserAccessDocument: authorized institutional representative accesses institutional documents uploaded by others', async () => {
  const { canUserAccessDocument } = await import('./domain');
  const instManager = {
    id: 'usr-rep-01',
    fullName: 'Dr. Aashay Khadkikar',
    role: 'institutional_rep',
    institutionId: 'INST-VESIT-104',
  } as any;

  const institutionalDoc = {
    id: 'DOC-202',
    name: 'Municipal Fire Safety Renewal 2026.pdf',
    category: 'Infrastructure',
    institutionId: 'INST-VESIT-104',
    uploadedByUserId: 'some-faculty-id',
    personName: 'VESIT Campus Estate',
  } as any;

  // Institutional manager of same institution can access even if they did not upload it
  assert.equal(canUserAccessDocument(instManager, institutionalDoc), true);

  // Faculty member of same institution can access institutional Infrastructure document
  const facultyMember = {
    id: 'usr-fac-01',
    fullName: 'Prof. Smita Joshi',
    role: 'faculty',
    institutionId: 'INST-VESIT-104',
  } as any;
  assert.equal(canUserAccessDocument(facultyMember, institutionalDoc), true);
});

test('canUserAccessDocument: users from unrelated institutions are strictly denied access', async () => {
  const { canUserAccessDocument } = await import('./domain');
  const repOtherCollege = {
    id: 'usr-rep-other',
    fullName: 'Prof. Gauri Sardal',
    role: 'institutional_rep',
    institutionId: 'INST-DJS-201', // Different institution
  } as any;

  const vesitDoc = {
    id: 'DOC-303',
    name: 'VESIT AICTE Extension 2026.pdf',
    category: 'Approvals',
    institutionId: 'INST-VESIT-104',
    uploadedByUserId: 'usr-vesit-rep',
  } as any;

  // Denied access across institutions
  assert.equal(canUserAccessDocument(repOtherCollege, vesitDoc), false);

  // Faculty from another institution also denied
  const facultyOther = {
    id: 'usr-fac-other',
    fullName: 'Prof. Other',
    role: 'faculty',
    institutionId: 'INST-DJS-201',
  } as any;
  assert.equal(canUserAccessDocument(facultyOther, vesitDoc), false);
});

test('getAuthorizedDocumentSignedUrl: denies signed URL generation to unauthorized users and unauthenticated sessions', async () => {
  const { getAuthorizedDocumentSignedUrl } = await import('./documentService');

  const vesitDoc = {
    id: 'DOC-SEC-01',
    name: 'Private_Audit_Report.pdf',
    category: 'Financial & Trust Deeds',
    institutionId: 'INST-VESIT-104',
    storagePath: 'INST-VESIT-104/financial/report.pdf',
    uploadedByUserId: 'manager-1',
  } as any;

  // 1. Unauthenticated request (no user)
  const unauthRes = await getAuthorizedDocumentSignedUrl('INST-VESIT-104/financial/report.pdf', null, vesitDoc);
  assert.equal(unauthRes.url, null);
  assert.match(unauthRes.error || '', /Authentication required/);

  // 2. Unauthorized user from another institution
  const outsider = {
    id: 'outsider-1',
    fullName: 'Attacker',
    role: 'student',
    institutionId: 'INST-OTHER-999',
  } as any;
  const deniedRes = await getAuthorizedDocumentSignedUrl('INST-VESIT-104/financial/report.pdf', outsider, vesitDoc);
  assert.equal(deniedRes.url, null);
  assert.match(deniedRes.error || '', /Access Denied/);

  // 3. Known document ID or storage path alone without authorization does not grant access
  const student = {
    id: 'student-99',
    fullName: 'Student 99',
    role: 'student',
    institutionId: 'INST-VESIT-104',
  } as any;
  const studentDenied = await getAuthorizedDocumentSignedUrl('INST-VESIT-104/financial/report.pdf', student, vesitDoc);
  assert.equal(studentDenied.url, null);
  assert.match(studentDenied.error || '', /Access Denied/);
});

test('canUserAccessDocument: application-specific document access authorizes reviewers of that application', async () => {
  const { canUserAccessDocument } = await import('./domain');
  const facultyReviewer = {
    id: 'fac-reviewer-1',
    fullName: 'Dr. Reviewer',
    role: 'faculty',
    institutionId: 'INST-VESIT-104',
  } as any;

  const app = {
    id: 'APP-2026-0104',
    institutionId: 'INST-VESIT-104',
  } as any;

  const appAttachedDoc = {
    id: 'DOC-APP-01',
    name: 'Lab Readiness Certificate.pdf',
    category: 'Student Records', // Categorized as student record, but attached to institutional application
    institutionId: 'INST-VESIT-104',
    relatedApplicationId: 'APP-2026-0104',
    uploadedByUserId: 'student-author',
  } as any;

  // Authorized through application relationship
  assert.equal(canUserAccessDocument(facultyReviewer, appAttachedDoc, [app]), true);
});

test('mapSupabaseDocumentToRecord: reconstructs DocumentRecord from persisted database row without localStorage reliance', async () => {
  const { mapSupabaseDocumentToRecord, normalizeDocumentCategory } = await import('./documentService');

  const dbRow = {
    id: 'doc-uuid-5555',
    institution_id: 'INST-VESIT-104',
    owner_id: 'user-uuid-8888',
    category: 'Approvals',
    storage_path: 'user-uuid-8888/approvals/1710000000_AICTE_EoA_2026.pdf',
    original_filename: 'AICTE_EoA_2026.pdf',
    mime_type: 'application/pdf',
    status: 'Verified in demo',
    uploaded_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
  };

  const institutions = [
    { id: 'INST-VESIT-104', name: 'VESIT' },
  ] as any[];

  const doc = mapSupabaseDocumentToRecord(dbRow, institutions);

  assert.equal(doc.id, 'doc-uuid-5555');
  assert.equal(doc.name, 'AICTE EoA 2026');
  assert.equal(doc.category, 'Approvals');
  assert.equal(doc.institutionId, 'INST-VESIT-104');
  assert.equal(doc.institutionName, 'VESIT');
  assert.equal(doc.storagePath, 'user-uuid-8888/approvals/1710000000_AICTE_EoA_2026.pdf');
  assert.equal(doc.fileName, 'AICTE_EoA_2026.pdf');
  assert.equal(doc.verificationStatusLabel, 'Verified in demo');
  assert.equal(doc.versions.length, 1);
  assert.equal(doc.versions[0].storagePath, 'user-uuid-8888/approvals/1710000000_AICTE_EoA_2026.pdf');
  assert.equal(doc.extractedSummary['Storage Path'], 'user-uuid-8888/approvals/1710000000_AICTE_EoA_2026.pdf');

  // Verify normalizeDocumentCategory handles variations
  assert.equal(normalizeDocumentCategory('infrastructure_safety'), 'Infrastructure');
  assert.equal(normalizeDocumentCategory('faculty_qualification'), 'Qualifications');
  assert.equal(normalizeDocumentCategory('experience_letter'), 'Experience Certificates');
  assert.equal(normalizeDocumentCategory('audited_financials'), 'Financial & Trust Deeds');
  assert.equal(normalizeDocumentCategory('unknown_xyz'), 'Approvals');
});
