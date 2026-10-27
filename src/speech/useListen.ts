import { useCallback, useEffect, useRef, useState } from 'react'
import { listen, recognitionSupported, type ListenError, type ListenHandle } from './recognition'

export type ListenState = 'idle' | 'listening' | 'done' | 'error'

/** Hook do jednorazowego słuchania (mikrofon → tekst). */
export function useListen(lang: string) {
  const [state, setState] = useState<ListenState>('idle')
  const [interim, setInterim] = useState('')
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [error, setError] = useState<ListenError | null>(null)
  const handle = useRef<ListenHandle | null>(null)

  useEffect(() => () => handle.current?.stop(), [])

  const start = useCallback(async (): Promise<string[]> => {
    if (!recognitionSupported) {
      setError('unsupported')
      setState('error')
      return []
    }
    setInterim('')
    setAlternatives([])
    setError(null)
    setState('listening')
    const h = listen(lang, setInterim)
    handle.current = h
    const res = await h.result
    handle.current = null
    if (res.error && !res.alternatives.length) {
      setError(res.error)
      setState('error')
      return []
    }
    setAlternatives(res.alternatives)
    setState('done')
    return res.alternatives
  }, [lang])

  const stop = useCallback(() => handle.current?.stop(), [])
  const reset = useCallback(() => {
    handle.current?.stop()
    setState('idle')
    setInterim('')
    setAlternatives([])
    setError(null)
  }, [])

  return { state, interim, alternatives, error, start, stop, reset }
}
