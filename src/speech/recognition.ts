/**
 * Rozpoznawanie mowy (Web Speech API). W Chrome działa przez serwery Google — wymaga internetu.
 * Gdy nie działa: aplikacja przechodzi na „powiedz na głos i oceń się”.
 */

interface RecognitionAlternative {
  transcript: string
  confidence: number
}
interface RecognitionResult {
  isFinal: boolean
  length: number
  [index: number]: RecognitionAlternative
}
interface RecognitionEvent {
  resultIndex: number
  results: { length: number; [index: number]: RecognitionResult }
}
interface RecognitionErrorEvent {
  error: string
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const Ctor: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)

export const recognitionSupported = !!Ctor

export type ListenError = 'not-allowed' | 'network' | 'no-speech' | 'aborted' | 'unsupported' | 'other'

export interface ListenResult {
  /** Rozpoznane warianty (najbardziej prawdopodobny pierwszy). */
  alternatives: string[]
  error?: ListenError
}

export interface ListenHandle {
  stop: () => void
  result: Promise<ListenResult>
}

export function listen(lang: string, onInterim?: (text: string) => void): ListenHandle {
  if (!Ctor) return { stop: () => {}, result: Promise.resolve({ alternatives: [], error: 'unsupported' }) }
  const rec = new Ctor()
  rec.lang = lang
  rec.continuous = false
  rec.interimResults = true
  rec.maxAlternatives = 4
  let finals: string[] = []
  let interim = ''
  let error: ListenError | undefined
  const result = new Promise<ListenResult>((resolve) => {
    rec.onresult = (e) => {
      interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) {
          const alts: string[] = []
          for (let j = 0; j < r.length; j++) alts.push(r[j].transcript.trim())
          finals = finals.length ? finals.map((f, idx) => `${f} ${alts[idx] ?? alts[0]}`.trim()) : alts
        } else {
          interim += r[0].transcript
        }
      }
      onInterim?.([finals[0] ?? '', interim].join(' ').trim())
    }
    rec.onerror = (e) => {
      const map: Record<string, ListenError> = {
        'not-allowed': 'not-allowed',
        'service-not-allowed': 'not-allowed',
        network: 'network',
        'no-speech': 'no-speech',
        aborted: 'aborted',
      }
      error = map[e.error] ?? 'other'
    }
    rec.onend = () => {
      const alternatives = finals.length ? finals : interim.trim() ? [interim.trim()] : []
      resolve({ alternatives, error: alternatives.length ? undefined : (error ?? 'no-speech') })
    }
  })
  try {
    rec.start()
  } catch {
    return { stop: () => {}, result: Promise.resolve({ alternatives: [], error: 'other' }) }
  }
  return { stop: () => rec.stop(), result }
}

export const LISTEN_ERROR_TEXT: Record<ListenError, string> = {
  'not-allowed': 'Brak dostępu do mikrofonu. Zezwól w ustawieniach przeglądarki albo powiedz na głos i oceń się sam.',
  network: 'Rozpoznawanie mowy potrzebuje internetu. Powiedz na głos i oceń się sam.',
  'no-speech': 'Nic nie usłyszałem. Spróbuj jeszcze raz, bliżej telefonu.',
  aborted: 'Przerwano nagrywanie.',
  unsupported: 'Ta przeglądarka nie rozpoznaje mowy — powiedz na głos i oceń się sam.',
  other: 'Coś poszło nie tak z mikrofonem. Powiedz na głos i oceń się sam.',
}
