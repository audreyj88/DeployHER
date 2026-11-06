'use client'
import { useId } from 'react'

/** Illustrated SVG portrait of Maya Chen (fictional client). 120×120 circle. */
export function MayaPortrait({ size = 112, speaking = false }: { size?: number; speaking?: boolean }) {
  const uid = useId().replace(/:/g, '')
  const bg = `mp-bg-${uid}`
  const hair = `mp-hair-${uid}`
  const skin = `mp-skin-${uid}`
  const clip = `mp-clip-${uid}`
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      {speaking && <span className="ping-ring absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 3px rgba(45,212,191,.7)' }} />}
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Maya Chen" style={{ display: 'block' }}>
        <defs>
          <radialGradient id={bg} cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#CCFBF1" />
            <stop offset="55%" stopColor="#5EEAD4" />
            <stop offset="100%" stopColor="#0F766E" />
          </radialGradient>
          <linearGradient id={hair} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3A2C2E" />
            <stop offset="100%" stopColor="#1A1416" />
          </linearGradient>
          <linearGradient id={skin} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F6D3B3" />
            <stop offset="100%" stopColor="#EDBE98" />
          </linearGradient>
          <clipPath id={clip}>
            <circle cx="60" cy="60" r="60" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <rect width="120" height="120" fill={`url(#${bg})`} />
          {/* hair back (bob) */}
          <path d="M30 56 C28 30 44 18 60 18 C78 18 93 30 90 58 L92 80 C84 84 76 82 72 78 L48 78 C42 84 34 84 28 80 Z" fill={`url(#${hair})`} />
          {/* neck */}
          <path d="M51 74 L69 74 L70 90 L50 90 Z" fill="#E7B48F" />
          {/* blazer */}
          <path d="M16 120 C18 98 32 88 50 86 L60 100 L70 86 C88 88 102 98 104 120 Z" fill="#0F766E" />
          {/* cream top */}
          <path d="M50 86 L60 100 L70 86 C66 85 63 88 60 88 C57 88 54 85 50 86 Z" fill="#FFF4E0" />
          <path d="M53 88 L60 120 L67 88 L60 100 Z" fill="#FFF4E0" />
          {/* lapels */}
          <path d="M50 86 L44 92 L54 112 L60 100 Z" fill="#115E59" />
          <path d="M70 86 L76 92 L66 112 L60 100 Z" fill="#115E59" />
          {/* gold pin */}
          <circle cx="78" cy="100" r="2.4" fill="#F2B33D" />
          {/* face */}
          <ellipse cx="60" cy="54" rx="21" ry="24" fill={`url(#${skin})`} />
          {/* ears + studs */}
          <ellipse cx="39.5" cy="57" rx="3" ry="4.5" fill="#EDBE98" />
          <ellipse cx="80.5" cy="57" rx="3" ry="4.5" fill="#EDBE98" />
          <circle cx="39.5" cy="62" r="1.7" fill="#F2B33D" />
          <circle cx="80.5" cy="62" r="1.7" fill="#F2B33D" />
          {/* side-swept fringe */}
          <path d="M38 50 C38 32 50 26 62 26 C76 26 84 34 83 48 C76 40 64 36 52 40 C46 42 41 46 38 50 Z" fill={`url(#${hair})`} />
          <path d="M38 52 C36 60 37 70 40 76 L36 76 C32 66 33 56 38 52 Z" fill={`url(#${hair})`} />
          <path d="M82 50 C85 60 84 70 80 76 L84 76 C88 66 87 56 82 50 Z" fill={`url(#${hair})`} />
          {/* brows */}
          <path d="M47 47 Q52 44.5 56 46.5" stroke="#2A1E1F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M64 46.5 Q68 44.5 73 47" stroke="#2A1E1F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* eyes */}
          <ellipse cx="52" cy="54" rx="2.6" ry="3" fill="#24170F" />
          <ellipse cx="68" cy="54" rx="2.6" ry="3" fill="#24170F" />
          <circle cx="52.9" cy="53" r="0.9" fill="#fff" />
          <circle cx="68.9" cy="53" r="0.9" fill="#fff" />
          {/* nose */}
          <path d="M60 57 Q58.5 62 60.5 63" stroke="#C98E64" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          {/* blush */}
          <ellipse cx="47" cy="63" rx="4" ry="2.4" fill="#F09A92" opacity=".45" />
          <ellipse cx="73" cy="63" rx="4" ry="2.4" fill="#F09A92" opacity=".45" />
          {/* mouth */}
          {speaking ? (
            <ellipse cx="60" cy="68.5" rx="4.2" ry="3" fill="#8E2F44">
              <animate attributeName="ry" values="1.4;3.2;1.8;3;1.4" dur="0.6s" repeatCount="indefinite" />
            </ellipse>
          ) : (
            <path d="M54.5 67 Q60 71.5 65.5 67" stroke="#C25468" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
        </g>
      </svg>
    </span>
  )
}
