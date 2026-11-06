'use client'
import { useEffect, useRef, useState } from 'react'
import { stageIndex } from '@/lib/places'
import { CHOICES, MAYA_ROLLOUT_LINE, METRICS, PREMORTEM, RULES } from '@/lib/rollout'
import type { MetricKey, PremortemKey, RolloutChoice, RolloutComputed, RuleKey, SessionView } from '@/lib/types'
import { useGame, type LaunchAnim } from '@/store/game'
import { MiniRocket } from './launch/Rocket'
import { MayaPortrait } from './MayaPortrait'
import { Btn, CardShell, ErrorStrip, NavRow, SectionTitle, StepHeader, ThinkingDots, useAct, useBusy } from './ui'

const ROSE = '#C8475D'
const STEPS = [
  { key: 'ask', label: 'Maya’s ask' },
  { key: 'premortem', label: 'Pre-mortem' },
  { key: 'call', label: 'Your call' },
  { key: 'plan', label: 'Plan' },
  { key: 'launch', label: 'Launch' },
]
const MODE_COLOR = { auto: '#DC2626', approve: '#059669', none: '#94A3B8' }
const MODE_TEXT = { auto: '✉️ Sent automatically', approve: '🧑‍💼 Caseworker approves each one', none: '✋ Not used' }
const OUTCOME_ANIM: Record<RolloutComputed['outcome'], LaunchAnim> = { cleared: 'lift', blocked: 'blocked', hold: 'hold' }

export function LaunchCard() {
  const s = useGame((g) => g.session)!
  const set = useGame((g) => g.set)
  const walkTo = useGame((g) => g.walkTo)
  const act = useAct()
  const d = s.launch.decision
  const finished = stageIndex(s.stage) > stageIndex('rollout_decision')
  const skipped = s.skipped.includes('launch')
  const [step, setStep] = useState(() => (d ? 4 : s.launch.premortem ? 2 : 0))
  const [maxSeen, setMaxSeen] = useState(step)
  const [choice, setChoice] = useState<RolloutChoice | null>(d?.choice ?? null)
  const [rationale, setRationale] = useState(d?.rationale ?? '')
  const [metrics, setMetrics] = useState<MetricKey[]>(d?.metrics ?? [])
  const [rules, setRules] = useState<RuleKey[]>(d?.rules ?? [])
  const [seq, setSeq] = useState<'idle' | 'count' | 'done'>(d ? 'done' : 'idle')
  const close = () => set({ card: null, error: null })

  useEffect(() => setMaxSeen((m) => Math.max(m, step)), [step])
  // Reflect a finished decision on the 3D rocket when the card opens.
  useEffect(() => {
    if (d && seq === 'done') set({ launchAnim: OUTCOME_ANIM[d.computed.outcome] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (skipped) {
    return (
      <CardShell place="launch" className="card-launch" onClose={close}>
        <StepHeader eyebrow="Launch Pad · Ready to launch?" accent={ROSE} steps={[]} current={0} reachable={0} onClose={close} />
        <SectionTitle accent={ROSE} title="You skipped this optional step" sub="Your skills report marks deployment judgment as not assessed. To try it, use ↺ Reset this room in the corner." />
        <NavRow>
          <Btn accent={ROSE} onClick={close}>
            Close
          </Btn>
        </NavRow>
      </CardShell>
    )
  }

  const reach = finished ? 4 : Math.max(maxSeen, d ? 4 : s.launch.premortem ? 2 : 0, choice ? 3 : 0)
  const go = (i: number) => {
    if (i === 4 && seq !== 'done' && !d) return
    setStep(i)
  }
  const counting = seq === 'count'

  const startLaunch = async () => {
    if (!choice) return
    setStep(4)
    setSeq('count')
    set({ launchAnim: 'count' })
    const minTime = new Promise((r) => setTimeout(r, 7 * 480))
    const res = await act<{ session: SessionView }>({ type: 'launch_submit', choice, rationale, metrics, rules })
    if (!res) {
      setSeq('idle')
      set({ launchAnim: 'idle' })
      setStep(3)
      return
    }
    await minTime
    setSeq('done')
    const out = res.session.launch.decision?.computed.outcome ?? 'hold'
    set({ launchAnim: OUTCOME_ANIM[out] })
  }

  return (
    <CardShell place="launch" className="card-launch" onClose={counting ? undefined : close}>
      <StepHeader
        eyebrow="Launch Pad · Ready to launch?"
        accent={ROSE}
        steps={STEPS}
        current={step}
        reachable={reach}
        onJump={finished || counting ? undefined : go}
        onClose={close}
        hideClose={counting}
      />
      <ErrorStrip />
      <div key={step} className="seed-step">
        {step === 0 && <AskStep s={s} onNext={() => go(1)} onSkip={async () => (await act({ type: 'premortem', answers: {}, checked: false, skipped: true })) && go(2)} />}
        {step === 1 && <PremortemStep s={s} onBack={() => go(0)} onNext={() => go(2)} />}
        {step === 2 && (
          <CallStep
            choice={choice}
            setChoice={setChoice}
            rationale={rationale}
            setRationale={setRationale}
            onBack={() => go(1)}
            onNext={() => go(3)}
          />
        )}
        {step === 3 && choice && (
          <PlanStep
            choice={choice}
            metrics={metrics}
            setMetrics={setMetrics}
            rules={rules}
            setRules={setRules}
            onBack={() => go(2)}
            onLaunch={startLaunch}
          />
        )}
        {step === 4 && (
          <LaunchStep
            s={s}
            seq={seq}
            finished={finished}
            onBack={() => {
              setSeq(d ? 'done' : 'idle')
              go(2)
            }}
            onDone={async () => {
              if (finished) return close()
              const r = await act({ type: 'launch_done' })
              if (r) {
                set({ card: null, error: null })
                walkTo({ kind: 'room', id: 'report' })
              }
            }}
          />
        )}
      </div>
    </CardShell>
  )
}

// ---------------- Ask ----------------

function AskStep({ s, onNext, onSkip }: { s: SessionView; onNext: () => void; onSkip: () => void }) {
  const busy = useBusy('premortem')
  const last = s.lab.runs[s.lab.runs.length - 1]
  return (
    <div>
      <div className="flex items-start gap-3.5">
        <div className="shrink-0">
          <MayaPortrait size={72} />
        </div>
        <div className="relative flex-1 rounded-2xl rounded-tl-sm border border-rose-100 bg-white p-3.5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ROSE }}>
            Maya stops by the Launch Pad
          </div>
          <p className="mt-1 text-[15px] font-semibold leading-snug text-slate-900">{MAYA_ROLLOUT_LINE}</p>
        </div>
      </div>
      <div className="mt-5 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">What’s actually on the table</div>
      <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
        <div className="seed-tile rounded-2xl border border-slate-200 bg-white p-3">
          <div className="text-[22px] font-extrabold text-slate-900">{last ? `${last.coreScore}/5` : '–'}</div>
          <div className="text-[12px] text-slate-600">{last ? `synthetic tests passed · latest run · ${last.version}` : 'No lab tests run yet'}</div>
        </div>
        <div className="seed-tile rounded-2xl border border-slate-200 bg-white p-3" style={{ animationDelay: '90ms' }}>
          <div className="text-[22px] font-extrabold text-slate-900">
            5 <span className="text-[14px] text-slate-400">vs</span> ~80
          </div>
          <div className="text-[12px] text-slate-600">made-up applicants tested / vs real applications every week</div>
        </div>
        <div className="seed-tile rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3" style={{ animationDelay: '180ms' }}>
          <div className="text-[15px] font-extrabold text-emerald-900">🔒 Staff approve outreach</div>
          <div className="text-[12px] text-emerald-800/80">Maya’s own policy, not optional</div>
        </div>
      </div>
      <p className="mt-3 rounded-xl px-3 py-2 text-[13px] font-semibold" style={{ background: `${ROSE}12`, color: '#881337' }}>
        Passing five toy tests is a start, not proof.
      </p>
      <NavRow>
        <Btn variant="ghost" disabled={busy} onClick={onSkip}>
          Skip this optional step
        </Btn>
        <Btn accent={ROSE} onClick={onNext}>
          Run a pre-mortem →
        </Btn>
      </NavRow>
    </div>
  )
}

// ---------------- Pre-mortem ----------------

function PremortemStep({ s, onBack, onNext }: { s: SessionView; onBack: () => void; onNext: () => void }) {
  const act = useAct()
  const busy = useBusy('premortem')
  const saved = s.launch.premortem
  const [answers, setAnswers] = useState<Partial<Record<PremortemKey, 'tested' | 'untested'>>>(saved?.answers ?? {})
  const checked = Boolean(saved?.checked)
  const all = PREMORTEM.every((p) => answers[p.key])
  const spotted = PREMORTEM.filter((p) => !p.tested && answers[p.key] === 'untested').length
  const correct = PREMORTEM.filter((p) => answers[p.key] === (p.tested ? 'tested' : 'untested')).length
  return (
    <div>
      <SectionTitle accent={ROSE} eyebrow="Pre-mortem" title="It’s a month after launch, and something went wrong. What was it?" sub="For each situation, decide: did one of the five lab tests cover it, or was it never tested?" />
      <div className="grid gap-2 sm:grid-cols-2">
        {PREMORTEM.map((p, i) => {
          const a = answers[p.key]
          const truth = p.tested ? 'tested' : 'untested'
          return (
            <div key={p.key} className="seed-tile rounded-2xl border border-slate-200 bg-white p-3" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="text-[13px] font-semibold leading-snug text-slate-800">{p.text}</div>
              {!checked ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(['tested', 'untested'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setAnswers({ ...answers, [p.key]: k })}
                      className="rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition"
                      style={
                        a === k
                          ? k === 'tested'
                            ? { background: '#059669', borderColor: '#059669', color: '#fff' }
                            : { background: '#E11D48', borderColor: '#E11D48', color: '#fff' }
                          : k === 'tested'
                            ? { borderColor: '#A7F3D0', color: '#047857' }
                            : { borderColor: '#FECDD3', color: '#BE123C' }
                      }
                    >
                      {k === 'tested' ? '✓ A test covered it' : '? Never tested'}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-1.5 text-[12px]">
                  <span className={`font-bold ${p.tested ? 'text-emerald-700' : 'text-rose-700'}`}>{p.tested ? `Tested (${p.tested})` : 'Never tested'}</span>
                  <span className="text-slate-600"> · {p.why}</span>
                  {a && a !== truth && <span className="font-semibold text-amber-700"> · you had it the other way</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {checked && (
        <div className="seed-step mt-3 rounded-2xl bg-slate-900 p-3.5 text-white">
          <div className="text-[15px] font-extrabold">
            {spotted}/4 untested situations spotted · {correct}/8 sorted right
          </div>
          <p className="mt-1 text-[12.5px] text-slate-300">
            Half of these never came up in testing, and Maya gets ~80 real applications a week. A small pilot with a caseworker checking every recommendation is how you find the rest without anyone getting hurt.
          </p>
        </div>
      )}
      <NavRow onBack={onBack}>
        {!checked ? (
          <>
            <Btn variant="ghost" disabled={busy} onClick={async () => (await act({ type: 'premortem', answers, checked: false, skipped: true })) && onNext()}>
              Skip
            </Btn>
            <Btn accent={ROSE} disabled={!all} busy={busy} onClick={() => act({ type: 'premortem', answers, checked: true, skipped: false })}>
              Check my sort
            </Btn>
          </>
        ) : (
          <Btn accent={ROSE} onClick={onNext}>
            Make the call →
          </Btn>
        )}
      </NavRow>
    </div>
  )
}

// ---------------- Your call ----------------

function CallStep({
  choice,
  setChoice,
  rationale,
  setRationale,
  onBack,
  onNext,
}: {
  choice: RolloutChoice | null
  setChoice: (c: RolloutChoice) => void
  rationale: string
  setRationale: (s: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const [shakeKey, setShakeKey] = useState(0)
  const full = choice === 'full_automation'
  return (
    <div>
      <SectionTitle accent={ROSE} eyebrow="Your call" title="What do you tell Maya?" sub="Each dot is one applicant in twenty. See who each option reaches, and how their recommendation gets out." />
      <div className="grid gap-2.5">
        {CHOICES.map((c) => {
          const on = choice === c.key
          const lit = Math.round(c.reach * 20)
          return (
            <button
              key={c.key}
              onClick={() => {
                setChoice(c.key)
                if (c.key === 'full_automation') setShakeKey((k) => k + 1)
              }}
              className="seed-choice rounded-2xl border-2 bg-white p-3.5 text-left transition"
              style={{ borderColor: on ? ROSE : '#E2E8F0', boxShadow: on ? `0 0 0 4px ${ROSE}1F` : undefined }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-extrabold text-slate-900">{c.short}</span>
                <span className="text-[12px] text-slate-500">{c.tagline}</span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-slate-600">{c.text}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex gap-[3px]">
                  {Array.from({ length: 20 }, (_, i) => (
                    <span
                      key={`${c.key}${i}${on}`}
                      className="dot-in h-2.5 w-2.5 rounded-full"
                      style={{ background: i < lit ? MODE_COLOR[c.mode] : '#E2E8F0', animationDelay: `${i * 18}ms` }}
                    />
                  ))}
                </div>
                <span className="text-[11.5px] font-semibold" style={{ color: MODE_COLOR[c.mode] }}>
                  {MODE_TEXT[c.mode]}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div
        key={shakeKey}
        className={`mt-3 flex items-start gap-3 rounded-2xl border p-3.5 ${full ? 'launch-clash border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}
      >
        <span className="mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5" style={{ background: full ? '#FCA5A5' : '#10B981', justifyContent: full ? 'flex-start' : 'flex-end' }}>
          <span className="h-4 w-4 rounded-full bg-white shadow" />
        </span>
        <div>
          <div className={`text-[13.5px] font-bold ${full ? 'text-red-900' : 'text-emerald-900'}`}>Caseworker approval: {full ? 'this plan skips it' : 'stays on'}</div>
          <p className={`mt-0.5 text-[12.5px] ${full ? 'text-red-900/80' : 'text-emerald-900/80'}`}>
            {full
              ? 'Sending recommendations automatically means no caseworker sees them first. Maya’s policy requires that review, and DeployHER can’t switch it off for you.'
              : 'Maya’s policy: a caseworker approves every recommendation before it reaches an applicant. It can’t be waived.'}
          </p>
        </div>
      </div>

      <label className="mt-3 block">
        <span className="text-[12.5px] font-semibold text-slate-700">Why? Tell Maya in your own words <span className="font-normal text-slate-400">(optional)</span></span>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value.slice(0, 600))}
          rows={2}
          placeholder="e.g. We only tested five made-up cases, so let’s start small with caseworkers reviewing every match"
          className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13.5px] outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
        />
      </label>
      <NavRow onBack={onBack}>
        <Btn accent={ROSE} disabled={!choice} onClick={onNext}>
          {choice === 'limited_pilot' ? 'Plan the pilot →' : 'Continue →'}
        </Btn>
      </NavRow>
    </div>
  )
}

// ---------------- Plan ----------------

function PlanStep({
  choice,
  metrics,
  setMetrics,
  rules,
  setRules,
  onBack,
  onLaunch,
}: {
  choice: RolloutChoice
  metrics: MetricKey[]
  setMetrics: (m: MetricKey[]) => void
  rules: RuleKey[]
  setRules: (r: RuleKey[]) => void
  onBack: () => void
  onLaunch: () => void
}) {
  const title = choice === 'limited_pilot' ? 'Plan the pilot' : choice === 'full_automation' ? 'Plan the launch' : 'Plan what would change your mind'
  const toggleRule = (k: RuleKey) => {
    if (k === 'no_rule') return setRules(rules.includes('no_rule') ? [] : ['no_rule'])
    const base = rules.filter((r) => r !== 'no_rule')
    setRules(base.includes(k) ? base.filter((r) => r !== k) : [...base, k])
  }
  return (
    <div>
      <SectionTitle accent={ROSE} eyebrow="Plan" title={title} sub="A plan says what you’ll measure and when you’ll stop or grow." />
      <div className="text-[13px] font-bold text-slate-800">What would you track?</div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {METRICS.map((m) => {
          const on = metrics.includes(m.key)
          return (
            <label key={m.key} className="flex cursor-pointer items-start gap-2.5 rounded-xl border bg-white px-3 py-2 transition" style={{ borderColor: on ? ROSE : '#E2E8F0' }}>
              <input type="checkbox" checked={on} onChange={() => setMetrics(on ? metrics.filter((x) => x !== m.key) : [...metrics, m.key])} className="mt-0.5 h-4 w-4 accent-rose-600" />
              <span className="text-[12.5px] text-slate-700">
                {m.text} <span className="text-slate-400">({m.covers})</span>
              </span>
            </label>
          )
        })}
      </div>
      <div className="mt-4 text-[13px] font-bold text-slate-800">When would you pause, or expand?</div>
      <div className="mt-2 grid gap-1.5">
        {RULES.map((r) => {
          const on = rules.includes(r.key)
          const icon = r.kind === 'pause' ? '⏸' : r.kind === 'expand' ? '📈' : '🤷'
          return (
            <button key={r.key} onClick={() => toggleRule(r.key)} className="flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-left transition" style={{ borderColor: on ? ROSE : '#E2E8F0', background: on ? `${ROSE}0D` : '#fff' }}>
              <span className="text-[16px]">{icon}</span>
              <span className="flex-1 text-[12.5px] text-slate-700">{r.text}</span>
              <span className="grid h-4 w-4 place-items-center rounded border text-[10px] text-white" style={{ borderColor: on ? ROSE : '#CBD5E1', background: on ? ROSE : '#fff' }}>
                {on ? '✓' : ''}
              </span>
            </button>
          )
        })}
      </div>
      <NavRow onBack={onBack}>
        <Btn accent={ROSE} onClick={onLaunch}>
          🚀 Start the launch sequence
        </Btn>
      </NavRow>
    </div>
  )
}

// ---------------- Launch ----------------

type Verdict = 'GO' | 'CHECK' | 'NO-GO'
const VCOLOR: Record<Verdict, string> = { GO: '#86EFAC', CHECK: '#FCD34D', 'NO-GO': '#F87171' }

function checklist(c: RolloutComputed, s: SessionView): { label: string; detail: string; v: Verdict }[] {
  const last = s.lab.runs[s.lab.runs.length - 1]
  const pm = s.launch.premortem
  return [
    { label: 'Tests run', detail: last ? `${last.coreScore}/5 passing on run ${last.n} (${last.version})` : 'No lab tests run', v: c.testsRun ? (last && last.coreScore === 5 ? 'GO' : 'CHECK') : 'CHECK' },
    { label: 'Untested situations named', detail: pm?.checked ? `${c.premortemSpotted} of 4 spotted in the pre-mortem` : 'Pre-mortem skipped', v: !pm?.checked ? 'CHECK' : c.premortemSpotted >= 3 ? 'GO' : 'CHECK' },
    { label: 'Caseworker approval', detail: c.approvalKept ? 'Every recommendation reviewed by staff' : 'Plan sends recommendations automatically', v: c.approvalKept ? 'GO' : 'NO-GO' },
    { label: 'Measures usefulness', detail: c.coversUsefulness ? 'Time saved is tracked' : 'Nothing shows it’s worth it', v: c.coversUsefulness ? 'GO' : 'CHECK' },
    { label: 'Measures reliability', detail: c.coversReliability ? 'Valid matches and corrections tracked' : 'No reliability measure', v: c.coversReliability ? 'GO' : 'CHECK' },
    { label: 'Pause and expand rules', detail: c.hasPauseRule && c.hasExpandRule ? 'Both set' : c.hasPauseRule ? 'Pause rule only' : c.hasExpandRule ? 'Expand rule only' : 'No rules', v: c.hasPauseRule && c.hasExpandRule ? 'GO' : 'CHECK' },
  ]
}

function LaunchStep({ s, seq, finished, onBack, onDone }: { s: SessionView; seq: 'idle' | 'count' | 'done'; finished: boolean; onBack: () => void; onDone: () => void }) {
  const doneBusy = useBusy('launch_done')
  const d = s.launch.decision
  const [tick, setTick] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (seq !== 'count') return
    setTick(0)
    timer.current = setInterval(() => setTick((t) => t + 1), 480)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [seq])

  const rocketState = seq === 'count' ? 'count' : seq === 'done' && d ? OUTCOME_ANIM[d.computed.outcome] : 'idle'
  const rows = d && seq === 'done' ? checklist(d.computed, s) : null
  const LABELS = ['Tests run', 'Untested situations named', 'Caseworker approval', 'Measures usefulness', 'Measures reliability', 'Pause and expand rules']
  const outcome = d?.computed.outcome
  const outcomeText = outcome === 'cleared' ? '🚀 Cleared for a reviewed pilot' : outcome === 'blocked' ? '⛔ Hold: the policy check failed' : '⏸ Staying on the pad'
  const outcomeColor = outcome === 'cleared' ? '#86EFAC' : outcome === 'blocked' ? '#F87171' : '#CBD5E1'
  const statusDot = seq === 'count' ? '#FBBF24' : outcomeColor

  return (
    <div>
      <div className="launch-panel overflow-hidden rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold tracking-[.14em] text-rose-100/80">
          <span className="h-2 w-2 rounded-full" style={{ background: statusDot, boxShadow: `0 0 8px ${statusDot}` }} />
          LAUNCH SEQUENCE · PATHWAYS FORWARD MATCH ASSISTANT
        </div>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row">
          <div className="flex shrink-0 flex-col items-center justify-end sm:w-[140px]">
            <div className="h-10 font-mono text-[28px] font-extrabold text-amber-300">
              {seq === 'count' && (
                <span key={tick} className="launch-count inline-block">
                  {tick < 5 ? `T-${5 - tick}` : 'HOLD…'}
                </span>
              )}
            </div>
            <MiniRocket state={rocketState} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {LABELS.map((label, i) => {
              const r = rows?.[i]
              const checking = seq === 'count' && tick > i
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-1.5 ${r ? 'seed-tile' : ''}`}
                  style={r ? { animationDelay: `${i * 110}ms` } : undefined}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: r ? VCOLOR[r.v] : checking ? '#FBBF24' : '#475569', boxShadow: r ? `0 0 8px ${VCOLOR[r.v]}` : checking ? '0 0 8px #FBBF24' : undefined }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-white">{label}</div>
                    <div className="truncate text-[11px] text-slate-400">{r ? r.detail : checking ? 'checking…' : ' '}</div>
                  </div>
                  <span className="font-mono text-[11px] font-bold" style={{ color: r ? VCOLOR[r.v] : '#64748B' }}>
                    {r ? r.v : checking ? '···' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        {seq === 'done' && d && (
          <div className="seed-step mt-3 text-center text-[17px] font-extrabold" style={{ color: outcomeColor, animationDelay: '700ms' }}>
            {outcomeText}
          </div>
        )}
        {seq === 'count' && (
          <div className="mt-3 flex items-center justify-center gap-2 text-[12.5px] text-slate-300">
            <ThinkingDots color="#FCD34D" /> Your coach is reading your plan…
          </div>
        )}
      </div>

      {seq === 'done' && d && (
        <div className="seed-step mt-3 rounded-2xl border border-rose-100 bg-white p-3.5" style={{ animationDelay: '900ms' }}>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full text-[15px] font-bold text-white" style={{ background: '#D9A23B' }}>
              N
            </span>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ROSE }}>
                Coach feedback
              </div>
              <div className="text-[11.5px] text-slate-500">Nia, your DeployHER coach{d.feedbackSource === 'fallback' ? ' · standard feedback (no AI key)' : ''}</div>
            </div>
          </div>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-700">{d.feedback}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {[
              { on: d.computed.coversUsefulness, t: 'usefulness' },
              { on: d.computed.coversReliability, t: 'reliability' },
              { on: d.computed.hasPauseRule, t: 'pause rule' },
              { on: d.computed.hasExpandRule, t: 'expand rule' },
            ].map((p) => (
              <span key={p.t} className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={p.on ? { background: '#DCFCE7', color: '#166534' } : { background: '#F1F5F9', color: '#64748B' }}>
                {p.on ? '✓' : '○'} {p.t}
              </span>
            ))}
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-800">🔒 Staff approval stays required</span>
          </div>
          {!finished && <p className="mt-2 text-[12px] text-slate-500">Change your plan as often as you like.</p>}
        </div>
      )}

      <NavRow onBack={finished || seq === 'count' ? undefined : onBack}>
        {seq === 'done' && d && (
          <Btn accent={ROSE} busy={doneBusy} onClick={onDone}>
            {finished ? 'Close' : 'Walk to your Skills Report →'}
          </Btn>
        )}
      </NavRow>
    </div>
  )
}
