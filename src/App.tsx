import { useEffect } from 'react'
import { BottomNav } from './components/BottomNav'
import { Spinner } from './components/ui'
import { AudioScreen } from './screens/audio/AudioScreen'
import { LessonScreen } from './screens/lesson/LessonScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { MissionScreen } from './screens/path/MissionScreen'
import { PathScreen } from './screens/path/PathScreen'
import { CustomItemForm } from './screens/phrases/CustomItemForm'
import { ItemScreen } from './screens/phrases/ItemScreen'
import { VocabKnownScreen, VocabSetScreen } from './screens/phrases/VocabScreens'
import { ModuleScreen } from './screens/phrases/ModuleScreen'
import { PhrasesScreen } from './screens/phrases/PhrasesScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TodayScreen } from './screens/TodayScreen'
import { useSettings } from './state/hooks'
import { matchRoute, useRoute } from './state/router'
import { applyTheme } from './state/theme'

const FULLSCREEN = ['/lesson', '/audio', '/mission']

export function App() {
  const settings = useSettings()
  const route = useRoute()

  useEffect(() => {
    if (settings) applyTheme(settings.theme)
  }, [settings])

  if (!settings) return <Spinner />
  if (!settings.onboarded) return <OnboardingScreen />

  const path = route.split('?')[0]
  const fullscreen = FULLSCREEN.some((p) => path.startsWith(p))

  return (
    <>
      <Routes path={path} />
      {!fullscreen && <BottomNav route={path} />}
    </>
  )
}

function Routes({ path }: { path: string }) {
  let m: Record<string, string> | null
  if (path === '/lesson') return <LessonScreen />
  if (path === '/audio') return <AudioScreen />
  if (path === '/mission') return <MissionScreen />
  if (path === '/settings') return <SettingsScreen />
  if (path === '/path') return <PathScreen />
  if (path === '/progress') return <ProgressScreen />
  if (path === '/phrases') return <PhrasesScreen />
  if ((m = matchRoute('/phrases/module/:id', path))) return <ModuleScreen moduleId={m.id} />
  if (path === '/vocab/known') return <VocabKnownScreen />
  if ((m = matchRoute('/vocab/:id', path))) return <VocabSetScreen key={m.id} setId={m.id} />
  if ((m = matchRoute('/item/:id', path))) return <ItemScreen key={m.id} itemId={m.id} />
  if (path === '/custom/new') return <CustomItemForm />
  if ((m = matchRoute('/custom/:id', path))) return <CustomItemForm key={m.id} itemId={m.id} />
  return <TodayScreen />
}
