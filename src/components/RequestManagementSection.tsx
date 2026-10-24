import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Eye,
  Plus,
  Calendar,
  X,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import {
  DocumentSubmissionRequest,
  StudentRequestSubmission,
  UserAccount,
} from '../types/portal';

interface RequestManagementSectionProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  requests: DocumentSubmissionRequest[];
  submissions: StudentRequestSubmission[];
  onCreateNewRequest?: () => void;
}

interface StudentSubmissionDetailModalProps {
  student: UserAccount;
  request: DocumentSubmissionRequest;
  submission: StudentRequestSubmission | null;
  onClose: () => void;
}

export const StudentSubmissionDetailModal: React.FC<StudentSubmissionDetailModalProps> = ({
  student,
  request,
  submission,
  onClose,
}) => {
  const initials = student.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  const isVerified = submission?.status === 'Verified in demo';
  const isNeedsReview = submission?.status === 'Needs review in demo';
  const isPending = !submission || submission.status === 'Pending';
  const isSubmitted = submission?.status === 'Submitted' || submission?.status === 'Verifying';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Submission Details: ${student.fullName}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-floating rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/40 flex flex-col max-h-[90vh]"
      >
        {/* Tricolour Accent */}
        <div className="h-1.5 w-full tricolour-bar shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 flex items-start justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#C2410C] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#046A38] to-[#03542C] text-white font-display font-bold text-base flex items-center justify-center shrink-0 shadow-xs border-2 border-[#C2410C]/40">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white truncate">
                {student.fullName}
              </h3>
              <p className="text-xs text-[#C2410C] dark:text-amber-400 font-semibold font-mono-tabular truncate">
                Roll No: {student.rollNumber || 'VESIT23CE018'}
              </p>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                {student.course || 'B.Tech — CMPN'} · {student.academicDepartment || 'CMPN'} Div {student.division || 'A'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-[#EFE6D5] dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs text-stone-900 dark:text-stone-100 bg-stone-50/50 dark:bg-stone-950/40">
          {/* Request Header Banner */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-1">
            <span className="text-[10px] font-mono-tabular font-bold text-stone-500 uppercase tracking-wider block">
              Application / Document Request
            </span>
            <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white">
              {request.title}
            </h4>
            <p className="text-stone-600 dark:text-stone-400 text-xs">
              {request.description}
            </p>
            <div className="pt-2 flex items-center justify-between text-[11px] font-mono-tabular text-stone-500 border-t border-stone-200 dark:border-stone-800">
              <span>Deadline: {request.deadline}</span>
              <span>Recipient Group: {request.recipientGroupLabel}</span>
            </div>
          </div>

          {/* Overall Submission Status */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 flex items-center justify-between gap-3">
            <div>
              <span className="text-stone-500 text-[11px] block">Overall Submission Status</span>
              <span className="font-bold text-stone-900 dark:text-white text-sm">
                {submission?.status || 'Pending Submission'}
              </span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono-tabular inline-flex items-center gap-1.5 ${
                isVerified
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : isNeedsReview
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : isSubmitted
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              {isVerified && <CheckCircle2 className="w-4 h-4" />}
              {isNeedsReview && <AlertCircle className="w-4 h-4" />}
              {isPending && <Clock className="w-4 h-4" />}
              <span>{submission?.status || 'Pending'}</span>
            </span>
          </div>

          {/* Verification Feedback (if simulated) */}
          {submission?.verificationFeedback && (
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 space-y-1">
              <span className="font-bold text-stone-800 dark:text-stone-200 block text-[11px]">
                Simulated Verification Engine Feedback
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                {submission.verificationFeedback}
              </p>
            </div>
          )}

          {/* Required Documents Audit Breakdown */}
          <div className="space-y-2">
            <span className="font-bold text-stone-800 dark:text-stone-200 block">
              Required Documents Audit Checklist
            </span>

            <div className="space-y-2">
              {request.requiredDocuments.map((reqDoc) => {
                const matchedSubmittedDoc = submission?.documents.find(
                  (d) => d.requirementId === reqDoc.id || d.requirementName === reqDoc.name
                );

                return (
                  <div
                    key={reqDoc.id}
                    className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                          {matchedSubmittedDoc ? (
                            <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          <span>{reqDoc.name}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {reqDoc.description}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-tabular shrink-0 ${
                          matchedSubmittedDoc
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {matchedSubmittedDoc ? 'Submitted' : 'Missing'}
                      </span>
                    </div>

                    {/* Submitted File Metadata */}
                    {matchedSubmittedDoc ? (
                      <div className="pt-2 mt-1 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] font-mono-tabular text-stone-600 dark:text-stone-400">
                        <div>
                          <span className="font-semibold text-stone-900 dark:text-white">
                            📄 {matchedSubmittedDoc.fileName}
                          </span>
                          <span className="ml-2 text-stone-500">
                            ({matchedSubmittedDoc.fileSize})
                          </span>
                        </div>
                        {matchedSubmittedDoc.previewUrl ? (
                          <a
                            href={matchedSubmittedDoc.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#046A38] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Preview</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-stone-400 italic">
                            Session preview stored
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-400 italic font-mono-tabular">
                        ⚠️ Student has not yet selected or uploaded this document.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
            <strong>Client-Side Demo Storage Notice:</strong> Document submission metadata, verification statuses, and timestamps are persisted in browser localStorage. Real file binaries are not uploaded to any remote server or external storage service.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#C2410C]/20 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary !py-1.5 !px-4 text-xs"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const RequestManagementSection: React.FC<RequestManagementSectionProps> = ({
  currentUser,
  allUsers,
  requests,
  submissions,
  onCreateNewRequest,
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    requests[0]?.id || ''
  );
  const [inspectStudentSubmission, setInspectStudentSubmission] = useState<{
    student: UserAccount;
    request: DocumentSubmissionRequest;
    submission: StudentRequestSubmission | null;
  } | null>(null);

  const activeRequest = requests.find((r) => r.id === selectedRequestId) || requests[0];

  if (!activeRequest) {
    return (
      <div className="p-6 text-center rounded-2xl liquid-glass border border-dashed border-[#C2410C]/40 text-stone-600 dark:text-stone-400 text-xs">
        No document requests published yet. Click &quot;+ Create Request&quot; to issue your first document request.
      </div>
    );
  }

  // Metrics for active request
  const recipientStudents = allUsers.filter((u) =>
    activeRequest.recipientStudentIds.includes(u.id)
  );

  const requestSubmissions = submissions.filter(
    (s) => s.requestId === activeRequest.id
  );

  const totalRecipients = recipientStudents.length;

  const submittedCount = recipientStudents.filter((student) => {
    const sub = requestSubmissions.find((s) => s.studentId === student.id);
    return (
      sub &&
      (sub.status === 'Submitted' ||
        sub.status === 'Verified in demo' ||
        sub.status === 'Needs review in demo')
    );
  }).length;

  const pendingCount = totalRecipients - submittedCount;

  const verifiedCount = recipientStudents.filter((student) => {
    const sub = requestSubmissions.find((s) => s.studentId === student.id);
    return sub && sub.status === 'Verified in demo';
  }).length;

  return (
    <section aria-label="Request Management Dashboard" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#C2410C]">
            <FileText className="w-4 h-4 text-[#046A38]" />
            <span>Application &amp; Document Request Tracker</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Monitor student submissions, verify uploaded certificates, and track compliance for institutional events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {requests.length > 1 && (
            <select
              value={selectedRequestId}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#C2410C]/40 bg-white dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#046A38]"
            >
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}

          {onCreateNewRequest && (
            <button
              type="button"
              onClick={onCreateNewRequest}
              className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Request Overview Card */}
      <div className="liquid-glass rounded-2xl p-5 border border-[#C2410C]/35 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono-tabular">
              <span className="font-bold text-[#C2410C]">{activeRequest.id}</span>
              <span>·</span>
              <span className="font-semibold text-[#046A38] dark:text-emerald-400">
                Created by {activeRequest.creatorName} ({activeRequest.creatorRole === 'institutional_rep' ? 'Institution Manager' : activeRequest.creatorRole})
              </span>
            </div>
            <h3 className="text-lg font-display font-bold text-stone-900 dark:text-white">
              {activeRequest.title}
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              {activeRequest.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs font-mono-tabular">
            <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#046A38]" />
              <span>Deadline: {activeRequest.deadline}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#046A38]/10 text-[#046A38] dark:text-emerald-300 font-bold">
              ● Active Tracking
            </span>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-[#C2410C]/25">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
              Total Recipients
            </div>
            <div className="text-2xl font-mono-tabular font-bold text-stone-900 dark:text-white mt-0.5">
              {totalRecipients}
            </div>
            <div className="text-[10px] text-stone-500 font-mono-tabular mt-0.5 truncate">
              {activeRequest.recipientGroupLabel}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-[#C2410C]/25">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
              Submitted Applications
            </div>
            <div className="text-2xl font-mono-tabular font-bold text-blue-700 dark:text-blue-400 mt-0.5">
              {submittedCount}
            </div>
            <div className="text-[10px] text-stone-500 font-mono-tabular mt-0.5">
              {Math.round((submittedCount / (totalRecipients || 1)) * 100)}% completion rate
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-[#C2410C]/25">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
              Pending Submissions
            </div>
            <div className="text-2xl font-mono-tabular font-bold text-amber-700 dark:text-amber-400 mt-0.5">
              {pendingCount}
            </div>
            <div className="text-[10px] text-stone-500 font-mono-tabular mt-0.5">
              Awaiting student upload
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-stone-900/70 border border-[#C2410C]/25">
            <div className="text-[11px] font-semibold text-stone-600 dark:text-stone-400">
              Completed Verifications
            </div>
            <div className="text-2xl font-mono-tabular font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
              {verifiedCount}
            </div>
            <div className="text-[10px] text-stone-500 font-mono-tabular mt-0.5">
              Verified in demo simulation
            </div>
          </div>
        </div>

        {/* Required Documents Summary */}
        <div className="p-3 rounded-xl bg-stone-50/80 dark:bg-stone-950/60 border border-stone-200 dark:border-stone-800 space-y-1.5 text-xs">
          <span className="font-bold text-stone-800 dark:text-stone-200 block">
            Required Documents for this Event:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-700 dark:text-stone-300">
            {activeRequest.requiredDocuments.map((doc, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[#C2410C] font-bold font-mono-tabular">
                  #{idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-stone-900 dark:text-white">
                    {doc.name}
                  </span>
                  <span className="block text-[11px] text-stone-500 leading-snug">
                    {doc.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Individual Student Submissions Table */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-stone-900 dark:text-white">
              Individual Student Recipients &amp; Submission Progress ({recipientStudents.length})
            </span>
            <span className="text-[11px] text-stone-500 font-mono-tabular">
              Click student row for submission audit &amp; document preview
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#C2410C]/25">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EFE6D5]/80 dark:bg-stone-900/80 text-stone-700 dark:text-stone-300 border-b border-[#C2410C]/25">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Student Name</th>
                  <th className="py-2.5 px-3 font-semibold font-mono-tabular">Roll / PRN</th>
                  <th className="py-2.5 px-3 font-semibold">Class / Dept</th>
                  <th className="py-2.5 px-3 font-semibold font-mono-tabular">Submitted Docs</th>
                  <th className="py-2.5 px-3 font-semibold">Current Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800 bg-white/60 dark:bg-stone-950/60 font-mono-tabular">
                {recipientStudents.map((student) => {
                  const studentSub = requestSubmissions.find((s) => s.studentId === student.id);
                  const isVerifiedSub = studentSub?.status === 'Verified in demo';
                  const isNeedsReviewSub = studentSub?.status === 'Needs review in demo';
                  const isPendingSub = !studentSub || studentSub.status === 'Pending';
                  const submittedDocsCount = studentSub ? studentSub.documents.length : 0;
                  const totalRequired = activeRequest.requiredDocuments.length;

                  return (
                    <tr
                      key={student.id}
                      onClick={() =>
                        setInspectStudentSubmission({
                          student,
                          request: activeRequest,
                          submission: studentSub || null,
                        })
                      }
                      className="hover:bg-[#EFE6D5]/50 dark:hover:bg-stone-900/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-sans font-semibold text-stone-900 dark:text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#046A38]/10 text-[#046A38] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {student.fullName.slice(0, 1)}
                        </div>
                        <span className="truncate">{student.fullName}</span>
                      </td>
                      <td className="py-3 px-3 text-stone-600 dark:text-stone-400">
                        {student.rollNumber || 'VESIT23CE'}
                      </td>
                      <td className="py-3 px-3 text-stone-600 dark:text-stone-400 font-sans">
                        {student.academicDepartment || 'CMPN'} · Div {student.division || 'A'}
                      </td>
                      <td className="py-3 px-3 text-stone-700 dark:text-stone-300">
                        <span className="font-bold">
                          {submittedDocsCount} / {totalRequired}
                        </span>{' '}
                        files
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-tabular inline-flex items-center gap-1 ${
                            isVerifiedSub
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isNeedsReviewSub
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {isVerifiedSub && <CheckCircle2 className="w-3 h-3" />}
                          {isNeedsReviewSub && <AlertCircle className="w-3 h-3" />}
                          {isPendingSub && <Clock className="w-3 h-3" />}
                          <span>{studentSub?.status || 'Pending'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[#C2410C] dark:text-amber-400 font-semibold hover:underline flex items-center justify-end gap-1 font-sans">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Individual Student Submission Detail Modal */}
      <AnimatePresence>
        {inspectStudentSubmission && (
          <StudentSubmissionDetailModal
            student={inspectStudentSubmission.student}
            request={inspectStudentSubmission.request}
            submission={inspectStudentSubmission.submission}
            onClose={() => setInspectStudentSubmission(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
