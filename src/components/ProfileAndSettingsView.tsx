import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sun,
  Moon,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { AccountApprovalRequest, UserAccount, VaultDocumentRecord } from '../types/portal';
import {
  GENDER_OPTIONS,
  calculateAgeFromDob,
  computeCredentialDigest,
  formatRoleDisplayName,
  getLocalTodayDate,
  isValidEmail,
  normalizeFullName,
  normalizePhoneNumber,
  verifyUserCredential,
} from '../lib/domain';
import {
  cardEntranceVariants,
  staggerContainerVariants,
} from '../lib/motion';
import { PersonalDocumentVaultSection } from './PersonalDocumentVaultSection';

interface ProfileAndSettingsViewProps {
  mode: 'profile' | 'settings';
  currentUser: UserAccount;
  users: UserAccount[];
  approvalRequests?: AccountApprovalRequest[];
  onUpdateProfile: (updated: Partial<UserAccount>) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onResetRegistryData: () => void;
  onSyncVaultToRepository?: (vaultDoc: VaultDocumentRecord) => void;
}

export const ProfileAndSettingsView: React.FC<ProfileAndSettingsViewProps> = ({
  mode,
  currentUser,
  users,
  approvalRequests = [],
  onUpdateProfile,
  darkMode,
  onToggleDarkMode,
  onResetRegistryData,
  onSyncVaultToRepository,
}) => {
  const [fullName, setFullName] = useState(currentUser.fullName);
  const [username, setUsername] = useState(currentUser.username);
  const [phone, setPhone] = useState(currentUser.phone);
  const [email, setEmail] = useState(currentUser.email);
  const [dob, setDob] = useState(currentUser.dob);
  const [gender, setGender] = useState<UserAccount['gender']>(
    currentUser.gender || 'Prefer not to say'
  );
  const [designation, setDesignation] = useState(currentUser.designation || '');

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password Change State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const initials = useMemo(() => {
    const parts = currentUser.fullName
      .replace(/\b(Dr|Prof|Mr|Ms|Mrs)\b\.?/gi, '')
      .trim()
      .split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return currentUser.fullName.slice(0, 2).toUpperCase();
  }, [currentUser.fullName]);

  const todayStr = getLocalTodayDate();
  const calculatedAge = useMemo(() => calculateAgeFromDob(dob, todayStr), [dob, todayStr]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setProfileError('Profile photo must be a valid JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setProfileError('Profile image must be smaller than 4 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateProfile({ avatarUrl: reader.result });
        setProfileSuccess('Profile photo updated.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const trimmedName = fullName.trim();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedDob = dob.trim();
    const normPhone = normalizePhoneNumber(phone);

    if (!trimmedName) {
      setProfileError('Full name cannot be empty.');
      return;
    }
    if (!trimmedUsername) {
      setProfileError('Username cannot be empty.');
      return;
    }
    if (!normPhone) {
      setProfileError('Enter a valid 10-digit Indian mobile number (+91XXXXXXXXXX).');
      return;
    }
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setProfileError('Enter a valid email address.');
      return;
    }
    const ageCheck = calculateAgeFromDob(trimmedDob, todayStr);
    if (ageCheck === null || ageCheck < 15 || ageCheck > 100) {
      setProfileError('Enter a valid Date of Birth (applicant age between 15 and 100 years).');
      return;
    }

    const normFull = normalizeFullName(trimmedName);
    const otherUsers = users.filter((u) => u.id !== currentUser.id);
    const activeRequests = approvalRequests.filter(
      (r) => r.status === 'Pending Approval' || r.status === 'Correction Requested'
    );

    if (
      otherUsers.some((u) => normalizeFullName(u.fullName) === normFull) ||
      activeRequests.some((r) => normalizeFullName(r.fullName) === normFull)
    ) {
      setProfileError(`Full Name "${trimmedName}" is already registered to another account.`);
      return;
    }

    if (
      otherUsers.some((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase()) ||
      activeRequests.some((r) => r.username.toLowerCase() === trimmedUsername.toLowerCase())
    ) {
      setProfileError(`Username "${trimmedUsername}" is already registered to another account.`);
      return;
    }

    if (
      otherUsers.some((u) => u.normalizedPhone === normPhone) ||
      activeRequests.some((r) => r.normalizedPhone === normPhone)
    ) {
      setProfileError(`Phone number "${normPhone}" is already registered to another account.`);
      return;
    }

    if (
      otherUsers.some((u) => u.email.toLowerCase() === trimmedEmail) ||
      activeRequests.some((r) => r.email.toLowerCase() === trimmedEmail)
    ) {
      setProfileError(`Email "${trimmedEmail}" is already registered to another account.`);
      return;
    }

    if (
      otherUsers.some((u) => u.dob === trimmedDob) ||
      activeRequests.some((r) => r.dob === trimmedDob)
    ) {
      setProfileError(
        `Date of Birth "${trimmedDob}" conflicts with an existing registered identity record.`
      );
      return;
    }

    onUpdateProfile({
      fullName: trimmedName,
      username: trimmedUsername,
      phone: phone.trim(),
      normalizedPhone: normPhone,
      email: trimmedEmail,
      dob: trimmedDob,
      gender,
      designation: designation.trim() || currentUser.designation,
    });

    setProfileSuccess('Profile details and normalized contact information saved.');
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (!verifyUserCredential(currentUser, currentPasswordInput)) {
      setPwMessage({
        type: 'error',
        text: 'Current password does not match your active account credential.',
      });
      return;
    }
    if (newPasswordInput.length < 6) {
      setPwMessage({
        type: 'error',
        text: 'New password must be at least 6 characters.',
      });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPwMessage({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }

    onUpdateProfile({
      credentialDigest: computeCredentialDigest(newPasswordInput),
      password: undefined,
    });
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPwMessage({
      type: 'success',
      text: 'Password credential updated for your account.',
    });
  };

  if (mode === 'settings') {
    return (
      <div className="space-y-8">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            System Preferences &amp; Regulatory Governance Architecture
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            VERIDEX System Settings &amp; Security Specifications
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Configure display preferences, synchronize baseline institutional records, and review statutory verification security policies.
          </p>
        </div>

        <motion.div
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Theme & Workspace Synchronization */}
          <div className="lg:col-span-5 space-y-6">
            <motion.section
              variants={cardEntranceVariants}
              className="liquid-glass rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Visual Theme &amp; Glassmorphism Palette
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Light theme is the standard administrative default. Your selection is persisted across navigation and browser sessions.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (darkMode) onToggleDarkMode();
                  }}
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    !darkMode
                      ? 'border-[#C2410C] bg-[#EFE6D5] text-stone-900 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span>Light Theme (Default)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!darkMode) onToggleDarkMode();
                  }}
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    darkMode
                      ? 'border-blue-500 bg-blue-950/60 text-blue-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark Theme</span>
                </button>
              </div>
            </motion.section>

            <motion.section
              variants={cardEntranceVariants}
              className="liquid-glass rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Workspace Data Synchronization
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Synchronize and restore the regional workspace to the baseline institutional registry, active compliance rules, and statutory application dossiers.
              </p>
              <button
                type="button"
                onClick={onResetRegistryData}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Restore Baseline Registry Records</span>
              </button>
            </motion.section>
          </div>

          {/* Architecture & Security Specifications */}
          <motion.section
            variants={cardEntranceVariants}
            className="lg:col-span-7 liquid-glass rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                VERIDEX Regulatory Architecture &amp; Security Specifications
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Enforced Regulatory Controls &amp; Access Governance
                </div>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-emerald-800 dark:text-emerald-300">
                  <li>
                    Role-based access control &amp; strict institutional data isolation across Regional Administrators, Institutional Managers, Faculty, and Students.
                  </li>
                  <li>
                    Tiered account registration approval workflow: Student → Class Teacher Faculty, Faculty → Institutional Manager, and Institutional Manager → Regional Admin.
                  </li>
                  <li>
                    Global uniqueness enforcement across Full Name, Username, Phone Number, Email ID, and Date of Birth, with automated age calculation.
                  </li>
                  <li>
                    6-Pillar automated verification engine, configurable statutory rules, certificate validity calendar, and audit trail logging.
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <div className="font-semibold text-blue-900 dark:text-blue-200">
                  Statutory Verification &amp; External Authority Interoperability
                </div>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-blue-800 dark:text-blue-300">
                  <li>
                    <strong>Issuing-Authority &amp; Registry Interoperability:</strong> Cross-verification with National Academic Depository (NAD), ICAI UDIN Registry, and Municipal Fire &amp; Life Safety Directorates.
                  </li>
                  <li>
                    <strong>Automated Document Scrutiny:</strong> Completeness, cross-document consistency, and structural anomaly checks assist reviewing officers prior to final statutory sign-off.
                  </li>
                  <li>
                    <strong>Audit Accountability:</strong> Every status transition, document version replacement, and administrative decision is logged with officer credentials and timestamps.
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </div>
    );
  }

  // PROFILE VIEW
  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <p className="text-xs font-medium text-[#C2410C] dark:text-amber-400">
          Role-Specific Identity &amp; Immutable Institutional Scope
        </p>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
          User Profile &amp; Credentials
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Manage your profile photo, personal contact details, and account password. Approved institutional, department, academic year, and division assignments are fixed after approval.
        </p>
      </div>

      <motion.div
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
      >
        {/* Left 4 Cols: Avatar & Immutable Role Summary Card */}
        <motion.section
          variants={cardEntranceVariants}
          className="lg:col-span-4 liquid-glass rounded-2xl p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-900 dark:bg-blue-700 text-white text-xl font-display font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white truncate">
                {currentUser.fullName}
              </h2>
              <p className="text-xs text-[#C2410C] dark:text-amber-400 font-semibold">
                @{currentUser.username} · {formatRoleDisplayName(currentUser.role)}
              </p>
              <p className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
                Normalized Phone: {currentUser.normalizedPhone}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              <span>{currentUser.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
            {currentUser.avatarUrl && (
              <button
                type="button"
                onClick={() => onUpdateProfile({ avatarUrl: undefined })}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-red-600 dark:text-red-400 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>

          {/* Read-only Role & Institution Metadata */}
          <div
            data-testid="immutable-profile-attributes"
            className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Approved Institutional Scope
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-[#C2410C]/40 text-[10px] font-bold text-[#C2410C] dark:text-amber-300">
                Fixed after approval
              </span>
            </div>

            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Assigned Role</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatRoleDisplayName(currentUser.role)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Account Status</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {currentUser.status}
              </span>
            </div>
            {currentUser.institutionName && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">College</span>
                <span
                  data-testid="profile-readonly-college"
                  className="font-semibold text-slate-900 dark:text-white text-right"
                >
                  {currentUser.institutionName}
                </span>
              </div>
            )}
            {currentUser.officialInstitutionCode && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">College Code</span>
                <span className="font-mono-tabular font-semibold">
                  {currentUser.officialInstitutionCode}
                </span>
              </div>
            )}
            {(currentUser.academicDepartment || currentUser.department) && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Department</span>
                <span
                  data-testid="profile-readonly-department"
                  className="font-semibold text-slate-900 dark:text-white"
                >
                  {currentUser.academicDepartment || currentUser.department}
                </span>
              </div>
            )}
            {(currentUser.academicYear || currentUser.yearSemester) && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">
                  {currentUser.role === 'student' ? 'Year' : 'Academic Year'}
                </span>
                <span
                  data-testid="profile-readonly-year"
                  className="font-semibold text-slate-900 dark:text-white"
                >
                  {currentUser.academicYear || currentUser.yearSemester}
                </span>
              </div>
            )}
            {currentUser.role === 'student' && currentUser.division && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Division</span>
                <span
                  data-testid="profile-readonly-division"
                  className="font-mono-tabular font-bold text-[#046A38] dark:text-emerald-400"
                >
                  Division {currentUser.division}
                </span>
              </div>
            )}
            {currentUser.role === 'faculty' && currentUser.classTeacherDivision && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Class Teacher Division</span>
                <span
                  data-testid="profile-readonly-ct-division"
                  className="font-mono-tabular font-bold text-[#046A38] dark:text-emerald-400"
                >
                  Division {currentUser.classTeacherDivision}
                </span>
              </div>
            )}
            {currentUser.permissionLevel && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Permission Level</span>
                <span className="font-medium text-right">{currentUser.permissionLevel}</span>
              </div>
            )}
            {currentUser.approvedByName && (
              <div className="flex justify-between gap-2 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-500">Approved By</span>
                <span className="font-medium text-right">{currentUser.approvedByName}</span>
              </div>
            )}
          </div>
        </motion.section>

        {/* Right 8 Cols: Read-Only Institutional Assignment + Edit Personal Information & Password */}
        <div className="lg:col-span-8 space-y-6">
          {/* Read-Only Institutional & Academic Assignment Fields */}
          {currentUser.role !== 'admin' && (
            <motion.section
              variants={cardEntranceVariants}
              className="liquid-glass rounded-2xl p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#046A38]" />
                  <span>Approved Institutional &amp; Academic Assignment (Read-Only)</span>
                </h2>
                <span className="text-[11px] font-semibold text-[#C2410C]">
                  Fixed after approval · Cannot be modified from profile
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formatRoleDisplayName(currentUser.role)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    College
                  </label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={currentUser.institutionName || 'Not assigned'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                  />
                </div>
                {(currentUser.role === 'student' || currentUser.role === 'faculty') && (
                  <>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={currentUser.academicDepartment || currentUser.department || 'Not assigned'}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
                        {currentUser.role === 'student' ? 'Year' : 'Academic Year'}
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={currentUser.academicYear || currentUser.yearSemester || 'Not assigned'}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 dark:text-slate-300 mb-1">
                        {currentUser.role === 'student' ? 'Division' : 'Class Teacher Division'}
                      </label>
                      <input
                        type="text"
                        disabled
                        readOnly
                        value={
                          currentUser.role === 'student'
                            ? currentUser.division || 'Not assigned'
                            : currentUser.classTeacherDivision || 'Not assigned'
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                      />
                    </div>
                  </>
                )}
              </div>
            </motion.section>
          )}

          <motion.section
            variants={cardEntranceVariants}
            className="liquid-glass rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
              Edit Permitted Personal Details
            </h2>

            {profileError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 text-xs text-red-800 dark:text-red-200 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-name" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label htmlFor="prof-username" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Username (Globally Unique)
                  </label>
                  <input
                    id="prof-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>

                <div>
                  <label htmlFor="prof-phone" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number (Globally Unique)
                  </label>
                  <input
                    id="prof-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                </div>

                <div>
                  <label htmlFor="prof-email" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Globally Unique)
                  </label>
                  <input
                    id="prof-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label htmlFor="prof-dob" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth (Age Calculated Automatically)
                  </label>
                  <input
                    id="prof-dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-tabular"
                  />
                  <span className="text-[11px] text-slate-500 font-mono-tabular mt-0.5 block">
                    Calculated Age: {calculatedAge !== null ? `${calculatedAge} years` : 'Not recorded'}
                  </span>
                </div>

                <div>
                  <label htmlFor="prof-gender" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    id="prof-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as UserAccount['gender'])}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </motion.section>

          {/* Password Update */}
          <motion.section
            variants={cardEntranceVariants}
            className="liquid-glass rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <span>Change Account Password</span>
            </h2>

            {pwMessage && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  pwMessage.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-200 text-red-800 dark:text-red-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {pwMessage.text}
              </div>
            )}

            <form onSubmit={handlePasswordSave} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label htmlFor="pw-current" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  id="pw-current"
                  type="password"
                  required
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="pw-new" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  id="pw-new"
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label htmlFor="pw-confirm" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  id="pw-confirm"
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </motion.section>
        </div>
      </motion.div>

      {/* Personal Document Vault inside Profile */}
      <PersonalDocumentVaultSection
        currentUser={currentUser}
        onSyncToRepository={onSyncVaultToRepository}
      />
    </div>
  );
};
