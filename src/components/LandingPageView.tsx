import React, { useState } from 'react';
import { motion } from 'motion/react';
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
} from 'lucide-react';

interface LandingPageViewProps {
  onOpenLogin: () => void;
}

const SMOOTH_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenLogin,
}) => {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<0 | 1 | 2>(1);
  const [boardFilter, setBoardFilter] = useState<'all' | 'validation' | 'governance'>('all');

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden">
      {/* Ambient Cinematic Backdrop & Diagonal Light Beams */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      >
        {/* Top-center indigo-blue radial bloom */}
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 w-[1100px] h-[620px] rounded-full opacity-45 blur-[130px]"
          style={{
            background:
              'radial-gradient(circle, rgba(59,130,246,0.38) 0%, rgba(79,70,229,0.22) 45%, rgba(5,8,20,0) 75%)',
          }}
        />
        {/* Left & Right subtle spotlight cones */}
        <div
          className="absolute top-32 -left-32 w-[560px] h-[520px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(37,99,235,0.34) 0%, rgba(14,165,233,0.12) 55%, transparent 75%)',
          }}
        />
        <div
          className="absolute top-40 -right-32 w-[560px] h-[520px] rounded-full opacity-30 blur-[120px]"
          style={{
            background:
              'radial-gradient(circle, rgba(99,102,241,0.34) 0%, rgba(59,130,246,0.14) 55%, transparent 75%)',
          }}
        />
        {/* Subtle diagonal studio light rays */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(125deg, transparent 20%, rgba(148, 197, 255, 0.07) 36%, transparent 50%, rgba(99, 102, 241, 0.06) 66%, transparent 80%)',
          }}
        />
      </div>

      {/* Top Navigation Bar (Strict 3-Zone Contract: Brand | Nav Links | Actions) */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#050814]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
          >
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_02.43.46_5a1b79e2.jpeg"
              alt="VERIDEX Logo"
              referrerPolicy="no-referrer"
              className="h-8 w-auto rounded-lg object-contain bg-white px-1.5 py-0.5 border border-white/20 shadow-sm"
            />
            <span className="font-display font-bold text-lg tracking-tight text-white">
              VERIDEX
            </span>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-300"
          >
            <button
              type="button"
              onClick={() => scrollToSection('platform')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              About
            </button>
          </nav>

          {/* Zone 3: Sign In & Get Started Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-full bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-[0_0_24px_rgba(59,130,246,0.45)] border border-blue-400/30"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="relative z-10">
        {/* =========================================================
            HERO SECTION + LAYERED FLOATING SOFTWARE MOCKUP
           ========================================================= */}
        <section className="pt-16 sm:pt-20 pb-20 px-6 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: SMOOTH_EASE }}
            className="text-center max-w-3xl mx-auto space-y-5"
          >
            <p className="text-xs font-medium tracking-wide text-blue-400">
              AI-Assisted Institutional Validation &amp; Regulatory Compliance Portal
            </p>

            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[56px] leading-[1.08] tracking-tight text-white">
              Document Verification,{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-300 bg-clip-text text-transparent">
                Reimagined.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300/90 max-w-xl mx-auto leading-relaxed">
              Validate applications, organize institutional records, and surface compliance issues through one clear review workflow.
            </p>

            {/* Primary & Secondary Hero CTAs */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={() => scrollToSection('platform')}
                className="px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md whitespace-nowrap"
              >
                Explore the Platform
              </button>
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-[0_0_28px_rgba(59,130,246,0.5)] border border-blue-400/30 flex items-center gap-2 whitespace-nowrap"
              >
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* 3-Card Layered Floating Software Showcase (Non-Confidential Architecture Preview) */}
          <div className="relative mt-14 sm:mt-16 max-w-6xl mx-auto pt-4 pb-6">
            {/* Ambient Cobalt/Violet Glow Behind Mockup */}
            <div
              aria-hidden="true"
              className="absolute inset-x-12 -top-6 bottom-4 rounded-[36px] opacity-65 blur-3xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 45%, rgba(59, 130, 246, 0.35) 0%, rgba(79, 70, 229, 0.28) 45%, transparent 75%)',
              }}
            />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
              {/* LEFT FLOATING WING CARD: Validation Architecture Coverage */}
              <motion.div
                initial={{ opacity: 0, x: -24, rotate: -4 }}
                animate={{ opacity: 1, x: 0, rotate: -4 }}
                transition={{ duration: 0.55, delay: 0.1, ease: SMOOTH_EASE }}
                className="hidden lg:block lg:col-span-3 -mr-8 mb-6 z-10 rounded-2xl bg-[#0b1024]/90 backdrop-blur-2xl border border-white/15 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-4">
                  <span className="flex items-center gap-1.5 font-display font-semibold text-white">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Validation Engine</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular text-blue-300">
                    6 Pillars
                  </span>
                </div>

                {/* SVG Ring Chart */}
                <div className="relative w-32 h-32 mx-auto my-3 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="url(#veridexRingGrad)"
                      strokeWidth="10"
                      strokeDasharray="240 240"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="veridexRingGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="100%" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-lg font-display font-bold font-mono-tabular text-white">
                      100%
                    </span>
                    <span className="text-[10px] text-slate-400">Role-Protected</span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Checklist Completeness</span>
                    <span className="font-mono-tabular font-semibold text-blue-400">Automated</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Expiry Window Watch</span>
                    <span className="font-mono-tabular font-semibold text-indigo-300">45-Day Alert</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Institutional Dossiers</span>
                    <span className="font-mono-tabular font-semibold text-emerald-300">Sign-In Only</span>
                  </div>
                </div>
              </motion.div>

              {/* CENTER MAIN PRODUCT BOARD MOCKUP (Non-Confidential Workflow Preview) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05, ease: SMOOTH_EASE }}
                className="lg:col-span-6 z-20 rounded-2xl bg-[#090e20]/95 backdrop-blur-2xl border border-blue-400/25 shadow-[0_30px_90px_rgba(2,6,23,0.9)] overflow-hidden"
              >
                {/* Board Window Top Toolbar */}
                <div className="px-4 py-3 border-b border-white/10 bg-[#0d142c]/90 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-display font-bold text-white">
                      Application Validation Board
                    </span>
                  </div>

                  {/* Interactive Filter inside Hero Preview */}
                  <div className="flex items-center gap-1 bg-white/[0.05] p-0.5 rounded-lg border border-white/10 text-[11px]">
                    {(['all', 'validation', 'governance'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setBoardFilter(mode)}
                        className={`px-2 py-0.5 rounded-md capitalize transition-colors cursor-pointer ${
                          boardFilter === mode
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3-Column Non-Confidential Workflow Board Inside Center Frame */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {/* Column 1: Dossier Intake */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1.5 border-b border-white/[0.07]">
                      <span>Dossier Intake</span>
                      <span className="font-mono-tabular text-blue-400">Stage 01</span>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'validation') && (
                      <div className="rounded-xl bg-[#111936] border border-white/10 p-3 space-y-2 hover:border-blue-400/40 transition-colors">
                        <div className="text-xs font-semibold text-white leading-snug">
                          Statutory Checklist Assembly
                        </div>
                        <div className="text-[11px] text-blue-300 font-medium">
                          Category-Specific Requirements
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed">
                          Maps approvals, faculty records, and safety annexures into structured folders.
                        </div>
                        <div className="pt-1 border-t border-white/10 text-[10px] text-cyan-300 font-mono-tabular">
                          OCR Key-Value Field Parsing
                        </div>
                      </div>
                    )}

                    {(boardFilter === 'all' || boardFilter === 'governance') && (
                      <div className="rounded-xl bg-[#111936] border border-white/10 p-3 space-y-2 hover:border-blue-400/40 transition-colors">
                        <div className="text-xs font-semibold text-white leading-snug">
                          Version-Controlled Repository
                        </div>
                        <div className="text-[11px] text-indigo-300 font-medium">
                          Sequential Document Coding
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed">
                          Preserves full revision history when renewed certificates are uploaded.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Automated Checks */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1.5 border-b border-white/[0.07]">
                      <span>Compliance Checks</span>
                      <span className="font-mono-tabular text-indigo-400">Stage 02</span>
                    </div>

                    <div className="rounded-xl bg-[#111936] border border-blue-400/30 p-3 space-y-2">
                      <div className="text-xs font-semibold text-white leading-snug">
                        Cross-Document Consistency
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-300 font-mono-tabular">
                          <span>Rule Alignment</span>
                          <span>6 Pillars</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-relaxed">
                        Compares application declarations against uploaded supporting evidence.
                      </div>
                      <div className="pt-1 border-t border-white/10 text-[10px] text-emerald-300">
                        Norm &amp; Threshold Evaluation
                      </div>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'validation') && (
                      <div className="rounded-xl bg-[#111936] border border-white/10 p-3 space-y-1.5">
                        <div className="text-xs font-semibold text-white leading-snug">
                          Expiry &amp; Validity Watch
                        </div>
                        <div className="text-[11px] text-amber-300">
                          45-Day Renewal Advisory
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed">
                          Flags lapsed or soon-to-expire clearances before committee review.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Authorized Review & Privacy */}
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1.5 border-b border-white/[0.07]">
                      <span>Officer Sign-Off</span>
                      <span className="font-mono-tabular text-emerald-400">Stage 03</span>
                    </div>

                    {(boardFilter === 'all' || boardFilter === 'governance') && (
                      <div className="rounded-xl bg-[#111936] border border-white/10 p-3 space-y-2">
                        <div className="text-xs font-semibold text-white leading-snug">
                          Human-in-the-Loop Decision
                        </div>
                        <div className="text-[11px] text-emerald-400 font-medium">
                          Authorized Reviewer Sign-Off
                        </div>
                        <div className="text-[10px] text-slate-400 leading-relaxed">
                          Officers inspect flagged signals, request clarifications, and record determinations.
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl bg-[#111936] border border-blue-400/25 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white leading-snug">
                        <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Confidential Records Protected</span>
                      </div>
                      <div className="text-[10px] text-slate-300 leading-relaxed">
                        Institutional dossiers and applicant records are hidden until authenticated sign-in.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* RIGHT FLOATING WING CARD: Verification Signal & Access Control */}
              <motion.div
                initial={{ opacity: 0, x: 24, rotate: 4 }}
                animate={{ opacity: 1, x: 0, rotate: 4 }}
                transition={{ duration: 0.55, delay: 0.14, ease: SMOOTH_EASE }}
                className="hidden lg:block lg:col-span-3 -ml-8 mb-6 z-10 rounded-2xl bg-[#0b1024]/90 backdrop-blur-2xl border border-white/15 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.75)] space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-white">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Verification Signal</span>
                  </span>
                  <span className="text-[10px] font-mono-tabular text-indigo-300">
                    OCR Extraction
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/20 border border-blue-400/30 space-y-2">
                  <div className="text-xs font-semibold text-white">
                    Cross-Document Field Check
                  </div>
                  <p className="text-[11px] text-slate-200 leading-relaxed">
                    Extracted intake &amp; certificate validity compared against institutional checklist rules.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="w-full py-1.5 px-3 rounded-lg bg-blue-500/30 hover:bg-blue-500/40 border border-blue-300/30 text-[11px] font-semibold text-white transition-colors cursor-pointer"
                  >
                    Sign In to Access Portal
                  </button>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Expiry Window</span>
                    <span className="font-mono-tabular text-amber-300">45-Day Alert Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Data Visibility</span>
                    <span className="font-mono-tabular text-blue-300">Authenticated Only</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Final Authority</span>
                    <span className="font-mono-tabular text-emerald-300">Human Reviewer</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* =========================================================
            01. PROBLEM & SOLUTION SECTION (#platform)
           ========================================================= */}
        <section
          id="platform"
          className="py-20 px-6 max-w-7xl mx-auto border-t border-white/[0.07]"
        >
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium text-blue-400 mb-1.5">
              01. Why VERIDEX
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Replace fragmented document folders and repetitive manual cross-checks.
            </h2>
            <p className="text-sm text-slate-300/85 mt-2 leading-relaxed">
              Institutional approval cycles require reviewing dozens of statutory certificates, faculty rosters, and safety clearances. VERIDEX brings structured organization and transparent review signals to every dossier.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Problem Card */}
            <div className="rounded-2xl bg-[#0a0f22]/85 border border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono-tabular text-amber-300">
                  Legacy Manual Process
                </div>
                <h3 className="text-xl font-display font-bold text-white">
                  Disconnected PDFs &amp; Repetitive Verification Bottlenecks
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed">
                  Reviewers spend hours opening unindexed attachments, manually comparing dates and intake numbers across separate forms, and tracking certificate expirations in static spreadsheets.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/10 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Unstructured uploads make missing pages or unsigned annexures easy to overlook until late-stage committee review.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Lapsed municipal safety or affiliation certificates go unnoticed without automated validity window tracking.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Clarification requests and resubmitted document versions become scattered across email threads.</span>
                </div>
              </div>
            </div>

            {/* Solution Card */}
            <div className="rounded-2xl bg-gradient-to-b from-[#0e1736]/90 to-[#090f24]/90 border border-blue-400/30 p-6 sm:p-8 flex flex-col justify-between space-y-6 shadow-[0_16px_50px_rgba(30,64,175,0.2)]">
              <div className="space-y-3">
                <div className="text-xs font-mono-tabular text-blue-400">
                  Centralized VERIDEX Workflow
                </div>
                <h3 className="text-xl font-display font-bold text-white">
                  One Structured Dossier from Submission to Human Sign-Off
                </h3>
                <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed">
                  VERIDEX generates category-specific checklists, organizes versioned institutional repositories, and surfaces evidence-linked review signals so authorized officers can focus on informed human judgment.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-blue-400/20 text-xs text-slate-200">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Tailored checklists map every required approval, faculty record, and financial annexure to a unique internal document code.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>OCR field extraction and expiry calendars highlight potential discrepancies before final review.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Role-isolated workspaces keep institutional nodal officers and compliance reviewers aligned with full activity history.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            02. FEATURE SHOWCASE (#features) — 6 Asymmetric Bento Glass Cards
           ========================================================= */}
        <section
          id="features"
          className="py-20 px-6 max-w-7xl mx-auto border-t border-white/[0.07]"
        >
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium text-blue-400 mb-1.5">
              02. Core Capabilities
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Six coordinated capabilities built for institutional compliance.
            </h2>
            <p className="text-sm text-slate-300/85 mt-2 leading-relaxed">
              Every module is designed to support transparent application review without replacing human administrative authority.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Feature 1: Application Validation (7 cols) */}
            <div className="md:col-span-7 rounded-2xl bg-[#0a1024]/90 border border-white/10 hover:border-blue-400/35 transition-all p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular text-blue-400">
                    01 · Application Validation
                  </span>
                  <FileCheck2 className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">
                  Category-Specific Statutory Checklists
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  Automatically configures required document checklists for Extension of Approval (EoA), New Course Proposals, Intake Increases, Infrastructure Audits, and Faculty Cadre Compliance.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-slate-300">
                <span>Checklist Readiness Tracking</span>
                <span className="text-blue-400">Draft → Submitted → Under Review → Decision</span>
              </div>
            </div>

            {/* Feature 2: Document Organization (5 cols) */}
            <div className="md:col-span-5 rounded-2xl bg-[#0a1024]/90 border border-white/10 hover:border-blue-400/35 transition-all p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular text-blue-400">
                    02 · Document Organization
                  </span>
                  <FolderKanban className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">
                  Structured Repository &amp; Versioning
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  Assigns deterministic internal codes, structures institutional repository paths, and preserves version history when renewed certificates are uploaded.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] font-mono-tabular text-slate-400">
                /Repository/Category/DOC-CODE-01 (v1 → v2)
              </div>
            </div>

            {/* Feature 3: OCR-Assisted Extraction (5 cols) */}
            <div className="md:col-span-5 rounded-2xl bg-[#0a1024]/90 border border-white/10 hover:border-blue-400/35 transition-all p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular text-indigo-400">
                    03 · OCR-Assisted Extraction
                  </span>
                  <ScanText className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">
                  Structured Key-Value Field Parsing
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  Surfaces certificate numbers, issuing authorities, approved intake figures, and validity dates alongside the original document record for rapid side-by-side inspection.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] font-mono-tabular text-indigo-300">
                Side-by-side metadata &amp; document inspection
              </div>
            </div>

            {/* Feature 4: Expiry Monitoring (7 cols) */}
            <div className="md:col-span-7 rounded-2xl bg-[#0a1024]/90 border border-white/10 hover:border-blue-400/35 transition-all p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular text-amber-400">
                    04 · Expiry Monitoring
                  </span>
                  <CalendarClock className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-lg font-display font-bold text-white">
                  Proactive Validity &amp; Renewal Calendar
                </h3>
                <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                  Automatically computes days remaining for fire safety NOCs, pollution control authorizations, and university affiliations—highlighting certificates that are expired or expiring within 45 days.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                <span className="text-emerald-400">Valid (&gt;45d)</span>
                <span className="text-amber-300">Expiring Soon (≤45d)</span>
                <span className="text-red-400">Expired (Action Required)</span>
              </div>
            </div>

            {/* Feature 5: Consistency Checks (6 cols) */}
            <div className="md:col-span-6 rounded-2xl bg-[#0a1024]/90 border border-white/10 hover:border-blue-400/35 transition-all p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular text-blue-400">
                  05 · Consistency Checks
                </span>
                <GitCompare className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-lg font-display font-bold text-white">
                Cross-Document Field &amp; Name Comparison
              </h3>
              <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                Flags discrepancies between application form declarations and supporting certificates—such as spelling variations on degree scrolls or mismatched intake totals across affiliation orders.
              </p>
            </div>

            {/* Feature 6: Compliance Rules (6 cols) */}
            <div className="md:col-span-6 rounded-2xl bg-[#0a1024]/90 border border-white/10 hover:border-blue-400/35 transition-all p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-tabular text-blue-400">
                  06 · Compliance Rules
                </span>
                <Scale className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-lg font-display font-bold text-white">
                Configurable Regulatory Rule Engine
              </h3>
              <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
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
          className="py-20 px-6 max-w-7xl mx-auto border-t border-white/[0.07]"
        >
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-medium text-blue-400 mb-1.5">
              03. Three-Step Workflow
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Submit → Validate → Review
            </h2>
            <p className="text-sm text-slate-300/85 mt-2 leading-relaxed">
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
                description:
                  'The institution selects an approval category, uploads required certificates to its isolated repository, confirms document categories, and submits the completed checklist.',
                deliverable: 'Structured Dossier + Versioned Document Codes',
              },
              {
                index: 1 as const,
                step: 'Step 02 · Validate',
                title: 'Automated Checks Surface Evidence-Linked Signals',
                actor: 'VERIDEX Validation Pipeline',
                description:
                  'VERIDEX runs completeness, expiry window, cross-document consistency, and regulatory rule checks—attaching specific page and field evidence to each finding.',
                deliverable: '6-Pillar Verification Findings & Expiry Alerts',
              },
              {
                index: 2 as const,
                step: 'Step 03 · Review',
                title: 'Authorized Officer Reviews, Queries & Decides',
                actor: 'Regional Compliance Reviewer (Admin)',
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
                  className={`text-left rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-5 border ${
                    isActive
                      ? 'bg-gradient-to-b from-blue-950/70 to-[#0a1024] border-blue-400/45 shadow-[0_12px_40px_rgba(37,99,235,0.22)]'
                      : 'bg-[#0a1024]/75 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono-tabular">
                      <span className={isActive ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
                        {item.step}
                      </span>
                      <span className="text-[11px] text-slate-400">{item.actor}</span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono-tabular text-blue-300">
                    <span>Output: {item.deliverable}</span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
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
          className="py-20 px-6 max-w-7xl mx-auto border-t border-white/[0.07]"
        >
          <div className="rounded-2xl bg-[#0a1024]/90 border border-white/10 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-medium text-blue-400">
                04. Responsible Verification &amp; Governance
              </p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                AI flags assist human reviewers—they never replace due process.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
                Regulatory compliance decisions carry high institutional and academic stakes. VERIDEX is architected around strict data confidentiality and transparent human-in-the-loop governance.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Review Signals, Not Proof of Fraud</span>
                </div>
                <p className="text-xs text-slate-300/85 leading-relaxed">
                  Potential inconsistencies, OCR mismatches, or structural document flags are surfaced strictly as prompts for human inspection. A low-resolution scan or spelling variation is never treated as automatic proof of forgery.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>External Issuer Registry Scope</span>
                </div>
                <p className="text-xs text-slate-300/85 leading-relaxed">
                  Direct cryptographic verification with external issuing authorities (such as NAD, ICAI UDIN, or municipal fire registries) remains marked unavailable unless an authorized government registry integration is enabled.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 sm:col-span-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Confidentiality &amp; Mandatory Officer Determination</span>
                </div>
                <p className="text-xs text-slate-300/85 leading-relaxed">
                  Institutional dossiers, applicant records, and certificate attachments are strictly protected behind role-based authentication. Only authorized compliance reviewers can issue formal clarification requests or record compliance determinations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            FINAL HIGH-CONTRAST CTA SECTION
           ========================================================= */}
        <section className="py-20 px-6 max-w-5xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-b from-blue-950/80 via-[#0b132b] to-[#070b19] border border-blue-400/35 p-8 sm:p-12 text-center space-y-6 shadow-[0_24px_80px_rgba(37,99,235,0.28)]">
            <p className="text-xs font-mono-tabular text-blue-300">
              Ready to Access the VERIDEX Workspace?
            </p>
            <h2 className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight max-w-2xl mx-auto">
              Experience structured application validation and compliance review.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Sign in with your authorized credentials to access institutional dossiers, inspect 6-pillar verification signals, manage document repositories, and track certificate expiry windows.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-[0_0_28px_rgba(59,130,246,0.5)] border border-blue-400/30 flex items-center gap-2"
              >
                <span>Get Started — Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================
          FOOTER
         ========================================================= */}
      <footer className="border-t border-white/10 bg-[#03060f] py-12 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2 max-w-md">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_02.43.46_5a1b79e2.jpeg"
                alt="VERIDEX Logo"
                referrerPolicy="no-referrer"
                className="h-7 w-auto rounded-md object-contain bg-white px-1 py-0.5 border border-white/20"
              />
              <span className="font-display font-bold text-base text-white">
                VERIDEX
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Application validation, document organization, and regulatory compliance verification portal for educational institutions and authorized reviewers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => scrollToSection('platform')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Platform
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('workflow')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Responsible Verification
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            <strong>Governance &amp; Privacy Notice:</strong> Institutional dossiers and applicant records are restricted to authenticated role-authorized accounts. Automated checks serve as review signals for authorized compliance officers.
          </p>
          <span className="font-mono-tabular shrink-0">VERIDEX Compliance Portal</span>
        </div>
      </footer>
    </div>
  );
};
