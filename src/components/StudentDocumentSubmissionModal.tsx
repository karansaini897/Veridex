import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Upload,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  FolderLock,
  Search,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import {
  DocumentSubmissionRequest,
  StudentRequestSubmission,
  SubmittedDocumentFile,
  UserAccount,
  VaultDocumentRecord,
} from '../types/portal';
import {
  buildSubmittedFileFromVaultDocument,
  createRecordId,
  formatTimestampForDisplay,
  getCurrentIsoTimestamp,
  getLocalTodayDate,
} from '../lib/domain';
import {
  formatFileSizeBytes,
  getVaultDocumentsForUser,
  saveVaultDocumentWithBlob,
} from '../lib/vaultStorage';
import { validateVaultFileInput } from '../lib/ocrEngine';
import { StatusBadge } from './StatusPrimitives';
import { uploadDocumentToStorage } from '../lib/documentService';

interface StudentDocumentSubmissionModalProps {
  student: UserAccount;
  request: DocumentSubmissionRequest;
  existingSubmission?: StudentRequestSubmission | null;
  onClose: () => void;
  onSubmitSuccess: (updatedSubmission: StudentRequestSubmission) => void;
}

interface LocalSelectedUpload {
  mode: 'upload';
  requirementId: string;
  requirementName: string;
  file: File;
  previewUrl: string;
  saveCopyToVault: boolean;
}

interface LocalSelectedVaultItem {
  mode: 'vault';
  requirementId: string;
  requirementName: string;
  vaultDoc: VaultDocumentRecord;
}

type RequirementSelection = LocalSelectedUpload | LocalSelectedVaultItem;

export const StudentDocumentSubmissionModal: React.FC<StudentDocumentSubmissionModalProps> = ({
  student,
  request,
  existingSubmission,
  onClose,
  onSubmitSuccess,
}) => {
  const [selections, setSelections] = useState<Record<string, RequirementSelection>>({});
  const [sourceTabByReq, setSourceTabByReq] = useState<Record<string, 'upload' | 'vault'>>({});
  const [vaultDocs, setVaultDocs] = useState<VaultDocumentRecord[]>([]);
  const [vaultSearchByReq, setVaultSearchByReq] = useState<Record<string, string>>({});
  const [isLoadingVault, setIsLoadingVault] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verifyingStage, setVerifyingStage] = useState<'idle' | 'verifying' | 'complete'>(
    existingSubmission?.status === 'Verified in demo' ||
      existingSubmission?.status === 'Approved'
      ? 'complete'
      : 'idle'
  );
  const [verificationOutcome, setVerificationOutcome] = useState<
    'Verified in demo' | 'Needs review in demo' | 'Pending Verification'
  >(
    existingSubmission?.verificationStatus === 'Needs review in demo' ||
      existingSubmission?.verificationStatus === 'Needs Review'
      ? 'Needs review in demo'
      : 'Verified in demo'
  );
  const [approvalOutcome, setApprovalOutcome] = useState<
    'Pending Approval' | 'Under Review' | 'Approved' | 'Rejected' | 'Needs Review'
  >(existingSubmission?.approvalStatus || 'Pending Approval');
  const [verificationFeedback, setVerificationFeedback] = useState<string>(
    existingSubmission?.verificationFeedback || ''
  );

  useEffect(() => {
    let mounted = true;
    setIsLoadingVault(true);
    getVaultDocumentsForUser(student.id)
      .then((records) => {
        if (mounted) {
          setVaultDocs(records);
          setIsLoadingVault(false);
        }
      })
      .catch(() => {
        if (mounted) setIsLoadingVault(false);
      });
    return () => {
      mounted = false;
    };
  }, [student.id]);

  // Revoke any temporary object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(selections).forEach((sel) => {
        if (sel.mode === 'upload' && sel.previewUrl) {
          try {
            URL.revokeObjectURL(sel.previewUrl);
          } catch {
            // ignore
          }
        }
      });
    };
  }, []);

  const handleFileChange = (
    requirementId: string,
    requirementName: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateVaultFileInput(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || `File "${file.name}" is not supported.`);
      return;
    }

    setErrorMessage(null);
    const previewUrl =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(file)
        : '';

    setSelections((prev) => {
      const existing = prev[requirementId];
      if (existing?.mode === 'upload' && existing.previewUrl) {
        try {
          URL.revokeObjectURL(existing.previewUrl);
        } catch {
          // ignore
        }
      }
      return {
        ...prev,
        [requirementId]: {
          mode: 'upload',
          requirementId,
          requirementName,
          file,
          previewUrl,
          saveCopyToVault: true,
        },
      };
    });
  };

  const handleToggleSaveToVault = (requirementId: string, checked: boolean) => {
    setSelections((prev) => {
      const cur = prev[requirementId];
      if (!cur || cur.mode !== 'upload') return prev;
      return {
        ...prev,
        [requirementId]: {
          ...cur,
          saveCopyToVault: checked,
        },
      };
    });
  };

  const handleSelectSavedVaultDoc = (
    requirementId: string,
    requirementName: string,
    vaultDoc: VaultDocumentRecord
  ) => {
    setErrorMessage(null);
    setSelections((prev) => {
      const existing = prev[requirementId];
      if (existing?.mode === 'upload' && existing.previewUrl) {
        try {
          URL.revokeObjectURL(existing.previewUrl);
        } catch {
          // ignore
        }
      }
      return {
        ...prev,
        [requirementId]: {
          mode: 'vault',
          requirementId,
          requirementName,
          vaultDoc,
        },
      };
    });
  };

  const handleRemoveSelection = (requirementId: string) => {
    setSelections((prev) => {
      const copy = { ...prev };
      const existing = copy[requirementId];
      if (existing?.mode === 'upload' && existing.previewUrl) {
        try {
          URL.revokeObjectURL(existing.previewUrl);
        } catch {
          // ignore
        }
      }
      delete copy[requirementId];
      return copy;
    });
  };

  const handleSubmit = async (simulateFlag = false) => {
    setErrorMessage(null);

    const missingDocs = request.requiredDocuments.filter((req) => {
      const hasNewlySelected = Boolean(selections[req.id]);
      const hasExisting = Boolean(
        existingSubmission?.documents?.some(
          (d) => d.requirementId === req.id || d.requirementName === req.name
        )
      );
      return !hasNewlySelected && !hasExisting;
    });

    if (missingDocs.length > 0) {
      setErrorMessage(
        `Please select all required documents before confirming submission. Missing: ${missingDocs
          .map((d) => d.name)
          .join(', ')}`
      );
      return;
    }

    setVerifyingStage('verifying');

    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const todayStr = getLocalTodayDate();

    // Persist any newly uploaded files: upload to storage bucket and optionally to IndexedDB Vault
    const savedVaultIdsByReq: Record<string, string> = {};
    const uploadedStoragePathsByReq: Record<string, string> = {};

    for (const req of request.requiredDocuments) {
      const sel = selections[req.id];
      if (sel && sel.mode === 'upload') {
        try {
          const uploadRes = await uploadDocumentToStorage(sel.file, student.id, 'submissions');
          if (uploadRes.success && uploadRes.storagePath) {
            uploadedStoragePathsByReq[req.id] = uploadRes.storagePath;
          }
        } catch (err) {
          console.warn('[VERIDEX Upload] Storage upload warning:', err);
        }

        if (sel.saveCopyToVault) {
          const valid = validateVaultFileInput(sel.file);
          const vaultId = createRecordId('VAULT');
          const newVaultRecord: VaultDocumentRecord = {
            id: vaultId,
            ownerUserId: student.id,
            ownerName: student.fullName,
            institutionId: student.institutionId,
            institutionName: student.institutionName,
            originalFileName: sel.file.name,
            mimeType: valid.normalizedMimeType || 'application/pdf',
            fileSizeBytes: sel.file.size,
            fileSizeLabel: formatFileSizeBytes(sel.file.size),
            category: 'Student Records',
            dateAdded: todayStr,
            updatedAt: nowDisplay,
            hasStoredBlob: true,
            ocrStatus: 'Not Run',
            ocrExtractedText: '',
            editableDetails: {
              title: req.name,
              certificateNumber: `SUB-${(student.rollNumber || 'STU').replace(/[^A-Za-z0-9]/g, '')}-${req.id.slice(-4).toUpperCase()}`,
              holderName: student.fullName,
              issuingAuthority: student.institutionName || 'University of Mumbai',
              issueDate: todayStr,
            },
            verificationStatus: 'Pending Verification',
            approvalStatus: 'Approval Pending',
          };
          const res = await saveVaultDocumentWithBlob(newVaultRecord, sel.file);
          if (res.ok) {
            savedVaultIdsByReq[req.id] = vaultId;
          }
        }
      }
    }

    setTimeout(() => {
      // Clean up transient preview URLs to prevent memory leaks and object URL persistence
      Object.values(selections).forEach((s) => {
        if (s.mode === 'upload' && s.previewUrl) {
          try {
            URL.revokeObjectURL(s.previewUrl);
          } catch {
            // ignore
          }
        }
      });

      setVerifyingStage('complete');

      // Section 4.2: Never automatically mark a document as Approved when a timer finishes!
      // Demo verification is represented honestly as 'Verified in demo', while approval remains 'Pending Approval'.
      const outcome: 'Verified in demo' | 'Needs review in demo' = simulateFlag
        ? 'Needs review in demo'
        : 'Verified in demo';
      const feedback = simulateFlag
        ? 'Demo verification advisory: Document scan flagged for manual inspection; awaiting reviewer approval.'
        : 'Simulated demo verification complete (Verified in demo). Submission is now Pending Approval by the reviewing faculty or institution manager.';

      setVerificationOutcome(outcome);
      setApprovalOutcome('Pending Approval');
      setVerificationFeedback(feedback);

      const finalDocFiles: SubmittedDocumentFile[] = request.requiredDocuments.map((req) => {
        const sel = selections[req.id];
        if (sel) {
          if (sel.mode === 'vault') {
            // Reuse existing saved document from Personal Document Vault without duplicating it
            return buildSubmittedFileFromVaultDocument(
              req,
              sel.vaultDoc,
              nowDisplay,
              outcome
            );
          }

          return {
            requirementId: sel.requirementId,
            requirementName: sel.requirementName,
            fileName: sel.file.name,
            fileSize: formatFileSizeBytes(sel.file.size),
            mimeType: sel.file.type || 'application/pdf',
            submittedAt: nowDisplay,
            storagePath: uploadedStoragePathsByReq[req.id],
            previewUrl: undefined,
            vaultDocumentId: savedVaultIdsByReq[req.id],
            sourceType: 'upload',
            hasStoredFileBlob: Boolean(savedVaultIdsByReq[req.id] || sel.file.size > 0),
            verificationOutcome: outcome,
            approvalStatus: 'Pending Approval',
            verificationFeedback:
              outcome === 'Verified in demo'
                ? 'Uploaded file checked in demo simulation; awaiting reviewer approval.'
                : 'Advisory check flagged for reviewer attention.',
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
            approvalStatus: existingDoc.approvalStatus || 'Pending Approval',
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
          approvalStatus: 'Pending Approval',
        };
      });

      const newSubmission: StudentRequestSubmission = {
        id: existingSubmission?.id || `SUB-${Date.now().toString(36).toUpperCase()}`,
        requestId: request.id,
        studentId: student.id,
        studentUserId: student.id,
        studentName: student.fullName,
        studentRollNumber: student.rollNumber || 'VESIT23CE018',
        studentEmail: student.email,
        status: outcome,
        submittedAt: nowDisplay,
        verificationStatus: outcome,
        approvalStatus: 'Pending Approval',
        verificationFeedback: feedback,
        documents: finalDocFiles,
      };

      onSubmitSuccess(newSubmission);
    }, 900);
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
        className="liquid-glass-floating rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/45 flex flex-col max-h-[90vh]"
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
                Official Document Submission · Upload or Reuse Saved Vault Document
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
              <span>
                Student: {student.fullName} ({student.rollNumber || 'VESIT23CE'})
              </span>
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
                Running simulated demo verification check...
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400">
                Linking document records to request {request.id}. Final approval remains with the reviewing officer.
              </p>
            </motion.div>
          )}

          {verifyingStage === 'complete' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              data-testid="submission-complete-banner"
              className="p-4 rounded-xl border-2 bg-emerald-50/90 dark:bg-emerald-950/30 border-[#046A38] text-center space-y-2.5 shadow-md"
            >
              <div className="flex justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#046A38]" />
              </div>
              <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white">
                Documents Submitted for Request ({request.id})
              </h4>

              {/* Distinct Verification vs Approval Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                <StatusBadge
                  status={verificationOutcome}
                  customLabel={`Demo Verification: ${verificationOutcome}`}
                  size="sm"
                />
                <StatusBadge
                  status={approvalOutcome}
                  customLabel={`Approval Status: ${approvalOutcome}`}
                  size="sm"
                />
              </div>

              <p className="text-xs text-stone-700 dark:text-stone-300 max-w-lg mx-auto leading-relaxed">
                {verificationFeedback}
              </p>
            </motion.div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Required Documents Checklist */}
          <div className="space-y-3">
            <span className="font-bold text-stone-800 dark:text-stone-200 block">
              Required Documents Checklist ({request.requiredDocuments.length})
            </span>

            {request.requiredDocuments.map((req, idx) => {
              const selected = selections[req.id];
              const existingDoc = existingSubmission?.documents?.find(
                (d) => d.requirementId === req.id || d.requirementName === req.name
              );
              const activeMode = sourceTabByReq[req.id] || 'upload';
              const vaultQuery = (vaultSearchByReq[req.id] || '').trim().toLowerCase();
              const matchingVaultDocs = vaultDocs.filter((vd) => {
                if (!vaultQuery) return true;
                return (
                  vd.editableDetails.title.toLowerCase().includes(vaultQuery) ||
                  vd.originalFileName.toLowerCase().includes(vaultQuery) ||
                  vd.editableDetails.certificateNumber.toLowerCase().includes(vaultQuery) ||
                  vd.category.toLowerCase().includes(vaultQuery)
                );
              });

              return (
                <div
                  key={req.id}
                  data-testid={`requirement-card-${req.id}`}
                  className="p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-3 transition-colors"
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
                        ? selected.mode === 'vault'
                          ? 'Saved Vault Doc Selected'
                          : 'New File Selected'
                        : existingDoc
                          ? 'Previously Submitted'
                          : 'Pending Selection'}
                    </span>
                  </div>

                  {/* Choice Toggle: 1. Upload New Document vs 2. Choose from My Saved Documents */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#FCF9F2] dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                    <button
                      type="button"
                      data-testid={`mode-upload-btn-${req.id}`}
                      onClick={() =>
                        setSourceTabByReq((prev) => ({ ...prev, [req.id]: 'upload' }))
                      }
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        activeMode === 'upload'
                          ? 'bg-[#C2410C] text-white shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>1. Upload New Document</span>
                    </button>

                    <button
                      type="button"
                      data-testid={`mode-vault-btn-${req.id}`}
                      onClick={() =>
                        setSourceTabByReq((prev) => ({ ...prev, [req.id]: 'vault' }))
                      }
                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        activeMode === 'vault'
                          ? 'bg-[#046A38] text-white shadow-2xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                      }`}
                    >
                      <FolderLock className="w-3.5 h-3.5" />
                      <span>2. Choose from My Saved Documents ({vaultDocs.length})</span>
                    </button>
                  </div>

                  {/* Currently Selected Summary (Either New Upload or Saved Vault Record) */}
                  {selected && (
                    <div
                      data-testid={`selected-doc-summary-${req.id}`}
                      className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-[#046A38]/40 space-y-1.5 font-mono-tabular text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {selected.mode === 'vault' ? (
                            <>
                              <span className="font-bold text-[#046A38] dark:text-emerald-300 block truncate">
                                🔒 Vault Document Selected: {selected.vaultDoc.editableDetails.title}
                              </span>
                              <span className="text-[10px] text-stone-600 dark:text-stone-400 block">
                                Vault ID: {selected.vaultDoc.id} · File: {selected.vaultDoc.originalFileName} ({selected.vaultDoc.fileSizeLabel}) · Ref #{selected.vaultDoc.editableDetails.certificateNumber}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-stone-900 dark:text-white block truncate">
                                📄 New Upload: {selected.file.name}
                              </span>
                              <span className="text-[10px] text-stone-500 block">
                                {formatFileSizeBytes(selected.file.size)} · Ready for submission
                              </span>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSelection(req.id)}
                          className="px-2 py-1 rounded bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-red-600 hover:bg-red-50 text-[11px] font-semibold cursor-pointer shrink-0"
                        >
                          Change / Clear
                        </button>
                      </div>

                      {selected.mode === 'upload' && (
                        <label className="flex items-center gap-2 text-[11px] font-sans text-stone-700 dark:text-stone-300 pt-1 border-t border-emerald-200/70 dark:border-stone-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.saveCopyToVault}
                            onChange={(e) => handleToggleSaveToVault(req.id, e.target.checked)}
                            className="rounded border-stone-300"
                          />
                          <span>
                            Also save original file in my Personal Document Vault (IndexedDB) for future requests
                          </span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* Mode 1: Upload New Document */}
                  {activeMode === 'upload' && !selected && (
                    <div className="space-y-2">
                      {existingDoc && (
                        <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-stone-950 border border-amber-300 dark:border-stone-800 flex items-center justify-between gap-3 font-mono-tabular text-xs">
                          <div className="min-w-0">
                            <span className="font-semibold text-stone-900 dark:text-white block truncate">
                              📄 {existingDoc.fileName}
                              {existingDoc.vaultDocumentId
                                ? ` (Linked Vault: ${existingDoc.vaultDocumentId})`
                                : ''}
                            </span>
                            <span className="text-[10px] text-stone-600 dark:text-stone-400">
                              {existingDoc.fileSize} · Submitted {existingDoc.submittedAt} · Demo Verification: {existingDoc.verificationOutcome || 'Pending'} · Approval: {existingDoc.approvalStatus || 'Pending Approval'}
                            </span>
                          </div>
                        </div>
                      )}

                      <label
                        htmlFor={`input-file-${req.id}`}
                        className="w-full flex flex-col items-center justify-center p-3.5 rounded-xl border-2 border-dashed border-[#C2410C]/35 hover:border-[#C2410C] bg-[#FCF9F2]/70 dark:bg-stone-950/70 hover:bg-[#EFE6D5]/50 transition-colors cursor-pointer text-center group"
                      >
                        <Upload className="w-5 h-5 text-[#C2410C] group-hover:scale-110 transition-transform mb-1" />
                        <span className="font-bold text-xs text-stone-800 dark:text-stone-200">
                          {existingDoc ? 'Upload Replacement File from Device' : 'Choose Local File to Upload'}
                        </span>
                        <span className="text-[10px] text-stone-500 mt-0.5">
                          PDF, PNG, JPG accepted (up to 15 MB)
                        </span>
                      </label>
                      <input
                        id={`input-file-${req.id}`}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/jpeg,image/png"
                        onChange={(e) => handleFileChange(req.id, req.name, e)}
                        className="hidden"
                      />
                    </div>
                  )}

                  {/* Mode 2: Choose from My Saved Documents (Personal Document Vault) */}
                  {activeMode === 'vault' && (
                    <div
                      data-testid={`vault-selector-panel-${req.id}`}
                      className="p-3 rounded-xl bg-[#FCF9F2] dark:bg-stone-950 border border-[#046A38]/35 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-[#046A38] dark:text-emerald-400 flex items-center gap-1">
                          <FolderLock className="w-3.5 h-3.5" />
                          <span>Select from Your Personal Document Vault ({vaultDocs.length})</span>
                        </span>
                        <div className="relative w-full sm:w-56">
                          <Search className="w-3 h-3 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={vaultSearchByReq[req.id] || ''}
                            onChange={(e) =>
                              setVaultSearchByReq((prev) => ({
                                ...prev,
                                [req.id]: e.target.value,
                              }))
                            }
                            placeholder="Filter saved documents..."
                            className="w-full pl-7 pr-2.5 py-1 text-[11px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                          />
                        </div>
                      </div>

                      {isLoadingVault ? (
                        <div className="p-3 text-center text-[11px] text-stone-500">
                          Loading your saved vault documents...
                        </div>
                      ) : matchingVaultDocs.length === 0 ? (
                        <div className="p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400 text-center">
                          {vaultDocs.length === 0
                            ? 'You do not have any saved documents in your Personal Document Vault yet. Switch to "1. Upload New Document" or add documents from "My documents" / Profile.'
                            : 'No saved documents match your filter.'}
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {matchingVaultDocs.map((vd) => {
                            const isChosen =
                              selected?.mode === 'vault' && selected.vaultDoc.id === vd.id;
                            return (
                              <div
                                key={vd.id}
                                data-testid={`vault-option-${req.id}-${vd.id}`}
                                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                                  isChosen
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#046A38]'
                                    : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-[#046A38]/50'
                                }`}
                              >
                                <div className="min-w-0 space-y-0.5">
                                  <div className="font-bold text-stone-900 dark:text-white truncate flex items-center gap-1.5">
                                    <span>{vd.editableDetails.title}</span>
                                    <span className="text-[10px] font-mono-tabular text-[#C2410C]">
                                      ({vd.category})
                                    </span>
                                  </div>
                                  <div className="text-[10px] font-mono-tabular text-stone-500 flex flex-wrap items-center gap-1.5">
                                    <span>{vd.originalFileName}</span>
                                    <span>·</span>
                                    <span>{vd.fileSizeLabel}</span>
                                    <span>·</span>
                                    <span>Ref #{vd.editableDetails.certificateNumber}</span>
                                    <span>·</span>
                                    <span className="inline-flex items-center gap-0.5 text-[#046A38]">
                                      <HardDrive className="w-2.5 h-2.5" />
                                      {vd.hasStoredBlob ? 'IndexedDB File' : 'Metadata'}
                                    </span>
                                    <span>·</span>
                                    <span className="inline-flex items-center gap-0.5">
                                      <Sparkles className="w-2.5 h-2.5 text-[#C2410C]" />
                                      OCR: {vd.ocrStatus}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  data-testid={`select-vault-doc-btn-${req.id}-${vd.id}`}
                                  onClick={() =>
                                    handleSelectSavedVaultDoc(req.id, req.name, vd)
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer ${
                                    isChosen
                                      ? 'bg-[#046A38] text-white'
                                      : 'bg-[#EFE6D5] dark:bg-stone-800 hover:bg-[#046A38] hover:text-white text-stone-900 dark:text-stone-200'
                                  }`}
                                >
                                  {isChosen ? 'Selected ✓' : 'Select Document'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
            <strong>Status &amp; Reuse Notice:</strong> Reusing a saved document links its Vault ID to this request ({request.id}) without duplicating your vault record. Each request maintains its own independent submission and reviewer approval status.
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
                data-testid="confirm-submit-documents-btn"
                onClick={() => void handleSubmit(false)}
                className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm &amp; Submit Documents</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
