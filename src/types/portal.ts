export type Role = 'admin' | 'institutional_rep' | 'faculty' | 'student';

export type AccountStatus = 'Active' | 'Pending Activation' | 'Suspended';

export interface UserAccount {
  id: string;
  fullName: string;
  username: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  dob: string; // YYYY-MM-DD
  gender?: 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say';
  avatarUrl?: string;
  status: AccountStatus;
  role: Role;
  password: string; // Demo credential for prototype verification
  isDemoAccount: boolean;
  createdAt: string;

  // Institutional affiliation (for institutional_rep, faculty, student)
  institutionId?: string;
  institutionName?: string;
  officialInstitutionCode?: string;

  // Institutional representative fields
  designation?: string;
  authorizationStatus?: 'Verified Nodal Officer' | 'Provisional Signatory' | 'Revoked';

  // Admin fields
  permissionLevel?: 'Regional Reviewer (Level 2)' | 'National Compliance Auditor (Level 3)';

  // Faculty/Staff fields
  employeeId?: string;
  department?: string;
  joiningDate?: string;
  highestQualification?: string;

  // Student fields
  rollNumber?: string;
  course?: string;
  yearSemester?: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  aictePermanentId: string;
  city: string;
  state: string;
  establishedYear: number;
  affiliatedUniversity: string;
  institutionType: 'Private Unaided' | 'Government Aided' | 'Autonomous Institute';
  representativeName: string;
  representativeEmail: string;
}

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Automated Checks Complete'
  | 'Pending Verification'
  | 'Additional Information Required'
  | 'Under Manual Review'
  | 'Decision Recorded';

export type ApplicationCategory =
  | 'Extension of Approval (EoA) 2026-27'
  | 'New Course Approval (AI & Data Science)'
  | 'Increase in Intake (B.Tech CSE)'
  | 'Infrastructure & Lab Readiness Audit'
  | 'Faculty Cadre Ratio Compliance'
  | 'Post-Graduate Research Center Renewal';

export interface ChecklistItem {
  id: string;
  title: string;
  required: boolean;
  documentCategory: DocumentCategory;
  linkedDocumentId?: string;
  status: 'Pending Upload' | 'Uploaded' | 'Verified (Simulated)' | 'Flagged for Review';
  notes?: string;
}

export interface ReviewNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  timestamp: string;
  note: string;
  actionType: 'Review Note' | 'Correction Request' | 'Resubmission Response' | 'Authorized Decision';
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: ApplicationStatus | 'Created';
  toStatus: ApplicationStatus;
  changedBy: string;
  changedByRole: Role;
  timestamp: string;
  note: string;
}

export interface ApplicationRecord {
  id: string;
  institutionId: string;
  institutionName: string;
  officialInstitutionCode: string;
  category: ApplicationCategory;
  academicYear: string;
  submittedDate: string;
  lastUpdated: string;
  status: ApplicationStatus;
  decisionOutcome?:
    | 'Compliance Verified — Recommended (Simulated)'
    | 'Conditional Compliance — Inspection Required (Simulated)'
    | 'Deficiency Recorded — Deferred (Simulated)';
  checklist: ChecklistItem[];
  documentIds: string[];
  reviewNotes: ReviewNote[];
  statusHistory: StatusHistoryEntry[];
  assignedReviewer: string;
}

export type DocumentCategory =
  | 'Student Records'
  | 'Faculty Records'
  | 'Qualifications'
  | 'Experience Certificates'
  | 'Infrastructure'
  | 'Approvals'
  | 'Financial & Trust Deeds';

export type VerificationPillar =
  | 'Completeness'
  | 'Expiry'
  | 'Consistency'
  | 'Anomaly Indicators'
  | 'Issuer Verification'
  | 'Human Review';

export interface VerificationFinding {
  id: string;
  pillar: VerificationPillar;
  status:
    | 'Passed (Simulated)'
    | 'Flagged (Simulated)'
    | 'Pending'
    | 'Unavailable'
    | 'Reviewed'
    | 'Action Required';
  affectedFieldOrPage: string;
  explanation: string;
  evidenceComparison: string;
  suggestedNextAction: string;
}

export interface DocumentVersion {
  versionNumber: number;
  fileName: string;
  fileSize: string;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  changeNote: string;
}

export type ExpiryStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'No Expiry';

export interface DocumentRecord {
  id: string;
  internalCode: string; // e.g., FAC-QUA-KAS-02
  name: string;
  category: DocumentCategory;
  suggestedAiCategory: DocumentCategory;
  suggestedFolder: string;
  categoryConfirmed: boolean;
  institutionId: string;
  institutionName: string;
  relatedApplicationId?: string;
  personName: string;
  personUserId?: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  uploadDate: string;
  fileName: string;
  fileSize: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  completenessStatus: 'Complete (Simulated)' | 'Missing Pages/Fields (Simulated)';
  consistencyStatus: 'Consistent (Simulated)' | 'Mismatch Flagged (Simulated)';
  anomalyStatus: 'No Anomaly Detected (Simulated)' | 'Suspected Alteration / Duplicate (Simulated)';
  issuerVerificationStatus:
    | 'Verified (Simulated)'
    | 'Failed (Simulated)'
    | 'Pending'
    | 'Unavailable'
    | 'Not Checked';
  humanReviewStatus: 'Pending' | 'Reviewed' | 'Action Required';
  extractedSummary: Record<string, string>;
  findings: VerificationFinding[];
  versions: DocumentVersion[];
  isInfrastructureEvidence?: boolean;
  facilityAreaSqm?: number;
  advisoryInspectionNote?: string;
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
  institutionId?: string;
  recipientUserId?: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: 'review_request' | 'status_change' | 'missing_info' | 'expiry_alert';
  targetView:
    | 'dashboard'
    | 'applications'
    | 'documents'
    | 'verification'
    | 'expiry'
    | 'reports'
    | 'profile'
    | 'settings';
  targetRecordId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorName: string;
  actorUsername: string;
  actorRole: Role;
  action: string;
  targetType: 'Application' | 'Document' | 'Account' | 'ComplianceRule' | 'System';
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
