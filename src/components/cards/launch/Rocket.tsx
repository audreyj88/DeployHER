'use client'
import { useId } from 'react'

export type RocketState = 'idle' | 'count' | 'lift' | 'blocked' | 'hold'

/** Mini SVG rocket (120×170): pad with chevrons, gantry arm, white body with rose details, two-layer flame. */
export function MiniRocket({ state, size = 120 }: { state: RocketState; size?: number }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 120 170" width={size} height={(size * 170) / 120} className={`rkt ${state}`} aria-hidden>
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#F8FAFC" />
          <stop offset=".5" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      {/* gantry */}
      <rect x="18" y="40" width="5" height="112" fill="#475569" />
      <g className="rkt-arm">
        <rect x="22" y="68" width="22" height="4" rx="1" fill="#64748B" />
      </g>
      {/* pad */}
      <rect x="14" y="150" width="92" height="12" rx="3" fill="#1F2937" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${22 + i * 14} 152 l6 4 l-6 4 h-4 l6 -4 l-6 -4 z`} fill="#FBBF24" />
      ))}
      {/* ship */}
      <g className="rkt-ship">
        {/* flame rides with the ship */}
        <g className="rkt-flame">
          <path d="M50 132 Q60 168 70 132 Z" fill="#FB923C" />
          <path d="M54 132 Q60 156 66 132 Z" fill="#FDE68A" />
        </g>
        <path d="M40 112 L30 132 L44 128 Z" fill="#C8475D" />
        <path d="M80 112 L90 132 L76 128 Z" fill="#C8475D" />
        <path d="M60 22 C76 40 80 70 78 126 L42 126 C40 70 44 40 60 22 Z" fill={`url(#b${id})`} stroke="#CBD5E1" strokeWidth="1" />
        <path d="M60 22 C67 30 71 38 73 46 L47 46 C49 38 53 30 60 22 Z" fill="#C8475D" />
        <circle cx="60" cy="72" r="10" fill="#C8475D" />
        <circle cx="60" cy="72" r="7.5" fill="#1E3A5F" />
        <path d="M55.5 68.5 a5 5 0 0 1 5 -2.5" stroke="#7DD3FC" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <rect x="52" y="126" width="16" height="7" rx="1.5" fill="#C8475D" />
        <rect x="56" y="95" width="8" height="24" rx="2" fill="#E2E8F0" />
      </g>
    </svg>
  )
}
