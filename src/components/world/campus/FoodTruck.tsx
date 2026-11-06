'use client'
// The CAMPUS EATS food truck at −120°, serving window facing the plaza, with a short queue.
import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { lookFromSeed, Person } from '../people'
import { setCollider } from '../colliders'
import { polar } from './geo'
import { menuTexture, signTexture } from './textures'

function local(gx: number, gz: number, rot: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [gx + lx * c + lz * s, gz - lx * s + lz * c]
}

export function FoodTruck() {
  const [x, z] = polar(32.5, -120)
  const rot = Math.atan2(-x, -z) // local +z faces the plaza
  const sign = useMemo(() => signTexture('CAMPUS EATS', { bg: '#1F3B36', fg: '#F4EEE2', w: 512, h: 112, font: '800 58px system-ui, sans-serif' }), [])
  const menu = useMemo(() => menuTexture(), [])
  const q1 = useMemo(() => lookFromSeed(31), [])
  const q2 = useMemo(() => lookFromSeed(58), [])

  useEffect(() => {
    setCollider('truck', { kind: 'box', cx: x, cz: z, hw: 2.6, hd: 1.15, rot })
    const [mx, mz] = local(x, z, rot, 2.9, 1.8)
    setCollider('truck-menu', { kind: 'circle', x: mx, z: mz, r: 0.35 })
    ;[
      [-2.6, 3.2],
      [1.0, 3.9],
    ].forEach(([lx, lz], i) => {
      const [tx, tz] = local(x, z, rot, lx, lz)
      setCollider(`truck-table:${i}`, { kind: 'circle', x: tx, z: tz, r: 0.35 })
    })
    ;[
      [-0.4, 1.7],
      [-0.1, 2.6],
    ].forEach(([lx, lz], i) => {
      const [px, pz] = local(x, z, rot, lx, lz)
      setCollider(`truck-queue:${i}`, { kind: 'circle', x: px, z: pz, r: 0.3 })
    })
  }, [x, z, rot])

  const body = '#E7B04A'
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      {/* chassis + wheels */}
      <mesh position-y={0.52} castShadow>
        <boxGeometry args={[5, 0.22, 1.9]} />
        <meshStandardMaterial color="#3A3A3E" />
      </mesh>
      {[-1.7, 1.6].map((wx) =>
        [-0.95, 0.95].map((wz) => (
          <group key={`${wx}${wz}`} position={[wx, 0.38, wz]} rotation-x={Math.PI / 2}>
            <mesh castShadow>
              <cylinderGeometry args={[0.38, 0.38, 0.26, 18]} />
              <meshStandardMaterial color="#1F2023" roughness={0.9} />
            </mesh>
            <mesh position-y={wz > 0 ? 0.135 : -0.135}>
              <cylinderGeometry args={[0.18, 0.18, 0.02, 14]} />
              <meshStandardMaterial color="#C9CDD2" metalness={0.7} roughness={0.3} />
            </mesh>
          </group>
        )),
      )}
      {/* kitchen box */}
      <RoundedBox args={[3.4, 2.15, 2.2]} radius={0.08} position={[-0.6, 0.63 + 1.075, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={body} roughness={0.6} />
      </RoundedBox>
      <mesh position={[-0.6, 1.0, 0]}>
        <boxGeometry args={[3.42, 0.34, 2.22]} />
        <meshStandardMaterial color="#24453D" roughness={0.6} />
      </mesh>
      <RoundedBox args={[3.5, 0.1, 2.3]} radius={0.04} position={[-0.6, 2.83, 0]} castShadow>
        <meshStandardMaterial color="#F4EEE2" />
      </RoundedBox>
      <mesh position={[-1.5, 3.0, -0.3]} castShadow>
        <boxGeometry args={[0.5, 0.25, 0.5]} />
        <meshStandardMaterial color="#C9CDD2" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* sign */}
      <group position={[-0.4, 3.25, 0.55]} rotation-x={-0.25}>
        <mesh castShadow>
          <boxGeometry args={[2.6, 0.58, 0.06]} />
          <meshStandardMaterial color="#1F3B36" />
        </mesh>
        <mesh position-z={0.032}>
          <planeGeometry args={[2.5, 0.52]} />
          <meshStandardMaterial map={sign} />
        </mesh>
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[sd * 1.0, -0.36, -0.05]}>
            <boxGeometry args={[0.05, 0.3, 0.05]} />
            <meshStandardMaterial color="#3A3A3E" />
          </mesh>
        ))}
      </group>
      {/* cab */}
      <RoundedBox args={[1.25, 1.55, 2.0]} radius={0.12} position={[1.85, 0.63 + 0.775, 0]} castShadow>
        <meshStandardMaterial color={body} roughness={0.6} />
      </RoundedBox>
      <mesh position={[2.42, 1.0, 0]} rotation-z={-0.35} castShadow>
        <boxGeometry args={[0.6, 0.5, 1.96]} />
        <meshStandardMaterial color={body} roughness={0.6} />
      </mesh>
      <mesh position={[2.36, 1.72, 0]} rotation-z={-0.2}>
        <boxGeometry args={[0.04, 0.6, 1.7]} />
        <meshStandardMaterial color="#8FB8C7" roughness={0.1} metalness={0.2} />
      </mesh>
      {[-0.7, 0.7].map((hz) => (
        <mesh key={hz} position={[2.72, 0.95, hz]}>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshStandardMaterial color="#FFF7D6" emissive="#FFE9A8" emissiveIntensity={0.6} />
        </mesh>
      ))}
      <mesh position={[1.85, 1.75, 1.01]}>
        <boxGeometry args={[0.8, 0.5, 0.02]} />
        <meshStandardMaterial color="#8FB8C7" roughness={0.1} />
      </mesh>
      {/* serving window */}
      <mesh position={[-0.6, 1.85, 1.105]}>
        <planeGeometry args={[2.4, 0.95]} />
        <meshStandardMaterial color="#FFE3B0" emissive="#FFE3B0" emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
      <mesh position={[-0.6, 1.36, 1.25]} castShadow>
        <boxGeometry args={[2.6, 0.07, 0.34]} />
        <meshStandardMaterial color="#F4EEE2" />
      </mesh>
      {[-1.4, -0.9, -0.3, 0.2].map((cx, i) => (
        <mesh key={i} position={[cx, 1.47, 1.27]}>
          <cylinderGeometry args={[0.05, 0.04, 0.14, 10]} />
          <meshStandardMaterial color={i % 2 ? '#FFFFFF' : '#E0905F'} />
        </mesh>
      ))}
      {/* awning flap propped up */}
      <group position={[-0.6, 2.33, 1.11]} rotation-x={-1.05}>
        <mesh position={[0, 0, 0.45]} castShadow>
          <boxGeometry args={[2.6, 0.04, 0.9]} />
          <meshStandardMaterial color={body} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {[-1.7, 0.5].map((sx) => (
        <mesh key={sx} position={[sx, 2.12, 1.48]} rotation-x={0.58}>
          <cylinderGeometry args={[0.015, 0.015, 0.85, 5]} />
          <meshStandardMaterial color="#3A3A3E" />
        </mesh>
      ))}
      {/* A-frame menu */}
      <group position={[2.9, 0, 1.8]} rotation-y={-0.4}>
        {[-1, 1].map((sd) => (
          <group key={sd} rotation-x={sd * 0.16} position-z={sd * 0.08}>
            <mesh position-y={0.55} rotation-y={sd > 0 ? 0 : Math.PI} castShadow>
              <planeGeometry args={[0.6, 0.9]} />
              <meshStandardMaterial map={menu} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
      {/* standing tables */}
      {[
        [-2.6, 3.2],
        [1.0, 3.9],
      ].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh position-y={1.05} castShadow receiveShadow>
            <cylinderGeometry args={[0.36, 0.36, 0.05, 20]} />
            <meshStandardMaterial color="#B98B62" />
          </mesh>
          <mesh position-y={0.52}>
            <cylinderGeometry args={[0.04, 0.04, 1.05, 8]} />
            <meshStandardMaterial color="#3A3A3E" />
          </mesh>
          <mesh position-y={0.02}>
            <cylinderGeometry args={[0.26, 0.26, 0.04, 16]} />
            <meshStandardMaterial color="#3A3A3E" />
          </mesh>
        </group>
      ))}
      {/* queue */}
      <Person position={[-0.4, 0, 1.7]} rotationY={Math.PI} look={q1} />
      <Person position={[-0.1, 0, 2.6]} rotationY={Math.PI + 0.15} look={q2} />
    </group>
  )
}
