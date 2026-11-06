'use client'
// Next Chapter (Discover): a warm brick community career center. Not the glass shell.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DOOR_W, ROOM_D, ROOM_W } from '@/lib/places'
import { useGame } from '@/store/game'
import { INTERVIEW_MAYA, INTERVIEW_VISITOR } from '../seats'
import { talkingFromBusy } from '../state'
import { ANA, JO, MAYA, SeatedPerson, lookFromSeed } from '../people'
import { FlowerPatch } from './flora'
import { Armchair, Mat, Monitor, Mug, OfficeChair, Vase } from './props'
import { DoorMat, Gate, StatusBoard, BoardStand, useRoomStatus, type BoardData } from './RoomShell'
import { HideInside } from './HideInside'
import { canvasTex, mulberry32, reducedMotion, roundRect, shade, useColliders } from './util'

const ID = 'interview' as const
const C = { teal: '#0EA5A4', deep: '#0F4C4A', gold: '#F2B33D', coral: '#F0735A', cream: '#FFF4E0', steel: '#1E4B43' }
const HW = ROOM_W / 2
const HD = ROOM_D / 2

// ---------------- Textures ----------------
function parquet() {
  return canvasTex(
    'floor:basket',
    1024,
    768,
    (g, w, h) => {
      const r = mulberry32(5)
      const base = '#CDB08C'
      g.fillStyle = shade(base, -0.12)
      g.fillRect(0, 0, w, h)
      const S = 96
      const pl = S / 3
      for (let y = 0; y < h; y += S)
        for (let x = 0; x < w; x += S) {
          const horiz = ((x + y) / S) % 2 === 0
          for (let k = 0; k < 3; k++) {
            g.fillStyle = shade('#D9B98C', (r() - 0.5) * 0.08)
            if (horiz) g.fillRect(x + 1, y + k * pl + 1, S - 2, pl - 2)
            else g.fillRect(x + k * pl + 1, y + 1, pl - 2, S - 2)
          }
        }
    },
    { repeat: [2, 2] },
  )
}

function brickBase() {
  return canvasTex('brick', 256, 256, (g, w, h) => {
    const r = mulberry32(9)
    g.fillStyle = '#E9DCC9'
    g.fillRect(0, 0, w, h)
    const bh = 32
    const bw = 64
    for (let row = 0; row < h / bh; row++) {
      const off = row % 2 ? bw / 2 : 0
      for (let x = -bw; x < w + bw; x += bw) {
        g.fillStyle = shade('#C2643F', (r() - 0.5) * 0.12)
        g.fillRect(x + off + 3, row * bh + 3, bw - 6, bh - 6)
      }
    }
  })
}

function brick(rx: number, ry: number) {
  const t = brickBase().clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.needsUpdate = true
  return t
}

function BrickBox({ position, size, rotationY = 0 }: { position: [number, number, number]; size: [number, number, number]; rotationY?: number }) {
  const map = useMemo(() => brick(Math.max(1, (Math.max(size[0], size[2]) / 2)), Math.max(0.5, size[1] / 1)), [size])
  return (
    <mesh position={position} rotation-y={rotationY} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial map={map} roughness={0.9} />
    </mesh>
  )
}

// ---------------- Building ----------------
function SteelGlassRun({ from, to }: { from: [number, number]; to: [number, number] }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.hypot(dx, dz)
  const rot = Math.atan2(-dz, dx)
  const n = Math.max(1, Math.round(len / 1.3))
  return (
    <group position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]} rotation-y={rot}>
      <BrickBox position={[0, 0.5, 0]} size={[len + 0.3, 1.0, 0.3]} />
      <mesh position-y={1.8} renderOrder={2}>
        <planeGeometry args={[len, 1.6]} />
        <meshStandardMaterial color="#EAF4FF" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} roughness={0.05} />
      </mesh>
      {[1.02, 1.8, 2.6].map((y) => (
        <mesh key={y} position-y={y}>
          <boxGeometry args={[len, 0.05, 0.06]} />
          <Mat color={C.steel} metal={0.4} rough={0.4} />
        </mesh>
      ))}
      {Array.from({ length: n + 1 }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (i * len) / n, 1.8, 0]}>
          <boxGeometry args={[0.05, 1.6, 0.06]} />
          <Mat color={C.steel} metal={0.4} rough={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function signTextures() {
  const outside = canvasTex('pf:sign:out', 512, 128, (g, w, h) => {
    roundRect(g, 0, 0, w, h, 18)
    g.fillStyle = C.cream
    g.fill()
    // sunrise logo
    g.save()
    g.beginPath()
    g.arc(70, 92, 44, Math.PI, 0)
    g.fillStyle = C.gold
    g.fill()
    g.strokeStyle = C.coral
    g.lineWidth = 6
    for (let k = 0; k < 5; k++) {
      const a = Math.PI + (Math.PI * (k + 0.5)) / 5
      g.beginPath()
      g.moveTo(70 + Math.cos(a) * 52, 92 + Math.sin(a) * 52)
      g.lineTo(70 + Math.cos(a) * 64, 92 + Math.sin(a) * 64)
      g.stroke()
    }
    g.fillStyle = C.teal
    g.beginPath()
    g.moveTo(40, 112)
    g.quadraticCurveTo(70, 80, 100, 112)
    g.fill()
    g.restore()
    g.fillStyle = C.deep
    g.font = '800 46px system-ui, sans-serif'
    g.fillText('Next Chapter', 132, 70)
    g.fillStyle = C.teal
    g.font = '600 22px system-ui, sans-serif'
    g.fillText('Return-to-work center', 134, 102)
  })
  const inside = canvasTex('pf:sign:in', 512, 128, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#FDE1C4')
    sky.addColorStop(1, '#F7A98C')
    roundRect(g, 0, 0, w, h, 18)
    g.fillStyle = sky
    g.fill()
    g.save()
    roundRect(g, 0, 0, w, h, 18)
    g.clip()
    g.beginPath()
    g.arc(w / 2, 86, 40, 0, Math.PI * 2)
    g.fillStyle = '#FFE08A'
    g.fill()
    const hill = (c: string, y: number, amp: number, ph: number) => {
      g.beginPath()
      g.moveTo(0, h)
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x / 70 + ph) * amp)
      g.lineTo(w, h)
      g.fillStyle = c
      g.fill()
    }
    hill('#7CC6B5', 84, 10, 0)
    hill('#3FA796', 100, 9, 2)
    hill('#1F7A6E', 114, 6, 4)
    g.strokeStyle = C.cream
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(w / 2 - 10, h)
    g.bezierCurveTo(w / 2 + 70, 112, w / 2 - 60, 100, w / 2 + 4, 86)
    g.stroke()
    g.restore()
  })
  return { outside, inside }
}

function Entrance({ locked }: { locked: boolean }) {
  const { outside, inside } = useMemo(() => signTextures(), [])
  const pillarX = DOOR_W / 2 + 0.25
  const seg = (ROOM_W - DOOR_W) / 2
  return (
    <group position-z={HD}>
      {/* front knee walls + glass either side of the door */}
      <group position-z={0}>
        <SteelGlassRun from={[-HW, 0]} to={[-HW + seg - 0.2, 0]} />
        <SteelGlassRun from={[HW - seg + 0.2, 0]} to={[HW, 0]} />
      </group>
      {[-1, 1].map((s) => (
        <BrickBox key={s} position={[s * pillarX, 1.45, 0]} size={[0.5, 2.9, 0.5]} />
      ))}
      {/* brick arch */}
      <mesh position={[0, 2.5, 0]}>
        <torusGeometry args={[pillarX, 0.22, 8, 24, Math.PI]} />
        <meshStandardMaterial map={brick(4, 0.5)} roughness={0.9} />
      </mesh>
      {/* header band */}
      <RoundedBox args={[3.9, 0.3, 0.55]} radius={0.06} smoothness={2} position={[0, 2.95, 0]} castShadow>
        <Mat color={locked ? '#CBD5E1' : C.teal} rough={0.5} />
      </RoundedBox>
      {/* sign: outside and inside faces */}
      <mesh position={[0, 3.55, 0.06]}>
        <planeGeometry args={[3.4, 0.85]} />
        <meshStandardMaterial map={outside} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.55, -0.06]} rotation-y={Math.PI}>
        <planeGeometry args={[3.4, 0.85]} />
        <meshStandardMaterial map={inside} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.55, 0]}>
        <boxGeometry args={[3.5, 0.95, 0.1]} />
        <Mat color={C.deep} />
      </mesh>
      <Awning />
    </group>
  )
}

function Awning() {
  const n = 8
  const w = 3.6
  return (
    <group position={[0, 2.62, 0.3]} rotation-x={0.35}>
      {Array.from({ length: n }, (_, i) => {
        const x = -w / 2 + (w / n) * (i + 0.5)
        const c = i % 2 ? C.cream : C.teal
        return (
          <group key={i} position-x={x}>
            <mesh position={[0, 0, 0.45]} castShadow>
              <boxGeometry args={[w / n, 0.03, 0.9]} />
              <Mat color={c} rough={0.7} />
            </mesh>
            <mesh position={[0, -0.02, 0.9]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[w / n / 2, w / n / 2, 0.03, 12, 1, false, 0, Math.PI]} />
              <Mat color={c} rough={0.7} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function OliveTree({ x }: { x: number }) {
  const blobs = useMemo(() => {
    const r = mulberry32(Math.round(x * 10) + 50)
    return Array.from({ length: 6 }, () => ({ p: [(r() - 0.5) * 0.7, 1.55 + r() * 0.5, (r() - 0.5) * 0.7] as [number, number, number], s: 0.32 + r() * 0.2 }))
  }, [x])
  return (
    <group position={[x, 0, HD + 0.75]}>
      <mesh position-y={0.25} castShadow>
        <cylinderGeometry args={[0.32, 0.26, 0.5, 14]} />
        <Mat color="#D9895B" />
      </mesh>
      <mesh position-y={0.9} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 1.2, 6]} />
        <meshStandardMaterial color="#7A5A3E" flatShading />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <icosahedronGeometry args={[b.s, 0]} />
          <meshStandardMaterial color={i % 2 ? '#8FA876' : '#7B9566'} flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function OutsidePlanter({ x }: { x: number }) {
  return (
    <group>
      <BrickBox position={[x, 0.25, HD + 0.75]} size={[4.2, 0.5, 0.7]} />
      <FlowerPatch x={x} z={HD + 0.75} w={3.9} d={0.45} y={0.5} count={60} seed={Math.round(x * 3) + 20} colors={[C.coral, C.gold, '#FFFFFF', '#F9A8D4', C.teal]} />
    </group>
  )
}

function BackWall() {
  return (
    <group position-z={-HD}>
      <BrickBox position={[0, 0.3, 0]} size={[ROOM_W + 0.3, 0.6, 0.3]} />
      {[-5, 0, 5].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.7, 0.05]} castShadow>
            <boxGeometry args={[2.6, 0.2, 0.35]} />
            <Mat color="#5E7F6E" />
          </mesh>
          <FlowerPatch x={x} z={0.05} w={2.4} d={0.25} y={0.8} count={28} seed={x + 40} colors={[C.coral, C.gold, '#FFFFFF', '#C084FC']} stem={0.18} />
        </group>
      ))}
    </group>
  )
}

// ---------------- Interior ----------------
function spreadsheetTex() {
  return canvasTex('pf:sheet', 700, 400, (g, w, h) => {
    const r = mulberry32(3)
    g.fillStyle = '#FFFFFF'
    g.fillRect(0, 0, w, h)
    const cw = 50
    const ch = 22
    for (let y = 0; y < h; y += ch)
      for (let x = 0; x < w; x += cw) {
        if (y < ch) g.fillStyle = '#2F855A'
        else if (x < cw) g.fillStyle = '#C6F6D5'
        else {
          const v = r()
          g.fillStyle = v > 0.92 ? '#FCA5A5' : v > 0.84 ? '#FCD34D' : v > 0.7 ? '#F0FFF4' : '#FFFFFF'
        }
        g.fillRect(x, y, cw, ch)
        g.strokeStyle = '#CBD5E1'
        g.strokeRect(x, y, cw, ch)
      }
    const notes = ['#FDE047', '#F9A8D4', '#93C5FD', '#FDBA74', '#86EFAC']
    const pins: [number, number][] = []
    for (let i = 0; i < 11; i++) {
      const x = 40 + r() * (w - 110)
      const y = 40 + r() * (h - 100)
      g.save()
      g.translate(x, y)
      g.rotate((r() - 0.5) * 0.3)
      g.fillStyle = notes[i % notes.length]
      g.fillRect(0, 0, 58, 54)
      g.fillStyle = 'rgba(0,0,0,0.25)'
      for (let k = 0; k < 3; k++) g.fillRect(8, 14 + k * 11, 40 - k * 8, 3)
      g.restore()
      pins.push([x + 29, y + 4])
    }
    g.strokeStyle = '#DC2626'
    g.lineWidth = 2
    g.beginPath()
    pins.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.stroke()
    pins.forEach(([x, y]) => {
      g.beginPath()
      g.arc(x, y, 5, 0, Math.PI * 2)
      g.fillStyle = '#B91C1C'
      g.fill()
    })
  })
}

const FLYERS: [string, string, string][] = [
  ['RETURNSHIPS OPEN', 'Ask your caseworker', '#FFFFFF'],
  ['RESUME GAP CLINIC', 'Thursdays 10am', '#FDE68A'],
  ['FLEXIBLE JOBS', 'School-hours roles', '#BFE8E1'],
  ['VOLUNTEER WITH US!', 'Mentors needed', '#FBCFE8'],
  ['CHILDCARE HELP', 'Ask at the front desk', '#FFFFFF'],
  ['THANK YOU,', 'volunteers & donors ♥', '#FED7AA'],
  ['REMOTE ROLES', 'New partners this month', '#DBEAFE'],
  ['INTERVIEW PREP', 'Drop-in · Tuesdays', '#FFFFFF'],
]

function bulletinTex() {
  return canvasTex('pf:bulletin', 840, 420, (g, w, h) => {
    const r = mulberry32(8)
    g.fillStyle = '#7A5230'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#C89B6A'
    g.fillRect(18, 18, w - 36, h - 36)
    g.fillStyle = 'rgba(0,0,0,0.06)'
    for (let i = 0; i < 900; i++) g.fillRect(18 + r() * (w - 36), 18 + r() * (h - 36), 2, 2)
    const pinCols = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#A855F7']
    FLYERS.forEach(([head, line, paper], i) => {
      const col = i % 4
      const row = Math.floor(i / 4)
      const x = 44 + col * 196 + (r() - 0.5) * 14
      const y = 40 + row * 186 + (r() - 0.5) * 12
      g.save()
      g.translate(x + 80, y + 70)
      g.rotate((r() - 0.5) * 0.12)
      g.fillStyle = 'rgba(0,0,0,0.15)'
      g.fillRect(-76, -64, 160, 140)
      g.fillStyle = paper
      g.fillRect(-80, -70, 160, 140)
      g.fillStyle = '#1F2937'
      g.font = '800 17px system-ui, sans-serif'
      g.textAlign = 'center'
      g.fillText(head, 0, -26, 148)
      g.font = '500 14px system-ui, sans-serif'
      g.fillStyle = '#374151'
      g.fillText(line, 0, 2, 148)
      g.fillStyle = 'rgba(0,0,0,0.15)'
      for (let k = 0; k < 3; k++) g.fillRect(-50, 22 + k * 12, 100 - k * 20, 4)
      g.beginPath()
      g.arc(0, -60, 7, 0, Math.PI * 2)
      g.fillStyle = pinCols[i % pinCols.length]
      g.fill()
      g.restore()
    })
  })
}

function sheetMonitorTex() {
  return canvasTex('pf:monitor', 128, 84, (g, w, h) => {
    g.fillStyle = '#FFFFFF'
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#2F855A'
    g.fillRect(0, 0, w, 10)
    g.strokeStyle = '#A7F3D0'
    for (let x = 0; x < w; x += 16) g.strokeRect(x, 10, 16, h)
    for (let y = 10; y < h; y += 8) g.strokeRect(0, y, w, 8)
    g.fillStyle = '#FCA5A5'
    g.fillRect(48, 34, 16, 8)
    g.fillStyle = '#FCD34D'
    g.fillRect(80, 58, 16, 8)
  })
}

const FOLDER_COLS = ['#F2D49B', '#BFE8D6', '#FBC9A8', '#FDE68A']

/** Instanced folder towers: on the desk and on the floor beside it. */
function FolderTowers({ seed }: { seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const items = useMemo(() => {
    const r = mulberry32(seed)
    const out: { p: [number, number, number]; ry: number; c: string }[] = []
    const stack = (x: number, z: number, base: number, n: number) => {
      for (let i = 0; i < n; i++) out.push({ p: [x + (r() - 0.5) * 0.04, base + 0.02 + i * 0.045, z + (r() - 0.5) * 0.04], ry: (r() - 0.5) * 0.25, c: FOLDER_COLS[Math.floor(r() * 4)] })
    }
    stack(-0.55, -0.05, 0.76, 9)
    stack(-0.25, 0.12, 0.76, 6)
    stack(0.55, -0.1, 0.76, 11)
    stack(0.58, 0.18, 0.76, 5)
    stack(-1.05, 0.0, 0, 12)
    stack(1.02, 0.1, 0, 9)
    return out
  }, [seed])
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    const c = new THREE.Color()
    items.forEach((it, i) => {
      d.position.set(...it.p)
      d.rotation.set(0, it.ry, 0)
      d.updateMatrix()
      ref.current!.setMatrixAt(i, d.matrix)
      ref.current!.setColorAt(i, c.set(it.c))
    })
    ref.current!.instanceMatrix.needsUpdate = true
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true
  }, [items])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      <boxGeometry args={[0.34, 0.04, 0.26]} />
      <meshStandardMaterial roughness={0.85} />
    </instancedMesh>
  )
}

function CaseworkerDesk({ x, z, rot = 0, mug, chair, look, name, seed, talking }: { x: number; z: number; rot?: number; mug: string; chair: string; look: typeof ANA; name: string; seed: number; talking?: boolean }) {
  const screen = useMemo(() => sheetMonitorTex(), [])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {/* desk faces -z (the worker sits on +z side looking toward -z) */}
      <group rotation-y={Math.PI}>
        <RoundedBox args={[1.6, 0.05, 0.75]} radius={0.02} smoothness={2} position-y={0.74} castShadow receiveShadow>
          <Mat color="#E9E2D6" rough={0.6} />
        </RoundedBox>
        {[
          [-0.72, -0.3],
          [0.72, -0.3],
          [-0.72, 0.3],
          [0.72, 0.3],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.37, lz]}>
            <cylinderGeometry args={[0.025, 0.025, 0.74, 8]} />
            <Mat color="#9AA3AE" metal={0.4} rough={0.4} />
          </mesh>
        ))}
        <Monitor position={[0, 0.765, -0.2]} accent={C.teal} screen={screen} rotationY={0} />
        <Mug position={[0.3, 0.765, 0.15]} color={mug} />
      </group>
      <group rotation-y={Math.PI}>
        <FolderTowers seed={seed} />
      </group>
      <OfficeChair position={[0, 0, 0.75]} rotationY={Math.PI} color={chair} />
      <SeatedPerson position={[0, 0, 0.72]} rotationY={Math.PI} look={look} pose="typing" name={name} talking={talking} />
    </group>
  )
}

function Bookshelf() {
  const books = useMemo(() => {
    const r = mulberry32(21)
    const out: { x: number; y: number; h: number; c: string }[] = []
    const cols = ['#0EA5A4', '#F2B33D', '#F0735A', '#1E4B43', '#E9DCC9', '#5B7DB1']
    for (let s = 0; s < 4; s++) {
      let x = -0.75
      while (x < 0.7) {
        const w = 0.06 + r() * 0.06
        out.push({ x: x + w / 2, y: 0.18 + s * 0.48, h: 0.28 + r() * 0.12, c: cols[Math.floor(r() * cols.length)] })
        x += w + 0.01
      }
    }
    return out
  }, [])
  return (
    <group position={[-7.5, 0, -4.75]} rotation-y={Math.PI / 2}>
      <mesh position-y={1.0} castShadow>
        <boxGeometry args={[1.7, 2.0, 0.42]} />
        <Mat color="#8A5A3B" />
      </mesh>
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y + b.h / 2, 0.08]}>
          <boxGeometry args={[0.07, b.h, 0.28]} />
          <Mat color={b.c} rough={0.8} />
        </mesh>
      ))}
    </group>
  )
}

function FilingCabinets() {
  return (
    <group position={[-5.85, 0, -5.5]}>
      {[-0.3, 0.3].map((x) => (
        <group key={x} position-x={x}>
          <RoundedBox args={[0.55, 1.3, 0.6]} radius={0.03} smoothness={2} position-y={0.65} castShadow>
            <Mat color="#9CA3AF" metal={0.3} rough={0.5} />
          </RoundedBox>
          {[0.3, 0.7, 1.1].map((y) => (
            <mesh key={y} position={[0, y, 0.305]}>
              <boxGeometry args={[0.2, 0.03, 0.02]} />
              <Mat color="#4B5563" metal={0.6} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0.3, 1.33, 0]}>
        <boxGeometry args={[0.34, 0.06, 0.26]} />
        <Mat color="#F2D49B" />
      </mesh>
    </group>
  )
}

function CoffeeCart() {
  return (
    <group position={[7.5, 0, 3.7]} rotation-y={-Math.PI / 2}>
      <RoundedBox args={[1.1, 0.06, 0.55]} radius={0.02} smoothness={2} position-y={0.9} castShadow>
        <Mat color="#B98552" />
      </RoundedBox>
      <mesh position-y={0.35}>
        <boxGeometry args={[1.0, 0.04, 0.5]} />
        <Mat color="#B98552" />
      </mesh>
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0.45, 0]}>
          <boxGeometry args={[0.04, 0.9, 0.5]} />
          <Mat color="#2A2A2E" metal={0.4} />
        </mesh>
      ))}
      <mesh position={[-0.25, 1.08, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.32, 12]} />
        <Mat color="#D7DCE1" metal={0.7} rough={0.3} />
      </mesh>
      <Mug position={[0.1, 0.93, 0.05]} color={C.coral} />
      <Mug position={[0.25, 0.93, -0.08]} color={C.teal} />
      <Mug position={[0.38, 0.93, 0.08]} />
    </group>
  )
}

function Printer() {
  return (
    <group position={[-7.4, 0, 3.75]} rotation-y={Math.PI / 2}>
      <RoundedBox args={[0.8, 0.7, 0.55]} radius={0.03} smoothness={2} position-y={0.35} castShadow>
        <Mat color="#E5E7EB" />
      </RoundedBox>
      <RoundedBox args={[0.6, 0.28, 0.45]} radius={0.04} smoothness={2} position-y={0.84} castShadow>
        <Mat color="#F3F4F6" />
      </RoundedBox>
      <mesh position={[0, 0.99, 0.05]} rotation-x={-0.2}>
        <boxGeometry args={[0.36, 0.01, 0.3]} />
        <Mat color="#FFFFFF" />
      </mesh>
      <mesh position={[0.22, 0.9, 0.23]}>
        <circleGeometry args={[0.02, 8]} />
        <meshBasicMaterial color="#22C55E" />
      </mesh>
    </group>
  )
}

function FloorLamp() {
  return (
    <group position={[7.35, 0, -5.2]}>
      <mesh position-y={0.03}>
        <cylinderGeometry args={[0.2, 0.22, 0.04, 16]} />
        <Mat color="#2A2A2E" />
      </mesh>
      <mesh position-y={0.85}>
        <cylinderGeometry args={[0.02, 0.02, 1.7, 6]} />
        <Mat color="#B08D57" metal={0.6} rough={0.3} />
      </mesh>
      <mesh position-y={1.78}>
        <cylinderGeometry args={[0.18, 0.26, 0.32, 18, 1, true]} />
        <meshStandardMaterial color="#FFF4E0" emissive="#FFD98A" emissiveIntensity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Sofa({ talking }: { talking: boolean }) {
  return (
    <group position={[6.7, 0, 1.2]} rotation-y={-Math.PI / 2}>
      <RoundedBox args={[2.1, 0.42, 0.8]} radius={0.12} smoothness={3} position-y={0.3} castShadow receiveShadow>
        <Mat color={C.coral} rough={0.85} />
      </RoundedBox>
      <RoundedBox args={[2.1, 0.55, 0.22]} radius={0.1} smoothness={3} position={[0, 0.7, -0.34]} castShadow>
        <Mat color={C.coral} rough={0.85} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.2, 0.5, 0.8]} radius={0.08} smoothness={3} position={[s * 1.0, 0.5, 0]} castShadow>
          <Mat color={shade(C.coral, -0.05)} rough={0.85} />
        </RoundedBox>
      ))}
      <SeatedPerson position={[-0.45, 0, 0.02]} look={{ ...lookFromSeed(31), top: '#C75D74' }} pose="reading" />
      <SeatedPerson position={[0.45, 0, 0.02]} look={{ ...lookFromSeed(47), top: '#6E9E84' }} pose="reading" talking={talking} />
    </group>
  )
}

function StringLights() {
  const pts = useMemo(() => {
    const out: THREE.Vector3[] = []
    const runs: [number, number][] = [
      [-4.5, -0.5],
      [-0.5, 3.5],
    ]
    for (const [z0, z1] of runs)
      for (let i = 0; i <= 16; i++) {
        const t = i / 16
        const x = -HW + 0.2 + t * (ROOM_W - 0.4)
        const z = z0 + (z1 - z0) * t
        const sag = Math.sin(t * Math.PI * 3) * 0.12 + 0.25 * Math.sin(t * Math.PI)
        out.push(new THREE.Vector3(x, 2.85 - sag, z))
      }
    return out
  }, [])
  const glow = useMemo(
    () =>
      canvasTex('glow:warm', 64, 64, (g) => {
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
        grd.addColorStop(0, 'rgba(255,194,102,0.9)')
        grd.addColorStop(1, 'rgba(255,194,102,0)')
        g.fillStyle = grd
        g.fillRect(0, 0, 64, 64)
      }),
    [],
  )
  const bulbs = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    pts.forEach((p, i) => {
      d.position.copy(p)
      d.updateMatrix()
      bulbs.current!.setMatrixAt(i, d.matrix)
    })
    bulbs.current!.instanceMatrix.needsUpdate = true
  }, [pts])
  const line = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts.flatMap((p, i) => (i && i % 17 !== 0 ? [pts[i - 1], p] : []))), [pts])
  return (
    <group>
      <lineSegments geometry={line}>
        <lineBasicMaterial color="#3A2E28" />
      </lineSegments>
      <instancedMesh ref={bulbs} args={[undefined, undefined, pts.length]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color="#FFD98A" emissive="#FFC266" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
      {pts.map((p, i) => (
        <sprite key={i} position={p} scale={0.45}>
          <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  )
}

const STONE_COLS = [C.teal, C.gold, C.coral, '#A78BFA', '#38BDF8']

function SteppingStones({ active }: { active: boolean }) {
  const stones = useMemo(() => {
    const out: [number, number][] = []
    const n = 10
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      // curve from just inside the door to the visitor chair
      const x = 0.2 + Math.sin(t * Math.PI * 0.5) * 2.9
      const z = 5.0 - t * 7.9
      out.push([x, z])
    }
    return out
  }, [])
  const mats = useMemo(() => stones.map((_, i) => new THREE.MeshStandardMaterial({ color: STONE_COLS[i % 5], emissive: STONE_COLS[i % 5], emissiveIntensity: 0.05, roughness: 0.7 })), [stones])
  const reduce = reducedMotion()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    mats.forEach((m, i) => {
      if (!active) {
        m.emissiveIntensity = 0.05
        return
      }
      const wave = reduce ? 0.5 : Math.max(0, Math.sin(t * 3 - i * 0.6))
      m.emissiveIntensity = 0.15 + wave * 0.9
    })
  })
  return (
    <group>
      {stones.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.018, z]} rotation-y={i * 0.7} material={mats[i]} receiveShadow>
          <cylinderGeometry args={[0.3, 0.32, 0.025, 8]} />
        </mesh>
      ))}
    </group>
  )
}

function CallAura({ live, speaking }: { live: boolean; speaking: boolean }) {
  const g = useRef<THREE.Group>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const pool = useRef<THREE.MeshBasicMaterial>(null)
  const halo = useRef<THREE.Sprite>(null)
  const eq = useRef<(THREE.Mesh | null)[]>([])
  const s = useRef(0)
  const haloTex = useMemo(
    () =>
      canvasTex('glow:teal', 64, 64, (c) => {
        const grd = c.createRadialGradient(32, 32, 0, 32, 32, 32)
        grd.addColorStop(0, 'rgba(45,212,191,0.8)')
        grd.addColorStop(1, 'rgba(45,212,191,0)')
        c.fillStyle = grd
        c.fillRect(0, 0, 64, 64)
      }),
    [],
  )
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const want = live ? (speaking ? 1 : 0.5) : 0
    s.current += (want - s.current) * (1 - Math.exp(-5 * Math.min(dt, 0.05)))
    const k = s.current
    if (g.current) g.current.visible = k > 0.01
    rings.current.forEach((m, i) => {
      if (!m) return
      const ph = (t * (0.5 + k * 0.4) + i / 4) % 1
      m.scale.setScalar(0.5 + ph * 2.2)
      ;(m.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * 0.5 * k
    })
    if (pool.current) pool.current.opacity = 0.35 * k
    if (halo.current) (halo.current.material as THREE.SpriteMaterial).opacity = 0.8 * k
    eq.current.forEach((m, i) => {
      if (!m) return
      const h = 0.2 + Math.abs(Math.sin(t * (6 + i * 1.7) + i)) * (speaking ? 1 : 0.3)
      m.scale.y = h
      m.position.y = (h * 0.25) / 2
    })
  })
  return (
    <group ref={g} position={[INTERVIEW_MAYA.x, 0, INTERVIEW_MAYA.z]} visible={false}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} ref={(m) => void (rings.current[i] = m)} rotation-x={-Math.PI / 2} position-y={0.03 + i * 0.002}>
          <ringGeometry args={[0.5, 0.56, 40]} />
          <meshBasicMaterial color="#0D9488" transparent depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial ref={pool} color="#14B8A6" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite ref={halo} position-y={1.1} scale={2.4}>
        <spriteMaterial map={haloTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0} />
      </sprite>
      <group position={[0, 1.9, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} ref={(m) => void (eq.current[i] = m)} position-x={(i - 2) * 0.07}>
            <boxGeometry args={[0.045, 0.25, 0.02]} />
            <meshBasicMaterial color="#2DD4BF" toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function MeetingNook({ mayaTalking, live, speaking }: { mayaTalking: boolean; live: boolean; speaking: boolean }) {
  const tx = (INTERVIEW_VISITOR.x + INTERVIEW_MAYA.x) / 2
  const tz = INTERVIEW_VISITOR.z
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[tx, 0.012, tz]} receiveShadow>
        <circleGeometry args={[1.9, 40]} />
        <Mat color="#F5D9A8" rough={1} />
      </mesh>
      <group position={[tx, 0, tz]}>
        <mesh position-y={0.62} castShadow receiveShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.05, 28]} />
          <Mat color="#B98552" rough={0.55} />
        </mesh>
        <mesh position-y={0.31}>
          <cylinderGeometry args={[0.06, 0.08, 0.6, 10]} />
          <Mat color="#8A5D3B" />
        </mesh>
        <mesh position-y={0.02}>
          <cylinderGeometry args={[0.3, 0.32, 0.04, 16]} />
          <Mat color="#8A5D3B" />
        </mesh>
        <Mug position={[0.28, 0.645, 0.1]} color={C.coral} />
        <Mug position={[-0.28, 0.645, -0.08]} />
        <Vase position={[0, 0.645, 0]} colors={[C.coral, C.gold, '#F9A8D4']} />
      </group>
      <Armchair position={[INTERVIEW_VISITOR.x, 0, INTERVIEW_VISITOR.z]} rotationY={INTERVIEW_VISITOR.heading} color="#E0A93B" />
      <Armchair position={[INTERVIEW_MAYA.x, 0, INTERVIEW_MAYA.z]} rotationY={INTERVIEW_MAYA.heading} color="#E0A93B" />
      <SeatedPerson position={[INTERVIEW_MAYA.x, 0, INTERVIEW_MAYA.z]} rotationY={INTERVIEW_MAYA.heading} look={MAYA} pose="talking" talking={mayaTalking} name="Maya Chen" />
      <CallAura live={live} speaking={speaking} />
    </group>
  )
}

export function Pathways() {
  const status = useRoomStatus(ID)
  const locked = status === 'locked'
  const busy = useGame((s) => s.busy)
  const turns = useGame((s) => s.session?.interview.turns)
  const interviewEnded = useGame((s) => s.session?.interview.status === 'ended')
  const voiceLive = useGame((s) => s.voiceLive)
  const mayaSpeaking = useGame((s) => s.mayaSpeaking)
  const talk = talkingFromBusy(busy)
  const floor = useMemo(() => parquet(), [])
  const sheet = useMemo(() => spreadsheetTex(), [])
  const bulletin = useMemo(() => bulletinTex(), [])
  const learner = (turns ?? []).filter((t) => t.role === 'learner')
  const board: BoardData = {
    bars: learner.slice(-12).map((t) => ({ v: Math.min(1, t.text.length / 140), color: C.teal })),
    busy: talk.maya,
  }
  const bp = { position: [-5.6, 1.45, 5.0] as [number, number, number], rotationY: Math.PI, size: [3, 1.65] as [number, number] }
  useColliders(ID, [
    { id: 'desk-ana', x: -6.15, z: 0.9, w: 0.9, d: 2.5 },
    { id: 'desk-jo', x: -6.15, z: -2.3, w: 0.9, d: 2.5 },
    { id: 'chair-ana', x: -5.4, z: 0.9, r: 0.35 },
    { id: 'chair-jo', x: -5.4, z: -2.3, r: 0.35 },
    { id: 'sheet', x: -7.6, z: -1.2, w: 0.3, d: 3.5 },
    { id: 'table', x: 5.2, z: -3.75, r: 0.6 },
    { id: 'maya', x: INTERVIEW_MAYA.x, z: INTERVIEW_MAYA.z, r: 0.5 },
    { id: 'lamp', x: 7.35, z: -5.2, r: 0.25 },
    { id: 'shelf', x: -7.5, z: -4.75, w: 0.45, d: 1.75 },
    { id: 'files', x: -5.85, z: -5.5, w: 1.2, d: 0.65 },
    { id: 'cart', x: 7.5, z: 3.7, w: 0.6, d: 1.15 },
    { id: 'printer', x: -7.4, z: 3.75, w: 0.6, d: 0.85 },
    { id: 'sofa', x: 6.7, z: 1.2, w: 0.85, d: 2.3 },
    { id: 'board', x: bp.position[0], z: bp.position[2], w: 3.2, d: 0.3 },
    { id: 'bulletin', x: 4.7, z: 5.6, w: 2.9, d: 0.3 },
    { id: 'olive-l', x: -2.75, z: HD + 0.75, r: 0.4 },
    { id: 'olive-r', x: 2.75, z: HD + 0.75, r: 0.4 },
    { id: 'planter-l', x: -5.35, z: HD + 0.75, w: 4.2, d: 0.7 },
    { id: 'planter-r', x: 5.35, z: HD + 0.75, w: 4.2, d: 0.7 },
  ])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.006} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial map={floor} roughness={0.8} />
      </mesh>
      <BackWall />
      <SteelGlassRun from={[-HW, -HD]} to={[-HW, HD]} />
      <SteelGlassRun from={[HW, -HD]} to={[HW, HD]} />
      <HideInside place={ID}>
        <Entrance locked={locked} />
        <OliveTree x={-2.75} />
        <OliveTree x={2.75} />
        <OutsidePlanter x={-5.35} />
        <OutsidePlanter x={5.35} />
      </HideInside>
      <DoorMat accent={C.coral} />
      <Gate id={ID} accent="#2A9D8F" locked={locked} />
      <BoardStand {...bp} />
      <StatusBoard id={ID} accent="#2A9D8F" status={status} data={board} {...bp} />
      <StringLights />
      <SteppingStones active={status === 'current' && !interviewEnded} />

      {/* spreadsheet wall on the left side */}
      <group position={[-HW + 0.32, 1.55, -1.2]} rotation-y={Math.PI / 2}>
        <mesh position-z={-0.03}>
          <boxGeometry args={[3.6, 2.1, 0.05]} />
          <Mat color="#1E4B43" />
        </mesh>
        <mesh>
          <planeGeometry args={[3.5, 2.0]} />
          <meshStandardMaterial map={sheet} roughness={0.7} />
        </mesh>
      </group>

      {/* bulletin board on the front wall, facing in */}
      <group position={[4.7, 1.55, HD - 0.22]} rotation-y={Math.PI}>
        <mesh>
          <boxGeometry args={[2.8, 1.4, 0.05]} />
          <meshStandardMaterial map={bulletin} roughness={0.85} />
        </mesh>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, -0.75, 0.05]}>
            <boxGeometry args={[0.06, 1.6, 0.06]} />
            <Mat color="#7A5230" />
          </mesh>
        ))}
      </group>

      <CaseworkerDesk x={-6.15} z={0.9} rot={Math.PI / 2} mug={C.coral} chair="#1E4630" look={ANA} name="Ana" seed={1} />
      <CaseworkerDesk x={-6.15} z={-2.3} rot={Math.PI / 2} mug={C.teal} chair="#475569" look={JO} name="Jo" seed={2} />
      <Bookshelf />
      <FilingCabinets />
      <CoffeeCart />
      <Printer />
      <FloorLamp />
      <Sofa talking={false} />
      <MeetingNook mayaTalking={talk.maya || mayaSpeaking} live={voiceLive} speaking={mayaSpeaking} />
    </group>
  )
}
