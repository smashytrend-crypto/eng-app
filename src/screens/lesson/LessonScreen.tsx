import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ProgressBar, Spinner } from '../../components/ui'
import { db, type SessionRow } from '../../db/db'
import { recordAnswer, skipEntry } from '../../db/repo'
import { dayKey } from '../../lib/dates'
import type { QueueEntry } from '../../lib/lessonQueue'
import type { Grade } from '../../lib/srs'
import { useAllItems, useCards } from '../../state/hooks'
import { finishSession } from '../../state/lesson'
import { navigate } from '../../state/router'
import { ExerciseCard } from './ExerciseCard'
import { LessonDone } from './LessonDone'

export function LessonScreen() {
  const all = useAllItems()
  const cards = useCards()
  const [session, setSession] = useState<SessionRow | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const shownAt = useRef(Date.now())

  useEffect(() => {
    void db.session.get('current').then((s) => {
      if (!s || s.dayKey !== dayKey()) navigate('/', { replace: true })
      else setSession(s)
    })
  }, [])

  useEffect(() => {
    shownAt.current = Date.now()
  }, [session?.index])

  const finished = !!session && (session.done || session.index >= session.entries.length)

  useEffect(() => {
    if (session && finished && !session.done) void finishSession(session)
  }, [session, finished])

  const onRate = useCallback(
    async (entry: QueueEntry, grade: Grade) => {
      if (!session || !all || busy) return
      const item = all.byId.get(entry.itemId)
      if (!item) return
      setBusy(true)
      try {
        const res = await recordAnswer({ item, entry, grade, now: new Date(), ms: Date.now() - shownAt.current, session })
        setSession(res.session ?? null)
      } finally {
        setBusy(false)
      }
    },
    [session, all, busy],
  )

  const entry = session && !finished ? session.entries[session.index] : undefined
  const item = entry && all ? all.byId.get(entry.itemId) : undefined

  // Element usunięty (np. własny zwrot) — pomiń go
  useEffect(() => {
    if (session && entry && all && !item) void skipEntry(session).then(setSession)
  }, [session, entry, all, item])

  if (session === undefined || !all || !cards) return <Spinner />
  if (session === null) return null
  if (finished) return <LessonDone session={session} onRestart={setSession} />
  if (!entry || !item) return <Spinner />

  return (
    <div className="pt-safe mx-auto w-full max-w-md px-4">
      <header className="flex h-16 items-center gap-3">
        <button
          aria-label="Zamknij lekcję (postęp jest zapisany)"
          onClick={() => navigate('/')}
          className="-ml-2 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X size={26} />
        </button>
        <ProgressBar value={session.index / session.entries.length} className="h-3" />
        <span className="min-w-14 text-right text-sm font-semibold tabular-nums text-zinc-500">
          {session.index + 1}/{session.entries.length}
        </span>
      </header>
      <ExerciseCard
        key={`${session.index}-${entry.itemId}`}
        entry={entry}
        item={item}
        card={cards.get(item.id)}
        onRate={(g) => onRate(entry, g)}
        busy={busy}
      />
    </div>
  )
}
