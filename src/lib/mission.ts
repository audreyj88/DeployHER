// Pure mission logic: room status, transitions. Shared by server and client.
import { PLACES, placeById, stageIndex, STAGES, type PlaceId, type RoomStatus, type Stage } from './places.ts'
import type { Session } from './types.ts'

type MissionState = Pick<Session, 'stage' | 'setupLater' | 'skipped' | 'setup'>

export function roomStatus(s: MissionState, id: PlaceId): RoomStatus {
  const pi = stageIndex(placeById(id).stage)
  const si = stageIndex(s.stage)
  if (pi < si) return 'done'
  if (pi === si) return 'current'
  return 'locked'
}

/** Setup skipped "for later" and not finished yet. */
export const setupIsLater = (s: MissionState) => s.setupLater && !s.setup?.confirmed

export type ChipState = 'done' | 'current' | 'locked' | 'later' | 'skipped'

export function chipState(s: MissionState, id: PlaceId): ChipState {
  if (id === 'setup' && setupIsLater(s)) return 'later'
  const st = roomStatus(s, id)
  if (st === 'done' && s.skipped.includes(id)) return 'skipped'
  return st
}

export const canEnter = (s: MissionState, id: PlaceId) => roomStatus(s, id) !== 'locked'

export function nextStage(stage: Stage): Stage {
  return STAGES[Math.min(STAGES.length - 1, stageIndex(stage) + 1)]
}

/** The room you should walk to next, or null when the mission is complete. */
export function nextPlace(s: MissionState): PlaceId | null {
  const p = PLACES.find((x) => x.stage === s.stage)
  return p ? p.id : null
}

export function previousPlace(id: PlaceId): PlaceId | null {
  const i = PLACES.findIndex((p) => p.id === id)
  return i > 0 ? PLACES[i - 1].id : null
}

export const SKIPPABLE: PlaceId[] = ['interview', 'debrief', 'lab', 'launch']
