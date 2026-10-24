import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Search,
  Sun,
  Moon,
} from 'lucide-react';
import {
  ApplicationCategory,
  ApplicationRecord,
  ComplianceRule,
  DocumentRecord,
  Institution,
  UserAccount,
} from '../types/portal';
import {
  buildCategoryChecklist,
  calculateExpiryDetails,
  computeDashboardMetrics,
  REFERENCE_DATE,
} from '../lib/domain';
import {
  cardEntranceVariants,
  SMOOTH_EASE,
  staggerContainerVariants,
} from '../lib/motion';

interface LandingViewProps {
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  institutions: Institution[];
  complianceRules: ComplianceRule[];
  currentUser: UserAccount | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onNavigateToSignIn: (prefillUsername?: string) => void;
  onEnterWorkspace: (initialAppId?: string) => void;
}


const PREVIEW_CATEGORIES: ApplicationCategory[] = [
  'Extension of Approval (EoA)',
  'New Course Approval (AI & Data Science)',
  'Increase in Intake (B.Tech CSE)',
  'Infrastructure & Lab Readiness Audit',
  'Faculty Cadre Ratio Compliance',
  'Post-Graduate Research Center Renewal',
];

export const LandingView: React.FC<LandingViewProps> = ({
  applications,
  documents,
  institutions,
  complianceRules,
  currentUser,
  darkMode,
  onToggleDarkMode,
  onNavigateToSignIn,
  onEnterWorkspace,
}) => {
  // Interactive Inbox / Dossier Preview State
  const [inboxFilter, setInboxFilter] = useState<'all' | 'attention' | 'review' | 'decided'>('all');
  const [inboxSearch, setInboxSearch] = useState('');
  const [selectedPreviewAppId, setSelectedPreviewAppId] = useState<string>(
    applications[0]?.id || 'APP-2026-0104'
  );

  // Interactive Checklist Previewer in Capabilities Bento
  const [bentoCategory, setBentoCategory] = useState<ApplicationCategory>(
    'Extension of Approval (EoA)'
  );

  // Interactive Workflow Step
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(0);

  const metrics = useMemo(
    () => computeDashboardMetrics(applications, documents, REFERENCE_DATE),
    [applications, documents]
  );

  const filteredPreviewApps = useMemo(() => {
    const q = inboxSearch.trim().toLowerCase();
    return applications.filter((app) => {
      if (inboxFilter === 'attention' && app.status !== 'Additional Information Required') {
        return false;
      }
      if (
        inboxFilter === 'review' &&
        app.status !== 'Under Manual Review' &&
        app.status !== 'Pending Verification' &&
        app.status !== 'Submitted' &&
        app.status !== 'Automated Checks Complete'
      ) {
        return false;
      }
      if (inboxFilter === 'decided' && app.status !== 'Decision Recorded') {
        return false;
      }
      if (!q) return true;
      return (
        app.id.toLowerCase().includes(q) ||
        app.institutionName.toLowerCase().includes(q) ||
        app.officialInstitutionCode.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q)
      );
    });
  }, [applications, inboxFilter, inboxSearch]);

  const activePreviewApp = useMemo(() => {
    return (
      filteredPreviewApps.find((a) => a.id === selectedPreviewAppId) ||
      filteredPreviewApps[0] ||
      applications[0]
    );
  }, [filteredPreviewApps, selectedPreviewAppId, applications]);

  const activePreviewDocs = useMemo(() => {
    if (!activePreviewApp) return [];
    return documents.filter(
      (d) =>
        activePreviewApp.documentIds.includes(d.id) ||
        d.relatedApplicationId === activePreviewApp.id
    );
  }, [activePreviewApp, documents]);

  const sampleChecklist = useMemo(
    () => buildCategoryChecklist(bentoCategory),
    [bentoCategory]
  );

  const expiringSampleDocs = useMemo(() => {
    return documents
      .map((doc) => ({
        doc,
        expiry: calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE),
      }))
      .filter((item) => item.expiry.status === 'Expired' || item.expiry.status === 'Expiring Soon')
      .sort((a, b) => (a.expiry.daysRemaining ?? 999) - (b.expiry.daysRemaining ?? 999))
      .slice(0, 4);
  }, [documents]);

  const workflowStages = [
    {
      index: '01',
      title: 'Institutional Dossier & Category Checklist',
      actor: 'Institutional Nodal Officer',
      summary:
        'Institutions initiate an approval application and receive a tailored statutory checklist mapped to AICTE Approval Process Handbook rules.',
      detail:
        'Each required annexure—University Affiliation, Municipal Fire NOC, Principal Qualification, Audited Financial Statements, and Faculty Cadre Roster—is tracked with version history and internal document codes.',
      actionLabel: 'Sign In as Nodal Officer',
      prefillUser: 'aashay.khadkikar',
    },
    {
      index: '02',
      title: '6-Pillar Automated Document Scrutiny',
      actor: 'Automated Verification Engine',
      summary:
        'Uploaded certificates undergo structured evaluation across Completeness, Statutory Expiry, Cross-Document Consistency, Anomaly Screening, and Issuer Format.',
      detail:
        'Automated checks surface missing annexure pages, expired fire safety certificates, or name spelling variances across degree records as structured prompts for officer inspection.',
      actionLabel: 'Inspect Verification Workspace',
      prefillUser: 'karan.saini',
    },
    {
      index: '03',
      title: 'Officer Review & Clarification Loop',
      actor: 'Regional Compliance Auditor & Institution',
      summary:
        'Reviewing officers inspect evidence-linked findings, record review notes, or issue a targeted clarification directive to the institution.',
      detail:
        'When a deficiency notice is issued, the application transitions to Additional Information Required, notifying the Nodal Officer to upload renewed certificates and resubmit.',
      actionLabel: 'Review Dossier Queue',
      prefillUser: 'karan.saini',
    },
    {
      index: '04',
      title: 'Authorized Determination & Audit Log',
      actor: 'Regional Compliance Bureau',
      summary:
        'Every compliance determination requires explicit human officer sign-off and is recorded in a chronological audit trail.',
      detail:
        'All status transitions, document version replacements, compliance rule updates, and account actions are logged with actor identity, role, and timestamp.',
      actionLabel: 'Explore Audit & Reports',
      prefillUser: 'karan.saini',
    },
  ];

  const handlePrimaryAction = () => {
    if (currentUser) {
      onEnterWorkspace();
    } else {
      onNavigateToSignIn();
    }
  };

  return (
    <div className="min-h-screen flex flex-col liquid-canvas text-slate-900 dark:text-slate-100">
      {/* 1. Navigation — Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 liquid-glass-elevated border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-base font-display font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_02.43.46_5a1b79e2.jpeg"
              alt="VERIDEX Logo"
              referrerPolicy="no-referrer"
              className="h-8 w-auto rounded-md object-contain bg-white px-1 py-0.5 border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <span>VERIDEX</span>
          </a>

          {/* Zone 2: 4 Single-Line Navigation Links */}
          <nav
            aria-label="Landing Page Navigation"
            className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#preview"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Dossier Inbox
            </a>
            <a
              href="#capabilities"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Review Lifecycle
            </a>
            <a
              href="#registry"
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Institutions
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handlePrimaryAction}
              data-testid="landing-primary-signin"
              className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <span>{currentUser ? `Return to Workspace (${currentUser.fullName.split(' ')[0]})` : 'Sign In to Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* 2. Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 sm:pt-16 sm:pb-14">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center justify-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-blue-700 dark:text-blue-400">
                National Regulatory Compliance &amp; Document Authentication Portal
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer whitespace-nowrap"
              >
                {darkMode ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
              </button>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: SMOOTH_EASE }}
              className="text-3xl sm:text-5xl font-display font-bold text-slate-900 dark:text-white tracking-tight leading-[1.12]"
            >
              Institutional Compliance &amp; Document Authentication, Built for Regulatory Precision.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.04, ease: SMOOTH_EASE }}
              className="text-sm sm:text-base text-slate-600 dark:text-slate-300/90 leading-relaxed max-w-2xl mx-auto"
            >
              VERIDEX unifies institutional approval dossiers, category-specific statutory checklists, 6-pillar certificate verification, and 45-day validity tracking into a structured, role-isolated workspace for reviewing officers and academic institutions.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.08, ease: SMOOTH_EASE }}
              className="pt-2 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                type="button"
                onClick={handlePrimaryAction}
                data-testid="hero-signin-button"
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>{currentUser ? 'Open Authorized Workspace' : 'Sign In to Official Portal'}</span>
              </button>

              <a
                href="#preview"
                className="px-5 py-2.5 rounded-xl liquid-glass text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-blue-500/40 whitespace-nowrap shrink-0"
              >
                Inspect Live Dossier Inbox
              </a>
            </motion.div>

            {/* Unboxed Metadata Summary Bar */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              <span>{institutions.length} Registered Institutions</span>
              <span aria-hidden="true">·</span>
              <span>{metrics.totalApplications} Active Approval Dossiers</span>
              <span aria-hidden="true">·</span>
              <span>{documents.length} Versioned Certificates</span>
              <span aria-hidden="true">·</span>
              <span>6 Verification Pillars</span>
            </div>
          </div>
        </section>

        {/* 3. Interactive Product Preview — MotionSites Email-Client / Dossier Inbox Architecture */}
        <section id="preview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: SMOOTH_EASE }}
            className="liquid-glass-elevated rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800"
          >
            {/* Preview Window Top Bar */}
            <div className="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 liquid-glass-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-display font-bold text-slate-900 dark:text-white">
                  VERIDEX Regulatory Dossier Inbox &amp; 6-Pillar Evidence Inspector
                </span>
                <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
                  |
                </span>
                <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
                  Live Interactive Preview ({filteredPreviewApps.length} of {applications.length} dossiers)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    aria-label="Filter preview dossiers"
                    value={inboxSearch}
                    onChange={(e) => setInboxSearch(e.target.value)}
                    placeholder="Filter by ID or institution..."
                    className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser && activePreviewApp) {
                      onEnterWorkspace(activePreviewApp.id);
                    } else {
                      onNavigateToSignIn('karan.saini');
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open in Full Portal
                </button>
              </div>
            </div>

            {/* Dual-Pane Inbox + Dossier Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
              {/* Left 5 Cols: Dossier Queue List */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800 flex flex-col">
                {/* Filter Tabs */}
                <div className="p-2.5 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center gap-1 overflow-x-auto">
                  {(
                    [
                      { id: 'all', label: `All (${applications.length})` },
                      {
                        id: 'attention',
                        label: `Action Needed (${metrics.requiringAdditionalInfo})`,
                      },
                      { id: 'review', label: `In Review (${metrics.pendingReview})` },
                      {
                        id: 'decided',
                        label: `Decided (${applications.filter((a) => a.status === 'Decision Recorded').length})`,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setInboxFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                        inboxFilter === tab.id
                          ? 'bg-slate-900 text-white dark:bg-blue-600'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Dossier List */}
                <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80 overflow-y-auto max-h-[460px]">
                  {filteredPreviewApps.map((app) => {
                    const isSelected = activePreviewApp?.id === app.id;
                    const flaggedCount = app.checklist.filter(
                      (c) => c.status === 'Flagged for Review'
                    ).length;

                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedPreviewAppId(app.id)}
                        className={`w-full text-left p-3.5 transition-colors cursor-pointer block ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40'
                            : 'hover:bg-slate-100/70 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                            {app.id}
                          </span>
                          <span className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                            Updated {app.lastUpdated}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                          {app.institutionName}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                          {app.category}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono-tabular">
                          <span
                            className={
                              app.status === 'Additional Information Required'
                                ? 'text-red-700 dark:text-red-400 font-medium'
                                : app.status === 'Decision Recorded'
                                  ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                                  : 'text-amber-700 dark:text-amber-400 font-medium'
                            }
                          >
                            {app.status}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{app.documentIds.length} docs</span>
                          {flaggedCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-red-600 dark:text-red-400">
                                {flaggedCount} flagged
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {filteredPreviewApps.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No dossiers match your current filter.
                    </div>
                  )}
                </div>
              </div>

              {/* Right 7 Cols: Active Dossier & Evidence Inspector */}
              <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between space-y-5">
                <AnimatePresence mode="wait">
                {activePreviewApp ? (
                  <motion.div
                    key={activePreviewApp.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: SMOOTH_EASE }}
                    className="flex-1 flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-4">
                      {/* Dossier Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-mono-tabular text-blue-700 dark:text-blue-400 font-semibold">
                            <span>{activePreviewApp.id}</span>
                            <span aria-hidden="true">·</span>
                            <span>{activePreviewApp.officialInstitutionCode}</span>
                            <span aria-hidden="true">·</span>
                            <span>Reviewer: {activePreviewApp.assignedReviewer}</span>
                          </div>
                          <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white mt-1">
                            {activePreviewApp.category}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {activePreviewApp.institutionName} · Current Status:{' '}
                            <strong className="text-slate-900 dark:text-white">
                              {activePreviewApp.status}
                            </strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser) {
                              onEnterWorkspace(activePreviewApp.id);
                            } else {
                              onNavigateToSignIn('karan.saini');
                            }
                          }}
                          className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Inspect Full Dossier</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Category Checklist Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Statutory Category Checklist ({activePreviewApp.checklist.length} Required Items)
                          </span>
                          <span className="font-mono-tabular text-slate-500">
                            {
                              activePreviewApp.checklist.filter(
                                (c) => c.status === 'Verified' || c.status === 'Uploaded'
                              ).length
                            }{' '}
                            / {activePreviewApp.checklist.length} Verified or Uploaded
                          </span>
                        </div>

                        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/60 dark:divide-slate-800/70">
                          {activePreviewApp.checklist.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 dark:text-white truncate">
                                  {item.title}
                                </div>
                                {item.notes && (
                                  <div className="text-[11px] text-red-600 dark:text-red-400 truncate mt-0.5">
                                    {item.notes}
                                  </div>
                                )}
                              </div>
                              <span
                                className={`text-[11px] font-mono-tabular font-semibold whitespace-nowrap shrink-0 ${
                                  item.status === 'Verified'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : item.status === 'Flagged for Review'
                                      ? 'text-red-700 dark:text-red-400'
                                      : item.status === 'Uploaded'
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-slate-400'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Linked Repository Documents & 6-Pillar Status */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Linked Repository Certificates &amp; 6-Pillar Checks ({activePreviewDocs.length})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {activePreviewDocs.slice(0, 4).map((doc) => {
                            const exp = calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE);
                            return (
                              <div
                                key={doc.id}
                                className="p-3 rounded-xl liquid-glass-subtle text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                                    {doc.internalCode}
                                  </span>
                                  <span
                                    className={`text-[11px] font-mono-tabular font-medium ${
                                      exp.status === 'Expired'
                                        ? 'text-red-700 dark:text-red-400'
                                        : exp.status === 'Expiring Soon'
                                          ? 'text-amber-700 dark:text-amber-400'
                                          : 'text-emerald-700 dark:text-emerald-400'
                                    }`}
                                  >
                                    {exp.label}
                                  </span>
                                </div>
                                <div className="font-medium text-slate-900 dark:text-white truncate">
                                  {doc.name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono-tabular truncate">
                                  Issuer: {doc.issuerVerificationStatus} · Review: {doc.humanReviewStatus}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer Action Bar inside Preview */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Latest Timeline Event:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {activePreviewApp.statusHistory[activePreviewApp.statusHistory.length - 1]?.toStatus}
                        </strong>{' '}
                        ({activePreviewApp.statusHistory[activePreviewApp.statusHistory.length - 1]?.timestamp})
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateToSignIn('aashay.khadkikar')}
                        className="font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Sign in as Institutional Nodal Officer →
                      </button>
                    </div>
                  </motion.div>
                ) : null}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 4. Core Benefits & Capabilities — Asymmetric Bento Grid */}
        <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-2xl space-y-2 mb-10">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
               Statutory Verification Architecture
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Purpose-Built Capabilities for Institutional Compliance
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Every module in VERIDEX is engineered around the regulatory workflow—separating automated document extraction from issuing-authority checks and mandatory human officer decisions.
            </p>
          </div>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Bento 01: Category-Specific Statutory Checklists (7 cols) */}
            <motion.div
              variants={cardEntranceVariants}
              className="lg:col-span-7 liquid-glass liquid-glass-interactive rounded-2xl p-6 space-y-4 flex flex-col"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                  01. Dynamic Checklist Mapping
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  Category-Specific Statutory Checklists
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Select any approval category below to inspect the exact statutory annexures required by VERIDEX before an application enters the regional review queue.
                </p>
              </div>

              <div className="space-y-3 pt-1 flex-1 flex flex-col">
                <div>
                  <label
                    htmlFor="bento-category-select"
                    className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Inspect Checklist Template by Category
                  </label>
                  <select
                    id="bento-category-select"
                    value={bentoCategory}
                    onChange={(e) => setBentoCategory(e.target.value as ApplicationCategory)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    {PREVIEW_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl liquid-glass-subtle divide-y divide-slate-200/70 dark:divide-slate-800/80 flex-1">
                  {sampleChecklist.map((item, idx) => (
                    <div
                      key={item.id}
                      className="px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {idx + 1}. {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {item.description}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono-tabular text-slate-500 whitespace-nowrap shrink-0 mt-0.5">
                        {item.documentCategory} · {item.required ? 'Mandatory' : 'Optional'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Bento 02: 6-Pillar Document Authentication Engine (5 cols) */}
            <motion.div
              variants={cardEntranceVariants}
              className="lg:col-span-5 liquid-glass liquid-glass-interactive rounded-2xl p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                  02. Multi-Layer Scrutiny
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  6-Pillar Document Authentication
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Each uploaded certificate is evaluated across six distinct pillars so automated anomaly indicators never masquerade as final legal determinations.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  {
                    pillar: '1. Completeness',
                    desc: 'Checks mandatory clauses, signatures, and annexure page counts.',
                  },
                  {
                    pillar: '2. Statutory Expiry',
                    desc: 'Calculates exact days remaining against reference date.',
                  },
                  {
                    pillar: '3. Cross-Document Consistency',
                    desc: 'Flags name or intake mismatches across linked records.',
                  },
                  {
                    pillar: '4. Integrity & Anomaly Screening',
                    desc: 'Screens kerning, seal alignment, and duplicate hashes.',
                  },
                  {
                    pillar: '5. Issuing-Authority Format',
                    desc: 'Validates certificate reference structure (SPPU, PMC, ICAI).',
                  },
                  {
                    pillar: '6. Mandatory Human Officer Review',
                    desc: 'Requires explicit regional auditor sign-off on every record.',
                  },
                ].map((row) => (
                  <div
                    key={row.pillar}
                    className="p-2.5 rounded-xl liquid-glass-subtle flex items-baseline justify-between gap-3"
                  >
                    <span className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {row.pillar}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                      {row.desc}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bento 03: 45-Day Certificate Expiry Radar (5 cols) */}
            <motion.div
              variants={cardEntranceVariants}
              className="lg:col-span-5 liquid-glass liquid-glass-interactive rounded-2xl p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                  03. Proactive Validity Tracking
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  Certificate Expiry Calendar &amp; Alerts
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Monitors Fire &amp; Life Safety NOCs, Pollution Consents, Bank FDRs, and Digital Library Subscriptions with a 45-day renewal warning window.
                </p>
              </div>

              <div className="space-y-2">
                {expiringSampleDocs.map(({ doc, expiry }) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl liquid-glass-subtle flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        <span className="font-mono-tabular text-blue-700 dark:text-blue-400 mr-1.5">
                          {doc.internalCode}
                        </span>
                        {doc.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-tabular truncate">
                        {doc.institutionName} · Expiry: {doc.expiryDate}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono-tabular font-semibold whitespace-nowrap shrink-0 ${
                        expiry.status === 'Expired'
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {expiry.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Bento 04: Role-Based Data Isolation & Account Uniqueness (7 cols) */}
            <motion.div
              variants={cardEntranceVariants}
              className="lg:col-span-7 liquid-glass liquid-glass-interactive rounded-2xl p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="text-xs font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                  04. Role-Isolated Access Control
                </div>
                <h3 className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  Strict Institutional Isolation &amp; Global Identity Uniqueness
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Usernames and normalized 10-digit Indian mobile numbers are enforced as globally unique across all roles. Each role accesses a strictly scoped operational workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl liquid-glass-subtle space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Regional Compliance Admin
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Reviews all institutional dossiers, manages APH compliance rules, provisions accounts, and records authorized compliance determinations.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl liquid-glass-subtle space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Institutional Nodal Representative
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Creates applications, uploads versioned repository certificates, and submits clarifications strictly for their affiliated institution.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl liquid-glass-subtle space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Faculty / Academic Staff
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Manages qualification degrees, experience certificates, and appointment records linked to institutional faculty cadre audits.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl liquid-glass-subtle space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    Student Portal Account
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Isolated strictly to the student&apos;s own verified academic transcripts, GATE scorecards, and scholarship eligibility certificates.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* 5. Workflow / Process Section */}
        <section id="workflow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="max-w-2xl space-y-2 mb-8">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              End-to-End Operational Flow
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              From Dossier Submission to Authorized Decision
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Select any stage in the regulatory pipeline to see how institutional submissions, automated checks, and regional officer reviews connect.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 5 Cols: Stage Selector Buttons */}
            <div className="lg:col-span-5 space-y-2.5">
              {workflowStages.map((stage, idx) => {
                const isActive = activeWorkflowStep === idx;
                return (
                  <button
                    key={stage.index}
                    type="button"
                    onClick={() => setActiveWorkflowStep(idx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'liquid-glass-elevated border-blue-600 dark:border-blue-500'
                        : 'liquid-glass hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono-tabular">
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        Stage {stage.index}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">{stage.actor}</span>
                    </div>
                    <div className="text-sm font-display font-bold text-slate-900 dark:text-white mt-1">
                      {stage.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right 7 Cols: Active Stage Detail Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={workflowStages[activeWorkflowStep].index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: SMOOTH_EASE }}
                className="lg:col-span-7 liquid-glass rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="text-xs font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                    Stage {workflowStages[activeWorkflowStep].index} · {workflowStages[activeWorkflowStep].actor}
                  </div>
                  <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                    {workflowStages[activeWorkflowStep].title}
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {workflowStages[activeWorkflowStep].summary}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                    {workflowStages[activeWorkflowStep].detail}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500 font-mono-tabular">
                    Active Compliance Rules Enforced: {complianceRules.filter((r) => r.active).length} / {complianceRules.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigateToSignIn(workflowStages[activeWorkflowStep].prefillUser)
                    }
                    className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{workflowStages[activeWorkflowStep].actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* 6. Trust, Credibility & Registered Institutions Directory */}
        <section id="registry" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Live Portal Registry &amp; Quantitative Telemetry
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                Registered Technical Institutions &amp; Compliance Volume
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                All figures below are computed directly from the active institutional dossiers and repository records in VERIDEX.
              </p>
            </div>
          </div>

          {/* 4-Column Quantitative Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="liquid-glass rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Registered Institutions
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold font-mono-tabular text-slate-900 dark:text-white mt-1">
                {institutions.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Western, Southern, Eastern &amp; Northern cells
              </div>
            </div>

            <div className="liquid-glass rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Active Approval Dossiers
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold font-mono-tabular text-blue-700 dark:text-blue-400 mt-1">
                {metrics.totalApplications}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {metrics.pendingReview} in active officer review queue
              </div>
            </div>

            <div className="liquid-glass rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Verified Repository Certificates
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400 mt-1">
                {metrics.documentsVerified} / {documents.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Issuer verified &amp; officer reviewed
              </div>
            </div>

            <div className="liquid-glass rounded-2xl p-5">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                45-Day Expiry Alerts
              </div>
              <div className="text-2xl sm:text-3xl font-display font-bold font-mono-tabular text-amber-700 dark:text-amber-400 mt-1">
                {metrics.expiringDocuments}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tracked for statutory renewal
              </div>
            </div>
          </div>

          {/* Registered Institutions Table */}
          <div className="liquid-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                Participating Institutions Directory ({institutions.length})
              </h3>
              <span className="text-xs text-slate-500 font-mono-tabular">
                Scoped by AICTE Permanent ID &amp; Nodal Signatory
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 liquid-glass-subtle text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Institution Code</th>
                    <th className="py-3 px-4">Institution Name</th>
                    <th className="py-3 px-4">AICTE Permanent ID</th>
                    <th className="py-3 px-4">Affiliated University / Board</th>
                    <th className="py-3 px-4">Authorized Nodal Officer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                  {institutions.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-mono-tabular font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        {inst.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {inst.name}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {inst.aictePermanentId}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {inst.affiliatedUniversity}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {inst.representativeName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 7. Final Call to Action */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="liquid-glass-elevated rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Authorized Portal Access
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                Ready to Review Dossiers or Submit Institutional Records?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300/90 leading-relaxed">
                Sign in with your globally unique username or registered 10-digit mobile number to access your role-authorized VERIDEX workspace.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>{currentUser ? 'Return to Workspace' : 'Sign In to Portal'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Quiet Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 liquid-glass-subtle py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_02.43.46_5a1b79e2.jpeg"
              alt="VERIDEX Logo"
              referrerPolicy="no-referrer"
              className="h-6 w-auto rounded object-contain bg-white px-1 py-0.5 border border-slate-200 dark:border-slate-700 shrink-0"
            />
            <span className="font-display font-bold text-slate-900 dark:text-white">VERIDEX</span>
            <span aria-hidden="true">·</span>
            <span>National Regulatory Compliance &amp; Institutional Validation Portal</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <a href="#preview" className="hover:text-slate-900 dark:hover:text-white">
              Dossier Inbox
            </a>
            <a href="#capabilities" className="hover:text-slate-900 dark:hover:text-white">
              Capabilities
            </a>
            <a href="#workflow" className="hover:text-slate-900 dark:hover:text-white">
              Review Lifecycle
            </a>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {currentUser ? 'Active Workspace' : 'Official Sign-In'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
