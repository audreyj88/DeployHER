'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { chipState, nextPlace, previousPlace, roomStatus, SKIPPABLE, type ChipState } from '@/lib/mission'
import { PLACES, placeById, type PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'
import { openRoomUI } from '../cards/Cards'
import { LogoPill } from '../brand/Brand'

const pill = 'pointer-events-auto rounded-full bg-white/90 backdrop-blur-md shadow-lg text-[13px] font-semibold text-slate-800'

function MissionTrack() {
  const s = useGame((g) => g.session)!
  return (
    <div className={`${pill} flex items-center px-2 py-1.5`} aria-label="Mission progress">
      {PLACES.map((p, i) => {
        const st = chipState(s, p.id)
        const passed = st === 'done' || st === 'skipped' || st === 'later'
        return (
          <div key={p.id} className="flex items-center">
            {i > 0 && <div className="mx-1 h-[3px] w-3 rounded-full sm:w-4" style={{ background: passed || st === 'current' ? '#94A3B8' : '#E2E8F0' }} />}
            <Chip id={p.id} st={st} n={i + 1} />
          </div>
        )
      })}
    </div>
  )
}

function Chip({ id, st, n }: { id: PlaceId; st: ChipState; n: number }) {
  const p = placeById(id)
  const disc: Record<ChipState, CSSProperties> = {
    done: { background: '#22C55E', color: '#fff' },
    later: { background: '#F59E0B', color: '#fff' },
    skipped: { background: '#94A3B8', color: '#fff' },
    current: { background: 'rgba(255,255,255,.3)', color: '#fff' },
    locked: { background: '#E2E8F0', color: '#94A3B8' },
  }
  const glyph = st === 'done' ? '✓' : st === 'later' ? '…' : st === 'skipped' ? '–' : String(n)
  const current = st === 'current'
  return (
    <div
      className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 text-[11px] font-bold"
      style={current ? { background: p.accent, color: '#fff', paddingRight: 9 } : { paddingRight: 4, color: st === 'locked' ? '#94A3B8' : '#334155' }}
      title={`${p.label} · ${st === 'later' ? 'saved for later' : st}`}
    >
      <span className="grid h-4 w-4 place-items-center rounded-full text-[10px]" style={disc[st]}>
        {glyph}
      </span>
      <span className={current ? '' : 'hidden xl:inline'}>{p.label}</span>
    </div>
  )
}

function Menu() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const restart = useGame((g) => g.restart)
  return (
    <div className="pointer-events-auto relative">
      <button className={`${pill} grid h-9 w-9 place-items-center text-lg`} onClick={() => { setOpen(!open); setConfirm(false) }} aria-label="Menu">
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 text-[13px] shadow-xl">
          {!confirm ? (
            <button className="w-full rounded-xl px-3 py-2 text-left font-semibold hover:bg-slate-100" onClick={() => setConfirm(true)}>
              ↺ Restart the mission
            </button>
          ) : (
            <div className="p-2">
              <div className="font-semibold text-slate-800">Delete everything and start over?</div>
              <div className="mt-2 flex gap-2">
                <button className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white" onClick={() => { setOpen(false); restart() }}>
                  Restart
                </button>
                <button className="rounded-full px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RoomControls() {
  const s = useGame((g) => g.session)!
  const inside = useGame((g) => g.inside)
  const card = useGame((g) => g.card)
  const panel = useGame((g) => g.panel)
  const voiceLive = useGame((g) => g.voiceLive)
  const act = useGame((g) => g.act)
  const set = useGame((g) => g.set)
  const walkTo = useGame((g) => g.walkTo)
  const [confirm, setConfirm] = useState<null | 'reset' | 'skip'>(null)
  const [busy, setBusy] = useState(false)
  // The room you're in (or whose card is open).
  const room = (card ?? panel ?? inside) as PlaceId | null
  useEffect(() => setConfirm(null), [room])
  if (!room || roomStatus(s, room) === 'locked' || voiceLive) return null
  const st = roomStatus(s, room)
  const canSkip = SKIPPABLE.includes(room) && st === 'current'
  const hasWork =
    (room === 'setup' && (s.setup || s.setupLater)) ||
    (room === 'interview' && (s.interview.turns.length > 0 || s.skipped.includes('interview'))) ||
    (room === 'debrief' && (st === 'done' || s.skipped.includes('debrief'))) ||
    (room === 'lab' && (s.lab.runs.length > 0 || s.skipped.includes('lab'))) ||
    (room === 'launch' && (s.launch.decision || s.launch.premortem || s.skipped.includes('launch'))) ||
    (room === 'report' && s.report)
  const run = async (type: 'reset' | 'skip') => {
    setBusy(true)
    try {
      await act({ type, place: room })
      setConfirm(null)
      if (type === 'skip') {
        set({ card: null, panel: null })
        const next = nextPlace(useGame.getState().session!)
        if (next) walkTo({ kind: 'room', id: next })
      } else {
        // Reopen the room fresh.
        set({ card: null, panel: null })
        setTimeout(() => openRoomUI(room), 60)
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-50 flex flex-col items-start gap-2">
      {confirm && (
        <div className="rounded-2xl bg-white/95 p-3 text-[13px] shadow-xl backdrop-blur-md">
          <div className="font-semibold text-slate-800">{confirm === 'reset' ? `Clear your work in ${placeById(room).title}?` : 'Skip this step?'}</div>
          <div className="mt-0.5 max-w-64 text-[12px] text-slate-500">
            {confirm === 'reset' ? 'The mission rewinds to this room. Your skills report is cleared.' : 'Your skills report will mark it “not assessed”. You can reset the room later to try it.'}
          </div>
          <div className="mt-2 flex gap-2">
            <button disabled={busy} className="rounded-full px-3 py-1.5 font-semibold text-white disabled:opacity-60" style={{ background: placeById(room).accent }} onClick={() => run(confirm)}>
              {confirm === 'reset' ? 'Reset room' : 'Skip it'}
            </button>
            <button className="rounded-full px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100" onClick={() => setConfirm(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        {hasWork && (
          <button className={`${pill} px-3.5 py-2`} onClick={() => setConfirm('reset')}>
            ↺ Reset this room
          </button>
        )}
        {canSkip && (
          <button className={`${pill} px-3.5 py-2`} onClick={() => setConfirm('skip')}>
            Skip this step ⏭
          </button>
        )}
      </div>
    </div>
  )
}

function BottomCentre() {
  const s = useGame((g) => g.session)!
  const inside = useGame((g) => g.inside)
  const nearLocked = useGame((g) => g.nearLocked)
  const card = useGame((g) => g.card)
  const panel = useGame((g) => g.panel)
  const walkTo = useGame((g) => g.walkTo)
  const set = useGame((g) => g.set)
  if (card) return null
  const next = nextPlace(s)
  let body: React.ReactNode = null
  if (nearLocked && !inside) {
    const prev = previousPlace(nearLocked)
    body = (
      <div className={`${pill} px-4 py-2`}>
        🔒 {placeById(nearLocked).title} opens after {prev ? placeById(prev).title : 'the previous room'}
      </div>
    )
  } else if (inside && roomStatus(s, inside) !== 'locked') {
    const p = placeById(inside)
    body = (
      <div className="flex gap-2">
        <button className={`${pill} px-4 py-2`} onClick={() => { set({ card: null, panel: null, seatedAt: null }); walkTo({ kind: 'out' }) }}>
          ↩ Step outside
        </button>
        {!panel && (
          <button className="pointer-events-auto rounded-full px-4 py-2 text-[13px] font-semibold text-white shadow-lg" style={{ background: p.accent }} onClick={() => openRoomUI(inside)}>
            Open {p.title}
          </button>
        )}
      </div>
    )
  } else if (next) {
    const p = placeById(next)
    body = (
      <div className={`${pill} flex items-center gap-3 py-1.5 pl-4 pr-1.5`}>
        <span>
          Next: <b style={{ color: p.accent }}>{p.title}</b>
        </span>
        <button className="rounded-full px-3 py-1.5 text-white" style={{ background: p.accent }} onClick={() => walkTo({ kind: 'room', id: next })}>
          Take me there →
        </button>
      </div>
    )
  } else {
    body = <div className={`${pill} px-4 py-2`}>Mission complete! Revisit any room, or restart from the menu.</div>
  }
  return <div className={`absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 transition-transform ${panel ? 'sm:-translate-x-[calc(50%+236px)]' : ''}`}>{body}</div>
}

function ControlsHint() {
  const [show, setShow] = useState(true)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setShow(false), 12000)
    const b = setTimeout(() => setGone(true), 12700)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])
  if (gone) return null
  return (
    <div className={`absolute bottom-16 left-1/2 hidden -translate-x-1/2 rounded-full bg-slate-900/70 px-4 py-1.5 text-[12px] text-white transition-opacity duration-700 sm:block ${show ? 'opacity-100' : 'opacity-0'}`}>
      Walk with the arrow keys / WASD or click · scroll to zoom (all the way out for the map) · drag to look around
    </div>
  )
}

function Welcome() {
  const welcome = useGame((g) => g.welcome)
  const set = useGame((g) => g.set)
  const walkTo = useGame((g) => g.walkTo)
  if (!welcome) return null
  const keys = (k: string) => <span className="rounded-md px-1.5 py-0.5 text-[11px] font-bold" style={{ background: 'rgba(246,239,226,.15)' }}>{k}</span>
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-black/10 p-4">
      <div className="welcome-in w-full max-w-[400px] rounded-[24px] p-6 shadow-2xl" style={{ background: '#1E4630', color: '#F6EFE2' }}>
        <div className="text-[11px] font-bold uppercase tracking-[.14em]" style={{ color: '#E0905F' }}>
          Welcome
        </div>
        <h1 className="mt-1 text-[24px] font-extrabold leading-tight">Welcome to DeployHER</h1>
        <p className="mt-2 text-[14px] leading-relaxed opacity-90">
          Closing the gender gap in the AI economy. Walk the campus and take on your first client engagement, one room at a time: discover the real problem, make an AI assistant work, and decide how to launch it.
        </p>
        <div className="mt-4 space-y-2 text-[13px]">
          <div className="flex items-center gap-2">{keys('W A S D')} {keys('↑ ↓ ← →')} or click the ground to walk</div>
          <div className="flex items-center gap-2">{keys('Scroll')} or pinch to zoom, all the way out for the map</div>
          <div className="flex items-center gap-2">{keys('Drag')} to look around · {keys('E')} opens a room · {keys('Esc')} steps back</div>
        </div>
        <button
          className="mt-5 w-full rounded-full px-4 py-2.5 text-[14px] font-bold shadow-lg transition active:scale-[.98]"
          style={{ background: '#E0905F', color: '#1E4630' }}
          onClick={() => {
            set({ welcome: false })
            walkTo({ kind: 'room', id: 'setup' })
          }}
        >
          Take me to the Greenhouse →
        </button>
        <button className="mt-2 w-full text-[12px] opacity-70 hover:opacity-100" onClick={() => set({ welcome: false })}>
          I’ll look around first
        </button>
      </div>
    </div>
  )
}

function Toast() {
  const err = useGame((g) => g.error)
  const card = useGame((g) => g.card)
  const panel = useGame((g) => g.panel)
  const set = useGame((g) => g.set)
  if (!err || card || panel) return null
  return (
    <div className="pointer-events-auto absolute left-1/2 top-16 flex max-w-md -translate-x-1/2 items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800 shadow-lg">
      <span>{err}</span>
      <button onClick={() => set({ error: null })} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}

function BackToMe() {
  const panned = useGame((g) => g.panned)
  const set = useGame((g) => g.set)
  const n = useGame((g) => g.backToMeNonce)
  if (!panned) return null
  return (
    <button className={`${pill} absolute right-3 top-16 px-3.5 py-2`} onClick={() => set({ backToMeNonce: n + 1 })}>
      ◎ Back to me
    </button>
  )
}

export function Hud() {
  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <LogoPill />
        <MissionTrack />
      </div>
      <div className="absolute right-3 top-3">
        <Menu />
      </div>
      <BackToMe />
      <RoomControls />
      <BottomCentre />
      <ControlsHint />
      <Toast />
      <Welcome />
    </div>
  )
}
