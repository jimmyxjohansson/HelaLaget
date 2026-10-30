// Genererar src/server/registry.ts och src/hooks/backend/<modul>.ts utifrån
// filerna i src/server/functions/<modul>/<funktion>.ts.
//
// Lägg till en ny backend-funktion genom att skapa en fil där (default-export
// `async function namn(req: { params: Params; user: User })`) och kör sedan:
//   npm run generate
import { readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fnDir = join(root, 'src/server/functions')
const hooksDir = join(root, 'src/hooks/backend')

// Funktioner som körs i webbläsaren i stället för på servern.
const clientOnly = {
  players: [
    {
      name: 'uploadPlayerImage',
      code: `createBackendHook<UploadParams, { url: string }>('players/uploadPlayerImage', (p) => uploadImage(p, 'players'))`,
    },
  ],
  teams: [
    {
      name: 'uploadTeamLogo',
      code: `createBackendHook<UploadParams, { url: string }>('teams/uploadTeamLogo', (p) => uploadImage(p, 'teams'))`,
    },
  ],
}

const cap = (s) => s[0].toUpperCase() + s.slice(1)
const header = '// GENERERAD FIL – ändra inte för hand. Kör `npm run generate`.\n'

const modules = readdirSync(fnDir).filter((d) => statSync(join(fnDir, d)).isDirectory()).sort()
const registryImports = []
const registryEntries = []

mkdirSync(hooksDir, { recursive: true })

for (const mod of modules) {
  const fns = readdirSync(join(fnDir, mod))
    .filter((f) => f.endsWith('.ts'))
    .map((f) => f.slice(0, -3))
    .sort()

  const lines = [header, "import { createBackendHook } from './_core'"]
  const extras = clientOnly[mod] ?? []
  if (extras.length) {
    lines.push("import { uploadImage } from '../../lib/storage'")
  }
  for (const fn of fns) {
    lines.push(`import type ${fn} from '../../server/functions/${mod}/${fn}'`)
  }
  lines.push('')
  if (extras.length) {
    lines.push('type UploadParams = { data: string; fileName: string; mimeType?: string }', '')
  }
  for (const fn of fns) {
    const id = `${mod}_${fn}`
    registryImports.push(`import ${id} from './functions/${mod}/${fn}'`)
    registryEntries.push(`  '${mod}/${fn}': ${id},`)
    lines.push(
      `export const use${cap(fn)} = createBackendHook<`,
      `  Parameters<typeof ${fn}>[0]['params'],`,
      `  Awaited<ReturnType<typeof ${fn}>>`,
      `>('${mod}/${fn}')`,
      '',
    )
  }
  for (const { name, code } of extras) {
    lines.push(`export const use${cap(name)} = ${code}`, '')
  }
  writeFileSync(join(hooksDir, `${mod}.ts`), lines.join('\n'))
}

writeFileSync(
  join(root, 'src/server/registry.ts'),
  [
    header,
    "import 'server-only'",
    "import type { BackendRequest } from './types'",
    ...registryImports,
    '',
    '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
    'type BackendFunction = (req: BackendRequest<any>) => Promise<unknown>',
    '',
    'export const functions: Record<string, BackendFunction> = {',
    ...registryEntries,
    '}',
    '',
  ].join('\n'),
)

console.log(`Genererade ${registryEntries.length} funktioner i ${modules.length} moduler.`)
