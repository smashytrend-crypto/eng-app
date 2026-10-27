import type { DiffWord } from '../lib/answerCheck'

const STYLES = {
  ok: '',
  missing: 'rounded bg-emerald-100 px-1 font-bold text-emerald-800 underline decoration-2 underline-offset-4 dark:bg-emerald-950 dark:text-emerald-300',
  typo: 'rounded bg-amber-100 px-1 font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  extra: 'rounded bg-rose-100 px-1 text-rose-700 line-through dark:bg-rose-950 dark:text-rose-300',
}

/** Wyświetla słowa z podświetleniem różnic. */
export function DiffText({ words, className = '' }: { words: DiffWord[]; className?: string }) {
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span className={STYLES[w.kind]}>{w.text}</span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}
