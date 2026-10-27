import { useState } from 'react'
import { RatingButtons } from '../../components/RatingButtons'
import { Button, Muted } from '../../components/ui'
import { recallPrompt } from '../../lib/exercises'
import { MODE_LABELS } from '../../lib/labels'
import { useSettings, useSpeech } from '../../state/hooks'
import { AnswerBlock, ExerciseShell, PromptPl, type CardProps } from './shared'

/** Karta PL → EN: mówię na głos, odkrywam odpowiedź, oceniam się. */
export function RecallCard({ item, entry, card, onRate, busy, label }: CardProps & { label?: string }) {
  const settings = useSettings()
  const speech = useSpeech()
  const prompt = recallPrompt(item, entry.exampleIndex)
  const [revealed, setRevealed] = useState(false)

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
            <RatingButtons item={item} card={card} onRate={onRate} disabled={busy} />
          </>
        ) : (
          <Button full size="xl" onClick={reveal}>
            Pokaż odpowiedź
          </Button>
        )
      }
    >
      <PromptPl text={prompt.pl} context={prompt.context} />
      {!revealed && (
        <Muted>Powiedz to na głos po angielsku. Potem odsłoń odpowiedź i oceń się szczerze.</Muted>
      )}
      {revealed && <AnswerBlock item={item} answers={prompt.answers} speak={prompt.speak} />}
    </ExerciseShell>
  )
}
