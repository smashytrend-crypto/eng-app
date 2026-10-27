import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { allContentItems } from '../content'
import type { Item } from '../content/schema'
import { db, type DayRow, type Settings } from '../db/db'
import { defaultSettings, emptyDay } from '../db/repo'
import { dayKey } from '../lib/dates'
import type { StoredCard } from '../lib/srs'
import { bestVoice, loadVoices, speak, stopSpeaking, type TtsLang } from '../speech/tts'

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => ({ ...defaultSettings(), ...(await db.settings.get('main')) }), [])
}

/** Bieżący dzień nauki — odświeża się po 4:00 i po powrocie do aplikacji. */
export function useToday(): string {
  const [key, setKey] = useState(() => dayKey())
  useEffect(() => {
    const update = () => setKey(dayKey())
    const t = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])
  return key
}

export function useDay(key: string): DayRow | undefined {
  return useLiveQuery(async () => ({ ...emptyDay(key), ...(await db.days.get(key)) }), [key])
}

export function useCards(): Map<string, StoredCard> | undefined {
  return useLiveQuery(async () => new Map((await db.cards.toArray()).map((c) => [c.itemId, c])), [])
}

export function useCustomItems(): Item[] | undefined {
  return useLiveQuery(() => db.customItems.toArray(), [])
}

/** Wszystkie elementy: własne zwroty + treści programu + słownik. */
export function useAllItems(): { items: Item[]; byId: Map<string, Item> } | undefined {
  const custom = useCustomItems()
  return useMemo(() => {
    if (!custom) return undefined
    const sortedCustom = [...custom].sort((a, b) => a.order - b.order)
    const items = [...sortedCustom, ...allContentItems]
    return { items, byId: new Map(items.map((i) => [i.id, i])) }
  }, [custom])
}

export function useFavorites(): Set<string> | undefined {
  return useLiveQuery(async () => new Set((await db.favorites.toArray()).map((f) => f.itemId)), [])
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export interface Speech {
  /** Czyta po angielsku. factor = mnożnik tempa (0,8 dla wolniejszego). voice 2 = drugi głos (dialogi). */
  en: (text: string, opts?: { factor?: number; voice?: 1 | 2 }) => Promise<void>
  pl: (text: string) => Promise<void>
  stop: () => void
}

export function useSpeech(): Speech {
  const settings = useSettings()
  useEffect(() => {
    void loadVoices()
  }, [])
  const en = useCallback(
    async (text: string, opts: { factor?: number; voice?: 1 | 2 } = {}) => {
      const s = settings ?? defaultSettings()
      const lang: TtsLang = s.accent
      const primary = bestVoice(lang, s.voiceEn || undefined)
      let voiceURI = primary?.voiceURI
      let pitch = 1
      if (opts.voice === 2) {
        const second = bestVoice(lang, s.voiceEn2 || undefined, primary?.voiceURI)
        if (second && second.voiceURI !== primary?.voiceURI) voiceURI = second.voiceURI
        else pitch = 0.8
      }
      await speak(text, { lang, rate: s.rate * (opts.factor ?? 1), voiceURI, pitch })
    },
    [settings],
  )
  const pl = useCallback(
    async (text: string) => {
      const s = settings ?? defaultSettings()
      await speak(text, { lang: 'pl-PL', rate: Math.min(1.1, s.rate + 0.05), voiceURI: s.voicePl || undefined })
    },
    [settings],
  )
  return useMemo(() => ({ en, pl, stop: stopSpeaking }), [en, pl])
}
