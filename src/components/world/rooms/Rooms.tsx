'use client'
// All six rooms, placed on the campus ring with their doors facing the plaza.
import { PLACES, roomFrame } from '@/lib/places'

export function Rooms() {
  return (
    <group>
      {PLACES.map((p) => {
        const f = roomFrame(p.id)
        return <group key={p.id} position={[f.cx, 0, f.cz]} rotation-y={f.rotY} />
      })}
    </group>
  )
}
