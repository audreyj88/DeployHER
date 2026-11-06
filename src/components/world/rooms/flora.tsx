'use client'
// Instanced flowers and leafy bits for planters, vines and garden beds.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from './util'

export const GH_FLOWERS = ['#F472B6', '#FB7185', '#FBBF24', '#C084FC', '#FFFFFF', '#F9A8D4', '#A78BFA', '#FCD34D']

const dummy = new THREE.Object3D()
const col = new THREE.Color()

/** Instanced flowers scattered over a rectangle (x, z centre; w × d) at height y. */
export function FlowerPatch({ x, z, w, d, y = 0, count, seed = 1, colors = GH_FLOWERS, stem = 0.24, head = 0.07 }: { x: number; z: number; w: number; d: number; y?: number; count: number; seed?: number; colors?: string[]; stem?: number; head?: number }) {
  const heads = useRef<THREE.InstancedMesh>(null)
  const stems = useRef<THREE.InstancedMesh>(null)
  const leaves = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => {
    const r = mulberry32(seed * 131 + count)
    return Array.from({ length: count }, () => ({ x: x + (r() - 0.5) * w, z: z + (r() - 0.5) * d, h: stem * (0.7 + r() * 0.6), s: head * (0.8 + r() * 0.5), c: colors[Math.floor(r() * colors.length)], ry: r() * 6.28 }))
  }, [x, z, w, d, count, seed, colors, stem, head])
  useLayoutEffect(() => {
    pts.forEach((p, i) => {
      dummy.position.set(p.x, y + p.h, p.z)
      dummy.rotation.set(0, p.ry, 0)
      dummy.scale.setScalar(p.s / 0.07)
      dummy.updateMatrix()
      heads.current?.setMatrixAt(i, dummy.matrix)
      heads.current?.setColorAt(i, col.set(p.c))
      dummy.position.set(p.x, y + p.h / 2, p.z)
      dummy.scale.set(1, p.h / 0.24, 1)
      dummy.updateMatrix()
      stems.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.set(p.x, y + 0.06, p.z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      leaves.current?.setMatrixAt(i, dummy.matrix)
    })
    for (const m of [heads.current, stems.current, leaves.current]) {
      if (!m) continue
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  }, [pts, y])
  return (
    <group>
      <instancedMesh ref={stems} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.008, 0.01, 0.24, 4]} />
        <meshStandardMaterial color="#4E8A4A" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial color="#5E9E64" roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, count]} castShadow>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial roughness={0.7} flatShading />
      </instancedMesh>
    </group>
  )
}

/** Wooden or terracotta planter box filled with soil + flowers. */
export function Planter({ x, z, w, d, h = 0.45, color = '#B98B5E', count, seed = 1, colors }: { x: number; z: number; w: number; d: number; h?: number; color?: string; count?: number; seed?: number; colors?: string[] }) {
  const n = count ?? Math.round(w * d * 14)
  return (
    <group>
      <mesh position={[x, h / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[x, h + 0.005, z]}>
        <boxGeometry args={[w - 0.1, 0.02, d - 0.1]} />
        <meshStandardMaterial color="#5B3A26" roughness={1} />
      </mesh>
      <FlowerPatch x={x} z={z} w={w - 0.2} d={d - 0.2} y={h} count={n} seed={seed} colors={colors} />
    </group>
  )
}

/** Leaf blobs along a path of points (vines). */
export function LeafChain({ points, size = 0.09, color = '#4E9F5D' }: { points: THREE.Vector3[]; size?: number; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    points.forEach((p, i) => {
      dummy.position.copy(p)
      dummy.rotation.set(i, i * 1.3, 0)
      dummy.scale.setScalar(0.7 + ((i * 37) % 10) / 15)
      dummy.updateMatrix()
      ref.current?.setMatrixAt(i, dummy.matrix)
    })
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true
  }, [points])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, points.length]}>
      <icosahedronGeometry args={[size, 0]} />
      <meshStandardMaterial color={color} roughness={0.85} flatShading />
    </instancedMesh>
  )
}
