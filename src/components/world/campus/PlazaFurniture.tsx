'use client'
// Twelve lamp posts with room-colored banners, and six plaza benches.
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PLACES } from '@/lib/places'
import { setCollider } from '../colliders'
import { deg } from './geo'
import { reducedMotion } from './rng'

export function PlazaFurniture() {
  const lamps = useMemo(() => {
    const out: { x: number; z: number; accent: string; rot: number; phase: number }[] = []
    PLACES.forEach((p, i) => {
      const a = deg(p.angleDeg)
      const ux = Math.cos(a)
      const uz = Math.sin(a)
      for (const side of [-1, 1]) {
        const x = ux * 10.4 + -uz * 1.95 * side
        const z = uz * 10.4 + ux * 1.95 * side
        // arm points toward the path center
        out.push({ x, z, accent: p.accent, rot: Math.atan2(uz * side, -ux * side), phase: i * 1.3 + side })
      }
    })
    return out
  }, [])
  const benches = useMemo(() => PLACES.map((p) => p.angleDeg + 30).map((a) => ({ a, x: Math.cos(deg(a)) * 8.2, z: Math.sin(deg(a)) * 8.2 })), [])

  useEffect(() => {
    lamps.forEach((l, i) => setCollider(`lamp:${i}`, { kind: 'circle', x: l.x, z: l.z, r: 0.14 }))
    benches.forEach((b, i) => setCollider(`bench:${i}`, { kind: 'box', cx: b.x, cz: b.z, hw: 1.0, hd: 0.32, rot: Math.atan2(-b.x, -b.z) }))
  }, [lamps, benches])

  return (
    <group>
      {lamps.map((l, i) => (
        <Lamp key={i} {...l} />
      ))}
      {benches.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]} rotation-y={Math.atan2(-b.x, -b.z)}>
          <PlazaBench />
        </group>
      ))}
    </group>
  )
}

function Lamp({ x, z, accent, rot, phase }: { x: number; z: number; accent: string; rot: number; phase: number }) {
  const banner = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (banner.current && !reducedMotion()) banner.current.rotation.x = Math.sin(clock.elapsedTime * 1.6 + phase) * 0.05
  })
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.08} castShadow>
        <cylinderGeometry args={[0.14, 0.17, 0.16, 12]} />
        <meshStandardMaterial color="#4B5563" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position-y={1.3} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 2.6, 10]} />
        <meshStandardMaterial color="#4B5563" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position-y={2.66}>
        <sphereGeometry args={[0.17, 18, 14]} />
        <meshStandardMaterial color="#FFF4DC" emissive="#FFE2A8" emissiveIntensity={0.5} />
      </mesh>
      <group rotation-y={rot}>
        <mesh position={[0, 2.32, 0.17]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.018, 0.018, 0.34, 6]} />
          <meshStandardMaterial color="#4B5563" metalness={0.4} />
        </mesh>
        <group ref={banner} position={[0, 2.32, 0.3]}>
          <mesh position-y={-0.44} castShadow>
            <boxGeometry args={[0.02, 0.84, 0.3]} />
            <meshStandardMaterial color={accent} roughness={0.8} />
          </mesh>
          <mesh position-y={-0.76}>
            <boxGeometry args={[0.024, 0.05, 0.3]} />
            <meshStandardMaterial color="#FFFFFF" />
          </mesh>
        </group>
      </group>
    </group>
  )
}

export function PlazaBench() {
  return (
    <group>
      <RoundedBox args={[2, 0.12, 0.55]} radius={0.04} position-y={0.45} castShadow receiveShadow>
        <meshStandardMaterial color="#B98B62" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[2, 0.4, 0.08]} radius={0.03} position={[0, 0.72, -0.24]} castShadow>
        <meshStandardMaterial color="#B98B62" roughness={0.8} />
      </RoundedBox>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} castShadow>
          <boxGeometry args={[0.1, 0.4, 0.45]} />
          <meshStandardMaterial color="#4B5563" metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
