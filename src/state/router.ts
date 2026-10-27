import { useSyncExternalStore } from 'react'

/** Prosty router na #hash — działa offline i na każdym hostingu, „wstecz” w telefonie cofa ekran. */
function getPath(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : '/'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, getPath, () => '/')
}

export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  const target = '#' + path
  if (opts.replace) window.location.replace(target)
  else window.location.hash = path
  window.scrollTo(0, 0)
}

export function goBack(fallback = '/'): void {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback, { replace: true })
}

/** Dopasowanie ścieżki ze wzorcem typu "/item/:id". */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean)
  const a = path.split('?')[0].split('/').filter(Boolean)
  if (p.length !== a.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i])
    else if (p[i] !== a[i]) return null
  }
  return params
}

export function queryParam(path: string, name: string): string | null {
  const q = path.split('?')[1]
  if (!q) return null
  return new URLSearchParams(q).get(name)
}
