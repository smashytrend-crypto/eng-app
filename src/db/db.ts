import Dexie, { type Table } from 'dexie'
import type { Item } from '../content/schema'
import type { QueueEntry, TypingPreference } from '../lib/lessonQueue'
import type { StoredCard, StoredLog } from '../lib/srs'

export type Theme = 'system' | 'light' | 'dark'
export type Accent = 'en-GB' | 'en-US'

export interface Settings {
  id: 'main'
  onboarded: boolean
  /** Data docelowa (YYYY-MM-DD). */
  targetDate: string
  /** Dzień rozpoczęcia nauki (YYYY-MM-DD) — do planu. */
  startDate: string
  newPerDay: number
  maxReviews: number
  accent: Accent
  /** voiceURI wybranego głosu angielskiego (puste = automatycznie najlepszy). */
  voiceEn: string
  /** Drugi głos angielski (dialogi). */
  voiceEn2: string
  voicePl: string
  /** Tempo mowy lektora (1 = normalne). */
  rate: number
  theme: Theme
  typing: TypingPreference
  /** Automatyczny odsłuch po odsłonięciu odpowiedzi. */
  autoPlay: boolean
  /** Rozpoznawanie mowy (jeśli przeglądarka obsługuje). */
  recognition: boolean
  /** Długość pauzy na odpowiedź w trybie audio (mnożnik). */
  audioPause: number
  lastBackupAt: number | null
}

export interface DayRow {
  dayKey: string
  /** Sekundy nauki. */
  seconds: number
  reviews: number
  newItems: number
  /** Dodatkowe nowe elementy dołożone tego dnia („Ucz się dalej”). */
  extraNew: number
  speakingDone: boolean
  audioSeconds: number
}

export interface SessionRow {
  id: 'current'
  dayKey: string
  entries: QueueEntry[]
  index: number
  createdAt: number
  /** Ile razy element wrócił w tej lekcji. */
  repeats: Record<string, number>
  done: boolean
  /** Rodzaj sesji: zwykła lekcja albo ćwiczenie trudnych. */
  kind: 'lesson' | 'hard'
}

export interface Favorite {
  itemId: string
  addedAt: number
}

export interface Trip {
  id?: number
  /** YYYY-MM-DD */
  date: string
  occasion: string
  kind: 'travel' | 'festival'
}

export interface MissionDone {
  /** weekKey + id misji */
  id: string
  missionId: string
  weekKey: string
  doneAt: number
}

export class AppDB extends Dexie {
  cards!: Table<StoredCard, string>
  reviewLogs!: Table<StoredLog, number>
  days!: Table<DayRow, string>
  settings!: Table<Settings, string>
  session!: Table<SessionRow, string>
  customItems!: Table<Item, string>
  favorites!: Table<Favorite, string>
  trips!: Table<Trip, number>
  missions!: Table<MissionDone, string>

  constructor(name = 'speak-by-summer') {
    super(name)
    this.version(1).stores({
      cards: 'itemId, due, state',
      reviewLogs: '++id, itemId, ts, dayKey',
      days: 'dayKey',
      settings: 'id',
      session: 'id',
      customItems: 'id',
      favorites: 'itemId',
      trips: '++id, date',
      missions: 'id, weekKey',
    })
  }
}

export const db = new AppDB()

export const TABLE_NAMES = [
  'cards', 'reviewLogs', 'days', 'settings', 'session', 'customItems', 'favorites', 'trips', 'missions',
] as const
export type TableName = (typeof TABLE_NAMES)[number]
