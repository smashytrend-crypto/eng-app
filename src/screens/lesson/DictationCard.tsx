import { Headphones } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RatingButtons } from '../../components/RatingButtons'
import { SpeakButton } from '../../components/SpeakButton'
import { Button, Muted } from '../../components/ui'
import { checkAnswer, type CheckResult } from '../../lib/answerCheck'
import { sentenceFor } from '../../lib/exercises'
import { MODE_LABELS } from '../../lib/labels'
import { useSettings, useSpeech } from '../../state/hooks'
import { ExerciseShell, type CardProps } from './shared'
import { AnswerInput, suggestedGrade, VerdictBanner } from './TypeCard'

/** Dyktando ze słuchu: słyszysz zdanie po angielsku i je zapisujesz. */
export function DictationCard({ item, entry, card, onRate, busy }: CardProps) {
  const settings = useSettings()
  const s = sentenceFor(item, entry.exampleIndex)
  const [text, setText] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const speech = useSpeech()
  const played = useRef(false)

  useEffect(() => {
    if (!settings || played.current) return
    played.current = true
    void speech.en(s.en)
  }, [settings, speech, s.en])

  const check = (value = text) => {
    if (result) return
    setResult(checkAnswer(value, [s.en, ...s.alt]))
  }

  return (
    <ExerciseShell
      label={MODE_LABELS.dictation}
      item={item}
      actions={
        result ? (
          <RatingButtons item={item} card={card} suggested={suggestedGrade(result)} onRate={onRate} disabled={busy} />
        ) : (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <Button variant="secondary" onClick={() => check('')}>
              Nie wiem
            </Button>
            <Button onClick={() => check()} disabled={!text.trim()}>
              Sprawdź
            </Button>
          </div>
        )
      }
    >
      <div className="flex items-center gap-3">
        <Headphones className="text-violet-600" />
        <p className="text-xl font-bold">Posłuchaj i zapisz, co słyszysz.</p>
      </div>
      <div className="flex justify-center py-2">
        <SpeakButton text={s.en} size="lg" />
      </div>
      <Muted className="text-center">Ślimak = wolniej. Możesz słuchać ile razy chcesz.</Muted>
      {!result && <AnswerInput value={text} onChange={setText} onSubmit={() => text.trim() && check()} placeholder="Zapisz po angielsku…" />}
      {result && <VerdictBanner result={result} />}
      {result && (
        <div className="space-y-1 rounded-2xl border-2 border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-zinc-900">
          <p className="text-xl font-bold text-violet-900 dark:text-violet-100">{s.en}</p>
          <p className="text-zinc-500">{s.pl}</p>
        </div>
      )}
    </ExerciseShell>
  )
}
