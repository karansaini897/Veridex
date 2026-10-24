import { ApplicationRecord, DocumentRecord, Role, UserAccount } from '../types/portal';
import { calculateExpiryDetails, REFERENCE_DATE } from './domain';

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
 * Generates role-specific chatbot prompts, questions, and detailed data-driven answers
 * so that Admin, Institutional Representative, Faculty, Student, and Public interfaces
 * each have a tailored set of prompts and responses.
 */
export function getRoleChatbotConfig(
  role: Role | 'public',
  context: PortalChatContext
): RoleChatbotConfig {
  const { currentUser, applications, documents } = context;

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
      const exp = calculateExpiryDetails(d.expiryDate, REFERENCE_DATE);
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
      interfaceTitle: 'AICTE Admin Compliance Assistant',
      roleBadge: 'Admin / Regional Officer Mode',
      welcomeMessage: `Namaste ${currentUser?.fullName || 'Officer'}. I am your VERIDEX Admin Compliance Assistant. I can summarize pending institutional dossiers, explain verification flags, or guide you through deficiency notices and account provisioning.`,
      placeholder: 'Ask about pending dossiers, consistency flags, expiry alerts, or RBAC...',
      prompts: [
        {
          id: 'adm-1',
          category: 'Queue Triage',
          question: 'Which institutional applications have flagged consistency or expiry issues right now?',
          answer: `Currently, there are ${applications.length} total institutional applications in the registry (${pendingApps.length} in the active review queue and ${infoReqApps.length} awaiting additional information).\n\n• Flagged Dossiers Requiring Officer Attention:\n1. APP-2026-0101 (Vidyapeeth Institute of Technology, Pune — Extension of Approval): Municipal Fire & Life Safety Certificate (INF-FAC-VIT-01) expired 20 days ago on 2026-10-03.\n2. APP-2026-0102 (Vidyapeeth Institute of Technology, Pune — Increase in Intake B.Tech CSE): Declared intake (180 seats) vs University NOC approved intake (120 seats) mismatch flagged on APR-REG-VIT-02.\n3. APP-2026-0104 (Deccan Institute of Engineering & Research, Hyderabad — Faculty Cadre Ratio): Missing Annexure-B experience page and duplicate seal anomaly indicator flagged.\n\nUse "Review Dossier" in the Applications Registry to inspect the side-by-side evidence comparison before recording a decision.`,
        },
        {
          id: 'adm-2',
          category: 'Decision Protocol',
          question: "How do I issue an 'Additional Information Required' deficiency notice vs recording a final decision?",
          answer: `As an authorized Regional Reviewer (${currentUser?.permissionLevel || 'Level 2/3'}), follow this statutory workflow:\n\n1. Open any application from the Admin Dashboard by clicking "Review Dossier".\n2. Inspect the Checklist & 6-Pillar Verification Findings tab.\n3. To request clarification or a renewed certificate: Select "Request Additional Information / Clarification", enter your specific officer note (e.g., requesting a renewed Fire Safety NOC or intake reconciliation), and submit. This transitions the application to "Additional Information Required" and alerts the institution's Nodal Officer.\n4. To record a final determination: Select "Record Final Compliance Decision" and choose one of the three statutory outcomes ("Compliance Verified — Recommended", "Conditional Compliance — Inspection Required", or "Deficiency Recorded — Deferred"). Every action is permanently recorded in the immutable Audit Trail.`,
        },
        {
          id: 'adm-3',
          category: 'Verification Pillars',
          question: 'Why does Issuer Verification show "Unavailable" on certain certificates, and how should I treat anomaly flags?',
          answer: `Under VERIDEX Responsible Verification Governance:\n\n• Issuer Verification ("Unavailable" vs "Verified"): When a state municipal board or university registry does not expose a live cryptographic webhook in this portal environment, Issuer Verification is explicitly marked "Unavailable" rather than fabricated. Officers must verify the physical/digital seal and reference number manually.\n• Anomaly & Consistency Signals (${flaggedDocs.length} currently flagged): Automated flags—such as intake discrepancies or suspected duplicate stamps—are decision-support review signals, NEVER automatic proof of fraud or automatic rejection. Human officer review and sign-off are mandatory before any adverse compliance determination.`,
        },
        {
          id: 'adm-4',
          category: 'Expiry Risk Summary',
          question: 'Summarize current certificate expiry risks across all registered institutions.',
          answer: `Across ${documents.length} repository documents, ${expiringDocs.length} certificate(s) are currently Expired or Expiring Soon (within the 45-day statutory threshold relative to ${REFERENCE_DATE}):\n\n• Expired (< 0 days remaining): Municipal Fire & Life Safety Certificate (INF-FAC-VIT-01, expired 2026-10-03) and National Research Lab Safety Clearance (INF-FAC-DIE-01).\n• Expiring Soon (≤ 45 days): University Affiliation Continuation Order and Campus Occupancy renewals.\n\nClick "Expiry Alerts" in the top right of your Admin Dashboard to open the Expiry Calendar and filter by Expired or 30/45-day windows.`,
        },
        {
          id: 'adm-5',
          category: 'RBAC & Provisioning',
          question: 'How do I provision a new Nodal Officer, Faculty, or Student account with phone uniqueness validation?',
          answer: `Navigate to "Accounts & Access" in the left sidebar:\n\n1. Click "Provision New Account" and select the target role (Admin, Institutional Representative, Faculty, or Student).\n2. Enter a globally unique Username and 10-digit Indian mobile number.\n3. VERIDEX automatically normalizes phone numbers to canonical +91XXXXXXXXXX format (stripping spaces, hyphens, or leading zeros) and blocks duplicate usernames or phone numbers across all roles.\n4. For Institutional Representatives, Faculty, and Students, bind the account to its authorized Institution Code so strict Role-Based Data Isolation is enforced.`,
        },
      ],
    };
  }

  if (role === 'institutional_rep') {
    const instCode = currentUser?.officialInstitutionCode || 'INST-PUNE-104';
    const instName =
      currentUser?.institutionName || 'Vidyapeeth Institute of Technology, Pune';
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
      welcomeMessage: `Namaste ${currentUser?.fullName || 'Nodal Officer'}. I am scoped to ${instName} (${instCode}). Ask me about resolving AICTE deficiency notices, category checklists, or replacing expired institutional certificates.`,
      placeholder: 'Ask about your institution dossiers, checklist items, or resubmission...',
      prompts: [
        {
          id: 'inst-1',
          category: 'Deficiency Resolution',
          question: "How do I respond to an AICTE 'Additional Information Required' notice and resubmit our dossier?",
          answer: `For ${instName} (${instCode}), you currently have ${actionReq.length} application(s) marked "Additional Information Required"${actionReq.length > 0 ? ` (${actionReq.map((a) => a.id).join(', ')})` : ''}:\n\n1. Click the red "Respond & Resubmit" button on the urgent banner or application card.\n2. Review the AICTE Reviewer's deficiency note in the Review Notes & Timeline tab.\n3. If a renewed certificate is needed, upload the new version in the Document Repository or attach it directly to the flagged checklist item.\n4. Enter your institutional clarification response in the Resubmission box and click "Submit Clarification & Resubmit Dossier". The status will immediately update to "Under Manual Review" and notify the regional reviewer.`,
        },
        {
          id: 'inst-2',
          category: 'Flagged Certificates',
          question: 'Why were our Fire Safety Certificate and B.Tech CSE Intake NOC flagged during automated checks?',
          answer: `In your institutional repository (${myDocs.length} authorized documents), two key review signals require Nodal Officer action:\n\n1. INF-FAC-VIT-01 (Municipal Fire & Life Safety Certificate): The recorded expiry date (2026-10-03) has lapsed by 20 days relative to the current compliance cycle (${REFERENCE_DATE}). Upload the renewed PMC Fire Brigade certificate as Version 2.\n2. APR-REG-VIT-02 (University Intake Enhancement NOC): Automated OCR cross-checking detected that the application requests 180 seats for B.Tech CSE, whereas the uploaded SPPU NOC specifies 120 seats. Submit either the revised 180-seat university addendum or a formal intake reconciliation note.`,
        },
        {
          id: 'inst-3',
          category: 'Category Checklists',
          question: "What mandatory documents are required when starting a 'New Course Approval' or 'Extension of Approval' application?",
          answer: `When you click "Start New Application" on your Institutional Dashboard, VERIDEX generates a tailored statutory checklist:\n\n• Extension of Approval (EoA): (1) University Continuation of Affiliation Letter, (2) Municipal Fire & Life Safety Renewal Certificate, (3) Principal & Senior Faculty Ph.D. Qualification Dossiers, (4) Audited Financial Statement & Corpus Fund Utilization, and (5) Updated Faculty Cadre Roster.\n• New Course Approval (AI & Data Science): (1) Affiliating University NOC, (2) High-Performance Computing Lab Readiness Proof, (3) Core AI/ML Faculty Ph.D. Degrees, (4) Faculty Experience Certificates, and (5) Governing Body Seed Budget Resolution.`,
        },
        {
          id: 'inst-4',
          category: 'Document Versioning',
          question: 'How does document versioning work when replacing an expired or incomplete certificate?',
          answer: `VERIDEX preserves a complete, auditable version history for every institutional record:\n\n1. Open the Document Repository and select the flagged or expired record (e.g., INF-FAC-VIT-01).\n2. Click "Upload New Version" in the document inspector.\n3. Provide the updated file, new expiry date, and a brief change note (e.g., "Uploaded renewed 2026–2027 Municipal Fire Safety NOC").\n4. The internal document code remains stable so all linked application checklists automatically reference the latest version while retaining v1 in the version log.`,
        },
        {
          id: 'inst-5',
          category: 'Dossier Summary',
          question: "Summarize our institution's current application statuses and checklist completion progress.",
          answer: `Summary for ${instName} (${instCode}):\n\n• Total Institutional Applications: ${myApps.length}\n${myApps
            .map((a) => {
              const ready = a.checklist.filter(
                (c) => c.status === 'Verified' || c.status === 'Uploaded'
              ).length;
              return `  - ${a.id} (${a.category}): Status "${a.status}" · Checklist ${ready}/${a.checklist.length} ready`;
            })
            .join('\n')}\n• Authorized Repository Documents: ${myDocs.length} total records scoped strictly to ${instCode}. Check the Institutional Analytics charts on your dashboard for a visual breakdown.`,
        },
      ],
    };
  }

  if (role === 'faculty') {
    const instCode = currentUser?.officialInstitutionCode || 'INST-PUNE-104';
    const instName =
      currentUser?.institutionName || 'Vidyapeeth Institute of Technology, Pune';
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
          question: 'How are faculty qualification and experience internal codes (e.g., FAC-QUA-SAL-01) generated?',
          answer: `VERIDEX assigns every uploaded record a deterministic, human-readable Internal Document Code based on Category Prefix + Surname/Entity 3-letter code + Sequential 2-digit index:\n\n• Qualifications: FAC-QUA-<SUR>-01 (e.g., FAC-QUA-SAL-01 for Dr. Shravani Salunkhe's Ph.D. Degree)\n• Experience Certificates: FAC-EXP-<SUR>-01\n• Faculty Appointment Records: FAC-REC-<SUR>-01\n• Infrastructure & Labs: INF-FAC-<INS>-01\n\nIf multiple faculty members share a similar surname or have multiple degrees, the numeric suffix increments automatically (-01, -02, -03) to prevent collisions.`,
        },
        {
          id: 'fac-2',
          category: 'Faculty & Lab Flags',
          question: 'Which faculty or laboratory records in my institution currently have verification flags?',
          answer: `Within your authorized faculty and departmental scope at ${instName} (${facDocs.length} accessible records):\n\n• Verified Faculty Dossiers: Your Ph.D. Computer Engineering Convocation Certificate (FAC-QUA-SAL-01) and Prior Teaching Experience Certificate passed completeness and consistency checks.\n• Flagged Institutional Items Requiring Coordination: Municipal Fire & Life Safety Certificate (INF-FAC-VIT-01) is expired, and the B.Tech CSE Intake Enhancement NOC (APR-REG-VIT-02) has an intake count discrepancy (180 vs 120 seats).\n\nYou can inspect these in the "Verification & Compliance" or "Document Repository" views.`,
        },
        {
          id: 'fac-3',
          category: 'Lab Evidence Submission',
          question: 'How do I submit computing lab carpet area and photographic evidence for EVC inspection?',
          answer: `To log laboratory or instructional facility readiness evidence:\n\n1. Open the "Verification & Compliance" workspace from the left sidebar.\n2. Scroll to the "Infrastructure & Laboratory Visual Evidence Advisory" panel.\n3. Enter the Facility Title (e.g., "AI & High-Performance Computing Lab — Block C"), Declared Carpet Area in sq.m (statutory norm ≥ 66 sq.m per lab), and Reference Certificate Number.\n4. Click "Log Infrastructure Evidence". VERIDEX creates an INF-FAC record with an EVC inspection advisory note.`,
        },
        {
          id: 'fac-4',
          category: 'Role Permissions',
          question: "Why am I restricted from modifying institutional trust deeds or viewing students' private records?",
          answer: `VERIDEX enforces strict Role-Based Access Control (RBAC) and Data Isolation:\n\n• As a Faculty account (${currentUser?.employeeId || 'EMP-VIT-2019-042'}), you are authorized to view your institution's compliance applications, faculty qualifications, experience certificates, approvals, and infrastructure records.\n• Confidential Financial & Trust Deeds and individual Student scholarship/marksheet records are isolated to their respective authorized roles.\n• Submitting new institutional applications or recording AICTE regulatory decisions is restricted to Nodal Officers and AICTE Admins respectively.`,
        },
        {
          id: 'fac-5',
          category: 'Consistency Checks',
          question: "What causes a 'Mismatch Flagged' finding on a Faculty Qualification or Experience record?",
          answer: `Automated OCR Consistency Checks compare extracted fields on the uploaded PDF/image against the declared faculty roster:\n\n• Name or Spelling Discrepancy: e.g., middle initial or surname variation without an accompanying gazette/affidavit note.\n• Overlapping Service Dates: Prior experience relieving date overlapping with the joining date on the appointment order.\n• Degree Specialization Mismatch: Declared department cadre vs convocation discipline.\n\nWhen flagged, attach a clarification note or supporting annexure for the Nodal Officer and AICTE Reviewer.`,
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
      welcomeMessage: `Hi ${currentUser?.fullName || 'Scholar'}! I am your VERIDEX Student Records Assistant. I can help you check the verification status of your academic and scholarship documents, explain data privacy rules, or guide you on profile updates.`,
      placeholder: 'Ask about your verified marksheets, GATE scholarship, or profile...',
      prompts: [
        {
          id: 'stu-1',
          category: 'My Verified Records',
          question: 'What is the current verification status of my academic and scholarship records?',
          answer: `You currently have ${myStudentDocs.length} authorized record(s) linked to your student profile (${currentUser?.fullName}, Roll/PRN: ${currentUser?.rollNumber || 'PRN-2023-CSE-089'}):\n\n${
            myStudentDocs.length > 0
              ? myStudentDocs
                  .map(
                    (d) =>
                      `• ${d.internalCode} — ${d.name} (Cert #${d.certificateNumber}): Completeness: ${d.completenessStatus} · Consistency: ${d.consistencyStatus} · Issuer Status: ${d.issuerVerificationStatus} · Human Review: ${d.humanReviewStatus}`
                  )
                  .join('\n')
              : '• No pending discrepancies found on your student records.'
          }\n\nClick "Inspect Record" on your dashboard to view the extracted summary fields and verification certificate details.`,
        },
        {
          id: 'stu-2',
          category: 'Data Privacy & Isolation',
          question: 'Why can I only view my own academic records and not institutional applications or other students?',
          answer: `VERIDEX enforces strict Student Data Isolation to protect your personal academic and financial privacy:\n\n• Your student account is cryptographically and logically scoped to records where you are the designated scholar (${currentUser?.fullName} / ${currentUser?.id}).\n• You cannot see other students' marksheets, faculty service files, or institutional regulatory applications—and other students cannot view your records either.`,
        },
        {
          id: 'stu-3',
          category: 'Profile & Contact Update',
          question: 'How do I update my mobile phone number or email address in my student profile?',
          answer: `To update your contact information:\n\n1. Click "My Profile" in the left navigation sidebar (or "Edit My Profile" on your dashboard).\n2. Update your Phone Number, Email Address, Date of Birth (which automatically recalculates your verified age), or Gender.\n3. Note: VERIDEX validates that your phone number (+91XXXXXXXXXX) and username are globally unique across the portal. Core institutional identifiers (Role, Institution Code, and Roll/PRN) are locked and managed by your institution's Nodal Officer.`,
        },
        {
          id: 'stu-4',
          category: 'Issuer Verification Meaning',
          question: "What does 'Issuer Verification: Verified' mean on my uploaded scholarship or merit record?",
          answer: `When a record shows "Issuer Verification: Verified" and "Human Review: Reviewed":\n\n1. Completeness Passed: All mandatory pages, signatures, and roll number/PRN fields were detected.\n2. Consistency Passed: Your name (${currentUser?.fullName}), Roll Number (${currentUser?.rollNumber}), and institution (${currentUser?.institutionName}) match official enrollment records.\n3. Officer Sign-Off: An authorized compliance reviewer has confirmed the record for statutory scholarship or enrollment reporting.`,
        },
        {
          id: 'stu-5',
          category: 'Correction Request',
          question: 'Who should I contact if my Roll Number, PRN, or semester details need official correction?',
          answer: `Because Roll Number (${currentUser?.rollNumber}), Course (${currentUser?.course}), and Institutional Affiliation (${currentUser?.institutionName}) are statutory identity fields, they are read-only for students.\n\nIf you spot a typographical error in your PRN or marksheet annexure, please contact your institution's Verified Nodal Officer (Dr. Aashay Khadkikar for VIT Pune, or Prof. Gauri Sardal for NCE Bengaluru) to upload a revised version in the institutional repository.`,
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
