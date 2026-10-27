import type { Item } from '../content/schema'
import { isLearningState, State, type StoredCard } from './srs'
import { wordCount } from './exercises'

export type AudioSource = 'due' | 'recent' | 'favorites' | 'hard' | 'known'

export interface AudioTrack {
  itemId: string
  pl: string
  en: string
  /** Kwestie dialogu (A/B) — odtwarzane jako słuchowisko. */
  lines?: Array<{ en: string; speaker: 'A' | 'B' }>
}

/** Zamienia element na ścieżkę audio: PL → pauza → EN ×2 (wzorce: przykłady). */
export function trackFor(item: Item, variant = 0): AudioTrack {
  if (item.type === 'dialog') {
    return { itemId: item.id, pl: item.pl, en: item.en, lines: item.example.map((l) => ({ en: l.en, speaker: l.speaker ?? 'A' })) }
  }
  if (item.type === 'pattern') {
    const ex = item.example[variant % item.example.length]
    return { itemId: item.id, pl: ex.pl, en: ex.en }
  }
  return { itemId: item.id, pl: item.pl.split(' / ')[0], en: item.en }
}

/** Pauza na odpowiedź: dłuższe zdanie = więcej czasu. Mnożnik z ustawień. */
export function answerPauseMs(en: string, factor: number): number {
  return Math.round((1600 + 450 * wordCount(en)) * factor)
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function buildPlaylist(
  source: AudioSource,
  opts: {
    items: ReadonlyMap<string, Item>
    cards: ReadonlyMap<string, StoredCard>
    favorites: ReadonlySet<string>
    hard: string[]
    now: number
    limit?: number
    rng?: () => number
  },
): AudioTrack[] {
  const { items, cards, favorites, hard, now } = opts
  const limit = opts.limit ?? 40
  const rng = opts.rng ?? Math.random
  const known = [...cards.values()].filter((c) => c.state !== State.New)
  let ids: string[]
  switch (source) {
    case 'due':
      ids = known
        .filter((c) => c.due <= now + 24 * 3600e3 || isLearningState(c))
        .sort((a, b) => a.due - b.due)
        .map((c) => c.itemId)
      break
    case 'recent':
      ids = known
        .filter((c) => c.introducedAt >= now - 7 * 24 * 3600e3)
        .sort((a, b) => b.introducedAt - a.introducedAt)
        .map((c) => c.itemId)
      break
    case 'favorites':
      ids = [...favorites]
      break
    case 'hard':
      ids = hard
      break
    case 'known':
      ids = shuffle(
        known.map((c) => c.itemId),
        rng,
      )
      break
  }
  return ids
    .map((id) => items.get(id))
    .filter((i): i is Item => !!i)
    .slice(0, limit)
    .map((i) => trackFor(i, cards.get(i.id)?.reps ?? 0))
}
