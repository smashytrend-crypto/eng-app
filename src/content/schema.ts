import { z } from 'zod'

export const ITEM_TYPES = ['phrase', 'word', 'pattern', 'dialog'] as const
export const REGISTERS = ['casual', 'neutral', 'polite'] as const
export const LEVELS = ['A2', 'B1', 'B2'] as const
export const MODULE_TAGS = ['general', 'travel', 'festival'] as const

const text = z.string().trim().min(1)
const tag = z.string().regex(/^[a-z0-9:-]+$/, 'tag: małe litery, cyfry, „:” i „-”')

export const exampleLineSchema = z
  .object({
    en: text,
    pl: text,
    speaker: z.enum(['A', 'B']).optional(),
    alt: z.array(text).optional(),
  })
  .strict()

export const itemSchema = z
  .object({
    id: z.string().regex(/^s[1-8]\.[a-z0-9-]+\.[a-z0-9-]+$/, 'id: s{etap}.{moduł}.{element}'),
    type: z.enum(ITEM_TYPES),
    stage: z.number().int().min(1).max(8),
    module: z.string().regex(/^s[1-8]\.[a-z0-9-]+$/),
    order: z.number().int().min(1),
    en: text,
    pl: text,
    alternatives: z.array(text),
    usage: text,
    register: z.enum(REGISTERS),
    example: z.array(exampleLineSchema).min(1),
    collocations: z.array(text).optional(),
    note: text.optional(),
    pronunciation: text.optional(),
    tags: z.array(tag),
    level: z.enum(LEVELS),
  })
  .strict()
  .superRefine((item, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (item.type === 'word' && (item.collocations?.length ?? 0) < 2) {
      issue('słówko (word) musi mieć min. 2 collocations')
    }
    if (item.type === 'pattern') {
      if (!item.en.includes('___') || !item.pl.includes('___')) issue('wzorzec (pattern) musi mieć „___” w en i pl')
      if (item.example.length < 2) issue('wzorzec (pattern) musi mieć min. 2 przykłady')
    }
    if (item.type === 'dialog') {
      if (item.example.length < 2 || item.example.length > 6) issue('mini-dialog musi mieć 2–6 kwestii')
      if (item.example.some((l) => !l.speaker)) issue('każda kwestia dialogu musi mieć speaker A/B')
      const speakers = new Set(item.example.map((l) => l.speaker))
      if (!speakers.has('A') || !speakers.has('B')) issue('dialog musi mieć obie role: A i B')
    }
    if (item.type !== 'pattern' && (item.en.includes('___') || item.pl.includes('___'))) {
      issue('„___” jest dozwolone tylko we wzorcach')
    }
  })

export const moduleSchema = z
  .object({
    id: z.string().regex(/^s[1-8]\.[a-z0-9-]+$/),
    stage: z.number().int().min(1).max(8),
    order: z.number().int().min(1),
    title: text,
    titleEn: text,
    description: text,
    tags: z.array(z.enum(MODULE_TAGS)).min(1),
  })
  .strict()

export const moduleFileSchema = z
  .object({
    module: moduleSchema,
    items: z.array(itemSchema).min(1),
  })
  .strict()

export const stageSchema = z
  .object({
    id: z.number().int().min(1).max(8),
    title: text,
    titleEn: text,
    description: text,
    weeks: z.number().positive(),
  })
  .strict()

export const stagesFileSchema = z.object({ stages: z.array(stageSchema).length(8) }).strict()

export const speakingTaskSchema = z
  .object({
    id: z.string().regex(/^task\.[a-z0-9-]+$/),
    stage: z.number().int().min(1).max(8),
    title: text,
    instruction: text,
    starters: z.array(text).min(1),
    example: text,
    tags: z.array(tag),
  })
  .strict()

export const speakingTasksFileSchema = z.object({ tasks: z.array(speakingTaskSchema).min(1) }).strict()

export const missionStepSchema = z
  .object({
    them: text.optional(),
    themPl: text.optional(),
    task: text,
    answer: text,
    alt: z.array(text).optional(),
  })
  .strict()

export const missionSchema = z
  .object({
    id: z.string().regex(/^mission\.[a-z0-9-]+$/),
    stage: z.number().int().min(1).max(8),
    title: text,
    titleEn: text,
    setting: text,
    claudeScenario: text,
    tags: z.array(tag),
    steps: z.array(missionStepSchema).min(6),
  })
  .strict()

export const missionsFileSchema = z.object({ missions: z.array(missionSchema).min(1) }).strict()

export type ItemType = (typeof ITEM_TYPES)[number]
export type Register = (typeof REGISTERS)[number]
export type Level = (typeof LEVELS)[number]
export type ModuleTag = (typeof MODULE_TAGS)[number]
export type ExampleLine = z.infer<typeof exampleLineSchema>
export type ContentItem = z.infer<typeof itemSchema>
export type Module = z.infer<typeof moduleSchema>
export type ModuleFile = z.infer<typeof moduleFileSchema>
export type Stage = z.infer<typeof stageSchema>
export type SpeakingTask = z.infer<typeof speakingTaskSchema>
export type Mission = z.infer<typeof missionSchema>
export type MissionStep = z.infer<typeof missionStepSchema>

/**
 * Element używany w aplikacji: elementy z treści (etapy 1–8) oraz własne zwroty użytkownika
 * (stage 0, module "custom", id zaczyna się od "u.").
 */
export interface Item extends Omit<ContentItem, 'stage'> {
  stage: number
  custom?: boolean
}
