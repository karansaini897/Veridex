import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Upload,
  X,
  History,
  ArrowUpRight,
  Database,
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
import { createVaultBlobObjectUrl } from '../lib/vaultStorage';

interface DocumentRepositoryViewProps {
  currentUser: UserAccount;
  documents: DocumentRecord[];
  applications: ApplicationRecord[];
  institutions: Institution[];
  selectedDocumentId: string | null;
  onSelectDocument: (docId: string | null) => void;
  onOpenApplication: (appId: string) => void;
  onUploadDocument: (newDoc: Omit<DocumentRecord, 'id' | 'internalCode'> & { internalCode: string }) => void;
  onReplaceDocumentVersion: (params: {
    docId: string;
    fileName: string;
    fileSize: string;
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
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

  // Replace Version State inside Detail Drawer
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFileName, setReplaceFileName] = useState('Renewed_Certificate_v2.pdf');
  const [replaceExpiry, setReplaceExpiry] = useState(() => addDaysToLocalDate(todayStr, 365));
  const [replaceNote, setReplaceNote] = useState(
    'Registered renewed certificate record to resolve expiry/completeness flag.'
  );

  // Strict user document ownership: repository shows only documents belonging to or uploaded by current user
  const authorizedDocs = useMemo(
    () => documents.filter((d) => isUserDocumentOwner(currentUser, d)),
    [documents, currentUser]
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

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setUploadError(
        `Unsupported file format (${file.type || 'unknown'}). Only PDF, JPEG, and PNG files are permitted.`
      );
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds maximum 15 MB security limit.');
      return;
    }

    setFileName(file.name);
    setMimeType(file.type as 'application/pdf' | 'image/jpeg' | 'image/png');
    setFileSize(`${Math.max(0.15, file.size / (1024 * 1024)).toFixed(2)} MB`);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
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
    if (!/\.(pdf|jpe?g|png)$/i.test(fileName.trim())) {
      setUploadError('File name must carry a valid .pdf, .jpg, .jpeg, or .png format.');
      return;
    }

    const instId = currentUser.institutionId || 'INST-VESIT-104';
    const instObj = institutions.find((i) => i.id === instId);
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

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
      fileName: fileName.trim(),
      fileSize,
      mimeType,
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
        'Selected File Attributes': `${fileName.trim()} (${mimeType}, ${fileSize})`,
      },
      findings: [
        {
          id: createRecordId('F-NEW'),
          pillar: 'Completeness',
          status: 'Advisory',
          affectedFieldOrPage: 'Registered Metadata Record',
          explanation:
            'Document details, certificate reference, and file attributes registered; awaiting reviewing officer inspection.',
          evidenceComparison: `Registered Cert #${certNumber.trim()} (${fileName.trim()}, ${fileSize}).`,
          suggestedNextAction: 'Queued for regional reviewer inspection and human sign-off.',
        },
      ],
      versions: [
        {
          versionNumber: 1,
          fileName: fileName.trim(),
          fileSize,
          mimeType,
          uploadedAt: nowDisplay,
          uploadedBy: currentUser.fullName,
          changeNote: 'Initial metadata registration with keyword-based category confirmation.',
        },
      ],
    });

    setUploadModalOpen(false);
    setDocTitle('');
    setCertNumber('');
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

                  {/* Render actual uploaded preview if previewUrl or IndexedDB vaultBlobPreviewUrl is available */}
                  {vaultBlobPreviewUrl || selectedDocument.previewUrl ? (
                    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
                      {selectedDocument.mimeType.startsWith('image/') ||
                      (vaultBlobPreviewUrl || selectedDocument.previewUrl || '').startsWith('data:image/') ? (
                        <img
                          src={vaultBlobPreviewUrl || selectedDocument.previewUrl}
                          alt={selectedDocument.name}
                          className="max-h-64 w-full object-contain rounded-md"
                        />
                      ) : (
                        <iframe
                          src={vaultBlobPreviewUrl || selectedDocument.previewUrl}
                          title={selectedDocument.name}
                          className="w-full h-64 rounded-md border-0"
                        />
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
                        <div className="pt-1 text-[10px] text-amber-700 dark:text-amber-400">
                          Storage Type: Metadata-only record (no binary blob in browser IndexedDB)
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
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

                    {currentUser.role !== 'student' && (
                      <button
                        type="button"
                        onClick={() => setReplaceOpen((prev) => !prev)}
                        className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer"
                      >
                        Replace Version
                      </button>
                    )}
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
                  </div>
                </div>
              </div>

              {/* Replace Document Version Form */}
              {replaceOpen && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onReplaceDocumentVersion({
                      docId: selectedDocument.id,
                      fileName: replaceFileName.trim() || 'Updated_Document_v2.pdf',
                      fileSize: '1.92 MB',
                      mimeType: 'application/pdf',
                      newExpiryDate: replaceExpiry || undefined,
                      changeNote: replaceNote.trim() || 'Uploaded updated version.',
                    });
                    setReplaceOpen(false);
                  }}
                  className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-3"
                >
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Upload New Version (v{selectedDocument.versions.length + 1}) — Preserves Prior Version History
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                        Replacement File Name
                      </label>
                      <input
                        type="text"
                        required
                        value={replaceFileName}
                        onChange={(e) => setReplaceFileName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
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
                      Version Change Note
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
                      onClick={() => setReplaceOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium cursor-pointer"
                    >
                      Save Version v{selectedDocument.versions.length + 1}
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
                          {f.pillar} — {f.affectedFieldOrPage}
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
                          v{ver.versionNumber} — {ver.fileName} ({ver.fileSize})
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
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300"
              >
                {uploadError}
              </div>
            )}

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
                    placeholder="e.g. Ph.D. Convocation Degree — Dr. Arvind Kashyap"
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
                          {a.id} — {a.category}
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
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer"
                >
                  Confirm &amp; Register Document Record
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
