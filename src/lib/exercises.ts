import type { Item } from '../content/schema'

/** Dane do zadania PL → EN dla elementu (zwrot, słówko lub przykład ze wzorca). */
export interface RecallPrompt {
  /** Polecenie po polsku (to, co Domin ma powiedzieć po angielsku). */
  pl: string
  /** Kontekst pod poleceniem (np. przykładowe zdanie dla słówka, rama wzorca). */
  context?: string
  /** Akceptowane odpowiedzi; pierwsza = wzorcowa. */
  answers: string[]
  /** Dla słówek ignorujemy przedimek na początku. */
  isWord: boolean
  /** Co przeczytać lektorem po odsłonięciu. */
  speak: string
}

export function exampleIndexFor(item: Item, reps: number): number {
  return item.example.length ? reps % item.example.length : 0
}

export function recallPrompt(item: Item, exampleIndex = 0): RecallPrompt {
  if (item.type === 'pattern') {
    const ex = item.example[exampleIndex % item.example.length]
    return {
      pl: ex.pl,
      context: `Wzorzec: ${item.en}`,
      answers: [ex.en, ...(ex.alt ?? [])],
      isWord: false,
      speak: ex.en,
    }
  }
  if (item.type === 'word') {
    return {
      pl: item.pl,
      context: item.example[0]?.pl,
      answers: [item.en, ...item.alternatives],
      isWord: true,
      speak: item.en,
    }
  }
  return {
    pl: item.pl,
    context: item.type === 'dialog' ? undefined : item.usage,
    answers: [item.en, ...item.alternatives],
    isWord: false,
    speak: item.en,
  }
}

const STOPWORDS = new Set([
  'the', 'and', 'you', 'your', 'are', 'for', 'with', 'that', 'this', 'have', 'has', 'was', 'were', 'what',
  'can', 'could', 'would', 'will', 'from', 'about', 'there', 'their', 'they', 'them', 'just', 'some', 'into',
  'please', 'very', 'does', 'did', 'not',
])

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface ClozeData {
  /** Zdanie z luką „___”. */
  sentence: string
  /** Brakujący fragment. */
  answer: string
  /** Pełne polskie znaczenie zdania. */
  pl: string
  /** Pełne zdanie angielskie (do odsłuchu i pokazania po sprawdzeniu). */
  full: string
}

/** Zadanie „uzupełnij lukę”. Zwraca null, jeśli dla elementu nie da się sensownie zrobić luki. */
export function clozeData(item: Item, exampleIndex = 0): ClozeData | null {
  if (item.type === 'dialog') return null
  if (item.type === 'pattern') {
    const ex = item.example[exampleIndex % item.example.length]
    const [prefix, suffix = ''] = item.en.split('___')
    const clean = (s: string) => s.trim().replace(/[.!?…]+$/, '').trim()
    const full = ex.en
    const p = prefix.trim()
    const sfx = clean(suffix)
    const body = clean(full)
    if (p && !body.toLowerCase().startsWith(p.toLowerCase())) return null
    if (sfx && !body.toLowerCase().endsWith(sfx.toLowerCase())) return null
    const answer = body.slice(p.length, body.length - sfx.length).trim()
    if (!answer) return null
    const sentence = (p ? body.slice(0, p.length) + ' ' : '') + '___' + (sfx ? ' ' + body.slice(body.length - sfx.length) : '') +
      (full.trim().match(/[.!?…]+$/)?.[0] ?? '')
    return { sentence, answer, pl: ex.pl, full }
  }
  if (item.type === 'word') {
    for (const ex of item.example) {
      const re = new RegExp(`\\b${escapeRegExp(item.en)}\\b`, 'i')
      const m = ex.en.match(re)
      if (m && m.index !== undefined) {
        return {
          sentence: ex.en.slice(0, m.index) + '___' + ex.en.slice(m.index + m[0].length),
          answer: m[0],
          pl: ex.pl,
          full: ex.en,
        }
      }
    }
    return null
  }
  // phrase: ukryj najdłuższe „treściowe” słowo
  const words = item.en.split(/\s+/)
  if (words.length < 3) return null
  let bestIdx = -1
  let bestLen = 0
  words.forEach((w, i) => {
    const core = w.replace(/[^\p{L}']/gu, '')
    if (core.length >= 4 && !STOPWORDS.has(core.toLowerCase()) && !core.includes("'") && core.length > bestLen) {
      bestIdx = i
      bestLen = core.length
    }
  })
  if (bestIdx < 0) return null
  const w = words[bestIdx]
  const core = w.match(/[\p{L}']+/u)?.[0] ?? w
  const blanked = [...words]
  blanked[bestIdx] = w.replace(core, '___')
  return { sentence: blanked.join(' '), answer: core, pl: item.pl, full: item.en }
}

/** Zdanie angielskie używane w rozsypance, dyktandzie i shadowingu. */
export function sentenceFor(item: Item, exampleIndex = 0): { en: string; pl: string; alt: string[] } {
  if (item.type === 'pattern') {
    const ex = item.example[exampleIndex % item.example.length]
    return { en: ex.en, pl: ex.pl, alt: ex.alt ?? [] }
  }
  if (item.type === 'word') {
    const ex = item.example[0]
    return { en: ex.en, pl: ex.pl, alt: ex.alt ?? [] }
  }
  return { en: item.en, pl: item.pl, alt: item.alternatives }
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Słowa do rozsypanki (bez końcowej interpunkcji), przetasowane inaczej niż oryginał. */
export function scrambleTokens(sentence: string, rng: () => number = Math.random): string[] {
  const words = sentence.trim().replace(/[.!?…]+$/, '').split(/\s+/)
  if (words.length < 2) return words
  const shuffled = [...words]
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    if (shuffled.join(' ') !== words.join(' ')) break
  }
  return shuffled
}

/** Podpowiedź dla trudnych: pierwsze litery słów, np. „I u____ g_ t_ t__ g__”. */
export function firstLettersHint(sentence: string): string {
  return sentence
    .split(/\s+/)
    .map((w) => {
      const m = w.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}])([\p{L}\p{N}']*)(.*)$/u)
      if (!m) return w
      return m[1] + m[2] + m[3].replace(/[\p{L}\p{N}]/gu, '_') + m[4]
    })
    .join(' ')
}
