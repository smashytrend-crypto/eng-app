import { Check, Copy, ExternalLink, MessageCircleHeart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { missions } from '../content'
import { addDays, dayStart, weekKey } from '../lib/dates'
import { buildClaudePrompt, DEFAULT_SCENARIO } from '../lib/claudePrompt'
import { copyText } from '../lib/download'
import { currentStage, introducedSince } from '../lib/stats'
import { pickMission } from '../lib/tasks'
import { useAllItems, useCards, useToday } from '../state/hooks'
import { Button, Card, Muted } from './ui'

export function levelForStage(stage: number): string {
  if (stage <= 3) return 'A2'
  if (stage <= 6) return 'A2/B1'
  return 'B1'
}

/** „Ćwicz rozmowę z Claude”: kopiuje gotowy prompt ze scenką i zwrotami z tygodnia. */
export function ClaudePracticeCard({ scenario: scenarioOverride, title = 'Ćwicz rozmowę z Claude' }: { scenario?: string; title?: string }) {
  const all = useAllItems()
  const cards = useCards()
  const today = useToday()
  const [copied, setCopied] = useState(false)
  const [show, setShow] = useState(false)

  const prompt = useMemo(() => {
    if (!all || !cards) return null
    const stage = currentStage(all.items, cards)
    const since = dayStart(addDays(today, -7)).getTime()
    let recent = introducedSince(cards, since).sort((a, b) => b.introducedAt - a.introducedAt)
    if (recent.length < 5) recent = [...cards.values()].filter((c) => c.reps > 0).sort((a, b) => b.introducedAt - a.introducedAt)
    const phrases = recent
      .map((c) => all.byId.get(c.itemId))
      .filter((i) => !!i && i.type !== 'dialog')
      .slice(0, 15)
      .map((i) => (i!.type === 'pattern' ? { en: i!.example[0].en, pl: i!.example[0].pl } : { en: i!.en, pl: i!.pl }))
    const mission = pickMission(missions, stage, weekKey(today), new Set())
    return buildClaudePrompt({
      scenario: scenarioOverride ?? mission?.claudeScenario ?? DEFAULT_SCENARIO,
      phrases,
      level: levelForStage(stage),
    })
  }, [all, cards, today, scenarioOverride])

  if (!prompt) return null

  const copy = async () => {
    setCopied(await copyText(prompt))
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
        <MessageCircleHeart size={20} />
        <p className="text-sm font-bold uppercase tracking-wide">{title}</p>
      </div>
      <Muted>
        Skopiuję gotowe polecenie ze scenką i Twoimi zwrotami z tego tygodnia. Wklej je w aplikacji Claude — najlepiej w trybie głosowym. Claude
        będzie zadawał po jednym pytaniu i krótko poprawiał błędy po polsku.
      </Muted>
      <Button full onClick={copy} variant={copied ? 'secondary' : 'primary'}>
        {copied ? <Check size={20} /> : <Copy size={20} />} {copied ? 'Skopiowano!' : 'Kopiuj polecenie dla Claude'}
      </Button>
      {copied && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">Teraz otwórz Claude, przytrzymaj pole tekstowe → „Wklej” → wyślij.</p>
          <a
            href="https://claude.ai/new"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-200 font-semibold text-violet-700 dark:border-zinc-700 dark:text-violet-300"
          >
            <ExternalLink size={18} /> Otwórz Claude
          </a>
        </div>
      )}
      <button type="button" onClick={() => setShow((s) => !s)} className="text-sm font-semibold text-violet-700 dark:text-violet-300">
        {show ? 'Ukryj polecenie' : 'Pokaż polecenie'}
      </button>
      {show && <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800">{prompt}</pre>}
    </Card>
  )
}
