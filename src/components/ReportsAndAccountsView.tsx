import React, { useState, useMemo } from 'react';
import {
  Download,
  History,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileBarChart,
} from 'lucide-react';
import {
  AccountStatus,
  ApplicationRecord,
  AuditEvent,
  DocumentRecord,
  Institution,
  Role,
  UserAccount,
} from '../types/portal';
import {
  calculateAgeFromDob,
  calculateExpiryDetails,
  canUserAccessApplication,
  canUserAccessDocument,
  canUserPerformAdminAction,
  REFERENCE_DATE,
  validateAccountUniqueness,
} from '../lib/domain';

interface ReportsAndAccountsViewProps {
  mode: 'reports' | 'accounts';
  currentUser: UserAccount;
  users: UserAccount[];
  institutions: Institution[];
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  auditEvents: AuditEvent[];
  onCreateAccount: (newUser: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onUpdateAccountStatus: (userId: string, status: AccountStatus) => void;
  onOpenApplication: (appId: string) => void;
  onOpenDocument: (docId: string) => void;
}

export const ReportsAndAccountsView: React.FC<ReportsAndAccountsViewProps> = ({
  mode,
  currentUser,
  users,
  institutions,
  applications,
  documents,
  auditEvents,
  onCreateAccount,
  onUpdateAccountStatus,
  onOpenApplication,
  onOpenDocument,
}) => {
  // Reports Filters
  const [auditActorFilter, setAuditActorFilter] = useState<'all' | Role>('all');

  // Admin Account Creation State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('1986-05-14');
  const [gender, setGender] = useState<UserAccount['gender']>('Prefer not to say');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('Active');
  const [assignedRole, setAssignedRole] = useState<Role>('institutional_rep');
  const [password, setPassword] = useState('PortalAuth#2026');
  const [institutionId, setInstitutionId] = useState('INST-PUNE-104');

  // Role-specific fields
  const [designation, setDesignation] = useState('Deputy Registrar — Academic Compliance');
  const [authStatus, setAuthStatus] = useState<NonNullable<UserAccount['authorizationStatus']>>(
    'Verified Nodal Officer'
  );
  const [permissionLevel, setPermissionLevel] = useState<NonNullable<UserAccount['permissionLevel']>>(
    'Regional Reviewer (Level 2)'
  );
  const [employeeId, setEmployeeId] = useState('VIT-FAC-2026-112');
  const [department, setDepartment] = useState('Department of Computer Engineering');
  const [joiningDate, setJoiningDate] = useState('2022-07-01');
  const [rollNumber, setRollNumber] = useState('VIT24CE088');
  const [course, setCourse] = useState('B.Tech — Computer Engineering');
  const [yearSemester, setYearSemester] = useState('Third Year / Semester V');

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; phone?: string }>({});
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const calculatedAge = useMemo(() => calculateAgeFromDob(dob, REFERENCE_DATE), [dob]);

  const authorizedApps = useMemo(
    () => applications.filter((a) => canUserAccessApplication(currentUser, a)),
    [applications, currentUser]
  );

  const authorizedDocs = useMemo(
    () => documents.filter((d) => canUserAccessDocument(currentUser, d)),
    [documents, currentUser]
  );

  const filteredAuditEvents = useMemo(() => {
    return auditEvents.filter((ev) => {
      if (auditActorFilter !== 'all' && ev.actorRole !== auditActorFilter) return false;
      return true;
    });
  }, [auditEvents, auditActorFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Application ID',
      'Institution',
      'Category',
      'Submitted Date',
      'Status',
      'Decision Outcome',
      'Linked Documents',
    ];
    const rows = authorizedApps.map((a) => [
      a.id,
      `"${a.institutionName}"`,
      `"${a.category}"`,
      a.submittedDate,
      `"${a.status}"`,
      `"${a.decisionOutcome || 'Pending'}"`,
      a.documentIds.length,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AICTE_Compliance_Summary_${REFERENCE_DATE}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setCreateSuccess(null);

    if (!canUserPerformAdminAction(currentUser)) {
      setFormError('Unauthorized: Only active Administrator accounts can provision user accounts.');
      return;
    }

    if (!fullName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Initial password must be at least 6 characters.');
      return;
    }

    const uniqueness = validateAccountUniqueness({ username, phone }, users);
    if (!uniqueness.valid) {
      setFieldErrors(uniqueness.errors);
      setFormError(
        uniqueness.errors.username ||
          uniqueness.errors.phone ||
          'Username and phone number must be globally unique.'
      );
      return;
    }

    const selectedInst = institutions.find((i) => i.id === institutionId);

    onCreateAccount({
      fullName: fullName.trim(),
      username: username.trim(),
      phone: phone.trim(),
      normalizedPhone: uniqueness.normalizedPhone,
      email: email.trim() || `${username.trim()}@institution-demo.edu.in`,
      dob,
      gender,
      status: accountStatus,
      role: assignedRole,
      password,
      isDemoAccount: false,
      institutionId: assignedRole === 'admin' ? undefined : selectedInst?.id,
      institutionName: assignedRole === 'admin' ? undefined : selectedInst?.name,
      officialInstitutionCode: assignedRole === 'admin' ? undefined : selectedInst?.code,
      designation: assignedRole === 'student' ? undefined : designation.trim(),
      authorizationStatus: assignedRole === 'institutional_rep' ? authStatus : undefined,
      permissionLevel: assignedRole === 'admin' ? permissionLevel : undefined,
      employeeId: assignedRole === 'faculty' ? employeeId.trim() : undefined,
      department:
        assignedRole === 'faculty' || assignedRole === 'student' ? department.trim() : undefined,
      joiningDate: assignedRole === 'faculty' ? joiningDate : undefined,
      rollNumber: assignedRole === 'student' ? rollNumber.trim() : undefined,
      course: assignedRole === 'student' ? course.trim() : undefined,
      yearSemester: assignedRole === 'student' ? yearSemester.trim() : undefined,
    });

    setCreateSuccess(
      `Provisioned ${assignedRole} account "${username.trim()}" (Normalized Phone: ${uniqueness.normalizedPhone}).`
    );
    setFullName('');
    setUsername('');
    setPhone('');
    setEmail('');
  };

  if (mode === 'accounts') {
    if (!canUserPerformAdminAction(currentUser)) {
      return (
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-800 dark:text-red-200">
          <strong>Access Restricted:</strong> Account provisioning and role management are restricted to authorized AICTE Administrator accounts.
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Admin-Controlled Account Provisioning &amp; Uniqueness Enforcement
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Account Creation &amp; Role Management
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Usernames and normalized phone numbers are enforced as globally unique across all roles. Age is automatically calculated from Date of Birth.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 6 Cols: Create New Account Form */}
          <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              <span>Provision New Portal Account</span>
            </h2>

            {formError && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {createSuccess && (
              <div
                role="status"
                className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="acc-role" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    id="acc-role"
                    value={assignedRole}
                    onChange={(e) => setAssignedRole(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="institutional_rep">Institutional Representative</option>
                    <option value="faculty">Faculty / Staff</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin (Authorized Provisioning)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="acc-status" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    id="acc-status"
                    value={accountStatus}
                    onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending Activation">Pending Activation</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="acc-fullname" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="acc-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Nandini Deshpande"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label htmlFor="acc-username" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Globally Unique Username *
                  </label>
                  <input
                    id="acc-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rep.deshpande"
                    className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 font-mono-tabular ${
                      fieldErrors.username
                        ? 'border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="acc-phone" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unique Phone Number *
                  </label>
                  <input
                    id="acc-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98229 44110"
                    className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 font-mono-tabular ${
                      fieldErrors.phone
                        ? 'border-red-500'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  />
                </div>

                <div>
                  <label htmlFor="acc-dob" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth (Calculates Age)
                  </label>
                  <input
                    id="acc-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                  <span className="text-[11px] text-slate-500 font-mono-tabular mt-0.5 block">
                    Calculated Age: {calculatedAge !== null ? `${calculatedAge} years` : '—'}
                  </span>
                </div>

                <div>
                  <label htmlFor="acc-email" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Official Email Address
                  </label>
                  <input
                    id="acc-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institution.edu.in"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Role-Specific Fields */}
              {assignedRole !== 'admin' && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <div>
                    <label htmlFor="acc-inst" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Affiliated Institution
                    </label>
                    <select
                      id="acc-inst"
                      value={institutionId}
                      onChange={(e) => setInstitutionId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {assignedRole === 'institutional_rep' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Authorization Status
                        </label>
                        <select
                          value={authStatus}
                          onChange={(e) =>
                            setAuthStatus(
                              e.target.value as NonNullable<UserAccount['authorizationStatus']>
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                        >
                          <option value="Verified Nodal Officer">Verified Nodal Officer</option>
                          <option value="Provisional Signatory">Provisional Signatory</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {assignedRole === 'faculty' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Employee ID
                        </label>
                        <input
                          type="text"
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>
                  )}

                  {assignedRole === 'student' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Roll / PRN Number
                        </label>
                        <input
                          type="text"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Course
                        </label>
                        <input
                          type="text"
                          value={course}
                          onChange={(e) => setCourse(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Year / Semester
                        </label>
                        <input
                          type="text"
                          value={yearSemester}
                          onChange={(e) => setYearSemester(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
              >
                Validate Uniqueness &amp; Provision Account
              </button>
            </form>
          </section>

          {/* Right 6 Cols: Registered Accounts Directory */}
          <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Registered Accounts Registry ({users.length})
              </h2>
              <span className="text-xs text-slate-500 font-mono-tabular">
                Global Phone &amp; Username Index
              </span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((u) => {
                const age = calculateAgeFromDob(u.dob, REFERENCE_DATE);
                return (
                  <div key={u.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {u.fullName}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-blue-700 dark:text-blue-400 font-medium">
                          {u.role}
                        </span>
                        {u.isDemoAccount && (
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono-tabular">
                            [Demo]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-tabular">
                        @{u.username} · Normalized Phone: {u.normalizedPhone} · Age: {age ?? '—'}y
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        {u.institutionName || u.designation}
                      </div>
                    </div>

                    <select
                      aria-label={`Change account status for ${u.fullName}`}
                      value={u.status}
                      onChange={(e) =>
                        onUpdateAccountStatus(u.id, e.target.value as AccountStatus)
                      }
                      disabled={u.id === currentUser.id}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-[11px] font-medium"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending Activation">Pending Activation</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // REPORTS & AUDIT HISTORY VIEW
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Compliance Analytics &amp; Prototype Activity Log
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Reports &amp; Activity History
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            All summaries reflect live application state. Prototype activity history is stored locally for demonstration and is distinct from a tamper-proof WORM production audit log.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Compliance Summary CSV</span>
        </button>
      </div>

      {/* Summary Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Application Status Distribution */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
            Applications by Status ({authorizedApps.length})
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {(
              [
                'Decision Recorded',
                'Under Manual Review',
                'Pending Verification',
                'Automated Checks Complete',
                'Additional Information Required',
                'Submitted',
                'Draft',
              ] as const
            ).map((st) => {
              const count = authorizedApps.filter((a) => a.status === st).length;
              return (
                <div key={st} className="py-2 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">{st}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Document Verification Distribution */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
            Document Verification Status ({authorizedDocs.length})
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {(
              [
                'Verified (Simulated)',
                'Pending',
                'Failed (Simulated)',
                'Not Checked',
              ] as const
            ).map((st) => {
              const count = authorizedDocs.filter((d) => d.issuerVerificationStatus === st).length;
              return (
                <div key={st} className="py-2 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">{st}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Expiry Risk Summary */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
            Certificate Expiry Risk Breakdown
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {(['Expired', 'Expiring Soon', 'Valid', 'No Expiry'] as const).map((st) => {
              const count = authorizedDocs.filter(
                (d) => calculateExpiryDetails(d.expiryDate, REFERENCE_DATE).status === st
              ).length;
              return (
                <div key={st} className="py-2 flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">{st}</span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Prototype Activity History Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
              Prototype Activity &amp; Review History ({filteredAuditEvents.length})
            </h2>
            <p className="text-xs text-slate-500">
              Chronological log of status changes, review notes, document uploads, and account actions recorded during this session.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {(['all', 'admin', 'institutional_rep', 'faculty'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setAuditActorFilter(role)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize cursor-pointer ${
                  auditActorFilter === role
                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {role === 'all' ? 'All Roles' : role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Acting Account</th>
                <th className="py-3 px-4">Action Recorded</th>
                <th className="py-3 px-4">Target Record</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredAuditEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono-tabular text-slate-500 whitespace-nowrap">
                    {ev.timestamp}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {ev.actorName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono-tabular">
                      @{ev.actorUsername} ({ev.actorRole})
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {ev.action}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular whitespace-nowrap">
                    {ev.targetId.startsWith('APP-') ? (
                      <button
                        type="button"
                        onClick={() => onOpenApplication(ev.targetId)}
                        className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        {ev.targetId}
                      </button>
                    ) : ev.targetId.startsWith('DOC-') ? (
                      <button
                        type="button"
                        onClick={() => onOpenDocument(ev.targetId)}
                        className="text-blue-700 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        {ev.targetId}
                      </button>
                    ) : (
                      ev.targetId
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {ev.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
