import { Snail, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useSpeech } from '../state/hooks'
import { ttsSupported } from '../speech/tts'

/** Przycisk odsłuchu po angielsku; opcjonalnie z wolniejszym tempem (0,8×). */
export function SpeakButton({
  text,
  slow = true,
  size = 'md',
  voice = 1,
  label,
}: {
  text: string
  slow?: boolean
  size?: 'sm' | 'md' | 'lg'
  voice?: 1 | 2
  label?: string
}) {
  const speech = useSpeech()
  const [playing, setPlaying] = useState<null | number>(null)
  if (!ttsSupported) return null
  const play = async (factor: number) => {
    setPlaying(factor)
    await speech.en(text, { factor, voice })
    setPlaying(null)
  }
  const dims = { sm: 'h-9 w-9', md: 'h-12 w-12', lg: 'h-16 w-16' }[size]
  const icon = { sm: 18, md: 24, lg: 32 }[size]
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-label={label ?? 'Odsłuchaj'}
        onClick={(e) => {
          e.stopPropagation()
          void play(1)
        }}
        className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 transition active:scale-95 dark:bg-violet-950 dark:text-violet-300 ${
          playing === 1 ? 'ring-4 ring-violet-300 dark:ring-violet-700' : ''
        }`}
      >
        <Volume2 size={icon} />
      </button>
      {slow && (
        <button
          type="button"
          aria-label="Odsłuchaj wolniej (0,8×)"
          onClick={(e) => {
            e.stopPropagation()
            void play(0.8)
          }}
          className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition active:scale-95 dark:bg-zinc-800 dark:text-zinc-300 ${
            playing === 0.8 ? 'ring-4 ring-zinc-300 dark:ring-zinc-600' : ''
          }`}
        >
          <Snail size={icon - 4} />
        </button>
      )}
    </span>
  )
}
