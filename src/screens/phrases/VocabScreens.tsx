import { Check, CheckCheck, ChevronRight, Circle, Search, Undo2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SpeakButton } from '../../components/SpeakButton'
import { Button, Card, Muted, ProgressBar, Screen } from '../../components/ui'
import { itemsOfModule, vocabItems, vocabSetById, vocabSets } from '../../content'
import type { Item, VocabLevel } from '../../content/schema'
import { isMarkedKnown, markItemsKnown, unmarkKnown } from '../../db/repo'
import { fold } from '../../lib/search'
import { isMastered, State, type StoredCard } from '../../lib/srs'
import { useCards } from '../../state/hooks'
import { navigate } from '../../state/router'

const LEVEL_INFO: Record<VocabLevel, string> = {
  A1: 'A1 · podstawy',
  A2: 'A2 · codzienność',
  B1: 'B1 · swobodna rozmowa',
  B2: 'B2 · bogatszy język',
}

/** „Umiem” = słowo odhaczone albo opanowane w powtórkach (następna powtórka za 21+ dni). */
const known = (card: StoredCard | undefined) => isMastered(card)
const learning = (card: StoredCard | undefined) => !!card && card.state !== State.New && !isMastered(card)

/** Haczyk „Umiem” przy słowie: dotknij, żeby odhaczyć; odhaczone ręcznie można cofnąć. */
function KnownToggle({ item, card }: { item: Item; card: StoredCard | undefined }) {
  const isKnown = known(card)
  const canUndo = isKnown && isMarkedKnown(card)
  const onClick = () => {
    if (!isKnown) void markItemsKnown([item.id])
    else if (canUndo) void unmarkKnown(item.id)
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isKnown && !canUndo}
      aria-label={isKnown ? (canUndo ? `Cofnij „umiem”: ${item.en}` : `Opanowane: ${item.en}`) : `Umiem: ${item.en}`}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-95 ${
        isKnown
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-zinc-300 text-zinc-300 hover:border-emerald-500 hover:text-emerald-500 dark:border-zinc-600 dark:text-zinc-600'
      }`}
    >
      <Check size={22} strokeWidth={3} />
    </button>
  )
}

function VocabRow({ item, card }: { item: Item; card: StoredCard | undefined }) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 py-2.5 last:border-0 dark:border-zinc-800">
      <SpeakButton text={item.en} slow={false} size="sm" />
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/item/${encodeURIComponent(item.id)}`)}>
        <p className="font-semibold leading-snug">{item.en}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {item.pl}
          {learning(card) && <span className="ml-1 text-amber-600 dark:text-amber-400">· uczę się</span>}
        </p>
      </button>
      <KnownToggle item={item} card={card} />
    </div>
  )
}

/** Zakładka „Słownik” w Rozmówkach: zestawy słów od najprostszych i najczęstszych. */
export function VocabList() {
  const cards = useCards()
  if (!cards) return null
  if (!vocabSets.length) return <Muted>Słownik jest w przygotowaniu.</Muted>
  const knownCount = vocabItems.filter((i) => known(cards.get(i.id))).length
  const learningCount = vocabItems.filter((i) => learning(cards.get(i.id))).length
  const levels = [...new Set(vocabSets.map((s) => s.level))]
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <p className="text-lg font-bold">Umiem: {knownCount}</p>
          <Muted>z {vocabItems.length} słów</Muted>
        </div>
        <ProgressBar value={knownCount / vocabItems.length} color="bg-emerald-500" className="h-2" />
        {learningCount > 0 && <Muted>W trakcie nauki: {learningCount}</Muted>}
        <Muted>
          Przy każdym słowie jest haczyk <Check size={14} className="inline" strokeWidth={3} /> — dotknij, jeśli już je umiesz. Trafi do Twoich słów i
          nie będzie zajmować czasu w lekcjach.
        </Muted>
        <Button full variant="secondary" onClick={() => navigate('/vocab/known')}>
          <CheckCheck size={20} /> Słowa, które umiem ({knownCount})
        </Button>
      </Card>
      {levels.map((level) => (
        <div key={level} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">{LEVEL_INFO[level]}</h2>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {vocabSets
              .filter((s) => s.level === level)
              .map((s) => {
                const items = itemsOfModule(s.id)
                const k = items.filter((i) => known(cards.get(i.id))).length
                return (
                  <button key={s.id} type="button" onClick={() => navigate(`/vocab/${s.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.title}</span>
                      <span className="block truncate text-sm text-zinc-500">
                        umiem {k}/{items.length} · {items.slice(0, 6).map((i) => i.en).join(', ')}…
                      </span>
                      <ProgressBar value={k / items.length} color="bg-emerald-500" className="mt-2 h-1" />
                    </span>
                    {k === items.length ? <Check size={18} className="text-emerald-600" /> : <ChevronRight size={18} className="text-zinc-400" />}
                  </button>
                )
              })}
          </Card>
        </div>
      ))}
    </div>
  )
}

/** Zestaw słownika: lista słów z haczykiem „Umiem”. */
export function VocabSetScreen({ setId }: { setId: string }) {
  const cards = useCards()
  const [confirmAll, setConfirmAll] = useState(false)
  const set = vocabSetById.get(setId)
  if (!set) return <Screen title="Nie ma takiego zestawu" back="/phrases?tab=vocab">{null}</Screen>
  const items = itemsOfModule(setId)
  if (!cards) return <Screen title={set.title} back="/phrases?tab=vocab">{null}</Screen>
  const notKnown = items.filter((i) => !known(cards.get(i.id)))
  const k = items.length - notKnown.length

  return (
    <Screen title={set.title} back="/phrases?tab=vocab">
      <Muted>{LEVEL_INFO[set.level]}</Muted>
      <p className="mt-2 text-zinc-700 dark:text-zinc-300">{set.description}</p>
      <Card className="mt-4 space-y-2">
        <div className="flex items-end justify-between">
          <p className="font-bold">Umiem: {k}</p>
          <Muted>z {items.length}</Muted>
        </div>
        <ProgressBar value={k / items.length} color="bg-emerald-500" className="h-2" />
        <Muted>
          Dotknij haczyka <Check size={14} className="inline" strokeWidth={3} /> przy słowach, które już umiesz. Pomyłka? Dotknij jeszcze raz, żeby cofnąć.
        </Muted>
        {notKnown.length > 0 &&
          (confirmAll ? (
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmAll(false)}>
                Anuluj
              </Button>
              <Button
                className="flex-[2]"
                onClick={async () => {
                  await markItemsKnown(notKnown.map((i) => i.id))
                  setConfirmAll(false)
                }}
              >
                <CheckCheck size={20} /> Tak, umiem wszystkie
              </Button>
            </div>
          ) : (
            <Button variant="secondary" full onClick={() => setConfirmAll(true)}>
              <CheckCheck size={20} /> Umiem wszystkie z tego zestawu ({notKnown.length})
            </Button>
          ))}
      </Card>
      <Card className="mt-4 py-1">
        {items.map((i) => (
          <VocabRow key={i.id} item={i} card={cards.get(i.id)} />
        ))}
      </Card>
    </Screen>
  )
}

/** „Słowa, które umiem” — odhaczone i opanowane, z wyszukiwarką. */
export function VocabKnownScreen() {
  const cards = useCards()
  const [query, setQuery] = useState('')
  const list = useMemo(() => (cards ? vocabItems.filter((i) => known(cards.get(i.id))) : []), [cards])
  const q = fold(query.trim())
  const shown = q ? list.filter((i) => fold(i.en).includes(q) || fold(i.pl).includes(q)) : list
  return (
    <Screen title="Słowa, które umiem" back="/phrases?tab=vocab">
      <p className="text-lg font-bold">{list.length} słów</p>
      <Muted>Wrócą do szybkiego sprawdzenia za kilka tygodni — żeby na pewno zostały w głowie.</Muted>
      {list.length > 8 && (
        <div className="relative mt-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj…"
            className="w-full rounded-2xl border-2 border-zinc-200 bg-white py-3 pl-12 pr-4 outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}
      {cards &&
        (list.length ? (
          <Card className="mt-4 py-1">
            {shown.map((i) => (
              <VocabRow key={i.id} item={i} card={cards.get(i.id)} />
            ))}
          </Card>
        ) : (
          <Card className="mt-4 space-y-2">
            <p className="flex items-center gap-2 font-semibold">
              <Circle size={18} /> Jeszcze pusto
            </p>
            <Muted>Wejdź w zestaw w Słowniku i dotknij haczyka przy słowach, które znasz.</Muted>
            <Button variant="ghost" onClick={() => navigate('/phrases?tab=vocab')}>
              <Undo2 size={18} /> Wróć do Słownika
            </Button>
          </Card>
        ))}
    </Screen>
  )
}
