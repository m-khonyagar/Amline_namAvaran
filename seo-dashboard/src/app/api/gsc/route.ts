import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const DEFAULT_PATH = path.resolve(process.cwd(), 'data', 'gsc', 'gsc_full_export.json')
const GSC_DATA_PATH = process.env.GSC_DATA_PATH || DEFAULT_PATH

export async function GET() {
  try {
    const filePath = path.isAbsolute(GSC_DATA_PATH) ? GSC_DATA_PATH : path.resolve(process.cwd(), GSC_DATA_PATH)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'GSC data not found. Run gsc_export_all.py first.' }, { status: 404 })
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (e) {
    console.error('GSC API error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
