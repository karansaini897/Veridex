import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  ShieldAlert,
  FileQuestion,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sun,
  Moon,
  Send,
  Info,
  Lock,
  HelpCircle,
  Clock,
  FileText,
} from 'lucide-react';
import {
  HeritageAmbientPattern,
  HeritageCornerOrnament,
  HeritageEmbroideredBorder,
  HeritageSectionDivider,
} from './HeritageOrnaments';
import {
  ApplicationRecord,
  ContactEnquiryCategory,
  ContactEnquirySubmission,
  UserAccount,
} from '../types/portal';
import {
  CONTACT_ENQUIRY_CATEGORIES,
  formatTimestampForDisplay,
  getCurrentIsoTimestamp,
  validateContactEnquiryInput,
} from '../lib/domain';

interface ContactUsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser: UserAccount | null;
  applications?: ApplicationRecord[];
  initialReference?: string;
  onBackToApp: () => void;
  onNavigatePrivacy: () => void;
  onOpenLogin?: () => void;
  onRecordAudit?: (action: string, targetId: string, details: string) => void;
}

const CONTACT_STORAGE_KEY = 'veridex_portal_contact_enquiries_v7';

const CATEGORY_DESCRIPTIONS: Record<ContactEnquiryCategory, string> = {
  'General enquiry': 'Questions about VERIDEX institutional onboarding, workflow stages, or role permissions.',
  'Technical support': 'Assistance with browser OCR processing, document previewing, vault storage, or login issues.',
  'Application or document issue': 'Clarifications regarding missing checklist items, rectification notices, or version uploads.',
  'Document verification concern': 'Questions about 6-pillar verification flags, cross-document consistency checks, or expiry alerts.',
  'Privacy or data handling concern': 'Requests regarding personal vault data, stored metadata, or privacy policy disclosures.',
  'Security concern': 'Reporting suspected unauthorized access, role boundary concerns, or vulnerability disclosures.',
  'Feedback or suggestion': 'Suggestions for improving validation rules, compliance workflows, or user experience.',
};

export const ContactUsView: React.FC<ContactUsViewProps> = ({
  darkMode,
  onToggleDarkMode,
  currentUser,
  applications = [],
  initialReference = '',
  onBackToApp,
  onNavigatePrivacy,
  onOpenLogin,
  onRecordAudit,
}) => {
  const [name, setName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [category, setCategory] = useState<ContactEnquiryCategory>('General enquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [applicationReference, setApplicationReference] = useState(initialReference);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<ContactEnquirySubmission | null>(null);
  const [recentEnquiries, setRecentEnquiries] = useState<ContactEnquirySubmission[]>(() => {
    try {
      const raw = window.localStorage.getItem(CONTACT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (currentUser) {
      setName((prev) => prev || currentUser.fullName);
      setEmail((prev) => prev || currentUser.email);
    }
  }, [currentUser]);

  useEffect(() => {
    if (initialReference) {
      setApplicationReference(initialReference);
    }
  }, [initialReference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateContactEnquiryInput({
      name,
      email,
      category,
      subject,
      message,
      applicationReference,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validation.sanitized),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server could not process the contact enquiry.');
      }

      const data = await response.json();
      const recorded: ContactEnquirySubmission = {
        id: data.enquiry.id,
        ticketReference: data.enquiry.ticketReference,
        name: data.enquiry.name,
        email: data.enquiry.email,
        category: data.enquiry.category as ContactEnquiryCategory,
        subject: data.enquiry.subject,
        message: data.enquiry.message,
        applicationReference: data.enquiry.applicationReference,
        submittedAt: formatTimestampForDisplay(data.enquiry.submittedAt || getCurrentIsoTimestamp()),
        deliveryMode: 'server_recorded',
        statusNote: data.enquiry.statusNote,
      };

      const updatedList = [recorded, ...recentEnquiries].slice(0, 15);
      setRecentEnquiries(updatedList);
      try {
        window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(updatedList));
      } catch {
        // Ignore storage quota errors
      }

      setLatestSubmission(recorded);
      setSubject('');
      setMessage('');
      if (onRecordAudit) {
        onRecordAudit(
          'Support Enquiry Recorded',
          recorded.ticketReference,
          `Submitted ${recorded.category} enquiry ("${recorded.subject}")${recorded.applicationReference ? ` referencing ${recorded.applicationReference}` : ''}.`
        );
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to reach the VERIDEX server endpoint (/api/contact). Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="contact-us-page"
      className="min-h-screen liquid-canvas text-[#241B12] dark:text-[#F1E8D8] flex flex-col selection:bg-[#9E2919]/25 relative overflow-x-hidden"
    >
      <HeritageAmbientPattern />
      <div className="h-1.5 w-full tricolour-bar shrink-0 sticky top-0 z-50" />

      {/* Top Navigation Header */}
      <header className="sticky top-1.5 z-40 border-b border-[#C7A56A]/65 bg-[#E7D8C0]/95 dark:bg-[#221911]/95 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToApp}
              data-testid="contact-back-btn"
              className="p-1.5 rounded-xl hover:bg-[#DEC9A8]/55 dark:hover:bg-[#312419]/65 transition-colors cursor-pointer flex items-center gap-2 text-left"
              aria-label="Return to VERIDEX Portal"
            >
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
                alt="VERIDEX Official Logo"
                referrerPolicy="no-referrer"
                className="h-9 w-auto rounded-lg object-contain bg-[#E7D8C0] border-2 border-[#C7A56A] shadow-xs shrink-0"
              />
              <div className="hidden sm:flex flex-col">
                <span className="font-display font-bold text-base tracking-tight text-[#241B12] dark:text-[#F1E8D8] leading-tight">
                  VERIDEX
                </span>
                <span className="text-[11px] font-semibold text-[#046A38] dark:text-[#C7A56A] leading-tight">
                  Support &amp; Verification Enquiries
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl liquid-glass-subtle text-[#241B12] dark:text-[#F1E8D8] hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#C7A56A]" /> : <Moon className="w-4 h-4 text-[#5C4A38]" />}
            </button>

            <button
              type="button"
              onClick={onNavigatePrivacy}
              data-testid="contact-to-privacy-link"
              className="px-3.5 py-2 rounded-xl liquid-glass-subtle text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] hover:border-[#9E2919]/60 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>

            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-[#9E2919] hover:bg-[#822013] text-[#F1E8D8] text-xs font-semibold transition-all cursor-pointer shadow-xs border border-[#C7A56A]/65 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{currentUser ? 'Return to Workspace' : 'Back to Portal'}</span>
            </button>
          </div>
        </div>
        <HeritageEmbroideredBorder />
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        {/* 1. Contact Introduction Banner */}
        <section className="rounded-3xl liquid-glass-elevated heritage-double-frame p-6 sm:p-10 mb-8 relative overflow-hidden">
          <HeritageCornerOrnament position="top-left" size="md" />
          <HeritageCornerOrnament position="top-right" size="md" />
          <HeritageCornerOrnament position="bottom-left" size="md" />
          <HeritageCornerOrnament position="bottom-right" size="md" />

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-lg bg-[#046A38]/15 dark:bg-[#046A38]/30 text-[#046A38] dark:text-emerald-300 text-[11px] font-mono-tabular font-bold uppercase tracking-wider border border-[#046A38]/35">
              SIH26261 · Institutional Support Desk
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#9E2919]/15 dark:bg-[#9E2919]/30 text-[#9E2919] dark:text-amber-300 text-[11px] font-mono-tabular font-semibold border border-[#9E2919]/35">
              Route: /contact
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8] tracking-tight">
            Contact Us &amp; Verification Support
          </h1>
          <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] mt-2.5 max-w-4xl leading-relaxed">
            Use this page for technical support, application or document verification enquiries, institutional onboarding questions, privacy or data handling requests, security disclosures, and platform feedback.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Validated Contact Form & Submission Receipt */}
          <div className="lg:col-span-7 space-y-6">
            {/* Confirmed Server Receipt Banner */}
            {latestSubmission && (
              <section
                role="status"
                data-testid="contact-submission-receipt"
                className="rounded-2xl liquid-glass-elevated border-2 border-[#046A38]/60 p-6 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-[#046A38] dark:text-emerald-400 shrink-0" />
                    <div>
                      <h2 className="text-base font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                        Enquiry Recorded in VERIDEX Server Intake Log
                      </h2>
                      <p className="text-xs font-mono-tabular text-[#046A38] dark:text-emerald-300 font-semibold">
                        Ticket Reference: {latestSubmission.ticketReference} · {latestSubmission.submittedAt}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8F2E6] dark:bg-[#1E160E] border border-[#C7A56A]/45 text-xs text-[#5C4A38] dark:text-[#D5C6B0] space-y-1.5">
                  <div>
                    <strong className="text-[#241B12] dark:text-[#F1E8D8]">Category:</strong> {latestSubmission.category}
                    {latestSubmission.applicationReference ? (
                      <span> · <strong className="text-[#241B12] dark:text-[#F1E8D8]">Linked Ref:</strong> <code className="font-mono-tabular">{latestSubmission.applicationReference}</code></span>
                    ) : null}
                  </div>
                  <div>
                    <strong className="text-[#241B12] dark:text-[#F1E8D8]">Subject:</strong> {latestSubmission.subject}
                  </div>
                  <p className="text-[11px] pt-1 border-t border-[#C7A56A]/30 text-[#5C4A38] dark:text-[#D5C6B0]">
                    <strong>Delivery Status Disclosure:</strong> {latestSubmission.statusNote}
                  </p>
                </div>
              </section>
            )}

            {/* Contact Form */}
            <section className="liquid-glass rounded-2xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Submit a Support or Verification Enquiry
                </h2>
                <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0] mt-1">
                  All fields marked with an asterisk (*) are required. Submissions are validated and logged via the <code className="font-mono-tabular">/api/contact</code> server endpoint.
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-red-950/20 border border-red-500/45 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] mb-1.5"
                    >
                      Full Name *
                    </label>
                    <input
                      id="contact-name"
                      data-testid="contact-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Dr. Aashay Khadkikar"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-subtle text-[#241B12] dark:text-[#F1E8D8] placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    />
                    {errors.name && (
                      <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-medium">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] mb-1.5"
                    >
                      Email Address *
                    </label>
                    <input
                      id="contact-email"
                      data-testid="contact-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@institution.edu.in"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-subtle text-[#241B12] dark:text-[#F1E8D8] placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    />
                    {errors.email && (
                      <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-medium">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="contact-category"
                      className="block text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] mb-1.5"
                    >
                      Enquiry Category *
                    </label>
                    <select
                      id="contact-category"
                      data-testid="contact-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ContactEnquiryCategory)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-subtle text-[#241B12] dark:text-[#F1E8D8] bg-[#F8F2E6] dark:bg-[#1E160E] focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    >
                      {CONTACT_ENQUIRY_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-medium">
                        {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="contact-app-ref"
                      className="block text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] mb-1.5"
                    >
                      Application or Document Reference (Optional)
                    </label>
                    <input
                      id="contact-app-ref"
                      data-testid="contact-reference-input"
                      type="text"
                      list="veridex-known-app-refs"
                      value={applicationReference}
                      onChange={(e) => setApplicationReference(e.target.value)}
                      placeholder="e.g., APP-2026-0104 or FAC-QUA-KAS-02"
                      className="w-full px-3.5 py-2.5 text-xs font-mono-tabular rounded-xl liquid-glass-subtle text-[#241B12] dark:text-[#F1E8D8] placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                    />
                    <datalist id="veridex-known-app-refs">
                      {applications.map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.institutionName} ({app.category})
                        </option>
                      ))}
                    </datalist>
                    {errors.applicationReference && (
                      <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-medium">
                        {errors.applicationReference}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-subject"
                    className="block text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] mb-1.5"
                  >
                    Subject *
                  </label>
                  <input
                    id="contact-subject"
                    data-testid="contact-subject-input"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your verification, application, or support request"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-subtle text-[#241B12] dark:text-[#F1E8D8] placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  />
                  {errors.subject && (
                    <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-medium">
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] mb-1.5"
                  >
                    Message &amp; Supporting Details *
                  </label>
                  <textarea
                    id="contact-message"
                    data-testid="contact-message-input"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide specific details such as the application reference ID, internal document code, or validation finding ID. Do not include passwords or sensitive personal credentials."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-subtle text-[#241B12] dark:text-[#F1E8D8] placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
                  />
                  {errors.message && (
                    <p className="text-[11px] text-red-700 dark:text-red-400 mt-1 font-medium">
                      {errors.message}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] text-[#5C4A38] dark:text-[#D5C6B0] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#046A38] dark:text-[#789783] shrink-0" />
                    <span>Never include passwords, OTPs, or secret keys in support requests.</span>
                  </p>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="contact-submit-btn"
                    className="px-6 py-2.5 rounded-xl bg-[#9E2919] hover:bg-[#822013] disabled:opacity-50 text-[#F1E8D8] text-xs font-semibold transition-all cursor-pointer shadow-xs border border-[#C7A56A]/65 flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Recording Enquiry...' : 'Submit Enquiry'}</span>
                  </button>
                </div>
              </form>
            </section>

            {/* Recent Enquiries Logged in This Browser / Server Session */}
            {recentEnquiries.length > 0 && (
              <section className="liquid-glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                      Your Recorded Support Enquiries ({recentEnquiries.length})
                    </h2>
                    <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0]">
                      Reference log of enquiries submitted from this session.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-[#C7A56A]/25 space-y-3">
                  {recentEnquiries.slice(0, 5).map((item) => (
                    <div key={item.id} className="pt-3 first:pt-0 text-xs space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                          {item.ticketReference}
                        </span>
                        <span className="font-mono-tabular text-[11px] text-[#5C4A38] dark:text-[#D5C6B0]">
                          {item.submittedAt}
                        </span>
                      </div>
                      <div className="font-semibold text-[#241B12] dark:text-[#F1E8D8]">
                        [{item.category}] {item.subject}
                      </div>
                      {item.applicationReference && (
                        <div className="text-[11px] font-mono-tabular text-[#046A38] dark:text-emerald-300">
                          Referenced Record: {item.applicationReference}
                        </div>
                      )}
                      <p className="text-[11px] text-[#5C4A38] dark:text-[#D5C6B0] line-clamp-2">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right 5 Columns: Categories Guide, Honest Contact Info Disclosure & Submission Instructions */}
          <aside className="lg:col-span-5 space-y-6">
            {/* 2. Contact Categories Overview */}
            <section className="liquid-glass rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#9E2919] dark:text-[#C7A56A]" />
                <h2 className="text-sm font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Supported Enquiry Categories
                </h2>
              </div>
              <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0]">
                Select any category below to pre-select it in the support form:
              </p>
              <div className="space-y-2">
                {CONTACT_ENQUIRY_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#9E2919]/15 dark:bg-[#9E2919]/25 border-[#9E2919] dark:border-[#C7A56A]'
                          : 'liquid-glass-subtle border-[#C7A56A]/30 hover:border-[#C7A56A]/65'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#241B12] dark:text-[#F1E8D8] flex items-center justify-between">
                        <span>{cat}</span>
                        {isSelected && (
                          <span className="text-[10px] font-mono-tabular uppercase px-1.5 py-0.5 rounded bg-[#9E2919] text-white">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5C4A38] dark:text-[#D5C6B0] mt-0.5 leading-relaxed">
                        {CATEGORY_DESCRIPTIONS[cat]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 5. Honest Contact Information Notice */}
            <section className="liquid-glass-elevated heritage-double-frame rounded-2xl p-6 space-y-3 relative">
              <HeritageCornerOrnament position="top-left" size="sm" />
              <HeritageCornerOrnament position="top-right" size="sm" />
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#C2410C] dark:text-amber-400 shrink-0" />
                <h2 className="text-sm font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Institutional Contact Configuration Notice
                </h2>
              </div>
              <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                In accordance with VERIDEX transparency guidelines, fictional telephone numbers, street addresses, and unmonitored mailbox addresses are never displayed.
              </p>
              <div className="p-3.5 rounded-xl bg-[#F8F2E6] dark:bg-[#1E160E] border border-[#C7A56A]/45 space-y-2 text-xs font-mono-tabular">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#5C4A38] dark:text-[#D5C6B0]">In-App Support Intake:</span>
                  <span className="text-[#046A38] dark:text-emerald-300 font-bold">Active (/api/contact)</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#5C4A38] dark:text-[#D5C6B0]">Official Helpdesk Email:</span>
                  <span className="text-[#9E2919] dark:text-amber-300">Awaiting Institutional Config</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#5C4A38] dark:text-[#D5C6B0]">Telephone / Office Desk:</span>
                  <span className="text-[#9E2919] dark:text-amber-300">Awaiting Institutional Config</span>
                </div>
              </div>
            </section>

            {/* 6. Additional Support Instructions */}
            <section className="liquid-glass rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#046A38] dark:text-emerald-400 shrink-0" />
                <h2 className="text-sm font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Guidelines for Faster Verification Support
                </h2>
              </div>
              <ul className="space-y-2 text-xs text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Include Reference Numbers:</strong> When enquiring about an institutional dossier or certificate flag, include the Application ID (for example, <code className="font-mono-tabular">APP-2026-0104</code>) or Internal Document Code (for example, <code className="font-mono-tabular">FAC-QUA-KAS-02</code>).
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Protect Sensitive Credentials:</strong> Never send account passwords, session tokens, Aadhaar numbers, or unrequested sensitive personal data through this form.
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Privacy &amp; Data Handling:</strong> Review our{' '}
                  <button
                    type="button"
                    onClick={onNavigatePrivacy}
                    className="text-[#9E2919] dark:text-[#C7A56A] font-semibold underline cursor-pointer"
                  >
                    Privacy Policy (/privacy-policy)
                  </button>{' '}
                  for full details on how uploaded documents, OCR text, and account records are stored.
                </li>
              </ul>
            </section>
          </aside>
        </div>

        <HeritageSectionDivider className="my-10" />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#C7A56A]/45 bg-[#EAE0CE] dark:bg-[#1C140D] py-8 px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#5C4A38] dark:text-[#D5C6B0]">
          <div>
            <span className="font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">VERIDEX</span> · Institutional Document Management &amp; Compliance Verification (SIH26261)
          </div>
          <div className="flex flex-wrap items-center gap-5 font-semibold">
            <button
              type="button"
              onClick={onBackToApp}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              {currentUser ? 'Workspace' : 'Home'}
            </button>
            <button
              type="button"
              onClick={onNavigatePrivacy}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-[#9E2919] dark:text-[#C7A56A] underline">Contact Us</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
