import { describe, expect, it } from 'vitest'
import { fold, searchItems } from './search'
import { makeItem } from './testItems'

describe('wyszukiwarka', () => {
  const items = [
    makeItem({ id: 's1.t.a', en: 'Is there a gym near here?', pl: 'Czy jest tu gdzieś siłownia?' }),
    makeItem({ id: 's1.t.b', en: 'gym', pl: 'siłownia', type: 'word', collocations: ['hit the gym', 'go to the gym'] }),
    makeItem({ id: 's1.t.c', en: "I'm off!", pl: 'Spadam! / Lecę!' }),
  ]
  it('ignoruje polskie znaki i wielkość liter', () => {
    expect(fold('Siłownia ŻÓŁĆ')).toBe('silownia zolc')
    expect(searchItems(items, 'silownia').map((i) => i.id)).toEqual(['s1.t.b', 's1.t.a'])
  })
  it('szuka po angielsku, także w połączeniach', () => {
    expect(searchItems(items, 'hit the gym').map((i) => i.id)).toEqual(['s1.t.b'])
    expect(searchItems(items, 'im off').map((i) => i.id)).toEqual(['s1.t.c'])
  })
  it('szuka też w przykładach (niżej w wynikach)', () => {
    const withExample = makeItem({ id: 's1.t.d', en: 'See you!', pl: 'Na razie!', example: [{ en: 'See you at the gym!', pl: 'Do zobaczenia na siłowni!' }] })
    const res = searchItems([...items, withExample], 'siłowni')
    expect(res.map((i) => i.id)).toContain('s1.t.d')
  })
  it('puste zapytanie = brak wyników', () => {
    expect(searchItems(items, '  ')).toEqual([])
  })
})
