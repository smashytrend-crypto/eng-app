import { useEffect, useState } from 'react'
import { Button, Card, Muted, Screen, Segmented } from '../../components/ui'
import type { Item } from '../../content/schema'
import { db } from '../../db/db'
import { goBack } from '../../state/router'

type Kind = 'phrase' | 'word'

const input =
  'w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-lg outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900'

/** Dodawanie / edycja własnego zwrotu lub słówka. Trafia do najbliższej lekcji i powtórek. */
export function CustomItemForm({ itemId }: { itemId?: string }) {
  const [kind, setKind] = useState<Kind>('phrase')
  const [en, setEn] = useState('')
  const [pl, setPl] = useState('')
  const [exEn, setExEn] = useState('')
  const [exPl, setExPl] = useState('')
  const [note, setNote] = useState('')
  const [existing, setExisting] = useState<Item | null>(null)

  useEffect(() => {
    if (!itemId) return
    void db.customItems.get(itemId).then((i) => {
      if (!i) return
      setExisting(i)
      setKind(i.type === 'word' ? 'word' : 'phrase')
      setEn(i.en)
      setPl(i.pl)
      const ex = i.example[0]
      if (ex && (ex.en !== i.en || ex.pl !== i.pl)) {
        setExEn(ex.en)
        setExPl(ex.pl)
      }
      setNote(i.note ?? '')
    })
  }, [itemId])

  const valid = en.trim() && pl.trim()

  const save = async () => {
    if (!valid) return
    const id = existing?.id ?? `u.custom.${Date.now().toString(36)}`
    const item: Item = {
      id,
      type: kind,
      stage: 0,
      module: 'custom',
      order: existing?.order ?? Date.now(),
      en: en.trim(),
      pl: pl.trim(),
      alternatives: [],
      usage: 'Twój własny zwrot.',
      register: 'neutral',
      example: exEn.trim() ? [{ en: exEn.trim(), pl: exPl.trim() || pl.trim() }] : [{ en: en.trim(), pl: pl.trim() }],
      ...(kind === 'word' ? { collocations: [] } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      tags: ['custom'],
      level: 'A2',
      custom: true,
    }
    await db.customItems.put(item)
    goBack('/phrases?tab=mine')
  }

  return (
    <Screen title={existing ? 'Edytuj zwrot' : 'Nowy zwrot'} back="/phrases?tab=mine">
      <Card className="space-y-4">
        <Segmented<Kind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'phrase', label: 'Zwrot' },
            { value: 'word', label: 'Słówko' },
          ]}
        />
        <label className="block space-y-1">
          <span className="font-semibold">Po angielsku *</span>
          <input className={input} value={en} onChange={(e) => setEn(e.target.value)} placeholder="np. I'm knackered." lang="en" autoCapitalize="sentences" />
        </label>
        <label className="block space-y-1">
          <span className="font-semibold">Po polsku *</span>
          <input className={input} value={pl} onChange={(e) => setPl(e.target.value)} placeholder="np. Jestem wykończony." />
        </label>
        <label className="block space-y-1">
          <span className="font-semibold">Przykład po angielsku</span>
          <input className={input} value={exEn} onChange={(e) => setExEn(e.target.value)} placeholder="opcjonalnie — zdanie z kontekstem" lang="en" />
        </label>
        {exEn.trim() && (
          <label className="block space-y-1">
            <span className="font-semibold">Przykład po polsku</span>
            <input className={input} value={exPl} onChange={(e) => setExPl(e.target.value)} />
          </label>
        )}
        <label className="block space-y-1">
          <span className="font-semibold">Notatka</span>
          <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcjonalnie — skąd to znasz, kiedy używać" />
        </label>
        <Muted>Nowe własne zwroty pojawią się na początku najbliższej lekcji, a potem w powtórkach.</Muted>
        <Button full onClick={save} disabled={!valid}>
          Zapisz
        </Button>
      </Card>
    </Screen>
  )
}
