/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  AccountStatus,
  ApplicationCategory,
  ApplicationRecord,
  AuditEvent,
  ComplianceRule,
  DocumentRecord,
  MainView,
  PortalNotification,
  UserAccount,
} from './types/portal';
import {
  SEED_APPLICATIONS,
  SEED_AUDIT_EVENTS,
  SEED_COMPLIANCE_RULES,
  SEED_DOCUMENTS,
  SEED_INSTITUTIONS,
  SEED_NOTIFICATIONS,
  SEED_USERS,
} from './data/seedData';
import {
  addDaysToLocalDate,
  buildCategoryChecklist,
  canUserAccessApplication,
  canUserPerformAdminAction,
  createRecordId,
  formatTimestampForDisplay,
  generateInternalDocumentCode,
  getCurrentIsoTimestamp,
  getLocalTodayDate,
  sanitizeUserForStorage,
} from './lib/domain';
import { LoginView } from './components/LoginView';
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

const STORAGE_KEYS = {
  theme: 'veridex_portal_theme_v6',
  currentUserId: 'veridex_portal_current_user_v6',
  users: 'veridex_portal_users_v6',
  applications: 'veridex_portal_apps_v6',
  documents: 'veridex_portal_docs_v6',
  rules: 'veridex_portal_rules_v6',
  notifications: 'veridex_portal_notifs_v6',
  audit: 'veridex_portal_audit_v6',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadUsersFromStorage(): UserAccount[] {
  const stored = loadFromStorage<UserAccount[]>(STORAGE_KEYS.users, SEED_USERS);
  return stored.map((u) => {
    const seedMatch = SEED_USERS.find((s) => s.id === u.id || s.username === u.username);
    return {
      ...u,
      password: u.password ?? seedMatch?.password ?? u.username,
    };
  });
}

export default function App() {
  // Light theme is default; Dark mode is optional and persistent
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.theme) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.title = 'VERIDEX';
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

  const [users, setUsers] = useState<UserAccount[]>(loadUsersFromStorage);
  const [applications, setApplications] = useState<ApplicationRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.applications, SEED_APPLICATIONS)
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.documents, SEED_DOCUMENTS)
  );
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>(() =>
    loadFromStorage(STORAGE_KEYS.rules, SEED_COMPLIANCE_RULES)
  );
  const [notifications, setNotifications] = useState<PortalNotification[]>(() =>
    loadFromStorage(STORAGE_KEYS.notifications, SEED_NOTIFICATIONS)
  );
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() =>
    loadFromStorage(STORAGE_KEYS.audit, SEED_AUDIT_EVENTS)
  );

  // Restore saved session if present; never silently auto-login unauthenticated visitors
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.currentUserId);
    } catch {
      return null;
    }
  });

  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<MainView>('dashboard');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Sync state to localStorage (omitting plaintext passwords from persisted user records)
  useEffect(() => {
    try {
      const sanitizedUsers = users.map(sanitizeUserForStorage);
      window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(sanitizedUsers));
      window.localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(applications));
      window.localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(documents));
      window.localStorage.setItem(STORAGE_KEYS.rules, JSON.stringify(complianceRules));
      window.localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
      window.localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(auditEvents));
      if (currentUserId) {
        window.localStorage.setItem(STORAGE_KEYS.currentUserId, currentUserId);
      } else {
        window.localStorage.removeItem(STORAGE_KEYS.currentUserId);
      }
    } catch {
      // ignore storage errors
    }
  }, [users, applications, documents, complianceRules, notifications, auditEvents, currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) || null;

  const appendAudit = (
    actor: UserAccount,
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
    setShowLogin(false);
    setActiveView('dashboard');
    setSelectedApplicationId(null);
    setSelectedDocumentId(null);
    appendAudit(
      user,
      'User Session Authenticated',
      'Account',
      user.id,
      `Signed in as ${user.fullName} (${user.role}).`
    );
  };

  const handleLogout = () => {
    if (currentUser) {
      appendAudit(
        currentUser,
        'User Signed Out',
        'Account',
        currentUser.id,
        `Signed out from ${currentUser.role} session.`
      );
    }
    setCurrentUserId(null);
    setSelectedApplicationId(null);
    setSelectedDocumentId(null);
  };

  const handleResetRegistryData = () => {
    setUsers(SEED_USERS);
    setApplications(SEED_APPLICATIONS);
    setDocuments(SEED_DOCUMENTS);
    setComplianceRules(SEED_COMPLIANCE_RULES);
    setNotifications(SEED_NOTIFICATIONS);
    setAuditEvents(SEED_AUDIT_EVENTS);
    setSelectedApplicationId(null);
    setSelectedDocumentId(null);
    setActiveView('dashboard');
  };

  // Enforce role-based route access when navigating
  const handleNavigate = (view: MainView) => {
    if (!currentUser) return;
    if (view === 'accounts' && currentUser.role !== 'admin') {
      setActiveView('dashboard');
      return;
    }
    if (
      (view === 'applications' || view === 'verification' || view === 'expiry' || view === 'reports') &&
      currentUser.role === 'student'
    ) {
      setActiveView('dashboard');
      return;
    }
    setActiveView(view);
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
        institutionName:
          currentUser.institutionName ||
          "Vivekanand Education Society's Institute of Technology (VESIT), Mumbai",
        relatedApplicationId: newAppId,
        personName: currentUser.fullName,
        personUserId: currentUser.id,
        certificateNumber: params.initialCertNumber,
        issuingAuthority: 'University of Mumbai & Statutory Board',
        issueDate: addDaysToLocalDate(todayStr, -30),
        expiryDate: addDaysToLocalDate(todayStr, 335),
        uploadDate: todayStr,
        fileName: `${internalCode}_Dossier.pdf`,
        fileSize: '1.68 MB',
        mimeType: 'application/pdf',
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
      institutionName:
        currentUser.institutionName ||
        "Vivekanand Education Society's Institute of Technology (VESIT), Mumbai",
      officialInstitutionCode: currentUser.officialInstitutionCode || currentUser.institutionId,
      category: params.category,
      submittedDate: params.submitImmediately ? todayStr : '—',
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
      personName: currentUser.fullName,
      personUserId: currentUser.id,
      certificateNumber: params.certNumber,
      issuingAuthority: 'Competent Statutory Authority',
      issueDate: todayStr,
      expiryDate: params.expiryDate,
      uploadDate: todayStr,
      fileName: `${internalCode}_Record.pdf`,
      fileSize: '1.54 MB',
      mimeType: 'application/pdf',
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

    setDocuments((prev) => [newDoc, ...prev]);
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
    const fullDoc: DocumentRecord = {
      ...newDocData,
      id: newDocId,
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
      `Registered ${fullDoc.internalCode} (${fullDoc.name}).`
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
        return {
          ...doc,
          fileName: params.fileName,
          fileSize: params.fileSize,
          mimeType: params.mimeType,
          expiryDate: params.newExpiryDate || doc.expiryDate,
          uploadDate: todayStr,
          completenessStatus: 'Pending Review',
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
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, humanReviewStatus: status } : doc))
    );
    appendAudit(currentUser, `Document Marked ${status}`, 'Document', docId, note);
  };

  // If not authenticated, render LandingPageView by default or LoginView when Sign In is requested
  if (!currentUser) {
    if (!showLogin) {
      return (
        <>
          <LandingPageView onOpenLogin={() => setShowLogin(true)} />
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
          onLoginSuccess={handleLoginSuccess}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          onBackToLanding={() => setShowLogin(false)}
        />
        <GeminiChatbotWidget
          currentUser={null}
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
      onSwitchActiveAccount={(targetUser) => {
        setCurrentUserId(targetUser.id);
        setActiveView('dashboard');
        setSelectedApplicationId(null);
        setSelectedDocumentId(null);
        appendAudit(
          targetUser,
          'Switched Active Account Session',
          'Account',
          targetUser.id,
          `Switched active role session to ${targetUser.fullName} (${targetUser.role}).`
        );
      }}
      onLogout={handleLogout}
      onResetRegistryData={handleResetRegistryData}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((prev) => !prev)}
    >
      {/* Main View Router */}
      {activeView === 'dashboard' &&
        (currentUser.role === 'admin' ? (
          <AdminDashboardView
            currentUser={currentUser}
            applications={applications}
            documents={documents}
            auditEvents={auditEvents}
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
            applications={applications}
            documents={documents}
            auditEvents={auditEvents}
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
            applications={applications}
            documents={documents}
            auditEvents={auditEvents}
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
        />
      )}

      {activeView === 'verification' && (
        <VerificationComplianceView
          currentUser={currentUser}
          documents={documents}
          complianceRules={complianceRules}
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
              institutionName:
                currentUser.institutionName ||
                "Vivekanand Education Society's Institute of Technology (VESIT), Mumbai",
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
            setUsers((prev) => [created, ...prev]);
            appendAudit(
              currentUser,
              'Account Provisioned',
              'Account',
              created.username,
              `Provisioned ${created.role} account for ${created.fullName} (${created.normalizedPhone}).`
            );
          }}
          onUpdateAccountStatus={(userId, status: AccountStatus) => {
            setUsers((prev) =>
              prev.map((u) => (u.id === userId ? { ...u, status } : u))
            );
            appendAudit(
              currentUser,
              'Account Status Updated',
              'Account',
              userId,
              `Updated account status to ${status}.`
            );
          }}
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
