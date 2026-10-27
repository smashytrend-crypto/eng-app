import { describe, expect, it } from 'vitest'
import {
  formatInterval,
  isMastered,
  markKnown,
  newCard,
  previewIntervals,
  Rating,
  reviewCard,
  State,
  type StoredCard,
} from './srs'

const MIN = 60_000
const DAY = 24 * 60 * MIN
const t0 = new Date('2026-11-02T18:00:00')

function after(ms: number) {
  return new Date(t0.getTime() + ms)
}

describe('harmonogram FSRS', () => {
  it('nowa karta: „Dobrze” → krok nauki 10 min, potem dni', () => {
    let c = newCard('x', t0)
    expect(c.state).toBe(State.New)
    c = reviewCard(c, Rating.Good, t0, [])
    expect(c.state).toBe(State.Learning)
    expect(c.due - t0.getTime()).toBe(10 * MIN)
    c = reviewCard(c, Rating.Good, after(10 * MIN), [])
    expect(c.state).toBe(State.Review)
    expect(c.scheduled_days).toBeGreaterThanOrEqual(1)
  })

  it('„Nie pamiętam” wraca po minucie', () => {
    const c = reviewCard(newCard('x', t0), Rating.Again, t0, [])
    expect(c.due - t0.getTime()).toBe(1 * MIN)
  })

  it('interwały rosną przy kolejnych poprawnych odpowiedziach', () => {
    let c = newCard('x', t0)
    let now = t0
    const intervals: number[] = []
    for (let i = 0; i < 6; i++) {
      c = reviewCard(c, Rating.Good, now, [])
      intervals.push(c.due - now.getTime())
      now = new Date(c.due)
    }
    for (let i = 2; i < intervals.length; i++) expect(intervals[i]).toBeGreaterThan(intervals[i - 1])
  })

  it('pomyłka w powtórce zwiększa licznik i przechodzi w ponowną naukę', () => {
    let c = newCard('x', t0)
    c = reviewCard(c, Rating.Good, t0, [])
    c = reviewCard(c, Rating.Good, after(10 * MIN), [])
    const due = new Date(c.due)
    c = reviewCard(c, Rating.Again, due, [])
    expect(c.lapses).toBe(1)
    expect(c.state).toBe(State.Relearning)
  })

  it('gramatyka priorytetowa wraca częściej', () => {
    const run = (tags: string[]) => {
      let c: StoredCard = newCard('x', t0)
      let now = t0
      for (let i = 0; i < 5; i++) {
        c = reviewCard(c, Rating.Good, now, tags)
        now = new Date(c.due)
      }
      return c
    }
    // porównujemy bez losowego rozrzutu: stabilność jest ta sama, interwał krótszy przy wyższej retencji
    const normal = run([])
    const focus = run(['gr:present-simple'])
    expect(focus.scheduled_days).toBeLessThan(normal.scheduled_days)
  })

  it('podgląd interwałów: Nie pamiętam < Trudne < Dobrze < Łatwe', () => {
    let c = reviewCard(newCard('x', t0), Rating.Good, t0, [])
    c = reviewCard(c, Rating.Good, after(10 * MIN), [])
    const p = previewIntervals(c, new Date(c.due), [])
    expect(p[Rating.Again]).toBeLessThan(p[Rating.Hard])
    expect(p[Rating.Hard]).toBeLessThan(p[Rating.Good])
    expect(p[Rating.Good]).toBeLessThan(p[Rating.Easy])
  })

  it('„znam to” planuje sprawdzenie za kilka dni', () => {
    const c = markKnown('x', t0, [])
    expect(c.state).toBe(State.Review)
    expect(c.due - t0.getTime()).toBeGreaterThanOrEqual(2 * DAY)
  })

  it('opanowany = interwał ≥ 21 dni', () => {
    const c = newCard('x', t0)
    expect(isMastered(c)).toBe(false)
    expect(isMastered({ ...c, state: State.Review, scheduled_days: 21 })).toBe(true)
    expect(isMastered({ ...c, state: State.Review, scheduled_days: 20 })).toBe(false)
  })
})

describe('formatInterval', () => {
  it('po polsku', () => {
    expect(formatInterval(30_000)).toBe('1 min')
    expect(formatInterval(10 * MIN)).toBe('10 min')
    expect(formatInterval(3 * 60 * MIN)).toBe('3 godz.')
    expect(formatInterval(DAY)).toBe('1 dzień')
    expect(formatInterval(4 * DAY)).toBe('4 dni')
    expect(formatInterval(60 * DAY)).toBe('2 mies.')
  })
})
