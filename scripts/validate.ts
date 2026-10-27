/**
 * npm run validate — sprawdza wszystkie treści w content/.
 * Błędy (exit 1): schemat, niezgodne id/etapy, duplikaty. Ostrzeżenia: proporcje, długość, styl.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateContent } from '../src/content/validate.ts'
import { loadContentFiles } from './loadContent.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const report = validateContent(loadContentFiles(root))

console.log('Moduły:')
for (const m of report.modules) {
  console.log(
    `  ${m.path.padEnd(44)} ${String(m.total).padStart(3)} el.  ` +
      `zwroty ${m.phrase}, słówka ${m.word}, wzorce ${m.pattern}, dialogi ${m.dialog}`,
  )
}
console.log(`Słownik: ${report.vocabItems} słówek`)
console.log(`Razem elementów: ${report.totalItems}`)

if (report.warnings.length) {
  console.log(`\nOstrzeżenia (${report.warnings.length}):`)
  for (const w of report.warnings) console.log('  ⚠ ' + w)
}
if (report.errors.length) {
  console.error(`\nBłędy (${report.errors.length}):`)
  for (const e of report.errors) console.error('  ✖ ' + e)
  process.exit(1)
}
console.log('\n✔ Treści poprawne.')
