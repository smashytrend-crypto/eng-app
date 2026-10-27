/**
 * Wszystkie treści z folderu content/ — wczytane w czasie budowania (działają offline).
 * Nowy plik modułu w content/stage-N/ jest wykrywany automatycznie.
 */
import missionsFile from '../../content/missions.json'
import tasksFile from '../../content/speaking-tasks.json'
import stagesFile from '../../content/stages.json'
import type { Item, Mission, Module, ModuleFile, PartOfSpeech, SpeakingTask, Stage, VocabFile, VocabItem, VocabSet } from './schema'

const moduleFiles = import.meta.glob<ModuleFile>('/content/stage-*/*.json', { eager: true, import: 'default' })
const vocabFiles = import.meta.glob<VocabFile>('/content/vocab/*.json', { eager: true, import: 'default' })

export const stages: Stage[] = (stagesFile as { stages: Stage[] }).stages

const files = Object.values(moduleFiles).sort(
  (a, b) => a.module.stage - b.module.stage || a.module.order - b.module.order,
)

export const modules: Module[] = files.map((f) => f.module)

export const contentItems: Item[] = files.flatMap((f) => [...f.items].sort((a, b) => a.order - b.order))

export const POS_LABELS: Record<PartOfSpeech, string> = {
  n: 'rzeczownik',
  v: 'czasownik',
  adj: 'przymiotnik',
  adv: 'przysłówek',
  prep: 'przyimek',
  conj: 'spójnik',
  pron: 'zaimek',
  det: 'określnik',
  int: 'wykrzyknik',
  phr: 'wyrażenie',
}

/** Słówko ze słownika jako zwykły element `word` (ćwiczenia, powtórki i ekrany działają bez zmian). */
export function vocabToItem(v: VocabItem, set: VocabSet, order: number): Item {
  return {
    id: v.id,
    type: 'word',
    stage: 0,
    module: set.id,
    order,
    en: v.en,
    pl: v.pl,
    alternatives: v.alternatives ?? [],
    usage: POS_LABELS[v.pos],
    register: 'neutral',
    example: v.example,
    collocations: v.collocations,
    note: v.note,
    pronunciation: v.pronunciation,
    tags: ['vocab', ...(v.tags ?? [])],
    level: v.level,
  }
}

const vocabFileList = Object.values(vocabFiles).sort((a, b) => a.set.order - b.set.order)

/** Zestawy słownika (po ok. 100 słów, od najczęstszych i najprostszych). */
export const vocabSets: VocabSet[] = vocabFileList.map((f) => f.set)

/** Słownik: wszystkie słówka w kolejności nauki (poziom → częstotliwość). */
export const vocabItems: Item[] = vocabFileList.flatMap((f) => f.items.map((v, i) => vocabToItem(v, f.set, i + 1)))

export const vocabSetById = new Map(vocabSets.map((s) => [s.id, s]))

/** Program (etapy) + słownik — wszystko, co może trafić do lekcji. */
export const allContentItems: Item[] = [...contentItems, ...vocabItems]

export const moduleById = new Map(modules.map((m) => [m.id, m]))
export const stageById = new Map(stages.map((s) => [s.id, s]))
export const contentItemById = new Map(allContentItems.map((i) => [i.id, i]))

export const speakingTasks: SpeakingTask[] = (tasksFile as { tasks: SpeakingTask[] }).tasks
export const missions: Mission[] = (missionsFile as { missions: Mission[] }).missions

export function modulesOfStage(stage: number): Module[] {
  return modules.filter((m) => m.stage === stage)
}

export function itemsOfModule(moduleId: string): Item[] {
  return allContentItems.filter((i) => i.module === moduleId)
}

export const CUSTOM_MODULE_ID = 'custom'

/** Moduły z pierwszeństwem przed wyjazdem danego rodzaju. */
export function priorityModuleIds(kinds: ReadonlyArray<'travel' | 'festival'>): Set<string> {
  return new Set(modules.filter((m) => m.tags.some((t) => (kinds as readonly string[]).includes(t))).map((m) => m.id))
}
