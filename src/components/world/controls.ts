// Movement + camera interaction state shared by Player and CameraRig, and the walk planners.
import { localToWorld, roomAt, worldToLocal, type PlaceId } from '@/lib/places'
import { polar } from './campus/geo'

export type P2 = [number, number]

export const input = {
  keys: new Set<string>(),
}

export const nav = {
  path: [] as P2[],
  /** Called when the final waypoint is reached. */
  onArrive: null as null | (() => void),
  /** Collisions are skipped within 1.2 of this point (sitting down at a chair). */
  ghostNear: null as null | P2,
  stuckT: 0,
  lastD: Infinity,
}

export const cam = {
  zoomTarget: 1.2,
  logDist: Math.log(32 * 1.2),
  panX: 0,
  panZ: 0,
  gliding: false,
  yaw: 0,
  pitch: 0.68,
  blend: 0,
  roomDismissed: false,
  /** World yaw of the current shot's forward direction on the ground (for screen-relative keys). */
  shotFwdX: 0,
  shotFwdZ: -1,
  fov: 30,
}

export const zoomNow = () => Math.exp(cam.logDist) / 32

export function setPath(path: P2[], onArrive: (() => void) | null = null, ghostNear: P2 | null = null) {
  nav.path = path
  nav.onArrive = onArrive
  nav.ghostNear = ghostNear
  nav.stuckT = 0
  nav.lastD = Infinity
}
export function cancelPath() {
  setPath([])
}

const L = (id: PlaceId, lx: number, lz: number): P2 => localToWorld(id, lx, lz)

/** Points to leave room `id` from (x,z), ending outside the door. */
function exitPoints(id: PlaceId, x: number, z: number, final: number): P2[] {
  const [lx, lz] = worldToLocal(id, x, z)
  const out: P2[] = []
  if (lz < 1.0 && Math.abs(lx) < 3.2) out.push(L(id, (lx < 0 ? -1 : 1) * 2.6, 1.0))
  out.push(L(id, 0, 5.0), L(id, 0, final))
  return out
}

/** walkOut: around the centre if deep inside, then local (0, 5.0), then (0, 8.8). */
export function planOut(x: number, z: number): P2[] {
  const id = roomAt(x, z)
  if (!id) return []
  return exitPoints(id, x, z, 8.8)
}

function angleOf(p: P2) {
  return (Math.atan2(p[1], p[0]) * 180) / Math.PI
}

/**
 * walkToRoom: leave the current room (door −1.2 → door +1.8), get onto the lane (r 7.4), arc in ≤20° steps,
 * then target door +1.8 → door −1.6, then any extra local points (e.g. a chair).
 */
export function planToRoom(x: number, z: number, target: PlaceId, extraLocal: P2[] = []): P2[] {
  const pts: P2[] = []
  const cur = roomAt(x, z)
  const finalInside = [L(target, 0, 4.4), ...extraLocal.map(([lx, lz]) => L(target, lx, lz))]
  if (cur === target) {
    const [lx, lz] = worldToLocal(target, x, z)
    if (extraLocal.length) {
      // already inside: go straight to the extra points (detour around the centre if needed)
      if (lz < 1.0 && Math.abs(lx) < 3.2 && Math.abs(extraLocal[0][0]) > 2) pts.push(L(target, Math.sign(extraLocal[0][0]) * 2.6, 1.0))
      return [...pts, ...extraLocal.map(([a, b]) => L(target, a, b))]
    }
    return [L(target, 0, Math.min(lz, 4.4))]
  }
  let from: P2 = [x, z]
  if (cur) {
    pts.push(...exitPoints(cur, x, z, 7.8))
    from = pts[pts.length - 1]
  }
  const a0 = angleOf(from)
  const a1 = angleOf(L(target, 0, 7.8))
  // onto the lane
  pts.push(polar(7.4, a0))
  let d = a1 - a0
  while (d > 180) d -= 360
  while (d < -180) d += 360
  const steps = Math.max(1, Math.ceil(Math.abs(d) / 20))
  for (let i = 1; i <= steps; i++) pts.push(polar(7.4, a0 + (d * i) / steps))
  pts.push(L(target, 0, 7.8), ...finalInside)
  return pts
}
