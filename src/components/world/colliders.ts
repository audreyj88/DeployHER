// 2D collision world (x/z plane). Rooms and props register shapes; the player resolves against them.
import { DOOR_W, localToWorld, PLACES, ROOM_D, ROOM_W, roomFrame, type PlaceId } from '@/lib/places'

export const PLAYER_R = 0.35
export const CAMPUS_R = 38.5

type Box = { kind: 'box'; cx: number; cz: number; hw: number; hd: number; rot: number }
type Circle = { kind: 'circle'; x: number; z: number; r: number }
export type Shape = Box | Circle

const shapes = new Map<string, Shape>()
let version = 0

export function setCollider(id: string, s: Shape | null) {
  if (s) shapes.set(id, s)
  else shapes.delete(id)
  version++
}
export const removeCollider = (id: string) => setCollider(id, null)
export const colliderVersion = () => version
export const allColliders = () => shapes

/** Register a box given in a room's local coordinates (x across, z toward the door). */
export function roomBox(id: string, place: PlaceId, lx: number, lz: number, w: number, d: number, localRot = 0) {
  const [x, z] = localToWorld(place, lx, lz)
  setCollider(id, { kind: 'box', cx: x, cz: z, hw: w / 2, hd: d / 2, rot: roomFrame(place).rotY + localRot })
}
export function roomCircle(id: string, place: PlaceId, lx: number, lz: number, r: number) {
  const [x, z] = localToWorld(place, lx, lz)
  setCollider(id, { kind: 'circle', x, z, r })
}

/** Static walls for every room: back, sides and the front split around the door. */
function buildWalls() {
  const T = 0.3
  for (const p of PLACES) {
    const hw = ROOM_W / 2
    const hd = ROOM_D / 2
    roomBox(`wall:${p.id}:back`, p.id, 0, -hd, ROOM_W + T, T)
    roomBox(`wall:${p.id}:left`, p.id, -hw, 0, T, ROOM_D + T)
    roomBox(`wall:${p.id}:right`, p.id, hw, 0, T, ROOM_D + T)
    const seg = (ROOM_W - DOOR_W) / 2
    roomBox(`wall:${p.id}:fl`, p.id, -(DOOR_W / 2 + seg / 2), hd, seg, T)
    roomBox(`wall:${p.id}:fr`, p.id, DOOR_W / 2 + seg / 2, hd, seg, T)
  }
}
buildWalls()

/** Locked-door gate (3.4 × 0.3) — solid while the room is locked. */
export function setGate(place: PlaceId, locked: boolean) {
  if (locked) roomBox(`gate:${place}`, place, 0, ROOM_D / 2, 3.4, 0.3)
  else removeCollider(`gate:${place}`)
}

function pushOutBox(px: number, pz: number, r: number, b: Box): [number, number] | null {
  const c = Math.cos(b.rot)
  const s = Math.sin(b.rot)
  // world -> box local (inverse of three's Y rotation)
  const dx = px - b.cx
  const dz = pz - b.cz
  const lx = dx * c - dz * s
  const lz = dx * s + dz * c
  const qx = Math.max(-b.hw, Math.min(b.hw, lx))
  const qz = Math.max(-b.hd, Math.min(b.hd, lz))
  let ox = lx - qx
  let oz = lz - qz
  let d2 = ox * ox + oz * oz
  let nlx: number
  let nlz: number
  if (d2 > 1e-9) {
    if (d2 >= r * r) return null
    const d = Math.sqrt(d2)
    nlx = qx + (ox / d) * r
    nlz = qz + (oz / d) * r
  } else {
    // center inside the box: push out along the shallowest axis
    const ex = b.hw - Math.abs(lx)
    const ez = b.hd - Math.abs(lz)
    if (ex < ez) {
      nlx = Math.sign(lx || 1) * (b.hw + r)
      nlz = lz
    } else {
      nlx = lx
      nlz = Math.sign(lz || 1) * (b.hd + r)
    }
    ox = oz = d2 = 0
  }
  // back to world
  return [b.cx + nlx * c + nlz * s, b.cz - nlx * s + nlz * c]
}

/** Resolve a desired position against all colliders (two passes) and the campus limit. */
export function resolve(x: number, z: number, r = PLAYER_R): [number, number] {
  for (let pass = 0; pass < 2; pass++) {
    for (const s of shapes.values()) {
      if (s.kind === 'circle') {
        const dx = x - s.x
        const dz = z - s.z
        const min = s.r + r
        const d2 = dx * dx + dz * dz
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 1e-4
          x = s.x + (dx / d) * min
          z = s.z + (dz / d) * min
        }
      } else {
        const p = pushOutBox(x, z, r, s)
        if (p) [x, z] = p
      }
    }
  }
  const lim = CAMPUS_R - 0.4 - r
  const d = Math.hypot(x, z)
  if (d > lim) {
    x = (x / d) * lim
    z = (z / d) * lim
  }
  return [x, z]
}
