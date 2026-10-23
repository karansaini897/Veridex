import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { UserAccount } from '../types/portal';
import { normalizePhoneNumber } from '../lib/domain';

interface LoginViewProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  onLoginSuccess,
  darkMode,
  onToggleDarkMode,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoverySubmitted, setRecoverySubmitted] = useState(false);

  const demoAccounts = users.filter((u) => u.isDemoAccount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setError('Enter your registered username or 10-digit mobile number.');
      return;
    }
    if (!password) {
      setError('Enter your account password.');
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      const normalizedInputPhone = normalizePhoneNumber(trimmedId);
      const matchedUser = users.find(
        (u) =>
          u.username.toLowerCase() === trimmedId.toLowerCase() ||
          (normalizedInputPhone && u.normalizedPhone === normalizedInputPhone)
      );

      if (!matchedUser || matchedUser.password !== password) {
        setIsSubmitting(false);
        setError(
          'Invalid username/phone number or password. For hackathon testing, select a preconfigured demo persona on the right.'
        );
        return;
      }

      if (matchedUser.status !== 'Active') {
        setIsSubmitting(false);
        setError(`Account "${matchedUser.username}" is currently ${matchedUser.status}. Contact an authorized administrator.`);
        return;
      }

      setIsSubmitting(false);
      onLoginSuccess(matchedUser);
    }, 180);
  };

  const handleQuickDemoSignIn = (account: UserAccount) => {
    setError(null);
    setIdentifier(account.username);
    setPassword(account.password);
    onLoginSuccess(account);
  };

  const handleFillDemoCredentials = (account: UserAccount) => {
    setError(null);
    setIdentifier(account.username);
    setPassword(account.password);
  };

  const roleBadgeLabel = (role: UserAccount['role']) => {
    switch (role) {
      case 'admin':
        return 'AICTE Regional Admin';
      case 'institutional_rep':
        return 'Institutional Representative';
      case 'faculty':
        return 'Faculty / Staff';
      case 'student':
        return 'Student';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-display font-bold text-sm">
            AV
          </div>
          <span className="font-display font-semibold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            AICTE Validation &amp; Compliance Portal
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
          <span>Hackathon Prototype Environment</span>
          <span aria-hidden="true">·</span>
          <span>Simulated Verification Pipeline</span>
          <span aria-hidden="true">·</span>
          <span>Academic Session 2026–27</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Standard Sign-In Card */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
              Authorized Portal Sign-In
            </p>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
              Enter your globally unique username or registered 10-digit mobile number to access your role-authorized workspace.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Username or Phone Number
              </label>
              <input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. rep.kashyap or +91 98220 33445"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setRecoverySubmitted(false);
                  }}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <p>
                <strong>Role &amp; Account Provisioning:</strong> Accounts are provisioned by authorized administrators. Self-registration of administrative privileges is strictly disabled.
              </p>
            </div>
          </div>
        </section>

        {/* Right Column: Hackathon Demo Persona Selector */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Hackathon Evaluation &amp; Live Demo Mode
              </div>
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                Select a Fictional Demo Persona
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              {demoAccounts.length} Preconfigured Personas
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
            These fictional Indian institutional and regulatory accounts are isolated for prototype demonstration. All automated verification, anomaly detection, and registry lookups are <strong>simulated</strong> and never claim real AICTE or issuing-authority confirmation.
          </p>

          <div className="space-y-3">
            {demoAccounts.map((account) => (
              <div
                key={account.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 bg-slate-50/60 dark:bg-slate-950/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm text-slate-900 dark:text-white">
                      {account.fullName}
                    </span>
                    <span className="text-xs text-slate-400" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                      {roleBadgeLabel(account.role)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {account.institutionName
                      ? `${account.institutionName} (${account.officialInstitutionCode})`
                      : account.designation}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                    <span>User: {account.username}</span>
                    <span aria-hidden="true">·</span>
                    <span>Phone: {account.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleFillDemoCredentials(account)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Fill Form
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoSignIn(account)}
                    aria-label={`Launch demo as ${account.fullName} (${roleBadgeLabel(account.role)})`}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Launch Demo</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Walkthrough Story Hint */}
          <div className="mt-6 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <div className="font-semibold text-slate-900 dark:text-white mb-1">
              Recommended End-to-End Hackathon Walkthrough:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li>
                Launch as <strong>Dr. Arvind Kashyap</strong> (Institutional Rep, Vidyapeeth Pune) to create/submit an application or respond to the pending review request on <span className="font-mono-tabular">APP-2026-0104</span>.
              </li>
              <li>
                Switch to <strong>Rajeshwari Sharma</strong> (AICTE Regional Admin) via the top bar or sign-in screen to inspect findings, request corrections, or record an authorized decision.
              </li>
              <li>
                Inspect role isolation using <strong>Dr. Siddharth Kulkarni</strong> (Faculty) and <strong>Ananya Deshmukh</strong> (Student).
              </li>
            </ol>
          </div>
        </section>
      </main>

      {/* Forgot Password Dialog */}
      {forgotOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-3">
              <KeyRound className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              <h2 id="forgot-password-title" className="text-base font-display font-bold text-slate-900 dark:text-white">
                Credential Recovery Request
              </h2>
            </div>

            {!recoverySubmitted ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (recoveryIdentifier.trim()) {
                    setRecoverySubmitted(true);
                  }
                }}
                className="space-y-4"
              >
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Enter your registered username or normalized phone number. In this prototype environment, SMS/email dispatch is not connected to an external gateway; requests are logged for institutional or regional administrator verification.
                </p>
                <div>
                  <label
                    htmlFor="recovery-id"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Username or Registered Phone Number
                  </label>
                  <input
                    id="recovery-id"
                    type="text"
                    required
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="e.g. rep.kashyap or +91 98220 33445"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium"
                  >
                    Request Recovery Verification
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Recovery Ticket Logged (Prototype Simulation)</p>
                    <p className="mt-1 text-emerald-800 dark:text-emerald-300">
                      Ticket recorded for <strong>{recoveryIdentifier}</strong>. Note: Live SMTP/SMS OTP dispatch is not configured in this hackathon environment. Use the Demo Persona selector on the login page to test any role immediately.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setForgotOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
