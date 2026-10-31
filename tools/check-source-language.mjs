import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const roots = ['apps', 'libs', 'tests/acceptance']
const invalid = []
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) visit(path)
    else if (/\.[cm]?jsx?$/.test(entry.name)) invalid.push(path)
  }
}
for (const root of roots) visit(root)
if (invalid.length) {
  console.error(`Application, library and acceptance source must use TypeScript:\n${invalid.join('\n')}`)
  process.exitCode = 1
}
