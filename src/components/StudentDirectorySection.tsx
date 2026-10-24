import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Mail,
  Phone,
  User,
  X,
  FileCheck2,
  Calendar,
  Building2,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { StudentRequestSubmission, UserAccount } from '../types/portal';

interface StudentDirectorySectionProps {
  currentTeacher: UserAccount;
  allUsers: UserAccount[];
  submissions?: StudentRequestSubmission[];
  onOpenSubmissionDetail?: (student: UserAccount) => void;
}

interface StudentProfileModalProps {
  student: UserAccount;
  teacher: UserAccount;
  submissions: StudentRequestSubmission[];
  onClose: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  teacher,
  submissions,
  onClose,
}) => {
  const initials = student.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  const studentSubmissions = submissions.filter((s) => s.studentId === student.id);

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
              <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white truncate">
                {student.fullName}
              </h3>
              <p className="text-xs text-[#046A38] dark:text-emerald-400 font-semibold font-mono-tabular truncate">
                Roll No: {student.rollNumber || 'VESIT23CE018'}
              </p>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                {student.course || 'B.Tech — CMPN'} · {student.academicYear || 'Second Year'} Div {student.division || 'A'}
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
              <span className="px-2 py-0.5 rounded-md bg-[#046A38]/10 text-[#046A38] dark:text-emerald-300 font-mono-tabular text-[10px]">
                {student.status}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono-tabular text-stone-700 dark:text-stone-300">
              <div>
                <span className="text-stone-500 block text-[10px]">Institution</span>
                <span className="font-semibold text-stone-900 dark:text-white">{student.institutionName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Department</span>
                <span className="font-semibold text-stone-900 dark:text-white">{student.academicDepartment || student.department || 'CMPN'}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Class Teacher / Mentor</span>
                <span className="font-semibold text-stone-900 dark:text-white">{teacher.fullName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Year &amp; Division</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {student.academicYear || 'Second Year'} · Div {student.division || 'A'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Application / Document Request Submissions */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-2">
            <div className="flex items-center justify-between font-bold text-[#C2410C] dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Document Submissions &amp; Verification</span>
              </span>
              <span className="text-[10px] text-stone-500 font-normal">Demo Environment</span>
            </div>

            {studentSubmissions.length === 0 ? (
              <p className="text-stone-600 dark:text-stone-400 text-xs italic py-1">
                No active document requests submitted yet for this student.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {studentSubmissions.map((sub) => {
                  const isVerified = sub.status === 'Verified in demo';
                  const isPending = sub.status === 'Pending';
                  const isNeedsReview = sub.status === 'Needs review in demo';

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
                          <span>{sub.status}</span>
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
                              <span className="truncate">📄 {doc.requirementName}: {doc.fileName}</span>
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
        <div className="p-3 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#046A38]/20 flex justify-end">
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
}) => {
  const [selectedStudent, setSelectedStudent] = useState<UserAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Scoped to the currently selected demo teacher
  // Matches assignedTeacherUserId === currentTeacher.id, OR matching department and class if teacher is class teacher
  const assignedStudents = allUsers.filter((u) => {
    if (u.role !== 'student') return false;
    if (u.assignedTeacherUserId === currentTeacher.id) return true;
    if (
      currentTeacher.role === 'faculty' &&
      currentTeacher.institutionId === u.institutionId &&
      currentTeacher.academicDepartment === u.academicDepartment &&
      currentTeacher.classTeacherDivision === u.division
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
      s.email.toLowerCase().includes(q)
    );
  });

  const getStudentStatusBadge = (studentId: string) => {
    const studentSub = submissions.find((s) => s.studentId === studentId);
    if (!studentSub || studentSub.status === 'Pending') {
      return {
        label: 'Car Racing: Pending',
        bg: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
        icon: <Clock className="w-3 h-3 text-stone-500" />,
      };
    }
    if (studentSub.status === 'Verified in demo') {
      return {
        label: 'Car Racing: Verified',
        bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
      };
    }
    if (studentSub.status === 'Needs review in demo') {
      return {
        label: 'Car Racing: Needs Review',
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

  return (
    <section aria-label="Faculty Assigned Students Directory" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#046A38] dark:text-emerald-400">
            <GraduationCap className="w-4 h-4 text-[#C2410C]" />
            <span>Assigned Students &amp; Mentee Directory</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Students assigned to {currentTeacher.fullName} ({assignedStudents.length} mentees in {currentTeacher.academicDepartment || 'CMPN'}). Click any student to view their profile and document statuses.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name or roll..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#046A38]/35 bg-white/70 dark:bg-stone-900/70 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#046A38]"
          />
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl liquid-glass border border-dashed border-[#046A38]/40 text-stone-600 dark:text-stone-400 text-xs">
          No students currently assigned to this teacher or matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredStudents.map((student) => {
            const initials = student.fullName
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0])
              .join('')
              .toUpperCase();

            const status = getStudentStatusBadge(student.id);

            return (
              <motion.button
                key={student.id}
                type="button"
                whileHover={{ y: -2 }}
                onClick={() => setSelectedStudent(student)}
                className="text-left p-4 rounded-2xl liquid-glass liquid-glass-interactive cursor-pointer flex flex-col justify-between gap-3 group border border-[#046A38]/35"
              >
                <div className="flex items-start gap-3">
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
                    <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white truncate group-hover:text-[#046A38] transition-colors">
                      {student.fullName}
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular font-semibold truncate mt-0.5">
                      {student.rollNumber || 'VESIT23CE018'}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono-tabular truncate mt-0.5">
                      {student.academicDepartment || student.department || 'CMPN'} · Div {student.division || 'A'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800/80 space-y-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-tabular ${status.bg}`}>
                    {status.icon}
                    <span>{status.label}</span>
                  </span>
                  <div className="flex items-center justify-between text-[11px] text-[#046A38] dark:text-emerald-400 font-semibold pt-0.5">
                    <span>Inspect Profile</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.button>
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
            submissions={submissions}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
