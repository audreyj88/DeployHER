'use client'
// Launch Pad: rocket on a hazard-striped pad, gantry with beacon, go/no-go light tower.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame, type LaunchAnim } from '@/store/game'
import { talkingFromBusy } from '../state'
import { ANA, MAYA, Person } from '../people'
import { Counter, Desk, Mat, Monitor } from './props'
import { floorTexture, RoomShell, type BoardData } from './RoomShell'
import { canvasTex, reducedMotion, useColliders } from './util'

const ID = 'launch' as const
const ACCENT = '#C8475D'
const PAD = { x: -4.2, z: 0.3, r: 1.3 }

function hazardTex() {
  return canvasTex('launch:hazard', 512, 64, (g, w, h) => {
    g.fillStyle = '#FBBF24'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#1F2937'
    for (let x = -h; x < w + h; x += 48) {
      g.beginPath()
      g.moveTo(x, h)
      g.lineTo(x + 24, h)
      g.lineTo(x + 24 + h, 0)
      g.lineTo(x + h, 0)
      g.closePath()
      g.fill()
    }
  })
}

function Rocket({ anim }: { anim: LaunchAnim }) {
  const ship = useRef<THREE.Group>(null)
  const flame = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const st = useRef({ y: 0, since: 0, last: anim as LaunchAnim, flame: 0 })
  const reduce = reducedMotion()
  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const t = clock.elapsedTime
    const s = st.current
    if (s.last !== anim) {
      s.last = anim
      s.since = t
    }
    const el = t - s.since
    let targetY = 0
    let fl = 0
    let jx = 0
    let rz = 0
    if (anim === 'count') {
      fl = 0.35 + Math.sin(t * 40) * 0.07
      if (!reduce) jx = Math.sin(t * 52) * 0.012
    } else if (anim === 'lift') {
      targetY = 1.6 + (reduce ? 0 : Math.sin(t * 2.6) * 0.12)
      fl = 1 + Math.sin(t * 30) * 0.08
    } else if (anim === 'blocked') {
      fl = 0.15
      if (el < 2.4 && !reduce) {
        const ph = (el % 1.2) / 1.2
        targetY = ph < 0.3 ? 0.25 * (ph / 0.3) : ph < 0.6 ? 0.25 - 0.13 * ((ph - 0.3) / 0.3) : 0.12 * (1 - (ph - 0.6) / 0.4)
        rz = ph < 0.3 ? -0.035 * (ph / 0.3) : ph < 0.6 ? 0.035 : 0.035 * (1 - (ph - 0.6) / 0.4)
      }
    }
    s.y += (targetY - s.y) * (1 - Math.exp(-(anim === 'lift' ? 1.6 : 6) * dt))
    s.flame += (fl - s.flame) * (1 - Math.exp(-8 * dt))
    if (ship.current) {
      ship.current.position.set(jx, s.y, 0)
      ship.current.rotation.z = rz
    }
    if (flame.current) {
      flame.current.scale.set(0.6 + s.flame * 0.4, Math.max(0.001, s.flame), 0.6 + s.flame * 0.4)
      flame.current.visible = s.flame > 0.02
    }
    if (light.current) light.current.intensity = s.flame * 6
  })
  return (
    <group position={[PAD.x, 0.22, PAD.z]}>
      <group ref={ship}>
        {/* body */}
        <mesh position-y={1.35} castShadow>
          <cylinderGeometry args={[0.36, 0.42, 1.9, 28]} />
          <meshPhysicalMaterial color="#FFFFFF" roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position-y={2.65} castShadow>
          <coneGeometry args={[0.36, 0.75, 28]} />
          <meshPhysicalMaterial color="#FFFFFF" roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
        <mesh position-y={3.0}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <Mat color={ACCENT} />
        </mesh>
        <mesh position-y={1.0}>
          <cylinderGeometry args={[0.405, 0.41, 0.22, 28]} />
          <Mat color={ACCENT} rough={0.4} />
        </mesh>
        {/* window */}
        <mesh position={[0, 1.85, 0.36]}>
          <torusGeometry args={[0.15, 0.03, 8, 20]} />
          <Mat color={ACCENT} />
        </mesh>
        <mesh position={[0, 1.85, 0.355]}>
          <circleGeometry args={[0.14, 20]} />
          <meshStandardMaterial color="#1E2A4A" roughness={0.2} metalness={0.3} />
        </mesh>
        <mesh position={[0.04, 1.89, 0.36]}>
          <circleGeometry args={[0.035, 10]} />
          <meshBasicMaterial color="#9BD7F5" />
        </mesh>
        {/* fins */}
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation-y={(i * Math.PI) / 2 + Math.PI / 4}>
            <mesh position={[0, 0.65, 0.5]} castShadow>
              <boxGeometry args={[0.05, 0.6, 0.32]} />
              <Mat color={ACCENT} rough={0.4} />
            </mesh>
          </group>
        ))}
        {/* nozzle */}
        <mesh position-y={0.28}>
          <cylinderGeometry args={[0.2, 0.3, 0.26, 20]} />
          <Mat color="#94A3B8" metal={0.8} rough={0.3} />
        </mesh>
        <group ref={flame} position-y={0.15} visible={false}>
          <mesh position-y={-0.45} rotation-x={Math.PI}>
            <coneGeometry args={[0.24, 0.9, 18]} />
            <meshStandardMaterial color="#FDBA74" emissive="#FB923C" emissiveIntensity={2} transparent opacity={0.9} toneMapped={false} />
          </mesh>
          <mesh position-y={-0.3} rotation-x={Math.PI}>
            <coneGeometry args={[0.12, 0.55, 14]} />
            <meshStandardMaterial color="#FEF3C7" emissive="#FDE68A" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        </group>
        <pointLight ref={light} position-y={-0.3} color="#FB923C" intensity={0} distance={5} decay={2} />
      </group>
    </group>
  )
}

function Pad({ lift }: { lift: boolean }) {
  const hz = useMemo(() => hazardTex(), [])
  const ring = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (ring.current) ring.current.emissiveIntensity += ((lift ? 1.2 : 0.3) - ring.current.emissiveIntensity) * 0.08
  })
  return (
    <group position={[PAD.x, 0, PAD.z]}>
      <mesh position-y={0.1} castShadow receiveShadow>
        <cylinderGeometry args={[PAD.r, PAD.r + 0.08, 0.2, 40]} />
        <meshStandardMaterial color="#E2E8F0" roughness={0.7} />
      </mesh>
      <mesh position-y={0.1}>
        <cylinderGeometry args={[PAD.r + 0.085, PAD.r + 0.085, 0.12, 40, 1, true]} />
        <meshStandardMaterial map={hz} roughness={0.7} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.205}>
        <ringGeometry args={[0.85, 0.98, 40]} />
        <meshStandardMaterial ref={ring} color={ACCENT} emissive={ACCENT} emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
    </group>
  )
}

const BEACON = { idle: '#64748B', count: '#F59E0B', lift: '#22C55E', blocked: '#EF4444', hold: '#64748B' }

function Gantry({ anim }: { anim: LaunchAnim }) {
  const arm = useRef<THREE.Group>(null)
  const beacon = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (arm.current) arm.current.rotation.y += ((anim === 'lift' ? 1.3 : 0) - arm.current.rotation.y) * 0.04
    if (beacon.current) {
      const c = BEACON[anim]
      beacon.current.color.set(c)
      beacon.current.emissive.set(c)
      beacon.current.emissiveIntensity = anim === 'count' ? 1 + Math.sin(t * 10) : anim === 'idle' || anim === 'hold' ? 0.2 : 1.8
    }
  })
  const H = 3.6
  return (
    <group position={[PAD.x - 1.75, 0, PAD.z - 0.3]}>
      {[
        [-0.25, -0.25],
        [0.25, -0.25],
        [-0.25, 0.25],
        [0.25, 0.25],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, H / 2, z]} castShadow>
          <boxGeometry args={[0.07, H, 0.07]} />
          <Mat color="#94A3B8" metal={0.6} rough={0.35} />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, 0.4 + i * 0.5, 0]} rotation-y={i % 2 ? 0 : Math.PI / 2}>
          <boxGeometry args={[0.55, 0.04, 0.04]} />
          <Mat color="#94A3B8" metal={0.6} rough={0.35} />
        </mesh>
      ))}
      <group ref={arm} position={[0.25, 2.3, 0.3]}>
        <mesh position={[0.55, 0, 0]}>
          <boxGeometry args={[1.1, 0.08, 0.1]} />
          <Mat color="#94A3B8" metal={0.6} rough={0.35} />
        </mesh>
      </group>
      <mesh position-y={H + 0.12}>
        <sphereGeometry args={[0.13, 14, 10]} />
        <meshStandardMaterial ref={beacon} color="#64748B" emissive="#64748B" emissiveIntensity={0.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

const LAMPS = ['#EF4444', '#F59E0B', '#22C55E']

function GoTower({ anim }: { anim: LaunchAnim }) {
  const mats = useMemo(() => LAMPS.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05, toneMapped: false })), [])
  const dim = useMemo(() => LAMPS.map((c) => new THREE.Color(c).multiplyScalar(0.35)), [])
  const full = useMemo(() => LAMPS.map((c) => new THREE.Color(c)), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const active = anim === 'blocked' ? 0 : anim === 'count' ? 1 : anim === 'lift' ? 2 : -1
    mats.forEach((m, i) => {
      const on = i === active
      m.emissiveIntensity = on ? (anim === 'count' ? (Math.sin(t * 8) > 0 ? 2 : 0.15) : 2) : 0.05
      m.color.copy(on ? full[i] : dim[i])
    })
  })
  return (
    <group position={[2.9, 0, -0.4]}>
      <mesh position-y={0.9}>
        <cylinderGeometry args={[0.05, 0.06, 1.8, 10]} />
        <Mat color="#334155" metal={0.4} />
      </mesh>
      <RoundedBox args={[0.42, 1.05, 0.32]} radius={0.06} smoothness={2} position-y={2.15} castShadow>
        <Mat color="#1F2937" rough={0.5} />
      </RoundedBox>
      {mats.map((m, i) => (
        <mesh key={i} position={[0, 2.5 - i * 0.33, 0.165]} material={m}>
          <sphereGeometry args={[0.12, 14, 10]} />
        </mesh>
      ))}
      <mesh position-y={0.03}>
        <cylinderGeometry args={[0.28, 0.3, 0.06, 16]} />
        <Mat color="#334155" />
      </mesh>
    </group>
  )
}

export function LaunchPad() {
  const storeAnim = useGame((s) => s.launchAnim)
  const decision = useGame((s) => s.session?.launch.decision ?? null)
  const busy = useGame((s) => s.busy)
  const talk = talkingFromBusy(busy)
  // When nothing is animating, show the result of the saved decision.
  const anim: LaunchAnim =
    storeAnim !== 'idle'
      ? storeAnim
      : talk.coach
        ? 'count'
        : decision
          ? decision.computed.outcome === 'cleared'
            ? 'lift'
            : decision.computed.outcome === 'blocked'
              ? 'blocked'
              : 'hold'
          : 'idle'
  const floor = useMemo(() => floorTexture('tile', '#EBD9DC'), [])
  const board: BoardData = {
    bars: (decision?.metrics ?? []).map((m) => ({ v: m === 'time_saved' ? 1 : 0.7, color: m === 'time_saved' ? '#22C55E' : ACCENT })),
    busy: talk.coach,
  }
  // North-row layout: counter centred on its people at x -0.8, z -2.45; staff at z -3.35 facing the door.
  useColliders(ID, [
    { id: 'pad', x: PAD.x, z: PAD.z, r: PAD.r + 0.1 },
    { id: 'gantry', x: PAD.x - 1.75, z: PAD.z - 0.3, w: 0.7, d: 0.7 },
    { id: 'tower', x: 2.9, z: -0.4, r: 0.32 },
    { id: 'counter', x: -0.8, z: -2.45, w: 3.4, d: 0.95 },
    { id: 'maya', x: -2.05, z: -3.35, r: 0.32 },
    { id: 'ana', x: 0.45, z: -3.35, r: 0.32 },
    { id: 'desk', x: 5.5, z: -3.2, w: 1.7, d: 0.85 },
  ])
  return (
    <RoomShell id={ID} floor={floor} board={board}>
      <Pad lift={anim === 'lift'} />
      <Rocket anim={anim} />
      <Gantry anim={anim} />
      <GoTower anim={anim} />
      <Counter position={[-0.8, 0, -2.45]} accent={ACCENT} width={3.2} />
      <Person position={[-2.05, 0, -3.35]} rotationY={0} look={MAYA} name="Maya Chen" talking={talk.coach} />
      <Person position={[0.45, 0, -3.35]} rotationY={0} look={ANA} name="Ana" />
      <Desk position={[5.5, 0, -3.2]} />
      <Monitor position={[5.15, 0.765, -3.35]} accent={ACCENT} />
      <Monitor position={[5.85, 0.765, -3.35]} accent={ACCENT} rotationY={-0.15} />
    </RoomShell>
  )
}
