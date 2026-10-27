import { useState } from 'react'
import { DialogLines } from '../../components/ItemDetails'
import { RatingButtons } from '../../components/RatingButtons'
import { SpeakButton } from '../../components/SpeakButton'
import { Button, Muted } from '../../components/ui'
import { MODE_LABELS } from '../../lib/labels'
import { ExerciseShell, type CardProps } from './shared'

/** Własne zdanie ze wzorca: rama + Twoja treść o sobie. */
export function OwnSentenceCard({ item, card, onRate, busy }: CardProps) {
  const [shown, setShown] = useState(false)
  return (
    <ExerciseShell
      label={MODE_LABELS.own}
      item={item}
      actions={
        shown ? (
          <>
            <p className="text-center text-sm font-semibold text-zinc-500">Jak ci poszło?</p>
            <RatingButtons item={item} card={card} onRate={onRate} disabled={busy} />
          </>
        ) : (
          <Button full size="xl" onClick={() => setShown(true)}>
            Pokaż przykłady
          </Button>
        )
      }
    >
      <div className="space-y-2">
        <p className="text-3xl font-bold text-violet-900 dark:text-violet-100">{item.en}</p>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">{item.pl}</p>
      </div>
      <Muted>Ułóż własne zdanie z tym wzorcem — o sobie, swoim dniu, siłowni, muzyce. Powiedz je na głos.</Muted>
      {shown && (
        <div className="space-y-2">
          {item.type === 'dialog' ? (
            <DialogLines item={item} />
          ) : (
            item.example.map((ex) => (
              <div key={ex.en} className="flex items-start gap-3 rounded-2xl bg-white p-3 dark:bg-zinc-900">
                <SpeakButton text={ex.en} slow={false} size="sm" />
                <div>
                  <p className="font-medium">{ex.en}</p>
                  <p className="text-sm text-zinc-500">{ex.pl}</p>
                </div>
              </div>
            ))
          )}
          {item.note && <p className="text-sm text-amber-800 dark:text-amber-300">{item.note}</p>}
        </div>
      )}
    </ExerciseShell>
  )
}
