import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  FilePlus,
  Plus,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  DocumentRequirement,
  DocumentSubmissionRequest,
  UserAccount,
} from '../types/portal';
import { getLocalTodayDate, offsetDateFromToday } from '../lib/domain';

interface DocumentRequestCreationModalProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onClose: () => void;
  onCreateRequest: (newRequest: DocumentSubmissionRequest) => void;
}

export const DocumentRequestCreationModal: React.FC<DocumentRequestCreationModalProps> = ({
  currentUser,
  allUsers,
  onClose,
  onCreateRequest,
}) => {
  const todayStr = getLocalTodayDate();
  const defaultDeadline = offsetDateFromToday(7);

  // Filter available students based on current role
  const eligibleStudents = allUsers.filter((u) => {
    if (u.role !== 'student') return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'institutional_rep') {
      return u.institutionId === currentUser.institutionId;
    }
    if (currentUser.role === 'faculty') {
      return (
        u.assignedTeacherUserId === currentUser.id ||
        (u.institutionId === currentUser.institutionId &&
          u.academicDepartment === currentUser.academicDepartment)
      );
    }
    return false;
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recipientGroupLabel, setRecipientGroupLabel] = useState('Selected Students');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    eligibleStudents.map((s) => s.id)
  );
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [requiredDocs, setRequiredDocs] = useState<DocumentRequirement[]>([
    {
      id: `REQ-DOC-${Date.now()}-1`,
      name: 'Signed Parental Consent Letter',
      description: 'Original letter signed by parent or legal guardian authorizing participation.',
      allowedFormats: ['PDF', 'JPEG', 'PNG'],
    },
    {
      id: `REQ-DOC-${Date.now()}-2`,
      name: 'Copy of Driving Licence',
      description: 'Clear copy of valid RTO Driving Licence or DigiLocker digital copy.',
      allowedFormats: ['PDF', 'JPEG', 'PNG'],
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  const handleApplyCarRacingTemplate = () => {
    setTitle('Student Car Racing Event: Document Submission');
    setDescription(
      'Mandatory institutional compliance, safety, and liability clearance for students participating in the Annual Inter-Collegiate Formula Student Karting & Car Racing Championship.'
    );
    setRecipientGroupLabel('VESIT Formula Racing Contingent (CMPN & Auto Club)');
    // Select all eligible students
    setSelectedStudentIds(eligibleStudents.map((s) => s.id));
    setRequiredDocs([
      {
        id: `REQ-DOC-CONSENT-${Date.now()}`,
        name: 'Signed Parental Consent Letter',
        description:
          'Original letter signed by parent or legal guardian authorizing student participation in track practice and competitive racing heats.',
        allowedFormats: ['PDF', 'JPEG', 'PNG'],
      },
      {
        id: `REQ-DOC-LICENSE-${Date.now()}`,
        name: 'Copy of Driving Licence',
        description:
          'Clear front-and-back scan of valid RTO Driving Licence with category LMTR/MCWG.',
        allowedFormats: ['PDF', 'JPEG', 'PNG'],
      },
    ]);
    setError(null);
  };

  const handleAddRequirement = () => {
    setRequiredDocs((prev) => [
      ...prev,
      {
        id: `REQ-DOC-${Date.now()}`,
        name: '',
        description: '',
        allowedFormats: ['PDF', 'JPEG', 'PNG'],
      },
    ]);
  };

  const handleRemoveRequirement = (id: string) => {
    if (requiredDocs.length <= 1) {
      setError('At least one required document must be specified.');
      return;
    }
    setRequiredDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleUpdateRequirement = (
    id: string,
    field: 'name' | 'description',
    val: string
  ) => {
    setRequiredDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: val } : d))
    );
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(eligibleStudents.map((s) => s.id));
  };

  const clearAllStudents = () => {
    setSelectedStudentIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a request title.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description or purpose for the request.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student recipient.');
      return;
    }
    const emptyDocs = requiredDocs.some((d) => !d.name.trim());
    if (emptyDocs) {
      setError('All required documents must have a title.');
      return;
    }

    const newRequest: DocumentSubmissionRequest = {
      id: `REQ-${Date.now().toString(36).toUpperCase()}`,
      title: title.trim(),
      description: description.trim(),
      creatorUserId: currentUser.id,
      creatorName: currentUser.fullName,
      creatorRole: currentUser.role,
      institutionId: currentUser.institutionId,
      institutionName: currentUser.institutionName || 'VESIT',
      department: currentUser.academicDepartment || currentUser.department || 'CMPN',
      recipientGroupLabel: recipientGroupLabel.trim() || 'Selected Students',
      recipientStudentIds: selectedStudentIds,
      requiredDocuments: requiredDocs,
      deadline,
      createdAt: todayStr,
      status: 'Active',
    };

    onCreateRequest(newRequest);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create Document Submission Request"
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
        {/* Tricolour Header Accent */}
        <div className="h-1.5 w-full tricolour-bar shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 flex items-center justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C2410C]/10 text-[#C2410C] flex items-center justify-center shrink-0 border border-[#C2410C]/40">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white leading-tight">
                Create Document Submission Request
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Issue a document request to selected students with automated notification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-[#EFE6D5] dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-stone-900 dark:text-stone-100">
          {/* Preset Scenario Quick-Fill */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-stone-900 dark:to-stone-950 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C2410C] shrink-0" />
              <div>
                <span className="font-bold text-stone-900 dark:text-white block">
                  Demo Scenario: Student Car Racing Event
                </span>
                <span className="text-[11px] text-stone-600 dark:text-stone-400">
                  Pre-fills parental consent letter and driving licence requirements
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleApplyCarRacingTemplate}
              className="px-3 py-1.5 rounded-lg bg-[#C2410C] text-white font-semibold text-xs hover:bg-[#9A3412] transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Load Car Racing Template
            </button>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                Request Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Student Car Racing Event: Document Submission"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#C2410C]/40 bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#046A38]"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                Description / Purpose *
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the background, reason for submission, and safety or regulatory guidelines..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#C2410C]/40 bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#046A38]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Recipient Group Label
                </label>
                <input
                  type="text"
                  value={recipientGroupLabel}
                  onChange={(e) => setRecipientGroupLabel(e.target.value)}
                  placeholder="e.g. Second Year CMPN Racing Contingent"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#C2410C]/40 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#046A38]"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#046A38]" />
                  <span>Submission Deadline *</span>
                </label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#C2410C]/40 bg-white dark:bg-stone-900 text-stone-900 dark:text-white font-mono-tabular focus:outline-none focus:ring-1 focus:ring-[#046A38]"
                />
              </div>
            </div>
          </div>

          {/* Recipient Selection */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#046A38]" />
                <span>Select Student Recipients ({selectedStudentIds.length} of {eligibleStudents.length} selected)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllStudents}
                  className="text-[11px] font-semibold text-[#046A38] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={clearAllStudents}
                  className="text-[11px] font-semibold text-[#C2410C] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto">
              {eligibleStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <label
                    key={student.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[#046A38] bg-[#046A38]/10 text-stone-900 dark:text-white font-semibold'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900 text-stone-700 dark:text-stone-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="rounded text-[#046A38] focus:ring-[#046A38]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{student.fullName}</div>
                      <div className="text-[10px] text-stone-500 font-mono-tabular truncate">
                        {student.rollNumber || 'VESIT23CE'} · {student.academicDepartment || 'CMPN'} Div {student.division || 'A'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Required Documents List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 dark:text-stone-200">
                Required Documents Checklist ({requiredDocs.length})
              </label>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="flex items-center gap-1 text-[11px] font-bold text-[#046A38] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Document Requirement</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {requiredDocs.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular font-bold text-[11px] text-[#C2410C]">
                      Document #{idx + 1}
                    </span>
                    {requiredDocs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(doc.id)}
                        className="text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Remove requirement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={doc.name}
                    onChange={(e) => handleUpdateRequirement(doc.id, 'name', e.target.value)}
                    placeholder="Document Name (e.g. Signed Parental Consent Letter)"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#046A38]"
                  />
                  <input
                    type="text"
                    value={doc.description}
                    onChange={(e) => handleUpdateRequirement(doc.id, 'description', e.target.value)}
                    placeholder="Instructions for student (e.g. Must be signed by parent with contact number)"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#046A38]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#C2410C]/20 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-stone-500 font-mono-tabular">
              Publishing will notify {selectedStudentIds.length} student(s) in their inbox.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Request</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
