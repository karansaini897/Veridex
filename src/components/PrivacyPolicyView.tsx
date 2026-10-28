import React from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  Database,
  Cpu,
  Users,
  Clock,
  HardDrive,
  UserCheck,
  GraduationCap,
  Globe,
  RefreshCw,
  Mail,
  ArrowLeft,
  Sun,
  Moon,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  HeritageAmbientPattern,
  HeritageCornerOrnament,
  HeritageEmbroideredBorder,
  HeritageSectionDivider,
} from './HeritageOrnaments';
import { isSupabaseConfigured } from '../lib/supabase';

interface PrivacyPolicyViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isAuthenticated: boolean;
  onBackToApp: () => void;
  onNavigateContact: () => void;
  onOpenLogin?: () => void;
}

interface PolicySectionMeta {
  id: string;
  number: string;
  title: string;
  icon: React.FC<{ className?: string }>;
}

const POLICY_SECTIONS: PolicySectionMeta[] = [
  { id: 'section-1', number: '01', title: 'Introduction', icon: ShieldCheck },
  { id: 'section-2', number: '02', title: 'Information Collected', icon: FileText },
  { id: 'section-3', number: '03', title: 'Uploaded Documents & Extracted Information', icon: Database },
  { id: 'section-4', number: '04', title: 'Purpose of Processing', icon: CheckCircle2 },
  { id: 'section-5', number: '05', title: 'AI-Assisted Processing & Limitations', icon: Cpu },
  { id: 'section-6', number: '06', title: 'Data Sharing & Access', icon: Users },
  { id: 'section-7', number: '07', title: 'Data Storage & Retention', icon: Clock },
  { id: 'section-8', number: '08', title: 'Security', icon: Lock },
  { id: 'section-9', number: '09', title: 'Cookies & Local Storage', icon: HardDrive },
  { id: 'section-10', number: '10', title: 'User Rights & Requests', icon: UserCheck },
  { id: 'section-11', number: '11', title: 'Student & Institutional Information', icon: GraduationCap },
  { id: 'section-12', number: '12', title: 'External Services', icon: Globe },
  { id: 'section-13', number: '13', title: 'Policy Updates', icon: RefreshCw },
  { id: 'section-14', number: '14', title: 'Contact & Privacy Concerns', icon: Mail },
];

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({
  darkMode,
  onToggleDarkMode,
  isAuthenticated,
  onBackToApp,
  onNavigateContact,
  onOpenLogin,
}) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      data-testid="privacy-policy-page"
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
              data-testid="privacy-back-btn"
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
                  Privacy &amp; Data Governance Policy
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
              onClick={onNavigateContact}
              data-testid="privacy-to-contact-link"
              className="px-3.5 py-2 rounded-xl liquid-glass-subtle text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] hover:border-[#9E2919]/60 transition-colors cursor-pointer"
            >
              Contact Us
            </button>

            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-[#9E2919] hover:bg-[#822013] text-[#F1E8D8] text-xs font-semibold transition-all cursor-pointer shadow-xs border border-[#C7A56A]/65 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isAuthenticated ? 'Return to Workspace' : 'Back to Portal'}</span>
            </button>
          </div>
        </div>
        <HeritageEmbroideredBorder />
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        {/* Hero Banner */}
        <section className="rounded-3xl liquid-glass-elevated heritage-double-frame p-6 sm:p-10 mb-8 relative overflow-hidden">
          <HeritageCornerOrnament position="top-left" size="md" />
          <HeritageCornerOrnament position="top-right" size="md" />
          <HeritageCornerOrnament position="bottom-left" size="md" />
          <HeritageCornerOrnament position="bottom-right" size="md" />

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-lg bg-[#046A38]/15 dark:bg-[#046A38]/30 text-[#046A38] dark:text-emerald-300 text-[11px] font-mono-tabular font-bold uppercase tracking-wider border border-[#046A38]/35">
              SIH26261 · Smart Automation Theme
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#9E2919]/15 dark:bg-[#9E2919]/30 text-[#9E2919] dark:text-amber-300 text-[11px] font-mono-tabular font-semibold border border-[#9E2919]/35">
              Route: /privacy-policy
            </span>
            <span className="px-2.5 py-1 rounded-lg liquid-glass-subtle text-[11px] font-mono-tabular text-[#5C4A38] dark:text-[#D5C6B0]">
              Effective Version: October 2026
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8] tracking-tight">
            VERIDEX Privacy Policy &amp; Data Handling Disclosure
          </h1>
          <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] mt-2.5 max-w-4xl leading-relaxed">
            This policy explains how <strong>VERIDEX: Institutional Document Management</strong> collects, processes, stores, and protects account records, institutional applications, uploaded documents, OCR-extracted text, and compliance review logs. Every statement in this document reflects the actual technical architecture of this application.
          </p>

          <div className="mt-5 p-4 rounded-2xl bg-[#F8F2E6] dark:bg-[#1E160E] border border-[#C7A56A]/55 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-[#C2410C] dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="text-xs text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                <strong className="text-[#241B12] dark:text-[#F1E8D8]">Scope &amp; Non-Endorsement Disclosure:</strong> VERIDEX is developed for problem statement <strong>SIH26261</strong> (AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification, associated with AICTE under the Smart Automation theme). VERIDEX is an independent software system and does not claim official operation or legal endorsement by AICTE or any government ministry unless formally deployed by an authorized institution.
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-mono-tabular font-semibold bg-[#046A38]/15 text-[#046A38] dark:text-emerald-300 border border-[#046A38]/35">
                <Database className="w-3.5 h-3.5" />
                <span>Backend Mode: {isSupabaseConfigured ? 'Supabase + Local Vault' : 'Local Browser Storage'}</span>
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sticky Table of Contents Sidebar */}
          <aside
            aria-label="Privacy Policy Table of Contents"
            className="lg:col-span-4 lg:sticky lg:top-24 liquid-glass rounded-2xl p-5 space-y-4"
          >
            <div>
              <h2 className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#9E2919] dark:text-[#C7A56A]">
                Table of Contents
              </h2>
              <p className="text-[11px] text-[#5C4A38] dark:text-[#D5C6B0] mt-0.5">
                Jump directly to any of the 14 required disclosure sections.
              </p>
            </div>

            <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {POLICY_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#241B12] dark:text-[#F1E8D8] hover:bg-[#DEC9A8]/55 dark:hover:bg-[#312419]/75 transition-colors flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="font-mono-tabular text-[11px] font-bold text-[#9E2919] dark:text-[#C7A56A] shrink-0">
                      {sec.number}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-[#046A38] dark:text-[#789783] shrink-0" />
                    <span className="truncate">{sec.title}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[#C7A56A]/35 flex flex-col gap-2">
              <button
                type="button"
                onClick={onNavigateContact}
                className="w-full py-2 px-3 rounded-xl bg-[#046A38] hover:bg-[#03542C] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Submit a Privacy or Data Enquiry</span>
              </button>
              {!isAuthenticated && onOpenLogin && (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="w-full py-2 px-3 rounded-xl liquid-glass-subtle text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] hover:border-[#C2410C] transition-colors cursor-pointer"
                >
                  Sign In to VERIDEX Portal
                </button>
              )}
            </div>
          </aside>

          {/* 14 Policy Sections */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Introduction */}
            <article id="section-1" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  01
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  1. Introduction
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                <strong>VERIDEX: Institutional Document Management</strong> is a web-based platform designed to support institutional application validation, document authentication checks, and regulatory compliance verification aligned with <strong>SIH26261</strong> (Smart Automation theme). The platform serves four primary user roles: System Administrators / Compliance Reviewers, Institutional Representatives (IRs), Faculty Members, and Students.
              </p>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                This Privacy Policy describes what information is processed when you access the application, how uploaded documents and extracted fields are handled, what storage layers are active in your browser and connected backend services, and what controls are available to you.
              </p>
            </article>

            {/* 2. Information Collected */}
            <article id="section-2" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  02
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  2. Information Collected
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Depending on your role and workflow actions within VERIDEX, the system collects and processes the following categories of information:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Account &amp; Profile Details:</strong> Full name, username, email address, normalized phone number, date of birth, account status, and role assignment (<code className="font-mono-tabular">admin</code>, <code className="font-mono-tabular">institutional_rep</code>, <code className="font-mono-tabular">faculty</code>, or <code className="font-mono-tabular">student</code>).
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Institutional &amp; Organisational Affiliation:</strong> Linked institution ID and name, official institution code, academic department (<code className="font-mono-tabular">CMPN</code>, <code className="font-mono-tabular">IT</code>, <code className="font-mono-tabular">AURO</code>, <code className="font-mono-tabular">EXTC</code>, <code className="font-mono-tabular">AIDS</code>), academic year, class division, roll number / PRN, or designation.
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Application &amp; Submission Metadata:</strong> Institutional application reference numbers, application categories, checklist item states, submission dates, rectification responses, and reviewer decision records.
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Audit &amp; Review Activity:</strong> Timestamps, actor identity, role, target record identifiers, and reviewer justifications recorded when accounts are approved, documents are uploaded or verified, findings are resolved, or compliance decisions are logged.
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Support &amp; Contact Enquiries:</strong> Name, email address, enquiry category, subject, message text, and optional application reference number submitted through the <code className="font-mono-tabular">/contact</code> form.
                </li>
              </ul>
            </article>

            {/* 3. Uploaded Documents and Extracted Information */}
            <article id="section-3" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  03
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  3. Uploaded Documents and Extracted Information
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                When users upload PDFs or image files (<code className="font-mono-tabular">.pdf</code>, <code className="font-mono-tabular">.jpg</code>, <code className="font-mono-tabular">.png</code>) to the Document Repository, Personal Document Vault, or Application Checklists, the system processes:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">File Attributes:</strong> Original file name, MIME type, file size label, upload date, version history, and storage path.
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Client-Side OCR Text Extraction:</strong> For supported image files and personal vault uploads, optical character recognition (OCR) runs directly inside your browser using <code className="font-mono-tabular">tesseract.js</code> to extract visible text, holder names, certificate numbers, issuing authorities, and validity dates.
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Source Provenance Separation:</strong> VERIDEX explicitly distinguishes values that were <em>OCR Extracted</em> from values that were <em>Manually Entered</em> by an uploader or <em>Verified</em> by an authorized compliance reviewer.
                </li>
              </ul>
            </article>

            {/* 4. Purpose of Processing */}
            <article id="section-4" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  04
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  4. Purpose of Processing
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Information and documents are processed strictly for the operational workflows of the VERIDEX portal:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li>Authenticating user sessions and enforcing role-based and institution-scoped access control.</li>
                <li>Validating institutional application completeness against category-specific document checklists.</li>
                <li>Performing cross-document consistency comparisons across linked application records (such as institution code, holder name, dates, and declared facility measurements).</li>
                <li>Screening certificate validity windows, duplicate reference numbers, and metadata completeness.</li>
                <li>Evaluating dossiers against configured regulatory compliance rules and recording human reviewer determinations, rectification notices, and audit logs.</li>
              </ul>
            </article>

            {/* 5. AI-Assisted Processing and Limitations */}
            <article id="section-5" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  05
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  5. AI-Assisted Processing and Limitations
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                VERIDEX combines deterministic rule-based checks, client-side OCR (<code className="font-mono-tabular">tesseract.js</code>), and an optional server-proxied compliance assistant (<code className="font-mono-tabular">/api/gemini/chat</code> powered by Google Gemini when configured on the server).
              </p>
              <div className="p-4 rounded-xl bg-[#F8F2E6] dark:bg-[#1E160E] border border-[#C7A56A]/45 space-y-2 text-xs text-[#5C4A38] dark:text-[#D5C6B0]">
                <p className="font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Mandatory Human Review &amp; Technical Limitations:
                </p>
                <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                  <li>Automated completeness, consistency, expiry, and anomaly indicators are <strong>decision-support signals only</strong> and do not constitute final legal or regulatory determinations.</li>
                  <li>Final application approval, conditional compliance, or deficiency notices require explicit review and action by an authorized human reviewer.</li>
                  <li>Cryptographic digital signature (PKI/DSC) verification, live QR code signature verification, and external issuing authority registry lookups (such as NAD, DigiLocker, ICAI UDIN, or municipal fire portals) require external government API integrations and are honestly labeled <code className="font-mono-tabular">Unable to verify</code> or <code className="font-mono-tabular">Demonstration result</code> when not connected.</li>
                </ul>
              </div>
            </article>

            {/* 6. Data Sharing and Access */}
            <article id="section-6" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  06
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  6. Data Sharing and Access
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                VERIDEX does not sell, rent, or share user data with advertising networks. Access to records within the platform is governed by strict role-based access control (RBAC):
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li><strong>Students</strong> can access only their own Personal Document Vault, their own submitted files, and document requests directed to their academic scope.</li>
                <li><strong>Faculty Members</strong> can access institutional compliance categories and student submissions within their authorized institution and departmental scope.</li>
                <li><strong>Institutional Representatives (IRs)</strong> can manage applications, documents, and subordinate personnel strictly within their assigned institution.</li>
                <li><strong>System Administrators / Compliance Reviewers</strong> have cross-institutional oversight to inspect submitted dossiers, verify compliance evidence, and audit portal actions.</li>
              </ul>
            </article>

            {/* 7. Data Storage and Retention */}
            <article id="section-7" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  07
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  7. Data Storage and Retention
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                VERIDEX operates with a hybrid storage architecture depending on deployment configuration:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Browser LocalStorage &amp; IndexedDB:</strong> Portal state (applications, document metadata, compliance rules, notifications, audit logs, and theme preferences) is persisted in browser <code className="font-mono-tabular">localStorage</code> under versioned <code className="font-mono-tabular">veridex_portal_*_v7</code> keys. Binary file blobs uploaded to the Personal Document Vault are stored locally in browser <code className="font-mono-tabular">IndexedDB</code> (<code className="font-mono-tabular">veridex_personal_vault_db</code>).
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Supabase Backend (When Configured):</strong> When <code className="font-mono-tabular">VITE_SUPABASE_URL</code> and <code className="font-mono-tabular">VITE_SUPABASE_PUBLISHABLE_KEY</code> are configured, authentication sessions, user profiles, institutional memberships, document metadata (<code className="font-mono-tabular">documents</code>, <code className="font-mono-tabular">document_reviews</code>), and private document binaries (bucket <code className="font-mono-tabular">veridex-documents</code>) are stored in the connected Supabase project.
                </li>
                <li>
                  <strong className="text-[#241B12] dark:text-[#F1E8D8]">Retention:</strong> Browser-stored records remain on your device until you delete a vault document, use the <em>Reset Registry Data</em> control in Settings, or clear your browser site data. No automated statutory retention purge schedule is currently enforced by the software.
                </li>
              </ul>
            </article>

            {/* 8. Security */}
            <article id="section-8" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  08
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  8. Security
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                VERIDEX implements the following technical safeguards in code:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li><strong>Credential Sanitization:</strong> Before account records are written to browser <code className="font-mono-tabular">localStorage</code>, plaintext password fields are stripped via <code className="font-mono-tabular">sanitizeUserForStorage()</code>.</li>
                <li><strong>Short-Lived Signed URLs:</strong> When accessing files stored in the private Supabase <code className="font-mono-tabular">veridex-documents</code> bucket, the application generates short-lived signed URLs (60-second expiry) rather than exposing permanent public storage links.</li>
                <li><strong>Server-Side API Key Isolation:</strong> The <code className="font-mono-tabular">GEMINI_API_KEY</code> used by the compliance assistant is read exclusively on the Express server (<code className="font-mono-tabular">server.ts</code>) and is never bundled into client-side JavaScript.</li>
                <li><strong>Verified Server Audit Logging:</strong> Server audit endpoints (<code className="font-mono-tabular">/api/audit/log</code> and <code className="font-mono-tabular">/api/audit/events</code>) validate Bearer session tokens and derive actor identity from the verified session rather than trusting client-supplied IDs.</li>
              </ul>
            </article>

            {/* 9. Cookies and Local Storage */}
            <article id="section-9" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  09
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  9. Cookies and Local Storage
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                VERIDEX does not use third-party advertising or cross-site tracking cookies. The application uses browser storage strictly for functional state:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li><code className="font-mono-tabular">veridex_portal_theme_v7</code>: Stores your selected dark or light theme preference (dark mode is enabled by default).</li>
                <li><code className="font-mono-tabular">veridex_portal_session_user_id_v7</code> &amp; Supabase auth tokens: Maintain your active signed-in session across page refreshes.</li>
                <li><code className="font-mono-tabular">veridex_portal_*_v7</code> keys &amp; <code className="font-mono-tabular">veridex_personal_vault_db</code> (IndexedDB): Persist portal records, personal vault metadata, and uploaded file blobs in your browser.</li>
              </ul>
            </article>

            {/* 10. User Rights and Requests */}
            <article id="section-10" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  10
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  10. User Rights and Requests
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Users can inspect and manage their information directly within the portal:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li><strong>Access &amp; Correction:</strong> You can view your account profile, edit permitted personal details, and update editable metadata on your Personal Document Vault items at any time.</li>
                <li><strong>Vault Deletion &amp; Local Reset:</strong> You can delete individual files from your Personal Document Vault (which removes both the metadata and the IndexedDB binary blob) or reset local portal state from the Settings view.</li>
                <li><strong>Privacy &amp; Data Enquiries:</strong> For requests regarding institutional records or verification logs, submit a formal request under the <em>Privacy or data handling concern</em> category on the <button type="button" onClick={onNavigateContact} className="text-[#9E2919] dark:text-[#C7A56A] font-semibold underline cursor-pointer">Contact Us</button> page.</li>
              </ul>
            </article>

            {/* 11. Student and Institutional Information */}
            <article id="section-11" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  11
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  11. Student and Institutional Information
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Student academic records (such as roll numbers, PRNs, mark sheets, and scholarship certificates) and faculty qualification dossiers are scoped to their respective institution. Pre-populated institutional names, personnel profiles, and application dossiers included in the initial portal state serve as realistic demonstration and evaluation records for SIH26261 workflow testing.
              </p>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                When a student links a document from their Personal Document Vault to a specific institutional request, review decisions on that submission apply independently to that request and never alter or delete the student's underlying Personal Document Vault file.
              </p>
            </article>

            {/* 12. External Services */}
            <article id="section-12" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  12
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  12. External Services
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Depending on environment configuration, VERIDEX interacts only with the following external technical services:
              </p>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] list-disc pl-5 leading-relaxed">
                <li><strong>Supabase (<code className="font-mono-tabular">@supabase/supabase-js</code>):</strong> Used for authentication, relational table persistence, and private document storage when environment variables are configured.</li>
                <li><strong>Google Gemini API (<code className="font-mono-tabular">@google/genai</code> via <code className="font-mono-tabular">/api/gemini/chat</code>):</strong> Used on the server to answer role-scoped compliance and workflow questions in the assistant widget when <code className="font-mono-tabular">GEMINI_API_KEY</code> is configured.</li>
                <li><strong>Google Fonts:</strong> Loads the application's typography (<code className="font-mono-tabular">Plus Jakarta Sans</code>, <code className="font-mono-tabular">Space Grotesk</code>, <code className="font-mono-tabular">JetBrains Mono</code>) in <code className="font-mono-tabular">index.html</code>.</li>
              </ul>
            </article>

            {/* 13. Policy Updates */}
            <article id="section-13" className="liquid-glass rounded-2xl p-6 space-y-3 scroll-mt-24">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#9E2919]/15 text-[#9E2919] dark:text-[#C7A56A] font-mono-tabular text-xs font-bold">
                  13
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  13. Policy Updates
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                This Privacy Policy is updated whenever new validation capabilities, storage mechanisms, or external integrations are added to the VERIDEX codebase. The effective version indicator at the top of this page reflects the most recent revision.
              </p>
            </article>

            {/* 14. Contact and Privacy Concerns */}
            <article id="section-14" className="liquid-glass-elevated heritage-double-frame rounded-2xl p-6 space-y-4 scroll-mt-24 relative">
              <HeritageCornerOrnament position="top-left" size="sm" />
              <HeritageCornerOrnament position="top-right" size="sm" />
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-[#046A38]/20 text-[#046A38] dark:text-emerald-300 font-mono-tabular text-xs font-bold">
                  14
                </span>
                <h2 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  14. Contact and Privacy Concerns
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                If you have questions about how your documents, extracted metadata, or account records are handled, or if you wish to report a privacy or security concern, please use the dedicated VERIDEX Contact &amp; Support channel. Official institutional telephone numbers, physical office addresses, and dedicated Data Protection Officer (DPO) mailboxes are not pre-configured in this project environment and must be supplied by the deploying institution.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onNavigateContact}
                  data-testid="privacy-section14-contact-btn"
                  className="px-5 py-2.5 rounded-xl bg-[#9E2919] hover:bg-[#822013] text-[#F1E8D8] text-xs font-semibold transition-all cursor-pointer shadow-xs border border-[#C7A56A]/65 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Open Contact &amp; Privacy Support Page (/contact)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onBackToApp}
                  className="px-4 py-2.5 rounded-xl liquid-glass-subtle text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] hover:border-[#C2410C] transition-colors cursor-pointer"
                >
                  {isAuthenticated ? 'Return to Active Workspace' : 'Return to Landing Page'}
                </button>
              </div>
            </article>
          </div>
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
              {isAuthenticated ? 'Workspace' : 'Home'}
            </button>
            <span className="text-[#9E2919] dark:text-[#C7A56A] underline">Privacy Policy</span>
            <button
              type="button"
              onClick={onNavigateContact}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              Contact Us
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
