import { useEffect, useRef, useState } from 'react'
import { DiffText } from '../../components/DiffText'
import { RatingButtons } from '../../components/RatingButtons'
import { Button } from '../../components/ui'
import { checkAnswer, type CheckResult } from '../../lib/answerCheck'
import { recallPrompt } from '../../lib/exercises'
import { MODE_LABELS } from '../../lib/labels'
import { Rating, type Grade } from '../../lib/srs'
import { useSettings, useSpeech } from '../../state/hooks'
import { AnswerBlock, ExerciseShell, PromptPl, type CardProps } from './shared'

export function suggestedGrade(r: CheckResult | null): Grade | undefined {
  if (!r) return undefined
  if (r.verdict === 'correct') return Rating.Good as Grade
  if (r.verdict === 'almost') return Rating.Hard as Grade
  return Rating.Again as Grade
}

export function VerdictBanner({ result }: { result: CheckResult }) {
  const map = {
    correct: { text: 'Dobrze!', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    almost: { text: 'Prawie dobrze', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    wrong: { text: 'Jeszcze nie', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    empty: { text: 'Poprawna odpowiedź', cls: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  }[result.verdict]
  return (
    <div className={`animate-pop space-y-2 rounded-2xl p-4 ${map.cls}`}>
      <p className="text-lg font-bold">{map.text}</p>
      {result.verdict !== 'correct' && result.given.length > 0 && (
        <p className="text-base">
          <span className="text-sm opacity-70">Twoja odpowiedź: </span>
          <DiffText words={result.given} />
        </p>
      )}
      {result.verdict !== 'correct' && result.verdict !== 'empty' && (
        <p className="text-base">
          <span className="text-sm opacity-70">Poprawnie: </span>
          <DiffText words={result.expected} />
        </p>
      )}
    </div>
  )
}

export function AnswerInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Wpisz po angielsku…',
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!disabled) ref.current?.focus()
  }, [disabled])
  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onSubmit()
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="done"
      lang="en"
      className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-4 text-xl outline-none focus:border-violet-500 disabled:opacity-80 dark:border-zinc-700 dark:bg-zinc-900"
    />
  )
}

/** Wpisywanie PL → EN z tolerancyjnym sprawdzaniem. */
export function TypeCard({ item, entry, card, onRate, busy }: CardProps) {
  const settings = useSettings()
  const speech = useSpeech()
  const prompt = recallPrompt(item, entry.exampleIndex)
  const [text, setText] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)

  const check = (value = text) => {
    if (result) return
    const r = checkAnswer(value, prompt.answers, { ignoreLeadingArticle: prompt.isWord })
    setResult(r)
    if (settings?.autoPlay) void speech.en(prompt.speak)
  }

  return (
    <ExerciseShell
      label={MODE_LABELS.type}
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
      <PromptPl text={prompt.pl} context={prompt.context} />
      <AnswerInput value={text} onChange={setText} onSubmit={() => (text.trim() ? check() : undefined)} disabled={!!result} />
      {result && <VerdictBanner result={result} />}
      {result && <AnswerBlock item={item} answers={prompt.answers} speak={prompt.speak} />}
    </ExerciseShell>
  )
}
