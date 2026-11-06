'use client'
import { useEffect, useRef } from 'react'

const TEAL = '45,212,191'
const LAVENDER = '196,181,253'
const BARS = 72

/**
 * Audio-reactive halo: 72 radial bars mirrored left/right around a ring at r 58.
 * Shows Maya's output frequencies in teal while she speaks, otherwise your mic in lavender; breathes when idle.
 */
export function Halo({
  size = 210,
  speaking,
  live,
  getOutput,
  getInput,
  children,
}: {
  size?: number
  speaking: boolean
  live: boolean
  getOutput?: () => Uint8Array | undefined
  getInput?: () => Uint8Array | undefined
  children?: React.ReactNode
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({ speaking, live, getOutput, getInput })
  state.current = { speaking, live, getOutput, getInput }
  const levels = useRef(new Float32Array(BARS / 2))

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = size * dpr
    c.height = size * dpr
    const ctx = c.getContext('2d')!
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    const draw = (t: number) => {
      const { speaking: sp, live: lv, getOutput: go, getInput: gi } = state.current
      let data: Uint8Array | undefined
      try {
        data = lv ? (sp ? go?.() : gi?.()) : undefined
      } catch {
        data = undefined
      }
      const half = BARS / 2
      const L = levels.current
      for (let i = 0; i < half; i++) {
        let target: number
        if (data && data.length) {
          // use the lower ~60% of the spectrum where speech lives
          const idx = Math.floor((i / half) * data.length * 0.6)
          target = (data[idx] ?? 0) / 255
        } else {
          target = reduce ? 0.12 : 0.1 + 0.06 * Math.sin(t / 700 + i * 0.35)
        }
        L[i] += (target - L[i]) * 0.25
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)
      const cx = size / 2
      const cy = size / 2
      const r0 = 58 * (size / 210)
      const maxLen = 38 * (size / 210)
      const rgb = sp ? TEAL : LAVENDER
      ctx.lineCap = 'round'
      ctx.lineWidth = 2.4 * (size / 210)
      for (let i = 0; i < BARS; i++) {
        // mirror: bar i and its reflection share a level
        const k = i < half ? i : BARS - 1 - i
        const lvl = L[k]
        const a = -Math.PI / 2 + (i / BARS) * Math.PI * 2
        const len = 3 + lvl * maxLen
        const x0 = cx + Math.cos(a) * r0
        const y0 = cy + Math.sin(a) * r0
        const x1 = cx + Math.cos(a) * (r0 + len)
        const y1 = cy + Math.sin(a) * (r0 + len)
        ctx.strokeStyle = `rgba(${rgb},${0.35 + lvl * 0.65})`
        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.stroke()
      }
      ctx.strokeStyle = `rgba(${rgb},.35)`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, r0 - 4, 0, Math.PI * 2)
      ctx.stroke()
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <canvas ref={canvas} style={{ width: size, height: size }} className="absolute inset-0" />
      <div className="relative">{children}</div>
    </div>
  )
}

/** Seven-bar mic meter. */
export function MicMeter({ level, muted }: { level: number; muted: boolean }) {
  const hearing = !muted && level > 0.06
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-5 items-end gap-[3px]" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => {
          const th = (i + 1) / 8
          const on = !muted && level * 1.6 > th * 0.8
          return <span key={i} className="w-[3px] rounded-full transition-all duration-75" style={{ height: `${30 + i * 10}%`, background: on ? '#34D399' : 'rgba(255,255,255,.25)' }} />
        })}
      </div>
      <span className={`text-[11.5px] font-semibold ${muted ? 'text-amber-300' : hearing ? 'text-emerald-300' : 'text-white/60'}`}>{muted ? 'You’re muted' : hearing ? 'Hearing you' : 'Listening for you…'}</span>
    </div>
  )
}
