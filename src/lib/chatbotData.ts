import { ApplicationRecord, DocumentRecord, Role, UserAccount } from '../types/portal';
import { calculateExpiryDetails, getLocalTodayDate } from './domain';

export interface ChatbotPresetPrompt {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface RoleChatbotConfig {
  roleKey: Role | 'public';
  interfaceTitle: string;
  roleBadge: string;
  welcomeMessage: string;
  placeholder: string;
  prompts: ChatbotPresetPrompt[];
}

export interface PortalChatContext {
  currentUser: UserAccount | null;
  applications: ApplicationRecord[];
  documents: DocumentRecord[];
}

/**
 * Generates role-specific chatbot prompts, questions, and data-driven answers
 * so that Admin, Institutional Representative, Faculty, Student, and Public interfaces
 * each have a tailored set of prompts and responses grounded in current workspace state.
 */
export function getRoleChatbotConfig(
  role: Role | 'public',
  context: PortalChatContext
): RoleChatbotConfig {
  const { currentUser, applications, documents } = context;
  const todayDate = getLocalTodayDate();

  if (role === 'admin') {
    const pendingApps = applications.filter(
      (a) =>
        a.status === 'Submitted' ||
        a.status === 'Automated Checks Complete' ||
        a.status === 'Pending Verification' ||
        a.status === 'Under Manual Review'
    );
    const infoReqApps = applications.filter(
      (a) => a.status === 'Additional Information Required'
    );
    const expiringDocs = documents.filter((d) => {
      const exp = calculateExpiryDetails(d.expiryDate, todayDate);
      return exp.status === 'Expired' || exp.status === 'Expiring Soon';
    });
    const flaggedDocs = documents.filter(
      (d) =>
        d.consistencyStatus === 'Mismatch Flagged' ||
        d.anomalyStatus === 'Suspected Alteration / Duplicate' ||
        d.completenessStatus === 'Missing Pages/Fields'
    );

    return {
      roleKey: 'admin',
      interfaceTitle: 'Admin Compliance Assistant',
      roleBadge: 'Admin / Regional Officer Mode',
      welcomeMessage: `Namaste ${currentUser?.fullName || 'Officer'}. I am your VERIDEX Admin Compliance Assistant. I can summarize pending institutional dossiers, explain review flags, or guide you through deficiency notices and account provisioning.`,
      placeholder: 'Ask about pending dossiers, consistency flags, expiry alerts, or RBAC...',
      prompts: [
        {
          id: 'adm-1',
          category: 'Queue Triage',
          question: 'Which institutional applications have flagged consistency or expiry issues right now?',
          answer: `Currently, there are ${applications.length} total institutional applications in the registry (${pendingApps.length} in the active review queue and ${infoReqApps.length} awaiting additional information as of ${todayDate}).\n\n• Flagged Dossiers Requiring Officer Attention:\n1. APP-2026-0104 (Vivekanand Education Society's Institute of Technology (VESIT), Mumbai — Extension of Approval): Municipal Fire & Life Safety Certificate (INF-FAC-VES-01) is expired and Ph.D. degree record (FAC-QUA-KUL-01) has a middle-initial variance.\n2. APP-2026-0103 (Eastern Metropolitan Technical Campus, Kolkata — Extension of Approval): WBFES Fire Safety Certificate (INF-FAC-EMT-01) carries an integrity review flag requiring manual inspection.\n3. APP-2026-0105 (Kaveri College of Engineering & Research, Bengaluru — Increase in Intake): BBMP Occupancy Certificate (INF-FAC-KAV-02) is missing Page 3 Annexure-B.\n\nUse "Review Dossier" in the Applications Registry to inspect the side-by-side evidence comparison before recording a human decision.`,
        },
        {
          id: 'adm-2',
          category: 'Decision Protocol',
          question: "How do I issue an 'Additional Information Required' deficiency notice vs recording a final decision?",
          answer: `As an authorized Regional Reviewer (${currentUser?.permissionLevel || 'Level 2/3'}), follow this workflow:\n\n1. Open any application from the Admin Dashboard by clicking "Review Dossier".\n2. Inspect the Checklist & 6-Pillar Verification Findings tab.\n3. To request clarification or a renewed certificate: Enter your reviewer note, select "Request Correction / Info", and confirm. This transitions the application to "Additional Information Required" and notifies the institution's Nodal Officer.\n4. To record a human determination: Select one of the compliance outcomes ("Compliance Verified — Recommended", "Conditional Compliance — Inspection Required", or "Deficiency Recorded — Deferred"), enter a mandatory decision note, and confirm. Every action is appended to the application history and audit trail.`,
        },
        {
          id: 'adm-3',
          category: 'Verification Pillars',
          question: 'Why does Issuer Verification show "Unavailable" or "Not Checked" on certain records, and how should I treat review flags?',
          answer: `Under VERIDEX Responsible Verification Governance:\n\n• Issuer Verification ("Unavailable" / "Not Checked"): When an external municipal board or university registry integration is not connected in this portal environment, Issuer Verification is explicitly marked "Unavailable" or "Not Checked" rather than fabricated. Reviewers inspect the certificate number and metadata manually.\n• Review Signals (${flaggedDocs.length} currently flagged): Automated flags—such as name variances, missing pages, or layout anomalies—are decision-support review signals, NEVER automatic proof of fraud or automatic rejection. Human reviewer sign-off is required for every compliance decision.`,
        },
        {
          id: 'adm-4',
          category: 'Expiry Risk Summary',
          question: 'Summarize current certificate expiry risks across all registered institutions.',
          answer: `Across ${documents.length} repository documents, ${expiringDocs.length} certificate(s) are currently Expired or Expiring Soon (within the 45-day threshold relative to ${todayDate}):\n\n• Expired (< 0 days remaining): Municipal Fire & Life Safety Certificate (INF-FAC-VES-01), MPCB Consent (INF-FAC-VES-04), and EMTC Joint FDR (FIN-TRU-EMT-01).\n• Expiring Soon (≤ 45 days): Faculty Cadre Roster (FAC-REC-VES-01), Central Library Consortium License (INF-FAC-VES-03), Delhi Fire NOC (INF-FAC-ISA-01), and AMC Fire NOC (INF-FAC-SAR-01).\n\nClick "Expiry Alerts" on your Admin Dashboard to open the Expiry Calendar and filter by Expired or 30/45-day windows.`,
        },
        {
          id: 'adm-5',
          category: 'RBAC & Provisioning',
          question: 'How do I provision a new Nodal Officer, Faculty, or Student account with phone uniqueness validation?',
          answer: `Navigate to "Reports & Accounts" in the left sidebar:\n\n1. Open the "Account Creation & Access Management" tab and select the target role (Admin, Institutional Representative, Faculty, or Student).\n2. Enter a globally unique Username and 10-digit Indian mobile number.\n3. VERIDEX normalizes phone numbers to canonical +91XXXXXXXXXX format and blocks duplicate usernames or phone numbers across all roles.\n4. For Institutional Representatives, Faculty, and Students, bind the account to its Institution Code so role-based data scoping is applied across views.`,
        },
      ],
    };
  }

  if (role === 'institutional_rep') {
    const instCode = currentUser?.officialInstitutionCode || 'INST-VESIT-104';
    const instName =
      currentUser?.institutionName || "Vivekanand Education Society's Institute of Technology (VESIT), Mumbai";
    const myApps = applications.filter(
      (a) => a.institutionId === currentUser?.institutionId
    );
    const myDocs = documents.filter(
      (d) => d.institutionId === currentUser?.institutionId
    );
    const actionReq = myApps.filter(
      (a) => a.status === 'Additional Information Required'
    );

    return {
      roleKey: 'institutional_rep',
      interfaceTitle: 'Institutional Nodal Officer Assistant',
      roleBadge: `Institute Mode · ${instCode}`,
      welcomeMessage: `Namaste ${currentUser?.fullName || 'Nodal Officer'}. I am scoped to ${instName} (${instCode}). Ask me about resolving reviewer correction requests, category checklists, or registering renewed institutional document records.`,
      placeholder: 'Ask about your institution dossiers, checklist items, or resubmission...',
      prompts: [
        {
          id: 'inst-1',
          category: 'Deficiency Resolution',
          question: "How do I respond to an 'Additional Information Required' notice and resubmit our dossier?",
          answer: `For ${instName} (${instCode}), you currently have ${actionReq.length} application(s) marked "Additional Information Required"${actionReq.length > 0 ? ` (${actionReq.map((a) => a.id).join(', ')})` : ''}:\n\n1. Click the "Respond & Resubmit" button on the alert banner or application row.\n2. Review the Reviewer's correction request in the Review Notes & History panel.\n3. If a renewed certificate is needed, register the updated document metadata in the Document Repository or directly against the flagged checklist item.\n4. Enter your institutional clarification response in the Resubmission box and confirm "Submit Response & Resubmit Application". The status transitions to "Under Manual Review" and notifies the assigned reviewer.`,
        },
        {
          id: 'inst-2',
          category: 'Flagged Certificates',
          question: 'Why were our Fire Safety Certificate and Faculty Ph.D. Record flagged in APP-2026-0104?',
          answer: `In your institutional repository (${myDocs.length} records scoped to ${instCode}), two review signals on APP-2026-0104 require Nodal Officer attention:\n\n1. INF-FAC-VES-01 (Municipal Fire & Life Safety Certificate): The recorded expiry date has lapsed relative to today's date (${todayDate}). Register the renewed Municipal Fire Brigade certificate metadata as a new version.\n2. FAC-QUA-KUL-01 (Ph.D. Degree — Dr. Shravani Salunkhe): Consistency check noted a middle-initial variance ("Shravani M. Salunkhe" vs "Shravani Salunkhe" on the roster). Attach a name-equivalence clarification note when resubmitting.`,
        },
        {
          id: 'inst-3',
          category: 'Category Checklists',
          question: "What mandatory documents are required when starting a 'New Course Approval' or 'Extension of Approval' application?",
          answer: `When you click "Start New Application" on your Institutional Dashboard, VERIDEX generates a category-specific checklist:\n\n• Extension of Approval (EoA): (1) University Continuation of Affiliation Letter, (2) Municipal Fire & Life Safety Renewal Certificate, (3) Principal & Senior Faculty Ph.D. Qualification Dossiers, (4) Audited Financial Statement & Corpus Fund Utilization, and (5) Updated Faculty Cadre Roster.\n• New Course Approval (AI & Data Science): (1) Affiliating University NOC, (2) High-Performance Computing Lab Readiness Proof, (3) Core AI/ML Faculty Ph.D. Degrees, (4) Faculty Experience Certificates, and (5) Governing Body Seed Budget Resolution.`,
        },
        {
          id: 'inst-4',
          category: 'Document Registration & Versioning',
          question: 'How does document metadata registration and versioning work when replacing an expired certificate?',
          answer: `VERIDEX tracks structured document metadata and version history in the browser workspace:\n\n1. Open the Document Repository and select the expired or flagged record (e.g., INF-FAC-VES-01), or click "Register Document Record".\n2. Select a local file to capture its filename, MIME type, and file size, verify the keyword-suggested category, and enter the Certificate Number, Issue Date, and Expiry Date.\n3. Newly registered records begin with "Pending Review" / "Pending Check" status until a reviewer inspects them.\n4. The internal document code remains stable across versions while retaining previous version entries in the history log.`,
        },
        {
          id: 'inst-5',
          category: 'Dossier Summary',
          question: "Summarize our institution's current application statuses and checklist completion progress.",
          answer: `Summary for ${instName} (${instCode}) as of ${todayDate}:\n\n• Total Institutional Applications: ${myApps.length}\n${myApps
            .map((a) => {
              const ready = a.checklist.filter(
                (c) => c.status === 'Verified' || c.status === 'Uploaded'
              ).length;
              return `  - ${a.id} (${a.category}): Status "${a.status}" · Checklist ${ready}/${a.checklist.length} recorded`;
            })
            .join('\n')}\n• Authorized Repository Documents: ${myDocs.length} total records scoped to ${instCode}.`,
        },
      ],
    };
  }

  if (role === 'faculty') {
    const instCode = currentUser?.officialInstitutionCode || 'INST-VESIT-104';
    const instName =
      currentUser?.institutionName || "Vivekanand Education Society's Institute of Technology (VESIT), Mumbai";
    const facDocs = documents.filter(
      (d) =>
        d.institutionId === currentUser?.institutionId &&
        (d.personUserId === currentUser?.id ||
          d.category === 'Faculty Records' ||
          d.category === 'Qualifications' ||
          d.category === 'Experience Certificates' ||
          d.category === 'Infrastructure' ||
          d.category === 'Approvals')
    );

    return {
      roleKey: 'faculty',
      interfaceTitle: 'Faculty Dossier & Cadre Assistant',
      roleBadge: `Faculty Mode · ${currentUser?.department || 'Academic Cadre'}`,
      welcomeMessage: `Namaste ${currentUser?.fullName || 'Professor'}. I am your Faculty Compliance & Dossier Assistant for ${instName}. Ask me about faculty qualification records, internal document codes, or laboratory readiness evidence.`,
      placeholder: 'Ask about faculty qualifications, experience records, or lab audits...',
      prompts: [
        {
          id: 'fac-1',
          category: 'Internal Document Codes',
          question: 'How are faculty qualification and experience internal codes (e.g., FAC-QUA-KUL-01) generated?',
          answer: `VERIDEX assigns every registered record a deterministic, human-readable Internal Document Code based on Category Prefix + Surname/Entity 3-letter code + Sequential 2-digit index:\n\n• Qualifications: FAC-QUA-<SUR>-01\n• Experience Certificates: FAC-EXP-<SUR>-01\n• Faculty Appointment Records: FAC-REC-<SUR>-01\n• Infrastructure & Labs: INF-FAC-<INS>-01\n\nIf multiple faculty members share a similar surname or have multiple degrees, the numeric suffix increments automatically (-01, -02, -03) to prevent collisions.`,
        },
        {
          id: 'fac-2',
          category: 'Faculty & Lab Flags',
          question: 'Which faculty or laboratory records in my institution currently have verification flags?',
          answer: `Within your authorized faculty and departmental scope at ${instName} (${facDocs.length} accessible records):\n\n• Flagged Qualification Record: Ph.D. Degree & Notification — Dr. Shravani Salunkhe (FAC-QUA-KUL-01) has a middle-initial consistency flag ("Shravani M. Salunkhe" vs "Shravani Salunkhe").\n• Flagged Institutional Infrastructure: Municipal Fire & Life Safety Certificate (INF-FAC-VES-01) is expired and awaiting renewal registration by the Nodal Officer.\n\nYou can inspect these in the "Verification & Compliance" or "Document Repository" views.`,
        },
        {
          id: 'fac-3',
          category: 'Lab Evidence Submission',
          question: 'How do I record computing lab carpet area and photographic evidence for EVC inspection?',
          answer: `To log laboratory or instructional facility readiness metadata:\n\n1. Open the "Verification & Compliance" workspace from the left sidebar.\n2. Scroll to the "Infrastructure & Laboratory Visual Evidence Advisory" panel.\n3. Enter the Facility Title (e.g., "AI & High-Performance Computing Lab — Room A-304"), Declared Carpet Area in sq.m (norm ≥ 66 sq.m per 30 seats), and Reference Certificate Number.\n4. Click "Log Infrastructure Evidence". VERIDEX creates an INF-FAC record with an EVC physical inspection advisory note.`,
        },
        {
          id: 'fac-4',
          category: 'Role Permissions',
          question: "Why am I restricted from modifying institutional trust deeds or viewing students' private records?",
          answer: `VERIDEX applies role-based data scoping in the portal interface:\n\n• As a Faculty account (${currentUser?.employeeId || 'VESIT-FAC-2019-084'}), you can view your institution's compliance applications, faculty qualifications, experience certificates, approvals, and infrastructure records.\n• Financial & Trust Deeds and individual Student scholarship/marksheet records are scoped to their respective authorized roles.\n• Submitting institutional applications or recording compliance decisions is restricted to Nodal Officers and Reviewers respectively.`,
        },
        {
          id: 'fac-5',
          category: 'Consistency Checks',
          question: "What causes a 'Mismatch Flagged' finding on a Faculty Qualification or Experience record?",
          answer: `Consistency checks compare recorded certificate metadata against the institutional faculty roster:\n\n• Name or Spelling Discrepancy: e.g., middle initial or surname variation without an accompanying gazette/affidavit note.\n• Overlapping Service Dates: Prior experience relieving date overlapping with the joining date on the appointment order.\n• Degree Specialization Mismatch: Declared department cadre vs convocation discipline.\n\nWhen flagged, coordinate with your Nodal Officer to attach a clarification note or supporting annexure.`,
        },
      ],
    };
  }

  if (role === 'student') {
    const myStudentDocs = documents.filter(
      (d) =>
        d.institutionId === currentUser?.institutionId &&
        (d.personUserId === currentUser?.id ||
          d.personName.toLowerCase() === (currentUser?.fullName || '').toLowerCase())
    );

    return {
      roleKey: 'student',
      interfaceTitle: 'Student Verified Records Assistant',
      roleBadge: `Student Mode · ${currentUser?.rollNumber || 'PRN Verified'}`,
      welcomeMessage: `Hi ${currentUser?.fullName || 'Scholar'}! I am your VERIDEX Student Records Assistant. I can help you check the review status of your academic and scholarship documents, explain data privacy scoping, or guide you on profile updates.`,
      placeholder: 'Ask about your verified marksheets, scholarship record, or profile...',
      prompts: [
        {
          id: 'stu-1',
          category: 'My Verified Records',
          question: 'What is the current verification status of my academic and scholarship records?',
          answer: `You currently have ${myStudentDocs.length} authorized record(s) linked to your student profile (${currentUser?.fullName}, Roll/PRN: ${currentUser?.rollNumber || 'VESIT23CE042'}):\n\n${
            myStudentDocs.length > 0
              ? myStudentDocs
                  .map(
                    (d) =>
                      `• ${d.internalCode} — ${d.name} (Cert #${d.certificateNumber}): Completeness: ${d.completenessStatus} · Consistency: ${d.consistencyStatus} · Issuer Status: ${d.issuerVerificationStatus} · Human Review: ${d.humanReviewStatus}`
                  )
                  .join('\n')
              : '• No pending discrepancies found on your student records.'
          }\n\nClick any record on your dashboard to view the recorded summary fields and certificate details.`,
        },
        {
          id: 'stu-2',
          category: 'Data Privacy & Isolation',
          question: 'Why can I only view my own academic records and not institutional applications or other students?',
          answer: `VERIDEX scopes the Student workspace to protect personal academic privacy:\n\n• Your student view only displays records where you are the designated scholar (${currentUser?.fullName} / ${currentUser?.id}).\n• Institutional regulatory applications, faculty service files, and other students' records are hidden from student accounts.`,
        },
        {
          id: 'stu-3',
          category: 'Profile & Contact Update',
          question: 'How do I update my mobile phone number or email address in my student profile?',
          answer: `To update your contact information:\n\n1. Click "Profile & Settings" in the left navigation sidebar.\n2. Update your Phone Number, Email Address, Date of Birth (which recalculates your age relative to ${todayDate}), or Gender.\n3. VERIDEX validates that your phone number (+91XXXXXXXXXX) and username are unique across the portal. Core institutional identifiers (Role, Institution Code, and Roll/PRN) are read-only and managed by your institution's Nodal Officer.`,
        },
        {
          id: 'stu-4',
          category: 'Review Status Meaning',
          question: "What does 'Human Review: Reviewed' mean on my scholarship or enrollment record?",
          answer: `When a record shows "Completeness: Complete", "Consistency: Consistent", and "Human Review: Reviewed":\n\n1. Completeness: All required pages and roll number/PRN fields were recorded.\n2. Consistency: Your name (${currentUser?.fullName}), Roll Number (${currentUser?.rollNumber}), and institution (${currentUser?.institutionName}) match enrollment records.\n3. Reviewer Sign-Off: An authorized compliance reviewer has inspected and confirmed the record.`,
        },
        {
          id: 'stu-5',
          category: 'Correction Request',
          question: 'Who should I contact if my Roll Number, PRN, or semester details need official correction?',
          answer: `Because Roll Number (${currentUser?.rollNumber}), Course (${currentUser?.course}), and Institutional Affiliation (${currentUser?.institutionName}) are institutional identity fields, they are read-only for students.\n\nIf you spot a typographical error in your PRN or marksheet annexure, please contact your institution's Verified Nodal Officer (Dr. Aashay Khadkikar for VESIT Mumbai) to register a revised version in the institutional repository.`,
        },
      ],
    };
  }

  // Public / Unauthenticated visitor mode
  return {
    roleKey: 'public',
    interfaceTitle: 'VERIDEX Portal Guide',
    roleBadge: 'Public Visitor Mode',
    welcomeMessage:
      'Namaste! Welcome to VERIDEX (हर दावे की जाँच, हर सच की पहचान). Ask me how our institutional validation workflow operates, or sign in with a role-based account to access tailored compliance tools.',
    placeholder: 'Ask about VERIDEX workflow, 6-pillar checks, or role access...',
    prompts: [
      {
        id: 'pub-1',
        category: 'Platform Overview',
        question: 'How does the 3-step VERIDEX workflow (Submit → Validate → Review) work?',
        answer: `VERIDEX streamlines statutory compliance into three auditable stages:\n\n1. Submit: Institutional Nodal Officers select an application category (such as Extension of Approval or New Course Approval) and upload documents against a tailored checklist.\n2. Validate: Automated checks evaluate 6 pillars—Completeness, Expiry Windows, Cross-Document Consistency, Anomaly Indicators, Issuer Verification, and Human Review readiness.\n3. Review: Authorized AICTE compliance officers inspect flagged review signals, request clarifications if needed, and record final compliance decisions.`,
      },
      {
        id: 'pub-2',
        category: 'Role Isolation',
        question: 'What are the four role interfaces supported in the VERIDEX portal?',
        answer: `VERIDEX provides four distinct, role-isolated workspaces:\n\n• AICTE Admin / Compliance Reviewer: Full multi-institution registry, Recharts compliance analytics, verification workspace, expiry calendar, and account provisioning.\n• Institutional Representative (Nodal Officer): Scoped strictly to their own institution's applications, checklists, document repository, and deficiency responses.\n• Faculty / Staff: Scoped to faculty qualification/experience dossiers and departmental laboratory readiness.\n• Student: Strictly isolated to the student's own verified academic and scholarship records.`,
      },
      {
        id: 'pub-3',
        category: 'Responsible AI',
        question: 'Are automated verification flags treated as automatic rejections?',
        answer: `Never. Under VERIDEX Responsible Verification Governance, automated consistency mismatches, expiry warnings, or anomaly indicators are surfaced strictly as review signals for qualified human officers. Every compliance determination requires explicit human inspection and sign-off.`,
      },
    ],
  };
}

/**
 * Generates a rich, deterministic, role-scoped response when the user types a custom question
 * and the server-side Gemini API is either unreachable or unconfigured.
 */
export function generateFallbackRoleResponse(
  role: Role | 'public',
  userMessage: string,
  context: PortalChatContext
): string {
  const config = getRoleChatbotConfig(role, context);
  const q = userMessage.toLowerCase();

  // Check if the query closely matches one of the role's preset prompts
  for (const preset of config.prompts) {
    const keywords = preset.question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const matchCount = keywords.filter((kw) => q.includes(kw)).length;
    if (matchCount >= 2 || q.includes(preset.category.toLowerCase())) {
      return preset.answer;
    }
  }

  if (q.includes('expiry') || q.includes('expired') || q.includes('fire')) {
    return config.prompts.find(
      (p) =>
        p.question.toLowerCase().includes('expiry') ||
        p.question.toLowerCase().includes('fire') ||
        p.question.toLowerCase().includes('status')
    )?.answer || config.prompts[0].answer;
  }

  if (q.includes('flag') || q.includes('mismatch') || q.includes('consistency') || q.includes('check')) {
    return (
      config.prompts.find(
        (p) =>
          p.question.toLowerCase().includes('flag') ||
          p.question.toLowerCase().includes('mismatch') ||
          p.question.toLowerCase().includes('status')
      )?.answer || config.prompts[0].answer
    );
  }

  if (q.includes('profile') || q.includes('phone') || q.includes('account') || q.includes('password')) {
    return (
      config.prompts.find(
        (p) =>
          p.question.toLowerCase().includes('profile') ||
          p.question.toLowerCase().includes('account')
      )?.answer || config.prompts[config.prompts.length - 1].answer
    );
  }

  return `${config.welcomeMessage}\n\nHere is a summary for your current workspace (${config.roleBadge}):\n\n${config.prompts[0].answer}\n\nTip: You can also click any of the suggested role-specific prompts above for instant answers tailored to your ${role.replace('_', ' ')} permissions.`;
}
