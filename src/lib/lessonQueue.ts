import { isVocab, type Item } from '../content/schema'
import { dayEnd } from './dates'
import { clozeData, sentenceFor, wordCount } from './exercises'
import { isLearningState, State, type StoredCard } from './srs'

export type ExerciseMode = 'recall' | 'type' | 'cloze' | 'scramble' | 'dictation' | 'shadow' | 'own' | 'dialog'
export type EntryKind = 'new' | 'review' | 'again'

export interface QueueEntry {
  itemId: string
  kind: EntryKind
  mode: ExerciseMode
  /** Który przykład (dla wzorców i dyktand). */
  exampleIndex: number
}

export type TypingPreference = 'often' | 'sometimes' | 'rarely'

export interface ModeOptions {
  enabled: ReadonlySet<ExerciseMode>
  typing: TypingPreference
}

export const ALL_MODES: ReadonlySet<ExerciseMode> = new Set<ExerciseMode>([
  'recall', 'type', 'cloze', 'scramble', 'dictation', 'shadow', 'own', 'dialog',
])

export interface LessonInput {
  now: Date
  /** Wszystkie elementy w kolejności programu (etap → moduł → order). */
  items: Item[]
  cards: ReadonlyMap<string, StoredCard>
  newPerDay: number
  /** Nowe słówka ze słownika dziennie (osobny limit, kolejność: poziom → częstotliwość). */
  vocabPerDay?: number
  maxReviews: number
  /** newItems = wszystkie nowe dziś (także słówka); vocabNew = w tym słówka ze słownika. */
  doneToday: { reviews: number; newItems: number; vocabNew?: number }
  /** Dodatkowe nowe elementy na dziś („Ucz się dalej”). */
  extraNew?: number
  /** Id modułów z pierwszeństwem (wyjazd: podróże / festiwale). */
  priorityModules?: ReadonlySet<string>
  modes: ModeOptions
  rng?: () => number
}

export interface LessonPlan {
  entries: QueueEntry[]
  /** Wszystkie zaległe na dziś (także ponad limit). */
  dueTotal: number
  reviewCount: number
  newCount: number
  /** Ile z nowych to słówka ze słownika. */
  vocabCount: number
}

const TYPING_FACTOR: Record<TypingPreference, number> = { often: 2, sometimes: 1, rarely: 0.25 }
const KEYBOARD_MODES: ReadonlySet<ExerciseMode> = new Set(['type', 'cloze', 'dictation'])

function weightedPick(weights: Array<[ExerciseMode, number]>, rng: () => number): ExerciseMode {
  const total = weights.reduce((s, [, w]) => s + w, 0)
  let r = rng() * total
  for (const [mode, w] of weights) {
    r -= w
    if (r <= 0) return mode
  }
  return weights[weights.length - 1][0]
}

/** Dobór ćwiczenia dla powtórki. Mocniej utrwalone elementy dostają trudniejsze formy. */
export function chooseMode(
  item: Item,
  card: StoredCard | undefined,
  opts: ModeOptions,
  rng: () => number,
  exampleIndex = 0,
): ExerciseMode {
  const ok = (m: ExerciseMode) => opts.enabled.has(m)
  if (item.type === 'dialog') return ok('dialog') ? 'dialog' : 'recall'
  if (!card || card.state === State.New || isLearningState(card)) {
    return ok('type') && opts.typing === 'often' && rng() < 0.3 ? 'type' : 'recall'
  }
  const sentence = sentenceFor(item, exampleIndex).en
  const words = wordCount(sentence)
  const hasCloze = clozeData(item, exampleIndex) !== null
  const young = card.stability < 4

  let weights: Array<[ExerciseMode, number]>
  if (item.type === 'pattern') {
    weights = young
      ? [['recall', 4], ['cloze', 4], ['scramble', 2], ['type', 1]]
      : [['recall', 3], ['own', 3], ['type', 2], ['cloze', 1], ['shadow', 1]]
  } else if (item.type === 'word') {
    weights = young
      ? [['recall', 4], ['cloze', 3], ['type', 2], ['dictation', 1]]
      : [['recall', 4], ['type', 3], ['cloze', 2], ['dictation', 1]]
  } else {
    weights = young
      ? [['recall', 4], ['scramble', 2], ['cloze', 2], ['shadow', 2], ['type', 1], ['dictation', 1]]
      : [['recall', 4], ['type', 3], ['shadow', 2], ['dictation', 1], ['scramble', 1], ['cloze', 1]]
  }
  weights = weights
    .filter(([m]) => ok(m))
    .filter(([m]) => m !== 'cloze' || hasCloze)
    .filter(([m]) => m !== 'scramble' || (words >= 3 && words <= 12))
    .filter(([m]) => m !== 'shadow' || words >= 3)
    .map(([m, w]) => [m, KEYBOARD_MODES.has(m) ? w * TYPING_FACTOR[opts.typing] : w] as [ExerciseMode, number])
  if (!weights.length) return 'recall'
  return weightedPick(weights, rng)
}

/** Ile nowych elementów na dziś, biorąc pod uwagę zaległości. */
export function newBudget(newPerDay: number, maxReviews: number, dueTotal: number, doneNew: number, extraNew = 0): number {
  let budget = newPerDay
  if (dueTotal > maxReviews * 2) budget = 0
  else if (dueTotal > maxReviews) budget = Math.ceil(newPerDay / 2)
  return Math.max(0, budget + extraNew - doneNew)
}

/** Kolejność nowych elementów: własne zwroty → (przed wyjazdem) moduły priorytetowe → reszta programu. */
export function orderNewItems(items: Item[], cards: ReadonlyMap<string, StoredCard>, priority?: ReadonlySet<string>, count = Infinity): Item[] {
  const unseen = items.filter((i) => !cards.has(i.id))
  const custom = unseen.filter((i) => i.custom)
  const rest = unseen.filter((i) => !i.custom)
  if (!priority || priority.size === 0) return [...custom, ...rest].slice(0, count)
  const prio = rest.filter((i) => priority.has(i.module))
  const normal = rest.filter((i) => !priority.has(i.module))
  // ok. 2/3 nowych z modułów priorytetowych, 1/3 z programu (żeby nie zgubić podstaw)
  const out: Item[] = [...custom]
  let p = 0
  let n = 0
  while (out.length < Math.min(count, unseen.length) && (p < prio.length || n < normal.length)) {
    const takePrio = p < prio.length && (n >= normal.length || (out.length - custom.length) % 3 !== 2)
    if (takePrio) out.push(prio[p++])
    else out.push(normal[n++])
  }
  return out.slice(0, count)
}

export function dueCards(cards: ReadonlyMap<string, StoredCard>, now: Date, itemIds?: ReadonlySet<string>): StoredCard[] {
  const end = dayEnd(now).getTime()
  const due: StoredCard[] = []
  for (const c of cards.values()) {
    if (c.state === State.New) continue
    if (itemIds && !itemIds.has(c.itemId)) continue
    if (c.due <= end) due.push(c)
  }
  // najpierw karty w trakcie nauki, potem najbardziej zaległe
  return due.sort((a, b) => Number(isLearningState(b)) - Number(isLearningState(a)) || a.due - b.due)
}

/** Buduje dzisiejszą lekcję: powtórki (z limitem) przeplatane nowymi elementami. */
export function buildLesson(input: LessonInput): LessonPlan {
  const rng = input.rng ?? Math.random
  const byId = new Map(input.items.map((i) => [i.id, i]))
  const due = dueCards(input.cards, input.now, new Set(byId.keys()))
  const reviewBudget = Math.max(0, input.maxReviews - input.doneToday.reviews)
  const reviews = due.slice(0, reviewBudget)
  const doneVocab = input.doneToday.vocabNew ?? 0
  const program = input.items.filter((i) => !isVocab(i))
  const vocab = input.items.filter((i) => isVocab(i))
  const nNew = newBudget(input.newPerDay, input.maxReviews, due.length, input.doneToday.newItems - doneVocab, input.extraNew)
  const nVocab = newBudget(input.vocabPerDay ?? 0, input.maxReviews, due.length, doneVocab)
  const programNews = orderNewItems(program, input.cards, input.priorityModules, nNew)
  const vocabNews = vocab.filter((i) => !input.cards.has(i.id)).slice(0, nVocab)
  const news = interleave(programNews, vocabNews)

  const reviewEntries: QueueEntry[] = reviews.map((c) => {
    const item = byId.get(c.itemId)!
    const exampleIndex = item.example.length ? c.reps % item.example.length : 0
    return { itemId: c.itemId, kind: 'review', mode: chooseMode(item, c, input.modes, rng, exampleIndex), exampleIndex }
  })
  const newEntries: QueueEntry[] = news.map((item) => ({
    itemId: item.id,
    kind: 'new',
    mode: item.type === 'dialog' && input.modes.enabled.has('dialog') ? 'dialog' : 'recall',
    exampleIndex: 0,
  }))

  return {
    entries: interleave(reviewEntries, newEntries),
    dueTotal: due.length,
    reviewCount: reviewEntries.length,
    newCount: newEntries.length,
    vocabCount: vocabNews.length,
  }
}

/** Nowe elementy rozłożone równo między powtórkami (zaczynamy od krótkiej rozgrzewki). */
export function interleave<T>(reviews: T[], news: T[]): T[] {
  if (!news.length) return [...reviews]
  if (!reviews.length) return [...news]
  const gap = Math.max(1, Math.floor(reviews.length / news.length))
  const out: T[] = []
  let n = 0
  reviews.forEach((r, i) => {
    out.push(r)
    if ((i + 1) % gap === 0 && n < news.length) out.push(news[n++])
  })
  while (n < news.length) out.push(news[n++])
  return out
}

/** Maksymalnie tyle razy ten sam element może wrócić w jednej lekcji. */
export const MAX_REPEATS_IN_SESSION = 3
/** Karty, które wracają w ciągu tylu ms, pokazujemy jeszcze w tej samej lekcji. */
export const IN_SESSION_WINDOW_MS = 20 * 60 * 1000

/**
 * Gdzie wstawić kartę, która wróci za chwilę (kroki nauki FSRS).
 * Zwraca indeks w kolejce albo null, jeśli karta ma poczekać do następnej lekcji.
 */
export function requeueIndex(queueLength: number, currentIndex: number, dueInMs: number): number | null {
  if (dueInMs > IN_SESSION_WINDOW_MS) return null
  const gap = dueInMs <= 2 * 60 * 1000 ? 3 : 6
  return Math.min(queueLength, currentIndex + 1 + gap)
}
