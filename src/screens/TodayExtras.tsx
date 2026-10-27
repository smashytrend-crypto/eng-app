import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Dumbbell, Headphones, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { ClaudePracticeCard } from '../components/ClaudePracticeCard'
import { Card } from '../components/ui'
import { db } from '../db/db'
import { isWeekend, weekKey } from '../lib/dates'
import { hardItemIds } from '../lib/stats'
import { useCards, useDay } from '../state/hooks'
import { startHardPractice } from '../state/lesson'
import { navigate } from '../state/router'
import { SpeakingTaskCard } from './speaking/SpeakingTaskCard'

/** Dodatkowe karty na ekranie głównym: zadanie na głos, misja, audio, trudne, Claude. */
export function TodayExtras({ today }: { today: string }) {
  const day = useDay(today)
  const cards = useCards()
  const logs = useLiveQuery(() => db.reviewLogs.toArray(), [])
  const missionDone = useLiveQuery(async () => (await db.missions.where('weekKey').equals(weekKey(today)).count()) > 0, [today])
  if (!day || !cards || !logs || missionDone === undefined) return null
  const studied = day.reviews + day.newItems > 0
  const hard = hardItemIds(cards, logs, new Date()).length
  const hasKnown = cards.size > 0

  return (
    <div className="mt-4 space-y-3">
      {studied && !day.speakingDone && <SpeakingTaskCard />}
      {isWeekend(today) && hasKnown && !missionDone && (
        <Shortcut
          icon={<Sparkles className="text-fuchsia-600" />}
          title="Misja weekendowa"
          text="Dłuższa scenka z materiałem z całego tygodnia."
          onClick={() => navigate('/mission')}
          highlight
        />
      )}
      {hasKnown && (
        <Shortcut
          icon={<Headphones className="text-sky-600" />}
          title="Tryb audio"
          text="Bez patrzenia na ekran — w drodze albo na siłowni."
          onClick={() => navigate('/audio')}
        />
      )}
      {hard > 0 && (
        <Shortcut
          icon={<Dumbbell className="text-amber-600" />}
          title={`Trudne (${hard})`}
          text="Krótki trening tego, co najczęściej ucieka."
          onClick={async () => {
            if (await startHardPractice()) navigate('/lesson')
          }}
        />
      )}
      {hasKnown && <ClaudePracticeCard />}
    </div>
  )
}

function Shortcut({ icon, title, text, onClick, highlight }: { icon: ReactNode; title: string; text: string; onClick: () => void; highlight?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <Card className={`flex items-center gap-3 p-4 ${highlight ? 'border-fuchsia-300 dark:border-fuchsia-800' : ''}`}>
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          <span className="block text-sm text-zinc-500 dark:text-zinc-400">{text}</span>
        </span>
        <ChevronRight className="shrink-0 text-zinc-400" />
      </Card>
    </button>
  )
}
