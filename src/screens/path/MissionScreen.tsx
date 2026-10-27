import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Eye, Sparkles, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ClaudePracticeCard } from '../../components/ClaudePracticeCard'
import { HeardResult, MicCheckButton, useMicAvailable } from '../../components/SpeechCheck'
import { SpeakButton } from '../../components/SpeakButton'
import { Button, Card, Muted, ProgressBar } from '../../components/ui'
import { missions } from '../../content'
import type { Item, Mission } from '../../content/schema'
import { db } from '../../db/db'
import { addStudySeconds } from '../../db/repo'
import type { CheckResult } from '../../lib/answerCheck'
import { addDays, dayStart, weekKey } from '../../lib/dates'
import { recallPrompt } from '../../lib/exercises'
import { currentStage, introducedSince } from '../../lib/stats'
import { pickMission } from '../../lib/tasks'
import { useAllItems, useCards, useSpeech, useToday } from '../../state/hooks'
import { navigate } from '../../state/router'

type Phase = 'intro' | 'scene' | 'week' | 'done'

/** Misja weekendowa: dłuższa scenka + zwroty z całego tygodnia. Nie wpływa na powtórki. */
export function MissionScreen() {
  const all = useAllItems()
  const cards = useCards()
  const today = useToday()
  const done = useLiveQuery(() => db.missions.toArray(), [])
  const [startedAt] = useState(Date.now())

  const data = useMemo(() => {
    if (!all || !cards || !done) return null
    const stage = currentStage(all.items, cards)
    const mission = pickMission(missions, stage, weekKey(today), new Set(done.map((d) => d.missionId)))
    const since = dayStart(addDays(today, -7)).getTime()
    const week = introducedSince(cards, since)
      .map((c) => all.byId.get(c.itemId))
      .filter((i): i is Item => !!i && i.type !== 'dialog')
      .slice(0, 10)
    return { mission, week }
  }, [all, cards, done, today])

  const [phase, setPhase] = useState<Phase>('intro')

  useEffect(
    () => () => {
      void addStudySeconds(Math.min(1800, (Date.now() - startedAt) / 1000))
    },
    [startedAt],
  )

  if (!data) return null
  const { mission, week } = data
  if (!mission) {
    return (
      <Wrapper>
        <Muted>Brak misji. Wróć, gdy poznasz pierwsze zwroty.</Muted>
      </Wrapper>
    )
  }

  const finish = async () => {
    const wk = weekKey(today)
    await db.missions.put({ id: `${wk}:${mission.id}`, missionId: mission.id, weekKey: wk, doneAt: Date.now() })
    setPhase('done')
  }

  return (
    <Wrapper>
      {phase === 'intro' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-fuchsia-600">
            <Sparkles />
            <p className="text-sm font-bold uppercase tracking-wide">Misja weekendowa</p>
          </div>
          <h1 className="text-3xl font-bold">{mission.title}</h1>
          <p className="text-lg text-zinc-700 dark:text-zinc-300">{mission.setting}</p>
          <Muted>
            {mission.steps.length} kwestii w scence{week.length ? ` + ${week.length} zwrotów z tego tygodnia` : ''}. Mów na głos — misja nie
            zmienia twoich powtórek, to trening.
          </Muted>
          <Button variant="hero" size="xl" full onClick={() => setPhase('scene')}>
            Zaczynamy
          </Button>
        </div>
      )}
      {phase === 'scene' && <Scene mission={mission} onDone={() => (week.length ? setPhase('week') : finish())} />}
      {phase === 'week' && <WeekReview items={week} onDone={finish} />}
      {phase === 'done' && (
        <div className="space-y-5 pt-6 text-center">
          <Trophy size={56} className="mx-auto text-amber-500" />
          <h1 className="text-3xl font-bold">Misja zaliczona!</h1>
          <p className="text-zinc-600 dark:text-zinc-300">Teraz zagraj tę samą scenkę z Claude — on odpowie inaczej niż w aplikacji.</p>
          <div className="text-left">
            <ClaudePracticeCard scenario={mission.claudeScenario} title="Ta scenka z Claude" />
          </div>
          <Button full onClick={() => navigate('/')}>
            Wróć na start
          </Button>
        </div>
      )}
    </Wrapper>
  )
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <div className="pt-safe mx-auto w-full max-w-md px-4 pb-10">
      <header className="flex h-16 items-center">
        <button aria-label="Zamknij misję" onClick={() => navigate('/')} className="-ml-2 rounded-full p-2 text-zinc-500">
          <X size={26} />
        </button>
      </header>
      {children}
    </div>
  )
}

function Scene({ mission, onDone }: { mission: Mission; onDone: () => void }) {
  const speech = useSpeech()
  const mic = useMicAvailable()
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [showPl, setShowPl] = useState(false)
  const [heard, setHeard] = useState<{ heard: string; result: CheckResult } | null>(null)
  const step = mission.steps[idx]

  useEffect(() => {
    if (step.them) void speech.en(step.them, { voice: 2 })
  }, [step, speech])

  const next = () => {
    setRevealed(false)
    setShowPl(false)
    setHeard(null)
    if (idx + 1 >= mission.steps.length) onDone()
    else setIdx(idx + 1)
  }
  const reveal = () => {
    setRevealed(true)
    void speech.en(step.answer)
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <div className="flex-1 space-y-4">
        <ProgressBar value={idx / mission.steps.length} />
        {step.them && (
          <div className="rounded-2xl bg-white p-4 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xl font-semibold">{step.them}</p>
              <SpeakButton text={step.them} voice={2} size="sm" />
            </div>
            {showPl ? (
              <p className="mt-1 text-zinc-500">{step.themPl}</p>
            ) : (
              step.themPl && (
                <button type="button" onClick={() => setShowPl(true)} className="mt-1 text-sm font-semibold text-violet-700 dark:text-violet-300">
                  Nie rozumiem — pokaż po polsku
                </button>
              )
            )}
          </div>
        )}
        <div className="rounded-2xl border-2 border-dashed border-fuchsia-400 p-4">
          <p className="text-xs font-bold uppercase text-fuchsia-600">Twoja kolej</p>
          <p className="text-xl font-bold">{step.task}</p>
        </div>
        {heard && <HeardResult {...heard} />}
        {revealed && (
          <div className="animate-pop flex items-start justify-between gap-2 rounded-2xl border-2 border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-zinc-900">
            <div>
              <p className="text-sm text-zinc-500">Na przykład:</p>
              <p className="text-xl font-bold text-violet-900 dark:text-violet-100">{step.answer}</p>
              {step.alt && step.alt.length > 0 && <p className="mt-1 text-sm text-zinc-500">Albo: {step.alt.join(' · ')}</p>}
            </div>
            <SpeakButton text={step.answer} size="sm" slow={false} />
          </div>
        )}
      </div>
      <div className="pb-safe sticky bottom-0 space-y-2 bg-stone-50 pb-4 pt-4 dark:bg-zinc-950">
        {revealed ? (
          <Button full size="xl" onClick={next}>
            Dalej <ChevronRight />
          </Button>
        ) : (
          <>
            {mic && (
              <MicCheckButton
                answers={[step.answer, ...(step.alt ?? [])]}
                onResult={(r) => {
                  if (!r) return
                  setHeard(r)
                  reveal()
                }}
              />
            )}
            <Button full variant={mic ? 'secondary' : 'primary'} size={mic ? 'lg' : 'xl'} onClick={reveal}>
              <Eye size={20} /> Powiedziałem — pokaż przykład
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function WeekReview({ items, onDone }: { items: Item[]; onDone: () => void }) {
  const speech = useSpeech()
  const [idx, setIdx] = useState(0)
  const [shown, setShown] = useState(false)
  const item = items[idx]
  const p = recallPrompt(item, 0)
  const next = () => {
    setShown(false)
    if (idx + 1 >= items.length) onDone()
    else setIdx(idx + 1)
  }
  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <div className="flex-1 space-y-4">
        <p className="text-sm font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Zwroty z tygodnia · {idx + 1}/{items.length}
        </p>
        <p className="text-3xl font-bold">{p.pl}</p>
        {p.context && <Muted>{p.context}</Muted>}
        {shown && (
          <Card className="animate-pop flex items-start justify-between gap-2">
            <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{p.answers[0]}</p>
            <SpeakButton text={p.speak} />
          </Card>
        )}
      </div>
      <div className="pb-safe sticky bottom-0 bg-stone-50 pb-4 pt-4 dark:bg-zinc-950">
        {shown ? (
          <Button full size="xl" onClick={next}>
            Dalej <ChevronRight />
          </Button>
        ) : (
          <Button
            full
            size="xl"
            onClick={() => {
              setShown(true)
              void speech.en(p.speak)
            }}
          >
            Pokaż
          </Button>
        )}
      </div>
    </div>
  )
}
