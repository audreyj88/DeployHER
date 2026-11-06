'use client'
import type { SessionView } from '@/lib/types'

/** The full client brief, with each hidden fact marked "You discovered" or "Learned in debrief". */
export function BriefView({ brief, accent = '#2A9D8F', showFacts = true }: { brief: SessionView['brief']; accent?: string; showFacts?: boolean }) {
  if (!brief) {
    return <p className="text-[13px] text-slate-500">The client brief unlocks after the interview.</p>
  }
  const rows: [string, string, boolean?][] = [
    ['Client', 'Next Chapter · Maya Chen, Executive Director (fictional)'],
    ['They asked for', brief.statedRequest],
    ['Real job to be done', brief.trueJob, true],
    ['How it works today', brief.currentProcess],
    ['Scale', brief.scale],
    ['Success means', brief.success],
  ]
  return (
    <div className="space-y-4 text-[13.5px]">
      <dl className="divide-y divide-slate-200/70 overflow-hidden rounded-2xl border border-slate-200 bg-white/80">
        {rows.map(([k, v, bold]) => (
          <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-3.5 py-2.5 sm:grid-cols-[150px_1fr]">
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
            <dd className={bold ? 'font-bold text-slate-900' : 'text-slate-700'}>{v}</dd>
          </div>
        ))}
      </dl>

      <div>
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: accent }}>
          Hard constraints
        </div>
        <ul className="space-y-1.5">
          {brief.constraints.map((c) => (
            <li key={c} className="flex gap-2 text-slate-700">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border p-3.5" style={{ background: `${accent}0D`, borderColor: `${accent}33` }}>
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: accent }}>
          Recommended first scope
        </div>
        <p className="text-slate-800">{brief.scope}</p>
      </div>

      {showFacts && (
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: accent }}>
            What you discovered vs. what you learned here
          </div>
          <ul className="space-y-2">
            {brief.facts.map((f) => (
              <li key={f.id} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
                <div className="mb-0.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{f.label}</span>
                  {f.discovered ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">You discovered</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Learned in debrief</span>
                  )}
                </div>
                <p className="text-[13px] text-slate-600">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
