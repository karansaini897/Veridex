import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  AcademicDepartment,
  AcademicDivision,
  Institution,
} from '../types/portal';
import { SEED_INSTITUTIONS } from '../data/seedData';
import { ACADEMIC_DEPARTMENTS, ACADEMIC_DIVISIONS } from './domain';

/**
 * Confirmed Supabase schema representation for 'institutions' table.
 * Verified columns: id, name, institution_type, address, status, created_at, updated_at
 */
export interface SupabaseInstitutionRow {
  id: string;
  name: string;
  institution_type?: string | null;
  address?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Confirmed Supabase schema representation for 'departments' table.
 * Verified columns: id, institution_id, name, status, created_at
 */
export interface SupabaseDepartmentRow {
  id: string;
  institution_id: string;
  name: string;
  status?: string | null;
  created_at?: string | null;
}

/**
 * Confirmed Supabase schema representation for 'divisions' table.
 * Verified columns: id, department_id, institution_id, name, status, created_at
 */
export interface SupabaseDivisionRow {
  id: string;
  department_id: string;
  institution_id: string;
  name: string;
  status?: string | null;
  created_at?: string | null;
}

/**
 * Enriched department entity for components that display extended department data.
 */
export interface SupabaseDepartmentRecord {
  id: string;
  institutionId: string;
  name: string;
  code: string;
  status: string;
}

/**
 * Enriched division entity for components that display extended division data.
 */
export interface SupabaseDivisionRecord {
  id: string;
  departmentId: string;
  institutionId: string;
  name: string;
  divisionCode: string;
  status: string;
}

/**
 * Type guard for checking if an object looks like a valid Supabase institution row.
 */
export function isSupabaseInstitutionRow(val: unknown): val is SupabaseInstitutionRow {
  if (!val || typeof val !== 'object') return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.name === 'string';
}

/**
 * Maps a confirmed database institution row into the frontend Institution model.
 * Provides safe fallbacks for fields not currently present in the database table.
 */
export function mapSupabaseInstitutionToFrontend(row: SupabaseInstitutionRow): Institution {
  const rawId = (row.id || '').trim();
  const rawName = (row.name || '').trim();
  const rawType = (row.institution_type || '').trim().toLowerCase();
  const rawAddress = (row.address || '').trim();

  // Normalize institution type to existing frontend union
  let normalizedType: Institution['institutionType'] = 'Autonomous Institute';
  if (rawType.includes('affiliated')) {
    normalizedType = 'Affiliated Technical Campus';
  } else if (rawType.includes('aided') || rawType.includes('government')) {
    normalizedType = 'Government Aided';
  } else if (rawType.includes('private') || rawType.includes('unaided')) {
    normalizedType = 'Private Unaided';
  } else if (rawType.includes('autonomous')) {
    normalizedType = 'Autonomous Institute';
  }

  // Derive city and state from address if available
  let city = 'Mumbai';
  let state = 'Maharashtra';
  if (rawAddress) {
    const parts = rawAddress.split(',').map((p) => p.trim());
    if (parts.length >= 2) {
      city = parts[parts.length - 2] || 'Mumbai';
      state = parts[parts.length - 1] || 'Maharashtra';
    } else if (parts.length === 1 && parts[0]) {
      city = parts[0];
    }
  }

  // Derive a clean, readable institution code if not stored in DB
  const codeAlphanumeric = rawName
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
  const derivedCode = rawId.startsWith('INST-')
    ? rawId
    : `INST-${codeAlphanumeric || 'COLLEGE'}`;

  // Safe fallback AICTE permanent ID
  const numericSuffix = rawId.replace(/[^0-9]/g, '').padEnd(10, '0').slice(0, 10);
  const derivedAicteId = `1-${numericSuffix || '4092817311'}`;

  return {
    id: rawId,
    name: rawName || 'Educational Institution',
    code: derivedCode,
    aictePermanentId: derivedAicteId,
    city,
    state,
    establishedYear: 1984,
    affiliatedUniversity: 'University of Mumbai',
    institutionType: normalizedType,
    representativeName: '',
    representativeEmail: '',
  };
}

/**
 * Normalizes a raw department name into an academic department code.
 */
export function deriveDepartmentCode(rawName: string): string {
  const trimmed = (rawName || '').trim().toUpperCase();
  if (trimmed.includes('COMPUTER') || trimmed.includes('CMPN')) return 'CMPN';
  if (trimmed.includes('INFORMATION TECH') || trimmed === 'IT') return 'IT';
  if (trimmed.includes('AUTOMATION') || trimmed.includes('ROBOTICS') || trimmed === 'AURO') return 'AURO';
  if (trimmed.includes('ELECTRONICS') || trimmed.includes('TELECOM') || trimmed === 'EXTC') return 'EXTC';
  if (trimmed.includes('ARTIFICIAL') || trimmed.includes('DATA SCIENCE') || trimmed === 'AIDS') return 'AIDS';

  // Fallback: extract uppercase acronym or first 4 chars
  const letters = trimmed.replace(/[^A-Z]/g, '');
  return letters.slice(0, 4) || 'GEN';
}

/**
 * Maps a confirmed database department row into an enriched record.
 */
export function mapSupabaseDepartmentToFrontend(row: SupabaseDepartmentRow): SupabaseDepartmentRecord {
  const code = deriveDepartmentCode(row.name);
  return {
    id: row.id,
    institutionId: row.institution_id,
    name: row.name,
    code,
    status: row.status || 'Active',
  };
}

/**
 * Normalizes a division name (e.g. 'Division A', 'Div-A', 'A') to a standard division code ('A', 'B', 'C').
 */
export function deriveDivisionCode(rawName: string): string {
  const trimmed = (rawName || '').trim().toUpperCase();
  if (!trimmed) return 'A';

  // Check if single letter 'A', 'B', etc.
  if (/^[A-Z]$/.test(trimmed)) {
    return trimmed;
  }

  // Check patterns like 'Division A', 'Div-A', 'Div B'
  const divMatch = trimmed.match(/DIV(?:ISION)?[\s\-_]*([A-Z])/i);
  if (divMatch) {
    return divMatch[1].toUpperCase();
  }

  // Check trailing word/letter like 'Class A' or 'Section B'
  const trailingMatch = trimmed.match(/[\s\-_]([A-Z])$/);
  if (trailingMatch) {
    return trailingMatch[1];
  }

  return trimmed.slice(0, 1) || 'A';
}

/**
 * Maps a confirmed database division row into an enriched record.
 */
export function mapSupabaseDivisionToFrontend(row: SupabaseDivisionRow): SupabaseDivisionRecord {
  const divisionCode = deriveDivisionCode(row.name);
  return {
    id: row.id,
    departmentId: row.department_id,
    institutionId: row.institution_id,
    name: row.name,
    divisionCode,
    status: row.status || 'Active',
  };
}

/**
 * Result container for reference data fetching.
 */
export interface ReferenceFetchResult<T> {
  data: T;
  isUsingFallback: boolean;
  error: Error | null;
}

/**
 * Fetches institutions from Supabase with safe fallback to seed institutions.
 * Employs confirmed columns: id, name, institution_type, address, status, created_at, updated_at
 */
export async function fetchInstitutionsFromSupabase(): Promise<ReferenceFetchResult<Institution[]>> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: SEED_INSTITUTIONS,
      isUsingFallback: true,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('institutions')
      .select('id, name, institution_type, address, status, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[VERIDEX Supabase] Failed to fetch institutions from database. Using fallback seed data.', error.message);
      return {
        data: SEED_INSTITUTIONS,
        isUsingFallback: true,
        error: new Error(error.message),
      };
    }

    if (!data || data.length === 0) {
      // Table exists but has 0 records; fallback to seed institutions so the UI remains fully usable
      return {
        data: SEED_INSTITUTIONS,
        isUsingFallback: true,
        error: null,
      };
    }

    const mapped = (data as SupabaseInstitutionRow[])
      .filter(isSupabaseInstitutionRow)
      .map(mapSupabaseInstitutionToFrontend);

    if (mapped.length === 0) {
      return {
        data: SEED_INSTITUTIONS,
        isUsingFallback: true,
        error: null,
      };
    }

    return {
      data: mapped,
      isUsingFallback: false,
      error: null,
    };
  } catch (err) {
    console.warn('[VERIDEX Supabase] Unexpected error fetching institutions:', err);
    return {
      data: SEED_INSTITUTIONS,
      isUsingFallback: true,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetches departments from Supabase with safe fallback to standard academic departments.
 * Employs confirmed columns: id, institution_id, name, status, created_at
 */
export async function fetchDepartmentsFromSupabase(
  institutionId?: string
): Promise<ReferenceFetchResult<{ codes: AcademicDepartment[]; records: SupabaseDepartmentRecord[] }>> {
  const fallbackResult = {
    codes: [...ACADEMIC_DEPARTMENTS] as AcademicDepartment[],
    records: [],
  };

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: fallbackResult,
      isUsingFallback: true,
      error: null,
    };
  }

  try {
    let query = supabase
      .from('departments')
      .select('id, institution_id, name, status, created_at')
      .order('name', { ascending: true });

    if (institutionId) {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        data: fallbackResult,
        isUsingFallback: true,
        error: error ? new Error(error.message) : null,
      };
    }

    const records = (data as SupabaseDepartmentRow[]).map(mapSupabaseDepartmentToFrontend);
    const codes = Array.from(new Set(records.map((r) => r.code))) as AcademicDepartment[];

    return {
      data: {
        codes: codes.length > 0 ? codes : fallbackResult.codes,
        records,
      },
      isUsingFallback: false,
      error: null,
    };
  } catch (err) {
    return {
      data: fallbackResult,
      isUsingFallback: true,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Fetches divisions from Supabase with safe fallback to standard academic divisions.
 * Employs confirmed columns: id, department_id, institution_id, name, status, created_at
 */
export async function fetchDivisionsFromSupabase(params?: {
  institutionId?: string;
  departmentId?: string;
}): Promise<ReferenceFetchResult<{ codes: AcademicDivision[]; records: SupabaseDivisionRecord[] }>> {
  const fallbackResult = {
    codes: [...ACADEMIC_DIVISIONS] as AcademicDivision[],
    records: [],
  };

  if (!isSupabaseConfigured || !supabase) {
    return {
      data: fallbackResult,
      isUsingFallback: true,
      error: null,
    };
  }

  try {
    let query = supabase
      .from('divisions')
      .select('id, department_id, institution_id, name, status, created_at')
      .order('name', { ascending: true });

    if (params?.institutionId) {
      query = query.eq('institution_id', params.institutionId);
    }
    if (params?.departmentId) {
      query = query.eq('department_id', params.departmentId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        data: fallbackResult,
        isUsingFallback: true,
        error: error ? new Error(error.message) : null,
      };
    }

    const records = (data as SupabaseDivisionRow[]).map(mapSupabaseDivisionToFrontend);
    const codes = Array.from(new Set(records.map((r) => r.divisionCode))) as AcademicDivision[];

    return {
      data: {
        codes: codes.length > 0 ? codes : fallbackResult.codes,
        records,
      },
      isUsingFallback: false,
      error: null,
    };
  } catch (err) {
    return {
      data: fallbackResult,
      isUsingFallback: true,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * React hook to manage live reference data with automatic fallback to seed constants.
 * Prevents unnecessary re-renders with request deduplication and ref caching.
 */
export function useReferenceData() {
  const [institutions, setInstitutions] = useState<Institution[]>(SEED_INSTITUTIONS);
  const [departments, setDepartments] = useState<AcademicDepartment[]>([...ACADEMIC_DEPARTMENTS]);
  const [departmentRecords, setDepartmentRecords] = useState<SupabaseDepartmentRecord[]>([]);
  const [divisions, setDivisions] = useState<AcademicDivision[]>([...ACADEMIC_DIVISIONS]);
  const [divisionRecords, setDivisionRecords] = useState<SupabaseDivisionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const isFetchingRef = useRef<boolean>(false);

  const loadReferenceData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const [instResult, deptResult, divResult] = await Promise.all([
        fetchInstitutionsFromSupabase(),
        fetchDepartmentsFromSupabase(),
        fetchDivisionsFromSupabase(),
      ]);

      if (!isMountedRef.current) return;

      setInstitutions(instResult.data);
      setDepartments(deptResult.data.codes);
      setDepartmentRecords(deptResult.data.records);
      setDivisions(divResult.data.codes);
      setDivisionRecords(divResult.data.records);

      const usingFallback =
        instResult.isUsingFallback &&
        deptResult.isUsingFallback &&
        divResult.isUsingFallback;
      setIsUsingFallback(usingFallback);

      const errorMessage =
        instResult.error?.message ||
        deptResult.error?.message ||
        divResult.error?.message ||
        null;
      setFetchError(errorMessage);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('[VERIDEX Supabase] Reference data load error:', err);
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadReferenceData();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadReferenceData]);

  return {
    institutions,
    departments,
    departmentRecords,
    divisions,
    divisionRecords,
    isLoading,
    isSupabaseConfigured,
    isUsingFallback,
    fetchError,
    refreshReferenceData: loadReferenceData,
  };
}
