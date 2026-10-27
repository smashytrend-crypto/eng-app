/**
 * Lektor (Web Speech API — speechSynthesis). Wybiera najlepszy dostępny głos.
 * Offline działają tylko głosy lokalne (na Androidzie: Google TTS z pobranymi danymi).
 */

export type TtsLang = 'en-GB' | 'en-US' | 'pl-PL'

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

let voices: SpeechSynthesisVoice[] = []
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported) return Promise.resolve([])
  if (voicesReady && voices.length) return voicesReady
  voicesReady = new Promise((resolve) => {
    const read = () => {
      voices = window.speechSynthesis.getVoices()
      return voices
    }
    if (read().length) return resolve(voices)
    const onChange = () => {
      if (read().length) {
        window.speechSynthesis.removeEventListener('voiceschanged', onChange)
        resolve(voices)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChange)
    // Niektóre przeglądarki nie wysyłają zdarzenia — spróbuj jeszcze raz po chwili
    setTimeout(() => resolve(read()), 1500)
  })
  return voicesReady
}

export function voicesFor(langPrefix: 'en' | 'pl'): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(langPrefix))
}

/** Ocena głosu: zgodność akcentu, jakość (Natural/Neural/Premium), dostępność offline. */
export function scoreVoice(v: Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>, lang: TtsLang, online: boolean): number {
  const vl = v.lang.toLowerCase().replace('_', '-')
  const want = lang.toLowerCase()
  let score = 0
  if (vl === want) score += 10
  else if (vl.startsWith(want.slice(0, 2))) score += 4
  else return -100
  const name = v.name.toLowerCase()
  if (/natural|neural|premium|enhanced|wavenet/.test(name)) score += 5
  if (name.includes('google')) score += 3
  if (name.includes('microsoft') && name.includes('online')) score += online ? 4 : -6
  if (/siri|samantha|daniel|serena|kate|arthur|martha/.test(name)) score += 2
  if (/compact|espeak|robot/.test(name)) score -= 4
  if (v.localService) score += online ? 1 : 8
  else if (!online) score -= 8
  return score
}

export function bestVoice(lang: TtsLang, preferredURI?: string, exclude?: string): SpeechSynthesisVoice | undefined {
  if (preferredURI) {
    const v = voices.find((x) => x.voiceURI === preferredURI)
    if (v) return v
  }
  const online = typeof navigator === 'undefined' ? true : navigator.onLine
  const candidates = voices
    .filter((v) => v.voiceURI !== exclude)
    .map((v) => ({ v, s: scoreVoice(v, lang, online) }))
    .filter((x) => x.s > -50)
    .sort((a, b) => b.s - a.s)
  return candidates[0]?.v
}

export interface SpeakOptions {
  lang: TtsLang
  rate?: number
  voiceURI?: string
  pitch?: number
}

let current: SpeechSynthesisUtterance | null = null

export function stopSpeaking(): void {
  if (!ttsSupported) return
  current = null
  window.speechSynthesis.cancel()
}

/** Czyta tekst; zwraca obietnicę rozwiązaną po zakończeniu (lub przerwaniu). */
export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!ttsSupported || !text.trim()) return
  await loadVoices()
  const synth = window.speechSynthesis
  synth.cancel()
  const clean = text.replace(/_{2,}/g, '…').replace(/\s+—\s+/g, ', ')
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = opts.lang
  u.rate = opts.rate ?? 1
  u.pitch = opts.pitch ?? 1
  const voice = bestVoice(opts.lang, opts.voiceURI)
  if (voice) u.voice = voice
  current = u
  return new Promise((resolve) => {
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      resolve()
    }
    // Zabezpieczenie: niektóre przeglądarki nie wywołują onend
    const timer = setTimeout(done, 2500 + (clean.length * 110) / (opts.rate ?? 1))
    u.onend = done
    u.onerror = done
    // Chrome na Androidzie czasem gubi wypowiedź tuż po cancel()
    setTimeout(() => {
      if (current === u) synth.speak(u)
      else done()
    }, 60)
  })
}

export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      resolve()
    })
  })
}
