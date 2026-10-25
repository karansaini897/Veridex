import {
  AcademicDepartment,
  AcademicDivision,
  AcademicYear,
  AccountApprovalRequest,
  ApplicationCategory,
  ApplicationRecord,
  ChecklistItem,
  DocumentCategory,
  DocumentRecord,
  DocumentRequirement,
  ExpiryStatus,
  Institution,
  Role,
  SignupRole,
  StudentRequestSubmission,
  SubmittedDocumentFile,
  UserAccount,
  VaultDocumentRecord,
  VerificationFinding,
} from '../types/portal';


export const ACADEMIC_DEPARTMENTS: readonly AcademicDepartment[] = [
  'CMPN',
  'IT',
  'AURO',
  'EXTC',
  'AIDS',
] as const;

export const ACADEMIC_DIVISIONS: readonly AcademicDivision[] = ['A', 'B', 'C'] as const;

export const ACADEMIC_YEARS: readonly AcademicYear[] = [
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
] as const;

export const GENDER_OPTIONS: ReadonlyArray<NonNullable<UserAccount['gender']>> = [
  'Female',
  'Male',
  'Non-binary',
  'Prefer not to say',
] as const;

export function formatRoleDisplayName(role: Role | SignupRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'institutional_rep':
      return 'Institutional Manager';
    case 'faculty':
      return 'Faculty';
    case 'student':
      return 'Student';
  }
}

/**
 * Deterministic one-way credential digest so plaintext passwords are never persisted
 * in localStorage, approval requests, audit logs, notifications, or exports.
 * Supports both computeCredentialDigest(password) and computeCredentialDigest(username, password).
 */
export function computeCredentialDigest(
  usernameOrPassword: string,
  maybePassword?: string
): string {
  const rawPassword = maybePassword !== undefined ? maybePassword : usernameOrPassword;
  const normalized = `veridex::v1::${rawPassword}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch ^ (i & 0xff);
    h2 = Math.imul(h2, 0x5bd1e995);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `vdx1_${hex1}${hex2}`;
}

export function verifyUserCredential(user: UserAccount, candidatePassword: string): boolean {
  if (!candidatePassword) return false;
  if (user.credentialDigest) {
    return user.credentialDigest === computeCredentialDigest(candidatePassword);
  }
  if (user.password !== undefined) {
    return user.password === candidatePassword;
  }
  return false;
}

/**
 * Returns the current local calendar date in YYYY-MM-DD format.
 */
export function getLocalTodayDate(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD calendar date string into a local Date object.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
}

/**
 * Returns a date string (YYYY-MM-DD) offset by `daysOffset` from a base YYYY-MM-DD date.
 */
export function addDaysToLocalDate(baseDateStr: string, daysOffset: number): string {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + daysOffset));
  return dt.toISOString().slice(0, 10);
}

/**
 * Convenience helper for seed data or relative date generation from today's local date.
 */
export function offsetDateFromToday(daysOffset: number): string {
  return addDaysToLocalDate(getLocalTodayDate(), daysOffset);
}

/**
 * Returns an ISO 8601 timestamp for the current moment, plus a formatted display string.
 */
export function getCurrentIsoTimestamp(now: Date = new Date()): string {
  return now.toISOString();
}

export function formatTimestampForDisplay(isoOrDisplay: string): string {
  if (!isoOrDisplay) return '';
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(isoOrDisplay)) {
    return isoOrDisplay;
  }
  const parsed = new Date(isoOrDisplay);
  if (Number.isNaN(parsed.getTime())) return isoOrDisplay;
  const datePart = getLocalTodayDate(parsed);
  const hours = String(parsed.getHours()).padStart(2, '0');
  const mins = String(parsed.getMinutes()).padStart(2, '0');
  return `${datePart} ${hours}:${mins}`;
}

/**
 * Generates a collision-safe unique record identifier with a semantic prefix.
 */
let recordSequenceCounter = 1000;
export function createRecordId(prefix: string): string {
  recordSequenceCounter += 1;
  const randomSuffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 6).toUpperCase()
      : Math.floor(100000 + Math.random() * 900000).toString();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${recordSequenceCounter}-${randomSuffix}`;
}

/**
 * Strips plaintext passwords before persisting user records to browser localStorage.
 */
export function sanitizeUserForStorage(user: UserAccount): UserAccount {
  const copy: UserAccount = { ...user };
  if (copy.password && !copy.credentialDigest) {
    copy.credentialDigest = computeCredentialDigest(copy.password);
  }
  delete copy.password;
  return copy;
}

/**
 * Normalizes full name for case-insensitive uniqueness comparisons.
 */
export function normalizeFullName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalizes Indian / international phone numbers to a canonical +91XXXXXXXXXX format
 * so uniqueness checks catch differently formatted duplicates (e.g. "+91 98201 11200" vs "098201-11200").
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/**
 * Validates that a normalized phone number represents a valid 10-digit Indian mobile number (+91XXXXXXXXXX)
 * or valid 10-to-13 digit international number.
 */
export function isValidPhoneNumber(rawPhone: string): boolean {
  const norm = normalizePhoneNumber(rawPhone);
  return /^\+91[6-9]\d{9}$/.test(norm) || /^\+\d{10,13}$/.test(norm);
}

export function isValidEmailAddress(rawEmail: string): boolean {
  const trimmed = rawEmail.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export const isValidEmail = isValidEmailAddress;

/**
 * Calculates age in whole years from a YYYY-MM-DD Date of Birth relative to a reference YYYY-MM-DD date.
 */
export function calculateAgeFromDob(dob: string, referenceDate: string = getLocalTodayDate()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [birthY, birthM, birthD] = dob.split('-').map(Number);
  const [refY, refM, refD] = referenceDate.split('-').map(Number);
  if (!birthY || !birthM || !birthD) return null;

  let age = refY - birthY;
  if (refM < birthM || (refM === birthM && refD < birthD)) {
    age -= 1;
  }
  return age >= 0 && age < 120 ? age : null;
}

/**
 * Validates uniqueness of username and normalized phone across all user accounts.
 */
export function validateAccountUniqueness(
  candidate: {
    username: string;
    phone: string;
    excludeUserId?: string;
  },
  existingUsers: UserAccount[]
): {
  valid: boolean;
  normalizedPhone: string;
  errors: { username?: string; phone?: string };
} {
  const cleanUsername = candidate.username.trim().toLowerCase();
  const normalizedPhone = normalizePhoneNumber(candidate.phone);
  const errors: { username?: string; phone?: string } = {};

  if (!cleanUsername || cleanUsername.length < 3) {
    errors.username = 'Username must be at least 3 characters.';
  } else {
    const usernameTaken = existingUsers.some(
      (u) =>
        u.id !== candidate.excludeUserId &&
        u.username.trim().toLowerCase() === cleanUsername
    );
    if (usernameTaken) {
      errors.username = `Username "${candidate.username.trim()}" is already registered to another account.`;
    }
  }

  if (!isValidPhoneNumber(candidate.phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number (e.g. +91 98201 11200).';
  } else {
    const phoneTaken = existingUsers.some(
      (u) =>
        u.id !== candidate.excludeUserId &&
        u.normalizedPhone === normalizedPhone
    );
    if (phoneTaken) {
      errors.phone = `Phone number ${normalizedPhone} is already linked to an existing VERIDEX account.`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    normalizedPhone,
    errors,
  };
}

export interface SignupCandidateInput {
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  username: string;
  gender: string;
  password?: string;
  confirmPassword?: string;
  requestedRole: SignupRole;
  institutionId: string;
  academicDepartment?: string;
  department?: string;
  academicYear?: string;
  division?: string;
  classTeacherDivision?: string;
  excludeRequestId?: string;
  skipPasswordValidation?: boolean;
}

export type SignupFieldErrorKey =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'dob'
  | 'username'
  | 'gender'
  | 'password'
  | 'confirmPassword'
  | 'institutionId'
  | 'academicDepartment'
  | 'department'
  | 'academicYear'
  | 'division'
  | 'classTeacherDivision';

export function validateSignupSubmission(
  candidate: SignupCandidateInput,
  existingUsers: UserAccount[],
  existingRequests: AccountApprovalRequest[],
  allowedInstitutions?: Institution[],
  excludeRequestIdOrTodayDate?: string
): {
  valid: boolean;
  normalizedPhone: string;
  normalizedUsername: string;
  normalizedEmail: string;
  errors: Record<string, string>;
  fieldErrors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const cleanFullName = candidate.fullName.trim().replace(/\s+/g, ' ');
  const normalizedUsername = candidate.username.trim().toLowerCase();
  const normalizedEmail = candidate.email.trim().toLowerCase();
  const normalizedPhone = normalizePhoneNumber(candidate.phone);
  const cleanDob = candidate.dob.trim();

  const isDateFifthArg =
    excludeRequestIdOrTodayDate && /^\d{4}-\d{2}-\d{2}$/.test(excludeRequestIdOrTodayDate);
  const todayDate = isDateFifthArg ? excludeRequestIdOrTodayDate : getLocalTodayDate();
  const excludeReqId =
    candidate.excludeRequestId || (!isDateFifthArg ? excludeRequestIdOrTodayDate : undefined);

  // Active requests that hold reservations on unique fields
  const activeRequests = existingRequests.filter(
    (r) =>
      r.id !== excludeReqId &&
      (r.status === 'Pending Approval' || r.status === 'Correction Requested')
  );

  // 1. Full Name
  if (!cleanFullName || cleanFullName.length < 3) {
    errors.fullName = 'Full Name is required (minimum 3 characters).';
  } else {
    const nameInUsers = existingUsers.some(
      (u) => normalizeFullName(u.fullName) === cleanFullName.toLowerCase()
    );
    const nameInReqs = activeRequests.some(
      (r) => normalizeFullName(r.fullName) === cleanFullName.toLowerCase()
    );
    if (nameInUsers || nameInReqs) {
      errors.fullName = `Full Name "${cleanFullName}" is already registered or has a pending request.`;
    }
  }

  // 2. Phone Number
  if (!candidate.phone.trim()) {
    errors.phone = 'Phone Number is required.';
  } else if (!isValidPhoneNumber(candidate.phone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number (e.g. +91 98201 11200).';
  } else {
    const phoneInUsers = existingUsers.some((u) => u.normalizedPhone === normalizedPhone);
    const phoneInReqs = activeRequests.some((r) => r.normalizedPhone === normalizedPhone);
    if (phoneInUsers || phoneInReqs) {
      errors.phone = `Phone number ${normalizedPhone} is already registered to another user or pending request.`;
    }
  }

  // 3. Email Address
  if (!normalizedEmail) {
    errors.email = 'Official Email ID is required.';
  } else if (!isValidEmailAddress(normalizedEmail)) {
    errors.email = 'Enter a valid email address (e.g. name@college.edu.in).';
  } else {
    const emailInUsers = existingUsers.some(
      (u) => u.email.trim().toLowerCase() === normalizedEmail
    );
    const emailInReqs = activeRequests.some(
      (r) => r.email.trim().toLowerCase() === normalizedEmail
    );
    if (emailInUsers || emailInReqs) {
      errors.email = `Email "${normalizedEmail}" is already registered to another user or pending request.`;
    }
  }

  // 4. Date of Birth
  if (!cleanDob) {
    errors.dob = 'Date of Birth is required.';
  } else {
    const age = calculateAgeFromDob(cleanDob, todayDate);
    if (age === null || cleanDob >= todayDate) {
      errors.dob = 'Enter a valid past Date of Birth.';
    } else if (age < 15 || age > 100) {
      errors.dob = 'Applicant age must be between 15 and 100 years.';
    } else {
      const dobInUsers = existingUsers.some((u) => u.dob === cleanDob);
      const dobInReqs = activeRequests.some((r) => r.dob === cleanDob);
      if (dobInUsers || dobInReqs) {
        errors.dob = `Date of Birth ${cleanDob} conflicts with an existing account or pending registration record.`;
      }
    }
  }

  // 5. Username
  if (!normalizedUsername || normalizedUsername.length < 3) {
    errors.username = 'Username is required (minimum 3 characters, e.g. firstname.lastname).';
  } else if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
    errors.username = 'Username may only contain lowercase letters, numbers, dots, hyphens, or underscores.';
  } else {
    const userInUsers = existingUsers.some(
      (u) => u.username.trim().toLowerCase() === normalizedUsername
    );
    const userInReqs = activeRequests.some(
      (r) => r.username.trim().toLowerCase() === normalizedUsername
    );
    if (userInUsers || userInReqs) {
      errors.username = `Username "${normalizedUsername}" is already taken.`;
    }
  }

  // 6. Gender
  if (
    !candidate.gender ||
    !GENDER_OPTIONS.includes(candidate.gender as NonNullable<UserAccount['gender']>)
  ) {
    errors.gender = 'Please select a valid gender option.';
  }

  // 7. Password & Confirm Password
  if (!candidate.skipPasswordValidation) {
    const rawPw = candidate.password ?? '';
    const rawConfirm = candidate.confirmPassword ?? '';
    if (!rawPw || rawPw.length < 6) {
      errors.password = 'Password is required and must be at least 6 characters.';
    }
    if (!rawConfirm) {
      errors.confirmPassword = 'Confirm Password is required.';
    } else if (rawPw && rawPw !== rawConfirm) {
      errors.confirmPassword = 'Password and Confirm Password do not match.';
    }
  }

  // 8. College / Institution validation
  if (!candidate.institutionId) {
    errors.institutionId = 'Please select one of the six authorized colleges.';
  } else if (allowedInstitutions && allowedInstitutions.length > 0) {
    const matchedInst = allowedInstitutions.find((i) => i.id === candidate.institutionId);
    if (!matchedInst) {
      errors.institutionId = 'Please select one of the six authorized colleges.';
    }
  }

  // 9. Role-specific fields
  const deptCandidate = candidate.academicDepartment || candidate.department;
  if (candidate.requestedRole === 'student') {
    if (!deptCandidate || !ACADEMIC_DEPARTMENTS.includes(deptCandidate as AcademicDepartment)) {
      const msg = 'Select a valid Department (CMPN, IT, AURO, EXTC, or AIDS).';
      errors.academicDepartment = msg;
      errors.department = msg;
    }
    if (!candidate.academicYear || !ACADEMIC_YEARS.includes(candidate.academicYear as AcademicYear)) {
      errors.academicYear = 'Select a valid Year of Study.';
    }
    if (!candidate.division || !ACADEMIC_DIVISIONS.includes(candidate.division as AcademicDivision)) {
      errors.division = 'Select a valid Division (A, B, or C).';
    }
  } else if (candidate.requestedRole === 'faculty') {
    if (!deptCandidate || !ACADEMIC_DEPARTMENTS.includes(deptCandidate as AcademicDepartment)) {
      const msg = 'Select a valid Department (CMPN, IT, AURO, EXTC, or AIDS).';
      errors.academicDepartment = msg;
      errors.department = msg;
    }
    if (!candidate.academicYear || !ACADEMIC_YEARS.includes(candidate.academicYear as AcademicYear)) {
      errors.academicYear = 'Select a valid Academic Year.';
    }
    if (
      !candidate.classTeacherDivision ||
      !ACADEMIC_DIVISIONS.includes(candidate.classTeacherDivision as AcademicDivision)
    ) {
      errors.classTeacherDivision = 'Select the Division you are Class Teacher of (A, B, or C).';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    normalizedPhone,
    normalizedUsername,
    normalizedEmail,
    errors,
    fieldErrors: errors,
  };
}

/**
 * Resolves the deterministic approval routing for a Student, Faculty, or Institutional Manager request.
 */
export function resolveApprovalRouting(
  request: {
    requestedRole: SignupRole;
    institutionId: string;
    academicDepartment?: AcademicDepartment;
    department?: AcademicDepartment;
    academicYear?: AcademicYear;
    division?: AcademicDivision;
    classTeacherDivision?: AcademicDivision;
  },
  users: UserAccount[],
  institutions?: Institution[]
): {
  approverRole: 'faculty' | 'institutional_rep' | 'admin';
  assignedApproverRole: 'faculty' | 'institutional_rep' | 'admin';
  routedApproverUserIds: string[];
  assignedApproverUserId?: string;
  assignedApproverName?: string;
  routedApproverLabel: string;
  noApproverAssigned: boolean;
  approverUnassigned: boolean;
} {
  const instName =
    institutions?.find((i) => i.id === request.institutionId)?.name || request.institutionId;
  const reqDept = request.academicDepartment || request.department;

  if (request.requestedRole === 'student') {
    const matchingTeachers = users.filter(
      (u) =>
        u.role === 'faculty' &&
        u.status === 'Active' &&
        u.institutionId === request.institutionId &&
        (u.academicDepartment === reqDept || u.department === reqDept) &&
        u.academicYear === request.academicYear &&
        u.classTeacherDivision === request.division
    );

    if (matchingTeachers.length > 0) {
      const primary = matchingTeachers[0];
      return {
        approverRole: 'faculty',
        assignedApproverRole: 'faculty',
        routedApproverUserIds: matchingTeachers.map((t) => t.id),
        assignedApproverUserId: primary.id,
        assignedApproverName: primary.fullName,
        routedApproverLabel: `Class Teacher Faculty (${instName} · ${reqDept} · ${request.academicYear} · Div ${request.division})`,
        noApproverAssigned: false,
        approverUnassigned: false,
      };
    }

    return {
      approverRole: 'faculty',
      assignedApproverRole: 'faculty',
      routedApproverUserIds: [],
      assignedApproverUserId: undefined,
      assignedApproverName: undefined,
      routedApproverLabel: `Class Teacher Faculty (${instName} · ${reqDept} · ${request.academicYear} · Div ${request.division}) — No Approver Assigned`,
      noApproverAssigned: true,
      approverUnassigned: true,
    };
  }

  if (request.requestedRole === 'faculty') {
    const matchingManagers = users.filter(
      (u) =>
        u.role === 'institutional_rep' &&
        u.status === 'Active' &&
        u.institutionId === request.institutionId
    );

    if (matchingManagers.length > 0) {
      const primary = matchingManagers[0];
      return {
        approverRole: 'institutional_rep',
        assignedApproverRole: 'institutional_rep',
        routedApproverUserIds: matchingManagers.map((m) => m.id),
        assignedApproverUserId: primary.id,
        assignedApproverName: primary.fullName,
        routedApproverLabel: `Institutional Manager (${instName})`,
        noApproverAssigned: false,
        approverUnassigned: false,
      };
    }

    return {
      approverRole: 'institutional_rep',
      assignedApproverRole: 'institutional_rep',
      routedApproverUserIds: [],
      assignedApproverUserId: undefined,
      assignedApproverName: undefined,
      routedApproverLabel: `Institutional Manager (${instName}) — No Approver Assigned`,
      noApproverAssigned: true,
      approverUnassigned: true,
    };
  }

  // requestedRole === 'institutional_rep' -> routed to Admin
  const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'Active');
  if (activeAdmins.length > 0) {
    const primary = activeAdmins[0];
    return {
      approverRole: 'admin',
      assignedApproverRole: 'admin',
      routedApproverUserIds: activeAdmins.map((a) => a.id),
      assignedApproverUserId: primary.id,
      assignedApproverName: primary.fullName,
      routedApproverLabel: 'VERIDEX Regional Admin',
      noApproverAssigned: false,
      approverUnassigned: false,
    };
  }

  return {
    approverRole: 'admin',
    assignedApproverRole: 'admin',
    routedApproverUserIds: [],
    assignedApproverUserId: undefined,
    assignedApproverName: undefined,
    routedApproverLabel: 'VERIDEX Regional Admin — No Approver Assigned',
    noApproverAssigned: true,
    approverUnassigned: true,
  };
}

/**
 * Determines whether a signed-in user is authorized to view a specific account approval request.
 * - Students cannot view approval requests.
 * - Faculty (Class Teachers) see only student requests matching their college, department, academic year, and class-teacher division.
 * - Institutional Managers see faculty requests for their college AND unassigned student requests at their college.
 * - Admins see institutional manager requests AND any requests where no matching approver is assigned (noApproverAssigned), plus full oversight.
 */
export function canUserViewApprovalRequest(
  user: UserAccount | null,
  req: AccountApprovalRequest,
  allUsers?: UserAccount[]
): boolean {
  if (!user || user.status !== 'Active') return false;
  if (user.role === 'student') return false;

  const reqDept = req.academicDepartment || req.department;

  if (user.role === 'faculty') {
    const userDept = user.academicDepartment || user.department;
    return (
      req.requestedRole === 'student' &&
      req.institutionId === user.institutionId &&
      reqDept === userDept &&
      req.academicYear === user.academicYear &&
      req.division === user.classTeacherDivision
    );
  }

  if (user.role === 'institutional_rep') {
    if (req.institutionId !== user.institutionId) return false;
    if (req.requestedRole === 'faculty') return true;
    if (req.requestedRole === 'student' && (req.noApproverAssigned || req.approverUnassigned)) {
      return true;
    }
    return false;
  }

  if (user.role === 'admin') {
    if (req.requestedRole === 'institutional_rep') return true;
    if (req.noApproverAssigned || req.approverUnassigned) return true;
    if (allUsers) {
      const liveRouting = resolveApprovalRouting(req, allUsers);
      if (liveRouting.noApproverAssigned) return true;
    }
    return true;
  }

  return false;
}

/**
 * Determines whether a signed-in user is the designated approver who can Approve, Reject, or Request Correction
 * on a pending account approval request.
 */
export function canUserActionApprovalRequest(
  user: UserAccount | null,
  req: AccountApprovalRequest
): boolean {
  if (!user || user.status !== 'Active') return false;
  if (req.status !== 'Pending Approval') return false;

  const reqDept = req.academicDepartment || req.department;
  const isUnassigned = Boolean(req.noApproverAssigned || req.approverUnassigned);

  if (user.role === 'faculty') {
    const userDept = user.academicDepartment || user.department;
    return (
      req.requestedRole === 'student' &&
      req.institutionId === user.institutionId &&
      reqDept === userDept &&
      req.academicYear === user.academicYear &&
      req.division === user.classTeacherDivision
    );
  }

  if (user.role === 'institutional_rep') {
    if (req.institutionId !== user.institutionId) return false;
    if (req.requestedRole === 'faculty') return true;
    // Fallback if a student request at their college has no assigned Class Teacher Faculty
    if (req.requestedRole === 'student' && isUnassigned) return true;
    return false;
  }

  if (user.role === 'admin') {
    if (req.requestedRole === 'institutional_rep') return true;
    // Fallback if a student or faculty request has no assigned approver
    if (isUnassigned) return true;
    return false;
  }

  return false;
}

/**
 * Builds the active UserAccount record when an authorized approver approves an AccountApprovalRequest.
 */
export function buildApprovedUserAccountFromRequest(
  req: AccountApprovalRequest,
  approver: UserAccount,
  createdDate: string = getLocalTodayDate(),
  approvedTimestamp: string = formatTimestampForDisplay(getCurrentIsoTimestamp())
): UserAccount {
  const newUserId = createRecordId('USR');
  const shortNumeric = newUserId.replace(/\D/g, '').slice(-3).padStart(3, '0');
  const instShort = req.institutionName.replace(/[^A-Za-z]/g, '').slice(0, 5).toUpperCase() || 'INST';

  if (req.requestedRole === 'student') {
    const deptCode = req.academicDepartment || req.department || 'CMPN';
    return {
      id: newUserId,
      fullName: req.fullName,
      username: req.username,
      phone: req.phone,
      normalizedPhone: req.normalizedPhone,
      email: req.email,
      dob: req.dob,
      gender: req.gender,
      status: 'Active',
      role: 'student',
      credentialDigest: req.credentialDigest,
      isSystemAccount: false,
      createdAt: createdDate,
      institutionId: req.institutionId,
      institutionName: req.institutionName,
      officialInstitutionCode: req.officialInstitutionCode,
      academicDepartment: deptCode,
      department: deptCode,
      academicYear: req.academicYear,
      yearSemester: req.academicYear,
      division: req.division,
      course: `B.Tech — ${deptCode}`,
      rollNumber: `${instShort}-${deptCode}-${req.division || 'A'}-${shortNumeric}`,
      approvedFromRequestId: req.id,
      approvedByUserId: approver.id,
      approvedByName: approver.fullName,
      approvedAt: approvedTimestamp,
    };
  }

  if (req.requestedRole === 'faculty') {
    const deptCode = req.academicDepartment || req.department || 'CMPN';
    return {
      id: newUserId,
      fullName: req.fullName,
      username: req.username,
      phone: req.phone,
      normalizedPhone: req.normalizedPhone,
      email: req.email,
      dob: req.dob,
      gender: req.gender,
      status: 'Active',
      role: 'faculty',
      credentialDigest: req.credentialDigest,
      isSystemAccount: false,
      createdAt: createdDate,
      institutionId: req.institutionId,
      institutionName: req.institutionName,
      officialInstitutionCode: req.officialInstitutionCode,
      academicDepartment: deptCode,
      department: deptCode,
      academicYear: req.academicYear,
      classTeacherDivision: req.classTeacherDivision,
      designation: `Class Teacher (${deptCode} · ${req.academicYear} · Div ${req.classTeacherDivision})`,
      employeeId: `${instShort}-FAC-${deptCode}-${shortNumeric}`,
      joiningDate: createdDate,
      approvedFromRequestId: req.id,
      approvedByUserId: approver.id,
      approvedByName: approver.fullName,
      approvedAt: approvedTimestamp,
    };
  }

  // requestedRole === 'institutional_rep'
  return {
    id: newUserId,
    fullName: req.fullName,
    username: req.username,
    phone: req.phone,
    normalizedPhone: req.normalizedPhone,
    email: req.email,
    dob: req.dob,
    gender: req.gender,
    status: 'Active',
    role: 'institutional_rep',
    credentialDigest: req.credentialDigest,
    isSystemAccount: false,
    createdAt: createdDate,
    institutionId: req.institutionId,
    institutionName: req.institutionName,
    officialInstitutionCode: req.officialInstitutionCode,
    designation: 'Institutional Manager & Statutory Nodal Signatory',
    authorizationStatus: 'Verified Nodal Officer',
    approvedFromRequestId: req.id,
    approvedByUserId: approver.id,
    approvedByName: approver.fullName,
    approvedAt: approvedTimestamp,
  };
}

/**
 * Calculates expiry status and days remaining relative to the current local calendar date.
 * - Expired: < 0 days remaining
 * - Expiring Soon: 0 to 45 days remaining (inclusive)
 * - Valid: > 45 days remaining
 */
export function calculateExpiryDetails(
  expiryDate?: string,
  referenceDate: string = getLocalTodayDate()
): {
  status: ExpiryStatus;
  daysRemaining: number | null;
  label: string;
} {
  if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    return {
      status: 'No Expiry',
      daysRemaining: null,
      label: 'Permanent / No Expiry',
    };
  }

  const [expY, expM, expD] = expiryDate.split('-').map(Number);
  const [refY, refM, refD] = referenceDate.split('-').map(Number);

  const expUtc = Date.UTC(expY, expM - 1, expD);
  const refUtc = Date.UTC(refY, refM - 1, refD);
  const diffDays = Math.round((expUtc - refUtc) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'Expired',
      daysRemaining: diffDays,
      label: `Expired ${Math.abs(diffDays)}d ago`,
    };
  }
  if (diffDays === 0) {
    return {
      status: 'Expiring Soon',
      daysRemaining: 0,
      label: 'Expires today',
    };
  }
  if (diffDays <= 45) {
    return {
      status: 'Expiring Soon',
      daysRemaining: diffDays,
      label: `Expires in ${diffDays}d`,
    };
  }
  return {
    status: 'Valid',
    daysRemaining: diffDays,
    label: `Valid (${diffDays}d left)`,
  };
}

/**
 * Generates a unique, human-readable internal document code so multiple certificates
 * for the same person or category never collide (e.g., FAC-QUA-KHA-01, FAC-QUA-KHA-02).
 */
export function generateInternalDocumentCode(
  category: DocumentCategory,
  personOrEntityName: string,
  existingCodes: string[]
): string {
  const categoryPrefixMap: Record<DocumentCategory, string> = {
    Approvals: 'APR-REG',
    Infrastructure: 'INF-FAC',
    Qualifications: 'FAC-QUA',
    'Experience Certificates': 'FAC-EXP',
    'Faculty Records': 'FAC-REC',
    'Student Records': 'STU-REC',
    'Financial & Trust Deeds': 'FIN-TRU',
  };

  const prefix = categoryPrefixMap[category] || 'DOC-GEN';
  const cleanedTokens = personOrEntityName
    .replace(/\b(Dr|Prof|Mr|Ms|Mrs|Shri|Smt)\b\.?/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const lastToken = cleanedTokens[cleanedTokens.length - 1] || 'GEN';
  const entityCode = lastToken
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');

  const basePattern = `${prefix}-${entityCode}-`;
  let maxSeq = 0;

  for (const code of existingCodes) {
    if (code.startsWith(basePattern)) {
      const numPart = parseInt(code.slice(basePattern.length), 10);
      if (!Number.isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${basePattern}${nextSeq}`;
}

/**
 * Keyword-based document category & folder suggestion engine.
 */
export function suggestDocumentCategory(
  fileName: string,
  title: string
): {
  category: DocumentCategory;
  folder: string;
  rationale: string;
} {
  const combined = `${fileName} ${title}`.toLowerCase();

  if (combined.includes('phd') || combined.includes('degree') || combined.includes('m.tech') || combined.includes('convocation')) {
    return {
      category: 'Qualifications',
      folder: '/Repository/Faculty/Academic-Qualifications',
      rationale: 'Matched academic degree / convocation keywords in document title.',
    };
  }
  if (combined.includes('experience') || combined.includes('relieving') || combined.includes('service')) {
    return {
      category: 'Experience Certificates',
      folder: '/Repository/Faculty/Prior-Service-Records',
      rationale: 'Matched prior teaching / service tenure keywords.',
    };
  }
  if (combined.includes('fire') || combined.includes('safety') || combined.includes('lab') || combined.includes('building') || combined.includes('occupancy')) {
    return {
      category: 'Infrastructure',
      folder: '/Repository/Campus/Safety-And-Infrastructure',
      rationale: 'Matched campus safety, fire NOC, or laboratory facility keywords.',
    };
  }
  if (combined.includes('audit') || combined.includes('financial') || combined.includes('trust') || combined.includes('balance')) {
    return {
      category: 'Financial & Trust Deeds',
      folder: '/Repository/Governance/Trust-And-Audit',
      rationale: 'Matched audited financial statement or trust registration keywords.',
    };
  }
  if (combined.includes('student') || combined.includes('roll') || combined.includes('scholarship') || combined.includes('enrollment')) {
    return {
      category: 'Student Records',
      folder: '/Repository/Students/Enrollment-And-Merit',
      rationale: 'Matched student enrollment, PRN, or scholarship verification keywords.',
    };
  }
  if (combined.includes('appointment') || combined.includes('faculty') || combined.includes('cadre') || combined.includes('roster')) {
    return {
      category: 'Faculty Records',
      folder: '/Repository/Faculty/Appointment-Orders',
      rationale: 'Matched faculty appointment order or cadre roster keywords.',
    };
  }

  return {
    category: 'Approvals',
    folder: '/Repository/Regulatory/Statutory-Approvals',
    rationale: 'Classified under statutory regulatory approvals & university affiliation.',
  };
}

/**
 * Generates a personalized checklist when an institution initiates a new application.
 */
export function buildCategoryChecklist(category: ApplicationCategory): ChecklistItem[] {
  const prefix = `CHK-${Date.now().toString(36).toUpperCase()}`;
  switch (category) {
    case 'Extension of Approval (EoA)':
      return [
        {
          id: `${prefix}-1`,
          title: 'University Continuation of Affiliation Letter',
          required: true,
          documentCategory: 'Approvals',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-2`,
          title: 'Municipal Fire & Life Safety Renewal Certificate',
          required: true,
          documentCategory: 'Infrastructure',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-3`,
          title: 'Principal & Senior Faculty Ph.D. Qualification Dossiers',
          required: true,
          documentCategory: 'Qualifications',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-4`,
          title: 'Audited Financial Statement & Corpus Fund Utilization',
          required: true,
          documentCategory: 'Financial & Trust Deeds',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-5`,
          title: 'Updated Faculty Cadre Roster & Appointment Orders',
          required: true,
          documentCategory: 'Faculty Records',
          status: 'Pending Upload',
        },
      ];

    case 'New Course Approval (AI & Data Science)':
      return [
        {
          id: `${prefix}-1`,
          title: 'Affiliating University NOC for B.Tech AI & Data Science',
          required: true,
          documentCategory: 'Approvals',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-2`,
          title: 'High-Performance Computing Lab Equipment & Readiness Proof',
          required: true,
          documentCategory: 'Infrastructure',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-3`,
          title: 'Core AI/ML Faculty Ph.D. Degrees & Publications',
          required: true,
          documentCategory: 'Qualifications',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-4`,
          title: 'Faculty Prior Teaching & Research Experience Certificates',
          required: true,
          documentCategory: 'Experience Certificates',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-5`,
          title: 'Governing Body Resolution & Seed Budget Allocation',
          required: true,
          documentCategory: 'Financial & Trust Deeds',
          status: 'Pending Upload',
        },
      ];

    case 'Increase in Intake (B.Tech CSE)':
      return [
        {
          id: `${prefix}-1`,
          title: 'Additional Classroom & Computing Lab Carpet Area Certificate',
          required: true,
          documentCategory: 'Infrastructure',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-2`,
          title: 'Newly Recruited CSE Faculty Appointment Letters',
          required: true,
          documentCategory: 'Faculty Records',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-3`,
          title: 'Previous 3-Year Student Admission & Placement Summary',
          required: true,
          documentCategory: 'Student Records',
          status: 'Pending Upload',
        },
      ];

    default:
      return [
        {
          id: `${prefix}-1`,
          title: 'Statutory Regulatory Compliance Declaration',
          required: true,
          documentCategory: 'Approvals',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-2`,
          title: 'Campus Safety & Structural Stability Certificate',
          required: true,
          documentCategory: 'Infrastructure',
          status: 'Pending Upload',
        },
        {
          id: `${prefix}-3`,
          title: 'Verified Faculty Cadre & Qualification Register',
          required: true,
          documentCategory: 'Faculty Records',
          status: 'Pending Upload',
        },
      ];
  }
}

/**
 * Role-based access control (RBAC) enforcement helpers.
 */
export function canUserAccessApplication(user: UserAccount, app: ApplicationRecord): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'institutional_rep' || user.role === 'faculty') {
    return Boolean(user.institutionId && app.institutionId === user.institutionId);
  }
  return false;
}

export function canUserAccessDocument(user: UserAccount, doc: DocumentRecord): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'institutional_rep') {
    return Boolean(user.institutionId && doc.institutionId === user.institutionId);
  }
  if (user.role === 'faculty') {
    return (
      Boolean(user.institutionId && doc.institutionId === user.institutionId) &&
      (doc.personUserId === user.id ||
        doc.category === 'Faculty Records' ||
        doc.category === 'Qualifications' ||
        doc.category === 'Experience Certificates' ||
        doc.category === 'Infrastructure' ||
        doc.category === 'Approvals')
    );
  }
  if (user.role === 'student') {
    return (
      Boolean(user.institutionId && doc.institutionId === user.institutionId) &&
      (doc.personUserId === user.id ||
        doc.personName.toLowerCase() === user.fullName.toLowerCase())
    );
  }
  return false;
}

/**
 * Strict privacy check: Determines whether a document was uploaded by or belongs
 * to the currently authenticated user. Ensures users cannot browse other people's
 * private documents in their Document Repository.
 */
export function isUserDocumentOwner(user: UserAccount, doc: DocumentRecord): boolean {
  if (doc.personUserId && doc.personUserId === user.id) return true;
  if (doc.uploadedByUserId && doc.uploadedByUserId === user.id) return true;
  if (doc.personName && doc.personName.trim().toLowerCase() === user.fullName.trim().toLowerCase()) return true;
  if (
    doc.versions &&
    doc.versions.some(
      (v) => v.uploadedBy && v.uploadedBy.trim().toLowerCase() === user.fullName.trim().toLowerCase()
    )
  ) {
    return true;
  }
  return false;
}

export function canUserPerformAdminAction(user: UserAccount): boolean {
  return user.role === 'admin' && user.status === 'Active';
}

/**
 * Computes summary metrics for the Admin Dashboard from the current state.
 */
export function computeDashboardMetrics(
  applications: ApplicationRecord[],
  documents: DocumentRecord[],
  referenceDate: string = getLocalTodayDate()
) {
  const totalApplications = applications.length;
  const pendingReview = applications.filter(
    (a) =>
      a.status === 'Submitted' ||
      a.status === 'Automated Checks Complete' ||
      a.status === 'Pending Verification' ||
      a.status === 'Under Manual Review'
  ).length;

  const requiringAdditionalInfo = applications.filter(
    (a) => a.status === 'Additional Information Required'
  ).length;

  const documentsVerified = documents.filter(
    (d) => d.issuerVerificationStatus === 'Verified' && d.humanReviewStatus === 'Reviewed'
  ).length;

  const expiringDocuments = documents.filter((d) => {
    const exp = calculateExpiryDetails(d.expiryDate, referenceDate);
    return exp.status === 'Expired' || exp.status === 'Expiring Soon';
  }).length;

  return {
    totalApplications,
    pendingReview,
    documentsVerified,
    expiringDocuments,
    requiringAdditionalInfo,
  };
}

/**
 * Computes structured chart datasets for the Admin Dashboard (Recharts).
 */
export function computeAdminChartData(
  applications: ApplicationRecord[],
  documents: DocumentRecord[],
  referenceDate: string = getLocalTodayDate()
) {
  const statusOrder: Array<{
    status: ApplicationRecord['status'];
    shortLabel: string;
    color: string;
  }> = [
    { status: 'Decision Recorded', shortLabel: 'Decided', color: '#046A38' },
    { status: 'Under Manual Review', shortLabel: 'Manual Review', color: '#0F766E' },
    { status: 'Automated Checks Complete', shortLabel: 'Checks Done', color: '#1D4ED8' },
    { status: 'Pending Verification', shortLabel: 'Pending Verif.', color: '#D97706' },
    { status: 'Additional Information Required', shortLabel: 'Info Needed', color: '#C2410C' },
    { status: 'Submitted', shortLabel: 'Submitted', color: '#4F46E5' },
    { status: 'Draft', shortLabel: 'Draft', color: '#78716C' },
  ];

  const statusDistribution = statusOrder.map((item) => ({
    ...item,
    count: applications.filter((a) => a.status === item.status).length,
  }));

  const categories: DocumentCategory[] = [
    'Approvals',
    'Infrastructure',
    'Qualifications',
    'Experience Certificates',
    'Faculty Records',
    'Student Records',
    'Financial & Trust Deeds',
  ];

  const categoryBreakdown = categories.map((cat) => {
    const catDocs = documents.filter((d) => d.category === cat);
    const verified = catDocs.filter(
      (d) => d.issuerVerificationStatus === 'Verified' && d.humanReviewStatus === 'Reviewed'
    ).length;
    const flagged = catDocs.filter((d) => {
      const exp = calculateExpiryDetails(d.expiryDate, referenceDate);
      return (
        exp.status === 'Expired' ||
        exp.status === 'Expiring Soon' ||
        d.consistencyStatus === 'Mismatch Flagged' ||
        d.completenessStatus === 'Missing Pages/Fields' ||
        d.anomalyStatus === 'Suspected Alteration / Duplicate'
      );
    }).length;
    const pending = Math.max(0, catDocs.length - verified - flagged);

    const shortCategory =
      cat === 'Experience Certificates'
        ? 'Experience'
        : cat === 'Financial & Trust Deeds'
          ? 'Financial'
          : cat === 'Faculty Records'
            ? 'Faculty'
            : cat === 'Student Records'
              ? 'Students'
              : cat;

    return {
      category: shortCategory,
      fullCategory: cat,
      total: catDocs.length,
      verified,
      flagged,
      pending,
    };
  });

  const totalDocs = documents.length;
  const verifiedTotal = documents.filter(
    (d) => d.issuerVerificationStatus === 'Verified' && d.humanReviewStatus === 'Reviewed'
  ).length;
  const flaggedTotal = documents.filter((d) => {
    const exp = calculateExpiryDetails(d.expiryDate, referenceDate);
    return (
      exp.status === 'Expired' ||
      exp.status === 'Expiring Soon' ||
      d.consistencyStatus === 'Mismatch Flagged' ||
      d.completenessStatus === 'Missing Pages/Fields' ||
      d.anomalyStatus === 'Suspected Alteration / Duplicate'
    );
  }).length;

  const processingTrends = [
    {
      period: 'May',
      uploaded: Math.max(2, Math.round(totalDocs * 0.22)),
      verified: Math.max(1, Math.round(verifiedTotal * 0.2)),
      flagged: Math.max(0, Math.round(flaggedTotal * 0.15)),
    },
    {
      period: 'Jun',
      uploaded: Math.max(4, Math.round(totalDocs * 0.38)),
      verified: Math.max(3, Math.round(verifiedTotal * 0.36)),
      flagged: Math.max(1, Math.round(flaggedTotal * 0.3)),
    },
    {
      period: 'Jul',
      uploaded: Math.max(7, Math.round(totalDocs * 0.56)),
      verified: Math.max(5, Math.round(verifiedTotal * 0.52)),
      flagged: Math.max(2, Math.round(flaggedTotal * 0.45)),
    },
    {
      period: 'Aug',
      uploaded: Math.max(11, Math.round(totalDocs * 0.74)),
      verified: Math.max(8, Math.round(verifiedTotal * 0.71)),
      flagged: Math.max(3, Math.round(flaggedTotal * 0.65)),
    },
    {
      period: 'Sep',
      uploaded: Math.max(16, Math.round(totalDocs * 0.9)),
      verified: Math.max(12, Math.round(verifiedTotal * 0.88)),
      flagged: Math.max(5, Math.round(flaggedTotal * 0.85)),
    },
    {
      period: 'Oct',
      uploaded: totalDocs,
      verified: verifiedTotal,
      flagged: flaggedTotal,
    },
  ];

  return {
    statusDistribution,
    categoryBreakdown,
    processingTrends,
  };
}

/**
 * Computes structured chart datasets for an Institutional Representative or Faculty Dashboard (Recharts).
 */
export function computeInstitutionChartData(
  institutionApps: ApplicationRecord[],
  institutionDocs: DocumentRecord[],
  referenceDate: string = getLocalTodayDate()
) {
  const dossierReadiness = institutionApps.map((app) => {
    const total = app.checklist.length || 1;
    const verified = app.checklist.filter((c) => c.status === 'Verified').length;
    const uploaded = app.checklist.filter((c) => c.status === 'Uploaded').length;
    const flagged = app.checklist.filter((c) => c.status === 'Flagged for Review').length;
    const pendingUpload = app.checklist.filter((c) => c.status === 'Pending Upload').length;
    const completionPct = Math.round(((verified + uploaded) / total) * 100);

    return {
      appId: app.id.replace('APP-2026-', 'APP-'),
      fullId: app.id,
      category: app.category,
      status: app.status,
      verified,
      uploaded,
      flagged,
      pendingUpload,
      completionPct,
    };
  });

  const categories: DocumentCategory[] = [
    'Approvals',
    'Infrastructure',
    'Qualifications',
    'Experience Certificates',
    'Faculty Records',
    'Student Records',
    'Financial & Trust Deeds',
  ];

  const documentCategoryHealth = categories
    .map((cat) => {
      const docs = institutionDocs.filter((d) => d.category === cat);
      const verifiedClean = docs.filter((d) => {
        const exp = calculateExpiryDetails(d.expiryDate, referenceDate);
        return (
          exp.status !== 'Expired' &&
          exp.status !== 'Expiring Soon' &&
          d.consistencyStatus === 'Consistent' &&
          d.completenessStatus === 'Complete'
        );
      }).length;
      const attentionNeeded = Math.max(0, docs.length - verifiedClean);

      const shortName =
        cat === 'Experience Certificates'
          ? 'Experience'
          : cat === 'Financial & Trust Deeds'
            ? 'Financial'
            : cat === 'Faculty Records'
              ? 'Faculty'
              : cat === 'Student Records'
                ? 'Students'
                : cat;

      return {
        category: shortName,
        total: docs.length,
        verifiedClean,
        attentionNeeded,
      };
    })
    .filter((item) => item.total > 0);

  const expirySummary = [
    {
      name: 'Valid (>45d)',
      count: institutionDocs.filter((d) => {
        const st = calculateExpiryDetails(d.expiryDate, referenceDate).status;
        return st === 'Valid' || st === 'No Expiry';
      }).length,
      color: '#046A38',
    },
    {
      name: 'Expiring (≤45d)',
      count: institutionDocs.filter(
        (d) => calculateExpiryDetails(d.expiryDate, referenceDate).status === 'Expiring Soon'
      ).length,
      color: '#D97706',
    },
    {
      name: 'Expired (<0d)',
      count: institutionDocs.filter(
        (d) => calculateExpiryDetails(d.expiryDate, referenceDate).status === 'Expired'
      ).length,
      color: '#B91C1C',
    },
  ];

  return {
    dossierReadiness,
    documentCategoryHealth,
    expirySummary,
  };
}

/**
 * Links an existing Personal Document Vault record to a specific document requirement
 * on a request without duplicating the vault document record.
 * Keeps verification status and approval status strictly separate.
 */
export function buildSubmittedFileFromVaultDocument(
  requirement: DocumentRequirement,
  vaultDoc: VaultDocumentRecord,
  submittedAt: string,
  simulatedDemoVerification: 'Verified in demo' | 'Needs review in demo' = 'Verified in demo'
): SubmittedDocumentFile {
  return {
    requirementId: requirement.id,
    requirementName: requirement.name,
    fileName: vaultDoc.originalFileName,
    fileSize: vaultDoc.fileSizeLabel,
    mimeType: vaultDoc.mimeType,
    submittedAt,
    vaultDocumentId: vaultDoc.id,
    sourceType: 'vault',
    hasStoredFileBlob: vaultDoc.hasStoredBlob,
    ocrExtractedText: vaultDoc.ocrExtractedText || undefined,
    verificationOutcome: simulatedDemoVerification,
    approvalStatus: 'Pending Approval',
    verificationFeedback:
      simulatedDemoVerification === 'Verified in demo'
        ? `Linked saved vault document (${vaultDoc.id}). Simulated format check completed; awaiting reviewer approval.`
        : `Linked saved vault document (${vaultDoc.id}); flagged for reviewer attention.`,
  };
}

/**
 * Maps a SubmittedDocumentFile (or raw verification/approval status pair) to its corresponding
 * DocumentRecord verification and approval statuses.
 * Enforces Section 4.2:
 * - Demo verification ('Verified in demo') NEVER automatically marks a document as 'Approved'.
 * - Approval only becomes 'Approved' or 'Rejected' when an authorized reviewer explicitly records a decision.
 */
export function resolveRepositoryStatusesFromSubmission(
  docFileOrOutcome: SubmittedDocumentFile | string | undefined,
  maybeApprovalStatus?: string
): {
  verificationStatusLabel: NonNullable<DocumentRecord['verificationStatusLabel']>;
  approvalStatusLabel: NonNullable<DocumentRecord['approvalStatusLabel']>;
  issuerVerificationStatus: DocumentRecord['issuerVerificationStatus'];
  humanReviewStatus: DocumentRecord['humanReviewStatus'];
} {
  const rawVerification =
    typeof docFileOrOutcome === 'object' && docFileOrOutcome !== null
      ? docFileOrOutcome.verificationOutcome
      : docFileOrOutcome;
  const rawApproval =
    typeof docFileOrOutcome === 'object' && docFileOrOutcome !== null
      ? docFileOrOutcome.approvalStatus
      : maybeApprovalStatus;

  let verificationStatusLabel: NonNullable<DocumentRecord['verificationStatusLabel']> =
    'Pending Verification';
  let issuerVerificationStatus: DocumentRecord['issuerVerificationStatus'] = 'Pending';

  if (rawVerification === 'Verified in demo') {
    verificationStatusLabel = 'Verified in demo';
    issuerVerificationStatus = 'Verified';
  } else if (
    rawVerification === 'Needs review in demo' ||
    rawVerification === 'Needs Review'
  ) {
    verificationStatusLabel = 'Needs Review';
    issuerVerificationStatus = 'Pending';
  } else if (rawVerification === 'Approved') {
    verificationStatusLabel = 'Verified in demo';
    issuerVerificationStatus = 'Verified';
  }

  let approvalStatusLabel: NonNullable<DocumentRecord['approvalStatusLabel']> = 'Under Review';
  let humanReviewStatus: DocumentRecord['humanReviewStatus'] = 'Pending';

  if (rawApproval === 'Approved') {
    approvalStatusLabel = 'Approved';
    humanReviewStatus = 'Reviewed';
  } else if (rawApproval === 'Rejected') {
    approvalStatusLabel = 'Rejected';
    humanReviewStatus = 'Action Required';
  } else if (rawApproval === 'Needs Review') {
    approvalStatusLabel = 'Needs Review';
    humanReviewStatus = 'Action Required';
  } else {
    // Default for newly uploaded or demo-verified submissions: Pending Approval / Under Review
    approvalStatusLabel = 'Under Review';
    humanReviewStatus = 'Pending';
  }

  return {
    verificationStatusLabel,
    approvalStatusLabel,
    issuerVerificationStatus,
    humanReviewStatus,
  };
}

/**
 * Applies an authorized reviewer's approval or rejection decision to a single request submission
 * or an array of request submissions.
 * Guarantees per-request independence (Section 7.2):
 * If the same saved vault document was submitted to multiple requests, approving or rejecting
 * one request submission never alters the status of any other request submission or deletes the vault record.
 */
export function applyReviewerDecisionToSubmission(
  submission: StudentRequestSubmission,
  decision: 'Approved' | 'Rejected' | 'Needs Review',
  reviewer: Pick<UserAccount, 'fullName' | 'role'>,
  reviewerNote: string,
  timestamp?: string
): StudentRequestSubmission;
export function applyReviewerDecisionToSubmission(
  submissions: StudentRequestSubmission[],
  targetSubmissionId: string,
  decision: 'Approved' | 'Rejected' | 'Needs Review',
  reviewer: Pick<UserAccount, 'fullName' | 'role'>,
  reviewerNote: string,
  timestamp?: string
): StudentRequestSubmission[];
export function applyReviewerDecisionToSubmission(
  submissionsOrSingle: StudentRequestSubmission[] | StudentRequestSubmission,
  targetIdOrDecision: string,
  decisionOrReviewer:
    | 'Approved'
    | 'Rejected'
    | 'Needs Review'
    | Pick<UserAccount, 'fullName' | 'role'>,
  reviewerOrNote: Pick<UserAccount, 'fullName' | 'role'> | string,
  noteOrTimestamp?: string,
  maybeTimestamp?: string
): StudentRequestSubmission[] | StudentRequestSubmission {
  if (!Array.isArray(submissionsOrSingle)) {
    const singleSub = submissionsOrSingle;
    const decision = targetIdOrDecision as 'Approved' | 'Rejected' | 'Needs Review';
    const reviewer = decisionOrReviewer as Pick<UserAccount, 'fullName' | 'role'>;
    const reviewerNote = String(reviewerOrNote || '');
    const ts = noteOrTimestamp || formatTimestampForDisplay(getCurrentIsoTimestamp());
    return {
      ...singleSub,
      status: decision,
      approvalStatus: decision,
      reviewedByName: reviewer.fullName,
      reviewedAt: ts,
      reviewerNote: reviewerNote.trim() || `Marked ${decision} by ${reviewer.fullName}.`,
      documents: singleSub.documents.map((doc) => ({
        ...doc,
        approvalStatus: decision,
      })),
    };
  }

  const submissions = submissionsOrSingle;
  const targetSubmissionId = targetIdOrDecision;
  const decision = decisionOrReviewer as 'Approved' | 'Rejected' | 'Needs Review';
  const reviewer = reviewerOrNote as Pick<UserAccount, 'fullName' | 'role'>;
  const reviewerNote = String(noteOrTimestamp || '');
  const timestamp = maybeTimestamp || formatTimestampForDisplay(getCurrentIsoTimestamp());

  return submissions.map((sub) => {
    if (sub.id !== targetSubmissionId) {
      return sub;
    }
    return {
      ...sub,
      status: decision,
      approvalStatus: decision,
      reviewedByName: reviewer.fullName,
      reviewedAt: timestamp,
      reviewerNote: reviewerNote.trim() || `Marked ${decision} by ${reviewer.fullName}.`,
      documents: sub.documents.map((doc) => ({
        ...doc,
        approvalStatus: decision,
      })),
    };
  });
}

/**
 * 5.4 Document-to-Form Prefill Suggestion Builder
 * Extracts structured, user-reviewable form prefill values from a saved VaultDocumentRecord
 * or OCR-extracted metadata without automatically submitting the target form.
 */
export interface DocumentFormPrefillSuggestion {
  title: string;
  docTitle: string;
  holderName: string;
  personName: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  fileSize: string;
  sourceLabel: string;
  notes?: string;
  vaultDocumentId?: string;
  hasStoredBlob?: boolean;
  ocrExtractedText?: string;
}

export type DocumentPrefillSuggestion = DocumentFormPrefillSuggestion;

export function extractDocumentPrefillSuggestion(
  vaultDoc: VaultDocumentRecord,
  fallbackHolderName: string = ''
): DocumentFormPrefillSuggestion {
  const editable = vaultDoc.editableDetails || ({} as VaultDocumentRecord['editableDetails']);
  const title =
    (editable.title && editable.title.trim()) ||
    (vaultDoc.title && vaultDoc.title.trim()) ||
    vaultDoc.originalFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const certNo =
    (editable.certificateNumber && editable.certificateNumber.trim()) ||
    (editable.documentNumber && editable.documentNumber.trim()) ||
    `VLT-${vaultDoc.id.slice(-6).toUpperCase()}`;
  const holder =
    (editable.holderName && editable.holderName.trim()) ||
    vaultDoc.ownerName ||
    fallbackHolderName;
  const authority =
    (editable.issuingAuthority && editable.issuingAuthority.trim()) ||
    'University of Mumbai & Statutory Authority';
  const issueDate =
    (editable.issueDate && editable.issueDate.trim()) ||
    vaultDoc.dateAdded ||
    getLocalTodayDate();
  const expiryDate = (editable.expiryDate && editable.expiryDate.trim()) || '';
  const fileName = vaultDoc.originalFileName || vaultDoc.fileName || `${title.replace(/\s+/g, '_')}.pdf`;
  const suggestion = suggestDocumentCategory(fileName, title);
  const category: DocumentCategory = vaultDoc.category || suggestion.category;

  return {
    title,
    docTitle: title,
    holderName: holder,
    personName: holder,
    certificateNumber: certNo,
    issuingAuthority: authority,
    issueDate,
    expiryDate,
    category,
    fileName,
    mimeType: vaultDoc.mimeType || 'application/pdf',
    fileSize: vaultDoc.fileSizeLabel || '1.00 MB',
    sourceLabel: `Personal Vault · ${fileName} (OCR: ${vaultDoc.ocrStatus})`,
    notes: editable.notes || vaultDoc.notes || '',
    vaultDocumentId: vaultDoc.id,
    hasStoredBlob: Boolean(vaultDoc.hasStoredBlob ?? vaultDoc.hasStoredFileBlob),
    ocrExtractedText: vaultDoc.ocrExtractedText || undefined,
  };
}

/**
 * 5.5 Document Completeness Check Engine (Browser-Side Rule Evaluation)
 * Inspects required metadata fields, category-specific validity dates, and annexure signals.
 */
export function evaluateDocumentCompleteness(doc: {
  id?: string;
  internalCode?: string;
  name: string;
  category: DocumentCategory;
  personName: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  fileName: string;
  ocrExtractedText?: string;
  extractedSummary?: Record<string, string>;
}): {
  completenessStatus: DocumentRecord['completenessStatus'];
  findings: VerificationFinding[];
} {
  const missingFields: string[] = [];
  const findings: VerificationFinding[] = [];
  const codeLabel = doc.internalCode || doc.id || 'DOC';

  if (!doc.name || doc.name.trim().length < 4) {
    missingFields.push('Document Title');
  }
  if (!doc.personName || doc.personName.trim().length < 3) {
    missingFields.push('Holder / Signatory Name');
  }
  if (!doc.certificateNumber || doc.certificateNumber.trim().length < 3) {
    missingFields.push('Official Certificate / Reference Number');
  }
  if (!doc.issuingAuthority || doc.issuingAuthority.trim().length < 3) {
    missingFields.push('Issuing Authority');
  }
  if (!doc.issueDate || !/^\d{4}-\d{2}-\d{2}$/.test(doc.issueDate.trim())) {
    missingFields.push('Valid Issue Date (YYYY-MM-DD)');
  }
  if (!doc.fileName || !/\.(pdf|jpe?g|png)$/i.test(doc.fileName.trim())) {
    missingFields.push('Supported Attachment File (.pdf, .jpg, .png)');
  }

  // Time-bound regulatory approvals and campus safety clearances require an explicit validity/expiry date
  if (
    (doc.category === 'Approvals' || doc.category === 'Infrastructure') &&
    (!doc.expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(doc.expiryDate.trim()))
  ) {
    missingFields.push(`Mandatory Statutory Validity / Expiry Date for ${doc.category}`);
  }

  const combinedText = `${doc.name} ${doc.ocrExtractedText || ''} ${Object.values(
    doc.extractedSummary || {}
  ).join(' ')}`.toLowerCase();

  const hasMissingPageSignal =
    combinedText.includes('missing page') ||
    combinedText.includes('missing annexure') ||
    combinedText.includes('unsigned annexure') ||
    combinedText.includes('incomplete scan');

  if (missingFields.length > 0 || hasMissingPageSignal) {
    const detailList =
      missingFields.length > 0
        ? `Missing required field(s): ${missingFields.join(', ')}.`
        : 'Annexure or signature completeness signal detected in document summary/OCR text.';
    findings.push({
      id: createRecordId('F-COMP'),
      pillar: 'Completeness',
      status: 'Flagged',
      affectedFieldOrPage:
        missingFields.length > 0 ? missingFields.join(', ') : 'Annexure / Page Completeness',
      explanation: `[Rule COMP-REQ-01] ${detailList}`,
      evidenceComparison: `Record ${codeLabel} (${doc.fileName || 'Unnamed'}) vs. mandatory ${doc.category} schema.`,
      suggestedNextAction:
        'Provide the missing metadata fields or upload the complete signed multi-page PDF version.',
    });
    return {
      completenessStatus: 'Missing Pages/Fields',
      findings,
    };
  }

  findings.push({
    id: createRecordId('F-COMP'),
    pillar: 'Completeness',
    status: 'Passed',
    affectedFieldOrPage: 'Mandatory Metadata & Attachment Schema',
    explanation: `[Rule COMP-REQ-01] All mandatory metadata fields (Title, Holder, Certificate #${doc.certificateNumber.trim()}, Issuing Authority, Issue Date) and file format checks passed for ${doc.category}.`,
    evidenceComparison: `${codeLabel} · Cert #${doc.certificateNumber.trim()} · Issued ${doc.issueDate} by ${doc.issuingAuthority}.`,
    suggestedNextAction: 'Proceed to cross-document consistency and human reviewer inspection.',
  });

  return {
    completenessStatus: 'Complete',
    findings,
  };
}

function stripHonorificsAndNormalizeName(raw: string): string {
  return raw
    .replace(/\b(Dr|Prof|Mr|Ms|Mrs|Shri|Smt|Er)\b\.?/gi, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * 5.7 Cross-Document Consistency Check Engine
 * Compares normalized holder names, certificate references, dates, and institution IDs
 * across related documents and linked applications.
 */
export function runCrossDocumentConsistencyChecks(
  targetDoc: {
    id?: string;
    internalCode?: string;
    name: string;
    category: DocumentCategory;
    institutionId: string;
    institutionName: string;
    relatedApplicationId?: string;
    personName: string;
    personUserId?: string;
    certificateNumber: string;
    issueDate: string;
    expiryDate?: string;
  },
  existingDocs: DocumentRecord[],
  applications: ApplicationRecord[] = []
): {
  consistencyStatus: DocumentRecord['consistencyStatus'];
  findings: VerificationFinding[];
} {
  const findings: VerificationFinding[] = [];
  const targetCode = targetDoc.internalCode || targetDoc.id || 'NEW-DOC';
  const normTargetName = stripHonorificsAndNormalizeName(targetDoc.personName);
  const targetTokens = normTargetName.split(' ').filter(Boolean);

  // 1. Check against linked application institution
  if (targetDoc.relatedApplicationId) {
    const linkedApp = applications.find((a) => a.id === targetDoc.relatedApplicationId);
    if (linkedApp && linkedApp.institutionId !== targetDoc.institutionId) {
      findings.push({
        id: createRecordId('F-CONS-INST'),
        pillar: 'Consistency',
        status: 'Flagged',
        affectedFieldOrPage: 'Institution ID / Dossier Ownership',
        explanation: `[Rule CONS-INST-01] Document institution (${targetDoc.institutionId}) does not match linked application ${linkedApp.id} institution (${linkedApp.institutionId}).`,
        evidenceComparison: `${targetCode} (${targetDoc.institutionId}) ≠ ${linkedApp.id} (${linkedApp.institutionId})`,
        suggestedNextAction:
          'Verify institutional ownership or link the document to the correct institutional dossier.',
      });
    }
  }

  // 2. Compare holder/signatory name spelling across other documents belonging to the same person or linked application
  const peerDocs = existingDocs.filter(
    (d) =>
      d.id !== targetDoc.id &&
      d.internalCode !== targetDoc.internalCode &&
      ((targetDoc.personUserId && d.personUserId === targetDoc.personUserId) ||
        (targetDoc.relatedApplicationId &&
          d.relatedApplicationId === targetDoc.relatedApplicationId &&
          d.category === targetDoc.category))
  );

  for (const peer of peerDocs) {
    const normPeerName = stripHonorificsAndNormalizeName(peer.personName);
    if (!normPeerName || !normTargetName) continue;

    if (normPeerName !== normTargetName) {
      const peerTokens = normPeerName.split(' ').filter(Boolean);
      const sharesFirstToken =
        targetTokens.length > 0 &&
        peerTokens.length > 0 &&
        targetTokens[0] === peerTokens[0];
      if (sharesFirstToken || (targetDoc.personUserId && peer.personUserId === targetDoc.personUserId)) {
        findings.push({
          id: createRecordId('F-CONS-NAME'),
          pillar: 'Consistency',
          status: 'Flagged',
          affectedFieldOrPage: 'Holder / Signatory Name Spelling',
          explanation: `[Rule CONS-NAME-02] Name variation detected across related records for the same individual/category: "${targetDoc.personName}" on ${targetCode} vs. "${peer.personName}" on ${peer.internalCode}.`,
          evidenceComparison: `${targetCode}: "${targetDoc.personName}" ↔ ${peer.internalCode}: "${peer.personName}"`,
          suggestedNextAction:
            'Inspect original scroll/affidavit for spelling equivalence (review signal only, not automatic proof of fraud).',
        });
        break;
      }
    }
  }

  if (findings.length > 0) {
    return {
      consistencyStatus: 'Mismatch Flagged',
      findings,
    };
  }

  findings.push({
    id: createRecordId('F-CONS-OK'),
    pillar: 'Consistency',
    status: 'Passed',
    affectedFieldOrPage: 'Cross-Document Holder & Institution Alignment',
    explanation: `[Rule CONS-ALIGN-01] Holder identity ("${targetDoc.personName}") and institutional code (${targetDoc.institutionId}) are consistent across linked repository records.`,
    evidenceComparison: `${targetCode} aligned with ${peerDocs.length} related institutional record(s).`,
    suggestedNextAction: 'No cross-document discrepancy detected.',
  });

  return {
    consistencyStatus: 'Consistent',
    findings,
  };
}

/**
 * 5.8 Rule-Based Anomaly Screening Engine
 * Transparently checks for contradictory dates, duplicate certificate numbers across records,
 * and suspicious/placeholder reference codes.
 */
export function runRuleBasedAnomalyScreening(
  targetDoc: {
    id?: string;
    internalCode?: string;
    name: string;
    personName: string;
    certificateNumber: string;
    issueDate: string;
    expiryDate?: string;
  },
  existingDocs: DocumentRecord[],
  referenceToday: string = getLocalTodayDate()
): {
  anomalyStatus: DocumentRecord['anomalyStatus'];
  findings: VerificationFinding[];
} {
  const findings: VerificationFinding[] = [];
  const targetCode = targetDoc.internalCode || targetDoc.id || 'NEW-DOC';
  const cleanCert = targetDoc.certificateNumber.trim().toUpperCase();

  // Rule ANOM-DATE-01: Expiry date precedes issue date
  if (
    targetDoc.issueDate &&
    targetDoc.expiryDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(targetDoc.issueDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(targetDoc.expiryDate) &&
    targetDoc.expiryDate < targetDoc.issueDate
  ) {
    findings.push({
      id: createRecordId('F-ANOM-DATE1'),
      pillar: 'Anomaly',
      status: 'Flagged',
      affectedFieldOrPage: 'Issue Date vs. Expiry Date Window',
      explanation: `[Rule ANOM-DATE-01] Contradictory date sequence: Expiry Date (${targetDoc.expiryDate}) is earlier than Issue Date (${targetDoc.issueDate}).`,
      evidenceComparison: `Issue Date: ${targetDoc.issueDate} > Expiry Date: ${targetDoc.expiryDate} on ${targetCode}.`,
      suggestedNextAction:
        'Verify certificate dates against the original document scan and correct any typographical entry.',
    });
  }

  // Rule ANOM-DATE-02: Issue date is in the future relative to reference today
  if (
    targetDoc.issueDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(targetDoc.issueDate) &&
    targetDoc.issueDate > referenceToday
  ) {
    findings.push({
      id: createRecordId('F-ANOM-DATE2'),
      pillar: 'Anomaly',
      status: 'Flagged',
      affectedFieldOrPage: 'Future Issue Date',
      explanation: `[Rule ANOM-DATE-02] Certificate Issue Date (${targetDoc.issueDate}) is post-dated relative to today (${referenceToday}).`,
      evidenceComparison: `${targetCode} Issue Date (${targetDoc.issueDate}) > Current Date (${referenceToday}).`,
      suggestedNextAction:
        'Inspect whether the issue date was mistyped during OCR/manual entry.',
    });
  }

  // Rule ANOM-DUP-01: Duplicate certificate number across another document record
  if (cleanCert.length >= 3) {
    const duplicateDoc = existingDocs.find(
      (d) =>
        d.id !== targetDoc.id &&
        d.internalCode !== targetDoc.internalCode &&
        d.certificateNumber.trim().toUpperCase() === cleanCert
    );
    if (duplicateDoc) {
      findings.push({
        id: createRecordId('F-ANOM-DUP'),
        pillar: 'Anomaly',
        status: 'Flagged',
        affectedFieldOrPage: 'Certificate Reference Number Uniqueness',
        explanation: `[Rule ANOM-DUP-01] Duplicate Certificate Reference #${targetDoc.certificateNumber.trim()} is already registered on document ${duplicateDoc.internalCode} ("${duplicateDoc.name}", Holder: ${duplicateDoc.personName}).`,
        evidenceComparison: `${targetCode} (Cert #${cleanCert}) duplicates ${duplicateDoc.internalCode} (Cert #${duplicateDoc.certificateNumber}).`,
        suggestedNextAction:
          'Verify whether this is a duplicate upload or an erroneously reused reference number.',
      });
    }
  }

  // Rule ANOM-META-01: Placeholder or dummy reference string
  if (/^(TEST|DUMMY|SAMPLE|XXXX|0000|12345?)$/i.test(cleanCert)) {
    findings.push({
      id: createRecordId('F-ANOM-META'),
      pillar: 'Anomaly',
      status: 'Flagged',
      affectedFieldOrPage: 'Certificate Reference Format',
      explanation: `[Rule ANOM-META-01] Certificate number "${targetDoc.certificateNumber}" matches a non-official placeholder pattern.`,
      evidenceComparison: `Entered value "${targetDoc.certificateNumber}" vs. statutory reference format.`,
      suggestedNextAction: 'Enter the exact alphanumeric certificate number printed on the document.',
    });
  }

  if (findings.length > 0) {
    return {
      anomalyStatus: 'Suspected Alteration / Duplicate',
      findings,
    };
  }

  findings.push({
    id: createRecordId('F-ANOM-OK'),
    pillar: 'Anomaly',
    status: 'Passed',
    affectedFieldOrPage: 'Rule-Based Date & Duplicate Screening',
    explanation: `[Rule ANOM-SCR-01] Passed chronological date validation and duplicate certificate number screening across ${existingDocs.length} repository record(s).`,
    evidenceComparison: `Cert #${targetDoc.certificateNumber} is unique; Issue Date ${targetDoc.issueDate} is valid.`,
    suggestedNextAction: 'No rule-based anomaly signal triggered.',
  });

  return {
    anomalyStatus: 'No Anomaly Detected',
    findings,
  };
}

/**
 * Evaluates all browser-verifiable pillars (Completeness, Expiry, Consistency, Rule-Based Anomaly)
 * while keeping Issuer Verification and Human Review honest and separate.
 */
export function evaluateDocumentSixPillars(
  targetDoc: DocumentRecord,
  allDocs: DocumentRecord[],
  applications: ApplicationRecord[] = [],
  referenceToday: string = getLocalTodayDate()
): {
  completenessStatus: DocumentRecord['completenessStatus'];
  consistencyStatus: DocumentRecord['consistencyStatus'];
  anomalyStatus: DocumentRecord['anomalyStatus'];
  issuerVerificationStatus: DocumentRecord['issuerVerificationStatus'];
  humanReviewStatus: DocumentRecord['humanReviewStatus'];
  expiryDetails: ReturnType<typeof calculateExpiryDetails>;
  findings: VerificationFinding[];
} {
  const completeness = evaluateDocumentCompleteness(targetDoc);
  const expiryDetails = calculateExpiryDetails(targetDoc.expiryDate, referenceToday);
  const consistency = runCrossDocumentConsistencyChecks(targetDoc, allDocs, applications);
  const anomaly = runRuleBasedAnomalyScreening(targetDoc, allDocs, referenceToday);

  const expiryFinding: VerificationFinding =
    expiryDetails.status === 'Expired'
      ? {
          id: createRecordId('F-EXP'),
          pillar: 'Expiry',
          status: 'Flagged',
          affectedFieldOrPage: 'Validity / Expiry Date',
          explanation: `[Rule EXP-WIN-01] Document validity period has lapsed (${expiryDetails.label}; Expiry Date: ${targetDoc.expiryDate}).`,
          evidenceComparison: `Expiry Date ${targetDoc.expiryDate} < Reference Date ${referenceToday}.`,
          suggestedNextAction: 'Upload renewed statutory certificate version to clear expiry flag.',
        }
      : expiryDetails.status === 'Expiring Soon'
        ? {
            id: createRecordId('F-EXP'),
            pillar: 'Expiry',
            status: 'Advisory',
            affectedFieldOrPage: 'Validity / Expiry Date (45-Day Window)',
            explanation: `[Rule EXP-WIN-45] Certificate expires within the 45-day renewal advisory window (${expiryDetails.label}; Expiry Date: ${targetDoc.expiryDate}).`,
            evidenceComparison: `Expiry Date ${targetDoc.expiryDate} vs. Reference Date ${referenceToday}.`,
            suggestedNextAction: 'Initiate renewal with issuing authority prior to committee sign-off.',
          }
        : {
            id: createRecordId('F-EXP'),
            pillar: 'Expiry',
            status: 'Passed',
            affectedFieldOrPage: 'Validity / Expiry Date',
            explanation: `[Rule EXP-WIN-01] Validity status is ${expiryDetails.label}.`,
            evidenceComparison: `Expiry Date: ${targetDoc.expiryDate || 'Permanent / No Expiry'}.`,
            suggestedNextAction: 'No renewal action required at this time.',
          };

  const combinedFindings: VerificationFinding[] = [
    ...completeness.findings,
    expiryFinding,
    ...consistency.findings,
    ...anomaly.findings,
  ];

  return {
    completenessStatus: completeness.completenessStatus,
    consistencyStatus: consistency.consistencyStatus,
    anomalyStatus: anomaly.anomalyStatus,
    issuerVerificationStatus: targetDoc.issuerVerificationStatus || 'Not Checked',
    humanReviewStatus: targetDoc.humanReviewStatus || 'Pending',
    expiryDetails,
    findings: combinedFindings,
  };
}


