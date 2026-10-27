import { useMemo } from 'react'
import type { Item } from '../content/schema'
import { formatInterval, GRADES, newCard, previewIntervals, Rating, RATING_LABELS, type Grade, type StoredCard } from '../lib/srs'

const STYLE: Record<number, { base: string; active: string }> = {
  [Rating.Again]: {
    base: 'border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-300',
    active: 'bg-rose-600 border-rose-600 text-white dark:bg-rose-600 dark:text-white',
  },
  [Rating.Hard]: {
    base: 'border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300',
    active: 'bg-amber-500 border-amber-500 text-white dark:text-white',
  },
  [Rating.Good]: {
    base: 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300',
    active: 'bg-emerald-600 border-emerald-600 text-white dark:text-white',
  },
  [Rating.Easy]: {
    base: 'border-sky-200 text-sky-700 dark:border-sky-900 dark:text-sky-300',
    active: 'bg-sky-600 border-sky-600 text-white dark:text-white',
  },
}

/** Cztery oceny FSRS z podglądem, kiedy element wróci. Sugerowana ocena jest wyróżniona. */
export function RatingButtons({
  item,
  card,
  suggested,
  onRate,
  disabled,
}: {
  item: Item
  card: StoredCard | undefined
  suggested?: Grade
  onRate: (g: Grade) => void
  disabled?: boolean
}) {
  const intervals = useMemo(() => {
    const now = new Date()
    return previewIntervals(card ?? newCard(item.id, now), now, item.tags)
  }, [card, item])
  return (
    <div className="grid grid-cols-2 gap-2">
      {GRADES.map((g) => {
        const s = STYLE[g]
        const isSuggested = suggested === g
        return (
          <button
            key={g}
            type="button"
            disabled={disabled}
            onClick={() => onRate(g)}
            className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-2 font-semibold transition active:scale-[0.98] ${
              isSuggested ? s.active : `bg-white dark:bg-zinc-900 ${s.base}`
            }`}
          >
            <span className="text-base">{RATING_LABELS[g]}</span>
            <span className={`text-xs font-medium ${isSuggested ? 'opacity-90' : 'opacity-70'}`}>{formatInterval(intervals[g])}</span>
          </button>
        )
      })}
    </div>
  )
}
