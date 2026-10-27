import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { validateContent } from '../src/content/validate.ts'
import { loadContentFiles } from './loadContent.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

describe('treści w content/', () => {
  it('przechodzą walidację bez błędów', () => {
    const report = validateContent(loadContentFiles(root))
    expect(report.errors).toEqual([])
    expect(report.totalItems).toBeGreaterThan(0)
  })
})

describe('walidator', () => {
  const stages = {
    stages: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, title: 't', titleEn: 't', description: 'd', weeks: 4 })),
  }
  const item = (id: string, en: string, extra: object = {}) => ({
    id, type: 'phrase', stage: 1, module: 's1.mod', order: Number(id.slice(-1)), en, pl: 'pl ' + id, alternatives: [],
    usage: 'u', register: 'neutral', example: [{ en: 'e', pl: 'p' }], tags: [], level: 'A2', ...extra,
  })
  const mod = { id: 's1.mod', stage: 1, order: 1, title: 'M', titleEn: 'M', description: 'd', tags: ['general'] }

  it('wykrywa duplikaty i niezgodne id', () => {
    const report = validateContent({
      stages,
      modules: [{
        path: 'content/stage-1/01-mod.json',
        data: { module: mod, items: [item('s1.mod.a1', "I'm fine."), item('s1.mod.a2', 'I am fine'), item('s1.other.a3', 'Hi')] },
      }],
    })
    expect(report.errors.some((e) => e.includes('duplikat'))).toBe(true)
    expect(report.errors.some((e) => e.includes('s1.other.a3') && e.includes('id musi'))).toBe(true)
  })

  it('wymaga collocations dla słówek i ___ we wzorcach', () => {
    const report = validateContent({
      stages,
      modules: [{
        path: 'content/stage-1/01-mod.json',
        data: {
          module: mod,
          items: [
            item('s1.mod.a1', 'gym', { type: 'word' }),
            item('s1.mod.a2', 'I usually go', { type: 'pattern', example: [{ en: 'a', pl: 'b' }, { en: 'c', pl: 'd' }] }),
          ],
        },
      }],
    })
    expect(report.errors.some((e) => e.includes('collocations'))).toBe(true)
    expect(report.errors.some((e) => e.includes('___'))).toBe(true)
  })
})
