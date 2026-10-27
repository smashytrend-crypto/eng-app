import { Check, ChevronRight, Eye, Headphones, MessageSquare, Mic, Upload, X } from 'lucide-react'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { SpeakButton } from '../components/SpeakButton'
import { Button, Card, Muted, ProgressBar, Segmented, Stepper } from '../components/ui'
import { contentItems } from '../content'
import type { Accent } from '../db/db'
import { importBackup, parseBackup } from '../db/backup'
import { saveCards, saveSettings } from '../db/repo'
import { dayKey, diffDays, formatDatePl, pluralN } from '../lib/dates'
import { markKnown, type StoredCard } from '../lib/srs'
import { useSettings, useSpeech } from '../state/hooks'
import { requestPersistence } from '../state/pwa'
import { navigate } from '../state/router'

const STEPS = ['start', 'target', 'pace', 'voice', 'test', 'done'] as const
type Step = (typeof STEPS)[number]

export function OnboardingScreen() {
  const settings = useSettings()
  const [step, setStep] = useState<Step>('start')
  const [known, setKnown] = useState<StoredCard[]>([])
  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1])

  if (!settings) return null

  const finish = async () => {
    await saveCards(known)
    await saveSettings({ onboarded: true, startDate: dayKey() })
    void requestPersistence()
    navigate('/', { replace: true })
  }

  return (
    <div className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8">
      {step !== 'start' && <ProgressBar value={STEPS.indexOf(step) / (STEPS.length - 1)} className="mt-4" />}
      <div className="flex-1 pt-6">
        {step === 'start' && <Welcome onNext={next} />}
        {step === 'target' && <TargetStep value={settings.targetDate} onNext={next} />}
        {step === 'pace' && <PaceStep value={settings.newPerDay} targetDate={settings.targetDate} onNext={next} />}
        {step === 'voice' && <VoiceStep accent={settings.accent} rate={settings.rate} onNext={next} />}
        {step === 'test' && (
          <KnownTest
            onDone={(cards) => {
              setKnown(cards)
              next()
            }}
          />
        )}
        {step === 'done' && (
          <div className="space-y-5 pt-10 text-center">
            <p className="text-5xl">🎧</p>
            <h1 className="text-3xl font-bold">Gotowe!</h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-300">
              {known.length > 0
                ? `Oznaczyłeś ${pluralN(known.length, 'element', 'elementy', 'elementów')} jako znane — sprawdzę je za kilka dni.`
                : 'Zaczynamy od samych podstaw.'}{' '}
              Codziennie: krótka lekcja, potem chwila mówienia na głos.
            </p>
            <Button variant="hero" size="xl" full onClick={finish}>
              Zacznij pierwszą lekcję
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Welcome({ onNext }: { onNext: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const restore = async (file: File) => {
    try {
      const backup = parseBackup(await file.text())
      await importBackup(backup)
      await saveSettings({ onboarded: true })
      navigate('/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <div className="space-y-6 pt-6">
      <div>
        <p className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 bg-clip-text text-4xl font-black text-transparent">
          Speak by Summer
        </p>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-300">
          Twój plan na swobodne rozmowy po angielsku — do wakacji.
        </p>
      </div>
      <div className="space-y-4">
        <Feature icon={<MessageSquare />} title="Gotowe zwroty, nie wykłady" text="Uczysz się całych wyrażeń w kontekście: siłownia, techno, Tomorrowland, podróże." />
        <Feature icon={<Mic />} title="Najpierw mówienie" text="Widzisz zdanie po polsku i mówisz je po angielsku. Na koniec lekcji zawsze coś na głos." />
        <Feature icon={<Headphones />} title="10–20 minut dziennie" text="Powtórki w idealnym momencie (FSRS). Możesz przerwać w dowolnej chwili." />
      </div>
      <Button variant="hero" size="xl" full onClick={onNext}>
        Zaczynamy <ChevronRight />
      </Button>
      <div className="text-center">
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
          <Upload size={16} /> Mam kopię postępów — wczytaj
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  )
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">{icon}</div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-zinc-600 dark:text-zinc-400">{text}</p>
      </div>
    </div>
  )
}

function TargetStep({ value, onNext }: { value: string; onNext: () => void }) {
  const [date, setDate] = useState(value)
  const days = diffDays(dayKey(), date)
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Na kiedy chcesz mówić swobodnie?</h1>
      <Muted>Domyślnie 1 lipca 2027 — początek wakacji. Możesz to zmienić też później w ustawieniach.</Muted>
      <input
        type="date"
        value={date}
        min={dayKey()}
        onChange={(e) => e.target.value && setDate(e.target.value)}
        className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-4 text-xl dark:border-zinc-700 dark:bg-zinc-900"
      />
      {days > 0 && (
        <Card>
          <p className="text-lg">
            To <b>{pluralN(days, 'dzień', 'dni', 'dni')}</b> (ok. {Math.round(days / 7)} tygodni) — do {formatDatePl(date)}.
          </p>
        </Card>
      )}
      <Button full onClick={async () => { await saveSettings({ targetDate: date }); onNext() }} disabled={days <= 0}>
        Dalej
      </Button>
    </div>
  )
}

function PaceStep({ value, targetDate, onNext }: { value: number; targetDate: string; onNext: () => void }) {
  const [n, setN] = useState(value)
  const days = Math.max(1, diffDays(dayKey(), targetDate))
  const total = contentItems.length
  const minutes = Math.round(n * 1.1 + 6)
  const covered = Math.min(total, Math.round((n * days * 6) / 7))
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ile nowych elementów dziennie?</h1>
      <Muted>Zwroty, słówka i wzorce. Do tego codzienne powtórki. 8 to dobry start — ok. 15 minut dziennie.</Muted>
      <div className="flex justify-center">
        <Stepper value={n} onChange={setN} min={3} max={25} />
      </div>
      <Card className="space-y-1">
        <p>
          Ok. <b>{minutes}–{minutes + 5} min</b> dziennie (gdy powtórek przybędzie).
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          W tym tempie do celu poznasz ok. {covered} z {total} elementów programu.
        </p>
      </Card>
      <Button full onClick={async () => { await saveSettings({ newPerDay: n }); onNext() }}>
        Dalej
      </Button>
    </div>
  )
}

function VoiceStep({ accent, rate, onNext }: { accent: Accent; rate: number; onNext: () => void }) {
  const speech = useSpeech()
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Jaki angielski chcesz słyszeć?</h1>
      <Segmented<Accent>
        value={accent}
        onChange={(v) => saveSettings({ accent: v })}
        options={[
          { value: 'en-GB', label: '🇬🇧 Brytyjski' },
          { value: 'en-US', label: '🇺🇸 Amerykański' },
        ]}
      />
      <div className="space-y-2">
        <p className="font-semibold">Tempo lektora</p>
        <div className="flex justify-center">
          <Stepper value={rate} onChange={(v) => saveSettings({ rate: v })} min={0.6} max={1.3} step={0.05} format={(v) => `${v.toFixed(2).replace('.', ',')}×`} />
        </div>
      </div>
      <Button variant="secondary" full onClick={() => speech.en("Hi! I'm your English voice. Let's get you speaking by summer.")}>
        Posłuchaj próbki
      </Button>
      <Muted>Głos możesz zmienić później w ustawieniach. Jeśli nic nie słychać — sprawdź głośność telefonu.</Muted>
      <Button full onClick={onNext}>
        Dalej
      </Button>
    </div>
  )
}

/** Szybki test „to już znam”: podstawowe zwroty z Etapu 1. */
function KnownTest({ onDone }: { onDone: (cards: StoredCard[]) => void }) {
  const candidates = useMemo(() => contentItems.filter((i) => i.tags.includes('starter')).slice(0, 30), [])
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)
  const [known, setKnown] = useState<StoredCard[]>([])
  const [started, setStarted] = useState(false)

  if (!started || !candidates.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Szybki test: to już znam</h1>
        <Muted>
          Pokażę Ci {candidates.length} podstawowych zwrotów po polsku. Jeśli od razu wiesz, jak to powiedzieć po angielsku — kliknij „Znam”. Nie
          stracisz czasu na to, co już umiesz.
        </Muted>
        <Button full onClick={() => setStarted(true)} disabled={!candidates.length}>
          Zróbmy test (ok. 2 min)
        </Button>
        <Button variant="ghost" full onClick={() => onDone([])}>
          Pomiń — zacznę od zera
        </Button>
      </div>
    )
  }

  const item = candidates[index]
  const answer = (isKnown: boolean) => {
    const nextKnown = isKnown ? [...known, markKnown(item.id, new Date(), item.tags)] : known
    setKnown(nextKnown)
    setShown(false)
    if (index + 1 >= candidates.length) onDone(nextKnown)
    else setIndex(index + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Muted>
          {index + 1} / {candidates.length}
        </Muted>
        <button type="button" onClick={() => onDone(known)} className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          Zakończ test
        </button>
      </div>
      <Card className="space-y-4">
        <p className="text-sm font-semibold text-zinc-500">Jak powiesz po angielsku?</p>
        <p className="text-3xl font-bold">{item.pl}</p>
        {shown ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xl font-semibold text-violet-800 dark:text-violet-200">{item.en}</p>
            <SpeakButton text={item.en} slow={false} />
          </div>
        ) : (
          <button type="button" onClick={() => setShown(true)} className="flex items-center gap-2 font-semibold text-violet-700 dark:text-violet-300">
            <Eye size={18} /> Sprawdź odpowiedź
          </button>
        )}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="xl" onClick={() => answer(false)}>
          <X /> Nie znam
        </Button>
        <Button size="xl" onClick={() => answer(true)}>
          <Check /> Znam
        </Button>
      </div>
    </div>
  )
}
