/**
 * CSV export helper — triggers a browser file download.
 *
 * Usage:
 *   downloadCsv('wallets-export.csv', ['شناسه', 'موجودی'], rows)
 */

type CellValue = string | number | boolean | null | undefined;

function escapeCsvCell(value: CellValue): string {
  const str = value == null ? '' : String(value);
  // Wrap in quotes if the value contains comma, newline, or double-quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: CellValue[][]
): void {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel Persian support
  const headerRow = headers.map(escapeCsvCell).join(',');
  const dataRows = rows.map((r) => r.map(escapeCsvCell).join(','));
  const csv = [bom + headerRow, ...dataRows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
