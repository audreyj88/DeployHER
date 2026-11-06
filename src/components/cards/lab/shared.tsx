'use client'
// Lab helpers: applicant lookup, avatars, verdict pills, WeekStrip calendar.
import { Check, X } from 'lucide-react'
import { applicantFromSpec, CORE_TESTS, DAYS, fmtTime, jobById, workplaceShort, type Applicant, type Day, type Job } from '@/lib/catalog'
import { slotFits } from '@/lib/policy'
import type { AgentAnswer } from '@/lib/policy'
import type { SessionView } from '@/lib/types'

export const ACCENT = '#D9734A'
export const TOOL = '#38BDF8'
export const AI = '#8B5CF6'
export const FILE_COLORS = ['#F59E0B', '#EC4899', '#10B981', '#6366F1', '#F97316']

export function allApplicants(s: SessionView): Applicant[] {
  return [...CORE_TESTS, ...s.lab.customs.map((c, i) => applicantFromSpec(c, `C${i + 1}`))]
}

export function findApplicant(s: SessionView, id: string, name?: string): Applicant | undefined {
  const core = CORE_TESTS.find((t) => t.id === id)
  if (core) return core
  // Custom ids can shift if one is removed; match by name too.
  return allApplicants(s).find((a) => a.custom && (name ? a.name === name : a.id === id))
}

export function colorFor(id: string) {
  const core = CORE_TESTS.findIndex((t) => t.id === id)
  if (core >= 0) return FILE_COLORS[core]
  return id.endsWith('2') ? '#0EA5E9' : '#A855F7'
}

export function Avatar({ name, id, size = 30 }: { name: string; id: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.42, boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.12)' }}
      aria-hidden
    >
      {name[0]}
    </span>
  )
}

export function VerdictPill({ pass, small }: { pass: boolean; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ${small ? 'px-1.5 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]'}`}
      style={pass ? { background: '#DCFCE7', color: '#166534' } : { background: '#FEE2E2', color: '#991B1B' }}
    >
      {pass ? <Check size={small ? 11 : 13} strokeWidth={3} /> : <X size={small ? 11 : 13} strokeWidth={3} />}
      {pass ? 'Right' : 'Wrong'}
    </span>
  )
}

export function describeAnswer(ans: AgentAnswer | null): string {
  if (!ans) return 'gave no usable answer'
  if (ans.decision === 'recommend') {
    const p = jobById(ans.jobId)
    return p ? `recommended ${p.id} ${p.title}` : `recommended “${ans.jobId ?? '?'}” (not in the listings)`
  }
  if (ans.decision === 'ask') return `asked: “${ans.question ?? 'a clarifying question'}”`
  return 'said there’s no verified match'
}

export function needsText(a: Applicant | undefined) {
  if (!a) return ''
  const parts = [a.interests.join(', '), a.availabilityText, workplaceShort(a.workplace), `min $${a.minPay}/hr`]
  if (a.supervised === 'yes') parts.push('has supervised a team')
  if (a.supervised === 'unknown') parts.push('supervising unknown')
  if (a.asksForAction) parts.push('asks to apply right now')
  return parts.join(' · ')
}

/** Day columns with the hours she can work (green) and the job's required hours (outlined green = fits, red = conflict). */
export function WeekStrip({ applicant, job, compact }: { applicant: Applicant; job?: Job | null; compact?: boolean }) {
  const days: Day[] = DAYS.filter((d) => d !== 'Sun' || applicant.availability.some((s) => s.day === 'Sun'))
  const lo = 8 * 60
  const hi = 22 * 60
  const H = compact ? 120 : 160
  const y = (m: number) => ((Math.max(lo, Math.min(hi, m)) - lo) / (hi - lo)) * H
  const ticks = [8, 12, 16, 20].map((h) => h * 60)
  let anyConflict = false
  const classSlots = (job?.sessions ?? []).map((s) => {
    const fits = slotFits(s, applicant.availability)
    if (!fits) anyConflict = true
    return { ...s, fits }
  })
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex gap-2">
        <div className="relative w-9 shrink-0 text-[10px] text-slate-400" style={{ height: H, marginTop: 16 }}>
          {ticks.map((t) => (
            <div key={t} className="absolute right-0 -translate-y-1/2" style={{ top: y(t) }}>
              {fmtTime(t)}
            </div>
          ))}
        </div>
        <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => (
            <div key={d} className="min-w-0">
              <div className="mb-1 text-center text-[10.5px] font-semibold text-slate-500">{d}</div>
              <div className="relative rounded-md bg-slate-50" style={{ height: H }}>
                {ticks.map((t) => (
                  <div key={t} className="absolute inset-x-0 border-t border-dashed border-slate-200" style={{ top: y(t) }} />
                ))}
                {applicant.availability
                  .filter((s) => s.day === d)
                  .map((s, i) => (
                    <div key={i} className="absolute inset-x-0.5 rounded-[5px]" style={{ top: y(s.start), height: Math.max(3, y(s.end) - y(s.start)), background: 'rgba(34,197,94,.28)' }} />
                  ))}
                {classSlots
                  .filter((s) => s.day === d)
                  .map((s, i) => (
                    <div
                      key={`c${i}`}
                      className="absolute inset-x-1.5 rounded-[5px]"
                      style={{ top: y(s.start), height: Math.max(3, y(s.end) - y(s.start)), border: `2px solid ${s.fits ? '#16A34A' : '#DC2626'}`, background: s.fits ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.1)' }}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-3.5 rounded-sm" style={{ background: 'rgba(34,197,94,.28)' }} /> {applicant.name} can work
        </span>
        {job && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-3.5 rounded-sm" style={{ border: `2px solid ${anyConflict ? '#DC2626' : '#16A34A'}` }} /> {job.id} work hours {anyConflict ? '(conflict)' : '(fits)'}
          </span>
        )}
      </div>
    </div>
  )
}
