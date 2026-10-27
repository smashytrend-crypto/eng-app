/**
 * Wszystkie treści z folderu content/ — wczytane w czasie budowania (działają offline).
 * Nowy plik modułu w content/stage-N/ jest wykrywany automatycznie.
 */
import missionsFile from '../../content/missions.json'
import tasksFile from '../../content/speaking-tasks.json'
import stagesFile from '../../content/stages.json'
import type { Item, Mission, Module, ModuleFile, SpeakingTask, Stage } from './schema'

const moduleFiles = import.meta.glob<ModuleFile>('/content/stage-*/*.json', { eager: true, import: 'default' })

export const stages: Stage[] = (stagesFile as { stages: Stage[] }).stages

const files = Object.values(moduleFiles).sort(
  (a, b) => a.module.stage - b.module.stage || a.module.order - b.module.order,
)

export const modules: Module[] = files.map((f) => f.module)

export const contentItems: Item[] = files.flatMap((f) => [...f.items].sort((a, b) => a.order - b.order))

export const moduleById = new Map(modules.map((m) => [m.id, m]))
export const stageById = new Map(stages.map((s) => [s.id, s]))
export const contentItemById = new Map(contentItems.map((i) => [i.id, i]))

export const speakingTasks: SpeakingTask[] = (tasksFile as { tasks: SpeakingTask[] }).tasks
export const missions: Mission[] = (missionsFile as { missions: Mission[] }).missions

export function modulesOfStage(stage: number): Module[] {
  return modules.filter((m) => m.stage === stage)
}

export function itemsOfModule(moduleId: string): Item[] {
  return contentItems.filter((i) => i.module === moduleId)
}

export const CUSTOM_MODULE_ID = 'custom'

/** Moduły z pierwszeństwem przed wyjazdem danego rodzaju. */
export function priorityModuleIds(kinds: ReadonlyArray<'travel' | 'festival'>): Set<string> {
  return new Set(modules.filter((m) => m.tags.some((t) => (kinds as readonly string[]).includes(t))).map((m) => m.id))
}
