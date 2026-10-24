import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Plus,
  AlertTriangle,
  ArrowRight,
  X,
  Building2,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
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
} from 'recharts';
import {
  ApplicationCategory,
  ApplicationRecord,
  AuditEvent,
  DocumentRecord,
  DocumentSubmissionRequest,
  Institution,
  MainView,
  StudentRequestSubmission,
  UserAccount,
} from '../types/portal';
import {
  buildCategoryChecklist,
  calculateExpiryDetails,
  canUserAccessApplication,
  canUserAccessDocument,
  computeInstitutionChartData,
  getLocalTodayDate,
} from '../lib/domain';
import {
  AnimatedMetricValue,
  EmptyStateCard,
  FileTypeMarker,
  StatusBadge,
} from './StatusPrimitives';
import { FacultyDirectorySection } from './FacultyDirectorySection';
import { StudentDirectorySection } from './StudentDirectorySection';
import { RequestManagementSection } from './RequestManagementSection';
import { DocumentRequestCreationModal } from './DocumentRequestCreationModal';
import { StudentDocumentSubmissionModal } from './StudentDocumentSubmissionModal';

interface InstitutionalDashboardViewProps {
  currentUser: UserAccount;
  institution?: Institution;
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
  auditEvents: AuditEvent[];
  pendingApprovalCount?: number;
  allUsers?: UserAccount[];
  documentRequests?: DocumentSubmissionRequest[];
  studentSubmissions?: StudentRequestSubmission[];
  onCreateDocumentRequest?: (newReq: DocumentSubmissionRequest) => void;
  onSubmitStudentDocuments?: (sub: StudentRequestSubmission) => void;
  onOpenApplication: (appId: string) => void;
  onOpenDocument: (docId: string) => void;
  onCreateApplication: (params: {
    category: ApplicationCategory;
    submitImmediately: boolean;
    initialDocumentTitle?: string;
    initialCertNumber?: string;
  }) => void;
  onNavigate: (view: MainView) => void;
}

const APPLICATION_CATEGORIES: ApplicationCategory[] = [
  'Extension of Approval (EoA)',
  'New Course Approval (AI & Data Science)',
  'Increase in Intake (B.Tech CSE)',
  'Infrastructure & Lab Readiness Audit',
  'Faculty Cadre Ratio Compliance',
  'Post-Graduate Research Center Renewal',
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

export const InstitutionalDashboardView: React.FC<InstitutionalDashboardViewProps> = ({
  currentUser,
  institution,
  applications,
  documents,
  auditEvents,
  pendingApprovalCount = 0,
  allUsers = [],
  documentRequests = [],
  studentSubmissions = [],
  onCreateDocumentRequest,
  onSubmitStudentDocuments,
  onOpenApplication,
  onOpenDocument,
  onCreateApplication,
  onNavigate,
}) => {
  const [newAppModalOpen, setNewAppModalOpen] = useState(false);
  const [createRequestModalOpen, setCreateRequestModalOpen] = useState(false);
  const [selectedRequestForSubmission, setSelectedRequestForSubmission] =
    useState<DocumentSubmissionRequest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ApplicationCategory>(
    'New Course Approval (AI & Data Science)'
  );
  const [includeInitialDoc, setIncludeInitialDoc] = useState(true);
  const [initialDocTitle, setInitialDocTitle] = useState(
    'University of Mumbai Academic Council NOC & Lab Readiness Annex'
  );
  const [initialCertNumber, setInitialCertNumber] = useState('UOM/NOC/2026/9941');
  const prefersReducedMotion = useReducedMotion();
  const todayStr = getLocalTodayDate();

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
      const exp = calculateExpiryDetails(d.expiryDate, todayStr);
      return (
        exp.status === 'Expired' ||
        exp.status === 'Expiring Soon' ||
        d.consistencyStatus === 'Mismatch Flagged' ||
        d.completenessStatus === 'Missing Pages/Fields' ||
        d.anomalyStatus === 'Suspected Alteration / Duplicate'
      );
    });
  }, [myDocs, todayStr]);

  const previewChecklist = useMemo(
    () => buildCategoryChecklist(selectedCategory),
    [selectedCategory]
  );

  const instChartData = useMemo(
    () => computeInstitutionChartData(myApps, myDocs, todayStr),
    [myApps, myDocs, todayStr]
  );

  const studentChartData = useMemo(() => {
    return myDocs.map((doc) => {
      const checks = [
        doc.completenessStatus === 'Complete',
        doc.consistencyStatus === 'Consistent',
        doc.issuerVerificationStatus === 'Verified',
        doc.humanReviewStatus === 'Reviewed',
      ];
      const passedCount = checks.filter(Boolean).length;
      const totalPillars = checks.length;
      return {
        code: doc.internalCode,
        title: doc.name,
        verifiedPillars: passedCount,
        totalPillars,
        readinessScore: Math.round((passedCount / totalPillars) * 100),
      };
    });
  }, [myDocs]);

  // Student Role Dedicated View
  if (currentUser.role === 'student') {
    return (
      <motion.div
        variants={DASHBOARD_CONTAINER_VARIANTS}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div
          variants={DASHBOARD_ITEM_VARIANTS}
          className="liquid-glass rounded-2xl p-6"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Student Verified Records Workspace
              </div>
              <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mt-1">
                {currentUser.fullName}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {currentUser.institutionName} · Dept: {currentUser.academicDepartment || currentUser.department || 'CMPN'} · {currentUser.academicYear || currentUser.yearSemester || 'Second Year'} · Division: {currentUser.division || 'A'}
              </p>
            </div>
            <div className="text-right font-mono-tabular text-xs text-slate-600 dark:text-slate-400">
              {currentUser.rollNumber && (
                <div>Roll / PRN: <strong>{currentUser.rollNumber}</strong></div>
              )}
              <div>Account Status: <strong>{currentUser.status}</strong></div>
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <strong>Role-Based Data Isolation Active:</strong> As a student account, you only have access to your own verified academic and scholarship documents and your personal profile. Institutional application workflows and other students' records are restricted.
          </div>
        </motion.div>

        {/* Active Document & Application Requests Issued to Student */}
        {(() => {
          const studentRequests = documentRequests.filter((r) =>
            r.recipientStudentIds.includes(currentUser.id)
          );

          if (studentRequests.length === 0) return null;

          return (
            <motion.section
              variants={DASHBOARD_ITEM_VARIANTS}
              aria-label="Active Document Requests"
              className="liquid-glass glass-tint-amber rounded-2xl p-5 border-2 border-[#C2410C]/45 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#C2410C]" />
                  <div>
                    <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
                      Official Document &amp; Application Requests ({studentRequests.length})
                    </h2>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      Requests issued by your institution manager or class teacher requiring document submission.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#C2410C] text-white text-[10px] font-mono-tabular font-bold">
                  Action Required
                </span>
              </div>

              <div className="space-y-3">
                {studentRequests.map((req) => {
                  const sub = studentSubmissions.find(
                    (s) => s.requestId === req.id && s.studentId === currentUser.id
                  );
                  const isVerified = sub?.status === 'Verified in demo';
                  const isNeedsReview = sub?.status === 'Needs review in demo';
                  const isPending = !sub || sub.status === 'Pending';

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-[#C2410C]/35 space-y-3 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[11px] font-mono-tabular">
                            <span className="font-bold text-[#C2410C]">{req.id}</span>
                            <span>·</span>
                            <span className="text-stone-500">
                              Issued by {req.creatorName} ({req.creatorRole === 'institutional_rep' ? 'Institution Manager' : req.creatorRole})
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-base text-stone-900 dark:text-white">
                            {req.title}
                          </h3>
                          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                            {req.description}
                          </p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                          <span className="text-[11px] font-mono-tabular text-stone-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#046A38]" />
                            <span>Deadline: <strong>{req.deadline}</strong></span>
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono-tabular inline-flex items-center gap-1 ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : isNeedsReview
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                            }`}
                          >
                            {isVerified && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isNeedsReview && <AlertCircle className="w-3.5 h-3.5" />}
                            {isPending && <Clock className="w-3.5 h-3.5" />}
                            <span>{sub?.status || 'Pending Submission'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-1 text-xs">
                        <span className="font-bold text-stone-800 dark:text-stone-200 block text-[11px]">
                          Required Documents ({req.requiredDocuments.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-400">
                          {req.requiredDocuments.map((doc, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#C2410C] font-bold">✓</span>
                              <div>
                                <span className="font-semibold text-stone-900 dark:text-white">
                                  {doc.name}
                                </span>
                                <span className="block text-[10px] text-stone-500">
                                  {doc.description}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {sub?.verificationFeedback && (
                        <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-[#046A38]/30 text-[11px] text-emerald-900 dark:text-emerald-300">
                          <strong>Simulated Verification Outcome:</strong> {sub.verificationFeedback}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-stone-500 font-mono-tabular">
                          {sub?.documents?.length
                            ? `${sub.documents.length} document(s) uploaded in current session`
                            : 'No files submitted yet'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedRequestForSubmission(req)}
                          className="btn-primary !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isPending ? 'Submit Documents' : 'View / Replace Documents'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          );
        })()}

        {/* Student Record Verification Analytics Chart */}
        {studentChartData.length > 0 && (
          <motion.section
            variants={DASHBOARD_ITEM_VARIANTS}
            aria-label="Student Record Verification Analytics"
            className="liquid-glass rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#046A38] dark:text-emerald-400">
                  <BarChart3 className="w-4 h-4" />
                  <span>My Record Verification Readiness</span>
                </div>
                <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white mt-0.5">
                  Verification Pillar Score by Authorized Student Record (%)
                </h2>
              </div>
            </div>
            <div className="h-48 w-full" data-testid="student-verification-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={studentChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)' }} />
                  <YAxis type="category" dataKey="code" width={110} tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)', fontWeight: 600 }} />
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
                    formatter={(val) => [`${val ?? 0}% Verified`, 'Readiness']}
                  />
                  <Bar
                    dataKey="readinessScore"
                    name="Verification Readiness %"
                    fill="#046A38"
                    radius={[0, 6, 6, 0]}
                    barSize={22}
                    isAnimationActive={!prefersReducedMotion}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>
        )}

        <motion.section
          variants={DASHBOARD_ITEM_VARIANTS}
          className="liquid-glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-display font-bold text-stone-900 dark:text-white">
              My Authorized Academic &amp; Scholarship Records ({myDocs.length})
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-xs font-semibold text-[#C2410C] dark:text-amber-400 hover:underline cursor-pointer"
            >
              Edit My Profile
            </button>
          </div>

          <div className="divide-y divide-stone-200/80 dark:divide-stone-800">
            {myDocs.map((doc) => (
              <div
                key={doc.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-mono-tabular font-semibold text-[#C2410C] dark:text-amber-400">
                      {doc.internalCode}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-stone-900 dark:text-white">
                      {doc.name}
                    </span>
                    <FileTypeMarker mimeType={doc.mimeType} fileName={doc.fileName} fileSize={doc.fileSize} />
                    <StatusBadge status={doc.issuerVerificationStatus} size="sm" />
                  </div>
                  <div className="text-xs text-stone-500 font-mono-tabular mt-1">
                    Certificate #{doc.certificateNumber} · Issued: {doc.issueDate}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocument(doc.id)}
                  className="btn-primary !py-1.5 !px-3.5 shrink-0"
                >
                  Inspect Record
                </button>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Student Document Submission Modal */}
        <AnimatePresence>
          {selectedRequestForSubmission && (
            <StudentDocumentSubmissionModal
              student={currentUser}
              request={selectedRequestForSubmission}
              existingSubmission={
                studentSubmissions.find(
                  (s) =>
                    s.requestId === selectedRequestForSubmission.id &&
                    s.studentId === currentUser.id
                ) || null
              }
              onClose={() => setSelectedRequestForSubmission(null)}
              onSubmitSuccess={(updatedSub) => {
                if (onSubmitStudentDocuments) {
                  onSubmitStudentDocuments(updatedSub);
                }
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={DASHBOARD_CONTAINER_VARIANTS}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Institution Header */}
      <motion.div
        variants={DASHBOARD_ITEM_VARIANTS}
        className="liquid-glass rounded-2xl p-5 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#C2410C] dark:text-amber-400 font-bold">
              <Building2 className="w-4 h-4 text-[#046A38] dark:text-emerald-400" />
              <span>
                {currentUser.role === 'faculty'
                  ? `Faculty Compliance & Class Teacher Workspace (${currentUser.academicDepartment || 'CMPN'} · ${currentUser.academicYear || 'Second Year'} · Div ${currentUser.classTeacherDivision || 'A'})`
                  : 'Authorized Institutional Manager Compliance Portal'}
              </span>
            </div>
            <h1 className="text-2xl font-display font-bold text-stone-900 dark:text-white tracking-tight">
              {currentUser.institutionName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-stone-400 font-mono-tabular">
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

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('accounts')}
              data-testid="dashboard-open-approvals-btn"
              className="btn-secondary whitespace-nowrap shrink-0"
            >
              Account Approvals {pendingApprovalCount > 0 ? `(${pendingApprovalCount})` : ''}
            </button>
            {currentUser.role === 'institutional_rep' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('documents')}
                  className="btn-secondary whitespace-nowrap shrink-0"
                >
                  Register Document Record
                </button>
                <button
                  type="button"
                  onClick={() => setNewAppModalOpen(true)}
                  className="btn-secondary flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Application</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setCreateRequestModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Create Document Request</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Urgent Action Banner for Correction Requests */}
      {actionRequiredApps.length > 0 && (
        <motion.section
          variants={DASHBOARD_ITEM_VARIANTS}
          aria-label="Action Required Applications"
          className="liquid-glass glass-tint-crimson rounded-2xl p-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Action Required: AICTE Reviewer Requested Additional Information ({actionRequiredApps.length})
                </span>
              </div>
              {actionRequiredApps.map((app) => (
                <div key={app.id} className="text-xs text-stone-800 dark:text-stone-200 mt-1">
                  <strong className="font-mono-tabular text-red-800 dark:text-red-300">{app.id}</strong> ({app.category}):{' '}
                  {app.reviewNotes[app.reviewNotes.length - 1]?.note ||
                    'Please review flagged checklist documents and submit clarification.'}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onOpenApplication(actionRequiredApps[0].id)}
              className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              Respond &amp; Resubmit ({actionRequiredApps[0].id})
            </button>
          </div>
        </motion.section>
      )}

      {/* Institution Manager: Faculty Directory */}
      {currentUser.role === 'institutional_rep' && allUsers.length > 0 && (
        <motion.div variants={DASHBOARD_ITEM_VARIANTS}>
          <FacultyDirectorySection currentUser={currentUser} allUsers={allUsers} />
        </motion.div>
      )}

      {/* Faculty: Assigned Students Directory */}
      {currentUser.role === 'faculty' && allUsers.length > 0 && (
        <motion.div variants={DASHBOARD_ITEM_VARIANTS}>
          <StudentDirectorySection
            currentTeacher={currentUser}
            allUsers={allUsers}
            submissions={studentSubmissions}
          />
        </motion.div>
      )}

      {/* Application & Document Requests Management Tracker */}
      {documentRequests.length > 0 && (
        <motion.div variants={DASHBOARD_ITEM_VARIANTS}>
          <RequestManagementSection
            currentUser={currentUser}
            allUsers={allUsers}
            requests={
              currentUser.role === 'faculty'
                ? documentRequests.filter(
                    (r) =>
                      r.creatorUserId === currentUser.id ||
                      r.department === currentUser.academicDepartment
                  )
                : documentRequests.filter(
                    (r) =>
                      r.institutionId === currentUser.institutionId ||
                      currentUser.role === 'admin'
                  )
            }
            submissions={studentSubmissions}
            onCreateNewRequest={() => setCreateRequestModalOpen(true)}
          />
        </motion.div>
      )}

      {/* Interactive Summary Strip */}
      <motion.section
        aria-label="Institutional Summary Metrics"
        variants={METRICS_GRID_VARIANTS}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => onNavigate('applications')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Institution Applications</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-stone-900 dark:text-white mt-1">
            <AnimatedMetricValue value={myApps.length} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Scoped to {currentUser.officialInstitutionCode}</div>
        </motion.button>

        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => {
            if (actionRequiredApps[0]) {
              onOpenApplication(actionRequiredApps[0].id);
            } else {
              onNavigate('applications');
            }
          }}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Action / Clarification Needed</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-red-700 dark:text-red-400 mt-1">
            <AnimatedMetricValue value={actionRequiredApps.length} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Awaiting institutional response</div>
        </motion.button>

        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => onNavigate('documents')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Authorized Repository Docs</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-[#1D4ED8] dark:text-sky-400 mt-1">
            <AnimatedMetricValue value={myDocs.length} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Linked to institutional dossiers</div>
        </motion.button>

        <motion.button
          type="button"
          variants={DASHBOARD_ITEM_VARIANTS}
          onClick={() => onNavigate('expiry')}
          className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left cursor-pointer"
        >
          <div className="text-xs font-medium text-stone-600 dark:text-stone-400">Flagged or Expiring Docs</div>
          <div className="text-2xl font-display font-bold font-mono-tabular text-[#C2410C] dark:text-amber-400 mt-1">
            <AnimatedMetricValue value={flaggedOrExpiringDocs.length} />
          </div>
          <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">Requires renewal or check</div>
        </motion.button>
      </motion.section>

      {/* Institutional Recharts Data Visualization Section */}
      <motion.section
        aria-label="Institutional Compliance Analytics"
        variants={DASHBOARD_ITEM_VARIANTS}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Left 6 Cols: Dossier Checklist Completion & Verification Breakdown */}
        <div className="lg:col-span-6 liquid-glass rounded-2xl p-5 flex flex-col justify-between overflow-visible">
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#046A38] dark:text-emerald-400">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Application Checklist Progress</span>
            </div>
            <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white mt-0.5">
              Dossier Checklist Readiness ({currentUser.officialInstitutionCode})
            </h2>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              Separate side-by-side comparison of Verified, Uploaded, Flagged for Review, and Pending checklist items.
            </p>
          </div>

          <div className="h-60 w-full" data-testid="institute-dossier-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={instChartData.dossierReadiness}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                barGap={6}
                barCategoryGap="24%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" />
                <XAxis dataKey="appId" tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)', fontWeight: 600 }} />
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
                <Bar dataKey="verified" name="Verified" fill="#046A38" maxBarSize={28} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                <Bar dataKey="uploaded" name="Uploaded" fill="#1D4ED8" maxBarSize={28} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                <Bar dataKey="flagged" name="Flagged for Review" fill="#C2410C" maxBarSize={28} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
                <Bar dataKey="pendingUpload" name="Pending Upload" fill="#A8A29E" maxBarSize={28} radius={[4, 4, 0, 0]} isAnimationActive={!prefersReducedMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 mt-2 border-t border-[#C2410C]/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular">
            <span>Scoped Dossiers: {myApps.length}</span>
            <span>·</span>
            <span>Action Required: {actionRequiredApps.length}</span>
          </div>
        </div>

        {/* Right 6 Cols: Repository Document Health by Category */}
        <div className="lg:col-span-6 liquid-glass rounded-2xl p-5 flex flex-col justify-between overflow-visible">
          <div className="mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#046A38] dark:text-emerald-400">
              <PieChartIcon className="w-4 h-4 shrink-0" />
              <span>Repository Document Health &amp; Expiry Status</span>
            </div>
            <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white mt-0.5">
              Clean vs Attention-Needed Certificates by Category
            </h2>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              Separate side-by-side comparison of valid certificates and flagged/expiring items per category.
            </p>
          </div>

          <div className="h-60 w-full" data-testid="institute-category-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={instChartData.documentCategoryHealth}
                layout="vertical"
                margin={{ top: 4, right: 18, left: 8, bottom: 4 }}
                barGap={4}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid-stroke)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--chart-axis-fill)' }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={98}
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
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="verifiedClean" name="Valid & Consistent" fill="#046A38" barSize={10} radius={[0, 4, 4, 0]} isAnimationActive={!prefersReducedMotion} />
                <Bar
                  dataKey="attentionNeeded"
                  name="Flagged / Expiring"
                  fill="#C2410C"
                  radius={[0, 4, 4, 0]}
                  barSize={10}
                  isAnimationActive={!prefersReducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 mt-2 border-t border-[#C2410C]/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-400 font-mono-tabular">
            {instChartData.expirySummary.map((item) => (
              <span key={item.name}>
                {item.name}: <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Institution's Applications & Personalized Checklists */}
      <motion.section variants={DASHBOARD_ITEM_VARIANTS} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-display font-bold text-stone-900 dark:text-white">
              Institution Applications &amp; Category Checklists
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Each application includes a category-specific statutory checklist, status timeline, and verification findings.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {myApps.map((app) => {
            const totalChecklist = app.checklist.length;
            const completedChecklist = app.checklist.filter(
              (c) => c.status === 'Uploaded' || c.status === 'Verified'
            ).length;
            const flaggedItems = app.checklist.filter((c) => c.status === 'Flagged for Review');
            const latestHistory = app.statusHistory[app.statusHistory.length - 1];

            return (
              <div
                key={app.id}
                className="liquid-glass rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 dark:border-stone-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-tabular font-bold text-sm text-[#C2410C] dark:text-amber-400">
                        {app.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <h3 className="font-display font-bold text-base text-stone-900 dark:text-white">
                        {app.category}
                      </h3>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-mono-tabular">
                      Submitted: {app.submittedDate} · Last Updated: {app.lastUpdated}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenApplication(app.id)}
                      className="btn-primary flex items-center gap-1.5"
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
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        Personalized Category Checklist ({completedChecklist}/{totalChecklist} Ready)
                      </span>
                      {flaggedItems.length > 0 && (
                        <span className="text-red-700 dark:text-red-400 font-semibold">
                          {flaggedItems.length} item(s) flagged for attention
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-stone-200/70 dark:divide-stone-800/70 rounded-xl px-3.5 py-1.5 liquid-glass-subtle">
                      {app.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="py-2 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="text-stone-800 dark:text-stone-200 font-medium">
                              {item.title}
                            </span>
                            {item.notes && (
                              <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={item.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Latest Status Change & Next Action */}
                  <div className="lg:col-span-4 liquid-glass-subtle rounded-xl p-3.5 text-xs space-y-2.5">
                    <div>
                      <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                        Latest Timeline Event
                      </div>
                      <div className="font-medium text-stone-900 dark:text-white mt-0.5">
                        {latestHistory?.toStatus} ({latestHistory?.timestamp})
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                        {latestHistory?.note}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800">
                      <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                        Next Action Required
                      </div>
                      <p className="text-xs font-semibold text-[#C2410C] dark:text-amber-400 mt-0.5">
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
      </motion.section>

      {/* Flagged / Expiring Documents for this Institution */}
      <motion.section
        variants={DASHBOARD_ITEM_VARIANTS}
        className="liquid-glass rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-display font-bold text-stone-900 dark:text-white">
              Missing, Incomplete, Expired, or Flagged Documents ({flaggedOrExpiringDocs.length})
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Document verification checks requiring institutional attention or statutory certificate renewal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className="text-xs font-semibold text-[#C2410C] dark:text-amber-400 hover:underline cursor-pointer"
          >
            Open Document Repository
          </button>
        </div>

        <div className="divide-y divide-stone-200/80 dark:divide-stone-800">
          {flaggedOrExpiringDocs.map((doc) => {
            const exp = calculateExpiryDetails(doc.expiryDate, todayStr);
            return (
              <div
                key={doc.id}
                className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-mono-tabular font-semibold text-[#C2410C] dark:text-amber-400">
                      {doc.internalCode}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-stone-900 dark:text-white truncate">
                      {doc.name}
                    </span>
                    <FileTypeMarker mimeType={doc.mimeType} fileName={doc.fileName} />
                    <StatusBadge status={exp.status} customLabel={exp.label} size="sm" />
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-1">
                    Cert #{doc.certificateNumber} · Consistency: {doc.consistencyStatus}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDocument(doc.id)}
                  className="btn-secondary !py-1.5 !px-3 whitespace-nowrap shrink-0"
                >
                  Inspect / Replace Version
                </button>
              </div>
            );
          })}
          {flaggedOrExpiringDocs.length === 0 && (
            <EmptyStateCard
              title="All Institutional Certificates Valid"
              description="No missing, expired, or flagged documents were detected for your institution."
            />
          )}
        </div>
      </motion.section>

      {/* Start New Application Modal */}
      <AnimatePresence>
        {newAppModalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-application-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center glass-modal-backdrop p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="liquid-glass-floating rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5"
            >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 id="new-application-title" className="text-lg font-display font-bold text-slate-900 dark:text-white">
                  Initiate New Institutional Compliance Application
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
                  Statutory Checklist for {selectedCategory} ({previewChecklist.length} items)
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

              {/* Option to register primary supporting document metadata right now */}
              <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeInitialDoc}
                    onChange={(e) => setIncludeInitialDoc(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>
                    Register First Checklist Document Record Upon Creation
                  </span>
                </label>

                {includeInitialDoc && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label
                        htmlFor="initial-doc-title"
                        className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Supporting Document Title
                      </label>
                      <input
                        id="initial-doc-title"
                        type="text"
                        value={initialDocTitle}
                        onChange={(e) => setInitialDocTitle(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="initial-cert-num"
                        className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1"
                      >
                        Certificate Reference Number
                      </label>
                      <input
                        id="initial-cert-num"
                        type="text"
                        value={initialCertNumber}
                        onChange={(e) => setInitialCertNumber(e.target.value)}
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
                    initialDocumentTitle: includeInitialDoc ? initialDocTitle : undefined,
                    initialCertNumber: includeInitialDoc ? initialCertNumber : undefined,
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
                    initialDocumentTitle: includeInitialDoc ? initialDocTitle : undefined,
                    initialCertNumber: includeInitialDoc ? initialCertNumber : undefined,
                  });
                  setNewAppModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer"
              >
                Create &amp; Submit Application Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Document Request Creation Modal */}
      <AnimatePresence>
        {createRequestModalOpen && (
          <DocumentRequestCreationModal
            currentUser={currentUser}
            allUsers={allUsers}
            onClose={() => setCreateRequestModalOpen(false)}
            onCreateRequest={(newReq) => {
              if (onCreateDocumentRequest) {
                onCreateDocumentRequest(newReq);
              }
              setCreateRequestModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
