import { Download, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Card, Muted, Screen, SectionTitle, Segmented, Stepper, Toggle } from '../components/ui'
import type { Accent, Settings, Theme } from '../db/db'
import { backupFileName, clearAll, exportBackup, importBackup, parseBackup } from '../db/backup'
import { saveSettings } from '../db/repo'
import { dayKey, diffDays, formatDatePl, pluralN } from '../lib/dates'
import { saveFile } from '../lib/download'
import type { TypingPreference } from '../lib/lessonQueue'
import { recognitionSupported } from '../speech/recognition'
import { loadVoices, ttsSupported, voicesFor } from '../speech/tts'
import { useSettings, useSpeech } from '../state/hooks'
import { usePwa } from '../state/pwa'
import { queryParam, useRoute } from '../state/router'
import { applyTheme } from '../state/theme'

export function SettingsScreen() {
  const settings = useSettings()
  const route = useRoute()
  const backupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (settings && queryParam(route, 'section') === 'backup') backupRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [settings, route])

  if (!settings) return <Screen title="Ustawienia">{null}</Screen>
  const set = (patch: Partial<Settings>) => saveSettings(patch)

  return (
    <Screen title="Ustawienia">
      <SectionTitle>Plan</SectionTitle>
      <Card className="space-y-5">
        <div className="space-y-2">
          <p className="font-semibold">Data docelowa</p>
          <input
            type="date"
            value={settings.targetDate}
            onChange={(e) => e.target.value && set({ targetDate: e.target.value })}
            className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-lg dark:border-zinc-700 dark:bg-zinc-900"
          />
          <Muted>
            {formatDatePl(settings.targetDate)} — za {pluralN(Math.max(0, diffDays(dayKey(), settings.targetDate)), 'dzień', 'dni', 'dni')}
          </Muted>
        </div>
        <Row label="Nowe elementy dziennie" hint="Więcej = szybciej, ale dłuższe powtórki.">
          <Stepper value={settings.newPerDay} onChange={(v) => set({ newPerDay: v })} min={1} max={30} />
        </Row>
        <Row label="Nowe słówka ze słownika dziennie" hint="Osobno od zwrotów: najczęstsze słowa po kolei. 0 = wyłączone.">
          <Stepper value={settings.vocabPerDay} onChange={(v) => set({ vocabPerDay: v })} min={0} max={30} />
        </Row>
        <Row label="Maks. powtórek dziennie" hint="Zaległości ponad limit przejdą na kolejne dni.">
          <Stepper value={settings.maxReviews} onChange={(v) => set({ maxReviews: v })} min={20} max={300} step={10} />
        </Row>
      </Card>

      <SectionTitle>Ćwiczenia</SectionTitle>
      <Card className="space-y-2">
        <p className="font-semibold">Ćwiczenia z pisaniem</p>
        <Muted>Wpisywanie, luki i dyktando. „Rzadko” — gdy uczysz się w drodze lub na siłowni.</Muted>
        <div className="pt-1">
          <Segmented<TypingPreference>
            value={settings.typing}
            onChange={(v) => set({ typing: v })}
            options={[
              { value: 'often', label: 'Często' },
              { value: 'sometimes', label: 'Czasem' },
              { value: 'rarely', label: 'Rzadko' },
            ]}
          />
        </div>
        <Toggle checked={settings.autoPlay} onChange={(v) => set({ autoPlay: v })} label="Automatyczny odsłuch" hint="Lektor czyta odpowiedź po odsłonięciu." />
        <Toggle
          checked={settings.recognition && recognitionSupported}
          onChange={(v) => set({ recognition: v })}
          label="Rozpoznawanie mowy"
          hint={recognitionSupported ? 'Mikrofon porównuje to, co mówisz, z poprawną wersją (wymaga internetu).' : 'Ta przeglądarka nie obsługuje — oceniasz się sam.'}
        />
      </Card>

      <SectionTitle>Lektor</SectionTitle>
      <VoiceSettings settings={settings} />

      <SectionTitle>Wygląd</SectionTitle>
      <Card>
        <Segmented<Theme>
          value={settings.theme}
          onChange={(v) => {
            applyTheme(v)
            void set({ theme: v })
          }}
          options={[
            { value: 'system', label: 'Systemowy' },
            { value: 'light', label: 'Jasny' },
            { value: 'dark', label: 'Ciemny' },
          ]}
        />
      </Card>

      <div ref={backupRef}>
        <SectionTitle>Kopia zapasowa</SectionTitle>
      </div>
      <BackupSettings settings={settings} />

      <SectionTitle>O aplikacji</SectionTitle>
      <AboutCard />
      <DangerZone />
    </Screen>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-40 flex-1">
        <p className="font-semibold">{label}</p>
        {hint && <Muted>{hint}</Muted>}
      </div>
      {children}
    </div>
  )
}

function VoiceSettings({ settings }: { settings: Settings }) {
  const speech = useSpeech()
  const [voices, setVoices] = useState<{ en: SpeechSynthesisVoice[]; pl: SpeechSynthesisVoice[] }>({ en: [], pl: [] })
  useEffect(() => {
    void loadVoices().then(() => setVoices({ en: voicesFor('en'), pl: voicesFor('pl') }))
  }, [])
  if (!ttsSupported) {
    return (
      <Card>
        <Muted>Ta przeglądarka nie obsługuje lektora. Najlepiej działa Chrome na Androidzie albo Safari na iPhonie.</Muted>
      </Card>
    )
  }
  const select = (value: string, onChange: (v: string) => void, list: SpeechSynthesisVoice[]) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-2xl border-2 border-zinc-200 bg-white px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="">Automatycznie (najlepszy dostępny)</option>
      {list.map((v) => (
        <option key={v.voiceURI} value={v.voiceURI}>
          {v.name} ({v.lang}){v.localService ? '' : ' · online'}
        </option>
      ))}
    </select>
  )
  return (
    <Card className="space-y-5">
      <Segmented<Accent>
        value={settings.accent}
        onChange={(v) => saveSettings({ accent: v, voiceEn: '', voiceEn2: '' })}
        options={[
          { value: 'en-GB', label: '🇬🇧 Brytyjski' },
          { value: 'en-US', label: '🇺🇸 Amerykański' },
        ]}
      />
      <Row label="Tempo mowy">
        <Stepper value={settings.rate} onChange={(v) => saveSettings({ rate: v })} min={0.6} max={1.3} step={0.05} format={(v) => `${v.toFixed(2).replace('.', ',')}×`} />
      </Row>
      <div className="space-y-2">
        <p className="font-semibold">Głos angielski</p>
        {select(settings.voiceEn, (v) => saveSettings({ voiceEn: v }), voices.en.filter((v) => v.lang.replace('_', '-').startsWith(settings.accent.slice(0, 2))))}
      </div>
      <div className="space-y-2">
        <p className="font-semibold">Drugi głos (dialogi)</p>
        {select(settings.voiceEn2, (v) => saveSettings({ voiceEn2: v }), voices.en)}
      </div>
      <div className="space-y-2">
        <p className="font-semibold">Głos polski (tryb audio)</p>
        {voices.pl.length ? (
          select(settings.voicePl, (v) => saveSettings({ voicePl: v }), voices.pl)
        ) : (
          <Muted>Brak polskiego głosu w telefonie. Na Androidzie: Ustawienia → Zamiana tekstu na mowę → Google → zainstaluj język polski.</Muted>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="md" onClick={() => speech.en("Hi! How's it going? Let's practise some English.")}>
          Test EN
        </Button>
        <Button variant="secondary" size="md" onClick={() => speech.pl('Cześć! Tak brzmi polski lektor.')}>
          Test PL
        </Button>
      </div>
      <Muted>Głosy oznaczone „online” nie działają bez internetu. Aplikacja sama wybiera głos offline, gdy nie ma sieci.</Muted>
    </Card>
  )
}

function BackupSettings({ settings }: { settings: Settings }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const doExport = async () => {
    const backup = await exportBackup()
    const how = await saveFile(JSON.stringify(backup), backupFileName())
    await saveSettings({ lastBackupAt: Date.now() })
    setMsg({ ok: true, text: how === 'shared' ? 'Kopia gotowa — zapisz ją w Plikach lub wyślij sobie.' : 'Kopia zapisana w folderze Pobrane.' })
  }

  const doImport = async (file: File) => {
    try {
      const backup = parseBackup(await file.text())
      const when = new Date(backup.exportedAt).toLocaleDateString('pl-PL')
      if (!window.confirm(`Wczytać kopię z ${when}? Obecne postępy w tym telefonie zostaną zastąpione.`)) return
      const res = await importBackup(backup)
      const s = (backup.tables.settings[0] as Partial<Settings> | undefined)?.theme
      if (s) applyTheme(s)
      setMsg({ ok: true, text: `Wczytano: ${pluralN(res.cards, 'element', 'elementy', 'elementów')} w nauce, ${pluralN(res.days, 'dzień', 'dni', 'dni')} historii.` })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    }
  }

  return (
    <Card className="space-y-3">
      <Muted>
        Twoje postępy są zapisane tylko w tym telefonie. Raz na tydzień–dwa zapisz kopię (np. na Dysk Google albo wyślij sobie mailem).
        {settings.lastBackupAt && <> Ostatnia kopia: {new Date(settings.lastBackupAt).toLocaleDateString('pl-PL')}.</>}
      </Muted>
      <Button full onClick={doExport}>
        <Download size={20} /> Zapisz kopię do pliku
      </Button>
      <Button variant="secondary" full onClick={() => fileRef.current?.click()}>
        <Upload size={20} /> Wczytaj kopię z pliku
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void doImport(f)
        }}
      />
      {msg && <p className={`text-sm font-medium ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>{msg.text}</p>}
    </Card>
  )
}

function AboutCard() {
  const pwa = usePwa()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])
  return (
    <Card className="space-y-1 text-sm">
      <p>
        <b>Speak by Summer</b> · wersja {__APP_VERSION__}
      </p>
      <p className="text-zinc-600 dark:text-zinc-400">Tryb offline: {pwa.offlineReady ? 'gotowy ✓' : 'przygotowuję…'}</p>
      {persisted !== null && (
        <p className="text-zinc-600 dark:text-zinc-400">Trwały zapis danych: {persisted ? 'włączony ✓' : 'zależny od przeglądarki (rób kopie)'}</p>
      )}
    </Card>
  )
}

function DangerZone() {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="mt-8 space-y-2">
      {confirming ? (
        <Card className="space-y-3 border-rose-300 dark:border-rose-900">
          <p className="font-semibold">Na pewno usunąć wszystkie postępy?</p>
          <Muted>Tego nie da się cofnąć. Najpierw zapisz kopię, jeśli chcesz ją zachować.</Muted>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Anuluj
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await clearAll()
                window.location.hash = '/'
                window.location.reload()
              }}
            >
              Usuń
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="ghost" full onClick={() => setConfirming(true)} className="text-rose-600 dark:text-rose-400">
          <Trash2 size={18} /> Usuń wszystkie dane
        </Button>
      )}
    </div>
  )
}
