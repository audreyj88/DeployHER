'use client'
// Shared card UI: shell, step header, buttons, titles, errors, thinking dots.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowLeft, X, type LucideIcon } from 'lucide-react'
import { placeById, type PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'

export const HUES: Record<PlaceId, { rgb: string; a: number }> = {
  setup: { rgb: '20, 48, 32', a: 0.28 },
  interview: { rgb: '4, 47, 46', a: 0.32 },
  debrief: { rgb: '60, 34, 18', a: 0.3 },
  lab: { rgb: '67, 30, 12', a: 0.3 },
  launch: { rgb: '76, 10, 28', a: 0.3 },
  report: { rgb: '66, 42, 8', a: 0.32 },
}

/** Centred card that rises out of the room, with a vignette in the room's hue. */
export function CardShell({ place, className = '', children, onClose, style }: { place: PlaceId; className?: string; children: ReactNode; onClose?: () => void; style?: CSSProperties }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])
  useEffect(() => {
    if (!onClose) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const hue = HUES[place]
  return (
    <>
      <div className={`seed-vignette ${shown ? 'shown' : ''}`} style={{ ['--hue' as string]: hue.rgb, ['--hue-a' as string]: hue.a } as CSSProperties} />
      <div className="seed-wrap">
        <div className={`seed-card ${shown ? 'shown' : ''} ${className}`} style={style} role="dialog" aria-label={placeById(place).title}>
          {children}
        </div>
      </div>
    </>
  )
}

export interface StepDef {
  key: string
  label: string
}

/**
 * Eyebrow + progress segments + close button. Segments up to `current` are filled; `reachable` ones are pale and clickable; the rest are faint.
 */
export function StepHeader({
  eyebrow,
  accent,
  steps,
  current,
  reachable,
  onJump,
  onClose,
  hideClose,
  right,
}: {
  eyebrow: ReactNode
  accent: string
  steps: StepDef[]
  current: number
  reachable: number // highest reachable index
  onJump?: (i: number) => void
  onClose?: () => void
  hideClose?: boolean
  right?: ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: accent }}>
          {eyebrow}
        </div>
        <div className="flex items-center gap-2">
          {right}
          {onClose && !hideClose && (
            <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-black/5 hover:text-slate-800">
              <X size={17} />
            </button>
          )}
        </div>
      </div>
      {steps.length > 1 && (
        <div className="mt-2.5 flex gap-1.5">
          {steps.map((s, i) => {
            const filled = i <= current
            const can = i <= reachable && onJump
            return (
              <button
                key={s.key}
                disabled={!can}
                onClick={() => can && onJump!(i)}
                className={`group min-w-0 flex-1 text-left ${can ? 'cursor-pointer' : 'cursor-default'}`}
                aria-label={s.label}
              >
                <div
                  className="h-1.5 rounded-full transition-colors"
                  style={{ background: filled ? accent : i <= reachable ? `${accent}40` : `${accent}14` }}
                />
                <div className={`mt-1 hidden truncate text-[10.5px] font-semibold sm:block ${i === current ? '' : 'opacity-60'}`} style={{ color: i <= reachable ? accent : '#94A3B8' }}>
                  {s.label}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** A Lucide icon sized and aligned to sit inline with text. */
export function Ico({ icon: Icon, size = 15, className = '', style }: { icon: LucideIcon; size?: number; className?: string; style?: CSSProperties }) {
  return <Icon size={size} strokeWidth={2.2} aria-hidden className={`inline-block shrink-0 align-[-0.17em] ${className}`} style={style} />
}

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />
}

export function Btn({
  children,
  onClick,
  accent = '#0F172A',
  variant = 'primary',
  busy,
  disabled,
  className = '',
  type = 'button',
  textColor,
}: {
  children: ReactNode
  onClick?: () => void
  accent?: string
  variant?: 'primary' | 'ghost' | 'soft' | 'danger'
  busy?: boolean
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  textColor?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50'
  const style: CSSProperties =
    variant === 'primary'
      ? { background: accent, color: textColor ?? '#fff', boxShadow: `0 6px 16px -6px ${accent}99` }
      : variant === 'soft'
        ? { background: `${accent}14`, color: accent }
        : variant === 'danger'
          ? { background: '#DC2626', color: '#fff' }
          : { color: '#475569' }
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy} className={`${base} ${variant === 'ghost' ? 'hover:bg-black/5' : 'hover:brightness-105'} ${className}`} style={style}>
      {busy && <Spinner />}
      {children}
    </button>
  )
}

export function NavRow({
  onBack,
  children,
  backLabel = (
    <>
      <ArrowLeft size={15} /> Back
    </>
  ),
}: { onBack?: () => void; children?: ReactNode; backLabel?: ReactNode }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <div>{onBack && <Btn variant="ghost" onClick={onBack}>{backLabel}</Btn>}</div>
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  )
}

export function SectionTitle({ eyebrow, title, sub, accent }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; accent: string }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: accent }}>
          {eyebrow}
        </div>
      )}
      <h2 className="text-[21px] font-extrabold leading-tight tracking-tight text-slate-900">{title}</h2>
      {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{sub}</p>}
    </div>
  )
}

export function ThinkingDots({ color = 'currentColor' }: { color?: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="dot-bounce h-1.5 w-1.5 rounded-full" style={{ background: color, animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  )
}

/** Red dismissible strip at the top of a card body. Reads the global error. */
export function ErrorStrip({ message, onDismiss }: { message?: string | null; onDismiss?: () => void }) {
  const err = useGame((s) => s.error)
  const set = useGame((s) => s.set)
  const m = message ?? err
  if (!m) return null
  return (
    <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
      <span>{m}</span>
      <button className="shrink-0 text-red-500 hover:text-red-800" onClick={() => (onDismiss ? onDismiss() : set({ error: null }))} aria-label="Dismiss">
        <X size={15} />
      </button>
    </div>
  )
}

/** Tinted info card: `{tone}0D` background with a `{tone}33` border. */
export function Tinted({ tone, children, className = '' }: { tone: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${className}`} style={{ background: `${tone}0D`, borderColor: `${tone}33` }}>
      {children}
    </div>
  )
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white/80 p-3.5 ${className}`}>{children}</div>
}

/** Run an action, surfacing errors in the global error strip. Returns the result or null. */
export function useAct() {
  const act = useGame((s) => s.act)
  const set = useGame((s) => s.set)
  return async <T = Record<string, unknown>,>(a: { type: string; [k: string]: unknown }) => {
    try {
      return await act<T>(a)
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
      return null
    }
  }
}

export const useBusy = (...types: string[]) => useGame((s) => types.some((t) => s.busy[t]))

/** Close the open card and stand up / leave as appropriate. */
export function useCloseCard() {
  const set = useGame((s) => s.set)
  return () => set({ card: null, error: null })
}
