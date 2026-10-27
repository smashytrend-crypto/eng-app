import { allContentItems, priorityModuleIds } from '../content'
import type { Item } from '../content/schema'
import { db, type SessionRow, type Settings } from '../db/db'
import { getDay, getSettings, loadCards } from '../db/repo'
import { dayKey, diffDays } from '../lib/dates'
import { buildLesson, type ExerciseMode, type LessonPlan, type QueueEntry, chooseMode } from '../lib/lessonQueue'
import { hardItemIds } from '../lib/stats'
import type { StoredCard } from '../lib/srs'
import { ttsSupported } from '../speech/tts'

/** Ćwiczenia dostępne w tej przeglądarce. */
export function enabledModes(): Set<ExerciseMode> {
  const modes = new Set<ExerciseMode>(['recall', 'type', 'cloze', 'scramble', 'own', 'dialog'])
  if (ttsSupported) {
    modes.add('dictation')
    modes.add('shadow')
  }
  return modes
}

export async function allItems(): Promise<Item[]> {
  const custom = (await db.customItems.toArray()).sort((a, b) => a.order - b.order)
  return [...custom, ...allContentItems]
}

/** Moduły z pierwszeństwem: jeśli jest zaplanowany wyjazd w ciągu 120 dni. */
export async function activePriorityModules(today: string): Promise<Set<string>> {
  const trips = await db.trips.toArray()
  const upcoming = trips.filter((t) => {
    const d = diffDays(today, t.date)
    return d >= 0 && d <= 120
  })
  if (!upcoming.length) return new Set()
  const kinds = new Set<'travel' | 'festival'>(['travel'])
  if (upcoming.some((t) => t.kind === 'festival')) kinds.add('festival')
  return priorityModuleIds([...kinds])
}

export async function planToday(now = new Date(), settings?: Settings): Promise<LessonPlan> {
  const s = settings ?? (await getSettings())
  const key = dayKey(now)
  const [items, cards, day, priority] = await Promise.all([allItems(), loadCards(), getDay(key), activePriorityModules(key)])
  return buildLesson({
    now,
    items,
    cards,
    newPerDay: s.newPerDay,
    vocabPerDay: s.vocabPerDay,
    maxReviews: s.maxReviews,
    doneToday: { reviews: day.reviews, newItems: day.newItems, vocabNew: day.vocabNew ?? 0 },
    extraNew: day.extraNew,
    priorityModules: priority,
    modes: { enabled: enabledModes(), typing: s.typing },
  })
}

/** Zwraca niedokończoną dzisiejszą lekcję albo null. */
export async function activeSession(now = new Date()): Promise<SessionRow | null> {
  const s = await db.session.get('current')
  if (!s || s.done || s.dayKey !== dayKey(now) || s.index >= s.entries.length) return null
  return s
}

export async function startLesson(now = new Date()): Promise<SessionRow | null> {
  const existing = await activeSession(now)
  if (existing) return existing
  const plan = await planToday(now)
  if (!plan.entries.length) return null
  const session: SessionRow = {
    id: 'current',
    dayKey: dayKey(now),
    entries: plan.entries,
    index: 0,
    createdAt: now.getTime(),
    repeats: {},
    done: false,
    kind: 'lesson',
  }
  await db.session.put(session)
  return session
}

/** Ćwiczenie trudnych elementów (osobna krótka sesja). */
export async function startHardPractice(now = new Date(), limit = 15): Promise<SessionRow | null> {
  const s = await getSettings()
  const [items, cards, logs] = await Promise.all([allItems(), loadCards(), db.reviewLogs.toArray()])
  const byId = new Map(items.map((i) => [i.id, i]))
  const ids = hardItemIds(cards, logs, now).filter((id) => byId.has(id)).slice(0, limit)
  if (!ids.length) return null
  const entries: QueueEntry[] = ids.map((id) => {
    const item = byId.get(id)!
    const card = cards.get(id) as StoredCard
    const exampleIndex = item.example.length ? card.reps % item.example.length : 0
    return {
      itemId: id,
      kind: 'again',
      mode: chooseMode(item, card, { enabled: enabledModes(), typing: s.typing }, Math.random, exampleIndex),
      exampleIndex,
    }
  })
  const session: SessionRow = {
    id: 'current', dayKey: dayKey(now), entries, index: 0, createdAt: now.getTime(), repeats: {}, done: false, kind: 'hard',
  }
  await db.session.put(session)
  return session
}

export async function finishSession(session: SessionRow): Promise<void> {
  await db.session.put({ ...session, done: true })
}
