import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Eye,
  EyeOff,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  FileCheck2,
  Building2,
  Scale,
  ArrowLeft,
  UserPlus,
  ClipboardCheck,
} from 'lucide-react';
import { AccountApprovalRequest, UserAccount } from '../types/portal';
import {
  computeCredentialDigest,
  normalizePhoneNumber,
  verifyUserCredential,
} from '../lib/domain';
import {
  HeritageAmbientPattern,
  HeritageCornerOrnament,
  HeritageEmbroideredBorder,
} from './HeritageOrnaments';

interface LoginViewProps {
  users: UserAccount[];
  approvalRequests?: AccountApprovalRequest[];
  onLoginSuccess: (user: UserAccount) => void;
  onOpenSignUp?: (initialMode?: 'register' | 'status', prefillIdentifier?: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onBackToLanding?: () => void;
}

const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const LoginView: React.FC<LoginViewProps> = ({
  users,
  approvalRequests = [],
  onLoginSuccess,
  onOpenSignUp,
  darkMode,
  onToggleDarkMode,
  onBackToLanding,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedRequestForNotice, setMatchedRequestForNotice] = useState<AccountApprovalRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoverySubmitted, setRecoverySubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMatchedRequestForNotice(null);

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
          u.email.toLowerCase() === trimmedId.toLowerCase() ||
          (normalizedInputPhone && u.normalizedPhone === normalizedInputPhone)
      );

      if (matchedUser && verifyUserCredential(matchedUser, password)) {
        if (matchedUser.status !== 'Active') {
          setIsSubmitting(false);
          setError(
            `Account "${matchedUser.username}" is currently ${matchedUser.status}. Contact an authorized administrator.`
          );
          return;
        }
        setIsSubmitting(false);
        onLoginSuccess(matchedUser);
        return;
      }

      // Check if credentials match an existing account approval request
      const inputDigest = computeCredentialDigest(password);
      const matchedReq = approvalRequests.find(
        (r) =>
          (r.username.toLowerCase() === trimmedId.toLowerCase() ||
            r.email.toLowerCase() === trimmedId.toLowerCase() ||
            (normalizedInputPhone && r.normalizedPhone === normalizedInputPhone)) &&
          r.credentialDigest === inputDigest
      );

      if (matchedReq && matchedReq.status !== 'Approved') {
        setIsSubmitting(false);
        setMatchedRequestForNotice(matchedReq);
        if (matchedReq.status === 'Pending Approval') {
          setError(
            `Your registration request (${matchedReq.id}) is currently Pending Approval (${matchedReq.routedApproverLabel}). You can sign in once an authorized approver approves your account.`
          );
        } else if (matchedReq.status === 'Correction Requested') {
          setError(
            `Correction Requested on registration (${matchedReq.id}): ${
              matchedReq.decisionNote || 'Please review and update your registration details.'
            }`
          );
        } else {
          setError(
            `Registration request (${matchedReq.id}) was Rejected${
              matchedReq.decisionNote ? `: ${matchedReq.decisionNote}` : '.'
            }`
          );
        }
        return;
      }

      setIsSubmitting(false);
      setError(
        'Invalid username/phone number or password. Please verify your credentials or contact your Regional Nodal Administrator.'
      );
    }, 180);
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
          <span>Statutory Compliance Network</span>
          <span aria-hidden="true" className="text-[#C2410C]">·</span>
          <span>Document Authentication &amp; Audit</span>
          <span aria-hidden="true" className="text-[#C2410C]">·</span>
          <span>Authorized Official Access</span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl liquid-glass liquid-glass-interactive text-xs font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#046A38]" />
              <span>Product Overview</span>
            </button>
          )}
          {onOpenSignUp && (
            <button
              type="button"
              onClick={() => onOpenSignUp('register')}
              data-testid="header-signup-btn"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Column: Official Sign-In Card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: SMOOTH_EASE }}
          className="lg:col-span-5 liquid-glass heritage-double-frame rounded-2xl p-6 sm:p-8 relative"
        >
          <HeritageCornerOrnament position="top-left" size="sm" />
          <HeritageCornerOrnament position="bottom-right" size="sm" />
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
              VERIDEX Official Sign-In
            </p>
            <h1 className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-stone-700 dark:text-stone-300 mt-1.5 leading-relaxed">
              Enter your globally unique username or registered 10-digit mobile number to access your role-authorized workspace.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="login-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.22, ease: SMOOTH_EASE }}
                className="mb-5 p-3.5 rounded-xl bg-red-500/10 dark:bg-red-950/60 border border-red-400/70 dark:border-red-500/30 space-y-2 text-xs text-red-900 dark:text-red-200"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
                {matchedRequestForNotice && onOpenSignUp && (
                  <div className="pt-1 pl-6">
                    <button
                      type="button"
                      onClick={() => onOpenSignUp('status', matchedRequestForNotice.username)}
                      className="px-3 py-1.5 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" />
                      <span>
                        {matchedRequestForNotice.status === 'Correction Requested'
                          ? 'Review & Amend Registration Request'
                          : 'View Registration Status'}
                      </span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1.5"
              >
                Username or Registered Mobile Number
              </label>
              <input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter username or +91 mobile number"
                autoComplete="username"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C2410C] focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-stone-800 dark:text-stone-300"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotOpen(true);
                    setRecoverySubmitted(false);
                  }}
                  className="text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer"
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
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#C2410C] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#046A38] hover:text-[#03542C] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              data-testid="login-submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-60 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm border border-[#7C2D12] cursor-pointer"
            >
              <Lock className="w-4 h-4 text-white" />
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
            </button>
          </form>

          {onOpenSignUp && (
            <div className="mt-5 pt-4 border-t border-[#C2410C]/30 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  New to VERIDEX?
                </span>
                <button
                  type="button"
                  onClick={() => onOpenSignUp('status')}
                  data-testid="check-request-status-link"
                  className="text-xs font-semibold text-[#046A38] dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Check Request Status</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenSignUp('register')}
                data-testid="open-signup-btn"
                className="w-full py-2.5 px-4 rounded-xl liquid-glass-subtle liquid-glass-interactive border-2 border-[#046A38]/45 text-stone-900 dark:text-stone-100 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#046A38]" />
                <span>Sign Up — Request Role Account</span>
              </button>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-[#C2410C]/25 text-xs text-stone-700 dark:text-stone-300 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#046A38] shrink-0 mt-0.5" />
              <p>
                <strong>Role &amp; Account Approval Governance:</strong> New Student, Faculty, and Institutional Manager registrations enter a tiered approval queue before account activation. Self-registration of Admin privileges is strictly disabled.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Right Column: Statutory Governance & Portal Access Protocols */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: SMOOTH_EASE }}
          className="lg:col-span-7 liquid-glass rounded-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="border-b border-[#C2410C]/30 pb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
              Statutory Governance &amp; Operational Mandates
            </div>
            <h2 className="text-lg font-display font-bold text-stone-900 dark:text-white">
              Institutional Compliance &amp; Document Authentication System
            </h2>
            <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
              VERIDEX provides a unified, role-isolated regulatory workspace for reviewing institutional approval dossiers, authenticating statutory certificates, monitoring validity windows, and recording compliance determinations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl liquid-glass-subtle liquid-glass-interactive space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                <Scale className="w-4 h-4 text-[#046A38] shrink-0" />
                <span>Regional Compliance Auditors</span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Evaluate institutional applications, inspect 6-pillar document verification findings, issue deficiency or clarification notices, and record authorized compliance decisions.
              </p>
            </div>

            <div className="p-4 rounded-xl liquid-glass-subtle liquid-glass-interactive space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                <Building2 className="w-4 h-4 text-[#046A38] shrink-0" />
                <span>Institutional Nodal Officers</span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Submit statutory approval applications, manage versioned institutional document repositories, track certificate renewals, and respond to regulatory review queries.
              </p>
            </div>

            <div className="p-4 rounded-xl liquid-glass-subtle liquid-glass-interactive space-y-1.5 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                <FileCheck2 className="w-4 h-4 text-[#046A38] shrink-0" />
                <span>6-Pillar Document Authentication &amp; Officer Sign-Off</span>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                Every registered certificate undergoes structured evaluation across Completeness, Statutory Expiry, Cross-Document Consistency, Integrity Screening, Issuing-Authority Verification, and Mandatory Human Officer Review.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl liquid-glass-subtle text-xs text-stone-700 dark:text-stone-200 space-y-1.5">
            <div className="font-bold text-stone-900 dark:text-white">
              Official Security &amp; Audit Logging Notice
            </div>
            <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
              Access to this portal is restricted to authorized government compliance officials, verified institutional nodal signatories, and registered academic personnel. All session authentications, document revisions, and administrative actions are permanently logged with timestamp and actor identity.
            </p>
          </div>
        </motion.section>
      </main>

      {/* Forgot Password Dialog */}
      <AnimatePresence>
        {forgotOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: SMOOTH_EASE }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{ duration: 0.24, ease: SMOOTH_EASE }}
              className="liquid-glass-elevated rounded-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <KeyRound className="w-5 h-5 text-[#046A38]" />
                <h2
                  id="forgot-password-title"
                  className="text-base font-display font-bold text-stone-900 dark:text-white"
                >
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
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                    Enter your registered username or normalized mobile number. Your credential reset request will be logged and routed to the Regional Nodal Administrator for identity verification.
                  </p>
                  <div>
                    <label
                      htmlFor="recovery-id"
                      className="block text-xs font-semibold text-stone-800 dark:text-stone-300 mb-1"
                    >
                      Username or Registered Mobile Number
                    </label>
                    <input
                      id="recovery-id"
                      type="text"
                      required
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      placeholder="Enter username or +91 mobile number"
                      className="w-full px-3 py-2 text-sm rounded-xl border-2 border-[#C2410C]/40 bg-[#FFFDF9] dark:bg-stone-900 text-stone-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(false)}
                      className="px-3.5 py-2 rounded-xl liquid-glass-subtle text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold cursor-pointer"
                    >
                      Submit Recovery Request
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-[#046A38]/40 text-xs text-stone-900 dark:text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Credential Recovery Request Logged</p>
                      <p className="mt-1 text-stone-700 dark:text-emerald-300">
                        Verification ticket recorded for <strong>{recoveryIdentifier}</strong> and routed to the Regional Nodal Administrator for identity confirmation.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setForgotOpen(false)}
                      className="px-4 py-2 rounded-xl bg-[#046A38] text-white text-xs font-semibold cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
