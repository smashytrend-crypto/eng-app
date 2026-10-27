import { ChevronRight, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DialogLines } from '../../components/ItemDetails'
import { RatingButtons } from '../../components/RatingButtons'
import { HeardResult, MicCheckButton, useMicAvailable } from '../../components/SpeechCheck'
import { SpeakButton } from '../../components/SpeakButton'
import { Button, Muted, Segmented } from '../../components/ui'
import type { CheckResult } from '../../lib/answerCheck'
import { MODE_LABELS } from '../../lib/labels'
import { ttsSupported } from '../../speech/tts'
import { useSpeech } from '../../state/hooks'
import { ExerciseShell, type CardProps } from './shared'

type Role = 'A' | 'B'

/** Odgrywanie mini-dialogu: lektor czyta drugą rolę, Ty mówisz swoje kwestie (z polskiej podpowiedzi). */
export function DialogCard({ item, card, onRate, busy }: CardProps) {
  const speech = useSpeech()
  const mic = useMicAvailable()
  const lines = item.example
  const [role, setRole] = useState<Role>((card?.reps ?? 0) % 2 === 0 ? 'B' : 'A')
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [heard, setHeard] = useState<{ heard: string; result: CheckResult } | null>(null)
  const done = idx >= lines.length
  const line = lines[idx]
  const mine = line?.speaker === role

  // Kwestie drugiej osoby czyta lektor i dialog idzie dalej sam
  useEffect(() => {
    if (!started || done || mine) return
    let cancelled = false
    void speech.en(line.en, { voice: line.speaker === 'B' ? 2 : 1 }).then(() => {
      if (!cancelled && ttsSupported) setTimeout(() => !cancelled && setIdx((i) => i + 1), 350)
    })
    return () => {
      cancelled = true
    }
  }, [started, done, mine, line, speech])

  const next = () => {
    setIdx((i) => i + 1)
    setRevealed(false)
    setHeard(null)
  }
  const reveal = () => {
    setRevealed(true)
    void speech.en(line.en, { voice: line.speaker === 'B' ? 2 : 1 })
  }

  if (!started) {
    return (
      <ExerciseShell
        label={MODE_LABELS.dialog}
        item={item}
        actions={
          <Button full size="xl" onClick={() => setStarted(true)}>
            Zaczynamy
          </Button>
        }
      >
        <div>
          <p className="text-2xl font-bold">{item.pl}</p>
          <p className="text-zinc-500">{item.en}</p>
        </div>
        <Muted>{item.usage}</Muted>
        <p className="font-semibold">Którą rolę grasz?</p>
        <Segmented<Role>
          value={role}
          onChange={setRole}
          options={[
            { value: 'A', label: 'Osoba A' },
            { value: 'B', label: 'Osoba B' },
          ]}
        />
        <Muted>Lektor przeczyta kwestie drugiej osoby. Przy Twoich zobaczysz polską podpowiedź — powiedz je po angielsku.</Muted>
      </ExerciseShell>
    )
  }

  if (done) {
    return (
      <ExerciseShell
        label={MODE_LABELS.dialog}
        item={item}
        actions={
          <>
            <p className="text-center text-sm font-semibold text-zinc-500">Jak poszło całe odgrywanie?</p>
            <RatingButtons item={item} card={card} onRate={onRate} disabled={busy} />
          </>
        }
      >
        <p className="text-xl font-bold">Cały dialog</p>
        <DialogLines item={item} />
      </ExerciseShell>
    )
  }

  return (
    <ExerciseShell
      label={`${MODE_LABELS.dialog} · rola ${role}`}
      item={item}
      actions={
        mine ? (
          revealed ? (
            <Button full size="xl" onClick={next}>
              Dalej <ChevronRight />
            </Button>
          ) : (
            <>
              {mic && (
                <MicCheckButton
                  answers={[line.en, ...(line.alt ?? [])]}
                  onResult={(r) => {
                    if (!r) return
                    setHeard(r)
                    reveal()
                  }}
                />
              )}
              <Button full variant={mic ? 'secondary' : 'primary'} size={mic ? 'lg' : 'xl'} onClick={reveal}>
                <Eye size={20} /> Pokaż moją kwestię
              </Button>
            </>
          )
        ) : !ttsSupported ? (
          <Button full size="xl" onClick={next}>
            Dalej <ChevronRight />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {lines.slice(0, idx).map((l, i) => (
          <Bubble key={i} speaker={l.speaker!} mine={l.speaker === role} en={l.en} pl={l.pl} />
        ))}
        {mine ? (
          <div className="ml-auto max-w-[90%] rounded-2xl border-2 border-dashed border-fuchsia-400 p-3">
            <p className="text-xs font-bold text-fuchsia-600">Twoja kwestia — powiedz po angielsku:</p>
            <p className="text-xl font-bold">{line.pl}</p>
            {revealed && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-violet-800 dark:text-violet-200">{line.en}</p>
                <SpeakButton text={line.en} slow={false} size="sm" voice={line.speaker === 'B' ? 2 : 1} />
              </div>
            )}
          </div>
        ) : (
          <Bubble speaker={line.speaker!} mine={false} en={line.en} pl={line.pl} speaking />
        )}
      </div>
      {heard && <HeardResult {...heard} />}
    </ExerciseShell>
  )
}

function Bubble({ speaker, mine, en, pl, speaking }: { speaker: string; mine: boolean; en: string; pl: string; speaking?: boolean }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : ''}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? 'bg-violet-100 dark:bg-violet-950' : 'bg-white dark:bg-zinc-900'} ${
          speaking ? 'ring-2 ring-violet-400' : ''
        }`}
      >
        <p className="text-xs font-bold text-zinc-500">
          {speaker}
          {mine ? ' (Ty)' : ''}
        </p>
        <p className="font-medium">{en}</p>
        <p className="text-sm text-zinc-500">{pl}</p>
      </div>
    </div>
  )
}
