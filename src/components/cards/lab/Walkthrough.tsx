'use client'
// Walk one applicant through Kai's pipeline, with the catalog grid reacting at each step.
import { useMemo, useState } from 'react'
import { CORE_TESTS, PROGRAMS } from '@/lib/catalog'
import { runPipelineCode } from '@/lib/pipeline-code'
import { topicOverlap } from '@/lib/policy'
import type { LabRun } from '@/lib/types'
import { PipelineCard, type NodeId } from './Pipeline'
import { ACCENT, AI, Avatar, TOOL, describeAnswer } from './shared'

const STAGES: { node: NodeId; tag: 'code' | 'ai' | null }[] = [
  { node: 'applicant', tag: null },
  { node: 'search', tag: 'code' },
  { node: 'prereq', tag: 'code' },
  { node: 'ai', tag: 'ai' },
  { node: 'output', tag: null },
]

export function Walkthrough({ run, running }: { run?: LabRun; running: boolean }) {
  const [who, setWho] = useState(0)
  const [stage, setStage] = useState(0)
  const a = CORE_TESTS[who]
  const p = useMemo(() => runPipelineCode(a, { scheduleFilter: false }), [a])
  const search = p.steps.find((s) => s.id === 'search')!
  const prereq = p.steps.find((s) => s.id === 'prereq')!
  const remote = p.steps.find((s) => s.id === 'remote')
  const removed = [...(prereq.removed ?? []), ...(remote?.removed ?? [])]
  const flagged = p.candidates.filter((c) => c.flagged).map((c) => c.id)
  const result = run?.results.find((r) => r.applicantId === a.id)

  const can = a.programming === 'yes' ? ', and can code' : a.programming === 'no' ? ', and hasn’t programmed' : ', and didn’t say if she can code'
  const captions = [
    `Meet ${a.name}. She wants ${a.interests.join(' and ')}, is free ${a.availabilityText.replace(/ only$/, '')}${can}.${a.remoteOnly ? ' She needs remote classes.' : ''}${a.request ? ` She writes: “${a.request}”` : ''}`,
    `Code searches the catalog for her interests. ${search.programIds?.length ?? 0} of 6 programs match.`,
    `Code removes what she can’t take: ${removed.length ? removed.map((r) => `${r.id} (${r.why})`).join(', ') : 'nothing'}.${flagged.length ? ` ${flagged.join(', ')} needs coding, and she didn’t say if she can, so it’s flagged, not removed.` : ''}`,
    `The AI model reads her details and the ${p.candidates.length} remaining program${p.candidates.length === 1 ? '' : 's'}, then picks one and explains why. This is the part that can slip.`,
    `A caseworker gets the recommendation to review before anything reaches ${a.name}.${result ? ` On your run, the agent ${describeAnswer(result.answer)}.` : ''}`,
  ]
  const tag = STAGES[stage].tag

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {CORE_TESTS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => {
              setWho(i)
              setStage(0)
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[12.5px] font-semibold transition ${i === who ? 'border-orange-300 bg-orange-50 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <Avatar name={t.name} id={t.id} size={22} />
            {t.name}
          </button>
        ))}
      </div>

      <PipelineCard version="v1" scheduleBuilt={false} highlight={STAGES[stage].node} running={running} compact />

      <div key={`${who}-${stage}`} className="seed-step flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        {tag && (
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={tag === 'code' ? { background: '#E0F2FE', color: '#075985' } : { background: '#EDE9FE', color: '#5B21B6' }}
          >
            {tag === 'code' ? '🔧 Code' : '✨ AI model'}
          </span>
        )}
        <p className="flex-1 text-[13.5px] leading-relaxed text-slate-700">{captions[stage]}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button disabled={stage === 0} onClick={() => setStage((s) => s - 1)} className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-black/5 disabled:opacity-30" aria-label="Previous step">
            ‹
          </button>
          <button
            onClick={() => (stage < 4 ? setStage((s) => s + 1) : (setWho((w) => (w + 1) % 5), setStage(0)))}
            className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white"
            style={{ background: ACCENT }}
          >
            {stage < 4 ? 'Next step ›' : 'Next applicant ›'}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">The catalog: 6 programs, all in person</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {PROGRAMS.map((prog) => {
            const matches = topicOverlap(prog, a) > 0
            const rem = removed.find((r) => r.id === prog.id)
            const isCand = p.candidates.some((c) => c.id === prog.id)
            const isFlag = flagged.includes(prog.id)
            const picked = stage === 4 && result?.answer?.programId === prog.id
            let state: 'neutral' | 'dim' | 'match' | 'removed' | 'cand' = 'neutral'
            if (stage >= 1) state = matches ? 'match' : 'dim'
            if (stage >= 2 && rem) state = 'removed'
            if (stage >= 3 && isCand) state = 'cand'
            const style =
              state === 'dim'
                ? { opacity: 0.35, background: '#fff', borderColor: '#E2E8F0' }
                : state === 'match'
                  ? { background: '#E0F2FE', borderColor: TOOL }
                  : state === 'removed'
                    ? { background: '#FEF2F2', borderColor: '#FCA5A5' }
                    : state === 'cand'
                      ? { background: '#EDE9FE', borderColor: AI }
                      : { background: '#fff', borderColor: '#E2E8F0' }
            return (
              <div key={prog.id} className="rounded-xl border-[1.5px] p-2 transition-all duration-300" style={{ ...style, boxShadow: picked ? `0 0 0 3px ${AI}` : undefined }}>
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10.5px] font-bold text-slate-500">{prog.id}</span>
                  {state === 'match' && <span className="text-[10px] font-bold text-sky-700">matches</span>}
                  {state === 'removed' && <span className="text-[10px] font-bold text-red-600">✕ {rem!.why}</span>}
                  {state === 'cand' && <span className="text-[10px] font-bold text-violet-700">{picked ? '★ picked' : 'AI picks from these'}</span>}
                </div>
                <div className={`text-[12px] font-semibold leading-tight text-slate-800 ${state === 'removed' ? 'line-through decoration-red-400' : ''}`}>{prog.title}</div>
                <div className="text-[10.5px] text-slate-500">{prog.schedule}</div>
                {stage >= 2 && isFlag && <div className="mt-0.5 text-[10px] font-semibold text-amber-700">⚠ she didn’t say if she can code</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
