import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeItem } from '../lib/testItems'
import { Rating, State } from '../lib/srs'
import { backupFileName, exportBackup, importBackup, parseBackup } from './backup'
import { AppDB, type SessionRow } from './db'
import { getDay, getSettings, recordAnswer, saveSettings } from './repo'

let db: AppDB
let n = 0
beforeEach(() => {
  db = new AppDB(`test-${n++}`)
})

const item = makeItem({ id: 's1.test.hello', en: 'Hello!' })
const now = new Date('2026-11-02T18:00:00')

function session(): SessionRow {
  return {
    id: 'current', dayKey: '2026-11-02', index: 0, createdAt: now.getTime(), repeats: {}, done: false, kind: 'lesson',
    entries: [
      { itemId: item.id, kind: 'new', mode: 'recall', exampleIndex: 0 },
      { itemId: 'b', kind: 'review', mode: 'recall', exampleIndex: 0 },
    ],
  }
}

describe('zapis odpowiedzi', () => {
  it('zapisuje kartę, historię, dzień i pozycję lekcji', async () => {
    const res = await recordAnswer({ item, entry: session().entries[0], grade: Rating.Good, now, ms: 5000, session: session() }, db)
    const card = await db.cards.get(item.id)
    expect(card?.state).toBe(State.Learning)
    expect(await db.reviewLogs.count()).toBe(1)
    const day = await getDay('2026-11-02', db)
    expect(day.newItems).toBe(1)
    expect(day.reviews).toBe(0)
    expect(day.seconds).toBe(5)
    // karta wraca za 10 min → wstawiona jeszcze w tej lekcji
    expect(res.session?.index).toBe(1)
    expect(res.session?.entries).toHaveLength(3)
    expect(res.session?.entries[2]).toMatchObject({ itemId: item.id, kind: 'again' })
    expect((await db.session.get('current'))?.index).toBe(1)
  })

  it('czas jednej karty jest przycięty do 2 minut', async () => {
    await recordAnswer({ item, entry: session().entries[0], grade: Rating.Good, now, ms: 3_600_000 }, db)
    expect((await getDay('2026-11-02', db)).seconds).toBe(120)
  })
})

describe('ustawienia', () => {
  it('domyślne wartości i zapis zmian', async () => {
    const s = await getSettings(db)
    expect(s.newPerDay).toBe(8)
    expect(s.maxReviews).toBe(60)
    expect(s.targetDate).toBe('2027-07-01')
    await saveSettings({ newPerDay: 10 }, db)
    expect((await getSettings(db)).newPerDay).toBe(10)
  })
})

describe('kopia zapasowa', () => {
  it('eksport → import odtwarza dane', async () => {
    await saveSettings({ onboarded: true, newPerDay: 12 }, db)
    await recordAnswer({ item, entry: session().entries[0], grade: Rating.Good, now, ms: 4000 }, db)
    await db.trips.add({ date: '2027-07-17', occasion: 'Tomorrowland', kind: 'festival' })
    const backup = await exportBackup(db, now)
    const json = JSON.stringify(backup)

    const other = new AppDB(`test-restore-${n++}`)
    await saveSettings({ newPerDay: 3 }, other)
    const parsed = parseBackup(json)
    const res = await importBackup(parsed, other)
    expect(res.cards).toBe(1)
    expect((await getSettings(other)).newPerDay).toBe(12)
    expect(await other.cards.get(item.id)).toEqual(await db.cards.get(item.id))
    expect(await other.trips.count()).toBe(1)
  })

  it('odrzuca nieprawidłowe pliki', () => {
    expect(() => parseBackup('nie json')).toThrow(/JSON/)
    expect(() => parseBackup({ app: 'inna-aplikacja' })).toThrow(/kopii/)
  })

  it('nazwa pliku z datą', () => {
    expect(backupFileName(now)).toBe('speak-by-summer-kopia-2026-11-02.json')
  })
})
