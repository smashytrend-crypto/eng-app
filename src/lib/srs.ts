import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'

export { Rating, State }
export type { Grade }

/** Gramatyka, którą Domin chce wzmocnić — te elementy wracają częściej. */
export const GRAMMAR_FOCUS_TAGS = [
  'gr:present-simple',
  'gr:there-is-are',
  'gr:going-to',
  'gr:present-continuous-future',
] as const

export const RETENTION_NORMAL = 0.9
export const RETENTION_FOCUS = 0.95
/** Element „opanowany” = interwał co najmniej tyle dni. */
export const MASTERED_DAYS = 21

const base = {
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ['1m', '10m'] as const,
  relearning_steps: ['10m'] as const,
  maximum_interval: 365,
}

const schedulerNormal = fsrs({ ...base, request_retention: RETENTION_NORMAL })
const schedulerFocus = fsrs({ ...base, request_retention: RETENTION_FOCUS })

export function isGrammarFocus(tags: readonly string[]): boolean {
  return tags.some((t) => (GRAMMAR_FOCUS_TAGS as readonly string[]).includes(t))
}

function schedulerFor(tags: readonly string[]) {
  return isGrammarFocus(tags) ? schedulerFocus : schedulerNormal
}

/** Karta FSRS zapisana w IndexedDB (daty jako liczby ms — łatwy eksport do JSON). */
export interface StoredCard {
  itemId: string
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: State
  last_review: number | null
  /** Kiedy element został pierwszy raz pokazany. */
  introducedAt: number
}

export interface StoredLog {
  id?: number
  itemId: string
  rating: Grade
  /** Stan karty przed oceną. */
  state: State
  ts: number
  dayKey: string
  mode: string
  /** Czas odpowiedzi w ms (przycięty). */
  ms: number
}

export function toFsrsCard(c: StoredCard): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review === null ? undefined : new Date(c.last_review),
  }
}

export function fromFsrsCard(itemId: string, card: Card, introducedAt: number): StoredCard {
  return {
    itemId,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.getTime() : null,
    introducedAt,
  }
}

export function newCard(itemId: string, now: Date): StoredCard {
  return fromFsrsCard(itemId, createEmptyCard(now), now.getTime())
}

/** Ocena karty. Zwraca nowy stan karty. */
export function reviewCard(card: StoredCard, grade: Grade, now: Date, tags: readonly string[]): StoredCard {
  const result = schedulerFor(tags).next(toFsrsCard(card), now, grade)
  return fromFsrsCard(card.itemId, result.card, card.introducedAt)
}

/** Podgląd: kiedy karta wróci po każdej z ocen (ms od teraz). */
export function previewIntervals(card: StoredCard, now: Date, tags: readonly string[]): Record<Grade, number> {
  const preview = schedulerFor(tags).repeat(toFsrsCard(card), now)
  return {
    [Rating.Again]: preview[Rating.Again].card.due.getTime() - now.getTime(),
    [Rating.Hard]: preview[Rating.Hard].card.due.getTime() - now.getTime(),
    [Rating.Good]: preview[Rating.Good].card.due.getTime() - now.getTime(),
    [Rating.Easy]: preview[Rating.Easy].card.due.getTime() - now.getTime(),
  } as Record<Grade, number>
}

/** „Znam to” z testu startowego: od razu ocena „Łatwe”, karta wróci za kilka dni do sprawdzenia. */
export function markKnown(itemId: string, now: Date, tags: readonly string[]): StoredCard {
  return reviewCard(newCard(itemId, now), Rating.Easy, now, tags)
}

export function isMastered(card: StoredCard | undefined): boolean {
  return !!card && card.state === State.Review && card.scheduled_days >= MASTERED_DAYS
}

export function isLearningState(card: StoredCard): boolean {
  return card.state === State.Learning || card.state === State.Relearning
}

/** Czytelny interwał po polsku: „1 min”, „10 min”, „3 godz.”, „4 dni”, „2 mies.” */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const hours = Math.round(min / 60)
  if (hours < 24) return `${hours} godz.`
  const days = Math.round(hours / 24)
  if (days === 1) return '1 dzień'
  if (days < 31) return `${days} dni`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} mies.`
  return `${(days / 365).toFixed(1).replace('.', ',')} roku`
}

export const RATING_LABELS: Record<Grade, string> = {
  [Rating.Again]: 'Nie pamiętam',
  [Rating.Hard]: 'Trudne',
  [Rating.Good]: 'Dobrze',
  [Rating.Easy]: 'Łatwe',
} as Record<Grade, string>

export const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]
