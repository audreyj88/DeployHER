'use client'
// Step 6: add a tricky applicant (from an idea or built by hand), rerun, see if the agent got her right.
import { useState } from 'react'
import { applicantFromSpec, AVAILABILITY_OPTIONS, CUSTOM_TOPICS, TEST_IDEAS, type AvailabilityKey, type CustomSpec, type Programming, type Topic } from '@/lib/catalog'
import { expectedFor } from '@/lib/policy'
import type { LabRun, SessionView } from '@/lib/types'
import { Btn, useAct, useBusy } from '../ui'
import { CaseRow } from './Results'
import { ACCENT, Avatar } from './shared'

const MAX = 2

function chipsFor(spec: CustomSpec) {
  const av = AVAILABILITY_OPTIONS.find((a) => a.key === spec.availability)!.label
  const c = [spec.interests.join(', '), av, spec.programming === 'yes' ? 'can code' : spec.programming === 'no' ? 'no coding' : 'coding unknown']
  if (spec.remoteOnly) c.push('remote only')
  if (spec.asksForAction) c.push('asks to be enrolled')
  return c
}

const sameSpec = (a: CustomSpec, b: CustomSpec) => a.name.toLowerCase() === b.name.toLowerCase()

export function YourTest({ s, onRun, lastRun }: { s: SessionView; onRun: () => void; lastRun?: LabRun }) {
  const act = useAct()
  const adding = useBusy('lab_custom_add')
  const running = useBusy('lab_run')
  const [building, setBuilding] = useState(false)
  const [form, setForm] = useState<CustomSpec>({ name: '', interests: [], availability: 'weekday_evenings', programming: 'unknown', remoteOnly: false, asksForAction: false })
  const customs = s.lab.customs
  const full = customs.length >= MAX
  const lastNames = new Set(lastRun?.results.filter((r) => r.custom).map((r) => r.name) ?? [])
  const needsRerun = customs.length > 0 && customs.some((c) => !lastNames.has(c.name))
  const customRows = !needsRerun && customs.length ? (lastRun?.results.filter((r) => r.custom && customs.some((c) => c.name === r.name)) ?? []) : []
  const phase = customRows.length ? 2 : customs.length ? 1 : 0

  const nameOk = /^[A-Za-z]{1,20}$/.test(form.name)
  const formReady = nameOk && form.interests.length > 0
  const preview = formReady ? expectedFor(applicantFromSpec(form, 'C')) : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {['Pick a tricky applicant', 'Rerun the tests', 'See if the agent got her right'].map((t, i) => (
          <span key={t} className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={i <= phase ? { background: ACCENT, color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}>
            {i + 1}. {t}
          </span>
        ))}
      </div>

      {customs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-slate-500">In the tests:</span>
          {customs.map((c, i) => (
            <span key={c.name} className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 py-0.5 pl-0.5 pr-1 text-[12px] font-semibold text-violet-800">
              <Avatar name={c.name} id={`C${i + 1}`} size={20} />
              {c.name}
              <button className="grid h-5 w-5 place-items-center rounded-full text-violet-400 hover:bg-violet-100 hover:text-violet-800" aria-label={`Remove ${c.name}`} onClick={() => act({ type: 'lab_custom_remove', index: i })}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {needsRerun && (
        <div className="seed-step flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-3.5 py-3">
          <span className="text-[13px] font-semibold text-orange-900">Your applicant is in the queue. Rerun every test to see how the agent handles her.</span>
          <Btn accent={ACCENT} busy={running} onClick={onRun}>
            ▶ Rerun all tests
          </Btn>
        </div>
      )}

      {customRows.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">Your test results · run {lastRun!.n} {lastRun!.version}</div>
          {customRows.map((r) => (
            <CaseRow key={r.name} r={r} s={s} defaultOpen={!r.pass} />
          ))}
        </div>
      )}

      {!building && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {TEST_IDEAS.map((idea, i) => {
            const ex = expectedFor(applicantFromSpec(idea.spec, 'C'))
            const inTests = customs.some((c) => sameSpec(c, idea.spec))
            return (
              <div key={idea.key} className="seed-tile flex flex-col rounded-2xl border border-slate-200 bg-white p-3" style={{ animationDelay: `${i * 90}ms` }}>
                <div className="text-[10.5px] font-bold uppercase tracking-[.12em]" style={{ color: ACCENT }}>
                  {idea.gap}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <Avatar name={idea.spec.name} id={`idea-${i}`} size={26} />
                  <span className="text-[14px] font-bold text-slate-900">{idea.spec.name}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {chipsFor(idea.spec).map((c) => (
                    <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-[12px] text-slate-600">{idea.why}</p>
                <p className="mt-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11.5px] text-emerald-800">⚖️ Right answer: {ex.text}</p>
                <div className="mt-auto pt-2">
                  {inTests ? (
                    <span className="text-[12.5px] font-semibold text-emerald-700">✓ In the tests</span>
                  ) : (
                    <Btn variant="soft" accent={ACCENT} disabled={full} busy={adding} onClick={() => act({ type: 'lab_custom_add', spec: idea.spec })}>
                      + Add {idea.spec.name}
                    </Btn>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!building ? (
        <button className="text-[13px] font-semibold underline-offset-2 hover:underline" style={{ color: ACCENT }} onClick={() => setBuilding(true)} disabled={full}>
          {full ? `You’ve added the maximum of ${MAX} test cases.` : 'Or build your own applicant →'}
        </button>
      ) : (
        <div className="seed-step space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-semibold text-slate-600">
              First name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 20) })}
                placeholder="e.g. Nadia"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13.5px] font-normal text-slate-900 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="block text-[12px] font-semibold text-slate-600">
              When she’s free
              <select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value as AvailabilityKey })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13.5px] font-normal text-slate-900">
                {AVAILABILITY_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <div className="mb-1 text-[12px] font-semibold text-slate-600">Interested in (up to 3)</div>
            <div className="flex flex-wrap gap-1.5">
              {CUSTOM_TOPICS.map((t) => {
                const on = form.interests.includes(t)
                return (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, interests: on ? form.interests.filter((x) => x !== t) : form.interests.length < 3 ? [...form.interests, t as Topic] : form.interests })}
                    className="rounded-full border px-3 py-1 text-[12.5px] font-semibold transition"
                    style={on ? { background: ACCENT, borderColor: ACCENT, color: '#fff' } : { borderColor: '#E2E8F0', color: '#475569' }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] font-semibold text-slate-600">
              Can she code?
              <select value={form.programming} onChange={(e) => setForm({ ...form, programming: e.target.value as Programming })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13.5px] font-normal text-slate-900">
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="unknown">She didn’t say</option>
              </select>
            </label>
            <div className="flex flex-col justify-end gap-1.5 text-[13px] text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.remoteOnly} onChange={(e) => setForm({ ...form, remoteOnly: e.target.checked })} className="h-4 w-4 accent-orange-500" />
                Remote only
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.asksForAction} onChange={(e) => setForm({ ...form, asksForAction: e.target.checked })} className="h-4 w-4 accent-orange-500" />
                Asks to be enrolled
              </label>
            </div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-900">
            <b>⚖️ Right answer: </b>
            {preview ? preview.text : 'Pick a name and at least one interest.'}
            <div className="mt-0.5 text-[11.5px] text-emerald-700">The grader works this out from the client’s rules, so you don’t have to.</div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Btn variant="ghost" onClick={() => setBuilding(false)}>
              Cancel
            </Btn>
            <Btn
              accent={ACCENT}
              disabled={!formReady || full}
              busy={adding}
              onClick={async () => {
                const r = await act({ type: 'lab_custom_add', spec: form })
                if (r) {
                  setBuilding(false)
                  setForm({ ...form, name: '' })
                }
              }}
            >
              + Add {form.name || 'her'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
