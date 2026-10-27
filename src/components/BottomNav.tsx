import { BarChart3, BookOpen, Home, Map, Settings } from 'lucide-react'
import { navigate } from '../state/router'

const TABS = [
  { path: '/', label: 'Dziś', icon: Home },
  { path: '/path', label: 'Ścieżka', icon: Map },
  { path: '/phrases', label: 'Rozmówki', icon: BookOpen },
  { path: '/progress', label: 'Postępy', icon: BarChart3 },
  { path: '/settings', label: 'Ustawienia', icon: Settings },
]

export function BottomNav({ route }: { route: string }) {
  const active = (p: string) => {
    if (p === '/') return route === '/'
    if (p === '/phrases') return ['/phrases', '/item', '/custom'].some((x) => route.startsWith(x))
    return route.startsWith(p)
  }
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
              active(path) ? 'text-violet-700 dark:text-violet-300' : 'text-zinc-500 dark:text-zinc-400'
            }`}
            aria-current={active(path) ? 'page' : undefined}
          >
            <Icon size={24} strokeWidth={active(path) ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
