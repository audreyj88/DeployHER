'use client'
// All six rooms, placed on the campus ring with their doors facing the plaza.
import type { ComponentType } from 'react'
import { PLACES, roomFrame, type PlaceId } from '@/lib/places'
import { CoffeeBreak } from './CoffeeBreak'
import { Greenhouse } from './Greenhouse'
import { LabRoom } from './LabRoom'
import { LaunchPad } from './LaunchPad'
import { Library } from './Library'
import { Pathways } from './Pathways'

const ROOMS: Record<PlaceId, ComponentType> = {
  setup: Greenhouse,
  interview: Pathways,
  debrief: CoffeeBreak,
  lab: LabRoom,
  launch: LaunchPad,
  report: Library,
}

export function Rooms() {
  return (
    <group>
      {PLACES.map((p) => {
        const f = roomFrame(p.id)
        const Room = ROOMS[p.id]
        return (
          <group key={p.id} position={[f.cx, 0, f.cz]} rotation-y={f.rotY}>
            <Room />
          </group>
        )
      })}
    </group>
  )
}
