'use client'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useGame } from '@/store/game'
import { Hud } from './hud/Hud'
import { Cards } from './cards/Cards'

const World = dynamic(() => import('./world/World'), { ssr: false, loading: () => null })

export default function App() {
  const load = useGame((s) => s.load)
  const loaded = useGame((s) => s.loaded)
  useEffect(() => {
    load()
  }, [load])
  return (
    <main className="fixed inset-0">
      {loaded && <World />}
      {loaded && <Hud />}
      {loaded && <Cards />}
      {!loaded && (
        <div className="grid h-full place-items-center text-sm text-slate-500">Loading campus…</div>
      )}
    </main>
  )
}
