/** Gotowy prompt (po angielsku) do ćwiczenia rozmowy w aplikacji Claude. */

export interface ClaudePromptInput {
  /** Opis scenki po angielsku. */
  scenario: string
  /** Zwroty z tego tygodnia (EN + PL). */
  phrases: Array<{ en: string; pl: string }>
  /** Szacowany poziom, np. "A2" albo "B1". */
  level?: string
}

export function buildClaudePrompt({ scenario, phrases, level = 'A2' }: ClaudePromptInput): string {
  const list = phrases.length
    ? phrases.map((p) => `- ${p.en} (${p.pl})`).join('\n')
    : '- (no new phrases this week — just use simple everyday English)'
  return `Hi Claude! Let's practise my spoken English with a role-play.

About me: I'm Domin from Szczecin, Poland. My English is around ${level} — I understand more than I can say. I love the gym, electronic music (techno, house, EDM, dubstep), festivals like Tomorrowland, games and travel.

The scene: ${scenario}

Rules:
1. Stay in the scene. Ask me ONE short question at a time and wait for my answer.
2. Use simple, natural spoken English — short sentences, everyday words.
3. After each of my answers, first give me a very short correction in Polish (max 1–2 lines): my mistake → the natural English version. If my answer was correct, just write "✅".
4. Then continue the scene with your next line or question.
5. Try to make me use these phrases from this week:
${list}
6. Grammar I want to practise: Present Simple for habits, "there is / there are" (also with plurals), and plans with "going to" and the Present Continuous.
7. After about 10 exchanges, end the scene and give me a short summary in Polish: 3 things I did well and 3 phrases to practise.

Start the scene now with your first line.`
}

export const DEFAULT_SCENARIO =
  "We're at a big electronic music festival in Belgium. You're a friendly festival-goer from another country who starts chatting with me between two DJ sets."
