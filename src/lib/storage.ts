import {
  AccountApprovalRequest,
  ApplicationRecord,
  AuditEvent,
  ComplianceRule,
  DocumentRecord,
  DocumentSubmissionRequest,
  PortalNotification,
  StudentRequestSubmission,
  UserAccount,
} from '../types/portal';
import { computeCredentialDigest, sanitizeUserForStorage } from './domain';

export const STORAGE_KEYS = {
  theme: 'veridex_portal_theme_v7',
  currentUserId: 'veridex_portal_current_user_v7',
  users: 'veridex_portal_users_v7',
  approvalRequests: 'veridex_portal_approval_reqs_v7',
  applications: 'veridex_portal_apps_v7',
  documents: 'veridex_portal_docs_v7',
  rules: 'veridex_portal_rules_v7',
  notifications: 'veridex_portal_notifs_v7',
  audit: 'veridex_portal_audit_v7',
  documentRequests: 'veridex_portal_doc_requests_v7',
  studentSubmissions: 'veridex_portal_student_submissions_v7',
  vaultMetadataIndex: 'veridex_portal_vault_meta_v7',
} as const;

const lastSerializedCache = new Map<string, string>();

function isRecordObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function isValidStoredUser(val: unknown): val is UserAccount {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    val.id.trim().length > 0 &&
    typeof val.username === 'string' &&
    val.username.trim().length > 0 &&
    typeof val.fullName === 'string' &&
    typeof val.role === 'string' &&
    ['admin', 'institutional_rep', 'faculty', 'student'].includes(val.role)
  );
}

export function isValidStoredDocument(val: unknown): val is DocumentRecord {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.internalCode === 'string' &&
    typeof val.name === 'string' &&
    typeof val.category === 'string' &&
    typeof val.fileName === 'string'
  );
}

export function isValidStoredApplication(val: unknown): val is ApplicationRecord {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.institutionId === 'string' &&
    typeof val.category === 'string' &&
    typeof val.status === 'string' &&
    Array.isArray(val.checklist)
  );
}

export function isValidStoredApprovalRequest(val: unknown): val is AccountApprovalRequest {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.username === 'string' &&
    typeof val.fullName === 'string' &&
    typeof val.requestedRole === 'string' &&
    typeof val.status === 'string'
  );
}

export function isValidStoredComplianceRule(val: unknown): val is ComplianceRule {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.code === 'string' &&
    typeof val.name === 'string'
  );
}

export function isValidStoredNotification(val: unknown): val is PortalNotification {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.title === 'string' &&
    typeof val.message === 'string'
  );
}

export function isValidStoredAuditEvent(val: unknown): val is AuditEvent {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.action === 'string' &&
    typeof val.actorName === 'string'
  );
}

export function isValidStoredDocumentRequest(val: unknown): val is DocumentSubmissionRequest {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.title === 'string' &&
    Array.isArray(val.requiredDocuments) &&
    Array.isArray(val.recipientStudentIds)
  );
}

export function isValidStoredStudentSubmission(val: unknown): val is StudentRequestSubmission {
  if (!isRecordObject(val)) return false;
  return (
    typeof val.id === 'string' &&
    typeof val.requestId === 'string' &&
    typeof val.studentId === 'string' &&
    Array.isArray(val.documents)
  );
}

/**
 * Safely reads and validates an array from localStorage.
 * Filters out malformed items and returns `fallback` if JSON is missing, corrupted, or empty when fallback is non-empty.
 */
export function loadValidatedArrayFromStorage<T>(
  key: string,
  fallback: T[],
  validator: (item: unknown) => item is T,
  storageObj: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): T[] {
  if (!storageObj) return fallback;
  try {
    const raw = storageObj.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    const validItems = parsed.filter(validator);
    if (validItems.length === 0 && fallback.length > 0 && parsed.length > 0) {
      return fallback;
    }
    lastSerializedCache.set(key, raw);
    return validItems;
  } catch {
    return fallback;
  }
}

/**
 * Loads user accounts from localStorage while guaranteeing that:
 * 1. Every seed demo user account remains present and accessible.
 * 2. Every seed user's login identifiers, roles, and passwords/digests are preserved.
 * 3. Newly approved or created accounts stored in localStorage are retained.
 */
export function loadUsersPreservingSeedAccounts(
  seedUsers: UserAccount[] = [],
  storageObj: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): UserAccount[] {
  const stored = loadValidatedArrayFromStorage<UserAccount>(
    STORAGE_KEYS.users,
    seedUsers,
    isValidStoredUser,
    storageObj
  );

  const hydratedStored = stored.map((u) => {
    const seedMatch = seedUsers.find(
      (s) => s.id === u.id || s.username.toLowerCase() === u.username.toLowerCase()
    );
    const fallbackPassword = u.password ?? seedMatch?.password;
    const resolvedDigest =
      u.credentialDigest ??
      seedMatch?.credentialDigest ??
      (fallbackPassword ? computeCredentialDigest(fallbackPassword) : undefined);

    return {
      ...(seedMatch || {}),
      ...u,
      id: seedMatch ? seedMatch.id : u.id,
      role: seedMatch ? seedMatch.role : u.role,
      password: fallbackPassword,
      credentialDigest: resolvedDigest,
    };
  });

  // Ensure no seed user was accidentally dropped from storage
  const existingIds = new Set(hydratedStored.map((u) => u.id));
  const existingUsernames = new Set(hydratedStored.map((u) => u.username.toLowerCase()));
  const missingSeedUsers = seedUsers.filter(
    (s) => !existingIds.has(s.id) && !existingUsernames.has(s.username.toLowerCase())
  );

  return [...hydratedStored, ...missingSeedUsers];
}

/**
 * Safely writes a value to localStorage only if its serialized representation has changed.
 * Never throws or erases existing data if quota is exceeded.
 */
export function safeWriteToStorage(
  key: string,
  value: unknown,
  storageObj: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): { ok: boolean; error?: string } {
  if (!storageObj) return { ok: false, error: 'localStorage is unavailable.' };
  try {
    const serialized = JSON.stringify(value);
    if (lastSerializedCache.get(key) === serialized) {
      return { ok: true };
    }
    storageObj.setItem(key, serialized);
    lastSerializedCache.set(key, serialized);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to write to browser storage.',
    };
  }
}

export function persistPortalStateToStorage(state: {
  users: UserAccount[];
  approvalRequests: AccountApprovalRequest[];
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  complianceRules: ComplianceRule[];
  notifications: PortalNotification[];
  auditEvents: AuditEvent[];
  documentRequests: DocumentSubmissionRequest[];
  studentSubmissions: StudentRequestSubmission[];
  currentUserId: string | null;
}): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const sanitizedUsers = state.users.map(sanitizeUserForStorage);
  // Strip transient blob: URLs before persisting metadata to localStorage
  const sanitizedDocuments = state.documents.map((d) => ({
    ...d,
    previewUrl: d.previewUrl && d.previewUrl.startsWith('blob:') ? undefined : d.previewUrl,
  }));
  const sanitizedSubmissions = state.studentSubmissions.map((s) => ({
    ...s,
    documents: s.documents.map((doc) => ({
      ...doc,
      previewUrl:
        doc.previewUrl && doc.previewUrl.startsWith('blob:') ? undefined : doc.previewUrl,
    })),
  }));

  safeWriteToStorage(STORAGE_KEYS.users, sanitizedUsers);
  safeWriteToStorage(STORAGE_KEYS.approvalRequests, state.approvalRequests);
  safeWriteToStorage(STORAGE_KEYS.applications, state.applications);
  safeWriteToStorage(STORAGE_KEYS.documents, sanitizedDocuments);
  safeWriteToStorage(STORAGE_KEYS.rules, state.complianceRules);
  safeWriteToStorage(STORAGE_KEYS.notifications, state.notifications);
  safeWriteToStorage(STORAGE_KEYS.audit, state.auditEvents);
  safeWriteToStorage(STORAGE_KEYS.documentRequests, state.documentRequests);
  safeWriteToStorage(STORAGE_KEYS.studentSubmissions, sanitizedSubmissions);

  try {
    if (state.currentUserId) {
      window.localStorage.setItem(STORAGE_KEYS.currentUserId, state.currentUserId);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.currentUserId);
    }
  } catch {
    // ignore storage quota errors
  }
}
