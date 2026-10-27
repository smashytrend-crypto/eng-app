import { Check, Play, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DialogLines, ItemDetails } from '../../components/ItemDetails'
import { SpeakButton } from '../../components/SpeakButton'
import { Button } from '../../components/ui'
import type { Item } from '../../content/schema'
import { TYPE_LABELS } from '../../lib/labels'
import { useSettings, useSpeech, type Speech } from '../../state/hooks'
import { ExerciseShell } from './shared'

export async function playDialog(item: Item, speech: Speech, signal?: { cancelled: boolean }) {
  for (const line of item.example) {
    if (signal?.cancelled) return
    await speech.en(line.en, { voice: line.speaker === 'B' ? 2 : 1 })
    await new Promise((r) => setTimeout(r, 350))
  }
}

/** Prezentacja nowego elementu (EN → PL, odsłuch, przykład). Potem od razu szybkie przypomnienie. */
export function NewItemCard({ item, onContinue, onKnown, busy }: { item: Item; onContinue: () => void; onKnown?: () => void; busy?: boolean }) {
  const settings = useSettings()
  const speech = useSpeech()
  const played = useRef(false)
  const [playing, setPlaying] = useState(false)
  const speakText = item.type === 'pattern' ? item.example[0].en : item.en

  useEffect(() => {
    if (!settings || played.current || !settings.autoPlay) return
    played.current = true
    if (item.type !== 'dialog') void speech.en(speakText)
  }, [settings, speech, item, speakText])

  const playAll = async () => {
    setPlaying(true)
    await playDialog(item, speech)
    setPlaying(false)
  }

  return (
    <ExerciseShell
      label={`Nowy element · ${TYPE_LABELS[item.type]}`}
      actions={
        <>
          <Button full size="xl" onClick={onContinue}>
            <Sparkles size={22} /> {item.type === 'dialog' ? 'Dalej: odegraj dialog' : 'Dalej: powiedz to sam'}
          </Button>
          {onKnown && item.type !== 'dialog' && (
            <Button full variant="secondary" onClick={onKnown} disabled={busy}>
              <Check size={20} /> Już to umiem — pomiń
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="text-3xl font-bold leading-tight text-violet-900 dark:text-violet-100">{item.en}</p>
          {item.type !== 'dialog' && item.type !== 'pattern' && <SpeakButton text={item.en} size="lg" />}
        </div>
        <p className="text-xl text-zinc-600 dark:text-zinc-300">{item.pl}</p>
      </div>

      {item.type === 'dialog' ? (
        <div className="space-y-3">
          <p className="text-zinc-600 dark:text-zinc-300">{item.usage}</p>
          <Button variant="secondary" full onClick={playAll} disabled={playing}>
            <Play size={20} /> {playing ? 'Odtwarzam…' : 'Odtwórz cały dialog'}
          </Button>
          <DialogLines item={item} />
        </div>
      ) : (
        <ItemDetails item={item} />
      )}
    </ExerciseShell>
  )
}
