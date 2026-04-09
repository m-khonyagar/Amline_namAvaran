/**
 * If @amline/ui-core has no build output, run `npm run build -w @amline/ui-core` once.
 * Keeps cold clones working without manual steps; no-op when dist/ already exists.
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const marker = join(root, 'packages', 'amline-ui-core', 'dist', 'index.js')

if (existsSync(marker)) {
  process.exit(0)
}

console.warn('[amline] packages/amline-ui-core/dist missing — building @amline/ui-core…')

const r = spawnSync('npm', ['run', 'build', '-w', '@amline/ui-core'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

process.exit(typeof r.status === 'number' ? r.status : 1)
