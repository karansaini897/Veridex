import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  FileCheck2,
  FolderKanban,
  ScanText,
  CalendarClock,
  GitCompare,
  Scale,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
  Info,
  ChevronRight,
  Activity,
  Building2,
  ClipboardList,
  UserCheck,
  FileText,
  Sun,
  Moon,
} from 'lucide-react';
import { StatusBadge } from './StatusPrimitives';
import {
  HeritageAmbientPattern,
  HeritageCornerOrnament,
  HeritageEmbroideredBorder,
  HeritageSectionDivider,
} from './HeritageOrnaments';

interface LandingPageViewProps {
  onOpenLogin: () => void;
  isAuthenticated?: boolean;
  onReturnToWorkspace?: () => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface HeroJourneyStage {
  stepNumber: string;
  shortTitle: string;
  title: string;
  actor: string;
  statusBadge: string;
  summary: string;
  recordCode: string;
  evidenceDetail: string;
  nextActionLabel: string;
}

const HERO_JOURNEY_STAGES: HeroJourneyStage[] = [
  {
    stepNumber: '01',
    shortTitle: 'Prepare Dossier',
    title: 'Institution Prepares Application Dossier',
    actor: 'Institutional Nodal Officer (VESIT)',
    statusBadge: 'Draft',
    summary:
      'Selects an approval category (e.g., Extension of Approval) to initialize a tailored statutory checklist and dossier record.',
    recordCode: 'APP-2026-0104 · INST-VESIT-104',
    evidenceDetail:
      '5 mandatory statutory categories mapped: Affiliation, Fire Safety, Faculty Qualifications, Corpus Audit, and Cadre Roster.',
    nextActionLabel: 'Register supporting document metadata against checklist items',
  },
  {
    stepNumber: '02',
    shortTitle: 'Organize Checklist',
    title: 'Document Details Organized Against Checklist',
    actor: 'Versioned Repository Index',
    statusBadge: 'Uploaded',
    summary:
      'Assigns deterministic internal document codes, records certificate references and validity dates, and links each record to its checklist requirement.',
    recordCode: 'APR-REG-VES-01 · Cert #UOM/AFF/2026/4412',
    evidenceDetail:
      'Structured repository path /Repository/Regulatory/Statutory-Approvals (PDF · 1.84 MB · Version v1 recorded).',
    nextActionLabel: 'Compare registered metadata and validity windows against compliance rules',
  },
  {
    stepNumber: '03',
    shortTitle: 'Review Finding',
    title: 'Review Signal or Finding Surfaced for Inspection',
    actor: '6-Pillar Compliance Check',
    statusBadge: 'Flagged for Review',
    summary:
      'Highlights expired clearances, missing annexure pages, or cross-document name variations as transparent prompts for officer inspection—never as automatic proof of fraud.',
    recordCode: 'INF-FAC-VES-01 · Pillar: Expiry & Consistency',
    evidenceDetail:
      'Fire & Life Safety NOC validity window flagged + faculty surname spelling variation noted across degree scroll and roster.',
    nextActionLabel: 'Route finding to authorized regional reviewer for human evaluation',
  },
  {
    stepNumber: '04',
    shortTitle: 'Record Decision',
    title: 'Authorized Reviewer Records Next Action',
    actor: 'Regional Compliance Reviewer (Admin)',
    statusBadge: 'Decision Recorded',
    summary:
      'An authorized human officer inspects the linked evidence, requests institutional clarification if needed, or records the formal compliance determination.',
    recordCode: 'Audit Entry · Officer Sign-Off Logged',
    evidenceDetail:
      'Human-in-the-loop governance: every clarification notice, resubmission, and recorded outcome is logged with actor and timestamp.',
    nextActionLabel: 'Complete audit trail preserved across institutional and admin views',
  },
];

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenLogin,
  isAuthenticated = false,
  onReturnToWorkspace,
  darkMode = false,
  onToggleDarkMode,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeJourneyStep, setActiveJourneyStep] = useState<number>(0);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<0 | 1 | 2>(1);
  const [boardFilter, setBoardFilter] = useState<'all' | 'validation' | 'governance'>('all');

  // Advance to the next step in the 4-step End-to-End Institutional Compliance Journey every 5 seconds (5000ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveJourneyStep((prev) => (prev + 1) % HERO_JOURNEY_STAGES.length);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [activeJourneyStep]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const currentStage = HERO_JOURNEY_STAGES[activeJourneyStep];

  return (
    <div className="min-h-screen liquid-canvas text-[#241B12] dark:text-[#F1E8D8] font-sans selection:bg-[#9E2919]/25 selection:text-[#F1E8D8] overflow-x-hidden relative">
      {/* Subtle Heritage Mandala & Botanical Filigree Background */}
      <HeritageAmbientPattern />

      {/* Sovereign Heritage Top Ribbon */}
      <div className="h-1.5 w-full tricolour-bar sticky top-0 z-50" />

      {/* Top Navigation Bar (Strict 3-Zone Contract: Brand + Tagline | Nav Links | Actions) */}
      <header className="sticky top-1.5 z-40 bg-[#FAF5EB]/95 dark:bg-[#241B12]/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand Wordmark + Hindi Tagline */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }}
            className="flex items-center gap-3 whitespace-nowrap shrink-0 group"
          >
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
              alt="VERIDEX Logo"
              referrerPolicy="no-referrer"
              className="h-10 w-auto rounded-lg object-contain bg-[#E7D8C0] border-2 border-[#C7A56A] shadow-xs shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight text-[#241B12] dark:text-[#F1E8D8] leading-tight">
                VERIDEX
              </span>
              <span className="text-xs font-semibold text-[#046A38] dark:text-[#C7A56A] leading-tight mt-0.5">
                हर दावे की जाँच, हर सच की पहचान
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#5C4A38] dark:text-[#D5C6B0]"
          >
            <button
              type="button"
              onClick={() => scrollToSection('platform')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              About
            </button>
          </nav>

          {/* Zone 3: Theme Toggle + Sign In & Get Started Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                aria-label={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                data-testid="landing-theme-toggle"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl liquid-glass liquid-glass-interactive text-xs font-semibold text-[#241B12] dark:text-[#F1E8D8] cursor-pointer"
              >
                {darkMode ? (
                  <Sun className="w-3.5 h-3.5 text-[#C7A56A]" aria-hidden="true" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#046A38]" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            )}
            {isAuthenticated && onReturnToWorkspace ? (
              <button
                type="button"
                onClick={onReturnToWorkspace}
                className="btn-primary px-4 py-2 text-xs"
              >
                <span>Return to Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                data-testid="landing-signin-btn"
                className="btn-primary px-4 py-2 text-xs"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {/* Intricate Indian Heritage Embroidered Border Strip */}
        <HeritageEmbroideredBorder />
      </header>

      <main id="top" className="relative z-10">
        {/* =========================================================
            HERO SECTION + 4-STEP DOSSIER-TO-DECISION VISUAL JOURNEY
           ========================================================= */}
        <section className="pt-12 sm:pt-16 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: SMOOTH_EASE }}
            className="text-center max-w-3xl mx-auto space-y-5"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-lg heritage-kicker-plaque">
              <ShieldCheck className="w-3.5 h-3.5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#9E2919] dark:text-[#C7A56A]">
                Institutional Validation &amp; Regulatory Compliance Portal
              </span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[56px] leading-[1.06] tracking-tight text-[#241B12] dark:text-[#F1E8D8]">
              Document Verification,{' '}
              <span className="bg-gradient-to-r from-[#9E2919] via-[#C7A56A] to-[#789783] bg-clip-text text-transparent">
                Reimagined.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[#5C4A38] dark:text-[#D5C6B0] max-w-2xl mx-auto leading-relaxed">
              Validate institutional applications, organize supporting document records against statutory checklists, and surface evidence-linked compliance findings through one structured review workflow.
            </p>

            {/* Primary & Secondary Hero CTAs — Primary Action Clearly Dominant */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={isAuthenticated && onReturnToWorkspace ? onReturnToWorkspace : onOpenLogin}
                className="px-6 py-3 rounded-xl bg-[#9E2919] hover:bg-[#822013] text-[#F1E8D8] text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md border border-[#C7A56A]/65 inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>{isAuthenticated ? 'Open Active Workspace' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4 text-[#F1E8D8]" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('platform')}
                className="px-5 py-3 rounded-xl bg-[#FAF4E8] dark:bg-[#2E2217] hover:bg-[#EFE6D5] dark:hover:bg-[#3A2B1D] text-[#241B12] dark:text-[#F1E8D8] border border-[#C7A56A]/65 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              >
                Explore the Platform
              </button>
            </div>

            {/* Ornamental Lotus & Diamond Divider Below Hero CTAs */}
            <HeritageSectionDivider className="pt-2" />
          </motion.div>

          {/* 3-Card Layered Floating Software Showcase (Heritage Espresso/Ivory Surfaces, Antique Gold & Terracotta Borders, Sage Green Accents) */}
          <div className="relative mt-6 sm:mt-8 max-w-6xl 2xl:max-w-7xl mx-auto pt-2 pb-4">
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
              {/* LEFT FLOATING WING CARD: Validation Architecture Coverage */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, x: -20, rotate: -2 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                transition={{ duration: 0.38, delay: 0.04, ease: SMOOTH_EASE }}
                className="hidden lg:block lg:col-span-3 -mr-6 mb-6 z-10 rounded-2xl liquid-glass heritage-double-frame p-5 relative"
              >
                <HeritageCornerOrnament position="top-left" size="sm" />
                <HeritageCornerOrnament position="bottom-left" size="sm" />
                <div className="flex items-center justify-between text-xs font-medium text-[#5C4A38] dark:text-[#D5C6B0] mb-4">
                  <span className="flex items-center gap-1.5 font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                    <Activity className="w-4 h-4 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                    <span>Validation Engine</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular font-semibold text-[#9E2919] dark:text-[#C7A56A]">
                    6 Pillars
                  </span>
                </div>

                {/* SVG Ring Chart */}
                <div className="relative w-32 h-32 mx-auto my-3 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="rgba(199, 165, 106, 0.22)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="url(#veridexTricolourGrad)"
                      strokeWidth="10"
                      strokeDasharray="240 240"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="veridexTricolourGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#9E2919" />
                        <stop offset="50%" stopColor="#C7A56A" />
                        <stop offset="100%" stopColor="#789783" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-display font-bold font-mono-tabular text-[#241B12] dark:text-[#F1E8D8]">
                      100%
                    </span>
                    <span className="text-[10px] font-medium text-[#5C4A38] dark:text-[#D5C6B0]">
                      Role-Protected
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-[#C7A56A]/35 text-xs">
                  <div className="flex items-center justify-between text-[#5C4A38] dark:text-[#D5C6B0]">
                    <span>Checklist Completeness</span>
                    <span className="font-mono-tabular font-semibold text-[#046A38] dark:text-[#789783]">
                      Tracked
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#5C4A38] dark:text-[#D5C6B0]">
                    <span>Expiry Window Watch</span>
                    <span className="font-mono-tabular font-semibold text-[#9E2919] dark:text-[#C7A56A]">
                      45-Day Alert
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#5C4A38] dark:text-[#D5C6B0]">
                    <span>Institutional Dossiers</span>
                    <span className="font-mono-tabular font-semibold text-[#046A38] dark:text-[#789783]">
                      Sign-In Only
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* CENTER MAIN PRODUCT BOARD MOCKUP */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.02, ease: SMOOTH_EASE }}
                className="lg:col-span-6 z-20 rounded-2xl liquid-glass-elevated heritage-double-frame overflow-hidden relative"
              >
                <HeritageCornerOrnament position="top-left" size="md" />
                <HeritageCornerOrnament position="top-right" size="md" />
                <HeritageCornerOrnament position="bottom-left" size="md" />
                <HeritageCornerOrnament position="bottom-right" size="md" />

                {/* Board Window Top Toolbar */}
                <div className="px-4 py-3 border-b border-[#C7A56A]/45 bg-[#F3E9D7]/90 dark:bg-[#1E160E]/90 flex flex-wrap items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                    <span className="text-xs font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                      Application Validation Board
                    </span>
                  </div>

                  {/* Interactive Filter inside Hero Preview */}
                  <div className="flex items-center gap-1 bg-[#FAF5EB] dark:bg-[#241B12] p-0.5 rounded-lg border border-[#C7A56A]/50 text-[11px]">
                    {(['all', 'validation', 'governance'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBoardFilter(mode)}
                        className={`px-2.5 py-0.5 rounded-md capitalize transition-colors cursor-pointer ${
                          boardFilter === mode
                            ? 'bg-[#9E2919] text-[#F1E8D8] font-semibold'
                            : 'text-[#5C4A38] dark:text-[#D5C6B0] hover:text-[#241B12] dark:hover:text-[#F1E8D8]'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3-Column Non-Confidential Workflow Board Inside Center Frame */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left bg-[#F8F2E6]/90 dark:bg-[#241B12]/90 relative z-10">
                  {/* Column 1: Dossier Intake */}
                  <div className="rounded-xl bg-[#EFE6D5]/80 dark:bg-[#2E2217]/90 border border-[#C7A56A]/40 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#241B12] dark:text-[#F1E8D8] pb-1.5 border-b border-[#C7A56A]/30">
                      <span>Dossier Intake</span>
                      <span className="font-mono-tabular text-[#9E2919] dark:text-[#C7A56A]">Stage 01</span>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'validation') && (
                      <div className="rounded-xl bg-[#FCF9F2] dark:bg-[#1E160E] border border-[#C7A56A]/45 p-3 space-y-2">
                        <div className="text-xs font-bold text-[#241B12] dark:text-[#F1E8D8] leading-snug">
                          Statutory Checklist Assembly
                        </div>
                        <div className="text-[11px] text-[#9E2919] dark:text-[#C7A56A] font-semibold">
                          Category-Specific Requirements
                        </div>
                        <div className="text-[10px] text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                          Maps approvals, faculty records, and safety annexures into structured folders.
                        </div>
                        <div className="pt-1 border-t border-[#C7A56A]/25 text-[10px] text-[#046A38] dark:text-[#789783] font-mono-tabular font-semibold">
                          Structured Metadata Indexing
                        </div>
                      </div>
                    )}

                    {(boardFilter === 'all' || boardFilter === 'governance') && (
                      <div className="rounded-xl bg-[#FCF9F2] dark:bg-[#1E160E] border border-[#C7A56A]/45 p-3 space-y-2">
                        <div className="text-xs font-bold text-[#241B12] dark:text-[#F1E8D8] leading-snug">
                          Version-Controlled Repository
                        </div>
                        <div className="text-[11px] text-[#046A38] dark:text-[#789783] font-semibold">
                          Sequential Document Coding
                        </div>
                        <div className="text-[10px] text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                          Preserves full revision history when renewed certificates are registered.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Compliance Checks */}
                  <div className="rounded-xl bg-[#EFE6D5]/80 dark:bg-[#2E2217]/90 border border-[#C7A56A]/40 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#241B12] dark:text-[#F1E8D8] pb-1.5 border-b border-[#C7A56A]/30">
                      <span>Compliance Checks</span>
                      <span className="font-mono-tabular text-[#046A38] dark:text-[#789783]">Stage 02</span>
                    </div>

                    <div className="rounded-xl bg-[#FCF9F2] dark:bg-[#1E160E] border-2 border-[#C7A56A]/65 p-3 space-y-2">
                      <div className="text-xs font-bold text-[#241B12] dark:text-[#F1E8D8] leading-snug">
                        Cross-Document Consistency
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[#5C4A38] dark:text-[#D5C6B0] font-mono-tabular font-semibold">
                          <span>Rule Alignment</span>
                          <span>6 Pillars</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#9E2919] via-[#C7A56A] to-[#789783]" />
                        </div>
                      </div>
                      <div className="text-[10px] text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                        Compares application declarations against registered supporting evidence.
                      </div>
                      <div className="pt-1 border-t border-[#C7A56A]/25 text-[10px] text-[#046A38] dark:text-[#789783] font-semibold">
                        Norm &amp; Threshold Evaluation
                      </div>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'validation') && (
                      <div className="rounded-xl bg-[#FCF9F2] dark:bg-[#1E160E] border border-[#C7A56A]/45 p-3 space-y-1.5">
                        <div className="text-xs font-bold text-[#241B12] dark:text-[#F1E8D8] leading-snug">
                          Expiry &amp; Validity Watch
                        </div>
                        <div className="text-[11px] text-[#9E2919] dark:text-[#C7A56A] font-semibold">
                          45-Day Renewal Advisory
                        </div>
                        <div className="text-[10px] text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                          Flags lapsed or soon-to-expire clearances before committee review.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Officer Sign-Off */}
                  <div className="rounded-xl bg-[#EFE6D5]/80 dark:bg-[#2E2217]/90 border border-[#C7A56A]/40 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#241B12] dark:text-[#F1E8D8] pb-1.5 border-b border-[#C7A56A]/30">
                      <span>Officer Sign-Off</span>
                      <span className="font-mono-tabular text-[#046A38] dark:text-[#789783]">Stage 03</span>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'governance') && (
                      <div className="rounded-xl bg-[#FCF9F2] dark:bg-[#1E160E] border border-[#C7A56A]/45 p-3 space-y-2">
                        <div className="text-xs font-bold text-[#241B12] dark:text-[#F1E8D8] leading-snug">
                          Human-in-the-Loop Decision
                        </div>
                        <div className="text-[11px] text-[#046A38] dark:text-[#789783] font-semibold">
                          Authorized Reviewer Sign-Off
                        </div>
                        <div className="text-[10px] text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                          Officers inspect flagged signals, request clarifications, and record determinations.
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl bg-[#FCF9F2] dark:bg-[#1E160E] border border-[#C7A56A]/45 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#241B12] dark:text-[#F1E8D8] leading-snug">
                        <Lock className="w-3.5 h-3.5 text-[#046A38] dark:text-[#789783] shrink-0" aria-hidden="true" />
                        <span>Confidential Records Protected</span>
                      </div>
                      <div className="text-[10px] text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                        Institutional dossiers and applicant records are hidden until authenticated sign-in.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* RIGHT FLOATING WING CARD: Verification Signal & Access Control */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, x: 20, rotate: 2 }}
                animate={{ opacity: 1, x: 0, rotate: 2 }}
                transition={{ duration: 0.38, delay: 0.06, ease: SMOOTH_EASE }}
                className="hidden lg:block lg:col-span-3 -ml-6 mb-6 z-10 rounded-2xl liquid-glass heritage-double-frame p-5 space-y-3.5 relative"
              >
                <HeritageCornerOrnament position="top-right" size="sm" />
                <HeritageCornerOrnament position="bottom-right" size="sm" />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                    <Sparkles className="w-4 h-4 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                    <span>Review Signal</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular font-semibold text-[#9E2919] dark:text-[#C7A56A]">
                    Evidence-Linked
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F3E9D7] dark:bg-[#1E160E] border border-[#C7A56A]/50 space-y-2">
                  <div className="text-xs font-bold text-[#241B12] dark:text-[#F1E8D8]">
                    Cross-Document Field Check
                  </div>
                  <p className="text-[11px] text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                    Registered certificate numbers &amp; validity dates compared against institutional checklist rules.
                  </p>
                  <button
                    type="button"
                    onClick={isAuthenticated && onReturnToWorkspace ? onReturnToWorkspace : onOpenLogin}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#9E2919] hover:bg-[#822013] border border-[#C7A56A]/50 text-[11px] font-semibold text-[#F1E8D8] transition-colors cursor-pointer"
                  >
                    {isAuthenticated ? 'Return to Workspace' : 'Sign In to Access Portal'}
                  </button>
                </div>

                <div className="space-y-2 text-[11px] text-[#5C4A38] dark:text-[#D5C6B0] pt-1">
                  <div className="flex items-center justify-between">
                    <span>Expiry Window</span>
                    <span className="font-mono-tabular font-semibold text-[#9E2919] dark:text-[#C7A56A]">
                      45-Day Alert Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Data Visibility</span>
                    <span className="font-mono-tabular font-semibold text-[#241B12] dark:text-[#F1E8D8]">
                      Authenticated Only
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Final Authority</span>
                    <span className="font-mono-tabular font-semibold text-[#046A38] dark:text-[#789783]">
                      Human Reviewer
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Compact 4-Step Visual Compliance Journey Focal Point (Positioned Below the Validation Trio) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.36, delay: 0.08, ease: SMOOTH_EASE }}
            className="mt-8 sm:mt-10 max-w-6xl 2xl:max-w-7xl mx-auto rounded-2xl liquid-glass-elevated heritage-double-frame overflow-hidden relative"
            aria-label="Interactive Dossier-to-Decision Compliance Journey"
          >
            <div className="px-4 sm:px-6 py-3 bg-[#F3E9D7]/90 dark:bg-[#1E160E]/90 border-b border-[#C7A56A]/40 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                <span className="text-xs font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  End-to-End Institutional Compliance Journey
                </span>
              </div>
              <span className="text-[11px] font-mono-tabular text-[#5C4A38] dark:text-[#D5C6B0]">
                Auto-advances every 5s · Select any stage to inspect workflow details
              </span>
            </div>

            {/* 4-Step Stepper Selector */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#C7A56A]/30 border-b border-[#C7A56A]/35 bg-[#FAF5EB] dark:bg-[#241B12]">
              {HERO_JOURNEY_STAGES.map((stage, idx) => {
                const isActive = activeJourneyStep === idx;
                return (
                  <button
                    key={stage.stepNumber}
                    type="button"
                    onClick={() => {
                      setActiveJourneyStep(idx);
                    }}
                    aria-pressed={isActive}
                    className={`p-3.5 sm:p-4 text-left transition-colors duration-150 cursor-pointer relative overflow-hidden ${
                      isActive
                        ? 'bg-[#FCF9F2] dark:bg-[#2E2217] text-[#241B12] dark:text-[#F1E8D8]'
                        : 'hover:bg-[#F3E9D7]/60 dark:hover:bg-[#1E160E]/70 text-[#5C4A38] dark:text-[#D5C6B0]'
                    }`}
                  >
                    {isActive && (
                      <div
                        className="h-1 w-full bg-[#C7A56A]/25 absolute top-0 left-0 right-0 overflow-hidden"
                        aria-hidden="true"
                      >
                        <motion.div
                          key={`progress-${activeJourneyStep}`}
                          initial={{ scaleX: prefersReducedMotion ? 1 : 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: prefersReducedMotion ? 0 : 5, ease: 'linear' }}
                          className="h-full w-full origin-left bg-gradient-to-r from-[#9E2919] via-[#C7A56A] to-[#789783]"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                      <span
                        className={`font-bold ${
                          isActive ? 'text-[#9E2919] dark:text-[#C7A56A]' : 'text-[#5C4A38] dark:text-[#A3927C]'
                        }`}
                      >
                        STEP {stage.stepNumber}
                      </span>
                      {idx < activeJourneyStep ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                      ) : isActive ? (
                        <span className="w-2 h-2 rounded-full bg-[#9E2919] dark:bg-[#C7A56A]" aria-hidden="true" />
                      ) : null}
                    </div>
                    <div className="text-xs sm:text-sm font-display font-bold text-[#241B12] dark:text-[#F1E8D8] mt-1">
                      {stage.shortTitle}
                    </div>
                    <div className="text-[11px] text-[#5C4A38] dark:text-[#D5C6B0] truncate mt-0.5">
                      {stage.actor}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Journey Stage Detail Panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage.stepNumber}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: SMOOTH_EASE }}
                className="p-4 sm:p-6 bg-[#FCF9F2] dark:bg-[#2E2217] grid grid-cols-1 lg:grid-cols-12 gap-5 items-center"
              >
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                      Stage {currentStage.stepNumber} of 04
                    </span>
                    <span aria-hidden="true" className="text-[#C7A56A]">·</span>
                    <span className="text-xs font-semibold text-[#5C4A38] dark:text-[#D5C6B0]">
                      {currentStage.actor}
                    </span>
                    <StatusBadge status={currentStage.statusBadge} />
                  </div>
                  <h2 className="text-base sm:text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                    {currentStage.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                    {currentStage.summary}
                  </p>
                </div>

                <div className="lg:col-span-5 rounded-xl bg-[#F4EDE1] dark:bg-[#1E160E] border border-[#C7A56A]/50 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-[#C7A56A]/30 pb-2">
                    <span className="text-[11px] font-mono-tabular font-bold text-[#046A38] dark:text-[#789783] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{currentStage.recordCode}</span>
                    </span>
                    <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#FCF9F2] dark:bg-[#241B12] border border-[#C7A56A]/40 text-[#5C4A38] dark:text-[#D5C6B0]">
                      Structured Record
                    </span>
                  </div>
                  <p className="text-xs text-[#241B12] dark:text-[#F1E8D8] leading-relaxed font-medium">
                    {currentStage.evidenceDetail}
                  </p>
                  <div className="pt-1.5 border-t border-[#C7A56A]/30 flex items-center justify-between gap-2 text-[11px] text-[#9E2919] dark:text-[#C7A56A] font-semibold">
                    <span>Next: {currentStage.nextActionLabel}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </section>

        {/* =========================================================
            01. PROBLEM & SOLUTION SECTION (#platform)
           ========================================================= */}
        <section
          id="platform"
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#C7A56A]/35"
        >
          <HeritageSectionDivider className="mb-10" />
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9E2919] dark:text-[#C7A56A] mb-1.5">
              01. Why VERIDEX
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8] tracking-tight">
              Replace fragmented document folders and repetitive manual cross-checks.
            </h2>
            <p className="text-sm text-[#5C4A38] dark:text-[#D5C6B0] mt-2 leading-relaxed">
              Institutional approval cycles require reviewing dozens of statutory certificates, faculty rosters, and safety clearances. VERIDEX brings structured organization and transparent review signals to every dossier.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Problem Card */}
            <div className="rounded-2xl liquid-glass p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                  Legacy Manual Process
                </div>
                <h3 className="text-xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Disconnected PDFs &amp; Repetitive Verification Bottlenecks
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Reviewers spend hours opening unindexed attachments, manually comparing dates and intake numbers across separate forms, and tracking certificate expirations in static spreadsheets.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#C7A56A]/35 text-xs text-[#5C4A38] dark:text-[#D5C6B0]">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#9E2919] dark:text-[#C7A56A] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Unstructured uploads make missing pages or unsigned annexures easy to overlook until late-stage committee review.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#9E2919] dark:text-[#C7A56A] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Lapsed municipal safety or affiliation certificates go unnoticed without automated validity window tracking.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#9E2919] dark:text-[#C7A56A] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Clarification requests and resubmitted document versions become scattered across email threads.</span>
                </div>
              </div>
            </div>

            {/* Solution Card */}
            <div className="rounded-2xl liquid-glass heritage-double-frame p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono-tabular font-bold text-[#046A38] dark:text-[#789783]">
                  Centralized VERIDEX Workflow
                </div>
                <h3 className="text-xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  One Structured Dossier from Submission to Human Sign-Off
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  VERIDEX generates category-specific checklists, organizes versioned institutional repositories, and surfaces evidence-linked review signals so authorized officers can focus on informed human judgment.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#789783]/35 text-xs text-[#241B12] dark:text-[#F1E8D8]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#046A38] dark:text-[#789783] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Tailored checklists map every required approval, faculty record, and financial annexure to a unique internal document code.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#046A38] dark:text-[#789783] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Structured metadata summaries and expiry calendars highlight potential discrepancies before final review.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#046A38] dark:text-[#789783] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Role-isolated workspaces keep institutional nodal officers and compliance reviewers aligned with full activity history.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            02. FEATURE SHOWCASE (#features) — 6 Bento Cards
           ========================================================= */}
        <section
          id="features"
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#C7A56A]/35"
        >
          <HeritageSectionDivider className="mb-10" />
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9E2919] dark:text-[#C7A56A] mb-1.5">
              02. Core Capabilities
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8] tracking-tight">
              Six coordinated capabilities built for institutional compliance.
            </h2>
            <p className="text-sm text-[#5C4A38] dark:text-[#D5C6B0] mt-2 leading-relaxed">
              Every module is designed to support transparent application review without replacing human administrative authority.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Feature 1: Application Validation (7 cols) */}
            <div className="md:col-span-7 rounded-2xl liquid-glass p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                    01 · Application Validation
                  </span>
                  <FileCheck2 className="w-5 h-5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Category-Specific Statutory Checklists
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Automatically configures required document checklists for Extension of Approval (EoA), New Course Proposals, Intake Increases, Infrastructure Audits, and Faculty Cadre Compliance.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F3E9D7] dark:bg-[#1E160E] border border-[#C7A56A]/45 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-[#241B12] dark:text-[#F1E8D8]">
                <span className="font-semibold">Checklist Readiness Tracking</span>
                <span className="text-[#046A38] dark:text-[#789783] font-bold">
                  Draft → Submitted → Under Review → Decision
                </span>
              </div>
            </div>

            {/* Feature 2: Document Organization (5 cols) */}
            <div className="md:col-span-5 rounded-2xl liquid-glass p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                    02 · Document Organization
                  </span>
                  <FolderKanban className="w-5 h-5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Structured Repository &amp; Versioning
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Assigns deterministic internal codes, structures institutional repository paths, and preserves version history when renewed certificates are registered.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F3E9D7] dark:bg-[#1E160E] border border-[#C7A56A]/45 text-[11px] font-mono-tabular font-semibold text-[#046A38] dark:text-[#789783]">
                /Repository/Category/DOC-CODE-01 (v1 → v2)
              </div>
            </div>

            {/* Feature 3: Structured Metadata Summary (5 cols) */}
            <div className="md:col-span-5 rounded-2xl liquid-glass p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                    03 · Structured Field Summary
                  </span>
                  <ScanText className="w-5 h-5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Side-by-Side Certificate Metadata Inspection
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Surfaces certificate numbers, issuing authorities, approved intake figures, and validity dates alongside the document record for rapid side-by-side reviewer inspection.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F3E9D7] dark:bg-[#1E160E] border border-[#C7A56A]/45 text-[11px] font-mono-tabular font-semibold text-[#046A38] dark:text-[#789783]">
                Side-by-side metadata &amp; document inspection
              </div>
            </div>

            {/* Feature 4: Expiry Monitoring (7 cols) */}
            <div className="md:col-span-7 rounded-2xl liquid-glass p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                    04 · Expiry Monitoring
                  </span>
                  <CalendarClock className="w-5 h-5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  Proactive Validity &amp; Renewal Calendar
                </h3>
                <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Automatically computes days remaining for fire safety NOCs, pollution control authorizations, and university affiliations—highlighting certificates that are expired or expiring within 45 days.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F3E9D7] dark:bg-[#1E160E] border border-[#C7A56A]/45 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular font-bold">
                <span className="text-[#046A38] dark:text-[#789783]">Valid (&gt;45d)</span>
                <span className="text-[#9E2919] dark:text-[#C7A56A]">Expiring Soon (≤45d)</span>
                <span className="text-red-700 dark:text-red-400">Expired (Action Required)</span>
              </div>
            </div>

            {/* Feature 5: Consistency Checks (6 cols) */}
            <div className="md:col-span-6 rounded-2xl liquid-glass p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                  05 · Consistency Checks
                </span>
                <GitCompare className="w-5 h-5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                Cross-Document Field &amp; Name Comparison
              </h3>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Flags discrepancies between application form declarations and supporting certificates—such as spelling variations on degree scrolls or mismatched intake totals across affiliation orders.
              </p>
            </div>

            {/* Feature 6: Compliance Rules (6 cols) */}
            <div className="md:col-span-6 rounded-2xl liquid-glass p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-bold text-[#9E2919] dark:text-[#C7A56A]">
                  06 · Compliance Rules
                </span>
                <Scale className="w-5 h-5 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                Configurable Regulatory Rule Engine
              </h3>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Evaluates applications against versioned statutory norms—including minimum laboratory carpet area (66 sq.m), faculty-student cadre ratios, and corpus fund thresholds.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================
            03. THREE-STEP WORKFLOW SECTION (#workflow): Submit → Validate → Review
           ========================================================= */}
        <section
          id="workflow"
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#C7A56A]/35"
        >
          <HeritageSectionDivider className="mb-10" />
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9E2919] dark:text-[#C7A56A] mb-1.5">
              03. Three-Step Workflow
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8] tracking-tight">
              Submit → Validate → Review
            </h2>
            <p className="text-sm text-[#5C4A38] dark:text-[#D5C6B0] mt-2 leading-relaxed">
              Every institutional application moves through three transparent stages with full audit traceability.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              {
                index: 0 as const,
                step: 'Step 01 · Submit',
                title: 'Institution Submits Dossier & Checklist Documents',
                actor: 'Institutional Nodal Representative',
                icon: <Building2 className="w-4 h-4 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />,
                description:
                  'The institution selects an approval category, registers required certificates in its isolated repository, confirms document categories, and submits the completed checklist.',
                deliverable: 'Structured Dossier + Versioned Document Codes',
              },
              {
                index: 1 as const,
                step: 'Step 02 · Validate',
                title: 'Compliance Checks Surface Evidence-Linked Signals',
                actor: 'VERIDEX Validation Pipeline',
                icon: <ShieldCheck className="w-4 h-4 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />,
                description:
                  'VERIDEX evaluates completeness, expiry windows, cross-document consistency, and regulatory rule thresholds—attaching specific page and field evidence to each finding.',
                deliverable: '6-Pillar Verification Findings & Expiry Alerts',
              },
              {
                index: 2 as const,
                step: 'Step 03 · Review',
                title: 'Authorized Officer Reviews, Queries & Decides',
                actor: 'Regional Compliance Reviewer (Admin)',
                icon: <UserCheck className="w-4 h-4 text-[#046A38] dark:text-[#789783]" aria-hidden="true" />,
                description:
                  'A human reviewer inspects the flagged signals, issues clarification or correction requests if needed, reviews institutional resubmissions, and records the final decision.',
                deliverable: 'Authorized Compliance Determination & Audit Log',
              },
            ].map((item) => {
              const isActive = activeWorkflowStep === item.index;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveWorkflowStep(item.index)}
                  className={`text-left rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-5 border-2 ${
                    isActive
                      ? 'liquid-glass-elevated border-[#C7A56A]'
                      : 'liquid-glass border-[#C7A56A]/35 hover:border-[#C7A56A]/70'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono-tabular">
                      <span
                        className={
                          isActive
                            ? 'text-[#9E2919] dark:text-[#C7A56A] font-bold'
                            : 'text-[#5C4A38] dark:text-[#D5C6B0] font-semibold'
                        }
                      >
                        {item.step}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#5C4A38] dark:text-[#D5C6B0]">
                        {item.icon}
                        <span>{item.actor}</span>
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-[#241B12] dark:text-[#F1E8D8]">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#C7A56A]/30 flex items-center justify-between text-xs font-mono-tabular font-semibold text-[#046A38] dark:text-[#789783]">
                    <span>Output: {item.deliverable}</span>
                    <ChevronRight className="w-4 h-4 text-[#046A38] dark:text-[#789783] shrink-0" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            04. RESPONSIBLE VERIFICATION SECTION (#about)
           ========================================================= */}
        <section
          id="about"
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t border-[#C7A56A]/35"
        >
          <HeritageSectionDivider className="mb-10" />
          <div className="rounded-2xl liquid-glass-elevated heritage-double-frame p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
            <HeritageCornerOrnament position="top-left" size="md" />
            <HeritageCornerOrnament position="bottom-right" size="md" />

            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9E2919] dark:text-[#C7A56A]">
                04. Responsible Verification &amp; Governance
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8] tracking-tight">
                Review signals assist human officers—they never replace due process.
              </h2>
              <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                Regulatory compliance decisions carry high institutional and academic stakes. VERIDEX is architected around strict data confidentiality and transparent human-in-the-loop governance.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-[#F8F2E6] dark:bg-[#1E160E] border border-[#C7A56A]/45 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  <ShieldCheck className="w-4 h-4 text-[#046A38] dark:text-[#789783] shrink-0" aria-hidden="true" />
                  <span>Review Signals, Not Proof of Fraud</span>
                </div>
                <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Potential inconsistencies, field mismatches, or structural document flags are surfaced strictly as prompts for human inspection. A low-resolution scan or spelling variation is never treated as automatic proof of forgery.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#F8F2E6] dark:bg-[#1E160E] border border-[#C7A56A]/45 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  <Info className="w-4 h-4 text-[#046A38] dark:text-[#789783] shrink-0" aria-hidden="true" />
                  <span>External Issuer Registry Scope</span>
                </div>
                <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Direct cryptographic verification with external issuing authorities (such as NAD, ICAI UDIN, or municipal fire registries) remains marked unavailable unless an authorized government registry integration is enabled.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#F8F2E6] dark:bg-[#1E160E] border border-[#C7A56A]/45 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#241B12] dark:text-[#F1E8D8]">
                  <Lock className="w-4 h-4 text-[#046A38] dark:text-[#789783] shrink-0" aria-hidden="true" />
                  <span>Confidentiality &amp; Mandatory Officer Determination</span>
                </div>
                <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed">
                  Institutional dossiers, applicant records, and certificate attachments are strictly protected behind role-based authentication. Only authorized compliance reviewers can issue formal clarification requests or record compliance determinations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL HIGH-CONTRAST CTA SECTION
           ========================================================= */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="rounded-3xl liquid-glass-elevated heritage-double-frame p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
            <div className="h-1.5 w-full tricolour-bar absolute top-0 left-0 right-0" />
            <HeritageCornerOrnament position="top-left" size="md" />
            <HeritageCornerOrnament position="top-right" size="md" />
            <HeritageCornerOrnament position="bottom-left" size="md" />
            <HeritageCornerOrnament position="bottom-right" size="md" />

            <p className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#9E2919] dark:text-[#C7A56A]">
              Ready to Access the VERIDEX Workspace?
            </p>
            <h2 className="text-2xl sm:text-4xl font-display font-bold text-[#241B12] dark:text-[#F1E8D8] tracking-tight max-w-2xl mx-auto">
              Experience structured application validation and compliance review.
            </h2>
            <p className="text-xs sm:text-sm text-[#5C4A38] dark:text-[#D5C6B0] max-w-xl mx-auto leading-relaxed">
              Sign in with your authorized credentials to access institutional dossiers, inspect 6-pillar verification signals, manage document repositories, and track certificate expiry windows.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={isAuthenticated && onReturnToWorkspace ? onReturnToWorkspace : onOpenLogin}
                className="px-6 py-3 rounded-xl bg-[#9E2919] hover:bg-[#822013] text-[#F1E8D8] text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md border border-[#C7A56A]/65 flex items-center gap-2"
              >
                <span>{isAuthenticated ? 'Return to Active Workspace' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4 text-[#F1E8D8]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
         ========================================================= */}
      <footer className="border-t border-[#C7A56A]/45 bg-[#EAE0CE] dark:bg-[#1C140D] py-12 px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
                alt="VERIDEX Logo"
                referrerPolicy="no-referrer"
                className="h-9 w-auto rounded-lg object-contain bg-[#E7D8C0] border-2 border-[#C7A56A] shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-base text-[#241B12] dark:text-[#F1E8D8] leading-tight">
                  VERIDEX
                </span>
                <span className="text-xs font-semibold text-[#046A38] dark:text-[#C7A56A] leading-tight mt-0.5">
                  हर दावे की जाँच, हर सच की पहचान
                </span>
              </div>
            </div>
            <p className="text-xs text-[#5C4A38] dark:text-[#D5C6B0] leading-relaxed pt-1">
              Application validation, document organization, and regulatory compliance verification portal for educational institutions and authorized reviewers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-[#5C4A38] dark:text-[#D5C6B0]">
            <button
              type="button"
              onClick={() => scrollToSection('platform')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-[#9E2919] dark:hover:text-[#C7A56A] transition-colors cursor-pointer"
            >
              Responsible Verification
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[#046A38] dark:text-[#789783] hover:underline font-bold transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#C7A56A]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-[#5C4A38] dark:text-[#A3927C]">
          <p>
            <strong>Governance &amp; Privacy Notice:</strong> Institutional dossiers and applicant records are restricted to authenticated role-authorized accounts. Automated checks serve as review signals for authorized compliance officers.
          </p>
          <span className="font-mono-tabular font-semibold text-[#241B12] dark:text-[#F1E8D8] shrink-0">
            VERIDEX Compliance Portal
          </span>
        </div>
      </footer>
    </div>
  );
};
