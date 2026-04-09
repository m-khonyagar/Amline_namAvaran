import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(root, '..')

await mkdir(join(pkgRoot, 'dist'), { recursive: true })
await copyFile(join(pkgRoot, 'amline-tokens.css'), join(pkgRoot, 'dist', 'amline-tokens.css'))
await copyFile(join(pkgRoot, 'theme-tokens.js'), join(pkgRoot, 'dist', 'theme-tokens.js'))
