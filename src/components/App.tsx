'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useGame } from '@/store/game'
import { Hud } from './hud/Hud'
import { Cards } from './cards/Cards'
import { WorldBoundary } from './WorldBoundary'

const World = dynamic(() => import('./world/World'), { ssr: false, loading: () => null })

export default function App() {
  const load = useGame((s) => s.load)
  const loaded = useGame((s) => s.loaded)
  useEffect(() => {
    load()
    // Dev-only handle for automated UI checks.
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __dh: typeof useGame }).__dh = useGame
  }, [load])
  return (
    <main className="fixed inset-0">
      {loaded && (
        <WorldBoundary>
          <World />
        </WorldBoundary>
      )}
      {loaded && <Hud />}
      {loaded && <Cards />}
      {!loaded && (
        <div className="grid h-full place-items-center text-sm text-slate-500">Loading campus…</div>
      )}
    </main>
  )
}
