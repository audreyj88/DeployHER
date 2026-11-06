'use client'
import { useState } from 'react'
import { FAILURE_TEXT, programById } from '@/lib/catalog'
import type { CaseResult, LabRun, SessionView } from '@/lib/types'
import { Avatar, VerdictPill, WeekStrip, describeAnswer, findApplicant, needsText } from './shared'

export function ScoreRow({ run, label }: { run: LabRun; label?: string }) {
  const core = run.results.filter((r) => !r.custom)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="text-[34px] font-extrabold leading-none tracking-tight text-slate-900">
        {run.coreScore}
        <span className="text-[20px] text-slate-400">/5</span>
      </div>
      <div className="flex gap-1.5">
        {core.map((r) => (
          <span key={r.applicantId} className="dot-in h-3.5 w-3.5 rounded-full" style={{ background: r.pass ? '#22C55E' : '#EF4444' }} title={`${r.name}: ${r.pass ? 'right' : 'wrong'}`} />
        ))}
      </div>
      {label && <div className="text-[13px] text-slate-600">{label}</div>}
    </div>
  )
}

export function CaseRow({ r, s, defaultOpen }: { r: CaseResult; s: SessionView; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const a = findApplicant(s, r.applicantId, r.name)
  const prog = r.answer?.programId ? programById(r.answer.programId) : null
  return (
    <div className={`overflow-hidden rounded-2xl border bg-white transition ${open ? 'border-slate-300 shadow-sm' : 'border-slate-200'}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50/70">
        <Avatar name={r.name} id={r.applicantId} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-slate-900">{r.name}</span>
            {r.custom && <span className="rounded-full bg-violet-100 px-1.5 text-[10px] font-bold text-violet-700">your test</span>}
          </div>
          <div className="truncate text-[11.5px] text-slate-500">Needs: {r.expected.text}</div>
          <div className="truncate text-[11.5px] text-slate-700">
            <span className="font-bold uppercase tracking-wide text-slate-400">Agent did </span>
            {describeAnswer(r.answer)}
          </div>
        </div>
        <VerdictPill pass={r.pass} />
        <span className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="seed-step space-y-3 border-t border-slate-100 px-3 pb-3 pt-2.5">
          {a && <div className="text-[11.5px] text-slate-500">{needsText(a)}</div>}
          {!r.pass && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-900">
              <b>Why it’s wrong: </b>
              {r.failures.map((f) => FAILURE_TEXT[f]).join(' ')}
            </div>
          )}
          {r.failures.includes('schedule_conflict') && a && prog && <WeekStrip applicant={a} program={prog} compact />}
          <div>
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">Inside the agent</div>
            <ol className="space-y-1">
              {r.steps.map((st) => {
                const bad =
                  (r.failingStep === st.id) ||
                  (r.failingStep === 'model' && st.id === 'model')
                return (
                  <li
                    key={st.id}
                    className="flex gap-2 rounded-lg px-2 py-1.5 text-[12px]"
                    style={{ background: bad ? '#FEE2E2' : st.kind === 'ai' ? '#F5F3FF' : st.kind === 'code' ? '#F0F9FF' : '#F8FAFC', boxShadow: bad ? 'inset 0 0 0 1.5px #EF4444' : undefined }}
                  >
                    <span className="w-[86px] shrink-0 text-[9.5px] font-bold uppercase tracking-wide" style={{ color: st.kind === 'ai' ? '#6D28D9' : st.kind === 'code' ? '#0369A1' : '#475569' }}>
                      {st.kind === 'ai' ? '✨ AI model' : st.kind === 'code' ? '🔧 Code' : '📝 Output'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="text-slate-800">{st.label}</b>
                      <span className={`text-slate-600 ${st.skipped ? 'italic' : ''}`}> · {st.detail}</span>
                      {bad && <span className="ml-1 font-bold text-red-600">← went wrong here</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

export function GraderNote() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
      ⚖️ The grader isn’t part of the agent. It’s plain code that checks every answer against the client’s rules, so the AI can’t grade itself.
    </div>
  )
}
