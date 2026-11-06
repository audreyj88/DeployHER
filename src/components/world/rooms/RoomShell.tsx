'use client'
// Generic room shell (F): floor, glass walls, back wall, door header + mat, locked gate, status board, plants, bench.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { roomStatus } from '@/lib/mission'
import { DOOR_W, isNorthRow, placeById, ROOM_D, ROOM_W, type PlaceId, type RoomStatus } from '@/lib/places'
import { useGame } from '@/store/game'
import { setGate } from '../colliders'
import { Bench, Mat, Plant } from './props'
import { canvasTex, mulberry32, reducedMotion, roundRect, shade, useColliders } from './util'

const HW = ROOM_W / 2
const HD = ROOM_D / 2

export function useRoomStatus(id: PlaceId): RoomStatus {
  return useGame((s) => (s.session ? roomStatus(s.session, id) : id === 'setup' ? 'current' : 'locked'))
}

// ---------------- Floors ----------------
export type FloorKind = 'wood' | 'tile' | 'concrete'

export function floorTexture(kind: FloorKind, tint: string) {
  return canvasTex(
    `floor:${kind}:${tint}`,
    1024,
    768,
    (g, w, h) => {
      const r = mulberry32(kind.length * 97 + tint.length)
      g.fillStyle = tint
      g.fillRect(0, 0, w, h)
      if (kind === 'wood') {
        const ph = 64
        for (let y = 0; y < h; y += ph) {
          let x = -Math.floor(r() * 300)
          while (x < w) {
            const len = 220 + r() * 260
            g.fillStyle = shade(tint, (r() - 0.5) * 0.06)
            g.fillRect(x, y, len, ph)
            g.strokeStyle = shade(tint, -0.08)
            g.globalAlpha = 0.35
            for (let k = 0; k < 4; k++) {
              g.beginPath()
              const yy = y + 10 + r() * (ph - 20)
              g.moveTo(x, yy)
              g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 10, x + len * 0.7, yy + (r() - 0.5) * 10, x + len, yy)
              g.stroke()
            }
            g.globalAlpha = 1
            g.fillStyle = shade(tint, -0.14)
            g.fillRect(x, y, 2, ph)
            x += len
          }
          g.fillStyle = shade(tint, -0.14)
          g.fillRect(0, y, w, 2)
        }
      } else if (kind === 'tile') {
        const ts = 96
        for (let y = 0; y < h; y += ts)
          for (let x = 0; x < w; x += ts) {
            g.fillStyle = shade(tint, (r() - 0.5) * 0.04)
            g.fillRect(x + 2, y + 2, ts - 4, ts - 4)
          }
        g.fillStyle = shade(tint, -0.1)
        for (let y = 0; y <= h; y += ts) g.fillRect(0, y - 2, w, 4)
        for (let x = 0; x <= w; x += ts) g.fillRect(x - 2, 0, 4, h)
      } else {
        for (let y = 0; y < h; y += 256)
          for (let x = 0; x < w; x += 256) {
            for (let k = 0; k < 6; k++) {
              const cx = x + r() * 256
              const cy = y + r() * 256
              const rad = 30 + r() * 90
              const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rad)
              const c = shade(tint, (r() - 0.5) * 0.08)
              grd.addColorStop(0, c)
              grd.addColorStop(1, `${c}00`)
              g.fillStyle = grd
              g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
            }
          }
      }
    },
    { repeat: [2, 2] },
  )
}

export function Floor({ map, color = '#ffffff' }: { map: THREE.Texture; color?: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.006} receiveShadow>
      <planeGeometry args={[ROOM_W, ROOM_D]} />
      <meshStandardMaterial map={map} color={color} roughness={0.85} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  )
}

// ---------------- Glass walls ----------------
function GlassRun({ from, to, height, glass, opacity, accent, rail = true }: { from: [number, number]; to: [number, number]; height: number; glass: string; opacity: number; accent: string; rail?: boolean }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.hypot(dx, dz)
  const rot = Math.atan2(-dz, dx)
  const cx = (from[0] + to[0]) / 2
  const cz = (from[1] + to[1]) / 2
  const posts = Math.max(1, Math.round(len / 4))
  return (
    <group position={[cx, 0, cz]} rotation-y={rot}>
      <mesh position-y={height / 2} renderOrder={2}>
        <planeGeometry args={[len, height]} />
        <meshStandardMaterial color={glass} transparent opacity={opacity} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position-y={height} castShadow>
        <boxGeometry args={[len + 0.06, 0.07, 0.08]} />
        <Mat color="#FFFFFF" rough={0.4} />
      </mesh>
      <mesh position-y={0.04}>
        <boxGeometry args={[len + 0.06, 0.08, 0.1]} />
        <Mat color="#FFFFFF" rough={0.4} />
      </mesh>
      {rail && (
        <mesh position-y={1.15}>
          <boxGeometry args={[len, 0.05, 0.06]} />
          <Mat color={accent} rough={0.5} />
        </mesh>
      )}
      {Array.from({ length: posts + 1 }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (i * len) / posts, height / 2, 0]} castShadow>
          <boxGeometry args={[0.07, height, 0.08]} />
          <Mat color="#FFFFFF" rough={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function GlassWalls({ id, accent, glass = '#EAF4FF', opacity = 0.16, height = 2.6, backWall = true }: { id: PlaceId; accent: string; glass?: string; opacity?: number; height?: number; backWall?: boolean }) {
  const north = isNorthRow(id)
  const seg = (ROOM_W - DOOR_W) / 2
  return (
    <group>
      <GlassRun from={[-HW, -HD]} to={[-HW, HD]} height={height} glass={glass} opacity={opacity} accent={accent} />
      <GlassRun from={[HW, -HD]} to={[HW, HD]} height={height} glass={glass} opacity={opacity} accent={accent} />
      <GlassRun from={[-HW, HD]} to={[-HW + seg, HD]} height={height} glass={glass} opacity={opacity} accent={accent} />
      <GlassRun from={[HW - seg, HD]} to={[HW, HD]} height={height} glass={glass} opacity={opacity} accent={accent} />
      {backWall &&
        (north ? (
          <mesh position={[0, 2, -HD]} castShadow receiveShadow>
            <boxGeometry args={[ROOM_W + 0.3, 4, 0.3]} />
            <Mat color="#F1ECE4" rough={0.9} />
          </mesh>
        ) : (
          <mesh position={[0, 0.275, -HD]} castShadow receiveShadow>
            <boxGeometry args={[ROOM_W + 0.3, 0.55, 0.3]} />
            <Mat color="#F1ECE4" rough={0.9} />
          </mesh>
        ))}
    </group>
  )
}

// ---------------- Door header, mat, gate ----------------
export function DoorFrame({ accent, locked, height = 2.72 }: { accent: string; locked: boolean; height?: number }) {
  return (
    <group position-z={HD}>
      <RoundedBox args={[3.7, 0.32, 0.22]} radius={0.05} smoothness={2} position-y={height} castShadow>
        <Mat color={locked ? '#CBD5E1' : accent} rough={0.5} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR_W / 2 + 0.05), height / 2, 0]} castShadow>
          <boxGeometry args={[0.12, height, 0.14]} />
          <Mat color="#FFFFFF" rough={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function DoorMat({ accent }: { accent: string }) {
  return (
    <RoundedBox args={[DOOR_W - 0.4, 0.02, 1.3]} radius={0.01} smoothness={1} position={[0, 0.012, HD - 0.9]} receiveShadow>
      <Mat color={accent} rough={0.95} />
    </RoundedBox>
  )
}

function stripeTex(accent: string) {
  return canvasTex(`stripes:${accent}`, 256, 32, (g, w, h) => {
    g.fillStyle = '#FFFFFF'
    g.fillRect(0, 0, w, h)
    g.fillStyle = accent
    for (let x = -h; x < w + h; x += 32) {
      g.beginPath()
      g.moveTo(x, h)
      g.lineTo(x + 16, h)
      g.lineTo(x + 16 + h, 0)
      g.lineTo(x + h, 0)
      g.closePath()
      g.fill()
    }
  })
}

export function Gate({ id, accent, locked }: { id: PlaceId; accent: string; locked: boolean }) {
  const pane = useRef<THREE.MeshStandardMaterial>(null)
  useEffect(() => {
    setGate(id, locked)
    return () => setGate(id, false)
  }, [id, locked])
  useFrame(({ clock }) => {
    if (pane.current) pane.current.opacity = 0.22 + Math.sin(clock.elapsedTime * 2) * 0.06
  })
  if (!locked) return null
  return (
    <group position-z={HD}>
      <mesh position-y={1.3}>
        <planeGeometry args={[DOOR_W, 2.6]} />
        <meshStandardMaterial ref={pane} color={accent} emissive={accent} emissiveIntensity={0.4} transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.55, 0.12]}>
        <boxGeometry args={[DOOR_W + 0.1, 0.16, 0.06]} />
        <meshStandardMaterial map={stripeTex(accent)} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR_W / 2 + 0.1), 0.45, 0.12]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.9, 10]} />
          <Mat color="#FFFFFF" rough={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------- Status board ----------------
export interface BoardData {
  bars: { v: number; color?: string }[] // v in 0..1
  dots?: string[] // colours
  busy?: boolean
}

export function StatusBoard({ id, accent, status, data, position, rotationY = 0, size }: { id: PlaceId; accent: string; status: RoomStatus; data: BoardData; position: [number, number, number]; rotationY?: number; size: [number, number] }) {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = Math.round((512 * size[1]) / size[0])
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return { canvas: c, tex: t }
  }, [size])
  const key = JSON.stringify([data.bars, data.dots, status])
  const draw = useRef<() => void>(() => {})
  draw.current = () => {
    const g = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height
    g.clearRect(0, 0, W, H)
    roundRect(g, 0, 0, W, H, 26)
    g.fillStyle = '#101A2B'
    g.fill()
    // status dot
    g.beginPath()
    g.arc(34, 34, 12, 0, Math.PI * 2)
    g.fillStyle = status === 'done' ? '#22C55E' : status === 'current' ? accent : '#475569'
    g.fill()
    // header pill
    roundRect(g, 58, 26, 120, 16, 8)
    g.fillStyle = 'rgba(255,255,255,0.18)'
    g.fill()
    roundRect(g, 188, 26, 60, 16, 8)
    g.fillStyle = 'rgba(255,255,255,0.08)'
    g.fill()
    const bars = data.bars.length ? data.bars : Array.from({ length: 5 }, () => ({ v: 0.08, color: '#334155' }))
    const top = 70
    const bottom = H - (data.dots?.length ? 70 : 30)
    const n = bars.length
    const gap = 14
    const bw = Math.min(70, (W - 60 - gap * (n - 1)) / n)
    const total = bw * n + gap * (n - 1)
    let x = (W - total) / 2
    for (const b of bars) {
      const hgt = Math.max(10, (bottom - top) * Math.max(0, Math.min(1, b.v)))
      roundRect(g, x, top, bw, bottom - top, 10)
      g.fillStyle = 'rgba(255,255,255,0.06)'
      g.fill()
      roundRect(g, x, bottom - hgt, bw, hgt, 10)
      g.fillStyle = b.color ?? accent
      g.fill()
      x += bw + gap
    }
    if (data.dots?.length) {
      const dn = data.dots.length
      const dg = Math.min(40, (W - 80) / dn)
      let dx = (W - dg * (dn - 1)) / 2
      for (const c of data.dots) {
        g.beginPath()
        g.arc(dx, H - 36, 11, 0, Math.PI * 2)
        g.fillStyle = c
        g.fill()
        dx += dg
      }
    }
    tex.needsUpdate = true
  }
  useEffect(() => {
    draw.current()
  }, [key])
  useEffect(() => {
    const t = setInterval(() => draw.current(), 3000)
    return () => clearInterval(t)
  }, [])
  const strip = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!strip.current) return
    strip.current.visible = Boolean(data.busy)
    if (data.busy) strip.current.position.x = -size[0] / 2 + 0.3 + (((clock.elapsedTime * 0.6) % 1) * (size[0] - 0.6))
  })
  void id
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.85} toneMapped={false} transparent />
      </mesh>
      <mesh ref={strip} position={[0, -size[1] / 2 + 0.06, 0.005]} visible={false}>
        <planeGeometry args={[0.6, 0.035]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Board placement for north/south-row rooms (F). */
export function boardPlacement(id: PlaceId): { position: [number, number, number]; rotationY: number; size: [number, number]; stand: boolean } {
  return isNorthRow(id)
    ? { position: [0, 2.55, -HD + 0.17], rotationY: 0, size: [3.4, 1.9], stand: false }
    : { position: [-5.6, 1.45, 5.0], rotationY: Math.PI, size: [3, 1.65], stand: true }
}

export function BoardStand({ position, rotationY, size }: { position: [number, number, number]; rotationY: number; size: [number, number] }) {
  return (
    <group position={[position[0], 0, position[2]]} rotation-y={rotationY}>
      <RoundedBox args={[size[0] + 0.14, size[1] + 0.14, 0.08]} radius={0.04} smoothness={2} position={[0, position[1], -0.05]} castShadow>
        <Mat color="#E2E8F0" rough={0.5} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (size[0] / 2 - 0.2), position[1] / 2 - 0.2, -0.05]}>
          <cylinderGeometry args={[0.04, 0.04, position[1] - 0.4, 8]} />
          <Mat color="#9AA3AE" metal={0.4} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------- Shell ----------------
export function RoomShell({
  id,
  floor,
  glass,
  glassOpacity,
  walls = true,
  plants = true,
  bench = true,
  board,
  doorHeader = true,
  boardAt,
  children,
}: {
  id: PlaceId
  floor?: THREE.Texture | null
  glass?: string
  glassOpacity?: number
  walls?: boolean
  plants?: boolean
  bench?: boolean
  board: BoardData
  doorHeader?: boolean
  boardAt?: { position: [number, number, number]; rotationY: number; size?: [number, number]; stand?: boolean }
  children?: ReactNode
}) {
  const p = placeById(id)
  const status = useRoomStatus(id)
  const locked = status === 'locked'
  const north = isNorthRow(id)
  const bp0 = boardPlacement(id)
  const bp = boardAt ? { ...bp0, ...boardAt, size: boardAt.size ?? bp0.size, stand: boardAt.stand ?? bp0.stand } : bp0
  const benchPos: [number, number, number] = north ? [-6.6, 0, 1.6] : [6.7, 0, 1.2]
  useColliders(
    id,
    [
      ...(bench ? [{ id: 'bench', x: benchPos[0], z: benchPos[2], w: 2.1, d: 0.65, rot: Math.PI / 2 }] : []),
      ...(plants ? [{ id: 'plant-fr', x: 7.2, z: 5.2, r: 0.3 }, ...(id !== 'report' ? [{ id: 'plant-bl', x: -7.2, z: -5.2, r: 0.35 }] : [])] : []),
      ...(bp.stand ? [{ id: 'board', x: bp.position[0], z: bp.position[2], w: bp.size[0] + 0.2, d: 0.3 }] : []),
    ],
    [bench, plants, bp.position[0], bp.position[2]],
  )
  return (
    <group>
      {floor && <Floor map={floor} />}
      {walls && <GlassWalls id={id} accent={p.accent} glass={glass} opacity={glassOpacity} />}
      {doorHeader && <DoorFrame accent={p.accent} locked={locked} />}
      <DoorMat accent={p.accent} />
      <Gate id={id} accent={p.accent} locked={locked} />
      {bp.stand && <BoardStand position={bp.position} rotationY={bp.rotationY} size={bp.size} />}
      <StatusBoard id={id} accent={p.accent} status={status} data={board} position={bp.position} rotationY={bp.rotationY} size={bp.size} />
      {plants && (
        <>
          {id !== 'report' && <Plant position={[-7.2, 0, -5.2]} seed={id.length} />}
          <Plant position={[7.2, 0, 5.2]} scale={0.85} seed={id.length + 3} />
        </>
      )}
      {bench && <Bench position={benchPos} rotationY={Math.PI / 2} accent={p.accent} />}
      {children}
    </group>
  )
}

export const ROOM_REDUCED = reducedMotion
