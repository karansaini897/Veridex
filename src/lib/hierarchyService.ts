import { supabase, isSupabaseConfigured } from './supabase';

export interface MembershipRecord {
  id: string;
  userId: string;
  institutionId: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface FacultyAssignmentRecord {
  id: string;
  institutionId: string;
  departmentId: string;
  divisionId: string;
  facultyUserId: string;
  status: string;
}

export interface StudentAssignmentRecord {
  id: string;
  institutionId: string;
  departmentId: string;
  divisionId: string;
  studentUserId: string;
  status: string;
}

/**
 * Checks if the current authenticated user has an authorized role for an institution.
 * Uses the database function has_institution_role(p_institution_id, p_roles).
 */
export async function checkHasInstitutionRole(
  institutionId: string,
  roles: string[]
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { data, error } = await supabase.rpc('has_institution_role', {
      p_institution_id: institutionId,
      p_roles: roles,
    });

    if (error) {
      console.warn('[VERIDEX Hierarchy] has_institution_role error:', error.message);
      return false;
    }

    return Boolean(data);
  } catch (err) {
    console.warn('[VERIDEX Hierarchy] Unexpected error in checkHasInstitutionRole:', err);
    return false;
  }
}

/**
 * Fetches institutional memberships for an institution from Supabase.
 */
export async function fetchInstitutionMemberships(
  institutionId: string
): Promise<MembershipRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('memberships')
      .select('id, user_id, institution_id, role, status, created_at, updated_at')
      .eq('institution_id', institutionId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      institutionId: row.institution_id,
      role: row.role,
      status: row.status,
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('[VERIDEX Hierarchy] Error fetching memberships:', err);
    return [];
  }
}

/**
 * Updates a member's role via the authorized database function change_member_role(p_membership_id, p_new_role).
 */
export async function updateMemberRoleInDatabase(
  membershipId: string,
  newRole: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database not connected' };
  }

  try {
    const { data, error } = await supabase.rpc('change_member_role', {
      p_membership_id: membershipId,
      p_new_role: newRole,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Removes a member from an institution via remove_institution_member(p_membership_id).
 */
export async function removeMemberFromInstitutionInDatabase(
  membershipId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, error: 'Database not connected' };
  }

  try {
    const { data, error } = await supabase.rpc('remove_institution_member', {
      p_membership_id: membershipId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetches faculty assignments for an institution.
 */
export async function fetchFacultyAssignments(
  institutionId: string
): Promise<FacultyAssignmentRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('faculty_assignments')
      .select('id, institution_id, department_id, division_id, faculty_user_id, status')
      .eq('institution_id', institutionId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      institutionId: row.institution_id,
      departmentId: row.department_id,
      divisionId: row.division_id,
      facultyUserId: row.faculty_user_id,
      status: row.status,
    }));
  } catch (err) {
    console.warn('[VERIDEX Hierarchy] Error fetching faculty assignments:', err);
    return [];
  }
}

/**
 * Fetches student assignments for an institution.
 */
export async function fetchStudentAssignments(
  institutionId: string
): Promise<StudentAssignmentRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('student_assignments')
      .select('id, institution_id, department_id, division_id, student_user_id, status')
      .eq('institution_id', institutionId);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      institutionId: row.institution_id,
      departmentId: row.department_id,
      divisionId: row.division_id,
      studentUserId: row.student_user_id,
      status: row.status,
    }));
  } catch (err) {
    console.warn('[VERIDEX Hierarchy] Error fetching student assignments:', err);
    return [];
  }
}
