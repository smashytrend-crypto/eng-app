import { ChevronLeft } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { goBack } from '../state/router'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'hero'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 disabled:bg-violet-300 dark:disabled:bg-violet-900',
  hero: 'bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 text-white shadow-lg shadow-fuchsia-500/20 active:scale-[0.99]',
  secondary:
    'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
  ghost: 'text-violet-700 hover:bg-violet-50 active:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-950',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
}

export function Button({
  variant = 'primary',
  size = 'lg',
  full,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'lg' | 'xl'; full?: boolean }) {
  const sizes = { md: 'min-h-11 px-4 text-base', lg: 'min-h-14 px-5 text-lg', xl: 'min-h-20 px-6 text-2xl' }
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]} ${VARIANTS[variant]} ${full ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {children}
    </div>
  )
}

export function Screen({
  title,
  back,
  right,
  children,
  bottomNav = true,
}: {
  title?: string
  back?: boolean | string
  right?: ReactNode
  children: ReactNode
  bottomNav?: boolean
}) {
  return (
    <div className={`pt-safe mx-auto w-full max-w-md px-4 ${bottomNav ? 'pb-28' : 'pb-8'}`}>
      {(title || back) && (
        <header className="flex min-h-14 items-center gap-2 py-2">
          {back && (
            <button
              aria-label="Wstecz"
              onClick={() => goBack(typeof back === 'string' ? back : '/')}
              className="-ml-2 rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          {title && <h1 className="flex-1 truncate text-2xl font-bold">{title}</h1>}
          {right}
        </header>
      )}
      {children}
    </div>
  )
}

export function ProgressBar({ value, className = '', color = 'bg-violet-600' }: { value: number; className?: string; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800 ${className}`}>
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Badge({ children, tone = 'zinc' }: { children: ReactNode; tone?: 'zinc' | 'violet' | 'amber' | 'emerald' | 'sky' | 'rose' }) {
  const tones = {
    zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    sky: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    rose: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-zinc-500 dark:text-zinc-400">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? 'bg-violet-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="grid gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-xl px-2 text-sm font-semibold transition ${
            value === o.value ? 'bg-white text-violet-700 shadow dark:bg-zinc-950 dark:text-violet-300' : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v: number) => String(v),
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  const round = (v: number) => Math.round(v * 100) / 100
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Mniej"
        onClick={() => onChange(round(Math.max(min, value - step)))}
        className="h-12 w-12 rounded-2xl bg-zinc-100 text-2xl font-bold dark:bg-zinc-800"
      >
        −
      </button>
      <span className="min-w-16 text-center text-2xl font-bold tabular-nums">{format(value)}</span>
      <button
        type="button"
        aria-label="Więcej"
        onClick={() => onChange(round(Math.min(max, value + step)))}
        className="h-12 w-12 rounded-2xl bg-zinc-100 text-2xl font-bold dark:bg-zinc-800"
      >
        +
      </button>
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{children}</h2>
}

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>{children}</p>
}

export function Spinner() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
    </div>
  )
}
