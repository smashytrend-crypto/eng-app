import { ItemRow, StatusLegend } from '../../components/ItemRow'
import { Card, Muted, Screen } from '../../components/ui'
import { itemsOfModule, moduleById, stageById } from '../../content'
import { TYPE_LABELS } from '../../lib/labels'
import { useCards, useFavorites } from '../../state/hooks'

export function ModuleScreen({ moduleId }: { moduleId: string }) {
  const cards = useCards()
  const favorites = useFavorites()
  const mod = moduleById.get(moduleId)
  if (!mod) return <Screen title="Nie ma takiego modułu" back="/phrases">{null}</Screen>
  const items = itemsOfModule(moduleId)
  const stage = stageById.get(mod.stage)
  const groups = (['phrase', 'word', 'pattern', 'dialog'] as const).map((t) => ({ t, items: items.filter((i) => i.type === t) })).filter((g) => g.items.length)
  return (
    <Screen title={mod.title} back="/phrases">
      <Muted>
        Etap {mod.stage}: {stage?.title} · {mod.titleEn}
      </Muted>
      <p className="mt-2 text-zinc-700 dark:text-zinc-300">{mod.description}</p>
      <div className="mt-3">
        <StatusLegend />
      </div>
      {cards &&
        favorites &&
        groups.map((g) => (
          <div key={g.t} className="mt-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-500">
              {TYPE_LABELS[g.t]} ({g.items.length})
            </h2>
            <Card className="py-1">
              {g.items.map((i) => (
                <ItemRow key={i.id} item={i} card={cards.get(i.id)} favorite={favorites.has(i.id)} />
              ))}
            </Card>
          </div>
        ))}
    </Screen>
  )
}
