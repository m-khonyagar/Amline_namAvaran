export type GoogleEmbedKind = 'document' | 'spreadsheet' | 'unknown';

export interface ParsedGoogleEmbed {
  kind: GoogleEmbedKind;
  id: string;
  /** URL مناسب iframe؛ سند باید برای «هر کس با لینک» باز باشد */
  embedUrl: string;
}

const DOC_PATH = /\/document\/d\/([a-zA-Z0-9-_]+)/;
const SHEET_PATH = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;

/**
 * از لینک اشتراک‌گذاری گوگل، شناسه استخراج و URL پیش‌نمایش قابل embed می‌سازد.
 * برای شیت، در صورت مسدود بودن iframe توسط گوگل، از «منتشر کردن در وب» در منوی فایل استفاده کنید.
 */
export function parseGoogleShareUrl(raw: string): ParsedGoogleEmbed | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!url.hostname.includes('docs.google.com')) return null;

  const docMatch = url.pathname.match(DOC_PATH);
  if (docMatch) {
    const id = docMatch[1];
    return {
      kind: 'document',
      id,
      embedUrl: `https://docs.google.com/document/d/${id}/preview?rm=minimal&embedded=true`,
    };
  }

  const sheetMatch = url.pathname.match(SHEET_PATH);
  if (sheetMatch) {
    const id = sheetMatch[1];
    return {
      kind: 'spreadsheet',
      id,
      embedUrl: `https://docs.google.com/spreadsheets/d/${id}/preview?rm=minimal&widget=true&headers=false`,
    };
  }

  return null;
}
