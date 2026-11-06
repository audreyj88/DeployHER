'use client'
// The Greenhouse (Setup): white-arched conservatory with the Strength Tree.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '@/store/game'
import { talkingFromBusy } from '../state'
import { FlowerPatch, LeafChain, Planter, GH_FLOWERS } from './flora'
import { Mat } from './props'
import { RoomShell, type BoardData } from './RoomShell'
import { HideInside } from './HideInside'
import { canvasTex, mulberry32, reducedMotion, useColliders } from './util'

const ID = 'setup' as const
const BLOSSOMS: { pos: [number, number, number]; color: string }[] = [
  { pos: [-0.75, 2.75, 0.55], color: '#C084FC' },
  { pos: [0.8, 2.95, 0.45], color: '#F472B6' },
  { pos: [0.05, 3.45, 0.6], color: '#FBBF24' },
]

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

// ---------------- Strength Tree ----------------
function StrengthTree({ named, confirmed, thinking }: { named: number; confirmed: boolean; thinking: boolean }) {
  const blossoms = useRef<(THREE.Group | null)[]>([])
  const mats = useMemo(() => BLOSSOMS.map((b) => new THREE.MeshStandardMaterial({ color: b.color, emissive: b.color, emissiveIntensity: 0.05, roughness: 0.5 })), [])
  const pollen = useRef<THREE.InstancedMesh>(null)
  const st = useRef(BLOSSOMS.map(() => ({ s: 0.35, e: 0.05 })))
  const d = useMemo(() => new THREE.Object3D(), [])
  const canopy = useMemo(() => {
    const r = mulberry32(11)
    const cols = ['#4E9F5D', '#7CC47F', '#2F7A4A']
    return Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2 + r()
      const rad = i === 10 ? 0 : 0.6 + r() * 0.55
      return { p: [Math.cos(a) * rad, 2.55 + r() * 1.15, Math.sin(a) * rad * 0.8] as [number, number, number], s: 0.55 + r() * 0.35, c: cols[i % 3] }
    })
  }, [])
  const reduce = reducedMotion()
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    BLOSSOMS.forEach((_, i) => {
      const open = i < named
      const target = confirmed && open ? { s: 1.25, e: 1.6 + Math.sin(t * 2 + i) * 0.4 } : open ? { s: 1, e: 0.7 } : { s: 0.35, e: thinking ? 0.25 + Math.sin(t * 4 + i) * 0.2 : 0.05 }
      const c = st.current[i]
      const k = 1 - Math.exp(-4 * Math.min(dt, 0.05))
      c.s += (target.s - c.s) * k
      c.e += (target.e - c.e) * k
      const g = blossoms.current[i]
      if (g) {
        g.scale.setScalar(c.s)
        if (!reduce) g.rotation.y = t * 0.4 + i
      }
      mats[i].emissiveIntensity = c.e
    })
    const pm = pollen.current
    if (pm) {
      const any = named > 0
      pm.visible = any
      if (any)
        for (let i = 0; i < 14; i++) {
          const ph = ((t * 0.12 + i / 14) % 1 + 1) % 1
          const a = ph * Math.PI * 4 + i
          d.position.set(Math.cos(a) * (0.6 + ph * 0.9), 1.2 + ph * 3, Math.sin(a) * (0.6 + ph * 0.9))
          d.scale.setScalar(1 - ph * 0.6)
          d.updateMatrix()
          pm.setMatrixAt(i, d.matrix)
        }
      pm.instanceMatrix.needsUpdate = true
    }
  })
  return (
    <group position={[0, 0, -2.5]}>
      {/* raised round bed */}
      <mesh position-y={0.22} castShadow receiveShadow>
        <cylinderGeometry args={[1.55, 1.6, 0.44, 32]} />
        <Mat color="#D9CFC0" rough={0.85} />
      </mesh>
      <mesh position-y={0.45}>
        <cylinderGeometry args={[1.45, 1.45, 0.04, 32]} />
        <meshStandardMaterial color="#6E9E4F" roughness={1} />
      </mesh>
      <FlowerPatch x={0} z={0} w={2.2} d={2.2} y={0.46} count={36} seed={4} />
      {/* trunk + branches */}
      <mesh position-y={1.4} castShadow>
        <cylinderGeometry args={[0.13, 0.22, 2, 8]} />
        <meshStandardMaterial color="#8A5D3B" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.35, 2.3, 0.1]} rotation-z={0.7} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.9, 6]} />
        <meshStandardMaterial color="#8A5D3B" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.38, 2.4, 0.05]} rotation-z={-0.65} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.9, 6]} />
        <meshStandardMaterial color="#8A5D3B" roughness={0.9} flatShading />
      </mesh>
      {canopy.map((c, i) => (
        <mesh key={i} position={c.p} castShadow>
          <icosahedronGeometry args={[c.s, 0]} />
          <meshStandardMaterial color={c.c} roughness={0.85} flatShading />
        </mesh>
      ))}
      {BLOSSOMS.map((b, i) => (
        <group key={i} position={b.pos} ref={(g) => void (blossoms.current[i] = g)}>
          {Array.from({ length: 5 }, (_, k) => {
            const a = (k / 5) * Math.PI * 2
            return (
              <mesh key={k} position={[Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17]} scale={[1, 0.45, 1]} material={mats[i]}>
                <sphereGeometry args={[0.15, 10, 8]} />
              </mesh>
            )
          })}
          <mesh>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshStandardMaterial color="#FFF7D6" emissive="#FFD166" emissiveIntensity={0.6} />
          </mesh>
        </group>
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
  const colors = ['#F472B6', '#C084FC', '#FBBF24', '#F9A8D4', '#A78BFA', '#FCD34D', '#FB7185']
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
      {[0.05, 0.35, 0.62].map((x, i) => (
        <group key={i} position={[x, 0.9, (i - 1) * 0.12]}>
          <mesh position-y={0.07} castShadow>
            <cylinderGeometry args={[0.08, 0.06, 0.14, 12]} />
            <Mat color="#D9895B" />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[Math.cos(k * 2.1) * 0.03, 0.18 + k * 0.02, Math.sin(k * 2.1) * 0.03]} scale={[1, 0.5, 1]}>
              <sphereGeometry args={[0.045, 6, 5]} />
              <meshStandardMaterial color="#6CC484" flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function FlowerArch() {
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = []
    for (let i = 0; i <= 26; i++) {
      const a = (Math.PI * i) / 26
      out.push(new THREE.Vector3(Math.cos(a) * 1.85, 2.0 + Math.sin(a) * 1.0, 5.55))
    }
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) out.push(new THREE.Vector3(s * 1.85, 0.2 + k * 0.22, 5.55))
    return out
  }, [])
  const heads = useMemo(() => pts.filter((_, i) => i % 2 === 0).map((p) => p.clone().add(new THREE.Vector3(0, 0, 0.08))), [pts])
  return (
    <group>
      <LeafChain points={pts} size={0.13} />
      {heads.map((p, i) => (
        <mesh key={i} position={p}>
          <icosahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial color={GH_FLOWERS[i % GH_FLOWERS.length]} flatShading roughness={0.7} />
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
      <Planter x={0} z={-5.4} w={14.6} d={0.9} count={170} seed={1} />
      <Planter x={-7.4} z={-0.7} w={0.9} d={8.4} count={100} seed={2} />
      <Planter x={7.4} z={-0.7} w={0.9} d={8.4} count={100} seed={3} />
      <Planter x={-5.2} z={5.45} w={4.6} d={0.8} count={55} seed={5} />
      <Planter x={5.2} z={5.45} w={4.6} d={0.8} count={55} seed={6} />
      <SteppingStones />
      <StrengthTree named={named} confirmed={confirmed} thinking={thinking} />
      <EggChair x={-4.4} phase={0} />
      <EggChair x={4.4} phase={1.7} />
      <Butterflies />
      <PottingTable />
      <HideInside place={ID}>
        <FlowerArch />
      </HideInside>
    </RoomShell>
  )
}
