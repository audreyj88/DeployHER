// Rooms, stages and the campus ring. Shared by server and client.

export type PlaceId = 'setup' | 'interview' | 'debrief' | 'lab' | 'launch' | 'report'

export type Stage =
  | 'onboarding'
  | 'client_interview'
  | 'discovery_debrief'
  | 'agent_troubleshooting'
  | 'rollout_decision'
  | 'skills_report'
  | 'complete'

export const STAGES: Stage[] = [
  'onboarding',
  'client_interview',
  'discovery_debrief',
  'agent_troubleshooting',
  'rollout_decision',
  'skills_report',
  'complete',
]

export interface Place {
  id: PlaceId
  stage: Stage
  step: number
  label: string
  title: string
  accent: string
  blurb: string
  angleDeg: number
  radius: number
}

export const PLACES: Place[] = [
  { id: 'setup', stage: 'onboarding', step: 1, label: 'Setup', title: 'The Greenhouse', accent: '#2F7D4F', blurb: 'Where your skills take root. Start from what you already know.', angleDeg: 150, radius: 24.5 },
  { id: 'interview', stage: 'client_interview', step: 2, label: 'Discover', title: 'Next Chapter · Client Interview', accent: '#2A9D8F', blurb: 'Interview Maya about what her team really needs.', angleDeg: 90, radius: 25 },
  { id: 'debrief', stage: 'discovery_debrief', step: 3, label: 'Debrief', title: 'The Coffee Break', accent: '#9A5B3A', blurb: 'Grab a coffee with your coach: what you found, what you missed, and the full client brief.', angleDeg: 30, radius: 24.5 },
  { id: 'lab', stage: 'agent_troubleshooting', step: 4, label: 'Make It Work', title: 'Make It Work Lab', accent: '#D9734A', blurb: 'Test a real AI assistant, find the failure, fix it, test again.', angleDeg: -30, radius: 24.5 },
  { id: 'launch', stage: 'rollout_decision', step: 5, label: 'Launch', title: 'Launch Pad', accent: '#C8475D', blurb: 'Decide whether, and how, to roll it out.', angleDeg: -90, radius: 25 },
  { id: 'report', stage: 'skills_report', step: 6, label: 'Report', title: 'Skills Report', accent: '#B7821A', blurb: 'An honest summary of what you practiced and showed.', angleDeg: -150, radius: 24.5 },
]

export const PLACE_IDS = PLACES.map((p) => p.id)

export const placeById = (id: PlaceId): Place => PLACES.find((p) => p.id === id)!
export const placeForStage = (s: Stage): Place | undefined => PLACES.find((p) => p.stage === s)
export const stageIndex = (s: Stage) => STAGES.indexOf(s)

export type RoomStatus = 'done' | 'current' | 'locked'

// Rooms whose door faces south (they sit on the north side of campus: z < 0).
export const isNorthRow = (id: PlaceId) => placeById(id).angleDeg < 0

// World geometry for a room: centre, door and rotation (door faces plaza).
export const ROOM_W = 16
export const ROOM_D = 12
export const DOOR_W = 3.2

export interface RoomFrame {
  cx: number
  cz: number
  rotY: number // local +z (door) points toward the plaza
  doorX: number
  doorZ: number
  dirX: number // unit vector from centre toward plaza (= local +z in world)
  dirZ: number
}

export function roomFrame(id: PlaceId): RoomFrame {
  const p = placeById(id)
  const a = (p.angleDeg * Math.PI) / 180
  const ux = Math.cos(a)
  const uz = Math.sin(a)
  // radius = distance from campus centre to the room centre; door sits 6 closer.
  const cx = ux * p.radius
  const cz = uz * p.radius
  const dirX = -ux
  const dirZ = -uz
  // rotation so that local +z maps to (dirX, dirZ): rotY = atan2(dirX, dirZ)
  const rotY = Math.atan2(dirX, dirZ)
  return {
    cx,
    cz,
    rotY,
    doorX: cx + dirX * (ROOM_D / 2),
    doorZ: cz + dirZ * (ROOM_D / 2),
    dirX,
    dirZ,
  }
}

/** room-local (x,z) -> world (x,z) */
export function localToWorld(id: PlaceId, lx: number, lz: number): [number, number] {
  const f = roomFrame(id)
  const c = Math.cos(f.rotY)
  const s = Math.sin(f.rotY)
  // three.js rotation about Y: x' = x cos + z sin ; z' = -x sin + z cos
  return [f.cx + lx * c + lz * s, f.cz - lx * s + lz * c]
}

export function worldToLocal(id: PlaceId, wx: number, wz: number): [number, number] {
  const f = roomFrame(id)
  const c = Math.cos(f.rotY)
  const s = Math.sin(f.rotY)
  const dx = wx - f.cx
  const dz = wz - f.cz
  return [dx * c - dz * s, dx * s + dz * c]
}

export function roomAt(wx: number, wz: number, margin = 0): PlaceId | null {
  for (const p of PLACES) {
    const [lx, lz] = worldToLocal(p.id, wx, wz)
    if (Math.abs(lx) < ROOM_W / 2 + margin && Math.abs(lz) < ROOM_D / 2 + margin) return p.id
  }
  return null
}
