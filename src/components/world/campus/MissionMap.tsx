'use client'
// The mission map inlaid in the plaza floor: track, legs, spokes, stations, comets, medallion.
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { chipState, nextPlace } from '@/lib/mission'
import { PLACES, type PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'
import { arcPoints, decal, doorDist, doorPoint, onAxis, stripGeometry, TRACK_R } from './geo'
import { reducedMotion } from './rng'
import { medallionTexture, stationTexture, type StationState } from './textures'

const GREY = '#CFC6B8'

function useMissionState() {
  const session = useGame((s) => s.session)
  return useMemo(() => {
    if (!session) return null
    const chips = Object.fromEntries(PLACES.map((p) => [p.id, chipState(session, p.id)])) as Record<PlaceId, ReturnType<typeof chipState>>
    return { chips, next: nextPlace(session) }
  }, [session])
}

/** Legs: leg i reaches station i. Leg 0 runs from the medallion to station 1. */
function legPoints(i: number): [number, number][] {
  const p = PLACES[i]
  if (i === 0) {
    const a = onAxis(p.id, 2.22)
    const b = onAxis(p.id, TRACK_R)
    return [a, b]
  }
  return arcPoints(TRACK_R, PLACES[i - 1].angleDeg, p.angleDeg, 16)
}

export function MissionMap() {
  const st = useMissionState()
  const bedGeo = useMemo(() => stripGeometry(arcPoints(TRACK_R, PLACES[0].angleDeg, PLACES[5].angleDeg, 120), 0.9, 0), [])
  const bedMat = useMemo(() => decal(new THREE.MeshStandardMaterial({ color: '#E4DACB', roughness: 0.9 }), 3), [])
  if (!st) return null
  return (
    <group>
      <mesh geometry={bedGeo} material={bedMat} renderOrder={3} receiveShadow />
      {PLACES.map((p, i) => (
        <Leg key={p.id} i={i} state={st.chips[p.id]} isNext={st.next === p.id} accent={p.accent} />
      ))}
      {PLACES.map((p) => (
        <Spoke key={`s${p.id}`} id={p.id} state={st.chips[p.id]} accent={p.accent} />
      ))}
      {PLACES.map((p, i) => (
        <Station key={`st${p.id}`} id={p.id} n={i + 1} state={st.chips[p.id]} accent={p.accent} />
      ))}
      <Medallion />
      {st.next && <Comets target={st.next} />}
    </group>
  )
}

function Leg({ i, state, isNext, accent }: { i: number; state: string; isNext: boolean; accent: string }) {
  const geo = useMemo(() => stripGeometry(legPoints(i), 0.33, 0), [i])
  const lit = state === 'done' || state === 'skipped' || state === 'later'
  const current = state === 'current' || isNext
  const mat = useMemo(() => {
    const color = lit || current ? accent : GREY
    return decal(new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: current ? 0.35 : lit ? 0.18 : 0, transparent: current, roughness: 0.6 }), 4)
  }, [lit, current, accent])
  useFrame(({ clock }) => {
    if (current) mat.opacity = 0.55 + 0.2 * Math.sin(3 * clock.elapsedTime)
  })
  return <mesh geometry={geo} material={mat} renderOrder={4} receiveShadow />
}

function Spoke({ id, state, accent }: { id: PlaceId; state: string; accent: string }) {
  const geo = useMemo(() => stripGeometry([onAxis(id, TRACK_R + 0.66), onAxis(id, doorDist(id) - 0.4)], 0.16, 0), [id])
  const on = state !== 'locked'
  const mat = useMemo(() => decal(new THREE.MeshStandardMaterial({ color: on ? accent : GREY, emissive: on ? accent : '#000', emissiveIntensity: on ? 0.15 : 0, roughness: 0.7 }), 4), [on, accent])
  return <mesh geometry={geo} material={mat} renderOrder={4} receiveShadow />
}

function Station({ id, n, state, accent }: { id: PlaceId; n: number; state: string; accent: string }) {
  const [x, z] = onAxis(id, TRACK_R)
  const s: StationState = state === 'skipped' ? 'done' : (state as StationState)
  const tex = useMemo(() => stationTexture(s, n, accent), [s, n, accent])
  const halo = useRef<THREE.Mesh>(null)
  const haloMat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (!halo.current || !haloMat.current) return
    const ph = reducedMotion() ? 0.3 : (clock.elapsedTime * 0.7) % 1
    halo.current.scale.setScalar(1 + 0.6 * ph)
    haloMat.current.opacity = 0.5 * (1 - ph)
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.03} receiveShadow castShadow>
        <cylinderGeometry args={[0.78, 0.8, 0.06, 48]} />
        <meshStandardMaterial color="#D9CEBD" roughness={0.9} />
      </mesh>
      <mesh position-y={0.062} rotation-x={-Math.PI / 2} renderOrder={6}>
        <circleGeometry args={[0.66, 48]} />
        <meshStandardMaterial map={tex} roughness={0.6} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-8} />
      </mesh>
      {s === 'current' && (
        <mesh ref={halo} position-y={0.07} rotation-x={-Math.PI / 2} renderOrder={7}>
          <ringGeometry args={[0.71, 0.86, 48]} />
          <meshBasicMaterial ref={haloMat} color={accent} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

function Medallion() {
  const tex = useMemo(() => medallionTexture(), [])
  return (
    <group>
      <mesh position-y={0.045} receiveShadow castShadow>
        <cylinderGeometry args={[1.98, 2.02, 0.09, 72]} />
        <meshStandardMaterial color="#D9CEBD" roughness={0.9} />
      </mesh>
      <mesh position-y={0.11} rotation-x={-Math.PI / 2} receiveShadow renderOrder={6}>
        <circleGeometry args={[1.7, 72]} />
        <meshStandardMaterial map={tex} roughness={0.35} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-8} />
      </mesh>
    </group>
  )
}

/** Five white dots running from the previous station (or the medallion) to the next room's door. */
function Comets({ target }: { target: PlaceId }) {
  const i = PLACES.findIndex((p) => p.id === target)
  const route = useMemo(() => {
    const pts: [number, number][] = []
    if (i === 0) {
      pts.push(onAxis(target, 2.22), onAxis(target, TRACK_R))
    } else {
      pts.push(...arcPoints(TRACK_R, PLACES[i - 1].angleDeg, PLACES[i].angleDeg, 16))
    }
    pts.push(doorPoint(target, 0))
    // cumulative lengths
    const cum = [0]
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]))
    return { pts, cum, total: cum[cum.length - 1] }
  }, [i, target])
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    for (let k = 0; k < 5; k++) {
      const m = refs.current[k]
      if (!m) continue
      const d = (t * 2.6 + (k * route.total) / 5) % route.total
      const f = d / route.total
      let seg = 1
      while (seg < route.cum.length - 1 && route.cum[seg] < d) seg++
      const a = route.pts[seg - 1]
      const b = route.pts[seg]
      const u = (d - route.cum[seg - 1]) / Math.max(1e-6, route.cum[seg] - route.cum[seg - 1])
      m.position.set(a[0] + (b[0] - a[0]) * u, 0.05, a[1] + (b[1] - a[1]) * u)
      const fade = Math.min(1, f * 6, (1 - f) * 6)
      m.scale.setScalar(0.6 + 0.4 * fade)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade
    }
  })
  return (
    <group>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} ref={(el) => void (refs.current[k] = el)} rotation-x={-Math.PI / 2} renderOrder={8}>
          <circleGeometry args={[0.17, 20]} />
          <meshBasicMaterial color="#FFFFFF" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
