import { describe, expect, it } from 'vitest'
import { buildClaudePrompt, DEFAULT_SCENARIO } from './claudePrompt'

describe('prompt dla Claude', () => {
  it('zawiera scenkę, zwroty i zasady', () => {
    const p = buildClaudePrompt({
      scenario: DEFAULT_SCENARIO,
      phrases: [{ en: "How's it going?", pl: 'Jak leci?' }, { en: 'Same here.', pl: 'Ja też.' }],
    })
    expect(p).toContain(DEFAULT_SCENARIO)
    expect(p).toContain("- How's it going? (Jak leci?)")
    expect(p).toContain('ONE short question at a time')
    expect(p).toContain('in Polish')
  })
  it('działa bez zwrotów', () => {
    expect(buildClaudePrompt({ scenario: 'x', phrases: [] })).toContain('no new phrases')
  })
})
