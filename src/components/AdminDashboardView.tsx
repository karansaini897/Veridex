import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  ApplicationRecord,
  ApplicationStatus,
  AuditEvent,
  DocumentRecord,
  DocumentSubmissionRequest,
  MainView,
  StudentRequestSubmission,
  UserAccount,
} from '../types/portal';
import {
  calculateExpiryDetails,
  computeAdminChartData,
  computeDashboardMetrics,
  computeSihValidationSummary,
  getLocalTodayDate,
} from '../lib/domain';
import { AnimatedMetricValue, EmptyStateCard, StatusBadge } from './StatusPrimitives';
import { RequestManagementSection } from './RequestManagementSection';
import { DocumentRequestCreationModal } from './DocumentRequestCreationModal';

interface AdminDashboardViewProps {
  currentUser: UserAccount;
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  auditEvents: AuditEvent[];
  pendingApprovalCount?: number;
  allUsers?: UserAccount[];
  documentRequests?: DocumentSubmissionRequest[];
  studentSubmissions?: StudentRequestSubmission[];
  onCreateDocumentRequest?: (newReq: DocumentSubmissionRequest) => void;
  onReviewSubmissionDecision?: (
    submissionId: string,
    decision: 'Approved' | 'Rejected' | 'Needs Review',
    note: string
  ) => void;
  onOpenApplication: (appId: string) => void;
  onOpenDocument: (docId: string) => void;
  onNavigate: (view: MainView) => void;
  showFullTableOnly?: boolean;
}

const STATUS_FILTER_OPTIONS: Array<'All' | ApplicationStatus> = [
  'All',
  'Submitted',
  'Automated Checks Complete',
  'Pending Verification',
  'Additional Information Required',
  'Under Manual Review',
  'Decision Recorded',
  'Draft',
];

const DASHBOARD_CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.02,
    },
  },
};

const METRICS_GRID_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.045,
    },
  },
};

const DASHBOARD_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 28,
      mass: 0.8,
    },
  },
};

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  applications,
  documents,
  auditEvents,
  pendingApprovalCount = 0,
  allUsers = [],
  documentRequests = [],
  studentSubmissions = [],
  onCreateDocumentRequest,
  onReviewSubmissionDecision,
  onOpenApplication,
  onOpenDocument,
  onNavigate,
  showFullTableOnly = false,
}) => {
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ApplicationStatus>('All');
  const [sortField, setSortField] = useState<'lastUpdated' | 'submittedDate' | 'institutionName' | 'status' | 'id'>('lastUpdated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [visibleLimit, setVisibleLimit] = useState(8);
  const [trendMode, setTrendMode] = useState<'timeline' | 'categories'>('timeline');
  const [createRequestModalOpen, setCreateRequestModalOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const todayStr = getLocalTodayDate();

  const metrics = useMemo(
    () => computeDashboardMetrics(applications, documents, todayStr),
    [applications, documents, todayStr]
  );

  const chartData = useMemo(
    () => computeAdminChartData(applications, documents, todayStr),
    [applications, documents, todayStr]
  );

  const sihSummary = useMemo(
    () => computeSihValidationSummary(applications, documents, todayStr),
    [applications, documents, todayStr]
  );

  const filteredApplications = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return applications
      .filter((app) => {
        if (statusFilter !== 'All' && app.status !== statusFilter) return false;
        if (!q) return true;
        return (
          app.id.toLowerCase().includes(q) ||
          app.institutionName.toLowerCase().includes(q) ||
          app.officialInstitutionCode.toLowerCase().includes(q) ||
          app.category.toLowerCase().includes(q) ||
          app.status.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const rawA = a[sortField] || '';
        const rawB = b[sortField] || '';
        const valA = sortField === 'submittedDate' && rawA === 'Not Submitted' ? '0000-00-00' : rawA;
        const valB = sortField === 'submittedDate' && rawB === 'Not Submitted' ? '0000-00-00' : rawB;
        const cmp = valA.localeCompare(valB);
        return sortDirection === 'asc' ? cmp : -cmp;
      });
  }, [applications, tableSearch, statusFilter, sortField, sortDirection]);

  const pendingQueue = useMemo(() => {
    return applications.filter(
      (a) =>
        a.status === 'Submitted' ||
        a.status === 'Automated Checks Complete' ||
        a.status === 'Pending Verification' ||
        a.status === 'Under Manual Review'
    );
  }, [applications]);

  const expiringDocuments = useMemo(() => {
    return documents
      .map((doc) => ({
        doc,
        expiry: calculateExpiryDetails(doc.expiryDate, todayStr),
      }))
      .filter((item) => item.expiry.status === 'Expired' || item.expiry.status === 'Expiring Soon')
      .sort((a, b) => (a.expiry.daysRemaining ?? 999) - (b.expiry.daysRemaining ?? 999));
  }, [documents, todayStr]);

  const verificationBreakdown = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter((d) => d.issuerVerificationStatus === 'Verified').length;
    const consistencyFlagged = documents.filter(
      (d) => d.consistencyStatus === 'Mismatch Flagged'
    ).length;
    const anomalyFlagged = documents.filter(
      (d) => d.anomalyStatus === 'Suspected Alteration / Duplicate'
    ).length;
    const missingPages = documents.filter(
      (d) => d.completenessStatus === 'Missing Pages/Fields'
    ).length;
    const pendingHuman = documents.filter((d) => d.humanReviewStatus !== 'Reviewed').length;

    return {
      total,
      verified,
      consistencyFlagged,
      anomalyFlagged,
      missingPages,
      pendingHuman,
    };
  }, [documents]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'institutionName' || field === 'status' ? 'asc' : 'desc');
    }
  };

  const renderSortIndicator = (field: typeof sortField) => {
    const isActive = sortField === field;
    if (!isActive) {
      return (
        <span className="inline-flex items-center text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors" aria-hidden="true">
          <ArrowUpDown className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[#C2410C] dark:text-amber-400 font-bold"
        aria-hidden="true"
      >
        {sortDirection === 'asc' ? (
          <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
        ) : (
          <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
        )}
      </span>
    );
  };

  return (
    <motion.div
      variants={DASHBOARD_CONTAINER_VARIANTS}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Greeting & Operational Header Panel */}
      <motion.div
        variants={DASHBOARD_ITEM_VARIANTS}
        className="liquid-glass rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#C2410C] dark:text-amber-400">
            {currentUser.designation || 'VERIDEX Regional Compliance Workspace'}
          </p>
          <h1 className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight mt-0.5">
            {showFullTableOnly
              ? 'Institutional Applications Directory'
              : `Welcome back, ${currentUser.fullName}`}
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 max-w-3xl">
            Review institutional dossiers, inspect verification findings, issue deficiency notices, and record authorized compliance decisions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onCreateDocumentRequest && (
            <button
              type="button"
              onClick={() => setCreateRequestModalOpen(true)}
              className="btn-primary whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              <span>+ Create Document Request</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            data-testid="dashboard-open-approvals-btn"
            className="btn-secondary whitespace-nowrap shrink-0"
          >
            Account Approvals {pendingApprovalCount > 0 ? `(${pendingApprovalCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('verification')}
            className="btn-secondary whitespace-nowrap shrink-0"
          >
            Verification Workspace
          </button>
          <button
            type="button"
            onClick={() => onNavigate('expiry')}
            className="btn-secondary whitespace-nowrap shrink-0"
          >
            Expiry Alerts ({metrics.expiringDocuments})
          </button>
        </div>
      </motion.div>

      {/* 5 Interactive Summary Metrics */}
      <motion.section
        aria-label="Summary Metrics"
        variants={METRICS_GRID_VARIANTS}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => setStatusFilter('All')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Total Applications</div>
          <div className="text-2xl font-display font-bold text-stone-900 dark:text-white font-mono-tabular mt-1">
            <AnimatedMetricValue value={metrics.totalApplications} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Across 6 registered institutions
          </div>
        </motion.button>

        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => setStatusFilter('Pending Verification')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Pending Review</div>
          <div className="text-2xl font-display font-bold text-[#1D4ED8] dark:text-sky-400 font-mono-tabular mt-1">
            <AnimatedMetricValue value={metrics.pendingReview} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Active review queue dossiers
          </div>
        </motion.button>

        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => onNavigate('verification')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Documents Verified</div>
          <div className="text-2xl font-display font-bold text-[#046A38] dark:text-emerald-400 font-mono-tabular mt-1">
            <AnimatedMetricValue value={metrics.documentsVerified} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Issuer verified &amp; officer reviewed
          </div>
        </motion.button>

        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => onNavigate('expiry')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Expiring / Expired Docs</div>
          <div className="text-2xl font-display font-bold text-[#C2410C] dark:text-amber-400 font-mono-tabular mt-1">
            <AnimatedMetricValue value={metrics.expiringDocuments} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Within 45d window or lapsed
          </div>
        </motion.button>

        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => setStatusFilter('Additional Information Required')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left sm:col-span-2 md:col-span-1 cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Requiring Additional Info</div>
          <div className="text-2xl font-display font-bold text-red-700 dark:text-red-400 font-mono-tabular mt-1">
            <AnimatedMetricValue value={metrics.requiringAdditionalInfo} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
            Awaiting institution resubmission
          </div>
        </motion.button>
      </motion.section>

      {/* SIH26261 Operational Validation & Rectification Summary Bar */}
      <motion.section
        aria-label="SIH26261 Validation Summary"
        variants={DASHBOARD_ITEM_VARIANTS}
        className="liquid-glass rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <span className="text-[11px] font-mono-tabular font-bold uppercase tracking-wider text-[#9E2919] dark:text-amber-400">
            SIH26261 Validation, Consistency &amp; Compliance Queue
          </span>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            Live counts computed directly from registered institutional dossiers, checklist items, and 6-pillar findings.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
          <div className="px-3 py-2 rounded-xl liquid-glass-subtle text-xs">
            <div className="text-[10px] text-stone-500 dark:text-stone-400">Awaiting Review</div>
            <div className="font-mono-tabular font-bold text-stone-900 dark:text-white mt-0.5">
              {sihSummary.awaitingReview}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl liquid-glass-subtle text-xs">
            <div className="text-[10px] text-stone-500 dark:text-stone-400">Missing Checklist Docs</div>
            <div className="font-mono-tabular font-bold text-[#C2410C] dark:text-amber-400 mt-0.5">
              {sihSummary.missingDocumentsCount}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl liquid-glass-subtle text-xs">
            <div className="text-[10px] text-stone-500 dark:text-stone-400">Validation Flags</div>
            <div className="font-mono-tabular font-bold text-red-700 dark:text-red-400 mt-0.5">
              {sihSummary.validationFlagsCount}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl liquid-glass-subtle text-xs">
            <div className="text-[10px] text-stone-500 dark:text-stone-400">Unresolved Findings</div>
            <div className="font-mono-tabular font-bold text-[#1D4ED8] dark:text-sky-400 mt-0.5">
              {sihSummary.findingsRequiringHumanReview}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl liquid-glass-subtle text-xs">
            <div className="text-[10px] text-stone-500 dark:text-stone-400">Pending Rectification</div>
            <div className="font-mono-tabular font-bold text-amber-700 dark:text-amber-300 mt-0.5">
              {sihSummary.pendingRectifications}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl liquid-glass-subtle text-xs">
            <div className="text-[10px] text-stone-500 dark:text-stone-400">Completed Reviews</div>
            <div className="font-mono-tabular font-bold text-[#046A38] dark:text-emerald-400 mt-0.5">
              {sihSummary.completedReviews}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Recharts Data Visualization Section: Application Statuses & Document Processing Trends */}
      {!showFullTableOnly && (
        <motion.section
          aria-label="Compliance Analytics and Data Visualization"
          variants={DASHBOARD_ITEM_VARIANTS}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left 5 Cols: Application Status Distribution Chart */}
          <div className="lg:col-span-5 liquid-glass rounded-2xl p-5 flex flex-col justify-between overflow-visible">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#046A38] dark:text-emerald-400">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Application Status Distribution</span>
                </div>
                <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white mt-0.5">
                  Dossiers by Current Workflow Stage
                </h2>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Live breakdown of all {applications.length} institutional applications across statutory review states.
                </p>
              </div>
            </div>

            <div className="h-64 w-full" data-testid="admin-status-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.statusDistribution}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortLabel"
                    width={96}
                    tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)', fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--chart-tooltip-bg)',
                      borderColor: 'var(--glass-border-strong)',
                      borderRadius: '14px',
                      fontSize: '12px',
                      color: 'var(--chart-tooltip-text)',
                      boxShadow: 'var(--glass-modal-shadow)',
                      backdropFilter: 'blur(16px)',
                    }}
                    formatter={(value) => [`${value ?? 0} Dossier(s)`, 'Count']}
                  />
                  <Bar dataKey="count" name="Applications" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={!prefersReducedMotion}>
                    {chartData.statusDistribution.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 mt-2 border-t border-[#C2410C]/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular">
              <span>Decided: {chartData.statusDistribution.find((s) => s.status === 'Decision Recorded')?.count ?? 0}</span>
              <span>·</span>
              <span>In Review Queue: {metrics.pendingReview}</span>
              <span>·</span>
              <span>Deficiency Notice: {metrics.requiringAdditionalInfo}</span>
            </div>
          </div>

          {/* Right 7 Cols: Document Processing & Verification Trends Chart */}
          <div className="lg:col-span-7 liquid-glass rounded-2xl p-5 flex flex-col justify-between overflow-visible">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#046A38] dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>Document Processing &amp; Verification Trends</span>
                </div>
                <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white mt-0.5">
                  {trendMode === 'timeline'
                    ? 'Cumulative Repository Intake, Metadata Indexing & Officer Sign-Off'
                    : 'Verification Status Breakdown by Document Category'}
                </h2>
                <p className="text-[11px] text-stone-600 dark:text-stone-400">
                  Tracks {documents.length} repository certificates across metadata indexing, issuer verification, and consistency checks.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl liquid-glass-subtle shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setTrendMode('timeline')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    trendMode === 'timeline'
                      ? 'bg-[#C2410C] text-white'
                      : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  Monthly Trend
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMode('categories')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    trendMode === 'categories'
                      ? 'bg-[#046A38] text-white'
                      : 'text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  By Category
                </button>
              </div>
            </div>

            <div className="h-64 w-full" data-testid="admin-trends-chart">
              <ResponsiveContainer width="100%" height="100%">
                {trendMode === 'timeline' ? (
                  <AreaChart
                    data={chartData.processingTrends}
                    margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="veridexUploadedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="veridexVerifiedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#046A38" stopOpacity={0.34} />
                        <stop offset="95%" stopColor="#046A38" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="veridexFlaggedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C2410C" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#C2410C" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--chart-tooltip-bg)',
                        borderColor: 'var(--glass-border-strong)',
                        borderRadius: '14px',
                        fontSize: '12px',
                        color: 'var(--chart-tooltip-text)',
                        boxShadow: 'var(--glass-modal-shadow)',
                        backdropFilter: 'blur(16px)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Area
                      type="monotone"
                      dataKey="uploaded"
                      name="Registered & Indexed"
                      stroke="#1D4ED8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#veridexUploadedGrad)"
                      isAnimationActive={!prefersReducedMotion}
                    />
                    <Area
                      type="monotone"
                      dataKey="verified"
                      name="Verified & Reviewed"
                      stroke="#046A38"
                      strokeWidth={2.2}
                      fillOpacity={1}
                      fill="url(#veridexVerifiedGrad)"
                      isAnimationActive={!prefersReducedMotion}
                    />
                    <Area
                      type="monotone"
                      dataKey="flagged"
                      name="Flagged / Expired Signals"
                      stroke="#C2410C"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#veridexFlaggedGrad)"
                      isAnimationActive={!prefersReducedMotion}
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={chartData.categoryBreakdown}
                    margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                    barGap={4}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--chart-tooltip-bg)',
                        borderColor: 'var(--glass-border-strong)',
                        borderRadius: '14px',
                        fontSize: '12px',
                        color: 'var(--chart-tooltip-text)',
                        boxShadow: 'var(--glass-modal-shadow)',
                        backdropFilter: 'blur(16px)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="verified" name="Verified" fill="#046A38" maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                    <Bar dataKey="pending" name="Pending Officer Review" fill="#1D4ED8" maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                    <Bar dataKey="flagged" name="Flagged / Expiring" fill="#C2410C" maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="pt-3 mt-2 border-t border-[#C2410C]/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular">
              <span>Total Repository Docs: {documents.length}</span>
              <span>·</span>
              <span>Verified &amp; Reviewed: {metrics.documentsVerified}</span>
              <span>·</span>
              <span>Expiring / Lapsed: {metrics.expiringDocuments}</span>
            </div>
          </div>
        </motion.section>
      )}

      {/* Main Applications Table */}
      <motion.section
        variants={DASHBOARD_ITEM_VARIANTS}
        className="liquid-glass rounded-2xl overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-[#C2410C]/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-display font-bold text-stone-900 dark:text-white">
                Institutional Applications Registry
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Click any application row or "Review Dossier" to inspect documents, findings, and record review actions.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#046A38] dark:text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Filter applications by ID, institution, or category"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search ID, institution, category..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl liquid-glass-subtle text-stone-900 dark:text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#C2410C]"
              />
            </div>
          </div>

          {/* Interactive Status Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {STATUS_FILTER_OPTIONS.map((st) => {
              const active = statusFilter === st;
              const count =
                st === 'All'
                  ? applications.length
                  : applications.filter((a) => a.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#C2410C] text-white shadow-xs'
                      : 'liquid-glass-subtle text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white'
                  }`}
                >
                  {st} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#C2410C]/25 liquid-glass-subtle text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                <th
                  className="py-3 px-4"
                  aria-sort={sortField === 'id' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('id')}
                    className={`group inline-flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'id' ? 'text-[#C2410C] dark:text-amber-400 font-bold' : ''
                    }`}
                  >
                    <span>Ref ID</span>
                    {renderSortIndicator('id')}
                  </button>
                </th>
                <th
                  className="py-3 px-4"
                  aria-sort={sortField === 'institutionName' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('institutionName')}
                    className={`group inline-flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'institutionName' ? 'text-[#C2410C] dark:text-amber-400 font-bold' : ''
                    }`}
                  >
                    <span>Institution</span>
                    {renderSortIndicator('institutionName')}
                  </button>
                </th>
                <th className="py-3 px-4">Application Category</th>
                <th
                  className="py-3 px-4"
                  aria-sort={sortField === 'submittedDate' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('submittedDate')}
                    className={`group inline-flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'submittedDate' ? 'text-[#C2410C] dark:text-amber-400 font-bold' : ''
                    }`}
                  >
                    <span>Submitted</span>
                    {renderSortIndicator('submittedDate')}
                  </button>
                </th>
                <th
                  className="py-3 px-4"
                  aria-sort={sortField === 'status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className={`group inline-flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'status' ? 'text-[#C2410C] dark:text-amber-400 font-bold' : ''
                    }`}
                  >
                    <span>Current Status</span>
                    {renderSortIndicator('status')}
                  </button>
                </th>
                <th
                  className="py-3 px-4"
                  aria-sort={sortField === 'lastUpdated' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('lastUpdated')}
                    className={`group inline-flex items-center gap-1.5 hover:text-stone-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'lastUpdated' ? 'text-[#C2410C] dark:text-amber-400 font-bold' : ''
                    }`}
                  >
                    <span>Last Updated</span>
                    {renderSortIndicator('lastUpdated')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800/80 text-xs">
              {filteredApplications.slice(0, visibleLimit).map((app) => {
                const flaggedCount = app.checklist.filter(
                  (c) => c.status === 'Flagged for Review'
                ).length;
                return (
                  <tr
                    key={app.id}
                    className="hover:bg-[#EFE6D5]/55 dark:hover:bg-stone-800/45 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-[#C2410C] dark:text-amber-400 whitespace-nowrap">
                      {app.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900 dark:text-white">
                        {app.institutionName}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono-tabular">
                        {app.officialInstitutionCode} · {app.documentIds.length} docs
                        {flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                      {app.category}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {app.submittedDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-stone-600 dark:text-stone-400 whitespace-nowrap">
                      {app.lastUpdated}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenApplication(app.id)}
                        aria-label={`Open application ${app.id} for ${app.institutionName}`}
                        className="btn-secondary !py-1.5 !px-3"
                      >
                        <span>Review Dossier</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredApplications.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6">
                    <EmptyStateCard
                      title="No Matching Applications Found"
                      description="No institutional compliance dossiers match your current search query or status filter."
                      actionLabel={tableSearch || statusFilter !== 'All' ? 'Reset Active Filters' : undefined}
                      onAction={
                        tableSearch || statusFilter !== 'All'
                          ? () => {
                              setTableSearch('');
                              setStatusFilter('All');
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredApplications.length > visibleLimit && (
          <div className="p-3 liquid-glass-subtle border-x-0 border-b-0 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
            <span>
              Showing {visibleLimit} of {filteredApplications.length} matching applications
            </span>
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + 10)}
              className="font-semibold text-[#C2410C] dark:text-amber-400 hover:underline cursor-pointer"
            >
              Show all ({filteredApplications.length})
            </button>
          </div>
        )}
      </motion.section>

      {/* Secondary Panels: Pending-Review Queue + Expiry Alerts + Verification Overview + Activity */}
      {!showFullTableOnly && (
        <motion.div
          variants={DASHBOARD_ITEM_VARIANTS}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Left 7 Cols: Pending Review Queue & Verification Overview */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pending Review Queue */}
            <section className="liquid-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
                    Priority Pending-Review Queue ({pendingQueue.length})
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Dossiers awaiting regional officer verification or final compliance decision.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-stone-200/80 dark:divide-stone-800">
                {pendingQueue.map((app) => {
                  const flags = app.checklist.filter((c) => c.status === 'Flagged for Review');
                  return (
                    <div
                      key={app.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="font-mono-tabular font-semibold text-[#C2410C] dark:text-amber-400">
                            {app.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-stone-900 dark:text-white truncate">
                            {app.institutionName}
                          </span>
                          <StatusBadge status={app.status} size="sm" />
                        </div>
                        <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                          {app.category}
                          {flags.length > 0 ? ` · ${flags.length} check flag(s)` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenApplication(app.id)}
                        className="btn-secondary !py-1.5 !px-3 whitespace-nowrap shrink-0"
                      >
                        Inspect &amp; Decide
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Document Verification Overview */}
            <section className="liquid-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
                    Document Verification &amp; Integrity Overview
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    Automated verification flags serve as prompts for officer review prior to final compliance sign-off.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('verification')}
                  className="text-xs font-semibold text-[#C2410C] dark:text-amber-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Workspace
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl liquid-glass-subtle">
                  <div className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Issuer Check Passed</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-[#046A38] dark:text-emerald-400 mt-0.5">
                    <AnimatedMetricValue value={verificationBreakdown.verified} /> / {verificationBreakdown.total}
                  </div>
                </div>
                <div className="p-3 rounded-xl liquid-glass-subtle">
                  <div className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Consistency Flags</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-amber-700 dark:text-amber-400 mt-0.5">
                    <AnimatedMetricValue value={verificationBreakdown.consistencyFlagged} />
                  </div>
                </div>
                <div className="p-3 rounded-xl liquid-glass-subtle">
                  <div className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Anomaly Indicators</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-red-700 dark:text-red-400 mt-0.5">
                    <AnimatedMetricValue value={verificationBreakdown.anomalyFlagged} />
                  </div>
                </div>
                <div className="p-3 rounded-xl liquid-glass-subtle">
                  <div className="text-[11px] font-medium text-stone-600 dark:text-stone-400">Awaiting Human Sign-Off</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-[#1D4ED8] dark:text-sky-400 mt-0.5">
                    <AnimatedMetricValue value={verificationBreakdown.pendingHuman} />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right 5 Cols: Certificate Expiry Alerts & Recent System Activity */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upcoming Certificate Expiry Alerts */}
            <section className="liquid-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
                  Certificate Expiry Alerts
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('expiry')}
                  className="text-xs font-semibold text-[#C2410C] dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Full Calendar
                </button>
              </div>

              <div className="divide-y divide-stone-200/80 dark:divide-stone-800">
                {expiringDocuments.slice(0, 5).map(({ doc, expiry }) => (
                  <div key={doc.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc.id)}
                        className="text-xs font-semibold text-stone-900 dark:text-white hover:text-[#C2410C] dark:hover:text-amber-400 text-left truncate block max-w-full cursor-pointer"
                      >
                        <span className="font-mono-tabular text-[#C2410C] dark:text-amber-400 mr-1.5">
                          {doc.internalCode}
                        </span>
                        {doc.name}
                      </button>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {doc.institutionName} · Expiry: <span className="font-mono-tabular">{doc.expiryDate}</span>
                      </div>
                    </div>
                    <StatusBadge status={expiry.status} customLabel={expiry.label} size="sm" />
                  </div>
                ))}
              </div>
            </section>

            {/* Recent System Activity */}
            <section className="liquid-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
                  Recent Portal Activity
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-semibold text-[#C2410C] dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Audit History
                </button>
              </div>

              <div className="space-y-3">
                {auditEvents.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="text-xs border-b border-stone-200/70 dark:border-stone-800/70 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-stone-900 dark:text-white">
                        {ev.action}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-stone-500 dark:text-stone-400 shrink-0">
                        {ev.timestamp}
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-stone-300 text-[11px] mt-0.5 leading-relaxed">
                      {ev.details}
                    </p>
                    <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-mono-tabular">
                      Actor: {ev.actorName} ({ev.actorRole}) · Target: {ev.targetId}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </motion.div>
      )}

      {/* Official Document & Application Requests Management */}
      {!showFullTableOnly && (
        <RequestManagementSection
          requests={documentRequests}
          submissions={studentSubmissions}
          allUsers={allUsers}
          currentUser={currentUser}
          onCreateNewRequest={onCreateDocumentRequest ? () => setCreateRequestModalOpen(true) : undefined}
          onReviewSubmissionDecision={onReviewSubmissionDecision}
        />
      )}

      {createRequestModalOpen && onCreateDocumentRequest && (
        <DocumentRequestCreationModal
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setCreateRequestModalOpen(false)}
          onCreateRequest={(newReq) => {
            onCreateDocumentRequest(newReq);
            setCreateRequestModalOpen(false);
          }}
        />
      )}
    </motion.div>
  );
};
