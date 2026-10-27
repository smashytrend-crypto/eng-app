import type { Mission, SpeakingTask } from '../content/schema'
import { hashString } from './stats'

/**
 * Zadanie mówione dnia: z bieżącego etapu (lub wcześniejszych), stałe przez cały dzień.
 * Najpierw zadania z obecnego etapu, potem z poprzedniego — powtarzanie się opłaca.
 */
export function pickSpeakingTask(tasks: SpeakingTask[], stage: number, day: string): SpeakingTask | undefined {
  const pool = tasks.filter((t) => t.stage === stage || t.stage === stage - 1)
  const fallback = tasks.filter((t) => t.stage <= stage)
  const list = pool.length ? pool : fallback.length ? fallback : tasks
  if (!list.length) return undefined
  return list[hashString(day) % list.length]
}

/** Misja weekendowa: z bieżącego lub wcześniejszych etapów; najpierw te jeszcze niezrobione. */
export function pickMission(missions: Mission[], stage: number, week: string, doneIds: ReadonlySet<string>): Mission | undefined {
  const available = missions.filter((m) => m.stage <= stage)
  const list = available.length ? available : missions.filter((m) => m.stage === Math.min(...missions.map((x) => x.stage)))
  if (!list.length) return undefined
  const fresh = list.filter((m) => !doneIds.has(m.id))
  const pool = fresh.length ? fresh : list
  // preferuj misje z bieżącego etapu
  const current = pool.filter((m) => m.stage === stage)
  const final = current.length ? current : pool
  return final[hashString(week) % final.length]
}
