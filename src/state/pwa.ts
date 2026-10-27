import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

/** Stan aplikacji offline: gotowa do pracy bez internetu / dostępna nowa wersja. */
interface PwaState {
  offlineReady: boolean
  needRefresh: boolean
}

let state: PwaState = { offlineReady: false, needRefresh: false }
const listeners = new Set<() => void>()
let updateSW: ((reload?: boolean) => Promise<void>) | null = null

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function initPwa(): void {
  if (!('serviceWorker' in navigator)) return
  updateSW = registerSW({
    immediate: true,
    onOfflineReady: () => set({ offlineReady: true }),
    onNeedRefresh: () => set({ needRefresh: true }),
    onRegisteredSW: (_url, reg) => {
      // Sprawdzaj aktualizacje co godzinę, gdy aplikacja jest otwarta
      if (reg) setInterval(() => void reg.update(), 60 * 60 * 1000)
      if (reg?.active) set({ offlineReady: true })
    },
  })
}

export function applyUpdate(): void {
  void updateSW?.(true)
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

/** Prośba o trwałe przechowywanie danych (przeglądarka rzadziej je wtedy czyści). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
