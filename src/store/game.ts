'use client'
import { create } from 'zustand'
import type { PlaceId } from '@/lib/places'
import type { SessionView } from '@/lib/types'

type Action = { type: string; [k: string]: unknown }

export type WalkTarget = { kind: 'room'; id: PlaceId } | { kind: 'out' } | { kind: 'point'; x: number; z: number } | { kind: 'seat'; id: PlaceId }
export type LaunchAnim = 'idle' | 'count' | 'lift' | 'blocked' | 'hold'

interface GameState {
  session: SessionView | null
  loaded: boolean
  error: string | null
  busy: Record<string, boolean>

  // UI
  card: PlaceId | null
  panel: PlaceId | null
  welcome: boolean
  inside: PlaceId | null
  nearLocked: PlaceId | null
  finishedAt: number // timestamp of the last stage change while inside a room (camera pulls back)

  // Animation hooks for the 3D world
  mayaSpeaking: boolean
  voiceLive: boolean
  labRunning: boolean
  launchAnim: LaunchAnim
  seatedAt: PlaceId | null

  // Requests from UI to the world
  walk: { target: WalkTarget; nonce: number } | null
  backToMeNonce: number
  panned: boolean
  worldFailed: boolean

  load: () => Promise<void>
  act: <T = Record<string, unknown>>(a: Action) => Promise<T & { session: SessionView }>
  restart: () => Promise<void>
  set: (p: Partial<GameState>) => void
  walkTo: (t: WalkTarget) => void
  openCard: (id: PlaceId | null) => void
}

export const useGame = create<GameState>((set, get) => ({
  session: null,
  loaded: false,
  error: null,
  busy: {},
  card: null,
  panel: null,
  welcome: false,
  inside: null,
  nearLocked: null,
  finishedAt: 0,
  mayaSpeaking: false,
  voiceLive: false,
  labRunning: false,
  launchAnim: 'idle',
  seatedAt: null,
  walk: null,
  backToMeNonce: 0,
  panned: false,
  worldFailed: false,

  load: async () => {
    const r = await fetch('/api/session', { cache: 'no-store' })
    const j = await r.json()
    set({ session: j.session, loaded: true })
  },

  act: async (a) => {
    set((s) => ({ busy: { ...s.busy, [a.type]: true }, error: null }))
    try {
      const r = await fetch('/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(a) })
      const j = await r.json().catch(() => ({ error: 'The server sent an unexpected reply.' }))
      if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`)
      const prev = get().session
      if (prev && j.session.stage !== prev.stage && get().inside) set({ finishedAt: Date.now() })
      set({ session: j.session })
      return j
    } finally {
      set((s) => {
        const b = { ...s.busy }
        delete b[a.type]
        return { busy: b }
      })
    }
  },

  restart: async () => {
    await fetch('/api/session', { method: 'DELETE' })
    try {
      localStorage.removeItem('dh_pos')
    } catch {}
    set({ card: null, panel: null, inside: null, welcome: true, seatedAt: null, launchAnim: 'idle', walk: null })
    await get().load()
    window.dispatchEvent(new CustomEvent('dh:respawn'))
  },

  set: (p) => set(p),
  walkTo: (target) => set((s) => ({ walk: { target, nonce: (s.walk?.nonce ?? 0) + 1 }, backToMeNonce: s.backToMeNonce + 1 })),
  openCard: (id) => set({ card: id, panel: null }),
}))

export const isBusy = (...types: string[]) => {
  const b = useGame.getState().busy
  return types.some((t) => b[t])
}
