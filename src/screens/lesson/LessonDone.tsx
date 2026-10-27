import { useLiveQuery } from 'dexie-react-hooks'
import { Home, PartyPopper, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Muted } from '../../components/ui'
import type { SessionRow } from '../../db/db'
import { getDay, updateDay } from '../../db/repo'
import { pluralN } from '../../lib/dates'
import { useToday } from '../../state/hooks'
import { startLesson } from '../../state/lesson'
import { navigate } from '../../state/router'
import { SpeakingTaskCard } from '../speaking/SpeakingTaskCard'

export function LessonDone({ session, onRestart }: { session: SessionRow; onRestart: (s: SessionRow) => void }) {
  const today = useToday()
  const day = useLiveQuery(() => getDay(today), [today])
  const [loading, setLoading] = useState(false)
  const answered = session.entries.length
  const newCount = session.entries.filter((e) => e.kind === 'new').length
  const minutes = day ? Math.max(1, Math.round(day.seconds / 60)) : 0

  const more = async () => {
    setLoading(true)
    await updateDay(today, (d) => ({ ...d, extraNew: d.extraNew + 5 }))
    const s = await startLesson()
    setLoading(false)
    if (s) onRestart(s)
    else navigate('/')
  }

  return (
    <div className="pt-safe mx-auto w-full max-w-md space-y-5 px-4 pb-10">
      <div className="pt-8 text-center">
        <PartyPopper size={56} className="mx-auto text-fuchsia-500" />
        <h1 className="mt-3 text-3xl font-bold">{session.kind === 'hard' ? 'Trudne przećwiczone!' : 'Lekcja zrobiona!'}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          {pluralN(answered, 'karta', 'karty', 'kart')}
          {newCount > 0 && <> · {pluralN(newCount, 'nowy element', 'nowe elementy', 'nowych elementów')}</>}
          {minutes > 0 && <> · dziś {minutes} min nauki</>}
        </p>
      </div>

      <SpeakingTaskCard />

      <Card className="space-y-3">
        <p className="font-semibold">Masz jeszcze chwilę?</p>
        <Muted>Dołóż 5 nowych elementów. Najlepiej działa jednak regularność — codziennie po trochu.</Muted>
        <Button variant="secondary" full onClick={more} disabled={loading}>
          <Plus size={20} /> Ucz się dalej (+5 nowych)
        </Button>
      </Card>

      <Button full onClick={() => navigate('/')}>
        <Home size={20} /> Wróć na start
      </Button>
    </div>
  )
}
