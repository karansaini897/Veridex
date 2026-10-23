import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ChevronRight,
  Search,
  Sparkles,
  Reply,
  Forward,
  Archive,
  Trash2,
  MoreHorizontal,
  Paperclip,
  Menu,
  X,
  Check,
  Star,
  ShieldCheck,
  LogIn,
} from 'lucide-react';

const BACKGROUND_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4';

/* ============================================================================
 * 5. SHARED COMPONENTS
 * ========================================================================== */

export interface IconProps {
  className?: string;
}

export const AppleLogo: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 384 512"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

export const LogoMark: React.FC<IconProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 256 256"
    fill="white"
    aria-label="Brand mark"
    className={className}
  >
    <path d="M128 24C128 81.4 81.4 128 24 128C81.4 128 128 174.6 128 232C128 174.6 174.6 128 232 128C174.6 128 128 81.4 128 24Z" />
  </svg>
);

export interface AppleButtonProps {
  label?: string;
  full?: boolean;
  href?: string;
  onClick?: () => void;
}

export const AppleButton: React.FC<AppleButtonProps> = ({
  label = 'Download Aura',
  full = false,
  href,
  onClick,
}) => {
  const baseClasses = `group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-3 transition-all hover:bg-white/90 active:scale-[0.98] cursor-pointer ${
    full ? 'w-full' : ''
  }`;

  const content = (
    <>
      <AppleLogo className="w-4 h-4 shrink-0" />
      <span>{label}</span>
      <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-[1px]" />
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={baseClasses}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClasses}>
      {content}
    </button>
  );
};

export interface SectionEyebrowProps {
  label: string;
  tag?: string;
}

export const SectionEyebrow: React.FC<SectionEyebrowProps> = ({ label, tag }) => (
  <div className="inline-flex items-center gap-2.5 text-xs font-medium text-white/80">
    <span className="w-2 h-2 rounded-full bg-white inline-block" aria-hidden="true" />
    <span>{label}</span>
    {tag && (
      <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50">
        {tag}
      </span>
    )}
  </div>
);

/* ============================================================================
 * SAMPLE INBOX MESSAGES DATA (SECTION 4)
 * ========================================================================== */

interface SampleEmail {
  id: string;
  sender: string;
  avatarInitial: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  starred?: boolean;
  folder: 'Inbox' | 'Starred' | 'Sent' | 'Drafts' | 'Archive' | 'Trash';
  label: 'Work' | 'Personal' | 'Travel' | 'Finance';
  summary: string;
  paragraphs: string[];
  signature: string;
  attachment?: string;
}

const INITIAL_MESSAGES: SampleEmail[] = [
  {
    id: 'msg-1',
    sender: 'Linear',
    avatarInitial: 'L',
    subject: 'Weekly product digest',
    preview: 'Your team shipped 23 issues this week...',
    time: '9:41 AM',
    unread: true,
    starred: true,
    folder: 'Inbox',
    label: 'Work',
    summary:
      'Your team closed 23 issues, merged 14 PRs, and shipped 2 features. Top contributor: Marcus. No action needed.',
    paragraphs: [
      'Hi team,',
      'Here is your weekly digest of everything happening across your projects. This was a strong week with significant progress on the Q3 roadmap.',
      'Twenty-three issues were closed, fourteen pull requests were merged, and two customer-facing features went out. The velocity trend continues to climb.',
      'Let me know if you would like a deeper breakdown by project or contributor.',
    ],
    signature: '— The Linear team',
    attachment: 'digest-may-6.pdf',
  },
  {
    id: 'msg-2',
    sender: 'Sophia Chen',
    avatarInitial: 'S',
    subject: 'Re: Q3 roadmap review',
    preview: 'Thanks for sending the deck over. I had a few thoughts...',
    time: '8:12 AM',
    unread: true,
    starred: true,
    folder: 'Inbox',
    label: 'Work',
    summary:
      'Sophia reviewed the Q3 roadmap deck and suggested prioritizing the real-time triage pipeline ahead of the mobile release.',
    paragraphs: [
      'Hi team,',
      'Thanks for sending the deck over. I had a few thoughts on how we sequence the Q3 milestones across core engineering and design.',
      'Let us lock the final priorities during Thursday product review.',
    ],
    signature: '— Sophia Chen',
  },
  {
    id: 'msg-3',
    sender: 'Figma',
    avatarInitial: 'F',
    subject: 'Marcus commented on your file',
    preview: 'Love the new direction on the landing hero.',
    time: 'Yesterday',
    unread: false,
    starred: true,
    folder: 'Inbox',
    label: 'Work',
    summary:
      'Marcus left design feedback approving the updated liquid-glass border treatment and hero typography.',
    paragraphs: [
      'Marcus commented on Aura — Desktop & Landing v4:',
      '"Love the new direction on the landing hero. The cyan-to-deep-blue specular gradient feels crisp on #0c0c0c."',
    ],
    signature: '— Figma Notifications',
  },
  {
    id: 'msg-4',
    sender: 'Stripe',
    avatarInitial: 'S',
    subject: 'Payout of $12,480.00 sent',
    preview: 'Your payout is on its way to your bank...',
    time: 'Yesterday',
    unread: false,
    folder: 'Inbox',
    label: 'Finance',
    summary:
      'Automated settlement of $12,480.00 initiated to your primary operating account. Expected arrival within 1 business day.',
    paragraphs: [
      'Hello,',
      'Your payout of $12,480.00 is on its way to your bank account ending in •••• 4821.',
      'No action is required on your part.',
    ],
    signature: '— Stripe Treasury',
  },
  {
    id: 'msg-5',
    sender: 'Vercel',
    avatarInitial: 'V',
    subject: 'Deployment ready for aura-web',
    preview: 'Preview is live at aura-web-g3f.vercel.app',
    time: 'Mon',
    unread: false,
    folder: 'Inbox',
    label: 'Work',
    summary:
      'Production preview build succeeded in 38s with zero bundle warnings. Ready for promotion.',
    paragraphs: [
      'Deployment completed for aura-web (branch: main).',
      'Preview is live at aura-web-g3f.vercel.app with all edge checks passing.',
    ],
    signature: '— Vercel Bot',
  },
  {
    id: 'msg-6',
    sender: 'GitHub',
    avatarInitial: 'G',
    subject: '[aura/core] PR #482 approved',
    preview: 'david-lim approved your pull request.',
    time: 'Mon',
    unread: false,
    folder: 'Inbox',
    label: 'Work',
    summary:
      'david-lim approved PR #482 (Semantic thread clustering & keyboard navigation). Ready to merge.',
    paragraphs: [
      '@david-lim approved this pull request on aura/core.',
      'All 14 CI checks have passed. You can merge this branch whenever ready.',
    ],
    signature: '— GitHub',
  },
];

const NAV_LINKS = [
  { label: 'Solutions', href: '#triage' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '#testimonials' },
  { label: 'Documentation', href: '#inbox-demo' },
  { label: 'Careers', href: '#final-cta' },
];

const LOGO_CLOUD_NAMES = [
  'Linear',
  'Vercel',
  'Figma',
  'Stripe',
  'Ramp',
  'Notion',
  'Loom',
  'Arc',
];

const TESTIMONIALS = [
  {
    quote:
      'Aura gave our leadership team four hours of their week back. It reads like email from the future.',
    name: 'Parker Wilf',
    role: 'Group Product Manager',
    company: 'MERCURY',
  },
  {
    quote:
      "The command palette alone has changed how I process messages. I can't imagine going back to a traditional client.",
    name: 'Andrew von Rosenbach',
    role: 'Senior Engineering Program Manager',
    company: 'COHERE',
  },
  {
    quote:
      'Triage that actually understands context. Our team stopped dreading Monday morning inboxes.',
    name: 'Mathies Christensen',
    role: 'Engineering Manager',
    company: 'LUNAR',
  },
];

export interface AuraLandingPageProps {
  onOpenPortalLogin: () => void;
  authenticatedUserName?: string | null;
  onReturnToDashboard?: () => void;
}

export const AuraLandingPage: React.FC<AuraLandingPageProps> = ({
  onOpenPortalLogin,
  authenticatedUserName,
  onReturnToDashboard,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Inbox State (Section 4)
  const [messages, setMessages] = useState<SampleEmail[]>(INITIAL_MESSAGES);
  const [activeFolder, setActiveFolder] = useState<
    'Inbox' | 'Starred' | 'Sent' | 'Drafts' | 'Archive' | 'Trash'
  >('Inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string>('msg-1');
  const [mailSearch, setMailSearch] = useState('');

  // Pricing Billing State (Section 8)
  const [yearly, setYearly] = useState<boolean>(false);

  // Action Dialog / Notification State for Download / Plan / Sales / Compose actions
  const [actionModal, setActionModal] = useState<{
    title: string;
    description: string;
    primaryLabel?: string;
    onPrimary?: () => void;
  } | null>(null);

  // Pause background video when document is hidden or reduced motion is preferred
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (prefersReducedMotion) {
      videoEl.pause();
      return;
    }

    const handleVisibilityChange = () => {
      if (!videoRef.current) return;
      if (document.hidden) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {
          // Autoplay fallback handled gracefully
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [prefersReducedMotion]);

  const filteredMessages = useMemo(() => {
    const q = mailSearch.trim().toLowerCase();
    return messages.filter((m) => {
      if (activeFolder === 'Starred' && !m.starred) return false;
      if (activeFolder !== 'Inbox' && activeFolder !== 'Starred' && m.folder !== activeFolder) {
        return false;
      }
      if (!q) return true;
      return (
        m.sender.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q)
      );
    });
  }, [messages, activeFolder, mailSearch]);

  const selectedMessage = useMemo(() => {
    return (
      messages.find((m) => m.id === selectedMessageId) ||
      filteredMessages[0] ||
      INITIAL_MESSAGES[0]
    );
  }, [messages, selectedMessageId, filteredMessages]);

  const handleDownloadAction = () => {
    setActionModal({
      title: 'Aura Desktop Preview & VERIDEX Workspace Access',
      description:
        'Aura desktop builds for Intel & Apple Silicon are showcased in this interactive preview. You can explore the live inbox mockup on this page or proceed directly to the VERIDEX compliance workspace.',
      primaryLabel: authenticatedUserName
        ? `Continue as ${authenticatedUserName}`
        : 'Open VERIDEX Sign-In Portal',
      onPrimary: () => {
        setActionModal(null);
        if (authenticatedUserName && onReturnToDashboard) {
          onReturnToDashboard();
        } else {
          onOpenPortalLogin();
        }
      },
    });
  };

  const handleChoosePlan = (tier: string, price: string) => {
    setActionModal({
      title: `${tier} Plan Selected (${price})`,
      description: `You selected the ${tier} tier (${
        yearly ? 'Yearly billing' : 'Monthly billing'
      }). No payment is charged in this preview environment. Sign in to your VERIDEX account to manage institutional workspace settings.`,
      primaryLabel: authenticatedUserName
        ? 'Return to Workspace'
        : 'Sign In to VERIDEX',
      onPrimary: () => {
        setActionModal(null);
        if (authenticatedUserName && onReturnToDashboard) {
          onReturnToDashboard();
        } else {
          onOpenPortalLogin();
        }
      },
    });
  };

  const handleTalkToSales = () => {
    setActionModal({
      title: 'Talk to Enterprise & Institutional Sales',
      description:
        'Connect with our onboarding team for custom deployment, SSO configuration, or institutional compliance workflows.',
      primaryLabel: authenticatedUserName
        ? 'Open Workspace'
        : 'Proceed to Portal Sign-In',
      onPrimary: () => {
        setActionModal(null);
        if (authenticatedUserName && onReturnToDashboard) {
          onReturnToDashboard();
        } else {
          onOpenPortalLogin();
        }
      },
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white font-sans selection:bg-brand/30">
      {/* ====================================================================
       * UNIQUE SVG NOISE FILTERS (Root Headline Filter & Pricing Filter)
       * ================================================================== */}
      <svg
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-0 w-0 opacity-0"
      >
        <defs>
          {/* 1. Root-level filter for subtle grain on the shiny headline */}
          <filter id="aura-root-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={2}
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.18 0"
              in="noise"
              result="coloredNoise"
            />
            <feComposite
              operator="in"
              in="coloredNoise"
              in2="SourceGraphic"
              result="compositeNoise"
            />
            <feBlend
              mode="multiply"
              in="SourceGraphic"
              in2="compositeNoise"
            />
          </filter>

          {/* 2. Pricing-section filter */}
          <filter id="aura-pricing-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.5"
              numOctaves={2}
              stitchTiles="stitch"
              result="pricingNoise"
            />
            <feComponentTransfer in="pricingNoise" result="adjustedNoise">
              <feFuncA type="linear" slope="0.075" />
            </feComponentTransfer>
            <feComposite
              operator="in"
              in="adjustedNoise"
              in2="SourceGraphic"
              result="clippedPricingNoise"
            />
            <feBlend
              mode="overlay"
              in="SourceGraphic"
              in2="clippedPricingNoise"
            />
          </filter>
        </defs>
      </svg>

      {/* ====================================================================
       * 4. GLOBAL BACKGROUND VIDEO & OVERLAYS
       * ================================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {!videoFailed ? (
          <video
            ref={videoRef}
            src={BACKGROUND_VIDEO_URL}
            autoPlay={!prefersReducedMotion}
            muted
            loop
            playsInline
            onError={() => setVideoFailed(true)}
            className="h-full w-full object-cover opacity-55 pointer-events-none"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,_rgba(11,37,81,0.55)_0%,_rgba(12,12,12,1)_70%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c0c]/70 via-[#0c0c0c]/55 to-[#0c0c0c] pointer-events-none" />
      </div>

      {/* Two desktop-only vertical guide lines at the edges of the 36rem content container */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-[36rem] hidden lg:block z-0"
      >
        <div className="absolute inset-y-0 left-0 w-px bg-white/[0.06]" />
        <div className="absolute inset-y-0 right-0 w-px bg-white/[0.06]" />
      </div>

      {/* Main Content Wrapper */}
      <div className="relative z-10">
        {/* ==================================================================
         * 6. SECTION 1: NAVBAR
         * ================================================================ */}
        <motion.header
          initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="pt-6"
        >
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            {/* Left: LogoMark only (no Aura wordmark next to it) */}
            <a
              href="#top"
              aria-label="Home"
              className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg"
            >
              <LogoMark className="w-8 h-8" />
            </a>

            {/* Center: Desktop-only navigation */}
            <nav
              aria-label="Primary Navigation"
              className="hidden md:flex gap-8"
            >
              {NAV_LINKS.map((link, index) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    ease: 'easeOut',
                    delay: 0.1 + index * 0.05,
                  }}
                  className="text-white/70 text-sm font-medium hover:text-white transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>

            {/* Right: Desktop AppleButton + Portal Access, Mobile 40px circular menu button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (authenticatedUserName && onReturnToDashboard) {
                    onReturnToDashboard();
                  } else {
                    onOpenPortalLogin();
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] px-4 py-2.5 text-xs font-medium text-white/90 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#A4F4FD]" />
                <span>
                  {authenticatedUserName
                    ? `VERIDEX Workspace (${authenticatedUserName.split(' ')[0]})`
                    : 'VERIDEX Sign In'}
                </span>
              </button>

              <div className="hidden md:block">
                <AppleButton label="Download Aura" onClick={handleDownloadAction} />
              </div>

              <button
                type="button"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden w-10 h-10 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Responsive Menu Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden max-w-6xl mx-auto px-6 mt-4">
              <div className="liquid-glass rounded-2xl p-5 space-y-4 border border-white/10">
                <nav aria-label="Mobile Navigation" className="flex flex-col space-y-2.5">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-white/80 hover:text-white text-sm font-medium py-1.5"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
                <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
                  <AppleButton
                    label="Download Aura"
                    full
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleDownloadAction();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (authenticatedUserName && onReturnToDashboard) {
                        onReturnToDashboard();
                      } else {
                        onOpenPortalLogin();
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2.5 px-4 text-xs font-medium text-white hover:bg-white/10 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#A4F4FD]" />
                    <span>
                      {authenticatedUserName
                        ? 'Return to VERIDEX Workspace'
                        : 'Open VERIDEX Official Sign-In'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.header>

        {/* ==================================================================
         * 7. SECTION 2: HERO
         * ================================================================ */}
        <section
          id="top"
          className="pt-16 md:pt-28 pb-20 text-center flex flex-col items-center px-6"
        >
          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.9]"
          >
            <span className="block text-white">Your email.</span>
            <span className="block animate-shiny pb-2">Revitalized</span>
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.5,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-8 text-white/60 max-w-md text-base leading-[1.5]"
          >
            Aura is the premier inbox platform for the current era. It leverages powerful AI to organize, prioritize, and refine your messages into total clarity.
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.7,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-9 flex flex-col items-center gap-3"
          >
            <AppleButton label="Download Aura" onClick={handleDownloadAction} />
            <span className="text-xs text-white/40">
              Download for Intel / Apple Silicon
            </span>
          </motion.div>
        </section>

        {/* ==================================================================
         * 8. SECTION 3: MACOS MENU BAR
         * ================================================================ */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="h-10 bg-black/40 backdrop-blur-md border-t border-b border-white/10"
        >
          <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between text-xs">
            <div className="flex items-center gap-5 text-white/80">
              <AppleLogo className="w-[14px] h-[14px] text-white" />
              <span className="font-bold text-white">Aura</span>
              {['File', 'Edit', 'View', 'Go', 'Window', 'Help'].map((item, idx) => {
                let visibilityClass = 'inline';
                if (idx > 3) {
                  visibilityClass = 'hidden md:inline';
                } else if (idx > 2) {
                  visibilityClass = 'hidden sm:inline';
                }
                return (
                  <span
                    key={item}
                    className={`${visibilityClass} text-white/70 hover:text-white transition-colors cursor-default`}
                  >
                    {item}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center gap-4 text-white/70">
              <Search className="w-[14px] h-[14px]" aria-hidden="true" />
              <span>Wed May 6 1:09 PM</span>
            </div>
          </div>
        </motion.div>

        {/* ==================================================================
         * 9. SECTION 4: REALISTIC INBOX MOCKUP
         * ================================================================ */}
        <section id="inbox-demo" className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-xl shadow-2xl"
          >
            {/* Window Title Bar */}
            <div className="h-10 px-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <span className="text-xs text-white/50">Aura — Inbox</span>
              <span className="text-[11px] text-white/35 hidden sm:inline">
                Interactive Sample Inbox
              </span>
            </div>

            {/* Body Layout: 12-column grid with height 520px on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:h-[520px]">
              {/* Sidebar: 3 columns */}
              <div className="lg:col-span-3 bg-white/[0.015] border-b lg:border-b-0 lg:border-r border-white/10 p-4 flex flex-col justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      setActionModal({
                        title: 'Compose with Aura AI',
                        description:
                          'Drafting assistant is running in sample preview mode. Select any message in the inbox list to inspect AI summaries and thread context.',
                      })
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-black font-medium text-xs py-2.5 px-3 hover:bg-white/90 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compose with Aura</span>
                  </button>

                  <div className="mt-5 space-y-1">
                    {(
                      [
                        { name: 'Inbox', count: 12 },
                        { name: 'Starred', count: 3 },
                        { name: 'Sent' },
                        { name: 'Drafts', count: 2 },
                        { name: 'Archive' },
                        { name: 'Trash' },
                      ] as Array<{
                        name: 'Inbox' | 'Starred' | 'Sent' | 'Drafts' | 'Archive' | 'Trash';
                        count?: number;
                      }>
                    ).map((folder) => {
                      const isActive = activeFolder === folder.name;
                      return (
                        <button
                          key={folder.name}
                          type="button"
                          onClick={() => setActiveFolder(folder.name)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          <span>{folder.name}</span>
                          {folder.count !== undefined && (
                            <span
                              className={`text-[11px] ${
                                isActive ? 'text-white/90' : 'text-white/40'
                              }`}
                            >
                              {folder.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Labels */}
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/40 px-2 mb-2.5">
                    Labels
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { name: 'Work', color: '#00d2ff' },
                      { name: 'Personal', color: '#A4F4FD' },
                      { name: 'Travel', color: '#f59e0b' },
                      { name: 'Finance', color: '#10b981' },
                    ].map((lbl) => (
                      <div
                        key={lbl.name}
                        className="flex items-center gap-2.5 px-2 py-1 text-white/70"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: lbl.color }}
                        />
                        <span>{lbl.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Message List: 4 columns */}
              <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col max-h-[380px] lg:max-h-[520px] overflow-hidden">
                {/* Search Header */}
                <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-white/[0.01]">
                  <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <input
                    type="text"
                    value={mailSearch}
                    onChange={(e) => setMailSearch(e.target.value)}
                    placeholder="Search mail"
                    aria-label="Search mail"
                    className="w-full bg-transparent text-xs text-white placeholder:text-white/40 focus:outline-none"
                  />
                </div>

                {/* Message Items */}
                <div className="divide-y divide-white/[0.06] overflow-y-auto flex-1">
                  {filteredMessages.length === 0 ? (
                    <div className="p-6 text-center text-xs text-white/40">
                      No sample messages in {activeFolder} matching your filter.
                    </div>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isSelected = selectedMessage.id === msg.id;
                      return (
                        <button
                          key={msg.id}
                          type="button"
                          onClick={() => {
                            setSelectedMessageId(msg.id);
                            setMessages((prev) =>
                              prev.map((item) =>
                                item.id === msg.id ? { ...item, unread: false } : item
                              )
                            );
                          }}
                          className={`w-full text-left p-3.5 transition-colors block cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.08]'
                              : 'hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {msg.unread && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] shrink-0"
                                  aria-label="Unread"
                                />
                              )}
                              <span
                                className={`text-xs truncate ${
                                  msg.unread
                                    ? 'font-semibold text-white'
                                    : 'font-medium text-white/80'
                                }`}
                              >
                                {msg.sender}
                              </span>
                            </div>
                            <span className="text-[11px] text-white/40 shrink-0">
                              {msg.time}
                            </span>
                          </div>
                          <div
                            className={`text-xs mt-1 truncate ${
                              msg.unread ? 'font-medium text-white/95' : 'text-white/75'
                            }`}
                          >
                            {msg.subject}
                          </div>
                          <div className="text-[11px] text-white/45 mt-0.5 truncate">
                            {msg.preview}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Reader: 5 columns */}
              <div className="lg:col-span-5 flex flex-col max-h-[520px] overflow-y-auto">
                {/* Toolbar */}
                <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Reply"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Forward"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Forward className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Archive"
                      onClick={() =>
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === selectedMessage.id ? { ...m, folder: 'Archive' } : m
                          )
                        )
                      }
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() =>
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === selectedMessage.id ? { ...m, folder: 'Trash' } : m
                          )
                        )
                      }
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Star message"
                      onClick={() =>
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === selectedMessage.id
                              ? { ...m, starred: !m.starred }
                              : m
                          )
                        )
                      }
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          selectedMessage.starred ? 'fill-[#febc2e] text-[#febc2e]' : ''
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      aria-label="More options"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Selected Message Content */}
                <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold text-white">
                        {selectedMessage.subject}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#00d2ff]/15 text-[#A4F4FD] border border-[#00d2ff]/30 shrink-0">
                        {selectedMessage.label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-xs font-semibold text-white shrink-0">
                        {selectedMessage.avatarInitial}
                      </div>
                      <div className="text-xs">
                        <div className="font-medium text-white">
                          {selectedMessage.sender}
                        </div>
                        <div className="text-white/45">
                          to me · {selectedMessage.time}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="liquid-glass rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Sparkles className="w-3.5 h-3.5 text-[#A4F4FD]" />
                      <span>Summary by Aura</span>
                    </div>
                    <p className="text-xs text-white/75 leading-relaxed">
                      {selectedMessage.summary}
                    </p>
                  </div>

                  {/* Email Body */}
                  <div className="space-y-3 text-xs text-white/80 leading-relaxed">
                    {selectedMessage.paragraphs.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                    <p className="text-white/50">{selectedMessage.signature}</p>
                  </div>

                  {/* Attachment */}
                  {selectedMessage.attachment && (
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/80">
                        <Paperclip className="w-3.5 h-3.5 text-white/50" />
                        <span>{selectedMessage.attachment}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ==================================================================
         * 10. SECTION 5: FEATURE TRIAGE
         * ================================================================ */}
        <section id="triage" className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
            {/* Left Column */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <SectionEyebrow label="Triage" tag="AI-native" />

              <h2 className="mt-5 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02]">
                Clear your inbox
                <br />
                in a single pass.
              </h2>

              <p className="mt-6 text-white/60 text-base leading-[1.6] max-w-md">
                Aura reads every message, understands intent, and routes the noise away from the signal. Focus on what moves your day forward — the rest handles itself.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  'Auto-categorize',
                  'Snooze for later',
                  'Silent newsletters',
                  'One-tap unsubscribe',
                ].map((chip) => (
                  <span
                    key={chip}
                    className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right Column */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
              className="liquid-glass rounded-2xl p-[20px] space-y-3"
            >
              <div className="text-xs font-medium text-white/60 px-1 pb-1">
                Today · 42 messages triaged
              </div>

              {[
                {
                  label: 'Priority',
                  count: 4,
                  color: '#ffffff',
                  items: ['Sophia Chen — Q3 review', 'David Lim — contract signoff'],
                },
                {
                  label: 'Follow-up',
                  count: 7,
                  color: '#e5e5e5',
                  items: ['Marcus — design review', 'Figma — comment thread'],
                },
                {
                  label: 'Updates',
                  count: 18,
                  color: '#a3a3a3',
                  items: ['Vercel — deploy ready', 'GitHub — PR #482 merged'],
                },
                {
                  label: 'Archived',
                  count: 13,
                  color: '#525252',
                  items: ['Stripe payout · Newsletter · Receipts'],
                },
              ].map((group) => (
                <div
                  key={group.label}
                  className="liquid-glass rounded-lg p-[12px] space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      <span>{group.label}</span>
                    </div>
                    <span className="text-white/45 font-mono-tabular">
                      {group.count}
                    </span>
                  </div>
                  <div className="space-y-1 pl-4">
                    {group.items.map((line) => (
                      <div key={line} className="text-xs text-white/65 truncate">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ==================================================================
         * 11. SECTION 6: LOGO CLOUD
         * ================================================================ */}
        <section className="max-w-6xl mx-auto px-6 py-16 md:py-20 text-center">
          <p className="text-xs uppercase tracking-widest text-white/40">
            Trusted by the world's most thoughtful teams
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 items-center">
            {LOGO_CLOUD_NAMES.map((name, index) => (
              <motion.div
                key={name}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.05,
                  ease: 'easeOut',
                }}
                className="text-sm font-semibold tracking-tight text-white/50 hover:text-white transition-colors"
              >
                {name}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ==================================================================
         * 12. SECTION 7: TESTIMONIALS
         * ================================================================ */}
        <section
          id="testimonials"
          className="max-w-6xl mx-auto px-6 py-20 md:py-28 border-t border-white/10"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item, idx) => (
              <motion.figure
                key={item.name}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.6,
                  delay: idx * 0.08,
                  ease: 'easeOut',
                }}
                className="liquid-glass rounded-2xl p-6 flex flex-col justify-between"
              >
                <blockquote className="text-sm text-white/80 leading-[1.6]">
                  "{item.quote}"
                </blockquote>

                <figcaption className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {item.name}
                    </div>
                    <div className="text-xs text-white/50">{item.role}</div>
                  </div>
                  <div className="text-xs text-white font-semibold tracking-wide">
                    {item.company}
                  </div>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </section>

        {/* ==================================================================
         * 13. SECTION 8: PRICING
         * ================================================================ */}
        <section id="pricing" className="c3-pricing-section">
          {/* Watermark */}
          <div className="c3-watermark-container">
            <div className="c3-watermark-main">
              <span className="c3-watermark-line-1">Your email.</span>
              <span className="c3-watermark-line-2">Revitalized</span>
            </div>
          </div>

          {/* Billing Period Toggle */}
          <div className="c3-toggle-wrap">
            <span
              className={`text-xs font-medium transition-colors ${
                !yearly ? 'text-white' : 'text-white/50'
              }`}
            >
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={yearly}
              aria-label="Toggle yearly billing"
              onClick={() => setYearly((prev) => !prev)}
              className={`c3-toggle ${yearly ? 'active' : ''}`}
            >
              <span className="c3-toggle-knob" />
            </button>
            <span
              className={`text-xs font-medium transition-colors ${
                yearly ? 'text-white' : 'text-white/50'
              }`}
            >
              Yearly
            </span>
          </div>

          {/* Pricing Cards Grid */}
          <div className="c3-grid">
            {/* Plan 1: Free */}
            <div className="c3-card">
              <div>
                <div className="c3-tier-small">Free</div>
                <div className="c3-tier-large">Free</div>
                <p className="c3-desc">
                  For creators taking their first steps with Forma.
                </p>

                <ul className="c3-list">
                  {[
                    'Up to 3 projects in the cloud.',
                    'Image export up to 1080p.',
                    'Basic editing tools.',
                    'Free templates and icons.',
                    'Access via web and mobile app.',
                  ].map((feat) => (
                    <li key={feat}>
                      <span className="c3-check" aria-hidden="true">
                        <Check className="w-3 h-3" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleChoosePlan('Free', 'Free')}
                className="c3-btn"
              >
                Choose Plan
              </button>
            </div>

            {/* Plan 2: Standard */}
            <div className="c3-card">
              <div>
                <div className="c3-tier-small">Standard</div>
                <div className="c3-tier-large">
                  {yearly ? '$99,99/y' : '$9,99/m'}
                </div>
                <p className="c3-desc">
                  For freelancers and small teams who need more freedom and flexibility.
                </p>

                <ul className="c3-list">
                  {[
                    'Up to 50 projects in the cloud.',
                    'Export up to 4K.',
                    'Advanced editing toolkit.',
                    'Team collaboration (up to 5 members).',
                    'Access to premium template library.',
                  ].map((feat) => (
                    <li key={feat}>
                      <span className="c3-check" aria-hidden="true">
                        <Check className="w-3 h-3" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleChoosePlan('Standard', yearly ? '$99,99/y' : '$9,99/m')
                }
                className="c3-btn"
              >
                Choose Plan
              </button>
            </div>

            {/* Plan 3: Pro */}
            <div className="c3-card c3-card-pro">
              <div>
                <div className="c3-tier-small">Pro</div>
                <div className="c3-tier-large">
                  {yearly ? '$199,99/y' : '$19,99/m'}
                </div>
                <p className="c3-desc">
                  For studios, agencies, and professional creators working with brands.
                </p>

                <ul className="c3-list">
                  {[
                    'Unlimited projects.',
                    'Export up to 8K + animations.',
                    'AI-powered content generation tools.',
                    'Unlimited team members.',
                    'Brand customization.',
                  ].map((feat) => (
                    <li key={feat}>
                      <span className="c3-check" aria-hidden="true">
                        <Check className="w-3 h-3" />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleChoosePlan('Pro', yearly ? '$199,99/y' : '$19,99/m')
                }
                className="c3-btn"
              >
                Choose Plan
              </button>
            </div>
          </div>
        </section>

        {/* ==================================================================
         * 14. SECTION 9: FINAL CTA
         * ================================================================ */}
        <section id="final-cta" className="max-w-6xl mx-auto px-6 py-20 md:py-32">
          <div className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center">
            {/* Radial Glow Overlay */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  'radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)',
              }}
            />

            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02]">
                Close the tabs.
                <br />
                Open your day.
              </h2>

              <p className="mt-6 text-white/60 max-w-md mx-auto text-sm leading-[1.6]">
                Join thousands of builders, founders, and operators who treat email like a tool — not an obligation.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
                <AppleButton label="Download Aura" onClick={handleDownloadAction} />
                <button
                  type="button"
                  onClick={handleTalkToSales}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 text-white text-sm font-medium px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <span>Talk to sales</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Subtle Footer linking VERIDEX Portal & Reference Notice */}
        <footer className="max-w-6xl mx-auto px-6 pb-12 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <div className="flex items-center gap-2.5">
            <LogoMark className="w-5 h-5" />
            <span>VERIDEX · Aura AI-Native Experience</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (authenticatedUserName && onReturnToDashboard) {
                  onReturnToDashboard();
                } else {
                  onOpenPortalLogin();
                }
              }}
              className="text-white/70 hover:text-white underline underline-offset-4 cursor-pointer"
            >
              {authenticatedUserName
                ? 'Return to VERIDEX Compliance Portal'
                : 'Sign In to VERIDEX Compliance Portal'}
            </button>
          </div>
        </footer>
      </div>

      {/* Interactive Feedback Modal for Download / Plan / Sales Actions */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="aura-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="liquid-glass rounded-2xl max-w-md w-full p-6 border border-white/15 bg-[#0e1014]/95 text-white shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 id="aura-modal-title" className="text-base font-semibold text-white">
                {actionModal.title}
              </h3>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={() => setActionModal(null)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              {actionModal.description}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-full border border-white/15 text-xs font-medium text-white/80 hover:bg-white/5 cursor-pointer"
              >
                Close
              </button>
              {actionModal.primaryLabel && actionModal.onPrimary && (
                <button
                  type="button"
                  onClick={actionModal.onPrimary}
                  className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 cursor-pointer"
                >
                  {actionModal.primaryLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
