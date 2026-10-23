/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  buildCategoryChecklist,
  canUserAccessApplication,
  canUserAccessDocument,
  canUserPerformAdminAction,
  generateInternalDocumentCode,
  REFERENCE_DATE,
} from './lib/domain';
import { LoginView } from './components/LoginView';
import { AppShell } from './components/AppShell';
import { AdminDashboardView } from './components/AdminDashboardView';
import { InstitutionalDashboardView } from './components/InstitutionalDashboardView';
import { ApplicationDetailModal } from './components/ApplicationDetailModal';
import { DocumentRepositoryView } from './components/DocumentRepositoryView';
import { VerificationComplianceView } from './components/VerificationComplianceView';
import { ExpiryCalendarView } from './components/ExpiryCalendarView';
import { ReportsAndAccountsView } from './components/ReportsAndAccountsView';
import { ProfileAndSettingsView } from './components/ProfileAndSettingsView';

const STORAGE_KEYS = {
  theme: 'veridex_portal_theme_v3',
  currentUserId: 'veridex_portal_current_user_v3',
  users: 'veridex_portal_users_v3',
  applications: 'veridex_portal_apps_v3',
  documents: 'veridex_portal_docs_v3',
  rules: 'veridex_portal_rules_v3',
  notifications: 'veridex_portal_notifs_v3',
  audit: 'veridex_portal_audit_v3',
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

  const [users, setUsers] = useState<UserAccount[]>(() =>
    loadFromStorage(STORAGE_KEYS.users, SEED_USERS)
  );
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

  // Check ?autostart=1 or saved user session
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'USR-ADM-01';
      }
      return window.localStorage.getItem(STORAGE_KEYS.currentUserId);
    } catch {
      return null;
    }
  });

  const [activeView, setActiveView] = useState<MainView>('dashboard');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
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
      id: `AUD-${Date.now()}`,
      timestamp: `${REFERENCE_DATE} 14:30`,
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

  const handleResetDemoData = () => {
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
    demoDocumentTitle?: string;
    demoCertNumber?: string;
  }) => {
    if (!currentUser || !currentUser.institutionId) return;

    const newAppNumber = 112 + applications.length;
    const newAppId = `APP-2026-0${newAppNumber}`;
    const checklist = buildCategoryChecklist(params.category);
    const createdDocIds: string[] = [];

    if (params.demoDocumentTitle && params.demoCertNumber) {
      const firstItem = checklist[0];
      const newDocId = `DOC-${Date.now()}`;
      const internalCode = generateInternalDocumentCode(
        firstItem.documentCategory,
        currentUser.fullName,
        documents.map((d) => d.internalCode)
      );

      const newDoc: DocumentRecord = {
        id: newDocId,
        internalCode,
        name: params.demoDocumentTitle,
        category: firstItem.documentCategory,
        suggestedAiCategory: firstItem.documentCategory,
        suggestedFolder: `/Repository/${firstItem.documentCategory.replace(/\s+/g, '-')}`,
        categoryConfirmed: true,
        institutionId: currentUser.institutionId,
        institutionName: currentUser.institutionName || 'Vidyapeeth Institute of Technology, Pune',
        relatedApplicationId: newAppId,
        personName: currentUser.fullName,
        personUserId: currentUser.id,
        certificateNumber: params.demoCertNumber,
        issuingAuthority: 'Affiliating University & Statutory Board',
        issueDate: '2026-09-01',
        expiryDate: '2027-08-31',
        uploadDate: REFERENCE_DATE,
        fileName: `${internalCode}_Dossier.pdf`,
        fileSize: '1.68 MB',
        mimeType: 'application/pdf',
        completenessStatus: 'Complete',
        consistencyStatus: 'Consistent',
        anomalyStatus: 'No Anomaly Detected',
        issuerVerificationStatus: 'Verified',
        humanReviewStatus: 'Pending',
        extractedSummary: {
          'Document Title': params.demoDocumentTitle,
          'Certificate Number': params.demoCertNumber,
          'Application Category': params.category,
          'Automated Extraction': 'All required fields extracted and matched',
        },
        findings: [
          {
            id: `F-${Date.now()}-1`,
            pillar: 'Completeness',
            status: 'Passed',
            affectedFieldOrPage: 'Pages 1–3',
            explanation: 'Automated extraction verified all statutory clauses and signatures.',
            evidenceComparison: `Cert #${params.demoCertNumber} matches application checklist.`,
            suggestedNextAction: 'Ready for regional officer human review.',
          },
        ],
        versions: [
          {
            versionNumber: 1,
            fileName: `${internalCode}_Dossier.pdf`,
            fileSize: '1.68 MB',
            mimeType: 'application/pdf',
            uploadedAt: `${REFERENCE_DATE} 14:22`,
            uploadedBy: currentUser.fullName,
            changeNote: 'Uploaded during application creation.',
          },
        ],
      };

      setDocuments((prev) => [newDoc, ...prev]);
      createdDocIds.push(newDocId);
      checklist[0] = {
        ...firstItem,
        linkedDocumentId: newDocId,
        status: 'Verified',
      };
    }

    const initialStatus = params.submitImmediately ? 'Submitted' : 'Draft';
    const newApp: ApplicationRecord = {
      id: newAppId,
      institutionId: currentUser.institutionId,
      institutionName: currentUser.institutionName || 'Vidyapeeth Institute of Technology, Pune',
      officialInstitutionCode: currentUser.officialInstitutionCode || currentUser.institutionId,
      category: params.category,
      submittedDate: params.submitImmediately ? REFERENCE_DATE : '—',
      lastUpdated: REFERENCE_DATE,
      status: initialStatus,
      assignedReviewer: 'Karan Saini',
      checklist,
      documentIds: createdDocIds,
      reviewNotes: [],
      statusHistory: [
        {
          id: `SH-${Date.now()}-1`,
          fromStatus: 'Created',
          toStatus: initialStatus,
          changedBy: currentUser.fullName,
          changedByRole: currentUser.role,
          timestamp: `${REFERENCE_DATE} 14:22`,
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
          id: `NOTIF-${Date.now()}`,
          recipientRole: 'admin',
          title: `New Application Submitted: ${newAppId}`,
          message: `${newApp.institutionName} submitted ${newApp.category} for compliance review.`,
          createdAt: `${REFERENCE_DATE} 14:22`,
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

  // Attach / Upload Demo Document to Checklist Item
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

    const item = targetApp.checklist.find((c) => c.id === params.checklistItemId);
    const docCat = item?.documentCategory || 'Approvals';
    const newDocId = `DOC-${Date.now()}`;
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
      issueDate: REFERENCE_DATE,
      expiryDate: params.expiryDate,
      uploadDate: REFERENCE_DATE,
      fileName: `${internalCode}_Verified.pdf`,
      fileSize: '1.54 MB',
      mimeType: 'application/pdf',
      completenessStatus: 'Complete',
      consistencyStatus: 'Consistent',
      anomalyStatus: 'No Anomaly Detected',
      issuerVerificationStatus: 'Verified',
      humanReviewStatus: 'Pending',
      extractedSummary: {
        'Document Title': params.docTitle,
        'Certificate Number': params.certNumber,
        'Linked Application': targetApp.id,
      },
      findings: [
        {
          id: `F-${Date.now()}`,
          pillar: 'Completeness',
          status: 'Passed',
          affectedFieldOrPage: 'Pages 1–2',
          explanation: 'Automated extraction verified required fields and validity dates.',
          evidenceComparison: `Cert #${params.certNumber} verified against checklist requirement.`,
          suggestedNextAction: 'Await human reviewer confirmation.',
        },
      ],
      versions: [
        {
          versionNumber: 1,
          fileName: `${internalCode}_Verified.pdf`,
          fileSize: '1.54 MB',
          mimeType: 'application/pdf',
          uploadedAt: `${REFERENCE_DATE} 14:25`,
          uploadedBy: currentUser.fullName,
          changeNote: `Uploaded for checklist item "${item?.title}".`,
        },
      ],
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== params.appId) return app;
        return {
          ...app,
          lastUpdated: REFERENCE_DATE,
          documentIds: [...app.documentIds, newDocId],
          checklist: app.checklist.map((c) =>
            c.id === params.checklistItemId
              ? {
                  ...c,
                  linkedDocumentId: newDocId,
                  status: 'Verified',
                  notes: undefined,
                }
              : c
          ),
        };
      })
    );

    appendAudit(
      currentUser,
      'Checklist Document Uploaded',
      'Document',
      newDocId,
      `Uploaded ${internalCode} (${params.docTitle}) to ${params.appId}.`
    );
  };

  // Submit Draft Application
  const handleSubmitDraftApplication = (appId: string, submissionNote: string) => {
    if (!currentUser) return;
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;
        return {
          ...app,
          status: 'Submitted',
          submittedDate: REFERENCE_DATE,
          lastUpdated: REFERENCE_DATE,
          statusHistory: [
            ...app.statusHistory,
            {
              id: `SH-${Date.now()}`,
              fromStatus: app.status,
              toStatus: 'Submitted',
              changedBy: currentUser.fullName,
              changedByRole: currentUser.role,
              timestamp: `${REFERENCE_DATE} 14:26`,
              note: submissionNote,
            },
          ],
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        recipientRole: 'admin',
        title: `Application Submitted for Review (${appId})`,
        message: `${currentUser.institutionName || currentUser.fullName} submitted ${appId}.`,
        createdAt: `${REFERENCE_DATE} 14:26`,
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
            expiryDate: doc.expiryDate ? '2027-10-04' : undefined,
            consistencyStatus: 'Consistent',
            humanReviewStatus: 'Pending',
            versions: [
              ...doc.versions,
              {
                versionNumber: doc.versions.length + 1,
                fileName: `Renewed_${doc.fileName}`,
                fileSize: '2.18 MB',
                mimeType: doc.mimeType,
                uploadedAt: `${REFERENCE_DATE} 14:28`,
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
          lastUpdated: REFERENCE_DATE,
          checklist: params.attachRenewedCertificate
            ? app.checklist.map((c) =>
                c.status === 'Flagged for Review'
                  ? {
                      ...c,
                      status: 'Uploaded',
                      notes: 'Renewed document & clarification uploaded by institution.',
                    }
                  : c
              )
            : app.checklist,
          reviewNotes: [
            ...app.reviewNotes,
            {
              id: `RN-${Date.now()}`,
              authorId: currentUser.id,
              authorName: currentUser.fullName,
              authorRole: currentUser.role,
              timestamp: `${REFERENCE_DATE} 14:28`,
              actionType: 'Resubmission Response',
              note: params.responseNote,
            },
          ],
          statusHistory: [
            ...app.statusHistory,
            {
              id: `SH-${Date.now()}`,
              fromStatus: app.status,
              toStatus: 'Under Manual Review',
              changedBy: currentUser.fullName,
              changedByRole: currentUser.role,
              timestamp: `${REFERENCE_DATE} 14:28`,
              note: `Institutional resubmission: ${params.responseNote}`,
            },
          ],
        };
      })
    );

    setNotifications((prev) => [
      {
        id: `NOTIF-${Date.now()}`,
        recipientRole: 'admin',
        title: `Application Resubmitted: ${params.appId}`,
        message: `${currentUser.fullName} responded to the review request and resubmitted ${params.appId} for manual review.`,
        createdAt: `${REFERENCE_DATE} 14:28`,
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
          lastUpdated: REFERENCE_DATE,
          decisionOutcome:
            params.actionType === 'Authorized Decision'
              ? params.decisionOutcome
              : app.decisionOutcome,
          reviewNotes: [
            ...app.reviewNotes,
            {
              id: `RN-${Date.now()}`,
              authorId: currentUser.id,
              authorName: currentUser.fullName,
              authorRole: currentUser.role,
              timestamp: `${REFERENCE_DATE} 14:30`,
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
                    id: `SH-${Date.now()}`,
                    fromStatus: app.status,
                    toStatus: nextStatus,
                    changedBy: currentUser.fullName,
                    changedByRole: currentUser.role,
                    timestamp: `${REFERENCE_DATE} 14:30`,
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
          id: `NOTIF-${Date.now()}`,
          recipientRole: 'institutional_rep',
          institutionId: targetApp.institutionId,
          title:
            params.actionType === 'Correction Request'
              ? `Action Required: Clarification Requested on ${targetApp.id}`
              : `Compliance Decision Recorded on ${targetApp.id}`,
          message: params.note,
          createdAt: `${REFERENCE_DATE} 14:30`,
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

  // Document Repository Upload
  const handleUploadDocument = (
    newDocData: Omit<DocumentRecord, 'id' | 'internalCode'> & { internalCode: string }
  ) => {
    if (!currentUser) return;
    const newDocId = `DOC-${Date.now()}`;
    const fullDoc: DocumentRecord = {
      ...newDocData,
      id: newDocId,
    };
    setDocuments((prev) => [fullDoc, ...prev]);

    if (fullDoc.relatedApplicationId) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === fullDoc.relatedApplicationId
            ? { ...a, documentIds: [...a.documentIds, newDocId], lastUpdated: REFERENCE_DATE }
            : a
        )
      );
    }

    appendAudit(
      currentUser,
      'Document Uploaded to Repository',
      'Document',
      newDocId,
      `Uploaded ${fullDoc.internalCode} (${fullDoc.name}).`
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
          uploadDate: REFERENCE_DATE,
          completenessStatus: 'Complete',
          humanReviewStatus: 'Pending',
          versions: [
            ...doc.versions,
            {
              versionNumber: nextVersionNumber,
              fileName: params.fileName,
              fileSize: params.fileSize,
              mimeType: params.mimeType,
              uploadedAt: `${REFERENCE_DATE} 14:32`,
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
      `Uploaded new version (${params.fileName}): ${params.changeNote}`
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

  // If not authenticated, render LoginView
  if (!currentUser) {
    return (
      <LoginView
        users={users}
        onLoginSuccess={handleLoginSuccess}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />
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
      onSwitchDemoUser={(demoUser) => {
        setCurrentUserId(demoUser.id);
        setActiveView('dashboard');
        setSelectedApplicationId(null);
        setSelectedDocumentId(null);
        appendAudit(
          demoUser,
          'Switched Active Demo Persona',
          'Account',
          demoUser.id,
          `Switched active demonstration role to ${demoUser.fullName} (${demoUser.role}).`
        );
      }}
      onLogout={handleLogout}
      onResetDemoData={handleResetDemoData}
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
              id: `RULE-${Date.now()}`,
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
              institutionId: currentUser.institutionId || 'INST-PUNE-104',
              institutionName:
                currentUser.institutionName || 'Vidyapeeth Institute of Technology, Pune',
              personName: currentUser.fullName,
              personUserId: currentUser.id,
              certificateNumber: certNumber,
              issuingAuthority: 'Institutional Estate & Technical Cell',
              issueDate: REFERENCE_DATE,
              expiryDate: '2027-10-23',
              uploadDate: REFERENCE_DATE,
              fileName: `${internalCode}_Facility_Evidence.png`,
              fileSize: '3.10 MB',
              mimeType: 'image/png',
              completenessStatus: 'Complete',
              consistencyStatus: 'Consistent',
              anomalyStatus: 'No Anomaly Detected',
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
                  id: `F-INF-${Date.now()}`,
                  pillar: 'Completeness',
                  status: 'Passed',
                  affectedFieldOrPage: 'Photographic Evidence Pack',
                  explanation: 'Advisory layout check completed; queued for physical inspection.',
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
                  uploadedAt: `${REFERENCE_DATE} 14:35`,
                  uploadedBy: currentUser.fullName,
                  changeNote: 'Attached infrastructure photographic evidence.',
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
              id: `USR-${Date.now()}`,
              createdAt: REFERENCE_DATE,
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
          onResetDemoData={handleResetDemoData}
        />
      )}

      {/* Application Detail Slide-Over Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
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
    </AppShell>
  );
}
