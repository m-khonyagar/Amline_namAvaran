/**
 * Google Workspace share-URL parser.
 *
 * Converts a Google Drive share URL into an embeddable preview URL
 * and detects the document type (doc / sheet / slide / drive).
 *
 * Usage:
 *   const parsed = parseGoogleShareUrl(url)
 *   if (parsed) <iframe src={parsed.embedUrl} />
 */

export type GoogleDocType = 'doc' | 'sheet' | 'slide' | 'drive';
/** Values used by WorkspacePage when classifying uploaded workspace files. */
export type GoogleDocKind = 'document' | 'spreadsheet' | 'presentation' | 'file';

export interface ParsedGoogleUrl {
  embedUrl: string;
  type: GoogleDocType;
  /** Human-readable kind used by workspace file upload logic. */
  kind: GoogleDocKind;
  fileId: string;
}

const PATTERNS: Array<{ re: RegExp; type: GoogleDocType; kind: GoogleDocKind; embed: (id: string) => string }> = [
  {
    re: /docs\.google\.com\/document\/d\/([^/]+)/,
    type: 'doc',
    kind: 'document',
    embed: (id) => `https://docs.google.com/document/d/${id}/preview`,
  },
  {
    re: /docs\.google\.com\/spreadsheets\/d\/([^/]+)/,
    type: 'sheet',
    kind: 'spreadsheet',
    embed: (id) => `https://docs.google.com/spreadsheets/d/${id}/preview`,
  },
  {
    re: /docs\.google\.com\/presentation\/d\/([^/]+)/,
    type: 'slide',
    kind: 'presentation',
    embed: (id) => `https://docs.google.com/presentation/d/${id}/preview`,
  },
  {
    re: /drive\.google\.com\/(?:file\/d\/|open\?id=)([^/&?]+)/,
    type: 'drive',
    kind: 'file',
    embed: (id) => `https://drive.google.com/file/d/${id}/preview`,
  },
];

/** Parse a Google Workspace share URL and return an embeddable form, or null. */
export function parseGoogleShareUrl(url: string): ParsedGoogleUrl | null {
  if (!url) return null;
  for (const { re, type, kind, embed } of PATTERNS) {
    const match = url.match(re);
    if (match?.[1]) {
      const fileId = match[1];
      return { embedUrl: embed(fileId), type, kind, fileId };
    }
  }
  return null;
}
