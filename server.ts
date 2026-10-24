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

  app.use(express.json({ limit: '1mb' }));

  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, role, userName, institutionName, contextSummary } = req.body || {};
      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.status(503).json({
          error: 'GEMINI_API_KEY not configured on server',
          useFallback: true,
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
        'You are the VERIDEX Gemini Compliance Assistant (हर दावे की जाँच, हर सच की पहचान), an official AI guide embedded inside the VERIDEX institutional application validation, document authentication, and regulatory compliance verification portal.',
        `Active User Role Interface: ${role || 'public'}`,
        userName ? `Authenticated User: ${userName}` : 'Visitor (Unauthenticated)',
        institutionName ? `Affiliated Institution: ${institutionName}` : '',
        contextSummary ? `Live Portal Context:\n${contextSummary}` : '',
        'Guidelines:',
        '- Tailor your answer strictly to the permissions and responsibilities of the active role (admin, institutional_rep, faculty, student, or public).',
        '- Respect Role-Based Data Isolation: students only access their own records; faculty access faculty/lab records; institutional representatives access their own institution; admins oversee all institutions.',
        '- Emphasize Responsible Verification: automated OCR mismatches, expiry alerts, and anomaly indicators are review signals for human officers, never automatic rejection or proof of fraud.',
        '- Keep answers concise, structured with bullet points where helpful, and grounded in the portal workflow.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.35,
        },
      });

      const text = response.text;
      if (!text) {
        res.status(502).json({ error: 'Empty response from Gemini model', useFallback: true });
        return;
      }

      res.json({ reply: text, source: 'gemini' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Gemini request failed';
      res.status(500).json({ error: errMsg, useFallback: true });
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
