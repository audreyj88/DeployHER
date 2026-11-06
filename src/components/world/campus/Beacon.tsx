'use client'
// Bobbing teardrop map pin over the next room's door, with ripples on the ground.
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { nextPlace } from '@/lib/mission'
import { placeById } from '@/lib/places'
import { useGame } from '@/store/game'
import { doorPoint } from './geo'
import { reducedMotion } from './rng'
import { pinTexture } from './textures'

export function Beacon() {
  const session = useGame((s) => s.session)
  const next = session ? nextPlace(session) : null
  if (!next) return null
  return <BeaconAt key={next} id={next} />
}

function BeaconAt({ id }: { id: ReturnType<typeof nextPlace> & string }) {
  const accent = placeById(id).accent
  const [x, z] = doorPoint(id, 1.4)
  const tex = useMemo(() => pinTexture(accent), [accent])
  const sprite = useRef<THREE.Sprite>(null)
  const dot = useRef<THREE.Mesh>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const t = reducedMotion() ? 0.3 : clock.elapsedTime
    const b = Math.abs(Math.sin(2.4 * t))
    if (sprite.current) sprite.current.position.y = 0.35 + b * 0.45
    if (dot.current) dot.current.scale.setScalar(0.75 + (1 - b) * 0.35)
    rings.current.forEach((r, i) => {
      if (!r) return
      const ph = (0.55 * t + i / 3) % 1
      r.scale.setScalar(0.35 + 1.4 * ph)
      ;(r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) ** 2 * 0.75
    })
  })
  return (
    <group position={[x, 0, z]}>
      <sprite ref={sprite} scale={[1.15, 1.44, 1]} center={new THREE.Vector2(0.5, 0)} renderOrder={1000}>
        <spriteMaterial map={tex} depthTest={false} depthWrite={false} transparent />
      </sprite>
      <mesh ref={dot} position-y={0.03} rotation-x={-Math.PI / 2} renderOrder={9}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => void (rings.current[i] = el)} position-y={0.035} rotation-x={-Math.PI / 2} renderOrder={9}>
          <ringGeometry args={[0.92, 1.0, 48]} />
          <meshBasicMaterial color={accent} transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
