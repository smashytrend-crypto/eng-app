import { useMemo, useState } from 'react'
import { DiffText } from '../../components/DiffText'
import { RatingButtons } from '../../components/RatingButtons'
import { SpeakButton } from '../../components/SpeakButton'
import { Button } from '../../components/ui'
import { checkAnswer, type CheckResult } from '../../lib/answerCheck'
import { scrambleTokens, sentenceFor } from '../../lib/exercises'
import { MODE_LABELS } from '../../lib/labels'
import { useSettings, useSpeech } from '../../state/hooks'
import { ExerciseShell, PromptPl, type CardProps } from './shared'
import { suggestedGrade } from './TypeCard'

/** Układanie zdania z rozsypanki: dotykasz słów w dobrej kolejności. */
export function ScrambleCard({ item, entry, card, onRate, busy }: CardProps) {
  const settings = useSettings()
  const speech = useSpeech()
  const s = sentenceFor(item, entry.exampleIndex)
  const tokens = useMemo(() => scrambleTokens(s.en).map((text, id) => ({ id, text })), [s.en])
  const [picked, setPicked] = useState<number[]>([])
  const [result, setResult] = useState<CheckResult | null>(null)

  const built = picked.map((id) => tokens[id].text).join(' ')
  const done = picked.length === tokens.length

  const check = () => {
    // kolejność musi się zgadzać: porównujemy dokładnie (bez tolerancji literówek, słowa są te same)
    const r = checkAnswer(built, [s.en, ...s.alt])
    setResult(r.verdict === 'correct' ? r : { ...r, verdict: 'wrong' })
    if (settings?.autoPlay) void speech.en(s.en)
  }

  return (
    <ExerciseShell
      label={MODE_LABELS.scramble}
      item={item}
      actions={
        result ? (
          <RatingButtons item={item} card={card} suggested={suggestedGrade(result)} onRate={onRate} disabled={busy} />
        ) : (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <Button variant="secondary" onClick={() => setPicked([])} disabled={!picked.length}>
              Wyczyść
            </Button>
            <Button onClick={check} disabled={!done}>
              Sprawdź
            </Button>
          </div>
        )
      }
    >
      <PromptPl text={s.pl} />
      <div className="min-h-20 rounded-2xl border-2 border-dashed border-zinc-300 p-3 dark:border-zinc-700">
        <div className="flex flex-wrap gap-2">
          {picked.map((id) => (
            <button
              key={id}
              type="button"
              disabled={!!result}
              onClick={() => setPicked((p) => p.filter((x) => x !== id))}
              className="rounded-xl bg-violet-600 px-3 py-2 text-lg font-semibold text-white"
            >
              {tokens[id].text}
            </button>
          ))}
          {!picked.length && <span className="text-zinc-400">Dotykaj słów poniżej w dobrej kolejności…</span>}
        </div>
      </div>
      {!result && (
        <div className="flex flex-wrap gap-2">
          {tokens.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={picked.includes(t.id)}
              onClick={() => setPicked((p) => [...p, t.id])}
              className="rounded-xl border-2 border-zinc-200 bg-white px-3 py-2 text-lg font-semibold transition disabled:opacity-20 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {t.text}
            </button>
          ))}
        </div>
      )}
      {result && (
        <div
          className={`animate-pop space-y-2 rounded-2xl p-4 ${
            result.verdict === 'correct' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
          }`}
        >
          <p className="text-lg font-bold">{result.verdict === 'correct' ? 'Dobrze!' : 'Kolejność się nie zgadza'}</p>
          {result.verdict !== 'correct' && (
            <p>
              <span className="text-sm opacity-70">Poprawnie: </span>
              <DiffText words={result.expected} />
            </p>
          )}
        </div>
      )}
      {result && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-zinc-900">
          <p className="text-xl font-bold text-violet-900 dark:text-violet-100">{s.en}</p>
          <SpeakButton text={s.en} />
        </div>
      )}
    </ExerciseShell>
  )
}
