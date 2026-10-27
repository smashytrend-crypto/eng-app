import type { Item } from '../content/schema'

/** Pomocnik do testów: tworzy element z sensownymi wartościami domyślnymi. */
export function makeItem(partial: Partial<Item> & { id: string }): Item {
  return {
    type: 'phrase',
    stage: 1,
    module: 's1.test',
    order: 1,
    en: 'Nice to meet you.',
    pl: 'Miło cię poznać.',
    alternatives: [],
    usage: 'Przy poznaniu kogoś.',
    register: 'neutral',
    example: [{ en: 'Hi, I\'m Domin. — Nice to meet you.', pl: 'Cześć, jestem Domin. — Miło cię poznać.' }],
    tags: [],
    level: 'A2',
    ...partial,
  }
}
