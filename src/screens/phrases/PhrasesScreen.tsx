import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Dumbbell, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ItemRow, StatusLegend } from '../../components/ItemRow'
import { Button, Card, Muted, ProgressBar, Screen, Segmented } from '../../components/ui'
import { itemsOfModule, modulesOfStage, stages } from '../../content'
import { db } from '../../db/db'
import { firstLettersHint } from '../../lib/exercises'
import { searchItems } from '../../lib/search'
import { hardItemIds } from '../../lib/stats'
import { State } from '../../lib/srs'
import { useAllItems, useCards, useCustomItems, useFavorites } from '../../state/hooks'
import { startHardPractice } from '../../state/lesson'
import { navigate, queryParam, useRoute } from '../../state/router'

type Tab = 'stages' | 'favorites' | 'hard' | 'mine'

export function PhrasesScreen() {
  const route = useRoute()
  const all = useAllItems()
  const cards = useCards()
  const favorites = useFavorites()
  const [query, setQuery] = useState('')
  const tab = (queryParam(route, 'tab') as Tab | null) ?? 'stages'
  const setTab = (t: Tab) => navigate(`/phrases?tab=${t}`, { replace: true })

  const results = useMemo(() => (all && query.trim() ? searchItems(all.items, query) : []), [all, query])

  if (!all || !cards || !favorites) return <Screen title="Rozmówki">{null}</Screen>

  return (
    <Screen title="Rozmówki">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj po polsku lub angielsku…"
          className="w-full rounded-2xl border-2 border-zinc-200 bg-white py-3.5 pl-12 pr-10 text-lg outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {query && (
          <button type="button" aria-label="Wyczyść" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400">
            <X size={20} />
          </button>
        )}
      </div>

      {query.trim() ? (
        <Card className="mt-4 py-1">
          {results.length ? (
            results.map((i) => <ItemRow key={i.id} item={i} card={cards.get(i.id)} favorite={favorites.has(i.id)} />)
          ) : (
            <Muted className="py-4">Nic nie znalazłem. Możesz dodać własny zwrot w zakładce „Moje”.</Muted>
          )}
        </Card>
      ) : (
        <>
          <div className="mt-4">
            <Segmented<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: 'stages', label: 'Etapy' },
                { value: 'favorites', label: 'Ulubione' },
                { value: 'hard', label: 'Trudne' },
                { value: 'mine', label: 'Moje' },
              ]}
            />
          </div>
          <div className="mt-4">
            {tab === 'stages' && <StagesList />}
            {tab === 'favorites' && <FavoritesList />}
            {tab === 'hard' && <HardList />}
            {tab === 'mine' && <MineList />}
          </div>
        </>
      )}
    </Screen>
  )
}

function StagesList() {
  const cards = useCards()
  const [open, setOpen] = useState<number | null>(null)
  if (!cards) return null
  return (
    <div className="space-y-3">
      <StatusLegend />
      {stages.map((s) => {
        const mods = modulesOfStage(s.id)
        const items = mods.flatMap((m) => itemsOfModule(m.id))
        const known = items.filter((i) => cards.get(i.id) && cards.get(i.id)!.state !== State.New).length
        return (
          <Card key={s.id} className="p-4">
            <button type="button" className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                {s.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{s.title}</span>
                <span className="block text-sm text-zinc-500">
                  {mods.length ? `${mods.length} modułów · ${known}/${items.length} poznanych` : 'wkrótce'}
                </span>
              </span>
              <ChevronRight className={`shrink-0 text-zinc-400 transition ${open === s.id ? 'rotate-90' : ''}`} />
            </button>
            {items.length > 0 && <ProgressBar value={known / items.length} className="mt-3 h-1.5" />}
            {open === s.id && (
              <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
                {mods.map((m) => {
                  const mi = itemsOfModule(m.id)
                  const k = mi.filter((i) => cards.get(i.id) && cards.get(i.id)!.state !== State.New).length
                  return (
                    <button key={m.id} type="button" onClick={() => navigate(`/phrases/module/${m.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{m.title}</span>
                        <span className="block text-sm text-zinc-500">
                          {m.titleEn} · {k}/{mi.length}
                        </span>
                      </span>
                      <ChevronRight size={18} className="text-zinc-400" />
                    </button>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function FavoritesList() {
  const all = useAllItems()
  const cards = useCards()
  const favorites = useFavorites()
  if (!all || !cards || !favorites) return null
  const items = [...favorites].map((id) => all.byId.get(id)).filter((i) => !!i)
  if (!items.length) return <Muted>Dotknij gwiazdki przy zwrocie, żeby mieć go tutaj pod ręką — np. na wyjazd.</Muted>
  return (
    <Card className="py-1">
      {items.map((i) => (
        <ItemRow key={i!.id} item={i!} card={cards.get(i!.id)} favorite />
      ))}
    </Card>
  )
}

function HardList() {
  const all = useAllItems()
  const cards = useCards()
  const favorites = useFavorites()
  const logs = useLiveQuery(() => db.reviewLogs.toArray(), [])
  if (!all || !cards || !favorites || !logs) return null
  const ids = hardItemIds(cards, logs, new Date()).filter((id) => all.byId.has(id))
  if (!ids.length) {
    return <Muted>Na razie nic tu nie ma. Gdy jakiś zwrot będzie ci często uciekał, pojawi się tutaj z podpowiedziami.</Muted>
  }
  return (
    <div className="space-y-3">
      <Button
        full
        onClick={async () => {
          const s = await startHardPractice()
          if (s) navigate('/lesson')
        }}
      >
        <Dumbbell size={20} /> Ćwicz trudne ({Math.min(15, ids.length)})
      </Button>
      <Card className="py-1">
        {ids.map((id) => {
          const item = all.byId.get(id)!
          const answer = item.type === 'pattern' ? item.example[0].en : item.en
          return (
            <ItemRow
              key={id}
              item={item}
              card={cards.get(id)}
              favorite={favorites.has(id)}
              extra={
                <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                  Podpowiedź: {firstLettersHint(answer)}
                </span>
              }
            />
          )
        })}
      </Card>
    </div>
  )
}

function MineList() {
  const custom = useCustomItems()
  const cards = useCards()
  const favorites = useFavorites()
  if (!custom || !cards || !favorites) return null
  return (
    <div className="space-y-3">
      <Button full onClick={() => navigate('/custom/new')}>
        <Plus size={20} /> Dodaj własny zwrot lub słówko
      </Button>
      {custom.length ? (
        <Card className="py-1">
          {[...custom]
            .sort((a, b) => b.order - a.order)
            .map((i) => (
              <ItemRow key={i.id} item={i} card={cards.get(i.id)} favorite={favorites.has(i.id)} />
            ))}
        </Card>
      ) : (
        <Muted>Usłyszałeś coś ciekawego? Dodaj to tutaj — trafi do najbliższej lekcji i do powtórek.</Muted>
      )}
    </div>
  )
}
