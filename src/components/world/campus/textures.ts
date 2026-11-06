'use client'
// All textures are drawn on canvas. No image files.
import * as THREE from 'three'
import { rng } from './rng'
import { Check } from 'lucide'
import { strokeIcon } from '../lucide'

const H_PATH = 'M0 0H19V42L53 31V0H72V100H53V50L19 61V100H0Z'
const cache = new Map<string, THREE.Texture>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function tex(c: HTMLCanvasElement, repeat?: number) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeat, repeat)
  }
  return t
}

function memo(key: string, make: () => THREE.Texture) {
  let t = cache.get(key)
  if (!t) {
    t = make()
    cache.set(key, t)
  }
  return t
}

function shade(hex: string, pct: number) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * (1 + pct))))
  return `#${c.getHexString()}`
}

export const grassTexture = () =>
  memo('grass', () => {
    const [c, g] = canvas(512, 512)
    g.fillStyle = '#9CC27E'
    g.fillRect(0, 0, 512, 512)
    const r = rng(7)
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = shade('#9CC27E', (r() - 0.5) * 0.12)
      g.fillRect(r() * 512, r() * 512, 2, 2)
    }
    return tex(c, 60)
  })

export const plazaTexture = (repeat = 5) =>
  memo(`plaza${repeat}`, () => {
    const [c, g] = canvas(512, 512)
    g.fillStyle = '#D6CDBF'
    g.fillRect(0, 0, 512, 512)
    const r = rng(11)
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        g.fillStyle = shade('#ECE6DC', (r() - 0.5) * 0.07)
        g.fillRect(x * 64 + 1, y * 64 + 1, 62, 62)
      }
    return tex(c, repeat)
  })

export type StationState = 'done' | 'current' | 'locked' | 'later'

export const stationTexture = (state: StationState, n: number, accent: string) =>
  memo(`st:${state}:${n}:${accent}`, () => {
    const [c, g] = canvas(256, 256)
    g.beginPath()
    g.arc(128, 128, 126, 0, Math.PI * 2)
    g.fillStyle = state === 'done' ? accent : state === 'current' ? '#FFFFFF' : state === 'later' ? '#F59E0B' : '#E7E0D5'
    g.fill()
    if (state === 'current') {
      g.lineWidth = 22
      g.strokeStyle = accent
      g.beginPath()
      g.arc(128, 128, 115, 0, Math.PI * 2)
      g.stroke()
    }
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    if (state === 'done') {
      strokeIcon(g, Check, 128 - 70, 128 - 70, 140, '#FFFFFF', 3.4)
    } else if (state === 'later') {
      g.fillStyle = '#FFFFFF'
      g.font = '800 120px system-ui, sans-serif'
      g.fillText('…', 128, 112)
    } else {
      g.fillStyle = state === 'current' ? accent : '#A39A8C'
      g.font = '800 120px system-ui, sans-serif'
      g.fillText(String(n), 128, 136)
    }
    return tex(c)
  })

export const medallionTexture = () =>
  memo('medallion', () => {
    const [c, g] = canvas(1024, 1024)
    g.fillStyle = '#1E4630'
    g.beginPath()
    g.arc(512, 512, 512, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(246,239,226,.35)'
    g.lineWidth = 6
    g.beginPath()
    g.arc(512, 512, 478, 0, Math.PI * 2)
    g.stroke()
    const s = 5.4
    g.save()
    g.translate(512 - 36 * s, 512 - 50 * s)
    g.scale(s, s)
    g.fillStyle = '#E0905F'
    g.fill(new Path2D(H_PATH))
    g.restore()
    return tex(c)
  })

/** Teardrop map pin with a white four-point spark. 256 × 320. */
export const pinTexture = (accent: string) =>
  memo(`pin:${accent}`, () => {
    const [c, g] = canvas(256, 320)
    const cx = 128
    const cy = 118
    const r = 96
    const tipY = 312
    const path = (scale: number) => {
      g.save()
      g.translate(cx, cy)
      g.scale(scale, scale)
      g.translate(-cx, -cy)
      const d = tipY - cy
      const ang = Math.asin(r / d)
      g.beginPath()
      g.moveTo(cx, tipY)
      g.arc(cx, cy, r, Math.PI / 2 + ang, Math.PI / 2 - ang + Math.PI * 2, false)
      g.closePath()
      g.restore()
    }
    path(1)
    g.fillStyle = '#FFFFFF'
    g.shadowColor = 'rgba(0,0,0,.18)'
    g.shadowBlur = 8
    g.fill()
    g.shadowBlur = 0
    path(0.84)
    g.fillStyle = accent
    g.fill()
    // four-point spark
    const s = 50
    g.beginPath()
    g.moveTo(cx, cy - s)
    g.quadraticCurveTo(cx, cy, cx + s, cy)
    g.quadraticCurveTo(cx, cy, cx, cy + s)
    g.quadraticCurveTo(cx, cy, cx - s, cy)
    g.quadraticCurveTo(cx, cy, cx, cy - s)
    g.fillStyle = '#FFFFFF'
    g.fill()
    return tex(c)
  })

export const signTexture = (text: string, opts: { w?: number; h?: number; bg: string; fg: string; font?: string }) =>
  memo(`sign:${text}:${opts.bg}`, () => {
    const w = opts.w ?? 512
    const h = opts.h ?? 128
    const [c, g] = canvas(w, h)
    g.fillStyle = opts.bg
    g.fillRect(0, 0, w, h)
    g.fillStyle = opts.fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = opts.font ?? '800 58px system-ui, sans-serif'
    g.fillText(text, w / 2, h / 2 + 4)
    return tex(c)
  })

export const menuTexture = () =>
  memo('menu', () => {
    const [c, g] = canvas(256, 384)
    g.fillStyle = '#23302C'
    g.fillRect(0, 0, 256, 384)
    g.strokeStyle = '#B98B62'
    g.lineWidth = 10
    g.strokeRect(5, 5, 246, 374)
    g.fillStyle = '#F6EFE2'
    g.textAlign = 'center'
    g.font = '800 44px system-ui, sans-serif'
    g.fillText('MENU', 128, 62)
    const items = ['Grain bowl', 'Veggie wrap', 'Tacos', 'Cold brew', 'Lemonade']
    g.font = '600 25px system-ui, sans-serif'
    items.forEach((it, i) => {
      const y = 120 + i * 52
      g.textAlign = 'left'
      g.fillStyle = '#F6EFE2'
      g.fillText(it, 26, y)
      g.fillStyle = '#E7B04A'
      g.fillRect(26, y + 12, 34, 4)
    })
    return tex(c)
  })

export const stripeTexture = (a: string, b: string, n = 8) =>
  memo(`stripe:${a}:${b}:${n}`, () => {
    const [c, g] = canvas(256, 32)
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? b : a
      g.fillRect((i * 256) / n, 0, 256 / n + 1, 32)
    }
    return tex(c)
  })
