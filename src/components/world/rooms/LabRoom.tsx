'use client'
// Make It Work Lab: the agent drawn as a conveyor test bench, with an independent Grader booth.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BriefcaseBusiness, Check, Clock, FileText, Scale, Search, Sparkles, X } from 'lucide'
import { CORE_TESTS } from '@/lib/catalog'
import { useGame } from '@/store/game'
import { talkingFromBusy } from '../state'
import { KAI, Person, SeatedPerson, lookFromSeed } from '../people'
import { Tag } from '../Tag'
import { AITerminal } from './AITerminal'
import { Desk, Mat, Mug, OfficeChair } from './props'
import { floorTexture, RoomShell, type BoardData } from './RoomShell'
import { canvasTex, reducedMotion, roundRect, useColliders } from './util'
import { strokeIcon, type IconNode } from '../lucide'

const ID = 'lab' as const
const ACCENT = '#D9734A'
const BELT = { x: -0.6, z: -3.5, len: 10.4, w: 0.8, h: 0.62 }
const KIND = {
  tool: { color: '#38BDF8', bg: '#E0F2FE', ink: '#075985', tag: 'TOOL · CODE' },
  ai: { color: '#8B5CF6', bg: '#EDE9FE', ink: '#5B21B6', tag: 'AI MODEL' },
  output: { color: '#94A3B8', bg: '#F1F5F9', ink: '#334155', tag: 'OUTPUT' },
} as const
type Kind = keyof typeof KIND
const STATIONS: { x: number; icon: IconNode; label: string; kind: Kind; key: string }[] = [
  { x: -4.6, icon: Search, label: 'Find jobs', kind: 'tool', key: 'search' },
  { x: -2.6, icon: BriefcaseBusiness, label: 'Requirements', kind: 'tool', key: 'prereq' },
  { x: -0.6, icon: Clock, label: 'Hours & place', kind: 'tool', key: 'schedule' },
  { x: 1.6, icon: Sparkles, label: 'Picks a job', kind: 'ai', key: 'ai' },
  { x: 3.6, icon: FileText, label: 'Draft', kind: 'output', key: 'output' },
]
const FILE_COLS = ['#F59E0B', '#EC4899', '#10B981', '#6366F1', '#F97316']
const APPLICANT_X = [-6.6, -5.65, -4.7, -3.75, -2.8]

function signTex(s: (typeof STATIONS)[number], ghost: boolean) {
  const k = KIND[s.kind]
  return canvasTex(`lab:sign:${s.key}:${ghost}`, 320, 150, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    roundRect(g, 4, 4, w - 8, h - 8, 22)
    g.fillStyle = ghost ? 'rgba(241,245,249,0.85)' : '#FFFFFF'
    g.fill()
    if (!ghost) {
      roundRect(g, 4, 92, w - 8, h - 96, 0)
      g.fillStyle = k.bg
      g.fill()
    }
    g.lineWidth = 5
    g.strokeStyle = ghost ? '#94A3B8' : k.color
    if (ghost) g.setLineDash([14, 10])
    g.stroke()
    g.setLineDash([])
    g.textBaseline = 'middle'
    g.globalAlpha = ghost ? 0.45 : 1
    strokeIcon(g, s.icon, 24, 38, 44, ghost ? '#64748B' : k.color, 2.2)
    g.fillStyle = ghost ? '#64748B' : k.ink
    g.font = '800 34px system-ui, sans-serif'
    g.fillText(s.label, 86, 60, w - 100)
    g.font = '900 24px system-ui, sans-serif'
    g.fillStyle = ghost ? '#94A3B8' : k.ink
    g.fillText(ghost ? 'NOT BUILT YET' : k.tag, 24, 116)
    g.globalAlpha = 1
  })
}

function beltTex() {
  const t = canvasTex(
    'lab:belt',
    256,
    64,
    (g, w, h) => {
      g.fillStyle = '#1F2937'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#374151'
      for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 10, h)
    },
    { repeat: [12, 1] },
  )
  return t
}

function Station({ s, ghost, running, index }: { s: (typeof STATIONS)[number]; ghost: boolean; running: boolean; index: number }) {
  const k = KIND[s.kind]
  const color = ghost ? '#94A3B8' : k.color
  const strip = useRef<THREE.MeshStandardMaterial>(null)
  const scanner = useRef<THREE.Mesh>(null)
  const tex = useMemo(() => signTex(s, ghost), [s, ghost])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (strip.current) strip.current.emissiveIntensity = running && !ghost ? 1.2 + Math.sin(t * 6 - index * 0.9) * 0.9 : ghost ? 0 : 0.5
    if (scanner.current) {
      scanner.current.visible = running && !ghost && s.kind === 'tool'
      scanner.current.position.y = 0.95 + Math.sin(t * 4 + index) * 0.25
    }
  })
  const op = ghost ? 0.35 : 1
  const mat = <meshStandardMaterial color={color} roughness={0.4} transparent={ghost} opacity={op} depthWrite={!ghost} />
  const H = 1.9
  const halfZ = 0.68
  return (
    <group position={[s.x, 0, BELT.z]}>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[0, H / 2, sd * halfZ]} castShadow={!ghost}>
          <boxGeometry args={[0.14, H, 0.14]} />
          {mat}
        </mesh>
      ))}
      <mesh position={[0, H, 0]} castShadow={!ghost}>
        <boxGeometry args={[0.24, 0.16, halfZ * 2 + 0.14]} />
        {mat}
      </mesh>
      <mesh position={[0.125, H, 0]}>
        <boxGeometry args={[0.02, 0.06, halfZ * 2]} />
        <meshStandardMaterial ref={strip} color={color} emissive={color} emissiveIntensity={0.5} toneMapped={false} transparent={ghost} opacity={op} />
      </mesh>
      <mesh ref={scanner} position={[0, 1, 0]} visible={false}>
        <boxGeometry args={[0.03, 0.03, halfZ * 2 - 0.1]} />
        <meshBasicMaterial color="#38BDF8" toneMapped={false} />
      </mesh>
      {/* sign card standing on the lintel, facing the door */}
      <mesh position={[0, H + 0.5, 0.1]}>
        <planeGeometry args={[1.5, 0.7]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function RidingFiles({ running }: { running: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const reduce = reducedMotion()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const start = BELT.x - BELT.len / 2 + 0.3
    const end = BELT.x + BELT.len / 2 - 0.3
    refs.current.forEach((g, i) => {
      if (!g) return
      g.visible = running
      if (!running) return
      const ph = reduce ? i / 5 : ((t * 0.16 + i / 5) % 1 + 1) % 1
      g.position.set(start + (end - start) * ph, BELT.h + 0.05, BELT.z)
      g.rotation.y = 0.15 * Math.sin(i)
    })
  })
  return (
    <group>
      {FILE_COLS.map((c, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)} visible={false}>
          <mesh>
            <boxGeometry args={[0.42, 0.04, 0.32]} />
            <Mat color={c} />
          </mesh>
          <mesh position={[0.02, 0.025, 0]}>
            <boxGeometry args={[0.34, 0.01, 0.26]} />
            <Mat color="#FFFBEF" rough={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Belt({ running }: { running: boolean }) {
  const tex = useMemo(() => beltTex(), [])
  useFrame((_, dt) => {
    if (running && !reducedMotion()) tex.offset.x -= dt * 0.35
  })
  const rollers = useMemo(() => Array.from({ length: 14 }, (_, i) => BELT.x - BELT.len / 2 + 0.4 + (i * (BELT.len - 0.8)) / 13), [])
  return (
    <group>
      {/* painted lane */}
      <mesh rotation-x={-Math.PI / 2} position={[BELT.x, 0.012, BELT.z]}>
        <planeGeometry args={[BELT.len + 0.6, 1.5]} />
        <meshStandardMaterial color={ACCENT} roughness={0.9} transparent opacity={0.55} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {/* frame */}
      <RoundedBox args={[BELT.len, 0.2, BELT.w + 0.12]} radius={0.05} smoothness={2} position={[BELT.x, BELT.h - 0.12, BELT.z]} castShadow receiveShadow>
        <Mat color="#E2E8F0" rough={0.5} />
      </RoundedBox>
      {Array.from({ length: 6 }, (_, i) => BELT.x - BELT.len / 2 + 0.3 + (i * (BELT.len - 0.6)) / 5).map((x) =>
        [-1, 1].map((s) => (
          <mesh key={`${x}${s}`} position={[x, (BELT.h - 0.2) / 2, BELT.z + s * 0.38]}>
            <boxGeometry args={[0.08, BELT.h - 0.2, 0.08]} />
            <Mat color="#CBD5E1" rough={0.5} />
          </mesh>
        )),
      )}
      {rollers.map((x) => (
        <mesh key={x} position={[x, BELT.h - 0.03, BELT.z + BELT.w / 2 + 0.02]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 10]} />
          <Mat color="#94A3B8" metal={0.5} rough={0.35} />
        </mesh>
      ))}
      <mesh position={[BELT.x, BELT.h + 0.005, BELT.z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[BELT.len - 0.1, BELT.w]} />
        <meshStandardMaterial map={tex} roughness={0.7} />
      </mesh>
    </group>
  )
}

const GRADER = { x: 6.35, z: -3.5 }

/** The grader's screen: one row per test applicant with a pass / fail / waiting pill. */
function graderScreenTex(verdicts: (boolean | null)[]) {
  const key = verdicts.map((v) => (v === null ? '-' : v ? 'y' : 'n')).join('')
  return canvasTex(`lab:grader:${key}`, 512, 360, (g, w, h) => {
    g.fillStyle = '#0F172A'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#E2E8F0'
    g.font = '800 38px system-ui, sans-serif'
    g.textBaseline = 'middle'
    strokeIcon(g, Scale, 24, 24, 36, '#E2E8F0', 2.4)
    g.fillText('Grader', 70, 42)
    CORE_TESTS.forEach((t, i) => {
      const y = 82 + i * 55
      const v = verdicts[i]
      roundRect(g, 20, y, w - 40, 47, 12)
      g.fillStyle = '#1E293B'
      g.fill()
      g.fillStyle = '#F1F5F9'
      g.font = '700 28px system-ui, sans-serif'
      g.fillText(t.name, 40, y + 24)
      const label = v === null ? '…' : v ? 'pass' : 'fail'
      const bg = v === null ? '#334155' : v ? '#16A34A' : '#DC2626'
      roundRect(g, w - 176, y + 6, 140, 35, 17)
      g.fillStyle = bg
      g.fill()
      g.fillStyle = '#FFFFFF'
      g.font = '800 23px system-ui, sans-serif'
      if (v === null) {
        g.textAlign = 'center'
        g.fillText(label, w - 106, y + 24)
        g.textAlign = 'left'
      } else {
        strokeIcon(g, v ? Check : X, w - 150, y + 12, 23, '#FFFFFF', 3.2)
        g.fillText(label, w - 118, y + 24)
      }
    })
  })
}

function Grader({ verdicts }: { verdicts: (boolean | null)[] }) {
  const tex = graderScreenTex(verdicts)
  const H = 0.9
  return (
    <group position={[GRADER.x, 0, GRADER.z]}>
      {/* cabinet */}
      <RoundedBox args={[1.5, H, 1.1]} radius={0.08} smoothness={2} position-y={H / 2} castShadow receiveShadow>
        <Mat color="#F8FAFC" rough={0.45} />
      </RoundedBox>
      <mesh position={[0, H - 0.08, 0.556]}>
        <boxGeometry args={[1.36, 0.05, 0.01]} />
        <meshStandardMaterial color="#475569" roughness={0.5} />
      </mesh>
      {/* inlet slot where answers arrive from the belt */}
      <mesh position={[-0.751, BELT.h + 0.02, 0]}>
        <boxGeometry args={[0.01, 0.14, 0.62]} />
        <meshStandardMaterial color="#1E293B" />
      </mesh>
      {/* verdict lamps along the front */}
      {verdicts.map((v, i) => {
        const c = v === null ? '#CBD5E1' : v ? '#22C55E' : '#EF4444'
        return (
          <mesh key={i} position={[-0.5 + i * 0.25, 0.42, 0.556]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.07, 0.07, 0.03, 18]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={v === null ? 0.05 : 1.4} toneMapped={false} />
          </mesh>
        )
      })}
      {/* angled screen facing the room */}
      <group position={[0, H + 0.42, -0.12]} rotation-x={-0.28}>
        <RoundedBox args={[1.34, 0.96, 0.06]} radius={0.03} smoothness={2} castShadow>
          <Mat color="#334155" rough={0.5} />
        </RoundedBox>
        <mesh position-z={0.032}>
          <planeGeometry args={[1.24, 0.86]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, H + 0.05, -0.2]}>
        <boxGeometry args={[0.14, 0.12, 0.08]} />
        <Mat color="#475569" />
      </mesh>
      <Tag kind="lab" icon={Scale} text="Grader · plain code" accent="#64748B" position={[0, 2.1, 0]} />
    </group>
  )
}

/** Short sloped tray carrying answers off the end of the belt into the grader. */
function Chute() {
  const x0 = BELT.x + BELT.len / 2
  const x1 = GRADER.x - 0.75
  const len = x1 - x0 + 0.1
  return (
    <group position={[(x0 + x1) / 2, BELT.h - 0.02, BELT.z]} rotation-z={-0.08}>
      <mesh receiveShadow>
        <boxGeometry args={[len, 0.03, 0.62]} />
        <Mat color="#CBD5E1" metal={0.4} rough={0.35} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[0, 0.06, sd * 0.31]}>
          <boxGeometry args={[len, 0.12, 0.025]} />
          <Mat color="#94A3B8" metal={0.4} rough={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/** Faint arrows painted along the lane in front of the belt: applicants flow left to right. */
function FlowArrows() {
  const xs = useMemo(() => [-3.6, -1.6, 0.5, 2.6, 4.7], [])
  return (
    <group>
      {xs.map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.018, BELT.z + 1.02]}>
          <circleGeometry args={[0.16, 3]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Laptop with the screen facing its user (local -z). */
function Laptop({ position, running }: { position: [number, number, number]; running: boolean }) {
  const screen = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (screen.current) screen.current.color.set(running && Math.sin(clock.elapsedTime * 5) > 0 ? '#C4B5FD' : '#A78BFA')
  })
  return (
    <group position={position}>
      <RoundedBox args={[0.42, 0.02, 0.3]} radius={0.008} smoothness={2} position-y={0.01}>
        <Mat color="#CBD5E1" metal={0.5} rough={0.35} />
      </RoundedBox>
      <group position={[0, 0.02, 0.14]} rotation-x={-0.25}>
        <RoundedBox args={[0.42, 0.28, 0.015]} radius={0.008} smoothness={2} position-y={0.14}>
          <Mat color="#CBD5E1" metal={0.5} rough={0.35} />
        </RoundedBox>
        <mesh position={[0, 0.14, -0.009]} rotation-y={Math.PI}>
          <planeGeometry args={[0.38, 0.24]} />
          <meshBasicMaterial ref={screen} color="#A78BFA" toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

const KAI_DESK = { x: 4.3, z: -0.55 }

/** Kai at her desk, facing into the room, watching the test runs. */
function KaiDesk({ running, talking }: { running: boolean; talking: boolean }) {
  return (
    <group position={[KAI_DESK.x, 0, KAI_DESK.z]}>
      <Desk position={[0, 0, 0]} width={1.3} depth={0.66} />
      <Laptop position={[0.05, 0.765, -0.06]} running={running} />
      <Mug position={[0.45, 0.765, 0.05]} color={ACCENT} />
      <OfficeChair position={[0, 0, -0.75]} color="#475569" />
      <SeatedPerson position={[0, 0, -0.72]} look={KAI} pose={talking ? 'talking' : 'typing'} talking={talking} name="Kai · built the agent" />
    </group>
  )
}

function Plinth({ running, version }: { running: boolean; version: string }) {
  const h = BELT.h + 0.2
  return (
    <group position={[1.6, 0, -4.5]}>
      <RoundedBox args={[1.1, h, 0.6]} radius={0.05} smoothness={2} position-y={h / 2} castShadow receiveShadow>
        <Mat color="#8B5CF6" rough={0.45} />
      </RoundedBox>
      <mesh position={[0, h + 0.18, 0]}>
        <boxGeometry args={[0.08, 0.36, 0.06]} />
        <Mat color="#1F2430" />
      </mesh>
      <AITerminal position={[0, h + 0.7, 0]} running={running} scale={0.95} />
      <Tag kind="lab" text={`Kai’s agent ${version}`} accent="#8B5CF6" position={[0, 2.95 - 0, 0]} />
    </group>
  )
}

export function LabRoom() {
  const runs = useGame((s) => s.session?.lab.runs ?? [])
  const labRunning = useGame((s) => s.labRunning)
  const busy = useGame((s) => s.busy)
  const talk = talkingFromBusy(busy)
  const running = labRunning || talk.kai
  const built = runs.some((r) => r.scheduleFilter)
  const last = runs[runs.length - 1]
  const verdicts = CORE_TESTS.map((t) => {
    const r = last?.results.find((x) => x.applicantId === t.id)
    return r ? r.pass : null
  })
  const floor = useMemo(() => floorTexture('concrete', '#C9C6C2'), [])
  const lastTwo = runs.slice(-2)
  const board: BoardData = {
    bars: lastTwo.map((r) => ({ v: r.coreScore / 5, color: r.coreScore === 5 ? '#22C55E' : '#F59E0B' })),
    dots: lastTwo.flatMap((r) => r.results.filter((x) => !x.custom).map((x) => (x.pass ? '#22C55E' : '#EF4444'))),
    busy: running,
  }
  const looks = useMemo(() => CORE_TESTS.map((_, i) => ({ ...lookFromSeed(200 + i * 17), top: FILE_COLS[i] })), [])
  useColliders(ID, [
    { id: 'belt', x: BELT.x, z: BELT.z, w: BELT.len + 0.2, d: 1.5 },
    { id: 'plinth', x: 1.6, z: -4.5, w: 1.2, d: 0.7 },
    { id: 'grader', x: GRADER.x, z: GRADER.z, w: 1.6, d: 1.2 },
    { id: 'kai-desk', x: KAI_DESK.x, z: KAI_DESK.z - 0.3, w: 1.4, d: 1.4 },
    ...APPLICANT_X.map((x, i) => ({ id: `app-${i}`, x, z: -1.6, r: 0.3 })),
  ])
  return (
    <RoomShell id={ID} floor={floor} board={board}>
      <Belt running={running} />
      {STATIONS.map((s, i) => (
        <Station key={s.key} s={s} ghost={s.key === 'schedule' && !built} running={running} index={i} />
      ))}
      <RidingFiles running={running} />
      <Plinth running={running} version={built ? 'v2' : 'v1'} />
      <Chute />
      <FlowArrows />
      <Grader verdicts={verdicts} />
      <KaiDesk running={running} talking={talk.kai} />
      {CORE_TESTS.map((t, i) => {
        const v = verdicts[i]
        const x = APPLICANT_X[i]
        const face = Math.atan2(-5.6 - x, -3.5 - -1.6)
        return (
          <Person
            key={t.id}
            position={[x, 0, -1.6]}
            rotationY={face}
            look={looks[i]}
            name={t.name}
            tagExtra={v === null ? '' : v ? 'pass' : 'fail'}
            tagIcon={v === null ? undefined : v ? Check : X}
          />
        )
      })}
    </RoomShell>
  )
}
