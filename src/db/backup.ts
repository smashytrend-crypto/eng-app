import { z } from 'zod'
import { localDateKey } from '../lib/dates'
import { db as defaultDb, TABLE_NAMES, type AppDB, type TableName } from './db'

export const BACKUP_APP = 'speak-by-summer'
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof BACKUP_APP
  schemaVersion: number
  exportedAt: string
  tables: Record<TableName, unknown[]>
}

const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  tables: z.object({
    cards: z.array(z.object({ itemId: z.string(), due: z.number(), state: z.number() }).passthrough()),
    reviewLogs: z.array(z.object({ itemId: z.string(), ts: z.number() }).passthrough()),
    days: z.array(z.object({ dayKey: z.string() }).passthrough()),
    settings: z.array(z.object({ id: z.literal('main') }).passthrough()),
    session: z.array(z.object({ id: z.literal('current') }).passthrough()).optional(),
    customItems: z.array(z.object({ id: z.string() }).passthrough()).optional(),
    favorites: z.array(z.object({ itemId: z.string() }).passthrough()).optional(),
    trips: z.array(z.object({ date: z.string() }).passthrough()).optional(),
    missions: z.array(z.object({ id: z.string() }).passthrough()).optional(),
  }),
})

export async function exportBackup(db: AppDB = defaultDb, now = new Date()): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>
  for (const name of TABLE_NAMES) tables[name] = await db.table(name).toArray()
  return { app: BACKUP_APP, schemaVersion: BACKUP_VERSION, exportedAt: now.toISOString(), tables }
}

export function backupFileName(now = new Date()): string {
  return `speak-by-summer-kopia-${localDateKey(now)}.json`
}

/** Sprawdza plik kopii. Rzuca błąd z polskim komunikatem, jeśli plik jest nieprawidłowy. */
export function parseBackup(raw: unknown): Backup {
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      throw new Error('To nie jest plik kopii (nieprawidłowy JSON).')
    }
  }
  const parsed = backupSchema.safeParse(data)
  if (!parsed.success) throw new Error('To nie jest plik kopii Speak by Summer albo plik jest uszkodzony.')
  if (parsed.data.schemaVersion > BACKUP_VERSION) {
    throw new Error('Ta kopia pochodzi z nowszej wersji aplikacji. Zaktualizuj aplikację i spróbuj ponownie.')
  }
  const tables = {} as Record<TableName, unknown[]>
  for (const name of TABLE_NAMES) tables[name] = (parsed.data.tables as Record<string, unknown[] | undefined>)[name] ?? []
  return { ...(parsed.data as Omit<Backup, 'tables'>), tables }
}

/** Zastępuje wszystkie dane danymi z kopii (w jednej transakcji). */
export async function importBackup(backup: Backup, db: AppDB = defaultDb): Promise<{ cards: number; days: number }> {
  const tables = TABLE_NAMES.map((n) => db.table(n))
  await db.transaction('rw', tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name)
      await table.clear()
      const rows = backup.tables[name]
      if (rows.length) await table.bulkPut(rows)
    }
  })
  return { cards: backup.tables.cards.length, days: backup.tables.days.length }
}

/** Usuwa wszystkie dane (reset aplikacji). */
export async function clearAll(db: AppDB = defaultDb): Promise<void> {
  const tables = TABLE_NAMES.map((n) => db.table(n))
  await db.transaction('rw', tables, async () => {
    for (const t of tables) await t.clear()
  })
}
