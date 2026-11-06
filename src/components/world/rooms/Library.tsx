'use client'
// Skills Report: a library. Five skill books on lecterns glow by status; the letterpress prints the report.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BOOK_COLOR, STATUS_META } from '@/lib/report'
import type { SkillKey, SkillStatus } from '@/lib/types'
import { useGame } from '@/store/game'
import { talkingFromBusy } from '../state'
import { Tag } from '../Tag'
import { Mat, OfficeChair } from './props'
import { floorTexture, RoomShell, type BoardData } from './RoomShell'
import { canvasTex, mulberry32, reducedMotion, useColliders } from './util'

const ID = 'report' as const
const ACCENT = '#B7821A'
const WOOD = '#8A5A3B'
const SPINES = ['#7C2D12', '#1E3A8A', '#14532D', '#7F1D1D', '#78350F', '#312E81', '#0F766E', '#9A3412', '#3F6212', '#831843', '#E7D7B5', '#B45309', '#475569']
const SKILL_ORDER: SkillKey[] = ['discovery', 'constraints', 'evaluating', 'reliability', 'deployment']
const LECTERN_ANGLES = [-62, -31, 0, 31, 62]
const ARC = { x: -0.8, z: -2.45, r: 3.4 }

type Shelf = { x: number; z: number; w: number; h: number; d: number; rot: number; shelves: number }
const SHELVES: Shelf[] = [
  { x: -4.95, z: -5.58 + 0.25, w: 5.5, h: 3.3, d: 0.5, rot: 0, shelves: 6 },
  { x: 4.95, z: -5.58 + 0.25, w: 5.5, h: 3.3, d: 0.5, rot: 0, shelves: 6 },
  { x: 7.6, z: 1.2, w: 4.2, h: 1.25, d: 0.5, rot: -Math.PI / 2, shelves: 2 },
]

function ShelfCarcass({ s }: { s: Shelf }) {
  const step = s.h / s.shelves
  return (
    <group position={[s.x, 0, s.z]} rotation-y={s.rot}>
      <mesh position={[0, s.h / 2, -s.d / 2 + 0.02]} receiveShadow>
        <boxGeometry args={[s.w, s.h, 0.04]} />
        <Mat color={WOOD} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (s.w / 2 - 0.03), s.h / 2, 0]} castShadow>
          <boxGeometry args={[0.06, s.h, s.d]} />
          <Mat color={WOOD} />
        </mesh>
      ))}
      {Array.from({ length: s.shelves + 1 }, (_, i) => (
        <mesh key={i} position={[0, i * step + 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[s.w, 0.04, s.d]} />
          <Mat color={WOOD} />
        </mesh>
      ))}
    </group>
  )
}

/** Hundreds of instanced spines across all shelves. */
function Books() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const items = useMemo(() => {
    const r = mulberry32(77)
    const out: { m: THREE.Matrix4; c: string }[] = []
    const d = new THREE.Object3D()
    const parent = new THREE.Object3D()
    for (const s of SHELVES) {
      parent.position.set(s.x, 0, s.z)
      parent.rotation.set(0, s.rot, 0)
      parent.updateMatrix()
      const step = s.h / s.shelves
      for (let k = 0; k < s.shelves; k++) {
        let x = -s.w / 2 + 0.08
        while (x < s.w / 2 - 0.12) {
          const w = 0.035 + r() * 0.045
          const h = Math.min(step - 0.08, 0.22 + r() * 0.16)
          const tilt = r() > 0.92 ? (r() - 0.5) * 0.35 : 0
          if (r() > 0.04) {
            d.position.set(x + w / 2, k * step + 0.04 + h / 2, 0.02)
            d.rotation.set(0, 0, tilt)
            d.scale.set(w, h, s.d * 0.78)
            d.updateMatrix()
            out.push({ m: new THREE.Matrix4().multiplyMatrices(parent.matrix, d.matrix), c: SPINES[Math.floor(r() * SPINES.length)] })
          }
          x += w + 0.004 + (tilt ? 0.03 : 0)
        }
      }
    }
    return out
  }, [])
  useLayoutEffect(() => {
    const c = new THREE.Color()
    items.forEach((it, i) => {
      ref.current!.setMatrixAt(i, it.m)
      ref.current!.setColorAt(i, c.set(it.c))
    })
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.8} />
    </instancedMesh>
  )
}

function Ladder() {
  return (
    <group position={[-2.6, 0, -4.9]} rotation-x={-0.2}>
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]} castShadow>
          <boxGeometry args={[0.05, 3.3, 0.06]} />
          <Mat color="#A0703F" />
        </mesh>
      ))}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0, 0.3 + i * 0.35, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
          <Mat color="#A0703F" />
        </mesh>
      ))}
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
          <Mat color="#2A2A2E" />
        </mesh>
      ))}
    </group>
  )
}

function BankersLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position-y={0.02}>
        <cylinderGeometry args={[0.09, 0.1, 0.03, 14]} />
        <Mat color="#C9A34E" metal={0.7} rough={0.3} />
      </mesh>
      <mesh position-y={0.17}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
        <Mat color="#C9A34E" metal={0.7} rough={0.3} />
      </mesh>
      <mesh position-y={0.34} rotation-z={Math.PI / 2} scale={[1, 1, 0.55]}>
        <cylinderGeometry args={[0.1, 0.1, 0.32, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#166534" roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.31}>
        <capsuleGeometry args={[0.03, 0.16, 4, 8]} />
        <meshStandardMaterial color="#FEF3C7" emissive="#FCD34D" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight position-y={0.25} color="#FFD58A" intensity={2.2} distance={3} decay={2} />
    </group>
  )
}

function ReadingTable() {
  return (
    <group position={[5.2, 0, -2.6]}>
      <RoundedBox args={[2.4, 0.07, 1.1]} radius={0.03} smoothness={2} position-y={0.76} castShadow receiveShadow>
        <Mat color="#6B4226" rough={0.5} />
      </RoundedBox>
      {[
        [-1.1, -0.45],
        [1.1, -0.45],
        [-1.1, 0.45],
        [1.1, 0.45],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z]}>
          <boxGeometry args={[0.07, 0.76, 0.07]} />
          <Mat color="#5A3720" />
        </mesh>
      ))}
      <BankersLamp position={[-0.7, 0.8, -0.25]} />
      <BankersLamp position={[0.7, 0.8, -0.25]} />
      {/* open book */}
      <group position={[0, 0.8, 0.15]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.13, 0.012, 0]} rotation-z={s * -0.08}>
            <boxGeometry args={[0.26, 0.02, 0.34]} />
            <Mat color="#FFFDF7" rough={0.9} />
          </mesh>
        ))}
      </group>
      {['#1E3A8A', '#7C2D12', '#14532D'].map((c, i) => (
        <mesh key={c} position={[0.85, 0.82 + i * 0.05, 0.2]} rotation-y={i * 0.25}>
          <boxGeometry args={[0.32, 0.05, 0.24]} />
          <Mat color={c} />
        </mesh>
      ))}
      <OfficeChair position={[-0.6, 0, 0.85]} rotationY={Math.PI} color="#7F1D1D" />
      <OfficeChair position={[0.6, 0, 0.85]} rotationY={Math.PI} color="#7F1D1D" />
    </group>
  )
}

function Rug() {
  return (
    <group position={[ARC.x, 0, -0.6]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.011} receiveShadow>
        <circleGeometry args={[3.0, 56]} />
        <Mat color="#7F1D1D" rough={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.013}>
        <ringGeometry args={[2.72, 2.85, 56]} />
        <Mat color="#D9A23B" rough={1} />
      </mesh>
    </group>
  )
}

const GOLD = new THREE.Color('#FCD34D')

function Lectern({ index, status, writing }: { index: number; status: SkillStatus; writing: boolean }) {
  const a = (LECTERN_ANGLES[index] * Math.PI) / 180
  const x = ARC.x + Math.sin(a) * ARC.r
  const z = ARC.z + Math.cos(a) * ARC.r
  const base = useMemo(() => new THREE.Color(BOOK_COLOR[status]), [status])
  const pageMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.6, toneMapped: false }), [])
  const halo = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const haloTex = useMemo(
    () =>
      canvasTex('glow:white', 64, 64, (g) => {
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
        grd.addColorStop(0, 'rgba(255,255,255,0.9)')
        grd.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = grd
        g.fillRect(0, 0, 64, 64)
      }),
    [],
  )
  const glow = STATUS_META[status].glow
  const reduce = reducedMotion()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    let col = base
    let g = glow
    if (writing) {
      const ph = (t * 1.2 - index * 0.45) % 2.25
      const on = ph >= 0 && ph < 0.9
      col = on ? GOLD : base
      g = on ? 2.4 : 0.3
    } else if (!reduce) g = glow * (0.9 + Math.sin(t * 1.6 + index) * 0.1)
    pageMat.color.copy(col)
    pageMat.emissive.copy(col)
    pageMat.emissiveIntensity = g * 0.6
    if (halo.current) {
      const m = halo.current.material as THREE.SpriteMaterial
      m.color.copy(col)
      m.opacity = Math.min(0.9, g * 0.28)
    }
    if (light.current) {
      light.current.color.copy(col)
      light.current.intensity = g * 0.9
    }
  })
  return (
    <group position={[x, 0, z]} rotation-y={a}>
      <mesh position-y={0.04}>
        <cylinderGeometry args={[0.26, 0.3, 0.06, 16]} />
        <Mat color="#5A3720" />
      </mesh>
      <mesh position-y={0.55} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 1.0, 10]} />
        <Mat color="#6B4226" />
      </mesh>
      <group position-y={1.08} rotation-x={-0.45}>
        <RoundedBox args={[0.6, 0.06, 0.44]} radius={0.02} smoothness={2} castShadow>
          <Mat color="#6B4226" />
        </RoundedBox>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.13, 0.045, 0]} rotation-z={s * -0.1} material={pageMat}>
            <boxGeometry args={[0.25, 0.025, 0.34]} />
          </mesh>
        ))}
      </group>
      <sprite ref={halo} position={[0, 1.2, 0]} scale={1.1}>
        <spriteMaterial map={haloTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.3} />
      </sprite>
      <pointLight ref={light} position={[0, 1.45, 0.15]} distance={2.4} decay={2} intensity={glow} />
    </group>
  )
}

function Cart({ goldBooks }: { goldBooks: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 0.9 + Math.sin(clock.elapsedTime * 2.2) * 0.4
  })
  return (
    <group position={[-4.6, 0, 3.6]} rotation-y={0.35}>
      {[0.25, 0.7].map((y) => (
        <RoundedBox key={y} args={[1.2, 0.05, 0.5]} radius={0.02} smoothness={2} position-y={y} castShadow>
          <Mat color={WOOD} />
        </RoundedBox>
      ))}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.05, 0.9, 0.5]} />
          <Mat color={WOOD} />
        </mesh>
      ))}
      {[
        [-0.45, -0.2],
        [0.45, -0.2],
        [-0.45, 0.2],
        [0.45, 0.2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.06, z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 10]} />
          <Mat color="#2A2A2E" />
        </mesh>
      ))}
      {SPINES.slice(0, 9).map((c, i) => (
        <mesh key={c} position={[-0.48 + i * 0.11, 0.42, 0]}>
          <boxGeometry args={[0.08, 0.3, 0.32]} />
          <Mat color={c} />
        </mesh>
      ))}
      {Array.from({ length: goldBooks }, (_, i) => (
        <mesh key={i} position={[-0.35 + i * 0.35, 0.86, 0]} rotation-z={0.06 * (i - 1)}>
          <boxGeometry args={[0.1, 0.3, 0.3]} />
          <meshStandardMaterial ref={i === 0 ? mat : undefined} color="#F59E0B" emissive="#FBBF24" emissiveIntensity={1} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Letterpress Report Writer on the circulation desk. */
function ReportPress({ writing }: { writing: boolean }) {
  const sheet = useRef<THREE.Group>(null)
  const lamp = useRef<THREE.MeshStandardMaterial>(null)
  const paper = useMemo(
    () =>
      canvasTex('press:paper', 128, 160, (g, w, h) => {
        g.fillStyle = '#FFFDF7'
        g.fillRect(0, 0, w, h)
        for (let i = 0; i < 9; i++) {
          g.fillStyle = i === 0 ? ACCENT : 'rgba(60,40,20,0.35)'
          g.fillRect(14, 18 + i * 15, i === 0 ? 70 : 100 - (i % 3) * 18, i === 0 ? 7 : 4)
        }
      }),
    [],
  )
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (sheet.current) {
      const target = writing ? ((t * 0.25) % 1) * 0.32 : 0.32
      sheet.current.position.y += (target - sheet.current.position.y) * Math.min(1, dt * 6)
    }
    if (lamp.current) lamp.current.emissiveIntensity = writing ? 1.4 + Math.sin(t * 6) : 0.4
  })
  return (
    <group position={[0, 1.05, -0.05]}>
      <RoundedBox args={[0.7, 0.12, 0.5]} radius={0.03} smoothness={2} position-y={0.06} castShadow>
        <Mat color="#2B2F36" metal={0.6} rough={0.45} />
      </RoundedBox>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.32, -0.1]} castShadow>
          <boxGeometry args={[0.07, 0.45, 0.12]} />
          <Mat color="#2B2F36" metal={0.6} rough={0.45} />
        </mesh>
      ))}
      <mesh position={[0, 0.56, -0.1]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.07, 0.62, 16]} />
        <Mat color="#C9A34E" metal={0.8} rough={0.25} />
      </mesh>
      <mesh position={[0.36, 0.56, -0.1]}>
        <torusGeometry args={[0.1, 0.015, 6, 16]} />
        <Mat color="#C9A34E" metal={0.8} rough={0.25} />
      </mesh>
      {/* keys */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.2 + i * 0.08, 0.135, 0.17]}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 10]} />
          <Mat color="#E7D7B5" />
        </mesh>
      ))}
      <group position={[0, 0.13, -0.05]}>
        <group ref={sheet} position-y={0.32}>
          <mesh position-y={0.1}>
            <planeGeometry args={[0.3, 0.38]} />
            <meshStandardMaterial map={paper} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        </group>
      </group>
      <mesh position={[0.28, 0.18, 0.2]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshStandardMaterial ref={lamp} color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

function CirculationDesk({ writing }: { writing: boolean }) {
  return (
    <group position={[ARC.x, 0, ARC.z]}>
      <RoundedBox args={[2.6, 0.99, 0.85]} radius={0.06} smoothness={2} position-y={0.5} castShadow receiveShadow>
        <Mat color="#6B4226" />
      </RoundedBox>
      <RoundedBox args={[2.72, 0.07, 0.97]} radius={0.03} smoothness={2} position-y={1.02} castShadow>
        <Mat color="#C9A27A" rough={0.55} />
      </RoundedBox>
      <mesh position={[0, 0.72, 0.43]}>
        <planeGeometry args={[2.4, 0.06]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <ReportPress writing={writing} />
      <Tag kind="ai" text="Report Writer" accent={ACCENT} position={[0, 2.0, 0]} talking={writing} />
    </group>
  )
}

export function Library() {
  const report = useGame((s) => s.session?.report ?? null)
  const busy = useGame((s) => s.busy)
  const writing = talkingFromBusy(busy).press
  const floor = useMemo(() => floorTexture('wood', '#C7A26F'), [])
  const statuses = SKILL_ORDER.map((k) => (report?.skills.find((s) => s.key === k)?.status ?? 'not_assessed') as SkillStatus)
  const level: Record<SkillStatus, number> = { demonstrated_independently: 1, demonstrated_with_help: 0.8, practiced: 0.6, not_yet_demonstrated: 0.3, not_assessed: 0.1 }
  const board: BoardData = {
    bars: report ? statuses.map((s) => ({ v: level[s], color: BOOK_COLOR[s] })) : [],
    busy: writing,
  }
  useColliders(ID, [
    ...SHELVES.map((s, i) => ({ id: `shelf-${i}`, x: s.x, z: s.z, w: s.rot ? s.d + 0.1 : s.w + 0.1, d: s.rot ? s.w + 0.1 : s.d + 0.1 })),
    { id: 'ladder', x: -2.6, z: -5.0, w: 0.6, d: 0.6 },
    { id: 'table', x: 5.2, z: -2.6, w: 2.5, d: 1.2 },
    { id: 'chairs', x: 5.2, z: -1.75, w: 1.8, d: 0.5 },
    { id: 'desk', x: ARC.x, z: ARC.z, w: 2.75, d: 1.0 },
    { id: 'cart', x: -4.6, z: 3.6, w: 1.3, d: 0.6, rot: 0.35 },
    ...LECTERN_ANGLES.map((deg, i) => {
      const a = (deg * Math.PI) / 180
      return { id: `lectern-${i}`, x: ARC.x + Math.sin(a) * ARC.r, z: ARC.z + Math.cos(a) * ARC.r, r: 0.32 }
    }),
  ])
  return (
    <RoomShell id={ID} floor={floor} board={board}>
      <Rug />
      {SHELVES.map((s, i) => (
        <ShelfCarcass key={i} s={s} />
      ))}
      <Books />
      <Ladder />
      <ReadingTable />
      <CirculationDesk writing={writing} />
      {statuses.map((st, i) => (
        <Lectern key={i} index={i} status={st} writing={writing} />
      ))}
      <Cart goldBooks={Math.min(3, report?.nextSteps.length ?? 0)} />
      <pointLight position={[ARC.x, 2.6, -1]} color="#FFD9A0" intensity={5} distance={9} decay={2} />
    </RoomShell>
  )
}
