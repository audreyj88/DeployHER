'use client'
// The player: movement, collisions, walking paths, sitting, room detection, persistence.
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { roomStatus } from '@/lib/mission'
import { localToWorld, PLACE_IDS, roomAt, roomFrame, worldToLocal, type PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'
import { openRoomUI } from '../cards/Cards'
import { damp } from './campus/rng'
import { resolve } from './colliders'
import { cam, cancelPath, input, nav, planOut, planToRoom, setPath, type P2 } from './controls'
import { LEARNER_SEATED, SeatedPerson } from './people'
import { PlayerModel } from './PlayerModel'
import { Tag } from './Tag'
import { DEBRIEF_LEARNER, INTERVIEW_VISITOR, type Seat } from './seats'
import { player, spawnPoint } from './state'

const SPEED = 4.6
const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/** The approach point in front of a chair, then the chair itself (room-local). */
function seatPath(seat: Seat): P2[] {
  if (seat === INTERVIEW_VISITOR) return [[seat.x, seat.z + 1.35], [seat.x, seat.z]]
  if (seat === DEBRIEF_LEARNER) return [[seat.x, seat.z + 1.05], [seat.x, seat.z]]
  return [[seat.x, seat.z]]
}

function seatWorld(seat: Seat) {
  const [x, z] = localToWorld(seat.place, seat.x, seat.z)
  return { x, z, heading: roomFrame(seat.place).rotY + seat.heading }
}

function shouldSit(place: PlaceId): Seat | null {
  const s = useGame.getState().session
  if (!s) return null
  if (place === 'interview' && s.stage === 'client_interview' && s.interview.status !== 'ended') return INTERVIEW_VISITOR
  if (place === 'debrief' && s.stage === 'discovery_debrief') return DEBRIEF_LEARNER
  return null
}

let cardTimer: ReturnType<typeof setTimeout> | null = null

function sit(seat: Seat) {
  const w = seatWorld(seat)
  player.x = w.x
  player.z = w.z
  player.heading = w.heading
  player.speed = 0
  player.seated = { x: w.x, z: w.z, heading: w.heading, place: seat.place }
  const g = useGame.getState()
  g.set({ seatedAt: seat.place })
  if (seat.place === 'interview') {
    if (cardTimer) clearTimeout(cardTimer)
    cardTimer = setTimeout(() => {
      const st = useGame.getState()
      if (st.seatedAt === 'interview' && st.inside === 'interview') st.set({ card: 'interview', panel: null })
    }, 2400)
  }
}

export function standUp() {
  if (!player.seated) return
  const seat = player.seated
  player.seated = null
  // step back to the approach point so we don't start inside the chair
  const s = seat.place === 'interview' ? INTERVIEW_VISITOR : DEBRIEF_LEARNER
  const [ax, az] = localToWorld(seat.place, s.x, s.z + (seat.place === 'interview' ? 1.35 : 1.05))
  player.x = ax
  player.z = az
  if (cardTimer) clearTimeout(cardTimer)
  useGame.getState().set({ seatedAt: null })
}

function walkToSeat(seat: Seat) {
  const pts = planToRoom(player.x, player.z, seat.place, seatPath(seat))
  const chair = localToWorld(seat.place, seat.x, seat.z)
  setPath(pts, () => sit(seat), chair)
}

function savePos() {
  try {
    localStorage.setItem('dh_pos', JSON.stringify({ x: +player.x.toFixed(2), z: +player.z.toFixed(2), h: +player.heading.toFixed(2) }))
  } catch {}
}

function spawn(initial: boolean) {
  const g = useGame.getState()
  const at = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('at') : null
  player.seated = null
  player.speed = 0
  cancelPath()
  if (initial && at && (PLACE_IDS as string[]).includes(at)) {
    const id = at as PlaceId
    const [x, z] = localToWorld(id, 0, 2.5)
    player.x = x
    player.z = z
    player.heading = roomFrame(id).rotY + Math.PI
    return
  }
  if (initial) {
    try {
      const raw = localStorage.getItem('dh_pos')
      if (raw) {
        const p = JSON.parse(raw)
        if (Number.isFinite(p.x) && Number.isFinite(p.z)) {
          ;[player.x, player.z] = resolve(p.x, p.z)
          player.heading = Number.isFinite(p.h) ? p.h : 0
          return
        }
      }
    } catch {}
    g.set({ welcome: true })
  }
  const s = spawnPoint()
  player.x = s.x
  player.z = s.z
  player.heading = s.heading
}

export function Player() {
  const group = useRef<THREE.Group>(null)
  const [seated, setSeated] = useState<null | { x: number; z: number; heading: number }>(null)
  const lastInside = useRef<PlaceId | null>(null)
  const lastNear = useRef<PlaceId | null>(null)
  const saveT = useRef(0)

  // initial spawn + respawn
  useEffect(() => {
    spawn(true)
    const onRespawn = () => {
      spawn(false)
      lastInside.current = null
      useGame.getState().set({ inside: null, seatedAt: null })
      savePos()
    }
    const onHide = () => savePos()
    window.addEventListener('dh:respawn', onRespawn)
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('dh:respawn', onRespawn)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return
      const g = useGame.getState()
      if (MOVE_KEYS[e.code]) {
        // don't steal arrows while a card is open (it may scroll)
        if (g.card && e.code.startsWith('Arrow')) return
        input.keys.add(e.code)
        cancelPath()
        if (player.seated) standUp()
        e.preventDefault()
        return
      }
      if (e.key === 'Escape') {
        if (g.card || g.panel) {
          if (g.voiceLive && g.card === 'interview') return
          g.set({ card: null, panel: null, error: null })
        } else if (g.inside) {
          standUp()
          setPath(planOut(player.x, player.z))
        }
        return
      }
      if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && !g.card) {
        const el = document.activeElement as HTMLElement | null
        if (el && el.tagName === 'BUTTON') return
        if (g.inside) openRoomUI(g.inside)
      }
    }
    const up = (e: KeyboardEvent) => input.keys.delete(e.code)
    const blur = () => input.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // walk requests from the UI
  useEffect(() => {
    return useGame.subscribe((s, prev) => {
      if (!s.walk || s.walk === prev.walk) return
      const t = s.walk.target
      standUp()
      if (t.kind === 'room') {
        const seat = shouldSit(t.id)
        if (seat) walkToSeat(seat)
        else setPath(planToRoom(player.x, player.z, t.id))
      } else if (t.kind === 'seat') {
        const seat = t.id === 'interview' ? INTERVIEW_VISITOR : t.id === 'debrief' ? DEBRIEF_LEARNER : null
        if (seat) walkToSeat(seat)
        else setPath(planToRoom(player.x, player.z, t.id))
      } else if (t.kind === 'out') {
        setPath(planOut(player.x, player.z))
      } else {
        setPath([[t.x, t.z]])
      }
    })
  }, [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const g = useGame.getState()

    if (player.seated) {
      if (!seated) setSeated({ ...player.seated })
    } else if (seated) setSeated(null)

    if (!player.seated) {
      // desired direction
      let vx = 0
      let vz = 0
      let targetSpeed = 0
      let ix = 0
      let iy = 0
      for (const k of input.keys) {
        const m = MOVE_KEYS[k]
        if (m) {
          ix += m[0]
          iy += m[1]
        }
      }
      if (ix || iy) {
        const fx = cam.shotFwdX
        const fz = cam.shotFwdZ
        const rx = -fz
        const rz = fx
        vx = fx * iy + rx * ix
        vz = fz * iy + rz * ix
        const l = Math.hypot(vx, vz)
        vx /= l
        vz /= l
        targetSpeed = SPEED
      } else if (nav.path.length) {
        const [tx, tz] = nav.path[0]
        const dx = tx - player.x
        const dz = tz - player.z
        const d = Math.hypot(dx, dz)
        const final = nav.path.length === 1
        const thresh = final ? 0.15 : 0.5
        if (d < thresh) {
          nav.path.shift()
          nav.stuckT = 0
          nav.lastD = Infinity
          if (!nav.path.length) {
            const cb = nav.onArrive
            nav.onArrive = null
            nav.ghostNear = null
            cb?.()
          }
        } else {
          vx = dx / d
          vz = dz / d
          targetSpeed = final ? SPEED * Math.min(1, d / 0.6) : SPEED
          // stuck detection
          if (d < nav.lastD - 0.05) {
            nav.lastD = d
            nav.stuckT = 0
          } else {
            nav.stuckT += dt
            if (nav.stuckT > 1.3) {
              nav.stuckT = 0
              nav.lastD = Infinity
              if (final) {
                const cb = nav.onArrive
                nav.path = []
                nav.onArrive = null
                nav.ghostNear = null
                // close enough to a chair? sit anyway
                if (cb && d < 1.6) cb()
              } else nav.path.shift()
            }
          }
        }
      }

      player.speed += (targetSpeed - player.speed) * damp(12, dt)
      if (targetSpeed > 0.01) {
        const want = Math.atan2(vx, vz)
        let dh = want - player.heading
        while (dh > Math.PI) dh -= Math.PI * 2
        while (dh < -Math.PI) dh += Math.PI * 2
        player.heading += dh * damp(14, dt)
      }
      if (player.speed > 0.01) {
        const mx = targetSpeed > 0.01 ? vx : Math.sin(player.heading)
        const mz = targetSpeed > 0.01 ? vz : Math.cos(player.heading)
        let nx = player.x + mx * player.speed * dt
        let nz = player.z + mz * player.speed * dt
        const ghost = nav.ghostNear && Math.hypot(nx - nav.ghostNear[0], nz - nav.ghostNear[1]) < 1.2
        if (!ghost) [nx, nz] = resolve(nx, nz)
        player.x = nx
        player.z = nz
      }
    }

    if (group.current) {
      group.current.position.set(player.x, 0, player.z)
      group.current.rotation.y = player.heading
      group.current.visible = !player.seated
    }

    // room detection
    const inside = roomAt(player.x, player.z)
    if (inside !== lastInside.current) {
      lastInside.current = inside
      g.set({ inside })
      if (inside) {
        const seat = shouldSit(inside)
        if (seat && !player.seated && !input.keys.size) walkToSeat(seat)
      }
    }

    // locked-door hint: within ±3.2 of a locked door and 0–2.2 outside it
    let near: PlaceId | null = null
    if (g.session) {
      for (const id of PLACE_IDS) {
        if (roomStatus(g.session, id) !== 'locked') continue
        const [lx, lz] = worldToLocal(id, player.x, player.z)
        if (Math.abs(lx) <= 3.2 && lz >= 6 && lz <= 8.2) {
          near = id
          break
        }
      }
    }
    if (near !== lastNear.current) {
      lastNear.current = near
      g.set({ nearLocked: near })
    }

    saveT.current += dt
    if (saveT.current > 0.75) {
      saveT.current = 0
      savePos()
    }
  })

  return (
    <>
      <group ref={group}>
        <PlayerModel showTag={!seated} />
      </group>
      {seated && (
        <group position={[seated.x, 0, seated.z]}>
          <SeatedPerson position={[0, 0, 0]} rotationY={seated.heading} look={LEARNER_SEATED} pose="talking" />
          <SeatedYouTag />
        </group>
      )}
    </>
  )
}

function SeatedYouTag() {
  return <Tag kind="you" text="You" position={[0, 1.65, 0]} alwaysVisible />
}
