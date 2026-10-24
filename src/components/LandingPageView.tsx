import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
} from 'lucide-react';
import { StatusBadge } from './StatusPrimitives';

interface LandingPageViewProps {
  onOpenLogin: () => void;
  isAuthenticated?: boolean;
  onReturnToWorkspace?: () => void;
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
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [activeJourneyStep, setActiveJourneyStep] = useState<number>(0);
  const [journeyPausedByUser, setJourneyPausedByUser] = useState<boolean>(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<0 | 1 | 2>(1);
  const [boardFilter, setBoardFilter] = useState<'all' | 'validation' | 'governance'>('all');

  // Restrained sequential focus transition across the 4-step hero journey (disabled when reduced motion is preferred or user manually selects a step)
  useEffect(() => {
    if (prefersReducedMotion || journeyPausedByUser) return;
    const interval = window.setInterval(() => {
      setActiveJourneyStep((prev) => (prev + 1) % HERO_JOURNEY_STAGES.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [prefersReducedMotion, journeyPausedByUser]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const currentStage = HERO_JOURNEY_STAGES[activeJourneyStep];

  return (
    <div className="min-h-screen bg-[#F4EDE1] text-stone-900 font-sans selection:bg-[#C2410C]/20 selection:text-[#7C2D12] overflow-x-hidden">
      {/* Sovereign Tricolour Top Ribbon */}
      <div className="h-1.5 w-full tricolour-bar sticky top-0 z-50" />

      {/* Warm Parchment & Subtle Tricolour Ambient Wash */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      >
        <div
          className="absolute -top-40 left-0 w-[680px] h-[480px] rounded-full opacity-35 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(234, 88, 12, 0.18) 0%, rgba(194, 65, 12, 0.06) 55%, transparent 75%)',
          }}
        />
        <div
          className="absolute top-36 right-0 w-[680px] h-[480px] rounded-full opacity-35 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(4, 106, 56, 0.16) 0%, rgba(21, 128, 61, 0.06) 55%, transparent 75%)',
          }}
        />
      </div>

      {/* Top Navigation Bar (Strict 3-Zone Contract: Brand + Tagline | Nav Links | Actions) */}
      <header className="sticky top-1.5 z-40 border-b-2 border-[#C2410C]/35 bg-[#FAF5EB]/95 backdrop-blur-md shadow-xs">
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
              className="h-10 w-auto rounded-lg object-contain bg-[#E7D8C0] border-2 border-[#C2410C]/45 shadow-xs shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight text-stone-900 leading-tight">
                VERIDEX
              </span>
              <span className="text-xs font-semibold text-[#046A38] leading-tight mt-0.5">
                हर दावे की जाँच, हर सच की पहचान
              </span>
            </div>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-xs font-semibold text-stone-700"
          >
            <button
              type="button"
              onClick={() => scrollToSection('platform')}
              className="hover:text-[#C2410C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#C2410C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-[#C2410C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-[#C2410C] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
            >
              About
            </button>
          </nav>

          {/* Zone 3: Sign In & Get Started Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
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
              <>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-3.5 py-2 rounded-xl bg-[#FCF9F2] hover:bg-[#EFE6D5] text-stone-800 border border-[#C2410C]/40 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="btn-primary px-4 py-2 text-xs"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10">
        {/* =========================================================
            HERO SECTION + 4-STEP DOSSIER-TO-DECISION VISUAL JOURNEY
           ========================================================= */}
        <section className="pt-12 sm:pt-16 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: SMOOTH_EASE }}
            className="text-center max-w-3xl mx-auto space-y-5"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-md bg-[#FCF9F2] border border-[#C2410C]/40 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#046A38]" aria-hidden="true" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#C2410C]">
                Institutional Validation &amp; Regulatory Compliance Portal
              </span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[56px] leading-[1.06] tracking-tight text-stone-900">
              Document Verification,{' '}
              <span className="bg-gradient-to-r from-[#C2410C] via-[#B45309] to-[#046A38] bg-clip-text text-transparent">
                Reimagined.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-stone-700 max-w-2xl mx-auto leading-relaxed">
              Validate institutional applications, organize supporting document records against statutory checklists, and surface evidence-linked compliance findings through one structured review workflow.
            </p>

            {/* Primary & Secondary Hero CTAs — Primary Action Clearly Dominant */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={isAuthenticated && onReturnToWorkspace ? onReturnToWorkspace : onOpenLogin}
                className="px-6 py-3 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md border border-[#7C2D12] inline-flex items-center gap-2 whitespace-nowrap"
              >
                <span>{isAuthenticated ? 'Open Active Workspace' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4 text-white" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('platform')}
                className="px-5 py-3 rounded-xl bg-[#FCF9F2] hover:bg-[#EFE6D5] text-stone-800 border border-[#C2410C]/45 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              >
                Explore the Platform
              </button>
            </div>
          </motion.div>

          {/* 3-Card Layered Floating Software Showcase (Beige Surface, Dark Orange Borders, Green Icons) */}
          <div className="relative mt-10 sm:mt-12 max-w-6xl 2xl:max-w-7xl mx-auto pt-2 pb-4">
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
              {/* LEFT FLOATING WING CARD: Validation Architecture Coverage */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, x: -24, rotate: -2 }}
                animate={{ opacity: 1, x: 0, rotate: -2 }}
                transition={{ duration: 0.55, delay: 0.08, ease: SMOOTH_EASE }}
                className="hidden lg:block lg:col-span-3 -mr-6 mb-6 z-10 rounded-2xl bg-[#FCF9F2]/95 backdrop-blur-md border-2 border-[#C2410C]/55 p-5 shadow-[0_18px_45px_rgba(124,45,18,0.14)]"
              >
                <div className="flex items-center justify-between text-xs font-medium text-stone-700 mb-4">
                  <span className="flex items-center gap-1.5 font-display font-bold text-stone-900">
                    <Activity className="w-4 h-4 text-[#046A38]" aria-hidden="true" />
                    <span>Validation Engine</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular font-semibold text-[#C2410C]">
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
                      stroke="rgba(194, 65, 12, 0.15)"
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
                        <stop offset="0%" stopColor="#C2410C" />
                        <stop offset="100%" stopColor="#046A38" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-display font-bold font-mono-tabular text-stone-900">
                      100%
                    </span>
                    <span className="text-[10px] font-medium text-stone-600">Role-Protected</span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-[#C2410C]/25 text-xs">
                  <div className="flex items-center justify-between text-stone-700">
                    <span>Checklist Completeness</span>
                    <span className="font-mono-tabular font-semibold text-[#046A38]">Tracked</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-700">
                    <span>Expiry Window Watch</span>
                    <span className="font-mono-tabular font-semibold text-[#C2410C]">45-Day Alert</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-700">
                    <span>Institutional Dossiers</span>
                    <span className="font-mono-tabular font-semibold text-[#046A38]">Sign-In Only</span>
                  </div>
                </div>
              </motion.div>

              {/* CENTER MAIN PRODUCT BOARD MOCKUP */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.04, ease: SMOOTH_EASE }}
                className="lg:col-span-6 z-20 rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/65 shadow-[0_24px_60px_rgba(124,45,18,0.18)] overflow-hidden"
              >
                {/* Board Window Top Toolbar */}
                <div className="px-4 py-3 border-b-2 border-[#C2410C]/35 bg-[#F3E9D7] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#046A38]" aria-hidden="true" />
                    <span className="text-xs font-display font-bold text-stone-900">
                      Application Validation Board
                    </span>
                  </div>

                  {/* Interactive Filter inside Hero Preview */}
                  <div className="flex items-center gap-1 bg-[#FAF5EB] p-0.5 rounded-lg border border-[#C2410C]/40 text-[11px]">
                    {(['all', 'validation', 'governance'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBoardFilter(mode)}
                        className={`px-2.5 py-0.5 rounded-md capitalize transition-colors cursor-pointer ${
                          boardFilter === mode
                            ? 'bg-[#C2410C] text-white font-semibold'
                            : 'text-stone-700 hover:text-stone-900'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3-Column Non-Confidential Workflow Board Inside Center Frame */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left bg-[#F8F2E6]">
                  {/* Column 1: Dossier Intake */}
                  <div className="rounded-xl bg-[#EFE6D5]/80 border border-[#C2410C]/35 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-800 pb-1.5 border-b border-[#C2410C]/25">
                      <span>Dossier Intake</span>
                      <span className="font-mono-tabular text-[#C2410C]">Stage 01</span>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'validation') && (
                      <div className="rounded-xl bg-[#FCF9F2] border border-[#C2410C]/40 p-3 space-y-2">
                        <div className="text-xs font-bold text-stone-900 leading-snug">
                          Statutory Checklist Assembly
                        </div>
                        <div className="text-[11px] text-[#C2410C] font-semibold">
                          Category-Specific Requirements
                        </div>
                        <div className="text-[10px] text-stone-600 leading-relaxed">
                          Maps approvals, faculty records, and safety annexures into structured folders.
                        </div>
                        <div className="pt-1 border-t border-[#C2410C]/20 text-[10px] text-[#046A38] font-mono-tabular font-semibold">
                          Structured Metadata Indexing
                        </div>
                      </div>
                    )}

                    {(boardFilter === 'all' || boardFilter === 'governance') && (
                      <div className="rounded-xl bg-[#FCF9F2] border border-[#C2410C]/40 p-3 space-y-2">
                        <div className="text-xs font-bold text-stone-900 leading-snug">
                          Version-Controlled Repository
                        </div>
                        <div className="text-[11px] text-[#046A38] font-semibold">
                          Sequential Document Coding
                        </div>
                        <div className="text-[10px] text-stone-600 leading-relaxed">
                          Preserves full revision history when renewed certificates are registered.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Compliance Checks */}
                  <div className="rounded-xl bg-[#EFE6D5]/80 border border-[#C2410C]/35 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-800 pb-1.5 border-b border-[#C2410C]/25">
                      <span>Compliance Checks</span>
                      <span className="font-mono-tabular text-[#046A38]">Stage 02</span>
                    </div>

                    <div className="rounded-xl bg-[#FCF9F2] border-2 border-[#C2410C]/50 p-3 space-y-2">
                      <div className="text-xs font-bold text-stone-900 leading-snug">
                        Cross-Document Consistency
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-stone-700 font-mono-tabular font-semibold">
                          <span>Rule Alignment</span>
                          <span>6 Pillars</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
                          <div className="h-full w-full rounded-full bg-gradient-to-r from-[#C2410C] to-[#046A38]" />
                        </div>
                      </div>
                      <div className="text-[10px] text-stone-600 leading-relaxed">
                        Compares application declarations against registered supporting evidence.
                      </div>
                      <div className="pt-1 border-t border-[#C2410C]/20 text-[10px] text-[#046A38] font-semibold">
                        Norm &amp; Threshold Evaluation
                      </div>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'validation') && (
                      <div className="rounded-xl bg-[#FCF9F2] border border-[#C2410C]/40 p-3 space-y-1.5">
                        <div className="text-xs font-bold text-stone-900 leading-snug">
                          Expiry &amp; Validity Watch
                        </div>
                        <div className="text-[11px] text-[#C2410C] font-semibold">
                          45-Day Renewal Advisory
                        </div>
                        <div className="text-[10px] text-stone-600 leading-relaxed">
                          Flags lapsed or soon-to-expire clearances before committee review.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Officer Sign-Off */}
                  <div className="rounded-xl bg-[#EFE6D5]/80 border border-[#C2410C]/35 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-800 pb-1.5 border-b border-[#C2410C]/25">
                      <span>Officer Sign-Off</span>
                      <span className="font-mono-tabular text-[#046A38]">Stage 03</span>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'governance') && (
                      <div className="rounded-xl bg-[#FCF9F2] border border-[#C2410C]/40 p-3 space-y-2">
                        <div className="text-xs font-bold text-stone-900 leading-snug">
                          Human-in-the-Loop Decision
                        </div>
                        <div className="text-[11px] text-[#046A38] font-semibold">
                          Authorized Reviewer Sign-Off
                        </div>
                        <div className="text-[10px] text-stone-600 leading-relaxed">
                          Officers inspect flagged signals, request clarifications, and record determinations.
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl bg-[#FCF9F2] border border-[#C2410C]/45 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 leading-snug">
                        <Lock className="w-3.5 h-3.5 text-[#046A38] shrink-0" aria-hidden="true" />
                        <span>Confidential Records Protected</span>
                      </div>
                      <div className="text-[10px] text-stone-600 leading-relaxed">
                        Institutional dossiers and applicant records are hidden until authenticated sign-in.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* RIGHT FLOATING WING CARD: Verification Signal & Access Control */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24, rotate: 2 }}
                animate={{ opacity: 1, x: 0, rotate: 2 }}
                transition={{ duration: 0.55, delay: 0.12, ease: SMOOTH_EASE }}
                className="hidden lg:block lg:col-span-3 -ml-6 mb-6 z-10 rounded-2xl bg-[#FCF9F2]/95 backdrop-blur-md border-2 border-[#C2410C]/55 p-5 shadow-[0_18px_45px_rgba(124,45,18,0.14)] space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-display font-bold text-stone-900">
                    <Sparkles className="w-4 h-4 text-[#046A38]" aria-hidden="true" />
                    <span>Review Signal</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular font-semibold text-[#C2410C]">
                    Evidence-Linked
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F3E9D7] border border-[#C2410C]/45 space-y-2">
                  <div className="text-xs font-bold text-stone-900">
                    Cross-Document Field Check
                  </div>
                  <p className="text-[11px] text-stone-700 leading-relaxed">
                    Registered certificate numbers &amp; validity dates compared against institutional checklist rules.
                  </p>
                  <button
                    type="button"
                    onClick={isAuthenticated && onReturnToWorkspace ? onReturnToWorkspace : onOpenLogin}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-[11px] font-semibold text-white transition-colors cursor-pointer"
                  >
                    {isAuthenticated ? 'Return to Workspace' : 'Sign In to Access Portal'}
                  </button>
                </div>

                <div className="space-y-2 text-[11px] text-stone-700 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Expiry Window</span>
                    <span className="font-mono-tabular font-semibold text-[#C2410C]">45-Day Alert Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Data Visibility</span>
                    <span className="font-mono-tabular font-semibold text-stone-900">Authenticated Only</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-600">Final Authority</span>
                    <span className="font-mono-tabular font-semibold text-[#046A38]">Human Reviewer</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Compact 4-Step Visual Compliance Journey Focal Point (Positioned Below the Validation Trio) */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: SMOOTH_EASE }}
            className="mt-8 sm:mt-10 max-w-6xl 2xl:max-w-7xl mx-auto rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/60 shadow-[0_18px_45px_rgba(124,45,18,0.12)] overflow-hidden"
            aria-label="Interactive Dossier-to-Decision Compliance Journey"
          >
            <div className="px-4 sm:px-6 py-3 bg-[#F3E9D7] border-b border-[#C2410C]/35 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#046A38]" aria-hidden="true" />
                <span className="text-xs font-display font-bold text-stone-900">
                  End-to-End Institutional Compliance Journey
                </span>
              </div>
              <span className="text-[11px] font-mono-tabular text-stone-600">
                Select any stage to inspect workflow details
              </span>
            </div>

            {/* 4-Step Stepper Selector */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#C2410C]/25 border-b border-[#C2410C]/30 bg-[#FAF5EB]">
              {HERO_JOURNEY_STAGES.map((stage, idx) => {
                const isActive = activeJourneyStep === idx;
                return (
                  <button
                    key={stage.stepNumber}
                    type="button"
                    onClick={() => {
                      setActiveJourneyStep(idx);
                      setJourneyPausedByUser(true);
                    }}
                    aria-pressed={isActive}
                    className={`p-3.5 sm:p-4 text-left transition-colors cursor-pointer relative ${
                      isActive
                        ? 'bg-[#FCF9F2] text-stone-900'
                        : 'hover:bg-[#F3E9D7]/60 text-stone-600'
                    }`}
                  >
                    {isActive && (
                      <div
                        className="h-1 w-full bg-gradient-to-r from-[#C2410C] to-[#046A38] absolute top-0 left-0 right-0"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
                      <span
                        className={`font-bold ${
                          isActive ? 'text-[#C2410C]' : 'text-stone-500'
                        }`}
                      >
                        STEP {stage.stepNumber}
                      </span>
                      {idx < activeJourneyStep ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#046A38]" aria-hidden="true" />
                      ) : isActive ? (
                        <span className="w-2 h-2 rounded-full bg-[#C2410C]" aria-hidden="true" />
                      ) : null}
                    </div>
                    <div className="text-xs sm:text-sm font-display font-bold text-stone-900 mt-1">
                      {stage.shortTitle}
                    </div>
                    <div className="text-[11px] text-stone-600 truncate mt-0.5">
                      {stage.actor}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Journey Stage Detail Panel */}
            <div className="p-4 sm:p-6 bg-[#FCF9F2] grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              <div className="lg:col-span-7 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                    Stage {currentStage.stepNumber} of 04
                  </span>
                  <span aria-hidden="true" className="text-stone-400">·</span>
                  <span className="text-xs font-semibold text-stone-700">
                    {currentStage.actor}
                  </span>
                  <StatusBadge status={currentStage.statusBadge} />
                </div>
                <h2 className="text-base sm:text-lg font-display font-bold text-stone-900">
                  {currentStage.title}
                </h2>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {currentStage.summary}
                </p>
              </div>

              <div className="lg:col-span-5 rounded-xl bg-[#F4EDE1] border border-[#C2410C]/40 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#C2410C]/20 pb-2">
                  <span className="text-[11px] font-mono-tabular font-bold text-[#046A38] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{currentStage.recordCode}</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-[#FCF9F2] border border-[#C2410C]/30 text-stone-700">
                    Structured Record
                  </span>
                </div>
                <p className="text-xs text-stone-800 leading-relaxed font-medium">
                  {currentStage.evidenceDetail}
                </p>
                <div className="pt-1.5 border-t border-[#C2410C]/20 flex items-center justify-between gap-2 text-[11px] text-[#C2410C] font-semibold">
                  <span>Next: {currentStage.nextActionLabel}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* =========================================================
            01. PROBLEM & SOLUTION SECTION (#platform)
           ========================================================= */}
        <section
          id="platform"
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t-2 border-[#C2410C]/25"
        >
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1.5">
              01. Why VERIDEX
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 tracking-tight">
              Replace fragmented document folders and repetitive manual cross-checks.
            </h2>
            <p className="text-sm text-stone-700 mt-2 leading-relaxed">
              Institutional approval cycles require reviewing dozens of statutory certificates, faculty rosters, and safety clearances. VERIDEX brings structured organization and transparent review signals to every dossier.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Problem Card */}
            <div className="rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/45 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs">
              <div className="space-y-3">
                <div className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                  Legacy Manual Process
                </div>
                <h3 className="text-xl font-display font-bold text-stone-900">
                  Disconnected PDFs &amp; Repetitive Verification Bottlenecks
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Reviewers spend hours opening unindexed attachments, manually comparing dates and intake numbers across separate forms, and tracking certificate expirations in static spreadsheets.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#C2410C]/25 text-xs text-stone-700">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Unstructured uploads make missing pages or unsigned annexures easy to overlook until late-stage committee review.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Lapsed municipal safety or affiliation certificates go unnoticed without automated validity window tracking.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#C2410C] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Clarification requests and resubmitted document versions become scattered across email threads.</span>
                </div>
              </div>
            </div>

            {/* Solution Card */}
            <div className="rounded-2xl bg-[#FCF9F2] border-2 border-[#046A38]/55 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-sm">
              <div className="space-y-3">
                <div className="text-xs font-mono-tabular font-bold text-[#046A38]">
                  Centralized VERIDEX Workflow
                </div>
                <h3 className="text-xl font-display font-bold text-stone-900">
                  One Structured Dossier from Submission to Human Sign-Off
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  VERIDEX generates category-specific checklists, organizes versioned institutional repositories, and surfaces evidence-linked review signals so authorized officers can focus on informed human judgment.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#046A38]/25 text-xs text-stone-800">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Tailored checklists map every required approval, faculty record, and financial annexure to a unique internal document code.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Structured metadata summaries and expiry calendars highlight potential discrepancies before final review.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#046A38] shrink-0 mt-0.5" aria-hidden="true" />
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
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t-2 border-[#C2410C]/25"
        >
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1.5">
              02. Core Capabilities
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 tracking-tight">
              Six coordinated capabilities built for institutional compliance.
            </h2>
            <p className="text-sm text-stone-700 mt-2 leading-relaxed">
              Every module is designed to support transparent application review without replacing human administrative authority.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Feature 1: Application Validation (7 cols) */}
            <div className="md:col-span-7 rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/45 hover:border-[#9A3412] transition-all p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                    01 · Application Validation
                  </span>
                  <FileCheck2 className="w-5 h-5 text-[#046A38]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-stone-900">
                  Category-Specific Statutory Checklists
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Automatically configures required document checklists for Extension of Approval (EoA), New Course Proposals, Intake Increases, Infrastructure Audits, and Faculty Cadre Compliance.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F3E9D7] border border-[#C2410C]/35 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-stone-800">
                <span className="font-semibold">Checklist Readiness Tracking</span>
                <span className="text-[#046A38] font-bold">Draft → Submitted → Under Review → Decision</span>
              </div>
            </div>

            {/* Feature 2: Document Organization (5 cols) */}
            <div className="md:col-span-5 rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/45 hover:border-[#9A3412] transition-all p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                    02 · Document Organization
                  </span>
                  <FolderKanban className="w-5 h-5 text-[#046A38]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-stone-900">
                  Structured Repository &amp; Versioning
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Assigns deterministic internal codes, structures institutional repository paths, and preserves version history when renewed certificates are registered.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F3E9D7] border border-[#C2410C]/35 text-[11px] font-mono-tabular font-semibold text-[#046A38]">
                /Repository/Category/DOC-CODE-01 (v1 → v2)
              </div>
            </div>

            {/* Feature 3: Structured Metadata Summary (5 cols) */}
            <div className="md:col-span-5 rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/45 hover:border-[#9A3412] transition-all p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                    03 · Structured Field Summary
                  </span>
                  <ScanText className="w-5 h-5 text-[#046A38]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-stone-900">
                  Side-by-Side Certificate Metadata Inspection
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Surfaces certificate numbers, issuing authorities, approved intake figures, and validity dates alongside the document record for rapid side-by-side reviewer inspection.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F3E9D7] border border-[#C2410C]/35 text-[11px] font-mono-tabular font-semibold text-[#046A38]">
                Side-by-side metadata &amp; document inspection
              </div>
            </div>

            {/* Feature 4: Expiry Monitoring (7 cols) */}
            <div className="md:col-span-7 rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/45 hover:border-[#9A3412] transition-all p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                    04 · Expiry Monitoring
                  </span>
                  <CalendarClock className="w-5 h-5 text-[#046A38]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-display font-bold text-stone-900">
                  Proactive Validity &amp; Renewal Calendar
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  Automatically computes days remaining for fire safety NOCs, pollution control authorizations, and university affiliations—highlighting certificates that are expired or expiring within 45 days.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F3E9D7] border border-[#C2410C]/35 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular font-bold">
                <span className="text-[#046A38]">Valid (&gt;45d)</span>
                <span className="text-[#C2410C]">Expiring Soon (≤45d)</span>
                <span className="text-red-700">Expired (Action Required)</span>
              </div>
            </div>

            {/* Feature 5: Consistency Checks (6 cols) */}
            <div className="md:col-span-6 rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/45 hover:border-[#9A3412] transition-all p-6 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                  05 · Consistency Checks
                </span>
                <GitCompare className="w-5 h-5 text-[#046A38]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-display font-bold text-stone-900">
                Cross-Document Field &amp; Name Comparison
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                Flags discrepancies between application form declarations and supporting certificates—such as spelling variations on degree scrolls or mismatched intake totals across affiliation orders.
              </p>
            </div>

            {/* Feature 6: Compliance Rules (6 cols) */}
            <div className="md:col-span-6 rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/45 hover:border-[#9A3412] transition-all p-6 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular font-bold text-[#C2410C]">
                  06 · Compliance Rules
                </span>
                <Scale className="w-5 h-5 text-[#046A38]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-display font-bold text-stone-900">
                Configurable Regulatory Rule Engine
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
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
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t-2 border-[#C2410C]/25"
        >
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1.5">
              03. Three-Step Workflow
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 tracking-tight">
              Submit → Validate → Review
            </h2>
            <p className="text-sm text-stone-700 mt-2 leading-relaxed">
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
                icon: <Building2 className="w-4 h-4 text-[#046A38]" aria-hidden="true" />,
                description:
                  'The institution selects an approval category, registers required certificates in its isolated repository, confirms document categories, and submits the completed checklist.',
                deliverable: 'Structured Dossier + Versioned Document Codes',
              },
              {
                index: 1 as const,
                step: 'Step 02 · Validate',
                title: 'Compliance Checks Surface Evidence-Linked Signals',
                actor: 'VERIDEX Validation Pipeline',
                icon: <ShieldCheck className="w-4 h-4 text-[#046A38]" aria-hidden="true" />,
                description:
                  'VERIDEX evaluates completeness, expiry windows, cross-document consistency, and regulatory rule thresholds—attaching specific page and field evidence to each finding.',
                deliverable: '6-Pillar Verification Findings & Expiry Alerts',
              },
              {
                index: 2 as const,
                step: 'Step 03 · Review',
                title: 'Authorized Officer Reviews, Queries & Decides',
                actor: 'Regional Compliance Reviewer (Admin)',
                icon: <UserCheck className="w-4 h-4 text-[#046A38]" aria-hidden="true" />,
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
                      ? 'bg-[#FCF9F2] border-[#C2410C] shadow-[0_12px_32px_rgba(194,65,12,0.16)]'
                      : 'bg-[#F8F2E6] border-[#C2410C]/35 hover:border-[#C2410C]/65'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono-tabular">
                      <span className={isActive ? 'text-[#C2410C] font-bold' : 'text-stone-600 font-semibold'}>
                        {item.step}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-600">
                        {item.icon}
                        <span>{item.actor}</span>
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-stone-900">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#C2410C]/25 flex items-center justify-between text-xs font-mono-tabular font-semibold text-[#046A38]">
                    <span>Output: {item.deliverable}</span>
                    <ChevronRight className="w-4 h-4 text-[#046A38] shrink-0" aria-hidden="true" />
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
          className="py-20 px-4 sm:px-6 max-w-7xl mx-auto border-t-2 border-[#C2410C]/25"
        >
          <div className="rounded-2xl bg-[#FCF9F2] border-2 border-[#C2410C]/50 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start shadow-sm">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C]">
                04. Responsible Verification &amp; Governance
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-stone-900 tracking-tight">
                Review signals assist human officers—they never replace due process.
              </h2>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                Regulatory compliance decisions carry high institutional and academic stakes. VERIDEX is architected around strict data confidentiality and transparent human-in-the-loop governance.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-[#F8F2E6] border border-[#C2410C]/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <ShieldCheck className="w-4 h-4 text-[#046A38] shrink-0" aria-hidden="true" />
                  <span>Review Signals, Not Proof of Fraud</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Potential inconsistencies, field mismatches, or structural document flags are surfaced strictly as prompts for human inspection. A low-resolution scan or spelling variation is never treated as automatic proof of forgery.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#F8F2E6] border border-[#C2410C]/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <Info className="w-4 h-4 text-[#046A38] shrink-0" aria-hidden="true" />
                  <span>External Issuer Registry Scope</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
                  Direct cryptographic verification with external issuing authorities (such as NAD, ICAI UDIN, or municipal fire registries) remains marked unavailable unless an authorized government registry integration is enabled.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#F8F2E6] border border-[#C2410C]/40 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
                  <Lock className="w-4 h-4 text-[#046A38] shrink-0" aria-hidden="true" />
                  <span>Confidentiality &amp; Mandatory Officer Determination</span>
                </div>
                <p className="text-xs text-stone-700 leading-relaxed">
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
          <div className="rounded-3xl bg-[#FCF9F2] border-2 border-[#C2410C]/65 p-8 sm:p-12 text-center space-y-6 shadow-[0_20px_50px_rgba(124,45,18,0.14)] relative overflow-hidden">
            <div className="h-1.5 w-full tricolour-bar absolute top-0 left-0 right-0" />
            <p className="text-xs font-mono-tabular font-bold uppercase tracking-wider text-[#C2410C]">
              Ready to Access the VERIDEX Workspace?
            </p>
            <h2 className="text-2xl sm:text-4xl font-display font-bold text-stone-900 tracking-tight max-w-2xl mx-auto">
              Experience structured application validation and compliance review.
            </h2>
            <p className="text-xs sm:text-sm text-stone-700 max-w-xl mx-auto leading-relaxed">
              Sign in with your authorized credentials to access institutional dossiers, inspect 6-pillar verification signals, manage document repositories, and track certificate expiry windows.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={isAuthenticated && onReturnToWorkspace ? onReturnToWorkspace : onOpenLogin}
                className="px-6 py-3 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md border border-[#7C2D12] flex items-center gap-2"
              >
                <span>{isAuthenticated ? 'Return to Active Workspace' : 'Get Started — Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
         ========================================================= */}
      <footer className="border-t-2 border-[#C2410C]/35 bg-[#EAE0CE] py-12 px-4 sm:px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_16.59.09_2f2ed194.jpeg"
                alt="VERIDEX Logo"
                referrerPolicy="no-referrer"
                className="h-9 w-auto rounded-lg object-contain bg-[#E7D8C0] border-2 border-[#C2410C]/45 shrink-0"
              />
              <div className="flex flex-col">
                <span className="font-display font-bold text-base text-stone-900 leading-tight">
                  VERIDEX
                </span>
                <span className="text-xs font-semibold text-[#046A38] leading-tight mt-0.5">
                  हर दावे की जाँच, हर सच की पहचान
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed pt-1">
              Application validation, document organization, and regulatory compliance verification portal for educational institutions and authorized reviewers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-stone-700">
            <button
              type="button"
              onClick={() => scrollToSection('platform')}
              className="hover:text-[#C2410C] transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-[#C2410C] transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-[#C2410C] transition-colors cursor-pointer"
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-[#C2410C] transition-colors cursor-pointer"
            >
              Responsible Verification
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[#046A38] hover:text-[#03542C] font-bold transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#C2410C]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-stone-600">
          <p>
            <strong>Governance &amp; Privacy Notice:</strong> Institutional dossiers and applicant records are restricted to authenticated role-authorized accounts. Automated checks serve as review signals for authorized compliance officers.
          </p>
          <span className="font-mono-tabular font-semibold text-stone-700 shrink-0">
            VERIDEX Compliance Portal
          </span>
        </div>
      </footer>
    </div>
  );
};
