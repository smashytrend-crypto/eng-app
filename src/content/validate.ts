import { normalize } from '../lib/answerCheck'
import {
  missionsFileSchema,
  moduleFileSchema,
  speakingTasksFileSchema,
  stagesFileSchema,
  vocabFileSchema,
  VOCAB_LEVELS,
  type ContentItem,
  type ModuleFile,
} from './schema'

export interface ContentFiles {
  stages: unknown
  modules: Array<{ path: string; data: unknown }>
  tasks?: unknown
  missions?: unknown
  /** Pliki słownika content/vocab/NN.json. */
  vocab?: Array<{ path: string; data: unknown }>
}

export interface ModuleStats {
  path: string
  id: string
  total: number
  phrase: number
  word: number
  pattern: number
  dialog: number
}

export interface ValidationReport {
  errors: string[]
  warnings: string[]
  modules: ModuleStats[]
  totalItems: number
  /** Liczba słówek w słowniku. */
  vocabItems: number
}

function zodIssues(path: string, error: { issues: Array<{ path: PropertyKey[]; message: string }> }, data: unknown): string[] {
  return error.issues.map((i) => {
    let where = i.path.join('.')
    // pokaż id elementu, jeśli błąd dotyczy elementu
    if (i.path[0] === 'items' && typeof i.path[1] === 'number') {
      const item = (data as { items?: Array<{ id?: string }> }).items?.[i.path[1]]
      if (item?.id) where = `${item.id} → ${i.path.slice(2).join('.') || '(element)'}`
    }
    return `${path}: ${where}: ${i.message}`
  })
}

/** Pełna walidacja treści: schemat, spójność plików, unikalne id, duplikaty, proporcje. */
export function validateContent(files: ContentFiles): ValidationReport {
  const errors: string[] = []
  const warnings: string[] = []
  const stats: ModuleStats[] = []

  const stagesParsed = stagesFileSchema.safeParse(files.stages)
  if (!stagesParsed.success) errors.push(...zodIssues('content/stages.json', stagesParsed.error, files.stages))
  else {
    const ids = stagesParsed.data.stages.map((s) => s.id)
    if (ids.join(',') !== '1,2,3,4,5,6,7,8') errors.push('content/stages.json: etapy muszą mieć id 1–8 po kolei')
  }

  const itemIds = new Map<string, string>()
  const moduleIds = new Map<string, string>()
  const moduleOrders = new Map<string, string>()
  const enSeen = new Map<string, string>()
  const parsedModules: ModuleFile[] = []

  for (const { path, data } of files.modules) {
    const parsed = moduleFileSchema.safeParse(data)
    if (!parsed.success) {
      errors.push(...zodIssues(path, parsed.error, data))
      continue
    }
    const file = parsed.data
    parsedModules.push(file)
    const { module: mod, items } = file

    const folder = path.match(/stage-(\d+)\/(\d{2})-([a-z0-9-]+)\.json$/)
    if (!folder) errors.push(`${path}: nazwa pliku musi mieć postać content/stage-N/NN-slug.json`)
    else {
      if (Number(folder[1]) !== mod.stage) errors.push(`${path}: folder stage-${folder[1]}, a module.stage = ${mod.stage}`)
      if (Number(folder[2]) !== mod.order) errors.push(`${path}: numer w nazwie pliku (${folder[2]}) ≠ module.order (${mod.order})`)
    }
    if (!mod.id.startsWith(`s${mod.stage}.`)) errors.push(`${path}: module.id musi zaczynać się od s${mod.stage}.`)
    if (moduleIds.has(mod.id)) errors.push(`${path}: powtórzone module.id ${mod.id} (także w ${moduleIds.get(mod.id)})`)
    moduleIds.set(mod.id, path)
    const orderKey = `${mod.stage}:${mod.order}`
    if (moduleOrders.has(orderKey)) errors.push(`${path}: etap ${mod.stage} ma już moduł nr ${mod.order} (${moduleOrders.get(orderKey)})`)
    moduleOrders.set(orderKey, path)

    const orders = new Set<number>()
    const plInModule = new Map<string, string>()
    for (const item of items) {
      const where = `${path}: ${item.id}`
      if (item.stage !== mod.stage) errors.push(`${where}: stage ${item.stage} ≠ module.stage ${mod.stage}`)
      if (item.module !== mod.id) errors.push(`${where}: module „${item.module}” ≠ module.id „${mod.id}”`)
      if (!item.id.startsWith(mod.id + '.')) errors.push(`${where}: id musi zaczynać się od „${mod.id}.”`)
      if (itemIds.has(item.id)) errors.push(`${where}: powtórzone id (także w ${itemIds.get(item.id)})`)
      itemIds.set(item.id, path)
      if (orders.has(item.order)) errors.push(`${where}: powtórzony order ${item.order} w module`)
      orders.add(item.order)

      checkText(item, where, errors, warnings)

      const key = `${item.type === 'dialog' ? 'dialog:' : ''}${normalize(item.en)}`
      if (enSeen.has(key)) errors.push(`${where}: duplikat „${item.en}” (także ${enSeen.get(key)})`)
      else enSeen.set(key, item.id)

      const plKey = item.pl.toLowerCase().trim()
      if (plInModule.has(plKey)) warnings.push(`${where}: to samo tłumaczenie PL co ${plInModule.get(plKey)}: „${item.pl}”`)
      plInModule.set(plKey, item.id)
    }

    const count = (t: ContentItem['type']) => items.filter((i) => i.type === t).length
    const s: ModuleStats = {
      path, id: mod.id, total: items.length,
      phrase: count('phrase'), word: count('word'), pattern: count('pattern'), dialog: count('dialog'),
    }
    stats.push(s)
    if (s.total < 25 || s.total > 40) warnings.push(`${path}: ${s.total} elementów (zalecane 25–40)`)
    const nonDialog = s.total - s.dialog || 1
    const pct = (n: number) => Math.round((n / nonDialog) * 100)
    if (pct(s.phrase) < 35 || pct(s.phrase) > 65) warnings.push(`${path}: zwroty ${pct(s.phrase)}% (zalecane ok. 50%)`)
    if (pct(s.word) < 15 || pct(s.word) > 45) warnings.push(`${path}: słówka ${pct(s.word)}% (zalecane ok. 30%)`)
    if (pct(s.pattern) < 10 || pct(s.pattern) > 30) warnings.push(`${path}: wzorce ${pct(s.pattern)}% (zalecane ok. 20%)`)
    if (s.dialog < 1 || s.dialog > 2) warnings.push(`${path}: ${s.dialog} mini-dialogów (zalecane 1–2)`)
  }

  // Ciągłość numeracji modułów w etapach
  const byStage = new Map<number, number[]>()
  for (const m of parsedModules) byStage.set(m.module.stage, [...(byStage.get(m.module.stage) ?? []), m.module.order])
  for (const [stage, orders] of byStage) {
    const sorted = [...orders].sort((a, b) => a - b)
    sorted.forEach((o, i) => {
      if (o !== i + 1) warnings.push(`etap ${stage}: numeracja modułów nie jest ciągła (${sorted.join(', ')})`)
    })
  }

  if (files.tasks !== undefined) {
    const t = speakingTasksFileSchema.safeParse(files.tasks)
    if (!t.success) errors.push(...zodIssues('content/speaking-tasks.json', t.error, files.tasks))
    else {
      const ids = new Set<string>()
      for (const task of t.data.tasks) {
        if (ids.has(task.id)) errors.push(`content/speaking-tasks.json: powtórzone id ${task.id}`)
        ids.add(task.id)
      }
    }
  }
  if (files.missions !== undefined) {
    const m = missionsFileSchema.safeParse(files.missions)
    if (!m.success) errors.push(...zodIssues('content/missions.json', m.error, files.missions))
    else {
      const ids = new Set<string>()
      for (const mission of m.data.missions) {
        if (ids.has(mission.id)) errors.push(`content/missions.json: powtórzone id ${mission.id}`)
        ids.add(mission.id)
      }
    }
  }

  // Słownik: zestawy po kolei, poziomy rosnąco, słowa unikalne także względem programu
  let vocabCount = 0
  let lastLevel = -1
  const setOrders = new Set<number>()
  for (const { path, data } of files.vocab ?? []) {
    const parsed = vocabFileSchema.safeParse(data)
    if (!parsed.success) {
      errors.push(...zodIssues(path, parsed.error, data))
      continue
    }
    const { set, items } = parsed.data
    const m = path.match(/vocab\/(\d{2})\.json$/)
    if (!m) errors.push(`${path}: nazwa pliku musi mieć postać content/vocab/NN.json`)
    else if (Number(m[1]) !== set.order) errors.push(`${path}: numer w nazwie pliku ≠ set.order (${set.order})`)
    if (set.id !== `v.${String(set.order).padStart(2, '0')}`) errors.push(`${path}: set.id musi być v.${String(set.order).padStart(2, '0')}`)
    if (setOrders.has(set.order)) errors.push(`${path}: powtórzony set.order ${set.order}`)
    setOrders.add(set.order)
    const lvl = VOCAB_LEVELS.indexOf(set.level)
    if (lvl < lastLevel) errors.push(`${path}: poziom ${set.level} po wyższym poziomie — zestawy muszą iść od A1 do B2`)
    lastLevel = Math.max(lastLevel, lvl)
    for (const item of items) {
      const where = `${path}: ${item.id}`
      vocabCount++
      if (item.level !== set.level) errors.push(`${where}: poziom ${item.level} ≠ poziom zestawu ${set.level}`)
      if (itemIds.has(item.id)) errors.push(`${where}: powtórzone id (także w ${itemIds.get(item.id)})`)
      itemIds.set(item.id, path)
      const key = normalize(item.en)
      if (enSeen.has(key)) errors.push(`${where}: duplikat „${item.en}” (także ${enSeen.get(key)})`)
      else enSeen.set(key, item.id)
      const texts = [item.en, item.pl, ...(item.alternatives ?? []), ...item.example.flatMap((e) => [e.en, e.pl]), ...(item.collocations ?? [])]
      if (texts.some((t) => /[‘’]/.test(t))) warnings.push(`${where}: krzywy apostrof — użyj prostego '`)
      if (texts.some((t) => /\s{2,}/.test(t))) warnings.push(`${where}: podwójna spacja`)
      if (item.note && item.note.length > 260) warnings.push(`${where}: za długa notatka (${item.note.length} znaków)`)
    }
  }

  return { errors, warnings, modules: stats, totalItems: itemIds.size, vocabItems: vocabCount }
}

function checkText(item: ContentItem, where: string, errors: string[], warnings: string[]) {
  const enTexts = [item.en, ...item.alternatives, ...item.example.map((e) => e.en), ...item.example.flatMap((e) => e.alt ?? [])]
  for (const t of enTexts) {
    if (/[’‘]/.test(t)) warnings.push(`${where}: użyj prostego apostrofu ' zamiast ’ w „${t}”`)
    if (/\s{2,}/.test(t)) warnings.push(`${where}: podwójna spacja w „${t}”`)
  }
  for (const t of [item.pl, item.usage, ...item.example.map((e) => e.pl), item.note ?? '']) {
    if (/\s{2,}/.test(t)) warnings.push(`${where}: podwójna spacja w „${t}”`)
  }
  if (item.type === 'pattern' && item.example.some((e) => e.en.includes('___'))) {
    errors.push(`${where}: przykłady wzorca muszą być pełnymi zdaniami (bez ___)`)
  }
  const normAlts = new Set<string>()
  for (const a of [item.en, ...item.alternatives]) {
    const n = normalize(a)
    if (normAlts.has(n)) warnings.push(`${where}: wariant „${a}” jest równoważny innemu (niepotrzebny)`)
    normAlts.add(n)
  }
  if (item.note && item.note.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 3).length > 4) {
    warnings.push(`${where}: note jest długa (max 2–3 zdania)`)
  }
}
