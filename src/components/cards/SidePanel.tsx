'use client'
import { useEffect, useState } from 'react'
import { previousPlace, roomStatus } from '@/lib/mission'
import { placeById, type PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'
import { DebriefContent, TranscriptBubbles } from './Debrief'

function Body({ id }: { id: PlaceId }) {
  const session = useGame((s) => s.session)!
  const st = roomStatus(session, id)
  if (st === 'locked') {
    const prev = previousPlace(id)
    return (
      <p className="text-[14px] text-slate-700">
        🔒 This room opens after {prev ? placeById(prev).title : 'the previous step'}. Follow the glowing marker to your current step.
      </p>
    )
  }
  if (id === 'setup') {
    const s = session.setup
    if (!s?.confirmed) return <p className="text-[14px] text-slate-600">You haven’t finished setup yet. Walk into the Greenhouse to pick it up.</p>
    return (
      <div className="space-y-4 text-[13.5px]">
        <div>
          <div className="text-[16px] font-extrabold text-slate-900">Your starting point</div>
          <p className="text-slate-500">What you told us at the start, in deployment terms.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 italic text-slate-700">“{s.background}”</div>
        <div className="flex flex-wrap gap-1.5">
          {s.strengths.map((x) => (
            <span key={x.id} className="rounded-full bg-emerald-100 px-2.5 py-1 text-[12px] font-semibold text-emerald-800">
              🌱 {x.label}
            </span>
          ))}
        </div>
        <ul className="space-y-2">
          {s.strengths.map((x) => (
            <li key={x.id} className="text-slate-700">
              <span className="font-semibold">{x.label}</span> <span className="text-amber-600">→</span> {x.application}
            </li>
          ))}
        </ul>
        <p className="text-slate-500">Follow the glowing marker to your next stop.</p>
      </div>
    )
  }
  if (id === 'interview') {
    if (session.interview.status !== 'ended') return <p className="text-[14px] text-slate-700">Maya is waiting for you at her table.</p>
    return (
      <div className="space-y-3">
        <div className="text-[16px] font-extrabold text-slate-900">Your conversation with Maya Chen</div>
        <TranscriptBubbles turns={session.interview.turns} />
      </div>
    )
  }
  if (id === 'debrief') return <DebriefContent />
  return <p className="text-[14px] text-slate-600">{placeById(id).blurb}</p>
}

export function SidePanel() {
  const panel = useGame((s) => s.panel)
  const set = useGame((s) => s.set)
  const [shown, setShown] = useState<PlaceId | null>(panel)
  const [open, setOpen] = useState(false)

  // Keep the last panel mounted while it slides out.
  useEffect(() => {
    if (panel) {
      setShown(panel)
      const r = requestAnimationFrame(() => setOpen(true))
      return () => cancelAnimationFrame(r)
    }
    setOpen(false)
    const t = setTimeout(() => setShown(null), 450)
    return () => clearTimeout(t)
  }, [panel])

  useEffect(() => {
    if (!panel) return
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') set({ panel: null })
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [panel, set])

  if (!shown) return null
  const p = placeById(shown)
  return (
    <aside className={`side-panel ${open ? 'open' : ''}`} aria-label={p.title}>
      <header className="px-5 pb-3 pt-4" style={{ background: `linear-gradient(180deg, ${p.accent}1F, transparent)` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: p.accent }}>
              Step {p.step} of 6 · {p.label}
            </div>
            <h2 className="mt-0.5 text-[20px] font-extrabold tracking-tight text-slate-900">{p.title}</h2>
            <p className="mt-0.5 text-[12.5px] text-slate-600">{p.blurb}</p>
          </div>
          <button onClick={() => set({ panel: null })} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-black/5">
            ✕
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 pb-5 pt-1">
        <Body id={shown} />
      </div>
    </aside>
  )
}
