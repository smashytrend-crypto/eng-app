import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarHeart, Check, Flag, Plane, Plus, Sparkles, Sun, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge, Button, Card, Muted, ProgressBar, Screen, SectionTitle, Segmented } from '../../components/ui'
import { contentItems, itemsOfModule, modulesOfStage, priorityModuleIds, stages, vocabItems } from '../../content'
import { db, type Trip } from '../../db/db'
import { addDays, diffDays, formatDatePl, isWeekend, pluralN } from '../../lib/dates'
import { computePlan, planMessage, stageSchedule, tripPlan } from '../../lib/plan'
import { State } from '../../lib/srs'
import { currentStage } from '../../lib/stats'
import { useCards, useSettings, useToday } from '../../state/hooks'
import { navigate } from '../../state/router'

export function PathScreen() {
  const settings = useSettings()
  const cards = useCards()
  const today = useToday()
  const trips = useLiveQuery(() => db.trips.orderBy('date').toArray(), [])

  const data = useMemo(() => {
    if (!settings || !cards) return null
    const known = (id: string) => {
      const c = cards.get(id)
      return !!c && c.state !== State.New
    }
    const introduced = contentItems.filter((i) => known(i.id)).length
    const plan = computePlan({
      today,
      startDate: settings.startDate,
      targetDate: settings.targetDate,
      totalItems: contentItems.length,
      introduced,
      newPerDay: settings.newPerDay,
    })
    const schedule = stageSchedule(stages, settings.startDate, settings.targetDate)
    const stageRows = stages.map((s, idx) => {
      const items = modulesOfStage(s.id).flatMap((m) => itemsOfModule(m.id))
      const k = items.filter((i) => known(i.id)).length
      return { stage: s, total: items.length, known: k, from: schedule[idx].from, to: schedule[idx].to }
    })
    const planStage = stageRows.find((r) => today >= r.from && today <= r.to)?.stage.id ?? (today < stageRows[0].from ? 1 : 8)
    return { plan, introduced, stageRows, planStage, current: currentStage(contentItems, cards), known }
  }, [settings, cards, today])

  if (!settings || !data || !trips) return <Screen title="Ścieżka do wakacji">{null}</Screen>
  const { plan, introduced, stageRows, planStage, current } = data

  return (
    <Screen title="Ścieżka do wakacji">
      <Card className="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold opacity-90">
          <Sun size={18} /> Cel: {formatDatePl(settings.targetDate)}
        </div>
        <p className="mt-2 text-5xl font-black">{Math.max(0, plan.daysLeft)}</p>
        <p className="text-lg font-semibold">dni do wakacji · ok. {plan.weeksLeft} tygodni</p>
      </Card>

      <SectionTitle>Plan</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <p className="text-lg font-bold">
            {introduced} / {contentItems.length}
          </p>
          <Muted>poznanych elementów</Muted>
        </div>
        <ProgressBar value={introduced / Math.max(1, contentItems.length)} className="h-3" />
        <p className="text-zinc-700 dark:text-zinc-200">{planMessage(plan, settings.newPerDay)}</p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <p className="text-2xl font-bold">{settings.newPerDay}</p>
            <p className="text-xs font-semibold text-zinc-500">nowych dziennie (teraz)</p>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <p className="text-2xl font-bold">{plan.requiredPerDay}</p>
            <p className="text-xs font-semibold text-zinc-500">potrzeba, by zdążyć</p>
          </div>
        </div>
        {plan.projectedFinish && plan.status !== 'done' && (
          <Muted>
            W obecnym tempie cały program poznasz ok. {formatDatePl(plan.projectedFinish)}. Ostatnie 2 tygodnie przed celem to powtórki i
            próba generalna.
          </Muted>
        )}
        <Button variant="secondary" size="md" full onClick={() => navigate('/settings')}>
          Zmień tempo w ustawieniach
        </Button>
      </Card>

      {vocabItems.length > 0 && <VocabCard known={vocabItems.filter((i) => data.known(i.id)).length} perDay={settings.vocabPerDay} today={today} />}

      <MissionLink today={today} />

      <SectionTitle>Etapy</SectionTitle>
      <div className="space-y-2">
        {stageRows.map((r) => {
          const done = r.total > 0 && r.known === r.total
          const isCurrent = r.stage.id === current && !done
          return (
            <Card key={r.stage.id} className={`p-4 ${isCurrent ? 'border-violet-400 dark:border-violet-700' : ''}`}>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                    done ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                  }`}
                >
                  {done ? <Check size={18} /> : r.stage.id}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{r.stage.title}</p>
                    {isCurrent && <Badge tone="violet">tu jesteś</Badge>}
                    {r.stage.id === planStage && !isCurrent && !done && <Badge tone="amber">wg planu teraz</Badge>}
                  </div>
                  <p className="text-sm text-zinc-500">
                    {formatDatePl(r.from, false)} – {formatDatePl(r.to, false)} · {r.known}/{r.total}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.stage.description}</p>
                  {r.total > 0 && <ProgressBar value={r.known / r.total} className="mt-2 h-1.5" color={done ? 'bg-emerald-500' : 'bg-violet-600'} />}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <SectionTitle>Wyjazdy</SectionTitle>
      <Trips trips={trips} today={today} known={data.known} />
    </Screen>
  )
}

function MissionLink({ today }: { today: string }) {
  const weekend = isWeekend(today)
  return (
    <Card className={`mt-4 flex items-center gap-3 ${weekend ? 'border-fuchsia-300 dark:border-fuchsia-800' : ''}`}>
      <Sparkles className="shrink-0 text-fuchsia-600" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Misja weekendowa</p>
        <Muted>{weekend ? 'Dziś jest dzień misji! Dłuższa scenka z materiałem z całego tygodnia.' : 'Najlepiej w sobotę lub niedzielę — ale możesz zrobić ją kiedy chcesz.'}</Muted>
      </div>
      <Button size="md" variant={weekend ? 'primary' : 'secondary'} onClick={() => navigate('/mission')}>
        Start
      </Button>
    </Card>
  )
}

function Trips({ trips, today, known }: { trips: Trip[]; today: string; known: (id: string) => boolean }) {
  const [adding, setAdding] = useState(false)
  const [date, setDate] = useState('')
  const [occasion, setOccasion] = useState('')
  const [kind, setKind] = useState<Trip['kind']>('festival')
  const upcoming = trips.filter((t) => t.date >= today)
  const past = trips.filter((t) => t.date < today)

  const add = async () => {
    if (!date || !occasion.trim()) return
    await db.trips.add({ date, occasion: occasion.trim(), kind })
    setAdding(false)
    setDate('')
    setOccasion('')
  }

  return (
    <div className="space-y-2">
      <Muted>Dodaj wyjazd — moduły podróżne{kind === 'festival' ? ' i festiwalowe' : ''} dostaną pierwszeństwo w nowych elementach przed tym terminem (do 4 miesięcy wcześniej).</Muted>
      {upcoming.map((t) => {
        const prio = priorityModuleIds(t.kind === 'festival' ? ['travel', 'festival'] : ['travel'])
        const left = contentItems.filter((i) => prio.has(i.module) && !known(i.id)).length
        const tp = tripPlan(today, t.date, left)
        return (
          <Card key={t.id} className="flex items-start gap-3 p-4">
            {t.kind === 'festival' ? <CalendarHeart className="shrink-0 text-fuchsia-600" /> : <Plane className="shrink-0 text-sky-600" />}
            <div className="min-w-0 flex-1">
              <p className="font-bold">{t.occasion}</p>
              <p className="text-sm text-zinc-500">
                {formatDatePl(t.date)} · za {pluralN(tp.daysToTrip, 'dzień', 'dni', 'dni')}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {left === 0
                  ? 'Wszystkie zwroty na ten wyjazd już poznane!'
                  : `Do poznania: ${left} zwrotów podróżnych${t.kind === 'festival' ? ' i festiwalowych' : ''} — ok. ${tp.perDay} dziennie.`}
              </p>
            </div>
            <button type="button" aria-label="Usuń wyjazd" onClick={() => t.id && db.trips.delete(t.id)} className="p-1 text-zinc-400">
              <Trash2 size={18} />
            </button>
          </Card>
        )
      })}
      {adding ? (
        <Card className="space-y-3">
          <Segmented<Trip['kind']>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'festival', label: '🎧 Festiwal' },
              { value: 'travel', label: '✈️ Podróż' },
            ]}
          />
          <input
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder={kind === 'festival' ? 'np. Tomorrowland' : 'np. Weekend w Londynie'}
            className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-lg dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-lg dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Anuluj
            </Button>
            <Button onClick={add} disabled={!date || !occasion.trim()}>
              Dodaj
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="secondary" full onClick={() => setAdding(true)}>
          <Plus size={20} /> Dodaj wyjazd
        </Button>
      )}
      {past.length > 0 && (
        <Muted className="pt-2">
          <Flag size={14} className="mr-1 inline" />
          Za tobą: {past.map((t) => t.occasion).join(', ')}
        </Muted>
      )}
      {upcoming.length > 0 && diffDays(today, upcoming[0].date) <= 120 && (
        <Badge tone="emerald">Pierwszeństwo dla modułów wyjazdowych jest włączone</Badge>
      )}
    </div>
  )
}

function VocabCard({ known, perDay, today }: { known: number; perDay: number; today: string }) {
  const total = vocabItems.length
  const left = total - known
  const days = perDay > 0 ? Math.ceil((left / perDay) * (7 / 6)) : null
  return (
    <>
      <SectionTitle>Słownik</SectionTitle>
      <Card className="space-y-3">
        <div className="flex items-end justify-between">
          <p className="text-lg font-bold">
            {known} / {total}
          </p>
          <Muted>najczęstszych słów</Muted>
        </div>
        <ProgressBar value={known / Math.max(1, total)} color="bg-sky-500" className="h-3" />
        <Muted>
          {left === 0
            ? 'Cały słownik za Tobą!'
            : days
              ? `${perDay} nowych słówek dziennie → cały słownik ok. ${formatDatePl(addDays(today, days))}. Słownik jest osobno od planu wakacyjnego — możesz go ciągnąć dalej po wakacjach.`
              : 'Nowe słówka są wyłączone (Ustawienia → Nowe słówka ze słownika).'}
        </Muted>
        <Button variant="secondary" size="md" full onClick={() => navigate('/phrases?tab=vocab')}>
          Otwórz słownik
        </Button>
      </Card>
    </>
  )
}
