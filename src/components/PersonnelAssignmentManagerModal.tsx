import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  UserMinus,
  UserX,
  X,
} from 'lucide-react';
import {
  AcademicDepartment,
  AcademicDivision,
  AcademicYear,
  Institution,
  UserAccount,
} from '../types/portal';
import {
  ACADEMIC_DEPARTMENTS,
  ACADEMIC_DIVISIONS,
  ACADEMIC_YEARS,
  AssignmentConflict,
  AssignmentMutationResult,
  ConflictResolutionStrategy,
  OrganisationalAssignmentPatch,
  canManagePersonnel,
  detectAssignmentConflict,
  formatRoleDisplayName,
  getActiveClassDivisionHolder,
  getEffectiveAssignmentStatus,
  getEffectiveAssociationStatus,
  getInstitutionRoleAvailability,
} from '../lib/domain';
import { StatusBadge } from './StatusPrimitives';

interface PersonnelAssignmentManagerModalProps {
  actor: UserAccount;
  targetUser: UserAccount;
  allUsers: UserAccount[];
  institutions: Institution[];
  onClose: () => void;
  onApplyAssignment: (
    targetUserId: string,
    patch: OrganisationalAssignmentPatch,
    conflictResolution?: Exclude<ConflictResolutionStrategy, 'cancel'>
  ) => AssignmentMutationResult;
  onRemoveFromAssignment: (
    targetUserId: string,
    reason?: string
  ) => AssignmentMutationResult;
  onRemoveInstitutionalAssociation: (
    targetUserId: string,
    reason?: string
  ) => AssignmentMutationResult;
}

export const PersonnelAssignmentManagerModal: React.FC<
  PersonnelAssignmentManagerModalProps
> = ({
  actor,
  targetUser,
  allUsers,
  institutions,
  onClose,
  onApplyAssignment,
  onRemoveFromAssignment,
  onRemoveInstitutionalAssociation,
}) => {
  const editPerm = useMemo(
    () => canManagePersonnel(actor, targetUser, 'edit_assignment'),
    [actor, targetUser]
  );
  const removeAssignPerm = useMemo(
    () => canManagePersonnel(actor, targetUser, 'remove_from_assignment'),
    [actor, targetUser]
  );
  const removeInstPerm = useMemo(
    () => canManagePersonnel(actor, targetUser, 'remove_from_institution'),
    [actor, targetUser]
  );

  const [institutionId, setInstitutionId] = useState<string>(
    targetUser.institutionId ||
      targetUser.previousInstitutionId ||
      actor.institutionId ||
      institutions[0]?.id ||
      'INST-VESIT-104'
  );
  const [academicDepartment, setAcademicDepartment] = useState<AcademicDepartment>(
    targetUser.academicDepartment ||
      (targetUser.department as AcademicDepartment) ||
      actor.academicDepartment ||
      'CMPN'
  );
  const [academicYear, setAcademicYear] = useState<AcademicYear | ''>(
    targetUser.academicYear ||
      (targetUser.role === 'student' ? 'Second Year' : '')
  );
  const [division, setDivision] = useState<AcademicDivision | ''>(
    targetUser.division || (targetUser.role === 'student' ? 'A' : '')
  );
  const [classTeacherDivision, setClassTeacherDivision] = useState<
    AcademicDivision | ''
  >(targetUser.classTeacherDivision || '');
  const [designation, setDesignation] = useState<string>(
    targetUser.designation || ''
  );
  const [officeLocation, setOfficeLocation] = useState<string>(
    targetUser.officeLocation || ''
  );
  const [note, setNote] = useState<string>('');

  // Active workflow states
  const [activeConflict, setActiveConflict] =
    useState<AssignmentConflict | null>(null);
  const [confirmRemoveInstOpen, setConfirmRemoveInstOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const liveTarget =
    allUsers.find((u) => u.id === targetUser.id) || targetUser;
  const currentAssignStatus = getEffectiveAssignmentStatus(liveTarget);
  const currentAssocStatus = getEffectiveAssociationStatus(liveTarget);

  const institutionAvailability = useMemo(
    () =>
      getInstitutionRoleAvailability(
        liveTarget.role,
        institutions,
        allUsers,
        [],
        {
          excludeUserId: liveTarget.id,
          ignorePendingRequests: true,
        }
      ),
    [liveTarget.role, liveTarget.id, institutions, allUsers]
  );

  // Live preview of conflict while editing fields
  const previewConflict = useMemo(() => {
    const candidatePatch: OrganisationalAssignmentPatch = {
      institutionId,
      academicDepartment,
      academicYear,
      division,
      classTeacherDivision,
      designation,
      officeLocation,
      note,
    };
    return detectAssignmentConflict(
      liveTarget,
      candidatePatch,
      allUsers,
      institutions
    );
  }, [
    liveTarget,
    institutionId,
    academicDepartment,
    academicYear,
    division,
    classTeacherDivision,
    designation,
    officeLocation,
    note,
    allUsers,
    institutions,
  ]);

  // For students, preview which Class Teacher matches the selected class
  const previewStudentClassTeacher = useMemo(() => {
    if (liveTarget.role !== 'student' || !division || !academicYear) return null;
    return getActiveClassDivisionHolder(
      {
        institutionId,
        academicDepartment,
        academicYear,
        classTeacherDivision: division,
      },
      allUsers
    );
  }, [
    liveTarget.role,
    institutionId,
    academicDepartment,
    academicYear,
    division,
    allUsers,
  ]);

  const buildPatch = (): OrganisationalAssignmentPatch => ({
    institutionId,
    academicDepartment:
      liveTarget.role === 'faculty' || liveTarget.role === 'student'
        ? academicDepartment
        : undefined,
    academicYear:
      liveTarget.role === 'faculty' || liveTarget.role === 'student'
        ? academicYear
        : undefined,
    division: liveTarget.role === 'student' ? division : undefined,
    classTeacherDivision:
      liveTarget.role === 'faculty' ? classTeacherDivision : undefined,
    designation: designation.trim() || undefined,
    officeLocation: officeLocation.trim() || undefined,
    note: note.trim() || undefined,
  });

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const patch = buildPatch();
    const res = onApplyAssignment(liveTarget.id, patch);

    if (!res.success) {
      if (res.requiresConflictResolution && res.conflict) {
        setActiveConflict(res.conflict);
        return;
      }
      setErrorMsg(res.error || 'Could not update organisational assignment.');
      return;
    }

    setActiveConflict(null);
    setSuccessMsg(
      res.auditDetails ||
        `Updated organisational assignment for ${liveTarget.fullName}.`
    );
  };

  const handleResolveConflict = (
    strategy: Exclude<ConflictResolutionStrategy, 'cancel'>
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const patch = buildPatch();
    const res = onApplyAssignment(liveTarget.id, patch, strategy);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to resolve assignment conflict.');
      return;
    }
    setActiveConflict(null);
    setSuccessMsg(
      res.auditDetails ||
        `Resolved conflict and updated assignment for ${liveTarget.fullName}.`
    );
  };

  const handleReleaseCurrentAssignment = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = onRemoveFromAssignment(
      liveTarget.id,
      note.trim() ||
        `Released from active assignment by ${actor.fullName} (${formatRoleDisplayName(actor.role)}).`
    );
    if (!res.success) {
      setErrorMsg(res.error || 'Could not release current assignment.');
      return;
    }
    if (liveTarget.role === 'faculty') {
      setClassTeacherDivision('');
    } else if (liveTarget.role === 'student') {
      setDivision('');
    }
    setSuccessMsg(
      res.auditDetails ||
        `${liveTarget.fullName} has been released from their active assignment and marked for reassignment.`
    );
  };

  const handleConfirmRemoveInstitution = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const res = onRemoveInstitutionalAssociation(
      liveTarget.id,
      removeReason.trim() ||
        `Institutional association deactivated by ${actor.fullName} (${formatRoleDisplayName(actor.role)}).`
    );
    if (!res.success) {
      setErrorMsg(res.error || 'Could not remove institutional association.');
      return;
    }
    setConfirmRemoveInstOpen(false);
    setSuccessMsg(
      res.auditDetails ||
        `Removed active institutional association for ${liveTarget.fullName}. Historical records and account identity remain preserved.`
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Manage Organisational Assignment: ${liveTarget.fullName}`}
      data-testid="personnel-assignment-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 glass-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-floating rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-[#C2410C]/45"
      >
        <div className="h-1.5 w-full tricolour-bar shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 flex items-start justify-between gap-3 bg-[#FCF9F2] dark:bg-stone-900">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C] dark:text-amber-400 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#046A38]" />
                <span>Hierarchical Personnel &amp; Assignment Governance</span>
              </span>
              <StatusBadge status={currentAssignStatus} size="xs" />
              {currentAssocStatus !== 'Active' && (
                <StatusBadge status={currentAssocStatus} size="xs" />
              )}
            </div>
            <h2 className="font-display font-bold text-base sm:text-lg text-stone-900 dark:text-white truncate">
              {liveTarget.fullName} (@{liveTarget.username})
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Role: <strong>{formatRoleDisplayName(liveTarget.role)}</strong> ·{' '}
              Current Institution:{' '}
              <strong>
                {liveTarget.institutionName ||
                  (liveTarget.previousInstitutionName
                    ? `Detached (Previously ${liveTarget.previousInstitutionName})`
                    : 'Unassigned')}
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close assignment manager"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-[#EFE6D5] dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs">
          {errorMsg && (
            <div
              role="alert"
              data-testid="assignment-modal-error"
              className="p-3.5 rounded-xl bg-red-500/12 border border-red-500/45 text-red-900 dark:text-red-200 flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              data-testid="assignment-modal-success"
              className="p-3.5 rounded-xl bg-emerald-500/12 border border-[#046A38]/45 text-stone-900 dark:text-emerald-200 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#046A38] dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Organisational Summary Card */}
          <div className="p-3.5 rounded-xl liquid-glass-subtle border border-[#C2410C]/30 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#046A38]" />
                <span>Current Organisational Placement</span>
              </span>
              <span className="font-mono-tabular text-[11px] text-stone-500">
                Acting Authority: {actor.fullName} ({formatRoleDisplayName(actor.role)})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <span className="text-stone-500 block text-[10px]">
                  Assignment State
                </span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {currentAssignStatus}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">
                  Institutional Association
                </span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {currentAssocStatus}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">
                  Active Scope / Division
                </span>
                <span className="font-semibold text-stone-900 dark:text-white">
                  {liveTarget.role === 'institutional_rep'
                    ? liveTarget.institutionName || 'Unassigned'
                    : liveTarget.role === 'faculty'
                      ? `${liveTarget.academicDepartment || liveTarget.department || 'CMPN'}${
                          liveTarget.academicYear ? ` · ${liveTarget.academicYear}` : ''
                        }${
                          liveTarget.classTeacherDivision
                            ? ` · Class Teacher Div ${liveTarget.classTeacherDivision}`
                            : ' · No Class Division'
                        }`
                      : `${liveTarget.academicDepartment || liveTarget.department || 'CMPN'} · ${
                          liveTarget.academicYear || 'Second Year'
                        } · ${
                          liveTarget.division ? `Div ${liveTarget.division}` : 'Unassigned Division'
                        }`}
                </span>
              </div>
            </div>
            {liveTarget.assignmentNote && (
              <div className="pt-1.5 border-t border-stone-200/70 dark:border-stone-800 text-[11px] text-stone-600 dark:text-stone-300">
                <strong>Latest Assignment Record:</strong> {liveTarget.assignmentNote}
              </div>
            )}
          </div>

          {!editPerm.allowed ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-stone-800 dark:text-amber-200">
              <strong>Authority Scope Restriction:</strong> {editPerm.reason}
            </div>
          ) : activeConflict ? (
            /* Conflict Resolution Workflow Panel */
            <div
              data-testid="assignment-conflict-resolution-panel"
              className="p-4 sm:p-5 rounded-2xl bg-amber-500/12 border-2 border-[#C2410C] space-y-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#C2410C] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] dark:text-amber-300">
                    Exclusive Assignment Conflict Detected
                  </div>
                  <h3 className="text-sm sm:text-base font-display font-bold text-stone-900 dark:text-white">
                    {activeConflict.slotLabel} is already occupied
                  </h3>
                  <p className="text-xs text-stone-700 dark:text-stone-200 leading-relaxed">
                    {activeConflict.explanation}
                  </p>
                </div>
              </div>

              {activeConflict.conflictingUser && (
                <div className="p-3 rounded-xl liquid-glass-subtle border border-[#C2410C]/35 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 block">
                      Current Active Holder
                    </span>
                    <span className="font-bold text-stone-900 dark:text-white">
                      {activeConflict.conflictingUser.fullName} (@
                      {activeConflict.conflictingUser.username})
                    </span>
                  </div>
                  <StatusBadge status="Assigned" size="xs" />
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="font-bold text-stone-900 dark:text-white">
                  Select how to resolve this assignment conflict:
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    data-testid="conflict-option-cancel"
                    onClick={() => setActiveConflict(null)}
                    className="p-3 rounded-xl liquid-glass-subtle hover:border-[#C2410C] text-left cursor-pointer border border-stone-300 dark:border-stone-700 transition-colors"
                  >
                    <div className="font-bold text-stone-900 dark:text-white">
                      1. Cancel &amp; Select a Different Available Assignment
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                      Return to the assignment form and choose an open division, academic year, or institution without modifying {activeConflict.conflictingUser?.fullName}&apos;s position.
                    </p>
                  </button>

                  <button
                    type="button"
                    data-testid="conflict-option-leave-unassigned"
                    onClick={() => handleResolveConflict('leave_unassigned')}
                    className="p-3 rounded-xl liquid-glass-subtle hover:border-[#C2410C] text-left cursor-pointer border border-amber-500/45 transition-colors"
                  >
                    <div className="font-bold text-stone-900 dark:text-white">
                      2. Save {liveTarget.fullName} as Assignment Pending (Leave Exclusive Slot Unchanged)
                    </div>
                    <p className="text-[11px] text-stone-600 dark:text-stone-300 mt-0.5">
                      Save non-conflicting departmental details for {liveTarget.fullName} with status &quot;Assignment Pending&quot; while keeping {activeConflict.conflictingUser?.fullName} in {activeConflict.slotLabel}.
                    </p>
                  </button>

                  <button
                    type="button"
                    data-testid="conflict-option-release-and-assign"
                    onClick={() =>
                      handleResolveConflict('release_conflicting_holder')
                    }
                    className="p-3 rounded-xl bg-[#C2410C]/15 hover:bg-[#C2410C]/25 text-left cursor-pointer border-2 border-[#C2410C] transition-colors"
                  >
                    <div className="font-bold text-[#C2410C] dark:text-amber-300">
                      3. Release {activeConflict.conflictingUser?.fullName} from {activeConflict.slotLabel} &amp; Assign {liveTarget.fullName}
                    </div>
                    <p className="text-[11px] text-stone-700 dark:text-stone-200 mt-0.5">
                      Explicitly release {activeConflict.conflictingUser?.fullName} (marking their assignment status as &quot;Reassignment Required&quot; while preserving their account and profile) and assign {liveTarget.fullName} as the active holder.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Organisational Assignment Edit Form */
            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div className="font-bold text-stone-900 dark:text-white border-b border-[#C2410C]/25 pb-2">
                Update Organisational Assignment
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Institution Selection (Editable by Admin, Scoped for IR/Faculty) */}
                <div
                  className={
                    liveTarget.role === 'institutional_rep'
                      ? 'sm:col-span-2'
                      : ''
                  }
                >
                  <label
                    htmlFor="assign-institution"
                    className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    College / Institution *
                  </label>
                  <select
                    id="assign-institution"
                    data-testid="assign-select-institution"
                    value={institutionId}
                    disabled={actor.role !== 'admin'}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white disabled:opacity-65"
                  >
                    {institutionAvailability.map((item) => (
                      <option
                        key={item.institution.id}
                        value={item.institution.id}
                      >
                        {item.institution.name} ({item.institution.code})
                        {liveTarget.role === 'institutional_rep'
                          ? item.available
                            ? ' - Available'
                            : ` - ${item.statusLabel}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Selection for Faculty & Student */}
                {(liveTarget.role === 'faculty' ||
                  liveTarget.role === 'student') && (
                  <div>
                    <label
                      htmlFor="assign-department"
                      className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                    >
                      Academic Department *
                    </label>
                    <select
                      id="assign-department"
                      data-testid="assign-select-department"
                      value={academicDepartment}
                      disabled={actor.role === 'faculty'}
                      onChange={(e) =>
                        setAcademicDepartment(
                          e.target.value as AcademicDepartment
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white disabled:opacity-65"
                    >
                      {ACADEMIC_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Academic Year Selection for Faculty & Student */}
                {(liveTarget.role === 'faculty' ||
                  liveTarget.role === 'student') && (
                  <div>
                    <label
                      htmlFor="assign-year"
                      className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                    >
                      {liveTarget.role === 'student'
                        ? 'Year of Study *'
                        : 'Class Advisor Academic Year'}
                    </label>
                    <select
                      id="assign-year"
                      data-testid="assign-select-year"
                      value={academicYear}
                      onChange={(e) =>
                        setAcademicYear(e.target.value as AcademicYear | '')
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                    >
                      {liveTarget.role === 'faculty' && (
                        <option value="">
                          General Department Cadre (No Class Year)
                        </option>
                      )}
                      {ACADEMIC_YEARS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Class Teacher Division for Faculty */}
                {liveTarget.role === 'faculty' && (
                  <div>
                    <label
                      htmlFor="assign-ct-division"
                      className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                    >
                      Class Teacher Division (Exclusive Slot)
                    </label>
                    <select
                      id="assign-ct-division"
                      data-testid="assign-select-ct-division"
                      value={classTeacherDivision}
                      onChange={(e) =>
                        setClassTeacherDivision(
                          e.target.value as AcademicDivision | ''
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                    >
                      <option value="">
                        Unassigned / Department Faculty Only
                      </option>
                      {ACADEMIC_DIVISIONS.map((div) => {
                        const holder =
                          academicYear
                            ? getActiveClassDivisionHolder(
                                {
                                  institutionId,
                                  academicDepartment,
                                  academicYear,
                                  classTeacherDivision: div,
                                },
                                allUsers,
                                liveTarget.id
                              )
                            : null;
                        return (
                          <option key={div} value={div}>
                            Division {div}
                            {holder
                              ? ` (Currently held by ${holder.fullName})`
                              : ' (Available)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Student Division */}
                {liveTarget.role === 'student' && (
                  <div>
                    <label
                      htmlFor="assign-student-division"
                      className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                    >
                      Class Division
                    </label>
                    <select
                      id="assign-student-division"
                      data-testid="assign-select-student-division"
                      value={division}
                      onChange={(e) =>
                        setDivision(e.target.value as AcademicDivision | '')
                      }
                      className="w-full px-3 py-2 rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                    >
                      <option value="">Unassigned Division</option>
                      {ACADEMIC_DIVISIONS.map((div) => (
                        <option key={div} value={div}>
                          Division {div}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Designation / Role Title for IR & Faculty */}
                {liveTarget.role !== 'student' && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="assign-designation"
                      className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                    >
                      Official Designation / Cadre Title
                    </label>
                    <input
                      id="assign-designation"
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Associate Professor & Class Teacher"
                      className="w-full px-3 py-2 rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="assign-note"
                    className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                  >
                    Administrative Assignment Note (Recorded in Audit Log)
                  </label>
                  <input
                    id="assign-note"
                    data-testid="assign-input-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reason for assignment update or academic year transfer..."
                    className="w-full px-3 py-2 rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Live Conflict Advisory Banner before Save */}
              {previewConflict.hasConflict && (
                <div
                  data-testid="assignment-live-conflict-warning"
                  className="p-3.5 rounded-xl bg-amber-500/12 border border-[#C2410C]/60 flex items-start gap-2.5 text-xs"
                >
                  <AlertTriangle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900 dark:text-amber-200 block">
                      Exclusive Position Alert: {previewConflict.slotLabel}
                    </span>
                    <span className="text-stone-700 dark:text-stone-300">
                      {previewConflict.explanation} Clicking &quot;Save Assignment Changes&quot; will open the conflict resolution workflow so you can choose how to proceed safely.
                    </span>
                  </div>
                </div>
              )}

              {/* Student Mentor Linkage Preview */}
              {liveTarget.role === 'student' && (
                <div className="p-3 rounded-xl liquid-glass-subtle border border-[#046A38]/35 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#046A38]" />
                    <span>
                      <strong>Assigned Class Teacher for Selected Division:</strong>{' '}
                      {previewStudentClassTeacher
                        ? `${previewStudentClassTeacher.fullName} (@${previewStudentClassTeacher.username})`
                        : 'No active Class Teacher currently assigned to this division'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="submit"
                  data-testid="btn-save-organisational-assignment"
                  className="px-4 py-2 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white font-semibold cursor-pointer shadow-xs"
                >
                  Save Assignment Changes
                </button>
              </div>
            </form>
          )}

          {/* Distinction Between Remove from Assignment vs Remove Institutional Association */}
          {(removeAssignPerm.allowed || removeInstPerm.allowed) && (
            <div className="pt-4 border-t border-[#C2410C]/25 space-y-3">
              <div className="font-bold text-stone-900 dark:text-white">
                Position Release &amp; Institutional Association Actions
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {removeAssignPerm.allowed && (
                  <div className="p-3.5 rounded-xl liquid-glass-subtle border border-amber-500/40 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                        <UserMinus className="w-4 h-4 text-[#C2410C]" />
                        <span>Remove from Current Assignment</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                        Releases {liveTarget.fullName}&apos;s active position or class division slot and marks them as &quot;Reassignment Required&quot; while keeping their institutional affiliation and profile intact.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-remove-from-assignment"
                      onClick={handleReleaseCurrentAssignment}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs cursor-pointer"
                    >
                      Release Active Assignment Slot
                    </button>
                  </div>
                )}

                {removeInstPerm.allowed && (
                  <div className="p-3.5 rounded-xl liquid-glass-subtle border border-red-500/40 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                        <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span>Remove Institutional Association</span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                        Detaches {liveTarget.fullName} from active institutional rosters and vacates any held positions while preserving historical audit and document records.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-open-remove-institution"
                      onClick={() => setConfirmRemoveInstOpen(true)}
                      className="w-full py-2 px-3 rounded-xl bg-red-700 hover:bg-red-800 text-white font-semibold text-xs cursor-pointer"
                    >
                      Remove from Institution...
                    </button>
                  </div>
                )}
              </div>

              {confirmRemoveInstOpen && (
                <div
                  data-testid="confirm-remove-institution-panel"
                  className="p-4 rounded-xl bg-red-500/12 border-2 border-red-500/60 space-y-3"
                >
                  <div className="font-bold text-red-900 dark:text-red-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>
                      Confirm Institutional Association Removal for {liveTarget.fullName}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-700 dark:text-stone-200 leading-relaxed">
                    This action will deactivate {liveTarget.fullName}&apos;s active association with{' '}
                    <strong>{liveTarget.institutionName || 'the institution'}</strong>, release any unique or exclusive positions they hold, and suspend active workspace access. Their historical submissions, audit trail, and user identity will remain preserved.
                  </p>
                  <div>
                    <label
                      htmlFor="remove-inst-reason"
                      className="block font-semibold text-stone-800 dark:text-stone-200 mb-1"
                    >
                      Reason for Institutional Removal
                    </label>
                    <input
                      id="remove-inst-reason"
                      data-testid="input-remove-institution-reason"
                      type="text"
                      value={removeReason}
                      onChange={(e) => setRemoveReason(e.target.value)}
                      placeholder="e.g. Completed tenure / transferred out of college..."
                      className="w-full px-3 py-1.5 rounded-lg border border-red-400/60 bg-white dark:bg-stone-900 text-stone-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveInstOpen(false)}
                      className="px-3 py-1.5 rounded-lg liquid-glass-subtle font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-testid="btn-confirm-remove-institution"
                      onClick={handleConfirmRemoveInstitution}
                      className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white font-semibold cursor-pointer"
                    >
                      Confirm Institutional Removal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#FCF9F2] dark:bg-stone-900 border-t border-[#C2410C]/20 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#046A38]" />
            <span>Changes synchronize immediately across directories and approval routing.</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary !py-1.5 !px-4 text-xs"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};
