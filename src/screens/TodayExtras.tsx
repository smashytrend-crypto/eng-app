import { ClaudePracticeCard } from '../components/ClaudePracticeCard'
import { useDay } from '../state/hooks'
import { SpeakingTaskCard } from './speaking/SpeakingTaskCard'

/** Dodatkowe karty na ekranie głównym. */
export function TodayExtras({ today }: { today: string }) {
  const day = useDay(today)
  if (!day) return null
  const studied = day.reviews + day.newItems > 0
  return (
    <div className="mt-4 space-y-4">
      {studied && !day.speakingDone && <SpeakingTaskCard />}
      <ClaudePracticeCard />
    </div>
  )
}
