import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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
