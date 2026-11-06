'use client'
// Make It Work Lab: the agent drawn as a conveyor test bench, with an independent Grader booth.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CORE_TESTS } from '@/lib/catalog'
import { useGame } from '@/store/game'
import { talkingFromBusy } from '../state'
import { KAI, Person, lookFromSeed } from '../people'
import { Tag } from '../Tag'
import { AITerminal } from './AITerminal'
import { Mat } from './props'
import { floorTexture, RoomShell, type BoardData } from './RoomShell'
import { canvasTex, reducedMotion, roundRect, useColliders } from './util'

const ID = 'lab' as const
const ACCENT = '#D9734A'
const BELT = { x: -0.6, z: -3.5, len: 10.4, w: 0.8, h: 0.62 }
const KIND = {
  tool: { color: '#38BDF8', bg: '#E0F2FE', ink: '#075985', tag: 'TOOL · CODE' },
  ai: { color: '#8B5CF6', bg: '#EDE9FE', ink: '#5B21B6', tag: 'AI MODEL' },
  output: { color: '#94A3B8', bg: '#F1F5F9', ink: '#334155', tag: 'OUTPUT' },
} as const
type Kind = keyof typeof KIND
const STATIONS: { x: number; icon: string; label: string; kind: Kind; key: string }[] = [
  { x: -4.6, icon: '🔎', label: 'Find programs', kind: 'tool', key: 'search' },
  { x: -2.6, icon: '🎓', label: 'Prerequisites', kind: 'tool', key: 'prereq' },
  { x: -0.6, icon: '🕒', label: 'Schedule', kind: 'tool', key: 'schedule' },
  { x: 1.6, icon: '✨', label: 'AI model', kind: 'ai', key: 'ai' },
  { x: 3.6, icon: '📝', label: 'Recommendation', kind: 'output', key: 'output' },
]
const FILE_COLS = ['#F59E0B', '#EC4899', '#10B981', '#6366F1', '#F97316']
const APPLICANT_X = [-6.6, -5.65, -4.7, -3.75, -2.8]

function signTex(s: (typeof STATIONS)[number], ghost: boolean) {
  const k = KIND[s.kind]
  return canvasTex(`lab:sign:${s.key}:${ghost}`, 320, 150, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    roundRect(g, 4, 4, w - 8, h - 8, 22)
    g.fillStyle = ghost ? 'rgba(241,245,249,0.85)' : k.bg
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = ghost ? '#94A3B8' : k.color
    if (ghost) g.setLineDash([14, 10])
    g.stroke()
    g.setLineDash([])
    g.font = '48px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
    g.textBaseline = 'middle'
    g.globalAlpha = ghost ? 0.45 : 1
    g.fillText(s.icon, 22, 60)
    g.fillStyle = ghost ? '#64748B' : k.ink
    g.font = '800 30px system-ui, sans-serif'
    g.fillText(s.label, 86, 60, w - 100)
    g.font = '800 19px system-ui, sans-serif'
    g.fillStyle = ghost ? '#94A3B8' : k.color
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

function Grader({ verdicts }: { verdicts: (boolean | null)[] }) {
  return (
    <group position={[6.25, 0, -3.5]}>
      <RoundedBox args={[1.9, 1.0, 1.3]} radius={0.08} smoothness={2} position-y={0.5} castShadow receiveShadow>
        <Mat color="#F1F5F9" rough={0.5} />
      </RoundedBox>
      <RoundedBox args={[1.96, 0.08, 1.36]} radius={0.03} smoothness={2} position-y={1.02}>
        <Mat color="#475569" rough={0.5} />
      </RoundedBox>
      {/* balance scale */}
      <group position={[0, 1.06, -0.15]}>
        <mesh position-y={0.35}>
          <cylinderGeometry args={[0.03, 0.04, 0.7, 8]} />
          <Mat color="#C9A34E" metal={0.7} rough={0.3} />
        </mesh>
        <mesh position-y={0.7} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
          <Mat color="#C9A34E" metal={0.7} rough={0.3} />
        </mesh>
        {[-0.42, 0.42].map((x) => (
          <group key={x} position={[x, 0.5, 0]}>
            <mesh position-y={0.1}>
              <cylinderGeometry args={[0.006, 0.006, 0.2, 4]} />
              <Mat color="#C9A34E" metal={0.7} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.14, 0.1, 0.03, 16]} />
              <Mat color="#C9A34E" metal={0.7} rough={0.3} />
            </mesh>
          </group>
        ))}
      </group>
      {/* verdict lamps on the front face */}
      {verdicts.map((v, i) => {
        const c = v === null ? '#CBD5E1' : v ? '#22C55E' : '#EF4444'
        return (
          <mesh key={i} position={[-0.6 + i * 0.3, 0.62, 0.66]}>
            <sphereGeometry args={[0.085, 14, 10]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={v === null ? 0.05 : 1.6} toneMapped={false} />
          </mesh>
        )
      })}
      <Tag kind="lab" text="⚖️ Grader · CODE · NOT THE AGENT" accent="#475569" position={[0, 2.2, 0]} />
    </group>
  )
}

function DashedPath() {
  const dashes = useMemo(() => Array.from({ length: 6 }, (_, i) => 4.75 + i * 0.16), [])
  return (
    <group>
      {dashes.map((x) => (
        <mesh key={x} rotation-x={-Math.PI / 2} position={[x, 0.016, BELT.z]}>
          <planeGeometry args={[0.09, 0.12]} />
          <meshBasicMaterial color="#475569" />
        </mesh>
      ))}
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
    { id: 'grader', x: 6.25, z: -3.5, w: 2.0, d: 1.4 },
    { id: 'kai', x: 4.7, z: -1.5, r: 0.35 },
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
      <DashedPath />
      <Grader verdicts={verdicts} />
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
            tagIcon={v === null ? undefined : <span>{v ? '✓' : '✕'}</span>}
          />
        )
      })}
      <Person position={[4.7, 0, -1.5]} rotationY={Math.atan2(2.6 - 4.7, -3.5 - -1.5)} look={KAI} name="Kai · built it" talking={talk.kai} />
    </RoomShell>
  )
}
