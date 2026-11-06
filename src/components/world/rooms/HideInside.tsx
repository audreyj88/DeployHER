'use client'
// Hides door-side decorations while the player is inside this room, so the room-view camera
// (which sits just outside the door) can see in. Colliders are registered elsewhere and stay put.
import type { ReactNode } from 'react'
import type { PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'

export function HideInside({ place, children }: { place: PlaceId; children: ReactNode }) {
  const inside = useGame((s) => s.inside === place)
  return <group visible={!inside}>{children}</group>
}
