import { useEffect } from 'react'
import { BottomNav } from './components/BottomNav'
import { Spinner } from './components/ui'
import { LessonScreen } from './screens/lesson/LessonScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { TodayScreen } from './screens/TodayScreen'
import { useSettings } from './state/hooks'
import { useRoute } from './state/router'
import { applyTheme } from './state/theme'

const FULLSCREEN = ['/lesson', '/audio', '/mission', '/claude']

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
  if (path === '/lesson') return <LessonScreen />
  if (path === '/settings') return <SettingsScreen />
  if (path.startsWith('/path')) return <PlaceholderScreen title="Ścieżka do wakacji" />
  if (path.startsWith('/phrases')) return <PlaceholderScreen title="Rozmówki" />
  if (path.startsWith('/progress')) return <PlaceholderScreen title="Postępy" />
  return <TodayScreen />
}
