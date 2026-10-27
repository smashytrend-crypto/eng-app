import { useState } from 'react'
import { RatingButtons } from '../../components/RatingButtons'
import { SpeakButton } from '../../components/SpeakButton'
import { Button } from '../../components/ui'
import { checkAnswer, type CheckResult } from '../../lib/answerCheck'
import { clozeData } from '../../lib/exercises'
import { MODE_LABELS } from '../../lib/labels'
import { useSettings, useSpeech } from '../../state/hooks'
import { RecallCard } from './RecallCard'
import { ExerciseShell, PromptPl, type CardProps } from './shared'
import { AnswerInput, suggestedGrade, VerdictBanner } from './TypeCard'

/** Uzupełnianie luki: PL całe zdanie, EN z luką. */
export function ClozeCard(props: CardProps) {
  const { item, entry, card, onRate, busy } = props
  const settings = useSettings()
  const speech = useSpeech()
  const data = clozeData(item, entry.exampleIndex)
  const [text, setText] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  if (!data) return <RecallCard {...props} />

  const [before, after] = data.sentence.split('___')
  const check = (value = text) => {
    if (result) return
    setResult(checkAnswer(value, [data.answer], { ignoreLeadingArticle: item.type === 'word' }))
    if (settings?.autoPlay) void speech.en(data.full)
  }

  return (
    <ExerciseShell
      label={MODE_LABELS.cloze}
      item={item}
      actions={
        result ? (
          <RatingButtons item={item} card={card} suggested={suggestedGrade(result)} onRate={onRate} disabled={busy} />
        ) : (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <Button variant="secondary" onClick={() => check('')}>
              Nie wiem
            </Button>
            <Button onClick={() => check()} disabled={!text.trim()}>
              Sprawdź
            </Button>
          </div>
        )
      }
    >
      <PromptPl text={data.pl} />
      <p className="rounded-2xl bg-white p-4 text-2xl font-semibold leading-relaxed dark:bg-zinc-900">
        {before}
        <span className={`${/^[,.!?;:]/.test(after ?? "") ? "ml-1" : "mx-1"} inline-block min-w-16 border-b-4 px-1 text-center ${result ? 'border-violet-500 text-violet-700 dark:text-violet-300' : 'border-zinc-300'}`}>
          {result ? data.answer : '?'}
        </span>
        {after}
      </p>
      {!result && <AnswerInput value={text} onChange={setText} onSubmit={() => text.trim() && check()} placeholder="Brakujący fragment…" />}
      {result && <VerdictBanner result={result} />}
      {result && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-zinc-900">
          <p className="text-xl font-bold text-violet-900 dark:text-violet-100">{data.full}</p>
          <SpeakButton text={data.full} />
        </div>
      )}
    </ExerciseShell>
  )
}
