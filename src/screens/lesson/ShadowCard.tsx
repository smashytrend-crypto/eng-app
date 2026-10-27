import { Repeat } from 'lucide-react'
import { useState } from 'react'
import { RatingButtons } from '../../components/RatingButtons'
import { HeardResult, MicCheckButton, useMicAvailable } from '../../components/SpeechCheck'
import { Button, Muted } from '../../components/ui'
import type { CheckResult } from '../../lib/answerCheck'
import { sentenceFor } from '../../lib/exercises'
import { MODE_LABELS } from '../../lib/labels'
import { useSpeech } from '../../state/hooks'
import { ExerciseShell, PromptPl, type CardProps } from './shared'
import { suggestedGrade } from './TypeCard'

/** Shadowing: odsłuch 0,8× i 1×, powtarzasz za lektorem. */
export function ShadowCard({ item, entry, card, onRate, busy }: CardProps) {
  const speech = useSpeech()
  const mic = useMicAvailable()
  const s = sentenceFor(item, entry.exampleIndex)
  const [rounds, setRounds] = useState(0)
  const [playing, setPlaying] = useState<number | null>(null)
  const [heard, setHeard] = useState<{ heard: string; result: CheckResult } | null>(null)

  const play = async (factor: number) => {
    setPlaying(factor)
    await speech.en(s.en, { factor })
    setPlaying(null)
    setRounds((r) => r + 1)
  }

  return (
    <ExerciseShell
      label={MODE_LABELS.shadow}
      item={item}
      actions={
        <>
          {rounds >= 2 && <p className="text-center text-sm font-semibold text-zinc-500">Jak ci szło?</p>}
          {rounds >= 2 ? (
            <RatingButtons item={item} card={card} onRate={onRate} disabled={busy} suggested={heard ? suggestedGrade(heard.result) : undefined} />
          ) : (
            <Muted className="text-center">Posłuchaj najpierw wolniej, potem w normalnym tempie.</Muted>
          )}
        </>
      }
    >
      <PromptPl text={s.pl} />
      <p className="text-2xl font-bold text-violet-900 dark:text-violet-100">{s.en}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={rounds === 0 ? 'primary' : 'secondary'} onClick={() => play(0.8)} disabled={playing !== null}>
          {playing === 0.8 ? 'Słuchaj…' : 'Odsłuch 0,8×'}
        </Button>
        <Button variant={rounds === 1 ? 'primary' : 'secondary'} onClick={() => play(1)} disabled={playing !== null}>
          {playing === 1 ? 'Słuchaj…' : 'Odsłuch 1×'}
        </Button>
      </div>
      <div className="flex items-start gap-2 rounded-2xl bg-violet-50 p-3 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
        <Repeat size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm">
          Powtarzaj na głos razem z lektorem albo zaraz po nim — 2–3 razy. Naśladuj melodię i tempo, nie tylko słowa.
        </p>
      </div>
      {mic && rounds >= 1 && <MicCheckButton answers={[s.en, ...s.alt]} onResult={setHeard} label="Sprawdź wymowę (mikrofon)" size="md" />}
      {heard && <HeardResult {...heard} />}
    </ExerciseShell>
  )
}
