import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { ContentFiles } from '../src/content/validate.ts'

/** Wczytuje wszystkie pliki treści z dysku (dla walidatora i testów). */
export function loadContentFiles(root: string): ContentFiles {
  const contentDir = join(root, 'content')
  const read = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as unknown
  const modules: ContentFiles['modules'] = []
  for (const dir of readdirSync(contentDir).filter((d) => /^stage-\d+$/.test(d)).sort()) {
    for (const file of readdirSync(join(contentDir, dir)).filter((f) => f.endsWith('.json')).sort()) {
      const full = join(contentDir, dir, file)
      const path = relative(root, full).split('\\').join('/')
      try {
        modules.push({ path, data: read(full) })
      } catch (e) {
        modules.push({ path, data: { __parseError: String(e) } })
      }
    }
  }
  const optional = (name: string) => (existsSync(join(contentDir, name)) ? read(join(contentDir, name)) : undefined)
  return {
    stages: read(join(contentDir, 'stages.json')),
    modules,
    tasks: optional('speaking-tasks.json'),
    missions: optional('missions.json'),
  }
}
