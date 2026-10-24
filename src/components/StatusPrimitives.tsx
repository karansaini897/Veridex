import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  SlidersHorizontal,
  Send,
  FileEdit,
  Eye,
  Ban,
  Sparkles,
  Inbox,
} from 'lucide-react';

export type StatusTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'review';

interface StatusVisualConfig {
  tone: StatusTone;
  label: string;
  icon: React.ReactNode;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success:
    'bg-emerald-500/12 text-[#046A38] dark:bg-emerald-500/18 dark:text-emerald-300 border border-[#046A38]/35 dark:border-emerald-500/40',
  warning:
    'bg-amber-500/14 text-amber-900 dark:bg-amber-500/18 dark:text-amber-300 border border-amber-600/40 dark:border-amber-500/40',
  danger:
    'bg-red-500/12 text-red-800 dark:bg-red-500/18 dark:text-red-300 border border-red-600/40 dark:border-red-500/40',
  info:
    'bg-[#C2410C]/10 text-[#9A3412] dark:bg-orange-500/16 dark:text-orange-300 border border-[#C2410C]/35 dark:border-orange-500/40',
  review:
    'bg-sky-500/12 text-sky-900 dark:bg-sky-500/18 dark:text-sky-300 border border-sky-600/35 dark:border-sky-400/40',
  neutral:
    'bg-stone-500/12 text-stone-700 dark:bg-stone-700/40 dark:text-stone-300 border border-stone-400/35 dark:border-stone-600/50',
};

export function resolveStatusVisual(rawStatus: string): StatusVisualConfig {
  const normalized = rawStatus.trim();

  switch (normalized) {
    // Application statuses
    case 'Decision Recorded':
      return {
        tone: 'success',
        label: 'Decision Recorded',
        icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };
    case 'Additional Information Required':
      return {
        tone: 'danger',
        label: 'Additional Info Required',
        icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };
    case 'Under Manual Review':
    case 'Under Review':
      return {
        tone: 'review',
        label: normalized,
        icon: <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };
    case 'Pending Verification':
      return {
        tone: 'warning',
        label: 'Pending Verification',
        icon: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };
    case 'Automated Checks Complete':
      return {
        tone: 'info',
        label: 'Checks Complete',
        icon: <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };
    case 'Submitted':
      return {
        tone: 'info',
        label: 'Submitted',
        icon: <Send className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };
    case 'Draft':
      return {
        tone: 'neutral',
        label: 'Draft',
        icon: <FileEdit className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };

    // Checklist & Document & Account Approval statuses
    case 'Verified':
    case 'Passed':
    case 'Reviewed':
    case 'Complete':
    case 'Consistent':
    case 'No Anomaly Detected':
    case 'Valid':
    case 'Active':
    case 'Active Rule':
    case 'Approved':
      return {
        tone: 'success',
        label: normalized === 'No Anomaly Detected' ? 'No Anomaly Signal' : normalized,
        icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };

    case 'Uploaded':
    case 'Pending Review':
    case 'Pending Check':
    case 'Pending':
    case 'Pending Activation':
    case 'Pending Approval':
      return {
        tone: 'review',
        label: normalized,
        icon: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };

    case 'Advisory':
    case 'Expiring Soon':
    case 'Correction Requested':
    case 'No Approver Assigned':
    case 'Needs Review':
      return {
        tone: 'warning',
        label: normalized,
        icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };

    case 'Flagged for Review':
    case 'Flagged':
    case 'Action Required':
    case 'Missing Pages/Fields':
    case 'Mismatch Flagged':
    case 'Suspected Alteration / Duplicate':
    case 'Failed':
    case 'Expired':
    case 'Suspended':
    case 'Rejected':
      return {
        tone: 'danger',
        label:
          normalized === 'Missing Pages/Fields'
            ? 'Missing Pages / Fields'
            : normalized === 'Suspected Alteration / Duplicate'
              ? 'Review Signal: Alteration / Duplicate'
              : normalized,
        icon:
          normalized === 'Suspended' || normalized === 'Rejected' ? (
            <Ban className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ),
      };

    case 'Pending Upload':
    case 'Unavailable':
    case 'Not Checked':
    case 'Not Screened':
    case 'No Expiry':
    case 'Permanent / No Expiry':
    case 'Paused':
      return {
        tone: 'neutral',
        label:
          normalized === 'Unavailable'
            ? 'Registry Unavailable'
            : normalized === 'Not Screened'
              ? 'Not Screened'
              : normalized,
        icon:
          normalized === 'Paused' ? (
            <Ban className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ),
      };

    default: {
      if (normalized.toLowerCase().includes('expired')) {
        return {
          tone: 'danger',
          label: normalized,
          icon: <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
        };
      }
      if (normalized.toLowerCase().includes('expires in') || normalized.toLowerCase().includes('expires today')) {
        return {
          tone: 'warning',
          label: normalized,
          icon: <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
        };
      }
      if (normalized.toLowerCase().includes('valid')) {
        return {
          tone: 'success',
          label: normalized,
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
        };
      }
      return {
        tone: 'neutral',
        label: normalized,
        icon: <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
      };
    }
  }
}

interface StatusBadgeProps {
  status: string;
  customLabel?: string;
  size?: 'xs' | 'sm';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  size = 'xs',
  className = '',
}) => {
  const resolved = resolveStatusVisual(status);
  const sizeClasses =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs gap-1.5 rounded-lg'
      : 'px-2 py-0.5 text-[11px] gap-1 rounded-md';

  return (
    <span
      className={`inline-flex items-center font-semibold leading-tight whitespace-nowrap shrink-0 ${sizeClasses} ${TONE_CLASSES[resolved.tone]} ${className}`}
    >
      {resolved.icon}
      <span>{customLabel || resolved.label}</span>
    </span>
  );
};

interface FileTypeMarkerProps {
  mimeType: string;
  fileName?: string;
  fileSize?: string;
  compact?: boolean;
}

export const FileTypeMarker: React.FC<FileTypeMarkerProps> = ({
  mimeType,
  fileName,
  fileSize,
  compact = false,
}) => {
  const isPdf =
    mimeType === 'application/pdf' ||
    Boolean(fileName && fileName.toLowerCase().endsWith('.pdf'));

  const badgeLabel = isPdf ? 'PDF' : 'IMG';
  const badgeClasses = isPdf
    ? 'bg-[#C2410C]/12 text-[#9A3412] dark:bg-orange-500/20 dark:text-orange-300 border border-[#C2410C]/35'
    : 'bg-[#046A38]/12 text-[#046A38] dark:bg-emerald-500/20 dark:text-emerald-300 border border-[#046A38]/35';

  return (
    <span className="inline-flex items-center gap-1.5 font-mono-tabular text-[11px] shrink-0">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-bold tracking-tight ${badgeClasses}`}
        title={isPdf ? 'Portable Document Format (PDF)' : `Image Attachment (${mimeType})`}
      >
        {isPdf ? (
          <FileText className="w-3 h-3 shrink-0" aria-hidden="true" />
        ) : (
          <ImageIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
        )}
        <span>{badgeLabel}</span>
      </span>
      {!compact && fileSize && (
        <span className="text-stone-500 dark:text-stone-400">{fileSize}</span>
      )}
    </span>
  );
};

interface AnimatedMetricValueProps {
  value: number;
  suffix?: string;
  className?: string;
}

export const AnimatedMetricValue: React.FC<AnimatedMetricValueProps> = ({
  value,
  suffix = '',
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const hasAnimatedRef = React.useRef<boolean>(false);

  useEffect(() => {
    if (prefersReducedMotion || hasAnimatedRef.current) {
      setDisplayValue(value);
      return;
    }

    hasAnimatedRef.current = true;
    let animationFrameId: number;
    const durationMs = 260;
    const startTime = performance.now();
    const startVal = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startVal + (value - startVal) * eased));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    animationFrameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [value, prefersReducedMotion]);

  const finalFormatted = `${value}${suffix}`;

  return (
    <span
      className={`font-mono-tabular tabular-nums ${className}`}
      aria-label={finalFormatted}
    >
      <span aria-hidden="true">
        {prefersReducedMotion ? value : displayValue}
        {suffix}
      </span>
    </span>
  );
};

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="p-8 text-center rounded-2xl liquid-glass-subtle flex flex-col items-center justify-center space-y-2.5">
      <div className="w-10 h-10 rounded-xl bg-[#C2410C]/10 dark:bg-orange-500/15 border border-[#C2410C]/30 flex items-center justify-center text-[#046A38] dark:text-emerald-400">
        {icon || <Inbox className="w-5 h-5" aria-hidden="true" />}
      </div>
      <div className="text-sm font-display font-bold text-stone-900 dark:text-white">
        {title}
      </div>
      <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-1.5">
          <button
            type="button"
            onClick={onAction}
            className="btn-secondary text-xs"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};
