import { VaultDocumentRecord } from '../types/portal';
import { STORAGE_KEYS, safeWriteToStorage } from './storage';

const DB_NAME = 'veridex_personal_vault_db';
const DB_VERSION = 1;
const STORE_RECORDS = 'vault_records';
const STORE_BLOBS = 'vault_blobs';

interface StoredVaultBlobEntry {
  id: string;
  ownerUserId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  storedAt: string;
}

// In-memory fallback for environments without IndexedDB (e.g. Node unit tests or restricted private browsing)
const memoryRecords = new Map<string, VaultDocumentRecord>();
const memoryBlobs = new Map<string, StoredVaultBlobEntry>();

export function formatFileSizeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isIndexedDbSupported(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

function openVaultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          const recordStore = db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
          recordStore.createIndex('by_owner', 'ownerUserId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_BLOBS)) {
          const blobStore = db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
          blobStore.createIndex('by_owner', 'ownerUserId', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error('Could not open Personal Document Vault IndexedDB.'));
    } catch (err) {
      reject(err instanceof Error ? err : new Error('IndexedDB open failed.'));
    }
  });
}

function syncVaultMetadataBackupToLocalStorage(records: VaultDocumentRecord[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.vaultMetadataIndex);
    const existing: VaultDocumentRecord[] = raw ? JSON.parse(raw) : [];
    const byId = new Map<string, VaultDocumentRecord>();
    if (Array.isArray(existing)) {
      for (const item of existing) {
        if (item && typeof item.id === 'string') {
          byId.set(item.id, item);
        }
      }
    }
    for (const rec of records) {
      byId.set(rec.id, rec);
    }
    safeWriteToStorage(STORAGE_KEYS.vaultMetadataIndex, Array.from(byId.values()));
  } catch {
    // ignore backup metadata write errors
  }
}

function removeVaultMetadataFromLocalStorage(documentId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.vaultMetadataIndex);
    if (!raw) return;
    const existing: VaultDocumentRecord[] = JSON.parse(raw);
    if (!Array.isArray(existing)) return;
    const filtered = existing.filter((item) => item && item.id !== documentId);
    safeWriteToStorage(STORAGE_KEYS.vaultMetadataIndex, filtered);
  } catch {
    // ignore
  }
}

const VALID_DOC_CATEGORIES = new Set<string>([
  'Approvals',
  'Infrastructure',
  'Qualifications',
  'Experience Certificates',
  'Faculty Records',
  'Student Records',
  'Financial & Trust Deeds',
]);

export function normalizeVaultDocumentRecord(
  rawInput: Record<string, any>
): VaultDocumentRecord {
  const raw = rawInput as VaultDocumentRecord;
  const rawAny = rawInput as Record<string, any>;
  const rawEditable = (raw.editableDetails || {}) as Record<string, any>;

  const resolvedTitle =
    (typeof rawEditable.title === 'string' && rawEditable.title.trim()) ||
    (typeof raw.title === 'string' && raw.title.trim()) ||
    (typeof raw.originalFileName === 'string' && raw.originalFileName.replace(/\.[^.]+$/, '')) ||
    (typeof raw.fileName === 'string' && raw.fileName.replace(/\.[^.]+$/, '')) ||
    'Saved Vault Document';

  const resolvedCertNo =
    (typeof rawEditable.certificateNumber === 'string' && rawEditable.certificateNumber.trim()) ||
    (typeof rawEditable.documentNumber === 'string' && rawEditable.documentNumber.trim()) ||
    `VLT-${String(raw.id || 'DOC').slice(-6).toUpperCase()}`;

  const resolvedFileName =
    (typeof raw.originalFileName === 'string' && raw.originalFileName.trim()) ||
    (typeof raw.fileName === 'string' && raw.fileName.trim()) ||
    `${resolvedTitle.replace(/\s+/g, '_')}.pdf`;

  const candidateCat = raw.category || raw.documentCategory || rawAny.category;
  const resolvedCategory = VALID_DOC_CATEGORIES.has(String(candidateCat))
    ? (candidateCat as VaultDocumentRecord['category'])
    : 'Student Records';

  const hasBlob = Boolean(raw.hasStoredBlob ?? raw.hasStoredFileBlob);

  return {
    ...raw,
    originalFileName: resolvedFileName,
    fileName: resolvedFileName,
    title: resolvedTitle,
    category: resolvedCategory,
    documentCategory: resolvedCategory,
    hasStoredBlob: hasBlob,
    hasStoredFileBlob: hasBlob,
    editableDetails: {
      title: resolvedTitle,
      certificateNumber: resolvedCertNo,
      documentNumber: resolvedCertNo,
      holderName:
        (typeof rawEditable.holderName === 'string' && rawEditable.holderName.trim()) ||
        raw.ownerName ||
        'Document Holder',
      issuingAuthority:
        (typeof rawEditable.issuingAuthority === 'string' && rawEditable.issuingAuthority.trim()) ||
        'Competent Issuing Authority',
      issueDate:
        (typeof rawEditable.issueDate === 'string' && rawEditable.issueDate.trim()) ||
        (typeof raw.dateAdded === 'string' ? raw.dateAdded.slice(0, 10) : '2026-01-01'),
      expiryDate:
        typeof rawEditable.expiryDate === 'string' && rawEditable.expiryDate.trim()
          ? rawEditable.expiryDate.trim()
          : undefined,
      notes: typeof rawEditable.notes === 'string' ? rawEditable.notes : undefined,
    },
  };
}

function readBackupMetadataForUser(ownerUserId: string): VaultDocumentRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.vaultMetadataIndex);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is VaultDocumentRecord =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as VaultDocumentRecord).id === 'string' &&
          (item as VaultDocumentRecord).ownerUserId === ownerUserId
      )
      .map(normalizeVaultDocumentRecord);
  } catch {
    return [];
  }
}

/**
 * Saves or updates a VaultDocumentRecord and optionally stores its binary File/Blob in IndexedDB.
 * Never stores large Base64 file contents in localStorage.
 */
export async function saveVaultDocumentWithBlob(
  record: VaultDocumentRecord,
  fileOrBlob?: Blob | File | null
): Promise<{ ok: boolean; record: VaultDocumentRecord; error?: string }> {
  const hasBlob = Boolean(fileOrBlob && fileOrBlob.size > 0);
  const normalizedInput = normalizeVaultDocumentRecord(record);
  const finalRecord: VaultDocumentRecord = {
    ...normalizedInput,
    hasStoredBlob: hasBlob ? true : normalizedInput.hasStoredBlob,
    hasStoredFileBlob: hasBlob ? true : normalizedInput.hasStoredBlob,
  };


  memoryRecords.set(finalRecord.id, finalRecord);
  if (fileOrBlob && fileOrBlob.size > 0) {
    memoryBlobs.set(finalRecord.id, {
      id: finalRecord.id,
      ownerUserId: finalRecord.ownerUserId,
      blob: fileOrBlob,
      fileName: finalRecord.originalFileName,
      mimeType: finalRecord.mimeType,
      size: fileOrBlob.size,
      storedAt: finalRecord.updatedAt,
    });
  }

  syncVaultMetadataBackupToLocalStorage([finalRecord]);

  if (!isIndexedDbSupported()) {
    return { ok: true, record: finalRecord };
  }

  try {
    const db = await openVaultDatabase();
    await new Promise<void>((resolve, reject) => {
      const storeNames = fileOrBlob
        ? [STORE_RECORDS, STORE_BLOBS]
        : [STORE_RECORDS];
      const tx = db.transaction(storeNames, 'readwrite');

      tx.objectStore(STORE_RECORDS).put(finalRecord);

      if (fileOrBlob && fileOrBlob.size > 0) {
        const blobEntry: StoredVaultBlobEntry = {
          id: finalRecord.id,
          ownerUserId: finalRecord.ownerUserId,
          blob: fileOrBlob,
          fileName: finalRecord.originalFileName,
          mimeType: finalRecord.mimeType,
          size: fileOrBlob.size,
          storedAt: finalRecord.updatedAt,
        };
        tx.objectStore(STORE_BLOBS).put(blobEntry);
      }

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error || new Error('IndexedDB transaction failed while saving vault document.'));
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error('IndexedDB transaction was aborted.'));
      };
    });

    return { ok: true, record: finalRecord };
  } catch (err) {
    return {
      ok: false,
      record: finalRecord,
      error:
        err instanceof Error
          ? err.message
          : 'Browser storage could not save the document binary in IndexedDB.',
    };
  }
}

/**
 * Updates only the structured metadata of an existing vault document without overwriting or duplicating its stored binary Blob.
 */
export async function updateVaultDocumentMetadata(
  record: VaultDocumentRecord
): Promise<{ ok: boolean; record: VaultDocumentRecord; error?: string }> {
  return saveVaultDocumentWithBlob(record, null);
}

/**
 * Lists all Personal Document Vault records owned by a specific user.
 * Enforces strict user isolation: never returns another user's vault records.
 */
export async function getVaultDocumentsForUser(
  ownerUserId: string
): Promise<VaultDocumentRecord[]> {
  if (!ownerUserId) return [];

  const combined = new Map<string, VaultDocumentRecord>();

  // 1. Seed from memory cache
  for (const rec of memoryRecords.values()) {
    if (rec.ownerUserId === ownerUserId) {
      combined.set(rec.id, rec);
    }
  }

  // 2. Seed from lightweight metadata index
  for (const rec of readBackupMetadataForUser(ownerUserId)) {
    if (!combined.has(rec.id)) {
      combined.set(rec.id, rec);
    }
  }

  // 3. Read authoritative records and blob presence from IndexedDB
  if (isIndexedDbSupported()) {
    try {
      const db = await openVaultDatabase();
      const idbRecords = await new Promise<VaultDocumentRecord[]>((resolve, reject) => {
        const tx = db.transaction([STORE_RECORDS, STORE_BLOBS], 'readonly');
        const recordStore = tx.objectStore(STORE_RECORDS);
        const blobStore = tx.objectStore(STORE_BLOBS);
        const ownerIdx = recordStore.index('by_owner');
        const req = ownerIdx.getAll(ownerUserId);

        req.onsuccess = () => {
          const rows = (req.result || []) as VaultDocumentRecord[];
          if (rows.length === 0) {
            resolve([]);
            return;
          }
          let pending = rows.length;
          const verifiedRows: VaultDocumentRecord[] = [];
          for (const row of rows) {
            const countReq = blobStore.count(row.id);
            countReq.onsuccess = () => {
              verifiedRows.push({
                ...row,
                hasStoredBlob: countReq.result > 0 || memoryBlobs.has(row.id),
              });
              pending -= 1;
              if (pending === 0) resolve(verifiedRows);
            };
            countReq.onerror = () => {
              verifiedRows.push(row);
              pending -= 1;
              if (pending === 0) resolve(verifiedRows);
            };
          }
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });

      for (const rawRec of idbRecords) {
        if (rawRec.ownerUserId === ownerUserId) {
          const rec = normalizeVaultDocumentRecord(rawRec);
          combined.set(rec.id, rec);
          memoryRecords.set(rec.id, rec);
        }
      }
    } catch {
      // Fall back to in-memory / metadata backup gracefully
    }
  }

  return Array.from(combined.values())
    .map(normalizeVaultDocumentRecord)
    .sort((a, b) =>
      (b.updatedAt || b.dateAdded).localeCompare(a.updatedAt || a.dateAdded)
    );
}

/**
 * Retrieves the original File/Blob binary for a vault document from IndexedDB.
 * Returns null if the blob is missing or unavailable instead of crashing.
 */
export async function getVaultDocumentBlob(documentId: string): Promise<Blob | null> {
  if (!documentId) return null;
  const mem = memoryBlobs.get(documentId);
  if (mem?.blob) return mem.blob;

  if (!isIndexedDbSupported()) return null;

  try {
    const db = await openVaultDatabase();
    const entry = await new Promise<StoredVaultBlobEntry | undefined>((resolve, reject) => {
      const tx = db.transaction([STORE_BLOBS], 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const req = store.get(documentId);
      req.onsuccess = () => resolve(req.result as StoredVaultBlobEntry | undefined);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
    if (entry && entry.blob instanceof Blob) {
      memoryBlobs.set(documentId, entry);
      return entry.blob;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Creates a temporary object URL for previewing or downloading a stored vault document blob,
 * paired with a `revoke()` cleanup callback so temporary object URLs are properly released.
 */
export async function createVaultBlobObjectUrl(
  documentId: string
): Promise<{ url: string; mimeType: string; fileName: string; revoke: () => void } | null> {
  const blob = await getVaultDocumentBlob(documentId);
  if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return null;
  }
  const rec = memoryRecords.get(documentId);
  const url = URL.createObjectURL(blob);
  let revoked = false;
  return {
    url,
    mimeType: blob.type || rec?.mimeType || 'application/pdf',
    fileName: rec?.originalFileName || 'Document',
    revoke: () => {
      if (!revoked) {
        revoked = true;
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      }
    },
  };
}

/**
 * Deletes a document and its binary blob from the Personal Document Vault for the specified owner.
 */
export async function deleteVaultDocument(
  documentId: string,
  ownerUserId: string
): Promise<boolean> {
  const existing = memoryRecords.get(documentId);
  if (existing && existing.ownerUserId !== ownerUserId) {
    return false;
  }

  memoryRecords.delete(documentId);
  memoryBlobs.delete(documentId);
  removeVaultMetadataFromLocalStorage(documentId);

  if (!isIndexedDbSupported()) return true;

  try {
    const db = await openVaultDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDS, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_RECORDS).delete(documentId);
      tx.objectStore(STORE_BLOBS).delete(documentId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
    return true;
  } catch {
    return false;
  }
}

export function clearMemoryVaultForTesting(): void {
  memoryRecords.clear();
  memoryBlobs.clear();
}
