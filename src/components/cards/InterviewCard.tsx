'use client'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { placeById } from '@/lib/places'
import { useGame } from '@/store/game'
import { DebriefContent } from './Debrief'
import { Halo, MicMeter } from './interview/Halo'
import { MayaPortrait } from './MayaPortrait'
import { Btn, CardShell, ErrorStrip, ThinkingDots, useAct, useBusy } from './ui'

const ACCENT = placeById('interview').accent
const MIN_Q = 2
const MAX_Q = 14
const CAP_KEY = 'dh_captions'

type Line = { role: 'learner' | 'client'; text: string; at: number }
type Phase = 'intro' | 'mic' | 'connecting' | 'live' | 'dropped' | 'ending' | 'typed'

function loadCaptions(): Line[] {
  try {
    return JSON.parse(sessionStorage.getItem(CAP_KEY) || '[]')
  } catch {
    return []
  }
}

function useElapsed(startedAt: number | null, running: boolean) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])
  if (!startedAt) return '0:00'
  const s = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ---------------------------------------------------------------- Feedback
function FeedbackCard() {
  const set = useGame((s) => s.set)
  const walkTo = useGame((s) => s.walkTo)
  const reviewing = useBusy('interview_end')
  const close = () => set({ card: null, error: null, seatedAt: null })
  return (
    <CardShell place="interview" className="card-interview feedback" onClose={reviewing ? undefined : close}>
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <MayaPortrait size={52} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ACCENT }}>
              DeployHER feedback
            </div>
            <h2 className="text-[19px] font-extrabold tracking-tight text-slate-900">How your conversation with Maya went</h2>
          </div>
          {!reviewing && (
            <button onClick={close} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-black/5">
              ✕
            </button>
          )}
        </div>
        {reviewing ? (
          <div className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-[13.5px] text-teal-900">
            <ThinkingDots color={ACCENT} />
            DeployHER is reviewing your conversation…
          </div>
        ) : (
          <DebriefContent
            footer={
              <div className="flex justify-end">
                <Btn
                  accent={placeById('debrief').accent}
                  onClick={() => {
                    close()
                    walkTo({ kind: 'room', id: 'debrief' })
                  }}
                >
                  Grab a coffee with Nia →
                </Btn>
              </div>
            }
          />
        )}
      </div>
    </CardShell>
  )
}

// ---------------------------------------------------------------- Maya side
function MayaScene({
  speaking,
  live,
  timer,
  statusText,
  showDots,
  getOutput,
  getInput,
  compact,
}: {
  speaking: boolean
  live: boolean
  timer: string | null
  statusText: string
  showDots: boolean
  getOutput?: () => Uint8Array | undefined
  getInput?: () => Uint8Array | undefined
  compact?: boolean
}) {
  const glow = speaking ? 'rgba(45,212,191,.55)' : live ? 'rgba(167,139,250,.45)' : 'rgba(45,212,191,.2)'
  return (
    <div className="relative flex flex-col items-center overflow-hidden px-5 pb-5 pt-4 text-white" style={{ background: 'linear-gradient(170deg, #0B3B3A 0%, #072B2A 55%, #061A22 100%)' }}>
      <div className="pointer-events-none absolute left-1/2 top-[42%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-700" style={{ background: glow }} />
      <div className="relative flex w-full items-center justify-between text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
          {timer ? (
            <>
              <span className={`h-1.5 w-1.5 rounded-full bg-emerald-400 ${live ? 'animate-pulse' : ''}`} />
              {timer}
            </>
          ) : (
            'In Maya’s office'
          )}
        </span>
        <span className="rounded-full bg-white/10 px-2.5 py-1">Fictional client</span>
      </div>
      <div className={compact ? 'relative mt-1' : 'relative mt-3'}>
        <Halo size={compact ? 150 : 210} speaking={speaking} live={live} getOutput={getOutput} getInput={getInput}>
          <MayaPortrait size={compact ? 80 : 112} speaking={speaking} />
        </Halo>
      </div>
      <div className="relative text-center">
        <div className="text-[17px] font-bold">Maya Chen</div>
        <div className="text-[12px] text-white/70">Executive Director, Pathways Forward</div>
        <div className="mt-2 flex h-5 items-center justify-center gap-2 text-[12.5px] text-white/85">
          {showDots && <ThinkingDots color="#5EEAD4" />}
          <span>{statusText}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Transcript column
function Transcript({ lines, revealCount, speaking, learnerTalking, thinking }: { lines: Line[]; revealCount: number | null; speaking: boolean; learnerTalking: boolean; thinking: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  useEffect(() => {
    const el = box.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  })
  const lastClient = lines.map((l) => l.role).lastIndexOf('client')
  return (
    <div
      ref={box}
      onScroll={(e) => {
        const el = e.currentTarget
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-3"
    >
      {lines.map((l, i) => {
        const isLatestMaya = i === lastClient && l.role === 'client' && speaking && revealCount !== null
        let content: React.ReactNode = l.text
        if (isLatestMaya) {
          const words = l.text.split(/\s+/)
          content = (
            <>
              {words.slice(0, revealCount!).join(' ')}
              <span className="text-slate-400"> {words.slice(revealCount!).join(' ')}</span>
            </>
          )
        }
        return (
          <div key={`${i}-${l.at}`} className={`talk-line flex flex-col ${l.role === 'learner' ? 'items-end' : 'items-start'}`}>
            <span className="mb-0.5 px-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{l.role === 'learner' ? 'You' : 'Maya'}</span>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-snug ${l.role === 'learner' ? 'rounded-br-md bg-slate-900 text-white' : 'rounded-bl-md bg-teal-50 text-slate-800'}`}>{content}</div>
          </div>
        )
      })}
      {learnerTalking && (
        <div className="caption-in flex justify-end">
          <div className="rounded-2xl rounded-br-md bg-slate-200 px-3 py-2.5">
            <ThinkingDots color="#475569" />
          </div>
        </div>
      )}
      {thinking && !learnerTalking && (
        <div className="caption-in flex justify-start">
          <div className="rounded-2xl rounded-bl-md bg-teal-50 px-3 py-2.5">
            <ThinkingDots color={ACCENT} />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Main
function InterviewInner() {
  const session = useGame((s) => s.session)!
  const set = useGame((s) => s.set)
  const act = useAct()
  const ending = useBusy('interview_end')
  const asking = useBusy('interview_ask')
  const voiceOk = session.ai.voice
  const iv = session.interview

  const initialPhase: Phase = iv.status === 'live' ? (iv.mode === 'typed' ? 'typed' : 'dropped') : 'intro'
  const [phase, setPhase] = useState<Phase>(initialPhase)
  const [preferTyping, setPreferTyping] = useState(!voiceOk || iv.mode === 'typed')
  const [captions, setCaptions] = useState<Line[]>(() => (iv.mode === 'voice' ? loadCaptions() : []))
  const [micError, setMicError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [mayaVolume, setMayaVolume] = useState(1)
  const [draft, setDraft] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [revealCount, setRevealCount] = useState<number | null>(null)
  const [micLevel, setMicLevel] = useState(0)
  const [userTalking, setUserTalking] = useState(false)
  const endingRef = useRef(false)
  const lastVoiceAt = useRef(0)
  const captionsRef = useRef(captions)
  captionsRef.current = captions
  const reconnectingRef = useRef(false)

  const pushCaption = useCallback((role: Line['role'], text: string) => {
    const t = text.trim()
    if (!t) return
    setCaptions((prev) => {
      const last = prev[prev.length - 1]
      // dedupe the echo of a typed message
      if (last && last.role === role && last.text === t) return prev
      const next = [...prev, { role, text: t, at: Date.now() }]
      try {
        sessionStorage.setItem(CAP_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const conv = useConversation({
    micMuted: muted,
    volume: mayaVolume,
    onConnect: ({ conversationId }) => {
      setPhase('live')
      act({ type: 'voice_register', conversationId })
      // Reconnect: give Maya the earlier lines so she continues naturally.
      const earlier = captionsRef.current.filter((l) => l.text)
      if (reconnectingRef.current && earlier.length) {
        const ctx = earlier
          .slice(-16)
          .map((l) => `${l.role === 'learner' ? 'Consultant' : 'Maya'}: ${l.text}`)
          .join('\n')
        setTimeout(() => {
          try {
            conv.sendContextualUpdate(`The meeting was briefly interrupted. Here is what was said before the break, so you can continue naturally:\n${ctx}`)
          } catch {}
        }, 300)
      }
      reconnectingRef.current = false
    },
    onDisconnect: (d) => {
      set({ voiceLive: false, mayaSpeaking: false })
      if (endingRef.current || d.reason === 'user') return
      setPhase('dropped')
    },
    onError: (message) => {
      if (!endingRef.current) set({ error: `Voice connection problem: ${message}` })
    },
    onMessage: (m) => {
      pushCaption(m.role === 'user' ? 'learner' : 'client', m.message)
      if (m.role === 'agent') setRevealCount(2)
    },
  })

  const speaking = conv.status === 'connected' && conv.isSpeaking
  const connected = conv.status === 'connected'

  // Mirror call state into the store for the 3D room.
  useEffect(() => {
    set({ voiceLive: connected, mayaSpeaking: speaking })
  }, [connected, speaking, set])
  useEffect(() => () => set({ voiceLive: false, mayaSpeaking: false }), [set])

  // Reveal Maya's newest words two at a time every 330ms while she speaks.
  useEffect(() => {
    if (!speaking) {
      setRevealCount(null)
      return
    }
    const id = setInterval(() => setRevealCount((n) => (n === null ? 2 : n + 2)), 330)
    return () => clearInterval(id)
  }, [speaking])

  // Mic level / voice activity.
  useEffect(() => {
    if (!connected) return
    let raf = 0
    let last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 80) return
      last = t
      let v = 0
      try {
        v = conv.getInputVolume()
      } catch {}
      if (!muted && v > 0.06) lastVoiceAt.current = Date.now()
      setMicLevel(v)
      setUserTalking(!muted && Date.now() - lastVoiceAt.current < 700 && !conv.isSpeaking)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [connected, muted, conv])

  const questions = phase === 'typed' ? iv.turns.filter((t) => t.role === 'learner').length : captions.filter((l) => l.role === 'learner').length
  const elapsed = useElapsed(iv.startedAt, phase === 'live' || phase === 'typed')

  // ---- actions
  const startVoice = async (reconnect: boolean) => {
    setMicError(null)
    set({ error: null })
    if (!reconnect) {
      setPhase('mic')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        stream.getTracks().forEach((t) => t.stop())
      } catch (e) {
        const name = e instanceof DOMException ? e.name : ''
        setMicError(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'No microphone found. Plug one in, or switch to typing.' : 'Microphone access is blocked. Allow it in your browser’s address bar, or switch to typing.')
        setPhase('intro')
        return
      }
      try {
        sessionStorage.removeItem(CAP_KEY)
      } catch {}
      if (iv.status !== 'live') setCaptions([])
    }
    setPhase('connecting')
    const r = await act<{ token: string; opening: string }>({ type: 'voice_start', reconnect })
    if (!r) {
      setPhase(reconnect ? 'dropped' : 'intro')
      return
    }
    endingRef.current = false
    reconnectingRef.current = reconnect
    conv.startSession({
      conversationToken: r.token,
      connectionType: 'webrtc',
      dynamicVariables: { opening: r.opening },
      stripAudioTags: true,
    })
  }

  const startTyped = async () => {
    const r = await act({ type: 'interview_start', mode: 'typed' })
    if (r) setPhase('typed')
  }

  const switchToTyping = async () => {
    setMicError(null)
    setPreferTyping(true)
    if (connected) {
      endingRef.current = true
      conv.endSession()
    }
    await startTyped()
  }

  const sendTyped = async () => {
    const text = draft.trim()
    if (!text) return
    if (phase === 'typed') {
      setDraft('')
      const r = await act({ type: 'interview_ask', text })
      if (!r) setDraft(text)
      return
    }
    if (connected) {
      conv.sendUserMessage(text)
      pushCaption('learner', text)
      setDraft('')
    }
  }

  const end = async () => {
    setConfirmEnd(false)
    endingRef.current = true
    if (phase !== 'typed') {
      setPhase('ending')
      if (connected) conv.endSession()
      await new Promise((r) => setTimeout(r, 900))
    }
    const caps = captionsRef.current.map((l) => ({ role: l.role, text: l.text.slice(0, 2000) })).slice(-200)
    const r = await act({ type: 'interview_end', captions: phase === 'typed' ? undefined : caps })
    if (!r) {
      endingRef.current = false
      setPhase(phase === 'typed' ? 'typed' : 'dropped')
      return
    }
    try {
      sessionStorage.removeItem(CAP_KEY)
    } catch {}
  }

  const isLive = phase === 'live' || phase === 'connecting' || phase === 'ending' || phase === 'mic'
  const close = () => set({ card: null, error: null })

  // ---- status line
  const statusText = useMemo(() => {
    if (phase === 'mic') return 'Waiting for your microphone…'
    if (phase === 'connecting') return 'Sitting down with Maya…'
    if (phase === 'dropped') return 'Conversation paused'
    if (phase === 'ending' || ending) return 'Wrapping up…'
    if (phase === 'typed') return asking ? 'Maya is answering…' : 'Maya is listening'
    if (phase === 'live') {
      if (speaking) return 'Maya is talking'
      if (muted) return 'You’re muted'
      const last = captions[captions.length - 1]
      if (last?.role === 'learner' && !userTalking) return 'Maya is thinking…'
      return 'Maya is listening'
    }
    return 'Ready when you are'
  }, [phase, ending, asking, speaking, muted, captions, userTalking])
  const showDots = phase === 'connecting' || phase === 'ending' || (phase === 'typed' && asking) || statusText === 'Maya is thinking…'

  const typedLines: Line[] = iv.turns.map((t) => ({ role: t.role, text: t.text, at: 0 }))
  const lines = phase === 'typed' ? typedLines : captions.length ? captions : iv.turns.filter((t) => t.opener).map((t) => ({ role: t.role, text: t.text, at: 0 }))
  const remaining = Math.max(0, MIN_Q - questions)

  // ---------------- Intro
  if (phase === 'intro') {
    const voice = voiceOk && !preferTyping
    return (
      <CardShell place="interview" className="card-interview" onClose={close}>
        <div className="grid sm:grid-cols-[320px_1fr]">
          <MayaScene speaking={false} live={false} timer={null} statusText="Ready when you are" showDots={false} />
          <div className="flex flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: ACCENT }}>
                Pathways Forward · Discover
              </div>
              <button onClick={close} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-black/5">
                ✕
              </button>
            </div>
            <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">You take a seat across from Maya.</h2>
            <p className="mt-1.5 text-[13.5px] text-slate-600">
              Your job: find out what her team actually needs before anyone builds anything. She thinks she wants a chatbot. Ask about the work, not the tool.
            </p>
            <ErrorStrip />
            {micError && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                <span>{micError}</span>
                <Btn variant="soft" accent="#B45309" onClick={switchToTyping}>
                  Switch to typing
                </Btn>
              </div>
            )}
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-slate-700">
              {voice ? (
                <>
                  <li className="flex gap-2.5">
                    <span>🗣️</span>
                    <span>Just talk, like you’re sitting across from her. You can interrupt her.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span>⏱️</span>
                    <span>About 4–8 questions is plenty. Wrap up whenever you’re ready.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span>🔒</span>
                    <span>Uses your microphone (via ElevenLabs). No audio is recorded; the words are kept so DeployHER can give you feedback.</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex gap-2.5">
                    <span>⌨️</span>
                    <span>Type your questions, one at a time. Maya answers like she would in person.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span>⏱️</span>
                    <span>About 4–8 questions is plenty. Wrap up whenever you’re ready.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span>🔒</span>
                    <span>The conversation is kept on this local server for your session only.</span>
                  </li>
                </>
              )}
            </ul>
            {!session.ai.anthropic && !voice && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-700">The AI model isn’t configured on this server, so Maya can’t answer yet. You can skip this step from the corner menu.</p>}
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              {voice ? (
                <>
                  <Btn accent={ACCENT} onClick={() => startVoice(false)}>
                    🎙️ Start talking
                  </Btn>
                  <Btn variant="ghost" onClick={() => setPreferTyping(true)}>
                    Prefer typing?
                  </Btn>
                </>
              ) : (
                <>
                  <Btn accent={ACCENT} onClick={startTyped} busy={false}>
                    Start the conversation
                  </Btn>
                  {voiceOk && (
                    <Btn variant="ghost" onClick={() => setPreferTyping(false)}>
                      Use my voice instead
                    </Btn>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardShell>
    )
  }

  // ---------------- Conversation
  const voicePhase = phase !== 'typed'
  return (
    <CardShell place="interview" className="card-interview" onClose={isLive || phase === 'typed' ? undefined : close}>
      <div className="grid sm:grid-cols-[320px_1fr]" style={{ height: 'min(620px, calc(100dvh - 90px))' }}>
        <div className="flex flex-col" style={{ background: '#061A22' }}>
          <MayaScene
            speaking={speaking}
            live={connected}
            timer={elapsed}
            statusText={statusText}
            showDots={showDots}
            getOutput={() => (connected ? conv.getOutputByteFrequencyData() : undefined)}
            getInput={() => (connected ? conv.getInputByteFrequencyData() : undefined)}
            compact={typeof window !== 'undefined' && window.innerWidth < 640}
          />
          {voicePhase && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-4 text-white" style={{ background: '#061A22' }}>
              {connected && (
                <>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMuted(!muted)}
                      aria-label={muted ? 'Unmute your mic' : 'Mute your mic'}
                      className={`grid h-11 w-11 place-items-center rounded-full border border-white/20 backdrop-blur transition ${muted ? 'bg-amber-400/30' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      {muted ? '🔇' : '🎙️'}
                    </button>
                    <button
                      onClick={() => setMayaVolume(mayaVolume ? 0 : 1)}
                      aria-label={mayaVolume ? 'Turn Maya’s voice off' : 'Turn Maya’s voice on'}
                      className={`grid h-11 w-11 place-items-center rounded-full border border-white/20 backdrop-blur transition ${mayaVolume ? 'bg-white/10 hover:bg-white/20' : 'bg-amber-400/30'}`}
                    >
                      {mayaVolume ? '🔊' : '🔈'}
                    </button>
                  </div>
                  <div className="text-center">
                    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/50">Your mic</div>
                    <MicMeter level={micLevel} muted={muted} />
                  </div>
                </>
              )}
              {phase === 'dropped' && (
                <div className="text-center">
                  <p className="mb-2 text-[13px] text-white/80">The connection dropped. Maya’s still here.</p>
                  <Btn accent="#14B8A6" onClick={() => startVoice(true)}>
                    Pick up where you left off
                  </Btn>
                  <button onClick={switchToTyping} className="mt-2 block w-full text-[12px] text-white/60 underline underline-offset-2 hover:text-white">
                    Switch to typing
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-[14px] font-bold text-slate-900">Conversation</div>
              <div className="text-[11.5px] text-slate-500">
                {questions} question{questions === 1 ? '' : 's'} asked{phase === 'typed' ? ` · up to ${MAX_Q}` : ''}
              </div>
            </div>
            {!confirmEnd && (
              <Btn variant="soft" accent="#334155" onClick={() => setConfirmEnd(true)} disabled={ending || phase === 'ending' || phase === 'connecting' || phase === 'mic'}>
                End conversation
              </Btn>
            )}
          </div>
          {confirmEnd && (
            <div className="caption-in mx-4 mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[13.5px]">
              {remaining > 0 ? (
                <>
                  <p className="text-slate-700">
                    Ask Maya at least {remaining} more question{remaining === 1 ? '' : 's'} first.
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Btn variant="ghost" onClick={() => setConfirmEnd(false)}>
                      Keep talking
                    </Btn>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-800">Wrap up and get your feedback?</p>
                  <div className="mt-2 flex justify-end gap-2">
                    <Btn variant="ghost" onClick={() => setConfirmEnd(false)}>
                      Keep talking
                    </Btn>
                    <Btn accent={ACCENT} onClick={end} busy={ending}>
                      End conversation
                    </Btn>
                  </div>
                </>
              )}
            </div>
          )}
          <div className="px-4 pt-2">
            <ErrorStrip />
          </div>
          {phase === 'ending' || ending ? (
            <div className="flex flex-1 items-center justify-center gap-3 text-[13.5px] text-slate-600">
              <ThinkingDots color={ACCENT} />
              DeployHER is reviewing your conversation…
            </div>
          ) : (
            <Transcript lines={lines} revealCount={revealCount} speaking={speaking} learnerTalking={voicePhase && userTalking} thinking={(phase === 'typed' && asking) || statusText === 'Maya is thinking…'} />
          )}
          {(phase === 'typed' || connected) && !(phase === 'ending' || ending) && (
            <form
              className="border-t border-slate-100 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                sendTyped()
              }}
            >
              {connected && <div className="mb-1.5 px-1 text-[11.5px] text-slate-500">Or type to Maya (she’ll answer out loud)</div>}
              <div className="flex gap-2">
                <input
                  value={draft}
                  maxLength={600}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    if (connected) {
                      try {
                        conv.sendUserActivity()
                      } catch {}
                    }
                  }}
                  placeholder="Ask Maya a question"
                  disabled={asking || (phase === 'typed' && questions >= MAX_Q)}
                  className="min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-[14px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  autoFocus={phase === 'typed'}
                />
                <Btn type="submit" accent={ACCENT} busy={asking} disabled={!draft.trim()}>
                  Send
                </Btn>
              </div>
              {phase === 'typed' && (
                <div className="mt-2 flex justify-end">
                  <Btn variant="soft" accent={ACCENT} disabled={remaining > 0 || asking} onClick={() => setConfirmEnd(true)}>
                    {remaining > 0 ? `Ask ${remaining} more to wrap up` : 'Wrap up and get feedback'}
                  </Btn>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </CardShell>
  )
}

export function InterviewCard() {
  const status = useGame((s) => s.session?.interview.status)
  if (status === 'ended') return <FeedbackCard />
  return (
    <ConversationProvider>
      <InterviewInner />
    </ConversationProvider>
  )
}
