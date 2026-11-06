'use client'
// Crisp HTML name tags that follow people, doors and props.
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, type CSSProperties, type ReactNode } from 'react'
import * as THREE from 'three'
import { camInfo, player } from './state'

export type TagKind = 'name' | 'ai' | 'you' | 'lab'

const v = new THREE.Vector3()

/**
 * Position is local to the parent group. Name/AI tags fade beyond 13m (unless talking) and hide in map view.
 * `extra` adds classes such as "pass" / "fail".
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
  icon?: ReactNode
  extra?: string
  alwaysVisible?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const anchor = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const fades = kind === 'name' || kind === 'ai' || kind === 'lab'
  useFrame(() => {
    const el = ref.current
    const a = anchor.current
    if (!el || !a || !fades || alwaysVisible) return
    a.getWorldPosition(v)
    // distance from the player (the camera follows her)
    const d = Math.hypot(v.x - player.x, v.z - player.z)
    const hide = !talking && (camInfo.y > 58 || d > 13)
    const near = d < 6 || v.distanceTo(camera.position) < 9
    const cls = `lbl lbl-${kind} ${hide ? 'far' : near ? 'near' : ''} ${talking ? 'talk' : ''} ${extra}`
    if (el.className !== cls) el.className = cls
  })
  const style = (accent ? { ['--accent' as string]: accent } : {}) as CSSProperties
  return (
    <group ref={anchor} position={position}>
      <Html zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }} center={false}>
        <div ref={ref} className={`lbl lbl-${kind} ${talking ? 'talk' : ''} ${extra}`} style={style}>
          {talking && <span className="talk-dot" />}
          {kind === 'ai' && !talking && <span className="chip" />}
          {icon}
          <span>{text}</span>
        </div>
      </Html>
    </group>
  )
}
