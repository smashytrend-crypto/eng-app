import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Flame, Play, RefreshCw, Sun } from 'lucide-react'
import { useState } from 'react'
import { Button, Card, Muted, ProgressBar, Screen } from '../components/ui'
import { db } from '../db/db'
import { updateDay } from '../db/repo'
import { computeStreak, diffDays, formatDatePl, pluralN, weekdayPl } from '../lib/dates'
import { useDay, useSettings, useToday } from '../state/hooks'
import { activeSession, planToday, startLesson } from '../state/lesson'
import { applyUpdate, usePwa } from '../state/pwa'
import { navigate } from '../state/router'
import { TodayExtras } from './TodayExtras'

/** Szacowany czas: powtórka ok. 12 s, nowy element ok. 45 s. */
function estimateMinutes(reviews: number, news: number): number {
  return Math.max(1, Math.round((reviews * 12 + news * 45) / 60))
}

export function TodayScreen() {
  const settings = useSettings()
  const today = useToday()
  const day = useDay(today)
  const pwa = usePwa()
  const [starting, setStarting] = useState(false)

  const session = useLiveQuery(() => activeSession(), [today])
  const plan = useLiveQuery(() => (settings ? planToday(new Date(), settings) : undefined), [today, settings])
  const activeDays = useLiveQuery(async () => (await db.days.toArray()).filter((d) => d.seconds > 0 || d.reviews + d.newItems > 0).map((d) => d.dayKey), [])

  if (!settings || !day || plan === undefined || session === undefined || !activeDays) {
    return <Screen>{null}</Screen>
  }

  const daysLeft = diffDays(today, settings.targetDate)
  const streak = computeStreak(activeDays, today)
  const minutesToday = Math.round(day.seconds / 60)

  const start = async () => {
    setStarting(true)
    const s = await startLesson()
    setStarting(false)
    if (s) navigate('/lesson')
  }

  const more = async () => {
    await updateDay(today, (d) => ({ ...d, extraNew: d.extraNew + 5 }))
    await start()
  }

  const remaining = session ? session.entries.length - session.index : 0
  const nothingToDo = !session && plan.entries.length === 0

  return (
    <Screen>
      <div className="pt-6">
        <p className="text-sm font-semibold text-zinc-500 first-letter:uppercase dark:text-zinc-400">
          {weekdayPl(today)}, {formatDatePl(today, false)}
        </p>
        <h1 className="mt-1 text-3xl font-bold">Cześć, Domin!</h1>
        {daysLeft > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
            <Sun size={18} className="text-orange-500" /> Do wakacji: <b>{pluralN(daysLeft, 'dzień', 'dni', 'dni')}</b>
          </p>
        )}
      </div>

      {pwa.needRefresh && (
        <Card className="mt-4 flex items-center justify-between gap-3 border-violet-300 dark:border-violet-800">
          <p className="text-sm font-medium">Jest nowa wersja aplikacji.</p>
          <Button size="md" onClick={applyUpdate}>
            <RefreshCw size={18} /> Aktualizuj
          </Button>
        </Card>
      )}

      <Card className="mt-5 space-y-4">
        {session ? (
          <>
            <div>
              <p className="text-lg font-bold">Lekcja w toku</p>
              <Muted>
                Zostało {pluralN(remaining, 'karta', 'karty', 'kart')} · ok. {estimateMinutes(remaining, 0)} min
              </Muted>
            </div>
            <ProgressBar value={session.index / session.entries.length} />
            <Button variant="hero" size="xl" full onClick={() => navigate('/lesson')}>
              <Play size={28} fill="currentColor" /> Kontynuuj
            </Button>
          </>
        ) : nothingToDo ? (
          <>
            <div>
              <p className="text-lg font-bold">Na dziś wszystko zrobione!</p>
              <Muted>Powtórki zrobione, nowe elementy poznane. Jutro czekają kolejne.</Muted>
            </div>
            <Button variant="secondary" full onClick={more}>
              Ucz się dalej (+5 nowych)
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat value={plan.reviewCount} label="powtórki" />
              <Stat value={plan.newCount} label="nowe" />
              <Stat value={`~${estimateMinutes(plan.reviewCount, plan.newCount)}`} label="minut" />
            </div>
            {plan.dueTotal > plan.reviewCount && (
              <Muted>
                Zaległości rozłożę na kolejne dni ({plan.dueTotal - plan.reviewCount} poczeka). Bez stresu.
              </Muted>
            )}
            <Button variant="hero" size="xl" full onClick={start} disabled={starting}>
              <Play size={28} fill="currentColor" /> Zacznij
            </Button>
            <Muted className="text-center">Możesz przerwać w każdej chwili — postęp zapisuje się po każdej karcie.</Muted>
          </>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3 p-4">
          <Flame className={streak > 0 ? 'text-orange-500' : 'text-zinc-400'} size={28} />
          <div>
            <p className="text-xl font-bold leading-none">{streak}</p>
            <Muted>{streak === 1 ? 'dzień serii' : 'dni serii'}</Muted>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xl font-bold leading-none">{minutesToday} min</p>
          <Muted>nauki dziś</Muted>
        </Card>
      </div>

      <TodayExtras today={today} />

      <BackupReminder lastBackupAt={settings.lastBackupAt} startDate={settings.startDate} today={today} />
    </Screen>
  )
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 py-3 dark:bg-zinc-800/60">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-semibold text-zinc-500">{label}</p>
    </div>
  )
}

function BackupReminder({ lastBackupAt, startDate, today }: { lastBackupAt: number | null; startDate: string; today: string }) {
  const daysSinceStart = diffDays(startDate, today)
  const daysSinceBackup = lastBackupAt ? Math.floor((Date.now() - lastBackupAt) / 86_400_000) : Infinity
  if (daysSinceStart < 7 || daysSinceBackup < 14) return null
  return (
    <Card className="mt-4 flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold">Zrób kopię postępów</p>
        <Muted>{lastBackupAt ? `Ostatnia: ${daysSinceBackup} dni temu.` : 'Dane są tylko w tym telefonie.'}</Muted>
      </div>
      <Button size="md" variant="secondary" onClick={() => navigate('/settings?section=backup')}>
        <Download size={18} />
      </Button>
    </Card>
  )
}
