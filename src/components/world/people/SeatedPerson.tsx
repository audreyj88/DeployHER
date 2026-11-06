'use client'
// Seated person: typing, reading (clipboard on lap) or talking (leans in, gestures).
// Origin = the chair seat centre on the floor; she faces local +z.
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { Tag } from '../Tag'
import { Head, Torso } from './parts'
import type { Look } from './looks'

const HIP = 0.53
const THIGH = 0.42
const SHIN = 0.44
const UPPER = 0.27
const FORE = 0.26

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export type SeatedPose = 'typing' | 'reading' | 'talking'

export function SeatedPerson({
  position,
  rotationY = 0,
  look,
  pose = 'talking',
  talking = false,
  name,
  tagAccent,
  tagKind = 'name',
}: {
  position: [number, number, number]
  rotationY?: number
  look: Look
  pose?: SeatedPose
  talking?: boolean
  name?: string
  tagAccent?: string
  tagKind?: 'name' | 'ai' | 'lab'
}) {
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const upL = useRef<THREE.Group>(null)
  const upR = useRef<THREE.Group>(null)
  const foL = useRef<THREE.Group>(null)
  const foR = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const st = useRef({ talk: 0, phase: Math.random() * 20 })
  const shoes = look.shoes ?? '#2A2A2E'
  const legColor = look.skirt ? '#C99778' : look.bottom

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const want = talking || pose === 'talking' ? (talking ? 1 : 0.15) : 0
    s.talk += (want - s.talk) * (1 - Math.exp(-dt / 0.13)) // ~0.4s ease
    if (reduced) return
    const t = performance.now() / 1000 + s.phase
    let headX = 0
    let headY = Math.sin(0.4 * t) * 0.08
    let lean = 0.04 + s.talk * 0.12
    let uL = -0.3
    let uR = -0.3
    let fL = -1.1
    let fR = -1.1
    if (pose === 'typing') {
      const glance = Math.max(0, Math.sin(t * 0.45)) > 0.85 ? 0.32 : 0.12
      headX = glance
      fL = -1.25 + Math.sin(t * 14) * 0.05
      fR = -1.25 + Math.sin(t * 14 + 1.7) * 0.05
      uL = uR = -0.45
      lean = 0.1 + s.talk * 0.06
    } else if (pose === 'reading') {
      headX = 0.36
      uL = uR = -0.15
      fL = fR = -1.15
      headY *= 0.4
    } else {
      // talking
      uR = -0.35 - s.talk * (0.35 + Math.sin(4 * t) * 0.2)
      fR = -1.1 - s.talk * 0.35
      headX = Math.sin(7 * t) * 0.07 * s.talk
      headY = Math.sin(0.4 * t) * 0.08 * (1 - s.talk) + Math.sin(2.1 * t) * 0.12 * s.talk
    }
    if (torso.current) torso.current.rotation.x = lean + Math.sin(t * 1.6) * 0.006
    if (head.current) {
      head.current.rotation.x = headX
      head.current.rotation.y = headY
      head.current.rotation.z = Math.sin(0.7 * t) * 0.02
    }
    if (upL.current) upL.current.rotation.x = uL
    if (upR.current) upR.current.rotation.x = uR
    if (foL.current) foL.current.rotation.x = fL
    if (foR.current) foR.current.rotation.x = fR
    if (mouth.current) mouth.current.scale.y = 0.35 + (talking ? s.talk * (0.5 + 0.5 * Math.sin(t * 12)) : 0) * 0.9
  })

  const leg = (x: number) => (
    <group position={[x, HIP, 0]}>
      {/* thigh forward */}
      <mesh position={[0, 0, THIGH / 2]} rotation-x={Math.PI / 2} castShadow>
        <capsuleGeometry args={[0.085, THIGH - 0.06, 4, 10]} />
        <meshStandardMaterial color={look.skirt ? look.bottom : legColor} roughness={0.85} />
      </mesh>
      {/* shin down */}
      <mesh position={[0, -SHIN / 2, THIGH]} castShadow>
        <capsuleGeometry args={[0.075, SHIN - 0.08, 4, 10]} />
        <meshStandardMaterial color={legColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, -HIP + 0.05, THIGH + 0.05]} scale={[1, 0.6, 1.5]}>
        <sphereGeometry args={[0.075, 12, 8]} />
        <meshStandardMaterial color={shoes} roughness={0.6} />
      </mesh>
    </group>
  )
  const arm = (x: number, up: React.RefObject<THREE.Group | null>, fo: React.RefObject<THREE.Group | null>) => (
    <group ref={up} position={[x, 0.55, 0]}>
      <mesh position-y={-UPPER / 2} castShadow>
        <capsuleGeometry args={[0.062, UPPER - 0.04, 4, 8]} />
        <meshStandardMaterial color={look.top} roughness={0.8} />
      </mesh>
      <group ref={fo} position-y={-UPPER}>
        <mesh position-y={-FORE / 2}>
          <capsuleGeometry args={[0.056, FORE - 0.04, 4, 8]} />
          <meshStandardMaterial color={look.top} roughness={0.8} />
        </mesh>
        <mesh position-y={-FORE - 0.04}>
          <sphereGeometry args={[0.05, 10, 8]} />
          <meshStandardMaterial color={look.skin} roughness={0.7} />
        </mesh>
      </group>
    </group>
  )

  return (
    <group position={position} rotation-y={rotationY}>
      {leg(-0.1)}
      {leg(0.1)}
      {/* hips / skirt */}
      <mesh position={[0, HIP + 0.04, 0.06]} scale={[0.38, 0.16, 0.36]}>
        <sphereGeometry args={[0.5, 14, 10]} />
        <meshStandardMaterial color={look.bottom} roughness={0.85} />
      </mesh>
      <group ref={torso} position-y={HIP}>
        <Torso look={look} y={0.32} />
        {arm(-0.26, upL, foL)}
        {arm(0.26, upR, foR)}
        <mesh position-y={0.66}>
          <cylinderGeometry args={[0.045, 0.05, 0.08, 10]} />
          <meshStandardMaterial color={look.skin} roughness={0.7} />
        </mesh>
        <group position-y={0.8}>
          <Head ref={head} look={look} mouthRef={mouth} />
        </group>
      </group>
      {pose === 'reading' && (
        <group position={[0, HIP + 0.13, 0.3]} rotation-x={-0.9}>
          <mesh>
            <boxGeometry args={[0.24, 0.32, 0.015]} />
            <meshStandardMaterial color="#B98B5E" roughness={0.7} />
          </mesh>
          <mesh position-z={0.01}>
            <boxGeometry args={[0.2, 0.26, 0.004]} />
            <meshStandardMaterial color="#FFFDF7" roughness={0.9} />
          </mesh>
        </group>
      )}
      {name && <Tag kind={tagKind} text={name} position={[0, 1.62, 0]} accent={tagAccent} talking={talking} />}
    </group>
  )
}
