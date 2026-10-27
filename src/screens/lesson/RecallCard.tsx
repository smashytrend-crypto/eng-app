import { useState } from 'react'
import { RatingButtons } from '../../components/RatingButtons'
import { HeardResult, MicCheckButton, useMicAvailable } from '../../components/SpeechCheck'
import { Button, Muted } from '../../components/ui'
import type { CheckResult } from '../../lib/answerCheck'
import { recallPrompt } from '../../lib/exercises'
import { MODE_LABELS } from '../../lib/labels'
import { useSettings, useSpeech } from '../../state/hooks'
import { AnswerBlock, ExerciseShell, PromptPl, type CardProps } from './shared'
import { suggestedGrade } from './TypeCard'

/** Karta PL → EN: mówię na głos (opcjonalnie mikrofon), odkrywam odpowiedź, oceniam się. */
export function RecallCard({ item, entry, card, onRate, busy, label }: CardProps & { label?: string }) {
  const settings = useSettings()
  const speech = useSpeech()
  const mic = useMicAvailable()
  const prompt = recallPrompt(item, entry.exampleIndex)
  const [revealed, setRevealed] = useState(false)
  const [heard, setHeard] = useState<{ heard: string; result: CheckResult } | null>(null)

  const reveal = () => {
    setRevealed(true)
    if (settings?.autoPlay) void speech.en(prompt.speak)
  }

  return (
    <ExerciseShell
      label={label ?? MODE_LABELS.recall}
      item={item}
      actions={
        revealed ? (
          <>
            <p className="text-center text-sm font-semibold text-zinc-500">Jak poszło?</p>
            <RatingButtons item={item} card={card} onRate={onRate} disabled={busy} suggested={heard ? suggestedGrade(heard.result) : undefined} />
          </>
        ) : (
          <>
            {mic && (
              <MicCheckButton
                answers={prompt.answers}
                isWord={prompt.isWord}
                onResult={(r) => {
                  if (!r) return
                  setHeard(r)
                  reveal()
                }}
              />
            )}
            <Button full size={mic ? 'lg' : 'xl'} variant={mic ? 'secondary' : 'primary'} onClick={reveal}>
              Pokaż odpowiedź
            </Button>
          </>
        )
      }
    >
      <PromptPl text={prompt.pl} context={prompt.context} />
      {!revealed && (
        <Muted>
          {mic
            ? 'Powiedz to po angielsku do mikrofonu albo na głos i odsłoń odpowiedź.'
            : 'Powiedz to na głos po angielsku. Potem odsłoń odpowiedź i oceń się szczerze.'}
        </Muted>
      )}
      {heard && <HeardResult {...heard} />}
      {revealed && <AnswerBlock item={item} answers={prompt.answers} speak={prompt.speak} />}
    </ExerciseShell>
  )
}
