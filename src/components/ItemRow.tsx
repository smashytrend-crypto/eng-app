import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Item } from '../content/schema'
import { toggleFavorite } from '../db/repo'
import { cardStatus, STATUS_LABELS } from '../lib/stats'
import type { StoredCard } from '../lib/srs'
import { navigate } from '../state/router'
import { SpeakButton } from './SpeakButton'

const STATUS_DOT = {
  new: 'bg-zinc-300 dark:bg-zinc-600',
  learning: 'bg-amber-400',
  review: 'bg-sky-500',
  mastered: 'bg-emerald-500',
}

export function ItemRow({ item, card, favorite, extra }: { item: Item; card?: StoredCard; favorite: boolean; extra?: ReactNode }) {
  const status = cardStatus(card)
  const speakText = item.type === 'pattern' ? item.example[0].en : item.type === 'dialog' ? item.example[0].en : item.en
  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800">
      <SpeakButton text={speakText} slow={false} size="sm" />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/item/${encodeURIComponent(item.id)}`)}>
        <p className="font-semibold leading-snug">{item.en}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.pl}</p>
        {extra}
      </button>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} title={STATUS_LABELS[status]} />
      <button
        type="button"
        aria-label={favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
        onClick={() => toggleFavorite(item.id)}
        className="shrink-0 p-1"
      >
        <Star size={20} className={favorite ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'} />
      </button>
    </div>
  )
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
      {(Object.keys(STATUS_DOT) as Array<keyof typeof STATUS_DOT>).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} /> {STATUS_LABELS[s]}
        </span>
      ))}
    </div>
  )
}
