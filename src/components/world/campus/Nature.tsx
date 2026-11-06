'use client'
// Trees and flowering bushes: the loose edge belt, the outer forest and the groves. Instanced, swaying in a breeze.
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { setCollider } from '../colliders'
import { deg } from './geo'
import { reducedMotion, rng } from './rng'

const TREE_GREENS = ['#6FA36B', '#5E9460', '#7DB077', '#4F8757']
const BUSH_GREENS = ['#5E9C5A', '#6BAA62', '#4F8C55']
const BLOSSOMS = ['#F472B6', '#FBBF24', '#FFFFFF', '#C084FC', '#FB7185']

export interface TreeSpec {
  x: number
  z: number
  s: number
  v: number // shape seed: > 0.45 = round
  seed: number
  color: string
  collide?: boolean
}
export interface BushSpec {
  x: number
  z: number
  s: number
  seed: number
  color: string
}

/** Extra trees placed by other campus features (groves, etc). */
function grovesAndExtras(r: () => number): TreeSpec[] {
  const out: TreeSpec[] = []
  // tree groves near −60°
  const groveCentres: [number, number][] = [
    [16.5, -60],
    [17.5, -56],
    [18.5, -69],
    [33, -60],
    [35, -40],
    [33, 0],
    [34, 60],
    [33, 120],
    [34, 180],
    [33, -178],
  ]
  for (const [rad, a] of groveCentres) {
    const cx = Math.cos(deg(a)) * rad
    const cz = Math.sin(deg(a)) * rad
    const n = rad < 25 ? 2 : 3
    for (let i = 0; i < n; i++) {
      const ang = r() * Math.PI * 2
      const rr = 0.6 + r() * 1.8
      out.push({ x: cx + Math.cos(ang) * rr, z: cz + Math.sin(ang) * rr, s: 0.8 + r() * 0.5, v: r(), seed: r(), color: TREE_GREENS[Math.floor(r() * 4)], collide: true })
    }
  }
  return out
}

export function useNatureLayout() {
  return useMemo(() => {
    const r = rng(2024)
    const trees: TreeSpec[] = []
    const bushes: BushSpec[] = []
    // edge belt: 70 slots, ~18% empty
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + (r() - 0.5) * 0.05
      if (r() < 0.18) continue
      let d = 38.8 + r() * 2.6
      if (r() < 0.45) {
        d += 1.2
        trees.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.8 + r() * 0.7, v: r(), seed: r(), color: TREE_GREENS[Math.floor(r() * 4)] })
      } else {
        bushes.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.7 + r() * 0.6, seed: r(), color: BUSH_GREENS[Math.floor(r() * 3)] })
      }
    }
    // outer forest
    for (let i = 0; i < 64; i++) {
      const a = r() * Math.PI * 2
      const d = 42.5 + r() * 36
      trees.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.9 + r() * 0.7, v: r(), seed: r(), color: TREE_GREENS[Math.floor(r() * 4)] })
    }
    trees.push(...grovesAndExtras(r))
    return { trees, bushes }
  }, [])
}

const tmpM = new THREE.Matrix4()
const tmpQ = new THREE.Quaternion()
const tmpE = new THREE.Euler()
const tmpP = new THREE.Vector3()
const tmpS = new THREE.Vector3()
const tmpL = new THREE.Matrix4()

function sway(t: number, x: number, z: number, seed: number, a: number, speed: number) {
  const ph = x * 0.09 + z * 0.05 + seed * 6.28
  return [Math.sin(t * speed + ph) * a, Math.sin(t * speed * 0.83 + ph * 1.7) * a * 0.8] as const
}

export function Nature() {
  const { trees, bushes } = useNatureLayout()
  const round = useMemo(() => trees.filter((t) => t.v > 0.45), [trees])
  const cones = useMemo(() => trees.filter((t) => t.v <= 0.45), [trees])

  const trunk = useRef<THREE.InstancedMesh>(null)
  const ico1 = useRef<THREE.InstancedMesh>(null)
  const ico2 = useRef<THREE.InstancedMesh>(null)
  const cone = useRef<THREE.InstancedMesh>(null)
  const bush1 = useRef<THREE.InstancedMesh>(null)
  const bush2 = useRef<THREE.InstancedMesh>(null)
  const blossom = useRef<THREE.InstancedMesh>(null)

  // per-bush blossom offsets
  const blossomSpots = useMemo(() => {
    const r = rng(77)
    return bushes.flatMap((b, bi) =>
      Array.from({ length: 9 }, () => {
        const th = r() * Math.PI * 2
        const ph = r() * 1.2
        const rad = 0.62
        return { bi, ox: Math.cos(th) * Math.sin(ph + 0.3) * rad, oy: 0.55 + Math.cos(ph + 0.3) * rad * 0.9, oz: Math.sin(th) * Math.sin(ph + 0.3) * rad, c: BLOSSOMS[Math.floor(r() * BLOSSOMS.length)] }
      }),
    )
  }, [bushes])

  useEffect(() => {
    trees.forEach((t, i) => {
      if (t.collide) setCollider(`tree:${i}`, { kind: 'circle', x: t.x, z: t.z, r: 0.3 * t.s })
    })
  }, [trees])

  useLayoutEffect(() => {
    const c = new THREE.Color()
    round.forEach((t, i) => {
      ico1.current!.setColorAt(i, c.set(t.color))
      ico2.current!.setColorAt(i, c.set(t.color).offsetHSL(0, 0, 0.05))
    })
    cones.forEach((t, i) => cone.current!.setColorAt(i, c.set(t.color)))
    bushes.forEach((b, i) => {
      bush1.current!.setColorAt(i, c.set(b.color))
      bush2.current!.setColorAt(i, c.set(b.color).offsetHSL(0, 0, 0.04))
    })
    blossomSpots.forEach((s, i) => blossom.current!.setColorAt(i, c.set(s.c)))
    for (const m of [ico1, ico2, cone, bush1, bush2, blossom]) if (m.current?.instanceColor) m.current.instanceColor.needsUpdate = true
    update(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function place(mesh: THREE.InstancedMesh, i: number, x: number, z: number, s: number, rx: number, rz: number, lx: number, ly: number, lz: number, ls: number) {
    tmpE.set(rx, 0, rz)
    tmpQ.setFromEuler(tmpE)
    tmpM.compose(tmpP.set(x, 0, z), tmpQ, tmpS.set(s, s, s))
    tmpL.makeTranslation(lx, ly, lz)
    tmpL.scale(tmpS.set(ls, ls, ls))
    tmpM.multiply(tmpL)
    mesh.setMatrixAt(i, tmpM)
  }

  function update(t: number) {
    if (!trunk.current) return
    trees.forEach((tr, i) => {
      const [rx, rz] = sway(t, tr.x, tr.z, tr.seed, 0.018, 0.9 + tr.seed * 0.3)
      place(trunk.current!, i, tr.x, tr.z, tr.s, rx, rz, 0, 0.6, 0, 1)
    })
    round.forEach((tr, i) => {
      const [rx, rz] = sway(t, tr.x, tr.z, tr.seed, 0.018, 0.9 + tr.seed * 0.3)
      place(ico1.current!, i, tr.x, tr.z, tr.s, rx, rz, 0, 1.75, 0, 1)
      place(ico2.current!, i, tr.x, tr.z, tr.s, rx, rz, 0.35 * (tr.seed - 0.5), 2.45, 0.2, 1)
    })
    cones.forEach((tr, i) => {
      const [rx, rz] = sway(t, tr.x, tr.z, tr.seed, 0.018, 0.9 + tr.seed * 0.3)
      place(cone.current!, i, tr.x, tr.z, tr.s, rx, rz, 0, 2.3, 0, 1)
    })
    bushes.forEach((b, i) => {
      const [rx, rz] = sway(t, b.x, b.z, b.seed, 0.025, 1.0 + b.seed * 0.3)
      place(bush1.current!, i, b.x, b.z, b.s, rx, rz, 0, 0.45, 0, 1)
      place(bush2.current!, i, b.x, b.z, b.s, rx, rz, 0.35, 0.75, 0.15, 1)
    })
    blossomSpots.forEach((sp, i) => {
      const b = bushes[sp.bi]
      const [rx, rz] = sway(t, b.x, b.z, b.seed, 0.025, 1.0 + b.seed * 0.3)
      place(blossom.current!, i, b.x, b.z, b.s, rx, rz, sp.ox, sp.oy, sp.oz, 1)
    })
    for (const m of [trunk, ico1, ico2, cone, bush1, bush2, blossom]) if (m.current) m.current.instanceMatrix.needsUpdate = true
  }

  const frame = useRef(0)
  useFrame(({ clock }) => {
    if (reducedMotion()) return
    // update every other frame: plenty for a gentle breeze
    frame.current++
    if (frame.current % 2) return
    update(clock.elapsedTime)
  })

  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow frustumCulled={false}>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 7]} />
        <meshStandardMaterial color="#8B6A4E" flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={ico1} args={[undefined, undefined, Math.max(1, round.length)]} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[0.95, 0]} />
        <meshStandardMaterial flatShading roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={ico2} args={[undefined, undefined, Math.max(1, round.length)]} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial flatShading roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={cone} args={[undefined, undefined, Math.max(1, cones.length)]} castShadow frustumCulled={false}>
        <coneGeometry args={[0.9, 2.6, 7]} />
        <meshStandardMaterial flatShading roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={bush1} args={[undefined, undefined, Math.max(1, bushes.length)]} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={bush2} args={[undefined, undefined, Math.max(1, bushes.length)]} castShadow frustumCulled={false}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={blossom} args={[undefined, undefined, Math.max(1, blossomSpots.length)]} frustumCulled={false}>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial flatShading roughness={0.6} />
      </instancedMesh>
    </group>
  )
}
