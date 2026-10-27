import { describe, expect, it } from 'vitest'
import { computePlan, planMessage, stageSchedule, tripPlan } from './plan'

const base = { startDate: '2026-10-27', targetDate: '2027-07-01', totalItems: 1500, newPerDay: 8 }

describe('plan do wakacji', () => {
  it('na starcie: liczy potrzebne tempo', () => {
    const r = computePlan({ ...base, today: '2026-10-27', introduced: 0 })
    expect(r.daysLeft).toBe(247)
    expect(r.itemsLeft).toBe(1500)
    // (247 − 14) dni × 6/7 ≈ 199,7 dni nauki → 1500 / 199,7 ≈ 7,5 → 8 dziennie
    expect(r.requiredPerDay).toBe(8)
    expect(r.status).toBe('onTrack')
  })

  it('przed planem', () => {
    const r = computePlan({ ...base, today: '2026-12-01', introduced: 400 })
    expect(r.expectedByNow).toBe(225)
    expect(r.status).toBe('ahead')
    expect(planMessage(r, 8)).toContain('przed planem')
  })

  it('za planem — podpowiada tempo bez straszenia', () => {
    const r = computePlan({ ...base, today: '2027-02-01', introduced: 300 })
    expect(r.status).toBe('behind')
    expect(r.requiredPerDay).toBeGreaterThan(8)
    expect(planMessage(r, 8)).toContain('nowych dziennie')
  })

  it('prognoza ukończenia', () => {
    const r = computePlan({ ...base, today: '2026-10-27', introduced: 1452 })
    // 48 elementów / 8 dziennie = 6 dni nauki ≈ 7 dni kalendarzowych
    expect(r.projectedFinish).toBe('2026-11-03')
  })

  it('wszystko poznane', () => {
    expect(computePlan({ ...base, today: '2027-05-01', introduced: 1500 }).status).toBe('done')
  })

  it('po terminie', () => {
    expect(computePlan({ ...base, today: '2027-07-10', introduced: 1000 }).status).toBe('late')
  })
})

describe('wyjazd', () => {
  it('ile dziennie z modułów podróżnych', () => {
    const t = tripPlan('2027-05-01', '2027-05-29', 120)
    expect(t.daysToTrip).toBe(28)
    expect(t.perDay).toBe(5) // 28 dni × 6/7 = 24 dni nauki → 120/24 = 5
  })
})

describe('harmonogram etapów', () => {
  it('rozkłada etapy proporcjonalnie', () => {
    const s = stageSchedule([{ id: 1, weeks: 1 }, { id: 2, weeks: 3 }], '2027-01-01', '2027-01-29')
    expect(s[0]).toEqual({ id: 1, from: '2027-01-01', to: '2027-01-07' })
    expect(s[1].from).toBe('2027-01-08')
  })
})
