import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  MessageSquare,
  History,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Loader2,
  FileCheck,
} from 'lucide-react';
import {
  ApplicationRecord,
  ComplianceRule,
  DocumentRecord,
  UserAccount,
  VaultDocumentRecord,
} from '../types/portal';
import {
  addDaysToLocalDate,
  calculateExpiryDetails,
  canUserAccessDocument,
  canUserPerformAdminAction,
  evaluateApplicationComplianceMatrix,
  evaluateCrossDocumentConsistencyMatrix,
  evaluateDocumentAuthenticityChecks,
  extractDocumentPrefillSuggestion,
  getLocalTodayDate,
} from '../lib/domain';
import {
  inlinePanelVariants,
  modalBackdropVariants,
  slideOverDrawerVariants,
} from '../lib/motion';
import { FileTypeMarker, StatusBadge } from './StatusPrimitives';
import { getVaultDocumentsForUser } from '../lib/vaultStorage';
import {
  validateDocumentFile,
  uploadAndPersistDocument,
} from '../lib/documentService';

interface ApplicationDetailModalProps {
  application: ApplicationRecord;
  documents: DocumentRecord[];
  currentUser: UserAccount;
  onClose: () => void;
  onOpenDocument: (docId: string) => void;
  onAttachChecklistDocument: (params: {
    appId: string;
    checklistItemId: string;
    docTitle: string;
    certNumber: string;
    expiryDate?: string;
    fileName?: string;
    fileSize?: string;
    mimeType?: 'application/pdf' | 'image/jpeg' | 'image/png';
    storagePath?: string;
  }) => void;
  onSubmitDraftApplication: (appId: string, submissionNote: string) => void;
  onResubmitApplication: (params: {
    appId: string;
    responseNote: string;
    attachRenewedCertificate: boolean;
  }) => void;
  onAdminAction: (params: {
    appId: string;
    actionType: 'Review Note' | 'Correction Request' | 'Under Manual Review' | 'Authorized Decision';
    note: string;
    decisionOutcome?: ApplicationRecord['decisionOutcome'];
  }) => void;
  complianceRules?: ComplianceRule[];
  onResolveFinding?: (params: {
    docId: string;
    findingId: string;
    decision: 'Resolved' | 'Overridden' | 'Confirmed Deficiency';
    justification: string;
  }) => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  documents,
  currentUser,
  onClose,
  onOpenDocument,
  onAttachChecklistDocument,
  onSubmitDraftApplication,
  onResubmitApplication,
  onAdminAction,
  complianceRules = [],
  onResolveFinding,
}) => {
  const todayStr = getLocalTodayDate();
  const [uploadingChecklistId, setUploadingChecklistId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCertNo, setUploadCertNo] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState(() => addDaysToLocalDate(todayStr, 365));
  const [vaultDocs, setVaultDocs] = useState<VaultDocumentRecord[]>([]);
  const [selectedVaultPrefillId, setSelectedVaultPrefillId] = useState<string>('');

  // Persistent File Upload State for Checklist Items
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [checklistFileName, setChecklistFileName] = useState('');
  const [checklistFileSize, setChecklistFileSize] = useState('');
  const [checklistMimeType, setChecklistMimeType] = useState<
    'application/pdf' | 'image/jpeg' | 'image/png'
  >('application/pdf');
  const [isUploadingChecklist, setIsUploadingChecklist] = useState(false);
  const [checklistUploadError, setChecklistUploadError] = useState<string | null>(null);

  React.useEffect(() => {
    getVaultDocumentsForUser(currentUser.id)
      .then((docs) => setVaultDocs(docs))
      .catch(() => setVaultDocs([]));
  }, [currentUser.id]);

  // Draft submission state & incomplete checklist override note
  const [draftSubmitConfirmOpen, setDraftSubmitConfirmOpen] = useState(false);
  const [draftSubmissionNote, setDraftSubmissionNote] = useState('');
  const [draftSubmitError, setDraftSubmitError] = useState<string | null>(null);

  // Resubmission state
  const [resubmitNote, setResubmitNote] = useState(
    'Registered renewed Municipal Fire & Life Safety Certificate and attached notarized name-equivalence affidavit for Dr. Siddharth Kulkarni.'
  );
  const [attachRenewedCert, setAttachRenewedCert] = useState(true);
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = useState(false);

  // Admin review & decision state
  const [adminNote, setAdminNote] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<
    NonNullable<ApplicationRecord['decisionOutcome']>
  >('Compliance Verified: Recommended');
  const [decisionConfirmOpen, setDecisionConfirmOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Reviewer finding resolution state
  const [resolvingFindingKey, setResolvingFindingKey] = useState<string | null>(null);
  const [findingResolutionDecision, setFindingResolutionDecision] = useState<
    'Resolved' | 'Overridden' | 'Confirmed Deficiency'
  >('Resolved');
  const [findingJustification, setFindingJustification] = useState('');
  const [findingResolutionError, setFindingResolutionError] = useState<string | null>(null);
  const [selectedAuthDocId, setSelectedAuthDocId] = useState<string>('');

  const isAdmin = canUserPerformAdminAction(currentUser);
  const isRep =
    currentUser.role === 'institutional_rep' &&
    currentUser.institutionId === application.institutionId;

  const linkedDocs = documents.filter(
    (d) =>
      (application.documentIds.includes(d.id) ||
      d.relatedApplicationId === application.id) &&
      canUserAccessDocument(currentUser, d, [application])
  );

  const consistencyMatrix = useMemo(
    () => evaluateCrossDocumentConsistencyMatrix(application, linkedDocs),
    [application, linkedDocs]
  );

  const complianceMatrix = useMemo(
    () => evaluateApplicationComplianceMatrix(application, linkedDocs, complianceRules, todayStr),
    [application, linkedDocs, complianceRules, todayStr]
  );

  const activeAuthDoc = useMemo(() => {
    if (linkedDocs.length === 0) return null;
    return linkedDocs.find((d) => d.id === selectedAuthDocId) || linkedDocs[0];
  }, [linkedDocs, selectedAuthDocId]);

  const activeAuthenticityChecks = useMemo(
    () =>
      activeAuthDoc
        ? evaluateDocumentAuthenticityChecks(activeAuthDoc, documents, todayStr)
        : [],
    [activeAuthDoc, documents, todayStr]
  );

  const missingRequiredItems = useMemo(
    () => application.checklist.filter((c) => c.required && c.status === 'Pending Upload'),
    [application.checklist]
  );

  const completedRequiredCount = useMemo(
    () => application.checklist.filter((c) => c.required && c.status !== 'Pending Upload').length,
    [application.checklist]
  );

  const totalRequiredCount = useMemo(
    () => application.checklist.filter((c) => c.required).length,
    [application.checklist]
  );

  const handleChecklistFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChecklistUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setChecklistUploadError(validation.error || 'Invalid file format or size limit exceeded.');
      return;
    }

    setChecklistFile(file);
    setChecklistFileName(file.name);
    setChecklistFileSize(`${Math.max(0.05, file.size / (1024 * 1024)).toFixed(2)} MB`);
    const mime = (['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)
      ? file.type
      : 'application/pdf') as 'application/pdf' | 'image/jpeg' | 'image/png';
    setChecklistMimeType(mime);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    }
  };

  const handleChecklistUploadSubmit = async (e: React.FormEvent, checklistItemId: string) => {
    e.preventDefault();
    setChecklistUploadError(null);

    if (!uploadTitle.trim()) {
      setChecklistUploadError('Please enter a descriptive document title.');
      return;
    }
    if (!uploadCertNo.trim()) {
      setChecklistUploadError('Please enter the official certificate or reference number.');
      return;
    }

    const item = application.checklist.find((c) => c.id === checklistItemId);
    const docCat = item?.documentCategory || 'Approvals';

    let storagePath: string | undefined = undefined;
    let finalFileName = checklistFileName || `${uploadTitle.trim().replace(/\s+/g, '_')}.pdf`;
    let finalFileSize = checklistFileSize || '1.45 MB';
    let finalMime = checklistMimeType;

    if (checklistFile) {
      setIsUploadingChecklist(true);
      try {
        const uploadResult = await uploadAndPersistDocument({
          file: checklistFile,
          ownerId: currentUser.id,
          category: docCat,
          institutionId: application.institutionId,
          status: 'Pending Verification',
        });

        if (!uploadResult.success || !uploadResult.storagePath) {
          setChecklistUploadError(
            uploadResult.error || 'Document upload to storage failed. Please check the file and retry.'
          );
          setIsUploadingChecklist(false);
          return;
        }

        storagePath = uploadResult.storagePath;
        finalFileName = checklistFile.name;
      } catch (err) {
        setChecklistUploadError(
          err instanceof Error ? err.message : 'Upload failed due to network or storage error.'
        );
        setIsUploadingChecklist(false);
        return;
      } finally {
        setIsUploadingChecklist(false);
      }
    } else if (!selectedVaultPrefillId) {
      setChecklistUploadError(
        'Please select a document file (.pdf, .jpg, .png up to 15 MB) or choose a Personal Document Vault record.'
      );
      return;
    }

    onAttachChecklistDocument({
      appId: application.id,
      checklistItemId,
      docTitle: uploadTitle.trim(),
      certNumber: uploadCertNo.trim(),
      expiryDate: uploadExpiry || undefined,
      fileName: finalFileName,
      fileSize: finalFileSize,
      mimeType: finalMime,
      storagePath,
    });

    setUploadingChecklistId(null);
    setUploadTitle('');
    setUploadCertNo('');
    setChecklistFile(null);
    setChecklistFileName('');
    setChecklistFileSize('');
    setChecklistUploadError(null);
    setFeedbackBanner(
      'Document uploaded to veridex-documents and linked to checklist item; awaiting reviewing officer verification.'
    );
  };

  const handleConfirmDraftSubmit = () => {
    setDraftSubmitError(null);
    if (missingRequiredItems.length > 0 && !draftSubmissionNote.trim()) {
      setDraftSubmitError(
        `Please enter a submission explanation note because ${missingRequiredItems.length} mandatory checklist item(s) are still pending registration.`
      );
      return;
    }

    const finalNote =
      draftSubmissionNote.trim() ||
      'Submitted institutional dossier after completing category checklist requirements.';
    onSubmitDraftApplication(application.id, finalNote);
    setDraftSubmitConfirmOpen(false);
    setDraftSubmissionNote('');
    setFeedbackBanner(
      'Application dossier submitted. Status updated to "Submitted" and queued for regional officer review.'
    );
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-dossier-title"
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
        className="liquid-glass-elevated w-full max-w-4xl h-full flex flex-col border-y-0 border-r-0 overflow-hidden"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-stone-200/70 dark:border-stone-800 flex items-start justify-between gap-4 liquid-glass-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#C2410C] dark:text-amber-400 font-mono-tabular font-semibold flex-wrap">
              <span>{application.id}</span>
              <span aria-hidden="true">·</span>
              <span>Code: {application.officialInstitutionCode}</span>
              <span aria-hidden="true">·</span>
              <StatusBadge status={application.status} size="sm" />
            </div>
            <h2
              id="app-dossier-title"
              className="text-lg sm:text-xl font-display font-bold text-stone-900 dark:text-white mt-1"
            >
              {application.category}
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
              {application.institutionName} ({application.officialInstitutionCode}) · Assigned Reviewer:{' '}
              <strong>{application.assignedReviewer}</strong>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close application dossier"
            onClick={onClose}
            className="p-2 rounded-xl liquid-glass-subtle text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statutory Review Protocol Notice */}
          <div className="p-3.5 rounded-xl liquid-glass-subtle text-xs text-slate-700 dark:text-slate-300">
            <strong>Statutory Verification Protocol:</strong> Automated completeness checks, expiry tracking, and cross-document consistency signals assist the reviewing officer. Potential discrepancies are review prompts, not automatic proof of fraud. All compliance determinations require authorized human officer sign-off.
          </div>

          <AnimatePresence>
            {feedbackBanner && (
              <motion.div
                variants={inlinePanelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="p-3.5 rounded-xl glass-tint-emerald text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between"
              >
                <span>{feedbackBanner}</span>
                <button
                  type="button"
                  onClick={() => setFeedbackBanner(null)}
                  className="text-emerald-700 dark:text-emerald-300 font-semibold ml-4 cursor-pointer"
                >
                  Dismiss
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {application.decisionOutcome && (
            <div className="p-4 rounded-xl glass-tint-emerald">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Authorized Compliance Decision Recorded
              </div>
              <div className="text-sm font-display font-bold text-slate-900 dark:text-white mt-0.5">
                {application.decisionOutcome}
              </div>
            </div>
          )}

          {/* Institutional Representative Action Box (Draft Submit OR Correction Resubmit) */}
          {isRep && application.status === 'Draft' && (
            <section className="p-5 rounded-2xl glass-tint-blue space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Submit Draft Application Dossier ({completedRequiredCount}/{totalRequiredCount} Mandatory Items Registered)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {missingRequiredItems.length === 0
                      ? 'All mandatory checklist items have registered document records. You can submit this dossier for regional review.'
                      : `${missingRequiredItems.length} mandatory checklist item(s) are still pending registration: ${missingRequiredItems.map((m) => m.title).join(', ')}.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDraftSubmitError(null);
                    setDraftSubmitConfirmOpen((prev) => !prev);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Review &amp; Submit Dossier...</span>
                </button>
              </div>

              {draftSubmitConfirmOpen && (
                <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-blue-300 dark:border-blue-800 space-y-3">
                  {missingRequiredItems.length > 0 ? (
                    <div className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <strong>Incomplete Mandatory Checklist:</strong> {missingRequiredItems.length} required item(s) do not have a linked document record yet. Register the missing documents below, or provide an official explanation note to submit with a deficiency declaration.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        All {totalRequiredCount} mandatory checklist items are linked. Confirm submission to place this dossier into the Regional Reviewer queue.
                      </span>
                    </div>
                  )}

                  {draftSubmitError && (
                    <div role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                      {draftSubmitError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="draft-submission-note"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      {missingRequiredItems.length > 0
                        ? 'Mandatory Explanation for Incomplete Checklist Submission *'
                        : 'Submission Note (Optional)'}
                    </label>
                    <input
                      id="draft-submission-note"
                      type="text"
                      value={draftSubmissionNote}
                      onChange={(e) => setDraftSubmissionNote(e.target.value)}
                      placeholder={
                        missingRequiredItems.length > 0
                          ? 'Explain why remaining checklist documents are pending...'
                          : 'e.g. Completed pre-submission checklist verification.'
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDraftSubmitConfirmOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDraftSubmit}
                      className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirm Submission
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {isRep && application.status === 'Additional Information Required' && (
            <section className="p-5 rounded-2xl glass-tint-crimson space-y-4">
              <div>
                <h3 className="text-sm font-display font-bold text-red-900 dark:text-red-200">
                  Respond to Review Request &amp; Resubmit Application
                </h3>
                <p className="text-xs text-red-800/90 dark:text-red-300/90 mt-0.5">
                  Provide the requested clarification or renewed document record below to transition this application back to <strong>Under Manual Review</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="resubmit-response-note"
                    className="block text-xs font-medium text-slate-800 dark:text-slate-200 mb-1"
                  >
                    Institutional Clarification &amp; Compliance Response Note
                  </label>
                  <textarea
                    id="resubmit-response-note"
                    rows={3}
                    value={resubmitNote}
                    onChange={(e) => setResubmitNote(e.target.value)}
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachRenewedCert}
                    onChange={(e) => setAttachRenewedCert(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>
                    Also register renewed Fire &amp; Life Safety Certificate (v2) &amp; Name Affidavit to update flagged checklist items
                  </span>
                </label>

                {!resubmitConfirmOpen ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!resubmitNote.trim()) return;
                        setResubmitConfirmOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Clarification &amp; Resubmit Dossier</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-red-300 dark:border-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                      Confirm resubmission of {application.id} to Regional Reviewer queue?
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setResubmitConfirmOpen(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!resubmitNote.trim()) return;
                          onResubmitApplication({
                            appId: application.id,
                            responseNote: resubmitNote.trim(),
                            attachRenewedCertificate: attachRenewedCert,
                          });
                          setResubmitConfirmOpen(false);
                          setFeedbackBanner(
                            'Clarification and renewed certificate record submitted. Application status updated to "Under Manual Review".'
                          );
                        }}
                        className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        Confirm Resubmission
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Category-Specific Checklist */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                1. Category-Specific Compliance Checklist ({application.checklist.length} Items)
              </h3>
              <span className="text-xs text-slate-500">
                {application.checklist.filter((c) => c.status !== 'Pending Upload').length} /{' '}
                {application.checklist.length} Registered
              </span>
            </div>

            <div className="liquid-glass rounded-2xl divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {application.checklist.map((item) => {
                const linkedDoc = documents.find((d) => d.id === item.linkedDocumentId);
                const isUploadingThis = uploadingChecklistId === item.id;

                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{item.documentCategory}</span>
                        </div>
                        {linkedDoc ? (
                          canUserAccessDocument(currentUser, linkedDoc, [application]) ? (
                            <div className="flex items-center gap-2 flex-wrap text-xs text-stone-600 dark:text-stone-400 font-mono-tabular">
                              <span>Linked Record:</span>
                              <button
                                type="button"
                                onClick={() => onOpenDocument(linkedDoc.id)}
                                className="text-[#C2410C] dark:text-amber-400 font-semibold hover:underline cursor-pointer"
                              >
                                {linkedDoc.internalCode} ({linkedDoc.name})
                              </button>
                              <FileTypeMarker mimeType={linkedDoc.mimeType} fileName={linkedDoc.fileName} />
                            </div>
                          ) : (
                            <div className="text-xs text-stone-500 font-mono-tabular italic">
                              Linked Record: Restricted (Outside Authorized Scope)
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-stone-400">
                            No document record registered yet.
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                            Flag Note: {item.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={item.status} size="sm" />

                        {isRep && (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadingChecklistId(isUploadingThis ? null : item.id);
                              setUploadTitle(`${item.title} (${application.officialInstitutionCode})`);
                              setUploadCertNo(`CERT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 8999)}`);
                            }}
                            className="btn-secondary !py-1 !px-2.5 cursor-pointer"
                          >
                            {linkedDoc ? 'Update Record' : 'Register Document'}
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isUploadingThis && (
                        <motion.form
                          variants={inlinePanelVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          onSubmit={(e) => handleChecklistUploadSubmit(e, item.id)}
                          className="p-3.5 rounded-xl liquid-glass-subtle space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              Register Supporting Document for "{item.title}"
                            </span>
                            <span className="text-[11px] font-mono-tabular text-slate-500">
                              Storage: veridex-documents (Private)
                            </span>
                          </div>

                          {checklistUploadError && (
                            <div
                              role="alert"
                              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start justify-between gap-2"
                            >
                              <span>{checklistUploadError}</span>
                              <button
                                type="button"
                                onClick={() => setChecklistUploadError(null)}
                                className="text-red-700 dark:text-red-300 font-semibold underline shrink-0 cursor-pointer"
                              >
                                Retry
                              </button>
                            </div>
                          )}

                          {isUploadingChecklist && (
                            <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600 dark:text-blue-400" />
                              <span>Uploading file to private storage bucket `veridex-documents` and persisting metadata...</span>
                            </div>
                          )}

                          {vaultDocs.length > 0 && (
                            <div className="p-2.5 rounded-lg bg-white/80 dark:bg-stone-900/80 border border-[#C7A56A]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <select
                                aria-label="Select a saved Vault document to prefill checklist fields"
                                value={selectedVaultPrefillId}
                                onChange={(e) => setSelectedVaultPrefillId(e.target.value)}
                                className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                              >
                                <option value="">
                                  Prefill from Personal Document Vault ({vaultDocs.length} saved)...
                                </option>
                                {vaultDocs.map((vd) => (
                                  <option key={vd.id} value={vd.id}>
                                    {vd.editableDetails.title} (Cert #{vd.editableDetails.certificateNumber})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={!selectedVaultPrefillId || isUploadingChecklist}
                                onClick={() => {
                                  const chosen = vaultDocs.find((v) => v.id === selectedVaultPrefillId);
                                  if (!chosen) return;
                                  const prefill = extractDocumentPrefillSuggestion(
                                    chosen,
                                    currentUser.fullName
                                  );
                                  setUploadTitle(prefill.title);
                                  setUploadCertNo(prefill.certificateNumber);
                                  if (prefill.expiryDate) {
                                    setUploadExpiry(prefill.expiryDate);
                                  }
                                  setChecklistFileName(chosen.originalFileName || 'Vault_Document.pdf');
                                  setChecklistFileSize(chosen.fileSizeLabel || '1.40 MB');
                                }}
                                className="btn-secondary !py-1 !px-2.5 text-[11px] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                              >
                                Prefill Fields from Vault
                              </button>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">
                                Document Title *
                              </label>
                              <input
                                type="text"
                                required
                                value={uploadTitle}
                                onChange={(e) => setUploadTitle(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">
                                Certificate Number *
                              </label>
                              <input
                                type="text"
                                required
                                value={uploadCertNo}
                                onChange={(e) => setUploadCertNo(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">
                                Valid Until (Optional)
                              </label>
                              <input
                                type="date"
                                value={uploadExpiry}
                                onChange={(e) => setUploadExpiry(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                              />
                            </div>
                          </div>

                          {/* File Picker Input */}
                          <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <label
                                htmlFor={`checklist-file-input-${item.id}`}
                                className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                              >
                                <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Choose Document File (.pdf, .jpg, .png up to 15 MB)</span>
                              </label>
                              <span className="text-[10px] text-slate-400">
                                Strictly stored in private `veridex-documents` bucket
                              </span>
                            </div>

                            <input
                              id={`checklist-file-input-${item.id}`}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={isUploadingChecklist}
                              onChange={handleChecklistFileChange}
                              aria-label={`Upload document for ${item.title}`}
                              className="w-full text-xs text-slate-600 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-blue-300 cursor-pointer"
                            />

                            {checklistFile && (
                              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-mono-tabular pt-1">
                                <FileCheck className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Selected: <strong>{checklistFileName}</strong> ({checklistFileSize}, {checklistMimeType})
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isUploadingChecklist}
                              onClick={() => {
                                setUploadingChecklistId(null);
                                setChecklistFile(null);
                                setChecklistUploadError(null);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium cursor-pointer disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isUploadingChecklist}
                              className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {isUploadingChecklist ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Uploading...</span>
                                </>
                              ) : (
                                <span>Register &amp; Link Record</span>
                              )}
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Linked Documents, Extracted vs. Entered Provenance & Evidence-Linked Findings */}
          <section className="space-y-3" data-testid="dossier-linked-documents-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                2. Linked Documents, Extracted vs. Entered Metadata &amp; Evidence-Linked Findings ({linkedDocs.length})
              </h3>
              <span className="text-[11px] font-mono-tabular text-stone-500 dark:text-stone-400">
                Provenance: OCR Extracted vs. Manually Entered vs. Reviewer Verified
              </span>
            </div>
            <div className="space-y-3">
              {linkedDocs.map((doc) => {
                const exp = calculateExpiryDetails(doc.expiryDate, todayStr);
                const hasOcr = Boolean(doc.ocrExtractedText && doc.ocrExtractedText.trim());
                const provenanceLabel =
                  doc.humanReviewStatus === 'Reviewed' && doc.issuerVerificationStatus === 'Verified'
                    ? 'Reviewer Verified'
                    : hasOcr
                      ? 'OCR Extracted + User Confirmed'
                      : 'Manually Entered Metadata';

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl liquid-glass space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-stone-900 dark:text-white">
                          <span className="font-mono-tabular text-[#C2410C] dark:text-amber-400">
                            {doc.internalCode}
                          </span>
                          <span>{doc.name}</span>
                          <FileTypeMarker mimeType={doc.mimeType} fileName={doc.fileName} fileSize={doc.fileSize} />
                          <StatusBadge status={exp.status} customLabel={exp.label} size="sm" />
                          <StatusBadge status={doc.humanReviewStatus} size="sm" />
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono-tabular mt-1 flex flex-wrap items-center gap-2">
                          <span>Cert #{doc.certificateNumber}</span>
                          <span>·</span>
                          <span>{doc.category}</span>
                          <span>·</span>
                          <span className="px-2 py-0.5 rounded bg-[#C2410C]/15 text-[#C2410C] dark:text-amber-300 font-semibold">
                            Source: {provenanceLabel}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc.id)}
                        className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <span>Inspect Document &amp; 6 Pillars</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Extracted Summary vs Entered Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl liquid-glass-subtle space-y-1">
                        <div className="text-[10px] font-mono-tabular uppercase font-bold text-[#9E2919] dark:text-amber-400">
                          Entered / Registered Record Fields
                        </div>
                        <div className="text-[11px] text-stone-700 dark:text-stone-300 space-y-0.5 font-mono-tabular">
                          <div>Holder / Signatory: <strong>{doc.personName}</strong></div>
                          <div>Authority: <strong>{doc.issuingAuthority}</strong></div>
                          <div>Issue: {doc.issueDate} · Expiry: {doc.expiryDate || 'Permanent'}</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl liquid-glass-subtle space-y-1">
                        <div className="text-[10px] font-mono-tabular uppercase font-bold text-[#046A38] dark:text-emerald-400">
                          {hasOcr ? 'OCR Extracted Summary Fields' : 'Structured Document Summary Fields'}
                        </div>
                        <div className="text-[11px] text-stone-700 dark:text-stone-300 space-y-0.5 font-mono-tabular">
                          {Object.entries(doc.extractedSummary || {}).length > 0 ? (
                            Object.entries(doc.extractedSummary).map(([k, v]) => (
                              <div key={k}>
                                {k}: <strong>{v}</strong>
                              </div>
                            ))
                          ) : (
                            <div className="text-stone-500">No separate extracted summary fields recorded.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {doc.findings.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-stone-200/70 dark:border-stone-800">
                        {doc.findings.map((f) => {
                          const findingKey = `${doc.id}:${f.id}`;
                          const isResolvingThis = resolvingFindingKey === findingKey;
                          return (
                            <div
                              key={f.id}
                              className="text-xs liquid-glass-subtle p-3 rounded-xl space-y-2"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-stone-900 dark:text-white">
                                    [{f.pillar}] {f.affectedFieldOrPage}:
                                  </span>{' '}
                                  <span className="text-stone-600 dark:text-stone-300">
                                    {f.explanation}
                                  </span>
                                  <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono-tabular mt-0.5">
                                    Evidence: {f.evidenceComparison} · Next Action: {f.suggestedNextAction}
                                  </div>
                                  {f.resolutionDecision && (
                                    <div className="mt-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-stone-800 dark:text-emerald-200 font-mono-tabular">
                                      <strong>Reviewer Decision ({f.resolutionDecision}):</strong> {f.resolutionJustification} — <em>{f.resolvedByReviewer} ({f.resolvedAt})</em>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <StatusBadge status={f.status} size="sm" />
                                  {isAdmin && onResolveFinding && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isResolvingThis) {
                                          setResolvingFindingKey(null);
                                        } else {
                                          setResolvingFindingKey(findingKey);
                                          setFindingResolutionDecision('Resolved');
                                          setFindingJustification(f.resolutionJustification || '');
                                          setFindingResolutionError(null);
                                        }
                                      }}
                                      className="px-2 py-1 rounded-lg liquid-glass text-[11px] font-semibold text-[#C2410C] dark:text-amber-400 hover:underline cursor-pointer"
                                    >
                                      {f.resolutionDecision ? 'Update Resolution' : 'Resolve / Override'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isResolvingThis && isAdmin && onResolveFinding && (
                                <div className="p-3 rounded-xl bg-white/90 dark:bg-stone-900/90 border border-[#C7A56A]/50 space-y-2.5">
                                  <div className="text-[11px] font-bold text-stone-900 dark:text-white">
                                    Record Human Review Finding Resolution (Mandatory Justification)
                                  </div>
                                  {findingResolutionError && (
                                    <div className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                                      {findingResolutionError}
                                    </div>
                                  )}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <select
                                      aria-label="Finding resolution decision"
                                      value={findingResolutionDecision}
                                      onChange={(e) =>
                                        setFindingResolutionDecision(
                                          e.target.value as 'Resolved' | 'Overridden' | 'Confirmed Deficiency'
                                        )
                                      }
                                      className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                                    >
                                      <option value="Resolved">Resolved (Verified Acceptable)</option>
                                      <option value="Overridden">Overridden with Officer Note</option>
                                      <option value="Confirmed Deficiency">Confirmed Deficiency Flag</option>
                                    </select>
                                    <input
                                      type="text"
                                      value={findingJustification}
                                      onChange={(e) => setFindingJustification(e.target.value)}
                                      placeholder="Enter mandatory evidence justification (e.g. verified against original scroll)..."
                                      className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950"
                                    />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setResolvingFindingKey(null)}
                                      className="px-2.5 py-1 rounded-lg border border-stone-300 text-[11px] cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!findingJustification.trim()) {
                                          setFindingResolutionError(
                                            'Please enter a written justification before recording this finding resolution.'
                                          );
                                          return;
                                        }
                                        onResolveFinding({
                                          docId: doc.id,
                                          findingId: f.id,
                                          decision: findingResolutionDecision,
                                          justification: findingJustification.trim(),
                                        });
                                        setResolvingFindingKey(null);
                                        setFindingJustification('');
                                        setFeedbackBanner(
                                          `Recorded ${findingResolutionDecision} determination on finding ${f.id} (${doc.internalCode}).`
                                        );
                                      }}
                                      className="px-3 py-1 rounded-lg bg-[#046A38] hover:bg-[#03542C] text-white text-[11px] font-semibold cursor-pointer"
                                    >
                                      Save Finding Determination
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2B. Cross-Document Consistency Comparison Matrix (SIH26261) */}
          <section className="space-y-3" data-testid="dossier-consistency-matrix-section">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                3. Cross-Document Consistency Comparison Matrix
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Compares shared institutional codes, holder identities, validity dates, and declared measurements across attached documents.
              </p>
            </div>
            <div className="liquid-glass rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#C7A56A]/35 liquid-glass-subtle text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                    <th className="py-2.5 px-3">Compared Field &amp; Rule</th>
                    <th className="py-2.5 px-3">Values Across Linked Documents</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Observation &amp; Reviewer Guidance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                  {consistencyMatrix.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-semibold text-stone-900 dark:text-white">{row.fieldName}</div>
                        <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                          {row.comparisonRule}
                        </div>
                      </td>
                      <td className="py-3 px-3 space-y-1.5">
                        {row.valuesByDocument.length === 0 ? (
                          <span className="text-[11px] text-stone-400 italic">No applicable document values</span>
                        ) : (
                          row.valuesByDocument.map((val) => (
                            <div
                              key={`${row.id}-${val.documentId}`}
                              className="p-1.5 rounded-lg liquid-glass-subtle text-[11px] font-mono-tabular flex flex-wrap items-center justify-between gap-2"
                            >
                              <span>
                                <strong className="text-[#C2410C] dark:text-amber-400">{val.internalCode}:</strong> {val.value}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-stone-800 text-[10px]">
                                {val.valueSource}
                              </span>
                            </div>
                          ))
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <StatusBadge status={row.status} customLabel={row.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 max-w-[240px]">
                        <div className="text-stone-800 dark:text-stone-200 text-[11px] leading-relaxed">
                          {row.discrepancyReason}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">
                          Guidance: {row.reviewGuidance}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2C. Document Authenticity & Fraud-Indicator Assessment (Honest Statuses) */}
          {activeAuthDoc && (
            <section className="space-y-3" data-testid="dossier-authenticity-section">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    4. Document Authenticity &amp; Fraud-Indicator Assessment
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Structured 8-point check. External cryptographic/registry checks honestly report <code className="font-mono-tabular">Unable to verify</code> or <code className="font-mono-tabular">Demonstration result</code> when no live authority API is connected.
                  </p>
                </div>
                {linkedDocs.length > 1 && (
                  <select
                    aria-label="Select document to inspect authenticity checks"
                    value={activeAuthDoc.id}
                    onChange={(e) => setSelectedAuthDocId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono-tabular rounded-xl liquid-glass-subtle text-stone-900 dark:text-white"
                  >
                    {linkedDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.internalCode} · {d.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeAuthenticityChecks.map((chk) => (
                  <div key={chk.id} className="p-3.5 rounded-2xl liquid-glass space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-stone-900 dark:text-white">
                        {chk.checkName}
                      </span>
                      <StatusBadge status={chk.status} customLabel={chk.status} size="sm" />
                    </div>
                    <div className="text-[11px] font-mono-tabular text-[#C2410C] dark:text-amber-400">
                      {chk.observedEvidence}
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                      {chk.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2D. Applicable Regulatory Compliance Evaluation Matrix (AICTE APH) */}
          {complianceMatrix.length > 0 && (
            <section className="space-y-3" data-testid="dossier-compliance-matrix-section">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  5. Applicable Regulatory Compliance Checks ({complianceMatrix.length} Active Rules)
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Evaluates linked application evidence against active AICTE Approval Process Handbook (APH) compliance rules. Basis: rule category mapping, minimum remaining validity days, and unresolved verification flags.
                </p>
              </div>
              <div className="liquid-glass rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#C7A56A]/35 liquid-glass-subtle text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                      <th className="py-2.5 px-3">Rule &amp; Version</th>
                      <th className="py-2.5 px-3">Required vs. Observed Evidence</th>
                      <th className="py-2.5 px-3">Result</th>
                      <th className="py-2.5 px-3">Evaluation Reason &amp; Reviewer Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                    {complianceMatrix.map((row) => (
                      <tr key={row.ruleId} className="align-top">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono-tabular font-bold text-[#9E2919] dark:text-amber-400">
                            {row.ruleCode}
                          </div>
                          <div className="font-semibold text-stone-900 dark:text-white whitespace-normal max-w-[180px]">
                            {row.ruleName}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-stone-500">
                            {row.ruleVersion} · Eff: {row.effectiveDate}
                          </div>
                        </td>
                        <td className="py-3 px-3 space-y-1 max-w-[230px]">
                          <div className="text-[11px] text-stone-600 dark:text-stone-300">
                            <strong>Required:</strong> {row.requiredEvidence}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-stone-800 dark:text-stone-200">
                            <strong>Observed:</strong> {row.observedEvidence}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={row.status} customLabel={row.status} size="sm" />
                        </td>
                        <td className="py-3 px-3 max-w-[230px]">
                          <div className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
                            {row.reason}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-stone-500 mt-1">
                            Reviewer Sign-Off: <strong>{row.reviewerStatus}</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Admin Review & Authorized Decision Controls */}
          {isAdmin && (
            <section className="p-5 rounded-2xl liquid-glass space-y-4">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  3. Authorized Administrator Review &amp; Decision Controls
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Add a review note, request additional documents/clarifications from the institution, or record an authorized compliance decision.
                </p>
              </div>

              <div>
                <label
                  htmlFor="admin-review-note"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Reviewer Note / Correction Instructions / Decision Rationale
                </label>
                <textarea
                  id="admin-review-note"
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Enter specific evidence findings, required document replacements, or compliance decision notes..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const noteText =
                      adminNote.trim() ||
                      'Reviewed linked checklist items and verification findings.';
                    onAdminAction({
                      appId: application.id,
                      actionType: 'Review Note',
                      note: noteText,
                    });
                    setAdminNote('');
                    setFeedbackBanner('Review note recorded in dossier history.');
                  }}
                  className="px-3.5 py-2 rounded-xl liquid-glass-subtle text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-blue-500/40 cursor-pointer"
                >
                  Add Review Note
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const noteText =
                      adminNote.trim() ||
                      'Please register renewed statutory validity certificate and address flagged consistency items before final evaluation.';
                    onAdminAction({
                      appId: application.id,
                      actionType: 'Correction Request',
                      note: noteText,
                    });
                    setAdminNote('');
                    setFeedbackBanner(
                      'Status updated to "Additional Information Required" and notification dispatched to the Institutional Representative.'
                    );
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer"
                >
                  Request Additional Info / Corrections
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onAdminAction({
                      appId: application.id,
                      actionType: 'Under Manual Review',
                      note:
                        adminNote.trim() ||
                        'Moved dossier to Under Manual Review for regional committee evaluation.',
                    });
                    setAdminNote('');
                    setFeedbackBanner('Application status updated to "Under Manual Review".');
                  }}
                  className="px-3.5 py-2 rounded-xl glass-tint-blue text-blue-800 dark:text-blue-300 text-xs font-medium cursor-pointer"
                >
                  Mark Under Manual Review
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionConfirmOpen((prev) => !prev)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer ml-auto"
                >
                  Record Authorized Decision...
                </button>
              </div>

              <AnimatePresence>
                {decisionConfirmOpen && (
                  <motion.div
                    variants={inlinePanelVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-4 rounded-xl liquid-glass-elevated border border-blue-400/40 space-y-3"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Confirm Authorized Compliance Decision (Admin Only)
                    </div>
                    <select
                      aria-label="Select compliance decision outcome"
                      value={selectedDecision}
                      onChange={(e) =>
                        setSelectedDecision(
                          e.target.value as NonNullable<ApplicationRecord['decisionOutcome']>
                        )
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="Compliance Verified: Recommended">
                        Compliance Verified: Recommended
                      </option>
                      <option value="Conditional Compliance: Inspection Required">
                        Conditional Compliance: Inspection Required
                      </option>
                      <option value="Deficiency Recorded: Deferred">
                        Deficiency Recorded: Deferred
                      </option>
                    </select>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisionConfirmOpen(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onAdminAction({
                            appId: application.id,
                            actionType: 'Authorized Decision',
                            decisionOutcome: selectedDecision,
                            note:
                              adminNote.trim() ||
                              `Authorized decision recorded by ${currentUser.fullName}: ${selectedDecision}.`,
                          });
                          setDecisionConfirmOpen(false);
                          setAdminNote('');
                          setFeedbackBanner(`Decision recorded: ${selectedDecision}`);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        Confirm &amp; Record Decision
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {/* Review Notes & Status History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Review Notes */}
            <section className="space-y-3">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Review Notes &amp; Clarifications ({application.reviewNotes.length})</span>
              </h3>
              <div className="space-y-2.5">
                {application.reviewNotes.length === 0 ? (
                  <p className="text-xs text-slate-500">No review notes recorded yet.</p>
                ) : (
                  application.reviewNotes.map((rn) => (
                    <div
                      key={rn.id}
                      className="p-3.5 rounded-xl liquid-glass-subtle text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {rn.authorName} ({rn.actionType})
                        </span>
                        <span className="text-[11px] font-mono-tabular text-slate-400">
                          {rn.timestamp}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rn.note}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Status Change History */}
            <section className="space-y-3">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Status Change Timeline ({application.statusHistory.length})</span>
              </h3>
              <div className="space-y-2.5">
                {application.statusHistory.map((sh) => (
                  <div
                    key={sh.id}
                    className="p-3.5 rounded-xl liquid-glass-subtle text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {sh.fromStatus} → {sh.toStatus}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-400">
                        {sh.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">{sh.note}</p>
                    <div className="text-[11px] text-slate-400 font-mono-tabular">
                      By: {sh.changedBy} ({sh.changedByRole})
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
