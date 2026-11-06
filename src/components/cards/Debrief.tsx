'use client'
import { useState, type ReactNode } from 'react'
import { roomStatus } from '@/lib/mission'
import { placeById } from '@/lib/places'
import type { RubricScore, Turn } from '@/lib/types'
import { useGame } from '@/store/game'
import { BriefView } from './Brief'
import { Btn, ErrorStrip, ThinkingDots, useAct, useBusy } from './ui'

const ACCENT = placeById('debrief').accent
const TEAL = placeById('interview').accent

const barColor = (r: RubricScore) => (r.score / r.max >= 0.6 ? '#22C55E' : r.score > 0 ? '#F59E0B' : '#EF4444')

function RubricBar({ r }: { r: RubricScore }) {
  const [open, setOpen] = useState(false)
  const pct = Math.round((r.score / r.max) * 100)
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-slate-800">{r.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold tabular-nums text-slate-700">
            {r.score}/{r.max}
          </span>
          <button onClick={() => setOpen(!open)} className="rounded-full px-2 py-0.5 text-[11.5px] font-semibold text-slate-500 hover:bg-slate-100">
            {open ? 'Hide' : 'Evidence'}
          </button>
        </div>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="report-bar h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: barColor(r) }} />
      </div>
      {open && (
        <div className="seed-step mt-2.5 space-y-2 text-[13px]">
          {r.explanation && <p className="text-slate-600">{r.explanation}</p>}
          {r.evidence.length ? (
            r.evidence.map((e, i) => (
              <blockquote key={i} className="border-l-[3px] border-sky-400 pl-2.5 italic text-slate-700">
                “{e.quote}”
              </blockquote>
            ))
          ) : (
            <p className="text-slate-400">Not observed in the transcript.</p>
          )}
          {r.evidenceRemoved && <p className="text-[12px] text-amber-700">Points removed: the cited evidence wasn’t in the transcript.</p>}
        </div>
      )}
    </div>
  )
}

export function TranscriptBubbles({ turns }: { turns: Turn[] }) {
  return (
    <div className="space-y-2">
      {turns.map((t) => (
        <div key={t.id} className={`flex flex-col ${t.role === 'learner' ? 'items-end' : 'items-start'}`}>
          <span className="mb-0.5 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{t.role === 'learner' ? 'You' : 'Maya'}</span>
          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13.5px] leading-snug ${t.role === 'learner' ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md bg-teal-50 text-slate-800'}`}>{t.text}</div>
        </div>
      ))}
    </div>
  )
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (!items.length) return null
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: tone }}>
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-[13.5px] text-slate-700">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone }} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The scored debrief. `footer` replaces the default "Got it, on to the lab" action (the interview feedback card uses its own).
 */
export function DebriefContent({ footer }: { footer?: ReactNode }) {
  const session = useGame((s) => s.session)!
  const set = useGame((s) => s.set)
  const walkTo = useGame((s) => s.walkTo)
  const act = useAct()
  const grading = useBusy('interview_end', 'grade_retry')
  const advancing = useBusy('debrief_done')
  const [showTx, setShowTx] = useState(false)
  const [showBrief, setShowBrief] = useState(false)
  const g = session.grade
  const skipped = session.skipped.includes('interview')
  const debriefCurrent = roomStatus(session, 'debrief') === 'current'

  const toLab = async () => {
    if (debriefCurrent) {
      const r = await act({ type: 'debrief_done' })
      if (!r) return
    }
    set({ panel: null, card: null, seatedAt: null })
    walkTo({ kind: 'room', id: 'lab' })
  }

  const defaultFooter = (
    <div className="flex justify-end">
      <Btn accent={ACCENT} onClick={toLab} busy={advancing}>
        {debriefCurrent ? 'Got it, on to the lab →' : 'Back to the lab →'}
      </Btn>
    </div>
  )

  if (skipped) {
    return (
      <div className="space-y-4">
        <ErrorStrip />
        <p className="rounded-2xl border border-slate-200 bg-white/80 p-3.5 text-[13.5px] text-slate-700">
          You skipped the client interview, so there’s no discovery score. Here’s everything an excellent discovery would have uncovered. You’ll use it in the lab.
        </p>
        <BriefView brief={session.brief} accent={TEAL} showFacts={false} />
        {footer ?? defaultFooter}
      </div>
    )
  }

  if (session.interview.status !== 'ended') {
    return <p className="text-[13.5px] text-slate-600">Your debrief appears here after you talk with Maya at Pathways Forward.</p>
  }

  if (!g) {
    return (
      <div className="space-y-4">
        {grading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-[13.5px] text-amber-900">
            <ThinkingDots color="#B45309" />
            Nia is reading your transcript over a coffee…
          </div>
        ) : (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13.5px] text-red-800">
            <p className="font-semibold">We couldn’t score your conversation yet.</p>
            {session.gradeError && <p className="mt-1 text-[12.5px] text-red-700">{session.gradeError}</p>}
            <Btn className="mt-3" variant="danger" onClick={() => act({ type: 'grade_retry' })}>
              Try scoring again
            </Btn>
          </div>
        )}
        <ErrorStrip />
      </div>
    )
  }

  const learnerQs = session.interview.turns.filter((t) => t.role === 'learner').length
  return (
    <div className="space-y-5">
      <ErrorStrip />
      <div className="flex items-end gap-4">
        <div className="text-[56px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">{g.total}</div>
        <div className="pb-1.5">
          <div className="text-[14px] font-semibold text-slate-700">/ 100 discovery score</div>
          <div className="text-[12px] text-slate-500">
            {learnerQs} question{learnerQs === 1 ? '' : 's'} asked · Model-generated assessment of one practice conversation, not a certification.
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {g.rubric.map((r) => (
          <RubricBar key={r.key} r={r} />
        ))}
      </div>

      <ListBlock title="What went well" items={g.strengths} tone="#16A34A" />
      <ListBlock title="What you missed" items={g.improvements} tone="#D97706" />
      {g.betterQuestions.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-sky-600">Stronger questions to try</div>
          <div className="flex flex-wrap gap-2">
            {g.betterQuestions.map((q, i) => (
              <span key={i} className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-[13px] text-sky-900">
                “{q}”
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Btn variant="soft" accent="#334155" onClick={() => setShowTx(!showTx)}>
          {showTx ? 'Hide transcript' : 'Show transcript'}
        </Btn>
        {!showBrief && (
          <Btn variant="soft" accent={TEAL} onClick={() => setShowBrief(true)}>
            Show what an excellent discovery would uncover
          </Btn>
        )}
      </div>
      {showTx && (
        <div className="seed-step max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-3">
          <TranscriptBubbles turns={session.interview.turns} />
        </div>
      )}
      {showBrief && (
        <div className="seed-step">
          <BriefView brief={session.brief} accent={TEAL} />
        </div>
      )}
      {footer ?? defaultFooter}
    </div>
  )
}
