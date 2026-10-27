import { describe, expect, it } from 'vitest'
import { addDays, computeStreak, dayEnd, dayKey, diffDays, formatDatePl, isWeekend, plural, weekKey } from './dates'

describe('dzień nauki', () => {
  it('zaczyna się o 4:00', () => {
    expect(dayKey(new Date(2026, 9, 27, 3, 59))).toBe('2026-10-26')
    expect(dayKey(new Date(2026, 9, 27, 4, 0))).toBe('2026-10-27')
    expect(dayKey(new Date(2026, 9, 27, 23, 30))).toBe('2026-10-27')
  })

  it('koniec dnia nauki to następne 4:00', () => {
    expect(dayEnd(new Date(2026, 9, 27, 12, 0)).getTime()).toBe(new Date(2026, 9, 28, 4, 0).getTime())
    expect(dayEnd(new Date(2026, 9, 28, 2, 0)).getTime()).toBe(new Date(2026, 9, 28, 4, 0).getTime())
  })

  it('dodawanie i różnica dni (także przez zmianę czasu)', () => {
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(diffDays('2026-10-27', '2027-07-01')).toBe(247)
    expect(diffDays('2027-03-27', '2027-03-29')).toBe(2)
  })

  it('weekend i tydzień', () => {
    expect(isWeekend('2026-10-31')).toBe(true) // sobota
    expect(isWeekend('2026-10-27')).toBe(false)
    expect(weekKey('2026-11-01')).toBe('2026-10-26') // niedziela → poniedziałek
  })
})

describe('seria', () => {
  const days = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i))

  it('liczy kolejne dni', () => {
    expect(computeStreak(days('2026-10-20', 8), '2026-10-27')).toBe(8)
  })

  it('dzisiejszy dzień jeszcze trwa — seria od wczoraj', () => {
    expect(computeStreak(days('2026-10-20', 7), '2026-10-27')).toBe(7)
  })

  it('jeden dzień przerwy w tygodniu nie zrywa serii', () => {
    const active = [...days('2026-10-15', 5), ...days('2026-10-21', 7)] // przerwa 20.10
    expect(computeStreak(active, '2026-10-27')).toBe(12)
  })

  it('dwa dni przerwy w ciągu 7 dni zrywają serię', () => {
    const active = [...days('2026-10-15', 3), ...days('2026-10-19', 2), ...days('2026-10-22', 6)]
    // przerwy: 18.10 i 21.10 (3 dni od siebie) → seria obejmuje 19.10–27.10 bez 21.10
    expect(computeStreak(active, '2026-10-27')).toBe(8)
  })

  it('przerwy oddalone o tydzień są OK', () => {
    const active = [...days('2026-10-10', 3), ...days('2026-10-14', 7), ...days('2026-10-22', 6)]
    // przerwy: 13.10 i 21.10 (8 dni od siebie)
    expect(computeStreak(active, '2026-10-27')).toBe(16)
  })

  it('brak nauki od dawna = 0', () => {
    expect(computeStreak(days('2026-10-01', 5), '2026-10-27')).toBe(0)
    expect(computeStreak([], '2026-10-27')).toBe(0)
  })
})

describe('polski', () => {
  it('odmiana liczebników', () => {
    expect(plural(1, 'dzień', 'dni', 'dni')).toBe('dzień')
    expect(plural(3, 'element', 'elementy', 'elementów')).toBe('elementy')
    expect(plural(12, 'element', 'elementy', 'elementów')).toBe('elementów')
    expect(plural(22, 'element', 'elementy', 'elementów')).toBe('elementy')
    expect(plural(25, 'element', 'elementy', 'elementów')).toBe('elementów')
  })
  it('format daty', () => {
    expect(formatDatePl('2027-07-01')).toBe('1 lipca 2027')
  })
})
