import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Mail,
  Phone,
  X,
  FileCheck2,
  Building2,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { Institution, StudentRequestSubmission, UserAccount } from '../types/portal';
import {
  AssignmentMutationResult,
  ConflictResolutionStrategy,
  OrganisationalAssignmentPatch,
  canManagePersonnel,
  getEffectiveAssociationStatus,
  getEffectiveAssignmentStatus,
} from '../lib/domain';
import { SEED_INSTITUTIONS } from '../data/seedData';
import { StatusBadge } from './StatusPrimitives';
import { PersonnelAssignmentManagerModal } from './PersonnelAssignmentManagerModal';

interface StudentDirectorySectionProps {
  currentTeacher: UserAccount;
  allUsers: UserAccount[];
  submissions?: StudentRequestSubmission[];
  institutions?: Institution[];
  onOpenSubmissionDetail?: (student: UserAccount) => void;
  onApplyAssignment?: (
    targetUserId: string,
    patch: OrganisationalAssignmentPatch,
    conflictResolution?: Exclude<ConflictResolutionStrategy, 'cancel'>
  ) => AssignmentMutationResult;
  onRemoveFromAssignment?: (
    targetUserId: string,
    reason?: string
  ) => AssignmentMutationResult;
  onRemoveInstitutionalAssociation?: (
    targetUserId: string,
    reason?: string
  ) => AssignmentMutationResult;
}

interface StudentProfileModalProps {
  student: UserAccount;
  teacher: UserAccount;
  assignedMentorName: string;
  submissions: StudentRequestSubmission[];
  canManage: boolean;
  onManageAssignment?: () => void;
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  assignedMentorName,
  submissions,
  canManage,
  onManageAssignment,
  onClose,
}) => {
  const initials = student.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  const studentSubmissions = submissions.filter((s) => s.studentId === student.id);
  const effectiveAssignment = getEffectiveAssignmentStatus(student);
  const effectiveAssociation = getEffectiveAssociationStatus(student);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Student Profile: ${student.fullName}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-floating rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-[#046A38]/40"
      >
        {/* Tricolour Top Accent */}
        <div className="h-1.5 w-full tricolour-bar shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#046A38]/25 flex items-start justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900">
          <div className="flex items-center gap-3 min-w-0">
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.fullName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#046A38] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C2410C] to-[#9A3412] text-white font-display font-bold text-base flex items-center justify-center shrink-0 shadow-xs border-2 border-[#046A38]/50">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white truncate">
                  {student.fullName}
                </h3>
                <StatusBadge status={effectiveAssignment} size="sm" />
              </div>
              <p className="text-xs text-[#046A38] dark:text-emerald-400 font-semibold font-mono-tabular truncate">
                Roll No: {student.rollNumber || 'VESIT23CE018'}
              </p>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                {student.course || `B.Tech (${student.academicDepartment || 'CMPN'})`} ·{' '}
                {student.academicYear || 'Unassigned Year'}{' '}
                {student.division ? `Div ${student.division}` : '· Unassigned Div'}
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
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-stone-50/50 dark:bg-stone-950/40 text-stone-900 dark:text-stone-100 text-xs">
          {/* Academic Placement & Class Teacher */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#046A38]/25 space-y-2">
            <div className="flex items-center justify-between font-bold text-[#046A38] dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Class &amp; Mentor Assignment</span>
              </span>
              <div className="flex items-center gap-1.5">
                {effectiveAssociation !== 'Active' && (
                  <StatusBadge status={effectiveAssociation} size="sm" />
                )}
                <span className="px-2 py-0.5 rounded-md bg-[#046A38]/10 text-[#046A38] dark:text-emerald-300 font-mono-tabular text-[10px]">
                  {student.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono-tabular text-stone-700 dark:text-stone-300">
              <div>
                <span className="text-stone-500 block text-[10px]">Institution</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {student.institutionName || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Department</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {student.academicDepartment || student.department || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Class Teacher / Mentor</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {assignedMentorName}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Year &amp; Division</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {student.academicYear || 'Unassigned'} ·{' '}
                  {student.division ? `Div ${student.division}` : 'No Division'}
                </span>
              </div>
            </div>
            {student.assignmentNote && (
              <div className="pt-1.5 mt-1 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
                <strong>Latest Assignment Note:</strong> {student.assignmentNote}
              </div>
            )}
          </div>

          {/* Active Application / Document Request Submissions */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-2">
            <div className="flex items-center justify-between font-bold text-[#C2410C] dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Document Submissions &amp; Verification</span>
              </span>
            </div>

            {studentSubmissions.length === 0 ? (
              <p className="text-stone-600 dark:text-stone-400 text-xs italic py-1">
                No active document requests submitted yet for this student.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {studentSubmissions.map((sub) => {
                  const isVerified = sub.status === 'Approved' || sub.status === 'Verified in demo';
                  const isPending = sub.status === 'Pending';
                  const isNeedsReview =
                    sub.status === 'Needs Review' || sub.status === 'Needs review in demo';

                  return (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-stone-900 dark:text-white">
                          Car Racing Event: Document Submission
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-tabular inline-flex items-center gap-1 ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isNeedsReview
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                          }`}
                        >
                          {isVerified && <CheckCircle2 className="w-3 h-3" />}
                          {isNeedsReview && <AlertCircle className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          <span>
                            {isVerified ? 'Verified' : isNeedsReview ? 'Needs Review' : sub.status}
                          </span>
                        </span>
                      </div>

                      {sub.verificationFeedback && (
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-snug">
                          {sub.verificationFeedback}
                        </p>
                      )}

                      {sub.documents.length > 0 && (
                        <div className="pt-1 border-t border-stone-200 dark:border-stone-800 text-[11px] space-y-1 text-stone-700 dark:text-stone-300">
                          {sub.documents.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <span className="truncate">
                                📄 {doc.requirementName}: {doc.fileName}
                              </span>
                              <span className="font-mono-tabular text-stone-500 text-[10px] shrink-0">
                                {doc.fileSize}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Student Contact Info */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#046A38]/25 space-y-1.5 font-mono-tabular">
            <span className="font-bold text-stone-800 dark:text-stone-200 block mb-1">
              Student Contact &amp; Registry
            </span>
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Mail className="w-3.5 h-3.5 text-[#C2410C] shrink-0" />
              <span className="truncate">{student.email}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
              <Phone className="w-3.5 h-3.5 text-[#046A38] shrink-0" />
              <span>{student.phone}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#046A38]/20 flex items-center justify-between gap-2">
          {canManage && onManageAssignment ? (
            <button
              type="button"
              data-testid="modal-btn-manage-student-assignment"
              onClick={onManageAssignment}
              className="btn-secondary !py-1.5 !px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#046A38]" />
              <span>Manage Class / Division Assignment</span>
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-primary !py-1.5 !px-4 text-xs"
          >
            Close Profile
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const StudentDirectorySection: React.FC<StudentDirectorySectionProps> = ({
  currentTeacher,
  allUsers,
  submissions = [],
  institutions = SEED_INSTITUTIONS,
  onApplyAssignment,
  onRemoveFromAssignment,
  onRemoveInstitutionalAssociation,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [managingStudentId, setManagingStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Scoped to the currently authenticated teacher, Institutional Manager, or Admin
  const assignedStudents = allUsers.filter((u) => {
    if (u.role !== 'student') return false;
    if (getEffectiveAssociationStatus(u) === 'Removed') return false;
    if (currentTeacher.role === 'admin') return true;
    if (currentTeacher.role === 'institutional_rep') {
      return u.institutionId === currentTeacher.institutionId;
    }
    if (u.assignedTeacherUserId === currentTeacher.id) return true;
    if (
      currentTeacher.role === 'faculty' &&
      currentTeacher.institutionId === u.institutionId &&
      currentTeacher.academicDepartment === u.academicDepartment &&
      (!currentTeacher.classTeacherDivision ||
        currentTeacher.classTeacherDivision === u.division ||
        getEffectiveAssignmentStatus(u) === 'Reassignment Required')
    ) {
      return true;
    }
    return false;
  });

  const filteredStudents = assignedStudents.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
      (s.course && s.course.toLowerCase().includes(q)) ||
      (s.academicDepartment && s.academicDepartment.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q)
    );
  });

  // Maximum 4 profiles displayed initially; when searching or when showAll is active, show all matching profiles
  const displayedStudents =
    !showAll && !searchQuery.trim()
      ? filteredStudents.slice(0, 4)
      : filteredStudents;

  const getStudentStatusBadge = (studentId: string) => {
    const studentSub = submissions.find((s) => s.studentId === studentId);
    if (!studentSub || studentSub.status === 'Pending') {
      return {
        label: 'Documents: Pending',
        bg: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
        icon: <Clock className="w-3 h-3 text-stone-500" />,
      };
    }
    if (studentSub.status === 'Approved' || studentSub.status === 'Verified in demo') {
      return {
        label: 'Documents: Verified',
        bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
      };
    }
    if (studentSub.status === 'Needs Review' || studentSub.status === 'Needs review in demo') {
      return {
        label: 'Documents: Needs Review',
        bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        icon: <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
      };
    }
    return {
      label: studentSub.status,
      bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
      icon: <FileCheck2 className="w-3 h-3 text-blue-600" />,
    };
  };

  const resolveMentorName = (student: UserAccount): string => {
    if (student.assignedTeacherUserId) {
      const mentor = allUsers.find((u) => u.id === student.assignedTeacherUserId);
      if (mentor) return mentor.fullName;
    }
    const matchingCt = allUsers.find(
      (u) =>
        u.role === 'faculty' &&
        u.institutionId === student.institutionId &&
        u.academicDepartment === student.academicDepartment &&
        u.academicYear === student.academicYear &&
        u.classTeacherDivision === student.division &&
        getEffectiveAssignmentStatus(u) === 'Assigned'
    );
    if (matchingCt) return matchingCt.fullName;
    return 'Unassigned / Pending Class Teacher';
  };

  const selectedStudent = allUsers.find((u) => u.id === selectedStudentId) || null;
  const managingStudent = allUsers.find((u) => u.id === managingStudentId) || null;

  return (
    <section aria-label="Faculty Assigned Students Directory" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#046A38] dark:text-emerald-400">
            <GraduationCap className="w-4 h-4 text-[#C2410C]" />
            <span>
              {currentTeacher.role === 'institutional_rep'
                ? 'Institutional Student & Academic Division Directory'
                : 'Assigned Students & Mentee Directory'}
            </span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            {currentTeacher.role === 'institutional_rep'
              ? `Students enrolled at ${currentTeacher.institutionName} (${assignedStudents.length} active). Inspect profiles or manage student academic year and division placements.`
              : `Students in scope for ${currentTeacher.fullName} (${assignedStudents.length} students in ${currentTeacher.academicDepartment || 'CMPN'}). Click any student to inspect records or manage division placement.`}
          </p>
        </div>

        {/* Quick Search & See All Control aligned on same row */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or roll..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#046A38]/35 bg-white/70 dark:bg-stone-900/70 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#046A38]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            aria-label={showAll ? 'Show less profiles' : 'See all profiles'}
            className="px-3.5 py-1.5 rounded-xl border border-[#046A38]/45 bg-[#FCF9F2] dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-white hover:bg-[#046A38] hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
          >
            {showAll ? 'Show Less' : 'See All'}
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div
          role="status"
          data-testid="student-directory-feedback"
          className="p-3 rounded-xl bg-emerald-500/10 border border-[#046A38]/40 text-xs text-stone-900 dark:text-emerald-200 flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0" />
            <span>{actionFeedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-[11px] font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {displayedStudents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl liquid-glass border border-dashed border-[#046A38]/40 text-stone-600 dark:text-stone-400 text-xs">
          No students currently assigned to this scope or matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {displayedStudents.map((student) => {
            const initials = student.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0])
              .join('')
              .toUpperCase();

            const status = getStudentStatusBadge(student.id);
            const effectiveAssignment = getEffectiveAssignmentStatus(student);
            const canManage =
              Boolean(onApplyAssignment) &&
              canManagePersonnel(currentTeacher, student, 'edit_assignment').allowed;

            return (
              <motion.div
                key={student.id}
                whileHover={{ y: -2 }}
                data-testid={`student-card-${student.id}`}
                className="text-left p-4 rounded-2xl liquid-glass liquid-glass-interactive flex flex-col justify-between gap-3 group border border-[#046A38]/35"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedStudentId(student.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedStudentId(student.id);
                    }
                  }}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  {student.avatarUrl ? (
                    <img
                      src={student.avatarUrl}
                      alt={student.fullName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#046A38]/60 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C2410C] to-[#9A3412] text-white font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-xs border border-[#046A38]/40">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white truncate group-hover:text-[#046A38] transition-colors">
                        {student.fullName}
                      </h4>
                      <StatusBadge status={effectiveAssignment} size="sm" />
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular font-semibold truncate mt-0.5">
                      {student.rollNumber || 'VESIT23CE018'}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono-tabular truncate mt-0.5">
                      {student.academicDepartment || student.department || 'Unassigned'} ·{' '}
                      {student.academicYear || 'No Year'} ·{' '}
                      {student.division ? `Div ${student.division}` : 'No Div'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800/80 space-y-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-tabular ${status.bg}`}
                  >
                    {status.icon}
                    <span>{status.label}</span>
                  </span>
                  <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
                    {canManage ? (
                      <button
                        type="button"
                        data-testid={`btn-manage-student-${student.id}`}
                        onClick={() => setManagingStudentId(student.id)}
                        className="px-2 py-1 rounded-lg bg-[#046A38]/12 hover:bg-[#046A38] text-[#046A38] dark:text-emerald-300 hover:text-white font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      className="text-[#046A38] dark:text-emerald-400 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Inspect Profile</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Student Profile Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentProfileModal
            student={selectedStudent}
            teacher={currentTeacher}
            assignedMentorName={resolveMentorName(selectedStudent)}
            submissions={submissions}
            canManage={
              Boolean(onApplyAssignment) &&
              canManagePersonnel(currentTeacher, selectedStudent, 'edit_assignment').allowed
            }
            onManageAssignment={() => {
              const targetId = selectedStudent.id;
              setSelectedStudentId(null);
              setManagingStudentId(targetId);
            }}
            onClose={() => setSelectedStudentId(null)}
          />
        )}
      </AnimatePresence>

      {/* Personnel Assignment Manager Modal */}
      <AnimatePresence>
        {managingStudent && onApplyAssignment && onRemoveFromAssignment && onRemoveInstitutionalAssociation && (
          <PersonnelAssignmentManagerModal
            actor={currentTeacher}
            targetUser={managingStudent}
            allUsers={allUsers}
            institutions={institutions}
            onClose={() => setManagingStudentId(null)}
            onApplyAssignment={(targetUserId, patch, conflictResolution) => {
              const res = onApplyAssignment(targetUserId, patch, conflictResolution);
              if (res.success && res.auditDetails) {
                setActionFeedback(res.auditDetails);
              }
              return res;
            }}
            onRemoveFromAssignment={(targetUserId, reason) => {
              const res = onRemoveFromAssignment(targetUserId, reason);
              if (res.success && res.auditDetails) {
                setActionFeedback(res.auditDetails);
              }
              return res;
            }}
            onRemoveInstitutionalAssociation={(targetUserId, reason) => {
              const res = onRemoveInstitutionalAssociation(targetUserId, reason);
              if (res.success && res.auditDetails) {
                setActionFeedback(res.auditDetails);
              }
              return res;
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
