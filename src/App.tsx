/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  AccountApprovalRequest,
  AccountStatus,
  ApplicationCategory,
  ApplicationRecord,
  AuditEvent,
  ComplianceRule,
  DocumentRecord,
  DocumentSubmissionRequest,
  MainView,
  PortalNotification,
  StudentRequestSubmission,
  UserAccount,
  VaultDocumentRecord,
} from './types/portal';
import {
  SEED_APPLICATIONS,
  SEED_APPROVAL_REQUESTS,
  SEED_AUDIT_EVENTS,
  SEED_COMPLIANCE_RULES,
  SEED_DOCUMENTS,
  SEED_DOCUMENT_REQUESTS,
  SEED_INSTITUTIONS,
  SEED_NOTIFICATIONS,
  SEED_STUDENT_SUBMISSIONS,
  SEED_USERS,
} from './data/seedData';
import {
  AssignmentMutationResult,
  ConflictResolutionStrategy,
  OrganisationalAssignmentPatch,
  addDaysToLocalDate,
  applyOrganisationalAssignmentChange,
  applyReviewerDecisionToSubmission,
  buildApprovedUserAccountFromRequest,
  buildCategoryChecklist,
  canUserAccessApplication,
  canUserActionApprovalRequest,
  canUserPerformAdminAction,
  createRecordId,
  evaluateDocumentSixPillars,
  formatRoleDisplayName,
  formatTimestampForDisplay,
  generateInternalDocumentCode,
  getCurrentIsoTimestamp,
  getLocalTodayDate,
  removeInstitutionalAssociation,
  removePersonnelFromAssignment,
  resolveApprovalRouting,
  resolveRepositoryStatusesFromSubmission,
  syncStudentClassTeacherLinks,
} from './lib/domain';
import {
  STORAGE_KEYS,
  loadUsersPreservingSeedAccounts,
  loadValidatedArrayFromStorage,
  persistPortalStateToStorage,
} from './lib/storage';
import { normalizeVaultDocumentRecord } from './lib/vaultStorage';
import { LoginView } from './components/LoginView';
import { SignUpView } from './components/SignUpView';
import { LandingPageView } from './components/LandingPageView';
import { AppShell } from './components/AppShell';
import { AdminDashboardView } from './components/AdminDashboardView';
import { InstitutionalDashboardView } from './components/InstitutionalDashboardView';
import { ApplicationDetailModal } from './components/ApplicationDetailModal';
import { DocumentRepositoryView } from './components/DocumentRepositoryView';
import { VerificationComplianceView } from './components/VerificationComplianceView';
import { ExpiryCalendarView } from './components/ExpiryCalendarView';
import { ReportsAndAccountsView } from './components/ReportsAndAccountsView';
import { ProfileAndSettingsView } from './components/ProfileAndSettingsView';
import { GeminiChatbotWidget } from './components/GeminiChatbotWidget';

export default function App() {
  // Dark theme is default for first-time visitors; saved theme preference ('light' or 'dark') is preserved
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.theme);
      if (saved === 'light') return false;
      if (saved === 'dark') return true;
      return true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    document.title = 'Veridex | Institutional Document Management';
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  const [users, setUsers] = useState<UserAccount[]>(() =>
    loadUsersPreservingSeedAccounts(SEED_USERS)
  );
  const [approvalRequests, setApprovalRequests] = useState<AccountApprovalRequest[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.approvalRequests,
      SEED_APPROVAL_REQUESTS,
      (x): x is AccountApprovalRequest => Boolean(x && typeof x === 'object' && 'id' in x && 'username' in x)
    )
  );
  const [applications, setApplications] = useState<ApplicationRecord[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.applications,
      SEED_APPLICATIONS,
      (x): x is ApplicationRecord => Boolean(x && typeof x === 'object' && 'id' in x && 'institutionId' in x)
    )
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.documents,
      SEED_DOCUMENTS,
      (x): x is DocumentRecord => Boolean(x && typeof x === 'object' && 'id' in x && 'internalCode' in x)
    )
  );
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.rules,
      SEED_COMPLIANCE_RULES,
      (x): x is ComplianceRule => Boolean(x && typeof x === 'object' && 'id' in x && 'code' in x)
    )
  );
  const [notifications, setNotifications] = useState<PortalNotification[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.notifications,
      SEED_NOTIFICATIONS,
      (x): x is PortalNotification => Boolean(x && typeof x === 'object' && 'id' in x && 'title' in x)
    )
  );
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.audit,
      SEED_AUDIT_EVENTS,
      (x): x is AuditEvent => Boolean(x && typeof x === 'object' && 'id' in x && 'action' in x)
    )
  );
  const [documentRequests, setDocumentRequests] = useState<DocumentSubmissionRequest[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.documentRequests,
      SEED_DOCUMENT_REQUESTS,
      (x): x is DocumentSubmissionRequest => Boolean(x && typeof x === 'object' && 'id' in x && 'title' in x)
    )
  );
  const [studentSubmissions, setStudentSubmissions] = useState<StudentRequestSubmission[]>(() =>
    loadValidatedArrayFromStorage(
      STORAGE_KEYS.studentSubmissions,
      SEED_STUDENT_SUBMISSIONS,
      (x): x is StudentRequestSubmission => Boolean(x && typeof x === 'object' && 'id' in x && 'requestId' in x)
    )
  );

  // Restore saved session if present; never silently auto-login unauthenticated visitors
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.currentUserId);
    } catch {
      return null;
    }
  });

  const [authScreenMode, setAuthScreenMode] = useState<'landing' | 'login' | 'signup'>('landing');
  const [signupInitialMode, setSignupInitialMode] = useState<'register' | 'status'>('register');
  const [signupPrefillId, setSignupPrefillId] = useState<string>('');
  const [showPublicOverview, setShowPublicOverview] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<MainView>('dashboard');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Sync state to localStorage (omitting plaintext passwords and transient blob URLs)
  useEffect(() => {
    persistPortalStateToStorage({
      users,
      approvalRequests,
      applications,
      documents,
      complianceRules,
      notifications,
      auditEvents,
      documentRequests,
      studentSubmissions,
      currentUserId,
    });
  }, [
    users,
    approvalRequests,
    applications,
    documents,
    complianceRules,
    notifications,
    auditEvents,
    documentRequests,
    studentSubmissions,
    currentUserId,
  ]);

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  const pendingApprovalCount = useMemo(() => {
    if (!currentUser) return 0;
    return approvalRequests.filter(
      (req) => req.status === 'Pending Approval' && canUserActionApprovalRequest(currentUser, req)
    ).length;
  }, [approvalRequests, currentUser]);

  const appendAudit = (
    actor: Pick<UserAccount, 'fullName' | 'username' | 'role'>,
    action: string,
    targetType: AuditEvent['targetType'],
    targetId: string,
    details: string
  ) => {
    const newEvent: AuditEvent = {
      id: createRecordId('AUD'),
      timestamp: formatTimestampForDisplay(getCurrentIsoTimestamp()),
      actorName: actor.fullName,
      actorUsername: actor.username,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      details,
    };
    setAuditEvents((prev) => [newEvent, ...prev]);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUserId(user.id);
    setAuthScreenMode('landing');
    setShowPublicOverview(false);
    setActiveView('dashboard');
    setSelectedApplicationId(null);
    setSelectedDocumentId(null);
    appendAudit(
      user,
      'User Session Authenticated',
      'Account',
      user.id,
      `Signed in as ${user.fullName} (${formatRoleDisplayName(user.role)}).`
    );
  };

  const handleLogout = () => {
    if (currentUser) {
      appendAudit(
        currentUser,
        'User Signed Out',
        'Account',
        currentUser.id,
        `Signed out from ${formatRoleDisplayName(currentUser.role)} session.`
      );
    }
    setCurrentUserId(null);
    setAuthScreenMode('landing');
    setShowPublicOverview(false);
    setSelectedApplicationId(null);
    setSelectedDocumentId(null);
  };

  const handleResetRegistryData = () => {
    setUsers(SEED_USERS);
    setApprovalRequests(SEED_APPROVAL_REQUESTS);
    setApplications(SEED_APPLICATIONS);
    setDocuments(SEED_DOCUMENTS);
    setComplianceRules(SEED_COMPLIANCE_RULES);
    setNotifications(SEED_NOTIFICATIONS);
    setAuditEvents(SEED_AUDIT_EVENTS);
    setDocumentRequests(SEED_DOCUMENT_REQUESTS);
    setStudentSubmissions(SEED_STUDENT_SUBMISSIONS);
    setSelectedApplicationId(null);
    setSelectedDocumentId(null);
    setActiveView('dashboard');
  };

  // Enforce role-based route access when navigating
  const handleNavigate = (view: MainView) => {
    if (!currentUser) return;
    if (view === 'accounts' && currentUser.role === 'student') {
      setActiveView('dashboard');
      return;
    }
    if (view === 'reports' && currentUser.role !== 'admin' && currentUser.role !== 'institutional_rep') {
      setActiveView('dashboard');
      return;
    }
    if (
      (view === 'applications' || view === 'verification' || view === 'expiry') &&
      currentUser.role === 'student'
    ) {
      setActiveView('dashboard');
      return;
    }
    setActiveView(view);
  };

  // Create Account Approval Request from Sign-Up (never creates active account until approved)
  const handleCreateSignupRequest = (
    draft: Omit<
      AccountApprovalRequest,
      | 'id'
      | 'status'
      | 'submittedAt'
      | 'updatedAt'
      | 'approverRole'
      | 'routedApproverUserIds'
      | 'routedApproverLabel'
      | 'noApproverAssigned'
      | 'history'
    >
  ): AccountApprovalRequest => {
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const routing = resolveApprovalRouting(
      {
        requestedRole: draft.requestedRole,
        institutionId: draft.institutionId,
        academicDepartment: draft.academicDepartment,
        academicYear: draft.academicYear,
        division: draft.division,
        classTeacherDivision: draft.classTeacherDivision,
      },
      users,
      SEED_INSTITUTIONS
    );

    const newReq: AccountApprovalRequest = {
      ...draft,
      id: createRecordId('REQ'),
      status: 'Pending Approval',
      submittedAt: nowDisplay,
      updatedAt: nowDisplay,
      approverRole: routing.approverRole,
      routedApproverUserIds: routing.routedApproverUserIds,
      routedApproverLabel: routing.routedApproverLabel,
      noApproverAssigned: routing.noApproverAssigned,
      history: [
        {
          id: createRecordId('AH'),
          timestamp: nowDisplay,
          actorName: draft.fullName,
          actorUsername: draft.username,
          actorRole: draft.requestedRole,
          action: 'Submitted',
          note: `Submitted ${formatRoleDisplayName(draft.requestedRole)} account registration request for ${draft.institutionName}. Routed to: ${routing.routedApproverLabel}.`,
        },
      ],
    };
    setApprovalRequests((prev) => [newReq, ...prev]);

    setNotifications((prev) => [
      {
        id: createRecordId('NOTIF'),
        recipientRole: newReq.approverRole,
        institutionId: newReq.approverRole === 'admin' ? undefined : newReq.institutionId,
        title: `Account Approval Request: ${newReq.fullName} (${formatRoleDisplayName(newReq.requestedRole)})`,
        message: `${newReq.fullName} (@${newReq.username}) requested a ${formatRoleDisplayName(newReq.requestedRole)} account at ${newReq.institutionName}.`,
        createdAt: nowDisplay,
        read: false,
        type: 'review_request',
        targetView: 'accounts',
        targetRecordId: newReq.id,
      },
      ...prev,
    ]);

    appendAudit(
      {
        fullName: newReq.fullName,
        username: newReq.username,
        role: newReq.requestedRole,
      },
      'Account Registration Requested',
      'ApprovalRequest',
      newReq.id,
      `Submitted ${formatRoleDisplayName(newReq.requestedRole)} registration request for ${newReq.institutionName}. Routed to: ${newReq.routedApproverLabel}.`
    );

    return newReq;
  };

  // Amend & Resubmit Account Approval Request after Correction Requested
  const handleResubmitSignupRequest = (
    requestId: string,
    updatedFields: Partial<AccountApprovalRequest>,
    applicantNote?: string
  ): AccountApprovalRequest | null => {
    const existing = approvalRequests.find((r) => r.id === requestId);
    if (!existing) return null;

    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const mergedRole = updatedFields.requestedRole || existing.requestedRole;
    const mergedInstitutionId = updatedFields.institutionId || existing.institutionId;
    const mergedDept = updatedFields.academicDepartment ?? existing.academicDepartment;
    const mergedYear = updatedFields.academicYear ?? existing.academicYear;
    const mergedDiv = updatedFields.division ?? existing.division;
    const mergedClassDiv = updatedFields.classTeacherDivision ?? existing.classTeacherDivision;

    const routing = resolveApprovalRouting(
      {
        requestedRole: mergedRole,
        institutionId: mergedInstitutionId,
        academicDepartment: mergedDept,
        academicYear: mergedYear,
        division: mergedDiv,
        classTeacherDivision: mergedClassDiv,
      },
      users,
      SEED_INSTITUTIONS
    );

    const updatedReq: AccountApprovalRequest = {
      ...existing,
      ...updatedFields,
      status: 'Pending Approval',
      updatedAt: nowDisplay,
      approverRole: routing.approverRole,
      routedApproverUserIds: routing.routedApproverUserIds,
      routedApproverLabel: routing.routedApproverLabel,
      noApproverAssigned: routing.noApproverAssigned,
      history: [
        ...existing.history,
        {
          id: createRecordId('AH'),
          timestamp: nowDisplay,
          actorName: updatedFields.fullName || existing.fullName,
          actorUsername: updatedFields.username || existing.username,
          actorRole: mergedRole,
          action: 'Resubmitted',
          note:
            applicantNote ||
            `Applicant amended details and resubmitted request for ${routing.routedApproverLabel}.`,
        },
      ],
    };

    setApprovalRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedReq : r))
    );

    appendAudit(
      {
        fullName: updatedReq.fullName,
        username: updatedReq.username,
        role: updatedReq.requestedRole,
      },
      'Account Registration Resubmitted',
      'ApprovalRequest',
      updatedReq.id,
      `Amended and resubmitted ${formatRoleDisplayName(updatedReq.requestedRole)} registration request (${updatedReq.institutionName}).`
    );

    return updatedReq;
  };

  // Approver Decision on Account Approval Request
  const handleDecideApprovalRequest = (
    requestId: string,
    decision: 'Approved' | 'Rejected' | 'Correction Requested',
    note: string
  ) => {
    if (!currentUser) return;
    const targetReq = approvalRequests.find((r) => r.id === requestId);
    if (!targetReq || !canUserActionApprovalRequest(currentUser, targetReq)) return;

    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const updatedReq: AccountApprovalRequest = {
      ...targetReq,
      status: decision,
      updatedAt: nowDisplay,
      decidedAt: nowDisplay,
      decidedByUserId: currentUser.id,
      decidedByName: currentUser.fullName,
      decidedByRole: currentUser.role,
      decisionNote: note,
      history: [
        ...targetReq.history,
        {
          id: createRecordId('AH'),
          timestamp: nowDisplay,
          actorName: currentUser.fullName,
          actorUsername: currentUser.username,
          actorRole: currentUser.role,
          action: decision,
          note,
        },
      ],
    };

    let nextUsers = users;
    if (decision === 'Approved') {
      const newUserAccount = buildApprovedUserAccountFromRequest(updatedReq, currentUser);
      nextUsers = [newUserAccount, ...users];
      setUsers(nextUsers);
    }

    setApprovalRequests((prev) =>
      prev.map((req) => {
        if (req.id === requestId) return updatedReq;
        // Re-evaluate routing for any pending requests so newly approved Faculty/Institutional Managers pick up unassigned requests in their scope
        if (decision === 'Approved' && req.status === 'Pending Approval') {
          const refreshedRouting = resolveApprovalRouting(
            {
              requestedRole: req.requestedRole,
              institutionId: req.institutionId,
              academicDepartment: req.academicDepartment,
              academicYear: req.academicYear,
              division: req.division,
              classTeacherDivision: req.classTeacherDivision,
            },
            nextUsers,
            SEED_INSTITUTIONS
          );
          return {
            ...req,
            routedApproverUserIds: refreshedRouting.routedApproverUserIds,
            routedApproverLabel: refreshedRouting.routedApproverLabel,
            noApproverAssigned: refreshedRouting.noApproverAssigned,
          };
        }
        return req;
      })
    );

    const auditActionLabel =
      decision === 'Approved'
        ? 'Account Registration Approved'
        : decision === 'Correction Requested'
          ? 'Account Registration Correction Requested'
          : 'Account Registration Rejected';

    appendAudit(
      currentUser,
      auditActionLabel,
      'ApprovalRequest',
      updatedReq.id,
      `${decision} ${formatRoleDisplayName(updatedReq.requestedRole)} request for ${updatedReq.fullName} (@${updatedReq.username}, ${updatedReq.institutionName}). Note: ${note}`
    );
  };

  // Re-evaluate routing for any pending registration requests when personnel assignments change
  const refreshPendingApprovalRouting = (nextUsers: UserAccount[]) => {
    setApprovalRequests((prev) =>
      prev.map((req) => {
        if (req.status !== 'Pending Approval') return req;
        const refreshedRouting = resolveApprovalRouting(
          {
            requestedRole: req.requestedRole,
            institutionId: req.institutionId,
            academicDepartment: req.academicDepartment,
            academicYear: req.academicYear,
            division: req.division,
            classTeacherDivision: req.classTeacherDivision,
          },
          nextUsers,
          SEED_INSTITUTIONS
        );
        return {
          ...req,
          routedApproverUserIds: refreshedRouting.routedApproverUserIds,
          routedApproverLabel: refreshedRouting.routedApproverLabel,
          noApproverAssigned: refreshedRouting.noApproverAssigned,
        };
      })
    );
  };

  // Hierarchical Organisational Assignment Update (with Conflict Resolution)
  const handleApplyOrganisationalAssignment = (
    targetUserId: string,
    patch: OrganisationalAssignmentPatch,
    conflictResolution?: Exclude<ConflictResolutionStrategy, 'cancel'>
  ): AssignmentMutationResult => {
    if (!currentUser) {
      return {
        success: false,
        error: 'Authentication required.',
        users,
        auditAction: 'Assignment Blocked',
        auditDetails: 'Authentication required.',
      };
    }
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return {
        success: false,
        error: 'Target personnel record not found.',
        users,
        auditAction: 'Assignment Blocked',
        auditDetails: 'Target personnel record not found.',
      };
    }

    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const result = applyOrganisationalAssignmentChange({
      actor: currentUser,
      targetUserId,
      patch,
      conflictResolution,
      users,
      institutions: SEED_INSTITUTIONS,
      timestamp: nowDisplay,
    });

    if (!result.success) {
      return result;
    }

    setUsers(result.users);
    refreshPendingApprovalRouting(result.users);

    appendAudit(
      currentUser,
      result.auditAction || 'Organisational Assignment Updated',
      'Account',
      targetUser.username,
      result.auditDetails || 'Updated organisational assignment.'
    );

    return result;
  };

  // Remove Personnel from Current Assignment (Retains Institutional Association)
  const handleRemoveFromAssignment = (
    targetUserId: string,
    reason?: string
  ): AssignmentMutationResult => {
    if (!currentUser) {
      return {
        success: false,
        error: 'Authentication required.',
        users,
        auditAction: 'Release Blocked',
        auditDetails: 'Authentication required.',
      };
    }
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return {
        success: false,
        error: 'Target personnel record not found.',
        users,
        auditAction: 'Release Blocked',
        auditDetails: 'Target personnel record not found.',
      };
    }

    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const result = removePersonnelFromAssignment({
      actor: currentUser,
      targetUserId,
      reason,
      users,
      timestamp: nowDisplay,
    });

    if (!result.success) {
      return result;
    }

    setUsers(result.users);
    refreshPendingApprovalRouting(result.users);

    appendAudit(
      currentUser,
      result.auditAction || 'Personnel Released from Assignment',
      'Account',
      targetUser.username,
      result.auditDetails || 'Released from current assignment.'
    );

    return result;
  };

  // Remove Personnel Institutional Association (Detaches from Institution while Preserving Record)
  const handleRemoveInstitutionalAssociation = (
    targetUserId: string,
    reason?: string
  ): AssignmentMutationResult => {
    if (!currentUser) {
      return {
        success: false,
        error: 'Authentication required.',
        users,
        auditAction: 'Association Removal Blocked',
        auditDetails: 'Authentication required.',
      };
    }
    const targetUser = users.find((u) => u.id === targetUserId);
    if (!targetUser) {
      return {
        success: false,
        error: 'Target personnel record not found.',
        users,
        auditAction: 'Association Removal Blocked',
        auditDetails: 'Target personnel record not found.',
      };
    }

    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const result = removeInstitutionalAssociation({
      actor: currentUser,
      targetUserId,
      reason,
      users,
      timestamp: nowDisplay,
    });

    if (!result.success) {
      return result;
    }

    setUsers(result.users);
    refreshPendingApprovalRouting(result.users);

    appendAudit(
      currentUser,
      result.auditAction || 'Institutional Association Removed',
      'Account',
      targetUser.username,
      result.auditDetails || 'Removed institutional association.'
    );

    return result;
  };

  // Create New Application (Institutional Representative)
  const handleCreateApplication = (params: {
    category: ApplicationCategory;
    submitImmediately: boolean;
    initialDocumentTitle?: string;
    initialCertNumber?: string;
  }) => {
    if (!currentUser || !currentUser.institutionId) return;

    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const newAppNumber = 112 + applications.length;
    const newAppId = `APP-2026-0${newAppNumber}`;
    const checklist = buildCategoryChecklist(params.category);
    const createdDocIds: string[] = [];

    if (params.initialDocumentTitle && params.initialCertNumber) {
      const firstItem = checklist[0];
      const newDocId = createRecordId('DOC');
      const internalCode = generateInternalDocumentCode(
        firstItem.documentCategory,
        currentUser.fullName,
        documents.map((d) => d.internalCode)
      );

      const newDoc: DocumentRecord = {
        id: newDocId,
        internalCode,
        name: params.initialDocumentTitle,
        category: firstItem.documentCategory,
        suggestedAiCategory: firstItem.documentCategory,
        suggestedFolder: `/Repository/${firstItem.documentCategory.replace(/\s+/g, '-')}`,
        categoryConfirmed: true,
        institutionId: currentUser.institutionId,
        institutionName: currentUser.institutionName || 'VESIT',
        relatedApplicationId: newAppId,
        uploadedFromSection: `Application: ${newAppId}`,
        personName: currentUser.fullName,
        personUserId: currentUser.id,
        uploadedByUserId: currentUser.id,
        certificateNumber: params.initialCertNumber,
        issuingAuthority: 'University of Mumbai & Statutory Board',
        issueDate: addDaysToLocalDate(todayStr, -30),
        expiryDate: addDaysToLocalDate(todayStr, 335),
        uploadDate: todayStr,
        fileName: `${internalCode}_Dossier.pdf`,
        fileSize: '1.68 MB',
        mimeType: 'application/pdf',
        verificationStatusLabel: 'Pending Verification',
        approvalStatusLabel: 'Under Review',
        statusUpdatedAt: nowDisplay,
        completenessStatus: 'Pending Review',
        consistencyStatus: 'Pending Check',
        anomalyStatus: 'Not Screened',
        issuerVerificationStatus: 'Unavailable',
        humanReviewStatus: 'Pending',
        extractedSummary: {
          'Document Title': params.initialDocumentTitle,
          'Certificate Number': params.initialCertNumber,
          'Application Category': params.category,
          'Intake Status': 'Metadata registered; awaiting officer review',
        },
        findings: [
          {
            id: createRecordId('F'),
            pillar: 'Completeness',
            status: 'Advisory',
            affectedFieldOrPage: 'Registered Metadata Record',
            explanation:
              'Document metadata registered during dossier creation; awaiting reviewing officer inspection.',
            evidenceComparison: `Cert #${params.initialCertNumber} linked to checklist item "${firstItem.title}".`,
            suggestedNextAction: 'Await regional officer human review.',
          },
        ],
        versions: [
          {
            versionNumber: 1,
            fileName: `${internalCode}_Dossier.pdf`,
            fileSize: '1.68 MB',
            mimeType: 'application/pdf',
            uploadedAt: nowDisplay,
            uploadedBy: currentUser.fullName,
            changeNote: 'Registered during application dossier creation.',
          },
        ],
      };

      setDocuments((prev) => [newDoc, ...prev]);
      createdDocIds.push(newDocId);
      checklist[0] = {
        ...firstItem,
        linkedDocumentId: newDocId,
        status: 'Uploaded',
      };
    }

    const initialStatus = params.submitImmediately ? 'Submitted' : 'Draft';
    const newApp: ApplicationRecord = {
      id: newAppId,
      institutionId: currentUser.institutionId,
      institutionName: currentUser.institutionName || 'VESIT',
      officialInstitutionCode: currentUser.officialInstitutionCode || currentUser.institutionId,
      category: params.category,
      submittedDate: params.submitImmediately ? todayStr : 'Not Submitted',
      lastUpdated: todayStr,
      status: initialStatus,
      assignedReviewer: 'Karan Saini',
      checklist,
      documentIds: createdDocIds,
      reviewNotes: [],
      statusHistory: [
        {
          id: createRecordId('SH'),
          fromStatus: 'Created',
          toStatus: initialStatus,
          changedBy: currentUser.fullName,
          changedByRole: currentUser.role,
          timestamp: nowDisplay,
          note: params.submitImmediately
            ? `Created and submitted ${params.category} dossier.`
            : `Initialized draft for ${params.category}.`,
        },
      ],
    };

    setApplications((prev) => [newApp, ...prev]);

    if (params.submitImmediately) {
      setNotifications((prev) => [
        {
          id: createRecordId('NOTIF'),
          recipientRole: 'admin',
          title: `New Application Submitted: ${newAppId}`,
          message: `${newApp.institutionName} submitted ${newApp.category} for compliance review.`,
          createdAt: nowDisplay,
          read: false,
          type: 'status_change',
          targetView: 'applications',
          targetRecordId: newAppId,
        },
        ...prev,
      ]);
    }

    appendAudit(
      currentUser,
      params.submitImmediately ? 'Application Created & Submitted' : 'Application Draft Created',
      'Application',
      newAppId,
      `${newApp.institutionName} created ${newAppId} (${params.category}) with status ${initialStatus}.`
    );

    setSelectedApplicationId(newAppId);
  };

  // Register Supporting Document Metadata on a Checklist Item
  const handleAttachChecklistDocument = (params: {
    appId: string;
    checklistItemId: string;
    docTitle: string;
    certNumber: string;
    expiryDate?: string;
  }) => {
    if (!currentUser) return;
    const targetApp = applications.find((a) => a.id === params.appId);
    if (!targetApp) return;

    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const item = targetApp.checklist.find((c) => c.id === params.checklistItemId);
    const docCat = item?.documentCategory || 'Approvals';
    const newDocId = createRecordId('DOC');
    const internalCode = generateInternalDocumentCode(
      docCat,
      currentUser.fullName,
      documents.map((d) => d.internalCode)
    );

    const newDoc: DocumentRecord = {
      id: newDocId,
      internalCode,
      name: params.docTitle,
      category: docCat,
      suggestedAiCategory: docCat,
      suggestedFolder: `/Repository/${docCat.replace(/\s+/g, '-')}`,
      categoryConfirmed: true,
      institutionId: targetApp.institutionId,
      institutionName: targetApp.institutionName,
      relatedApplicationId: targetApp.id,
      uploadedFromSection: `Application: ${targetApp.id}`,
      personName: currentUser.fullName,
      personUserId: currentUser.id,
      uploadedByUserId: currentUser.id,
      certificateNumber: params.certNumber,
      issuingAuthority: 'Competent Statutory Authority',
      issueDate: todayStr,
      expiryDate: params.expiryDate,
      uploadDate: todayStr,
      fileName: `${internalCode}_Record.pdf`,
      fileSize: '1.54 MB',
      mimeType: 'application/pdf',
      verificationStatusLabel: 'Pending Verification',
      approvalStatusLabel: 'Under Review',
      statusUpdatedAt: nowDisplay,
      completenessStatus: 'Pending Review',
      consistencyStatus: 'Pending Check',
      anomalyStatus: 'Not Screened',
      issuerVerificationStatus: 'Unavailable',
      humanReviewStatus: 'Pending',
      extractedSummary: {
        'Document Title': params.docTitle,
        'Certificate Number': params.certNumber,
        'Linked Application': targetApp.id,
        'Intake Status': 'Metadata registered; awaiting human review',
      },
      findings: [
        {
          id: createRecordId('F'),
          pillar: 'Completeness',
          status: 'Advisory',
          affectedFieldOrPage: 'Checklist Metadata Record',
          explanation:
            'Document details and validity dates recorded against checklist requirement; awaiting reviewing officer verification.',
          evidenceComparison: `Cert #${params.certNumber} linked to checklist requirement "${item?.title}".`,
          suggestedNextAction: 'Await human reviewer confirmation.',
        },
      ],
      versions: [
        {
          versionNumber: 1,
          fileName: `${internalCode}_Record.pdf`,
          fileSize: '1.54 MB',
          mimeType: 'application/pdf',
          uploadedAt: nowDisplay,
          uploadedBy: currentUser.fullName,
          changeNote: `Registered for checklist item "${item?.title}".`,
        },
      ],
    };

    const evaluated = evaluateDocumentSixPillars(
      newDoc,
      [newDoc, ...documents],
      applications,
      todayStr
    );
    const evaluatedDoc: DocumentRecord = {
      ...newDoc,
      completenessStatus: evaluated.completenessStatus,
      consistencyStatus: evaluated.consistencyStatus,
      anomalyStatus: evaluated.anomalyStatus,
      issuerVerificationStatus: evaluated.issuerVerificationStatus,
      humanReviewStatus: evaluated.humanReviewStatus,
      findings: evaluated.findings,
    };

    setDocuments((prev) => [evaluatedDoc, ...prev]);
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== params.appId) return app;
        return {
          ...app,
          lastUpdated: todayStr,
          documentIds: [...app.documentIds, newDocId],
          checklist: app.checklist.map((c) =>
            c.id === params.checklistItemId
              ? {
                  ...c,
                  linkedDocumentId: newDocId,
                  status: 'Uploaded',
                  notes: undefined,
                }
              : c
          ),
        };
      })
    );

    appendAudit(
      currentUser,
      'Checklist Document Registered',
      'Document',
      newDocId,
      `Registered ${internalCode} (${params.docTitle}) for ${params.appId}.`
    );
  };

  // Submit Draft Application
  const handleSubmitDraftApplication = (appId: string, submissionNote: string) => {
    if (!currentUser) return;
    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          status: 'Submitted',
          submittedDate: todayStr,
          lastUpdated: todayStr,
          statusHistory: [
            ...app.statusHistory,
            {
              id: createRecordId('SH'),
              fromStatus: app.status,
              toStatus: 'Submitted',
              changedBy: currentUser.fullName,
              changedByRole: currentUser.role,
              timestamp: nowDisplay,
              note: submissionNote,
            },
          ],
        };
      })
    );

    setNotifications((prev) => [
      {
        id: createRecordId('NOTIF'),
        recipientRole: 'admin',
        title: `Application Submitted for Review (${appId})`,
        message: `${currentUser.institutionName || currentUser.fullName} submitted ${appId}.`,
        createdAt: nowDisplay,
        read: false,
        type: 'status_change',
        targetView: 'applications',
        targetRecordId: appId,
      },
      ...prev,
    ]);

    appendAudit(
      currentUser,
      'Application Submitted',
      'Application',
      appId,
      submissionNote
    );
  };

  // Institutional Representative Resubmit after Correction Request
  const handleResubmitApplication = (params: {
    appId: string;
    responseNote: string;
    attachRenewedCertificate: boolean;
  }) => {
    if (!currentUser) return;
    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const renewedExpiry = addDaysToLocalDate(todayStr, 365);

    if (params.attachRenewedCertificate) {
      // Update any expired/flagged documents linked to this application (e.g. DOC-1002 & DOC-1005)
      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.relatedApplicationId !== params.appId) return doc;
          const isExpiredOrFlagged =
            doc.id === 'DOC-1002' ||
            doc.id === 'DOC-1005' ||
            doc.humanReviewStatus === 'Action Required';
          if (!isExpiredOrFlagged) return doc;

          return {
            ...doc,
            expiryDate: doc.expiryDate ? renewedExpiry : undefined,
            consistencyStatus: 'Pending Check',
            humanReviewStatus: 'Pending',
            versions: [
              ...doc.versions,
              {
                versionNumber: doc.versions.length + 1,
                fileName: `Renewed_${doc.fileName}`,
                fileSize: '2.18 MB',
                mimeType: doc.mimeType,
                uploadedAt: nowDisplay,
                uploadedBy: currentUser.fullName,
                changeNote: params.responseNote,
              },
            ],
          };
        })
      );
    }

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== params.appId) return app;
        return {
          ...app,
          status: 'Under Manual Review',
          lastUpdated: todayStr,
          checklist: params.attachRenewedCertificate
            ? app.checklist.map((c) =>
                c.status === 'Flagged for Review'
                  ? {
                      ...c,
                      status: 'Uploaded',
                      notes: 'Renewed document & clarification registered by institution.',
                    }
                  : c
              )
            : app.checklist,
          reviewNotes: [
            ...app.reviewNotes,
            {
              id: createRecordId('RN'),
              authorId: currentUser.id,
              authorName: currentUser.fullName,
              authorRole: currentUser.role,
              timestamp: nowDisplay,
              actionType: 'Resubmission Response',
              note: params.responseNote,
            },
          ],
          statusHistory: [
            ...app.statusHistory,
            {
              id: createRecordId('SH'),
              fromStatus: app.status,
              toStatus: 'Under Manual Review',
              changedBy: currentUser.fullName,
              changedByRole: currentUser.role,
              timestamp: nowDisplay,
              note: `Institutional resubmission: ${params.responseNote}`,
            },
          ],
        };
      })
    );

    setNotifications((prev) => [
      {
        id: createRecordId('NOTIF'),
        recipientRole: 'admin',
        title: `Application Resubmitted: ${params.appId}`,
        message: `${currentUser.fullName} responded to the review request and resubmitted ${params.appId} for manual review.`,
        createdAt: nowDisplay,
        read: false,
        type: 'status_change',
        targetView: 'applications',
        targetRecordId: params.appId,
      },
      ...prev,
    ]);

    appendAudit(
      currentUser,
      'Application Resubmitted After Clarification',
      'Application',
      params.appId,
      params.responseNote
    );
  };

  // Admin Review Actions (Enforced via canUserPerformAdminAction)
  const handleAdminAction = (params: {
    appId: string;
    actionType: 'Review Note' | 'Correction Request' | 'Under Manual Review' | 'Authorized Decision';
    note: string;
    decisionOutcome?: ApplicationRecord['decisionOutcome'];
  }) => {
    if (!currentUser || !canUserPerformAdminAction(currentUser)) return;

    const targetApp = applications.find((a) => a.id === params.appId);
    if (!targetApp) return;

    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

    let nextStatus = targetApp.status;
    if (params.actionType === 'Correction Request') {
      nextStatus = 'Additional Information Required';
    } else if (params.actionType === 'Under Manual Review') {
      nextStatus = 'Under Manual Review';
    } else if (params.actionType === 'Authorized Decision') {
      nextStatus = 'Decision Recorded';
    }

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== params.appId) return app;
        return {
          ...app,
          status: nextStatus,
          lastUpdated: todayStr,
          decisionOutcome:
            params.actionType === 'Authorized Decision'
              ? params.decisionOutcome
              : app.decisionOutcome,
          reviewNotes: [
            ...app.reviewNotes,
            {
              id: createRecordId('RN'),
              authorId: currentUser.id,
              authorName: currentUser.fullName,
              authorRole: currentUser.role,
              timestamp: nowDisplay,
              actionType:
                params.actionType === 'Under Manual Review'
                  ? 'Review Note'
                  : params.actionType,
              note: params.note,
            },
          ],
          statusHistory:
            nextStatus !== app.status
              ? [
                  ...app.statusHistory,
                  {
                    id: createRecordId('SH'),
                    fromStatus: app.status,
                    toStatus: nextStatus,
                    changedBy: currentUser.fullName,
                    changedByRole: currentUser.role,
                    timestamp: nowDisplay,
                    note: params.note,
                  },
                ]
              : app.statusHistory,
        };
      })
    );

    if (params.actionType === 'Correction Request' || params.actionType === 'Authorized Decision') {
      setNotifications((prev) => [
        {
          id: createRecordId('NOTIF'),
          recipientRole: 'institutional_rep',
          institutionId: targetApp.institutionId,
          title:
            params.actionType === 'Correction Request'
              ? `Action Required: Clarification Requested on ${targetApp.id}`
              : `Compliance Decision Recorded on ${targetApp.id}`,
          message: params.note,
          createdAt: nowDisplay,
          read: false,
          type: params.actionType === 'Correction Request' ? 'review_request' : 'status_change',
          targetView: 'applications',
          targetRecordId: targetApp.id,
        },
        ...prev,
      ]);
    }

    appendAudit(
      currentUser,
      `Admin ${params.actionType}`,
      'Application',
      params.appId,
      params.note
    );
  };

  // Document Repository Registration
  const handleUploadDocument = (
    newDocData: Omit<DocumentRecord, 'id' | 'internalCode'> & { internalCode: string }
  ) => {
    if (!currentUser) return;
    const todayStr = getLocalTodayDate();
    const newDocId = createRecordId('DOC');
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const baseDoc: DocumentRecord = {
      ...newDocData,
      id: newDocId,
      uploadedFromSection:
        newDocData.uploadedFromSection ||
        (newDocData.relatedApplicationId
          ? `Application: ${newDocData.relatedApplicationId}`
          : 'Document Repository'),
      uploadedByUserId: currentUser.id,
      verificationStatusLabel: newDocData.verificationStatusLabel || 'Pending Verification',
      approvalStatusLabel: newDocData.approvalStatusLabel || 'Under Review',
      statusUpdatedAt: newDocData.statusUpdatedAt || nowDisplay,
    };

    const evaluated = evaluateDocumentSixPillars(
      baseDoc,
      [baseDoc, ...documents],
      applications,
      todayStr
    );
    const fullDoc: DocumentRecord = {
      ...baseDoc,
      completenessStatus: evaluated.completenessStatus,
      consistencyStatus: evaluated.consistencyStatus,
      anomalyStatus: evaluated.anomalyStatus,
      issuerVerificationStatus: evaluated.issuerVerificationStatus,
      humanReviewStatus: evaluated.humanReviewStatus,
      findings: evaluated.findings,
    };

    setDocuments((prev) => [fullDoc, ...prev]);

    if (fullDoc.relatedApplicationId) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === fullDoc.relatedApplicationId
            ? { ...a, documentIds: [...a.documentIds, newDocId], lastUpdated: todayStr }
            : a
        )
      );
    }

    appendAudit(
      currentUser,
      'Document Record Registered in Repository',
      'Document',
      newDocId,
      `Registered ${fullDoc.internalCode} (${fullDoc.name}). Completeness: ${fullDoc.completenessStatus}, Consistency: ${fullDoc.consistencyStatus}.`
    );
  };

  // Replace Document Version
  const handleReplaceDocumentVersion = (params: {
    docId: string;
    fileName: string;
    fileSize: string;
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
    newExpiryDate?: string;
    changeNote: string;
  }) => {
    if (!currentUser) return;
    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== params.docId) return doc;
        const nextVersionNumber = doc.versions.length + 1;
        const updatedDraft: DocumentRecord = {
          ...doc,
          fileName: params.fileName,
          fileSize: params.fileSize,
          mimeType: params.mimeType,
          expiryDate: params.newExpiryDate || doc.expiryDate,
          uploadDate: todayStr,
          statusUpdatedAt: nowDisplay,
          humanReviewStatus: 'Pending',
          versions: [
            ...doc.versions,
            {
              versionNumber: nextVersionNumber,
              fileName: params.fileName,
              fileSize: params.fileSize,
              mimeType: params.mimeType,
              uploadedAt: nowDisplay,
              uploadedBy: currentUser.fullName,
              changeNote: params.changeNote,
            },
          ],
        };
        const evaluated = evaluateDocumentSixPillars(
          updatedDraft,
          prev.map((d) => (d.id === params.docId ? updatedDraft : d)),
          applications,
          todayStr
        );
        return {
          ...updatedDraft,
          completenessStatus: evaluated.completenessStatus,
          consistencyStatus: evaluated.consistencyStatus,
          anomalyStatus: evaluated.anomalyStatus,
          findings: evaluated.findings,
        };
      })
    );

    appendAudit(
      currentUser,
      'Document Version Replaced',
      'Document',
      params.docId,
      `Registered new version (${params.fileName}): ${params.changeNote}`
    );
  };

  const handleUpdateDocumentHumanReview = (
    docId: string,
    status: DocumentRecord['humanReviewStatus'],
    note: string
  ) => {
    if (!currentUser || !canUserPerformAdminAction(currentUser)) return;
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId
          ? {
              ...doc,
              humanReviewStatus: status,
              approvalStatusLabel:
                status === 'Reviewed'
                  ? 'Approved'
                  : status === 'Action Required'
                    ? 'Needs Review'
                    : 'Under Review',
              statusUpdatedAt: nowDisplay,
            }
          : doc
      )
    );
    appendAudit(currentUser, `Document Marked ${status}`, 'Document', docId, note);
  };

  const handleRunAllVerificationChecks = () => {
    if (!currentUser) return;
    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => {
        const evaluated = evaluateDocumentSixPillars(doc, prevDocs, applications, todayStr);
        return {
          ...doc,
          completenessStatus: evaluated.completenessStatus,
          consistencyStatus: evaluated.consistencyStatus,
          anomalyStatus: evaluated.anomalyStatus,
          issuerVerificationStatus: evaluated.issuerVerificationStatus,
          humanReviewStatus: evaluated.humanReviewStatus,
          findings: evaluated.findings,
          statusUpdatedAt: nowDisplay,
        };
      })
    );
    appendAudit(
      currentUser,
      'Executed 6-Pillar Verification & Consistency Screening',
      'Document',
      'ALL-AUTHORIZED-DOCS',
      'Evaluated completeness, expiry windows, cross-document consistency, and anomaly rules across repository records.'
    );
  };

  // Create Document Request (Admin, Institution Manager, Faculty)
  const handleCreateDocumentRequest = (newReq: DocumentSubmissionRequest) => {
    setDocumentRequests((prev) => [newReq, ...prev]);

    // Send notifications to all recipient students
    const recipientStudents = users.filter((u) => newReq.recipientStudentIds.includes(u.id));
    const nowIso = getCurrentIsoTimestamp();
    const nowDisplay = formatTimestampForDisplay(nowIso);
    const newNotifications: PortalNotification[] = recipientStudents.map((stu) => ({
      id: createRecordId('NOTIF'),
      recipientRole: 'student',
      recipientUserId: stu.id,
      userId: stu.id,
      type: 'review_request',
      title: `Action Required: ${newReq.title}`,
      message: `${newReq.creatorName} (${formatRoleDisplayName(newReq.creatorRole)}) requested required documents. Submission deadline: ${newReq.deadline}.`,
      targetView: 'dashboard',
      targetRecordId: newReq.id,
      read: false,
      createdAt: nowDisplay,
    }));

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
    }

    if (currentUser) {
      appendAudit(
        currentUser,
        'Created Document Request',
        'Application',
        newReq.id,
        `Created document request "${newReq.title}" for ${newReq.recipientStudentIds.length} students`
      );
    }
  };

  // Synchronize a Personal Document Vault record into the user's Document Repository
  const handleSyncVaultToRepository = (rawVaultDoc: VaultDocumentRecord, previewUrl?: string) => {
    const vaultDoc = normalizeVaultDocumentRecord(rawVaultDoc);
    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
    const stableDocId = `DOC-VAULT-${vaultDoc.id}`;

    const docTitle =
      vaultDoc.editableDetails?.title || vaultDoc.title || vaultDoc.originalFileName || 'Vault Document';
    const certNo =
      vaultDoc.editableDetails?.certificateNumber ||
      vaultDoc.editableDetails?.documentNumber ||
      `VLT-${vaultDoc.id.slice(-6).toUpperCase()}`;
    const holderName = vaultDoc.editableDetails?.holderName || vaultDoc.ownerName;
    const issuingAuth =
      vaultDoc.editableDetails?.issuingAuthority || 'Authorized Issuing Authority';
    const issueDateVal = vaultDoc.editableDetails?.issueDate || todayStr;
    const expiryDateVal = vaultDoc.editableDetails?.expiryDate || undefined;
    const fileNameVal = vaultDoc.originalFileName || vaultDoc.fileName || 'Document.pdf';
    const hasBlob = Boolean(vaultDoc.hasStoredBlob ?? vaultDoc.hasStoredFileBlob);

    setDocuments((prevDocs) => {
      const existingIdx = prevDocs.findIndex(
        (d) => d.id === stableDocId || d.vaultDocumentId === vaultDoc.id
      );
      const mimeType: DocumentRecord['mimeType'] = (['application/pdf', 'image/jpeg', 'image/png'].includes(
        vaultDoc.mimeType
      )
        ? vaultDoc.mimeType
        : 'application/pdf') as DocumentRecord['mimeType'];

      const rawCat = String(vaultDoc.category || vaultDoc.documentCategory || 'Student Records');
      const mappedCategory: DocumentRecord['category'] =
        rawCat === 'Identity Proofs' ||
        rawCat === 'Marksheets & Transcripts' ||
        rawCat === 'Admission & Fee Receipts' ||
        rawCat === 'Event & Competition Certificates' ||
        rawCat === 'Medical & Fitness Certificates' ||
        rawCat === 'Custom / Other'
          ? 'Student Records'
          : (rawCat as DocumentRecord['category']);

      const mappedVerifLabel: DocumentRecord['verificationStatusLabel'] =
        vaultDoc.verificationStatus === 'Uploaded' || !vaultDoc.verificationStatus
          ? 'Pending Verification'
          : (vaultDoc.verificationStatus as DocumentRecord['verificationStatusLabel']);

      if (existingIdx >= 0) {
        const existingDoc = prevDocs[existingIdx];
        const updatedDraft: DocumentRecord = {
          ...existingDoc,
          name: docTitle,
          category: mappedCategory,
          personName: holderName,
          certificateNumber: certNo || existingDoc.certificateNumber,
          issuingAuthority: issuingAuth || existingDoc.issuingAuthority,
          issueDate: issueDateVal || existingDoc.issueDate,
          expiryDate: expiryDateVal ?? existingDoc.expiryDate,
          fileName: fileNameVal,
          fileSize: vaultDoc.fileSizeLabel,
          mimeType,
          previewUrl: previewUrl || existingDoc.previewUrl,
          vaultDocumentId: vaultDoc.id,
          hasStoredFileBlob: hasBlob,
          ocrStatus: vaultDoc.ocrStatus,
          ocrExtractedText: vaultDoc.ocrExtractedText,
          verificationStatusLabel: mappedVerifLabel,
          statusUpdatedAt: nowDisplay,
          extractedSummary: {
            ...existingDoc.extractedSummary,
            'Document Title': docTitle,
            'Holder / Signatory': holderName,
            'Certificate Number': certNo || existingDoc.certificateNumber,
            'Issuing Authority': issuingAuth,
            'OCR Status': vaultDoc.ocrStatus,
          },
        };
        const evaluated = evaluateDocumentSixPillars(
          updatedDraft,
          prevDocs.map((d, i) => (i === existingIdx ? updatedDraft : d)),
          applications,
          todayStr
        );
        const copy = [...prevDocs];
        copy[existingIdx] = {
          ...updatedDraft,
          completenessStatus: evaluated.completenessStatus,
          consistencyStatus: evaluated.consistencyStatus,
          anomalyStatus: evaluated.anomalyStatus,
          findings: evaluated.findings,
        };
        return copy;
      }

      const internalCode = generateInternalDocumentCode(
        mappedCategory,
        vaultDoc.ownerName,
        prevDocs.map((d) => d.internalCode)
      );

      const draftDoc: DocumentRecord = {
        id: stableDocId,
        internalCode,
        name: docTitle,
        category: mappedCategory,
        suggestedAiCategory: mappedCategory,
        suggestedFolder: `/Repository/Personal-Vault/${mappedCategory.replace(/\s+/g, '-')}`,
        categoryConfirmed: true,
        institutionId: vaultDoc.institutionId || currentUser?.institutionId || 'INST-VESIT-104',
        institutionName: vaultDoc.institutionName || currentUser?.institutionName || 'VESIT',
        uploadedFromSection: 'Personal Document Vault',
        personName: holderName,
        personUserId: vaultDoc.ownerUserId,
        uploadedByUserId: vaultDoc.ownerUserId,
        certificateNumber: certNo,
        issuingAuthority: issuingAuth,
        issueDate: issueDateVal,
        expiryDate: expiryDateVal,
        uploadDate: todayStr,
        fileName: fileNameVal,
        fileSize: vaultDoc.fileSizeLabel,
        mimeType,
        previewUrl,
        vaultDocumentId: vaultDoc.id,
        hasStoredFileBlob: hasBlob,
        ocrStatus: vaultDoc.ocrStatus,
        ocrExtractedText: vaultDoc.ocrExtractedText,
        verificationStatusLabel: mappedVerifLabel,
        approvalStatusLabel: 'Under Review',
        statusUpdatedAt: nowDisplay,
        completenessStatus: 'Complete',
        consistencyStatus: 'Consistent',
        anomalyStatus: 'No Anomaly Detected',
        issuerVerificationStatus: 'Pending',
        humanReviewStatus: 'Pending',
        extractedSummary: {
          'Document Title': docTitle,
          'Holder / Signatory': holderName,
          'Certificate Number': certNo,
          'Issuing Authority': issuingAuth,
          'Storage Location': 'Browser IndexedDB (Personal Document Vault)',
          'OCR Status': vaultDoc.ocrStatus,
        },
        findings: [],
        versions: [
          {
            versionNumber: 1,
            fileName: fileNameVal,
            fileSize: vaultDoc.fileSizeLabel,
            mimeType,
            uploadedAt: nowDisplay,
            uploadedBy: vaultDoc.ownerName,
            changeNote: 'Saved in Personal Document Vault (IndexedDB).',
          },
        ],
      };

      const evaluated = evaluateDocumentSixPillars(
        draftDoc,
        [draftDoc, ...prevDocs],
        applications,
        todayStr
      );
      const newDoc: DocumentRecord = {
        ...draftDoc,
        completenessStatus: evaluated.completenessStatus,
        consistencyStatus: evaluated.consistencyStatus,
        anomalyStatus: evaluated.anomalyStatus,
        findings: evaluated.findings,
      };

      return [newDoc, ...prevDocs];
    });

    if (currentUser) {
      appendAudit(
        currentUser,
        'Synced Personal Vault Document to Repository',
        'Document',
        stableDocId,
        `Synchronized "${docTitle}" (${fileNameVal}) from Personal Document Vault.`
      );
    }
  };

  // Submit Student Documents & Simulated Verification (keeps Demo Verification separate from Reviewer Approval)
  const handleSubmitStudentDocuments = (updatedSub: StudentRequestSubmission) => {
    setStudentSubmissions((prev) => {
      const targetSubStudentId = updatedSub.studentId || updatedSub.studentUserId;
      const existingIdx = prev.findIndex(
        (s) => s.requestId === updatedSub.requestId && (s.studentId === targetSubStudentId || s.studentUserId === targetSubStudentId)
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedSub;
        return copy;
      }
      return [updatedSub, ...prev];
    });

    const request = documentRequests.find((r) => r.id === updatedSub.requestId);
    const todayStr = getLocalTodayDate();
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

    // Synchronize submitted files into the documents repository with independent per-request statuses
    if (updatedSub.documents && updatedSub.documents.length > 0) {
      setDocuments((prevDocs) => {
        let updatedDocs = [...prevDocs];

        updatedSub.documents.forEach((docFile, idx) => {
          const stableDocId = `DOC-SUB-${updatedSub.id}-${docFile.requirementId || idx}`;
          const resolvedStatuses = resolveRepositoryStatusesFromSubmission(
            docFile.verificationOutcome || updatedSub.status,
            docFile.approvalStatus || updatedSub.approvalStatus
          );

          const existingIndex = updatedDocs.findIndex((d) => d.id === stableDocId);
          if (existingIndex >= 0) {
            const existingDoc = updatedDocs[existingIndex];
            const nextVersionNum = existingDoc.versions.length + 1;
            updatedDocs[existingIndex] = {
              ...existingDoc,
              name: docFile.requirementName || existingDoc.name,
              fileName: docFile.fileName,
              fileSize: docFile.fileSize,
              mimeType: (['application/pdf', 'image/jpeg', 'image/png'].includes(docFile.mimeType)
                ? docFile.mimeType
                : 'application/pdf') as any,
              previewUrl: docFile.previewUrl || existingDoc.previewUrl,
              vaultDocumentId: docFile.vaultDocumentId ?? existingDoc.vaultDocumentId,
              hasStoredFileBlob: docFile.hasStoredFileBlob ?? existingDoc.hasStoredFileBlob,
              verificationStatusLabel: resolvedStatuses.verificationStatusLabel,
              approvalStatusLabel: resolvedStatuses.approvalStatusLabel,
              issuerVerificationStatus: resolvedStatuses.issuerVerificationStatus,
              humanReviewStatus: resolvedStatuses.humanReviewStatus,
              statusUpdatedAt: nowDisplay,
              versions: [
                ...existingDoc.versions,
                {
                  versionNumber: nextVersionNum,
                  fileName: docFile.fileName,
                  fileSize: docFile.fileSize,
                  mimeType: (['application/pdf', 'image/jpeg', 'image/png'].includes(docFile.mimeType)
                    ? docFile.mimeType
                    : 'application/pdf') as any,
                  uploadedAt: nowDisplay,
                  uploadedBy: updatedSub.studentName,
                  changeNote: `Submitted amendment for ${request?.title || 'Document Request'}`,
                },
              ],
            };
          } else {
            const cleanRoll = (updatedSub.studentRollNumber || 'DOC').replace(/[^a-zA-Z0-9]/g, '').slice(-3).toUpperCase();
            const internalCode = `STU-REC-${cleanRoll}-${String(idx + 1).padStart(2, '0')}`;
            const newDoc: DocumentRecord = {
              id: stableDocId,
              internalCode,
              name: docFile.requirementName || 'Submitted Document',
              category: 'Student Records',
              suggestedAiCategory: 'Student Records',
              suggestedFolder: '/Repository/Students/Submission-Records',
              categoryConfirmed: true,
              institutionId: currentUser?.institutionId || 'INST-VESIT-104',
              institutionName:
                currentUser?.institutionName ||
                "Vivekanand Education Society's Institute of Technology (VESIT), Mumbai",
              relatedRequestId: updatedSub.requestId,
              uploadedFromSection: `Document Request: ${request?.title || 'Required Documents'}`,
              personName: updatedSub.studentName,
              personUserId: updatedSub.studentId || updatedSub.studentUserId || currentUser?.id,
              uploadedByUserId: currentUser?.id,
              certificateNumber: `SUB-${(updatedSub.studentRollNumber || '2026').replace(/[^a-zA-Z0-9]/g, '')}-${docFile.requirementId.slice(-4).toUpperCase()}`,
              issuingAuthority: 'Government & Academic Authority',
              issueDate: todayStr,
              uploadDate: todayStr,
              fileName: docFile.fileName,
              fileSize: docFile.fileSize,
              mimeType: (['application/pdf', 'image/jpeg', 'image/png'].includes(docFile.mimeType)
                ? docFile.mimeType
                : 'application/pdf') as any,
              previewUrl: docFile.previewUrl,
              vaultDocumentId: docFile.vaultDocumentId,
              hasStoredFileBlob: docFile.hasStoredFileBlob,
              verificationStatusLabel: resolvedStatuses.verificationStatusLabel,
              approvalStatusLabel: resolvedStatuses.approvalStatusLabel,
              statusUpdatedAt: nowDisplay,
              completenessStatus: docFile.verificationOutcome === 'Needs review in demo' ? 'Pending Review' : 'Complete',
              consistencyStatus: 'Consistent',
              anomalyStatus: 'No Anomaly Detected',
              issuerVerificationStatus: resolvedStatuses.issuerVerificationStatus,
              humanReviewStatus: resolvedStatuses.humanReviewStatus,
              extractedSummary: {
                'Document Title': docFile.requirementName || 'Submitted Document',
                'Student Name': updatedSub.studentName,
                'Roll Number': updatedSub.studentRollNumber || 'N/A',
                'Document Request': request?.title || updatedSub.requestId,
                'Submission Source': docFile.vaultDocumentId
                  ? `Linked from Personal Document Vault (${docFile.vaultDocumentId})`
                  : 'Uploaded directly to request',
                'Submission Date': todayStr,
              },
              findings: [
                {
                  id: createRecordId('F'),
                  pillar: 'Completeness',
                  status: docFile.verificationOutcome === 'Needs review in demo' ? 'Flagged' : 'Passed',
                  affectedFieldOrPage: 'Submitted Document',
                  explanation:
                    docFile.verificationFeedback ||
                    'Document submitted for request; awaiting reviewer approval.',
                  evidenceComparison: `File: ${docFile.fileName} (${docFile.fileSize})`,
                  suggestedNextAction:
                    docFile.verificationOutcome === 'Needs review in demo'
                      ? 'Review feedback and provide amendment if requested.'
                      : 'Awaiting reviewer approval decision.',
                },
              ],
              versions: [
                {
                  versionNumber: 1,
                  fileName: docFile.fileName,
                  fileSize: docFile.fileSize,
                  mimeType: (['application/pdf', 'image/jpeg', 'image/png'].includes(docFile.mimeType)
                    ? docFile.mimeType
                    : 'application/pdf') as any,
                  uploadedAt: nowDisplay,
                  uploadedBy: updatedSub.studentName,
                  changeNote: `Submitted for request: ${request?.title || updatedSub.requestId}`,
                },
              ],
            };
            updatedDocs = [newDoc, ...updatedDocs];
          }
        });

        return updatedDocs;
      });
    }

    if (request) {
      const notif: PortalNotification = {
        id: createRecordId('NOTIF'),
        recipientRole: request.creatorRole,
        recipientUserId: request.creatorUserId,
        userId: request.creatorUserId,
        type: 'status_change',
        title: `Documents Submitted: ${updatedSub.studentName}`,
        message: `${updatedSub.studentName} has submitted documents for "${request.title}". Verification: ${updatedSub.status} · Approval: ${updatedSub.approvalStatus || 'Pending Approval'}.`,
        targetView: 'dashboard',
        targetRecordId: request.id,
        read: false,
        createdAt: nowDisplay,
      };
      setNotifications((prev) => [notif, ...prev]);
    }

    if (currentUser) {
      appendAudit(
        currentUser,
        'Submitted Required Documents',
        'Document',
        updatedSub.requestId,
        `${updatedSub.studentName} submitted files for request "${request?.title || updatedSub.requestId}" (Verification: ${updatedSub.status}, Approval: ${updatedSub.approvalStatus || 'Pending Approval'})`
      );
    }
  };

  // Explicit Reviewer Approval Decision on a Student Request Submission (independent per request)
  const handleReviewStudentSubmission = (
    submissionId: string,
    decision: 'Approved' | 'Rejected' | 'Needs Review',
    note: string
  ) => {
    if (!currentUser) return;
    const targetSub = studentSubmissions.find((s) => s.id === submissionId);
    if (!targetSub) return;

    const updatedSub = applyReviewerDecisionToSubmission(targetSub, decision, currentUser, note);
    const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());

    setStudentSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? updatedSub : s))
    );

    // Update only the repository records belonging to THIS specific submission (DOC-SUB-${submissionId}-...)
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => {
        if (!doc.id.startsWith(`DOC-SUB-${submissionId}-`)) return doc;
        return {
          ...doc,
          approvalStatusLabel: decision,
          humanReviewStatus:
            decision === 'Approved'
              ? 'Reviewed'
              : decision === 'Needs Review' || decision === 'Rejected'
                ? 'Action Required'
                : doc.humanReviewStatus,
          statusUpdatedAt: nowDisplay,
        };
      })
    );

    appendAudit(
      currentUser,
      `Student Submission ${decision}`,
      'Document',
      targetSub.requestId,
      `${currentUser.fullName} marked submission ${submissionId} (${targetSub.studentName}) as ${decision}: ${note}`
    );
  };

  // If not authenticated, render LandingPageView by default, LoginView, or SignUpView
  if (!currentUser) {
    if (authScreenMode === 'landing') {
      return (
        <>
          <LandingPageView
            onOpenLogin={() => setAuthScreenMode('login')}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          />
          <GeminiChatbotWidget
            currentUser={null}
            applications={applications}
            documents={documents}
          />
        </>
      );
    }
    if (authScreenMode === 'signup') {
      return (
        <>
          <SignUpView
            institutions={SEED_INSTITUTIONS}
            users={users}
            approvalRequests={approvalRequests}
            onCreateRequest={handleCreateSignupRequest}
            onResubmitRequest={handleResubmitSignupRequest}
            onBackToLogin={() => {
              setSignupInitialMode('register');
              setSignupPrefillId('');
              setAuthScreenMode('login');
            }}
            onBackToLanding={() => {
              setSignupInitialMode('register');
              setSignupPrefillId('');
              setAuthScreenMode('landing');
            }}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((prev) => !prev)}
            initialMode={signupInitialMode}
            initialLookupIdentifier={signupPrefillId}
          />
          <GeminiChatbotWidget
            currentUser={null}
            applications={applications}
            documents={documents}
          />
        </>
      );
    }
    return (
      <>
        <LoginView
          users={users}
          approvalRequests={approvalRequests}
          onLoginSuccess={handleLoginSuccess}
          onOpenSignUp={(mode, prefill) => {
            setSignupInitialMode(mode || 'register');
            setSignupPrefillId(prefill || '');
            setAuthScreenMode('signup');
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          onBackToLanding={() => setAuthScreenMode('landing')}
        />
        <GeminiChatbotWidget
          currentUser={null}
          applications={applications}
          documents={documents}
        />
      </>
    );
  }

  if (showPublicOverview) {
    return (
      <>
        <LandingPageView
          onOpenLogin={() => setShowPublicOverview(false)}
          isAuthenticated
          onReturnToWorkspace={() => setShowPublicOverview(false)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        />
        <GeminiChatbotWidget
          currentUser={currentUser}
          applications={applications}
          documents={documents}
        />
      </>
    );
  }

  const selectedApplication =
    applications.find(
      (a) => a.id === selectedApplicationId && canUserAccessApplication(currentUser, a)
    ) || null;

  const userInstitution = SEED_INSTITUTIONS.find((i) => i.id === currentUser.institutionId);

  return (
    <AppShell
      currentUser={currentUser}
      users={users}
      institutions={SEED_INSTITUTIONS}
      applications={applications}
      documents={documents}
      notifications={notifications}
      pendingApprovalCount={pendingApprovalCount}
      activeView={activeView}
      onNavigate={handleNavigate}
      onOpenApplication={(appId) => setSelectedApplicationId(appId)}
      onOpenDocument={(docId) => {
        setActiveView('documents');
        setSelectedDocumentId(docId);
      }}
      onMarkNotificationRead={(notifId) =>
        setNotifications((prev) =>
          prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
        )
      }
      onMarkAllNotificationsRead={() =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
      onLogout={handleLogout}
      onResetRegistryData={handleResetRegistryData}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      onOpenPublicLanding={() => setShowPublicOverview(true)}
    >
      {/* Main View Router */}
      {activeView === 'dashboard' &&
        (currentUser.role === 'admin' ? (
          <AdminDashboardView
            currentUser={currentUser}
            applications={applications}
            documents={documents}
            auditEvents={auditEvents}
            pendingApprovalCount={pendingApprovalCount}
            allUsers={users}
            documentRequests={documentRequests}
            studentSubmissions={studentSubmissions}
            onCreateDocumentRequest={handleCreateDocumentRequest}
            onReviewSubmissionDecision={handleReviewStudentSubmission}
            onOpenApplication={(appId) => setSelectedApplicationId(appId)}
            onOpenDocument={(docId) => {
              setActiveView('documents');
              setSelectedDocumentId(docId);
            }}
            onNavigate={handleNavigate}
          />
        ) : (
          <InstitutionalDashboardView
            currentUser={currentUser}
            institution={userInstitution}
            institutions={SEED_INSTITUTIONS}
            applications={applications}
            documents={documents}
            auditEvents={auditEvents}
            pendingApprovalCount={pendingApprovalCount}
            allUsers={users}
            documentRequests={documentRequests}
            studentSubmissions={studentSubmissions}
            onCreateDocumentRequest={handleCreateDocumentRequest}
            onSubmitStudentDocuments={handleSubmitStudentDocuments}
            onReviewSubmissionDecision={handleReviewStudentSubmission}
            onApplyAssignment={handleApplyOrganisationalAssignment}
            onRemoveFromAssignment={handleRemoveFromAssignment}
            onRemoveInstitutionalAssociation={handleRemoveInstitutionalAssociation}
            onOpenApplication={(appId) => setSelectedApplicationId(appId)}
            onOpenDocument={(docId) => {
              setActiveView('documents');
              setSelectedDocumentId(docId);
            }}
            onCreateApplication={handleCreateApplication}
            onNavigate={handleNavigate}
          />
        ))}

      {activeView === 'applications' &&
        (currentUser.role === 'admin' ? (
          <AdminDashboardView
            currentUser={currentUser}
            applications={applications}
            documents={documents}
            auditEvents={auditEvents}
            pendingApprovalCount={pendingApprovalCount}
            onOpenApplication={(appId) => setSelectedApplicationId(appId)}
            onOpenDocument={(docId) => {
              setActiveView('documents');
              setSelectedDocumentId(docId);
            }}
            onNavigate={handleNavigate}
            showFullTableOnly
          />
        ) : (
          <InstitutionalDashboardView
            currentUser={currentUser}
            institution={userInstitution}
            institutions={SEED_INSTITUTIONS}
            applications={applications}
            documents={documents}
            auditEvents={auditEvents}
            pendingApprovalCount={pendingApprovalCount}
            allUsers={users}
            onApplyAssignment={handleApplyOrganisationalAssignment}
            onRemoveFromAssignment={handleRemoveFromAssignment}
            onRemoveInstitutionalAssociation={handleRemoveInstitutionalAssociation}
            onOpenApplication={(appId) => setSelectedApplicationId(appId)}
            onOpenDocument={(docId) => {
              setActiveView('documents');
              setSelectedDocumentId(docId);
            }}
            onCreateApplication={handleCreateApplication}
            onNavigate={handleNavigate}
          />
        ))}

      {activeView === 'documents' && (
        <DocumentRepositoryView
          currentUser={currentUser}
          documents={documents}
          applications={applications}
          institutions={SEED_INSTITUTIONS}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={setSelectedDocumentId}
          onOpenApplication={(appId) => setSelectedApplicationId(appId)}
          onUploadDocument={handleUploadDocument}
          onReplaceDocumentVersion={handleReplaceDocumentVersion}
          onUpdateDocumentHumanReview={handleUpdateDocumentHumanReview}
          onSyncVaultToRepository={handleSyncVaultToRepository}
        />
      )}

      {activeView === 'verification' && (
        <VerificationComplianceView
          currentUser={currentUser}
          documents={documents}
          complianceRules={complianceRules}
          onRunAllVerificationChecks={handleRunAllVerificationChecks}
          onOpenDocument={(docId) => {
            setActiveView('documents');
            setSelectedDocumentId(docId);
          }}
          onToggleRuleActive={(ruleId) => {
            if (!canUserPerformAdminAction(currentUser)) return;
            setComplianceRules((prev) =>
              prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
            );
          }}
          onAddComplianceRule={(newRule) => {
            if (!canUserPerformAdminAction(currentUser)) return;
            const ruleObj: ComplianceRule = {
              ...newRule,
              id: createRecordId('RULE'),
            };
            setComplianceRules((prev) => [ruleObj, ...prev]);
            appendAudit(
              currentUser,
              'Compliance Rule Added',
              'ComplianceRule',
              ruleObj.code,
              `Added rule "${ruleObj.name}" (${ruleObj.version}).`
            );
          }}
          onAddInfrastructureEvidence={({ facilityTitle, carpetAreaSqm, certNumber }) => {
            const todayStr = getLocalTodayDate();
            const nowDisplay = formatTimestampForDisplay(getCurrentIsoTimestamp());
            const internalCode = generateInternalDocumentCode(
              'Infrastructure',
              currentUser.institutionName || currentUser.fullName,
              documents.map((d) => d.internalCode)
            );
            handleUploadDocument({
              internalCode,
              name: facilityTitle,
              category: 'Infrastructure',
              suggestedAiCategory: 'Infrastructure',
              suggestedFolder: '/Repository/Campus/Safety-And-Infrastructure',
              categoryConfirmed: true,
              institutionId: currentUser.institutionId || 'INST-VESIT-104',
              institutionName: currentUser.institutionName || 'VESIT',
              personName: currentUser.fullName,
              personUserId: currentUser.id,
              certificateNumber: certNumber,
              issuingAuthority: 'Institutional Estate & Technical Cell',
              issueDate: todayStr,
              expiryDate: addDaysToLocalDate(todayStr, 365),
              uploadDate: todayStr,
              fileName: `${internalCode}_Facility_Evidence.png`,
              fileSize: '3.10 MB',
              mimeType: 'image/png',
              completenessStatus: 'Pending Review',
              consistencyStatus: 'Pending Check',
              anomalyStatus: 'Not Screened',
              issuerVerificationStatus: 'Not Checked',
              humanReviewStatus: 'Pending',
              isInfrastructureEvidence: true,
              facilityAreaSqm: carpetAreaSqm,
              advisoryInspectionNote: `Visual Inspection Advisory: Declared carpet area (${carpetAreaSqm} sq.m) meets statutory instructional space norm. Physical Expert Visit Committee (EVC) verification remains mandatory.`,
              extractedSummary: {
                'Facility Name': facilityTitle,
                'Declared Carpet Area': `${carpetAreaSqm} sq.m`,
                'Reference Number': certNumber,
              },
              findings: [
                {
                  id: createRecordId('F-INF'),
                  pillar: 'Completeness',
                  status: 'Advisory',
                  affectedFieldOrPage: 'Photographic Evidence Pack',
                  explanation: 'Advisory layout check recorded; queued for physical EVC inspection.',
                  evidenceComparison: `${carpetAreaSqm} sq.m >= 66 sq.m minimum norm`,
                  suggestedNextAction: 'Include in EVC visit schedule.',
                },
              ],
              versions: [
                {
                  versionNumber: 1,
                  fileName: `${internalCode}_Facility_Evidence.png`,
                  fileSize: '3.10 MB',
                  mimeType: 'image/png',
                  uploadedAt: nowDisplay,
                  uploadedBy: currentUser.fullName,
                  changeNote: 'Registered infrastructure photographic evidence metadata.',
                },
              ],
            });
          }}
        />
      )}

      {activeView === 'expiry' && (
        <ExpiryCalendarView
          currentUser={currentUser}
          documents={documents}
          onOpenDocument={(docId) => {
            setActiveView('documents');
            setSelectedDocumentId(docId);
          }}
          onOpenApplication={(appId) => setSelectedApplicationId(appId)}
        />
      )}

      {(activeView === 'reports' || activeView === 'accounts') && (
        <ReportsAndAccountsView
          mode={activeView}
          currentUser={currentUser}
          users={users}
          approvalRequests={approvalRequests}
          institutions={SEED_INSTITUTIONS}
          applications={applications}
          documents={documents}
          auditEvents={auditEvents}
          onCreateAccount={(newUserData) => {
            const created: UserAccount = {
              ...newUserData,
              id: createRecordId('USR'),
              createdAt: getLocalTodayDate(),
            };
            const nextUsers = syncStudentClassTeacherLinks([created, ...users]);
            setUsers(nextUsers);
            refreshPendingApprovalRouting(nextUsers);
            appendAudit(
              currentUser,
              'Account Provisioned',
              'Account',
              created.username,
              `Provisioned ${formatRoleDisplayName(created.role)} account for ${created.fullName} (${created.normalizedPhone}).`
            );
          }}
          onUpdateAccountStatus={(userId, status: AccountStatus) => {
            const nextUsers = syncStudentClassTeacherLinks(
              users.map((u) => (u.id === userId ? { ...u, status } : u))
            );
            setUsers(nextUsers);
            refreshPendingApprovalRouting(nextUsers);
            appendAudit(
              currentUser,
              'Account Status Updated',
              'Account',
              userId,
              `Updated account status to ${status}.`
            );
          }}
          onDecideApprovalRequest={handleDecideApprovalRequest}
          onApplyAssignment={handleApplyOrganisationalAssignment}
          onRemoveFromAssignment={handleRemoveFromAssignment}
          onRemoveInstitutionalAssociation={handleRemoveInstitutionalAssociation}
          onOpenApplication={(appId) => setSelectedApplicationId(appId)}
          onOpenDocument={(docId) => {
            setActiveView('documents');
            setSelectedDocumentId(docId);
          }}
        />
      )}

      {(activeView === 'profile' || activeView === 'settings') && (
        <ProfileAndSettingsView
          mode={activeView}
          currentUser={currentUser}
          users={users}
          approvalRequests={approvalRequests}
          onUpdateProfile={(updatedFields) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === currentUser.id ? { ...u, ...updatedFields } : u))
            );
            appendAudit(
              currentUser,
              'Profile Updated',
              'Account',
              currentUser.username,
              'Updated permitted personal profile details.'
            );
          }}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          onResetRegistryData={handleResetRegistryData}
          onSyncVaultToRepository={handleSyncVaultToRepository}
        />
      )}

      {/* Application Detail Slide-Over Modal */}
      <AnimatePresence>
        {selectedApplication && (
          <ApplicationDetailModal
            key={selectedApplication.id}
            application={selectedApplication}
            documents={documents}
            currentUser={currentUser}
            onClose={() => setSelectedApplicationId(null)}
            onOpenDocument={(docId) => {
              setSelectedApplicationId(null);
              setActiveView('documents');
              setSelectedDocumentId(docId);
            }}
            onAttachChecklistDocument={handleAttachChecklistDocument}
            onSubmitDraftApplication={handleSubmitDraftApplication}
            onResubmitApplication={handleResubmitApplication}
            onAdminAction={handleAdminAction}
          />
        )}
      </AnimatePresence>

      {/* Role-Specific Gemini Compliance Assistant */}
      <GeminiChatbotWidget
        currentUser={currentUser}
        applications={applications}
        documents={documents}
      />
    </AppShell>
  );
}
