import { describe, expect, it } from 'vitest'
import { answerPauseMs, buildPlaylist, trackFor } from './audioPlaylist'
import { newCard, Rating, reviewCard } from './srs'
import { makeItem } from './testItems'

const now = new Date('2026-11-02T18:00:00').getTime()

describe('tryb audio', () => {
  const a = makeItem({ id: 's1.t.a', en: 'See you later!', pl: 'Na razie! / Do zobaczenia!' })
  const p = makeItem({
    id: 's1.t.p', type: 'pattern', en: 'I usually ___.', pl: 'Zwykle ___.',
    example: [{ en: 'I usually train.', pl: 'Zwykle trenuję.' }, { en: 'I usually chill.', pl: 'Zwykle odpoczywam.' }],
  })
  it('ścieżka: PL (pierwszy wariant) → EN; wzorzec → przykład', () => {
    expect(trackFor(a)).toMatchObject({ pl: 'Na razie!', en: 'See you later!' })
    expect(trackFor(p, 1)).toMatchObject({ pl: 'Zwykle odpoczywam.', en: 'I usually chill.' })
  })
  it('pauza rośnie z długością zdania', () => {
    expect(answerPauseMs('Hi!', 1)).toBeLessThan(answerPauseMs('Could you speak a bit slower, please?', 1))
    expect(answerPauseMs('Hi!', 2)).toBe(answerPauseMs('Hi!', 1) * 2)
  })
  it('playlista z ostatnio poznanych', () => {
    const items = new Map([[a.id, a], [p.id, p]])
    const cards = new Map([[a.id, reviewCard(newCard(a.id, new Date(now - 3600e3)), Rating.Good, new Date(now - 3600e3), [])]])
    const list = buildPlaylist('recent', { items, cards, favorites: new Set(), hard: [], now })
    expect(list.map((t) => t.itemId)).toEqual([a.id])
    expect(buildPlaylist('favorites', { items, cards, favorites: new Set([p.id]), hard: [], now })).toHaveLength(1)
  })
})
