import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ItemBadges, ItemDetails } from '../../components/ItemDetails'
import { SpeakButton } from '../../components/SpeakButton'
import type { Item } from '../../content/schema'
import type { QueueEntry } from '../../lib/lessonQueue'
import type { Grade, StoredCard } from '../../lib/srs'

export interface CardProps {
  item: Item
  entry: QueueEntry
  card: StoredCard | undefined
  onRate: (g: Grade) => void
  busy?: boolean
}

/** Układ karty ćwiczenia: treść u góry, przyciski na dole (pod kciukiem). */
export function ExerciseShell({
  label,
  item,
  children,
  actions,
}: {
  label: string
  item?: Item
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="animate-pop flex min-h-[calc(100dvh-5rem)] flex-col">
      <div className="flex-1 space-y-5 pb-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">{label}</p>
          {item && <ItemBadges item={item} />}
        </div>
        {children}
      </div>
      {actions && (
        <div className="pb-safe sticky bottom-0 -mx-4 space-y-3 bg-gradient-to-t from-stone-50 via-stone-50 to-stone-50/0 px-4 pb-4 pt-6 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/0">
          {actions}
        </div>
      )}
    </div>
  )
}

export function PromptPl({ text, context }: { text: string; context?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-3xl font-bold leading-tight">{text}</p>
      {context && <p className="text-zinc-500 dark:text-zinc-400">{context}</p>}
    </div>
  )
}

/** Poprawna odpowiedź + odsłuch + warianty + (rozwijane) szczegóły elementu. */
export function AnswerBlock({ item, answers, speak, extra }: { item: Item; answers: string[]; speak: string; extra?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const alts = answers.slice(1, 4)
  const hasDetails = !!(item.note || item.pronunciation || item.example.length || item.collocations?.length)
  return (
    <div className="animate-pop space-y-3 rounded-3xl border-2 border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-2xl font-bold leading-snug text-violet-900 dark:text-violet-100">{answers[0]}</p>
        <SpeakButton text={speak} />
      </div>
      {alts.length > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Też dobrze: {alts.map((a, i) => <span key={a} className="font-medium text-zinc-700 dark:text-zinc-300">{a}{i < alts.length - 1 ? ' · ' : ''}</span>)}
        </p>
      )}
      {extra}
      {hasDetails && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-sm font-semibold text-violet-700 dark:text-violet-300"
          >
            <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
            {open ? 'Ukryj szczegóły' : 'Przykład i wskazówki'}
          </button>
          {open && (
            <div className="mt-3">
              <ItemDetails item={item} compact />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
