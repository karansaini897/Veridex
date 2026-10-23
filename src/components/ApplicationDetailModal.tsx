import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  FileText,
  Send,
  ShieldCheck,
  MessageSquare,
  History,
  ArrowUpRight,
} from 'lucide-react';
import {
  ApplicationRecord,
  ApplicationStatus,
  DocumentRecord,
  UserAccount,
} from '../types/portal';
import {
  calculateExpiryDetails,
  canUserPerformAdminAction,
  REFERENCE_DATE,
} from '../lib/domain';

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
  const [uploadingChecklistId, setUploadingChecklistId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCertNo, setUploadCertNo] = useState('');
  const [uploadExpiry, setUploadExpiry] = useState('2027-09-30');

  const [resubmitNote, setResubmitNote] = useState(
    'Uploaded renewed Municipal Fire & Life Safety Certificate (valid through Oct 2027) and attached notarized name-equivalence affidavit for Dr. Siddharth Kulkarni.'
  );
  const [attachRenewedCert, setAttachRenewedCert] = useState(true);

  const [adminNote, setAdminNote] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<
    NonNullable<ApplicationRecord['decisionOutcome']>
  >('Compliance Verified — Recommended');
  const [decisionConfirmOpen, setDecisionConfirmOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const isAdmin = canUserPerformAdminAction(currentUser);
  const isRep =
    currentUser.role === 'institutional_rep' &&
    currentUser.institutionId === application.institutionId;

  const linkedDocs = documents.filter(
    (d) =>
      application.documentIds.includes(d.id) ||
      d.relatedApplicationId === application.id
  );

  const handleChecklistUploadSubmit = (e: React.FormEvent, checklistItemId: string) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadCertNo.trim()) return;
    onAttachChecklistDocument({
      appId: application.id,
      checklistItemId,
      docTitle: uploadTitle.trim(),
      certNumber: uploadCertNo.trim(),
      expiryDate: uploadExpiry || undefined,
    });
    setUploadingChecklistId(null);
    setUploadTitle('');
    setUploadCertNo('');
    setFeedbackBanner(
      'Supporting document uploaded and automated completeness, expiry, and consistency checks executed.'
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-dossier-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full flex flex-col border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 font-mono-tabular font-semibold">
              <span>{application.id}</span>
              <span aria-hidden="true">·</span>
              <span>Code: {application.officialInstitutionCode}</span>
              <span aria-hidden="true">·</span>
              <span>Status: {application.status}</span>
            </div>
            <h2
              id="app-dossier-title"
              className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white mt-0.5"
            >
              {application.category}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {application.institutionName} ({application.officialInstitutionCode}) · Assigned Reviewer:{' '}
              <strong>{application.assignedReviewer}</strong>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close application dossier"
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Statutory Review Protocol Notice */}
          <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <strong>Statutory Verification Protocol:</strong> Automated OCR extraction, completeness checks, expiry tracking, and document integrity screening assist the reviewing officer. All compliance determinations require authorized human officer sign-off.
          </div>

          {feedbackBanner && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <span>{feedbackBanner}</span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-emerald-700 dark:text-emerald-300 font-semibold ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {application.decisionOutcome && (
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
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
            <section className="p-5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Ready to Submit Application Dossier?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Submitting runs automated validation checks on all linked documents and places the dossier into the Regional Officer review queue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSubmitDraftApplication(
                      application.id,
                      'Submitted institutional dossier after completing category checklist and pre-submission checks.'
                    );
                    setFeedbackBanner(
                      'Application submitted! Status updated to "Submitted" and queued for regional review.'
                    );
                  }}
                  className="px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Application Now</span>
                </button>
              </div>
            </section>
          )}

          {isRep && application.status === 'Additional Information Required' && (
            <section className="p-5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/70 space-y-4">
              <div>
                <h3 className="text-sm font-display font-bold text-red-900 dark:text-red-200">
                  Respond to Review Request &amp; Resubmit Application
                </h3>
                <p className="text-xs text-red-800/90 dark:text-red-300/90 mt-0.5">
                  Provide the requested clarification or renewed document below to transition this application back to <strong>Under Manual Review</strong>.
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
                    className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
                    Also upload renewed Fire &amp; Life Safety Certificate (v2) &amp; Name Affidavit to clear checklist flags
                  </span>
                </label>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!resubmitNote.trim()) return;
                      onResubmitApplication({
                        appId: application.id,
                        responseNote: resubmitNote.trim(),
                        attachRenewedCertificate: attachRenewedCert,
                      });
                      setFeedbackBanner(
                        'Clarification and renewed certificate submitted! Application status updated to "Under Manual Review".'
                      );
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Clarification &amp; Resubmit Dossier</span>
                  </button>
                </div>
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
                {application.checklist.length} Attached
              </span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800">
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
                          <div className="text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
                            Linked Record:{' '}
                            <button
                              type="button"
                              onClick={() => onOpenDocument(linkedDoc.id)}
                              className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                            >
                              {linkedDoc.internalCode} ({linkedDoc.name})
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400">
                            No document attached yet.
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                            Flag Note: {item.notes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-mono-tabular font-medium ${
                            item.status === 'Verified'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : item.status === 'Flagged for Review'
                                ? 'text-red-700 dark:text-red-400'
                                : item.status === 'Uploaded'
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-slate-500'
                          }`}
                        >
                          {item.status}
                        </span>

                        {isRep && (
                          <button
                            type="button"
                            onClick={() => {
                              setUploadingChecklistId(isUploadingThis ? null : item.id);
                              setUploadTitle(`${item.title} — ${application.officialInstitutionCode}`);
                              setUploadCertNo(`CERT/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 8999)}`);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            {linkedDoc ? 'Replace Document' : 'Upload Document'}
                          </button>
                        )}
                      </div>
                    </div>

                    {isUploadingThis && (
                      <form
                        onSubmit={(e) => handleChecklistUploadSubmit(e, item.id)}
                        className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          Upload &amp; Validate Document for "{item.title}"
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1">
                              Document Title
                            </label>
                            <input
                              type="text"
                              required
                              value={uploadTitle}
                              onChange={(e) => setUploadTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-1">
                              Certificate Number
                            </label>
                            <input
                              type="text"
                              required
                              value={uploadCertNo}
                              onChange={(e) => setUploadCertNo(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
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
                              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono-tabular"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setUploadingChecklistId(null)}
                            className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 rounded bg-blue-700 text-white text-xs font-medium cursor-pointer"
                          >
                            Attach &amp; Run Checks
                          </button>
                        </div>
                      </form>
                    )}
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
                const exp = calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE);
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono-tabular text-blue-700 dark:text-blue-400 mr-2">
                            {doc.internalCode}
                          </span>
                          {doc.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
                          Cert #{doc.certificateNumber} · {doc.category} · Expiry: {exp.label} · Human Review: {doc.humanReviewStatus}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 cursor-pointer shrink-0"
                      >
                        <span>Inspect Document &amp; 6 Pillars</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {doc.findings.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                        {doc.findings.map((f) => (
                          <div
                            key={f.id}
                            className="text-xs flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                [{f.pillar}] {f.affectedFieldOrPage}:
                              </span>{' '}
                              <span className="text-slate-600 dark:text-slate-400">
                                {f.explanation}
                              </span>
                              <div className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
                                Evidence: {f.evidenceComparison} · Next Action: {f.suggestedNextAction}
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-mono-tabular font-semibold whitespace-nowrap shrink-0 ${
                                f.status.includes('Flagged') || f.status === 'Action Required'
                                  ? 'text-red-700 dark:text-red-400'
                                  : f.status.includes('Passed') || f.status === 'Reviewed'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {f.status}
                            </span>
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
            <section className="p-5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
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
                  className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const noteText =
                      adminNote.trim() ||
                      'Reviewed linked checklist items and simulated verification findings.';
                    onAdminAction({
                      appId: application.id,
                      actionType: 'Review Note',
                      note: noteText,
                    });
                    setAdminNote('');
                    setFeedbackBanner('Review note recorded in dossier history.');
                  }}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Add Review Note
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const noteText =
                      adminNote.trim() ||
                      'Please upload renewed statutory validity certificate and address flagged consistency items before final evaluation.';
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
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer"
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
                  className="px-3.5 py-2 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-xs font-medium cursor-pointer"
                >
                  Mark Under Manual Review
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionConfirmOpen((prev) => !prev)}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer ml-auto"
                >
                  Record Authorized Decision...
                </button>
              </div>

              {decisionConfirmOpen && (
                <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 space-y-3">
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Compliance Verified — Recommended">
                      Compliance Verified — Recommended
                    </option>
                    <option value="Conditional Compliance — Inspection Required">
                      Conditional Compliance — Inspection Required
                    </option>
                    <option value="Deficiency Recorded — Deferred">
                      Deficiency Recorded — Deferred
                    </option>
                  </select>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionConfirmOpen(false)}
                      className="px-3 py-1.5 rounded border border-slate-300 text-xs"
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
                      className="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      Confirm &amp; Record Decision
                    </button>
                  </div>
                </div>
              )}
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
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 text-xs space-y-1"
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
                    className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 text-xs space-y-1"
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
      </div>
    </div>
  );
};
