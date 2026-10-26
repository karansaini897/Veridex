import { supabase, isSupabaseConfigured } from './supabase';
import {
  DocumentRecord,
  DocumentCategory,
  Institution,
  UserAccount,
  ApplicationRecord,
} from '../types/portal';
import { canUserAccessDocument, formatTimestampForDisplay } from './domain';

export interface SupabaseDocumentRow {
  id: string;
  institution_id: string;
  owner_id: string;
  category: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  status: string;
  uploaded_at: string;
  updated_at: string;
}

export interface SupabaseDocumentReviewRow {
  id: string;
  document_id: string;
  reviewer_id: string;
  decision: string;
  comments: string;
  reviewed_at: string;
}

export interface DocumentUploadResult {
  success: boolean;
  storagePath?: string;
  signedUrl?: string;
  documentId?: string;
  error?: string;
  isFallback?: boolean;
}

export const STORAGE_BUCKET = 'veridex-documents';
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const SUPPORTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

/**
 * Validates a file against allowed MIME types, extensions, and size limits.
 */
export function validateDocumentFile(file: File | null | undefined): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected. Please choose a document.' };
  }

  const fileNameLower = (file.name || '').toLowerCase();
  const hasValidExt = /\.(pdf|jpe?g|png)$/i.test(fileNameLower);
  const hasValidMime =
    file.type &&
    SUPPORTED_DOCUMENT_MIME_TYPES.includes(
      file.type as (typeof SUPPORTED_DOCUMENT_MIME_TYPES)[number]
    );

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || file.name}). Only PDF, JPEG, and PNG files are permitted.`,
    };
  }

  if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed security limit of 15 MB.`,
    };
  }

  if (file.size <= 0) {
    return { valid: false, error: 'The selected file is empty (0 bytes).' };
  }

  return { valid: true };
}

/**
 * Builds canonical storage path: ownerId/category/timestamp_sanitizedFileName.
 */
export function buildCanonicalStoragePath(file: File, ownerId: string, category: string): string {
  const safeOwner = (ownerId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeCategory = (category || 'general').toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = Date.now();
  const sanitizedName = (file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safeOwner}/${safeCategory}/${timestamp}_${sanitizedName}`;
}

/**
 * Uploads a physical file to the private 'veridex-documents' storage bucket.
 * Enforces safe path formatting: ownerId/category/timestamp_sanitizedFileName.
 */
export async function uploadDocumentToStorage(
  file: File,
  ownerId: string,
  category: string
): Promise<{ success: boolean; storagePath?: string; error?: string; isFallback?: boolean }> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const storagePath = buildCanonicalStoragePath(file, ownerId, category);

  if (!isSupabaseConfigured || !supabase) {
    // In local dev/testing without active Supabase credentials, generate a persistent storage path reference
    return { success: true, storagePath, isFallback: true };
  }

  try {
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    return { success: true, storagePath };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Deletes an uploaded storage object from the private 'veridex-documents' bucket.
 * Used for rollback on partial failure to avoid orphaned storage objects.
 */
export async function deleteDocumentFromStorage(
  storagePath: string
): Promise<{ success: boolean; error?: string }> {
  if (!storagePath) return { success: true };
  if (!isSupabaseConfigured || !supabase) return { success: true };

  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    if (error) {
      console.warn('[VERIDEX Storage] Storage deletion notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Creates a time-limited signed URL for authorized viewing/downloading of a private document.
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !storagePath) return null;

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('[VERIDEX Storage] Signed URL creation error:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.warn('[VERIDEX Storage] Error creating signed URL:', err);
    return null;
  }
}

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();

/**
 * Retrieves a cached signed URL or generates a fresh one on demand.
 * Handles expired URLs by checking expiration timestamps with a safety margin.
 */
export async function getDocumentSignedUrlWithCache(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!storagePath) return null;

  const now = Date.now();
  const cached = signedUrlCache.get(storagePath);
  // Reuse existing cached signed URL if valid for at least 60 more seconds
  if (cached && cached.expiresAt > now + 60 * 1000) {
    return cached.url;
  }

  const freshUrl = await getSignedDocumentUrl(storagePath, expiresInSeconds);
  if (freshUrl) {
    signedUrlCache.set(storagePath, {
      url: freshUrl,
      expiresAt: now + expiresInSeconds * 1000,
    });
    return freshUrl;
  }

  return null;
}

/**
 * Clears cached signed URLs (e.g. on logout or for testing).
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

/**
 * Authorized signed URL generator:
 * Enforces that current user is authorized under VERIDEX RBAC before issuing a time-limited signed URL.
 * Never issues a signed URL solely because someone provides a storagePath or document ID.
 */
export async function getAuthorizedDocumentSignedUrl(
  storagePath: string,
  user: UserAccount | null | undefined,
  doc: DocumentRecord | null | undefined,
  applications?: ApplicationRecord[],
  expiresInSeconds: number = 3600
): Promise<{ url: string | null; error?: string }> {
  if (!user) {
    return { url: null, error: 'Authentication required to access private documents.' };
  }
  if (!doc) {
    return { url: null, error: 'Document metadata record not found.' };
  }
  if (!canUserAccessDocument(user, doc, applications)) {
    return {
      url: null,
      error: 'Access Denied: You do not possess the required permissions to view this document.',
    };
  }

  const url = await getDocumentSignedUrlWithCache(storagePath, expiresInSeconds);
  if (!url) {
    return { url: null, error: 'Unable to generate signed URL from storage bucket.' };
  }

  return { url };
}

/**
 * Normalizes raw category string to the canonical DocumentCategory union.
 */
export function normalizeDocumentCategory(rawCategory: string): DocumentCategory {
  const c = (rawCategory || '').toLowerCase();
  if (c.includes('infra') || c.includes('safety') || c.includes('building')) return 'Infrastructure';
  if (c.includes('qual') || c.includes('degree') || c.includes('phd')) return 'Qualifications';
  if (c.includes('exp') || c.includes('service') || c.includes('relieving')) return 'Experience Certificates';
  if (c.includes('faculty') || c.includes('roster') || c.includes('cadre') || c.includes('appointment')) {
    return 'Faculty Records';
  }
  if (
    c.includes('student') ||
    c.includes('roll') ||
    c.includes('merit') ||
    c.includes('admission') ||
    c.includes('submission')
  ) {
    return 'Student Records';
  }
  if (c.includes('finan') || c.includes('trust') || c.includes('audit') || c.includes('deed')) {
    return 'Financial & Trust Deeds';
  }
  return 'Approvals';
}

/**
 * Maps a persisted Supabase document row to the full frontend DocumentRecord.
 */
export function mapSupabaseDocumentToRecord(
  row: SupabaseDocumentRow,
  institutions: Institution[] = []
): DocumentRecord {
  const inst = institutions.find((i) => i.id === row.institution_id);
  const instName = inst ? inst.name : row.institution_id || 'Statutory Institution';
  const cat = normalizeDocumentCategory(row.category);
  const cleanFileName = row.original_filename || 'document.pdf';
  const cleanTitle = cleanFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const uploadedDate = (row.uploaded_at || new Date().toISOString()).slice(0, 10);
  const updatedDisplay = formatTimestampForDisplay(row.updated_at || row.uploaded_at);

  const docId = row.id;
  const internalCode = `DOC-${row.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;

  return {
    id: docId,
    internalCode,
    name: cleanTitle,
    category: cat,
    suggestedAiCategory: cat,
    suggestedFolder: `/Repository/${cat.replace(/\s+/g, '-')}`,
    categoryConfirmed: true,
    institutionId: row.institution_id,
    institutionName: instName,
    personName: cleanTitle,
    personUserId: row.owner_id,
    uploadedByUserId: row.owner_id,
    certificateNumber: `CERT-${row.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`,
    issuingAuthority: 'Competent Statutory Authority',
    issueDate: uploadedDate,
    uploadDate: uploadedDate,
    fileName: cleanFileName,
    fileSize: '1.45 MB',
    mimeType: (['application/pdf', 'image/jpeg', 'image/png'].includes(row.mime_type)
      ? row.mime_type
      : 'application/pdf') as 'application/pdf' | 'image/jpeg' | 'image/png',
    storagePath: row.storage_path,
    verificationStatusLabel: (row.status as any) || 'Pending Verification',
    approvalStatusLabel: 'Under Review',
    statusUpdatedAt: updatedDisplay,
    completenessStatus: 'Complete',
    consistencyStatus: 'Consistent',
    anomalyStatus: 'No Anomaly Detected',
    issuerVerificationStatus: 'Pending',
    humanReviewStatus: 'Pending',
    extractedSummary: {
      'Storage Path': row.storage_path,
      'Original File': cleanFileName,
      Category: cat,
      Source: 'Supabase veridex-documents (Persistent Storage)',
    },
    findings: [],
    versions: [
      {
        versionNumber: 1,
        fileName: cleanFileName,
        fileSize: '1.45 MB',
        mimeType: (['application/pdf', 'image/jpeg', 'image/png'].includes(row.mime_type)
          ? row.mime_type
          : 'application/pdf') as 'application/pdf' | 'image/jpeg' | 'image/png',
        storagePath: row.storage_path,
        uploadedAt: updatedDisplay,
        uploadedBy: 'Authenticated Submitter',
        changeNote: 'Uploaded to veridex-documents private repository',
      },
    ],
  };
}

/**
 * Persists document metadata into the Supabase documents table.
 */
export async function persistDocumentToSupabase(params: {
  institutionId: string;
  ownerId: string;
  category: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  status?: string;
}): Promise<{ success: boolean; documentId?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database is not connected.' };
  }

  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        institution_id: params.institutionId,
        owner_id: params.ownerId,
        category: params.category,
        storage_path: params.storagePath,
        original_filename: params.originalFilename,
        mime_type: params.mimeType,
        status: params.status || 'Pending Verification',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, documentId: data?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Atomic upload and persistence coordinator:
 * 1. Validates the file.
 * 2. Uploads the file to private storage bucket 'veridex-documents'.
 * 3. Saves document metadata in Supabase documents table.
 * 4. On partial failure (metadata insert fails after upload), rolls back the storage object.
 */
export async function uploadAndPersistDocument(params: {
  file: File;
  ownerId: string;
  category: string;
  institutionId: string;
  status?: string;
}): Promise<DocumentUploadResult> {
  const { file, ownerId, category, institutionId, status } = params;

  // 1. Validation
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 2. Storage upload
  const uploadResult = await uploadDocumentToStorage(file, ownerId, category);
  if (!uploadResult.success || !uploadResult.storagePath) {
    return {
      success: false,
      error: uploadResult.error || 'Failed to upload document file to storage bucket.',
    };
  }

  const storagePath = uploadResult.storagePath;

  // 3. Database persistence (when Supabase is configured)
  if (isSupabaseConfigured && supabase) {
    const metaResult = await persistDocumentToSupabase({
      institutionId,
      ownerId,
      category,
      storagePath,
      originalFilename: file.name,
      mimeType: file.type || 'application/pdf',
      status: status || 'Pending Verification',
    });

    if (!metaResult.success) {
      // Rollback orphaned storage object
      console.warn(
        '[VERIDEX Storage] Metadata persistence failed. Rolling back storage path:',
        storagePath
      );
      await deleteDocumentFromStorage(storagePath);
      return {
        success: false,
        error: `Database metadata persistence failed: ${metaResult.error}. Storage object rolled back.`,
      };
    }

    return {
      success: true,
      storagePath,
      documentId: metaResult.documentId,
    };
  }

  return {
    success: true,
    storagePath,
    isFallback: true,
  };
}

/**
 * Records a document review decision in the Supabase document_reviews table.
 */
export async function recordDocumentReview(params: {
  documentId: string;
  reviewerId: string;
  decision: 'Approved' | 'Rejected' | 'Revision Required';
  comments: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database is not connected.' };
  }

  try {
    const { error: reviewError } = await supabase
      .from('document_reviews')
      .insert({
        document_id: params.documentId,
        reviewer_id: params.reviewerId,
        decision: params.decision,
        comments: params.comments,
        reviewed_at: new Date().toISOString(),
      });

    if (reviewError) {
      return { success: false, error: reviewError.message };
    }

    // Also update document status if authorized
    const newDocStatus =
      params.decision === 'Approved'
        ? 'Verified'
        : params.decision === 'Rejected'
        ? 'Flagged for Review'
        : 'Additional Information Required';

    await supabase
      .from('documents')
      .update({ status: newDocStatus, updated_at: new Date().toISOString() })
      .eq('id', params.documentId);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetches documents from Supabase with fallbacks.
 */
export async function fetchDocumentsFromSupabase(params?: {
  institutionId?: string;
  ownerId?: string;
}): Promise<SupabaseDocumentRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    let query = supabase
      .from('documents')
      .select('id, institution_id, owner_id, category, storage_path, original_filename, mime_type, status, uploaded_at, updated_at')
      .order('uploaded_at', { ascending: false });

    if (params?.institutionId) {
      query = query.eq('institution_id', params.institutionId);
    }
    if (params?.ownerId) {
      query = query.eq('owner_id', params.ownerId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data as SupabaseDocumentRow[];
  } catch (err) {
    console.warn('[VERIDEX Documents] Error fetching documents:', err);
    return [];
  }
}
