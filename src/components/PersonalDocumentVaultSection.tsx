import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Camera,
  Search,
  Sparkles,
  FileText,
  Eye,
  Download,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  RefreshCw,
  Loader2,
  Edit3,
  FolderLock,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';
import {
  DocumentCategory,
  OcrProcessingStatus,
  UserAccount,
  VaultDocumentRecord,
} from '../types/portal';
import {
  createRecordId,
  formatTimestampForDisplay,
  getCurrentIsoTimestamp,
  getLocalTodayDate,
  suggestDocumentCategory,
} from '../lib/domain';
import {
  createVaultBlobObjectUrl,
  deleteVaultDocument,
  formatFileSizeBytes,
  getVaultDocumentsForUser,
  saveVaultDocumentWithBlob,
  updateVaultDocumentMetadata,
} from '../lib/vaultStorage';
import {
  MAX_VAULT_FILE_SIZE_BYTES,
  SupportedVaultMimeType,
  processDocumentOcrInBrowser,
  validateVaultFileInput,
} from '../lib/ocrEngine';
import { EmptyStateCard, FileTypeMarker, StatusBadge } from './StatusPrimitives';

const VAULT_CATEGORIES: Array<'All' | DocumentCategory> = [
  'All',
  'Student Records',
  'Qualifications',
  'Experience Certificates',
  'Faculty Records',
  'Approvals',
  'Infrastructure',
  'Financial & Trust Deeds',
];

interface PersonalDocumentVaultSectionProps {
  currentUser: UserAccount;
  onSyncVaultToRepository?: (vaultDoc: VaultDocumentRecord, previewUrl?: string) => void;
  onSyncToRepository?: (vaultDoc: VaultDocumentRecord, previewUrl?: string) => void;
  onVaultUpdated?: (records: VaultDocumentRecord[]) => void;
  compactMode?: boolean;
}

export const PersonalDocumentVaultSection: React.FC<PersonalDocumentVaultSectionProps> = ({
  currentUser,
  onSyncVaultToRepository,
  onSyncToRepository,
  onVaultUpdated,
  compactMode = false,
}) => {
  const syncVaultCallback = onSyncVaultToRepository || onSyncToRepository;
  const [vaultDocs, setVaultDocs] = useState<VaultDocumentRecord[]>([]);
  const [isLoadingVault, setIsLoadingVault] = useState<boolean>(true);
  const [vaultSearch, setVaultSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | DocumentCategory>('All');
  const [vaultNotice, setVaultNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Add / Upload / Scan Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<SupportedVaultMimeType>('application/pdf');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadModalError, setUploadModalError] = useState<string | null>(null);

  // OCR Processing State
  const [ocrStatus, setOcrStatus] = useState<OcrProcessingStatus>('Not Run');
  const [ocrProgressText, setOcrProgressText] = useState<string>('');
  const [ocrProgressPct, setOcrProgressPct] = useState<number>(0);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [ocrExtractedText, setOcrExtractedText] = useState<string>('');
  const [ocrEngineUsed, setOcrEngineUsed] = useState<
    'tesseract-image-ocr' | 'pdf-text-layer' | 'manual'
  >('manual');
  const ocrAbortRef = useRef<AbortController | null>(null);

  // Editable Metadata Fields (User can review and correct before saving)
  const todayStr = getLocalTodayDate();
  const [docTitle, setDocTitle] = useState<string>('');
  const [certNumber, setCertNumber] = useState<string>('');
  const [holderName, setHolderName] = useState<string>(currentUser.fullName);
  const [issuingAuthority, setIssuingAuthority] = useState<string>('University of Mumbai');
  const [issueDate, setIssueDate] = useState<string>(todayStr);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>(
    currentUser.role === 'student' ? 'Student Records' : 'Qualifications'
  );
  const [docNotes, setDocNotes] = useState<string>('');
  const [isSavingToVault, setIsSavingToVault] = useState<boolean>(false);

  // Camera Scanning State (Optional browser camera capture)
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [captureRotation, setCaptureRotation] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Inspect / Edit Saved Vault Document Drawer State
  const [inspectedDoc, setInspectedDoc] = useState<VaultDocumentRecord | null>(null);
  const [inspectedBlobUrl, setInspectedBlobUrl] = useState<string | null>(null);
  const revokeInspectedBlobRef = useRef<(() => void) | null>(null);
  const [isEditingSavedDoc, setIsEditingSavedDoc] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCertNo, setEditCertNo] = useState<string>('');
  const [editHolder, setEditHolder] = useState<string>('');
  const [editAuthority, setEditAuthority] = useState<string>('');
  const [editIssueDate, setEditIssueDate] = useState<string>('');
  const [editExpiryDate, setEditExpiryDate] = useState<string>('');
  const [editCategory, setEditCategory] = useState<DocumentCategory>('Student Records');
  const [editOcrText, setEditOcrText] = useState<string>('');

  const loadUserVault = async () => {
    setIsLoadingVault(true);
    try {
      const records = await getVaultDocumentsForUser(currentUser.id);
      setVaultDocs(records);
      onVaultUpdated?.(records);
    } catch {
      setVaultNotice({
        type: 'error',
        text: 'Could not read Personal Document Vault from browser storage.',
      });
    } finally {
      setIsLoadingVault(false);
    }
  };

  useEffect(() => {
    void loadUserVault();
  }, [currentUser.id]);

  // Clean up temporary preview URLs and camera streams on unmount
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        try {
          URL.revokeObjectURL(localPreviewUrl);
        } catch {
          // ignore
        }
      }
      if (revokeInspectedBlobRef.current) {
        revokeInspectedBlobRef.current();
      }
      stopCameraStream();
      ocrAbortRef.current?.abort();
    };
  }, []);

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const resetUploadModal = () => {
    ocrAbortRef.current?.abort();
    ocrAbortRef.current = null;
    if (localPreviewUrl) {
      try {
        URL.revokeObjectURL(localPreviewUrl);
      } catch {
        // ignore
      }
    }
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setUploadModalError(null);
    setOcrStatus('Not Run');
    setOcrProgressText('');
    setOcrProgressPct(0);
    setOcrMessage(null);
    setOcrExtractedText('');
    setOcrEngineUsed('manual');
    setDocTitle('');
    setCertNumber('');
    setHolderName(currentUser.fullName);
    setIssuingAuthority(
      currentUser.institutionName || 'University of Mumbai & Statutory Authority'
    );
    setIssueDate(todayStr);
    setExpiryDate('');
    setDocCategory(currentUser.role === 'student' ? 'Student Records' : 'Qualifications');
    setDocNotes('');
  };

  const handleSelectDeviceFile = (file: File) => {
    setUploadModalError(null);
    const validation = validateVaultFileInput(file, MAX_VAULT_FILE_SIZE_BYTES);
    if (!validation.valid || !validation.normalizedMimeType) {
      setUploadModalError(validation.error || 'Unsupported file selected.');
      return;
    }

    if (localPreviewUrl) {
      try {
        URL.revokeObjectURL(localPreviewUrl);
      } catch {
        // ignore
      }
    }

    const preview =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(file)
        : null;

    setSelectedFile(file);
    setSelectedMimeType(validation.normalizedMimeType);
    setLocalPreviewUrl(preview);
    setOcrStatus('Not Run');
    setOcrMessage(null);
    setOcrExtractedText('');

    const inferredTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    if (!docTitle) {
      setDocTitle(inferredTitle || 'Uploaded Document');
    }
    const suggestion = suggestDocumentCategory(file.name, inferredTitle);
    if (currentUser.role === 'student') {
      setDocCategory('Student Records');
    } else {
      setDocCategory(suggestion.category);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleSelectDeviceFile(file);
  };

  const handleRunOcr = async () => {
    if (!selectedFile) {
      setUploadModalError('Please select or scan a document before running OCR.');
      return;
    }
    if (ocrStatus === 'Processing') return; // Prevent duplicate OCR jobs

    setUploadModalError(null);
    setOcrStatus('Processing');
    setOcrProgressPct(5);
    setOcrProgressText('Starting client-side text extraction...');
    setOcrMessage(null);

    const abortController = new AbortController();
    ocrAbortRef.current = abortController;

    const outcome = await processDocumentOcrInBrowser({
      file: selectedFile,
      fileName: selectedFile.name,
      mimeType: selectedMimeType,
      defaultHolderName: currentUser.fullName,
      signal: abortController.signal,
      onProgress: (upd) => {
        setOcrProgressText(upd.status);
        setOcrProgressPct(upd.progress);
      },
    });

    ocrAbortRef.current = null;
    setOcrStatus(outcome.ocrStatus);
    setOcrExtractedText(outcome.extractedText);
    setOcrEngineUsed(outcome.engineUsed);
    setOcrMessage(outcome.message);

    // Pre-fill editable fields for user review without overwriting intentional user edits if empty
    if (outcome.suggestedFields.title && (!docTitle || docTitle === 'Uploaded Document')) {
      setDocTitle(outcome.suggestedFields.title);
    }
    if (outcome.suggestedFields.certificateNumber && !certNumber) {
      setCertNumber(outcome.suggestedFields.certificateNumber);
    }
    if (outcome.suggestedFields.holderName) {
      setHolderName(outcome.suggestedFields.holderName);
    }
    if (outcome.suggestedFields.issuingAuthority) {
      setIssuingAuthority(outcome.suggestedFields.issuingAuthority);
    }
    if (outcome.suggestedFields.issueDate) {
      setIssueDate(outcome.suggestedFields.issueDate);
    }
  };

  const handleCancelOcr = () => {
    if (ocrAbortRef.current) {
      ocrAbortRef.current.abort();
      ocrAbortRef.current = null;
    }
    setOcrStatus('Cancelled');
    setOcrProgressText('');
    setOcrMessage('OCR processing was cancelled. You can retry or enter details manually.');
  };

  // Camera Scanning Handlers (Section 6.4)
  const handleOpenCameraModal = async () => {
    setCameraError(null);
    setCapturedDataUrl(null);
    setCaptureRotation(0);
    setCameraModalOpen(true);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraError(
        'Browser camera access is unavailable in this environment. Please use the file upload option instead.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(
        'Camera permission was denied or no camera device was found. You can close this dialog and upload an image or PDF file from your device.'
      );
    }
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera video feed is not ready yet.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedDataUrl(dataUrl);
    stopCameraStream();
  };

  const handleRotateCapturedImage = () => {
    if (!capturedDataUrl) return;
    const nextRot = (captureRotation + 90) % 360;
    setCaptureRotation(nextRot);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      setCapturedDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = capturedDataUrl;
  };

  const handleRetakeCameraScan = async () => {
    setCapturedDataUrl(null);
    setCameraError(null);
    await handleOpenCameraModal();
  };

  const handleConfirmCameraScan = async () => {
    if (!capturedDataUrl) return;
    try {
      const res = await fetch(capturedDataUrl);
      const blob = await res.blob();
      const scanFileName = `Camera_Scan_${getLocalTodayDate()}.png`;
      const scannedFile = new File([blob], scanFileName, { type: 'image/png' });

      stopCameraStream();
      setCameraModalOpen(false);
      setIsAddModalOpen(true);
      handleSelectDeviceFile(scannedFile);
    } catch {
      setCameraError('Could not convert camera capture into an image file.');
    }
  };

  const handleSaveToVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadModalError(null);

    if (!selectedFile) {
      setUploadModalError('Please select a document file or capture a camera scan before saving.');
      return;
    }
    if (!docTitle.trim()) {
      setUploadModalError('Please enter a descriptive document title.');
      return;
    }

    setIsSavingToVault(true);
    try {
      const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
      const vaultDocId = createRecordId('VAULT');
      const finalCertNo =
        certNumber.trim() || `REF-${vaultDocId.slice(-6).toUpperCase()}`;

      // Keep verification and approval strictly separate from upload and OCR (Section 4.2 & 6.3)
      const newVaultRecord: VaultDocumentRecord = {
        id: vaultDocId,
        ownerUserId: currentUser.id,
        ownerName: currentUser.fullName,
        institutionId: currentUser.institutionId,
        institutionName: currentUser.institutionName,
        originalFileName: selectedFile.name,
        mimeType: selectedMimeType,
        fileSizeBytes: selectedFile.size,
        fileSizeLabel: formatFileSizeBytes(selectedFile.size),
        category: docCategory,
        dateAdded: todayStr,
        updatedAt: nowDisplay,
        hasStoredBlob: true,
        ocrStatus,
        ocrExtractedText: ocrExtractedText.trim(),
        ocrEngineUsed,
        editableDetails: {
          title: docTitle.trim(),
          certificateNumber: finalCertNo,
          holderName: holderName.trim() || currentUser.fullName,
          issuingAuthority:
            issuingAuthority.trim() || 'Authorized Institutional / Statutory Body',
          issueDate: issueDate || todayStr,
          expiryDate: expiryDate || undefined,
          notes: docNotes.trim() || undefined,
        },
        verificationStatus: 'Pending Verification',
        approvalStatus: 'Not Submitted',
      };

      const saveRes = await saveVaultDocumentWithBlob(newVaultRecord, selectedFile);
      if (!saveRes.ok) {
        setUploadModalError(
          saveRes.error || 'Failed to store the original file in browser IndexedDB.'
        );
        setIsSavingToVault(false);
        return;
      }

      if (syncVaultCallback) {
        syncVaultCallback(saveRes.record, localPreviewUrl || undefined);
      }

      const refreshed = await getVaultDocumentsForUser(currentUser.id);
      setVaultDocs(refreshed);
      onVaultUpdated?.(refreshed);

      setVaultNotice({
        type: 'success',
        text: `Saved "${saveRes.record.editableDetails.title}" (${saveRes.record.originalFileName}) to your Personal Document Vault in IndexedDB.`,
      });
      setIsAddModalOpen(false);
      resetUploadModal();
    } catch {
      setUploadModalError('An unexpected browser storage error occurred while saving.');
    } finally {
      setIsSavingToVault(false);
    }
  };

  const handleInspectVaultDocument = async (doc: VaultDocumentRecord) => {
    if (revokeInspectedBlobRef.current) {
      revokeInspectedBlobRef.current();
      revokeInspectedBlobRef.current = null;
    }
    setInspectedBlobUrl(null);
    setInspectedDoc(doc);
    setIsEditingSavedDoc(false);
    setEditTitle(doc.editableDetails.title);
    setEditCertNo(doc.editableDetails.certificateNumber);
    setEditHolder(doc.editableDetails.holderName);
    setEditAuthority(doc.editableDetails.issuingAuthority);
    setEditIssueDate(doc.editableDetails.issueDate);
    setEditExpiryDate(doc.editableDetails.expiryDate || '');
    setEditCategory(doc.category);
    setEditOcrText(doc.ocrExtractedText);

    const objUrlRes = await createVaultBlobObjectUrl(doc.id);
    if (objUrlRes) {
      setInspectedBlobUrl(objUrlRes.url);
      revokeInspectedBlobRef.current = objUrlRes.revoke;
    }
  };

  const handleCloseInspectModal = () => {
    if (revokeInspectedBlobRef.current) {
      revokeInspectedBlobRef.current();
      revokeInspectedBlobRef.current = null;
    }
    setInspectedBlobUrl(null);
    setInspectedDoc(null);
    setIsEditingSavedDoc(false);
  };

  const handleSaveEditedMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectedDoc) return;
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const updated: VaultDocumentRecord = {
      ...inspectedDoc,
      category: editCategory,
      updatedAt: nowDisplay,
      ocrExtractedText: editOcrText.trim(),
      editableDetails: {
        ...inspectedDoc.editableDetails,
        title: editTitle.trim() || inspectedDoc.editableDetails.title,
        certificateNumber:
          editCertNo.trim() || inspectedDoc.editableDetails.certificateNumber,
        holderName: editHolder.trim() || inspectedDoc.editableDetails.holderName,
        issuingAuthority:
          editAuthority.trim() || inspectedDoc.editableDetails.issuingAuthority,
        issueDate: editIssueDate || inspectedDoc.editableDetails.issueDate,
        expiryDate: editExpiryDate || undefined,
      },
    };

    const res = await updateVaultDocumentMetadata(updated);
    if (res.ok) {
      setInspectedDoc(res.record);
      setIsEditingSavedDoc(false);
      if (syncVaultCallback) {
        syncVaultCallback(res.record, inspectedBlobUrl || undefined);
      }
      const refreshed = await getVaultDocumentsForUser(currentUser.id);
      setVaultDocs(refreshed);
      onVaultUpdated?.(refreshed);
      setVaultNotice({
        type: 'success',
        text: `Updated details for "${res.record.editableDetails.title}" without duplicating the vault document.`,
      });
    }
  };

  const handleRunDemoVerificationOnVaultDoc = async (doc: VaultDocumentRecord) => {
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const updated: VaultDocumentRecord = {
      ...doc,
      updatedAt: nowDisplay,
      verificationStatus: 'Verified in demo',
      // Keep approval status untouched (never auto-approve!)
    };
    const res = await updateVaultDocumentMetadata(updated);
    if (res.ok) {
      if (inspectedDoc?.id === doc.id) {
        setInspectedDoc(res.record);
      }
      if (syncVaultCallback) {
        syncVaultCallback(res.record);
      }
      const refreshed = await getVaultDocumentsForUser(currentUser.id);
      setVaultDocs(refreshed);
      onVaultUpdated?.(refreshed);
      setVaultNotice({
        type: 'info',
        text: `Demo verification check completed for "${doc.editableDetails.title}" (Status: Verified in demo). Reviewer approval remains separate.`,
      });
    }
  };

  const handleDeleteVaultDoc = async (doc: VaultDocumentRecord) => {
    const ok = await deleteVaultDocument(doc.id, currentUser.id);
    if (ok) {
      if (inspectedDoc?.id === doc.id) {
        handleCloseInspectModal();
      }
      const refreshed = await getVaultDocumentsForUser(currentUser.id);
      setVaultDocs(refreshed);
      onVaultUpdated?.(refreshed);
      setVaultNotice({
        type: 'info',
        text: `Removed "${doc.editableDetails.title}" from your Personal Document Vault.`,
      });
    }
  };

  const filteredVaultDocs = useMemo(() => {
    const q = vaultSearch.trim().toLowerCase();
    return vaultDocs.filter((doc) => {
      if (categoryFilter !== 'All' && doc.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        doc.editableDetails.title.toLowerCase().includes(q) ||
        doc.originalFileName.toLowerCase().includes(q) ||
        doc.editableDetails.certificateNumber.toLowerCase().includes(q) ||
        doc.editableDetails.holderName.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q) ||
        doc.ocrExtractedText.toLowerCase().includes(q)
      );
    });
  }, [vaultDocs, vaultSearch, categoryFilter]);

  return (
    <>
      <section
        aria-label="Personal Document Vault"
        data-testid="personal-document-vault-section"
        className="liquid-glass rounded-2xl p-5 sm:p-6 space-y-5 border border-[#C2410C]/35"
      >
      {/* Vault Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-stone-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#C2410C] dark:text-amber-400">
            <FolderLock className="w-4 h-4 text-[#046A38] dark:text-emerald-400" />
            <span>Personal Document Vault · Browser IndexedDB Storage &amp; Client-Side OCR</span>
          </div>
          <h2 className="text-lg font-display font-bold text-stone-900 dark:text-white">
            My Saved Documents ({vaultDocs.length})
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-3xl">
            Store original document files (PDF, JPG, PNG) in your browser&apos;s IndexedDB, extract text with client-side OCR, review and edit metadata, and reuse saved documents across multiple document requests without re-uploading.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="vault-scan-camera-btn"
            onClick={() => void handleOpenCameraModal()}
            className="btn-secondary !py-2 !px-3.5 text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-[#046A38]" />
            <span>Scan with Camera</span>
          </button>
          <button
            type="button"
            data-testid="vault-upload-new-btn"
            onClick={() => {
              resetUploadModal();
              setIsAddModalOpen(true);
            }}
            className="btn-primary !py-2 !px-3.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Upload &amp; OCR Document</span>
          </button>
        </div>
      </div>

      {/* Status Notice Banner */}
      {vaultNotice && (
        <div
          role="status"
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            vaultNotice.type === 'success'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : vaultNotice.type === 'error'
                ? 'bg-red-50/80 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-stone-800 dark:text-stone-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {vaultNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#C2410C] shrink-0" />
            )}
            <span>{vaultNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setVaultNotice(null)}
            aria-label="Dismiss vault notification"
            className="text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Category Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            data-testid="vault-search-input"
            aria-label="Search saved vault documents"
            value={vaultSearch}
            onChange={(e) => setVaultSearch(e.target.value)}
            placeholder="Search saved vault by title, filename, ref #, or OCR text..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white/90 dark:bg-stone-950 text-stone-900 dark:text-white"
          />
        </div>

        {!compactMode && (
          <div className="flex flex-wrap items-center gap-1.5">
            {VAULT_CATEGORIES.map((cat) => {
              const active = categoryFilter === cat;
              const count =
                cat === 'All'
                  ? vaultDocs.length
                  : vaultDocs.filter((d) => d.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#C2410C] text-white'
                      : 'bg-[#FCF9F2] dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-[#EFE6D5]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Vault Documents Grid / Table */}
      {isLoadingVault ? (
        <div className="p-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#C2410C]" />
          <span>Loading your Personal Document Vault from IndexedDB...</span>
        </div>
      ) : filteredVaultDocs.length === 0 ? (
        <EmptyStateCard
          title={
            vaultDocs.length === 0
              ? 'Your Personal Document Vault is Empty'
              : 'No Saved Documents Match Your Filter'
          }
          description={
            vaultDocs.length === 0
              ? 'Upload a PDF, JPG, or PNG document or use Scan with Camera to extract text with client-side OCR and store the original file in your browser vault for reuse across requests.'
              : 'Try clearing your search query or switching the document category filter.'
          }
          actionLabel={vaultDocs.length === 0 ? 'Upload & OCR Document' : 'Reset Filters'}
          onAction={
            vaultDocs.length === 0
              ? () => {
                  resetUploadModal();
                  setIsAddModalOpen(true);
                }
              : () => {
                  setVaultSearch('');
                  setCategoryFilter('All');
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVaultDocs.map((doc) => (
            <div
              key={doc.id}
              data-testid={`vault-doc-card-${doc.id}`}
              className="p-4 rounded-xl bg-white/90 dark:bg-stone-900/90 border border-stone-200/90 dark:border-stone-800 flex flex-col justify-between gap-3 shadow-2xs hover:border-[#C2410C]/50 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-sm text-stone-900 dark:text-white truncate">
                        {doc.editableDetails.title}
                      </h3>
                      <FileTypeMarker
                        mimeType={doc.mimeType}
                        fileName={doc.originalFileName}
                        fileSize={doc.fileSizeLabel}
                      />
                    </div>
                    <div className="text-[11px] font-mono-tabular text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#C2410C] dark:text-amber-400">
                        {doc.id}
                      </span>
                      <span>·</span>
                      <span>Ref #{doc.editableDetails.certificateNumber}</span>
                      <span>·</span>
                      <span>{doc.category}</span>
                    </div>
                  </div>
                </div>

                {/* Distinct File Binary, OCR, Verification, and Approval Statuses */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono-tabular font-semibold border ${
                      doc.hasStoredBlob
                        ? 'bg-emerald-500/10 text-[#046A38] dark:text-emerald-300 border-[#046A38]/30'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <HardDrive className="w-3 h-3" />
                    <span>{doc.hasStoredBlob ? 'Original File in IndexedDB' : 'Metadata Only'}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono-tabular font-semibold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300/60 dark:border-stone-700">
                    <Sparkles className="w-3 h-3 text-[#C2410C]" />
                    <span>OCR: {doc.ocrStatus}</span>
                  </span>

                  <StatusBadge
                    status={doc.verificationStatus}
                    customLabel={`Verification: ${doc.verificationStatus}`}
                    size="xs"
                  />

                  <StatusBadge
                    status={
                      doc.approvalStatus === 'Not Submitted'
                        ? 'Pending Upload'
                        : doc.approvalStatus
                    }
                    customLabel={`Approval: ${doc.approvalStatus}`}
                    size="xs"
                  />
                </div>

                {doc.ocrExtractedText && (
                  <div className="p-2 rounded-lg bg-[#FCF9F2] dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 font-mono-tabular">
                    <strong className="text-stone-800 dark:text-stone-200">OCR Text: </strong>
                    {doc.ocrExtractedText}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-mono-tabular text-stone-500">
                  Added: {doc.dateAdded} · {doc.originalFileName}
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleInspectVaultDocument(doc)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#EFE6D5] dark:bg-stone-800 hover:bg-[#C2410C] hover:text-white text-stone-900 dark:text-stone-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details &amp; Preview</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Browser-Local Persistence Notice */}
      <div className="p-3 rounded-xl bg-stone-100/80 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 flex items-start gap-2">
        <HardDrive className="w-4 h-4 text-[#046A38] shrink-0 mt-0.5" />
        <div>
          <strong>Browser-Local Vault Storage Notice:</strong> Original document files are stored locally in this browser&apos;s IndexedDB and scoped to your user ID ({currentUser.id}). They persist across page refreshes in this browser, but are not uploaded to a cloud server or automatically synchronized across different devices or separate browsers.
        </div>
      </div>
      </section>

      {/* Add / Upload & OCR Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vault-upload-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-modal-backdrop"
            onClick={() => {
              setIsAddModalOpen(false);
              resetUploadModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="liquid-glass-floating rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/45 flex flex-col max-h-[90vh]"
            >
              <div className="h-1.5 w-full tricolour-bar shrink-0" />

              <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 flex items-start justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900 shrink-0">
                <div>
                  <span className="text-[10px] font-mono-tabular font-bold text-[#C2410C] uppercase tracking-wider block">
                    Personal Document Vault · Client-Side OCR &amp; IndexedDB
                  </span>
                  <h3
                    id="vault-upload-modal-title"
                    className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white"
                  >
                    Upload Document, Extract Text (OCR) &amp; Save to Vault
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Supported formats: JPG, JPEG, PNG, and PDF (up to 15 MB).
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close vault upload modal"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetUploadModal();
                  }}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => void handleSaveToVault(e)}
                className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs text-stone-900 dark:text-stone-100"
                noValidate
              >
                {uploadModalError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{uploadModalError}</span>
                  </div>
                )}

                {/* Step 1: Select File or Scan */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-stone-900 dark:text-white">
                      1. Select Original File or Capture Scan
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        void handleOpenCameraModal();
                      }}
                      className="text-xs font-semibold text-[#046A38] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Switch to Camera Scanner</span>
                    </button>
                  </div>

                  <input
                    id="vault-file-input"
                    data-testid="vault-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileInputChange}
                    aria-label="Select document file for Personal Document Vault"
                    className="w-full text-xs text-stone-600 dark:text-stone-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#C2410C] file:text-white hover:file:bg-[#9A3412] cursor-pointer"
                  />

                  {selectedFile && (
                    <div className="p-3 rounded-lg bg-[#FCF9F2] dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-mono-tabular">
                          <span className="font-bold text-stone-900 dark:text-white">
                            {selectedFile.name}
                          </span>
                          <span className="text-stone-500 ml-2">
                            ({selectedMimeType} · {formatFileSizeBytes(selectedFile.size)})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {ocrStatus === 'Processing' ? (
                            <button
                              type="button"
                              onClick={handleCancelOcr}
                              className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                            >
                              Cancel OCR
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-testid="vault-run-ocr-btn"
                              onClick={() => void handleRunOcr()}
                              className="px-3 py-1.5 rounded-lg bg-[#046A38] hover:bg-[#03542C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>
                                {ocrStatus === 'Completed'
                                  ? 'Re-Run Client-Side OCR'
                                  : 'Extract Text with OCR'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* File Preview */}
                      {localPreviewUrl && (
                        <div className="rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-2 max-h-48 flex items-center justify-center">
                          {selectedMimeType.startsWith('image/') ? (
                            <img
                              src={localPreviewUrl}
                              alt={selectedFile.name}
                              className="max-h-44 object-contain rounded"
                            />
                          ) : (
                            <iframe
                              src={localPreviewUrl}
                              title={selectedFile.name}
                              className="w-full h-40 border-0 rounded"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 2: OCR Progress & Extracted Text Review */}
                {selectedFile && (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-white">
                        2. OCR Text Extraction &amp; User Review
                      </span>
                      <span className="font-mono-tabular text-[11px] text-stone-500">
                        OCR Status: <strong>{ocrStatus}</strong>
                      </span>
                    </div>

                    {ocrStatus === 'Processing' && (
                      <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-stone-950 border border-amber-300 dark:border-stone-800 space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium text-stone-800 dark:text-stone-200">
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-[#C2410C] animate-spin" />
                            <span>{ocrProgressText || 'Processing document in browser...'}</span>
                          </span>
                          <span className="font-mono-tabular font-bold">{ocrProgressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                          <div
                            className="h-full bg-[#C2410C] transition-all duration-200"
                            style={{ width: `${Math.max(8, ocrProgressPct)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {ocrMessage && (
                      <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-700 dark:text-stone-300">
                        {ocrMessage}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="vault-ocr-text"
                        className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1"
                      >
                        Extracted / Editable Document Text (Review &amp; correct any OCR misreads before saving)
                      </label>
                      <textarea
                        id="vault-ocr-text"
                        data-testid="vault-ocr-textarea"
                        rows={3}
                        value={ocrExtractedText}
                        onChange={(e) => setOcrExtractedText(e.target.value)}
                        placeholder="Click 'Extract Text with OCR' above to populate from image/PDF, or type/correct extracted text here..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-[#FCF9F2] dark:bg-stone-950 font-mono-tabular"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Editable Document Metadata */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 dark:text-white">
                      3. Review &amp; Confirm Document Metadata
                    </span>
                    <span className="text-[11px] text-stone-500">
                      Saved as Pending Verification (OCR does not auto-approve)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="vault-doc-title"
                        className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Document Title *
                      </label>
                      <input
                        id="vault-doc-title"
                        data-testid="vault-doc-title-input"
                        type="text"
                        required
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g. Semester IV Marksheet / Fee Receipt"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="vault-cert-number"
                        className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Certificate / Reference Number
                      </label>
                      <input
                        id="vault-cert-number"
                        data-testid="vault-cert-number-input"
                        type="text"
                        value={certNumber}
                        onChange={(e) => setCertNumber(e.target.value)}
                        placeholder="e.g. UOM/2026/8841"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono-tabular"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="vault-holder-name"
                        className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Document Holder Name
                      </label>
                      <input
                        id="vault-holder-name"
                        type="text"
                        value={holderName}
                        onChange={(e) => setHolderName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="vault-category"
                        className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Document Category
                      </label>
                      <select
                        id="vault-category"
                        value={docCategory}
                        onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                      >
                        {VAULT_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="vault-authority"
                        className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1"
                      >
                        Issuing Authority
                      </label>
                      <input
                        id="vault-authority"
                        type="text"
                        value={issuingAuthority}
                        onChange={(e) => setIssuingAuthority(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="vault-issue-date"
                          className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1"
                        >
                          Issue Date
                        </label>
                        <input
                          id="vault-issue-date"
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="vault-expiry-date"
                          className="block text-[11px] font-medium text-stone-700 dark:text-stone-300 mb-1"
                        >
                          Expiry Date (Optional)
                        </label>
                        <input
                          id="vault-expiry-date"
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono-tabular"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      resetUploadModal();
                    }}
                    className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="vault-save-document-btn"
                    disabled={isSavingToVault}
                    className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isSavingToVault ? 'Saving to IndexedDB...' : 'Save to Personal Vault'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Optional Browser Camera Capture Modal */}
      <AnimatePresence>
        {cameraModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Camera Document Scanner"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-modal-backdrop"
            onClick={() => {
              stopCameraStream();
              setCameraModalOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="liquid-glass-floating rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/45 flex flex-col"
            >
              <div className="h-1.5 w-full tricolour-bar shrink-0" />
              <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-[#FCF9F2] dark:bg-stone-900">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#046A38]" />
                  <h3 className="font-display font-bold text-sm text-stone-900 dark:text-white">
                    Browser Camera Document Scanner
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close camera scanner"
                  onClick={() => {
                    stopCameraStream();
                    setCameraModalOpen(false);
                  }}
                  className="p-1 text-stone-500 hover:text-stone-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 text-xs">
                {cameraError ? (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="w-4 h-4 text-[#C2410C]" />
                      <span>Camera Unavailable or Permission Denied</span>
                    </div>
                    <p>{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        stopCameraStream();
                        setCameraModalOpen(false);
                        setIsAddModalOpen(true);
                      }}
                      className="btn-primary !py-1.5 !px-3 text-xs mt-1"
                    >
                      Upload File from Device Instead
                    </button>
                  </div>
                ) : capturedDataUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 bg-stone-950 flex items-center justify-center max-h-72 p-2">
                      <img
                        src={capturedDataUrl}
                        alt="Captured document scan"
                        className="max-h-64 object-contain rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRotateCapturedImage}
                          className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Rotate 90°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRetakeCameraScan()}
                          className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retake</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleConfirmCameraScan()}
                        className="btn-primary !py-1.5 !px-4 text-xs cursor-pointer"
                      >
                        Use Scan &amp; Continue to OCR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl overflow-hidden border border-stone-300 dark:border-stone-700 bg-stone-950 aspect-video flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureCameraFrame}
                        className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture Document Frame</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vault Document Details, Preview & Edit Modal */}
      <AnimatePresence>
        {inspectedDoc && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Vault Document Details: ${inspectedDoc.editableDetails.title}`}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-modal-backdrop"
            onClick={handleCloseInspectModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="liquid-glass-floating rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/45 flex flex-col max-h-[90vh]"
            >
              <div className="h-1.5 w-full tricolour-bar shrink-0" />

              <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 flex items-start justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900 shrink-0">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-mono-tabular text-[#C2410C] font-bold">
                    <span>{inspectedDoc.id}</span>
                    <span>·</span>
                    <span>{inspectedDoc.category}</span>
                    <span>·</span>
                    <span>Added {inspectedDoc.dateAdded}</span>
                  </div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white mt-0.5">
                    {inspectedDoc.editableDetails.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 font-mono-tabular">
                    File: {inspectedDoc.originalFileName} ({inspectedDoc.fileSizeLabel}) · Ref #{inspectedDoc.editableDetails.certificateNumber}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close vault document details"
                  onClick={handleCloseInspectModal}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
                {/* Status Summary Strip */}
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-stone-500 block">Binary Storage</span>
                    <span className="font-semibold text-[#046A38] dark:text-emerald-400">
                      {inspectedDoc.hasStoredBlob ? 'Stored in IndexedDB' : 'Metadata Only'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">OCR Status</span>
                    <span className="font-semibold text-stone-900 dark:text-white">
                      {inspectedDoc.ocrStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Verification Status</span>
                    <StatusBadge status={inspectedDoc.verificationStatus} size="xs" />
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block">Approval Status</span>
                    <StatusBadge
                      status={
                        inspectedDoc.approvalStatus === 'Not Submitted'
                          ? 'Pending Upload'
                          : inspectedDoc.approvalStatus
                      }
                      customLabel={inspectedDoc.approvalStatus}
                      size="xs"
                    />
                  </div>
                </div>

                {/* Original File Preview / Download from IndexedDB */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#C2410C]" />
                      <span>Original Document File ({inspectedDoc.originalFileName})</span>
                    </span>
                    {inspectedBlobUrl ? (
                      <a
                        href={inspectedBlobUrl}
                        download={inspectedDoc.originalFileName}
                        className="px-3 py-1 rounded-lg bg-[#046A38] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#03542C]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Original File</span>
                      </a>
                    ) : (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400">
                        Binary file blob unavailable in current browser session
                      </span>
                    )}
                  </div>

                  {inspectedBlobUrl && (
                    <div className="rounded-lg overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 p-2 max-h-60 flex items-center justify-center">
                      {inspectedDoc.mimeType.startsWith('image/') ? (
                        <img
                          src={inspectedBlobUrl}
                          alt={inspectedDoc.editableDetails.title}
                          className="max-h-56 object-contain rounded"
                        />
                      ) : (
                        <iframe
                          src={inspectedBlobUrl}
                          title={inspectedDoc.editableDetails.title}
                          className="w-full h-52 border-0 rounded"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Editable Metadata & OCR Text */}
                {isEditingSavedDoc ? (
                  <form
                    onSubmit={(e) => void handleSaveEditedMetadata(e)}
                    className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/40 space-y-3"
                  >
                    <div className="font-bold text-stone-900 dark:text-white">
                      Edit Saved Document Details &amp; OCR Text
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-1">Title</label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-1">
                          Certificate / Ref #
                        </label>
                        <input
                          type="text"
                          value={editCertNo}
                          onChange={(e) => setEditCertNo(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-1">Holder Name</label>
                        <input
                          type="text"
                          value={editHolder}
                          onChange={(e) => setEditHolder(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-1">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as DocumentCategory)}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                        >
                          {VAULT_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-1">
                          Issuing Authority
                        </label>
                        <input
                          type="text"
                          value={editAuthority}
                          onChange={(e) => setEditAuthority(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-stone-600 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={editIssueDate}
                          onChange={(e) => setEditIssueDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono-tabular"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 mb-1">
                        Extracted / Corrected OCR Text
                      </label>
                      <textarea
                        rows={3}
                        value={editOcrText}
                        onChange={(e) => setEditOcrText(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 font-mono-tabular"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingSavedDoc(false)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary !py-1.5 !px-3.5 text-xs cursor-pointer"
                      >
                        Save Corrections
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 dark:text-white">
                        Document Metadata &amp; Extracted OCR Text
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingSavedDoc(true)}
                        className="text-xs font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Details / OCR Text</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-tabular">
                      <div>
                        <span className="text-stone-500">Holder: </span>
                        <strong>{inspectedDoc.editableDetails.holderName}</strong>
                      </div>
                      <div>
                        <span className="text-stone-500">Certificate #: </span>
                        <strong>{inspectedDoc.editableDetails.certificateNumber}</strong>
                      </div>
                      <div>
                        <span className="text-stone-500">Authority: </span>
                        <strong>{inspectedDoc.editableDetails.issuingAuthority}</strong>
                      </div>
                      <div>
                        <span className="text-stone-500">Issue Date: </span>
                        <strong>{inspectedDoc.editableDetails.issueDate}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
                      <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                        Extracted OCR Text ({inspectedDoc.ocrStatus}):
                      </span>
                      <div className="p-2.5 rounded-lg bg-[#FCF9F2] dark:bg-stone-950 border border-stone-200 dark:border-stone-800 font-mono-tabular text-xs whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {inspectedDoc.ocrExtractedText ||
                          'No OCR text recorded for this document.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#C2410C]/20 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void handleDeleteVaultDoc(inspectedDoc)}
                  className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Vault</span>
                </button>

                <div className="flex items-center gap-2">
                  {inspectedDoc.verificationStatus !== 'Verified in demo' && (
                    <button
                      type="button"
                      onClick={() => void handleRunDemoVerificationOnVaultDoc(inspectedDoc)}
                      className="px-3 py-1.5 rounded-lg bg-[#046A38]/15 text-[#046A38] dark:text-emerald-300 border border-[#046A38]/35 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Run Demo Verification Check</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCloseInspectModal}
                    className="btn-primary !py-1.5 !px-4 text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
