/**
 * قبل از `vite build`: اگر `.env.production` وجود دارد، مقادیر خطرناک برای پروداکشن را رد می‌کند.
 * در Docker معمولاً این فایل کپی نمی‌شود → اسکریپت بدون خطا عبور می‌کند.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const prodEnvPath = resolve(root, '.env.production')

if (!existsSync(prodEnvPath)) {
  process.exit(0)
}

const text = readFileSync(prodEnvPath, 'utf8')
const violations = []

const lineHits = (re) => {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('#')) continue
    if (re.test(line)) return { line: i + 1, content: line }
  }
  return null
}

const devBypass = lineHits(/^\s*VITE_ENABLE_DEV_BYPASS\s*=\s*true\s*$/i)
if (devBypass) {
  violations.push(
    `خط ${devBypass.line}: VITE_ENABLE_DEV_BYPASS=true در پروداکشن مجاز نیست — ورود آزمایشی را خاموش کنید.\n   ${devBypass.content}`,
  )
}

const msw = lineHits(/^\s*VITE_USE_MSW\s*=\s*true\s*$/i)
if (msw) {
  violations.push(
    `خط ${msw.line}: VITE_USE_MSW=true در build پروداکشن مجاز نیست — MSW فقط برای dev است.\n   ${msw.content}`,
  )
}

if (violations.length > 0) {
  console.error('[assert-safe-production-env] .env.production ناامن برای production:\n')
  console.error(violations.join('\n\n'))
  process.exit(1)
}

process.exit(0)
