/** استخراج شماره از متن (خط جدید، ویرگول، تب) */
export function parsePhonesFromText(text: string): string[] {
  const parts = text.split(/[\n\r,;،\t]+/)
  return parts.map((s) => s.trim()).filter(Boolean)
}

/** ستون اول اولین شیت اکسل/CSV ذخیره‌شده از اکسل */
export async function parsePhonesFromSpreadsheet(file: File): Promise<string[]> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const name = wb.SheetNames[0]
  if (!name) return []
  const sheet = wb.Sheets[name]
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: '',
  }) as unknown[][]
  const out: string[] = []
  for (const row of rows) {
    if (!Array.isArray(row) || row.length === 0) continue
    const cell = row[0]
    if (cell === null || cell === undefined || cell === '') continue
    out.push(String(cell).trim())
  }
  return out.filter(Boolean)
}
