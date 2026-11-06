'use client'
// The AI terminal (G): AI is always drawn as software, never a robot.
import { RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const ROWS = [
  { x: -0.2, w: 0.48, grey: true },
  { x: 0.16, w: 0.5, grey: false },
  { x: -0.18, w: 0.56, grey: true },
  { x: 0.2, w: 0.42, grey: false },
]

export function AITerminal({ position, rotationY = 0, accent = '#8B5CF6', running = false, scale = 1 }: { position: [number, number, number]; rotationY?: number; accent?: string; running?: boolean; scale?: number }) {
  const light = useRef<THREE.MeshStandardMaterial>(null)
  const bubbles = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (light.current) light.current.emissiveIntensity = running ? 1.2 + Math.sin(t * 9) * 1.0 : 1.2
    bubbles.current.forEach((m, i) => {
      if (!m) return
      const row = ROWS[i]
      let s = 1
      if (running) {
        const ph = (t * 0.9 - i * 0.35) % 1.6
        s = Math.max(0.05, Math.min(1, ph < 0 ? 1 : ph / 0.6))
      }
      m.scale.x = s
      // grow from the left edge
      m.position.x = row.x - (row.w * (1 - s)) / 2
    })
  })
  return (
    <group position={position} rotation-y={rotationY} scale={scale}>
      <RoundedBox args={[1.13, 0.76, 0.06]} radius={0.03} smoothness={2} castShadow>
        <meshStandardMaterial color="#1F2430" roughness={0.45} />
      </RoundedBox>
      <mesh position-z={0.031}>
        <planeGeometry args={[1.05, 0.68]} />
        <meshBasicMaterial color="#0F172A" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.29, 0.033]}>
        <planeGeometry args={[1.05, 0.1]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[-0.46, 0.29, 0.036]}>
        <circleGeometry args={[0.022, 14]} />
        <meshStandardMaterial ref={light} color="#22C55E" emissive="#22C55E" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {ROWS.map((r, i) => (
        <mesh key={i} ref={(m) => void (bubbles.current[i] = m)} position={[r.x, 0.15 - i * 0.13, 0.035]}>
          <planeGeometry args={[r.w, 0.075]} />
          <meshBasicMaterial color={r.grey ? '#475569' : accent} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
