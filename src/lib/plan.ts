import { addDays, diffDays } from './dates'

/** Zakładamy 6 dni nauki w tygodniu (jeden dzień przerwy nie psuje planu ani serii). */
export const STUDY_DAYS_PER_WEEK = 6
/** Ostatnie 2 tygodnie przed celem: tylko powtórki i próba generalna, bez nowego materiału. */
export const REVIEW_BUFFER_DAYS = 14

export type PlanStatus = 'done' | 'ahead' | 'onTrack' | 'behind' | 'late'

export interface PlanInput {
  today: string
  startDate: string
  targetDate: string
  totalItems: number
  introduced: number
  newPerDay: number
}

export interface PlanResult {
  daysLeft: number
  weeksLeft: number
  itemsLeft: number
  /** Ile nowych dziennie (w dni nauki), żeby poznać wszystko przed ostatnimi 2 tygodniami. */
  requiredPerDay: number
  /** Kiedy skończysz cały program przy obecnym ustawieniu. */
  projectedFinish: string | null
  /** Ile elementów powinno być poznanych dziś wg planu liniowego. */
  expectedByNow: number
  /** Różnica: + przed planem, − za planem. */
  delta: number
  status: PlanStatus
}

function studyDays(calendarDays: number): number {
  return (Math.max(0, calendarDays) * STUDY_DAYS_PER_WEEK) / 7
}

export function computePlan(p: PlanInput): PlanResult {
  const daysLeft = diffDays(p.today, p.targetDate)
  const itemsLeft = Math.max(0, p.totalItems - p.introduced)
  const learningDaysLeft = studyDays(daysLeft - REVIEW_BUFFER_DAYS)
  const requiredPerDay = itemsLeft === 0 ? 0 : Math.ceil(itemsLeft / Math.max(1, learningDaysLeft))
  const projectedFinish =
    itemsLeft === 0 ? p.today : p.newPerDay > 0 ? addDays(p.today, Math.ceil((itemsLeft / p.newPerDay) * (7 / STUDY_DAYS_PER_WEEK))) : null

  const span = Math.max(1, diffDays(p.startDate, p.targetDate) - REVIEW_BUFFER_DAYS)
  const elapsed = Math.min(span, Math.max(0, diffDays(p.startDate, p.today)))
  const expectedByNow = Math.round((p.totalItems * elapsed) / span)
  const delta = p.introduced - expectedByNow

  let status: PlanStatus
  if (itemsLeft === 0) status = 'done'
  else if (daysLeft <= 0) status = 'late'
  else if (delta >= p.newPerDay) status = 'ahead'
  else if (delta >= -2 * Math.max(1, p.newPerDay)) status = 'onTrack'
  else status = 'behind'

  return { daysLeft, weeksLeft: Math.max(0, Math.round(daysLeft / 7)), itemsLeft, requiredPerDay, projectedFinish, expectedByNow, delta, status }
}

/** Krótki, spokojny komentarz do planu (bez straszenia). */
export function planMessage(r: PlanResult, newPerDay: number): string {
  switch (r.status) {
    case 'done':
      return 'Cały program poznany! Teraz powtórki, rozmowy z Claude i próba generalna.'
    case 'late':
      return 'Data docelowa minęła — ustaw nową w ustawieniach i ucz się dalej swoim tempem.'
    case 'ahead':
      return `Jesteś ok. ${r.delta} elementów przed planem. Spokojnie utrzymuj obecne tempo.`
    case 'onTrack':
      return r.requiredPerDay <= newPerDay
        ? 'Idziesz zgodnie z planem. Obecne tempo wystarczy, żeby zdążyć.'
        : `Idziesz prawie zgodnie z planem. Żeby poznać wszystko, wystarczy ok. ${r.requiredPerDay} nowych dziennie.`
    case 'behind':
      return `Do planu brakuje ok. ${-r.delta} elementów. Wystarczy ok. ${r.requiredPerDay} nowych dziennie zamiast ${newPerDay} — albo po prostu ucz się dalej, a plan sam się dopasuje.`
  }
}

export interface TripPlan {
  daysToTrip: number
  priorityLeft: number
  /** Ile elementów podróżnych/festiwalowych dziennie, żeby zdążyć przed wyjazdem. */
  perDay: number
}

export function tripPlan(today: string, tripDate: string, priorityLeft: number): TripPlan {
  const daysToTrip = diffDays(today, tripDate)
  const perDay = priorityLeft === 0 ? 0 : Math.ceil(priorityLeft / Math.max(1, studyDays(daysToTrip)))
  return { daysToTrip, priorityLeft, perDay }
}

/** Zakresy dat etapów rozłożone proporcjonalnie do ich długości (tygodnie) między startem a celem. */
export function stageSchedule(
  stages: Array<{ id: number; weeks: number }>,
  startDate: string,
  targetDate: string,
): Array<{ id: number; from: string; to: string }> {
  const totalWeeks = stages.reduce((s, x) => s + x.weeks, 0)
  const span = Math.max(stages.length, diffDays(startDate, targetDate))
  let cursor = 0
  return stages.map((s) => {
    const len = Math.round((s.weeks / totalWeeks) * span)
    const from = addDays(startDate, cursor)
    cursor += len
    return { id: s.id, from, to: addDays(startDate, Math.max(cursor - 1, 0)) }
  })
}
