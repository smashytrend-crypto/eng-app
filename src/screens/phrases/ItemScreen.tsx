import { Pencil, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ItemBadges, ItemDetails } from '../../components/ItemDetails'
import { SpeakButton } from '../../components/SpeakButton'
import { Button, Card, Muted, Screen } from '../../components/ui'
import { moduleById, vocabSetById } from '../../content'
import { db } from '../../db/db'
import { toggleFavorite } from '../../db/repo'
import { firstLettersHint } from '../../lib/exercises'
import { cardStatus, STATUS_LABELS } from '../../lib/stats'
import { formatInterval } from '../../lib/srs'
import { useAllItems, useCards, useFavorites } from '../../state/hooks'
import { goBack, navigate } from '../../state/router'

export function ItemScreen({ itemId }: { itemId: string }) {
  const all = useAllItems()
  const cards = useCards()
  const favorites = useFavorites()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hint, setHint] = useState(false)
  if (!all || !cards || !favorites) return <Screen back>{null}</Screen>
  const item = all.byId.get(itemId)
  if (!item) return <Screen title="Nie ma takiego elementu" back="/phrases">{null}</Screen>
  const card = cards.get(itemId)
  const status = cardStatus(card)
  const fav = favorites.has(itemId)
  const mod = moduleById.get(item.module)
  const answer = item.type === 'pattern' ? item.example[0].en : item.en

  return (
    <Screen
      back="/phrases"
      right={
        <button type="button" aria-label={fav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} onClick={() => toggleFavorite(itemId)} className="p-2">
          <Star size={26} className={fav ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'} />
        </button>
      }
    >
      <div className="space-y-4">
        <ItemBadges item={item} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-3xl font-bold leading-tight text-violet-900 dark:text-violet-100">{item.en}</p>
            <p className="mt-1 text-xl text-zinc-600 dark:text-zinc-300">{item.pl}</p>
          </div>
          {item.type !== 'dialog' && <SpeakButton text={answer} size="lg" />}
        </div>
        {item.alternatives.length > 0 && <Muted>Też: {item.alternatives.join(' · ')}</Muted>}
        <ItemDetails item={item} />

        <Card className="space-y-1 text-sm">
          <p>
            Status: <b>{STATUS_LABELS[status]}</b>
          </p>
          {card && status !== 'new' && (
            <p className="text-zinc-600 dark:text-zinc-400">
              Następna powtórka: {card.due <= Date.now() ? 'teraz' : `za ${formatInterval(card.due - Date.now())}`} · powtórek: {card.reps} · pomyłek: {card.lapses}
            </p>
          )}
          {mod && <p className="text-zinc-600 dark:text-zinc-400">Moduł: {mod.title}</p>}
          {vocabSetById.has(item.module) && (
            <p className="text-zinc-600 dark:text-zinc-400">Słownik: {vocabSetById.get(item.module)!.title}</p>
          )}
        </Card>

        {item.type !== 'dialog' && (
          <div>
            {hint ? (
              <p className="rounded-2xl bg-amber-50 p-3 font-mono text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">{firstLettersHint(answer)}</p>
            ) : (
              <button type="button" onClick={() => setHint(true)} className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                Pokaż podpowiedź z pierwszych liter
              </button>
            )}
          </div>
        )}

        {item.custom && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => navigate(`/custom/${encodeURIComponent(item.id)}`)}>
              <Pencil size={18} /> Edytuj
            </Button>
            {confirmDelete ? (
              <Button
                variant="danger"
                onClick={async () => {
                  await db.transaction('rw', [db.customItems, db.cards, db.favorites], async () => {
                    await db.customItems.delete(item.id)
                    await db.cards.delete(item.id)
                    await db.favorites.delete(item.id)
                  })
                  goBack('/phrases?tab=mine')
                }}
              >
                Na pewno?
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={18} /> Usuń
              </Button>
            )}
          </div>
        )}
      </div>
    </Screen>
  )
}
