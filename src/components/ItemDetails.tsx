import { AlertTriangle, MessageCircle } from 'lucide-react'
import type { Item } from '../content/schema'
import { REGISTER_LABELS, TYPE_LABELS } from '../lib/labels'
import { SpeakButton } from './SpeakButton'
import { Badge } from './ui'

export function ItemBadges({ item }: { item: Item }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone="violet">{TYPE_LABELS[item.type]}</Badge>
      <Badge>{REGISTER_LABELS[item.register]}</Badge>
      {item.tags.includes('rescue') && <Badge tone="emerald">ratunkowy</Badge>}
      {item.tags.includes('polish-trap') && <Badge tone="amber">pułapka</Badge>}
      {item.custom && <Badge tone="sky">mój</Badge>}
    </div>
  )
}

/** Szczegóły elementu: kiedy używać, przykłady, połączenia, uwagi, wymowa. */
export function ItemDetails({ item, showUsage = true, compact = false }: { item: Item; showUsage?: boolean; compact?: boolean }) {
  return (
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      {showUsage && item.usage && <p className="text-zinc-600 dark:text-zinc-300">{item.usage}</p>}

      {item.type !== 'dialog' && item.example.length > 0 && (
        <div className="space-y-3">
          {item.example.map((ex, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <SpeakButton text={ex.en} slow={false} size="sm" />
              <div>
                <p className="font-medium">{ex.en}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{ex.pl}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.type === 'dialog' && <DialogLines item={item} />}

      {item.collocations && item.collocations.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-500">Typowe połączenia</p>
          <div className="flex flex-wrap gap-1.5">
            {item.collocations.map((c) => (
              <span key={c} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {item.note && (
        <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{item.note}</p>
        </div>
      )}

      {item.pronunciation && (
        <div className="flex gap-2 rounded-2xl bg-sky-50 p-3 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
          <MessageCircle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm">{item.pronunciation}</p>
        </div>
      )}
    </div>
  )
}

export function DialogLines({ item, hideRole, revealed = true }: { item: Item; hideRole?: 'A' | 'B'; revealed?: boolean }) {
  return (
    <div className="space-y-2">
      {item.example.map((line, i) => {
        const mine = hideRole && line.speaker === hideRole
        const showEn = !mine || revealed
        return (
          <div key={i} className={`flex gap-2 ${line.speaker === 'B' ? 'flex-row-reverse text-right' : ''}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                line.speaker === 'B' ? 'bg-violet-100 dark:bg-violet-950' : 'bg-zinc-100 dark:bg-zinc-800'
              }`}
            >
              <p className="text-xs font-bold text-zinc-500">{line.speaker === 'A' ? 'A' : 'B'}{mine ? ' (Ty)' : ''}</p>
              {showEn && <p className="font-medium">{line.en}</p>}
              <p className={`${showEn ? 'text-sm text-zinc-500 dark:text-zinc-400' : 'font-medium'}`}>{line.pl}</p>
            </div>
            {showEn && (
              <div className="self-center">
                <SpeakButton text={line.en} slow={false} size="sm" voice={line.speaker === 'B' ? 2 : 1} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
