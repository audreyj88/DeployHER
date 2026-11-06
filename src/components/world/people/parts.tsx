'use client'
// Shared body parts for standing and seated people.
import { forwardRef } from 'react'
import * as THREE from 'three'
import type { HairStyle, Look } from './looks'

let blobTex: THREE.Texture | null = null
export function blobTexture() {
  if (blobTex) return blobTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(30,25,40,0.42)')
  grd.addColorStop(0.6, 'rgba(30,25,40,0.16)')
  grd.addColorStop(1, 'rgba(30,25,40,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  blobTex = new THREE.CanvasTexture(c)
  return blobTex
}

export function BlobShadow({ size = 1.1, opacity = 1 }: { size?: number; opacity?: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.015} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={blobTexture()} transparent depthWrite={false} opacity={opacity} />
    </mesh>
  )
}

const R = 0.13

function Hair({ style, color }: { style: HairStyle; color: string }) {
  const m = <meshStandardMaterial color={color} roughness={0.75} />
  const cap = (
    <mesh position={[0, 0.03, -0.012]} scale={[1.08, 1.04, 1.1]}>
      <sphereGeometry args={[R, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      {m}
    </mesh>
  )
  switch (style) {
    case 'short':
      return (
        <mesh position={[0, 0.035, -0.01]} scale={[1.05, 0.98, 1.06]}>
          <sphereGeometry args={[R, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          {m}
        </mesh>
      )
    case 'long':
      return (
        <group>
          {cap}
          <mesh position={[0, -0.12, -0.075]}>
            <boxGeometry args={[0.25, 0.32, 0.07]} />
            {m}
          </mesh>
          <mesh position={[-0.115, -0.07, 0.0]}>
            <boxGeometry args={[0.05, 0.2, 0.1]} />
            {m}
          </mesh>
          <mesh position={[0.115, -0.07, 0.0]}>
            <boxGeometry args={[0.05, 0.2, 0.1]} />
            {m}
          </mesh>
        </group>
      )
    case 'bun':
      return (
        <group>
          {cap}
          <mesh position={[0, 0.12, -0.1]}>
            <sphereGeometry args={[0.065, 12, 10]} />
            {m}
          </mesh>
        </group>
      )
    case 'curly':
      return (
        <group>
          {cap}
          {[
            [-0.11, 0.06, 0.02],
            [0.11, 0.06, 0.02],
            [-0.08, 0.13, -0.04],
            [0.08, 0.13, -0.04],
            [0, 0.15, 0.0],
            [0, 0.08, -0.12],
            [-0.12, -0.02, -0.06],
            [0.12, -0.02, -0.06],
            [0, -0.02, -0.13],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <icosahedronGeometry args={[0.062, 0]} />
              <meshStandardMaterial color={color} roughness={0.85} flatShading />
            </mesh>
          ))}
        </group>
      )
    case 'bob':
      return (
        <group>
          {cap}
          <mesh position={[0, -0.04, -0.02]} scale={[1.12, 0.8, 1.08]}>
            <cylinderGeometry args={[R, R * 1.05, 0.16, 18, 1, true, Math.PI * 0.62, Math.PI * 1.76]} />
            <meshStandardMaterial color={color} roughness={0.75} side={THREE.DoubleSide} />
          </mesh>
          {/* side-swept fringe */}
          <mesh position={[0.03, 0.085, 0.085]} rotation={[0.5, 0, -0.35]}>
            <boxGeometry args={[0.16, 0.05, 0.05]} />
            {m}
          </mesh>
        </group>
      )
    default:
      return cap
  }
}

/** Head with face, hair and optional gold studs. Origin at head centre. */
export const Head = forwardRef<THREE.Group, { look: Look; mouthRef?: React.Ref<THREE.Mesh> }>(function Head({ look, mouthRef }, ref) {
  return (
    <group ref={ref}>
      <mesh scale={[1, 1.12, 1.02]} castShadow>
        <sphereGeometry args={[R, 20, 16]} />
        <meshStandardMaterial color={look.skin} roughness={0.7} />
      </mesh>
      <Hair style={look.hairStyle} color={look.hair} />
      {/* eyes */}
      <mesh position={[-0.045, 0.01, 0.118]}>
        <sphereGeometry args={[0.014, 8, 6]} />
        <meshBasicMaterial color="#24170F" />
      </mesh>
      <mesh position={[0.045, 0.01, 0.118]}>
        <sphereGeometry args={[0.014, 8, 6]} />
        <meshBasicMaterial color="#24170F" />
      </mesh>
      {/* nose */}
      <mesh position={[0, -0.025, 0.13]}>
        <sphereGeometry args={[0.014, 8, 6]} />
        <meshStandardMaterial color={look.skin} roughness={0.7} />
      </mesh>
      {/* mouth */}
      <mesh ref={mouthRef} position={[0, -0.07, 0.118]} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[0.022, 10, 6]} />
        <meshBasicMaterial color="#8E3B46" />
      </mesh>
      {look.studs && (
        <>
          <mesh position={[-0.132, -0.04, 0]}>
            <sphereGeometry args={[0.014, 8, 6]} />
            <meshStandardMaterial color="#E8B84A" metalness={0.8} roughness={0.25} emissive="#E8B84A" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0.132, -0.04, 0]}>
            <sphereGeometry args={[0.014, 8, 6]} />
            <meshStandardMaterial color="#E8B84A" metalness={0.8} roughness={0.25} emissive="#E8B84A" emissiveIntensity={0.25} />
          </mesh>
        </>
      )}
    </group>
  )
})

/** Torso: rounded box with an optional inner-top panel (blazer look). */
export function Torso({ look, y = 1.13 }: { look: Look; y?: number }) {
  return (
    <group position-y={y}>
      <mesh castShadow scale={[0.44, 0.6, 0.26]}>
        <sphereGeometry args={[0.5, 18, 14]} />
        <meshStandardMaterial color={look.top} roughness={0.8} />
      </mesh>
      {look.inner && (
        <mesh position={[0, 0.06, 0.118]} scale={[0.12, 0.34, 0.04]}>
          <sphereGeometry args={[0.5, 12, 10]} />
          <meshStandardMaterial color={look.inner} roughness={0.85} />
        </mesh>
      )}
    </group>
  )
}
