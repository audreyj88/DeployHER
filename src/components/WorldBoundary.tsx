'use client'
import { Component, type ReactNode } from 'react'
import { useGame } from '@/store/game'

/** Keeps the cards and HUD usable if the 3D world fails (no WebGL, a scene bug, etc.). */
export class WorldBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(e: unknown) {
    console.error('[world]', e)
    useGame.setState({ worldFailed: true })
  }
  render() {
    if (this.state.failed)
      return (
        <div className="fixed inset-0 grid place-items-center bg-[#E6E2F3] p-6 text-center text-[14px] text-slate-600">
          <div>
            <div className="text-[16px] font-bold text-slate-800">The 3D campus couldn’t load on this device.</div>
            <div className="mt-1">You can still do every step: use “Take me there” below, or reload to try again.</div>
            <button className="mt-3 rounded-full bg-slate-900 px-4 py-2 font-semibold text-white" onClick={() => location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    return this.props.children
  }
}
