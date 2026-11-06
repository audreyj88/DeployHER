'use client'
import { getTagLayer } from '../Tag'
// Room name tags above each door. The next room's tag sticks to the screen edge like a quest marker.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import * as THREE from 'three'
import { chipState, nextPlace } from '@/lib/mission'
import { PLACES, type PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'
import { camInfo } from '../state'
import { doorPoint } from './geo'

const v = new THREE.Vector3()

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="none" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export function DoorTags() {
  const { gl, camera, size } = useThree()
  const [root, setRoot] = useState<Root | null>(null)
  const session = useGame((s) => s.session)
  const els = useRef<Partial<Record<PlaceId, HTMLDivElement | null>>>({})

  useEffect(() => {
    // A body-level overlay (not inside React-managed canvas wrappers) aligned with the full-screen canvas.
    const div = document.createElement('div')
    div.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden'
    getTagLayer().appendChild(div)
    const r = createRoot(div)
    setRoot(r)
    return () => {
      setTimeout(() => {
        r.unmount()
        div.remove()
      }, 0)
    }
  }, [gl])

  const info = useMemo(() => {
    if (!session) return null
    const next = nextPlace(session)
    return PLACES.map((p) => ({ p, st: chipState(session, p.id), next: next === p.id }))
  }, [session])

  const anchors = useMemo(() => Object.fromEntries(PLACES.map((p) => [p.id, doorPoint(p.id, 0.2)])) as Record<PlaceId, [number, number]>, [])

  useFrame(() => {
    if (!info) return
    const inside = useGame.getState().inside
    const w = size.width
    const h = size.height
    for (const { p, next } of info) {
      const el = els.current[p.id]
      if (!el) continue
      const [x, z] = anchors[p.id]
      v.set(x, p.id === 'interview' ? 5.15 : 3.45, z).project(camera)
      const behind = v.z > 1
      let sx = (v.x * 0.5 + 0.5) * w
      let sy = (-v.y * 0.5 + 0.5) * h
      const off = behind || sx < 0 || sx > w || sy < 0 || sy > h
      if (next) {
        if (behind) {
          sx = w - sx
          sy = h - 84 // above the bottom HUD pill
        }
        const minX = sy < 90 ? 150 : 60
        const cx = Math.max(minX, Math.min(w - 60, sx))
        const cy = Math.max(68, Math.min(h - 24, sy))
        const stuck = off || cx !== sx || cy !== sy
        el.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -100%)`
        el.style.opacity = inside === p.id && !camInfo.mapView ? '0' : ''
        el.classList.toggle('stuck', stuck)
      } else {
        el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`
        el.style.opacity = off || (inside === p.id && !camInfo.mapView) ? '0' : ''
        el.classList.remove('stuck')
      }
    }
  })

  useEffect(() => {
    if (!root || !info) return
    root.render(
      <>
      {info.map(({ p, st, next }) => {
        const locked = st === 'locked'
        const done = st === 'done' || st === 'skipped'
        const text = p.id === 'interview' ? 'Pathways Forward · Interview' : p.title
        return (
          <div
            key={p.id}
            ref={(el) => void (els.current[p.id] = el)}
            className={`lbl lbl-room ${locked ? 'st-locked' : ''} ${done ? 'st-done' : ''} ${next ? 'next' : ''}`}
            style={{ position: 'absolute', left: 0, top: 0, ['--accent' as string]: p.accent } as CSSProperties}
          >
            {locked && <LockIcon />}
            {done && <span className="done-disc">✓</span>}
            <span>{text}</span>
          </div>
        )
      })}
      </>,
    )
  }, [root, info])

  return null
}
