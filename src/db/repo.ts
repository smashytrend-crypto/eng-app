import { isVocab, type Item } from '../content/schema'
import { dayKey } from '../lib/dates'
import type { QueueEntry } from '../lib/lessonQueue'
import { requeueIndex, MAX_REPEATS_IN_SESSION } from '../lib/lessonQueue'
import { newCard, reviewCard, type Grade, type StoredCard } from '../lib/srs'
import { db as defaultDb, type AppDB, type DayRow, type SessionRow, type Settings } from './db'

export const DEFAULT_TARGET_DATE = '2027-07-01'

export function defaultSettings(now: Date = new Date()): Settings {
  return {
    id: 'main',
    onboarded: false,
    targetDate: DEFAULT_TARGET_DATE,
    startDate: dayKey(now),
    newPerDay: 8,
    vocabPerDay: 5,
    maxReviews: 60,
    accent: 'en-GB',
    voiceEn: '',
    voiceEn2: '',
    voicePl: '',
    rate: 0.95,
    theme: 'system',
    typing: 'sometimes',
    autoPlay: true,
    recognition: true,
    audioPause: 1,
    lastBackupAt: null,
  }
}

export async function getSettings(db: AppDB = defaultDb): Promise<Settings> {
  const s = await db.settings.get('main')
  return { ...defaultSettings(), ...s }
}

export async function saveSettings(patch: Partial<Settings>, db: AppDB = defaultDb): Promise<void> {
  const current = await getSettings(db)
  await db.settings.put({ ...current, ...patch, id: 'main' })
}

export function emptyDay(key: string): DayRow {
  return { dayKey: key, seconds: 0, reviews: 0, newItems: 0, extraNew: 0, vocabNew: 0, speakingDone: false, audioSeconds: 0 }
}

export async function getDay(key: string, db: AppDB = defaultDb): Promise<DayRow> {
  return { ...emptyDay(key), ...(await db.days.get(key)) }
}

export async function updateDay(key: string, fn: (d: DayRow) => DayRow, db: AppDB = defaultDb): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const d = await getDay(key, db)
    await db.days.put(fn(d))
  })
}

export async function loadCards(db: AppDB = defaultDb): Promise<Map<string, StoredCard>> {
  const all = await db.cards.toArray()
  return new Map(all.map((c) => [c.itemId, c]))
}

/** Maksymalny czas jednej karty liczony do czasu nauki (przerwa w trakcie się nie liczy). */
const MAX_CARD_MS = 120_000

export interface AnswerInput {
  item: Item
  entry: QueueEntry
  grade: Grade
  now: Date
  /** Czas spędzony na karcie (ms). */
  ms: number
  /** Gdy podana: aktualizuje też bieżącą lekcję (pozycja + ewentualny powrót karty). */
  session?: SessionRow
}

export interface AnswerResult {
  card: StoredCard
  session?: SessionRow
}

/**
 * Zapisuje odpowiedź w jednej transakcji: karta FSRS + historia + dzień + postęp lekcji.
 * Dzięki temu po zamknięciu aplikacji w dowolnym momencie nic nie ginie.
 */
export async function recordAnswer(input: AnswerInput, db: AppDB = defaultDb): Promise<AnswerResult> {
  const { item, entry, grade, now } = input
  const key = dayKey(now)
  const ms = Math.min(Math.max(0, input.ms), MAX_CARD_MS)
  return db.transaction('rw', [db.cards, db.reviewLogs, db.days, db.session], async () => {
    const before = (await db.cards.get(item.id)) ?? newCard(item.id, now)
    const after = reviewCard(before, grade, now, item.tags)
    await db.cards.put(after)
    await db.reviewLogs.add({
      itemId: item.id, rating: grade, state: before.state, ts: now.getTime(), dayKey: key, mode: entry.mode, ms,
    })
    const day = await getDay(key, db)
    await db.days.put({
      ...day,
      seconds: day.seconds + Math.round(ms / 1000),
      reviews: day.reviews + (entry.kind === 'review' ? 1 : 0),
      newItems: day.newItems + (entry.kind === 'new' ? 1 : 0),
      vocabNew: (day.vocabNew ?? 0) + (entry.kind === 'new' && isVocab(item) ? 1 : 0),
    })

    let session = input.session
    if (session) {
      const entries = [...session.entries]
      const repeats = { ...session.repeats }
      const pos = requeueIndex(entries.length, session.index, after.due - now.getTime())
      // Dialogi są długie — nie powtarzamy ich w tej samej lekcji
      if (pos !== null && item.type !== 'dialog' && (repeats[item.id] ?? 0) < MAX_REPEATS_IN_SESSION) {
        repeats[item.id] = (repeats[item.id] ?? 0) + 1
        entries.splice(pos, 0, { itemId: item.id, kind: 'again', mode: 'recall', exampleIndex: entry.exampleIndex })
      }
      session = { ...session, entries, repeats, index: session.index + 1 }
      await db.session.put(session)
    }
    return { card: after, session }
  })
}

/** Pominięcie karty (np. dialog bez głośnika) — przesuwa lekcję bez oceny. */
export async function skipEntry(session: SessionRow, db: AppDB = defaultDb): Promise<SessionRow> {
  const next = { ...session, index: session.index + 1 }
  await db.session.put(next)
  return next
}

export async function addStudySeconds(seconds: number, now = new Date(), db: AppDB = defaultDb): Promise<void> {
  await updateDay(dayKey(now), (d) => ({ ...d, seconds: d.seconds + Math.round(seconds) }), db)
}

/** Ręczne oznaczenie elementów jako znanych (test startowy). */
export async function saveCards(cards: StoredCard[], db: AppDB = defaultDb): Promise<void> {
  await db.cards.bulkPut(cards)
}

export async function toggleFavorite(itemId: string, db: AppDB = defaultDb): Promise<boolean> {
  const exists = await db.favorites.get(itemId)
  if (exists) {
    await db.favorites.delete(itemId)
    return false
  }
  await db.favorites.put({ itemId, addedAt: Date.now() })
  return true
}
