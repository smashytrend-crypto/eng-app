/**
 * Tolerancyjne sprawdzanie odpowiedzi po angielsku.
 *
 * Ignoruje: wielkość liter, interpunkcję, rodzaj apostrofu, różnice I'm / I am, gonna / going to,
 * pisownię UK/US (colour / color), liczby zapisane cyfrą lub słowem (25 / twenty-five).
 * Drobna literówka = „prawie dobrze” (almost), z podświetleniem różnic na poziomie słów.
 */

export type Verdict = 'correct' | 'almost' | 'wrong' | 'empty'
export type DiffKind = 'ok' | 'missing' | 'extra' | 'typo'

export interface DiffWord {
  text: string
  kind: DiffKind
}

export interface CheckResult {
  verdict: Verdict
  /** Kandydat (oryginalny zapis), do którego odpowiedź była najbliżej. */
  best: string
  /** Słowa poprawnej odpowiedzi z zaznaczeniem pominiętych / błędnych. */
  expected: DiffWord[]
  /** Słowa odpowiedzi użytkownika z zaznaczeniem zbędnych / błędnych. */
  given: DiffWord[]
}

export interface CheckOptions {
  /** Dla słówek: ignoruj początkowe a / an / the / to. */
  ignoreLeadingArticle?: boolean
}

const CONTRACTION_WORDS: Record<string, string> = {
  "can't": 'can not',
  cannot: 'can not',
  "won't": 'will not',
  "shan't": 'shall not',
  "ain't": 'is not',
  "let's": 'let us',
  "y'all": 'you all',
  gonna: 'going to',
  wanna: 'want to',
  gotta: 'got to',
  kinda: 'kind of',
  sorta: 'sort of',
  lemme: 'let me',
  gimme: 'give me',
  dunno: 'do not know',
  "'cause": 'because',
  cos: 'because',
  cuz: 'because',
  okay: 'ok',
  alright: 'all right',
  'o.k': 'ok',
}

/**
 * Skróty wpisane bez apostrofu (na telefonie to częste): im, dont, hows…
 * Pomijamy dwuznaczne: its, were, well, ill, id, wed, hell, shell.
 */
const NO_APOSTROPHE: Record<string, string> = {
  im: "i'm", ive: "i've", youre: "you're", youve: "you've", youll: "you'll", youd: "you'd",
  hes: "he's", shes: "she's", theyre: "they're", theyve: "they've", theyll: "they'll", theyd: "they'd",
  weve: "we've", dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", arent: "aren't",
  wasnt: "wasn't", werent: "weren't", cant: "can't", couldnt: "couldn't", wouldnt: "wouldn't",
  shouldnt: "shouldn't", wont: "won't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't",
  thats: "that's", whats: "what's", wheres: "where's", hows: "how's", whos: "who's", theres: "there's",
  heres: "here's", lets: "let's", mustnt: "mustn't", neednt: "needn't", itll: "it'll", thatll: "that'll",
}

const S_IS_WORDS = new Set([
  'it', 'he', 'she', 'that', 'what', 'where', 'who', 'how', 'there', 'here', 'when', 'why', 'this',
  'everyone', 'everything', 'nobody', 'nothing', 'something', 'someone', 'somebody', 'everybody',
])

const SPELLING: Record<string, string> = {
  colour: 'color', colours: 'colors', favourite: 'favorite', favourites: 'favorites', centre: 'center',
  centres: 'centers', theatre: 'theater', travelling: 'traveling', travelled: 'traveled',
  traveller: 'traveler', travellers: 'travelers', cancelled: 'canceled', cancelling: 'canceling',
  organise: 'organize', organised: 'organized', realise: 'realize', realised: 'realized',
  apologise: 'apologize', recognise: 'recognize', grey: 'gray', programme: 'program',
  neighbour: 'neighbor', neighbours: 'neighbors', behaviour: 'behavior', flavour: 'flavor',
  honour: 'honor', humour: 'humor', licence: 'license', metre: 'meter', metres: 'meters',
  litre: 'liter', litres: 'liters', kilometre: 'kilometer', kilometres: 'kilometers',
  jewellery: 'jewelry', mum: 'mom', practise: 'practice', practising: 'practicing',
  pyjamas: 'pajamas', moustache: 'mustache', aeroplane: 'airplane', analyse: 'analyze',
  labour: 'labor', rumour: 'rumor', harbour: 'harbor', enrol: 'enroll', defence: 'defense',
  offence: 'offense', catalogue: 'catalog', dialogue: 'dialog', fulfil: 'fulfill',
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const NUMBER_WORDS = new Set([...ONES, ...TENS.filter(Boolean), 'hundred', 'thousand', 'million'])

export function numberToWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n)
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '')
  if (n < 1_000_000) {
    return numberToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
  }
  if (n < 1_000_000_000) {
    return numberToWords(Math.floor(n / 1_000_000)) + ' million' +
      (n % 1_000_000 ? ' ' + numberToWords(n % 1_000_000) : '')
  }
  return String(n)
}

const ORDINAL_IRREGULAR: Record<string, string> = {
  one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth',
}

export function ordinalToWords(n: number): string {
  const words = numberToWords(n).split(' ')
  const last = words.pop()!
  let ord: string
  if (ORDINAL_IRREGULAR[last]) ord = ORDINAL_IRREGULAR[last]
  else if (last.endsWith('y')) ord = last.slice(0, -1) + 'ieth'
  else ord = last + 'th'
  return [...words, ord].join(' ')
}

/** Kanoniczne tokeny dla jednego „słowa” z oryginalnego tekstu (może dać 0–kilka tokenów). */
export function canonicalWord(raw: string): string[] {
  let w = raw.toLowerCase().normalize('NFKC').replace(/[’‘`´]/g, "'")
  w = w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, '')
  // Skróty z apostrofem lub kropką na brzegu ('cause, o.k.) przed usunięciem interpunkcji
  if (CONTRACTION_WORDS[w]) return CONTRACTION_WORDS[w].split(' ')
  w = w.replace(/^'+|'+$/g, '')
  if (!w) return []

  // Rozbij na części (myślniki, ukośniki, dwukropki w godzinach, kropki itp.)
  const parts = w.split(/[^\p{L}\p{N}']+/u).filter(Boolean)
  const out: string[] = []
  for (const part of parts) out.push(...canonicalPart(part))
  return out
}

function canonicalPart(p: string): string[] {
  if (CONTRACTION_WORDS[p]) return CONTRACTION_WORDS[p].split(' ')
  if (/^\d+$/.test(p)) return numberToWords(Number(p)).split(' ')
  const ord = p.match(/^(\d+)(st|nd|rd|th)$/)
  if (ord) return ordinalToWords(Number(ord[1])).split(' ')

  let m: RegExpMatchArray | null
  if ((m = p.match(/^(.+)n't$/))) return [...canonicalPart(m[1]), 'not']
  if ((m = p.match(/^(.+)'m$/))) return [...canonicalPart(m[1]), 'am']
  if ((m = p.match(/^(.+)'re$/))) return [...canonicalPart(m[1]), 'are']
  if ((m = p.match(/^(.+)'ve$/))) return [...canonicalPart(m[1]), 'have']
  if ((m = p.match(/^(.+)'ll$/))) return [...canonicalPart(m[1]), 'will']
  if ((m = p.match(/^(.+)'d$/))) return [...canonicalPart(m[1]), 'would']
  if ((m = p.match(/^(.+)'s$/)) && S_IS_WORDS.has(m[1])) return [m[1], 'is']

  const plain = p.replace(/'/g, '')
  if (!plain) return []
  if (NO_APOSTROPHE[plain] && !p.includes("'")) return canonicalPart(NO_APOSTROPHE[plain])
  return [SPELLING[plain] ?? plain]
}

/** „one hundred and twenty” → „one hundred twenty”, „a hundred” → „one hundred”. */
function tidyNumbers<T extends { key: string }>(tokens: T[]): T[] {
  const out: T[] = []
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const next = tokens[i + 1]?.key
    const prev = out.at(-1)?.key
    if (t.key === 'and' && (prev === 'hundred' || prev === 'thousand') && next && NUMBER_WORDS.has(next)) continue
    if (t.key === 'a' && (next === 'hundred' || next === 'thousand' || next === 'million')) {
      out.push({ ...t, key: 'one' })
      continue
    }
    out.push(t)
  }
  return out
}

function splitWords(s: string): string[] {
  return s.split(/\s+/).filter(Boolean)
}

export function normalizeTokens(s: string, opts: CheckOptions = {}): string[] {
  return tokensWithWords(s, opts).toks.map((t) => t.key)
}

/** Znormalizowany tekst do porównań (także do wykrywania duplikatów w treściach). */
export function normalize(s: string, opts: CheckOptions = {}): string {
  return normalizeTokens(s, opts).join(' ')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** Ile literówek (zmian znaków) dopuszczamy, żeby uznać odpowiedź za „prawie dobrze”. */
export function typoAllowance(len: number): number {
  if (len <= 3) return 0
  if (len <= 7) return 1
  if (len <= 15) return 2
  if (len <= 30) return 3
  return 4
}

interface Tok {
  key: string
  word: number
}

function tokensWithWords(s: string, opts: CheckOptions): { words: string[]; toks: Tok[] } {
  const words = splitWords(s)
  let toks: Tok[] = []
  words.forEach((w, i) => canonicalWord(w).forEach((key) => toks.push({ key, word: i })))
  toks = tidyNumbers(toks)
  // Dla słówek pomijamy początkowy przedimek (słowo zostaje widoczne jako „ok”)
  if (opts.ignoreLeadingArticle && toks.length > 1 && ['a', 'an', 'the', 'to'].includes(toks[0].key)) {
    toks.shift()
  }
  return { words, toks }
}

const RANK: Record<DiffKind, number> = { ok: 0, typo: 1, missing: 2, extra: 2 }

/** Porównanie słowo po słowie: co pominięto, co jest zbędne, gdzie jest literówka. */
export function diffWords(given: string, expected: string, opts: CheckOptions = {}): { expected: DiffWord[]; given: DiffWord[] } {
  const g = tokensWithWords(given, opts)
  const e = tokensWithWords(expected, opts)
  const n = g.toks.length
  const m = e.toks.length
  // LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = g.toks[i].key === e.toks[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const gKind: DiffKind[] = new Array(n).fill('extra')
  const eKind: DiffKind[] = new Array(m).fill('missing')
  const pairs: Array<[number, number]> = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (g.toks[i].key === e.toks[j].key) {
      pairs.push([i, j])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++
    else j++
  }
  for (const [a, b] of pairs) {
    gKind[a] = 'ok'
    eKind[b] = 'ok'
  }
  // Literówki: w lukach między dopasowaniami paruj niedopasowane tokeny o małej odległości
  const anchors: Array<[number, number]> = [[-1, -1], ...pairs, [n, m]]
  for (let k = 0; k < anchors.length - 1; k++) {
    const [gi0, ej0] = anchors[k]
    const [gi1, ej1] = anchors[k + 1]
    const gGap = range(gi0 + 1, gi1)
    const eGap = range(ej0 + 1, ej1)
    for (let t = 0; t < Math.min(gGap.length, eGap.length); t++) {
      const a = g.toks[gGap[t]].key
      const b = e.toks[eGap[t]].key
      if (levenshtein(a, b) <= Math.max(1, Math.floor(b.length / 4))) {
        gKind[gGap[t]] = 'typo'
        eKind[eGap[t]] = 'typo'
      }
    }
  }
  return {
    expected: toWordDiff(e.words, e.toks, eKind),
    given: toWordDiff(g.words, g.toks, gKind, 'extra'),
  }
}

function range(from: number, to: number): number[] {
  const r: number[] = []
  for (let x = from; x < to; x++) r.push(x)
  return r
}

function toWordDiff(words: string[], toks: Tok[], kinds: DiffKind[], emptyKind: DiffKind = 'ok'): DiffWord[] {
  const perWord: DiffKind[] = words.map(() => (toks.length ? 'ok' : emptyKind))
  const seen = new Set<number>()
  toks.forEach((t, idx) => {
    const k = kinds[idx]
    if (!seen.has(t.word)) {
      perWord[t.word] = k
      seen.add(t.word)
    } else if (RANK[k] > RANK[perWord[t.word]]) perWord[t.word] = k
  })
  return words.map((text, idx) => ({ text, kind: perWord[idx] }))
}

/** Sprawdza odpowiedź względem listy akceptowanych wersji (pierwsza = wzorcowa). */
export function checkAnswer(input: string, candidates: string[], opts: CheckOptions = {}): CheckResult {
  const cands = candidates.filter((c) => c.trim())
  const fallback = cands[0] ?? ''
  if (!input.trim()) {
    return { verdict: 'empty', best: fallback, expected: splitWords(fallback).map((text) => ({ text, kind: 'missing' })), given: [] }
  }
  const normIn = normalize(input, opts)
  let best = fallback
  let bestDist = Infinity
  let bestRatio = Infinity
  for (const c of cands) {
    const normC = normalize(c, opts)
    if (normC === normIn) {
      return {
        verdict: 'correct',
        best: c,
        expected: splitWords(c).map((text) => ({ text, kind: 'ok' })),
        given: splitWords(input).map((text) => ({ text, kind: 'ok' })),
      }
    }
    const d = levenshtein(normIn, normC)
    const ratio = d / Math.max(1, normC.length)
    if (ratio < bestRatio) {
      bestRatio = ratio
      bestDist = d
      best = c
    }
  }
  const normBest = normalize(best, opts)
  const wordGap = Math.abs(normIn.split(' ').length - normBest.split(' ').length)
  const verdict: Verdict = bestDist <= typoAllowance(normBest.length) && wordGap <= 1 ? 'almost' : 'wrong'
  return { verdict, best, ...diffWords(input, best, opts) }
}
