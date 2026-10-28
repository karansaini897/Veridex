import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
} from 'lucide-react';
import {
  ApplicationCategory,
  ApplicationRecord,
  ComplianceRule,
  DocumentCategory,
  DocumentRecord,
  UserAccount,
} from '../types/portal';
import {
  calculateExpiryDetails,
  canUserAccessApplication,
  canUserAccessDocument,
  canUserPerformAdminAction,
  evaluateApplicationComplianceMatrix,
  getLocalTodayDate,
} from '../lib/domain';
import {
  cardEntranceVariants,
  inlinePanelVariants,
  sectionEntranceVariants,
  staggerContainerVariants,
} from '../lib/motion';
import {
  EmptyStateCard,
  FileTypeMarker,
  StatusBadge,
} from './StatusPrimitives';

interface VerificationComplianceViewProps {
  currentUser: UserAccount;
  documents: DocumentRecord[];
  complianceRules: ComplianceRule[];
  applications?: ApplicationRecord[];
  onOpenApplication?: (appId: string) => void;
  onRunAllVerificationChecks?: () => void;
  onOpenDocument: (docId: string) => void;
  onToggleRuleActive: (ruleId: string) => void;
  onAddComplianceRule: (newRule: Omit<ComplianceRule, 'id'>) => void;
  onAddInfrastructureEvidence: (params: {
    facilityTitle: string;
    carpetAreaSqm: number;
    certNumber: string;
  }) => void;
}

export const VerificationComplianceView: React.FC<VerificationComplianceViewProps> = ({
  currentUser,
  documents,
  complianceRules,
  applications = [],
  onOpenApplication,
  onRunAllVerificationChecks,
  onOpenDocument,
  onToggleRuleActive,
  onAddComplianceRule,
  onAddInfrastructureEvidence,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pillars' | 'rules' | 'infrastructure'>('pillars');
  const [pillarFilter, setPillarFilter] = useState<'all' | 'flagged' | 'pending_human'>('all');
  const [screeningBanner, setScreeningBanner] = useState<string | null>(null);
  const [selectedEvalAppId, setSelectedEvalAppId] = useState<string>('');

  // New Compliance Rule State
  const [newRuleOpen, setNewRuleOpen] = useState(false);
  const [ruleCode, setRuleCode] = useState('APH-2026-LAB-06');
  const [ruleName, setRuleName] = useState('Barrier-Free Campus & Ramp Accessibility Compliance');
  const [ruleVersion, setRuleVersion] = useState('v2.1 (RPwD Act Norms)');
  const [ruleEffectiveDate, setRuleEffectiveDate] = useState('2026-06-01');
  const [ruleCategory, setRuleCategory] = useState<ApplicationCategory | 'All Categories'>('All Categories');
  const [ruleDocCategory, setRuleDocCategory] = useState<DocumentCategory>('Infrastructure');
  const [ruleMinValidity, setRuleMinValidity] = useState(60);
  const [ruleDesc, setRuleDesc] = useState(
    'Requires structural certification and photographic evidence of ramp, lift, and accessible washroom facilities across academic blocks.'
  );

  // New Infrastructure Evidence State
  const [infraModalOpen, setInfraModalOpen] = useState(false);
  const [facilityTitle, setFacilityTitle] = useState(
    'VLSI & Embedded Systems Lab (Block B, Room 208) Inspection Pack'
  );
  const [carpetAreaSqm, setCarpetAreaSqm] = useState(136);
  const [infraCertNo, setInfraCertNo] = useState('VESIT/INFRA/VLSI/2026/11');

  const isAdmin = canUserPerformAdminAction(currentUser);
  const todayStr = getLocalTodayDate();

  const authorizedDocs = useMemo(
    () => documents.filter((d) => canUserAccessDocument(currentUser, d)),
    [documents, currentUser]
  );

  const authorizedApps = useMemo(
    () => applications.filter((a) => canUserAccessApplication(currentUser, a)),
    [applications, currentUser]
  );

  const activeEvalApp = useMemo(() => {
    if (authorizedApps.length === 0) return null;
    return authorizedApps.find((a) => a.id === selectedEvalAppId) || authorizedApps[0];
  }, [authorizedApps, selectedEvalAppId]);

  const activeEvalMatrix = useMemo(() => {
    if (!activeEvalApp) return [];
    const linked = authorizedDocs.filter(
      (d) => activeEvalApp.documentIds.includes(d.id) || d.relatedApplicationId === activeEvalApp.id
    );
    return evaluateApplicationComplianceMatrix(activeEvalApp, linked, complianceRules, todayStr);
  }, [activeEvalApp, authorizedDocs, complianceRules, todayStr]);

  const filteredPillarDocs = useMemo(() => {
    return authorizedDocs.filter((doc) => {
      const exp = calculateExpiryDetails(doc.expiryDate, todayStr);
      const isFlagged =
        exp.status === 'Expired' ||
        exp.status === 'Expiring Soon' ||
        doc.completenessStatus.includes('Missing') ||
        doc.consistencyStatus.includes('Mismatch') ||
        doc.anomalyStatus.includes('Suspected') ||
        doc.issuerVerificationStatus === 'Failed';

      if (pillarFilter === 'flagged') return isFlagged;
      if (pillarFilter === 'pending_human') return doc.humanReviewStatus !== 'Reviewed';
      return true;
    });
  }, [authorizedDocs, pillarFilter, todayStr]);

  const infraDocs = useMemo(
    () => authorizedDocs.filter((d) => d.isInfrastructureEvidence || d.category === 'Infrastructure'),
    [authorizedDocs]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Evidence-Linked Verification &amp; Regulatory Compliance Engine
          </p>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Verification &amp; Compliance Workspace
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Automated checks are strictly separated from issuer confirmation and human decisions. Suspected anomalies are investigation prompts, not proof of forgery.
          </p>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('pillars')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'pillars'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            6-Pillar Document Checks ({authorizedDocs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('rules')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'rules'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Compliance Rules ({complianceRules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('infrastructure')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'infrastructure'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Infrastructure Evidence ({infraDocs.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: 6-PILLAR DOCUMENT VERIFICATION MATRIX */}
      <AnimatePresence mode="wait">
      {activeSubTab === 'pillars' && (
        <motion.div
          key="pillars-tab"
          variants={sectionEntranceVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `All Authorized Docs (${authorizedDocs.length})` },
                  { id: 'flagged', label: 'Flagged on Any Pillar' },
                  { id: 'pending_human', label: 'Awaiting Human Review' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPillarFilter(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    pillarFilter === t.id
                      ? 'bg-slate-900 text-white dark:bg-blue-600'
                      : 'liquid-glass-subtle text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-slate-500">
                Showing authorized institutional records across all 6 verification pillars.
              </span>
              {onRunAllVerificationChecks && (
                <button
                  type="button"
                  data-testid="rerun-six-pillar-checks-btn"
                  onClick={() => {
                    onRunAllVerificationChecks();
                    setScreeningBanner(
                      `Re-evaluated all ${authorizedDocs.length} authorized document records for completeness, expiry windows, cross-document consistency, and rule-based anomalies. Audit entry logged.`
                    );
                  }}
                  className="btn-secondary !py-1.5 !px-3 text-xs cursor-pointer"
                >
                  Re-Run 6-Pillar Checks
                </button>
              )}
            </div>
          </div>

          {screeningBanner && (
            <div className="p-3 rounded-xl glass-tint-emerald text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
              <span>{screeningBanner}</span>
              <button
                type="button"
                onClick={() => setScreeningBanner(null)}
                className="text-emerald-700 dark:text-emerald-300 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="liquid-glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Code &amp; Document</th>
                    <th className="py-2.5 px-2">1. Completeness</th>
                    <th className="py-2.5 px-2">2. Expiry</th>
                    <th className="py-2.5 px-2">3. Consistency</th>
                    <th className="py-2.5 px-2">4. Anomaly</th>
                    <th className="py-2.5 px-2">5. Issuer Check</th>
                    <th className="py-2.5 px-2">6. Human Review</th>
                    <th className="py-2.5 px-3 text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                  {filteredPillarDocs.map((doc) => {
                    const exp = calculateExpiryDetails(doc.expiryDate, todayStr);
                    return (
                      <tr key={doc.id} className="hover:bg-stone-50/90 dark:hover:bg-stone-800/40">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono-tabular font-semibold text-[#C2410C] dark:text-amber-400 text-[11px]">
                              {doc.internalCode}
                            </span>
                            <FileTypeMarker mimeType={doc.mimeType} fileName={doc.fileName} />
                          </div>
                          <div className="font-medium text-stone-900 dark:text-white max-w-[215px] truncate mt-0.5" title={doc.name}>
                            {doc.name}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate max-w-[215px]">
                            {doc.institutionName}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-[11px]">
                          <StatusBadge
                            status={doc.completenessStatus}
                            customLabel={
                              doc.completenessStatus.includes('Missing')
                                ? 'Missing Pages'
                                : doc.completenessStatus
                            }
                            size="sm"
                          />
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-[11px]">
                          <StatusBadge status={exp.status} customLabel={exp.label} size="sm" />
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-[11px]">
                          <StatusBadge status={doc.consistencyStatus} size="sm" />
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-[11px]">
                          <StatusBadge
                            status={doc.anomalyStatus}
                            customLabel={
                              doc.anomalyStatus.includes('Suspected')
                                ? 'Suspected Alteration'
                                : doc.anomalyStatus === 'Not Screened'
                                  ? 'Not Screened'
                                  : 'None Detected'
                            }
                            size="sm"
                          />
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-[11px]">
                          <StatusBadge status={doc.issuerVerificationStatus} size="sm" />
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-[11px]">
                          <StatusBadge status={doc.humanReviewStatus} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenDocument(doc.id)}
                            className="px-2.5 py-1 rounded-md bg-[#EFE6D5] dark:bg-stone-800 hover:bg-[#C2410C] hover:text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Findings ({doc.findings.length})
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPillarDocs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6">
                        <EmptyStateCard
                          title="No Matching Pillar Records"
                          description="No authorized documents match the selected verification pillar filter."
                          actionLabel={pillarFilter !== 'all' ? 'Show All Documents' : undefined}
                          onAction={pillarFilter !== 'all' ? () => setPillarFilter('all') : undefined}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* SUB-TAB 2: CONFIGURABLE COMPLIANCE RULES ENGINE */}
      {activeSubTab === 'rules' && (
        <motion.div
          key="rules-tab"
          variants={sectionEntranceVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 liquid-glass rounded-2xl p-4">
            <div>
              <h2 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                AICTE Approval Process Handbook (APH) Compliance Rules Registry
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Defines required document categories, minimum remaining validity days, rule versions, and effective dates.
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setNewRuleOpen((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Compliance Rule</span>
              </button>
            )}
          </div>

          <AnimatePresence>
            {newRuleOpen && isAdmin && (
              <motion.form
                variants={inlinePanelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!ruleName.trim() || !ruleCode.trim()) return;
                  onAddComplianceRule({
                    code: ruleCode.trim(),
                    name: ruleName.trim(),
                    version: ruleVersion.trim(),
                    effectiveDate: ruleEffectiveDate,
                    applicableCategory: ruleCategory,
                    requiredDocumentCategory: ruleDocCategory,
                    minValidityDays: Number(ruleMinValidity) || 0,
                    mandatory: true,
                    active: true,
                    description: ruleDesc.trim(),
                  });
                  setNewRuleOpen(false);
                }}
                className="liquid-glass-elevated border border-blue-400/40 rounded-2xl p-5 space-y-4"
              >
              <div className="text-sm font-display font-bold text-slate-900 dark:text-white">
                Configure New Statutory Compliance Rule
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Rule Code</label>
                  <input
                    type="text"
                    required
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Rule Version</label>
                  <input
                    type="text"
                    required
                    value={ruleVersion}
                    onChange={(e) => setRuleVersion(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Effective Date</label>
                  <input
                    type="date"
                    required
                    value={ruleEffectiveDate}
                    onChange={(e) => setRuleEffectiveDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Min Remaining Validity (Days)
                  </label>
                  <input
                    type="number"
                    value={ruleMinValidity}
                    onChange={(e) => setRuleMinValidity(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Rule Description &amp; Evidence Criteria
                </label>
                <textarea
                  rows={2}
                  value={ruleDesc}
                  onChange={(e) => setRuleDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewRuleOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium cursor-pointer"
                >
                  Save Rule to Registry
                </button>
              </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {complianceRules.map((rule) => (
              <motion.div
                key={rule.id}
                variants={cardEntranceVariants}
                className="liquid-glass rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-mono-tabular font-bold text-blue-700 dark:text-blue-400">
                      {rule.code}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {rule.name}
                    </span>
                    <span>·</span>
                    <span className="font-mono-tabular text-slate-500">{rule.version}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {rule.description}
                  </p>
                  <div className="text-[11px] font-mono-tabular text-slate-500 pt-1">
                    Effective Date: {rule.effectiveDate} · Applies To: {rule.applicableCategory} · Required Doc Category: {rule.requiredDocumentCategory} · Min Validity: {rule.minValidityDays}d
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={rule.active ? 'Active Rule' : 'Paused'} size="sm" />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onToggleRuleActive(rule.id)}
                      className="btn-secondary !py-1.5 !px-3 cursor-pointer"
                    >
                      {rule.active ? 'Disable Rule' : 'Enable Rule'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Live Application Regulatory Compliance Evaluation Matrix */}
          {activeEvalApp && (
            <div className="liquid-glass rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-900 dark:text-white">
                    Live Application Regulatory Compliance Evaluation Matrix
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Evaluates linked documents for the selected application against active AICTE APH rules. Basis: rule category mapping, minimum remaining validity days, and unresolved verification findings.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    aria-label="Select application for compliance evaluation"
                    value={activeEvalApp.id}
                    onChange={(e) => setSelectedEvalAppId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono-tabular rounded-xl liquid-glass-subtle text-stone-900 dark:text-white"
                  >
                    {authorizedApps.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.id} · {app.institutionName} ({app.category})
                      </option>
                    ))}
                  </select>
                  {onOpenApplication && (
                    <button
                      type="button"
                      onClick={() => onOpenApplication(activeEvalApp.id)}
                      className="btn-secondary !py-1.5 !px-3 text-xs cursor-pointer"
                    >
                      Open Dossier
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#C7A56A]/35 liquid-glass-subtle text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                      <th className="py-2.5 px-3">Requirement &amp; Source</th>
                      <th className="py-2.5 px-3">Applicable Category</th>
                      <th className="py-2.5 px-3">Required vs. Observed Evidence</th>
                      <th className="py-2.5 px-3">Result</th>
                      <th className="py-2.5 px-3">Reason &amp; Reviewer Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/70">
                    {activeEvalMatrix.map((row) => (
                      <tr key={row.ruleId} className="align-top">
                        <td className="py-3 px-3">
                          <div className="font-mono-tabular font-bold text-[#9E2919] dark:text-amber-400">
                            {row.ruleCode}
                          </div>
                          <div className="font-semibold text-stone-900 dark:text-white">
                            {row.ruleName}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-stone-500">
                            {row.ruleVersion} · Effective: {row.effectiveDate}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-stone-600 dark:text-stone-300">
                          {row.applicableCategory}
                        </td>
                        <td className="py-3 px-3 space-y-1 max-w-[240px]">
                          <div className="text-[11px] text-stone-600 dark:text-stone-300">
                            <strong>Required:</strong> {row.requiredEvidence}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-stone-800 dark:text-stone-200">
                            <strong>Observed:</strong>{' '}
                            {row.supportingDocumentId ? (
                              <button
                                type="button"
                                onClick={() => onOpenDocument(row.supportingDocumentId!)}
                                className="text-[#C2410C] dark:text-amber-400 underline cursor-pointer"
                              >
                                {row.observedEvidence}
                              </button>
                            ) : (
                              row.observedEvidence
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <StatusBadge status={row.status} customLabel={row.status} size="sm" />
                        </td>
                        <td className="py-3 px-3 max-w-[240px]">
                          <div className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
                            {row.reason}
                          </div>
                          <div className="text-[10px] font-mono-tabular text-stone-500 mt-1">
                            Reviewer Sign-Off: <strong>{row.reviewerStatus}</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* SUB-TAB 3: INFRASTRUCTURE EVIDENCE & ADVISORY INSPECTION */}
      {activeSubTab === 'infrastructure' && (
        <motion.div
          key="infra-tab"
          variants={sectionEntranceVariants}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
          className="space-y-5"
        >
          <div className="p-4 rounded-2xl glass-tint-amber flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-semibold">
                Mandatory Regulatory Notice: Advisory Infrastructure Image Analysis
              </div>
              <p>
                Photographic and schematic evidence uploaded here undergoes automated layout and specification screening (workstation count, signage, carpet area parity). <strong>Automated image analysis is advisory and complements a statutory physical inspection by an Expert Visit Committee (EVC).</strong>
              </p>
            </div>
            {currentUser.role !== 'student' && (
              <button
                type="button"
                onClick={() => setInfraModalOpen((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              >
                Attach Infrastructure Evidence
              </button>
            )}
          </div>

          <AnimatePresence>
            {infraModalOpen && (
              <motion.form
                variants={inlinePanelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!facilityTitle.trim()) return;
                  onAddInfrastructureEvidence({
                    facilityTitle: facilityTitle.trim(),
                    carpetAreaSqm: Number(carpetAreaSqm) || 120,
                    certNumber: infraCertNo.trim() || 'INFRA/2026/01',
                  });
                  setInfraModalOpen(false);
                }}
                className="liquid-glass-elevated rounded-2xl p-5 space-y-4"
              >
              <div className="text-sm font-display font-bold text-slate-900 dark:text-white">
                Attach Facility Photograph &amp; Carpet Area Record
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Facility / Laboratory Name
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityTitle}
                    onChange={(e) => setFacilityTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Declared Carpet Area (sq.m)
                  </label>
                  <input
                    type="number"
                    required
                    value={carpetAreaSqm}
                    onChange={(e) => setCarpetAreaSqm(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    Asset / Inspection Reference #
                  </label>
                  <input
                    type="text"
                    required
                    value={infraCertNo}
                    onChange={(e) => setInfraCertNo(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-tabular"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInfraModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium cursor-pointer"
                >
                  Upload &amp; Generate Advisory Findings
                </button>
              </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.div
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {infraDocs.map((doc) => (
              <motion.div
                key={doc.id}
                variants={cardEntranceVariants}
                className="liquid-glass liquid-glass-interactive rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                {/* Clean Architectural Facility Blueprint SVG Preview */}
                <div className="h-40 bg-slate-900 text-slate-200 p-4 flex flex-col justify-between relative overflow-hidden">
                  <svg
                    className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
                    viewBox="0 0 400 160"
                    fill="none"
                  >
                    <rect x="16" y="16" width="368" height="128" stroke="#60A5FA" strokeWidth="1.5" />
                    <line x1="140" y1="16" x2="140" y2="144" stroke="#60A5FA" strokeDasharray="4 4" />
                    <line x1="270" y1="16" x2="270" y2="144" stroke="#60A5FA" strokeDasharray="4 4" />
                    <rect x="32" y="34" width="88" height="24" stroke="#93C5FD" />
                    <rect x="32" y="70" width="88" height="24" stroke="#93C5FD" />
                    <rect x="160" y="34" width="90" height="88" stroke="#93C5FD" />
                    <rect x="290" y="34" width="74" height="88" stroke="#93C5FD" />
                  </svg>
                  <div className="relative z-10 flex items-center justify-between text-[11px] font-mono-tabular">
                    <span className="text-blue-300 font-semibold">{doc.internalCode}</span>
                    <span>
                      {doc.facilityAreaSqm ? `Carpet Area: ${doc.facilityAreaSqm} sq.m` : doc.fileSize}
                    </span>
                  </div>
                  <div className="relative z-10">
                    <div className="text-sm font-display font-bold text-white">
                      {doc.name}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {doc.institutionName}
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {doc.advisoryInspectionNote ||
                        'Statutory safety and campus infrastructure record linked to institutional compliance dossier.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono-tabular text-slate-500">
                      Cert #{doc.certificateNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenDocument(doc.id)}
                      className="text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                    >
                      Inspect Full Record →
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
