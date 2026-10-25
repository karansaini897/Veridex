import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Moon,
  Send,
  ShieldCheck,
  Sun,
  UserCheck,
  UserPlus,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  AcademicDepartment,
  AcademicDivision,
  AcademicYear,
  AccountApprovalRequest,
  Gender,
  Institution,
  SignupRole,
  UserAccount,
} from '../types/portal';
import {
  ACADEMIC_DEPARTMENTS,
  ACADEMIC_DIVISIONS,
  ACADEMIC_YEARS,
  GENDER_OPTIONS,
  calculateAgeFromDob,
  computeCredentialDigest,
  formatRoleDisplayName,
  getLocalTodayDate,
  normalizePhoneNumber,
  validateSignupSubmission,
} from '../lib/domain';
import { StatusBadge } from './StatusPrimitives';
import { HeritageAmbientPattern, HeritageEmbroideredBorder } from './HeritageOrnaments';

interface SignUpViewProps {
  institutions: Institution[];
  users: UserAccount[];
  approvalRequests: AccountApprovalRequest[];
  onCreateRequest: (
    draft: Omit<
      AccountApprovalRequest,
      | 'id'
      | 'status'
      | 'submittedAt'
      | 'updatedAt'
      | 'approverRole'
      | 'routedApproverUserIds'
      | 'routedApproverLabel'
      | 'noApproverAssigned'
      | 'history'
    >
  ) => AccountApprovalRequest;
  onResubmitRequest: (
    requestId: string,
    updates: {
      fullName: string;
      phone: string;
      normalizedPhone: string;
      email: string;
      dob: string;
      username: string;
      gender: Gender;
      credentialDigest: string;
      requestedRole: SignupRole;
      institutionId: string;
      institutionName: string;
      department?: AcademicDepartment;
      academicYear?: AcademicYear;
      division?: AcademicDivision;
      classTeacherDivision?: AcademicDivision;
    },
    applicantNote: string
  ) => AccountApprovalRequest | null;
  onBackToLogin: () => void;
  onBackToLanding?: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  initialMode?: 'register' | 'status';
  initialLookupIdentifier?: string;
}

const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SignUpView: React.FC<SignUpViewProps> = ({
  institutions,
  users,
  approvalRequests,
  onCreateRequest,
  onResubmitRequest,
  onBackToLogin,
  onBackToLanding,
  darkMode,
  onToggleDarkMode,
  initialMode = 'register',
  initialLookupIdentifier = '',
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'status'>(initialMode);

  // Registration Form State
  const [requestedRole, setRequestedRole] = useState<SignupRole>('student');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<Gender>('Female');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Role-specific fields
  const [institutionId, setInstitutionId] = useState<string>(
    institutions[0]?.id || 'INST-VESIT-104'
  );
  const [department, setDepartment] = useState<AcademicDepartment>('CMPN');
  const [academicYear, setAcademicYear] = useState<AcademicYear>('Second Year');
  const [division, setDivision] = useState<AcademicDivision>('A');
  const [classTeacherDivision, setClassTeacherDivision] = useState<AcademicDivision>('A');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<AccountApprovalRequest | null>(null);

  // Status Lookup & Amendment State
  const [lookupIdentifier, setLookupIdentifier] = useState(initialLookupIdentifier);
  const [lookupPassword, setLookupPassword] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [foundRequest, setFoundRequest] = useState<AccountApprovalRequest | null>(null);

  // Amendment fields when status === 'Correction Requested'
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editGender, setEditGender] = useState<Gender>('Female');
  const [editInstitutionId, setEditInstitutionId] = useState('');
  const [editDepartment, setEditDepartment] = useState<AcademicDepartment>('CMPN');
  const [editAcademicYear, setEditAcademicYear] = useState<AcademicYear>('Second Year');
  const [editDivision, setEditDivision] = useState<AcademicDivision>('A');
  const [editClassTeacherDivision, setEditClassTeacherDivision] =
    useState<AcademicDivision>('A');
  const [applicantNote, setApplicantNote] = useState('');
  const [amendErrors, setAmendErrors] = useState<Record<string, string>>({});
  const [amendSuccessMsg, setAmendSuccessMsg] = useState<string | null>(null);

  const todayDate = getLocalTodayDate();
  const calculatedAge = useMemo(
    () => (dob ? calculateAgeFromDob(dob, todayDate) : null),
    [dob, todayDate]
  );

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.id === institutionId) || institutions[0],
    [institutions, institutionId]
  );

  // Non-confidential description of the approval tier
  const approvalChainSummary = useMemo(() => {
    const collegeName = selectedInstitution?.name || 'Selected College';
    if (requestedRole === 'student') {
      return {
        tierTitle: 'Class Teacher (Faculty) Approval',
        targetDescription: `Routed to the assigned Class Teacher Faculty for ${collegeName} · ${department} · ${academicYear} · Division ${division}.`,
      };
    }
    if (requestedRole === 'faculty') {
      return {
        tierTitle: 'Institutional Manager Approval',
        targetDescription: `Routed to the verified Institutional Manager for ${collegeName}.`,
      };
    }
    return {
      tierTitle: 'VERIDEX Regional Admin Approval',
      targetDescription: `Routed to the Regional Compliance Administrator for ${collegeName} nodal verification.`,
    };
  }, [requestedRole, selectedInstitution, department, academicYear, division]);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const validation = validateSignupSubmission(
      {
        fullName,
        phone,
        email,
        dob,
        username,
        gender,
        password,
        confirmPassword,
        requestedRole,
        institutionId,
        department: requestedRole !== 'institutional_rep' ? department : undefined,
        academicYear: requestedRole !== 'institutional_rep' ? academicYear : undefined,
        division: requestedRole === 'student' ? division : undefined,
        classTeacherDivision:
          requestedRole === 'faculty' ? classTeacherDivision : undefined,
      },
      users,
      approvalRequests,
      institutions
    );

    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      const firstErr = Object.values(validation.fieldErrors)[0];
      setGeneralError(firstErr || 'Please resolve the highlighted validation errors.');
      return;
    }

    const inst = institutions.find((i) => i.id === institutionId)!;
    const created = onCreateRequest({
      fullName: fullName.trim(),
      phone: phone.trim(),
      normalizedPhone: validation.normalizedPhone,
      email: email.trim().toLowerCase(),
      dob: dob.trim(),
      username: username.trim().toLowerCase(),
      gender,
      credentialDigest: computeCredentialDigest(password),
      requestedRole,
      institutionId: inst.id,
      institutionName: inst.name,
      officialInstitutionCode: inst.code,
      academicDepartment: requestedRole !== 'institutional_rep' ? department : undefined,
      department: requestedRole !== 'institutional_rep' ? department : undefined,
      academicYear: requestedRole !== 'institutional_rep' ? academicYear : undefined,
      division: requestedRole === 'student' ? division : undefined,
      classTeacherDivision:
        requestedRole === 'faculty' ? classTeacherDivision : undefined,
    });

    setSubmittedRequest(created);
    setPassword('');
    setConfirmPassword('');
  };

  const populateAmendmentFields = (req: AccountApprovalRequest) => {
    setEditFullName(req.fullName);
    setEditPhone(req.phone);
    setEditEmail(req.email);
    setEditDob(req.dob);
    setEditUsername(req.username);
    setEditGender(req.gender);
    setEditInstitutionId(req.institutionId);
    setEditDepartment(req.department || 'CMPN');
    setEditAcademicYear(req.academicYear || 'Second Year');
    setEditDivision(req.division || 'A');
    setEditClassTeacherDivision(req.classTeacherDivision || 'A');
    setApplicantNote('');
    setAmendErrors({});
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setFoundRequest(null);
    setAmendSuccessMsg(null);

    const trimmed = lookupIdentifier.trim();
    if (!trimmed || !lookupPassword) {
      setLookupError('Enter your registered username/email/phone and password to check status.');
      return;
    }

    const normPhone = normalizePhoneNumber(trimmed);
    const digest = computeCredentialDigest(lookupPassword);

    const matched = approvalRequests.find(
      (r) =>
        (r.username.toLowerCase() === trimmed.toLowerCase() ||
          r.email.toLowerCase() === trimmed.toLowerCase() ||
          r.id.toLowerCase() === trimmed.toLowerCase() ||
          (normPhone && r.normalizedPhone === normPhone)) &&
        r.credentialDigest === digest
    );

    if (!matched) {
      setLookupError(
        'No matching registration request found for the provided identifier and password.'
      );
      return;
    }

    setFoundRequest(matched);
    populateAmendmentFields(matched);
  };

  const handleAmendResubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundRequest) return;
    setAmendErrors({});
    setAmendSuccessMsg(null);

    const validation = validateSignupSubmission(
      {
        fullName: editFullName,
        phone: editPhone,
        email: editEmail,
        dob: editDob,
        username: editUsername,
        gender: editGender,
        password: lookupPassword || 'ValidPass123',
        confirmPassword: lookupPassword || 'ValidPass123',
        requestedRole: foundRequest.requestedRole,
        institutionId: editInstitutionId,
        department:
          foundRequest.requestedRole !== 'institutional_rep'
            ? editDepartment
            : undefined,
        academicYear:
          foundRequest.requestedRole !== 'institutional_rep'
            ? editAcademicYear
            : undefined,
        division: foundRequest.requestedRole === 'student' ? editDivision : undefined,
        classTeacherDivision:
          foundRequest.requestedRole === 'faculty'
            ? editClassTeacherDivision
            : undefined,
      },
      users,
      approvalRequests,
      institutions,
      foundRequest.id
    );

    if (!validation.valid) {
      setAmendErrors(validation.fieldErrors);
      return;
    }

    const inst =
      institutions.find((i) => i.id === editInstitutionId) || institutions[0];
    const updated = onResubmitRequest(
      foundRequest.id,
      {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        normalizedPhone: validation.normalizedPhone,
        email: editEmail.trim().toLowerCase(),
        dob: editDob.trim(),
        username: editUsername.trim(),
        gender: editGender,
        credentialDigest: foundRequest.credentialDigest,
        requestedRole: foundRequest.requestedRole,
        institutionId: inst.id,
        institutionName: inst.name,
        department:
          foundRequest.requestedRole !== 'institutional_rep'
            ? editDepartment
            : undefined,
        academicYear:
          foundRequest.requestedRole !== 'institutional_rep'
            ? editAcademicYear
            : undefined,
        division: foundRequest.requestedRole === 'student' ? editDivision : undefined,
        classTeacherDivision:
          foundRequest.requestedRole === 'faculty'
            ? editClassTeacherDivision
            : undefined,
      },
      applicantNote.trim() || 'Updated registration fields and resubmitted for approval.'
    );

    if (updated) {
      setFoundRequest(updated);
      setAmendSuccessMsg(
        `Registration request ${updated.id} has been updated and returned to Pending Approval.`
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col liquid-canvas text-stone-900 dark:text-stone-100 overflow-x-hidden relative">
      <HeritageAmbientPattern />
      {/* Tricolour Top Ribbon */}
      <div className="h-1.5 w-full tricolour-bar sticky top-0 z-50" />

      {/* Top Bar */}
      <header className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5 liquid-glass-elevated sticky top-1.5 z-30 border-b border-[#C7A56A]/45 relative">
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          <HeritageEmbroideredBorder />
        </div>
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
            alt="VERIDEX Logo"
            className="h-10 w-auto rounded-lg object-contain bg-[#E7D8C0] border-2 border-[#C2410C]/45 shadow-xs shrink-0"
          />
          <div>
            <span className="font-display font-bold text-base tracking-tight text-stone-900 dark:text-white whitespace-nowrap shrink-0 block leading-tight">
              VERIDEX
            </span>
            <span className="text-xs font-semibold text-[#046A38] dark:text-emerald-400 block leading-tight mt-0.5">
              हर दावे की जाँच, हर सच की पहचान
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-stone-700 dark:text-stone-300">
          <span>Role-Based Account Registration</span>
          <span aria-hidden="true" className="text-[#C2410C]">·</span>
          <span>Tiered Institutional Verification</span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onBackToLogin}
            data-testid="signup-back-to-login"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl liquid-glass liquid-glass-interactive text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>Back to Sign In</span>
          </button>
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl liquid-glass liquid-glass-interactive text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Product Overview</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl liquid-glass liquid-glass-interactive text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5 text-[#C2410C]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#046A38]" />
            )}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Main Form Column */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: SMOOTH_EASE }}
          className="lg:col-span-7 liquid-glass rounded-2xl p-6 sm:p-8"
        >
          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl liquid-glass-subtle mb-6 border border-[#C2410C]/30">
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setSubmittedRequest(null);
              }}
              data-testid="tab-register-account"
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-[#C2410C] text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-[#EFE6D5]/60 dark:hover:bg-stone-800/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Request New Account (Sign Up)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('status')}
              data-testid="tab-check-status"
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'status'
                  ? 'bg-[#046A38] text-white shadow-xs'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-[#EFE6D5]/60 dark:hover:bg-stone-800/50'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Check Request Status / Amend</span>
            </button>
          </div>

          {activeTab === 'register' ? (
            submittedRequest ? (
              /* Confirmation State after submitting Sign-Up Request */
              <div
                data-testid="signup-confirmation-panel"
                className="space-y-5 py-2"
              >
                <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-[#046A38]/45 flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[#046A38] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono-tabular font-bold text-[#046A38]">
                        {submittedRequest.id}
                      </span>
                      <StatusBadge status={submittedRequest.status} />
                    </div>
                    <h2 className="text-lg font-display font-bold text-stone-900 dark:text-white">
                      Account Registration Submitted for Approval
                    </h2>
                    <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                      Your account request has been recorded with status{' '}
                      <strong>Pending Approval</strong>. Your account will become active only after verification and approval by the designated authority.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl liquid-glass-subtle space-y-2.5 text-xs">
                  <div className="font-bold text-stone-900 dark:text-white border-b border-[#C2410C]/25 pb-2">
                    Submitted Registration Summary
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <span className="text-stone-500 block">Applicant Name</span>
                      <span className="font-semibold text-stone-900 dark:text-white">
                        {submittedRequest.fullName}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Username</span>
                      <span className="font-mono-tabular font-semibold text-stone-900 dark:text-white">
                        {submittedRequest.username}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Requested Role</span>
                      <span className="font-semibold text-[#C2410C]">
                        {formatRoleDisplayName(submittedRequest.requestedRole)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">College</span>
                      <span className="font-semibold text-stone-900 dark:text-white">
                        {submittedRequest.institutionName}
                      </span>
                    </div>
                    {submittedRequest.department && (
                      <div>
                        <span className="text-stone-500 block">Academic Assignment</span>
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {submittedRequest.department} · {submittedRequest.academicYear} · Div{' '}
                          {submittedRequest.requestedRole === 'student'
                            ? submittedRequest.division
                            : submittedRequest.classTeacherDivision}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-stone-500 block">Assigned Approval Tier</span>
                      <span className="font-semibold text-[#046A38] dark:text-emerald-400">
                        {submittedRequest.routedApproverLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLookupIdentifier(submittedRequest.username);
                      setFoundRequest(submittedRequest);
                      populateAmendmentFields(submittedRequest);
                      setActiveTab('status');
                    }}
                    className="px-4 py-2.5 rounded-xl liquid-glass-subtle liquid-glass-interactive text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
                  >
                    Track Request Status
                  </button>
                  <button
                    type="button"
                    onClick={onBackToLogin}
                    className="px-5 py-2.5 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              </div>
            ) : (
              /* Registration Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-5" noValidate>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
                    VERIDEX Account Registration
                  </p>
                  <h1 className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
                    Create a role-scoped account request
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                    Select your institutional role and complete all required identity and academic fields. Requests remain pending until approved by your designated institutional or administrative approver.
                  </p>
                </div>

                {generalError && (
                  <div
                    role="alert"
                    data-testid="signup-error-banner"
                    className="p-3.5 rounded-xl bg-red-500/10 border border-red-400/70 flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200"
                  >
                    <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-300 shrink-0 mt-0.5" />
                    <span>{generalError}</span>
                  </div>
                )}

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
                    1. Select Account Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        {
                          role: 'student' as SignupRole,
                          label: 'Student',
                          sub: 'Approved by Class Teacher',
                        },
                        {
                          role: 'faculty' as SignupRole,
                          label: 'Faculty',
                          sub: 'Approved by Inst. Manager',
                        },
                        {
                          role: 'institutional_rep' as SignupRole,
                          label: 'Institutional Manager',
                          sub: 'Approved by Regional Admin',
                        },
                      ] as const
                    ).map((item) => {
                      const active = requestedRole === item.role;
                      return (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => {
                            setRequestedRole(item.role);
                            setFieldErrors({});
                            setGeneralError(null);
                          }}
                          data-testid={`role-option-${item.role}`}
                          aria-pressed={active}
                          className={`p-3 rounded-xl text-left transition-all cursor-pointer border-2 ${
                            active
                              ? 'bg-[#FCF9F2] dark:bg-stone-900 border-[#C2410C] shadow-xs'
                              : 'liquid-glass-subtle border-transparent hover:border-[#C2410C]/40'
                          }`}
                        >
                          <div className="text-xs font-bold text-stone-900 dark:text-white">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-[#046A38] dark:text-emerald-400 font-medium mt-0.5">
                            {item.sub}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Base Personal & Credential Fields */}
                <div className="space-y-3.5 pt-2 border-t border-[#C2410C]/25">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    2. Personal &amp; Account Credentials
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label
                        htmlFor="signup-fullname"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        Full Name *
                      </label>
                      <input
                        id="signup-fullname"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Rohan Deshmukh"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                      />
                      {fieldErrors.fullName && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signup-username"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        Username (firstname.lastname) *
                      </label>
                      <input
                        id="signup-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. rohan.deshmukh"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white font-mono-tabular"
                      />
                      {fieldErrors.username && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.username}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signup-phone"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        Phone Number (+91 10-digit) *
                      </label>
                      <input
                        id="signup-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98201 55432"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white font-mono-tabular"
                      />
                      {fieldErrors.phone && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        Official Email ID *
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rohan.deshmukh@vesit.edu.in"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                      />
                      {fieldErrors.email && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="signup-dob"
                          className="block text-xs font-semibold text-stone-800 dark:text-stone-300"
                        >
                          Date of Birth *
                        </label>
                        {calculatedAge !== null && calculatedAge >= 0 && (
                          <span className="text-[11px] font-mono-tabular font-semibold text-[#046A38] dark:text-emerald-400">
                            Age: {calculatedAge} yrs
                          </span>
                        )}
                      </div>
                      <input
                        id="signup-dob"
                        type="date"
                        max={todayDate}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white font-mono-tabular"
                      />
                      {fieldErrors.dob && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.dob}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signup-gender"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        Gender *
                      </label>
                      <select
                        id="signup-gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as Gender)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                      >
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.gender && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.gender}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signup-password"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#046A38] cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {fieldErrors.password && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signup-confirm-password"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        Confirm Password *
                      </label>
                      <input
                        id="signup-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                      />
                      {fieldErrors.confirmPassword && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role-Specific Institutional & Academic Fields */}
                <div className="space-y-3.5 pt-2 border-t border-[#C2410C]/25">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      3. Institutional &amp; Academic Scope ({formatRoleDisplayName(requestedRole)})
                    </span>
                    <span className="text-[11px] font-semibold text-[#C2410C]">
                      Immutable after approval
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className={requestedRole === 'institutional_rep' ? 'sm:col-span-2' : ''}>
                      <label
                        htmlFor="signup-college"
                        className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                      >
                        College / Institution *
                      </label>
                      <select
                        id="signup-college"
                        value={institutionId}
                        onChange={(e) => setInstitutionId(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                      >
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.code})
                          </option>
                        ))}
                      </select>
                      {fieldErrors.institutionId && (
                        <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                          {fieldErrors.institutionId}
                        </p>
                      )}
                    </div>

                    {requestedRole !== 'institutional_rep' && (
                      <>
                        <div>
                          <label
                            htmlFor="signup-department"
                            className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                          >
                            Department *
                          </label>
                          <select
                            id="signup-department"
                            value={department}
                            onChange={(e) =>
                              setDepartment(e.target.value as AcademicDepartment)
                            }
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                          >
                            {ACADEMIC_DEPARTMENTS.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                          {fieldErrors.department && (
                            <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                              {fieldErrors.department}
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="signup-year"
                            className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                          >
                            {requestedRole === 'student' ? 'Year *' : 'Academic Year *'}
                          </label>
                          <select
                            id="signup-year"
                            value={academicYear}
                            onChange={(e) =>
                              setAcademicYear(e.target.value as AcademicYear)
                            }
                            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                          >
                            {ACADEMIC_YEARS.map((yr) => (
                              <option key={yr} value={yr}>
                                {yr}
                              </option>
                            ))}
                          </select>
                          {fieldErrors.academicYear && (
                            <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                              {fieldErrors.academicYear}
                            </p>
                          )}
                        </div>

                        {requestedRole === 'student' ? (
                          <div>
                            <label
                              htmlFor="signup-division"
                              className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                            >
                              Division *
                            </label>
                            <select
                              id="signup-division"
                              value={division}
                              onChange={(e) =>
                                setDivision(e.target.value as AcademicDivision)
                              }
                              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                            >
                              {ACADEMIC_DIVISIONS.map((div) => (
                                <option key={div} value={div}>
                                  Division {div}
                                </option>
                              ))}
                            </select>
                            {fieldErrors.division && (
                              <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                                {fieldErrors.division}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label
                              htmlFor="signup-ct-division"
                              className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                            >
                              Class Teacher Division *
                            </label>
                            <select
                              id="signup-ct-division"
                              value={classTeacherDivision}
                              onChange={(e) =>
                                setClassTeacherDivision(
                                  e.target.value as AcademicDivision
                                )
                              }
                              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                            >
                              {ACADEMIC_DIVISIONS.map((div) => (
                                <option key={div} value={div}>
                                  Division {div}
                                </option>
                              ))}
                            </select>
                            {fieldErrors.classTeacherDivision && (
                              <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">
                                {fieldErrors.classTeacherDivision}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Approval Routing Banner */}
                <div className="p-3.5 rounded-xl liquid-glass-subtle border border-[#046A38]/40 flex items-start gap-2.5 text-xs">
                  <UserCheck className="w-4 h-4 text-[#046A38] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900 dark:text-white">
                      {approvalChainSummary.tierTitle}:{' '}
                    </span>
                    <span className="text-stone-700 dark:text-stone-300">
                      {approvalChainSummary.targetDescription}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  data-testid="signup-submit-btn"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm border border-[#7C2D12] cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Submit Account Registration Request</span>
                </button>
              </form>
            )
          ) : (
            /* Check Request Status / Amend Tab */
            <div className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#046A38] dark:text-emerald-400 mb-1">
                  Registration Request Tracker
                </p>
                <h1 className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
                  Check approval status or amend a request
                </h1>
                <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                  Enter the username, email, or mobile number and password used during registration to view your request status or respond to a correction notice.
                </p>
              </div>

              <form onSubmit={handleLookupSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label
                    htmlFor="lookup-identifier"
                    className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                  >
                    Username, Email, or Mobile Number
                  </label>
                  <input
                    id="lookup-identifier"
                    type="text"
                    value={lookupIdentifier}
                    onChange={(e) => setLookupIdentifier(e.target.value)}
                    placeholder="e.g. rohan.deshmukh"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label
                    htmlFor="lookup-password"
                    className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                  >
                    Registration Password
                  </label>
                  <input
                    id="lookup-password"
                    type="password"
                    value={lookupPassword}
                    onChange={(e) => setLookupPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    data-testid="lookup-request-btn"
                    className="w-full py-2 px-3.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white text-xs font-semibold cursor-pointer"
                  >
                    Check Status
                  </button>
                </div>
              </form>

              {lookupError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-400/70 flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200"
                >
                  <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-300 shrink-0 mt-0.5" />
                  <span>{lookupError}</span>
                </div>
              )}

              {amendSuccessMsg && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-emerald-500/10 border border-[#046A38]/50 flex items-start gap-2.5 text-xs text-stone-900 dark:text-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#046A38] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{amendSuccessMsg}</span>
                </div>
              )}

              {foundRequest && (
                <div
                  data-testid="lookup-result-card"
                  className="p-4 sm:p-5 rounded-2xl liquid-glass-subtle border-2 border-[#C2410C]/40 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C2410C]/25 pb-3">
                    <div>
                      <span className="text-xs font-mono-tabular font-bold text-[#C2410C] dark:text-amber-300 block">
                        Request ID: {foundRequest.id}
                      </span>
                      <h3 className="text-base font-display font-bold text-stone-900 dark:text-white">
                        {foundRequest.fullName} ({foundRequest.username})
                      </h3>
                    </div>
                    <StatusBadge status={foundRequest.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-stone-500 block">Requested Role</span>
                      <span className="font-semibold text-stone-900 dark:text-white">
                        {formatRoleDisplayName(foundRequest.requestedRole)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">College</span>
                      <span className="font-semibold text-stone-900 dark:text-white">
                        {foundRequest.institutionName}
                      </span>
                    </div>
                    {foundRequest.department && (
                      <div>
                        <span className="text-stone-500 block">Academic Assignment</span>
                        <span className="font-semibold text-stone-900 dark:text-white">
                          {foundRequest.department} · {foundRequest.academicYear} · Div{' '}
                          {foundRequest.requestedRole === 'student'
                            ? foundRequest.division
                            : foundRequest.classTeacherDivision}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-stone-500 block">Approval Tier</span>
                      <span className="font-semibold text-[#046A38] dark:text-emerald-400">
                        {foundRequest.routedApproverLabel}
                      </span>
                    </div>
                  </div>

                  {foundRequest.decisionNote && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs space-y-1">
                      <div className="font-bold text-stone-900 dark:text-amber-200">
                        Reviewer Note ({foundRequest.decidedByName || 'Approver'}):
                      </div>
                      <p className="text-stone-700 dark:text-stone-300">
                        {foundRequest.decisionNote}
                      </p>
                    </div>
                  )}

                  {foundRequest.status === 'Correction Requested' && (
                    <form
                      onSubmit={handleAmendResubmit}
                      data-testid="amend-request-form"
                      className="space-y-3.5 pt-3 border-t border-[#C2410C]/30"
                    >
                      <div className="text-xs font-bold text-[#C2410C] dark:text-amber-300 uppercase tracking-wider">
                        Amend Registration Details &amp; Resubmit
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Full Name *</label>
                          <input
                            type="text"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900"
                          />
                          {amendErrors.fullName && (
                            <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">{amendErrors.fullName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Username *</label>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 font-mono-tabular"
                          />
                          {amendErrors.username && (
                            <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">{amendErrors.username}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Phone Number *</label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 font-mono-tabular"
                          />
                          {amendErrors.phone && (
                            <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">{amendErrors.phone}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Email ID *</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900"
                          />
                          {amendErrors.email && (
                            <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">{amendErrors.email}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">College *</label>
                          <select
                            value={editInstitutionId}
                            onChange={(e) => setEditInstitutionId(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900"
                          >
                            {institutions.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {foundRequest.requestedRole !== 'institutional_rep' && (
                          <>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Department *</label>
                              <select
                                value={editDepartment}
                                onChange={(e) =>
                                  setEditDepartment(e.target.value as AcademicDepartment)
                                }
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900"
                              >
                                {ACADEMIC_DEPARTMENTS.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Academic Year *</label>
                              <select
                                value={editAcademicYear}
                                onChange={(e) =>
                                  setEditAcademicYear(e.target.value as AcademicYear)
                                }
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900"
                              >
                                {ACADEMIC_YEARS.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">
                                {foundRequest.requestedRole === 'student'
                                  ? 'Division *'
                                  : 'Class Teacher Division *'}
                              </label>
                              <select
                                value={
                                  foundRequest.requestedRole === 'student'
                                    ? editDivision
                                    : editClassTeacherDivision
                                }
                                onChange={(e) => {
                                  const val = e.target.value as AcademicDivision;
                                  if (foundRequest.requestedRole === 'student') {
                                    setEditDivision(val);
                                  } else {
                                    setEditClassTeacherDivision(val);
                                  }
                                }}
                                className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900"
                              >
                                {ACADEMIC_DIVISIONS.map((div) => (
                                  <option key={div} value={div}>
                                    Division {div}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="amend-note"
                          className="block text-xs font-semibold mb-1"
                        >
                          Clarification / Amendment Note
                        </label>
                        <input
                          id="amend-note"
                          type="text"
                          value={applicantNote}
                          onChange={(e) => setApplicantNote(e.target.value)}
                          placeholder="Describe the correction made..."
                          className="w-full px-3 py-1.5 text-xs rounded-xl border border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900"
                        />
                      </div>

                      <button
                        type="submit"
                        data-testid="resubmit-amended-request-btn"
                        className="px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Resubmit Corrected Request</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.section>

        {/* Right Column: Tiered Approval Governance & Supported Colleges */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, delay: 0.05, ease: SMOOTH_EASE }}
          className="lg:col-span-5 liquid-glass rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="border-b border-[#C2410C]/30 pb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
              Hierarchical Verification Protocol
            </div>
            <h2 className="text-lg font-display font-bold text-stone-900 dark:text-white">
              Multi-Tier Account Approval Chain
            </h2>
            <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
              Every registration request is validated for identity uniqueness and routed to the designated institutional or regional authority before an active account is provisioned.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl liquid-glass-subtle space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[#046A38]" />
                  <span>1. Student Registration</span>
                </span>
                <span className="text-[11px] font-mono-tabular text-[#C2410C]">
                  → Class Teacher
                </span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Routed to the Faculty Class Teacher matching the student&apos;s College, Department, Academic Year, and Division.
              </p>
            </div>

            <div className="p-3.5 rounded-xl liquid-glass-subtle space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#046A38]" />
                  <span>2. Faculty Registration</span>
                </span>
                <span className="text-[11px] font-mono-tabular text-[#C2410C]">
                  → Institutional Manager
                </span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Routed to the verified Institutional Manager for the selected College to confirm departmental and class teacher division assignment.
              </p>
            </div>

            <div className="p-3.5 rounded-xl liquid-glass-subtle space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#046A38]" />
                  <span>3. Institutional Manager</span>
                </span>
                <span className="text-[11px] font-mono-tabular text-[#C2410C]">
                  → Regional Admin
                </span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Routed directly to the VERIDEX Regional Compliance Administrator. Admin accounts cannot be self-registered.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl liquid-glass-subtle space-y-2">
            <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#046A38]" />
              <span>Participating Colleges &amp; Institutions</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs text-stone-700 dark:text-stone-300">
              {institutions.map((inst, idx) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-[#FAF5EB]/70 dark:bg-stone-900/50 border border-[#C2410C]/20"
                >
                  <span className="font-semibold text-stone-900 dark:text-stone-100">
                    {idx + 1}. {inst.name}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-stone-500">
                    {inst.code}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};
