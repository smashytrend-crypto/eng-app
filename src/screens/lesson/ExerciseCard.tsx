import { useState } from 'react'
import { NewItemCard } from './NewItemCard'
import { RecallCard } from './RecallCard'
import type { CardProps } from './shared'
import { TypeCard } from './TypeCard'

/** Wybiera kartę ćwiczenia dla pozycji lekcji. */
export function ExerciseCard(props: CardProps) {
  const { entry, item } = props
  const [presented, setPresented] = useState(entry.kind !== 'new')
  if (!presented) return <NewItemCard item={item} onContinue={() => setPresented(true)} />
  if (entry.kind === 'new') return <RecallCard {...props} label="Szybkie przypomnienie" />
  switch (entry.mode) {
    case 'type':
      return <TypeCard {...props} />
    default:
      return <RecallCard {...props} />
  }
}
