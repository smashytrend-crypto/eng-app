import { describe, expect, it } from 'vitest'
import { clozeData, firstLettersHint, recallPrompt, scrambleTokens } from './exercises'
import {
  ALL_MODES,
  buildLesson,
  chooseMode,
  interleave,
  newBudget,
  orderNewItems,
  requeueIndex,
  type ModeOptions,
} from './lessonQueue'
import { newCard, Rating, reviewCard, State, type StoredCard } from './srs'
import { makeItem } from './testItems'

const now = new Date('2026-11-02T18:00:00')
const DAY = 86_400_000
const modes: ModeOptions = { enabled: ALL_MODES, typing: 'sometimes' }
const fixedRng = () => 0.42

function items(n: number, module = 's1.test') {
  return Array.from({ length: n }, (_, i) => makeItem({ id: `s1.test.i${i}`, order: i + 1, module }))
}

function reviewDue(itemId: string, dueOffsetMs: number): StoredCard {
  let c = newCard(itemId, new Date(now.getTime() - 30 * DAY))
  c = reviewCard(c, Rating.Easy, new Date(now.getTime() - 30 * DAY), [])
  return { ...c, due: now.getTime() + dueOffsetMs, state: State.Review }
}

describe('buildLesson', () => {
  it('pierwszy dzień: tylko nowe elementy, domyślnie 8', () => {
    const plan = buildLesson({
      now, items: items(20), cards: new Map(), newPerDay: 8, maxReviews: 60,
      doneToday: { reviews: 0, newItems: 0 }, modes, rng: fixedRng,
    })
    expect(plan.newCount).toBe(8)
    expect(plan.reviewCount).toBe(0)
    expect(plan.entries.map((e) => e.itemId)).toEqual(items(8).map((i) => i.id))
    expect(plan.entries.every((e) => e.kind === 'new')).toBe(true)
  })

  it('limit powtórek: max 60, reszta przechodzi na kolejne dni', () => {
    const all = items(100)
    const cards = new Map(all.map((i, idx) => [i.id, reviewDue(i.id, -idx * 1000)]))
    const plan = buildLesson({
      now, items: all, cards, newPerDay: 8, maxReviews: 60,
      doneToday: { reviews: 0, newItems: 0 }, modes, rng: fixedRng,
    })
    expect(plan.dueTotal).toBe(100)
    expect(plan.reviewCount).toBe(60)
    // najbardziej zaległe najpierw
    expect(plan.entries[0].itemId).toBe('s1.test.i99')
  })

  it('duże zaległości zmniejszają liczbę nowych', () => {
    expect(newBudget(8, 60, 30, 0)).toBe(8)
    expect(newBudget(8, 60, 70, 0)).toBe(4)
    expect(newBudget(8, 60, 130, 0)).toBe(0)
    expect(newBudget(8, 60, 0, 5)).toBe(3)
    expect(newBudget(8, 60, 0, 8, 5)).toBe(5)
  })

  it('uwzględnia to, co już zrobiono dziś', () => {
    const all = items(30)
    const cards = new Map(all.slice(0, 10).map((i) => [i.id, reviewDue(i.id, -1000)]))
    const plan = buildLesson({
      now, items: all, cards, newPerDay: 8, maxReviews: 5,
      doneToday: { reviews: 2, newItems: 6 }, modes, rng: fixedRng,
    })
    expect(plan.reviewCount).toBe(3)
    expect(plan.newCount).toBe(0) // zaległości 10 > 5 → połowa (4), a 6 już zrobione
  })

  it('karta zaplanowana na później dziś (przed 4:00) też jest do powtórki', () => {
    const all = items(2)
    const cards = new Map([[all[0].id, reviewDue(all[0].id, 3 * 3600_000)]])
    const plan = buildLesson({
      now, items: all, cards, newPerDay: 0, maxReviews: 60,
      doneToday: { reviews: 0, newItems: 0 }, modes, rng: fixedRng,
    })
    expect(plan.reviewCount).toBe(1)
  })
})

describe('orderNewItems', () => {
  it('własne zwroty idą pierwsze', () => {
    const all = [...items(3), makeItem({ id: 'u.custom.a', custom: true, stage: 0, module: 'custom' })]
    expect(orderNewItems(all, new Map(), undefined, 2).map((i) => i.id)).toEqual(['u.custom.a', 's1.test.i0'])
  })

  it('przed wyjazdem moduły podróżne mają pierwszeństwo (ok. 2/3)', () => {
    const normal = items(10, 's1.basics')
    const travel = Array.from({ length: 10 }, (_, i) => makeItem({ id: `s4.airport.i${i}`, module: 's4.airport' }))
    const out = orderNewItems([...normal, ...travel], new Map(), new Set(['s4.airport']), 6)
    expect(out.filter((i) => i.module === 's4.airport')).toHaveLength(4)
    expect(out.filter((i) => i.module === 's1.basics')).toHaveLength(2)
  })
})

describe('interleave', () => {
  it('rozkłada nowe równo między powtórkami', () => {
    expect(interleave(['r1', 'r2', 'r3', 'r4'], ['n1', 'n2'])).toEqual(['r1', 'r2', 'n1', 'r3', 'r4', 'n2'])
    expect(interleave([], ['n1'])).toEqual(['n1'])
    expect(interleave(['r1'], [])).toEqual(['r1'])
  })
})

describe('requeueIndex', () => {
  it('karta z krokiem 1 min wraca po 3 kartach, z 10 min po 6', () => {
    expect(requeueIndex(20, 5, 60_000)).toBe(9)
    expect(requeueIndex(20, 5, 600_000)).toBe(12)
    expect(requeueIndex(8, 5, 600_000)).toBe(8)
    expect(requeueIndex(20, 5, DAY)).toBeNull()
  })
})

describe('chooseMode', () => {
  const item = makeItem({ id: 's1.test.x', en: 'Could you say that again, please?' })
  it('nowe i uczone elementy: przypominanie', () => {
    expect(chooseMode(item, undefined, modes, fixedRng)).toBe('recall')
  })
  it('dialog zawsze jako odgrywanie ról', () => {
    const d = makeItem({ id: 's1.test.d', type: 'dialog' })
    expect(chooseMode(d, reviewDue(d.id, 0), modes, fixedRng)).toBe('dialog')
  })
  it('wyłączone tryby nie są wybierane', () => {
    const only: ModeOptions = { enabled: new Set(['recall', 'type']), typing: 'sometimes' }
    for (let i = 0; i < 20; i++) {
      expect(['recall', 'type']).toContain(chooseMode(item, reviewDue(item.id, 0), only, Math.random))
    }
  })
  it('„rzadko wpisuję” ogranicza ćwiczenia z klawiaturą', () => {
    const rarely: ModeOptions = { enabled: ALL_MODES, typing: 'rarely' }
    let keyboard = 0
    let seed = 1
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 400; i++) {
      const m = chooseMode(item, reviewDue(item.id, 0), rarely, rng)
      if (m === 'type' || m === 'cloze' || m === 'dictation') keyboard++
    }
    expect(keyboard).toBeLessThan(80)
  })
})

describe('exercises', () => {
  it('wzorzec: zadanie z przykładu', () => {
    const p = makeItem({
      id: 's1.test.p', type: 'pattern', en: 'I usually ___ after work.', pl: 'Zwykle ___ po pracy.',
      example: [
        { en: 'I usually go to the gym after work.', pl: 'Zwykle chodzę na siłownię po pracy.' },
        { en: 'I usually play games after work.', pl: 'Zwykle gram w gry po pracy.' },
      ],
    })
    expect(recallPrompt(p, 1).answers[0]).toBe('I usually play games after work.')
    const c = clozeData(p, 0)!
    expect(c.sentence).toBe('I usually ___ after work.')
    expect(c.answer).toBe('go to the gym')
  })

  it('słówko: luka w przykładzie', () => {
    const w = makeItem({
      id: 's1.test.w', type: 'word', en: 'gym', pl: 'siłownia', collocations: ['go to the gym', 'hit the gym'],
      example: [{ en: 'I go to the gym four times a week.', pl: 'Chodzę na siłownię cztery razy w tygodniu.' }],
    })
    expect(clozeData(w)).toMatchObject({ sentence: 'I go to the ___ four times a week.', answer: 'gym' })
  })

  it('zwrot: luka w najdłuższym słowie treściowym', () => {
    const c = clozeData(makeItem({ id: 's1.test.c', en: 'Sorry, could you say that again?' }))!
    expect(c.answer).toBe('Sorry')
    expect(c.sentence).toBe('___, could you say that again?')
  })

  it('rozsypanka zawiera te same słowa w innej kolejności', () => {
    const t = scrambleTokens('I usually go to the gym after work.', Math.random)
    expect([...t].sort()).toEqual(['I', 'after', 'go', 'gym', 'the', 'to', 'usually', 'work'].sort())
    expect(t.join(' ')).not.toBe('I usually go to the gym after work')
  })

  it('podpowiedź z pierwszych liter', () => {
    expect(firstLettersHint("I'm going to the gym.")).toBe("I'_ g____ t_ t__ g__.")
  })
})
