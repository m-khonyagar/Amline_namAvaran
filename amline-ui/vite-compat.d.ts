/**
 * Type augmentations allowing admin-ui source files (Vite-based) to compile
 * within Next.js (amline-ui) TypeScript context when they are dynamically
 * imported from the user wizard page.
 *
 * In the admin-ui Vite build these types come from vite/client.
 * Here we declare only the minimum needed to suppress TS errors.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
  readonly MODE: string
  readonly BASE_URL: string
  readonly [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
