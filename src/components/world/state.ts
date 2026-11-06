// Mutable per-frame world state (not React state — read it inside useFrame).
import { placeById, roomFrame, type PlaceId } from '@/lib/places'

export const player = {
  x: 0,
  z: 0,
  heading: 0, // radians; 0 faces +z
  speed: 0, // current m/s (0..4.6) — drives walk animation
  seated: null as null | { x: number; z: number; heading: number; place: PlaceId },
}

export const camInfo = {
  y: 40, // camera height — labels hide in map view (y > 58)
  mapView: true,
  x: 0,
  z: 36,
}

/** Spawn: on the plaza 2.7 from center toward the Greenhouse, facing it. */
export function spawnPoint() {
  const a = (placeById('setup').angleDeg * Math.PI) / 180
  const x = Math.cos(a) * 2.7
  const z = Math.sin(a) * 2.7
  const f = roomFrame('setup')
  return { x, z, heading: Math.atan2(f.doorX - x, f.doorZ - z) }
}

/** Which NPC/prop is "talking" right now, derived from in-flight actions. */
export function talkingFromBusy(busy: Record<string, boolean>) {
  return {
    maya: Boolean(busy.interview_ask),
    nia: Boolean(busy.interview_end || busy.grade_retry),
    kai: Boolean(busy.lab_run),
    coach: Boolean(busy.launch_submit),
    press: Boolean(busy.report_generate),
    tree: Boolean(busy.setup_map),
  }
}
