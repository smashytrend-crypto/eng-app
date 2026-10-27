import { Circle, RotateCcw, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const supported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

/** Nagraj się i odsłuchaj — działa też bez internetu. */
export function VoiceRecorder() {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded' | 'error'>('idle')
  const [url, setUrl] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const rec = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
      rec.current?.stream.getTracks().forEach((t) => t.stop())
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )

  if (!supported) return null

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' })
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old)
          return URL.createObjectURL(blob)
        })
        setState('recorded')
        if (timer.current) clearInterval(timer.current)
      }
      rec.current = r
      r.start()
      setSeconds(0)
      setState('recording')
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setState('error')
    }
  }
  const stop = () => rec.current?.state === 'recording' && rec.current.stop()

  return (
    <div className="space-y-2">
      {state === 'recording' ? (
        <button type="button" onClick={stop} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 font-semibold text-white">
          <Square size={18} fill="currentColor" /> Zakończ nagranie ({seconds} s)
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-rose-300 bg-white font-semibold text-rose-700 dark:border-rose-800 dark:bg-zinc-900 dark:text-rose-300"
        >
          {state === 'recorded' ? <RotateCcw size={18} /> : <Circle size={18} fill="currentColor" />}
          {state === 'recorded' ? 'Nagraj jeszcze raz' : 'Nagraj się i odsłuchaj'}
        </button>
      )}
      {state === 'recorded' && url && <audio controls src={url} className="w-full" />}
      {state === 'error' && <p className="text-sm text-amber-700 dark:text-amber-300">Brak dostępu do mikrofonu. Powiedz na głos bez nagrywania — to też działa!</p>}
    </div>
  )
}
