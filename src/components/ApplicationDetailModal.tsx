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
  DocumentRecord,
  UserAccount,
  VaultDocumentRecord,
} from '../types/portal';
import {
  addDaysToLocalDate,
  calculateExpiryDetails,
  canUserAccessDocument,
  canUserPerformAdminAction,
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

          {/* Linked Documents & Evidence-Linked Findings */}
          <section className="space-y-3">
            <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
              2. Linked Documents &amp; Evidence-Linked Findings ({linkedDocs.length})
            </h3>
            <div className="space-y-3">
              {linkedDocs.map((doc) => {
                const exp = calculateExpiryDetails(doc.expiryDate, todayStr);
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl liquid-glass space-y-2.5"
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
                        <div className="text-[11px] text-stone-500 font-mono-tabular mt-1">
                          Cert #{doc.certificateNumber} · {doc.category}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc.id)}
                        className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Inspect Document &amp; 6 Pillars</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {doc.findings.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-stone-200/70 dark:border-stone-800">
                        {doc.findings.map((f) => (
                          <div
                            key={f.id}
                            className="text-xs flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 liquid-glass-subtle p-2.5 rounded-xl"
                          >
                            <div>
                              <span className="font-semibold text-stone-900 dark:text-white">
                                [{f.pillar}] {f.affectedFieldOrPage}:
                              </span>{' '}
                              <span className="text-stone-600 dark:text-stone-400">
                                {f.explanation}
                              </span>
                              <div className="text-[11px] text-stone-500 font-mono-tabular mt-0.5">
                                Evidence: {f.evidenceComparison} · Next Action: {f.suggestedNextAction}
                              </div>
                            </div>
                            <StatusBadge status={f.status} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

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
