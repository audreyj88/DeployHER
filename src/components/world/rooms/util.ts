'use client'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { PlaceId } from '@/lib/places'
import { removeCollider, roomBox, roomCircle } from '../colliders'
export { mulberry32 } from '../people/looks'

const cache = new Map<string, THREE.CanvasTexture>()

/** Canvas-drawn texture, cached by key. */
export function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, opts: { repeat?: [number, number]; srgb?: boolean; aniso?: number } = {}) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const t = new THREE.CanvasTexture(c)
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(opts.repeat[0], opts.repeat[1])
  }
  t.anisotropy = opts.aniso ?? 4
  cache.set(key, t)
  return t
}

export function useCanvasTex(...args: Parameters<typeof canvasTex>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => canvasTex(...args), [args[0]])
}

export type Col = { id: string; x: number; z: number; w: number; d: number; rot?: number } | { id: string; x: number; z: number; r: number }

/** Register colliders (room-local coordinates) while mounted. */
export function useColliders(place: PlaceId, cols: Col[], deps: unknown[] = []) {
  useEffect(() => {
    const ids: string[] = []
    for (const c of cols) {
      const id = `${place}:${c.id}`
      ids.push(id)
      if ('r' in c) roomCircle(id, place, c.x, c.z, c.r)
      else roomBox(id, place, c.x, c.z, c.w, c.d, c.rot ?? 0)
    }
    return () => ids.forEach(removeCollider)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, ...deps])
}

export function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)))
  return `#${c.getHexString()}`
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
