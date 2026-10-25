import { createWorker } from 'tesseract.js';
import { OcrProcessingStatus, VaultEditableDetails } from '../types/portal';
import { getLocalTodayDate } from './domain';

export const MAX_VAULT_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export const SUPPORTED_VAULT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export type SupportedVaultMimeType = (typeof SUPPORTED_VAULT_MIME_TYPES)[number];

export interface FileValidationResult {
  valid: boolean;
  normalizedMimeType?: SupportedVaultMimeType;
  error?: string;
}

export function validateVaultFileInput(
  file: { name: string; type: string; size: number },
  maxBytes: number = MAX_VAULT_FILE_SIZE_BYTES
): FileValidationResult {
  if (!file || typeof file.name !== 'string') {
    return { valid: false, error: 'Please select a valid document file.' };
  }
  if (file.size <= 0) {
    return { valid: false, error: `File "${file.name}" is empty (0 bytes).` };
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File "${file.name}" exceeds the ${maxMb} MB maximum file size limit.`,
    };
  }

  const lowerType = (file.type || '').toLowerCase();
  const extMatch = file.name.toLowerCase().match(/\.(pdf|jpe?g|png)$/);

  if (lowerType === 'application/pdf' || (!lowerType && extMatch?.[1] === 'pdf')) {
    return { valid: true, normalizedMimeType: 'application/pdf' };
  }
  if (
    lowerType === 'image/jpeg' ||
    lowerType === 'image/jpg' ||
    (!lowerType && (extMatch?.[1] === 'jpg' || extMatch?.[1] === 'jpeg'))
  ) {
    return { valid: true, normalizedMimeType: 'image/jpeg' };
  }
  if (lowerType === 'image/png' || (!lowerType && extMatch?.[1] === 'png')) {
    return { valid: true, normalizedMimeType: 'image/png' };
  }

  return {
    valid: false,
    error: `Unsupported file type (${file.type || file.name}). Supported formats: JPG, JPEG, PNG, and PDF.`,
  };
}

export interface OcrProgressUpdate {
  status: string;
  progress: number; // 0 to 100
}

export interface OcrExtractionOutcome {
  ocrStatus: OcrProcessingStatus;
  extractedText: string;
  engineUsed: 'tesseract-image-ocr' | 'pdf-text-layer' | 'manual';
  message: string;
  suggestedFields: Partial<VaultEditableDetails>;
}

/**
 * Decodes escaped PDF literal strings such as `(University\040of\040Mumbai)` or UTF-16BE BOM strings.
 */
function decodePdfLiteralString(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];
      if (next === 'n') {
        out += '\n';
        i++;
      } else if (next === 'r') {
        out += ' ';
        i++;
      } else if (next === 't') {
        out += ' ';
        i++;
      } else if (next === '(' || next === ')' || next === '\\') {
        out += next;
        i++;
      } else if (/[0-7]/.test(next)) {
        const octal = raw.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)?.[0] || next;
        out += String.fromCharCode(parseInt(octal, 8));
        i += octal.length;
      } else {
        out += next;
        i++;
      }
    } else {
      out += ch;
    }
  }
  return out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
}

function extractTextOperatorsFromPdfChunk(chunkText: string): string[] {
  const pieces: string[] = [];

  // Match (...) Tj
  const tjRegex = /\((?:\\.|[^\\()])*\)\s*Tj/g;
  let match: RegExpExecArray | null;
  while ((match = tjRegex.exec(chunkText)) !== null) {
    const inner = match[0].replace(/\)\s*Tj$/, '').slice(1);
    const decoded = decodePdfLiteralString(inner);
    if (decoded.length > 0) pieces.push(decoded);
  }

  // Match [...] TJ arrays
  const tjArrayRegex = /\[((?:.|\r|\n)*?)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(chunkText)) !== null) {
    const arrayBody = match[1];
    const litRegex = /\((?:\\.|[^\\()])*\)/g;
    let litMatch: RegExpExecArray | null;
    let line = '';
    while ((litMatch = litRegex.exec(arrayBody)) !== null) {
      const inner = litMatch[0].slice(1, -1);
      line += decodePdfLiteralString(inner);
    }
    if (line.trim().length > 0) {
      pieces.push(line.trim());
    }
  }

  return pieces;
}

async function tryDecompressFlateStream(compressedBytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  for (const format of ['deflate', 'deflate-raw'] as const) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      const readPromise = new Response(ds.readable).arrayBuffer();
      const writePromise = (async () => {
        await writer.write(new Uint8Array(compressedBytes));
        await writer.close();
      })();
      const [buffer] = await Promise.all([readPromise, writePromise]);
      return new TextDecoder('latin1').decode(buffer);
    } catch {
      // try next format
    }
  }
  return null;
}

/**
 * Extracts selectable text from a text-based PDF file directly in the browser without external services.
 * Distinguishes text-based PDFs from scanned/image-only PDFs.
 */
export async function extractTextFromPdfInBrowser(
  file: Blob,
  onProgress?: (update: OcrProgressUpdate) => void,
  signal?: AbortSignal
): Promise<{ text: string; isScannedOrEmpty: boolean; error?: string }> {
  try {
    onProgress?.({ status: 'Reading PDF structure...', progress: 20 });
    const arrayBuffer = await file.arrayBuffer();
    if (signal?.aborted) {
      return { text: '', isScannedOrEmpty: true, error: 'Cancelled by user.' };
    }

    const bytes = new Uint8Array(arrayBuffer);
    const rawLatin1 = new TextDecoder('latin1').decode(bytes);

    if (!rawLatin1.startsWith('%PDF-')) {
      return {
        text: '',
        isScannedOrEmpty: true,
        error: 'The selected file does not appear to be a valid PDF document.',
      };
    }

    onProgress?.({ status: 'Inspecting embedded PDF text streams...', progress: 50 });

    const extractedSegments: string[] = [];
    // 1. Direct uncompressed text operators
    extractedSegments.push(...extractTextOperatorsFromPdfChunk(rawLatin1));

    // 2. Inspect FlateDecode streams (up to first 25 streams for responsiveness)
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch: RegExpExecArray | null;
    let streamCount = 0;
    while ((streamMatch = streamRegex.exec(rawLatin1)) !== null && streamCount < 25) {
      if (signal?.aborted) {
        return { text: '', isScannedOrEmpty: true, error: 'Cancelled by user.' };
      }
      streamCount += 1;
      const bodyStr = streamMatch[1];
      const streamBytes = new Uint8Array(bodyStr.length);
      for (let i = 0; i < bodyStr.length; i++) {
        streamBytes[i] = bodyStr.charCodeAt(i) & 0xff;
      }
      const decompressed = await tryDecompressFlateStream(streamBytes);
      if (decompressed) {
        extractedSegments.push(...extractTextOperatorsFromPdfChunk(decompressed));
      }
    }

    onProgress?.({ status: 'Finalizing PDF text extraction...', progress: 90 });

    const cleanedText = extractedSegments
      .join('\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleanedText || cleanedText.length < 3) {
      return {
        text: '',
        isScannedOrEmpty: true,
      };
    }

    onProgress?.({ status: 'PDF text extraction complete.', progress: 100 });
    return {
      text: cleanedText,
      isScannedOrEmpty: false,
    };
  } catch (err) {
    return {
      text: '',
      isScannedOrEmpty: true,
      error: err instanceof Error ? err.message : 'Failed to parse PDF document.',
    };
  }
}

/**
 * Extracts structured draft fields from OCR text for user review and correction.
 * Does NOT mark anything as verified or approved.
 */
export function parseSuggestedFieldsFromOcrText(
  rawText: string,
  fileName: string,
  defaultHolderName: string
): Partial<VaultEditableDetails> {
  const cleanFileNameTitle = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  // Suggest title from first meaningful heading line or filename
  const headingLine = lines.find(
    (l) =>
      /certificate|marksheet|degree|convocation|receipt|transcript|noc|approval|affidavit|card|letter|report/i.test(
        l
      ) && l.length <= 90
  );
  const suggestedTitle = headingLine || lines[0]?.slice(0, 80) || cleanFileNameTitle;

  // Suggest certificate / reference / roll / PRN number
  const certRegexes = [
    /(?:certificate|cert|ref|reference|registration|reg|udin|noc|prn|roll|serial)\s*(?:no|number|id|#)?\s*[:.-]?\s*([A-Z0-9][A-Z0-9/-]{3,28})/i,
    /\b([A-Z]{2,6}\/[A-Z0-9]{2,8}\/\d{2,4}\/[A-Z0-9-]{2,10})\b/,
    /\b([A-Z]{2,5}-\d{4}-\d{3,8})\b/,
  ];
  let suggestedCert = '';
  for (const rx of certRegexes) {
    const m = rawText.match(rx);
    if (m && m[1]) {
      suggestedCert = m[1].trim();
      break;
    }
  }

  // Suggest issuing authority
  const authorityLine = lines.find((l) =>
    /university|institute|board|council|aicte|government|ministry|directorate|college|society|autonomous/i.test(
      l
    )
  );

  // Suggest date in YYYY-MM-DD if found
  const isoDateMatch = rawText.match(/\b(20\d{2}|19\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  const dmyDateMatch = rawText.match(
    /\b(0[1-9]|[12]\d|3[01])[/-](0[1-9]|1[0-2])[/-](20\d{2}|19\d{2})\b/
  );
  let suggestedIssueDate = getLocalTodayDate();
  if (isoDateMatch) {
    suggestedIssueDate = isoDateMatch[0];
  } else if (dmyDateMatch) {
    suggestedIssueDate = `${dmyDateMatch[3]}-${dmyDateMatch[2]}-${dmyDateMatch[1]}`;
  }

  // Suggest holder name if explicitly labeled
  const holderMatch = rawText.match(
    /(?:name|student\s+name|candidate\s+name|awarded\s+to|certify\s+that|holder)\s*[:.-]\s*([A-Za-z .]{3,50})/i
  );
  const suggestedHolder = holderMatch?.[1]?.trim() || defaultHolderName;

  return {
    title: suggestedTitle || cleanFileNameTitle || 'Uploaded Document',
    certificateNumber: suggestedCert,
    holderName: suggestedHolder,
    issuingAuthority: authorityLine ? authorityLine.slice(0, 80) : undefined,
    issueDate: suggestedIssueDate,
  };
}

/**
 * Runs client-side OCR on an image (JPG, JPEG, PNG) or extracts embedded text from a text-based PDF.
 * Never calls external OCR APIs or backend endpoints.
 */
export async function processDocumentOcrInBrowser(params: {
  file: File | Blob;
  fileName: string;
  mimeType: SupportedVaultMimeType;
  defaultHolderName: string;
  onProgress?: (update: OcrProgressUpdate) => void;
  signal?: AbortSignal;
}): Promise<OcrExtractionOutcome> {
  const { file, fileName, mimeType, defaultHolderName, onProgress, signal } = params;

  if (signal?.aborted) {
    return {
      ocrStatus: 'Cancelled',
      extractedText: '',
      engineUsed: 'manual',
      message: 'OCR processing was cancelled.',
      suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
    };
  }

  // 1. Handle PDF files: extract selectable text from text-based PDFs
  if (mimeType === 'application/pdf') {
    const pdfResult = await extractTextFromPdfInBrowser(file, onProgress, signal);
    if (signal?.aborted || pdfResult.error === 'Cancelled by user.') {
      return {
        ocrStatus: 'Cancelled',
        extractedText: '',
        engineUsed: 'pdf-text-layer',
        message: 'PDF text extraction was cancelled.',
        suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
      };
    }

    if (pdfResult.error) {
      return {
        ocrStatus: 'Failed',
        extractedText: '',
        engineUsed: 'pdf-text-layer',
        message: `${pdfResult.error} You can still review and enter document details manually before saving.`,
        suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
      };
    }

    if (pdfResult.isScannedOrEmpty) {
      return {
        ocrStatus: 'Unsupported',
        extractedText: '',
        engineUsed: 'pdf-text-layer',
        message:
          'No selectable text layer was found in this PDF (it may be a scanned image-only PDF). Upload a JPG/PNG page image for browser OCR, or enter/edit the document details below and save directly.',
        suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
      };
    }

    return {
      ocrStatus: 'Completed',
      extractedText: pdfResult.text,
      engineUsed: 'pdf-text-layer',
      message:
        'Embedded selectable text extracted from PDF in browser. Please review and correct any fields below before saving.',
      suggestedFields: parseSuggestedFieldsFromOcrText(
        pdfResult.text,
        fileName,
        defaultHolderName
      ),
    };
  }

  // 2. Handle Images (JPG, JPEG, PNG) with Tesseract.js in the browser
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let objectUrl: string | null = null;

  try {
    onProgress?.({ status: 'Initializing client-side Tesseract OCR engine...', progress: 10 });

    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      objectUrl = URL.createObjectURL(file);
    }

    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m && typeof m.progress === 'number') {
          const pct = Math.min(95, Math.max(15, Math.round(m.progress * 100)));
          onProgress?.({
            status: m.status ? `OCR: ${m.status}` : 'Recognizing text in image...',
            progress: pct,
          });
        }
      },
    });

    if (signal?.aborted) {
      await worker.terminate();
      worker = null;
      return {
        ocrStatus: 'Cancelled',
        extractedText: '',
        engineUsed: 'tesseract-image-ocr',
        message: 'Image OCR was cancelled by user.',
        suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
      };
    }

    const recognizeTarget = objectUrl || (file as File);
    const { data } = await worker.recognize(recognizeTarget);

    await worker.terminate();
    worker = null;

    if (signal?.aborted) {
      return {
        ocrStatus: 'Cancelled',
        extractedText: '',
        engineUsed: 'tesseract-image-ocr',
        message: 'Image OCR was cancelled by user.',
        suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
      };
    }

    const cleaned = (data?.text || '').trim();
    onProgress?.({ status: 'OCR complete.', progress: 100 });

    if (!cleaned) {
      return {
        ocrStatus: 'Failed',
        extractedText: '',
        engineUsed: 'tesseract-image-ocr',
        message:
          'No readable text could be detected in this image. You can enter the document text and details manually below and save the file to your vault.',
        suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
      };
    }

    return {
      ocrStatus: 'Completed',
      extractedText: cleaned,
      engineUsed: 'tesseract-image-ocr',
      message:
        'Client-side OCR completed. OCR may misread names, numbers, or dates. Please review and correct the extracted details before saving.',
      suggestedFields: parseSuggestedFieldsFromOcrText(cleaned, fileName, defaultHolderName),
    };
  } catch {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // ignore cleanup error
      }
    }
    return {
      ocrStatus: 'Failed',
      extractedText: '',
      engineUsed: 'tesseract-image-ocr',
      message:
        'Browser OCR engine could not process this image in the current environment. You can still edit the fields manually and save the document to your vault.',
      suggestedFields: parseSuggestedFieldsFromOcrText('', fileName, defaultHolderName),
    };
  } finally {
    if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    }
  }
}
