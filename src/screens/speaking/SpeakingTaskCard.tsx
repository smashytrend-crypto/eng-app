import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Mic } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SpeakButton } from '../../components/SpeakButton'
import { VoiceRecorder } from '../../components/VoiceRecorder'
import { Button, Card, Muted } from '../../components/ui'
import { speakingTasks } from '../../content'
import { getDay, updateDay } from '../../db/repo'
import { currentStage } from '../../lib/stats'
import { pickSpeakingTask } from '../../lib/tasks'
import { useAllItems, useCards, useToday } from '../../state/hooks'

/** Zadanie mówione dnia — każda lekcja kończy się mówieniem na głos. */
export function SpeakingTaskCard() {
  const today = useToday()
  const all = useAllItems()
  const cards = useCards()
  const day = useLiveQuery(() => getDay(today), [today])
  const [showExample, setShowExample] = useState(false)

  const task = useMemo(() => {
    if (!all || !cards) return undefined
    return pickSpeakingTask(speakingTasks, currentStage(all.items, cards), today)
  }, [all, cards, today])

  if (!task || !day) return null

  return (
    <Card className="space-y-4 border-fuchsia-200 dark:border-fuchsia-900">
      <div className="flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-300">
        <Mic size={20} />
        <p className="text-sm font-bold uppercase tracking-wide">Zadanie na głos</p>
      </div>
      <div>
        <p className="text-xl font-bold">{task.title}</p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-300">{task.instruction}</p>
      </div>
      <div className="space-y-2">
        <Muted>Możesz zacząć tak:</Muted>
        {task.starters.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <SpeakButton text={s} slow={false} size="sm" />
            <span className="font-medium">{s}</span>
          </div>
        ))}
      </div>
      {showExample ? (
        <div className="space-y-2 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{task.example}</p>
            <SpeakButton text={task.example} />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowExample(true)} className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          Pokaż przykładową odpowiedź
        </button>
      )}
      <VoiceRecorder />
      {day.speakingDone ? (
        <p className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={20} /> Zrobione dziś — brawo!
        </p>
      ) : (
        <Button variant="secondary" full onClick={() => updateDay(today, (d) => ({ ...d, speakingDone: true }))}>
          <CheckCircle2 size={20} /> Powiedziałem na głos
        </Button>
      )}
    </Card>
  )
}
