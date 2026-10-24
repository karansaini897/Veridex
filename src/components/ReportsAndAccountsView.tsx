import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  XCircle,
  MessageSquareWarning,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  AcademicDepartment,
  AcademicDivision,
  AcademicYear,
  AccountApprovalRequest,
  AccountStatus,
  ApplicationRecord,
  ApprovalRequestStatus,
  AuditEvent,
  DocumentRecord,
  Institution,
  Role,
  UserAccount,
} from '../types/portal';
import {
  ACADEMIC_DEPARTMENTS,
  ACADEMIC_DIVISIONS,
  ACADEMIC_YEARS,
  calculateAgeFromDob,
  calculateExpiryDetails,
  canUserAccessApplication,
  canUserAccessDocument,
  canUserActionApprovalRequest,
  canUserPerformAdminAction,
  canUserViewApprovalRequest,
  computeCredentialDigest,
  formatRoleDisplayName,
  getLocalTodayDate,
  validateAccountUniqueness,
} from '../lib/domain';
import {
  cardEntranceVariants,
  sectionEntranceVariants,
  staggerContainerVariants,
} from '../lib/motion';
import { AnimatedMetricValue, StatusBadge } from './StatusPrimitives';

interface ReportsAndAccountsViewProps {
  mode: 'reports' | 'accounts';
  currentUser: UserAccount;
  users: UserAccount[];
  approvalRequests: AccountApprovalRequest[];
  institutions: Institution[];
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  auditEvents: AuditEvent[];
  onCreateAccount: (newUser: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onUpdateAccountStatus: (userId: string, status: AccountStatus) => void;
  onDecideApprovalRequest: (
    requestId: string,
    decision: 'Approved' | 'Rejected' | 'Correction Requested',
    note: string
  ) => void;
  onOpenApplication: (appId: string) => void;
  onOpenDocument: (docId: string) => void;
}

export const ReportsAndAccountsView: React.FC<ReportsAndAccountsViewProps> = ({
  mode,
  currentUser,
  users,
  approvalRequests,
  institutions,
  applications,
  documents,
  auditEvents,
  onCreateAccount,
  onUpdateAccountStatus,
  onDecideApprovalRequest,
  onOpenApplication,
  onOpenDocument,
}) => {
  // Reports Filters
  const [auditActorFilter, setAuditActorFilter] = useState<'all' | Role>('all');

  // Approval Queue Filters & Decision Modal State
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | ApprovalRequestStatus>('all');
  const [activeDecisionReqId, setActiveDecisionReqId] = useState<string | null>(null);
  const [pendingDecisionType, setPendingDecisionType] = useState<
    'Approved' | 'Rejected' | 'Correction Requested'
  >('Approved');
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  const todayStr = getLocalTodayDate();

  // Admin Account Creation State
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('1986-05-14');
  const [gender, setGender] = useState<UserAccount['gender']>('Prefer not to say');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('Active');
  const [assignedRole, setAssignedRole] = useState<Role>('institutional_rep');
  const [institutionId, setInstitutionId] = useState('INST-VESIT-104');

  const deriveFirstnameLastname = (rawName: string): string => {
    const cleaned = rawName
      .replace(/\b(dr|prof|mr|mrs|ms|shri|smt)\.?\s+/gi, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z\s]/g, '');
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
  };

  // Role-specific fields
  const [designation, setDesignation] = useState('Institutional Manager & Compliance Signatory');
  const [authStatus, setAuthStatus] = useState<NonNullable<UserAccount['authorizationStatus']>>(
    'Verified Nodal Officer'
  );
  const [permissionLevel, setPermissionLevel] = useState<NonNullable<UserAccount['permissionLevel']>>(
    'Regional Reviewer (Level 2)'
  );
  const [academicDepartment, setAcademicDepartment] = useState<AcademicDepartment>('CMPN');
  const [academicYear, setAcademicYear] = useState<AcademicYear>('Second Year');
  const [division, setDivision] = useState<AcademicDivision>('A');
  const [classTeacherDivision, setClassTeacherDivision] = useState<AcademicDivision>('A');

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; phone?: string }>({});
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const calculatedAge = useMemo(() => calculateAgeFromDob(dob, todayStr), [dob, todayStr]);

  const authorizedApps = useMemo(
    () => applications.filter((a) => canUserAccessApplication(currentUser, a)),
    [applications, currentUser]
  );

  const authorizedDocs = useMemo(
    () => documents.filter((d) => canUserAccessDocument(currentUser, d)),
    [documents, currentUser]
  );

  const visibleApprovalRequests = useMemo(
    () => approvalRequests.filter((r) => canUserViewApprovalRequest(currentUser, r)),
    [approvalRequests, currentUser]
  );

  const filteredApprovalRequests = useMemo(
    () =>
      visibleApprovalRequests.filter((r) =>
        queueStatusFilter === 'all' ? true : r.status === queueStatusFilter
      ),
    [visibleApprovalRequests, queueStatusFilter]
  );

  const actionablePendingCount = useMemo(
    () =>
      visibleApprovalRequests.filter((r) => canUserActionApprovalRequest(currentUser, r)).length,
    [visibleApprovalRequests, currentUser]
  );

  const filteredAuditEvents = useMemo(() => {
    const authAppIds = new Set(authorizedApps.map((a) => a.id));
    const authDocIds = new Set(authorizedDocs.map((d) => d.id));
    const authReqIds = new Set(visibleApprovalRequests.map((r) => r.id));
    return auditEvents.filter((ev) => {
      if (auditActorFilter !== 'all' && ev.actorRole !== auditActorFilter) return false;
      if (currentUser.role !== 'admin') {
        const isOwnActor = ev.actorUsername === currentUser.username;
        const isAuthorizedTarget =
          authAppIds.has(ev.targetId) ||
          authDocIds.has(ev.targetId) ||
          authReqIds.has(ev.targetId) ||
          ev.targetId === currentUser.id;
        return isOwnActor || isAuthorizedTarget;
      }
      return true;
    });
  }, [
    auditEvents,
    auditActorFilter,
    currentUser,
    authorizedApps,
    authorizedDocs,
    visibleApprovalRequests,
  ]);

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
    link.download = `VERIDEX_Compliance_Summary_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmDecision = (req: AccountApprovalRequest) => {
    setDecisionError(null);
    if (
      (pendingDecisionType === 'Rejected' ||
        pendingDecisionType === 'Correction Requested') &&
      !decisionNote.trim()
    ) {
      setDecisionError(
        `A reviewer reason/note is mandatory when marking a request as "${pendingDecisionType}".`
      );
      return;
    }

    onDecideApprovalRequest(
      req.id,
      pendingDecisionType,
      decisionNote.trim() ||
        (pendingDecisionType === 'Approved'
          ? `Approved by ${currentUser.fullName} (${formatRoleDisplayName(currentUser.role)}).`
          : '')
    );

    setDecisionFeedback(
      `Recorded "${pendingDecisionType}" on registration request ${req.id} (${req.fullName}).`
    );
    setActiveDecisionReqId(null);
    setDecisionNote('');
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

    const canonicalUsername = (username.trim() || deriveFirstnameLastname(fullName)).toLowerCase();
    if (!canonicalUsername) {
      setFormError('Username in firstname.lastname format is required.');
      return;
    }

    const uniqueness = validateAccountUniqueness({ username: canonicalUsername, phone }, users);
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
      username: canonicalUsername,
      phone: phone.trim(),
      normalizedPhone: uniqueness.normalizedPhone,
      email: email.trim() || `${canonicalUsername}@vesit.example.edu.in`,
      dob,
      gender,
      status: accountStatus,
      role: assignedRole,
      credentialDigest: computeCredentialDigest(canonicalUsername),
      isSystemAccount: false,
      institutionId: assignedRole === 'admin' ? undefined : selectedInst?.id,
      institutionName: assignedRole === 'admin' ? undefined : selectedInst?.name,
      officialInstitutionCode: assignedRole === 'admin' ? undefined : selectedInst?.code,
      designation: assignedRole === 'student' ? undefined : designation.trim(),
      authorizationStatus: assignedRole === 'institutional_rep' ? authStatus : undefined,
      permissionLevel: assignedRole === 'admin' ? permissionLevel : undefined,
      department:
        assignedRole === 'faculty' || assignedRole === 'student'
          ? academicDepartment
          : undefined,
      academicDepartment:
        assignedRole === 'faculty' || assignedRole === 'student'
          ? academicDepartment
          : undefined,
      academicYear:
        assignedRole === 'faculty' || assignedRole === 'student' ? academicYear : undefined,
      yearSemester: assignedRole === 'student' ? academicYear : undefined,
      division: assignedRole === 'student' ? division : undefined,
      classTeacherDivision:
        assignedRole === 'faculty' ? classTeacherDivision : undefined,
      course: assignedRole === 'student' ? `B.Tech — ${academicDepartment}` : undefined,
    });

    setCreateSuccess(
      `Provisioned ${formatRoleDisplayName(assignedRole)} account "${canonicalUsername}" (Normalized Phone: ${uniqueness.normalizedPhone}).`
    );
    setFullName('');
    setUsername('');
    setPhone('');
    setEmail('');
  };

  if (mode === 'accounts') {
    if (currentUser.role === 'student') {
      return (
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-800 dark:text-red-200">
          <strong>Access Restricted:</strong> Account approval queues and user management are restricted to Class Teacher Faculty, Institutional Managers, and Regional Administrators.
        </div>
      );
    }

    const roleQueueDescription =
      currentUser.role === 'faculty'
        ? `Class Teacher Approval Queue for ${currentUser.institutionName} · ${currentUser.academicDepartment || currentUser.department} · ${currentUser.academicYear || 'Second Year'} · Division ${currentUser.classTeacherDivision || 'A'}`
        : currentUser.role === 'institutional_rep'
          ? `Institutional Manager Approval Queue for ${currentUser.institutionName} (Faculty & Institutional Scope)`
          : 'Regional Administrator Approval Queue (Institutional Managers & All-College Oversight)';

    return (
      <div className="space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#C2410C] dark:text-amber-400">
              Tiered Account Verification &amp; Role Provisioning
            </p>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
              {currentUser.role === 'admin'
                ? 'Account Approvals & Registry Management'
                : 'Account Registration Approvals'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {roleQueueDescription}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl liquid-glass-subtle text-xs font-semibold text-stone-800 dark:text-stone-200 border border-[#C2410C]/30">
              Actionable Pending:{' '}
              <strong className="text-[#C2410C] font-mono-tabular">
                {actionablePendingCount}
              </strong>
            </span>
          </div>
        </div>

        {decisionFeedback && (
          <div
            role="status"
            data-testid="approval-decision-feedback"
            className="p-3.5 rounded-xl bg-emerald-500/10 border border-[#046A38]/40 text-xs text-stone-900 dark:text-emerald-200 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0" />
              <span>{decisionFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setDecisionFeedback(null)}
              className="text-[11px] font-semibold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Account Approval Queue Section */}
        <motion.section
          variants={sectionEntranceVariants}
          initial="hidden"
          animate="visible"
          data-testid="account-approval-queue-section"
          className="liquid-glass rounded-2xl p-6 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/70 dark:border-stone-800 pb-4">
            <div>
              <h2 className="text-base font-display font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#046A38]" />
                <span>
                  Role-Scoped Account Approval Requests ({filteredApprovalRequests.length})
                </span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                Student → Class Teacher Faculty · Faculty → Institutional Manager · Institutional Manager → Admin
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  'all',
                  'Pending Approval',
                  'Correction Requested',
                  'Approved',
                  'Rejected',
                ] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setQueueStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    queueStatusFilter === st
                      ? 'bg-[#C2410C] text-white'
                      : 'liquid-glass-subtle text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {st === 'all' ? 'All Requests' : st}
                </button>
              ))}
            </div>
          </div>

          {filteredApprovalRequests.length === 0 ? (
            <div
              data-testid="empty-approval-queue"
              className="p-8 rounded-xl liquid-glass-subtle text-center space-y-2"
            >
              <Clock className="w-6 h-6 text-[#046A38] mx-auto" />
              <div className="text-sm font-display font-bold text-stone-900 dark:text-white">
                No Registration Requests in Current Filter
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto">
                New sign-up requests routed to your role and academic scope will appear here for verification and approval.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApprovalRequests.map((req) => {
                const canAction = canUserActionApprovalRequest(currentUser, req);
                const isDecisionOpen = activeDecisionReqId === req.id;
                const reqAge = calculateAgeFromDob(req.dob, todayStr);

                return (
                  <div
                    key={req.id}
                    data-testid={`approval-request-card-${req.id}`}
                    className="p-4 sm:p-5 rounded-xl liquid-glass-subtle border border-[#C2410C]/35 space-y-3.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                            {req.id}
                          </span>
                          <span className="text-sm font-display font-bold text-stone-900 dark:text-white">
                            {req.fullName}
                          </span>
                          <span className="text-xs font-mono-tabular text-stone-600 dark:text-stone-400">
                            (@{req.username})
                          </span>
                          <StatusBadge status={req.status} size="sm" />
                          {req.noApproverAssigned && req.status === 'Pending Approval' && (
                            <StatusBadge status="No Approver Assigned" size="sm" />
                          )}
                        </div>
                        <div className="text-xs text-stone-700 dark:text-stone-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            <strong>Role:</strong> {formatRoleDisplayName(req.requestedRole)}
                          </span>
                          <span>·</span>
                          <span>
                            <strong>College:</strong> {req.institutionName} ({req.institutionId})
                          </span>
                          {req.department && (
                            <>
                              <span>·</span>
                              <span>
                                <strong>Academic Scope:</strong> {req.department} ·{' '}
                                {req.academicYear} ·{' '}
                                {req.requestedRole === 'student'
                                  ? `Division ${req.division}`
                                  : `Class Teacher Div ${req.classTeacherDivision}`}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-stone-600 dark:text-stone-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Phone: {req.normalizedPhone}</span>
                          <span>·</span>
                          <span>Email: {req.email}</span>
                          <span>·</span>
                          <span>
                            DOB: {req.dob} ({reqAge ?? '—'} yrs)
                          </span>
                          <span>·</span>
                          <span>Gender: {req.gender}</span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-[11px] font-semibold text-[#046A38] dark:text-emerald-400">
                          {req.routedApproverLabel}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-stone-500">
                          Submitted: {req.submittedAt}
                        </div>
                      </div>
                    </div>

                    {req.decisionNote && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/35 text-xs">
                        <span className="font-bold text-stone-900 dark:text-amber-200">
                          Latest Reviewer Note ({req.decidedByName || 'Approver'}):{' '}
                        </span>
                        <span className="text-stone-700 dark:text-stone-300">
                          {req.decisionNote}
                        </span>
                      </div>
                    )}

                    {/* Action Controls for Authorized Approver */}
                    {canAction && (
                      <div className="pt-2 border-t border-[#C2410C]/20 space-y-3">
                        {!isDecisionOpen ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              data-testid={`btn-open-approve-${req.id}`}
                              onClick={() => {
                                setActiveDecisionReqId(req.id);
                                setPendingDecisionType('Approved');
                                setDecisionNote('');
                                setDecisionError(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve &amp; Activate Account</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`btn-open-correction-${req.id}`}
                              onClick={() => {
                                setActiveDecisionReqId(req.id);
                                setPendingDecisionType('Correction Requested');
                                setDecisionNote('');
                                setDecisionError(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquareWarning className="w-3.5 h-3.5" />
                              <span>Request Correction</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`btn-open-reject-${req.id}`}
                              onClick={() => {
                                setActiveDecisionReqId(req.id);
                                setPendingDecisionType('Rejected');
                                setDecisionNote('');
                                setDecisionError(null);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject Request</span>
                            </button>
                          </div>
                        ) : (
                          <div
                            data-testid={`decision-confirm-panel-${req.id}`}
                            className="p-3.5 rounded-xl bg-[#FCF9F2] dark:bg-stone-900 border-2 border-[#C2410C]/50 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-stone-900 dark:text-white">
                                Confirm Action: {pendingDecisionType} for {req.fullName}
                              </span>
                              <StatusBadge status={pendingDecisionType} size="sm" />
                            </div>

                            {decisionError && (
                              <div
                                role="alert"
                                className="p-2.5 rounded-lg bg-red-500/10 border border-red-400 text-xs text-red-800 dark:text-red-200"
                              >
                                {decisionError}
                              </div>
                            )}

                            <div>
                              <label
                                htmlFor={`decision-note-${req.id}`}
                                className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                              >
                                {pendingDecisionType === 'Approved'
                                  ? 'Approval Note (Optional)'
                                  : `Mandatory Reason / Note for ${pendingDecisionType} *`}
                              </label>
                              <input
                                id={`decision-note-${req.id}`}
                                type="text"
                                value={decisionNote}
                                onChange={(e) => setDecisionNote(e.target.value)}
                                placeholder={
                                  pendingDecisionType === 'Approved'
                                    ? 'Verified enrollment / departmental assignment...'
                                    : 'Specify reason or required field correction...'
                                }
                                className="w-full px-3 py-2 text-xs rounded-lg border border-[#C2410C]/40 bg-white dark:bg-stone-950"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDecisionReqId(null);
                                  setDecisionError(null);
                                }}
                                className="px-3 py-1.5 rounded-lg liquid-glass-subtle text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                data-testid={`btn-confirm-decision-${req.id}`}
                                onClick={() => handleConfirmDecision(req)}
                                className="px-4 py-1.5 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold cursor-pointer"
                              >
                                Confirm {pendingDecisionType}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Admin-Only Direct Provisioning & Full Account Directory */}
        {canUserPerformAdminAction(currentUser) && (
          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left 6 Cols: Create New Account Form */}
            <motion.section
              variants={cardEntranceVariants}
              className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#046A38]" />
                <span>Direct Admin Account Provisioning</span>
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
                      <option value="institutional_rep">Institutional Manager</option>
                      <option value="faculty">Faculty</option>
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
                      onChange={(e) => {
                        const val = e.target.value;
                        setFullName(val);
                        setUsername(deriveFirstnameLastname(val));
                      }}
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
                      placeholder="e.g. nandini.deshpande"
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
                        College / Institution
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

                    {(assignedRole === 'faculty' || assignedRole === 'student') && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Department
                          </label>
                          <select
                            value={academicDepartment}
                            onChange={(e) =>
                              setAcademicDepartment(e.target.value as AcademicDepartment)
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          >
                            {ACADEMIC_DEPARTMENTS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Academic Year
                          </label>
                          <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value as AcademicYear)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          >
                            {ACADEMIC_YEARS.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                            {assignedRole === 'student' ? 'Division' : 'Class Teacher Div'}
                          </label>
                          <select
                            value={
                              assignedRole === 'student' ? division : classTeacherDivision
                            }
                            onChange={(e) => {
                              const val = e.target.value as AcademicDivision;
                              if (assignedRole === 'student') setDivision(val);
                              else setClassTeacherDivision(val);
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                          >
                            {ACADEMIC_DIVISIONS.map((div) => (
                              <option key={div} value={div}>
                                Division {div}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold cursor-pointer"
                >
                  Validate Uniqueness &amp; Provision Account
                </button>
              </form>
            </motion.section>

            {/* Right 6 Cols: Registered Accounts Directory */}
            <motion.section
              variants={cardEntranceVariants}
              className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                  Active Accounts Registry ({users.length})
                </h2>
                <span className="text-xs text-slate-500 font-mono-tabular">
                  Global Phone &amp; Username Index
                </span>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((u) => {
                  const age = calculateAgeFromDob(u.dob, todayStr);
                  return (
                    <div
                      key={u.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-stone-900 dark:text-white">
                            {u.fullName}
                          </span>
                          <span className="text-stone-400">·</span>
                          <span className="text-[#C2410C] dark:text-amber-400 font-semibold">
                            {formatRoleDisplayName(u.role)}
                          </span>
                          <StatusBadge status={u.status} size="sm" />
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono-tabular">
                          @{u.username} · Phone: {u.normalizedPhone} · Age: {age ?? '—'}y
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                          {u.institutionName || u.designation}
                          {(u.academicDepartment || u.department) &&
                            ` · ${u.academicDepartment || u.department}`}
                          {u.academicYear && ` · ${u.academicYear}`}
                          {u.division && ` · Div ${u.division}`}
                          {u.classTeacherDivision && ` · CT Div ${u.classTeacherDivision}`}
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
            </motion.section>
          </motion.div>
        )}
      </div>
    );
  }

  // REPORTS & AUDIT HISTORY VIEW
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Compliance Analytics &amp; Statutory Audit Trail
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Reports &amp; Audit History
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            All summaries reflect live institutional compliance records and recorded administrative actions across regional cells.
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
      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Application Status Distribution */}
        <motion.section
          variants={cardEntranceVariants}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-5 space-y-3"
        >
          <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
            Applications by Status ({authorizedApps.length})
          </h2>
          <div className="divide-y divide-stone-200/60 dark:divide-stone-800 text-xs">
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
                <div key={st} className="py-2 flex items-center justify-between gap-2">
                  <StatusBadge status={st} size="sm" />
                  <span className="font-mono-tabular font-semibold text-stone-900 dark:text-white">
                    <AnimatedMetricValue value={count} />
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Document Verification Distribution */}
        <motion.section
          variants={cardEntranceVariants}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-5 space-y-3"
        >
          <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
            Document Verification Status ({authorizedDocs.length})
          </h2>
          <div className="divide-y divide-stone-200/60 dark:divide-stone-800 text-xs">
            {(
              [
                'Verified',
                'Pending',
                'Failed',
                'Not Checked',
                'Unavailable',
              ] as const
            ).map((st) => {
              const count = authorizedDocs.filter((d) => d.issuerVerificationStatus === st).length;
              return (
                <div key={st} className="py-2 flex items-center justify-between gap-2">
                  <StatusBadge status={st} size="sm" />
                  <span className="font-mono-tabular font-semibold text-stone-900 dark:text-white">
                    <AnimatedMetricValue value={count} />
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Expiry Risk Summary */}
        <motion.section
          variants={cardEntranceVariants}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-5 space-y-3"
        >
          <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
            Certificate Expiry Risk Breakdown
          </h2>
          <div className="divide-y divide-stone-200/60 dark:divide-stone-800 text-xs">
            {(['Expired', 'Expiring Soon', 'Valid', 'No Expiry'] as const).map((st) => {
              const count = authorizedDocs.filter(
                (d) => calculateExpiryDetails(d.expiryDate, todayStr).status === st
              ).length;
              return (
                <div key={st} className="py-2 flex items-center justify-between gap-2">
                  <StatusBadge status={st} size="sm" />
                  <span className="font-mono-tabular font-semibold text-stone-900 dark:text-white">
                    <AnimatedMetricValue value={count} />
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>
      </motion.div>

      {/* Official Audit History Table */}
      <motion.section
        variants={sectionEntranceVariants}
        initial="hidden"
        animate="visible"
        className="liquid-glass rounded-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
              Statutory Audit &amp; Review History ({filteredAuditEvents.length})
            </h2>
            <p className="text-xs text-slate-500">
              Chronological audit log of status changes, officer review notes, document submissions, and account approval actions.
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
                {role === 'all' ? 'All Roles' : formatRoleDisplayName(role)}
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
                      @{ev.actorUsername} ({formatRoleDisplayName(ev.actorRole)})
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
      </motion.section>
    </div>
  );
};
