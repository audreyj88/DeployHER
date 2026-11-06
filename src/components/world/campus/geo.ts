// Geometry helpers for flat campus markings, built directly in the XZ plane.
import * as THREE from 'three'
import { PLACES, roomFrame, type PlaceId } from '@/lib/places'

/** A flat strip following a polyline of [x,z] points, `w` wide, at height y. */
export function stripGeometry(pts: [number, number][], w: number, y = 0): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  let acc = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    let tx = b[0] - a[0]
    let tz = b[1] - a[1]
    const l = Math.hypot(tx, tz) || 1
    tx /= l
    tz /= l
    const nx = -tz
    const nz = tx
    if (i > 0) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
    pos.push(p[0] + (nx * w) / 2, y, p[1] + (nz * w) / 2, p[0] - (nx * w) / 2, y, p[1] - (nz * w) / 2)
    uv.push(0, acc, 1, acc)
    if (i > 0) {
      const k = i * 2
      idx.push(k - 2, k - 1, k, k - 1, k + 1, k)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  // make sure normals point up
  const n = g.getAttribute('normal')
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0)
  return g
}

export const deg = (a: number) => (a * Math.PI) / 180
export const polar = (r: number, aDeg: number): [number, number] => [Math.cos(deg(aDeg)) * r, Math.sin(deg(aDeg)) * r]

/** Arc points at radius r from angle a0 to a1 (degrees) in n segments. */
export function arcPoints(r: number, a0: number, a1: number, n: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= n; i++) out.push(polar(r, a0 + ((a1 - a0) * i) / n))
  return out
}

export const TRACK_R = 4.8

/** Distance from campus centre to a room's door. */
export const doorDist = (id: PlaceId) => PLACES.find((p) => p.id === id)!.radius - 6

/** A point along a room's axis at distance `r` from the campus centre. */
export function onAxis(id: PlaceId, r: number): [number, number] {
  const a = PLACES.find((p) => p.id === id)!.angleDeg
  return polar(r, a)
}

/** Door position offset by `d` toward the plaza (positive) or into the room (negative). */
export function doorPoint(id: PlaceId, d = 0): [number, number] {
  const f = roomFrame(id)
  return [f.doorX + f.dirX * d, f.doorZ + f.dirZ * d]
}

/** Material tweaks for stacked flat markings: never z-fight. */
export function decal(mat: THREE.Material, layer: number) {
  mat.polygonOffset = true
  mat.polygonOffsetFactor = -1 - layer
  mat.polygonOffsetUnits = -4 * (layer + 1)
  mat.depthWrite = false
  return mat
}
