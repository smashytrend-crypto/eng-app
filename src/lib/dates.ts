/**
 * „Dzień nauki” zaczyna się o 4:00 czasu lokalnego — nocna sesja (np. po imprezie)
 * liczy się jeszcze do poprzedniego dnia.
 */
export const DAY_START_HOUR = 4
const DAY_MS = 24 * 60 * 60 * 1000

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Data kalendarzowa (lokalna) w formacie YYYY-MM-DD. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Klucz dnia nauki (YYYY-MM-DD) dla danej chwili. */
export function dayKey(now: Date = new Date()): string {
  const shifted = new Date(now.getTime())
  shifted.setHours(shifted.getHours() - DAY_START_HOUR)
  return localDateKey(shifted)
}

/** Data lokalna o północy dla klucza YYYY-MM-DD. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Początek dnia nauki (4:00) dla danego klucza. */
export function dayStart(key: string): Date {
  const d = keyToDate(key)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  return d
}

/** Koniec bieżącego dnia nauki (następne 4:00). */
export function dayEnd(now: Date = new Date()): Date {
  const end = dayStart(dayKey(now))
  end.setDate(end.getDate() + 1)
  return end
}

export function addDays(key: string, n: number): string {
  const d = keyToDate(key)
  d.setDate(d.getDate() + n)
  return localDateKey(d)
}

/** Liczba dni od a do b (b − a), odporna na zmianę czasu letniego. */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS)
}

/** 0 = poniedziałek … 6 = niedziela */
export function weekdayIndex(key: string): number {
  return (keyToDate(key).getDay() + 6) % 7
}

export function isWeekend(key: string): boolean {
  return weekdayIndex(key) >= 5
}

/** Poniedziałek tygodnia, w którym jest dany dzień — klucz tygodnia. */
export function weekKey(key: string): string {
  return addDays(key, -weekdayIndex(key))
}

/**
 * Seria dni nauki. Zasada: jeden dzień przerwy w ciągu 7 dni nie zrywa serii.
 * Jeśli dziś jeszcze nie było nauki, seria liczy się od wczoraj (dzień jeszcze trwa).
 * Zwraca liczbę dni z nauką w aktualnej serii.
 */
export function computeStreak(activeDays: Iterable<string>, today: string): number {
  const active = new Set(activeDays)
  if (active.size === 0) return 0
  const first = [...active].sort()[0]
  let d = active.has(today) ? today : addDays(today, -1)
  let count = 0
  let lastGap: string | null = null
  while (d >= first) {
    if (active.has(d)) {
      count++
    } else {
      if (lastGap && diffDays(d, lastGap) < 7) break
      lastGap = d
    }
    d = addDays(d, -1)
  }
  return count
}

const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia',
  'września', 'października', 'listopada', 'grudnia']
const WEEKDAYS = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela']

/** „1 lipca 2027” */
export function formatDatePl(key: string, withYear = true): string {
  const d = keyToDate(key)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`
}

export function weekdayPl(key: string): string {
  return WEEKDAYS[weekdayIndex(key)]
}

/** Polska odmiana: 1 dzień, 2 dni, 5 dni; 1 element, 2 elementy, 5 elementów itd. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  if (abs === 1) return one
  const lastTwo = abs % 100
  const last = abs % 10
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few
  return many
}

export function pluralN(n: number, one: string, few: string, many: string): string {
  return `${n} ${plural(n, one, few, many)}`
}
