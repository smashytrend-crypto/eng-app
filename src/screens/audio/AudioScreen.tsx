import { useLiveQuery } from 'dexie-react-hooks'
import { Headphones, Pause, Play, Repeat, SkipBack, SkipForward, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Muted, Segmented, Toggle } from '../../components/ui'
import { db } from '../../db/db'
import { saveSettings, updateDay } from '../../db/repo'
import { answerPauseMs, buildPlaylist, type AudioSource, type AudioTrack } from '../../lib/audioPlaylist'
import { dayKey } from '../../lib/dates'
import { hardItemIds } from '../../lib/stats'
import { loadVoices, stopSpeaking, ttsSupported, voicesFor, wait } from '../../speech/tts'
import { useAllItems, useCards, useFavorites, useSettings, useSpeech } from '../../state/hooks'
import { navigate } from '../../state/router'

type Phase = 'idle' | 'pl' | 'pause' | 'en1' | 'en2'

const SOURCES: Array<{ value: AudioSource; label: string; hint: string }> = [
  { value: 'due', label: 'Na dziś', hint: 'Elementy do powtórki dziś i jutro' },
  { value: 'recent', label: 'Nowe', hint: 'Poznane w ostatnim tygodniu' },
  { value: 'known', label: 'Wszystkie', hint: 'Losowo spośród poznanych' },
  { value: 'favorites', label: 'Ulubione', hint: 'Twoje gwiazdki' },
  { value: 'hard', label: 'Trudne', hint: 'Najczęściej zapominane' },
]

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // np. tryb oszczędzania baterii — trudno, ekran może zgasnąć
      }
    }
    void acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release().catch(() => {})
    }
  }, [active])
}

/** Tryb audio: lektor czyta po polsku → pauza na Twoją odpowiedź → angielski dwa razy. */
export function AudioScreen() {
  const all = useAllItems()
  const cards = useCards()
  const favorites = useFavorites()
  const settings = useSettings()
  const logs = useLiveQuery(() => db.reviewLogs.toArray(), [])
  const speech = useSpeech()
  const [source, setSource] = useState<AudioSource>('due')
  const [tracks, setTracks] = useState<AudioTrack[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [playing, setPlaying] = useState(false)
  const [loop, setLoop] = useState(true)
  const [plVoice, setPlVoice] = useState(true)
  const runId = useRef(0)

  useWakeLock(playing)

  useEffect(() => {
    void loadVoices().then(() => setPlVoice(voicesFor('pl').length > 0))
    return () => {
      runId.current++
      stopSpeaking()
    }
  }, [])

  // Czas słuchania liczy się do czasu nauki
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      void updateDay(dayKey(), (d) => ({ ...d, seconds: d.seconds + 15, audioSeconds: d.audioSeconds + 15 }))
    }, 15_000)
    return () => clearInterval(t)
  }, [playing])

  const preview = useMemo(() => {
    if (!all || !cards || !favorites || !logs) return []
    return buildPlaylist(source, { items: all.byId, cards, favorites, hard: hardItemIds(cards, logs, new Date()), now: Date.now() })
  }, [source, all, cards, favorites, logs])

  const run = useCallback(
    async (list: AudioTrack[], from: number) => {
      const my = ++runId.current
      const alive = () => runId.current === my
      const factor = settings?.audioPause ?? 1
      let i = from
      while (alive()) {
        if (i >= list.length) {
          if (!loop) break
          i = 0
        }
        setIdx(i)
        const t = list[i]
        if (t.lines) {
          setPhase('pl')
          await speech.pl(`Dialog: ${t.pl}`)
          setPhase('en1')
          for (const line of t.lines) {
            if (!alive()) return
            await speech.en(line.en, { voice: line.speaker === 'B' ? 2 : 1 })
            await wait(300)
          }
          await wait(1200)
        } else {
          setPhase('pl')
          await speech.pl(t.pl)
          if (!alive()) return
          setPhase('pause')
          await wait(answerPauseMs(t.en, factor))
          if (!alive()) return
          setPhase('en1')
          await speech.en(t.en)
          if (!alive()) return
          await wait(700)
          setPhase('en2')
          await speech.en(t.en, { factor: 0.9 })
          if (!alive()) return
          await wait(1300)
        }
        i++
      }
      if (alive()) {
        setPlaying(false)
        setPhase('idle')
      }
    },
    [settings, speech, loop],
  )

  const start = (from = idx) => {
    const list = tracks ?? preview
    if (!list.length) return
    if (!tracks) setTracks(list)
    setPlaying(true)
    void run(list, from)
  }
  const pause = () => {
    runId.current++
    stopSpeaking()
    setPlaying(false)
    setPhase('idle')
  }
  const jump = (delta: number) => {
    const list = tracks ?? preview
    if (!list.length) return
    const n = (idx + delta + list.length) % list.length
    runId.current++
    stopSpeaking()
    setIdx(n)
    if (playing) void run(list, n)
  }
  const changeSource = (s: AudioSource) => {
    pause()
    setSource(s)
    setTracks(null)
    setIdx(0)
  }

  const list = tracks ?? preview
  const current = list[idx]

  return (
    <div className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8">
      <header className="flex h-16 items-center gap-3">
        <button aria-label="Zamknij tryb audio" onClick={() => navigate('/')} className="-ml-2 rounded-full p-2 text-zinc-500">
          <X size={26} />
        </button>
        <Headphones className="text-violet-600" />
        <h1 className="text-xl font-bold">Tryb audio</h1>
      </header>

      {!ttsSupported ? (
        <Card>
          <Muted>Ta przeglądarka nie ma lektora. Spróbuj w Chrome na Androidzie albo Safari na iPhonie.</Muted>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => changeSource(s.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    source === s.value ? 'bg-violet-600 text-white' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <Muted>
              {SOURCES.find((s) => s.value === source)?.hint} · {list.length} {list.length === 1 ? 'zdanie' : 'zdań'}
            </Muted>
          </div>

          <Card className="mt-4 flex min-h-56 flex-col justify-center text-center">
            {current ? (
              <>
                <p className="text-sm font-semibold text-zinc-500">
                  {idx + 1} / {list.length}
                </p>
                <p className="mt-2 text-2xl font-bold">{current.pl}</p>
                <p className={`mt-3 text-xl font-semibold text-violet-800 transition dark:text-violet-200 ${phase === 'en1' || phase === 'en2' ? 'opacity-100' : 'opacity-0'}`}>
                  {current.lines ? current.lines.map((l) => l.en).join(' / ') : current.en}
                </p>
                <p className="mt-4 text-sm font-semibold text-fuchsia-600">
                  {phase === 'pl' && 'Słuchaj…'}
                  {phase === 'pause' && 'Powiedz to po angielsku!'}
                  {(phase === 'en1' || phase === 'en2') && 'Powtórz za lektorem'}
                </p>
              </>
            ) : (
              <Muted>Brak zdań w tej grupie. Wybierz inną albo zrób najpierw lekcję.</Muted>
            )}
          </Card>

          <div className="mt-6 flex items-center justify-center gap-6">
            <button type="button" aria-label="Poprzednie" onClick={() => jump(-1)} className="rounded-full p-3 text-zinc-600 dark:text-zinc-300">
              <SkipBack size={32} />
            </button>
            <button
              type="button"
              aria-label={playing ? 'Pauza' : 'Odtwarzaj'}
              disabled={!list.length}
              onClick={() => (playing ? pause() : start())}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg disabled:opacity-40"
            >
              {playing ? <Pause size={44} fill="currentColor" /> : <Play size={44} fill="currentColor" className="ml-1" />}
            </button>
            <button type="button" aria-label="Następne" onClick={() => jump(1)} className="rounded-full p-3 text-zinc-600 dark:text-zinc-300">
              <SkipForward size={32} />
            </button>
          </div>

          <Card className="mt-6 space-y-3">
            <p className="font-semibold">Czas na odpowiedź</p>
            <Segmented<string>
              value={String(settings?.audioPause ?? 1)}
              onChange={(v) => saveSettings({ audioPause: Number(v) })}
              options={[
                { value: '0.7', label: 'Krótki' },
                { value: '1', label: 'Średni' },
                { value: '1.5', label: 'Długi' },
              ]}
            />
            <Toggle checked={loop} onChange={setLoop} label="Powtarzaj w kółko" hint="Po ostatnim zdaniu zacznij od nowa." />
          </Card>

          <div className="mt-4 space-y-2">
            <Muted>
              <Repeat size={14} className="mr-1 inline" />
              Ekran nie zgaśnie, dopóki słuchasz. Nie blokuj telefonu — wtedy przeglądarka wycisza lektora.
            </Muted>
            {!plVoice && (
              <Muted className="text-amber-700 dark:text-amber-300">
                Brak polskiego głosu w telefonie — polskie zdania mogą brzmieć dziwnie. Zainstaluj go: Ustawienia telefonu → Zamiana tekstu na mowę.
              </Muted>
            )}
          </div>
          {!playing && tracks && (
            <Button variant="ghost" className="mt-2" onClick={() => start(0)}>
              Od początku
            </Button>
          )}
        </>
      )}
    </div>
  )
}
