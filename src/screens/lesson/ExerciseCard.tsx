import { useState } from 'react'
import { ClozeCard } from './ClozeCard'
import { DialogCard } from './DialogCard'
import { DictationCard } from './DictationCard'
import { NewItemCard } from './NewItemCard'
import { OwnSentenceCard } from './OwnSentenceCard'
import { RecallCard } from './RecallCard'
import { ScrambleCard } from './ScrambleCard'
import { ShadowCard } from './ShadowCard'
import type { CardProps } from './shared'
import { TypeCard } from './TypeCard'

/** Wybiera kartę ćwiczenia dla pozycji lekcji. */
export function ExerciseCard(props: CardProps) {
  const { entry, item } = props
  const [presented, setPresented] = useState(entry.kind !== 'new')
  if (!presented) return <NewItemCard item={item} onContinue={() => setPresented(true)} />
  if (item.type === 'dialog') return <DialogCard {...props} />
  if (entry.kind === 'new') return <RecallCard {...props} label="Szybkie przypomnienie" />
  switch (entry.mode) {
    case 'type':
      return <TypeCard {...props} />
    case 'cloze':
      return <ClozeCard {...props} />
    case 'scramble':
      return <ScrambleCard {...props} />
    case 'dictation':
      return <DictationCard {...props} />
    case 'shadow':
      return <ShadowCard {...props} />
    case 'own':
      return item.type === 'pattern' ? <OwnSentenceCard {...props} /> : <RecallCard {...props} />
    default:
      return <RecallCard {...props} />
  }
}
