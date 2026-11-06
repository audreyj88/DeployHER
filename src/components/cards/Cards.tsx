'use client'
import { useEffect, useRef } from 'react'
import { roomStatus, setupIsLater } from '@/lib/mission'
import type { PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'
import { InterviewCard } from './InterviewCard'
import { LabCard } from './LabCard'
import { LaunchCard } from './LaunchCard'
import { ReportCard } from './ReportCard'
import { SetupCard } from './SetupCard'
import { SidePanel } from './SidePanel'

/** Rooms whose finished state is shown in the side panel rather than a card. */
const PANEL_WHEN_DONE: PlaceId[] = ['setup', 'interview', 'debrief']

/** Demo shortcut: unlock a locked room (skipping the rooms before it) and walk straight in. */
export async function unlockRoom(id: PlaceId) {
  const g = useGame.getState()
  if (!g.session || roomStatus(g.session, id) !== 'locked') return
  try {
    await g.act({ type: 'unlock', place: id })
  } catch (e) {
    g.set({ error: e instanceof Error ? e.message : 'Couldn’t unlock that room.' })
    return
  }
  g.set({ card: null, panel: null, seatedAt: null, nearLocked: null })
  g.walkTo({ kind: 'room', id })
}

/** Decide what opens when you walk into a room. Exported so the world/HUD can reuse it. */
export function openRoomUI(id: PlaceId) {
  const g = useGame.getState()
  const s = g.session
  if (!s) return
  const st = roomStatus(s, id)
  if (st === 'locked') {
    g.set({ panel: id, card: null })
    return
  }
  const later = id === 'setup' && setupIsLater(s)
  if (id === 'debrief') {
    g.set({ panel: 'debrief', card: null })
    return
  }
  if (st === 'current' || later) {
    g.set({ card: id, panel: null })
    return
  }
  if (PANEL_WHEN_DONE.includes(id)) g.set({ panel: id, card: null })
  else g.set({ card: id, panel: null })
}

export function Cards() {
  const card = useGame((s) => s.card)
  const inside = useGame((s) => s.inside)
  const session = useGame((s) => s.session)
  const prevInside = useRef<PlaceId | null>(null)

  // Auto-open on entering a room; close on leaving.
  useEffect(() => {
    const prev = prevInside.current
    prevInside.current = inside
    if (inside === prev) return
    const g = useGame.getState()
    if (!inside) {
      if (!g.voiceLive) g.set({ card: null, panel: null })
      return
    }
    if (!session) return
    // Interview (current): the world walks you to the chair and opens the card after you sit.
    if (inside === 'interview' && roomStatus(session, 'interview') === 'current' && session.interview.status !== 'ended') return
    openRoomUI(inside)
  }, [inside, session])

  return (
    <>
      <SidePanel />
      {card === 'setup' && <SetupCard />}
      {card === 'interview' && <InterviewCard />}
      {card === 'lab' && <LabCard />}
      {card === 'launch' && <LaunchCard />}
      {card === 'report' && <ReportCard />}
    </>
  )
}
