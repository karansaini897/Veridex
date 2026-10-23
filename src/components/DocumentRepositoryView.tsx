import React, { useState, useMemo } from 'react';
import {
  Search,
  Upload,
  FileText,
  ArrowUpDown,
  X,
  CheckCircle2,
  AlertTriangle,
  History,
  FolderOpen,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import {
  ApplicationRecord,
  DocumentCategory,
  DocumentRecord,
  ExpiryStatus,
  Institution,
  UserAccount,
} from '../types/portal';
import {
  calculateExpiryDetails,
  canUserAccessDocument,
  canUserPerformAdminAction,
  generateInternalDocumentCode,
  REFERENCE_DATE,
  suggestDocumentCategory,
} from '../lib/domain';

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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | DocumentCategory>('All');
  const [validityFilter, setValidityFilter] = useState<'All' | ExpiryStatus>('All');
  const [verificationFilter, setVerificationFilter] = useState<'All' | DocumentRecord['issuerVerificationStatus']>('All');
  const [institutionFilter, setInstitutionFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'uploadDate' | 'name' | 'internalCode' | 'expiryDate'>('uploadDate');

  // Upload New Document Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [personName, setPersonName] = useState(currentUser.fullName);
  const [certNumber, setCertNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('Savitribai Phule Pune University');
  const [issueDate, setIssueDate] = useState('2026-08-15');
  const [expiryDate, setExpiryDate] = useState('2027-08-14');
  const [relatedAppId, setRelatedAppId] = useState('');
  const [fileName, setFileName] = useState('SPPU_Qualification_Dossier_2026.pdf');
  const [mimeType, setMimeType] = useState<'application/pdf' | 'image/jpeg' | 'image/png'>('application/pdf');
  const [fileSize, setFileSize] = useState('1.42 MB');
  const [overrideCategory, setOverrideCategory] = useState<DocumentCategory | ''>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Replace Version State inside Detail Drawer
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceFileName, setReplaceFileName] = useState('Renewed_Certificate_2026_27_v2.pdf');
  const [replaceExpiry, setReplaceExpiry] = useState('2027-10-31');
  const [replaceNote, setReplaceNote] = useState(
    'Uploaded renewed 2026-27 certificate to resolve expiry/completeness flag.'
  );

  const authorizedDocs = useMemo(
    () => documents.filter((d) => canUserAccessDocument(currentUser, d)),
    [documents, currentUser]
  );

  const filteredDocs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return authorizedDocs
      .filter((doc) => {
        if (categoryFilter !== 'All' && doc.category !== categoryFilter) return false;
        if (institutionFilter !== 'All' && doc.institutionId !== institutionFilter) return false;
        if (verificationFilter !== 'All' && doc.issuerVerificationStatus !== verificationFilter) {
          return false;
        }
        if (validityFilter !== 'All') {
          const exp = calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE);
          if (exp.status !== validityFilter) return false;
        }
        if (!q) return true;
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.internalCode.toLowerCase().includes(q) ||
          doc.certificateNumber.toLowerCase().includes(q) ||
          doc.personName.toLowerCase().includes(q) ||
          doc.institutionName.toLowerCase().includes(q) ||
          doc.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
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
    institutionFilter,
    verificationFilter,
    validityFilter,
    sortBy,
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

    const instId = currentUser.institutionId || 'INST-PUNE-104';
    const instObj = institutions.find((i) => i.id === instId);

    onUploadDocument({
      internalCode: previewInternalCode,
      name: docTitle.trim(),
      category: finalCategory,
      suggestedAiCategory: aiSuggestion.category,
      suggestedFolder: aiSuggestion.folder,
      categoryConfirmed: true,
      institutionId: instId,
      institutionName: instObj?.name || 'Vidyapeeth Institute of Technology, Pune',
      relatedApplicationId: relatedAppId || undefined,
      personName: personName.trim() || currentUser.fullName,
      personUserId: currentUser.id,
      certificateNumber: certNumber.trim(),
      issuingAuthority: issuingAuthority.trim() || 'Authorized Issuing Body',
      issueDate,
      expiryDate: expiryDate || undefined,
      uploadDate: REFERENCE_DATE,
      fileName: fileName.trim(),
      fileSize,
      mimeType,
      completenessStatus: 'Complete (Simulated)',
      consistencyStatus: 'Consistent (Simulated)',
      anomalyStatus: 'No Anomaly Detected (Simulated)',
      issuerVerificationStatus: 'Verified (Simulated)',
      humanReviewStatus: 'Pending',
      extractedSummary: {
        'Document Title': docTitle.trim(),
        'Holder / Signatory': personName.trim() || currentUser.fullName,
        'Certificate Number': certNumber.trim(),
        'Classification Folder': aiSuggestion.folder,
      },
      findings: [
        {
          id: `F-NEW-${Date.now()}`,
          pillar: 'Completeness',
          status: 'Passed (Simulated)',
          affectedFieldOrPage: 'Page 1 (Automated Intake Check)',
          explanation: 'Simulated OCR confirmed mandatory metadata fields and seal presence.',
          evidenceComparison: `Extracted Cert #${certNumber.trim()} matches form input.`,
          suggestedNextAction: 'Queued for regional reviewer sign-off.',
        },
      ],
      versions: [
        {
          versionNumber: 1,
          fileName: fileName.trim(),
          fileSize,
          mimeType,
          uploadedAt: `${REFERENCE_DATE} 14:25`,
          uploadedBy: currentUser.fullName,
          changeNote: 'Initial upload with AI-assisted classification confirmation.',
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Institutional Document Repository &amp; Version Control
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Authorized Document Repository ({authorizedDocs.length})
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Each record uses a unique internal document code (e.g. <span className="font-mono-tabular">FAC-QUA-KAS-02</span>) separate from its database ID and official certificate number.
          </p>
        </div>

        {currentUser.role !== 'student' && (
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload &amp; Classify Document</span>
          </button>
        )}
      </div>

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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white dark:bg-blue-600'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Multi-Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search documents by name, internal code, certificate number, or person"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search FAC-QUA-KAS-02, certificate #, person, title..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <select
            aria-label="Filter by validity or expiry status"
            value={validityFilter}
            onChange={(e) => setValidityFilter(e.target.value as 'All' | ExpiryStatus)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
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
            aria-label="Filter by simulated verification status"
            value={verificationFilter}
            onChange={(e) =>
              setVerificationFilter(
                e.target.value as 'All' | DocumentRecord['issuerVerificationStatus']
              )
            }
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="All">All Issuer Statuses</option>
            <option value="Verified (Simulated)">Verified (Simulated)</option>
            <option value="Failed (Simulated)">Failed (Simulated)</option>
            <option value="Pending">Pending</option>
            <option value="Not Checked">Not Checked</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Sort documents by field"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
          >
            <option value="uploadDate">Sort: Latest Upload</option>
            <option value="internalCode">Sort: Internal Code</option>
            <option value="expiryDate">Sort: Earliest Expiry</option>
            <option value="name">Sort: Document Name</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Internal Code</th>
                <th className="py-3 px-4">Document &amp; Certificate #</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Person / Institution</th>
                <th className="py-3 px-4">Validity / Expiry</th>
                <th className="py-3 px-4">Simulated Checks</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredDocs.map((doc) => {
                const exp = calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE);
                const hasIssue =
                  exp.status === 'Expired' ||
                  doc.completenessStatus.includes('Missing') ||
                  doc.consistencyStatus.includes('Mismatch') ||
                  doc.anomalyStatus.includes('Suspected');

                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {doc.internalCode}
                      {doc.versions.length > 1 && (
                        <span className="ml-1.5 text-[10px] text-slate-500">
                          v{doc.versions.length}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-tabular">
                        Cert #{doc.certificateNumber} · {doc.fileSize}
                        {doc.relatedApplicationId ? ` · Linked: ${doc.relatedApplicationId}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {doc.category}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 dark:text-white font-medium">
                        {doc.personName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-48">
                        {doc.institutionName}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular whitespace-nowrap">
                      <span
                        className={
                          exp.status === 'Expired'
                            ? 'text-red-700 dark:text-red-400 font-semibold'
                            : exp.status === 'Expiring Soon'
                              ? 'text-amber-700 dark:text-amber-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-400'
                        }
                      >
                        {exp.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {hasIssue ? (
                        <span className="text-red-700 dark:text-red-400 font-medium">
                          Flagged for Review
                        </span>
                      ) : (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {doc.issuerVerificationStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectDocument(doc.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
                      >
                        Inspect Detail
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                    No documents match your active search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Detail Drawer / Modal */}
      {selectedDocument && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-detail-title"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-full flex flex-col border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/50">
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

                  {/* Clean Structured Certificate / Architectural Preview */}
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
                    </div>
                  </div>

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
                    Simulated OCR &amp; Metadata Extraction
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

              {/* 6-Pillar Simulated Verification Breakdown */}
              <section className="space-y-3">
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  6-Pillar Verification Breakdown (Simulated Prototype Checks)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">1. Completeness</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedDocument.completenessStatus}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">2. Expiry Status</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5 font-mono-tabular">
                      {calculateExpiryDetails(selectedDocument.expiryDate, REFERENCE_DATE).label}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">3. Consistency</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedDocument.consistencyStatus}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">4. Anomaly Indicators</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedDocument.anomalyStatus}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">5. Issuer Verification</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedDocument.issuerVerificationStatus}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-500">6. Human Review</div>
                    <div className="font-semibold text-blue-700 dark:text-blue-400 mt-0.5">
                      {selectedDocument.humanReviewStatus}
                    </div>
                  </div>
                </div>

                {/* Detailed Findings List */}
                <div className="space-y-2 pt-2">
                  {selectedDocument.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {f.pillar} — {f.affectedFieldOrPage}
                        </span>
                        <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                          {f.status}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{f.explanation}</p>
                      <div className="text-[11px] text-slate-500 font-mono-tabular">
                        Evidence Comparison: {f.evidenceComparison}
                      </div>
                      <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
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
          </div>
        </div>
      )}

      {/* Upload & AI-Classify Modal */}
      {uploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-doc-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2
                  id="upload-doc-modal-title"
                  className="text-lg font-display font-bold text-slate-900 dark:text-white"
                >
                  Upload Institutional Document to Repository
                </h2>
                <p className="text-xs text-slate-500">
                  Supports PDF, JPEG, and PNG (max 15 MB) with AI-assisted category suggestion.
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

              {/* AI-Assisted Classification Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    AI-Assisted Document Classification (Simulated)
                  </span>
                  <span className="text-xs font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    Generated Internal Code: {previewInternalCode}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Suggested Category: <strong>{aiSuggestion.category}</strong> · Suggested Folder:{' '}
                  <span className="font-mono-tabular">{aiSuggestion.folder}</span> ({aiSuggestion.rationale})
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
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer"
                >
                  Confirm Classification &amp; Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
