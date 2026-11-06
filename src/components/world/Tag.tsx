'use client'
// Crisp HTML name tags that follow people, doors and props.
// Implemented as plain DOM elements in one shared overlay (no React root per tag), positioned every frame.
import { useFrame, useThree } from '@react-three/fiber'
import { isValidElement, useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { camInfo, player } from './state'
import { iconSvg, type IconNode } from './lucide'

export type TagKind = 'name' | 'ai' | 'you' | 'lab'

const v = new THREE.Vector3()

/** Shared DOM layer for 3D tags: above the canvas, below the HUD and cards. */
export function getTagLayer(): HTMLElement {
  return document.getElementById('dh-tags') ?? document.body
}

/** Flatten simple React nodes (strings, numbers, <span>text</span>) to text. */
function toText(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(toText).join('')
  if (isValidElement(n)) return toText((n.props as { children?: ReactNode }).children)
  return ''
}

/**
 * Position is local to the parent group. Name/AI/lab tags fade beyond 13m from the player (unless talking)
 * and hide in map view. `extra` adds classes such as "pass" / "fail".
 */
export function Tag({
  kind,
  text,
  position = [0, 2.1, 0],
  accent,
  talking = false,
  icon,
  extra = '',
  alwaysVisible = false,
}: {
  kind: TagKind
  text: ReactNode
  position?: [number, number, number]
  accent?: string
  talking?: boolean
  /** A Lucide icon (from the vanilla `lucide` package), shown before the text. */
  icon?: IconNode
  extra?: string
  alwaysVisible?: boolean
}) {
  const anchor = useRef<THREE.Group>(null)
  const { camera, gl } = useThree()
  const el = useMemo(() => (typeof document === 'undefined' ? null : document.createElement('div')), [])
  const label = toText(text)
  const fades = !alwaysVisible && (kind === 'name' || kind === 'ai' || kind === 'lab')

  // Mount / unmount the element.
  useEffect(() => {
    if (!el) return
    getTagLayer().appendChild(el)
    return () => el.remove()
  }, [el])

  // Content.
  useEffect(() => {
    if (!el) return
    el.replaceChildren()
    if (talking) {
      const d = document.createElement('span')
      d.className = 'talk-dot'
      el.appendChild(d)
    } else if (kind === 'ai') {
      const c = document.createElement('span')
      c.className = 'chip'
      el.appendChild(c)
    }
    if (icon) {
      const i = document.createElement('span')
      i.innerHTML = iconSvg(icon) // static icon data from our own bundle, never user input
      el.appendChild(i)
    }
    const t = document.createElement('span')
    t.textContent = label
    el.appendChild(t)
    if (accent) el.style.setProperty('--accent', accent)
  }, [el, label, icon, talking, kind, accent])

  const baseClass = `lbl lbl-${kind} ${talking ? 'talk' : ''} ${extra}`

  useFrame(() => {
    const a = anchor.current
    if (!el || !a) return
    a.getWorldPosition(v)
    let cls = baseClass
    if (fades) {
      const d = Math.hypot(v.x - player.x, v.z - player.z)
      const hide = !talking && (camInfo.y > 58 || d > 13)
      const near = d < 6 || v.distanceTo(camera.position) < 9
      cls += hide ? ' far' : near ? ' near' : ''
    }
    // Project to screen.
    v.project(camera)
    const behind = v.z > 1
    const rect = gl.domElement.getBoundingClientRect()
    const x = rect.left + ((v.x + 1) / 2) * rect.width
    const y = rect.top + ((1 - v.y) / 2) * rect.height
    if (behind) cls += ' far'
    if (el.className !== cls) el.className = cls
    el.style.position = 'absolute'
    el.style.left = '0'
    el.style.top = '0'
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
    if (behind) el.style.visibility = 'hidden'
    else if (el.style.visibility) el.style.visibility = ''
  })

  return <group ref={anchor} position={position} />
}
