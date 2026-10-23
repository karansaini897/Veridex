import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileText,
  Upload,
  Sparkles,
  X,
  Building2,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import {
  ApplicationCategory,
  ApplicationRecord,
  AuditEvent,
  DocumentRecord,
  Institution,
  MainView,
  UserAccount,
} from '../types/portal';
import {
  buildCategoryChecklist,
  calculateExpiryDetails,
  canUserAccessApplication,
  canUserAccessDocument,
  REFERENCE_DATE,
} from '../lib/domain';

interface InstitutionalDashboardViewProps {
  currentUser: UserAccount;
  institution?: Institution;
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  auditEvents: AuditEvent[];
  onOpenApplication: (appId: string) => void;
  onOpenDocument: (docId: string) => void;
  onCreateApplication: (params: {
    category: ApplicationCategory;
    submitImmediately: boolean;
    demoDocumentTitle?: string;
    demoCertNumber?: string;
  }) => void;
  onNavigate: (view: MainView) => void;
}

const APPLICATION_CATEGORIES: ApplicationCategory[] = [
  'Extension of Approval (EoA) 2026-27',
  'New Course Approval (AI & Data Science)',
  'Increase in Intake (B.Tech CSE)',
  'Infrastructure & Lab Readiness Audit',
  'Faculty Cadre Ratio Compliance',
  'Post-Graduate Research Center Renewal',
];

export const InstitutionalDashboardView: React.FC<InstitutionalDashboardViewProps> = ({
  currentUser,
  institution,
  applications,
  documents,
  auditEvents,
  onOpenApplication,
  onOpenDocument,
  onCreateApplication,
  onNavigate,
}) => {
  const [newAppModalOpen, setNewAppModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ApplicationCategory>(
    'New Course Approval (AI & Data Science)'
  );
  const [includeSampleDoc, setIncludeSampleDoc] = useState(true);
  const [sampleDocTitle, setSampleDocTitle] = useState(
    'SPPU Statutory NOC & Lab Readiness Annex 2026-27'
  );
  const [sampleCertNumber, setSampleCertNumber] = useState('SPPU/NOC/2026/9941');

  // Strict authorization filtering
  const myApps = useMemo(
    () => applications.filter((a) => canUserAccessApplication(currentUser, a)),
    [applications, currentUser]
  );

  const myDocs = useMemo(
    () => documents.filter((d) => canUserAccessDocument(currentUser, d)),
    [documents, currentUser]
  );

  const actionRequiredApps = useMemo(
    () => myApps.filter((a) => a.status === 'Additional Information Required'),
    [myApps]
  );

  const flaggedOrExpiringDocs = useMemo(() => {
    return myDocs.filter((d) => {
      const exp = calculateExpiryDetails(d.expiryDate, REFERENCE_DATE);
      return (
        exp.status === 'Expired' ||
        exp.status === 'Expiring Soon' ||
        d.consistencyStatus === 'Mismatch Flagged (Simulated)' ||
        d.completenessStatus === 'Missing Pages/Fields (Simulated)' ||
        d.anomalyStatus === 'Suspected Alteration / Duplicate (Simulated)'
      );
    });
  }, [myDocs]);

  const previewChecklist = useMemo(
    () => buildCategoryChecklist(selectedCategory),
    [selectedCategory]
  );

  // Student Role Dedicated View
  if (currentUser.role === 'student') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Student Verified Records Workspace
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">
                {currentUser.fullName}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {currentUser.institutionName} · {currentUser.course} · {currentUser.yearSemester}
              </p>
            </div>
            <div className="text-right font-mono-tabular text-xs text-slate-600 dark:text-slate-400">
              <div>Roll / PRN: <strong>{currentUser.rollNumber}</strong></div>
              <div>Account Status: <strong>{currentUser.status}</strong></div>
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <strong>Role-Based Data Isolation Active:</strong> As a student account, you only have access to your own verified academic and scholarship documents and your personal profile. Institutional application workflows and other students' records are restricted.
          </div>
        </div>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
              My Authorized Academic &amp; Scholarship Records ({myDocs.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Edit My Profile
            </button>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {myDocs.map((doc) => (
              <div
                key={doc.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                      {doc.internalCode}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {doc.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono-tabular mt-1">
                    Certificate #{doc.certificateNumber} · Issued: {doc.issueDate} · Status: {doc.issuerVerificationStatus}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocument(doc.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer shrink-0"
                >
                  Inspect Record
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Institution Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400 font-medium">
              <Building2 className="w-4 h-4" />
              <span>
                {currentUser.role === 'faculty'
                  ? 'Faculty Compliance & Dossier Workspace'
                  : 'Authorized Institutional Compliance Portal'}
              </span>
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              {currentUser.institutionName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
              <span>Code: {currentUser.officialInstitutionCode}</span>
              {institution && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>AICTE Permanent ID: {institution.aictePermanentId}</span>
                  <span aria-hidden="true">·</span>
                  <span>University: {institution.affiliatedUniversity}</span>
                </>
              )}
            </div>
          </div>

          {currentUser.role === 'institutional_rep' && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('documents')}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Upload to Repository
              </button>
              <button
                type="button"
                onClick={() => setNewAppModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Application</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Urgent Action Banner for Correction Requests */}
      {actionRequiredApps.length > 0 && (
        <section
          aria-label="Action Required Applications"
          className="bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-900/70 rounded-xl p-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Action Required: AICTE Reviewer Requested Additional Information ({actionRequiredApps.length})
                </span>
              </div>
              {actionRequiredApps.map((app) => (
                <div key={app.id} className="text-xs text-red-900/90 dark:text-red-200/90 mt-1">
                  <strong className="font-mono-tabular">{app.id}</strong> ({app.category}):{' '}
                  {app.reviewNotes[app.reviewNotes.length - 1]?.note ||
                    'Please review flagged checklist documents and submit clarification.'}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onOpenApplication(actionRequiredApps[0].id)}
              className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
            >
              Respond &amp; Resubmit ({actionRequiredApps[0].id})
            </button>
          </div>
        </section>
      )}

      {/* Summary Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">Institution Applications</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-slate-900 dark:text-white mt-1">
            {myApps.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Scoped to {currentUser.officialInstitutionCode}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">Action / Clarification Needed</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-red-700 dark:text-red-400 mt-1">
            {actionRequiredApps.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting institutional response</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">Authorized Repository Docs</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-blue-700 dark:text-blue-400 mt-1">
            {myDocs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Linked to institutional dossiers</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500">Flagged or Expiring Docs</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-amber-700 dark:text-amber-400 mt-1">
            {flaggedOrExpiringDocs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Requires renewal or check</div>
        </div>
      </section>

      {/* Institution's Applications & Personalized Checklists */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-white">
              Institution Applications &amp; Category Checklists
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each application includes a category-specific checklist, status timeline, and simulated verification results.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {myApps.map((app) => {
            const totalChecklist = app.checklist.length;
            const completedChecklist = app.checklist.filter(
              (c) => c.status === 'Uploaded' || c.status === 'Verified (Simulated)'
            ).length;
            const flaggedItems = app.checklist.filter((c) => c.status === 'Flagged for Review');
            const latestHistory = app.statusHistory[app.statusHistory.length - 1];

            return (
              <div
                key={app.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-tabular font-bold text-sm text-blue-700 dark:text-blue-400">
                        {app.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                        {app.category}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono-tabular">
                      Status: <strong className="text-slate-900 dark:text-white">{app.status}</strong> · Submitted: {app.submittedDate} · Last Updated: {app.lastUpdated}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenApplication(app.id)}
                      className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>
                        {app.status === 'Draft'
                          ? 'Complete Checklist & Submit'
                          : app.status === 'Additional Information Required'
                            ? 'Respond & Resubmit'
                            : 'Open Application Dossier'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Personalized Checklist Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-8 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Personalized Category Checklist ({completedChecklist}/{totalChecklist} Ready)
                      </span>
                      {flaggedItems.length > 0 && (
                        <span className="text-red-700 dark:text-red-400 font-medium">
                          {flaggedItems.length} item(s) flagged for attention
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/70 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1">
                      {app.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="py-2 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                              {item.title}
                            </span>
                            {item.notes && (
                              <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[11px] font-mono-tabular whitespace-nowrap shrink-0 font-medium ${
                              item.status === 'Verified (Simulated)'
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

                  {/* Latest Status Change & Next Action */}
                  <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-xs space-y-2.5">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Latest Timeline Event
                      </div>
                      <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                        {latestHistory?.toStatus} ({latestHistory?.timestamp})
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {latestHistory?.note}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Next Action Required
                      </div>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mt-0.5">
                        {app.status === 'Draft'
                          ? 'Upload remaining checklist documents and submit dossier.'
                          : app.status === 'Additional Information Required'
                            ? 'Upload renewed certificate / clarification note and click Resubmit.'
                            : app.status === 'Decision Recorded'
                              ? `Completed: ${app.decisionOutcome}`
                              : 'Awaiting AICTE regional officer human review.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Flagged / Expiring Documents for this Institution */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
              Missing, Incomplete, Expired, or Flagged Documents ({flaggedOrExpiringDocs.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simulated document checks requiring institutional attention or certificate renewal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Open Document Repository
          </button>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {flaggedOrExpiringDocs.map((doc) => {
            const exp = calculateExpiryDetails(doc.expiryDate, REFERENCE_DATE);
            return (
              <div
                key={doc.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                      {doc.internalCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate">
                      {doc.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Cert #{doc.certificateNumber} · Expiry: {exp.label} · Consistency: {doc.consistencyStatus}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocument(doc.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Inspect / Replace Version
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Start New Application Modal */}
      {newAppModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-application-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 id="new-application-title" className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  Start New Institutional Application (2026–27)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentUser.institutionName} ({currentUser.officialInstitutionCode})
                </p>
              </div>
              <button
                type="button"
                aria-label="Close new application dialog"
                onClick={() => setNewAppModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-app-category"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Select Application Category
                </label>
                <select
                  id="new-app-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as ApplicationCategory)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  {APPLICATION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tailored Category Checklist Preview */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Personalized Checklist for {selectedCategory} ({previewChecklist.length} items)
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {previewChecklist.map((item, idx) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span>
                        {idx + 1}. {item.title}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-500">
                        {item.documentCategory} · {item.required ? 'Mandatory' : 'Optional'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Option to attach a clearly labelled Demo Document right now */}
              <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSampleDoc}
                    onChange={(e) => setIncludeSampleDoc(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>
                    Upload &amp; Run Simulated Validation on First Checklist Document Now (Demo)
                  </span>
                </label>

                {includeSampleDoc && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label
                        htmlFor="demo-doc-title"
                        className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Demo Document Title
                      </label>
                      <input
                        id="demo-doc-title"
                        type="text"
                        value={sampleDocTitle}
                        onChange={(e) => setSampleDocTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="demo-cert-num"
                        className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Certificate Reference Number
                      </label>
                      <input
                        id="demo-cert-num"
                        type="text"
                        value={sampleCertNumber}
                        onChange={(e) => setSampleCertNumber(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono-tabular"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setNewAppModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateApplication({
                    category: selectedCategory,
                    submitImmediately: false,
                    demoDocumentTitle: includeSampleDoc ? sampleDocTitle : undefined,
                    demoCertNumber: includeSampleDoc ? sampleCertNumber : undefined,
                  });
                  setNewAppModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateApplication({
                    category: selectedCategory,
                    submitImmediately: true,
                    demoDocumentTitle: includeSampleDoc ? sampleDocTitle : undefined,
                    demoCertNumber: includeSampleDoc ? sampleCertNumber : undefined,
                  });
                  setNewAppModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer"
              >
                Create &amp; Submit Application Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
