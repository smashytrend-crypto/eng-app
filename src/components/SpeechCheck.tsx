import { Mic, MicOff, Square } from 'lucide-react'
import { useState } from 'react'
import { checkAnswer, type CheckResult } from '../lib/answerCheck'
import { LISTEN_ERROR_TEXT, recognitionSupported } from '../speech/recognition'
import { useListen } from '../speech/useListen'
import { stopSpeaking } from '../speech/tts'
import { useSettings } from '../state/hooks'
import { DiffText } from './DiffText'

const ORDER = { correct: 0, almost: 1, wrong: 2, empty: 3 }

/** Najlepsze dopasowanie spośród wariantów rozpoznanych przez przeglądarkę. */
export function bestRecognized(alternatives: string[], answers: string[], isWord = false): { heard: string; result: CheckResult } | null {
  let best: { heard: string; result: CheckResult } | null = null
  for (const heard of alternatives) {
    const result = checkAnswer(heard, answers, { ignoreLeadingArticle: isWord })
    if (!best || ORDER[result.verdict] < ORDER[best.result.verdict]) best = { heard, result }
  }
  return best
}

/** Czy pokazać mikrofon: przeglądarka obsługuje i użytkownik nie wyłączył. */
export function useMicAvailable(): boolean {
  const settings = useSettings()
  return recognitionSupported && (settings?.recognition ?? true)
}

/** Przycisk mikrofonu, który porównuje wypowiedź z poprawną odpowiedzią. */
export function MicCheckButton({
  answers,
  isWord,
  onResult,
  label = 'Powiedz (mikrofon)',
  size = 'lg',
}: {
  answers: string[]
  isWord?: boolean
  onResult: (r: { heard: string; result: CheckResult } | null) => void
  label?: string
  size?: 'md' | 'lg'
}) {
  const settings = useSettings()
  const lis = useListen(settings?.accent ?? 'en-GB')
  const go = async () => {
    if (lis.state === 'listening') {
      lis.stop()
      return
    }
    stopSpeaking()
    const alts = await lis.start()
    onResult(alts.length ? bestRecognized(alts, answers, isWord) : null)
  }
  const listening = lis.state === 'listening'
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.99] ${
          size === 'lg' ? 'min-h-16 text-lg' : 'min-h-12'
        } ${listening ? 'animate-pulse bg-rose-600 text-white' : 'bg-fuchsia-600 text-white hover:bg-fuchsia-700'}`}
      >
        {listening ? <Square size={20} fill="currentColor" /> : <Mic size={22} />}
        {listening ? 'Słucham… (dotknij, by zakończyć)' : label}
      </button>
      {listening && lis.interim && <p className="text-center text-zinc-500">„{lis.interim}”</p>}
      {lis.state === 'error' && lis.error && (
        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
          <MicOff size={16} className="mt-0.5 shrink-0" /> {LISTEN_ERROR_TEXT[lis.error]}
        </p>
      )}
    </div>
  )
}

/** Wynik porównania mowy: co usłyszano i co było poprawnie. */
export function HeardResult({ heard, result }: { heard: string; result: CheckResult }) {
  const tone =
    result.verdict === 'correct'
      ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
      : result.verdict === 'almost'
        ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
        : 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
  const title = result.verdict === 'correct' ? 'Świetnie — tak to brzmi!' : result.verdict === 'almost' ? 'Prawie! Zobacz różnice:' : 'Usłyszałem coś innego:'
  return (
    <div className={`animate-pop space-y-1 rounded-2xl p-3 ${tone}`}>
      <p className="font-bold">{title}</p>
      <p>
        <span className="text-sm opacity-70">Usłyszałem: </span>
        {result.verdict === 'correct' ? `„${heard}”` : <DiffText words={result.given} />}
      </p>
      {result.verdict !== 'correct' && (
        <p>
          <span className="text-sm opacity-70">Poprawnie: </span>
          <DiffText words={result.expected} />
        </p>
      )}
      {result.verdict !== 'correct' && (
        <p className="text-xs opacity-70">Rozpoznawanie mowy nie jest idealne — jeśli wiesz, że powiedziałeś dobrze, oceń się sam.</p>
      )}
    </div>
  )
}

/** Swobodne słuchanie (bez porównania) — do własnych zdań i zadań mówionych. */
export function FreeMic({ onText, label = 'Nagraj (mikrofon)' }: { onText?: (t: string) => void; label?: string }) {
  const settings = useSettings()
  const lis = useListen(settings?.accent ?? 'en-GB')
  const [text, setText] = useState('')
  if (!recognitionSupported) return null
  const go = async () => {
    if (lis.state === 'listening') return lis.stop()
    stopSpeaking()
    const alts = await lis.start()
    if (alts[0]) {
      setText(alts[0])
      onText?.(alts[0])
    }
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl font-semibold text-white ${
          lis.state === 'listening' ? 'animate-pulse bg-rose-600' : 'bg-fuchsia-600'
        }`}
      >
        {lis.state === 'listening' ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
        {lis.state === 'listening' ? 'Słucham…' : label}
      </button>
      {(lis.interim || text) && (
        <p className="rounded-2xl bg-zinc-50 p-3 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200">
          <span className="text-sm text-zinc-500">Usłyszałem: </span>„{lis.state === 'listening' ? lis.interim : text}”
        </p>
      )}
      {lis.state === 'error' && lis.error && <p className="text-sm text-amber-700 dark:text-amber-300">{LISTEN_ERROR_TEXT[lis.error]}</p>}
    </div>
  )
}
