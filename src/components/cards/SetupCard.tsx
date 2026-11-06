'use client'
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { roomStatus, setupIsLater } from '@/lib/mission'
import { placeById } from '@/lib/places'
import type { AiExperience, Strength } from '@/lib/types'
import { useGame } from '@/store/game'
import { Btn, CardShell, ErrorStrip, NavRow, useAct, useBusy } from './ui'

const ACCENT = placeById('setup').accent

const EXAMPLES = ['Psychology, ran research interviews', 'Operations at a hospital', 'Teacher, designed assessments', 'Accountant', 'Software engineer, built two AI tools']

const AI_CHOICES: { key: AiExperience; title: string; sub: string }[] = [
  { key: 'new', title: 'New to it', sub: 'I have used chat assistants, not built with them' },
  { key: 'some', title: 'Some experience', sub: 'I have written prompts or tried a tool or two' },
  { key: 'built', title: 'I have built or deployed AI systems', sub: 'Agents, pipelines, evaluations, production' },
]

const GOALS: { key: string; title: string; sub: string }[] = [
  { key: 'Understanding client problems', title: 'Understanding client problems', sub: 'Find what people actually need' },
  { key: 'Building agents', title: 'Building agents', sub: 'See how an AI assistant is put together' },
  { key: 'Evaluating reliability', title: 'Evaluating reliability', sub: 'Test whether it really works' },
  { key: 'Deploying into organizations', title: 'Deploying into organizations', sub: 'Roll it out carefully, with people' },
]

const TILES = [
  { icon: '🤝', title: 'Discover', text: 'Interview a client to find the real problem' },
  { icon: '☕', title: 'Debrief', text: 'See what you caught and what you missed' },
  { icon: '🛠️', title: 'Make it work', text: 'Test an AI assistant, fix it, prove it' },
  { icon: '🚀', title: 'Launch', text: 'Decide if it is ready for real people' },
]

// Steps: 0 intro · 1 background · 2 proud · 3 AI · 4 goal · 5 confidence · 6 mapping · 7 strengths
const QUESTION_STEPS = [1, 2, 3, 4, 5]

function Sprout({ leaves, bud, flower }: { leaves: number; bud: boolean; flower: boolean }) {
  const leafColors = ['#55B870', '#4CAF66', '#6CC484', '#5BBD76']
  const leafPaths = ['M32 44 C24 42 20 36 21 31 C27 32 31 37 32 44 Z', 'M32 40 C40 38 44 32 43 27 C37 28 33 33 32 40 Z', 'M32 33 C25 31 22 26 23 22 C28 23 31 27 32 33 Z', 'M32 30 C39 28 42 23 41 19 C36 20 33 24 32 30 Z']
  const stemTop = flower || bud ? 16 : 44 - leaves * 7
  return (
    <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden className="shrink-0">
      <g className="sprout-sway">
        <ellipse cx="32" cy="56" rx="20" ry="6" fill="#9A5B2B" />
        <ellipse cx="32" cy="53" rx="5" ry="3.5" fill="#E3B26A" />
        <path d="M32 53 L32 16" stroke="#3E9A5B" strokeWidth="2.6" strokeLinecap="round" pathLength={1} strokeDasharray="1" style={{ strokeDashoffset: 1 - (53 - stemTop) / 37, transition: 'stroke-dashoffset .6s cubic-bezier(.3,1.6,.5,1)' }} />
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

export function SetupCard() {
  const session = useGame((s) => s.session)!
  const set = useGame((s) => s.set)
  const walkTo = useGame((s) => s.walkTo)
  const act = useAct()
  const mapping = useBusy('setup_map')
  const saving = useBusy('setup_save', 'setup_skip')
  const resuming = setupIsLater(session)
  const existing = session.setup

  const [step, setStep] = useState(existing && !existing.confirmed ? 7 : existing?.confirmed ? 7 : 0)
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

  const qIndex = QUESTION_STEPS.indexOf(step)
  const headerLabel = step === 0 ? 'About 2 minutes' : qIndex >= 0 ? `Question ${qIndex + 1} of 5` : step === 6 ? 'Mapping…' : 'Your strengths'

  return (
    <CardShell place="setup" className="card-setup" onClose={mapping ? undefined : close}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <Sprout leaves={leaves} bud={step >= 6 || confidence !== null} flower={step === 7} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ACCENT }}>
              {resuming ? 'Welcome back' : 'The Greenhouse · Setup'}
            </div>
            <div className="flex items-center gap-1">
              {!(existing?.confirmed) && step < 6 && (
                <button onClick={skip} disabled={saving} className="rounded-full px-2 py-1 text-[12px] font-semibold text-slate-500 hover:bg-black/5 hover:text-slate-800">
                  {resuming ? 'Later' : 'Skip setup'}
                </button>
              )}
              {!mapping && (
                <button onClick={close} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-black/5 hover:text-slate-800">
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {QUESTION_STEPS.map((s, i) => {
              const can = s <= reachable && step < 6
              return (
                <button key={s} disabled={!can} onClick={() => can && setStep(s)} className="h-1.5 flex-1 rounded-full transition-colors" aria-label={`Question ${i + 1}`} style={{ background: step >= s ? ACCENT : s <= reachable ? `${ACCENT}40` : `${ACCENT}14` }} />
              )
            })}
          </div>
          <div className="mt-1 text-[10.5px] font-semibold" style={{ color: ACCENT }}>
            {headerLabel}
          </div>
        </div>
      </div>

      <ErrorStrip />

      <div key={step} className="seed-step">
        {step === 0 && (
          <div>
            <h2 className="text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">{resuming ? 'Let’s finish your setup.' : 'Deployment is where AI meets real work.'}</h2>
            <p className="mt-1.5 text-[13.5px] text-slate-600">
              You’ll help a (fictional) nonprofit figure out what it really needs, make an AI assistant work, and decide if it’s ready for real people.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {TILES.map((t, i) => (
                <div key={t.title} className="seed-tile rounded-2xl border border-emerald-900/10 bg-white/70 p-3" style={{ animationDelay: `${80 + i * 90}ms` }}>
                  <div className="text-[20px]">{t.icon}</div>
                  <div className="mt-1 text-[13.5px] font-bold text-slate-900">{t.title}</div>
                  <div className="text-[12.5px] leading-snug text-slate-600">{t.text}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-slate-500">First, five quick questions. What you already know is the seed; the skills you practice here grow from it.</p>
            <NavRow>
              <Btn accent={ACCENT} onClick={goNext}>
                Let’s start →
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900">What have you studied or worked on?</h2>
            <p className="mt-1 text-[13px] text-slate-600">Anything counts: a degree, a job, caregiving, a project.</p>
            <textarea
              ref={inputRef}
              rows={2}
              maxLength={400}
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              onKeyDown={(e) => onEnter(e, Boolean(background.trim()))}
              placeholder="e.g. Psychology degree, I ran research interviews in a lab"
              className="mt-3 w-full resize-none rounded-2xl border border-emerald-900/15 bg-white/85 px-3.5 py-2.5 text-[14px] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((x) => (
                <button key={x} onClick={() => setBackground(x)} className="seed-choice rounded-full border border-emerald-900/10 bg-white/70 px-2.5 py-1 text-[12px] text-slate-700 hover:border-emerald-600/40 hover:bg-white">
                  {x}
                </button>
              ))}
            </div>
            <NavRow onBack={goBack}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!background.trim()}>
                Next →
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900">What is one thing you are proud of?</h2>
            <p className="mt-1 text-[13px] text-slate-600">Big or small, at work or anywhere else.</p>
            <textarea
              ref={inputRef}
              rows={2}
              maxLength={400}
              value={proud}
              onChange={(e) => setProud(e.target.value)}
              onKeyDown={(e) => onEnter(e, Boolean(proud.trim()))}
              placeholder="e.g. I reorganized how our team tracked volunteer shifts"
              className="mt-3 w-full resize-none rounded-2xl border border-emerald-900/15 bg-white/85 px-3.5 py-2.5 text-[14px] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
            <NavRow onBack={goBack}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!proud.trim()}>
                Next →
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900">How much have you built with AI so far?</h2>
            <div className="mt-3 space-y-2">
              {AI_CHOICES.map((c, i) => (
                <button
                  key={c.key}
                  onClick={() => {
                    setAi(c.key)
                    setTimeout(goNext, 220)
                  }}
                  className="seed-choice seed-tile flex w-full items-center justify-between gap-3 rounded-2xl border bg-white/75 px-4 py-3 text-left transition hover:bg-white"
                  style={{ borderColor: ai === c.key ? ACCENT : 'rgba(30,70,48,.12)', boxShadow: ai === c.key ? `0 0 0 2px ${ACCENT}33` : undefined, animationDelay: `${i * 80}ms` }}
                >
                  <span>
                    <span className="block text-[14px] font-bold text-slate-900">{c.title}</span>
                    <span className="block text-[12.5px] text-slate-600">{c.sub}</span>
                  </span>
                  {ai === c.key && <span style={{ color: ACCENT }}>✓</span>}
                </button>
              ))}
            </div>
            <NavRow onBack={goBack}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!ai}>
                Next →
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900">What do you most want to learn today?</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {GOALS.map((g, i) => (
                <button
                  key={g.key}
                  onClick={() => {
                    setGoal(g.key)
                    setTimeout(goNext, 220)
                  }}
                  className="seed-choice seed-tile rounded-2xl border bg-white/75 px-3.5 py-3 text-left transition hover:bg-white"
                  style={{ borderColor: goal === g.key ? ACCENT : 'rgba(30,70,48,.12)', boxShadow: goal === g.key ? `0 0 0 2px ${ACCENT}33` : undefined, animationDelay: `${i * 70}ms` }}
                >
                  <span className="block text-[13.5px] font-bold text-slate-900">{g.title}</span>
                  <span className="block text-[12.5px] text-slate-600">{g.sub}</span>
                </button>
              ))}
            </div>
            <NavRow onBack={goBack}>
              <Btn accent={ACCENT} onClick={goNext} disabled={!goal}>
                Next →
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900">How confident do you feel about AI deployment work?</h2>
            <p className="mt-1 text-[13px] text-slate-600">Private and optional. It only helps you see how you feel at the end.</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setConfidence(confidence === n ? null : n)}
                  className="seed-choice h-12 flex-1 rounded-2xl border bg-white/75 text-[16px] font-bold transition hover:bg-white"
                  style={{ borderColor: confidence === n ? ACCENT : 'rgba(30,70,48,.12)', color: confidence === n ? ACCENT : '#334155', boxShadow: confidence === n ? `0 0 0 2px ${ACCENT}33` : undefined }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11.5px] text-slate-500">
              <span>Not at all</span>
              <span>Very</span>
            </div>
            <NavRow onBack={goBack}>
              <Btn accent={ACCENT} onClick={map} busy={mapping}>
                Map my strengths
              </Btn>
            </NavRow>
          </div>
        )}

        {step === 6 && (
          <div className="py-6 text-center">
            <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">Mapping what you bring to deployment work…</h2>
            <p className="mt-1 text-[13px] text-slate-600">Using only your own words.</p>
            <div className="mx-auto mt-5 h-2 w-64 overflow-hidden rounded-full bg-emerald-900/10">
              <div className="seed-bar h-full w-1/3 rounded-full" style={{ background: `linear-gradient(90deg, ${ACCENT}, #F7B2D0)` }} />
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h2 className="text-[21px] font-extrabold tracking-tight text-slate-900">Your strengths, in deployment terms</h2>
            <p className="mt-1 text-[13px] text-slate-600">Edit anything that doesn’t sound like you, or remove it.{existing?.source === 'fallback' ? ' (Mapped with simple keyword rules, no AI.)' : ''}</p>
            <div className="mt-3 space-y-2.5">
              {strengths.map((s, i) => (
                <div key={s.id} className="seed-tile rounded-2xl border border-emerald-900/10 bg-white/80 p-3" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex items-center gap-2">
                    <span>🌱</span>
                    <input
                      value={s.label}
                      maxLength={60}
                      onChange={(e) => setStrengths(strengths.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)))}
                      className="min-w-0 flex-1 rounded-lg bg-transparent px-1 py-0.5 text-[14.5px] font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      aria-label="Strength"
                    />
                    <button onClick={() => setStrengths(strengths.filter((x) => x.id !== s.id))} className="rounded-full px-2 py-0.5 text-[12px] text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove strength">
                      Remove
                    </button>
                  </div>
                  <div className="mt-1 flex gap-1 text-[12.5px] text-slate-600">
                    <span className="shrink-0 font-semibold text-slate-700">In deployment:</span>
                    <input
                      value={s.application}
                      maxLength={200}
                      onChange={(e) => setStrengths(strengths.map((x) => (x.id === s.id ? { ...x, application: e.target.value } : x)))}
                      className="min-w-0 flex-1 rounded bg-transparent px-1 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      aria-label="In deployment"
                    />
                  </div>
                  <div className="mt-0.5 text-[12px] italic text-slate-500">From: “{s.from}”</div>
                </div>
              ))}
              {!strengths.length && <p className="text-[13px] text-slate-500">No strengths listed. That’s fine; the report won’t guess at your background.</p>}
            </div>
            {practice.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ACCENT }}>
                  Today you will practice
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {practice.map((p) => (
                    <span key={p} className="rounded-full bg-emerald-100/80 px-2.5 py-1 text-[12px] font-semibold text-emerald-900">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <NavRow onBack={existing?.confirmed ? undefined : () => setStep(5)}>
              <Btn accent={ACCENT} onClick={save} busy={saving}>
                {resuming || existing?.confirmed ? 'Save my strengths' : 'Meet your first client →'}
              </Btn>
            </NavRow>
          </div>
        )}
      </div>

      {step < 6 && !existing?.confirmed && !resuming && (
        <p className="mt-3 text-center text-[11.5px] text-slate-500">
          <button onClick={skip} className="underline decoration-dotted underline-offset-2 hover:text-slate-700">
            Skip setup for now.
          </button>{' '}
          You can come back to the Greenhouse later.
        </p>
      )}
    </CardShell>
  )
}
