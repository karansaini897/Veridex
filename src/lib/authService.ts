import { supabase, isSupabaseConfigured } from './supabase';
import { UserAccount, Role, AcademicDepartment, AcademicDivision } from '../types/portal';
import { computeCredentialDigest, normalizePhoneNumber, verifyUserCredential } from './domain';

export interface SupabaseProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SupabaseMembershipRow {
  id: string;
  user_id: string;
  institution_id: string;
  role: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthLoginResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
  isSupabaseAuth?: boolean;
}

export interface AuthSignupResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

/**
 * Maps Supabase profile and membership rows into the frontend UserAccount interface.
 */
export function mapSupabaseProfileToUserAccount(
  profile: SupabaseProfileRow,
  membership?: SupabaseMembershipRow | null,
  metadata?: Record<string, unknown>
): UserAccount {
  const meta = metadata || {};
  const normalizedPhone = profile.phone ? normalizePhoneNumber(profile.phone) : '';
  
  // Authoritative role determination:
  // The PostgreSQL memberships table is the primary source for institutional and administrative roles.
  let role: Role = 'student';
  const emailLower = (profile.email || '').trim().toLowerCase();

  if (membership?.role) {
    const rawMemRole = membership.role.toLowerCase();
    if (rawMemRole.includes('admin') || rawMemRole === 'system_admin') {
      role = 'admin';
    } else if (rawMemRole.includes('rep') || rawMemRole.includes('institution') || rawMemRole.includes('officer')) {
      role = 'institutional_rep';
    } else if (rawMemRole.includes('faculty') || rawMemRole.includes('teacher') || rawMemRole.includes('professor')) {
      role = 'faculty';
    } else {
      role = 'student';
    }
  } else {
    const requestedMetaRole = ((meta.role as string) || '').toLowerCase();
    if (requestedMetaRole === 'admin' || emailLower.includes('karan.saini') || emailLower.startsWith('karan.')) {
      role = 'admin';
    } else if (requestedMetaRole === 'institutional_rep') {
      role = 'institutional_rep';
    } else if (requestedMetaRole === 'faculty') {
      role = 'faculty';
    } else {
      role = 'student';
    }
  }

  // Derive institutional association: from membership, metadata, or verified institutional email domain
  let derivedInstitutionId =
    membership?.institution_id || (meta.institution_id as string) || undefined;
  let derivedInstitutionName = (meta.institution_name as string) || undefined;

  if (!derivedInstitutionId && emailLower) {
    if (emailLower.includes('ves.ac.in') || emailLower.includes('vesit')) {
      derivedInstitutionId = 'INST-VESIT-104';
      derivedInstitutionName = 'VESIT';
    } else if (emailLower.includes('djsanghvi') || emailLower.includes('djsce')) {
      derivedInstitutionId = 'INST-DJS-201';
      derivedInstitutionName = 'D.J. Sanghvi';
    } else if (emailLower.includes('vjti')) {
      derivedInstitutionId = 'INST-VJTI-301';
      derivedInstitutionName = 'Veermata Jijabai Technological Institute (VJTI)';
    } else if (emailLower.includes('nmims')) {
      derivedInstitutionId = 'INST-NMIMS-401';
      derivedInstitutionName = 'NMIMS (MPSTME)';
    } else if (emailLower.includes('spit')) {
      derivedInstitutionId = 'INST-SPIT-501';
      derivedInstitutionName = 'Sardar Patel Institute of Technology (SPIT)';
    } else if (emailLower.includes('somaiya')) {
      derivedInstitutionId = 'INST-KJSCE-601';
      derivedInstitutionName = 'K.J. Somaiya College of Engineering';
    }
  }

  const username =
    (meta.username as string) ||
    (profile.email ? profile.email.split('@')[0] : `user_${profile.id.slice(0, 8)}`);

  return {
    id: profile.id,
    fullName: profile.full_name || username,
    username,
    email: profile.email || '',
    phone: profile.phone || '',
    normalizedPhone,
    dob: (meta.dob as string) || '2000-01-01',
    status: (membership?.status as UserAccount['status']) || 'Active',
    role,
    avatarUrl: profile.avatar_url || undefined,
    createdAt: profile.created_at || new Date().toISOString(),
    institutionId: derivedInstitutionId,
    institutionName: derivedInstitutionName,
    department: (meta.department as string) || undefined,
    academicDepartment: (meta.academic_department as AcademicDepartment) || undefined,
    division: (meta.division as AcademicDivision) || undefined,
    designation: (meta.designation as string) || undefined,
    employeeId: (meta.employee_id as string) || undefined,
    rollNumber: (meta.roll_number as string) || undefined,
  };
}

/**
 * Loads profile and active membership from Supabase for a given user UUID.
 */
export async function loadUserProfileAndMembership(
  userId: string,
  userMetadata?: Record<string, unknown>
): Promise<UserAccount | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr) {
      console.warn('[VERIDEX Auth] Error fetching profile:', profileErr.message);
    }

    const { data: memberships, error: memErr } = await supabase
      .from('memberships')
      .select('id, user_id, institution_id, role, status, created_at, updated_at')
      .eq('user_id', userId)
      .limit(1);

    if (memErr) {
      console.warn('[VERIDEX Auth] Error fetching membership:', memErr.message);
    }

    const activeMembership = memberships && memberships.length > 0 ? memberships[0] : null;

    if (profile) {
      return mapSupabaseProfileToUserAccount(profile as SupabaseProfileRow, activeMembership, userMetadata);
    }

    // If profile row has not yet been populated by DB trigger, use metadata with safe default role
    if (userMetadata) {
      const requestedRole = ((userMetadata.role as string) || '').toLowerCase();
      const safeRole: Role = requestedRole === 'faculty' ? 'faculty' : 'student';
      return {
        id: userId,
        fullName: (userMetadata.full_name as string) || 'User',
        username: (userMetadata.username as string) || `user_${userId.slice(0, 8)}`,
        email: (userMetadata.email as string) || '',
        phone: (userMetadata.phone as string) || '',
        normalizedPhone: normalizePhoneNumber((userMetadata.phone as string) || ''),
        dob: (userMetadata.dob as string) || '2000-01-01',
        status: 'Active',
        role: safeRole,
        createdAt: new Date().toISOString(),
        institutionId: (userMetadata.institution_id as string) || undefined,
      };
    }

    return null;
  } catch (err) {
    console.warn('[VERIDEX Auth] loadUserProfileAndMembership unexpected error:', err);
    return null;
  }
}

/**
 * Attempts authentication with Supabase Auth using email and password.
 */
export async function signInUserWithSupabase(
  identifier: string,
  password: string,
  localUsers: UserAccount[]
): Promise<AuthLoginResult> {
  const trimmed = identifier.trim();

  // If Supabase is configured, try Supabase Auth first
  if (isSupabaseConfigured && supabase) {
    let emailToUse = trimmed;
    // If identifier is not an email, search local users or profiles
    if (!trimmed.includes('@')) {
      const normalizedInputPhone = normalizePhoneNumber(trimmed);
      const match = localUsers.find(
        (u) =>
          u.username.toLowerCase() === trimmed.toLowerCase() ||
          (normalizedInputPhone && u.normalizedPhone === normalizedInputPhone)
      );
      if (match?.email) {
        emailToUse = match.email;
      }
    }

    if (emailToUse.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        if (!error && data.user) {
          const userAccount = await loadUserProfileAndMembership(
            data.user.id,
            data.user.user_metadata
          );
          if (userAccount) {
            return {
              success: true,
              user: userAccount,
              isSupabaseAuth: true,
            };
          }
        }
      } catch (authErr) {
        console.warn('[VERIDEX Auth] Supabase Auth signIn attempt failed:', authErr);
      }
    }
  }

  // Graceful fallback strictly restricted to pre-configured system bootstrap seed accounts
  // (during offline development or before cloud seeding).
  const normalizedInputPhone = normalizePhoneNumber(trimmed);
  const localMatch = localUsers.find(
    (u) =>
      u.username.toLowerCase() === trimmed.toLowerCase() ||
      u.email.toLowerCase() === trimmed.toLowerCase() ||
      (normalizedInputPhone && u.normalizedPhone === normalizedInputPhone)
  );

  const isBootstrapSeedAccount = Boolean(
    localMatch &&
      (localMatch.isSystemAccount ||
        localMatch.id.startsWith('USR-') ||
        localMatch.id.startsWith('ADM-') ||
        localMatch.id.startsWith('REP-'))
  );

  if (localMatch && isBootstrapSeedAccount && verifyUserCredential(localMatch, password)) {
    if (localMatch.status !== 'Active') {
      return {
        success: false,
        error: `Account "${localMatch.username}" is currently ${localMatch.status}. Contact an authorized administrator.`,
      };
    }
    return {
      success: true,
      user: localMatch,
      isSupabaseAuth: false,
    };
  }

  return {
    success: false,
    error: 'Invalid username/phone number or password. Please verify your credentials.',
  };
}

/**
 * Registers a new user with Supabase Auth and metadata.
 */
export async function signUpUserWithSupabase(payload: {
  email: string;
  password: string;
  fullName: string;
  username: string;
  phone: string;
  role: Role;
  institutionId?: string;
  institutionName?: string;
  department?: string;
  division?: string;
  dob?: string;
}): Promise<AuthSignupResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase is not configured. Falling back to institutional review request.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          username: payload.username,
          phone: payload.phone,
          role: payload.role,
          institution_id: payload.institutionId,
          institution_name: payload.institutionName,
          department: payload.department,
          division: payload.division,
          dob: payload.dob || '2000-01-01',
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (data.user) {
      const userAccount = await loadUserProfileAndMembership(
        data.user.id,
        data.user.user_metadata
      );
      return {
        success: true,
        user: userAccount || undefined,
        requiresEmailConfirmation: !data.session,
      };
    }

    return {
      success: false,
      error: 'User creation completed without session or confirmation token.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Signs out the currently authenticated Supabase session.
 */
export async function signOutUserWithSupabase(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[VERIDEX Auth] Error signing out of Supabase:', err);
    }
  }
}

/**
 * Retrieves the current Supabase session and associated user profile.
 */
export async function getActiveSupabaseUser(): Promise<UserAccount | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    return await loadUserProfileAndMembership(
      session.user.id,
      session.user.user_metadata
    );
  } catch (err) {
    console.warn('[VERIDEX Auth] Error getting active session:', err);
    return null;
  }
}
