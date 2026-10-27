import { Check, CheckCheck, ChevronRight, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { ItemRow, StatusLegend } from '../../components/ItemRow'
import { Button, Card, Muted, ProgressBar, Screen } from '../../components/ui'
import { itemsOfModule, vocabItems, vocabSetById, vocabSets } from '../../content'
import type { VocabLevel } from '../../content/schema'
import { saveCards } from '../../db/repo'
import { knownWordCard, knownWordDays, State, type StoredCard } from '../../lib/srs'
import { useCards, useFavorites } from '../../state/hooks'
import { navigate } from '../../state/router'

const LEVEL_INFO: Record<VocabLevel, string> = {
  A1: 'A1 · podstawy',
  A2: 'A2 · codzienność',
  B1: 'B1 · swobodna rozmowa',
  B2: 'B2 · bogatszy język',
}

const seen = (card: StoredCard | undefined) => !!card && card.state !== State.New

/** Zakładka „Słownik” w Rozmówkach: zestawy słów od najprostszych i najczęstszych. */
export function VocabList() {
  const cards = useCards()
  if (!cards) return null
  if (!vocabSets.length) return <Muted>Słownik jest w przygotowaniu.</Muted>
  const known = vocabItems.filter((i) => seen(cards.get(i.id))).length
  const levels = [...new Set(vocabSets.map((s) => s.level))]
  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <p className="font-bold">
          {known} / {vocabItems.length} słów poznanych
        </p>
        <ProgressBar value={known / vocabItems.length} className="h-2" />
        <Muted>
          Najczęściej używane słowa angielskie, od najprostszych. Nowe wchodzą do lekcji same (ile dziennie — w Ustawieniach). Te, które już znasz,
          odhacz w zestawie — nie będziesz tracić na nie czasu.
        </Muted>
      </Card>
      {levels.map((level) => (
        <div key={level} className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">{LEVEL_INFO[level]}</h2>
          <Card className="divide-y divide-zinc-100 py-1 dark:divide-zinc-800">
            {vocabSets
              .filter((s) => s.level === level)
              .map((s) => {
                const items = itemsOfModule(s.id)
                const k = items.filter((i) => seen(cards.get(i.id))).length
                return (
                  <button key={s.id} type="button" onClick={() => navigate(`/vocab/${s.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{s.title}</span>
                      <span className="block truncate text-sm text-zinc-500">
                        {k}/{items.length} · {items.slice(0, 6).map((i) => i.en).join(', ')}…
                      </span>
                      <ProgressBar value={k / items.length} className="mt-2 h-1" />
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

/** Zestaw słownika: lista słów + szybkie odhaczanie tych, które już znasz. */
export function VocabSetScreen({ setId }: { setId: string }) {
  const cards = useCards()
  const favorites = useFavorites()
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const set = vocabSetById.get(setId)
  if (!set) return <Screen title="Nie ma takiego zestawu" back="/phrases?tab=vocab">{null}</Screen>
  const items = itemsOfModule(setId)
  if (!cards || !favorites) return <Screen title={set.title} back="/phrases?tab=vocab">{null}</Screen>
  const fresh = items.filter((i) => !seen(cards.get(i.id)))

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const save = async () => {
    setSaving(true)
    const now = new Date()
    await saveCards([...picked].map((id) => knownWordCard(id, now, knownWordDays(id))))
    setPicked(new Set())
    setPicking(false)
    setSaving(false)
  }

  return (
    <Screen title={set.title} back="/phrases?tab=vocab">
      <Muted>{LEVEL_INFO[set.level]}</Muted>
      <p className="mt-2 text-zinc-700 dark:text-zinc-300">{set.description}</p>

      {picking ? (
        <div className="mt-4 space-y-3">
          <Muted>Dotknij słów, które znasz (wiesz, co znaczą i umiesz je powiedzieć). Wrócą do sprawdzenia za kilka tygodni.</Muted>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setPicked(new Set(fresh.map((i) => i.id)))}>
              <CheckCheck size={18} /> Wszystkie
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setPicked(new Set())}>
              Wyczyść
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {items.map((i) => {
              const done = seen(cards.get(i.id))
              const on = picked.has(i.id)
              return (
                <button
                  key={i.id}
                  type="button"
                  disabled={done}
                  onClick={() => toggle(i.id)}
                  className={`rounded-2xl border-2 px-3 py-2 text-left transition ${
                    done
                      ? 'border-transparent bg-emerald-50 text-emerald-800 opacity-60 dark:bg-emerald-950 dark:text-emerald-200'
                      : on
                        ? 'border-violet-600 bg-violet-600 text-white'
                        : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                  }`}
                >
                  <span className="block font-semibold">{i.en}</span>
                  <span className={`block text-xs ${on ? 'text-violet-100' : 'text-zinc-500'}`}>{i.pl}</span>
                </button>
              )
            })}
          </div>
          <div className="sticky bottom-24 flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => { setPicking(false); setPicked(new Set()) }}>
              Anuluj
            </Button>
            <Button className="flex-[2]" disabled={!picked.size || saving} onClick={save}>
              <Check size={20} /> Znam te ({picked.size})
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {fresh.length > 0 && (
            <Button full variant="secondary" onClick={() => setPicking(true)}>
              <ListChecks size={20} /> Odhacz słowa, które już znasz
            </Button>
          )}
          <StatusLegend />
          <Card className="py-1">
            {items.map((i) => (
              <ItemRow key={i.id} item={i} card={cards.get(i.id)} favorite={favorites.has(i.id)} />
            ))}
          </Card>
        </div>
      )}
    </Screen>
  )
}
