'use client'
// The Greenhouse (Setup): white-arched conservatory at planting time, with the Strength Plot.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '@/store/game'
import { talkingFromBusy } from '../state'
import { LeafChain, SeedBed, Seedlings } from './flora'
import { Mat } from './props'
import { RoomShell, type BoardData } from './RoomShell'
import { HideInside } from './HideInside'
import { canvasTex, mulberry32, reducedMotion, useColliders } from './util'

const ID = 'setup' as const
const BLOSSOMS: { color: string }[] = [{ color: '#C084FC' }, { color: '#F472B6' }, { color: '#FBBF24' }]

function hexFloor() {
  return canvasTex(
    'floor:hex',
    1024,
    768,
    (g, w, h) => {
      const r = mulberry32(42)
      g.fillStyle = '#C98F6B'
      g.fillRect(0, 0, w, h)
      const cols = ['#E3A882', '#DC9E78', '#E8B38F', '#D8966F', '#EDBD9A']
      const R = 34
      const hh = Math.sqrt(3) * R
      for (let row = -1; row * hh < h + hh; row++)
        for (let c = -1; c * R * 1.5 < w + R * 2; c++) {
          const cx = c * R * 1.5
          const cy = row * hh + (c % 2 ? hh / 2 : 0)
          g.beginPath()
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k
            const px = cx + Math.cos(a) * (R - 3)
            const py = cy + Math.sin(a) * (R - 3)
            if (k) g.lineTo(px, py)
            else g.moveTo(px, py)
          }
          g.closePath()
          g.fillStyle = cols[Math.floor(r() * cols.length)]
          g.fill()
        }
    },
    { repeat: [2, 2] },
  )
}

// ---------------- Arches with bulbs and vines ----------------
const ARCH_Z = [-4.6, -1.6, 1.4, 4.4]
const ARCH_X = 7.55
const POST_H = 2.2
const RISE = 1.5

function archPoint(t: number, z: number, out = new THREE.Vector3()) {
  const a = Math.PI * t
  return out.set(ARCH_X * Math.cos(a), POST_H + RISE * Math.sin(a), z)
}

function Arches({ zs }: { zs: number[] }) {
  const bulbs = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (const z of zs) {
      for (let i = 1; i < 18; i++) pts.push(archPoint(i / 18, z).add(new THREE.Vector3(0, -0.08, 0)))
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) pts.push(new THREE.Vector3(s * ARCH_X, 0.6 + k * 0.45, z + 0.08))
    }
    return pts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zs.join()])
  const vines = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const r = mulberry32(7 + zs.length)
    for (const z of zs) {
      for (let i = 0; i <= 40; i++) {
        const v = archPoint(i / 40, z)
        pts.push(v.add(new THREE.Vector3((r() - 0.5) * 0.15, (r() - 0.5) * 0.15, (r() - 0.5) * 0.2)))
      }
      for (const s of [-1, 1]) for (let k = 0; k < 10; k++) pts.push(new THREE.Vector3(s * ARCH_X + (r() - 0.5) * 0.2, 0.3 + k * 0.2, z + (r() - 0.5) * 0.2))
    }
    return pts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zs.join()])
  const bulbRef = useRef<THREE.InstancedMesh>(null)
  const d = useMemo(() => new THREE.Object3D(), [])
  return (
    <group>
      {zs.map((z) => (
        <group key={z}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * ARCH_X, POST_H / 2, z]} castShadow>
              <boxGeometry args={[0.12, POST_H, 0.12]} />
              <Mat color="#FBFAF7" rough={0.4} />
            </mesh>
          ))}
          <mesh position={[0, POST_H, z]} scale={[1, RISE / ARCH_X, 1]}>
            <torusGeometry args={[ARCH_X, 0.07, 6, 48, Math.PI]} />
            <Mat color="#FBFAF7" rough={0.4} />
          </mesh>
        </group>
      ))}
      <instancedMesh
        ref={(m) => {
          bulbRef.current = m
          if (!m) return
          bulbs.forEach((p, i) => {
            d.position.copy(p)
            d.updateMatrix()
            m.setMatrixAt(i, d.matrix)
          })
          m.instanceMatrix.needsUpdate = true
        }}
        args={[undefined, undefined, bulbs.length]}
      >
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshStandardMaterial color="#FFE7A3" emissive="#FFC857" emissiveIntensity={2.2} toneMapped={false} />
      </instancedMesh>
      <LeafChain points={vines} size={0.1} />
    </group>
  )
}

// ---------------- Strength Plot ----------------
// Three planted seeds, one per strength. A seed sprouts when a strength is named and only blooms once confirmed.
const SPOTS: [number, number][] = [
  [-0.72, 0.38],
  [0.72, 0.38],
  [0, -0.62],
]

// Leaf pairs on a growing plant: [height fraction, growth needed to appear, size]
const LEAVES: [number, number, number][] = [
  [0.22, 0, 1],
  [0.5, 0.7, 1.15],
  [0.75, 1.1, 1],
  [0.92, 1.5, 0.8],
]

function GrowingPlant({ pos, color, stage, thinking, index }: { pos: [number, number]; color: string; stage: 0 | 1 | 2; thinking: boolean; index: number }) {
  const stem = useRef<THREE.Mesh>(null)
  const leafRefs = useRef<(THREE.Group | null)[]>([])
  const flower = useRef<THREE.Group>(null)
  const sway = useRef<THREE.Group>(null)
  const g = useRef(0)
  const reduce = reducedMotion()
  const seedMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#B07A45', emissive: '#FFD166', emissiveIntensity: 0, roughness: 0.6 }), [])
  const petalMat = useMemo(() => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.5 }), [color])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    g.current += (stage - g.current) * (1 - Math.exp(-2.2 * Math.min(dt, 0.05)))
    const v = g.current
    const H = v <= 1 ? 0.05 + v * 0.5 : 0.55 + (v - 1) * 0.6
    if (stem.current) {
      stem.current.scale.set(1, H, 1)
      stem.current.position.y = H / 2
      stem.current.visible = v > 0.04
    }
    LEAVES.forEach(([f, need, size], i) => {
      const lg = leafRefs.current[i]
      if (!lg) return
      const s = Math.max(0, Math.min(1, (v - need) / 0.45)) * size
      lg.scale.setScalar(s)
      lg.visible = s > 0.01
      lg.position.y = i === 0 && v < 0.6 ? H : H * f
    })
    if (flower.current) {
      const s = Math.max(0, Math.min(1, (v - 1.4) / 0.55))
      flower.current.scale.setScalar(s)
      flower.current.visible = s > 0.01
      flower.current.position.y = H + 0.04
      if (!reduce) flower.current.rotation.y = t * 0.4 + index
    }
    petalMat.emissiveIntensity = stage === 2 ? 0.9 + Math.sin(t * 2 + index) * 0.3 : 0.2
    seedMat.emissiveIntensity = thinking && stage === 0 ? 0.6 + Math.sin(t * 5 + index * 1.7) * 0.4 : 0
    if (sway.current && !reduce) sway.current.rotation.z = Math.sin(t * 1.1 + index * 2) * 0.03 * Math.min(1, v)
  })
  return (
    <group position={[pos[0], 0.47, pos[1]]}>
      {/* soil mound + the seed itself (visible until it sprouts) */}
      <mesh scale={[1, 0.4, 1]} receiveShadow>
        <sphereGeometry args={[0.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#5B3A26" roughness={1} flatShading />
      </mesh>
      <mesh position-y={0.1} scale={[1, 0.7, 0.8]} material={seedMat}>
        <sphereGeometry args={[0.06, 10, 8]} />
      </mesh>
      {/* row marker with a tag in this strength's colour */}
      <group position={[0.3, 0, 0.12]} rotation-z={-0.08}>
        <mesh position-y={0.2} castShadow>
          <boxGeometry args={[0.035, 0.42, 0.02]} />
          <Mat color="#C8A27A" />
        </mesh>
        <mesh position-y={0.36}>
          <boxGeometry args={[0.16, 0.1, 0.015]} />
          <Mat color={color} rough={0.6} />
        </mesh>
      </group>
      <group ref={sway}>
        <mesh ref={stem} castShadow>
          <cylinderGeometry args={[0.018, 0.028, 1, 6]} />
          <meshStandardMaterial color="#5FA15A" roughness={0.85} />
        </mesh>
        {LEAVES.map((_, i) => (
          <group key={i} ref={(el) => void (leafRefs.current[i] = el)} rotation-y={i * (Math.PI / 2) + index}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.12, 0.02, 0]} rotation-z={side * 0.5} scale={[0.14, 0.025, 0.075]} castShadow>
                <sphereGeometry args={[1, 10, 6]} />
                <meshStandardMaterial color={i === 0 ? '#8FD18B' : '#4FA864'} roughness={0.7} flatShading />
              </mesh>
            ))}
          </group>
        ))}
        <group ref={flower}>
          {Array.from({ length: 5 }, (_, k) => {
            const a = (k / 5) * Math.PI * 2
            return (
              <mesh key={k} position={[Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12]} scale={[1, 0.45, 1]} material={petalMat}>
                <sphereGeometry args={[0.11, 10, 8]} />
              </mesh>
            )
          })}
          <mesh>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#FFF7D6" emissive="#FFD166" emissiveIntensity={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function StrengthPlot({ named, confirmed, thinking }: { named: number; confirmed: boolean; thinking: boolean }) {
  const pollen = useRef<THREE.InstancedMesh>(null)
  const d = useMemo(() => new THREE.Object3D(), [])
  useFrame(({ clock }) => {
    const pm = pollen.current
    if (!pm) return
    pm.visible = confirmed && named > 0
    if (!pm.visible) return
    const t = clock.elapsedTime
    for (let i = 0; i < 14; i++) {
      const ph = (((t * 0.12 + i / 14) % 1) + 1) % 1
      const a = ph * Math.PI * 4 + i
      d.position.set(Math.cos(a) * (0.5 + ph * 0.9), 0.8 + ph * 2, Math.sin(a) * (0.5 + ph * 0.9))
      d.scale.setScalar(1 - ph * 0.6)
      d.updateMatrix()
      pm.setMatrixAt(i, d.matrix)
    }
    pm.instanceMatrix.needsUpdate = true
  })
  return (
    <group position={[0, 0, -2.5]}>
      {/* raised round bed of freshly turned soil */}
      <mesh position-y={0.22} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.6, 0.44, 32]} />
        <Mat color="#D9CFC0" rough={0.85} />
      </mesh>
      <mesh position-y={0.45}>
        <cylinderGeometry args={[1.45, 1.45, 0.04, 32]} />
        <meshStandardMaterial color="#5B3A26" roughness={1} />
      </mesh>
      {/* tiny sprouts around the rim, just poking through */}
      <Seedlings x={0} z={1.05} w={1.6} d={0.25} y={0.47} seed={8} bare={0.4} />
      {BLOSSOMS.map((b, i) => (
        <GrowingPlant key={i} index={i} pos={SPOTS[i]} color={b.color} stage={i < named ? (confirmed ? 2 : 1) : 0} thinking={thinking} />
      ))}
      <instancedMesh ref={pollen} args={[undefined, undefined, 14]}>
        <sphereGeometry args={[0.035, 6, 5]} />
        <meshStandardMaterial color="#FFF3B0" emissive="#FFD166" emissiveIntensity={1.5} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ---------------- Egg chairs ----------------
function EggChair({ x, phase }: { x: number; phase: number }) {
  const g = useRef<THREE.Group>(null)
  const reduce = reducedMotion()
  useFrame(({ clock }) => {
    if (!g.current || reduce) return
    const t = clock.elapsedTime + phase
    g.current.rotation.x = Math.sin(t * 0.9) * 0.05
    g.current.rotation.z = Math.sin(t * 0.7) * 0.03
  })
  return (
    <group position={[x, 3.35, -0.9]}>
      <group ref={g}>
        <mesh position-y={-0.85}>
          <cylinderGeometry args={[0.015, 0.015, 1.7, 5]} />
          <Mat color="#D9C3A0" />
        </mesh>
        <group position-y={-2.25} rotation-y={x > 0 ? Math.PI / 2 + 0.3 : -Math.PI / 2 - 0.3}>
          <mesh castShadow scale={[1, 1.25, 1]}>
            <sphereGeometry args={[0.55, 20, 16, -Math.PI * 0.35, Math.PI * 1.7]} />
            <meshStandardMaterial color="#E2C792" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.32, 0.05]} scale={[1, 0.35, 1]}>
            <sphereGeometry args={[0.4, 16, 10]} />
            <Mat color="#F5D0FE" rough={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0.25]} scale={[1, 1, 0.45]}>
            <sphereGeometry args={[0.3, 14, 10]} />
            <Mat color="#F5D0FE" rough={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ---------------- Butterflies ----------------
function Butterflies() {
  const colors = ['#FCD34D', '#F9A8D4', '#FFFFFF']
  const refs = useRef<(THREE.Group | null)[]>([])
  const wings = useRef<(THREE.Group | null)[][]>([])
  const params = useMemo(() => {
    const r = mulberry32(99)
    return colors.map(() => ({ cx: (r() - 0.5) * 9, cz: (r() - 0.5) * 6 - 0.5, rx: 1 + r() * 2.2, rz: 0.8 + r() * 1.6, h: 1.1 + r() * 1.6, sp: 0.25 + r() * 0.3, ph: r() * 6 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const reduce = reducedMotion()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    params.forEach((p, i) => {
      const g = refs.current[i]
      if (!g) return
      const a = t * p.sp + p.ph
      g.position.set(p.cx + Math.cos(a) * p.rx, p.h + Math.sin(a * 2.3) * 0.25, p.cz + Math.sin(a) * p.rz)
      g.rotation.y = -a + Math.PI
      const f = reduce ? 0.6 : Math.sin(t * 14 + i) * 0.9
      const w = wings.current[i]
      if (w?.[0]) w[0].rotation.z = f
      if (w?.[1]) w[1].rotation.z = -f
    })
  })
  return (
    <group>
      {colors.map((c, i) => (
        <group key={i} ref={(g) => void (refs.current[i] = g)}>
          {[-1, 1].map((s, k) => (
            <group key={s} ref={(g) => void ((wings.current[i] ??= [])[k] = g)}>
              <mesh position={[s * 0.07, 0, 0]} rotation-x={-Math.PI / 2}>
                <circleGeometry args={[0.07, 8]} />
                <meshStandardMaterial color={c} side={THREE.DoubleSide} roughness={0.6} emissive={c} emissiveIntensity={0.15} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  )
}

// ---------------- Potting table ----------------
/** A plug tray of seedlings on the potting table: some cells sprouted, some just planted. */
function SeedTray() {
  return (
    <group position={[0.38, 0.9, -0.08]}>
      <mesh position-y={0.03} castShadow>
        <boxGeometry args={[0.62, 0.06, 0.32]} />
        <Mat color="#2F3A33" rough={0.7} />
      </mesh>
      <mesh position-y={0.058}>
        <boxGeometry args={[0.58, 0.01, 0.28]} />
        <meshStandardMaterial color="#5B3A26" roughness={1} />
      </mesh>
      <Seedlings x={0} z={0} w={0.56} d={0.26} y={0.064} seed={21} spacing={0.07} rowGap={0.065} bare={0.3} size={0.8} />
    </group>
  )
}

function PottingTable() {
  return (
    <group position={[5.1, 0, 3.1]}>
      <RoundedBox args={[1.7, 0.07, 0.7]} radius={0.02} smoothness={2} position-y={0.86} castShadow receiveShadow>
        <Mat color="#B98B5E" />
      </RoundedBox>
      <mesh position-y={0.3}>
        <boxGeometry args={[1.6, 0.04, 0.6]} />
        <Mat color="#A57A50" />
      </mesh>
      {[
        [-0.78, -0.3],
        [0.78, -0.3],
        [-0.78, 0.3],
        [0.78, 0.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.43, z]}>
          <boxGeometry args={[0.06, 0.86, 0.06]} />
          <Mat color="#9C7148" />
        </mesh>
      ))}
      {/* watering can */}
      <group position={[-0.45, 0.9, 0]}>
        <mesh position-y={0.13} castShadow>
          <cylinderGeometry args={[0.12, 0.13, 0.26, 16]} />
          <Mat color="#7DD3C0" rough={0.4} metal={0.2} />
        </mesh>
        <mesh position={[0.17, 0.2, 0]} rotation-z={-0.9}>
          <cylinderGeometry args={[0.02, 0.03, 0.3, 8]} />
          <Mat color="#7DD3C0" rough={0.4} metal={0.2} />
        </mesh>
        <mesh position={[-0.02, 0.3, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.08, 0.015, 6, 14, Math.PI]} />
          <Mat color="#7DD3C0" rough={0.4} metal={0.2} />
        </mesh>
      </group>
      <SeedTray />
      {/* seed packets */}
      {[
        { x: 0.12, z: 0.22, ry: 0.25, c: '#F7B2D0' },
        { x: 0.3, z: 0.24, ry: -0.15, c: '#FFD166' },
        { x: 0.76, z: -0.18, ry: 0.4, c: '#C4B5FD' },
      ].map((p, i) => (
        <group key={i} position={[p.x, 0.905, p.z]} rotation={[-Math.PI / 2, 0, p.ry]}>
          <mesh>
            <boxGeometry args={[0.12, 0.17, 0.008]} />
            <Mat color="#FBF6EC" />
          </mesh>
          <mesh position={[0, 0.02, 0.005]}>
            <boxGeometry args={[0.1, 0.09, 0.002]} />
            <Mat color={p.c} />
          </mesh>
        </group>
      ))}
      {/* hand trowel */}
      <group position={[0.68, 0.91, 0.16]} rotation-y={-0.5}>
        <mesh position-x={0.08} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 0.14, 8]} />
          <Mat color="#9C6B43" />
        </mesh>
        <mesh position-x={-0.05} scale={[1.4, 0.15, 0.9]}>
          <sphereGeometry args={[0.05, 10, 6]} />
          <Mat color="#B8C2CC" rough={0.35} metal={0.6} />
        </mesh>
      </group>
      {/* sack of potting soil under the table */}
      <mesh position={[0.35, 0.57, 0]} scale={[1, 1.1, 0.7]} castShadow>
        <sphereGeometry args={[0.22, 12, 10]} />
        <Mat color="#C9B48A" rough={0.95} />
      </mesh>
    </group>
  )
}

function VineArch() {
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = []
    for (let i = 0; i <= 26; i++) {
      const a = (Math.PI * i) / 26
      out.push(new THREE.Vector3(Math.cos(a) * 1.85, 2.0 + Math.sin(a) * 1.0, 5.55))
    }
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) out.push(new THREE.Vector3(s * 1.85, 0.2 + k * 0.22, 5.55))
    return out
  }, [])
  // A few closed buds: the arch hasn't flowered yet.
  const heads = useMemo(() => pts.filter((_, i) => i % 5 === 2).map((p) => p.clone().add(new THREE.Vector3(0, -0.05, 0.08))), [pts])
  return (
    <group>
      <LeafChain points={pts} size={0.11} color="#6CB86F" />
      {heads.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045, 6, 5]} />
          <meshStandardMaterial color={i % 3 ? '#9CCB7A' : '#E9B8CF'} flatShading roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function SteppingStones() {
  const stones = useMemo(() => {
    const out: [number, number, number][] = []
    for (let i = 0; i < 6; i++) out.push([Math.sin(i * 1.1) * 0.35, 5 - i * 0.75, i])
    return out
  }, [])
  return (
    <group>
      {stones.map(([x, z, i]) => (
        <mesh key={i} position={[x, 0.02, z]} rotation-y={i} receiveShadow>
          <cylinderGeometry args={[0.32 + (i % 2) * 0.05, 0.34, 0.03, 9]} />
          <Mat color="#F3EBDD" rough={0.9} />
        </mesh>
      ))}
    </group>
  )
}

export function Greenhouse() {
  const setup = useGame((s) => s.session?.setup ?? null)
  const busy = useGame((s) => s.busy)
  const thinking = talkingFromBusy(busy).tree
  const named = Math.min(3, setup?.strengths.length ?? 0)
  const confirmed = Boolean(setup?.confirmed)
  const floor = useMemo(() => hexFloor(), [])
  const board: BoardData = {
    bars: BLOSSOMS.map((b, i) => ({ v: i < named ? (confirmed ? 1 : 0.65) : 0.08, color: b.color })),
    dots: [setup?.background, setup?.proud, setup?.aiExperience, setup?.goal, setup?.confidence].map((v) => (v ? '#22C55E' : '#334155')),
    busy: thinking,
  }
  useColliders(ID, [
    { id: 'bed-back', x: 0, z: -5.4, w: 14.6, d: 0.9 },
    { id: 'bed-l', x: -7.4, z: -0.7, w: 0.9, d: 8.4 },
    { id: 'bed-r', x: 7.4, z: -0.7, w: 0.9, d: 8.4 },
    { id: 'bed-fl', x: -5.2, z: 5.45, w: 4.6, d: 0.8 },
    { id: 'bed-fr', x: 5.2, z: 5.45, w: 4.6, d: 0.8 },
    { id: 'tree', x: 0, z: -2.5, r: 1.6 },
    { id: 'pot', x: 5.1, z: 3.1, w: 1.75, d: 0.75 },
    { id: 'egg-l', x: -4.4, z: -0.9, r: 0.6 },
    { id: 'egg-r', x: 4.4, z: -0.9, r: 0.6 },
  ])
  return (
    <RoomShell id={ID} floor={floor} glass="#F0FDF4" glassOpacity={0.14} plants={false} bench={false} board={board} boardAt={{ position: [-5.3, 1.45, 3.3], rotationY: Math.PI }}>
      <Arches zs={ARCH_Z.slice(0, 3)} />
      <HideInside place={ID}>
        <Arches zs={ARCH_Z.slice(3)} />
      </HideInside>
      <SeedBed x={0} z={-5.4} w={14.6} d={0.9} seed={1} />
      <SeedBed x={-7.4} z={-0.7} w={0.9} d={8.4} seed={2} />
      <SeedBed x={7.4} z={-0.7} w={0.9} d={8.4} seed={3} />
      <SeedBed x={-5.2} z={5.45} w={4.6} d={0.8} seed={5} />
      <SeedBed x={5.2} z={5.45} w={4.6} d={0.8} seed={6} />
      <SteppingStones />
      <StrengthPlot named={named} confirmed={confirmed} thinking={thinking} />
      <EggChair x={-4.4} phase={0} />
      <EggChair x={4.4} phase={1.7} />
      <Butterflies />
      <PottingTable />
      <HideInside place={ID}>
        <VineArch />
      </HideInside>
    </RoomShell>
  )
}
