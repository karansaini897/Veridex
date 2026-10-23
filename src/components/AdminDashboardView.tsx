import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileWarning,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ApplicationRecord,
  ApplicationStatus,
  AuditEvent,
  DocumentRecord,
  MainView,
  UserAccount,
} from '../types/portal';
import {
  calculateExpiryDetails,
  computeDashboardMetrics,
  REFERENCE_DATE,
} from '../lib/domain';

interface AdminDashboardViewProps {
  currentUser: UserAccount;
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  auditEvents: AuditEvent[];
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

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  applications,
  documents,
  auditEvents,
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

  const metrics = useMemo(
    () => computeDashboardMetrics(applications, documents, REFERENCE_DATE),
    [applications, documents]
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
        const valA = sortField === 'submittedDate' && rawA === '—' ? '0000-00-00' : rawA;
        const valB = sortField === 'submittedDate' && rawB === '—' ? '0000-00-00' : rawB;
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
        expiry: calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE),
      }))
      .filter((item) => item.expiry.status === 'Expired' || item.expiry.status === 'Expiring Soon')
      .sort((a, b) => (a.expiry.daysRemaining ?? 999) - (b.expiry.daysRemaining ?? 999));
  }, [documents]);

  const verificationBreakdown = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter((d) => d.issuerVerificationStatus === 'Verified (Simulated)').length;
    const consistencyFlagged = documents.filter(
      (d) => d.consistencyStatus === 'Mismatch Flagged (Simulated)'
    ).length;
    const anomalyFlagged = documents.filter(
      (d) => d.anomalyStatus === 'Suspected Alteration / Duplicate (Simulated)'
    ).length;
    const missingPages = documents.filter(
      (d) => d.completenessStatus === 'Missing Pages/Fields (Simulated)'
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
        <span className="inline-flex items-center text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" aria-hidden="true">
          <ArrowUpDown className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 font-bold"
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

  const renderStatusText = (status: ApplicationStatus) => {
    switch (status) {
      case 'Decision Recorded':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Decision Recorded</span>
          </span>
        );
      case 'Additional Information Required':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Additional Info Required</span>
          </span>
        );
      case 'Under Manual Review':
      case 'Pending Verification':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{status}</span>
          </span>
        );
      case 'Submitted':
      case 'Automated Checks Complete':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>{status}</span>
          </span>
        );
      default:
        return (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            {currentUser.designation || 'VERIDEX Regional Compliance Workspace'}
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            {showFullTableOnly
              ? 'Institutional Applications Directory'
              : `Welcome back, ${currentUser.fullName}`}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Review institutional dossiers, inspect simulated verification findings, request clarifications, and record authorized compliance decisions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('verification')}
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Verification Workspace
          </button>
          <button
            type="button"
            onClick={() => onNavigate('expiry')}
            className="px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Expiry Alerts ({metrics.expiringDocuments})
          </button>
        </div>
      </div>

      {/* 5 Summary Metrics */}
      <section aria-label="Summary Metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Applications</div>
          <div className="text-2xl font-display font-bold text-slate-900 dark:text-white font-mono-tabular mt-1">
            {metrics.totalApplications}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Across 5 institutions · 2026-27
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Pending Review</div>
          <div className="text-2xl font-display font-bold text-blue-700 dark:text-blue-400 font-mono-tabular mt-1">
            {metrics.pendingReview}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Active review queue dossiers
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Documents Verified</div>
          <div className="text-2xl font-display font-bold text-emerald-700 dark:text-emerald-400 font-mono-tabular mt-1">
            {metrics.documentsVerified}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Simulated check + human reviewed
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Expiring / Expired Docs</div>
          <div className="text-2xl font-display font-bold text-amber-700 dark:text-amber-400 font-mono-tabular mt-1">
            {metrics.expiringDocuments}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Within 45d window or lapsed
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">Requiring Additional Info</div>
          <div className="text-2xl font-display font-bold text-red-700 dark:text-red-400 font-mono-tabular mt-1">
            {metrics.requiringAdditionalInfo}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Awaiting institution resubmission
          </div>
        </div>
      </section>

      {/* Main Applications Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Institutional Applications Registry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any application row or "Review Dossier" to inspect documents, findings, and record review actions.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Filter applications by ID, institution, or category"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search ID, institution, category..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-blue-600'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th
                  className="py-3 px-4"
                  aria-sort={sortField === 'id' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('id')}
                    className={`group inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'id' ? 'text-blue-700 dark:text-blue-400 font-bold' : ''
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
                    className={`group inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'institutionName' ? 'text-blue-700 dark:text-blue-400 font-bold' : ''
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
                    className={`group inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'submittedDate' ? 'text-blue-700 dark:text-blue-400 font-bold' : ''
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
                    className={`group inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'status' ? 'text-blue-700 dark:text-blue-400 font-bold' : ''
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
                    className={`group inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
                      sortField === 'lastUpdated' ? 'text-blue-700 dark:text-blue-400 font-bold' : ''
                    }`}
                  >
                    <span>Last Updated</span>
                    {renderSortIndicator('lastUpdated')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {filteredApplications.slice(0, visibleLimit).map((app) => {
                const flaggedCount = app.checklist.filter(
                  (c) => c.status === 'Flagged for Review'
                ).length;
                return (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                      {app.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {app.institutionName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono-tabular">
                        {app.officialInstitutionCode} · {app.documentIds.length} docs
                        {flaggedCount > 0 ? ` · ${flaggedCount} flagged` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {app.category}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {app.submittedDate}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {renderStatusText(app.status)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {app.lastUpdated}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenApplication(app.id)}
                        aria-label={`Open application ${app.id} for ${app.institutionName}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
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
                  <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                    No applications match the active search or status filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredApplications.length > visibleLimit && (
          <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {visibleLimit} of {filteredApplications.length} matching applications
            </span>
            <button
              type="button"
              onClick={() => setVisibleLimit((prev) => prev + 10)}
              className="font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Show all ({filteredApplications.length})
            </button>
          </div>
        )}
      </section>

      {/* Secondary Panels: Pending-Review Queue + Expiry Alerts + Verification Overview + Activity */}
      {!showFullTableOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Cols: Pending Review Queue & Verification Overview */}
          <div className="lg:col-span-7 space-y-6">
            {/* Pending Review Queue */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Priority Pending-Review Queue ({pendingQueue.length})
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dossiers awaiting regional officer verification or final compliance decision.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {pendingQueue.map((app) => {
                  const flags = app.checklist.filter((c) => c.status === 'Flagged for Review');
                  return (
                    <div
                      key={app.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                            {app.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {app.institutionName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {app.category} · {app.status}
                          {flags.length > 0 ? ` · ${flags.length} check flag(s)` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenApplication(app.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Inspect &amp; Decide
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Simulated Verification Overview */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Document Verification Overview (Simulated Checks)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    An AI or automated flag is a prompt for human review, never automatic proof of fraud.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('verification')}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Workspace
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Issuer Check Passed</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {verificationBreakdown.verified} / {verificationBreakdown.total}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Consistency Flags</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-amber-700 dark:text-amber-400 mt-0.5">
                    {verificationBreakdown.consistencyFlagged}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Anomaly Indicators</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-red-700 dark:text-red-400 mt-0.5">
                    {verificationBreakdown.anomalyFlagged}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500">Awaiting Human Sign-Off</div>
                  <div className="text-lg font-display font-bold font-mono-tabular text-blue-700 dark:text-blue-400 mt-0.5">
                    {verificationBreakdown.pendingHuman}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right 5 Cols: Certificate Expiry Alerts & Recent System Activity */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upcoming Certificate Expiry Alerts */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  Certificate Expiry Alerts
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('expiry')}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Full Calendar
                </button>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {expiringDocuments.slice(0, 5).map(({ doc, expiry }) => (
                  <div key={doc.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc.id)}
                        className="text-xs font-semibold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 text-left truncate block max-w-full cursor-pointer"
                      >
                        <span className="font-mono-tabular text-blue-700 dark:text-blue-400 mr-1.5">
                          {doc.internalCode}
                        </span>
                        {doc.name}
                      </button>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {doc.institutionName} · Expiry: <span className="font-mono-tabular">{doc.expiryDate}</span>
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
            </section>

            {/* Recent System Activity */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                  Recent Portal Activity
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Audit History
                </button>
              </div>

              <div className="space-y-3">
                {auditEvents.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="text-xs border-b border-slate-100 dark:border-slate-800/70 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {ev.action}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                        {ev.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      {ev.details}
                    </p>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono-tabular">
                      Actor: {ev.actorName} ({ev.actorRole}) · Target: {ev.targetId}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
