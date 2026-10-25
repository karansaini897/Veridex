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
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { Institution, UserAccount } from '../types/portal';
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

interface FacultyDirectorySectionProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  institutions?: Institution[];
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

interface FacultyProfileModalProps {
  faculty: UserAccount;
  canManage: boolean;
  onManageAssignment?: () => void;
  onClose: () => void;
}

export const FacultyProfileModal: React.FC<FacultyProfileModalProps> = ({
  faculty,
  canManage,
  onManageAssignment,
  onClose,
}) => {
  const initials = faculty.fullName
    .replace(/\b(Dr|Prof|Mr|Ms|Mrs)\b\.?/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  const effectiveAssignment = getEffectiveAssignmentStatus(faculty);
  const effectiveAssociation = getEffectiveAssociationStatus(faculty);

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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white truncate">
                  {faculty.fullName}
                </h3>
                <StatusBadge status={effectiveAssignment} size="sm" />
              </div>
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-[#046A38] dark:text-emerald-400">
                <Building2 className="w-3.5 h-3.5" />
                <span>Department &amp; Organisational Assignment</span>
              </div>
              {effectiveAssociation !== 'Active' && (
                <StatusBadge status={effectiveAssociation} size="sm" />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono-tabular text-stone-700 dark:text-stone-300">
              <div>
                <span className="text-stone-500 block text-[10px]">Institution</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {faculty.institutionName || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Department</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {faculty.academicDepartment || faculty.department || 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Academic Year &amp; Class Division</span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {faculty.academicYear || 'All Years'}{' '}
                  {faculty.classTeacherDivision
                    ? `· Class Teacher Div ${faculty.classTeacherDivision}`
                    : '· Subject Faculty (No Class Div)'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Assignment Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-[#046A38] dark:text-emerald-400">
                  ● {effectiveAssignment}
                </span>
              </div>
            </div>
            {faculty.assignmentNote && (
              <div className="pt-1.5 mt-1.5 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-400">
                <strong>Latest Assignment Note:</strong> {faculty.assignmentNote}
              </div>
            )}
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
                {faculty.assignedStudentCount ?? 0} Assigned Students
              </span>
            </div>
            <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed mt-1">
              {faculty.workloadSummary || 'Mentee Students · Courses · Laboratory Compliance Lead'}
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
        <div className="p-3 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#C2410C]/20 flex items-center justify-between gap-2">
          {canManage && onManageAssignment ? (
            <button
              type="button"
              data-testid="modal-btn-manage-faculty-assignment"
              onClick={onManageAssignment}
              className="btn-secondary !py-1.5 !px-3.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>Manage Organisational Assignment</span>
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

export const FacultyDirectorySection: React.FC<FacultyDirectorySectionProps> = ({
  currentUser,
  allUsers,
  institutions = SEED_INSTITUTIONS,
  onApplyAssignment,
  onRemoveFromAssignment,
  onRemoveInstitutionalAssociation,
}) => {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [managingFacultyId, setManagingFacultyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Scoped to the institution of the manager, excluding removed associations
  const institutionFaculty = allUsers.filter(
    (u) =>
      u.role === 'faculty' &&
      getEffectiveAssociationStatus(u) !== 'Removed' &&
      (currentUser.role === 'admin' || u.institutionId === currentUser.institutionId)
  );

  const filteredFaculty = institutionFaculty.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.fullName.toLowerCase().includes(q) ||
      (f.department && f.department.toLowerCase().includes(q)) ||
      (f.academicDepartment && f.academicDepartment.toLowerCase().includes(q)) ||
      (f.designation && f.designation.toLowerCase().includes(q)) ||
      f.email.toLowerCase().includes(q)
    );
  });

  // Maximum 4 profiles displayed initially; when searching or when showAll is active, show all matching profiles
  const displayedFaculty =
    !showAll && !searchQuery.trim()
      ? filteredFaculty.slice(0, 4)
      : filteredFaculty;

  const selectedFaculty = allUsers.find((u) => u.id === selectedFacultyId) || null;
  const managingFaculty = allUsers.find((u) => u.id === managingFacultyId) || null;

  return (
    <section aria-label="Institution Faculty Directory" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#046A38] dark:text-emerald-400">
            <Users className="w-4 h-4 text-[#C2410C]" />
            <span>Institution Faculty &amp; Academic Cadre Directory</span>
          </div>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Faculty members affiliated with {currentUser.institutionName || 'your institution'} ({institutionFaculty.length} active). Authorized superiors can inspect profiles and manage departmental or class division assignments.
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
              placeholder="Search faculty or dept..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/35 bg-white/70 dark:bg-stone-900/70 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#046A38]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            aria-label={showAll ? 'Show less profiles' : 'See all profiles'}
            className="px-3.5 py-1.5 rounded-xl border border-[#C2410C]/45 bg-[#FCF9F2] dark:bg-stone-900 text-xs font-semibold text-stone-900 dark:text-white hover:bg-[#C2410C] hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap shadow-xs"
          >
            {showAll ? 'Show Less' : 'See All'}
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div
          role="status"
          data-testid="faculty-directory-feedback"
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

      {displayedFaculty.length === 0 ? (
        <div className="p-8 text-center rounded-2xl liquid-glass border border-dashed border-[#C2410C]/40 text-stone-600 dark:text-stone-400 text-xs">
          No faculty members found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedFaculty.map((faculty) => {
            const initials = faculty.fullName
              .replace(/\b(Dr|Prof|Mr|Ms|Mrs)\b\.?/gi, '')
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0])
              .join('')
              .toUpperCase();

            const effectiveAssignment = getEffectiveAssignmentStatus(faculty);
            const canManage =
              Boolean(onApplyAssignment) &&
              canManagePersonnel(currentUser, faculty, 'edit_assignment').allowed;

            return (
              <motion.div
                key={faculty.id}
                whileHover={{ y: -2 }}
                data-testid={`faculty-card-${faculty.id}`}
                className="text-left p-4 rounded-2xl liquid-glass liquid-glass-interactive flex flex-col justify-between gap-3 group border border-[#C2410C]/35"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedFacultyId(faculty.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedFacultyId(faculty.id);
                    }
                  }}
                  className="flex items-start gap-3 cursor-pointer"
                >
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
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 className="font-display font-bold text-sm text-stone-900 dark:text-white truncate group-hover:text-[#C2410C] transition-colors">
                        {faculty.fullName}
                      </h4>
                      <StatusBadge status={effectiveAssignment} size="sm" />
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium truncate mt-0.5">
                      {faculty.designation || 'Faculty Member'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500 font-mono-tabular mt-1.5">
                      <span className="px-1.5 py-0.5 rounded-md bg-[#046A38]/10 text-[#046A38] dark:text-emerald-400 font-bold">
                        {faculty.academicDepartment || faculty.department || 'Unassigned Dept'}
                      </span>
                      {faculty.academicYear && (
                        <>
                          <span>·</span>
                          <span>{faculty.academicYear}</span>
                        </>
                      )}
                      {faculty.classTeacherDivision ? (
                        <>
                          <span>·</span>
                          <span className="font-bold text-[#C2410C] dark:text-amber-400">
                            CT Div {faculty.classTeacherDivision}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>·</span>
                          <span className="text-stone-400">No Class Div</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between gap-2 text-[11px]">
                  <div className="text-stone-600 dark:text-stone-400 font-mono-tabular">
                    <span className="font-semibold text-stone-900 dark:text-white">
                      {faculty.assignedStudentCount ?? 0}
                    </span>{' '}
                    Mentees
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button
                        type="button"
                        data-testid={`btn-manage-faculty-${faculty.id}`}
                        onClick={() => setManagingFacultyId(faculty.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#C2410C]/12 hover:bg-[#C2410C] text-[#C2410C] dark:text-amber-300 hover:text-white font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Manage Assignment</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedFacultyId(faculty.id)}
                      className="text-[#C2410C] dark:text-amber-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
                    >
                      <span>Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Faculty Profile Modal */}
      <AnimatePresence>
        {selectedFaculty && (
          <FacultyProfileModal
            faculty={selectedFaculty}
            canManage={
              Boolean(onApplyAssignment) &&
              canManagePersonnel(currentUser, selectedFaculty, 'edit_assignment').allowed
            }
            onManageAssignment={() => {
              const targetId = selectedFaculty.id;
              setSelectedFacultyId(null);
              setManagingFacultyId(targetId);
            }}
            onClose={() => setSelectedFacultyId(null)}
          />
        )}
      </AnimatePresence>

      {/* Personnel Assignment Manager Modal */}
      <AnimatePresence>
        {managingFaculty && onApplyAssignment && onRemoveFromAssignment && onRemoveInstitutionalAssociation && (
          <PersonnelAssignmentManagerModal
            actor={currentUser}
            targetUser={managingFaculty}
            allUsers={allUsers}
            institutions={institutions}
            onClose={() => setManagingFacultyId(null)}
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
