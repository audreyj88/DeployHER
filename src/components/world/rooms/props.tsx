'use client'
// Small reusable props (K). Positions are floor-center, room-local.
import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTex, mulberry32, roundRect } from './util'

type V3 = [number, number, number]

export function Mat({ color, rough = 0.75, metal = 0, emissive, ei = 0 }: { color: string; rough?: number; metal?: number; emissive?: string; ei?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} emissive={emissive ?? '#000'} emissiveIntensity={ei} />
}

export function Counter({ position, rotationY = 0, width = 3.2, depth = 0.8, height = 1.05, body = '#F4F1EC', accent }: { position: V3; rotationY?: number; width?: number; depth?: number; height?: number; body?: string; accent: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[width, height - 0.06, depth]} radius={0.06} smoothness={2} position-y={(height - 0.06) / 2} castShadow receiveShadow>
        <Mat color={body} />
      </RoundedBox>
      <RoundedBox args={[width + 0.12, 0.07, depth + 0.12]} radius={0.03} smoothness={2} position-y={height - 0.03} castShadow>
        <Mat color="#C9A27A" rough={0.55} />
      </RoundedBox>
      <mesh position={[0, height * 0.72, depth / 2 + 0.005]}>
        <planeGeometry args={[width * 0.92, 0.06]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

function monitorTex(accent: string) {
  return canvasTex(`monitor:${accent}`, 128, 84, (g, w, h) => {
    g.fillStyle = '#0F1B2D'
    g.fillRect(0, 0, w, h)
    g.fillStyle = accent
    g.fillRect(0, 0, w, 12)
    g.fillStyle = 'rgba(255,255,255,0.55)'
    for (let i = 0; i < 4; i++) g.fillRect(8, 22 + i * 13, 50 - i * 7, 5)
    g.beginPath()
    g.moveTo(96, 50)
    g.arc(96, 50, 20, -Math.PI / 2, Math.PI * 0.9)
    g.closePath()
    g.fillStyle = accent
    g.fill()
    g.beginPath()
    g.arc(96, 50, 20, Math.PI * 0.9, Math.PI * 1.5)
    g.lineTo(96, 50)
    g.fillStyle = 'rgba(255,255,255,.35)'
    g.fill()
  })
}

export function Monitor({ position, rotationY = 0, accent, screen }: { position: V3; rotationY?: number; accent: string; screen?: THREE.Texture }) {
  const tex = screen ?? monitorTex(accent)
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position-y={0.04}>
        <cylinderGeometry args={[0.09, 0.11, 0.02, 14]} />
        <Mat color="#CBD2DC" metal={0.5} rough={0.35} />
      </mesh>
      <mesh position-y={0.15}>
        <boxGeometry args={[0.04, 0.22, 0.03]} />
        <Mat color="#CBD2DC" metal={0.5} rough={0.35} />
      </mesh>
      <RoundedBox args={[0.62, 0.4, 0.04]} radius={0.015} smoothness={2} position-y={0.42} castShadow>
        <Mat color="#1F2430" rough={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.42, 0.021]}>
        <planeGeometry args={[0.56, 0.34]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function Desk({ position, rotationY = 0, width = 1.6, depth = 0.75, height = 0.74 }: { position: V3; rotationY?: number; width?: number; depth?: number; height?: number }) {
  const lx = width / 2 - 0.08
  const lz = depth / 2 - 0.08
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[width, 0.05, depth]} radius={0.02} smoothness={2} position-y={height} castShadow receiveShadow>
        <Mat color="#E9E2D6" rough={0.6} />
      </RoundedBox>
      {[
        [-lx, -lz],
        [lx, -lz],
        [-lx, lz],
        [lx, lz],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, height / 2, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, height, 8]} />
          <Mat color="#9AA3AE" metal={0.4} rough={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function Plant({ position, scale = 1, seed = 1 }: { position: V3; scale?: number; seed?: number }) {
  const blobs = useMemo(() => {
    const r = mulberry32(seed * 31 + 7)
    return Array.from({ length: 6 }, (_, i) => ({
      p: [(r() - 0.5) * 0.35, 0.62 + i * 0.13 + r() * 0.05, (r() - 0.5) * 0.35] as V3,
      s: 0.26 - i * 0.025 + r() * 0.05,
      c: r() > 0.5 ? '#5E9C6A' : '#4B8558',
    }))
  }, [seed])
  return (
    <group position={position} scale={scale}>
      <mesh position-y={0.25} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.5, 14]} />
        <Mat color="#E7E1D8" rough={0.8} />
      </mesh>
      <mesh position-y={0.49}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 14]} />
        <Mat color="#6B4A35" />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p} castShadow>
          <icosahedronGeometry args={[b.s, 0]} />
          <meshStandardMaterial color={b.c} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export function Bench({ position, rotationY = 0, accent }: { position: V3; rotationY?: number; accent: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[2, 0.12, 0.55]} radius={0.04} smoothness={2} position-y={0.46} castShadow receiveShadow>
        <Mat color={accent} rough={0.6} />
      </RoundedBox>
      {[-0.75, 0.75].map((x) => (
        <RoundedBox key={x} args={[0.16, 0.4, 0.46]} radius={0.03} smoothness={2} position={[x, 0.2, 0]} castShadow>
          <Mat color="#EDE8E0" />
        </RoundedBox>
      ))}
    </group>
  )
}

export function Mug({ position, color = '#FFFFFF' }: { position: V3; color?: string }) {
  return (
    <group position={position}>
      <mesh position-y={0.05} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.1, 14]} />
        <Mat color={color} rough={0.4} />
      </mesh>
      <mesh position-y={0.095}>
        <cylinderGeometry args={[0.034, 0.034, 0.005, 14]} />
        <Mat color="#6B3F25" rough={0.3} />
      </mesh>
      <mesh position={[0.045, 0.05, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.022, 0.007, 6, 12]} />
        <Mat color={color} rough={0.4} />
      </mesh>
    </group>
  )
}

export function OfficeChair({ position, rotationY = 0, color = '#1E4630' }: { position: V3; rotationY?: number; color?: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position-y={0.05}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 5]} />
        <Mat color="#3A3F48" metal={0.3} />
      </mesh>
      <mesh position-y={0.27}>
        <cylinderGeometry args={[0.03, 0.03, 0.42, 8]} />
        <Mat color="#9AA3AE" metal={0.5} rough={0.3} />
      </mesh>
      <RoundedBox args={[0.5, 0.08, 0.48]} radius={0.04} smoothness={2} position-y={0.5} castShadow>
        <Mat color={color} />
      </RoundedBox>
      <RoundedBox args={[0.48, 0.5, 0.07]} radius={0.04} smoothness={2} position={[0, 0.82, -0.22]} castShadow>
        <Mat color={color} />
      </RoundedBox>
    </group>
  )
}

export function Armchair({ position, rotationY = 0, color = '#E0A93B' }: { position: V3; rotationY?: number; color?: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[0.82, 0.42, 0.78]} radius={0.12} smoothness={3} position-y={0.3} castShadow receiveShadow>
        <Mat color={color} rough={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.82, 0.62, 0.2]} radius={0.1} smoothness={3} position={[0, 0.72, -0.32]} castShadow>
        <Mat color={color} rough={0.85} />
      </RoundedBox>
      {[-0.36, 0.36].map((x) => (
        <RoundedBox key={x} args={[0.16, 0.3, 0.72]} radius={0.07} smoothness={3} position={[x, 0.58, 0]} castShadow>
          <Mat color={color} rough={0.85} />
        </RoundedBox>
      ))}
      {[
        [-0.32, -0.3],
        [0.32, -0.3],
        [-0.32, 0.3],
        [0.32, 0.3],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]}>
          <cylinderGeometry args={[0.03, 0.02, 0.1, 8]} />
          <Mat color="#5B3B22" />
        </mesh>
      ))}
    </group>
  )
}

export function CafeChair({ position, rotationY = 0, accent }: { position: V3; rotationY?: number; accent: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[0.42, 0.06, 0.42]} radius={0.03} smoothness={2} position-y={0.47} castShadow>
        <Mat color={accent} rough={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.36, 0.05]} radius={0.025} smoothness={2} position={[0, 0.72, -0.19]} castShadow>
        <Mat color="#B07A4F" rough={0.6} />
      </RoundedBox>
      {[
        [-0.17, -0.17],
        [0.17, -0.17],
        [-0.17, 0.17],
        [0.17, 0.17],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.22, z]}>
          <cylinderGeometry args={[0.018, 0.018, 0.45, 6]} />
          <Mat color="#3B2A20" />
        </mesh>
      ))}
    </group>
  )
}

export function Vase({ position, colors = ['#F28C8C', '#F7C948', '#F4A6C8'] }: { position: V3; colors?: string[] }) {
  return (
    <group position={position}>
      <mesh position-y={0.07}>
        <cylinderGeometry args={[0.04, 0.05, 0.14, 12]} />
        <meshStandardMaterial color="#DDEFF5" transparent opacity={0.55} roughness={0.1} />
      </mesh>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * 0.03, 0.18, Math.sin(a) * 0.03]}>
              <cylinderGeometry args={[0.004, 0.004, 0.14, 4]} />
              <Mat color="#4E8A4A" />
            </mesh>
            <mesh position={[Math.cos(a) * 0.045, 0.26, Math.sin(a) * 0.045]}>
              <icosahedronGeometry args={[0.035, 0]} />
              <meshStandardMaterial color={c} flatShading roughness={0.7} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

export function CafeTable({ position, seats = 2, accent, seatAngles }: { position: V3; seats?: number; accent: string; seatAngles?: number[] }) {
  const angles = seatAngles ?? Array.from({ length: seats }, (_, i) => (i / seats) * Math.PI * 2)
  return (
    <group position={position}>
      <mesh position-y={0.74} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 24]} />
        <Mat color="#C99A6B" rough={0.55} />
      </mesh>
      <mesh position-y={0.37}>
        <cylinderGeometry args={[0.04, 0.04, 0.72, 10]} />
        <Mat color="#3B2A20" />
      </mesh>
      <mesh position-y={0.02}>
        <cylinderGeometry args={[0.22, 0.24, 0.04, 16]} />
        <Mat color="#3B2A20" />
      </mesh>
      <Vase position={[0, 0.76, 0]} />
      {angles.map((a, i) => (
        <group key={i}>
          <Mug position={[Math.sin(a) * 0.24, 0.76, Math.cos(a) * 0.24]} color={i % 2 ? '#F0735A' : '#FFFFFF'} />
          <CafeChair position={[Math.sin(a) * 0.72, 0, Math.cos(a) * 0.72]} rotationY={a + Math.PI} accent={accent} />
        </group>
      ))}
    </group>
  )
}

export function PendantLamp({ position, accent, drop = 2.2, ceiling = 3.4 }: { position: V3; accent: string; drop?: number; ceiling?: number }) {
  const cord = ceiling - drop
  return (
    <group position={position}>
      <mesh position-y={drop + cord / 2}>
        <cylinderGeometry args={[0.008, 0.008, cord, 4]} />
        <Mat color="#2A2A2E" />
      </mesh>
      <mesh position-y={drop}>
        <coneGeometry args={[0.22, 0.2, 18, 1, true]} />
        <meshStandardMaterial color={accent} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={drop - 0.06}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#FFF4DC" emissive="#FFD9A0" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function EspressoMachine({ position, rotationY = 0, accent }: { position: V3; rotationY?: number; accent: string }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <RoundedBox args={[0.7, 0.45, 0.45]} radius={0.04} smoothness={2} position-y={0.24} castShadow>
        <Mat color="#D7DCE1" metal={0.7} rough={0.3} />
      </RoundedBox>
      <RoundedBox args={[0.72, 0.06, 0.47]} radius={0.02} smoothness={2} position-y={0.49}>
        <Mat color={accent} rough={0.4} />
      </RoundedBox>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.18, 0.26]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.035, 0.035, 0.1, 10]} />
          <Mat color="#2A2A2E" metal={0.5} rough={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0.2]}>
        <boxGeometry args={[0.6, 0.03, 0.14]} />
        <Mat color="#FFFFFF" rough={0.4} />
      </mesh>
      <Mug position={[-0.16, 0.045, 0.2]} />
      <Mug position={[0.16, 0.045, 0.2]} color="#F0735A" />
    </group>
  )
}

export function PastryCase({ position, rotationY = 0 }: { position: V3; rotationY?: number }) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position-y={0.02}>
        <cylinderGeometry args={[0.32, 0.32, 0.03, 20]} />
        <Mat color="#FBF6EE" />
      </mesh>
      {[
        [-0.12, 0.05, 0],
        [0.1, 0.05, 0.06],
        [0.02, 0.05, -0.12],
        [0.0, 0.11, 0.0],
      ].map((p, i) => (
        <mesh key={i} position={p as V3} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <Mat color={i % 2 ? '#C9894F' : '#D9A066'} rough={0.7} />
        </mesh>
      ))}
      <mesh position-y={0.04}>
        <sphereGeometry args={[0.31, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#EAF4FF" transparent opacity={0.25} roughness={0.05} depthWrite={false} />
      </mesh>
    </group>
  )
}

/** Navy rounded-rect canvas board drawn by `draw` (used by status boards, signs). */
export function boardTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  return canvasTex(key, w, h, (g, W, H) => {
    g.clearRect(0, 0, W, H)
    roundRect(g, 0, 0, W, H, 18)
    g.fillStyle = '#101A2B'
    g.fill()
    draw(g, W, H)
  })
}
