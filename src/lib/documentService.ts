import { supabase, isSupabaseConfigured } from './supabase';
import { DocumentRecord, DocumentCategory } from '../types/portal';

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
}

const STORAGE_BUCKET = 'veridex-documents';

/**
 * Uploads a physical file to the private 'veridex-documents' storage bucket.
 */
export async function uploadDocumentToStorage(
  file: File,
  ownerId: string,
  category: string
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Supabase storage is not configured.' };
  }

  try {
    const safeOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeCategory = category.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${safeOwner}/${safeCategory}/${timestamp}_${sanitizedName}`;

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
