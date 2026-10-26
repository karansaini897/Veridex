import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveDepartmentCode,
  deriveDivisionCode,
  mapSupabaseDepartmentToFrontend,
  mapSupabaseDivisionToFrontend,
  mapSupabaseInstitutionToFrontend,
  fetchInstitutionsFromSupabase,
  fetchDepartmentsFromSupabase,
  fetchDivisionsFromSupabase,
} from './referenceData';
import { SEED_INSTITUTIONS } from '../data/seedData';
import { ACADEMIC_DEPARTMENTS, ACADEMIC_DIVISIONS } from './domain';

test('mapSupabaseInstitutionToFrontend correctly converts confirmed database columns to frontend Institution', () => {
  const row = {
    id: 'inst-123',
    name: 'Veermata Jijabai Technological Institute',
    institution_type: 'Government Aided',
    address: 'Matunga, Mumbai, Maharashtra',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  };

  const mapped = mapSupabaseInstitutionToFrontend(row);

  assert.equal(mapped.id, 'inst-123');
  assert.equal(mapped.name, 'Veermata Jijabai Technological Institute');
  assert.equal(mapped.institutionType, 'Government Aided');
  assert.equal(mapped.city, 'Mumbai');
  assert.equal(mapped.state, 'Maharashtra');
  assert.equal(typeof mapped.code, 'string');
  assert.ok(mapped.code.length > 0);
  assert.equal(typeof mapped.aictePermanentId, 'string');
  assert.ok(mapped.aictePermanentId.startsWith('1-'));
  assert.equal(typeof mapped.establishedYear, 'number');
  assert.equal(typeof mapped.affiliatedUniversity, 'string');
});

test('mapSupabaseInstitutionToFrontend provides safe fallbacks when optional fields are null or empty', () => {
  const minimalRow = {
    id: 'INST-MINIMAL-01',
    name: 'Minimal Test College',
    institution_type: null,
    address: null,
    status: null,
    created_at: null,
    updated_at: null,
  };

  const mapped = mapSupabaseInstitutionToFrontend(minimalRow);

  assert.equal(mapped.id, 'INST-MINIMAL-01');
  assert.equal(mapped.name, 'Minimal Test College');
  assert.equal(mapped.institutionType, 'Autonomous Institute'); // default fallback
  assert.equal(mapped.code, 'INST-MINIMAL-01');
  assert.ok(mapped.city.length > 0);
  assert.ok(mapped.state.length > 0);
  assert.equal(mapped.representativeName, '');
  assert.equal(mapped.representativeEmail, '');
});

test('deriveDepartmentCode and mapSupabaseDepartmentToFrontend correctly map department codes', () => {
  assert.equal(deriveDepartmentCode('Computer Engineering'), 'CMPN');
  assert.equal(deriveDepartmentCode('Information Technology'), 'IT');
  assert.equal(deriveDepartmentCode('Automation and Robotics'), 'AURO');
  assert.equal(deriveDepartmentCode('Electronics and Telecommunication'), 'EXTC');
  assert.equal(deriveDepartmentCode('Artificial Intelligence & Data Science'), 'AIDS');

  const deptRow = {
    id: 'dept-01',
    institution_id: 'inst-123',
    name: 'Computer Engineering',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  };

  const mapped = mapSupabaseDepartmentToFrontend(deptRow);
  assert.equal(mapped.id, 'dept-01');
  assert.equal(mapped.institutionId, 'inst-123');
  assert.equal(mapped.name, 'Computer Engineering');
  assert.equal(mapped.code, 'CMPN');
  assert.equal(mapped.status, 'Active');
});

test('deriveDivisionCode and mapSupabaseDivisionToFrontend correctly map division codes', () => {
  assert.equal(deriveDivisionCode('Division A'), 'A');
  assert.equal(deriveDivisionCode('Div-B'), 'B');
  assert.equal(deriveDivisionCode('C'), 'C');

  const divRow = {
    id: 'div-01',
    department_id: 'dept-01',
    institution_id: 'inst-123',
    name: 'Division A',
    status: 'Active',
    created_at: '2026-01-01T00:00:00Z',
  };

  const mapped = mapSupabaseDivisionToFrontend(divRow);
  assert.equal(mapped.id, 'div-01');
  assert.equal(mapped.departmentId, 'dept-01');
  assert.equal(mapped.institutionId, 'inst-123');
  assert.equal(mapped.name, 'Division A');
  assert.equal(mapped.divisionCode, 'A');
  assert.equal(mapped.status, 'Active');
});

test('fetchInstitutionsFromSupabase falls back to SEED_INSTITUTIONS when Supabase table is empty or pending rows', async () => {
  const result = await fetchInstitutionsFromSupabase();
  assert.ok(result.data.length >= 6);
  assert.equal(result.isUsingFallback, true);
  assert.equal(result.data[0].id, SEED_INSTITUTIONS[0].id);
});

test('fetchDepartmentsFromSupabase and fetchDivisionsFromSupabase fall back to default constants when empty', async () => {
  const deptResult = await fetchDepartmentsFromSupabase();
  assert.equal(deptResult.isUsingFallback, true);
  assert.deepEqual(deptResult.data.codes, [...ACADEMIC_DEPARTMENTS]);

  const divResult = await fetchDivisionsFromSupabase();
  assert.equal(divResult.isUsingFallback, true);
  assert.deepEqual(divResult.data.codes, [...ACADEMIC_DIVISIONS]);
});
