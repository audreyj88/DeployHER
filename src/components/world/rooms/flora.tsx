'use client'
// Instanced flowers and leafy bits for planters, vines and garden beds.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mulberry32 } from './util'

export const GH_FLOWERS = ['#F472B6', '#FB7185', '#FBBF24', '#C084FC', '#FFFFFF', '#F9A8D4', '#A78BFA', '#FCD34D']

const dummy = new THREE.Object3D()
const col = new THREE.Color()

/** Instanced flowers scattered over a rectangle (x, z center; w × d) at height y. */
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

// ---------------- Seed beds: freshly planted rows, mostly sprouts, nothing in bloom ----------------

const LEAF_GREENS = ['#6CC484', '#5BBD76', '#7FD08F', '#4CAF66']
const TAG_COLORS = ['#F7B2D0', '#FFD166', '#C4B5FD', '#FFFFFF', '#93C5FD']

interface Seedling {
  x: number
  z: number
  /** 0 = seed still under the soil · 0–1 = cotyledons · >1 = first true leaves */
  g: number
  ry: number
  leaf: string
  bud: boolean
}

/** Rows of seedlings, seed mounds and row markers over a rectangle at height y. Rows run along the longer side. */
export function Seedlings({ x, z, w, d, y = 0, seed = 1, spacing = 0.24, rowGap = 0.28, bare = 0.22, budChance = 0.04, size = 1.4 }: { x: number; z: number; w: number; d: number; y?: number; seed?: number; spacing?: number; rowGap?: number; bare?: number; budChance?: number; size?: number }) {
  const alongX = w >= d
  const long = alongX ? w : d
  const short = alongX ? d : w
  const { plants, mounds, markers, furrows } = useMemo(() => {
    const r = mulberry32(seed * 977 + Math.round(long * 10))
    const rows = Math.max(1, Math.floor(short / rowGap))
    const perRow = Math.max(1, Math.floor((long - 0.25) / spacing))
    const plants: Seedling[] = []
    const mounds: { x: number; z: number }[] = []
    const markers: { x: number; z: number; tag: string; tilt: number }[] = []
    const furrows: { x: number; z: number }[] = []
    const pt = (a: number, b: number) => (alongX ? { x: x + a, z: z + b } : { x: x + b, z: z + a })
    for (let ri = 0; ri < rows; ri++) {
      const b = (ri - (rows - 1) / 2) * (short / rows)
      furrows.push(pt(0, b))
      // Each row gets its own "planted on" day, so some rows are further along than others.
      const rowAge = r()
      markers.push({ ...pt(-long / 2 + 0.1, b), tag: TAG_COLORS[Math.floor(r() * TAG_COLORS.length)], tilt: (r() - 0.5) * 0.25 })
      for (let i = 0; i < perRow; i++) {
        const a = -long / 2 + 0.25 + i * spacing + (r() - 0.5) * 0.04
        const p = pt(a, b + (r() - 0.5) * 0.04)
        mounds.push(p)
        if (r() < bare + (1 - rowAge) * 0.25) continue
        const g = Math.min(1.9, 0.25 + rowAge * 1.2 + r() * 0.6)
        plants.push({ ...p, g, ry: r() * Math.PI, leaf: LEAF_GREENS[Math.floor(r() * LEAF_GREENS.length)], bud: g > 1.5 && r() < budChance * 6 })
      }
    }
    return { plants, mounds, markers, furrows }
  }, [x, z, long, short, alongX, seed, spacing, rowGap, bare, budChance])

  const stems = useRef<THREE.InstancedMesh>(null)
  const leaves = useRef<THREE.InstancedMesh>(null)
  const buds = useRef<THREE.InstancedMesh>(null)
  const moundRef = useRef<THREE.InstancedMesh>(null)
  const stakes = useRef<THREE.InstancedMesh>(null)
  const tags = useRef<THREE.InstancedMesh>(null)
  const furrowRef = useRef<THREE.InstancedMesh>(null)
  const budList = plants.filter((p) => p.bud)

  useLayoutEffect(() => {
    let li = 0
    let bi = 0
    plants.forEach((p, i) => {
      const h = (p.g <= 1 ? 0.03 + p.g * 0.07 : 0.1 + (p.g - 1) * 0.12) * size
      dummy.rotation.set(0, p.ry, 0)
      dummy.position.set(p.x, y + h / 2, p.z)
      dummy.scale.set(size, h, size)
      dummy.updateMatrix()
      stems.current?.setMatrixAt(i, dummy.matrix)
      // Pair of cotyledons at the top while small; true leaves above them once g > 1.
      const pairs: { hy: number; s: number; turn: number }[] = [{ hy: p.g <= 1 ? h : 0.1 * size, s: (0.5 + Math.min(1, p.g) * 0.5) * size, turn: 0 }]
      pairs.push({ hy: h, s: p.g > 1 ? Math.min(1, (p.g - 1) * 1.4) * 1.25 * size : 0, turn: Math.PI / 2 })
      for (const pr of pairs)
        for (const side of [-1, 1]) {
          const a = p.ry + pr.turn
          const s = pr.s
          dummy.position.set(p.x + Math.cos(a) * side * 0.035 * s, y + pr.hy + 0.008, p.z - Math.sin(a) * side * 0.035 * s)
          dummy.rotation.set(0, a, side * 0.45)
          dummy.scale.set(0.045 * s, 0.01 * s, 0.026 * s)
          dummy.updateMatrix()
          leaves.current?.setMatrixAt(li, dummy.matrix)
          leaves.current?.setColorAt(li, col.set(p.leaf))
          li++
        }
      if (p.bud) {
        dummy.position.set(p.x, y + h + 0.025 * size, p.z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(size, 1.4 * size, size)
        dummy.updateMatrix()
        buds.current?.setMatrixAt(bi++, dummy.matrix)
      }
    })
    mounds.forEach((m, i) => {
      dummy.position.set(m.x, y, m.z)
      dummy.rotation.set(0, i, 0)
      dummy.scale.set(1, 0.45, 1)
      dummy.updateMatrix()
      moundRef.current?.setMatrixAt(i, dummy.matrix)
    })
    markers.forEach((m, i) => {
      dummy.position.set(m.x, y + 0.12, m.z)
      dummy.rotation.set(0, 0, m.tilt)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      stakes.current?.setMatrixAt(i, dummy.matrix)
      dummy.position.set(m.x, y + 0.2, m.z)
      dummy.updateMatrix()
      tags.current?.setMatrixAt(i, dummy.matrix)
      tags.current?.setColorAt(i, col.set(m.tag))
    })
    furrows.forEach((f, i) => {
      dummy.position.set(f.x, y + 0.002, f.z)
      dummy.rotation.set(0, alongX ? 0 : Math.PI / 2, 0)
      dummy.scale.set(long - 0.15, 1, 1)
      dummy.updateMatrix()
      furrowRef.current?.setMatrixAt(i, dummy.matrix)
    })
    for (const m of [stems.current, leaves.current, buds.current, moundRef.current, stakes.current, tags.current, furrowRef.current]) {
      if (!m) continue
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
  }, [plants, mounds, markers, furrows, y, long, alongX, size])

  return (
    <group>
      <instancedMesh ref={furrowRef} args={[undefined, undefined, furrows.length]} receiveShadow>
        <boxGeometry args={[1, 0.012, 0.12]} />
        <meshStandardMaterial color="#4A2E1C" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={moundRef} args={[undefined, undefined, mounds.length]}>
        <sphereGeometry args={[0.045, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6B4429" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={stems} args={[undefined, undefined, plants.length]}>
        <cylinderGeometry args={[0.006, 0.008, 1, 4]} />
        <meshStandardMaterial color="#7DB86A" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[undefined, undefined, plants.length * 4]} castShadow>
        <sphereGeometry args={[1, 7, 5]} />
        <meshStandardMaterial roughness={0.75} flatShading />
      </instancedMesh>
      {budList.length > 0 && (
        <instancedMesh ref={buds} args={[undefined, undefined, budList.length]}>
          <sphereGeometry args={[0.018, 6, 5]} />
          <meshStandardMaterial color="#9CCB7A" roughness={0.7} flatShading />
        </instancedMesh>
      )}
      <instancedMesh ref={stakes} args={[undefined, undefined, markers.length]} castShadow>
        <boxGeometry args={[0.018, 0.26, 0.012]} />
        <meshStandardMaterial color="#C8A27A" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={tags} args={[undefined, undefined, markers.length]}>
        <boxGeometry args={[0.09, 0.06, 0.008]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
    </group>
  )
}

/** Planter box filled with dark, freshly turned soil and rows of seedlings. */
export function SeedBed({ x, z, w, d, h = 0.45, color = '#B98B5E', seed = 1 }: { x: number; z: number; w: number; d: number; h?: number; color?: string; seed?: number }) {
  return (
    <group>
      <mesh position={[x, h / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[x, h - 0.02, z]} receiveShadow>
        <boxGeometry args={[w - 0.1, 0.06, d - 0.1]} />
        <meshStandardMaterial color="#5B3A26" roughness={1} />
      </mesh>
      <Seedlings x={x} z={z} w={w - 0.25} d={d - 0.2} y={h + 0.01} seed={seed} />
    </group>
  )
}
