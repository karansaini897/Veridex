import {
  AcademicDepartment,
  AcademicDivision,
  AcademicYear,
  AccountApprovalRequest,
  Institution,
  InstitutionalAssociationStatus,
  OrganisationalAssignmentStatus,
  Role,
  SignupRole,
  UserAccount,
} from '../types/portal';

/**
 * Generalized role hierarchy rank.
 * Higher rank numbers exercise supervisory authority over strictly lower rank numbers
 * within their permitted institutional/departmental scope.
 */
export const ROLE_HIERARCHY_RANK: Readonly<Record<Role, number>> = {
  admin: 4,
  institutional_rep: 3,
  faculty: 2,
  student: 1,
} as const;

export interface RoleUniquenessConfig {
  role: Role;
  uniquePerInstitution: boolean;
  exclusiveSubScope?: 'class_division' | 'none';
  positionLabel: string;
  scopeDescription: string;
}

/**
 * Configurable role-uniqueness and assignment-exclusivity rule table.
 * - `institutional_rep`: Restricted to 1 active holder per institution.
 * - `faculty`: Multiple faculty allowed per institution/department, but Class Teacher / Advisor
 *   assignment for a specific (Institution, Department, Academic Year, Division) tuple is exclusive to 1 active holder.
 * - `student`: Multiple holders allowed per institution, department, academic year, and division.
 * - `admin`: System/regional oversight role.
 */
export const ROLE_UNIQUENESS_RULES: Readonly<Record<Role, RoleUniquenessConfig>> = {
  admin: {
    role: 'admin',
    uniquePerInstitution: false,
    exclusiveSubScope: 'none',
    positionLabel: 'Regional Compliance Administrator',
    scopeDescription: 'Regional multi-institution oversight authority',
  },
  institutional_rep: {
    role: 'institutional_rep',
    uniquePerInstitution: true,
    exclusiveSubScope: 'none',
    positionLabel: 'Institutional Manager',
    scopeDescription: 'Unique nodal position restricted to one active holder per institution',
  },
  faculty: {
    role: 'faculty',
    uniquePerInstitution: false,
    exclusiveSubScope: 'class_division',
    positionLabel: 'Faculty Member / Class Teacher',
    scopeDescription:
      'Multiple faculty allowed per department; Class Teacher division assignment is exclusive per (Institution, Department, Academic Year, Division)',
  },
  student: {
    role: 'student',
    uniquePerInstitution: false,
    exclusiveSubScope: 'none',
    positionLabel: 'Student',
    scopeDescription: 'Multiple students allowed per institution, department, year, and division',
  },
} as const;

export function isRoleUniquePerInstitution(role: Role | SignupRole): boolean {
  return Boolean(ROLE_UNIQUENESS_RULES[role]?.uniquePerInstitution);
}

export function getEffectiveAssignmentStatus(
  user: UserAccount
): OrganisationalAssignmentStatus {
  if (user.institutionalAssociationStatus === 'Removed' || user.institutionalAssociationStatus === 'Deactivated') {
    return 'Unassigned';
  }
  if (user.assignmentStatus) {
    return user.assignmentStatus;
  }
  if (user.role === 'institutional_rep') {
    return user.institutionId && user.status === 'Active' ? 'Assigned' : 'Unassigned';
  }
  if (user.role === 'faculty') {
    if (!user.institutionId) return 'Unassigned';
    return 'Assigned';
  }
  if (user.role === 'student') {
    if (!user.institutionId || !user.division) return 'Reassignment Required';
    return 'Assigned';
  }
  return 'Assigned';
}

export function getEffectiveAssociationStatus(
  user: UserAccount
): InstitutionalAssociationStatus {
  if (user.institutionalAssociationStatus) {
    return user.institutionalAssociationStatus;
  }
  if (user.role !== 'admin' && !user.institutionId && user.status === 'Suspended') {
    return 'Removed';
  }
  return 'Active';
}

/**
 * Determines whether a user currently counts as an active holder of an institutional or organisational position.
 * Inactive, suspended, removed, or unassigned holders do NOT block unique positions.
 */
export function isActivePositionHolder(user: UserAccount): boolean {
  if (user.status !== 'Active') return false;
  const assoc = getEffectiveAssociationStatus(user);
  if (assoc === 'Removed' || assoc === 'Deactivated') return false;
  const assignStatus = getEffectiveAssignmentStatus(user);
  if (assignStatus === 'Unassigned' || assignStatus === 'Reassignment Required' || assignStatus === 'Assignment Pending') {
    return false;
  }
  return true;
}

/**
 * Finds the active holder of an institutionally unique role (such as `institutional_rep`) for a given institution.
 */
export function getActiveInstitutionRoleHolder(
  role: Role | SignupRole,
  institutionId: string,
  users: UserAccount[],
  excludeUserId?: string
): UserAccount | null {
  if (!institutionId || !isRoleUniquePerInstitution(role)) return null;
  const found = users.find(
    (u) =>
      u.id !== excludeUserId &&
      u.role === role &&
      u.institutionId === institutionId &&
      isActivePositionHolder(u)
  );
  return found || null;
}

/**
 * Finds any pending or correction-requested registration request for a unique institutional role at an institution.
 */
export function getPendingInstitutionRoleRequest(
  role: SignupRole,
  institutionId: string,
  requests: AccountApprovalRequest[] = [],
  excludeRequestId?: string
): AccountApprovalRequest | null {
  if (!institutionId || !isRoleUniquePerInstitution(role)) return null;
  const found = requests.find(
    (r) =>
      r.id !== excludeRequestId &&
      r.requestedRole === role &&
      r.institutionId === institutionId &&
      (r.status === 'Pending Approval' || r.status === 'Correction Requested')
  );
  return found || null;
}

export interface InstitutionRoleAvailability {
  institution: Institution;
  available: boolean;
  occupiedByUser: UserAccount | null;
  occupiedByPendingRequest: AccountApprovalRequest | null;
  statusLabel: string;
  reason: string;
}

/**
 * Evaluates all institutions to determine whether a given role can be applied for or assigned at each institution.
 */
export function getInstitutionRoleAvailability(
  role: Role | SignupRole,
  institutions: Institution[],
  users: UserAccount[],
  requests: AccountApprovalRequest[] = [],
  options?: {
    excludeUserId?: string;
    excludeRequestId?: string;
    ignorePendingRequests?: boolean;
  }
): InstitutionRoleAvailability[] {
  const uniqueRole = isRoleUniquePerInstitution(role);
  const roleConfig = ROLE_UNIQUENESS_RULES[role];

  return institutions.map((inst) => {
    if (!uniqueRole) {
      return {
        institution: inst,
        available: true,
        occupiedByUser: null,
        occupiedByPendingRequest: null,
        statusLabel: 'Open for Registration',
        reason: `${roleConfig.positionLabel} allows multiple active holders at ${inst.name}.`,
      };
    }

    const activeHolder = getActiveInstitutionRoleHolder(
      role,
      inst.id,
      users,
      options?.excludeUserId
    );

    if (activeHolder) {
      return {
        institution: inst,
        available: false,
        occupiedByUser: activeHolder,
        occupiedByPendingRequest: null,
        statusLabel: `Occupied by ${activeHolder.fullName}`,
        reason: `The ${roleConfig.positionLabel} position at ${inst.name} (${inst.code}) is currently occupied by ${activeHolder.fullName} (@${activeHolder.username}). Only one active holder is permitted per institution.`,
      };
    }

    if (!options?.ignorePendingRequests && role !== 'admin') {
      const pendingReq = getPendingInstitutionRoleRequest(
        role as SignupRole,
        inst.id,
        requests,
        options?.excludeRequestId
      );
      if (pendingReq) {
        return {
          institution: inst,
          available: false,
          occupiedByUser: null,
          occupiedByPendingRequest: pendingReq,
          statusLabel: `Pending Application (${pendingReq.fullName})`,
          reason: `The ${roleConfig.positionLabel} position at ${inst.name} (${inst.code}) already has an active registration application under review (${pendingReq.fullName}).`,
        };
      }
    }

    return {
      institution: inst,
      available: true,
      occupiedByUser: null,
      occupiedByPendingRequest: null,
      statusLabel: 'Position Available',
      reason: `No active ${roleConfig.positionLabel} is currently assigned to ${inst.name}. This position is open.`,
    };
  });
}

/**
 * Finds the active Class Teacher faculty member for a specific (institutionId, department, academicYear, division) tuple.
 */
export function getActiveClassDivisionHolder(
  params: {
    institutionId?: string;
    academicDepartment?: AcademicDepartment | string;
    academicYear?: AcademicYear | string;
    classTeacherDivision?: AcademicDivision | string;
  },
  users: UserAccount[],
  excludeUserId?: string
): UserAccount | null {
  const { institutionId, academicDepartment, academicYear, classTeacherDivision } = params;
  if (!institutionId || !academicDepartment || !academicYear || !classTeacherDivision) {
    return null;
  }
  const found = users.find(
    (u) =>
      u.id !== excludeUserId &&
      u.role === 'faculty' &&
      isActivePositionHolder(u) &&
      u.institutionId === institutionId &&
      (u.academicDepartment || u.department) === academicDepartment &&
      u.academicYear === academicYear &&
      u.classTeacherDivision === classTeacherDivision
  );
  return found || null;
}

export type PersonnelManagementAction =
  | 'view_profile'
  | 'edit_assignment'
  | 'remove_from_assignment'
  | 'remove_from_institution';

/**
 * Generalized hierarchical authority & permission check.
 * Enforces:
 * - Active actor status
 * - Strict downward hierarchy (Admin > Institutional Manager > Faculty > Student)
 * - No self-management or self-privilege elevation
 * - No peer or superior management (e.g., Faculty cannot manage other Faculty)
 * - Strict institutional and departmental scope boundaries
 */
export function canManagePersonnel(
  actor: UserAccount | null | undefined,
  target: UserAccount | null | undefined,
  action: PersonnelManagementAction = 'edit_assignment'
): {
  allowed: boolean;
  reason?: string;
} {
  if (!actor || !target) {
    return { allowed: false, reason: 'Authenticated actor and target user are required.' };
  }

  if (actor.status !== 'Active' || getEffectiveAssociationStatus(actor) !== 'Active') {
    return {
      allowed: false,
      reason: 'Only active personnel with an active institutional association can manage subordinate records.',
    };
  }

  if (actor.id === target.id) {
    return {
      allowed: false,
      reason: 'Users cannot modify their own organisational assignment, role, or institutional status.',
    };
  }

  const actorRank = ROLE_HIERARCHY_RANK[actor.role];
  const targetRank = ROLE_HIERARCHY_RANK[target.role];

  if (actorRank <= targetRank) {
    return {
      allowed: false,
      reason: `${ROLE_UNIQUENESS_RULES[actor.role].positionLabel} accounts do not have authority to manage ${ROLE_UNIQUENESS_RULES[target.role].positionLabel} personnel.`,
    };
  }

  // Regional Admin can manage institutional_rep, faculty, and student across all institutions
  if (actor.role === 'admin') {
    return { allowed: true };
  }

  // Institutional Manager can manage faculty and student within their own institution
  if (actor.role === 'institutional_rep') {
    if (!actor.institutionId) {
      return {
        allowed: false,
        reason: 'Institutional Manager does not have an active institution assignment.',
      };
    }
    const targetMatchesInst =
      target.institutionId === actor.institutionId ||
      target.previousInstitutionId === actor.institutionId;
    if (!targetMatchesInst) {
      return {
        allowed: false,
        reason: 'Institutional Managers can only manage personnel affiliated with their own institution.',
      };
    }
    return { allowed: true };
  }

  // Faculty can manage subordinate students within their institution and department/class scope
  if (actor.role === 'faculty') {
    if (target.role !== 'student') {
      return {
        allowed: false,
        reason: 'Faculty members can only manage student personnel within their academic scope.',
      };
    }
    if (!actor.institutionId || target.institutionId !== actor.institutionId) {
      return {
        allowed: false,
        reason: 'Faculty members cannot manage students outside their own institution.',
      };
    }
    if (action === 'remove_from_institution') {
      return {
        allowed: false,
        reason: 'Detaching a student from the institution requires Institutional Manager or Regional Admin authority. Faculty may update or release student class division assignments.',
      };
    }
    const actorDept = actor.academicDepartment || actor.department;
    const targetDept = target.academicDepartment || target.department;
    const isSameDept = Boolean(actorDept && targetDept && actorDept === targetDept);
    const isAssignedMentee = target.assignedTeacherUserId === actor.id;
    if (!isSameDept && !isAssignedMentee) {
      return {
        allowed: false,
        reason: `Faculty members can only manage students in their own department (${actorDept || 'assigned department'}) or assigned mentee roster.`,
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Student accounts do not have personnel management authority.',
  };
}

export interface OrganisationalAssignmentPatch {
  institutionId?: string;
  academicDepartment?: AcademicDepartment;
  academicYear?: AcademicYear | '';
  division?: AcademicDivision | '';
  classTeacherDivision?: AcademicDivision | '';
  designation?: string;
  officeLocation?: string;
  specialization?: string;
  course?: string;
  rollNumber?: string;
  assignmentStatus?: OrganisationalAssignmentStatus;
  note?: string;
}

export type ConflictResolutionStrategy =
  | 'cancel'
  | 'leave_unassigned'
  | 'release_conflicting_holder';

export interface AssignmentConflict {
  hasConflict: boolean;
  conflictType?: 'unique_institutional_role' | 'exclusive_class_division';
  conflictingUser?: UserAccount;
  slotLabel?: string;
  explanation?: string;
  resolutionOptions: ConflictResolutionStrategy[];
}

/**
 * Detects whether applying `patch` to `targetUser` would violate either:
 * 1. Institutional role uniqueness (e.g., two active `institutional_rep` holders in the same institution)
 * 2. Exclusive Class Teacher division assignment (two active `faculty` holders assigned as Class Teacher for the same Institution + Department + Academic Year + Division)
 */
export function detectAssignmentConflict(
  targetUser: UserAccount,
  patch: OrganisationalAssignmentPatch,
  allUsers: UserAccount[],
  institutions: Institution[] = []
): AssignmentConflict {
  const nextInstitutionId =
    patch.institutionId !== undefined ? patch.institutionId : targetUser.institutionId;
  const nextAssignStatus = patch.assignmentStatus || 'Assigned';

  if (
    !nextInstitutionId ||
    nextAssignStatus === 'Unassigned' ||
    nextAssignStatus === 'Assignment Pending' ||
    nextAssignStatus === 'Reassignment Required'
  ) {
    return { hasConflict: false, resolutionOptions: [] };
  }

  const instObj = institutions.find((i) => i.id === nextInstitutionId);
  const instName = instObj?.name || targetUser.institutionName || nextInstitutionId;

  // 1. Check unique institutional role (e.g., Institutional Manager)
  if (isRoleUniquePerInstitution(targetUser.role)) {
    const existingHolder = getActiveInstitutionRoleHolder(
      targetUser.role,
      nextInstitutionId,
      allUsers,
      targetUser.id
    );
    if (existingHolder) {
      const posLabel = ROLE_UNIQUENESS_RULES[targetUser.role].positionLabel;
      return {
        hasConflict: true,
        conflictType: 'unique_institutional_role',
        conflictingUser: existingHolder,
        slotLabel: `${posLabel} (${instName})`,
        explanation: `${existingHolder.fullName} (@${existingHolder.username}) currently holds the active ${posLabel} position for ${instName}. Each institution is restricted to one active ${posLabel}.`,
        resolutionOptions: ['cancel', 'leave_unassigned', 'release_conflicting_holder'],
      };
    }
  }

  // 2. Check exclusive Class Teacher division assignment for Faculty
  if (targetUser.role === 'faculty') {
    const nextDept =
      patch.academicDepartment ||
      targetUser.academicDepartment ||
      (targetUser.department as AcademicDepartment | undefined);
    const nextYear =
      patch.academicYear !== undefined
        ? patch.academicYear || undefined
        : targetUser.academicYear;
    const nextCtDiv =
      patch.classTeacherDivision !== undefined
        ? patch.classTeacherDivision || undefined
        : targetUser.classTeacherDivision;

    if (nextDept && nextYear && nextCtDiv) {
      const existingAdvisor = getActiveClassDivisionHolder(
        {
          institutionId: nextInstitutionId,
          academicDepartment: nextDept,
          academicYear: nextYear,
          classTeacherDivision: nextCtDiv,
        },
        allUsers,
        targetUser.id
      );

      if (existingAdvisor) {
        return {
          hasConflict: true,
          conflictType: 'exclusive_class_division',
          conflictingUser: existingAdvisor,
          slotLabel: `Class Teacher (${instName} · ${nextDept} · ${nextYear} · Division ${nextCtDiv})`,
          explanation: `${existingAdvisor.fullName} (@${existingAdvisor.username}) is already assigned as the active Class Teacher for ${instName} · ${nextDept} · ${nextYear} · Division ${nextCtDiv}. A class division can have only one primary Class Teacher at a time.`,
          resolutionOptions: ['cancel', 'leave_unassigned', 'release_conflicting_holder'],
        };
      }
    }
  }

  return { hasConflict: false, resolutionOptions: [] };
}

/**
 * Re-synchronizes student `assignedTeacherUserId` and `assignedTeacherName` links
 * based on active Class Teacher assignments across all institutions, departments, years, and divisions,
 * and updates each faculty member's `assignedStudentCount`.
 */
export function syncStudentClassTeacherLinks(users: UserAccount[]): UserAccount[] {
  const firstPass = users.map((user) => {
    if (user.role !== 'student') return user;
    if (
      user.institutionalAssociationStatus === 'Removed' ||
      user.assignmentStatus === 'Unassigned' ||
      user.assignmentStatus === 'Reassignment Required' ||
      !user.institutionId ||
      !user.division
    ) {
      return {
        ...user,
        assignedTeacherUserId: undefined,
        assignedTeacherName: undefined,
      };
    }

    const stuDept = user.academicDepartment || user.department;
    const stuYear = user.academicYear || (user.yearSemester as AcademicYear | undefined);
    const matchingAdvisor = getActiveClassDivisionHolder(
      {
        institutionId: user.institutionId,
        academicDepartment: stuDept,
        academicYear: stuYear,
        classTeacherDivision: user.division,
      },
      users
    );

    if (matchingAdvisor) {
      return {
        ...user,
        assignedTeacherUserId: matchingAdvisor.id,
        assignedTeacherName: matchingAdvisor.fullName,
      };
    }

    return {
      ...user,
      assignedTeacherUserId: undefined,
      assignedTeacherName: undefined,
    };
  });

  return firstPass.map((user) => {
    if (user.role !== 'faculty') return user;
    const menteeCount = firstPass.filter(
      (s) => s.role === 'student' && s.assignedTeacherUserId === user.id
    ).length;
    if (menteeCount > 0) {
      return {
        ...user,
        assignedStudentCount: Math.max(menteeCount, user.assignedStudentCount || menteeCount),
      };
    }
    return user;
  });
}

export interface AssignmentMutationResult {
  success: boolean;
  requiresConflictResolution?: boolean;
  conflict?: AssignmentConflict;
  error?: string;
  users: UserAccount[];
  updatedTarget?: UserAccount;
  releasedUser?: UserAccount;
  auditAction?: string;
  auditDetails?: string;
}

/**
 * Applies an organisational assignment change with permission checks, conflict detection,
 * atomic conflict resolution, and student-teacher link synchronization.
 */
export function applyOrganisationalAssignmentChange(params: {
  actor: UserAccount;
  targetUserId: string;
  patch: OrganisationalAssignmentPatch;
  conflictResolution?: Exclude<ConflictResolutionStrategy, 'cancel'>;
  users: UserAccount[];
  institutions: Institution[];
  timestamp?: string;
}): AssignmentMutationResult {
  const { actor, targetUserId, patch, conflictResolution, users, institutions } = params;
  const now = params.timestamp || new Date().toISOString().slice(0, 16).replace('T', ' ');
  const target = users.find((u) => u.id === targetUserId);

  if (!target) {
    return {
      success: false,
      error: 'Target personnel record was not found.',
      users,
    };
  }

  const perm = canManagePersonnel(actor, target, 'edit_assignment');
  if (!perm.allowed) {
    return {
      success: false,
      error: perm.reason || 'You do not have permission to modify this assignment.',
      users,
    };
  }

  // Non-admin users cannot transfer personnel to a different institution
  if (
    actor.role !== 'admin' &&
    patch.institutionId &&
    patch.institutionId !== actor.institutionId
  ) {
    return {
      success: false,
      error: 'Only Regional Administrators can transfer personnel across institutions.',
      users,
    };
  }

  // Faculty cannot move students to a different department outside their own department
  if (
    actor.role === 'faculty' &&
    patch.academicDepartment &&
    patch.academicDepartment !== (actor.academicDepartment || actor.department)
  ) {
    return {
      success: false,
      error: `Faculty members can only assign students within their own department (${actor.academicDepartment || actor.department}).`,
      users,
    };
  }

  const conflict = detectAssignmentConflict(target, patch, users, institutions);
  if (conflict.hasConflict && !conflictResolution) {
    return {
      success: false,
      requiresConflictResolution: true,
      conflict,
      users,
    };
  }

  const nextInstId =
    patch.institutionId !== undefined
      ? patch.institutionId
      : target.institutionId || actor.institutionId;
  const instObj = institutions.find((i) => i.id === nextInstId);
  const nextInstName = instObj?.name || target.institutionName || 'VESIT';
  const nextInstCode = instObj?.code || target.officialInstitutionCode || nextInstId;

  let releasedUser: UserAccount | undefined;
  let effectiveAssignStatus: OrganisationalAssignmentStatus =
    patch.assignmentStatus || 'Assigned';

  let nextUsers = users.map((u) => ({ ...u }));

  // Handle explicit conflict resolution if a conflict existed
  if (conflict.hasConflict && conflict.conflictingUser) {
    if (conflictResolution === 'release_conflicting_holder') {
      nextUsers = nextUsers.map((u) => {
        if (u.id !== conflict.conflictingUser!.id) return u;
        if (conflict.conflictType === 'unique_institutional_role') {
          const released: UserAccount = {
            ...u,
            assignmentStatus: 'Reassignment Required',
            authorizationStatus: 'Pending Re-Verification',
            designation: 'Institutional Manager (Position Released - Awaiting Reassignment)',
            assignmentUpdatedAt: now,
            assignmentUpdatedByName: actor.fullName,
            assignmentNote: `Released from active ${conflict.slotLabel} position when ${target.fullName} was assigned by ${actor.fullName}.`,
          };
          releasedUser = released;
          return released;
        }
        // exclusive_class_division
        const facDept = u.academicDepartment || u.department || 'CMPN';
        const released: UserAccount = {
          ...u,
          classTeacherDivision: undefined,
          assignmentStatus: 'Reassignment Required',
          designation: `Faculty Member (${facDept} · Class Division Unassigned)`,
          assignmentUpdatedAt: now,
          assignmentUpdatedByName: actor.fullName,
          assignmentNote: `Released from ${conflict.slotLabel} when ${target.fullName} was assigned by ${actor.fullName}.`,
        };
        releasedUser = released;
        return released;
      });
    } else if (conflictResolution === 'leave_unassigned') {
      effectiveAssignStatus = 'Assignment Pending';
    }
  }

  let updatedTarget: UserAccount | undefined;

  nextUsers = nextUsers.map((u) => {
    if (u.id !== target.id) return u;

    if (u.role === 'institutional_rep') {
      const isPendingSlot =
        conflict.hasConflict && conflictResolution === 'leave_unassigned';
      const updated: UserAccount = {
        ...u,
        status: 'Active',
        institutionalAssociationStatus: 'Active',
        institutionId: nextInstId,
        institutionName: nextInstName,
        officialInstitutionCode: nextInstCode,
        assignmentStatus: isPendingSlot ? 'Assignment Pending' : effectiveAssignStatus,
        authorizationStatus: isPendingSlot
          ? 'Pending Authorization'
          : 'Verified Nodal Officer',
        designation:
          patch.designation?.trim() ||
          (isPendingSlot
            ? `Institutional Manager (${nextInstName} · Assignment Pending)`
            : 'Institutional Manager & Statutory Compliance Nodal Officer'),
        assignmentUpdatedAt: now,
        assignmentUpdatedByName: actor.fullName,
        assignmentNote:
          patch.note?.trim() ||
          (isPendingSlot
            ? `Saved with pending position assignment at ${nextInstName} to avoid overwriting ${conflict.conflictingUser?.fullName}.`
            : `Assigned as active Institutional Manager for ${nextInstName}.`),
      };
      updatedTarget = updated;
      return updated;
    }

    if (u.role === 'faculty') {
      const nextDept: AcademicDepartment =
        patch.academicDepartment ||
        u.academicDepartment ||
        (u.department as AcademicDepartment) ||
        'CMPN';
      const isLeaveUnassigned =
        conflict.hasConflict && conflictResolution === 'leave_unassigned';
      const nextYear: AcademicYear | undefined =
        patch.academicYear !== undefined
          ? patch.academicYear || undefined
          : u.academicYear;
      const nextCtDiv: AcademicDivision | undefined = isLeaveUnassigned
        ? undefined
        : patch.classTeacherDivision !== undefined
          ? patch.classTeacherDivision || undefined
          : u.classTeacherDivision;

      const resolvedStatus: OrganisationalAssignmentStatus = isLeaveUnassigned
        ? 'Assignment Pending'
        : patch.assignmentStatus
          ? patch.assignmentStatus
          : nextCtDiv
            ? 'Assigned'
            : 'Assigned';

      const autoDesignation =
        patch.designation?.trim() ||
        (nextCtDiv && nextYear
          ? `Class Teacher (${nextDept} · ${nextYear} · Div ${nextCtDiv})`
          : `Faculty Member (${nextDept} Department Cadre)`);

      const updated: UserAccount = {
        ...u,
        status: 'Active',
        institutionalAssociationStatus: 'Active',
        institutionId: nextInstId,
        institutionName: nextInstName,
        officialInstitutionCode: nextInstCode,
        department: nextDept,
        academicDepartment: nextDept,
        academicYear: nextYear,
        classTeacherDivision: nextCtDiv,
        designation: autoDesignation,
        officeLocation:
          patch.officeLocation !== undefined ? patch.officeLocation : u.officeLocation,
        specialization:
          patch.specialization !== undefined ? patch.specialization : u.specialization,
        assignmentStatus: resolvedStatus,
        assignmentUpdatedAt: now,
        assignmentUpdatedByName: actor.fullName,
        assignmentNote:
          patch.note?.trim() ||
          (isLeaveUnassigned
            ? `Assigned to ${nextDept} department with Class Teacher division pending.`
            : nextCtDiv && nextYear
              ? `Assigned to ${nextInstName} · ${nextDept} · ${nextYear} · Class Teacher Division ${nextCtDiv}.`
              : `Assigned to ${nextInstName} · ${nextDept} Department Cadre (No Class Teacher Division).`),
      };
      updatedTarget = updated;
      return updated;
    }

    // Student
    const nextDept: AcademicDepartment =
      patch.academicDepartment ||
      u.academicDepartment ||
      (u.department as AcademicDepartment) ||
      'CMPN';
    const nextYear: AcademicYear =
      (patch.academicYear as AcademicYear) || u.academicYear || 'Second Year';
    const nextDiv: AcademicDivision | undefined =
      patch.division !== undefined ? patch.division || undefined : u.division;

    const updated: UserAccount = {
      ...u,
      status: 'Active',
      institutionalAssociationStatus: 'Active',
      institutionId: nextInstId,
      institutionName: nextInstName,
      officialInstitutionCode: nextInstCode,
      department: nextDept,
      academicDepartment: nextDept,
      academicYear: nextYear,
      yearSemester: nextYear,
      division: nextDiv,
      course: patch.course?.trim() || `B.Tech (${nextDept})`,
      rollNumber: patch.rollNumber?.trim() || u.rollNumber,
      assignmentStatus: nextDiv ? patch.assignmentStatus || 'Assigned' : 'Reassignment Required',
      assignmentUpdatedAt: now,
      assignmentUpdatedByName: actor.fullName,
      assignmentNote:
        patch.note?.trim() ||
        (nextDiv
          ? `Assigned to ${nextInstName} · ${nextDept} · ${nextYear} · Division ${nextDiv}.`
          : `Updated academic placement in ${nextDept}; division assignment pending.`),
    };
    updatedTarget = updated;
    return updated;
  });

  const synchronizedUsers = syncStudentClassTeacherLinks(nextUsers);
  const finalTarget = synchronizedUsers.find((u) => u.id === target.id);
  const finalReleased = releasedUser
    ? synchronizedUsers.find((u) => u.id === releasedUser!.id)
    : undefined;

  const auditAction = finalReleased
    ? 'Organisational Assignment Updated (Conflict Resolved)'
    : 'Organisational Assignment Updated';

  const auditDetails = finalReleased
    ? `${actor.fullName} updated assignment for ${target.fullName} (@${target.username}): ${finalTarget?.assignmentNote || ''} Released previous holder ${finalReleased.fullName} (@${finalReleased.username}) to Reassignment Required.`
    : `${actor.fullName} updated assignment for ${target.fullName} (@${target.username}): ${finalTarget?.assignmentNote || ''}`;

  return {
    success: true,
    users: synchronizedUsers,
    updatedTarget: finalTarget,
    releasedUser: finalReleased,
    auditAction,
    auditDetails,
  };
}

/**
 * Removes a person from their current position/class assignment WITHOUT removing their
 * institutional association or deleting their profile/credentials.
 */
export function removePersonnelFromAssignment(params: {
  actor: UserAccount;
  targetUserId: string;
  reason?: string;
  users: UserAccount[];
  timestamp?: string;
}): AssignmentMutationResult {
  const { actor, targetUserId, reason, users } = params;
  const now = params.timestamp || new Date().toISOString().slice(0, 16).replace('T', ' ');
  const target = users.find((u) => u.id === targetUserId);

  if (!target) {
    return {
      success: false,
      error: 'Target personnel record was not found.',
      users,
    };
  }

  const perm = canManagePersonnel(actor, target, 'remove_from_assignment');
  if (!perm.allowed) {
    return {
      success: false,
      error: perm.reason || 'You are not authorized to release this assignment.',
      users,
    };
  }

  const cleanReason =
    reason?.trim() || `Removed from active assignment by ${actor.fullName}.`;

  const nextUsers = users.map((u) => {
    if (u.id !== target.id) return u;

    if (u.role === 'institutional_rep') {
      return {
        ...u,
        assignmentStatus: 'Unassigned' as const,
        authorizationStatus: 'Pending Re-Verification' as const,
        designation: 'Institutional Manager (Unassigned Position)',
        assignmentUpdatedAt: now,
        assignmentUpdatedByName: actor.fullName,
        assignmentNote: cleanReason,
      };
    }

    if (u.role === 'faculty') {
      const dept = u.academicDepartment || u.department || 'CMPN';
      return {
        ...u,
        classTeacherDivision: undefined,
        assignmentStatus: 'Reassignment Required' as const,
        designation: `Faculty Member (${dept} · Unassigned Class Division)`,
        assignmentUpdatedAt: now,
        assignmentUpdatedByName: actor.fullName,
        assignmentNote: cleanReason,
      };
    }

    // Student
    return {
      ...u,
      division: undefined,
      assignedTeacherUserId: undefined,
      assignedTeacherName: undefined,
      assignmentStatus: 'Reassignment Required' as const,
      assignmentUpdatedAt: now,
      assignmentUpdatedByName: actor.fullName,
      assignmentNote: cleanReason,
    };
  });

  const synchronizedUsers = syncStudentClassTeacherLinks(nextUsers);
  const finalTarget = synchronizedUsers.find((u) => u.id === target.id);

  return {
    success: true,
    users: synchronizedUsers,
    updatedTarget: finalTarget,
    auditAction: 'Removed from Organisational Assignment',
    auditDetails: `${actor.fullName} released ${target.fullName} (@${target.username}) from their active assignment while preserving institutional affiliation. Note: ${cleanReason}`,
  };
}

/**
 * Removes / deactivates a person's institutional association while preserving their historical
 * records, account identity, and credentials. Releases any occupied unique/exclusive positions.
 */
export function removeInstitutionalAssociation(params: {
  actor: UserAccount;
  targetUserId: string;
  reason?: string;
  users: UserAccount[];
  timestamp?: string;
}): AssignmentMutationResult {
  const { actor, targetUserId, reason, users } = params;
  const now = params.timestamp || new Date().toISOString().slice(0, 16).replace('T', ' ');
  const target = users.find((u) => u.id === targetUserId);

  if (!target) {
    return {
      success: false,
      error: 'Target personnel record was not found.',
      users,
    };
  }

  const perm = canManagePersonnel(actor, target, 'remove_from_institution');
  if (!perm.allowed) {
    return {
      success: false,
      error: perm.reason || 'You are not authorized to remove institutional association.',
      users,
    };
  }

  const prevInstName = target.institutionName || target.previousInstitutionName || 'Institution';
  const prevInstId = target.institutionId || target.previousInstitutionId;
  const cleanReason =
    reason?.trim() ||
    `Institutional association with ${prevInstName} deactivated by ${actor.fullName}.`;

  const nextUsers = users.map((u) => {
    if (u.id !== target.id) return u;
    return {
      ...u,
      status: 'Suspended' as const,
      institutionalAssociationStatus: 'Removed' as const,
      assignmentStatus: 'Unassigned' as const,
      previousInstitutionId: prevInstId,
      previousInstitutionName: prevInstName,
      institutionId: undefined,
      institutionName: undefined,
      officialInstitutionCode: undefined,
      classTeacherDivision: undefined,
      division: undefined,
      assignedTeacherUserId: undefined,
      assignedTeacherName: undefined,
      assignmentUpdatedAt: now,
      assignmentUpdatedByName: actor.fullName,
      assignmentNote: cleanReason,
    };
  });

  const synchronizedUsers = syncStudentClassTeacherLinks(nextUsers);
  const finalTarget = synchronizedUsers.find((u) => u.id === target.id);

  return {
    success: true,
    users: synchronizedUsers,
    updatedTarget: finalTarget,
    auditAction: 'Institutional Association Removed',
    auditDetails: `${actor.fullName} removed active institutional association for ${target.fullName} (@${target.username}) from ${prevInstName}. Historical records preserved. Note: ${cleanReason}`,
  };
}
