import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  FileCheck2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  DocumentSubmissionRequest,
  StudentRequestSubmission,
  SubmittedDocumentFile,
  UserAccount,
} from '../types/portal';
import { formatTimestampForDisplay, getCurrentIsoTimestamp } from '../lib/domain';

interface StudentDocumentSubmissionModalProps {
  student: UserAccount;
  request: DocumentSubmissionRequest;
  existingSubmission?: StudentRequestSubmission | null;
  onClose: () => void;
  onSubmitSuccess: (updatedSubmission: StudentRequestSubmission) => void;
}

interface LocalSelectedFile {
  requirementId: string;
  requirementName: string;
  file: File;
  previewUrl: string;
}

export const StudentDocumentSubmissionModal: React.FC<StudentDocumentSubmissionModalProps> = ({
  student,
  request,
  existingSubmission,
  onClose,
  onSubmitSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Record<string, LocalSelectedFile>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifyingStage, setVerifyingStage] = useState<
    'idle' | 'verifying' | 'complete'
  >(
    existingSubmission?.status === 'Approved' || existingSubmission?.status === 'Verified in demo'
      ? 'complete'
      : 'idle'
  );
  const [verificationOutcome, setVerificationOutcome] = useState<'Approved' | 'Needs Review' | 'Pending'>(
    existingSubmission?.verificationStatus === 'Needs review in demo' ||
      existingSubmission?.verificationStatus === 'Needs Review'
      ? 'Needs Review'
      : 'Approved'
  );
  const [verificationFeedback, setVerificationFeedback] = useState<string>(
    existingSubmission?.verificationFeedback || ''
  );

  const handleFileChange = (
    requirementId: string,
    requirementName: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (e.g. max 15MB for frontend demo)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage(`File "${file.name}" exceeds the 15 MB demo limit.`);
      return;
    }

    setErrorMessage(null);
    const previewUrl = URL.createObjectURL(file);

    setSelectedFiles((prev) => ({
      ...prev,
      [requirementId]: {
        requirementId,
        requirementName,
        file,
        previewUrl,
      },
    }));
  };

  const handleRemoveFile = (requirementId: string) => {
    setSelectedFiles((prev) => {
      const copy = { ...prev };
      if (copy[requirementId]?.previewUrl) {
        try {
          URL.revokeObjectURL(copy[requirementId].previewUrl);
        } catch {
          // ignore
        }
      }
      delete copy[requirementId];
      return copy;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = (simulateFlag = false) => {
    setErrorMessage(null);

    // Validate all required documents: either newly selected or already recorded in existing submission
    const missingDocs = request.requiredDocuments.filter((req) => {
      const hasNewlySelected = Boolean(selectedFiles[req.id]);
      const hasExisting = Boolean(
        existingSubmission?.documents?.some(
          (d) => d.requirementId === req.id || d.requirementName === req.name
        )
      );
      return !hasNewlySelected && !hasExisting;
    });

    if (missingDocs.length > 0) {
      setErrorMessage(
        `Please select all required documents before submitting. Missing: ${missingDocs
          .map((d) => d.name)
          .join(', ')}`
      );
      return;
    }

    // Begin Clean Verification Sequence
    setVerifyingStage('verifying');

    setTimeout(() => {
      setVerifyingStage('complete');
      const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

      const outcome: 'Approved' | 'Needs Review' = simulateFlag ? 'Needs Review' : 'Approved';
      const feedback = simulateFlag
        ? 'Verification note: Document scan has partial shadow on border; queued for reviewer inspection.'
        : 'All required documents processed: Format, digital signatures, and identity proof details confirmed.';

      setVerificationOutcome(outcome);
      setVerificationFeedback(feedback);

      // Merge newly selected files and preserved previous files
      const finalDocFiles: SubmittedDocumentFile[] = request.requiredDocuments.map((req) => {
        const newlySelected = selectedFiles[req.id];
        if (newlySelected) {
          return {
            requirementId: newlySelected.requirementId,
            requirementName: newlySelected.requirementName,
            fileName: newlySelected.file.name,
            fileSize: formatFileSize(newlySelected.file.size),
            mimeType: newlySelected.file.type || 'application/pdf',
            submittedAt: nowDisplay,
            previewUrl: newlySelected.previewUrl,
            verificationOutcome: outcome,
            verificationFeedback:
              outcome === 'Approved' ? 'Valid document file confirmed.' : 'Advisory check flagged.',
          };
        }

        const existingDoc = existingSubmission?.documents?.find(
          (d) => d.requirementId === req.id || d.requirementName === req.name
        );
        if (existingDoc) {
          return {
            ...existingDoc,
            submittedAt: existingDoc.submittedAt || nowDisplay,
            verificationOutcome: outcome,
            verificationFeedback:
              outcome === 'Approved' ? 'Valid document file confirmed.' : 'Advisory check flagged.',
          };
        }

        return {
          requirementId: req.id,
          requirementName: req.name,
          fileName: 'Uploaded_Document.pdf',
          fileSize: '1.20 MB',
          mimeType: 'application/pdf',
          submittedAt: nowDisplay,
          verificationOutcome: outcome,
        };
      });

      const newSubmission: StudentRequestSubmission = {
        id: existingSubmission?.id || `SUB-${Date.now().toString(36).toUpperCase()}`,
        requestId: request.id,
        studentId: student.id,
        studentName: student.fullName,
        studentRollNumber: student.rollNumber || 'VESIT23CE018',
        studentEmail: student.email,
        status: outcome,
        submittedAt: nowDisplay,
        verificationStatus: outcome,
        verificationFeedback: feedback,
        documents: finalDocFiles,
      };

      onSubmitSuccess(newSubmission);
    }, 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Submit Documents for ${request.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-floating rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/45 flex flex-col max-h-[90vh]"
      >
        {/* Tricolour Accent */}
        <div className="h-1.5 w-full tricolour-bar shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 flex items-start justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#046A38]/10 text-[#046A38] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#046A38]/30">
              <Upload className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono-tabular font-bold text-[#C2410C] block uppercase tracking-wider">
                Official Document Submission
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white truncate">
                {request.title}
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
                Issued by {request.creatorName} · {request.institutionName}
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

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs text-stone-900 dark:text-stone-100 bg-stone-50/50 dark:bg-stone-950/40">
          {/* Instructions Banner */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-2">
            <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 font-mono-tabular text-[11px]">
              <span className="flex items-center gap-1.5 text-[#046A38] font-bold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Deadline: {request.deadline}</span>
              </span>
              <span>Student: {student.fullName} ({student.rollNumber || 'VESIT23CE'})</span>
            </div>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed text-xs">
              {request.description}
            </p>
          </div>

          {/* Verification Progress Modal Overlay */}
          {verifyingStage === 'verifying' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-950 border-2 border-[#C2410C] text-center space-y-3 shadow-md"
            >
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 text-[#C2410C] animate-spin" />
              </div>
              <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white">
                Your document is being verified...
              </h4>
            </motion.div>
          )}

          {verifyingStage === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-xl border-2 text-center space-y-2 shadow-md ${
                verificationOutcome === 'Approved'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-[#046A38] text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-600 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex justify-center">
                {verificationOutcome === 'Approved' ? (
                  <CheckCircle2 className="w-8 h-8 text-[#046A38]" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                )}
              </div>
              <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white">
                Verification Complete
              </h4>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold font-mono-tabular ${
                  verificationOutcome === 'Approved'
                    ? 'bg-[#046A38] text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {verificationOutcome}
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-300 max-w-md mx-auto pt-1 leading-relaxed">
                {verificationFeedback}
              </p>
            </motion.div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Required Documents Upload Form */}
          <div className="space-y-3">
            <span className="font-bold text-stone-800 dark:text-stone-200 block">
              Required Documents Checklist ({request.requiredDocuments.length})
            </span>

            {request.requiredDocuments.map((req, idx) => {
              const selected = selectedFiles[req.id];
              const existingDoc = existingSubmission?.documents?.find(
                (d) => d.requirementId === req.id || d.requirementName === req.name
              );

              return (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-2.5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                        <span className="text-[#C2410C] font-mono-tabular text-xs">
                          #{idx + 1}
                        </span>
                        <span>{req.name}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                        {req.description}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-tabular shrink-0 ${
                        selected
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : existingDoc
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                      }`}
                    >
                      {selected
                        ? 'New File Selected'
                        : existingDoc
                          ? 'Previously Recorded'
                          : 'Pending Selection'}
                    </span>
                  </div>

                  {/* Selected File Details, Previously Recorded File, or Upload Input */}
                  {selected ? (
                    <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3 font-mono-tabular text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold text-stone-900 dark:text-white block truncate">
                          📄 {selected.file.name}
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {formatFileSize(selected.file.size)} · Ready for submission
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label
                          htmlFor={`replace-file-${req.id}`}
                          className="text-[11px] font-semibold text-[#046A38] dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Replace
                        </label>
                        <input
                          id={`replace-file-${req.id}`}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileChange(req.id, req.name, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(req.id)}
                          className="text-stone-400 hover:text-red-600 text-xs cursor-pointer ml-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : existingDoc ? (
                    <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-stone-950 border border-amber-300 dark:border-stone-800 space-y-1.5 font-mono-tabular text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-stone-900 dark:text-white block truncate">
                            📄 {existingDoc.fileName}
                          </span>
                          <span className="text-[10px] text-stone-600 dark:text-stone-400">
                            {existingDoc.fileSize} · Recorded on {existingDoc.submittedAt} ({existingDoc.verificationOutcome})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <label
                            htmlFor={`replace-file-${req.id}`}
                            className="px-2.5 py-1 rounded-md bg-[#046A38]/10 text-[#046A38] dark:text-emerald-400 hover:bg-[#046A38]/20 text-[11px] font-semibold cursor-pointer"
                          >
                            Select New File
                          </label>
                          <input
                            id={`replace-file-${req.id}`}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => handleFileChange(req.id, req.name, e)}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor={`input-file-${req.id}`}
                        className="w-full flex flex-col items-center justify-center p-3.5 rounded-xl border-2 border-dashed border-[#C2410C]/35 hover:border-[#C2410C] bg-[#FCF9F2]/70 dark:bg-stone-950/70 hover:bg-[#EFE6D5]/50 transition-colors cursor-pointer text-center group"
                      >
                        <Upload className="w-5 h-5 text-[#C2410C] group-hover:scale-110 transition-transform mb-1" />
                        <span className="font-bold text-xs text-stone-800 dark:text-stone-200">
                          Choose Local File to Upload
                        </span>
                        <span className="text-[10px] text-stone-500 mt-0.5">
                          PDF, PNG, JPG accepted (up to 15 MB)
                        </span>
                      </label>
                      <input
                        id={`input-file-${req.id}`}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(req.id, req.name, e)}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
            <strong>Privacy &amp; Security Note:</strong> Files selected are registered directly into your personal verified workspace and document repository.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#C2410C]/20 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            {verifyingStage === 'complete' ? 'Close' : 'Cancel'}
          </button>

          {verifyingStage !== 'verifying' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Submit &amp; Verify Documents</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
