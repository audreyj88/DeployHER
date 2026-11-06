'use client'
// Grass, the round stone plaza, the paved paths and the flowers along them.
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PLACES } from '@/lib/places'
import { decal, deg, doorDist, polar } from './geo'
import { rng } from './rng'
import { grassTexture, plazaTexture } from './textures'

export function Ground() {
  const grass = useMemo(() => grassTexture(), [])
  const plaza = useMemo(() => plazaTexture(5), [])
  const plazaMat = useMemo(() => decal(new THREE.MeshStandardMaterial({ map: plaza, roughness: 0.95 }), 1), [plaza])
  const ringMat = useMemo(() => decal(new THREE.MeshStandardMaterial({ color: '#D8CDBD', roughness: 0.95 }), 2), [])
  const pathTex = useMemo(() => {
    const t = plazaTexture(1).clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.needsUpdate = true
    return t
  }, [])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial map={grass} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow material={plazaMat} renderOrder={1}>
        <circleGeometry args={[9.5, 96]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0} receiveShadow material={ringMat} renderOrder={2}>
        <ringGeometry args={[9.28, 9.5, 96]} />
      </mesh>
      {PLACES.map((p) => {
        const start = 9.2
        const end = doorDist(p.id) + 0.6
        const len = end - start
        const mid = polar(start + len / 2, p.angleDeg)
        return <PathSlab key={p.id} x={mid[0]} z={mid[1]} len={len} angle={p.angleDeg} tex={pathTex} />
      })}
      <PathFlowers />
    </group>
  )
}

function PathSlab({ x, z, len, angle, tex }: { x: number; z: number; len: number; angle: number; tex: THREE.Texture }) {
  const mat = useMemo(() => {
    const t = tex.clone()
    t.repeat.set(3 / 8, len / 8)
    t.needsUpdate = true
    return decal(new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }), 0)
  }, [tex, len])
  // plane local Y (after rotation) = path direction
  return (
    <mesh position={[x, 0, z]} rotation={[-Math.PI / 2, 0, -deg(angle) - Math.PI / 2]} receiveShadow material={mat} renderOrder={1}>
      <planeGeometry args={[3, len]} />
    </mesh>
  )
}

const FLOWER_COLORS = ['#B9A3E3', '#FFFFFF', '#F7E38E', '#C8B6F0', '#FFF6C9']

function PathFlowers() {
  const stems = useRef<THREE.InstancedMesh>(null)
  const heads = useRef<THREE.InstancedMesh>(null)
  const spots = useMemo(() => {
    const r = rng(42)
    const out: { x: number; z: number; c: string; s: number }[] = []
    for (const p of PLACES) {
      const a = deg(p.angleDeg)
      const ux = Math.cos(a)
      const uz = Math.sin(a)
      const nx = -uz
      const nz = ux
      for (let d = 11.7; d <= doorDist(p.id) - 1.2; d += 2.6) {
        for (const side of [-1, 1]) {
          const off = 2.0 + r() * 0.8
          const cx = ux * d + nx * off * side
          const cz = uz * d + nz * off * side
          for (let k = 0; k < 7; k++) {
            const ang = r() * Math.PI * 2
            const rr = Math.sqrt(r()) * 0.42
            out.push({ x: cx + Math.cos(ang) * rr, z: cz + Math.sin(ang) * rr, c: FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)], s: 0.8 + r() * 0.5 })
          }
        }
      }
    }
    return out
  }, [])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const c = new THREE.Color()
    spots.forEach((f, i) => {
      m.compose(new THREE.Vector3(f.x, 0.12 * f.s, f.z), q, new THREE.Vector3(1, f.s, 1))
      stems.current!.setMatrixAt(i, m)
      m.compose(new THREE.Vector3(f.x, 0.24 * f.s + 0.02, f.z), q, new THREE.Vector3(f.s, f.s, f.s))
      heads.current!.setMatrixAt(i, m)
      heads.current!.setColorAt(i, c.set(f.c))
    })
    stems.current!.instanceMatrix.needsUpdate = true
    heads.current!.instanceMatrix.needsUpdate = true
    if (heads.current!.instanceColor) heads.current!.instanceColor.needsUpdate = true
  }, [spots])

  return (
    <group>
      <instancedMesh ref={stems} args={[undefined, undefined, spots.length]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.24, 4]} />
        <meshStandardMaterial color="#4E8A4A" />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, spots.length]} castShadow>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial flatShading roughness={0.7} />
      </instancedMesh>
    </group>
  )
}
