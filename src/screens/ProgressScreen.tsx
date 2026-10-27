import { useLiveQuery } from 'dexie-react-hooks'
import { Award, Clock, Flame, Headphones } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Muted, ProgressBar, Screen, SectionTitle } from '../components/ui'
import { db, type DayRow } from '../db/db'
import { addDays, computeStreak, diffDays, formatDatePl, pluralN, weekKey } from '../lib/dates'
import { TYPE_LABELS } from '../lib/labels'
import { countItems } from '../lib/stats'
import { isVocab } from '../content/schema'
import { MASTERED_DAYS } from '../lib/srs'
import { useAllItems, useCards, useToday } from '../state/hooks'

const WEEKS = 18

function minutes(sec: number): string {
  const m = Math.round(sec / 60)
  if (m < 60) return `${m} min`
  return m % 60 ? `${Math.floor(m / 60)} godz. ${m % 60} min` : `${m / 60} godz.`
}

/** Poziom w kalendarzu: 0 brak, 1 trochę (<5 min), 2 (<15 min), 3 (15+ min). */
function level(d: DayRow | undefined): number {
  if (!d) return 0
  const active = d.seconds > 0 || d.reviews + d.newItems > 0
  if (!active) return 0
  if (d.seconds < 300) return 1
  if (d.seconds < 900) return 2
  return 3
}

const LEVEL_CLS = [
  'bg-zinc-100 dark:bg-zinc-800',
  'bg-violet-200 dark:bg-violet-900',
  'bg-violet-400 dark:bg-violet-700',
  'bg-violet-700 dark:bg-violet-400',
]

export function ProgressScreen() {
  const all = useAllItems()
  const cards = useCards()
  const today = useToday()
  const days = useLiveQuery(() => db.days.toArray(), [])
  const [selected, setSelected] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!all || !cards || !days) return null
    const byDay = new Map(days.map((d) => [d.dayKey, d]))
    const active = days.filter((d) => d.seconds > 0 || d.reviews + d.newItems > 0).map((d) => d.dayKey)
    const counts = countItems(all.items.filter((i) => !isVocab(i)), cards)
    const vocab = countItems(all.items.filter((i) => isVocab(i)), cards)
    const totalSec = days.reduce((s, d) => s + d.seconds, 0)
    const audioSec = days.reduce((s, d) => s + d.audioSeconds, 0)
    const week = Array.from({ length: 7 }, (_, i) => byDay.get(addDays(today, -i)))
    const weekSec = week.reduce((s, d) => s + (d?.seconds ?? 0), 0)
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const key = addDays(today, i - 13)
      const d = byDay.get(key)
      return { key, cards: (d?.reviews ?? 0) + (d?.newItems ?? 0), seconds: d?.seconds ?? 0 }
    })
    const firstMonday = addDays(weekKey(today), -7 * (WEEKS - 1))
    const grid = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(firstMonday, w * 7 + d)))
    return {
      byDay,
      counts,
      vocab,
      streak: computeStreak(active, today),
      activeDays: active.length,
      totalSec,
      audioSec,
      weekSec,
      last14,
      grid,
    }
  }, [all, cards, days, today])

  if (!data) return <Screen title="Postępy">{null}</Screen>
  const { counts } = data
  const maxCards = Math.max(1, ...data.last14.map((d) => d.cards))
  const sel = data.last14.find((d) => d.key === selected)

  return (
    <Screen title="Postępy">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <Award className="text-emerald-600" />
          <p className="mt-2 text-3xl font-bold">{counts.mastered}</p>
          <Muted>opanowanych (powtórka za {MASTERED_DAYS}+ dni)</Muted>
        </Card>
        <Card className="p-4">
          <Flame className={data.streak ? 'text-orange-500' : 'text-zinc-400'} />
          <p className="mt-2 text-3xl font-bold">{data.streak}</p>
          <Muted>{data.streak === 1 ? 'dzień serii' : 'dni serii'} · 1 dzień przerwy w tygodniu jej nie zrywa</Muted>
        </Card>
        <Card className="p-4">
          <Clock className="text-violet-600" />
          <p className="mt-2 text-2xl font-bold">{minutes(data.weekSec)}</p>
          <Muted>nauki w ostatnich 7 dniach</Muted>
        </Card>
        <Card className="p-4">
          <Headphones className="text-sky-600" />
          <p className="mt-2 text-2xl font-bold">{minutes(data.totalSec)}</p>
          <Muted>
            łącznie · {pluralN(data.activeDays, 'dzień', 'dni', 'dni')} nauki{data.audioSec > 0 ? ` · audio ${minutes(data.audioSec)}` : ''}
          </Muted>
        </Card>
      </div>

      <SectionTitle>Zwroty i słówka</SectionTitle>
      <Card className="space-y-4">
        <div className="flex items-end justify-between">
          <p className="text-lg font-bold">
            {counts.introduced} poznanych · {counts.mastered} opanowanych
          </p>
          <Muted>z {counts.total}</Muted>
        </div>
        {(['phrase', 'word', 'pattern', 'dialog'] as const).map((t) => {
          const c = counts.byType[t]
          if (!c.total) return null
          return (
            <div key={t} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{TYPE_LABELS[t]}</span>
                <span className="text-zinc-500 tabular-nums">
                  {c.mastered} / {c.introduced} / {c.total}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className="absolute inset-y-0 left-0 rounded-full bg-violet-300 dark:bg-violet-800" style={{ width: `${(c.introduced / c.total) * 100}%` }} />
                <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${(c.mastered / c.total) * 100}%` }} />
              </div>
            </div>
          )
        })}
        <div className="flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-full bg-emerald-500" /> opanowane
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3 rounded-full bg-violet-300 dark:bg-violet-800" /> poznane
          </span>
          <span>liczby: opanowane / poznane / wszystkie</span>
        </div>
      </Card>

      {data.vocab.total > 0 && (
        <>
          <SectionTitle>Słownik</SectionTitle>
          <Card className="space-y-2">
            <div className="flex items-end justify-between">
              <p className="text-lg font-bold">
                {data.vocab.introduced} poznanych · {data.vocab.mastered} opanowanych
              </p>
              <Muted>z {data.vocab.total}</Muted>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div className="absolute inset-y-0 left-0 rounded-full bg-sky-300 dark:bg-sky-800" style={{ width: `${(data.vocab.introduced / data.vocab.total) * 100}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500" style={{ width: `${(data.vocab.mastered / data.vocab.total) * 100}%` }} />
            </div>
            <Muted>Najczęściej używane słowa angielskie. Zaznaczone jako „już znam” liczą się od razu jako opanowane.</Muted>
          </Card>
        </>
      )}

      <SectionTitle>Karty dziennie (14 dni)</SectionTitle>
      <Card>
        <div className="flex h-32 items-end gap-[2px]" role="img" aria-label="Liczba kart dziennie w ostatnich 14 dniach">
          {data.last14.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setSelected(d.key === selected ? null : d.key)}
              className="group flex h-full flex-1 items-end"
              aria-label={`${formatDatePl(d.key, false)}: ${d.cards} kart`}
              title={`${formatDatePl(d.key, false)}: ${d.cards} kart, ${minutes(d.seconds)}`}
            >
              <span
                className={`block w-full rounded-t-[4px] ${d.key === selected ? 'bg-fuchsia-600' : 'bg-violet-500 group-hover:bg-violet-600'}`}
                style={{ height: d.cards ? `${Math.max(4, (d.cards / maxCards) * 100)}%` : '2px', opacity: d.cards ? 1 : 0.3 }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between border-t border-zinc-200 pt-1 text-xs text-zinc-500 dark:border-zinc-700">
          <span>{formatDatePl(data.last14[0].key, false)}</span>
          <span>dziś</span>
        </div>
        <p className="mt-2 min-h-5 text-sm text-zinc-600 dark:text-zinc-300">
          {sel
            ? `${formatDatePl(sel.key, false)}: ${pluralN(sel.cards, 'karta', 'karty', 'kart')}, ${minutes(sel.seconds)}`
            : data.last14.some((d) => d.cards)
              ? `Najwięcej: ${pluralN(maxCards, 'karta', 'karty', 'kart')} dziennie. Dotknij słupka, by zobaczyć dzień.`
              : 'Brak kart w ostatnich 14 dniach — zacznij lekcję na ekranie „Dziś”.'}
        </p>
      </Card>

      <SectionTitle>Kalendarz aktywności</SectionTitle>
      <Card>
        <div className="flex gap-[3px] overflow-x-auto">
          <div className="mr-1 flex flex-col gap-[3px] text-[10px] leading-[14px] text-zinc-400">
            {['pn', '', 'śr', '', 'pt', '', 'nd'].map((d, i) => (
              <span key={i} className="h-3.5">
                {d}
              </span>
            ))}
          </div>
          {data.grid.map((week, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {week.map((key) => {
                const future = diffDays(today, key) > 0
                const d = data.byDay.get(key)
                return (
                  <span
                    key={key}
                    title={`${formatDatePl(key, false)}${d ? `: ${minutes(d.seconds)}` : ''}`}
                    className={`block h-3.5 w-3.5 rounded-[3px] ${future ? 'bg-transparent' : LEVEL_CLS[level(d)]} ${key === today ? 'ring-2 ring-fuchsia-500' : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs text-zinc-500">
          mniej
          {LEVEL_CLS.map((c, i) => (
            <span key={i} className={`h-3 w-3 rounded-[3px] ${c}`} />
          ))}
          więcej (0 / do 5 / do 15 / 15+ min)
        </div>
      </Card>

      <SectionTitle>Do celu</SectionTitle>
      <Card className="space-y-2">
        <ProgressBar value={counts.mastered / Math.max(1, counts.total)} color="bg-emerald-500" className="h-3" />
        <Muted>
          Opanowane {Math.round((counts.mastered / Math.max(1, counts.total)) * 100)}% programu. „Opanowany” znaczy, że następna powtórka jest
          za {MASTERED_DAYS} dni lub później — pamiętasz go naprawdę dobrze.
        </Muted>
      </Card>
    </Screen>
  )
}
