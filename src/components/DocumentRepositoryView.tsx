import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Upload,
  X,
  History,
  ArrowUpRight,
  Database,
  Download,
  Loader2,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import {
  ApplicationRecord,
  DocumentCategory,
  DocumentRecord,
  ExpiryStatus,
  Institution,
  UserAccount,
  VaultDocumentRecord,
} from '../types/portal';
import {
  addDaysToLocalDate,
  calculateExpiryDetails,
  canUserAccessDocument,
  canUserPerformAdminAction,
  createRecordId,
  DocumentPrefillSuggestion,
  extractDocumentPrefillSuggestion,
  formatTimestampForDisplay,
  generateInternalDocumentCode,
  getCurrentIsoTimestamp,
  getLocalTodayDate,
  isUserDocumentOwner,
  suggestDocumentCategory,
} from '../lib/domain';
import {
  cardEntranceVariants,
  inlinePanelVariants,
  modalBackdropVariants,
  modalWindowVariants,
  sectionEntranceVariants,
  slideOverDrawerVariants,
} from '../lib/motion';
import {
  EmptyStateCard,
  FileTypeMarker,
  StatusBadge,
} from './StatusPrimitives';
import { PersonalDocumentVaultSection } from './PersonalDocumentVaultSection';
import {
  createVaultBlobObjectUrl,
  getVaultDocumentBlob,
  getVaultDocumentsForUser,
} from '../lib/vaultStorage';
import { processDocumentOcrInBrowser } from '../lib/ocrEngine';
import {
  validateDocumentFile,
  uploadAndPersistDocument,
  uploadDocumentToStorage,
  getDocumentSignedUrlWithCache,
} from '../lib/documentService';

interface DocumentRepositoryViewProps {
  currentUser: UserAccount;
  documents: DocumentRecord[];
  applications: ApplicationRecord[];
  institutions: Institution[];
  selectedDocumentId: string | null;
  onSelectDocument: (docId: string | null) => void;
  onOpenApplication: (appId: string) => void;
  onUploadDocument: (newDoc: Omit<DocumentRecord, 'id' | 'internalCode'> & { internalCode: string; storagePath?: string }) => void;
  onReplaceDocumentVersion: (params: {
    docId: string;
    fileName: string;
    fileSize: string;
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
    storagePath?: string;
    newExpiryDate?: string;
    changeNote: string;
  }) => void;
  onUpdateDocumentHumanReview: (
    docId: string,
    status: DocumentRecord['humanReviewStatus'],
    note: string
  ) => void;
  onSyncVaultToRepository?: (vaultDoc: VaultDocumentRecord) => void;
}

const CATEGORIES: Array<'All' | DocumentCategory> = [
  'All',
  'Approvals',
  'Infrastructure',
  'Qualifications',
  'Experience Certificates',
  'Faculty Records',
  'Student Records',
  'Financial & Trust Deeds',
];

export type TrackingStatus =
  | 'Pending Verification'
  | 'Verified in demo'
  | 'Pending Approval'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Needs Review';

export function getDocVerificationStatus(doc: DocumentRecord): TrackingStatus {
  if (doc.verificationStatusLabel) return doc.verificationStatusLabel;
  if (doc.issuerVerificationStatus === 'Verified') return 'Verified in demo';
  if (doc.issuerVerificationStatus === 'Failed') return 'Rejected';
  if (doc.issuerVerificationStatus === 'Pending') return 'Pending Verification';
  if (doc.completenessStatus === 'Missing Pages/Fields' || doc.consistencyStatus === 'Mismatch Flagged') {
    return 'Needs Review';
  }
  return 'Pending Verification';
}

export function getDocApprovalStatus(doc: DocumentRecord): TrackingStatus {
  if (doc.approvalStatusLabel) return doc.approvalStatusLabel;
  if (doc.humanReviewStatus === 'Reviewed') return 'Approved';
  if (doc.humanReviewStatus === 'Action Required') return 'Needs Review';
  if (doc.humanReviewStatus === 'Pending') return 'Under Review';
  return 'Under Review';
}

export function getDocUploadedSection(doc: DocumentRecord): string {
  if (doc.uploadedFromSection) return doc.uploadedFromSection;
  if (doc.relatedApplicationId) return `Application: ${doc.relatedApplicationId}`;
  if (doc.relatedRequestId) return `Document Request: ${doc.relatedRequestId}`;
  return 'Document Repository';
}

export function getDocStatusUpdatedAt(doc: DocumentRecord): string {
  if (doc.statusUpdatedAt) return doc.statusUpdatedAt;
  if (doc.versions && doc.versions.length > 0) {
    return doc.versions[doc.versions.length - 1].uploadedAt;
  }
  return doc.uploadDate;
}

export const DocumentRepositoryView: React.FC<DocumentRepositoryViewProps> = ({
  currentUser,
  documents,
  applications,
  institutions,
  selectedDocumentId,
  onSelectDocument,
  onOpenApplication,
  onUploadDocument,
  onReplaceDocumentVersion,
  onUpdateDocumentHumanReview,
  onSyncVaultToRepository,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | DocumentCategory>('All');
  const [validityFilter, setValidityFilter] = useState<'All' | ExpiryStatus>('All');
  const [verificationFilter, setVerificationFilter] = useState<'All' | TrackingStatus>('All');
  const [approvalFilter, setApprovalFilter] = useState<'All' | TrackingStatus>('All');
  const [sortBy, setSortBy] = useState<'uploadDate' | 'name' | 'internalCode' | 'expiryDate' | 'statusUpdatedAt'>('uploadDate');
  const [vaultBlobPreviewUrl, setVaultBlobPreviewUrl] = useState<string | null>(null);

  const todayStr = getLocalTodayDate();

  // Register New Document Record Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [personName, setPersonName] = useState(currentUser.fullName);
  const [certNumber, setCertNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('University of Mumbai');
  const [issueDate, setIssueDate] = useState(() => addDaysToLocalDate(todayStr, -45));
  const [expiryDate, setExpiryDate] = useState(() => addDaysToLocalDate(todayStr, 320));
  const [relatedAppId, setRelatedAppId] = useState('');
  const [fileName, setFileName] = useState('UOM_Qualification_Dossier_2026.pdf');
  const [mimeType, setMimeType] = useState<'application/pdf' | 'image/jpeg' | 'image/png'>('application/pdf');
  const [fileSize, setFileSize] = useState('1.42 MB');
  const [overrideCategory, setOverrideCategory] = useState<DocumentCategory | ''>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Signed URL state for private document viewing & downloading
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);
  const [signedUrlError, setSignedUrlError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Document-to-Form Prefill State (Priority 5.4)
  const [availableVaultDocs, setAvailableVaultDocs] = useState<VaultDocumentRecord[]>([]);
  const [selectedPrefillVaultId, setSelectedPrefillVaultId] = useState<string>('');
  const [prefillCandidate, setPrefillCandidate] = useState<DocumentPrefillSuggestion | null>(null);
  const [prefillStatusBanner, setPrefillStatusBanner] = useState<string | null>(null);
  const [selectedRawFile, setSelectedRawFile] = useState<File | null>(null);
  const [isRunningModalOcr, setIsRunningModalOcr] = useState<boolean>(false);

  // Replace Version State inside Detail Drawer
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceUploading, setReplaceUploading] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [replaceFileName, setReplaceFileName] = useState('Renewed_Certificate_v2.pdf');
  const [replaceExpiry, setReplaceExpiry] = useState(() => addDaysToLocalDate(todayStr, 365));
  const [replaceNote, setReplaceNote] = useState(
    'Registered renewed certificate record to resolve expiry/completeness flag.'
  );

  // Role-based document access: uploader retains access, institutional administrators view within institutional scope,
  // and faculty/students view authorized institutional, application, or personal records without cross-institutional leakage.
  const authorizedDocs = useMemo(
    () => documents.filter((d) => canUserAccessDocument(currentUser, d, applications)),
    [documents, currentUser, applications]
  );

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return authorizedDocs
      .filter((doc) => {
        if (categoryFilter !== 'All' && doc.category !== categoryFilter) return false;
        if (verificationFilter !== 'All' && getDocVerificationStatus(doc) !== verificationFilter) {
          return false;
        }
        if (approvalFilter !== 'All' && getDocApprovalStatus(doc) !== approvalFilter) {
          return false;
        }
        if (validityFilter !== 'All') {
          const exp = calculateExpiryDetails(doc.expiryDate, todayStr);
          if (exp.status !== validityFilter) return false;
        }
        if (!q) return true;
        const uploadSection = getDocUploadedSection(doc).toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.internalCode.toLowerCase().includes(q) ||
          doc.certificateNumber.toLowerCase().includes(q) ||
          doc.personName.toLowerCase().includes(q) ||
          doc.institutionName.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q) ||
          uploadSection.includes(q) ||
          getDocVerificationStatus(doc).toLowerCase().includes(q) ||
          getDocApprovalStatus(doc).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'statusUpdatedAt') {
          return getDocStatusUpdatedAt(b).localeCompare(getDocStatusUpdatedAt(a));
        }
        if (sortBy === 'expiryDate') {
          const expA = a.expiryDate || '9999-12-31';
          const expB = b.expiryDate || '9999-12-31';
          return expA.localeCompare(expB);
        }
        if (sortBy === 'uploadDate') {
          return b.uploadDate.localeCompare(a.uploadDate);
        }
        return a[sortBy].localeCompare(b[sortBy]);
      });
  }, [
    authorizedDocs,
    searchQuery,
    categoryFilter,
    verificationFilter,
    approvalFilter,
    validityFilter,
    sortBy,
    todayStr,
  ]);

  const aiSuggestion = useMemo(
    () => suggestDocumentCategory(fileName, docTitle),
    [fileName, docTitle]
  );

  const finalCategory: DocumentCategory = overrideCategory || aiSuggestion.category;

  const previewInternalCode = useMemo(
    () =>
      generateInternalDocumentCode(
        finalCategory,
        personName || currentUser.fullName,
        documents.map((d) => d.internalCode)
      ),
    [finalCategory, personName, currentUser.fullName, documents]
  );

  const selectedDocument = useMemo(
    () => authorizedDocs.find((d) => d.id === selectedDocumentId) || null,
    [authorizedDocs, selectedDocumentId]
  );

  useEffect(() => {
    let revokeFn: (() => void) | null = null;
    let cancelled = false;
    setVaultBlobPreviewUrl(null);

    if (selectedDocument?.vaultDocumentId) {
      createVaultBlobObjectUrl(selectedDocument.vaultDocumentId).then((handle) => {
        if (!handle) return;
        if (cancelled) {
          handle.revoke();
        } else {
          revokeFn = handle.revoke;
          setVaultBlobPreviewUrl(handle.url);
        }
      });
    }

    return () => {
      cancelled = true;
      if (revokeFn) revokeFn();
    };
  }, [selectedDocument?.vaultDocumentId]);

  // Request signed URL on-demand when inspecting an authorized document stored in Supabase veridex-documents
  useEffect(() => {
    let cancelled = false;
    setSignedDocumentUrl(null);
    setSignedUrlError(null);

    if (selectedDocument?.storagePath) {
      if (!canUserAccessDocument(currentUser, selectedDocument, applications)) {
        setSignedUrlError('Access Denied: You do not possess the required permissions to view this document.');
        return;
      }

      setIsLoadingSignedUrl(true);
      getDocumentSignedUrlWithCache(selectedDocument.storagePath)
        .then((url) => {
          if (!cancelled) {
            setSignedDocumentUrl(url);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setSignedUrlError(
              err instanceof Error ? err.message : 'Unable to generate signed URL for document.'
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingSignedUrl(false);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedDocument, currentUser, applications]);

  const handleRefreshSignedUrl = async (path: string) => {
    if (!selectedDocument || !canUserAccessDocument(currentUser, selectedDocument, applications)) {
      setSignedUrlError('Access Denied: You are not authorized to access this document.');
      return;
    }

    setIsLoadingSignedUrl(true);
    setSignedUrlError(null);
    try {
      const url = await getDocumentSignedUrlWithCache(path, 3600);
      setSignedDocumentUrl(url);
    } catch (err) {
      setSignedUrlError(err instanceof Error ? err.message : 'Failed to refresh signed link.');
    } finally {
      setIsLoadingSignedUrl(false);
    }
  };

  const handleDownloadCurrentDocument = async () => {
    if (!selectedDocument) return;
    if (!canUserAccessDocument(currentUser, selectedDocument, applications)) {
      setSignedUrlError('Access Denied: You are not authorized to download this document.');
      return;
    }
    setIsDownloading(true);

    try {
      if (selectedDocument.storagePath) {
        const signedUrl = await getDocumentSignedUrlWithCache(selectedDocument.storagePath);
        if (signedUrl) {
          const a = document.createElement('a');
          a.href = signedUrl;
          a.download = selectedDocument.fileName;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }

      if (vaultBlobPreviewUrl) {
        const a = document.createElement('a');
        a.href = vaultBlobPreviewUrl;
        a.download = selectedDocument.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Metadata record download fallback (plain text summary)
      const summaryText = `VERIDEX OFFICIAL DOCUMENT SUMMARY\n=================================\nInternal Code: ${selectedDocument.internalCode}\nDocument Title: ${selectedDocument.name}\nCertificate #: ${selectedDocument.certificateNumber}\nIssuing Authority: ${selectedDocument.issuingAuthority}\nIssue Date: ${selectedDocument.issueDate}\nValid Until: ${selectedDocument.expiryDate || 'Permanent'}\nHolder: ${selectedDocument.personName}\nCategory: ${selectedDocument.category}\nVerification Status: ${getDocVerificationStatus(selectedDocument)}\nApproval Status: ${getDocApprovalStatus(selectedDocument)}\nStatus Last Updated: ${getDocStatusUpdatedAt(selectedDocument)}`;
      const blob = new Blob([summaryText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDocument.internalCode}_Summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (!uploadModalOpen) return;
    getVaultDocumentsForUser(currentUser.id)
      .then((docs) => {
        setAvailableVaultDocs(docs);
      })
      .catch(() => {
        setAvailableVaultDocs([]);
      });
  }, [uploadModalOpen, currentUser.id]);

  const handleSelectVaultForPrefill = (vaultId: string) => {
    setSelectedPrefillVaultId(vaultId);
    setPrefillStatusBanner(null);
    if (!vaultId) {
      setPrefillCandidate(null);
      return;
    }
    const found = availableVaultDocs.find((v) => v.id === vaultId);
    if (!found) {
      setPrefillCandidate(null);
      return;
    }
    const suggestion = extractDocumentPrefillSuggestion(found, currentUser.fullName);
    setPrefillCandidate(suggestion);
  };

  const handleConfirmApplyPrefill = () => {
    if (!prefillCandidate) return;
    setDocTitle(prefillCandidate.title);
    setCertNumber(prefillCandidate.certificateNumber);
    setPersonName(prefillCandidate.holderName);
    setIssuingAuthority(prefillCandidate.issuingAuthority);
    setIssueDate(prefillCandidate.issueDate || todayStr);
    setExpiryDate(prefillCandidate.expiryDate || '');
    setOverrideCategory(prefillCandidate.category);

    const matchedVault = availableVaultDocs.find((v) => v.id === selectedPrefillVaultId);
    if (matchedVault) {
      setFileName(matchedVault.originalFileName || matchedVault.fileName || fileName);
      if (['application/pdf', 'image/jpeg', 'image/png'].includes(matchedVault.mimeType)) {
        setMimeType(matchedVault.mimeType as 'application/pdf' | 'image/jpeg' | 'image/png');
      }
      if (matchedVault.fileSizeLabel) {
        setFileSize(matchedVault.fileSizeLabel);
      }
    }

    setPrefillStatusBanner(
      `Form fields populated from "${prefillCandidate.title}" (${prefillCandidate.sourceLabel}). Review or edit any field below before registering.`
    );
  };

  const handleRunModalOcrPrefill = async () => {
    if (!selectedRawFile || isRunningModalOcr) return;
    setIsRunningModalOcr(true);
    setPrefillStatusBanner(null);
    try {
      const outcome = await processDocumentOcrInBrowser({
        file: selectedRawFile,
        fileName: selectedRawFile.name,
        mimeType,
        defaultHolderName: currentUser.fullName,
      });
      const catSuggest = suggestDocumentCategory(
        selectedRawFile.name,
        outcome.suggestedFields.title || docTitle
      );
      const resolvedTitle = outcome.suggestedFields.title || docTitle || selectedRawFile.name;
      const resolvedHolder = outcome.suggestedFields.holderName || currentUser.fullName;
      setPrefillCandidate({
        title: resolvedTitle,
        docTitle: resolvedTitle,
        certificateNumber:
          outcome.suggestedFields.certificateNumber ||
          `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
        holderName: resolvedHolder,
        personName: resolvedHolder,
        issuingAuthority: outcome.suggestedFields.issuingAuthority || issuingAuthority,
        issueDate: outcome.suggestedFields.issueDate || issueDate,
        expiryDate: expiryDate || '',
        category: catSuggest.category,
        fileName: selectedRawFile.name,
        mimeType,
        fileSize: `${(selectedRawFile.size / (1024 * 1024)).toFixed(2)} MB`,
        notes: outcome.extractedText ? outcome.extractedText.slice(0, 180) : undefined,
        sourceLabel:
          outcome.engineUsed === 'pdf-text-layer'
            ? 'PDF Text Extraction'
            : outcome.engineUsed === 'tesseract-image-ocr'
              ? 'Browser Image OCR (Tesseract)'
              : 'File Metadata Analysis',
      });
    } finally {
      setIsRunningModalOcr(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file format or size.');
      return;
    }

    setSelectedRawFile(file);
    setFileName(file.name);
    const detectedMime = (['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
      ? file.type
      : 'application/pdf') as 'application/pdf' | 'image/jpeg' | 'image/png';
    setMimeType(detectedMime);
    setFileSize(`${Math.max(0.05, file.size / (1024 * 1024)).toFixed(2)} MB`);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!docTitle.trim()) {
      setUploadError('Enter a descriptive document title.');
      return;
    }
    if (!certNumber.trim()) {
      setUploadError('Enter the official certificate or reference number.');
      return;
    }

    // Resolve file to upload: from file picker or retrieved from selected Personal Vault doc
    let fileToUpload = selectedRawFile;
    if (!fileToUpload && selectedPrefillVaultId) {
      try {
        const vaultBlob = await getVaultDocumentBlob(selectedPrefillVaultId);
        if (vaultBlob) {
          fileToUpload = new File([vaultBlob], fileName.trim(), { type: mimeType });
        }
      } catch {
        // continue
      }
    }

    if (!fileToUpload) {
      setUploadError(
        'Please select a document file (.pdf, .jpg, or .png up to 15 MB) to upload to the repository.'
      );
      return;
    }

    const validation = validateDocumentFile(fileToUpload);
    if (!validation.valid) {
      setUploadError(validation.error || 'File validation failed.');
      return;
    }

    const instId = currentUser.institutionId || 'INST-VESIT-104';
    const instObj = institutions.find((i) => i.id === instId);
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

    setIsUploading(true);

    try {
      const uploadResult = await uploadAndPersistDocument({
        file: fileToUpload,
        ownerId: currentUser.id,
        category: finalCategory,
        institutionId: instId,
        status: 'Pending Verification',
      });

      if (!uploadResult.success || !uploadResult.storagePath) {
        setUploadError(
          uploadResult.error || 'Upload to storage bucket failed. Please check the file and retry.'
        );
        setIsUploading(false);
        return;
      }

      onUploadDocument({
        internalCode: previewInternalCode,
        name: docTitle.trim(),
        category: finalCategory,
        suggestedAiCategory: aiSuggestion.category,
        suggestedFolder: aiSuggestion.folder,
        categoryConfirmed: true,
        institutionId: instId,
        institutionName:
          instObj?.name ||
          "Vivekanand Education Society's Institute of Technology (VESIT), Mumbai",
        relatedApplicationId: relatedAppId || undefined,
        personName: personName.trim() || currentUser.fullName,
        personUserId: currentUser.id,
        certificateNumber: certNumber.trim(),
        issuingAuthority: issuingAuthority.trim() || 'Authorized Issuing Body',
        issueDate,
        expiryDate: expiryDate || undefined,
        uploadDate: todayStr,
        fileName: fileToUpload.name,
        fileSize,
        mimeType,
        storagePath: uploadResult.storagePath,
        verificationStatusLabel: 'Pending Verification',
        approvalStatusLabel: 'Under Review',
        completenessStatus: 'Pending Review',
        consistencyStatus: 'Pending Check',
        anomalyStatus: 'Not Screened',
        issuerVerificationStatus: 'Unavailable',
        humanReviewStatus: 'Pending',
        extractedSummary: {
          'Document Title': docTitle.trim(),
          'Holder / Signatory': personName.trim() || currentUser.fullName,
          'Certificate Number': certNumber.trim(),
          'Classification Folder': aiSuggestion.folder,
          'Selected File Attributes': `${fileToUpload.name} (${mimeType}, ${fileSize})`,
          'Persistent Storage Path': uploadResult.storagePath,
        },
        findings: [
          {
            id: createRecordId('F-NEW'),
            pillar: 'Completeness',
            status: 'Advisory',
            affectedFieldOrPage: 'Registered Metadata Record',
            explanation:
              'Document details, certificate reference, and file attributes registered; awaiting reviewing officer inspection.',
            evidenceComparison: `Registered Cert #${certNumber.trim()} (${fileToUpload.name}, ${fileSize}).`,
            suggestedNextAction: 'Queued for regional reviewer inspection and human sign-off.',
          },
        ],
        versions: [
          {
            versionNumber: 1,
            fileName: fileToUpload.name,
            fileSize,
            mimeType,
            storagePath: uploadResult.storagePath,
            uploadedAt: nowDisplay,
            uploadedBy: currentUser.fullName,
            changeNote: 'Initial metadata registration with keyword-based category confirmation.',
          },
        ],
      });

      setUploadModalOpen(false);
      setSelectedRawFile(null);
      setDocTitle('');
      setCertNumber('');
      setUploadError(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'An error occurred during file upload and metadata saving.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 dark:border-stone-800 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C] dark:text-amber-400">
            Document Repository &amp; Personal Upload History
          </p>
          <h1 className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight mt-0.5">
            My documents
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Access every document you have submitted across application forms, document requests, and direct registrations. Strictly private to your account.
          </p>
        </div>

        {currentUser.role !== 'student' && (
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Register Document Record</span>
          </button>
        )}
      </div>

      {/* Personal Document Vault (IndexedDB + Client-Side OCR) */}
      <PersonalDocumentVaultSection
        currentUser={currentUser}
        onSyncToRepository={onSyncVaultToRepository}
      />

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const active = categoryFilter === cat;
          const count =
            cat === 'All'
              ? authorizedDocs.length
              : authorizedDocs.filter((d) => d.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
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

      {/* Search & Multi-Filter Toolbar */}
      <motion.div
        variants={cardEntranceVariants}
        initial="hidden"
        animate="visible"
        className="liquid-glass rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
      >
        <div className="sm:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search documents by name, code, certificate number, or section"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, section, ref #, or status..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <select
            aria-label="Filter by verification status"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as 'All' | TrackingStatus)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 text-slate-900 dark:text-white"
          >
            <option value="All">All Verification Statuses</option>
            <option value="Verified in demo">Verified in demo</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Filter by approval status"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as 'All' | TrackingStatus)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 text-slate-900 dark:text-white"
          >
            <option value="All">All Approval Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Under Review">Under Review</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Filter by validity or expiry status"
            value={validityFilter}
            onChange={(e) => setValidityFilter(e.target.value as 'All' | ExpiryStatus)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 text-slate-900 dark:text-white"
          >
            <option value="All">All Validity States</option>
            <option value="Valid">Valid</option>
            <option value="Expiring Soon">Expiring Soon (≤45d)</option>
            <option value="Expired">Expired</option>
            <option value="No Expiry">Permanent / No Expiry</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Sort documents by field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white/80 dark:bg-slate-950/70 text-slate-900 dark:text-white"
          >
            <option value="uploadDate">Sort: Latest Upload</option>
            <option value="statusUpdatedAt">Sort: Status Updated</option>
            <option value="name">Sort: Document Name</option>
            <option value="internalCode">Sort: Internal Code</option>
            <option value="expiryDate">Sort: Earliest Expiry</option>
          </select>
        </div>
      </motion.div>

      {/* Documents Table */}
      <motion.div
        variants={sectionEntranceVariants}
        initial="hidden"
        animate="visible"
        className="liquid-glass rounded-2xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Document &amp; Reference</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Uploaded Through</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Status Updated</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredDocs.map((doc) => {
                const exp = calculateExpiryDetails(doc.expiryDate, todayStr);
                const verifStatus = getDocVerificationStatus(doc);
                const apprvStatus = getDocApprovalStatus(doc);
                const uploadedSection = getDocUploadedSection(doc);
                const statusUpdatedAt = getDocStatusUpdatedAt(doc);

                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {doc.name}
                        </span>
                        <FileTypeMarker mimeType={doc.mimeType} fileName={doc.fileName} fileSize={doc.fileSize} />
                        {(doc.hasStoredFileBlob || doc.vaultDocumentId) && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-bold bg-[#046A38]/15 text-[#046A38] dark:text-emerald-300 inline-flex items-center gap-1">
                            <Database className="w-2.5 h-2.5" />
                            <span>IndexedDB File</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono-tabular mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#C2410C] dark:text-amber-400">{doc.internalCode}</span>
                        <span>·</span>
                        <span>Ref #{doc.certificateNumber}</span>
                        {doc.versions.length > 1 && (
                          <span className="text-[10px] text-stone-400">v{doc.versions.length}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                      {doc.category}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 max-w-xs truncate">
                        {uploadedSection}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-stone-600 dark:text-stone-300 whitespace-nowrap">
                      {doc.uploadDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={verifStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={apprvStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[11px] text-stone-500 whitespace-nowrap">
                      {statusUpdatedAt}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectDocument(doc.id)}
                        className="px-3 py-1.5 rounded-lg bg-[#EFE6D5] dark:bg-stone-800 hover:bg-[#C2410C] hover:text-white text-stone-900 dark:text-stone-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Inspect &amp; Preview
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8">
                    {authorizedDocs.length === 0 ? (
                      <EmptyStateCard
                        title="No Uploaded Documents Found"
                        description="You have not uploaded any documents through application forms, document requests, or the repository yet. Any documents you submit across the portal will be stored and tracked here."
                        actionLabel={currentUser.role !== 'student' ? 'Register Document Record' : undefined}
                        onAction={currentUser.role !== 'student' ? () => setUploadModalOpen(true) : undefined}
                      />
                    ) : (
                      <EmptyStateCard
                        title="No Matching Repository Documents"
                        description="No documents match your active search query or status filters."
                        actionLabel="Reset All Filters"
                        onAction={() => {
                          setSearchQuery('');
                          setCategoryFilter('All');
                          setValidityFilter('All');
                          setVerificationFilter('All');
                          setApprovalFilter('All');
                        }}
                      />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Document Detail Drawer / Modal */}
      <AnimatePresence>
        {selectedDocument && (
          <motion.div
            key={selectedDocument.id}
            role="dialog"
            aria-modal="true"
            aria-labelledby="doc-detail-title"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex justify-end glass-modal-backdrop"
          >
            <motion.div
              variants={slideOverDrawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="liquid-glass-elevated w-full max-w-3xl h-full flex flex-col border-y-0 border-r-0 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200/70 dark:border-slate-800 flex items-start justify-between gap-4 liquid-glass-subtle">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono-tabular text-blue-700 dark:text-blue-400 font-semibold">
                  <span>Internal Code: {selectedDocument.internalCode}</span>
                  <span>·</span>
                  <span>Record ID: {selectedDocument.id}</span>
                  <span>·</span>
                  <span>Version v{selectedDocument.versions.length}</span>
                </div>
                <h2
                  id="doc-detail-title"
                  className="text-lg font-display font-bold text-slate-900 dark:text-white mt-0.5"
                >
                  {selectedDocument.name}
                </h2>
                <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                  Official Certificate #{selectedDocument.certificateNumber} · Issued by{' '}
                  {selectedDocument.issuingAuthority}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close document detail"
                onClick={() => {
                  onSelectDocument(null);
                  setReplaceOpen(false);
                }}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Prominent Unified Tracking Summary */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-[#FCF9F2]/80 dark:bg-stone-900/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-[11px] text-stone-500">Uploaded Through</div>
                  <div className="font-semibold text-stone-900 dark:text-white truncate mt-0.5">
                    {getDocUploadedSection(selectedDocument)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">Upload Date</div>
                  <div className="font-mono-tabular font-medium text-stone-900 dark:text-white mt-0.5">
                    {selectedDocument.uploadDate}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">Verification Status</div>
                  <div className="mt-0.5">
                    <StatusBadge status={getDocVerificationStatus(selectedDocument)} size="sm" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-stone-500">Approval Status</div>
                  <div className="mt-0.5">
                    <StatusBadge status={getDocApprovalStatus(selectedDocument)} size="sm" />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-4 pt-1 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 font-mono-tabular">
                  <span>Category: <strong>{selectedDocument.category}</strong></span>
                  <span>Status Last Updated: <strong>{getDocStatusUpdatedAt(selectedDocument)}</strong></span>
                </div>
              </div>

              {/* Document Preview & Extracted Fields */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <span className="text-[11px] font-mono-tabular font-semibold text-slate-500">
                      DOCUMENT PREVIEW ({selectedDocument.mimeType})
                    </span>
                    <span className="text-[11px] font-mono-tabular text-slate-400">
                      {selectedDocument.fileSize}
                    </span>
                  </div>

                  {/* Render actual uploaded preview if signedDocumentUrl, vaultBlobPreviewUrl, or previewUrl is available */}
                  {isLoadingSignedUrl ? (
                    <div className="p-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-2.5">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Requesting secure signed URL from storage...
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-tabular">
                        Bucket: veridex-documents
                      </span>
                    </div>
                  ) : signedDocumentUrl || vaultBlobPreviewUrl || selectedDocument.previewUrl ? (
                    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 space-y-2">
                      {selectedDocument.mimeType.startsWith('image/') ||
                      (signedDocumentUrl || vaultBlobPreviewUrl || selectedDocument.previewUrl || '').startsWith('data:image/') ? (
                        <img
                          src={signedDocumentUrl || vaultBlobPreviewUrl || selectedDocument.previewUrl}
                          alt={selectedDocument.name}
                          className="max-h-64 w-full object-contain rounded-md"
                        />
                      ) : (
                        <iframe
                          src={signedDocumentUrl || vaultBlobPreviewUrl || selectedDocument.previewUrl}
                          title={selectedDocument.name}
                          className="w-full h-64 rounded-md border-0"
                        />
                      )}
                      {selectedDocument.storagePath && (
                        <div className="flex items-center justify-between text-[10px] font-mono-tabular text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="truncate">Storage: veridex-documents (Private)</span>
                          <button
                            type="button"
                            onClick={() => handleRefreshSignedUrl(selectedDocument.storagePath!)}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Refresh Signed Link</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean Structured Certificate / Architectural Preview */
                    <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                      <div className="text-[10px] font-mono-tabular text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                        {selectedDocument.issuingAuthority}
                      </div>
                      <div className="text-xs font-display font-bold text-slate-900 dark:text-white">
                        {selectedDocument.name}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono-tabular space-y-0.5 pt-1">
                        <div>Ref: {selectedDocument.certificateNumber}</div>
                        <div>Holder: {selectedDocument.personName}</div>
                        <div>Issued: {selectedDocument.issueDate}</div>
                        <div>
                          Valid Until: {selectedDocument.expiryDate || 'Permanent / No Expiry'}
                        </div>
                        {selectedDocument.storagePath && (
                          <div className="pt-1 text-[10px] text-blue-700 dark:text-blue-400 font-mono-tabular">
                            Path: {selectedDocument.storagePath}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {signedUrlError && (
                    <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                      <span>{signedUrlError}</span>
                      {selectedDocument.storagePath && (
                        <button
                          type="button"
                          onClick={() => handleRefreshSignedUrl(selectedDocument.storagePath!)}
                          className="font-semibold underline ml-2 cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    {selectedDocument.relatedApplicationId ? (
                      <button
                        type="button"
                        onClick={() => {
                          const appId = selectedDocument.relatedApplicationId!;
                          onSelectDocument(null);
                          onOpenApplication(appId);
                        }}
                        className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                      >
                        <span>Linked Application: {selectedDocument.relatedApplicationId}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-slate-400">Standalone Repository Record</span>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={handleDownloadCurrentDocument}
                        className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isDownloading ? 'Downloading...' : 'Download Document'}</span>
                      </button>

                      {currentUser.role !== 'student' && (
                        <button
                          type="button"
                          onClick={() => setReplaceOpen((prev) => !prev)}
                          className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
                        >
                          Replace Version
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extracted Metadata Table */}
                <div className="md:col-span-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Extracted Certificate Metadata
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {Object.entries(selectedDocument.extractedSummary).map(([k, v]) => (
                      <div key={k} className="py-1.5 flex items-start justify-between gap-3">
                        <span className="text-slate-500">{k}</span>
                        <span className="font-medium text-slate-900 dark:text-white text-right font-mono-tabular">
                          {v}
                        </span>
                      </div>
                    ))}
                    <div className="py-1.5 flex items-start justify-between gap-3">
                      <span className="text-slate-500">Repository Folder</span>
                      <span className="font-mono-tabular text-[11px] text-slate-700 dark:text-slate-300">
                        {selectedDocument.suggestedFolder}
                      </span>
                    </div>
                    {selectedDocument.storagePath && (
                      <div className="py-1.5 flex items-start justify-between gap-3">
                        <span className="text-slate-500">Storage Path</span>
                        <span className="font-mono-tabular text-[10px] text-blue-700 dark:text-blue-400 break-all text-right">
                          {selectedDocument.storagePath}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Replace Document Version Form */}
              {replaceOpen && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setReplaceError(null);

                    let storagePath = selectedDocument.storagePath;
                    let fileName = replaceFileName.trim() || 'Updated_Document_v2.pdf';
                    let fileSize = '1.92 MB';
                    let mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' = 'application/pdf';

                    if (replaceFile) {
                      const validation = validateDocumentFile(replaceFile);
                      if (!validation.valid) {
                        setReplaceError(validation.error || 'Invalid replacement file.');
                        return;
                      }

                      setReplaceUploading(true);
                      try {
                        const uploadRes = await uploadDocumentToStorage(
                          replaceFile,
                          currentUser.id,
                          selectedDocument.category
                        );
                        if (!uploadRes.success || !uploadRes.storagePath) {
                          setReplaceError(uploadRes.error || 'Failed to upload replacement file.');
                          setReplaceUploading(false);
                          return;
                        }
                        storagePath = uploadRes.storagePath;
                        fileName = replaceFile.name;
                        fileSize = `${Math.max(0.05, replaceFile.size / (1024 * 1024)).toFixed(2)} MB`;
                        mimeType = (['application/pdf', 'image/jpeg', 'image/png'].includes(replaceFile.type)
                          ? replaceFile.type
                          : 'application/pdf') as 'application/pdf' | 'image/jpeg' | 'image/png';
                      } catch (err) {
                        setReplaceError(err instanceof Error ? err.message : 'Upload failed.');
                        setReplaceUploading(false);
                        return;
                      } finally {
                        setReplaceUploading(false);
                      }
                    }

                    onReplaceDocumentVersion({
                      docId: selectedDocument.id,
                      fileName,
                      fileSize,
                      mimeType,
                      storagePath,
                      newExpiryDate: replaceExpiry || undefined,
                      changeNote: replaceNote.trim() || 'Uploaded updated version.',
                    });

                    setReplaceOpen(false);
                    setReplaceFile(null);
                    setReplaceError(null);
                  }}
                  className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>Upload New Version (v{selectedDocument.versions.length + 1}): Preserves Prior History</span>
                    <span className="text-[11px] font-mono-tabular text-slate-500">Private Bucket: veridex-documents</span>
                  </div>

                  {replaceError && (
                    <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-center justify-between">
                      <span>{replaceError}</span>
                      <button
                        type="button"
                        onClick={() => setReplaceError(null)}
                        className="underline font-semibold"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {replaceUploading && (
                    <div className="p-2.5 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading replacement version to veridex-documents...</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Replacement File (.pdf, .jpg, .png up to 15 MB)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={replaceUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setReplaceFile(file);
                          setReplaceFileName(file.name);
                        }}
                        className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 dark:file:bg-slate-800 dark:file:text-blue-300 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Updated Expiry Date (Clears Expiry Flag)
                      </label>
                      <input
                        type="date"
                        value={replaceExpiry}
                        onChange={(e) => setReplaceExpiry(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      Version Change Note *
                    </label>
                    <input
                      type="text"
                      required
                      value={replaceNote}
                      onChange={(e) => setReplaceNote(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={replaceUploading}
                      onClick={() => {
                        setReplaceOpen(false);
                        setReplaceFile(null);
                        setReplaceError(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={replaceUploading}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {replaceUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Version...</span>
                        </>
                      ) : (
                        <span>Save Version v{selectedDocument.versions.length + 1}</span>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* 6-Pillar Statutory Verification Breakdown */}
              <section className="space-y-3">
                <h3 className="text-sm font-display font-bold text-stone-900 dark:text-white">
                  6-Pillar Statutory Verification Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                    <div className="text-[11px] text-stone-500">1. Completeness</div>
                    <div>
                      <StatusBadge status={selectedDocument.completenessStatus} size="sm" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                    <div className="text-[11px] text-stone-500">2. Expiry Status</div>
                    <div>
                      <StatusBadge
                        status={calculateExpiryDetails(selectedDocument.expiryDate, todayStr).status}
                        customLabel={calculateExpiryDetails(selectedDocument.expiryDate, todayStr).label}
                        size="sm"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                    <div className="text-[11px] text-stone-500">3. Consistency</div>
                    <div>
                      <StatusBadge status={selectedDocument.consistencyStatus} size="sm" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                    <div className="text-[11px] text-stone-500">4. Anomaly Indicators</div>
                    <div>
                      <StatusBadge status={selectedDocument.anomalyStatus} size="sm" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                    <div className="text-[11px] text-stone-500">5. Issuer Verification</div>
                    <div>
                      <StatusBadge status={selectedDocument.issuerVerificationStatus} size="sm" />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1.5">
                    <div className="text-[11px] text-stone-500">6. Human Review</div>
                    <div>
                      <StatusBadge status={selectedDocument.humanReviewStatus} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Detailed Findings List */}
                <div className="space-y-2 pt-2">
                  {selectedDocument.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-[#FCF9F2]/70 dark:bg-stone-950/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {f.pillar}: {f.affectedFieldOrPage}
                        </span>
                        <StatusBadge status={f.status} size="sm" />
                      </div>
                      <p className="text-stone-600 dark:text-stone-300">{f.explanation}</p>
                      <div className="text-[11px] text-stone-500 font-mono-tabular">
                        Evidence Comparison: {f.evidenceComparison}
                      </div>
                      <div className="text-[11px] font-medium text-stone-700 dark:text-stone-300">
                        Suggested Next Action: {f.suggestedNextAction}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Admin Human Review Controls */}
                {canUserPerformAdminAction(currentUser) && (
                  <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      Admin Human Review Sign-Off:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDocumentHumanReview(
                            selectedDocument.id,
                            'Reviewed',
                            'Human reviewer verified document metadata and findings.'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium cursor-pointer"
                      >
                        Mark Human Reviewed
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateDocumentHumanReview(
                            selectedDocument.id,
                            'Action Required',
                            'Flagged for replacement or notarized clarification.'
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer"
                      >
                        Flag Action Required
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Version History */}
              <section className="space-y-2.5">
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Document Version History ({selectedDocument.versions.length})</span>
                </h3>
                <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl px-4">
                  {selectedDocument.versions.map((ver) => (
                    <div key={ver.versionNumber} className="py-3 text-xs flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white font-mono-tabular">
                          v{ver.versionNumber}: {ver.fileName} ({ver.fileSize})
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                          {ver.changeNote}
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-mono-tabular text-slate-500 shrink-0">
                        <div>{ver.uploadedAt}</div>
                        <div>By {ver.uploadedBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Upload & AI-Classify Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-doc-modal-title"
            variants={modalBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center glass-modal-backdrop p-4"
          >
            <motion.div
              variants={modalWindowVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="liquid-glass-elevated rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5"
            >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2
                  id="upload-doc-modal-title"
                  className="text-lg font-display font-bold text-slate-900 dark:text-white"
                >
                  Register Institutional Document Record in Repository
                </h2>
                <p className="text-xs text-slate-500">
                  Records document metadata, selected file attributes (PDF, JPEG, PNG up to 15 MB), and keyword-based category suggestion.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close upload dialog"
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start justify-between gap-2"
              >
                <span>{uploadError}</span>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-red-700 dark:text-red-300 font-semibold underline shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {isUploading && (
              <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
                <span>Uploading file to private storage bucket `veridex-documents` and persisting metadata...</span>
              </div>
            )}

            {/* Document-to-Form Prefill Section (SIH PPT Priority 5.4) */}
            <div className="p-4 rounded-xl liquid-glass-subtle space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#046A38] dark:text-[#789783]" />
                    <span>Document-to-Form Prefill (Personal Vault / Browser OCR)</span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                    Select a saved Personal Vault document or run client-side OCR on a chosen file to extract and prefill form fields for review.
                  </p>
                </div>
                {selectedRawFile && (
                  <button
                    type="button"
                    disabled={isRunningModalOcr}
                    onClick={handleRunModalOcrPrefill}
                    className="btn-secondary !py-1.5 !px-3 text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isRunningModalOcr ? 'Extracting Text...' : 'Extract Fields from Selected File'}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  aria-label="Select a saved Vault document to prefill form fields"
                  value={selectedPrefillVaultId}
                  onChange={(e) => handleSelectVaultForPrefill(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="">
                    {availableVaultDocs.length > 0
                      ? `Select from ${availableVaultDocs.length} saved Personal Vault document(s)...`
                      : 'No saved Personal Vault documents yet. Upload in Vault or choose a file below.'}
                  </option>
                  {availableVaultDocs.map((vdoc) => (
                    <option key={vdoc.id} value={vdoc.id}>
                      {vdoc.editableDetails.title} (Cert #{vdoc.editableDetails.certificateNumber}, {vdoc.category})
                    </option>
                  ))}
                </select>
                {prefillCandidate && (
                  <button
                    type="button"
                    data-testid="confirm-prefill-form-btn"
                    onClick={handleConfirmApplyPrefill}
                    className="btn-primary !py-1.5 !px-3.5 text-xs whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Confirm &amp; Prefill Form Fields
                  </button>
                )}
              </div>

              {prefillCandidate && (
                <div className="p-3 rounded-lg bg-white/85 dark:bg-stone-900/80 border border-[#C7A56A]/45 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-stone-900 dark:text-stone-100">
                    <span>Extracted Field Preview ({prefillCandidate.sourceLabel})</span>
                    <span className="font-mono-tabular text-[#046A38] dark:text-[#789783]">
                      Ready to Populate
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-stone-700 dark:text-stone-300">
                    <div>
                      <strong>Title:</strong> {prefillCandidate.title}
                    </div>
                    <div>
                      <strong>Certificate #:</strong>{' '}
                      <span className="font-mono-tabular">{prefillCandidate.certificateNumber}</span>
                    </div>
                    <div>
                      <strong>Holder Name:</strong> {prefillCandidate.holderName}
                    </div>
                    <div>
                      <strong>Issuing Authority:</strong> {prefillCandidate.issuingAuthority}
                    </div>
                    <div>
                      <strong>Issue Date:</strong>{' '}
                      <span className="font-mono-tabular">{prefillCandidate.issueDate}</span>
                    </div>
                    <div>
                      <strong>Category:</strong> {prefillCandidate.category}
                    </div>
                  </div>
                </div>
              )}

              {prefillStatusBanner && (
                <div className="p-2.5 rounded-lg glass-tint-emerald text-[11px] font-medium text-emerald-900 dark:text-emerald-200">
                  {prefillStatusBanner}
                </div>
              )}
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="upload-doc-title"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Document Title *
                  </label>
                  <input
                    id="upload-doc-title"
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Ph.D. Convocation Degree (Dr. Arvind Kashyap)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label
                    htmlFor="upload-cert-no"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Official Certificate / Ref Number *
                  </label>
                  <input
                    id="upload-cert-no"
                    type="text"
                    required
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    placeholder="e.g. SPPU/PHD/2026/884"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>

                <div>
                  <label
                    htmlFor="upload-person-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Associated Person / Signatory Name
                  </label>
                  <input
                    id="upload-person-name"
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label
                    htmlFor="upload-file-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    File Name (.pdf, .jpg, .png) or Select File
                  </label>
                  <input
                    id="upload-file-name"
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileInputChange}
                    aria-label="Choose document file from device"
                    className="mt-1.5 text-[11px] text-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="upload-expiry-date"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Expiry Date (Leave blank if permanent)
                  </label>
                  <input
                    id="upload-expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>

                <div>
                  <label
                    htmlFor="upload-related-app"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Link to Application (Optional)
                  </label>
                  <select
                    id="upload-related-app"
                    value={relatedAppId}
                    onChange={(e) => setRelatedAppId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">Standalone Repository Document</option>
                    {applications
                      .filter(
                        (a) =>
                          currentUser.role === 'admin' ||
                          a.institutionId === currentUser.institutionId
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.id}: {a.category}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Keyword-Based Document Classification & Confirmation Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    Keyword-Based Document Classification &amp; Indexing
                  </span>
                  <span className="text-xs font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    Generated Internal Code: {previewInternalCode}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Suggested Category: <strong>{aiSuggestion.category}</strong> · Suggested Folder:{' '}
                  <span className="font-mono-tabular">{aiSuggestion.folder}</span> ({aiSuggestion.rationale})
                </div>
                <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                  Selected File Metadata: <strong>{fileName}</strong> · Type: <strong>{mimeType}</strong> · Size: <strong>{fileSize}</strong> · Initial Status: <strong>Pending Review</strong>
                </div>
                <div>
                  <label
                    htmlFor="override-category-select"
                    className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                  >
                    Confirm or Override Document Category
                  </label>
                  <select
                    id="override-category-select"
                    value={overrideCategory}
                    onChange={(e) =>
                      setOverrideCategory(e.target.value as DocumentCategory | '')
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="">
                      Confirm Suggested Category ({aiSuggestion.category})
                    </option>
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        Override with: {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setUploadModalOpen(false);
                    setUploadError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading to Storage...</span>
                    </>
                  ) : (
                    <span>Confirm &amp; Register Document Record</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
