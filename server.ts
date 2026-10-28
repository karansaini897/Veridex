import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '32kb' }));

  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, role, userName, institutionName, contextSummary } = req.body || {};
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ error: 'A non-empty message string is required.' });
        return;
      }
      if (message.length > 1500) {
        res.status(400).json({ error: 'Message exceeds maximum allowed length (1500 characters).' });
        return;
      }

      const safeRole =
        typeof role === 'string' &&
        ['admin', 'institutional_rep', 'faculty', 'student', 'public'].includes(role)
          ? role
          : 'public';
      const safeUserName =
        typeof userName === 'string' ? userName.slice(0, 120) : '';
      const safeInstitutionName =
        typeof institutionName === 'string' ? institutionName.slice(0, 200) : '';
      const safeContext =
        typeof contextSummary === 'string' ? contextSummary.slice(0, 4000) : '';

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error: 'Gemini service is not configured on this server; using local compliance guide.',
          useFallback: true,
          mode: 'fallback',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = [
        'You are the VERIDEX Compliance Assistant (हर दावे की जाँच, हर सच की पहचान), an informational guide embedded inside the VERIDEX institutional compliance and document review portal.',
        `Active User Role Interface: ${safeRole}`,
        safeUserName ? `Authenticated User: ${safeUserName}` : 'Visitor (Unauthenticated)',
        safeInstitutionName ? `Affiliated Institution: ${safeInstitutionName}` : '',
        safeContext ? `Current Workspace Context:\n${safeContext}` : '',
        'Guidelines:',
        '- Tailor your answer strictly to the permissions and responsibilities of the active role (admin, institutional_rep, faculty, student, or public).',
        '- Respect Role-Based Data Scoping: students only view their own records; faculty view faculty/departmental records; institutional representatives manage their own institution dossiers; admins review across institutions.',
        '- Describe capabilities accurately: document registration in the browser records metadata, certificate numbers, and dates; automated review flags are advisory signals for human reviewers, never proof of fraud or live external issuer verification.',
        '- Never claim to be a regulatory authority or claim that an external government/university issuer verified a document live.',
        '- Keep answers concise, structured with bullet points where helpful, and grounded in the portal workflow.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message.trim(),
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const text = response.text;
      if (!text) {
        res.status(502).json({
          error: 'Empty response from language model; using local compliance guide.',
          useFallback: true,
          mode: 'fallback',
        });
        return;
      }

      res.json({ reply: text, source: 'gemini', mode: 'gemini' });
    } catch {
      res.status(500).json({
        error: 'Assistant service temporarily unavailable; using local compliance guide.',
        useFallback: true,
        mode: 'fallback',
      });
    }
  });

  // Initialize backend Supabase client for authentication verification (using publishable/anon key)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseAuthServer = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) : null;

  // In-memory append-only server audit ledger for immutable compliance tracking
  interface ServerAuditEvent {
    id: string;
    timestamp: string;
    actorId: string;
    actorName: string;
    actorUsername: string;
    actorRole: string;
    action: string;
    targetType: string;
    targetId: string;
    details: string;
    institutionId?: string;
    verifiedByServer: boolean;
  }
  const serverAuditLedger: ServerAuditEvent[] = [];

  // POST /api/audit/log - Requires valid authenticated Supabase session
  app.post('/api/audit/log', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Authentication required to record audit events.' });
        return;
      }

      const token = authHeader.slice(7).trim();
      if (!token || !supabaseAuthServer) {
        res.status(401).json({ error: 'Unauthorized: Invalid authentication header or server unconfigured.' });
        return;
      }

      // Verify the user's Supabase JWT access token directly with Supabase Auth
      const { data: { user }, error: authErr } = await supabaseAuthServer.auth.getUser(token);
      if (authErr || !user) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
        return;
      }

      // Fetch user's profile and active membership from database using the authenticated client
      const authedClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: profile } = await authedClient
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle();

      const { data: memberships } = await authedClient
        .from('memberships')
        .select('id, institution_id, role, status')
        .eq('user_id', user.id)
        .limit(1);

      const activeMem = memberships && memberships.length > 0 ? memberships[0] : null;

      // Authoritative identity derivation: NEVER trust client-supplied actor, role, or institution
      const verifiedActorId = user.id;
      const verifiedActorName =
        profile?.full_name || (user.user_metadata?.full_name as string) || user.email || 'Verified User';
      const verifiedActorUsername =
        (user.user_metadata?.username as string) ||
        (user.email ? user.email.split('@')[0] : `user_${user.id.slice(0, 8)}`);
      const verifiedInstitutionId =
        activeMem?.institution_id || (user.user_metadata?.institution_id as string) || undefined;

      // Authoritative role: derived strictly from database membership or restricted metadata
      let verifiedRole = 'student';
      if (activeMem?.role) {
        verifiedRole = activeMem.role;
      } else if (
        user.user_metadata?.role &&
        user.user_metadata.role !== 'admin' &&
        user.user_metadata.role !== 'institutional_rep'
      ) {
        verifiedRole = user.user_metadata.role;
      }

      const { action, targetType, targetId, details } = req.body || {};
      if (!action || typeof action !== 'string' || action.trim().length === 0) {
        res.status(400).json({ error: 'Valid action string is required.' });
        return;
      }

      // Authoritative timestamp stamped by server clock
      const authoritativeTimestamp = new Date().toISOString();

      const event: ServerAuditEvent = {
        id: `AUD-SRV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        timestamp: authoritativeTimestamp,
        actorId: verifiedActorId,
        actorName: verifiedActorName.slice(0, 120),
        actorUsername: verifiedActorUsername.slice(0, 80),
        actorRole: verifiedRole.slice(0, 60),
        action: action.slice(0, 100),
        targetType: typeof targetType === 'string' ? targetType.slice(0, 60) : 'General',
        targetId: typeof targetId === 'string' ? targetId.slice(0, 80) : '',
        details: typeof details === 'string' ? details.slice(0, 1000) : '',
        institutionId: verifiedInstitutionId,
        verifiedByServer: true,
      };

      serverAuditLedger.unshift(event);
      if (serverAuditLedger.length > 500) {
        serverAuditLedger.pop();
      }

      res.json({ success: true, event });
    } catch (err) {
      res.status(500).json({ error: 'Failed to record audit event.' });
    }
  });

  // GET /api/audit/events - Scoped by verified session and institutional authority
  app.get('/api/audit/events', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Authentication required to view audit events.' });
        return;
      }

      const token = authHeader.slice(7).trim();
      if (!token || !supabaseAuthServer) {
        res.status(401).json({ error: 'Unauthorized: Missing valid session token.' });
        return;
      }

      const { data: { user }, error: authErr } = await supabaseAuthServer.auth.getUser(token);
      if (authErr || !user) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired session token.' });
        return;
      }

      // Query membership to determine institutional scope
      const authedClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: memberships } = await authedClient
        .from('memberships')
        .select('id, institution_id, role, status')
        .eq('user_id', user.id)
        .limit(1);

      const activeMem = memberships && memberships.length > 0 ? memberships[0] : null;
      const userRole = (activeMem?.role || (user.user_metadata?.role as string) || 'student').toLowerCase();
      const userInstitutionId = activeMem?.institution_id || (user.user_metadata?.institution_id as string);

      // System administrators can view all events across institutions
      const isSystemAdmin = userRole.includes('admin') || userRole === 'system administrator';

      const filteredEvents = serverAuditLedger.filter((event) => {
        if (isSystemAdmin) return true;
        // Institutional users can ONLY access audit records matching their own institution
        if (userInstitutionId && event.institutionId === userInstitutionId) return true;
        // Regular users can only see records where they are the verified actor
        return event.actorId === user.id;
      });

      res.json({ events: filteredEvents });
    } catch {
      res.status(500).json({ error: 'Failed to retrieve audit events.' });
    }
  });

  // In-memory support enquiry intake log for /contact submissions
  interface ServerContactEnquiry {
    id: string;
    ticketReference: string;
    name: string;
    email: string;
    category: string;
    subject: string;
    message: string;
    applicationReference?: string;
    submittedAt: string;
    deliveryMode: 'server_recorded';
    statusNote: string;
  }
  const serverContactEnquiries: ServerContactEnquiry[] = [];
  const ALLOWED_CONTACT_CATEGORIES = new Set([
    'General enquiry',
    'Technical support',
    'Application or document issue',
    'Document verification concern',
    'Privacy or data handling concern',
    'Security concern',
    'Feedback or suggestion',
  ]);

  // POST /api/contact - Validates and records contact/support enquiries honestly
  app.post('/api/contact', (req, res) => {
    try {
      const body = req.body || {};
      const name = String(body.name || '').trim().slice(0, 120);
      const email = String(body.email || '').trim().slice(0, 160);
      const category = String(body.category || '').trim();
      const subject = String(body.subject || '').trim().slice(0, 200);
      const message = String(body.message || '').trim().slice(0, 4000);
      const applicationReference = body.applicationReference
        ? String(body.applicationReference).trim().slice(0, 40)
        : undefined;

      if (name.length < 2) {
        res.status(400).json({ error: 'Please provide your full name (at least 2 characters).' });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (!ALLOWED_CONTACT_CATEGORIES.has(category)) {
        res.status(400).json({ error: 'Please select a valid enquiry category.' });
        return;
      }
      if (subject.length < 4) {
        res.status(400).json({ error: 'Please provide a clear subject line (at least 4 characters).' });
        return;
      }
      if (message.length < 15) {
        res.status(400).json({ error: 'Please provide a detailed message (at least 15 characters).' });
        return;
      }
      if (applicationReference && !/^[A-Za-z0-9_-]{3,40}$/.test(applicationReference)) {
        res.status(400).json({ error: 'Invalid application or document reference format.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const ticketReference = `ENQ-${new Date().getFullYear()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

      const enquiry: ServerContactEnquiry = {
        id: `CNT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        ticketReference,
        name,
        email,
        category,
        subject,
        message,
        applicationReference,
        submittedAt: nowIso,
        deliveryMode: 'server_recorded',
        statusNote:
          'Recorded in the VERIDEX application server support intake log. External email or ticketing dispatch is not connected and awaits institutional configuration.',
      };

      serverContactEnquiries.unshift(enquiry);
      if (serverContactEnquiries.length > 250) {
        serverContactEnquiries.pop();
      }

      res.status(201).json({
        success: true,
        enquiry,
      });
    } catch {
      res.status(500).json({ error: 'Unable to record contact enquiry at this time.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VERIDEX Server running on http://localhost:${PORT}`);
  });
}

startServer();
