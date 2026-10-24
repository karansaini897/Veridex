import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Mail,
  Phone,
  GraduationCap,
  Briefcase,
  MapPin,
  Calendar,
  X,
  Building2,
  ChevronRight,
  Search,
} from 'lucide-react';
import { UserAccount } from '../types/portal';

interface FacultyDirectorySectionProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
}

interface FacultyProfileModalProps {
  faculty: UserAccount;
  onClose: () => void;
}

export const FacultyProfileModal: React.FC<FacultyProfileModalProps> = ({ faculty, onClose }) => {
  const initials = faculty.fullName
    .replace(/\b(Dr|Prof|Mr|Ms|Mrs)\b\.?/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Faculty Profile: ${faculty.fullName}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-floating rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/40"
      >
        {/* Tricolour Accent */}
        <div className="h-1.5 w-full tricolour-bar shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 flex items-start justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900">
          <div className="flex items-center gap-3 min-w-0">
            {faculty.avatarUrl ? (
              <img
                src={faculty.avatarUrl}
                alt={faculty.fullName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border-2 border-[#C2410C] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#046A38] to-[#03542C] text-white font-display font-bold text-base flex items-center justify-center shrink-0 shadow-xs border-2 border-[#C2410C]/50">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white truncate">
                {faculty.fullName}
              </h3>
              <p className="text-xs text-[#C2410C] dark:text-amber-400 font-semibold truncate">
                {faculty.designation || 'Faculty Member'}
              </p>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular">
                ID: {faculty.employeeId || 'VESIT-FAC-CADRE'}
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
          {/* Institutional Affiliation */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#046A38] dark:text-emerald-400">
              <Building2 className="w-3.5 h-3.5" />
              <span>Department &amp; Cadre</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono-tabular text-stone-700 dark:text-stone-300">
              <div>
                <span className="text-stone-500 block text-[10px]">Institution</span>
                <span className="font-semibold text-stone-900 dark:text-white">{faculty.institutionName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Department</span>
                <span className="font-semibold text-stone-900 dark:text-white">{faculty.academicDepartment || faculty.department || 'CMPN'}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Academic Year &amp; Class</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {faculty.academicYear || 'All Years'} {faculty.classTeacherDivision ? `· Div ${faculty.classTeacherDivision}` : ''}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-[#046A38]">
                  ● Active Cadre
                </span>
              </div>
            </div>
          </div>

          {/* Academic Qualifications & Specialization */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-[#C2410C] dark:text-amber-400">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Qualifications &amp; Expertise</span>
            </div>
            <div className="space-y-1.5 text-stone-700 dark:text-stone-300">
              <div>
                <span className="text-stone-500 block text-[10px]">Highest Degree</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {faculty.highestQualification || 'Ph.D. in Computer Engineering'}
                </span>
              </div>
              {faculty.specialization && (
                <div>
                  <span className="text-stone-500 block text-[10px]">Specialization &amp; Research</span>
                  <span className="font-semibold text-stone-900 dark:text-white">{faculty.specialization}</span>
                </div>
              )}
              {faculty.officeLocation && (
                <div className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-400 pt-0.5">
                  <MapPin className="w-3 h-3 text-[#046A38]" />
                  <span>Office: {faculty.officeLocation}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Students & Workload Summary */}
          <div className="p-3 rounded-xl bg-[#046A38]/8 dark:bg-emerald-950/25 border border-[#046A38]/30 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#046A38] dark:text-emerald-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Mentorship &amp; Teaching Workload</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#046A38] text-white text-[10px] font-mono-tabular font-bold">
                {faculty.assignedStudentCount || 18} Assigned Students
              </span>
            </div>
            <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed mt-1">
              {faculty.workloadSummary || '18 Mentee Students · 3 Courses · Laboratory Compliance Lead'}
            </p>
          </div>

          {/* Contact Details */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/25 space-y-1.5">
            <span className="font-bold text-stone-800 dark:text-stone-200 block mb-1">
              Official Contact
            </span>
            <div className="space-y-1 font-mono-tabular">
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                <Mail className="w-3.5 h-3.5 text-[#C2410C] shrink-0" />
                <span className="truncate">{faculty.email}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                <Phone className="w-3.5 h-3.5 text-[#046A38] shrink-0" />
                <span>{faculty.phone}</span>
              </div>
              {faculty.joiningDate && (
                <div className="flex items-center gap-2 text-stone-500 text-[11px] pt-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>Date of Joining: {faculty.joiningDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#C2410C]/20 flex justify-end">
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

export const FacultyDirectorySection: React.FC<FacultyDirectorySectionProps> = ({
  currentUser,
  allUsers,
}) => {
  const [selectedFaculty, setSelectedFaculty] = useState<UserAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Scoped to the institution of the manager
  const institutionFaculty = allUsers.filter(
    (u) =>
      u.role === 'faculty' &&
      (currentUser.role === 'admin' || u.institutionId === currentUser.institutionId)
  );

  const filteredFaculty = institutionFaculty.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.fullName.toLowerCase().includes(q) ||
      (f.department && f.department.toLowerCase().includes(q)) ||
      (f.designation && f.designation.toLowerCase().includes(q)) ||
      f.email.toLowerCase().includes(q)
    );
  });

  return (
    <section aria-label="Institution Faculty Directory" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#046A38] dark:text-emerald-400">
            <Users className="w-4 h-4 text-[#C2410C]" />
            <span>Institution Faculty &amp; Academic Cadre Directory</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Faculty members affiliated with {currentUser.institutionName || 'your institution'} ({institutionFaculty.length} registered). Click any faculty member to inspect their profile.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search faculty or dept..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/35 bg-white/70 dark:bg-stone-900/70 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#046A38]"
          />
        </div>
      </div>

      {filteredFaculty.length === 0 ? (
        <div className="p-8 text-center rounded-2xl liquid-glass border border-dashed border-[#C2410C]/40 text-stone-600 dark:text-stone-400 text-xs">
          No faculty members found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFaculty.map((faculty) => {
            const initials = faculty.fullName
              .replace(/\b(Dr|Prof|Mr|Ms|Mrs)\b\.?/gi, '')
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0])
              .join('')
              .toUpperCase();

            return (
              <motion.button
                key={faculty.id}
                type="button"
                whileHover={{ y: -2 }}
                onClick={() => setSelectedFaculty(faculty)}
                className="text-left p-4 rounded-2xl liquid-glass liquid-glass-interactive cursor-pointer flex flex-col justify-between gap-3 group border border-[#C2410C]/35"
              >
                <div className="flex items-start gap-3">
                  {faculty.avatarUrl ? (
                    <img
                      src={faculty.avatarUrl}
                      alt={faculty.fullName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover border-2 border-[#C2410C]/60 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#046A38] to-[#03542C] text-white font-display font-bold text-sm flex items-center justify-center shrink-0 shadow-xs border border-[#C2410C]/40">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white truncate group-hover:text-[#C2410C] transition-colors">
                      {faculty.fullName}
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium truncate mt-0.5">
                      {faculty.designation || 'Faculty Member'}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-mono-tabular mt-1">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#046A38]/10 text-[#046A38] dark:text-emerald-400 font-bold">
                        {faculty.academicDepartment || faculty.department || 'CMPN'}
                      </span>
                      <span>·</span>
                      <span>{faculty.highestQualification?.split('(')[0] || 'Ph.D.'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between text-[11px]">
                  <div className="text-stone-600 dark:text-stone-400 font-mono-tabular">
                    <span className="font-semibold text-stone-900 dark:text-white">
                      {faculty.assignedStudentCount || 18}
                    </span>{' '}
                    Mentees
                  </div>
                  <span className="text-[#C2410C] dark:text-amber-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>View Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Faculty Profile Modal */}
      <AnimatePresence>
        {selectedFaculty && (
          <FacultyProfileModal
            faculty={selectedFaculty}
            onClose={() => setSelectedFaculty(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
