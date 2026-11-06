'use client'
// Kai's agent drawn as a row of nodes: code tools (sky), the AI model (violet), the output.
import type { TraceStepId } from '@/lib/pipeline-code'
import { AI, TOOL } from './shared'

export type NodeId = 'applicant' | 'search' | 'prereq' | 'schedule' | 'ai' | 'output'

const NODES: { id: NodeId; icon: string; label: string; kind: 'input' | 'code' | 'ai' | 'output' }[] = [
  { id: 'applicant', icon: '👤', label: 'Applicant', kind: 'input' },
  { id: 'search', icon: '🔎', label: 'Find matching programs', kind: 'code' },
  { id: 'prereq', icon: '🎓', label: 'Check prerequisites', kind: 'code' },
  { id: 'schedule', icon: '🕒', label: 'Check schedule', kind: 'code' },
  { id: 'ai', icon: '✨', label: 'Picks a program', kind: 'ai' },
  { id: 'output', icon: '📝', label: 'Recommendation for a caseworker', kind: 'output' },
]

export function stepToNode(id: TraceStepId | null | undefined): NodeId | null {
  if (!id) return null
  if (id === 'model' || id === 'rank') return 'ai'
  if (id === 'remote') return 'prereq'
  return id as NodeId
}

export function PipelineCard({
  version,
  scheduleBuilt,
  fixMode = false,
  scheduleAddedByYou = false,
  promptFix = false,
  failing = null,
  running = false,
  highlight = null,
  compact = false,
}: {
  version: string
  scheduleBuilt: boolean
  fixMode?: boolean
  scheduleAddedByYou?: boolean
  promptFix?: boolean
  failing?: NodeId | null
  running?: boolean
  highlight?: NodeId | null
  compact?: boolean
}) {
  return (
    <div className="rounded-2xl border border-orange-200/70 bg-white/85 p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-extrabold text-slate-900">🤖 Kai’s agent</span>
          <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[10.5px] font-bold text-white">{version}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TOOL }} /> code
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: AI }} /> AI model
          </span>
        </div>
      </div>
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {NODES.map((n, i) => {
          const ghost = n.id === 'schedule' && !scheduleBuilt
          const color = n.kind === 'code' ? TOOL : n.kind === 'ai' ? AI : '#94A3B8'
          const bg = n.kind === 'code' ? '#E0F2FE' : n.kind === 'ai' ? '#EDE9FE' : n.kind === 'output' ? '#F1F5F9' : '#FFF7ED'
          const ink = n.kind === 'code' ? '#075985' : n.kind === 'ai' ? '#5B21B6' : n.kind === 'output' ? '#334155' : '#9A3412'
          const isFail = failing === n.id
          const isHi = highlight === n.id
          return (
            <div key={n.id} className="flex items-center gap-1">
              <div
                className={`relative flex flex-col items-center justify-start rounded-xl px-1.5 py-2 text-center transition ${running ? 'lab-run' : ''}`}
                style={{
                  width: compact ? 84 : 92,
                  minHeight: compact ? 84 : 96,
                  background: ghost ? 'transparent' : bg,
                  border: ghost ? '2px dashed #CBD5E1' : `1.5px solid ${isHi ? color : `${color}55`}`,
                  boxShadow: isFail ? '0 0 0 3px #EF4444' : isHi ? `0 0 0 3px ${color}55` : undefined,
                  opacity: ghost ? 0.75 : 1,
                  animationDelay: running ? `${i * 0.35}s` : undefined,
                }}
              >
                <span className={`text-[20px] leading-none ${ghost ? 'grayscale' : ''}`}>{n.icon}</span>
                <span className="mt-1 text-[10.5px] font-semibold leading-tight" style={{ color: ghost ? '#94A3B8' : ink }}>
                  {n.label}
                </span>
                {n.kind === 'code' && !ghost && <span className="mt-1 text-[8.5px] font-bold uppercase tracking-wide" style={{ color: ink, opacity: 0.7 }}>Tool · code</span>}
                {n.kind === 'ai' && <span className="mt-1 text-[8.5px] font-bold uppercase tracking-wide" style={{ color: ink, opacity: 0.7 }}>AI model</span>}
                {n.kind === 'ai' && promptFix && <span className="mt-1 rounded-full bg-violet-600 px-1.5 py-px text-[8.5px] font-bold text-white">+ your instruction</span>}
                {ghost && <span className="mt-1 text-[9px] font-bold uppercase text-slate-400">{fixMode ? 'not built' : 'not built (v1)'}</span>}
                {n.id === 'schedule' && scheduleBuilt && scheduleAddedByYou && <span className="mt-1 rounded-full bg-emerald-600 px-1.5 py-px text-[8.5px] font-bold text-white">added by you</span>}
                {isFail && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-500 px-1.5 py-px text-[9px] font-bold text-white">went wrong here</span>}
              </div>
              {i < NODES.length - 1 && <span className="text-[13px] text-slate-300">→</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
