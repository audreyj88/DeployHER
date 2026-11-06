'use client'
// Standing NPC with walk / talk / idle motion. Glides to new positions at 1.6 m/s.
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Tag } from '../Tag'
import { BlobShadow, Head, Torso } from './parts'
import type { Look } from './looks'

export type { Look } from './looks'

const HIP = 0.82
const LEG_R = 0.085
const LEG_L = 0.58
const ARM_R = 0.062
const ARM_L = 0.4

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function Person({
  position,
  rotationY = 0,
  look,
  talking = false,
  walking = false,
  name,
  tagAccent,
  tagKind = 'name',
  tagExtra = '',
  tagIcon,
  scale = 1,
}: {
  position: [number, number, number]
  rotationY?: number
  look: Look
  talking?: boolean
  walking?: boolean
  name?: string
  tagAccent?: string
  tagKind?: 'name' | 'ai' | 'lab'
  tagExtra?: string
  tagIcon?: React.ReactNode
  scale?: number
}) {
  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const st = useRef({ x: position[0], z: position[2], rot: rotationY, walk: 0, talk: 0, phase: Math.random() * 10, init: false })
  const shoes = look.shoes ?? '#2A2A2E'
  const target = useMemo(() => ({ x: position[0], z: position[2], rot: rotationY }), [position, rotationY])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const r = root.current
    if (!r) return
    // glide toward target
    const dx = target.x - s.x
    const dz = target.z - s.z
    const d = Math.hypot(dx, dz)
    let moving = walking
    let face = target.rot
    if (d > 0.02) {
      const step = Math.min(d, 1.6 * dt)
      s.x += (dx / d) * step
      s.z += (dz / d) * step
      moving = true
      face = Math.atan2(dx, dz)
    }
    let dr = face - s.rot
    dr = Math.atan2(Math.sin(dr), Math.cos(dr))
    s.rot += dr * (1 - Math.exp(-8 * dt))
    r.position.set(s.x, position[1], s.z)
    r.rotation.y = s.rot
    if (reduced) return
    s.walk += ((moving ? 1 : 0) - s.walk) * (1 - Math.exp(-10 * dt))
    s.talk += ((talking ? 1 : 0) - s.talk) * (1 - Math.exp(-dt / 0.13))
    const t = performance.now() / 1000 + s.phase
    const swing = Math.sin(9 * t) * 0.65 * s.walk
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.8
    if (armR.current) armR.current.rotation.x = swing * 0.8 * (1 - s.talk) + s.talk * (-0.35 + Math.sin(4 * t) * 0.2)
    if (armR.current) armR.current.rotation.z = -0.06 - s.talk * 0.15
    if (armL.current) armL.current.rotation.z = 0.06
    if (body.current) body.current.position.y = Math.abs(Math.sin(9 * t)) * 0.04 * s.walk + Math.sin(t * 1.6) * 0.006
    if (head.current) {
      head.current.rotation.z = Math.sin(0.7 * t) * 0.02
      head.current.rotation.y = Math.sin(0.4 * t) * 0.08 * (1 - s.talk) + Math.sin(2.1 * t) * 0.12 * s.talk
      head.current.rotation.x = Math.sin(7 * t) * 0.07 * s.talk
    }
    if (mouth.current) mouth.current.scale.y = 0.35 + s.talk * (0.5 + 0.5 * Math.sin(t * 13)) * 0.9
  })

  const legPart = (ref: React.RefObject<THREE.Group | null>, x: number) => (
    <group ref={ref} position={[x, HIP, 0]}>
      <mesh position-y={-(LEG_L / 2 + LEG_R * 0.3)} castShadow>
        <capsuleGeometry args={[LEG_R, LEG_L, 4, 10]} />
        <meshStandardMaterial color={look.bottom} roughness={0.85} />
      </mesh>
      <mesh position={[0, -HIP + 0.05, 0.04]} scale={[1, 0.6, 1.5]}>
        <sphereGeometry args={[0.075, 12, 8]} />
        <meshStandardMaterial color={shoes} roughness={0.6} />
      </mesh>
    </group>
  )
  const armPart = (ref: React.RefObject<THREE.Group | null>, x: number) => (
    <group ref={ref} position={[x, 1.38, 0]}>
      <mesh position-y={-(ARM_L / 2)} castShadow>
        <capsuleGeometry args={[ARM_R, ARM_L, 4, 10]} />
        <meshStandardMaterial color={look.top} roughness={0.8} />
      </mesh>
      <mesh position-y={-(ARM_L + 0.08)}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color={look.skin} roughness={0.7} />
      </mesh>
    </group>
  )

  return (
    <group ref={root} position={position} rotation-y={rotationY} scale={scale}>
      <BlobShadow />
      <group ref={body}>
        {legPart(legL, -0.1)}
        {legPart(legR, 0.1)}
        {/* hip block */}
        <mesh position-y={HIP + 0.04} scale={[0.36, 0.16, 0.22]}>
          <sphereGeometry args={[0.5, 14, 10]} />
          <meshStandardMaterial color={look.bottom} roughness={0.85} />
        </mesh>
        <Torso look={look} />
        {armPart(armL, -0.26)}
        {armPart(armR, 0.26)}
        {/* neck */}
        <mesh position-y={1.47}>
          <cylinderGeometry args={[0.045, 0.05, 0.08, 10]} />
          <meshStandardMaterial color={look.skin} roughness={0.7} />
        </mesh>
        <group position-y={1.62}>
          <Head ref={head} look={look} mouthRef={mouth} />
        </group>
      </group>
      {name && <Tag kind={tagKind} text={name} position={[0, 2.05, 0]} accent={tagAccent} talking={talking} extra={tagExtra} icon={tagIcon} />}
    </group>
  )
}
