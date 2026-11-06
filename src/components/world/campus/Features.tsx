'use client'
// Between the rooms: café kiosk, lily pond, picnic tables, raised-bed garden.
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { setCollider } from '../colliders'
import { polar } from './geo'
import { reducedMotion, rng } from './rng'
import { stripeTexture } from './textures'

/** Rotation so local +z faces the campus center from (x, z). */
const faceCentre = (x: number, z: number) => Math.atan2(-x, -z)

function boxCol(id: string, x: number, z: number, w: number, d: number, rot: number) {
  setCollider(id, { kind: 'box', cx: x, cz: z, hw: w / 2, hd: d / 2, rot })
}

/** World position of a point given in a group's local frame. */
function localPt(gx: number, gz: number, rot: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  return [gx + lx * c + lz * s, gz - lx * s + lz * c]
}

// ---------------- Café kiosk ----------------
export function CafeKiosk() {
  const [x, z] = polar(15.6, 0)
  const rot = faceCentre(x, z)
  const awning = useMemo(() => stripeTexture('#F06A6A', '#FFF8EE', 8), [])
  const tables = useMemo(
    () => [
      { lx: -3.4, lz: 2.6, c: '#F2B33D' },
      { lx: 0.2, lz: 3.6, c: '#5B9BD5' },
      { lx: 3.6, lz: 2.4, c: '#5FA36B' },
    ],
    [],
  )
  useEffect(() => {
    boxCol('kiosk', x, z, 3.8, 2.6, rot)
    tables.forEach((t, i) => {
      const [wx, wz] = localPt(x, z, rot, t.lx, t.lz)
      setCollider(`cafe-table:${i}`, { kind: 'circle', x: wx, z: wz, r: 0.55 })
    })
  }, [x, z, rot, tables])
  return (
    <group position={[x, 0, z]} rotation-y={rot}>
      <RoundedBox args={[3.8, 2.3, 2.4]} radius={0.1} position-y={1.15} castShadow receiveShadow>
        <meshStandardMaterial color="#FBF6EE" roughness={0.8} />
      </RoundedBox>
      <mesh position={[0, 1.4, 1.21]}>
        <boxGeometry args={[2.6, 0.9, 0.02]} />
        <meshStandardMaterial color="#3B2A20" />
      </mesh>
      <RoundedBox args={[3.9, 0.12, 0.6]} radius={0.04} position={[0, 1.02, 1.35]} castShadow>
        <meshStandardMaterial color="#B98B62" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, 2.48, 1.55]} rotation-x={0.42} castShadow>
        <boxGeometry args={[4.1, 0.05, 1.3]} />
        <meshStandardMaterial map={awning} roughness={0.8} />
      </mesh>
      {[-1.1, -0.2, 0.7].map((cx, i) => (
        <mesh key={i} position={[cx, 1.16, 1.4]}>
          <cylinderGeometry args={[0.07, 0.06, 0.16, 10]} />
          <meshStandardMaterial color={i % 2 ? '#FFFFFF' : '#E0905F'} />
        </mesh>
      ))}
      {tables.map((t, i) => (
        <UmbrellaTable key={i} position={[t.lx, 0, t.lz]} color={t.c} seed={i} />
      ))}
    </group>
  )
}

function UmbrellaTable({ position, color, seed }: { position: [number, number, number]; color: string; seed: number }) {
  return (
    <group position={position}>
      <mesh position-y={0.72} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 24]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </mesh>
      <mesh position-y={0.36}>
        <cylinderGeometry args={[0.04, 0.06, 0.72, 8]} />
        <meshStandardMaterial color="#4B5563" />
      </mesh>
      <mesh position-y={1.4}>
        <cylinderGeometry args={[0.025, 0.025, 1.4, 6]} />
        <meshStandardMaterial color="#E5E7EB" />
      </mesh>
      <mesh position-y={2.15} castShadow>
        <coneGeometry args={[1.15, 0.5, 10, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} flatShading />
      </mesh>
      {[0, 1, 2].map((k) => {
        const a = (k / 3) * Math.PI * 2 + seed
        return (
          <mesh key={k} position={[Math.cos(a) * 0.85, 0.24, Math.sin(a) * 0.85]} castShadow>
            <cylinderGeometry args={[0.18, 0.16, 0.48, 12]} />
            <meshStandardMaterial color="#5B3B28" roughness={0.8} />
          </mesh>
        )
      })}
    </group>
  )
}

// ---------------- Pond ----------------
export function Pond() {
  const [x, z] = polar(15.8, 60)
  const R = 2.7
  const pads = useMemo(() => {
    const r = rng(9)
    return Array.from({ length: 7 }, () => ({ a: r() * Math.PI * 2, rr: 0.6 + r() * (R - 1.2), s: 0.22 + r() * 0.14, sp: (r() - 0.5) * 0.08, cut: r() * Math.PI * 2 }))
  }, [])
  const padRefs = useRef<(THREE.Mesh | null)[]>([])
  const ripples = useRef<(THREE.Mesh | null)[]>([])
  useEffect(() => setCollider('pond', { kind: 'circle', x, z, r: R + 0.35 }), [x, z])
  useFrame(({ clock }) => {
    if (reducedMotion()) return
    const t = clock.elapsedTime
    pads.forEach((p, i) => {
      const m = padRefs.current[i]
      if (!m) return
      const a = p.a + t * p.sp
      m.position.set(Math.cos(a) * p.rr, 0.015, Math.sin(a) * p.rr)
      m.rotation.z = p.cut + t * p.sp * 2
    })
    ripples.current.forEach((m, i) => {
      if (!m) return
      const ph = ((t + i * 2.75) % 5.5) / 5.5
      m.scale.setScalar(0.3 + ph * 2.2)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.22 * (1 - ph)
    })
  })
  return (
    <group position={[x, 0, z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} receiveShadow>
        <circleGeometry args={[R, 48]} />
        <meshStandardMaterial color="#86C7DA" roughness={0.12} metalness={0.1} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-6} />
      </mesh>
      <mesh position-y={0.07} receiveShadow castShadow>
        <torusGeometry args={[R + 0.17, 0.2, 6, 40]} />
        <meshStandardMaterial color="#D9CFC0" roughness={0.9} flatShading />
      </mesh>
      {pads.map((p, i) => (
        <mesh key={i} ref={(el) => void (padRefs.current[i] = el)} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[p.s, 16, 0.4, Math.PI * 2 - 0.4]} />
          <meshStandardMaterial color="#5E9E64" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {[0, 1].map((i) => (
        <mesh key={i} ref={(el) => void (ripples.current[i] = el)} rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[0.45, 0.5, 40]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ))}
      {[
        [R + 0.4, 0.2, 0.42],
        [-(R + 0.3), 1.2, 0.32],
        [0.6, -(R + 0.45), 0.36],
      ].map(([rx, rz, s], i) => (
        <mesh key={i} position={[rx, s * 0.5, rz]} castShadow>
          <dodecahedronGeometry args={[s, 0]} />
          <meshStandardMaterial color="#B8B2A8" flatShading roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------- Picnic tables ----------------
export function PicnicTables() {
  const spots = useMemo(() => [112, 127].map((a) => polar(14.8, a)), [])
  useEffect(() => {
    spots.forEach(([x, z], i) => boxCol(`picnic:${i}`, x, z, 1.9, 1.6, faceCentre(x, z) + 0.4))
  }, [spots])
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation-y={faceCentre(x, z) + 0.4}>
          <PicnicTable />
        </group>
      ))}
    </group>
  )
}

function PicnicTable() {
  const wood = '#B98B62'
  const leg = '#8C6649'
  return (
    <group>
      <RoundedBox args={[1.9, 0.08, 0.8]} radius={0.03} position-y={0.75} castShadow receiveShadow>
        <meshStandardMaterial color={wood} roughness={0.8} />
      </RoundedBox>
      {[-0.65, 0.65].map((z) => (
        <RoundedBox key={z} args={[1.9, 0.07, 0.3]} radius={0.025} position={[0, 0.45, z]} castShadow receiveShadow>
          <meshStandardMaterial color={wood} roughness={0.8} />
        </RoundedBox>
      ))}
      {[-0.75, 0.75].map((x) =>
        [-1, 1].map((sd) => (
          <mesh key={`${x}${sd}`} position={[x, 0.38, sd * 0.32]} rotation-x={sd * 0.42} castShadow>
            <boxGeometry args={[0.07, 0.85, 0.07]} />
            <meshStandardMaterial color={leg} />
          </mesh>
        )),
      )}
    </group>
  )
}

// ---------------- Garden ----------------
export function Garden() {
  const [gx, gz] = polar(16.2, 180)
  const rot = faceCentre(gx, gz)
  const beds = useMemo(() => {
    const out: { lx: number; lz: number }[] = []
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) out.push({ lx: (col - 1) * 2.9, lz: (row - 0.5) * 2.1 })
    return out
  }, [])
  useEffect(() => {
    beds.forEach((b, i) => {
      const [x, z] = localPt(gx, gz, rot, b.lx, b.lz)
      boxCol(`bed:${i}`, x, z, 2.2, 1.2, rot)
    })
  }, [beds, gx, gz, rot])
  const plantColors = ['#5E9C5A', '#6BAA62', '#4F8C55']
  const flowerColors = ['#F472B6', '#FBBF24', '#C084FC', '#FB7185']
  return (
    <group position={[gx, 0, gz]} rotation-y={rot}>
      {beds.map((b, i) => (
        <group key={i} position={[b.lx, 0, b.lz]}>
          <RoundedBox args={[2.2, 0.45, 1.2]} radius={0.04} position-y={0.225} castShadow receiveShadow>
            <meshStandardMaterial color="#A97A55" roughness={0.9} />
          </RoundedBox>
          <mesh position-y={0.452} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[2.0, 1.0]} />
            <meshStandardMaterial color="#5B3F2C" roughness={1} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => {
            const px = -0.7 + (k % 3) * 0.7
            const pz = k < 3 ? -0.25 : 0.25
            const flower = k % 3 === 2
            return (
              <group key={k} position={[px, 0.62, pz]}>
                <mesh castShadow>
                  <icosahedronGeometry args={[0.22, 0]} />
                  <meshStandardMaterial color={plantColors[(i + k) % 3]} flatShading />
                </mesh>
                {flower &&
                  [0, 1, 2].map((f) => (
                    <mesh key={f} position={[Math.cos(f * 2.1) * 0.14, 0.13, Math.sin(f * 2.1) * 0.14]}>
                      <icosahedronGeometry args={[0.06, 0]} />
                      <meshStandardMaterial color={flowerColors[(i + f) % 4]} flatShading />
                    </mesh>
                  ))}
              </group>
            )
          })}
        </group>
      ))}
    </group>
  )
}

