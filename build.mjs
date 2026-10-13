/**
 * Standalone build for @local/dsh-custom-agent.
 *
 * The harness's own toolchain lives inside the monorepo. This script reproduces
 * the two artifact contracts that toolchain produces, so the plugin builds from
 * this directory alone:
 *
 *   1. The Node half is plain ESM. It registers one delegation tool per role by
 *      instantiating the official @deepseek-ai/dsh-tool-subagent plugin, so
 *      `@deepseek-ai/dsh-tool-subagent` and `zod` stay external and are resolved
 *      by the Host at runtime rather than copied into the artifact.
 *   2. The browser half is the CommonJS closure the shell's module table loads:
 *      `window.__ModuleLoader__.load({ id, factory: (require) => { ... } })`,
 *      resolving shared platform modules through the injected `require` and
 *      inlining everything else.
 *
 * Run: node build.mjs
 */

import { build } from 'esbuild'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const id = manifest.name

/**
 * Module-table identity the shell shares with every dynamic bundle. A bundle
 * that requires anything outside this list is asking for a module the table
 * cannot answer, so only these stay imports.
 */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

/** Harness packages the Node half imports instead of bundling. */
const HOST_EXTERNALS = Object.keys(manifest.peerDependencies ?? {})

/** Exact handoff the shell's module loader expects for one dynamic bundle. */
const loaderBanner = [
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
  'var module = { exports: {} }; var exports = module.exports;',
].join('\n')

const loaderFooter = 'return module.exports;\n} });'

const outDir = join(root, 'lib')
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

// 1. Node half.
await build({
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(outDir, 'index.js'),
  bundle: true,
  platform: 'node',
  target: 'es2024',
  format: 'esm',
  external: HOST_EXTERNALS,
  logLevel: 'info',
})

// 2. Browser half.
await build({
  entryPoints: [join(root, 'src/client/index.tsx')],
  outfile: join(outDir, 'client.js'),
  bundle: true,
  platform: 'browser',
  target: 'es2024',
  format: 'cjs',
  jsx: 'automatic',
  external: PLATFORM_MODULES,
  banner: { js: loaderBanner },
  footer: { js: loaderFooter },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env': JSON.stringify({ MODE: 'production' }),
  },
  logLevel: 'info',
})

// 3. Declaration stubs. The harness reads `./client` types from the package and a
//    third-party plugin ships hand-written ones rather than a tsc face. The same
//    externals apply here: a declaration pass has no more right to resolve the
//    Host packages than the artifact pass did.
await mkdir(join(outDir, 'types'), { recursive: true })
await build({
  entryPoints: [join(root, 'src/index.ts')],
  outfile: join(outDir, 'types', 'index.d.ts'),
  bundle: true,
  platform: 'neutral',
  target: 'es2024',
  format: 'esm',
  external: HOST_EXTERNALS,
  logLevel: 'warning',
})

console.log('build: wrote lib/index.js, lib/client.js, lib/types/index.d.ts')
