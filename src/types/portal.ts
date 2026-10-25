export type Role = 'admin' | 'institutional_rep' | 'faculty' | 'student';

export type SignupRole = 'student' | 'faculty' | 'institutional_rep';

export type AccountStatus = 'Active' | 'Pending Activation' | 'Suspended';

export type ApprovalRequestStatus =
  | 'Pending Approval'
  | 'Correction Requested'
  | 'Approved'
  | 'Rejected';

export type AcademicDepartment = 'CMPN' | 'IT' | 'AURO' | 'EXTC' | 'AIDS';

export type AcademicDivision = 'A' | 'B' | 'C';

export type AcademicYear = 'First Year' | 'Second Year' | 'Third Year' | 'Fourth Year';

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Automated Checks Complete'
  | 'Pending Verification'
  | 'Additional Information Required'
  | 'Under Manual Review'
  | 'Decision Recorded';

export type ChecklistItemStatus =
  | 'Pending Upload'
  | 'Uploaded'
  | 'Verified'
  | 'Flagged for Review';

export type DocumentCategory =
  | 'Approvals'
  | 'Infrastructure'
  | 'Qualifications'
  | 'Experience Certificates'
  | 'Faculty Records'
  | 'Student Records'
  | 'Financial & Trust Deeds';

export type ExpiryStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'No Expiry';

export type VerificationPillarStatus =
  | 'Passed'
  | 'Flagged'
  | 'Pending'
  | 'Action Required'
  | 'Unavailable'
  | 'Advisory';

export interface Institution {
  id: string;
  name: string;
  code: string;
  aictePermanentId: string;
  city: string;
  state: string;
  establishedYear: number;
  affiliatedUniversity: string;
  institutionType: 'Autonomous Institute' | 'Affiliated Technical Campus' | 'Government Aided' | 'Private Unaided';
  representativeName: string;
  representativeEmail: string;
}

export type Gender = 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say';

export interface UserAccount {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  dob: string; // YYYY-MM-DD
  gender?: Gender;
  avatarUrl?: string;
  status: AccountStatus;
  role: Role;
  password?: string;
  credentialDigest?: string;
  isSystemAccount?: boolean;
  createdAt: string;
  // Role-specific attributes
  institutionId?: string;
  institutionName?: string;
  officialInstitutionCode?: string;
  designation?: string;
  authorizationStatus?: 'Verified Nodal Officer' | 'Provisional Signatory' | 'Pending Authorization';
  permissionLevel?: 'Regional Reviewer (Level 2)' | 'National Compliance Auditor (Level 3)';
  employeeId?: string;
  department?: string;
  academicDepartment?: AcademicDepartment;
  academicYear?: AcademicYear;
  division?: AcademicDivision;
  classTeacherDivision?: AcademicDivision;
  joiningDate?: string;
  highestQualification?: string;
  rollNumber?: string;
  course?: string;
  yearSemester?: string;
  approvedFromRequestId?: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  assignedTeacherUserId?: string;
  assignedTeacherName?: string;
  assignedStudentCount?: number;
  workloadSummary?: string;
  officeLocation?: string;
  specialization?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  fromStatus?: ApprovalRequestStatus | 'Submitted';
  toStatus?: ApprovalRequestStatus;
  action?: string;
  actorUserId?: string;
  actorName: string;
  actorUsername?: string;
  actorRole: Role | 'applicant';
  timestamp: string;
  note: string;
}

export interface AccountApprovalRequest {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  dob: string; // YYYY-MM-DD
  gender: Gender;
  requestedRole: SignupRole;
  credentialDigest: string;
  institutionId: string;
  institutionName: string;
  officialInstitutionCode: string;
  academicDepartment?: AcademicDepartment;
  department?: AcademicDepartment;
  academicYear?: AcademicYear;
  division?: AcademicDivision;
  classTeacherDivision?: AcademicDivision;
  status: ApprovalRequestStatus;
  approverRole: 'faculty' | 'institutional_rep' | 'admin';
  assignedApproverRole?: 'faculty' | 'institutional_rep' | 'admin';
  assignedApproverUserId?: string;
  assignedApproverName?: string;
  routedApproverUserIds: string[];
  routedApproverLabel: string;
  noApproverAssigned: boolean;
  approverUnassigned?: boolean;
  submittedAt: string;
  updatedAt?: string;
  decisionNote?: string;
  reviewerNote?: string;
  decidedByUserId?: string;
  decidedByName?: string;
  decidedByRole?: Role;
  decidedAt?: string;
  provisionedUserId?: string;
  history: ApprovalHistoryEntry[];
}

export interface DocumentVersion {
  versionNumber: number;
  fileName: string;
  fileSize: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  uploadedAt: string;
  uploadedBy: string;
  changeNote: string;
}

export interface VerificationFinding {
  id: string;
  pillar:
    | 'Completeness'
    | 'Expiry'
    | 'Consistency'
    | 'Anomaly Indicators'
    | 'Anomaly'
    | 'Issuer Verification'
    | 'Human Review';
  status: VerificationPillarStatus;
  affectedFieldOrPage: string;
  explanation: string;
  evidenceComparison: string;
  suggestedNextAction: string;
}

export interface DocumentRecord {
  id: string;
  internalCode: string; // e.g. FAC-QUA-KAS-02
  name: string;
  category: DocumentCategory;
  suggestedAiCategory: DocumentCategory;
  suggestedFolder: string;
  categoryConfirmed: boolean;
  institutionId: string;
  institutionName: string;
  relatedApplicationId?: string;
  relatedRequestId?: string;
  uploadedFromSection?: string;
  personName: string;
  personUserId?: string;
  uploadedByUserId?: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD or undefined if no expiry
  uploadDate: string; // YYYY-MM-DD
  fileName: string;
  fileSize: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  previewUrl?: string;
  vaultDocumentId?: string;
  hasStoredFileBlob?: boolean;
  ocrStatus?: OcrProcessingStatus;
  ocrExtractedText?: string;
  // Unified Status Tracking
  verificationStatusLabel?: 'Pending Verification' | 'Under Review' | 'Approved' | 'Rejected' | 'Needs Review' | 'Verified in demo';
  approvalStatusLabel?: 'Pending Verification' | 'Under Review' | 'Approved' | 'Rejected' | 'Needs Review' | 'Pending Approval';
  statusUpdatedAt?: string;
  // 6-pillar statuses
  completenessStatus: 'Complete' | 'Missing Pages/Fields' | 'Pending Review';
  consistencyStatus: 'Consistent' | 'Mismatch Flagged' | 'Pending Check';
  anomalyStatus: 'No Anomaly Detected' | 'Suspected Alteration / Duplicate' | 'Not Screened';
  issuerVerificationStatus: 'Verified' | 'Pending' | 'Failed' | 'Not Checked' | 'Unavailable';
  humanReviewStatus: 'Reviewed' | 'Pending' | 'Action Required';
  // Infrastructure / Visual Inspection metadata (optional)
  isInfrastructureEvidence?: boolean;
  facilityAreaSqm?: number;
  advisoryInspectionNote?: string;
  extractedSummary: Record<string, string>;
  findings: VerificationFinding[];
  versions: DocumentVersion[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  required: boolean;
  documentCategory: DocumentCategory;
  linkedDocumentId?: string;
  status: ChecklistItemStatus;
  notes?: string;
}

export interface ReviewNoteEntry {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  timestamp: string;
  actionType:
    | 'Review Note'
    | 'Correction Request'
    | 'Resubmission Response'
    | 'Authorized Decision'
    | 'Status Change';
  note: string;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: string;
  toStatus: ApplicationStatus;
  changedBy: string;
  changedByRole: Role;
  timestamp: string;
  note: string;
}

export type ApplicationCategory =
  | 'Extension of Approval (EoA)'
  | 'New Course Approval (AI & Data Science)'
  | 'Increase in Intake (B.Tech CSE)'
  | 'Infrastructure & Lab Readiness Audit'
  | 'Faculty Cadre Ratio Compliance'
  | 'Post-Graduate Research Center Renewal';

export interface ApplicationRecord {
  id: string; // e.g. APP-2026-0104
  institutionId: string;
  institutionName: string;
  officialInstitutionCode: string;
  category: ApplicationCategory;
  submittedDate: string; // YYYY-MM-DD
  lastUpdated: string; // YYYY-MM-DD
  status: ApplicationStatus;
  decisionOutcome?: 'Compliance Verified — Recommended' | 'Conditional Compliance — Inspection Required' | 'Deficiency Recorded — Deferred';
  assignedReviewer: string;
  checklist: ChecklistItem[];
  documentIds: string[];
  reviewNotes: ReviewNoteEntry[];
  statusHistory: StatusHistoryEntry[];
}

export interface ComplianceRule {
  id: string;
  code: string;
  name: string;
  version: string;
  effectiveDate: string;
  applicableCategory: ApplicationCategory | 'All Categories';
  requiredDocumentCategory: DocumentCategory;
  minValidityDays: number;
  mandatory: boolean;
  active: boolean;
  description: string;
}

export interface PortalNotification {
  id: string;
  recipientRole: Role | 'all';
  recipientUserId?: string;
  userId?: string;
  institutionId?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'expiry_alert' | 'status_change' | 'missing_info' | 'review_request';
  targetView: MainView;
  targetRecordId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorUsername: string;
  actorRole: Role;
  action: string;
  targetType: 'Application' | 'Document' | 'Account' | 'ComplianceRule' | 'ApprovalRequest';
  targetId: string;
  details: string;
}

export type MainView =
  | 'dashboard'
  | 'applications'
  | 'documents'
  | 'verification'
  | 'expiry'
  | 'reports'
  | 'accounts'
  | 'profile'
  | 'settings';

export interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required?: boolean;
  allowedFormats?: string[];
}

export type SubmissionStatus =
  | 'Pending'
  | 'Submitted'
  | 'Verifying'
  | 'Verified in demo'
  | 'Needs review in demo'
  | 'Submission incomplete'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Needs Review';

export interface SubmittedDocumentFile {
  requirementId: string;
  requirementName: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  submittedAt: string;
  previewUrl?: string;
  vaultDocumentId?: string;
  sourceType?: 'upload' | 'vault';
  hasStoredFileBlob?: boolean;
  ocrExtractedText?: string;
  verificationOutcome?: 'Verified in demo' | 'Needs review in demo' | 'Pending' | 'Pending Verification' | 'Approved' | 'Needs Review';
  approvalStatus?: 'Pending Approval' | 'Under Review' | 'Approved' | 'Rejected' | 'Needs Review';
  verificationFeedback?: string;
}

export interface StudentRequestSubmission {
  id: string;
  requestId: string;
  studentId: string;
  studentUserId?: string;
  studentName: string;
  studentUsername?: string;
  studentRollNumber?: string;
  studentEmail?: string;
  status: SubmissionStatus;
  submittedAt?: string;
  verificationStatus?: 'Verified in demo' | 'Needs review in demo' | 'Pending' | 'Pending Verification' | 'Approved' | 'Needs Review';
  verificationStatusLabel?: string;
  approvalStatus?: 'Pending Approval' | 'Under Review' | 'Approved' | 'Rejected' | 'Needs Review';
  approvalStatusLabel?: string;
  verificationFeedback?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewerNote?: string;
  reviewerDecisionNote?: string;
  documents: SubmittedDocumentFile[];
}

export interface DocumentSubmissionRequest {
  id: string;
  title: string;
  description: string;
  creatorUserId: string;
  creatorName: string;
  creatorRole: Role;
  institutionId?: string;
  institutionName?: string;
  department?: string;
  recipientGroupLabel: string;
  recipientStudentIds: string[];
  requiredDocuments: DocumentRequirement[];
  deadline: string; // YYYY-MM-DD
  createdAt: string;
  status: 'Active' | 'Closed';
}

export type OcrProcessingStatus =
  | 'Not Run'
  | 'Processing'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'
  | 'Unsupported';

export type VaultVerificationStatus =
  | 'Uploaded'
  | 'Pending Verification'
  | 'Verified in demo'
  | 'Needs Review';

export type VaultApprovalStatus =
  | 'Not Submitted'
  | 'Approval Pending'
  | 'Under Review'
  | 'Approved'
  | 'Rejected';

export interface VaultEditableDetails {
  title: string;
  documentType?: string;
  category?: DocumentCategory;
  certificateNumber: string;
  documentNumber?: string;
  holderName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  notes?: string;
}

export interface VaultDocumentRecord {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerRole?: Role;
  institutionId?: string;
  institutionName?: string;
  originalFileName: string;
  fileName?: string;
  title?: string;
  documentType?: string;
  captureSource?: 'upload' | 'camera' | 'file_upload' | 'camera_capture';
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  fileSizeBytes: number;
  fileSizeLabel: string;
  category: DocumentCategory;
  documentCategory?: DocumentCategory | string;
  dateAdded: string;
  updatedAt: string;
  hasStoredBlob: boolean;
  hasStoredFileBlob?: boolean;
  ocrStatus: OcrProcessingStatus;
  ocrExtractedText: string;
  ocrEngineUsed?: 'tesseract-image-ocr' | 'pdf-text-layer' | 'manual';
  editableDetails: VaultEditableDetails;
  verificationStatus: VaultVerificationStatus;
  approvalStatus: VaultApprovalStatus;
  notes?: string;
  linkedRepositoryDocId?: string;
}



