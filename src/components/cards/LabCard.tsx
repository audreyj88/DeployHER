'use client'
import { useEffect, useState } from 'react'
import { Bot, Check, ClipboardList, Clock, Lightbulb, ListOrdered, RefreshCw, SearchCheck, ShieldCheck, Sparkles, TriangleAlert, Wrench, X } from 'lucide-react'
import { CORE_TESTS, jobById, jobFacts, workplaceShort } from '@/lib/catalog'
import { stageIndex } from '@/lib/places'
import type { LabRun, SessionView } from '@/lib/types'
import { useGame } from '@/store/game'
import { BriefView } from './Brief'
import { PipelineCard, stepToNode } from './lab/Pipeline'
import { CaseRow, GraderNote, ScoreRow } from './lab/Results'
import { ACCENT, AI, TOOL, VerdictPill, WeekStrip } from './lab/shared'
import { Walkthrough } from './lab/Walkthrough'
import { YourTest } from './lab/YourTest'
import { Btn, CardShell, ErrorStrip, NavRow, SectionTitle, StepHeader, ThinkingDots, Tinted, useAct, useBusy } from './ui'

const STEPS = [
  { key: 'meet', label: 'Meet the agent' },
  { key: 'spot', label: 'Spot it' },
  { key: 'results', label: 'Results' },
  { key: 'fix', label: 'Fix' },
  { key: 'retest', label: 'Retest' },
  { key: 'test', label: 'Your test' },
  { key: 'wrap', label: 'Wrap up' },
]

const SOFIA = CORE_TESTS.find((t) => t.id === 'T02')!

/** The run to compare the latest against: the last one with a different setup, else the first. */
function beforeRun(runs: LabRun[]): LabRun | undefined {
  const last = runs[runs.length - 1]
  if (!last || runs.length < 2) return undefined
  for (let i = runs.length - 2; i >= 0; i--) if (runs[i].scheduleFilter !== last.scheduleFilter || runs[i].promptFix !== last.promptFix) return runs[i]
  return runs[0]
}

function computedReach(s: SessionView) {
  const runs = s.lab.runs.length
  if (!runs) return 0
  if (!s.lab.spot) return 1
  if (runs === 1) return 3
  return 6
}

function initialStep(s: SessionView) {
  if (stageIndex(s.stage) > stageIndex('agent_troubleshooting')) return 6
  if (!s.lab.runs.length) return 0
  if (!s.lab.spot) return 1
  if (s.lab.runs.length === 1) return 2
  return 4
}

export function LabCard() {
  const s = useGame((g) => g.session)!
  const set = useGame((g) => g.set)
  const walkTo = useGame((g) => g.walkTo)
  const act = useAct()
  const running = useBusy('lab_run')
  const doneBusy = useBusy('lab_done')
  const [step, setStep] = useState(() => initialStep(s))
  const [maxSeen, setMaxSeen] = useState(() => initialStep(s))
  const [showBrief, setShowBrief] = useState(false)
  const reach = Math.max(computedReach(s), maxSeen)
  const finished = stageIndex(s.stage) > stageIndex('agent_troubleshooting')

  useEffect(() => setMaxSeen((m) => Math.max(m, step)), [step])
  useEffect(() => () => set({ labRunning: false }), [set])

  const go = (i: number) => setStep(Math.max(0, Math.min(6, i)))
  const close = () => set({ card: null, error: null })

  const run = async () => {
    set({ labRunning: true })
    const r = await act({ type: 'lab_run' })
    set({ labRunning: false })
    return Boolean(r)
  }

  const runs = s.lab.runs
  const first = runs[0]
  const last = runs[runs.length - 1]

  return (
    <CardShell place="lab" className="card-lab" onClose={running ? undefined : close}>
      <StepHeader
        eyebrow="Make It Work Lab"
        accent={ACCENT}
        steps={STEPS}
        current={step}
        reachable={reach}
        onJump={running ? undefined : go}
        onClose={close}
        hideClose={running}
        right={
          <button onClick={() => setShowBrief((b) => !b)} className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${showBrief ? 'bg-orange-100 text-orange-900' : 'text-slate-600 hover:bg-black/5'}`}>
            <ClipboardList size={14} className="mr-1 inline align-[-0.15em]" />
            Client brief
          </button>
        }
      />
      <ErrorStrip />

      {showBrief ? (
        <div className="seed-step">
          <BriefView brief={s.brief} accent={ACCENT} />
          <NavRow>
            <Btn accent={ACCENT} onClick={() => setShowBrief(false)}>
              Back to the lab
            </Btn>
          </NavRow>
        </div>
      ) : (
        <div key={step} className="seed-step">
          {step === 0 && <MeetStep s={s} running={running} onRun={async () => (await run()) && go(1)} onNext={() => go(1)} />}
          {step === 1 && <SpotStep s={s} onNext={() => go(2)} onBack={() => go(0)} />}
          {step === 2 && first && (
            <div className="space-y-3">
              <SectionTitle accent={ACCENT} eyebrow="Results · first run" title="How Kai’s agent did on all five" />
              <ScoreRow run={first} label="right on the first run. Tap a row to see where it went wrong." />
              <div className="space-y-2">
                {first.results
                  .filter((r) => !r.custom)
                  .map((r, i, arr) => (
                    <CaseRow key={r.applicantId} r={r} s={s} defaultOpen={!r.pass && arr.findIndex((x) => !x.pass) === i} />
                  ))}
              </div>
              <GraderNote />
              <NavRow onBack={() => go(1)}>
                <Btn accent={ACCENT} onClick={() => go(3)}>
                  Fix it →
                </Btn>
              </NavRow>
            </div>
          )}
          {step === 3 && (
            <FixStep
              s={s}
              running={running}
              onBack={() => go(2)}
              onRun={async () => (await run()) && go(4)}
              onSkip={() => go(6)}
            />
          )}
          {step === 4 && last && runs.length >= 2 && (
            <RetestStep
              s={s}
              running={running}
              onAddCheck={async () => {
                const r = await act({ type: 'lab_fix', scheduleFilter: true, promptFix: s.lab.fix.promptFix })
                if (r) await run()
              }}
              onBack={() => go(3)}
              onNext={() => go(5)}
            />
          )}
          {step === 4 && runs.length < 2 && (
            <div>
              <p className="text-[13.5px] text-slate-600">Try a fix first, then rerun the tests to see the before and after.</p>
              <NavRow onBack={() => go(3)} />
            </div>
          )}
          {step === 5 && (
            <div>
              <SectionTitle accent={ACCENT} eyebrow="Your test" title="Five tests leave gaps. Add one of your own." sub="Pick an applicant who probes something the five don’t, or build your own. The grader works out the right answer from the client’s rules." />
              <YourTest s={s} lastRun={last} onRun={run} />
              <NavRow onBack={() => go(4)}>
                <Btn accent={ACCENT} onClick={() => go(6)}>
                  {s.lab.customs.length ? 'Continue' : 'Skip'}
                </Btn>
              </NavRow>
            </div>
          )}
          {step === 6 && (
            <WrapStep
              s={s}
              finished={finished}
              busy={doneBusy}
              onBack={() => go(5)}
              onDone={async () => {
                if (finished) return close()
                const r = await act({ type: 'lab_done' })
                if (r) {
                  set({ card: null, error: null })
                  walkTo({ kind: 'room', id: 'launch' })
                }
              }}
            />
          )}
          {(step === 2 && !first) && (
            <div>
              <p className="text-[13.5px] text-slate-600">Run the agent first.</p>
              <NavRow onBack={() => go(0)} />
            </div>
          )}
        </div>
      )}
    </CardShell>
  )
}

// ---------------- Step 1: Meet the agent ----------------

function MeetStep({ s, running, onRun, onNext }: { s: SessionView; running: boolean; onRun: () => void; onNext: () => void }) {
  const [part, setPart] = useState<0 | 1>(s.lab.runs.length ? 1 : 0)
  if (part === 0) {
    return (
      <div>
        <SectionTitle accent={ACCENT} eyebrow="Meet the agent" title="First: what is an AI agent?" sub={<>Your colleague Kai built an AI agent that <b className="font-semibold text-slate-800">matches women returning to work with job openings</b>, so Maya’s caseworkers can review each match before it reaches anyone. Before you test it, here’s what’s inside.</>} />
        <div className="flex flex-wrap items-center justify-center gap-2 py-2 text-center">
          {[
            { icon: Sparkles, t: 'AI model', d: 'Reads and writes language', c: AI },
            { icon: Wrench, t: 'Tools', d: 'Code that looks things up and checks rules', c: TOOL },
            { icon: ListOrdered, t: 'Steps', d: 'The order things happen in', c: '#F59E0B' },
          ].map((x, i) => (
            <div key={x.t} className="flex items-center gap-2">
              <div className="seed-tile w-[150px] rounded-2xl border bg-white p-3" style={{ borderColor: `${x.c}55`, animationDelay: `${i * 90}ms` }}>
                <x.icon size={22} style={{ color: x.c }} />
                <div className="text-[13.5px] font-bold" style={{ color: x.c }}>
                  {x.t}
                </div>
                <div className="text-[11.5px] text-slate-500">{x.d}</div>
              </div>
              <span className="text-[18px] font-bold text-slate-300">{i < 2 ? '+' : '='}</span>
            </div>
          ))}
          <div className="seed-tile w-[150px] rounded-2xl p-3 text-white" style={{ background: ACCENT, animationDelay: '300ms' }}>
            <Bot size={22} />
            <div className="text-[13.5px] font-bold">Agent</div>
            <div className="text-[11.5px] opacity-90">Gets a job done, step by step</div>
          </div>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <Tinted tone={TOOL}>
            <div className="text-[12.5px] font-bold text-sky-800">
              <Wrench size={13} className="mr-1 inline align-[-0.15em]" />
              Code
            </div>
            <p className="mt-1 text-[12.5px] text-slate-700">Exact and repeatable. The same input gives the same answer every time. But it only does what it was written to do.</p>
          </Tinted>
          <Tinted tone={AI}>
            <div className="text-[12.5px] font-bold text-violet-800">
              <Sparkles size={13} className="mr-1 inline align-[-0.15em]" />
              The AI model
            </div>
            <p className="mt-1 text-[12.5px] text-slate-700">Flexible: it handles messy, new situations. But it can slip, and nothing forces it to follow a rule.</p>
          </Tinted>
        </div>
        <p className="mt-3 text-center text-[14px] font-bold text-slate-800">That’s why you test it.</p>
        <NavRow>
          <Btn accent={ACCENT} onClick={() => setPart(1)}>
            Walk an applicant through →
          </Btn>
        </NavRow>
      </div>
    )
  }
  return (
    <div>
      <SectionTitle accent={ACCENT} eyebrow="Meet the agent" title="Follow an applicant through Kai’s agent" sub="Step through to see what code does and what the AI model does. Then send all five test applicants through for real." />
      <Walkthrough run={s.lab.runs[0]} running={running} />
      <NavRow onBack={() => setPart(0)}>
        {running ? (
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-orange-800">
            <ThinkingDots color={ACCENT} /> Sending all 5 applicants through Kai’s agent, for real…
          </span>
        ) : s.lab.runs.length ? (
          <Btn accent={ACCENT} onClick={onNext}>
            Check Sofia’s result →
          </Btn>
        ) : (
          <Btn accent={ACCENT} onClick={onRun}>
            ▶ Run the agent on all 5
          </Btn>
        )}
      </NavRow>
    </div>
  )
}

// ---------------- Step 2: Spot it ----------------

function SpotStep({ s, onNext, onBack }: { s: SessionView; onNext: () => void; onBack: () => void }) {
  const act = useAct()
  const busy = useBusy('lab_spot', 'lab_hint')
  const first = s.lab.runs[0]
  const sofia = first?.results.find((r) => r.applicantId === 'T02')
  const prog = sofia?.answer?.jobId ? jobById(sofia.answer.jobId) : null
  const spot = s.lab.spot
  const [hint, setHint] = useState(s.lab.hintUsed)
  if (!sofia) return <p className="text-[13px] text-slate-600">Run the agent first.</p>
  const truthRight = sofia.pass
  return (
    <div>
      <SectionTitle accent={ACCENT} eyebrow="Spot it" title="Did the agent get it right for Sofia?" sub="Look at what she needs and what the agent recommended. Make the call before you see the grader’s verdict." />
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-emerald-700">Sofia needs</div>
          <div className="mt-1 text-[16px] font-extrabold text-slate-900">Weekdays 9am–3pm · {workplaceShort(SOFIA.workplace)} · ${SOFIA.minPay}/hr+</div>
          <div className="mt-0.5 text-[12.5px] text-slate-600">{SOFIA.note}. Flexible hours around school pickups.</div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3.5">
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-violet-700">The agent recommended</div>
          {prog ? (
            <>
              <div className="mt-1 text-[16px] font-extrabold text-slate-900">{prog.title}</div>
              <div className="mt-0.5 text-[12.5px] text-slate-600">{prog.employer} · {jobFacts(prog)}</div>
            </>
          ) : (
            <div className="mt-1 text-[14px] font-semibold text-slate-800">{sofia.answer ? 'No job' : 'No usable answer'}</div>
          )}
        </div>
      </div>

      {!spot ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Btn accent="#16A34A" busy={busy} onClick={() => act({ type: 'lab_spot', answer: 'right' })}>
              <Check size={15} /> It’s right
            </Btn>
            <Btn accent="#DC2626" busy={busy} onClick={() => act({ type: 'lab_spot', answer: 'wrong' })}>
              <X size={15} /> It’s wrong
            </Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => act({ type: 'lab_spot', answer: 'unsure' })}>
              Not sure
            </Btn>
            {!hint && (
              <button
                className="ml-auto text-[12.5px] font-semibold underline-offset-2 hover:underline"
                style={{ color: ACCENT }}
                onClick={() => {
                  setHint(true)
                  act({ type: 'lab_hint' })
                }}
              >
                Give me a hint
              </button>
            )}
          </div>
          {hint && <div className="seed-step mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-900"><Lightbulb size={14} className="mr-1 inline align-[-0.15em]" />Compare the hours she can work, and where, with the job’s hours and location. Pay isn’t the only requirement.</div>}
          {hint && prog && (
            <div className="mt-3">
              <WeekStrip applicant={SOFIA} job={prog} compact />
            </div>
          )}
        </div>
      ) : (
        <div className="seed-step mt-4 space-y-3">
          <div className={`rounded-2xl px-3.5 py-3 ${spot.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
            <div className="text-[15px] font-extrabold">{spot.correct ? 'You got it.' : spot.answer === 'unsure' ? 'Here’s how to tell.' : 'Not quite.'}</div>
            <p className="mt-1 text-[13px]">
              {truthRight
                ? 'It’s right: this job fits her hours, location and pay. (On this run the AI happened to get lucky; v1 doesn’t check hours or location.)'
                : 'It’s wrong: the job may match her experience, but it doesn’t fit the hours Sofia can work or where she can work, and Maya said those needs must never be ignored.'}
            </p>
          </div>
          {prog && <WeekStrip applicant={SOFIA} job={prog} />}
          <p className="text-[13px] leading-relaxed text-slate-600">
            What you just did is an <b>evaluation</b>: checking an AI’s output against the client’s rules, case by case. It’s the core habit of deployment work. A grader in code can do the same check every time.
          </p>
        </div>
      )}
      <NavRow onBack={onBack}>
        {spot && (
          <Btn accent={ACCENT} onClick={onNext}>
            See all 5 results →
          </Btn>
        )}
      </NavRow>
    </div>
  )
}

// ---------------- Step 4: Fix ----------------

function FixStep({ s, running, onBack, onRun, onSkip }: { s: SessionView; running: boolean; onBack: () => void; onRun: () => void; onSkip: () => void }) {
  const act = useAct()
  const fix = s.lab.fix
  const last = s.lab.runs[s.lab.runs.length - 1]
  const same = last && last.scheduleFilter === fix.scheduleFilter && last.promptFix === fix.promptFix
  const toggle = (k: 'scheduleFilter' | 'promptFix') => act({ type: 'lab_fix', ...fix, [k]: !fix[k] })
  const version = `${fix.scheduleFilter ? 'v2' : 'v1'}${fix.promptFix ? '+instruction' : ''}`
  return (
    <div>
      <SectionTitle accent={ACCENT} eyebrow="Fix" title="Where should the fix go?" sub="Sofia got a full-time, on-site job because nothing in Kai’s agent checks her hours or where she can work. You can tell the AI, add a check in code, or both." />
      <PipelineCard version={version} scheduleBuilt={fix.scheduleFilter} fixMode scheduleAddedByYou={fix.scheduleFilter} promptFix={fix.promptFix} running={running} />
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {[
          { k: 'promptFix' as const, icon: Sparkles, title: 'Tell the AI', tag: 'AI MODEL', tone: AI, body: 'Add her hours and location needs and “IMPORTANT: Always respect the applicant’s schedule and location needs…” to the AI’s instructions.' },
          { k: 'scheduleFilter' as const, icon: Clock, title: 'Add a schedule & location check', tag: 'TOOL · CODE', tone: TOOL, body: 'Code removes every job whose hours or location don’t work for her before the AI even sees the list.' },
        ].map((o) => {
          const on = fix[o.k]
          return (
            <button
              key={o.k}
              disabled={running}
              onClick={() => toggle(o.k)}
              className="seed-choice flex gap-3 rounded-2xl border-2 bg-white p-3.5 text-left transition"
              style={{ borderColor: on ? o.tone : '#E2E8F0', boxShadow: on ? `0 0 0 4px ${o.tone}22` : undefined }}
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 text-[12px] font-bold text-white" style={{ borderColor: o.tone, background: on ? o.tone : '#fff' }}>
                {on && <Check size={13} strokeWidth={3} />}
              </span>
              <span>
                <span className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-slate-900">
                    <o.icon size={14} className="mr-1 inline align-[-0.15em]" style={{ color: o.tone }} />
                    {o.title}
                  </span>
                  <span className="rounded px-1.5 py-px text-[9.5px] font-bold" style={{ background: `${o.tone}22`, color: o.tone === AI ? '#5B21B6' : '#075985' }}>
                    {o.tag}
                  </span>
                </span>
                <span className="mt-1 block text-[12.5px] text-slate-600">{o.body}</span>
              </span>
            </button>
          )
        })}
      </div>
      {same && <p className="mt-2 text-[12px] text-slate-500">Same setup as your last run.</p>}
      <NavRow onBack={onBack}>
        {running ? (
          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-orange-800">
            <ThinkingDots color={ACCENT} /> Rerunning all the tests…
          </span>
        ) : (
          <>
            {s.lab.runs.length < 2 && (
              <Btn variant="ghost" onClick={onSkip}>
                Skip fixing
              </Btn>
            )}
            <Btn accent={ACCENT} onClick={onRun}>
              ▶ Rerun all tests
            </Btn>
          </>
        )}
      </NavRow>
    </div>
  )
}

// ---------------- Step 5: Retest ----------------

function RetestStep({ s, running, onAddCheck, onBack, onNext }: { s: SessionView; running: boolean; onAddCheck: () => void; onBack: () => void; onNext: () => void }) {
  const runs = s.lab.runs
  const after = runs[runs.length - 1]
  const before = beforeRun(runs)!
  const [all, setAll] = useState(false)
  const core = (r: LabRun) => r.results.filter((x) => !x.custom)
  const regressions = core(after).filter((r) => !r.pass && before.results.find((b) => b.applicantId === r.applicantId)?.pass)
  const sofiaAfter = after.results.find((r) => r.applicantId === 'T02')
  let lesson: 'regression' | 'instruction' | 'fixed' | 'still' = 'still'
  if (regressions.length) lesson = 'regression'
  else if (sofiaAfter?.pass && after.scheduleFilter) lesson = 'fixed'
  else if (sofiaAfter?.pass && after.promptFix) lesson = 'instruction'
  return (
    <div>
      <SectionTitle accent={ACCENT} eyebrow="Retest · regression testing" title="Before → after, every test" sub="After any change you rerun every test, not just the one you fixed. That’s regression testing." />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <span>Applicant</span>
          <span>Before · {before.version}</span>
          <span />
          <span>After · {after.version}</span>
        </div>
        {core(after).map((r) => {
          const b = before.results.find((x) => x.applicantId === r.applicantId)
          const broke = b?.pass && !r.pass
          return (
            <div key={r.applicantId} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-slate-100 px-3 py-2 last:border-0">
              <span className="text-[13px] font-semibold text-slate-800">
                {r.name} {broke && <span className="ml-1 rounded-full bg-red-100 px-1.5 text-[10.5px] font-bold text-red-700">
                    <TriangleAlert size={11} className="mr-0.5 inline align-[-0.1em]" />
                    broke
                  </span>}
              </span>
              <span>{b ? <VerdictPill pass={b.pass} small /> : '–'}</span>
              <span className="text-slate-300">→</span>
              <VerdictPill pass={r.pass} small />
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <ScoreRow run={before} />
        <span className="text-[18px] text-slate-300">→</span>
        <ScoreRow run={after} />
      </div>

      <div className="mt-4">
        {lesson === 'regression' && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5">
            <div className="text-[15px] font-extrabold text-red-900">Your fix broke something else</div>
            <p className="mt-1 text-[13px] text-red-900/80">A test that passed before now fails. That’s a regression, and it’s why you rerun every test after any change.</p>
          </div>
        )}
        {lesson === 'instruction' && (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3.5">
            <div className="text-[15px] font-extrabold text-violet-900">An instruction is a request. A check is a guarantee.</div>
            <p className="mt-1 text-[13px] text-violet-900/80">Telling the AI to respect hours and location may work on these five, but nothing makes it hold for the next applicant. For a rule that must never break, add a check in code.</p>
            <div className="mt-2.5">
              <Btn accent={AI} busy={running} onClick={onAddCheck}>
                <Clock size={15} /> Add the schedule & location check and rerun
              </Btn>
            </div>
          </div>
        )}
        {lesson === 'fixed' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
            <div className="text-[15px] font-extrabold text-emerald-900">Fixed for good.</div>
            <p className="mt-1 text-[13px] text-emerald-900/80">Your check removes jobs Sofia can’t work, by hours or location, before the AI even sees them, so it can’t pick one.</p>
          </div>
        )}
        {lesson === 'still' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <div className="text-[15px] font-extrabold text-amber-900">Sofia’s test still fails</div>
            <p className="mt-1 text-[13px] text-amber-900/80">Go back to Fix and try a different change. Where would a guarantee come from?</p>
          </div>
        )}
      </div>

      <button className="mt-3 text-[12.5px] font-semibold text-slate-600 hover:text-slate-900" onClick={() => setAll((a) => !a)}>
        {all ? '▾' : '▸'} See every result from this run
      </button>
      {all && (
        <div className="mt-2 space-y-2">
          {after.results.map((r) => (
            <CaseRow key={r.applicantId + r.name} r={r} s={s} />
          ))}
        </div>
      )}
      <NavRow onBack={onBack}>
        <Btn accent={ACCENT} disabled={running} onClick={onNext}>
          Add your own test →
        </Btn>
      </NavRow>
    </div>
  )
}

// ---------------- Step 7: Wrap up ----------------

function WrapStep({ s, finished, busy, onBack, onDone }: { s: SessionView; finished: boolean; busy: boolean; onBack: () => void; onDone: () => void }) {
  const triedFix = s.lab.runs.some((r) => r.scheduleFilter || r.promptFix)
  return (
    <div>
      <SectionTitle accent={ACCENT} eyebrow="Wrap up" title="An instruction asks. Code guarantees." sub="Passing five made-up tests is a step toward ready, not proof. Real applicants are messier." />
      <div className="grid gap-2.5 sm:grid-cols-3">
        {[
          { icon: SearchCheck, t: 'Evaluation', d: 'Check each AI answer against the client’s rules. You did it by eye for Sofia; the grader does it in code.' },
          { icon: ShieldCheck, t: 'Validation', d: 'Put rules that must never break into code, so the AI never gets the chance to break them.' },
          { icon: RefreshCw, t: 'Regression testing', d: 'After any change, rerun every test. A fix in one place can break another.' },
        ].map((c, i) => (
          <div key={c.t} className="seed-tile rounded-2xl border border-orange-200/70 bg-white p-3.5" style={{ animationDelay: `${i * 90}ms` }}>
            <c.icon size={22} style={{ color: ACCENT }} />
            <div className="mt-1 text-[14px] font-bold text-slate-900">{c.t}</div>
            <p className="mt-1 text-[12.5px] text-slate-600">{c.d}</p>
          </div>
        ))}
      </div>
      {!triedFix && !finished && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">You can continue without fixing, but trying a fix is the point of this room.</p>}
      <NavRow onBack={onBack}>
        <Btn accent={ACCENT} busy={busy} onClick={onDone}>
          {finished ? 'Close' : 'Continue to the Launch Pad →'}
        </Btn>
      </NavRow>
    </div>
  )
}
