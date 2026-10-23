import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ListFilter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DocumentRecord, ExpiryStatus, UserAccount } from '../types/portal';
import {
  calculateExpiryDetails,
  canUserAccessDocument,
  REFERENCE_DATE,
} from '../lib/domain';

interface ExpiryCalendarViewProps {
  currentUser: UserAccount;
  documents: DocumentRecord[];
  onOpenDocument: (docId: string) => void;
  onOpenApplication: (appId: string) => void;
}

export const ExpiryCalendarView: React.FC<ExpiryCalendarViewProps> = ({
  currentUser,
  documents,
  onOpenDocument,
  onOpenApplication,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [statusFilter, setStatusFilter] = useState<'All' | ExpiryStatus>('All');
  const [calendarMonth, setCalendarMonth] = useState<'2026-10' | '2026-11' | '2027-04' | '2027-06'>('2026-10');

  const authorizedDocsWithExpiry = useMemo(() => {
    return documents
      .filter((d) => canUserAccessDocument(currentUser, d) && Boolean(d.expiryDate))
      .map((doc) => ({
        doc,
        expiry: calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE),
      }))
      .sort((a, b) => (a.expiry.daysRemaining ?? 9999) - (b.expiry.daysRemaining ?? 9999));
  }, [documents, currentUser]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'All') return authorizedDocsWithExpiry;
    return authorizedDocsWithExpiry.filter((item) => item.expiry.status === statusFilter);
  }, [authorizedDocsWithExpiry, statusFilter]);

  const counts = useMemo(() => {
    return {
      expired: authorizedDocsWithExpiry.filter((i) => i.expiry.status === 'Expired').length,
      soon: authorizedDocsWithExpiry.filter((i) => i.expiry.status === 'Expiring Soon').length,
      valid: authorizedDocsWithExpiry.filter((i) => i.expiry.status === 'Valid').length,
    };
  }, [authorizedDocsWithExpiry]);

  // Build calendar days for the selected YYYY-MM
  const calendarDays = useMemo(() => {
    const [yr, mo] = calendarMonth.split('-').map(Number);
    const daysInMonth = new Date(yr, mo, 0).getDate();
    const firstWeekday = new Date(yr, mo - 1, 1).getDay(); // 0 = Sun
    const cells: Array<{ day: number | null; dateStr?: string; docs: typeof authorizedDocsWithExpiry }> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ day: null, docs: [] });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateStr = `${calendarMonth}-${String(d).padStart(2, '0')}`;
      const matching = authorizedDocsWithExpiry.filter((item) => item.doc.expiryDate === dateStr);
      cells.push({ day: d, dateStr, docs: matching });
    }
    return cells;
  }, [calendarMonth, authorizedDocsWithExpiry]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Statutory Validity &amp; Renewal Tracking (Reference Date: {REFERENCE_DATE})
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Certificate Expiry Calendar &amp; Reminders
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Tracks Fire &amp; Life Safety NOCs, Pollution Consents, Library Subscriptions, Joint FDRs, and Affiliation Orders.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Expiry Schedule List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Monthly Calendar Grid
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">Expired Certificates</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-red-700 dark:text-red-400 mt-1">
            {counts.expired}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Immediate renewal upload required
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">Expiring Within 45 Days</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-amber-700 dark:text-amber-400 mt-1">
            {counts.soon}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Approaching statutory renewal window
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">Valid (&gt;45 Days Remaining)</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400 mt-1">
            {counts.valid}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active validity across academic session
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['All', 'Expired', 'Expiring Soon', 'Valid'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white dark:bg-blue-600'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Days Remaining</th>
                    <th className="py-3 px-4">Internal Code &amp; Certificate</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Linked Institution</th>
                    <th className="py-3 px-4">Linked Application</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredItems.map(({ doc, expiry }) => (
                    <tr key={doc.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {doc.expiryDate}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular whitespace-nowrap">
                        <span
                          className={
                            expiry.status === 'Expired'
                              ? 'text-red-700 dark:text-red-400 font-semibold'
                              : expiry.status === 'Expiring Soon'
                                ? 'text-amber-700 dark:text-amber-400 font-semibold'
                                : 'text-emerald-700 dark:text-emerald-400'
                          }
                        >
                          {expiry.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                          {doc.internalCode}
                        </div>
                        <div className="font-medium text-slate-900 dark:text-white">
                          {doc.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {doc.category}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {doc.institutionName}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular whitespace-nowrap">
                        {doc.relatedApplicationId ? (
                          <button
                            type="button"
                            onClick={() => onOpenApplication(doc.relatedApplicationId!)}
                            className="text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                          >
                            {doc.relatedApplicationId}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenDocument(doc.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-xs font-medium cursor-pointer"
                        >
                          Open Document
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Monthly Calendar View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
                Monthly Certificate Expiry Grid
              </h2>
              <p className="text-xs text-slate-500">
                Select a key compliance month to inspect exact certificate expiration dates.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: '2026-10', label: 'October 2026 (3 Expiries)' },
                  { id: '2026-11', label: 'November 2026 (5 Expiries)' },
                  { id: '2027-04', label: 'April 2027' },
                  { id: '2027-06', label: 'June 2027' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCalendarMonth(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    calendarMonth === m.id
                      ? 'bg-slate-900 text-white dark:bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-500 pb-1 border-b border-slate-200 dark:border-slate-800">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => (
              <div
                key={idx}
                className={`min-h-24 p-2 rounded-lg border text-xs flex flex-col justify-between ${
                  cell.day === null
                    ? 'border-transparent bg-slate-50/40 dark:bg-slate-950/20'
                    : cell.dateStr === REFERENCE_DATE
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                {cell.day !== null && (
                  <>
                    <div className="flex items-center justify-between font-mono-tabular text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {cell.day}
                      </span>
                      {cell.dateStr === REFERENCE_DATE && (
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 mt-1">
                      {cell.docs.map(({ doc, expiry }) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => onOpenDocument(doc.id)}
                          className={`w-full text-left p-1 rounded text-[10px] font-mono-tabular truncate cursor-pointer ${
                            expiry.status === 'Expired'
                              ? 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-200'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200'
                          }`}
                        >
                          {doc.internalCode}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
