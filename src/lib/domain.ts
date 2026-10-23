import {
  ApplicationCategory,
  ApplicationRecord,
  ChecklistItem,
  DocumentCategory,
  DocumentRecord,
  ExpiryStatus,
  Role,
  UserAccount,
} from '../types/portal';

export const REFERENCE_DATE = '2026-10-23';

/**
 * Normalizes phone numbers so uniqueness can be reliably enforced across all roles.
 * Strips whitespace, hyphens, parentheses, and dots.
 * Converts 10-digit Indian numbers or leading-0 11-digit numbers to +91XXXXXXXXXX.
 */
export function normalizePhoneNumber(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const digitsAndPlus = trimmed.replace(/[\s\-().]/g, '');
  const digitsOnly = digitsAndPlus.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `+91${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }
  if (digitsAndPlus.startsWith('+')) {
    return `+${digitsOnly}`;
  }
  return digitsOnly ? `+${digitsOnly}` : '';
}

/**
 * Validates phone format (10 to 13 digits after normalization).
 */
export function isValidPhoneNumber(raw: string): boolean {
  const norm = normalizePhoneNumber(raw);
  return /^\+\d{10,14}$/.test(norm);
}

/**
 * Calculates age in years from a YYYY-MM-DD date of birth relative to referenceDate.
 */
export function calculateAgeFromDob(dob: string, referenceDate: string = REFERENCE_DATE): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [bYear, bMonth, bDay] = dob.split('-').map(Number);
  const [rYear, rMonth, rDay] = referenceDate.split('-').map(Number);

  if (!bYear || !bMonth || !bDay) return null;
  let age = rYear - bYear;
  if (rMonth < bMonth || (rMonth === bMonth && rDay < bDay)) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Enforces global uniqueness of username and normalized phone number across all roles.
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
  } else if (!/^[a-z0-9._-]+$/.test(cleanUsername)) {
    errors.username = 'Username may only contain letters, numbers, dots, underscores, or hyphens.';
  }

  if (!normalizedPhone || !isValidPhoneNumber(candidate.phone)) {
    errors.phone = 'Enter a valid 10-digit mobile number (e.g. +91 98201 11200).';
  }

  for (const user of existingUsers) {
    if (candidate.excludeUserId && user.id === candidate.excludeUserId) {
      continue;
    }
    if (cleanUsername && user.username.trim().toLowerCase() === cleanUsername) {
      errors.username = `Username "${candidate.username.trim()}" is already registered in the system.`;
    }
    if (normalizedPhone && normalizePhoneNumber(user.phone) === normalizedPhone) {
      errors.phone = `Phone number ${normalizedPhone} is already registered to another account.`;
    }
  }

  return {
    valid: !errors.username && !errors.phone,
    normalizedPhone,
    errors,
  };
}

/**
 * Calculates expiry status and days remaining consistently from stored dates.
 */
export function calculateExpiryDetails(
  expiryDate?: string,
  referenceDate: string = REFERENCE_DATE
): {
  daysRemaining: number | null;
  status: ExpiryStatus;
  label: string;
} {
  if (!expiryDate) {
    return {
      daysRemaining: null,
      status: 'No Expiry',
      label: 'Permanent / No Expiry',
    };
  }

  const expMs = Date.parse(`${expiryDate}T00:00:00Z`);
  const refMs = Date.parse(`${referenceDate}T00:00:00Z`);
  if (Number.isNaN(expMs) || Number.isNaN(refMs)) {
    return {
      daysRemaining: null,
      status: 'No Expiry',
      label: 'No Expiry',
    };
  }

  const diffDays = Math.round((expMs - refMs) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      daysRemaining: diffDays,
      status: 'Expired',
      label: `Expired ${Math.abs(diffDays)}d ago`,
    };
  }

  if (diffDays <= 45) {
    return {
      daysRemaining: diffDays,
      status: 'Expiring Soon',
      label: diffDays === 0 ? 'Expires today' : `Expires in ${diffDays}d`,
    };
  }

  return {
    daysRemaining: diffDays,
    status: 'Valid',
    label: `Valid (${diffDays}d remaining)`,
  };
}

const CATEGORY_PREFIX_MAP: Record<DocumentCategory, string> = {
  'Student Records': 'STU-REC',
  'Faculty Records': 'FAC-REC',
  Qualifications: 'FAC-QUA',
  'Experience Certificates': 'FAC-EXP',
  Infrastructure: 'INF-FAC',
  Approvals: 'APR-REG',
  'Financial & Trust Deeds': 'FIN-TRU',
};

/**
 * Generates a consistent human-readable internal document code (e.g. FAC-QUA-KAS-02)
 * with a unique numeric suffix to distinguish similar names.
 */
export function generateInternalDocumentCode(
  category: DocumentCategory,
  personOrEntityName: string,
  existingCodes: string[]
): string {
  const prefix = CATEGORY_PREFIX_MAP[category] || 'DOC-GEN';
  const tokens = personOrEntityName
    .replace(/\b(Dr|Prof|Mr|Ms|Mrs|Shri|Smt|Institute|College|of|Technology|Engineering)\b\.?/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const surnameOrPrimary = tokens.length > 0 ? tokens[tokens.length - 1] : 'GEN';
  const alphaCode = surnameOrPrimary
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');

  const base = `${prefix}-${alphaCode}`;
  const upperExisting = new Set(existingCodes.map((c) => c.toUpperCase()));

  let index = 1;
  while (index < 999) {
    const candidate = `${base}-${String(index).padStart(2, '0')}`;
    if (!upperExisting.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
  return `${base}-${Date.now().toString().slice(-3)}`;
}

/**
 * Simulated AI-assisted document classification that suggests a category and folder
 * based on filename and document title.
 */
export function suggestDocumentCategory(
  fileName: string,
  documentTitle: string
): {
  category: DocumentCategory;
  folder: string;
  rationale: string;
} {
  const combined = `${fileName} ${documentTitle}`.toLowerCase();

  if (combined.includes('phd') || combined.includes('degree') || combined.includes('m.tech') || combined.includes('qualification') || combined.includes('convocation')) {
    return {
      category: 'Qualifications',
      folder: '/Repository/Faculty/Academic-Qualifications',
      rationale: 'Matched academic degree/convocation keywords in title.',
    };
  }
  if (combined.includes('experience') || combined.includes('relieving') || combined.includes('service')) {
    return {
      category: 'Experience Certificates',
      folder: '/Repository/Faculty/Prior-Service-Records',
      rationale: 'Matched prior teaching/industry service keywords.',
    };
  }
  if (combined.includes('fire') || combined.includes('safety') || combined.includes('lab') || combined.includes('building') || combined.includes('occupancy') || combined.includes('lease') || combined.includes('library')) {
    return {
      category: 'Infrastructure',
      folder: '/Repository/Campus/Safety-And-Infrastructure',
      rationale: 'Matched physical campus safety, occupancy, or laboratory keywords.',
    };
  }
  if (combined.includes('noc') || combined.includes('affiliation') || combined.includes('aicte') || combined.includes('eoa') || combined.includes('approval')) {
    return {
      category: 'Approvals',
      folder: '/Repository/Regulatory/Statutory-Approvals',
      rationale: 'Matched university affiliation or statutory NOC keywords.',
    };
  }
  if (combined.includes('student') || combined.includes('roll') || combined.includes('marksheet') || combined.includes('gate') || combined.includes('scholarship')) {
    return {
      category: 'Student Records',
      folder: '/Repository/Students/Enrollment-And-Merit',
      rationale: 'Matched student enrollment or merit record keywords.',
    };
  }
  if (combined.includes('faculty') || combined.includes('appointment') || combined.includes('pan') || combined.includes('joining')) {
    return {
      category: 'Faculty Records',
      folder: '/Repository/Faculty/Appointment-Orders',
      rationale: 'Matched faculty appointment and roster keywords.',
    };
  }
  return {
    category: 'Financial & Trust Deeds',
    folder: '/Repository/Governance/Trust-And-Audit',
    rationale: 'Classified under statutory governance and financial records.',
  };
}

/**
 * Generates a category-specific checklist when an institutional representative starts a new application.
 */
export function buildCategoryChecklist(category: ApplicationCategory): ChecklistItem[] {
  const baseItems: Record<ApplicationCategory, Array<{ title: string; category: DocumentCategory; required: boolean }>> = {
    'Extension of Approval (EoA)': [
      { title: 'University Continuation of Affiliation Letter', category: 'Approvals', required: true },
      { title: 'Municipal Fire & Life Safety Renewal Certificate', category: 'Infrastructure', required: true },
      { title: 'Principal & Senior Faculty Ph.D. Qualification Dossiers', category: 'Qualifications', required: true },
      { title: 'Audited Financial Statement & Corpus Fund Utilization', category: 'Financial & Trust Deeds', required: true },
      { title: 'Updated Faculty Cadre Roster & Appointment Orders', category: 'Faculty Records', required: true },
    ],
    'New Course Approval (AI & Data Science)': [
      { title: 'Affiliating University NOC for B.Tech AI & Data Science', category: 'Approvals', required: true },
      { title: 'High-Performance Computing Lab Equipment & Readiness Proof', category: 'Infrastructure', required: true },
      { title: 'Core AI/ML Faculty Ph.D. Degrees & Publications', category: 'Qualifications', required: true },
      { title: 'Faculty Prior Teaching & Research Experience Certificates', category: 'Experience Certificates', required: true },
      { title: 'Governing Body Resolution & Seed Budget Allocation', category: 'Financial & Trust Deeds', required: false },
    ],
    'Increase in Intake (B.Tech CSE)': [
      { title: 'Additional Classroom & Computing Lab Carpet Area Certificate', category: 'Infrastructure', required: true },
      { title: 'Newly Recruited CSE Faculty Appointment Letters', category: 'Faculty Records', required: true },
      { title: 'State Directorate / University Intake Enhancement NOC', category: 'Approvals', required: true },
      { title: 'Previous Batch Student Enrollment & Placement Summary', category: 'Student Records', required: false },
    ],
    'Infrastructure & Lab Readiness Audit': [
      { title: 'Structural Stability & Building Occupancy Certificate', category: 'Infrastructure', required: true },
      { title: 'Municipal Fire & Life Safety Certificate', category: 'Infrastructure', required: true },
      { title: 'Computing & Core Engineering Lab Photographic Evidence', category: 'Infrastructure', required: true },
      { title: 'Central Library Digital Subscription & Volume Register', category: 'Infrastructure', required: true },
    ],
    'Faculty Cadre Ratio Compliance': [
      { title: 'Complete Regular Faculty Roster with PAN/AICTE IDs', category: 'Faculty Records', required: true },
      { title: 'Doctoral & Post-Graduate Degree Certificates', category: 'Qualifications', required: true },
      { title: 'Prior Academic & Research Experience Certificates', category: 'Experience Certificates', required: true },
    ],
    'Post-Graduate Research Center Renewal': [
      { title: 'University Research Center Recognition Renewal Order', category: 'Approvals', required: true },
      { title: 'Research Guides Qualification & Supervision Records', category: 'Qualifications', required: true },
      { title: 'Doctoral/PG Scholar Enrollment & Thesis Register', category: 'Student Records', required: true },
      { title: 'Dedicated Research Lab & Instrumentation Inventory', category: 'Infrastructure', required: true },
    ],
  };

  const selected = baseItems[category] || baseItems['Extension of Approval (EoA)'];
  return selected.map((item, idx) => ({
    id: `chk-${Date.now()}-${idx + 1}`,
    title: item.title,
    required: item.required,
    documentCategory: item.category,
    status: 'Pending Upload',
  }));
}

/**
 * Enforces backend-equivalent role and institution access restrictions.
 */
export function canUserAccessApplication(user: UserAccount, app: ApplicationRecord): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'institutional_rep' || user.role === 'faculty') {
    return Boolean(user.institutionId && user.institutionId === app.institutionId);
  }
  return false;
}

export function canUserAccessDocument(user: UserAccount, doc: DocumentRecord): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'institutional_rep') {
    return Boolean(user.institutionId && user.institutionId === doc.institutionId);
  }
  if (user.role === 'faculty') {
    return Boolean(
      user.institutionId &&
        user.institutionId === doc.institutionId &&
        (doc.personUserId === user.id ||
          doc.category === 'Faculty Records' ||
          doc.category === 'Qualifications' ||
          doc.category === 'Experience Certificates' ||
          doc.category === 'Infrastructure' ||
          doc.category === 'Approvals')
    );
  }
  if (user.role === 'student') {
    return Boolean(
      user.institutionId &&
        user.institutionId === doc.institutionId &&
        (doc.personUserId === user.id || doc.personName.toLowerCase() === user.fullName.toLowerCase())
    );
  }
  return false;
}

export function canUserPerformAdminAction(user: UserAccount): boolean {
  return user.role === 'admin' && user.status === 'Active';
}

export function getDefaultRouteForRole(role: Role): string {
  switch (role) {
    case 'admin':
      return 'Admin Compliance Workspace';
    case 'institutional_rep':
      return 'Institutional Portal';
    case 'faculty':
      return 'Faculty Dossier & Compliance View';
    case 'student':
      return 'Student Verified Records Portal';
  }
}

/**
 * Computes live dashboard metrics from the underlying application and document arrays.
 */
export function computeDashboardMetrics(
  applications: ApplicationRecord[],
  documents: DocumentRecord[],
  referenceDate: string = REFERENCE_DATE
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
    (d) =>
      d.issuerVerificationStatus === 'Verified' &&
      d.humanReviewStatus === 'Reviewed'
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
