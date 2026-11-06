// Shared seat positions (room-local). Rooms draw the chairs here; the player sits here.
import type { PlaceId } from '@/lib/places'

export interface Seat {
  place: PlaceId
  x: number
  z: number
  /** local heading the seated person faces: 0 = +z (toward the door), PI/2 = +x */
  heading: number
}

/** Pathways Forward: visitor chair faces +x toward Maya's chair. */
export const INTERVIEW_VISITOR: Seat = { place: 'interview', x: 3.75, z: -3.75, heading: Math.PI / 2 }
export const INTERVIEW_MAYA: Seat = { place: 'interview', x: 6.65, z: -3.75, heading: -Math.PI / 2 }

/** Coffee Break: Nia's table at the south-row desk spot (5.2, -3.6). Nia faces the door; you sit opposite. */
export const NIA_TABLE = { x: 5.2, z: -3.6 }
export const DEBRIEF_NIA: Seat = { place: 'debrief', x: 5.2, z: -4.35, heading: 0 }
export const DEBRIEF_LEARNER: Seat = { place: 'debrief', x: 5.2, z: -2.85, heading: Math.PI }

export const SEATS: Partial<Record<PlaceId, Seat>> = {
  interview: INTERVIEW_VISITOR,
  debrief: DEBRIEF_LEARNER,
}
