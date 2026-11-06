'use client'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, ClipboardCopy, Sparkle, Sprout, Trash2, X } from 'lucide-react'
import { CAREERS, CAREERS_INTRO, CAREERS_TECHNICAL, CAVEAT, STATUS_META } from '@/lib/report'
import type { SessionView, SkillResult, SkillStatus } from '@/lib/types'
import { useGame } from '@/store/game'
import { buildMarkdown, facts, plainSummary, ROOM_STAMPS } from './report/markdown'
import { Btn, CardShell, ErrorStrip, NavRow, StepHeader } from './ui'

const GOLD = '#B7821A'
const STEPS = [
  { key: 'mission', label: 'Your mission', next: 'What you brought →' },
  { key: 'brought', label: 'What you brought', next: 'What you showed →' },
  { key: 'showed', label: 'What you showed', next: 'By the numbers →' },
  { key: 'numbers', label: 'By the numbers', next: 'Reading list →' },
  { key: 'reading', label: 'Reading list', next: 'Save your report →' },
  { key: 'keep', label: 'Save your report', next: '' },
]

function Heading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: GOLD }}>
          {eyebrow}
        </div>
      )}
      <h2 className="serif text-[24px] font-bold leading-tight text-stone-900">{title}</h2>
      {sub && <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-600">{sub}</p>}
    </div>
  )
}

export function ReportCard() {
  const s = useGame((g) => g.session)!
  const set = useGame((g) => g.set)
  const act = useGame((g) => g.act)
  const busy = useGame((g) => Boolean(g.busy.report_generate))
  const [step, setStep] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const started = useRef(false)
  const close = () => set({ card: null, error: null })

  const generate = async () => {
    setErr(null)
    try {
      await act({ type: 'report_generate' })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    if (!s.report && !started.current) {
      started.current = true
      generate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const report = s.report
  return (
    <CardShell place="report" className="card-report" onClose={busy ? undefined : close}>
      <StepHeader
        eyebrow="Skills Report · Next Chapter"
        accent={GOLD}
        steps={report ? STEPS : []}
        current={step}
        reachable={STEPS.length - 1}
        onJump={setStep}
        onClose={close}
        hideClose={busy}
      />
      <ErrorStrip />
      {!report ? (
        <Composing busy={busy} err={err} onRetry={generate} />
      ) : (
        <div key={step} className="seed-step">
          {step === 0 && <Mission s={s} />}
          {step === 1 && <Brought s={s} />}
          {step === 2 && <Showed skills={report.skills} />}
          {step === 3 && <Numbers s={s} />}
          {step === 4 && <Reading s={s} />}
          {step === 5 && <Keep s={s} />}
          <NavRow onBack={step > 0 ? () => setStep(step - 1) : undefined}>
            {step < 5 ? (
              <Btn accent={GOLD} onClick={() => setStep(step + 1)}>
                {STEPS[step].next}
              </Btn>
            ) : (
              <Btn accent={GOLD} onClick={close}>
                Explore the campus
              </Btn>
            )}
          </NavRow>
        </div>
      )}
    </CardShell>
  )
}

function Composing({ busy, err, onRetry }: { busy: boolean; err: string | null; onRetry: () => void }) {
  return (
    <div className="seed-step py-2">
      <Heading eyebrow="Composing" title="The Report Writer is pulling it together" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="mx-auto w-[150px] shrink-0 rounded-md bg-white p-4 shadow-[0_10px_30px_-10px_rgba(120,80,10,.4)]">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className={`mb-2.5 h-1.5 rounded-full ${busy ? 'report-line' : ''}`}
              style={{ width: `${[92, 78, 86, 64, 90, 72, 84, 50][i]}%`, background: i === 0 ? GOLD : '#E7DCC6', animationDelay: `${i * 0.28}s` }}
            />
          ))}
        </div>
        <div className="flex-1">
          <p className="text-[13.5px] leading-relaxed text-stone-700">It only uses what you actually did. Scores and skill levels are worked out in code; the AI just puts them into words.</p>
          <ul className="mt-3 space-y-1.5 text-[13px] text-stone-600">
            {['Your Greenhouse answers', 'Your interview transcript and score', 'Every lab test run', 'Your Launch Pad decision'].map((t, i) => (
              <li key={t} className="seed-tile flex items-center gap-2" style={{ animationDelay: `${i * 110}ms` }}>
                <Sparkle size={13} fill="currentColor" className="shrink-0" style={{ color: GOLD }} /> {t}
              </li>
            ))}
          </ul>
          {err && !busy && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {err}
              <div className="mt-2">
                <Btn accent={GOLD} onClick={onRetry}>
                  Try again
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Mission({ s }: { s: SessionView }) {
  const r = s.report!
  const f = facts(s)
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: GOLD }}>
        You completed your first deployment mission
      </div>
      <h2 className="serif mt-1 text-[26px] font-bold leading-tight text-stone-900">{r.headline}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-stone-700">{r.summary}</p>
      {r.source === 'fallback' && <p className="mt-1 text-[11.5px] text-stone-500">Written from a template (no AI key on this server).</p>}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {ROOM_STAMPS.map((st, i) => {
          const fact = f[st.key]
          return (
            <div
              key={st.key}
              className="report-stamp flex flex-col items-center rounded-2xl border-2 border-dashed px-2 py-3 text-center"
              style={{ borderColor: fact ? st.color : '#CBD5E1', ['--tilt' as string]: `${st.tilt}deg`, ['--stamp-op' as string]: fact ? 1 : 0.55, animationDelay: `${i * 160}ms` } as CSSProperties}
            >
              <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed" style={{ borderColor: fact ? st.color : '#CBD5E1', color: fact ? st.color : '#94A3B8' }}>
                <st.icon size={24} />
              </span>
              <span className="mt-1.5 text-[9.5px] font-extrabold uppercase tracking-[.1em]" style={{ color: fact ? st.color : '#94A3B8' }}>
                {st.title}
              </span>
              <span className={`mt-0.5 text-[11.5px] font-semibold leading-tight ${fact ? 'text-stone-800' : 'text-stone-400'}`}>{fact ?? 'Skipped · not assessed'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Brought({ s }: { s: SessionView }) {
  const confirmed = s.setup?.confirmed ? s.setup : null
  return (
    <div>
      <Heading eyebrow="What you brought" title="The strengths you started with" sub={confirmed ? 'Only the strengths you confirmed in the Greenhouse.' : undefined} />
      {confirmed && confirmed.strengths.length ? (
        <div className="space-y-2.5">
          {confirmed.strengths.map((k, i) => (
            <div key={k.id} className="seed-tile rounded-2xl border border-amber-200/70 bg-white/80 p-3.5" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="text-[14px] font-bold text-stone-900">
                <Sprout size={15} className="mr-1 inline align-[-0.15em] text-emerald-700" />
                {k.label}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span className="italic text-stone-600">You said: “{k.from}”</span>
                <span style={{ color: '#D9A23B' }}>→</span>
                <span className="text-stone-700">{k.application}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-stone-200 bg-white/70 p-3.5 text-[13.5px] text-stone-600">You skipped setup, so this report doesn’t guess at your background. You can still visit the Greenhouse to map your strengths.</p>
      )}
    </div>
  )
}

const RUNGS: SkillStatus[] = ['demonstrated_independently', 'demonstrated_with_help', 'practiced', 'not_yet_demonstrated']

function Showed({ skills }: { skills: SkillResult[] }) {
  return (
    <div>
      <Heading eyebrow="What you showed" title="Skills, honestly assessed" sub="Each level is worked out in code from what you did, not from how well anything was phrased." />
      <div className="mb-4 grid gap-1.5 sm:grid-cols-2">
        {RUNGS.map((st) => {
          const n = skills.filter((k) => k.status === st).length
          return (
            <div key={st} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-[12.5px]">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STATUS_META[st].color }} />
              <span className="font-semibold text-stone-800">{STATUS_META[st].label}</span>
              <span className="text-stone-500">· {STATUS_META[st].rung}</span>
              <span className="ml-auto font-bold text-stone-700">{n}</span>
            </div>
          )
        })}
      </div>
      <div className="space-y-2.5">
        {skills.map((k, i) => (
          <SkillCard key={k.key} k={k} i={i} />
        ))}
      </div>
    </div>
  )
}

function SkillCard({ k, i }: { k: SkillResult; i: number }) {
  const [open, setOpen] = useState(false)
  const m = STATUS_META[k.status]
  return (
    <div className="seed-tile rounded-2xl bg-white/85 p-3.5 shadow-sm" style={{ borderLeft: `4px solid ${m.color}`, animationDelay: `${i * 80}ms` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14.5px] font-bold text-stone-900">{k.label}</span>
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: m.color }}>
          {m.label}
        </span>
      </div>
      <p className="mt-1 text-[13px] text-stone-600">{k.explanation}</p>
      {k.evidence.length > 0 && (
        <>
          <button className="mt-1.5 text-[12px] font-semibold hover:underline" style={{ color: GOLD }} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide the evidence' : `Show the evidence (${k.evidence.length})`}
          </button>
          {open && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {k.evidence.map((e, j) => (
                <span key={j} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[12px] text-stone-700">
                  <b className="mr-1 text-[10px] uppercase tracking-wide text-stone-500">{e.label}</b>
                  {e.kind === 'question' || e.kind === 'client' ? `“${e.text}”` : e.text}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Squares({ results }: { results: { applicantId: string; pass: boolean; name: string }[] }) {
  return (
    <span className="flex gap-1">
      {results.map((r) => (
        <span key={r.applicantId} title={r.name} className="grid h-5 w-5 place-items-center rounded text-[11px] font-bold text-white" style={{ background: r.pass ? '#22C55E' : '#EF4444' }}>
          {r.pass ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
        </span>
      ))}
    </span>
  )
}

function Numbers({ s }: { s: SessionView }) {
  const g = s.grade
  const runs = s.lab.runs
  const first = runs[0]
  const last = runs[runs.length - 1]
  const spot = s.lab.spot
  const pm = s.launch.premortem
  const spotted = s.launch.decision?.computed.premortemSpotted
  return (
    <div>
      <Heading eyebrow="By the numbers" title="Where every number comes from" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/85 p-3.5 shadow-sm">
          <div className="text-[12px] font-bold uppercase tracking-wide text-stone-500">Discovery</div>
          {g ? (
            <>
              <div className="serif text-[30px] font-bold text-stone-900">
                {g.total}
                <span className="text-[16px] text-stone-400">/100</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {g.rubric.map((r, i) => {
                  const pct = r.score / r.max
                  const color = pct >= 0.6 ? '#22C55E' : r.score > 0 ? '#F59E0B' : '#EF4444'
                  return (
                    <div key={r.key}>
                      <div className="flex justify-between text-[11.5px] text-stone-600">
                        <span>{r.label}</span>
                        <span className="font-semibold">
                          {r.score}/{r.max}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                        <div className="report-bar h-full rounded-full" style={{ width: `${Math.max(2, pct * 100)}%`, background: color, animationDelay: `${i * 120}ms` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] text-stone-500">Source: interview grader, transcript {g.transcriptId}. Practice after the debrief doesn’t change this score.</p>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-stone-500">Not assessed: the interview was skipped or not scored.</p>
          )}
        </div>
        <div className="rounded-2xl bg-white/85 p-3.5 shadow-sm">
          <div className="text-[12px] font-bold uppercase tracking-wide text-stone-500">Agent tests</div>
          {first && last ? (
            <div className="mt-2 space-y-2.5">
              {[
                { t: 'Before', r: first },
                ...(last !== first ? [{ t: 'After', r: last }] : []),
              ].map((x) => (
                <div key={x.t} className="flex items-center gap-2.5">
                  <span className="w-12 text-[12px] font-semibold text-stone-600">{x.t}</span>
                  <Squares results={x.r.results.filter((r) => !r.custom)} />
                  <span className="text-[13px] font-bold text-stone-800">{x.r.coreScore}/5</span>
                  <span className="font-mono text-[10.5px] text-stone-500">{x.r.version}</span>
                </div>
              ))}
              <p className="text-[11px] text-stone-500">Source: the policy checker in code, not the AI. 5 core synthetic tests per run.</p>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-stone-500">Not assessed: no lab runs.</p>
          )}
        </div>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/75 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Spotting the failure</div>
          <div className="mt-1 text-[13.5px] font-semibold text-stone-800">{spot ? (spot.correct ? 'Judged T02 correctly' : 'Judged T02 incorrectly') : 'Not assessed'}</div>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Pre-mortem</div>
          <div className="mt-1 text-[13.5px] font-semibold text-stone-800">{pm?.checked && spotted !== undefined ? `${spotted} of 4 untested situations spotted` : pm?.checked ? 'Sorted, no decision yet' : 'Skipped'}</div>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Hints used</div>
          <div className="mt-1 text-[13.5px] font-semibold text-stone-800">{s.lab.hintUsed ? '1 hint' : 'No hints'}</div>
          <div className="text-[11.5px] text-stone-500">Asking for help is part of the job.</div>
        </div>
      </div>
    </div>
  )
}

function Reading({ s }: { s: SessionView }) {
  return (
    <div>
      <Heading eyebrow="Your reading list" title="Keep learning" />
      <ol className="space-y-2.5">
        {s.report!.nextSteps.map((n, i) => (
          <li key={i} className="seed-tile flex items-start gap-3" style={{ animationDelay: `${i * 110}ms` }}>
            <span className="serif grid h-11 w-8 shrink-0 place-items-center rounded-[4px] bg-gradient-to-b from-amber-400 to-amber-600 text-[18px] font-bold text-white shadow-[inset_-3px_0_0_rgba(0,0,0,.15),0_4px_10px_-4px_rgba(180,83,9,.6)]">
              {i + 1}
            </span>
            <span className="pt-2 text-[14px] leading-relaxed text-stone-800">{n}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 rounded-2xl p-4 text-white" style={{ background: '#1E4630' }}>
        <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: '#E0905F' }}>
          Roles to explore
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/90">{CAREERS_INTRO}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CAREERS.map((c) => (
            <span key={c} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12.5px] font-semibold backdrop-blur">
              {c}
            </span>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-white/80">{CAREERS_TECHNICAL}</p>
        <p className="mt-1 text-[12.5px] font-semibold text-white">Today was a real first step. Keep practicing and keep exploring. These roles are within reach.</p>
      </div>
    </div>
  )
}

function Keep({ s }: { s: SessionView }) {
  const restart = useGame((g) => g.restart)
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainSummary(s))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  const download = () => {
    const blob = new Blob([buildMarkdown(s)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'deployher-skills-report.md'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div>
      <Heading eyebrow="Save your report" title="Take your report with you" />
      <div className="flex flex-wrap gap-2">
        <Btn accent={GOLD} onClick={copy}>
          {copied ? (
            <>
              <Check size={15} /> Copied
            </>
          ) : (
            <>
              <ClipboardCopy size={15} /> Copy summary
            </>
          )}
        </Btn>
        <Btn variant="soft" accent={GOLD} onClick={download}>
          ⬇ Download .md
        </Btn>
        <span className="inline-flex cursor-not-allowed items-center rounded-full border border-dashed border-stone-300 px-3 py-2 text-[12.5px] font-semibold text-stone-400">Try another mission · coming soon</span>
      </div>
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white/75 p-3.5 text-[13px] text-stone-600">
        <b className="text-stone-800">Your data.</b> Your answers, transcript and results are saved on this DeployHER server under a random session id, so you can come back to them. No account, no name needed. Nothing is ranked, made public, or shared with employers. Deleting removes it from the server.
        <div className="mt-2.5">
          {!confirm ? (
            <button className="text-[12.5px] font-semibold text-red-700 hover:underline" onClick={() => setConfirm(true)}>
              <Trash2 size={13} className="mr-1 inline align-[-0.15em]" />
              Delete my session
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] font-semibold text-stone-800">Delete everything and start over?</span>
              <Btn variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                busy={deleting}
                onClick={async () => {
                  setDeleting(true)
                  await restart()
                }}
              >
                Delete and restart
              </Btn>
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-[11.5px] italic text-stone-500">{CAVEAT} All people, organisations, numbers and applicants are fictional.</p>
    </div>
  )
}
