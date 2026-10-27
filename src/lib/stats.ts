import type { Item, ItemType } from '../content/schema'
import { isMastered, Rating, State, type StoredCard, type StoredLog } from './srs'

const DAY_MS = 86_400_000

/**
 * „Trudne” elementy: często zapominane. Kryteria: ≥2 pomyłki w powtórkach (lapses),
 * albo ≥2 „Nie pamiętam” w ostatnich 30 dniach, albo wysoka trudność FSRS po kilku powtórkach.
 * Posortowane od najtrudniejszych.
 */
export function hardItemIds(cards: ReadonlyMap<string, StoredCard>, logs: StoredLog[], now: Date): string[] {
  const since = now.getTime() - 30 * DAY_MS
  const againRecent = new Map<string, number>()
  for (const l of logs) {
    if (l.ts >= since && l.rating === Rating.Again && l.state !== State.New) {
      againRecent.set(l.itemId, (againRecent.get(l.itemId) ?? 0) + 1)
    }
  }
  const scored: Array<{ id: string; score: number }> = []
  for (const c of cards.values()) {
    if (c.state === State.New) continue
    const again = againRecent.get(c.itemId) ?? 0
    const hard = c.lapses >= 2 || again >= 2 || (c.difficulty >= 8 && c.reps >= 3)
    if (!hard) continue
    scored.push({ id: c.itemId, score: c.lapses * 2 + again + c.difficulty / 5 })
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.id)
}

export interface ItemCounts {
  total: number
  introduced: number
  mastered: number
  byType: Record<ItemType, { introduced: number; mastered: number; total: number }>
}

export function countItems(items: Item[], cards: ReadonlyMap<string, StoredCard>): ItemCounts {
  const byType = {
    phrase: { introduced: 0, mastered: 0, total: 0 },
    word: { introduced: 0, mastered: 0, total: 0 },
    pattern: { introduced: 0, mastered: 0, total: 0 },
    dialog: { introduced: 0, mastered: 0, total: 0 },
  } satisfies ItemCounts['byType']
  let introduced = 0
  let mastered = 0
  for (const item of items) {
    const card = cards.get(item.id)
    const t = byType[item.type]
    t.total++
    if (card && card.state !== State.New) {
      introduced++
      t.introduced++
      if (isMastered(card)) {
        mastered++
        t.mastered++
      }
    }
  }
  return { total: items.length, introduced, mastered, byType }
}

/** Liczba nowych elementów wprowadzonych w danym przedziale czasu (ms). */
export function introducedSince(cards: ReadonlyMap<string, StoredCard>, sinceMs: number): StoredCard[] {
  return [...cards.values()].filter((c) => c.introducedAt >= sinceMs && c.state !== State.New)
}

/** Aktualny etap = etap pierwszego jeszcze niepoznanego elementu programu. */
export function currentStage(items: Item[], cards: ReadonlyMap<string, StoredCard>): number {
  const next = items.find((i) => !i.custom && !cards.has(i.id))
  if (next) return next.stage
  return Math.max(1, ...items.filter((i) => !i.custom).map((i) => i.stage))
}

/** Prosty, deterministyczny hash tekstu (do wyboru „zadania dnia”). */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
