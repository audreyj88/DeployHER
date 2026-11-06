'use client'
// The player: a clearly human woman in a coral blouse and navy midi skirt, built from lathe profiles.
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { reducedMotion } from './campus/rng'
import { player } from './state'
import { Tag } from './Tag'

const C = {
  blouse: '#F06A6A',
  skirt: '#2E3A5C',
  belt: '#1E2640',
  skin: '#E7B48F',
  tights: '#C99778',
  shoes: '#2A2226',
  eyes: '#24170F',
  lips: '#C25468',
  blush: '#F09A92',
  gold: '#E8B84A',
  hair: '#3A2218',
  sheen: '#8A5A3C',
}

const TORSO: [number, number][] = [
  [0.135, 0.9],
  [0.118, 1],
  [0.125, 1.08],
  [0.15, 1.18],
  [0.152, 1.26],
  [0.16, 1.34],
  [0.13, 1.41],
  [0.06, 1.46],
]
const SKIRT: [number, number][] = [
  [0.235, 0.47],
  [0.215, 0.6],
  [0.18, 0.76],
  [0.145, 0.88],
  [0.128, 0.93],
]

const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28)

export function PlayerModel({ showTag = true }: { showTag?: boolean }) {
  const torso = useMemo(() => lathe(TORSO), [])
  const skirt = useMemo(() => lathe(SKIRT), [])
  const body = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const ringMat = useRef<THREE.MeshStandardMaterial>(null)
  const walkAmt = useRef(0)

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const target = Math.min(1, player.speed / 4.6)
    walkAmt.current += (target - walkAmt.current) * Math.min(1, dt * 10)
    const w = walkAmt.current
    const swing = Math.sin(9 * t) * 0.65 * w
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.8
    if (armR.current) armR.current.rotation.x = swing * 0.8
    if (body.current) body.current.position.y = Math.abs(Math.sin(9 * t)) * 0.04 * w + (reducedMotion() ? 0 : Math.sin(t * 1.8) * 0.006)
    if (head.current && !reducedMotion()) {
      head.current.rotation.z = Math.sin(0.7 * t) * 0.02 * (1 - w)
      head.current.rotation.y = Math.sin(0.4 * t) * 0.08 * (1 - w)
    }
    if (ringMat.current) ringMat.current.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 3)
  })

  return (
    <group>
      {/* feet ring */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} renderOrder={5}>
        <ringGeometry args={[0.5, 0.58, 48]} />
        <meshStandardMaterial ref={ringMat} color="#FFD166" emissive="#FFB703" emissiveIntensity={0.8} transparent opacity={0.95} depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-12} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <group scale={1.03}>
        <group ref={body}>
          {/* legs (tights) + shoes */}
          {[
            [legL, -0.07],
            [legR, 0.07],
          ].map(([ref, x]) => (
            <group key={x as number} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.86, 0]}>
              <mesh position-y={-0.41} castShadow>
                <capsuleGeometry args={[0.052, 0.72, 4, 10]} />
                <meshStandardMaterial color={C.tights} roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.82, 0.04]} castShadow>
                <capsuleGeometry args={[0.05, 0.1, 4, 8]} />
                <meshStandardMaterial color={C.shoes} roughness={0.5} />
              </mesh>
            </group>
          ))}
          {/* skirt */}
          <mesh geometry={skirt} scale={[1, 1, 0.82]} castShadow>
            <meshStandardMaterial color={C.skirt} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          <mesh position-y={0.925} rotation-x={Math.PI / 2} scale={[1, 0.8, 1]}>
            <torusGeometry args={[0.13, 0.018, 6, 28]} />
            <meshStandardMaterial color={C.belt} />
          </mesh>
          {/* torso */}
          <mesh geometry={torso} scale={[1, 1, 0.72]} castShadow>
            <meshStandardMaterial color={C.blouse} roughness={0.75} />
          </mesh>
          {/* collar V of skin */}
          <mesh position={[0, 1.4, 0.075]} rotation-x={-0.25}>
            <circleGeometry args={[0.04, 3, -Math.PI / 2 - 0.6, 1.2]} />
            <meshStandardMaterial color={C.skin} />
          </mesh>
          {/* arms */}
          {[
            [armL, -1],
            [armR, 1],
          ].map(([ref, sd]) => (
            <group key={sd as number} ref={ref as React.RefObject<THREE.Group>} position={[(sd as number) * 0.175, 1.38, 0]} rotation-z={(sd as number) * 0.06}>
              <mesh position-y={-0.14} castShadow>
                <capsuleGeometry args={[0.052, 0.2, 4, 10]} />
                <meshStandardMaterial color={C.blouse} roughness={0.75} />
              </mesh>
              <mesh position={[(sd as number) * 0.008, -0.39, 0.02]} castShadow>
                <capsuleGeometry args={[0.038, 0.22, 4, 8]} />
                <meshStandardMaterial color={C.skin} roughness={0.7} />
              </mesh>
              <mesh position={[(sd as number) * 0.01, -0.54, 0.025]}>
                <sphereGeometry args={[0.042, 12, 10]} />
                <meshStandardMaterial color={C.skin} roughness={0.7} />
              </mesh>
            </group>
          ))}
          {/* neck */}
          <mesh position-y={1.49}>
            <cylinderGeometry args={[0.042, 0.048, 0.1, 12]} />
            <meshStandardMaterial color={C.skin} roughness={0.7} />
          </mesh>
          {/* head */}
          <group ref={head} position-y={1.62}>
            <mesh scale={[1, 1.12, 1.02]} castShadow>
              <sphereGeometry args={[0.13, 24, 20]} />
              <meshStandardMaterial color={C.skin} roughness={0.65} />
            </mesh>
            {/* face */}
            {[-1, 1].map((sd) => (
              <group key={sd}>
                <mesh position={[sd * 0.045, 0.012, 0.122]} scale={[1, 1.3, 0.6]}>
                  <sphereGeometry args={[0.016, 10, 8]} />
                  <meshStandardMaterial color={C.eyes} roughness={0.3} />
                </mesh>
                <mesh position={[sd * 0.072, -0.03, 0.108]} rotation-y={sd * 0.55}>
                  <circleGeometry args={[0.022, 14]} />
                  <meshBasicMaterial color={C.blush} transparent opacity={0.45} depthWrite={false} />
                </mesh>
                <mesh position={[sd * 0.132, -0.025, 0]}>
                  <sphereGeometry args={[0.014, 8, 8]} />
                  <meshStandardMaterial color={C.gold} metalness={0.8} roughness={0.25} emissive={C.gold} emissiveIntensity={0.2} />
                </mesh>
              </group>
            ))}
            <mesh position={[0, -0.018, 0.13]} scale={[1, 1.2, 1]}>
              <sphereGeometry args={[0.012, 8, 6]} />
              <meshStandardMaterial color={C.skin} roughness={0.6} />
            </mesh>
            <mesh position={[0, -0.06, 0.118]} rotation-z={Math.PI / 2} scale={[0.6, 1, 0.6]}>
              <capsuleGeometry args={[0.009, 0.028, 4, 8]} />
              <meshStandardMaterial color={C.lips} roughness={0.5} />
            </mesh>
            {/* hair: cap, bangs, side locks, long back panel */}
            <mesh position={[0, 0.03, -0.012]} scale={[1.08, 1.1, 1.1]} castShadow>
              <sphereGeometry args={[0.132, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={C.hair} roughness={0.55} />
            </mesh>
            <mesh position={[0, -0.01, -0.02]} scale={[1.07, 1.12, 1.05]} rotation-x={0.1}>
              <sphereGeometry args={[0.132, 20, 14, Math.PI * 0.6, Math.PI * 0.8, 0, Math.PI]} />
              <meshStandardMaterial color={C.hair} roughness={0.55} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[-0.03, 0.095, 0.1]} rotation={[0.5, 0, 0.45]} castShadow>
              <boxGeometry args={[0.17, 0.045, 0.06]} />
              <meshStandardMaterial color={C.hair} roughness={0.55} />
            </mesh>
            <mesh position={[0.02, 0.135, 0.02]} rotation-x={-0.2} scale={[1, 0.25, 1]}>
              <torusGeometry args={[0.07, 0.012, 4, 16, Math.PI * 0.8]} />
              <meshStandardMaterial color={C.sheen} roughness={0.4} />
            </mesh>
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[sd * 0.122, -0.09, 0.03]} rotation-z={sd * -0.06} castShadow>
                <boxGeometry args={[0.04, 0.24, 0.07]} />
                <meshStandardMaterial color={C.hair} roughness={0.55} />
              </mesh>
            ))}
            <mesh position={[0, -0.16, -0.095]} rotation-x={0.08} castShadow>
              <boxGeometry args={[0.25, 0.42, 0.05]} />
              <meshStandardMaterial color={C.hair} roughness={0.55} />
            </mesh>
          </group>
        </group>
      </group>
      {showTag && <Tag kind="you" text="You" position={[0, 2.1, 0]} alwaysVisible />}
    </group>
  )
}
