import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { UserAccount } from '../types/portal';
import {
  calculateAgeFromDob,
  REFERENCE_DATE,
  validateAccountUniqueness,
} from '../lib/domain';

interface ProfileAndSettingsViewProps {
  mode: 'profile' | 'settings';
  currentUser: UserAccount;
  users: UserAccount[];
  onUpdateProfile: (updated: Partial<UserAccount>) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onResetDemoData: () => void;
}

export const ProfileAndSettingsView: React.FC<ProfileAndSettingsViewProps> = ({
  mode,
  currentUser,
  users,
  onUpdateProfile,
  darkMode,
  onToggleDarkMode,
  onResetDemoData,
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

  const calculatedAge = useMemo(() => calculateAgeFromDob(dob, REFERENCE_DATE), [dob]);

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

    if (!fullName.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }

    const uniqueness = validateAccountUniqueness(
      { username, phone, excludeUserId: currentUser.id },
      users
    );

    if (!uniqueness.valid) {
      setProfileError(
        uniqueness.errors.username ||
          uniqueness.errors.phone ||
          'Username or phone number is already registered.'
      );
      return;
    }

    onUpdateProfile({
      fullName: fullName.trim(),
      username: username.trim(),
      phone: phone.trim(),
      normalizedPhone: uniqueness.normalizedPhone,
      email: email.trim(),
      dob,
      gender,
      designation: designation.trim() || currentUser.designation,
    });

    setProfileSuccess('Profile details and normalized contact information saved.');
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (currentPasswordInput !== currentUser.password) {
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

    onUpdateProfile({ password: newPasswordInput });
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPwMessage({
      type: 'success',
      text: 'Password updated for your current session.',
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Theme & Workspace Synchronization */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Visual Theme Preference
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
                      ? 'border-blue-600 bg-blue-50/60 text-blue-800 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
            </section>

            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Workspace Data Synchronization
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Synchronize and restore the regional workspace to the baseline institutional registry, active compliance rules, and statutory application dossiers.
              </p>
              <button
                type="button"
                onClick={onResetDemoData}
                className="px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Restore Baseline Registry Records</span>
              </button>
            </section>
          </div>

          {/* Architecture & Security Specifications */}
          <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
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
                    Role-based access control &amp; strict institutional data isolation across Regional Administrators, Institutional Nodal Officers, Faculty/Staff, and Students.
                  </li>
                  <li>
                    Global username and normalized phone number uniqueness enforcement across all registered accounts, with automated age verification from Date of Birth.
                  </li>
                  <li>
                    End-to-end statutory workflow: Dossier initiation → Category checklist → Document submission &amp; version history → Officer scrutiny &amp; clarification directive → Institutional resubmission → Authorized decision.
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
          </section>
        </div>
      </div>
    );
  }

  // PROFILE VIEW
  return (
    <div className="space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
          Role-Specific Identity &amp; Account Security
        </p>
        <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
          User Profile &amp; Credentials
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Manage your profile photo, personal contact details, and account password. Assigned role and institutional authorization are enforced by the system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 4 Cols: Avatar & Role Summary Card */}
        <section className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
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
              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                @{currentUser.username} · {currentUser.role.replace('_', ' ')}
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
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="text-[11px] font-semibold text-slate-500">
              ROLE-AUTHORIZED ATTRIBUTES (READ-ONLY)
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Role</span>
              <span className="font-semibold text-slate-900 dark:text-white">{currentUser.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Status</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {currentUser.status}
              </span>
            </div>
            {currentUser.institutionName && (
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Institution</span>
                <span className="font-medium text-slate-900 dark:text-white text-right">
                  {currentUser.institutionName}
                </span>
              </div>
            )}
            {currentUser.officialInstitutionCode && (
              <div className="flex justify-between">
                <span className="text-slate-500">Institution Code</span>
                <span className="font-mono-tabular font-semibold">
                  {currentUser.officialInstitutionCode}
                </span>
              </div>
            )}
            {currentUser.permissionLevel && (
              <div className="flex justify-between">
                <span className="text-slate-500">Permission Level</span>
                <span className="font-medium">{currentUser.permissionLevel}</span>
              </div>
            )}
            {currentUser.authorizationStatus && (
              <div className="flex justify-between">
                <span className="text-slate-500">Signatory Status</span>
                <span className="font-medium">{currentUser.authorizationStatus}</span>
              </div>
            )}
            {currentUser.employeeId && (
              <div className="flex justify-between">
                <span className="text-slate-500">Employee ID</span>
                <span className="font-mono-tabular">{currentUser.employeeId}</span>
              </div>
            )}
            {currentUser.rollNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Student Roll / PRN</span>
                <span className="font-mono-tabular">{currentUser.rollNumber}</span>
              </div>
            )}
            {currentUser.course && (
              <div className="flex justify-between">
                <span className="text-slate-500">Course &amp; Sem</span>
                <span>
                  {currentUser.course} ({currentUser.yearSemester})
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Right 8 Cols: Edit Personal Information & Password */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
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
                    Email Address
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
                    Calculated Age: {calculatedAge !== null ? `${calculatedAge} years` : '—'}
                  </span>
                </div>

                <div>
                  <label htmlFor="prof-gender" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gender (Optional)
                  </label>
                  <select
                    id="prof-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as UserAccount['gender'])}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
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
          </section>

          {/* Password Update */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
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
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
