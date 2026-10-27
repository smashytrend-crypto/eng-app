import type { Item } from '../content/schema'

/** Małe litery, bez polskich znaków i apostrofów — „żółć” = „zolc”, „I'm” = „im”. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’'`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function haystack(i: Item): string {
  return fold([i.en, i.pl, ...i.alternatives, ...(i.collocations ?? []), ...i.example.flatMap((e) => [e.en, e.pl])].join(' | '))
}

/** Wyszukiwanie po polsku i angielsku. Wszystkie słowa zapytania muszą wystąpić. */
export function searchItems(items: Item[], query: string, limit = 60): Item[] {
  const q = fold(query)
  if (!q) return []
  const words = q.split(' ')
  const scored: Array<{ item: Item; score: number }> = []
  for (const item of items) {
    const h = haystack(item)
    if (!words.every((w) => h.includes(w))) continue
    const en = fold(item.en)
    const pl = fold(item.pl)
    let score = 0
    if (en === q || pl === q) score += 10
    if (en.startsWith(q) || pl.startsWith(q)) score += 5
    if (` ${en} `.includes(` ${q} `) || ` ${pl} `.includes(` ${q} `)) score += 3
    if (en.includes(q) || pl.includes(q)) score += 2
    score -= en.length / 100
    scored.push({ item, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item)
}
