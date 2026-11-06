'use client'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Bot, Check, Coffee, Cpu, MessagesSquare, Rocket, ShieldCheck, Sprout as SproutIcon, Users, Wrench, X, type LucideIcon } from 'lucide-react'
import { roomStatus, setupIsLater } from '@/lib/mission'
import { placeById } from '@/lib/places'
import type { AiExperience, Strength } from '@/lib/types'
import { useGame } from '@/store/game'
import { Btn, CardShell, ErrorStrip, NavRow, useAct, useBusy } from './ui'

const ACCENT = placeById('setup').accent
const BORDER = 'rgba(30,70,48,.12)'

// Inspiration chips, across fields. Each one matches a rule in src/lib/skills-map.ts.
const EXAMPLES = [
  'Psychology research',
  'Mechanical engineering',
  'Finance',
  'Supply chain & logistics',
  'Teaching',
  'Software engineering',
  'Law',
  'Hospital operations',
  'Quality assurance',
  'Economics',
  'Sales',
  'Journalism',
  'Data analysis',
  'Building inspection',
  'Auditing',
]

const AI_CHOICES: { key: AiExperience; icon: LucideIcon; title: string; sub: string }[] = [
  { key: 'new', icon: SproutIcon, title: 'Not yet', sub: 'Just chat assistants' },
  { key: 'some', icon: Wrench, title: 'A little', sub: 'Prompts, a tool or two' },
  { key: 'built', icon: Cpu, title: 'Yes', sub: 'Agents, evals, production' },
]

// Keys are stored and shown in the report; only the display text is short.
const GOALS: { key: string; icon: LucideIcon; title: string }[] = [
  { key: 'Understanding client problems', icon: Users, title: 'Client needs' },
  { key: 'Building agents', icon: Bot, title: 'Building agents' },
  { key: 'Evaluating reliability', icon: ShieldCheck, title: 'Testing reliability' },
  { key: 'Deploying into organizations', icon: Rocket, title: 'Rolling out' },
]

const JOURNEY: { icon: LucideIcon; label: string; text: string }[] = [
  { icon: MessagesSquare, label: 'Discover', text: 'Interview a client' },
  { icon: Coffee, label: 'Debrief', text: 'See what you missed' },
  { icon: Wrench, label: 'Make it work', text: 'Test and fix an AI' },
  { icon: Rocket, label: 'Launch', text: 'Decide if it’s ready' },
]

// Steps: 0 intro · 1 background · 2 proud · 3 AI · 4 goal · 5 confidence · 6 mapping · 7 strengths
const QUESTION_STEPS = [1, 2, 3, 4, 5]

/** Header art: a seed in a pot that sprouts a leaf per answer, buds, then flowers. */
function Sprout({ leaves, bud, flower }: { leaves: number; bud: boolean; flower: boolean }) {
  const leafColors = ['#55B870', '#4CAF66', '#6CC484', '#5BBD76']
  const leafPaths = ['M32 44 C24 42 20 36 21 31 C27 32 31 37 32 44 Z', 'M32 40 C40 38 44 32 43 27 C37 28 33 33 32 40 Z', 'M32 33 C25 31 22 26 23 22 C28 23 31 27 32 33 Z', 'M32 30 C39 28 42 23 41 19 C36 20 33 24 32 30 Z']
  const seed = leaves === 0 && !bud
  const stemTop = flower || bud ? 16 : seed ? 53 : 44 - leaves * 7
  return (
    <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden className="shrink-0">
      <g className="sprout-sway">
        <path d="M14 50 L50 50 L46 62 L18 62 Z" fill="#C97B4A" />
        <rect x="12" y="47" width="40" height="5" rx="2" fill="#D98B5A" />
        <ellipse cx="32" cy="48.5" rx="17" ry="2.2" fill="#6B4226" />
        {seed && <ellipse cx="32" cy="47" rx="3.2" ry="2.2" fill="#A8743F" className="sprout-pop" />}
        <path d="M32 48 L32 16" stroke="#3E9A5B" strokeWidth="2.6" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: 1 - (48 - Math.min(48, stemTop)) / 32, transition: 'stroke-dashoffset .6s cubic-bezier(.3,1.6,.5,1)' }} />
        {leafPaths.slice(0, leaves).map((d, i) => (
          <path key={i} d={d} fill={leafColors[i]} className="sprout-pop" />
        ))}
        {bud && !flower && <circle cx="32" cy="15" r="4" fill="#F0A6C8" className="sprout-pop" />}
        {flower && (
          <g className="sprout-pop">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="32" cy="9.5" rx="3.6" ry="5.4" fill="#F7B2D0" transform={`rotate(${a} 32 15)`} />
            ))}
            <circle cx="32" cy="15" r="3.2" fill="#FFD166" />
          </g>
        )}
      </g>
    </svg>
  )
}

function Title({ children }: { children: ReactNode }) {
  return <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">{children}</h2>
}

function IconBadge({ icon: Icon, active, size = 'md' }: { icon: LucideIcon; active?: boolean; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  return (
    <span className={`grid ${box} shrink-0 place-items-center rounded-xl transition-colors`} style={{ background: active ? ACCENT : `${ACCENT}14`, color: active ? '#fff' : ACCENT }}>
      <Icon size={size === 'lg' ? 20 : 18} strokeWidth={2} />
    </span>
  )
}

/** A selectable option tile with an icon badge. */
function Choice({ icon, title, sub, active, onClick, delay, layout = 'row' }: { icon: LucideIcon; title: string; sub?: string; active: boolean; onClick: () => void; delay: number; layout?: 'row' | 'tile' }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`seed-choice seed-tile relative flex w-full rounded-2xl border bg-white/75 text-left transition hover:-translate-y-px hover:bg-white ${layout === 'tile' ? 'flex-col items-start gap-2.5 p-3.5' : 'items-center gap-3 px-3.5 py-3'}`}
      style={{ borderColor: active ? ACCENT : BORDER, boxShadow: active ? `0 0 0 2px ${ACCENT}33` : '0 1px 2px rgba(20,48,32,.04)', animationDelay: `${delay}ms` }}
    >
      <IconBadge icon={icon} active={active} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold text-slate-900">{title}</span>
        {sub && <span className="block text-[12.5px] text-slate-500">{sub}</span>}
      </span>
      {active && layout === 'row' && <Check size={18} style={{ color: ACCENT }} />}
    </button>
  )
}

/** Editable text that wraps and grows to fit, instead of clipping like a one-line input. Enter doesn't add a newline. */
function AutoText({ value, onChange, maxLength, className, label }: { value: string; onChange: (v: string) => void; maxLength: number; className: string; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
    fit()
    // Refit when the card's width changes (rewrapping); ignore our own height changes.
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return
      w = el.clientWidth
      fit()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      maxLength={maxLength}
      aria-label={label}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      className={`block w-full resize-none overflow-hidden ${className}`}
    />
  )
}

const inputCls = 'mt-4 w-full resize-none rounded-2xl border border-emerald-900/15 bg-white/85 px-4 py-3 text-[14.5px] outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20'
const Back = (
  <span className="inline-flex items-center gap-1">
    <ArrowLeft size={15} /> Back
  </span>
)
const Next = (
  <>
    Next <ArrowRight size={15} />
  </>
)

export function SetupCard() {
  const session = useGame((s) => s.session)!
  const set = useGame((s) => s.set)
  const walkTo = useGame((s) => s.walkTo)
  const act = useAct()
  const mapping = useBusy('setup_map')
  const saving = useBusy('setup_save', 'setup_skip')
  const resuming = setupIsLater(session)
  const existing = session.setup

  const [step, setStep] = useState(existing ? 7 : 0)
  const [background, setBackground] = useState(existing?.background ?? '')
  const [proud, setProud] = useState(existing?.proud ?? '')
  const [ai, setAi] = useState<AiExperience | null>(existing?.aiExperience ?? null)
  const [goal, setGoal] = useState<string | null>(existing?.goal ?? null)
  const [confidence, setConfidence] = useState<number | null>(existing?.confidence ?? null)
  const [strengths, setStrengths] = useState<Strength[]>(existing?.strengths ?? [])
  const [practice, setPractice] = useState<string[]>(existing?.practice ?? [])
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (step === 1 || step === 2) setTimeout(() => inputRef.current?.focus(), 380)
  }, [step])

  const close = () => set({ card: null, error: null })

  const answered = [background.trim(), proud.trim(), ai, goal].filter(Boolean).length
  const leaves = Math.min(4, step >= 7 ? 4 : answered)
  const reachable = Math.max(step, background.trim() ? (proud.trim() ? (ai ? (goal ? 5 : 4) : 3) : 2) : 1)

  const goNext = () => setStep((s) => Math.min(7, s + 1))
  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const onEnter = (e: ReactKeyboardEvent, ok: boolean) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (ok) goNext()
    }
  }

  const map = async () => {
    setStep(6)
    const r = await act({ type: 'setup_map', background: background.trim(), proud: proud.trim(), aiExperience: ai, goal, confidence })
    if (!r) {
      setStep(5)
      return
    }
    setStrengths(r.session.setup?.strengths ?? [])
    setPractice(r.session.setup?.practice ?? [])
    setStep(7)
  }

  const save = async () => {
    const clean = strengths.filter((s) => s.label.trim()).map((s) => ({ ...s, label: s.label.trim().slice(0, 60), application: s.application.trim().slice(0, 200) }))
    const r = await act({ type: 'setup_save', strengths: clean })
    if (!r) return
    close()
    if (roomStatus(r.session, 'interview') === 'current' && r.session.interview.status !== 'ended') walkTo({ kind: 'room', id: 'interview' })
  }

  const skip = async () => {
    if (resuming) {
      close()
      return
    }
    const r = await act({ type: 'setup_skip' })
    if (!r) return
    close()
    if (roomStatus(r.session, 'interview') === 'current') walkTo({ kind: 'room', id: 'interview' })
  }

  const editStrength = (id: string, patch: Partial<Strength>) => setStrengths(strengths.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const pickThen = (fn: () => void) => {
    fn()
    setTimeout(goNext, 220)
  }

  return (
    <CardShell place="setup" className="card-setup" onClose={mapping ? undefined : close}>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Sprout leaves={leaves} bud={step >= 6 || confidence !== null} flower={step === 7} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ACCENT }}>
              {resuming ? 'Welcome back' : 'The Greenhouse'}
            </div>
            <div className="flex items-center gap-1">
              {!existing?.confirmed && step < 6 && (
                <button onClick={skip} disabled={saving} className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:bg-black/5 hover:text-slate-800">
                  {resuming ? 'Later' : 'Skip'}
                </button>
              )}
              {!mapping && (
                <button onClick={close} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-black/5 hover:text-slate-800">
                  <X size={17} />
                </button>
              )}
            </div>
          </div>
          {step >= 1 && step <= 5 && (
            <div className="mt-2 flex gap-1.5" role="group" aria-label={`Question ${QUESTION_STEPS.indexOf(step) + 1} of 5`}>
              {QUESTION_STEPS.map((s, i) => {
                const can = s <= reachable
                return (
                  <button key={s} disabled={!can} onClick={() => can && setStep(s)} className="h-1.5 flex-1 rounded-full transition-colors" aria-label={`Question ${i + 1}`} style={{ background: step >= s ? ACCENT : can ? `${ACCENT}40` : `${ACCENT}14` }} />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ErrorStrip />

      <div key={step} className="seed-step">
        {step === 0 && (
          <div>
            <Title>{resuming ? 'Let’s finish your setup.' : 'Deployment is where AI meets real work.'}</Title>
            <p className="mt-1.5 text-[14px] text-slate-600">Help a (fictional) nonprofit find what it needs, make an AI assistant work, and decide if it’s ready.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {JOURNEY.map((j, i) => (
                <div key={j.label} className="seed-tile flex flex-col items-center gap-1.5 rounded-2xl border bg-white/60 px-2 py-3 text-center" style={{ borderColor: BORDER, animationDelay: `${80 + i * 90}ms` }}>
                  <IconBadge icon={j.icon} size="lg" />
                  <span className="mt-0.5 text-[12.5px] font-bold leading-tight text-slate-800">{j.label}</span>
                  <span className="text-[11.5px] leading-snug text-slate-500">{j.text}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-slate-500">First, five quick questions to map what you already know.</p>
            <NavRow>
              <Btn accent={ACCENT} onClick={goNext}>
                Start <ArrowRight size={15} />
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 1 && (
          <div>
            <Title>What’s your background?</Title>
            <textarea ref={inputRef} rows={2} maxLength={400} value={background} onChange={(e) => setBackground(e.target.value)} onKeyDown={(e) => onEnter(e, Boolean(background.trim()))} placeholder="A degree, a job, caregiving, a project…" className={inputCls} />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {EXAMPLES.map((x) => (
                <button key={x} onClick={() => setBackground(x)} className="seed-choice rounded-full border bg-white/70 px-3 py-1 text-[12px] font-medium text-slate-600 hover:border-emerald-600/40 hover:bg-white hover:text-slate-900" style={{ borderColor: BORDER }}>
                  {x}
                </button>
              ))}
            </div>
            <NavRow onBack={goBack} backLabel={Back}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!background.trim()}>
                {Next}
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 2 && (
          <div>
            <Title>One thing you’re proud of?</Title>
            <textarea ref={inputRef} rows={2} maxLength={400} value={proud} onChange={(e) => setProud(e.target.value)} onKeyDown={(e) => onEnter(e, Boolean(proud.trim()))} placeholder="Big or small, anywhere in life" className={inputCls} />
            <NavRow onBack={goBack} backLabel={Back}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!proud.trim()}>
                {Next}
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 3 && (
          <div>
            <Title>Built with AI before?</Title>
            <div className="mt-4 space-y-2">
              {AI_CHOICES.map((c, i) => (
                <Choice key={c.key} icon={c.icon} title={c.title} sub={c.sub} active={ai === c.key} delay={i * 70} onClick={() => pickThen(() => setAi(c.key))} />
              ))}
            </div>
            <NavRow onBack={goBack} backLabel={Back}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!ai}>
                {Next}
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 4 && (
          <div>
            <Title>What are you most excited to learn?</Title>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {GOALS.map((g, i) => (
                <Choice key={g.key} icon={g.icon} title={g.title} active={goal === g.key} delay={i * 60} onClick={() => pickThen(() => setGoal(g.key))} />
              ))}
            </div>
            <NavRow onBack={goBack} backLabel={Back}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!goal}>
                {Next}
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 5 && (
          <div>
            <Title>How confident do you feel going into AI deployment work?</Title>
            <p className="mt-1 text-[13px] text-slate-500">Optional. Only you see this.</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setConfidence(confidence === n ? null : n)}
                  aria-pressed={confidence === n}
                  className="seed-choice h-12 flex-1 rounded-2xl border text-[16px] font-bold transition hover:bg-white"
                  style={{ borderColor: confidence === n ? ACCENT : BORDER, background: confidence === n ? ACCENT : 'rgba(255,255,255,.75)', color: confidence === n ? '#fff' : '#334155' }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11.5px] text-slate-400">
              <span>Not at all</span>
              <span>Very</span>
            </div>
            <NavRow onBack={goBack} backLabel={Back}>
              <Btn accent={ACCENT} onClick={map} busy={mapping}>
                <SproutIcon size={15} /> Plant my seeds
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 6 && (
          <div className="py-8 text-center">
            <Title>Growing your strengths…</Title>
            <div className="mx-auto mt-5 h-2 w-56 overflow-hidden rounded-full bg-emerald-900/10">
              <div className="seed-bar h-full w-1/3 rounded-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, #F7B2D0)` }} />
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <Title>Your strengths</Title>
            <p className="mt-1 text-[13px] text-slate-500">
              Tap to edit.{existing?.source === 'fallback' ? ' Mapped by keyword, no AI.' : ''}
            </p>
            <div className="mt-4 space-y-2">
              {strengths.map((s, i) => (
                <div key={s.id} className="seed-tile group flex gap-3 rounded-2xl border bg-white/80 p-3" style={{ borderColor: BORDER, animationDelay: `${i * 100}ms` }}>
                  <IconBadge icon={SproutIcon} />
                  <div className="min-w-0 flex-1">
                    <AutoText value={s.label} maxLength={60} onChange={(v) => editStrength(s.id, { label: v })} label="Strength" className="rounded-md bg-transparent px-1 py-0.5 text-[14.5px] font-bold leading-snug text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20" />
                    <AutoText value={s.application} maxLength={200} onChange={(v) => editStrength(s.id, { application: v })} label="How it helps in deployment" className="rounded-md bg-transparent px-1 text-[13px] leading-snug text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20" />
                    <div className="mt-1 truncate px-1 text-[11.5px] italic text-slate-400" title={s.from}>
                      “{s.from}”
                    </div>
                  </div>
                  <button onClick={() => setStrengths(strengths.filter((x) => x.id !== s.id))} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-600 group-hover:text-slate-400" aria-label={`Remove ${s.label}`}>
                    <X size={15} />
                  </button>
                </div>
              ))}
              {!strengths.length && <p className="text-[13px] text-slate-500">No strengths listed. The report won’t guess.</p>}
            </div>
            {practice.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ACCENT }}>
                  Today
                </span>
                {practice.map((p) => (
                  <span key={p} className="rounded-full bg-emerald-100/80 px-2.5 py-1 text-[12px] font-semibold text-emerald-900">
                    {p}
                  </span>
                ))}
              </div>
            )}
            <NavRow onBack={existing?.confirmed ? undefined : () => setStep(5)} backLabel={Back}>
              <Btn accent={ACCENT} onClick={save} busy={saving}>
                {resuming || existing?.confirmed ? (
                  'Save'
                ) : (
                  <>
                    Meet your first client <ArrowRight size={15} />
                  </>
                )}
              </Btn>
            </NavRow>
          </div>
        )}
      </div>
    </CardShell>
  )
}
