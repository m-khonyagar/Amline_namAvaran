import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const DEFAULT_PATH = path.resolve(process.cwd(), 'data', 'gsc', 'gsc_full_export.json')
const GSC_DATA_PATH = process.env.GSC_DATA_PATH || DEFAULT_PATH

export async function GET() {
  try {
    let filePath: string | null = null
    for (const p of FALLBACK_PATHS) {
      const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
      if (fs.existsSync(abs)) {
        filePath = abs
        break
      }
    }
    if (!filePath) {
      return NextResponse.json(
        { error: 'GSC data not found. Place gsc_full_export.json in data/gsc/ or set GSC_DATA_PATH.' },
        { status: 404 }
      )
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (e) {
    console.error('GSC API error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
