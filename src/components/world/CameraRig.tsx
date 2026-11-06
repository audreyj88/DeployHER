'use client'
// Map view (tilted top-down follow) and room view (inside the door, look around), blended.
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { localToWorld, roomFrame, worldToLocal, type PlaceId } from '@/lib/places'
import { useGame } from '@/store/game'
import { damp, smoothstep } from './campus/rng'
import { cam, setPath, zoomNow } from './controls'
import { standUp } from './Player'
import { camInfo, player } from './state'

const DIR = new THREE.Vector3(0, 0.83, 0.56).normalize()
const ZMIN = 0.5
const ZMAX = 5.2
const ROOM_ZOOM = 1.7

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const mapPos = new THREE.Vector3()
const mapLook = new THREE.Vector3()
const roomPos = new THREE.Vector3()
const roomLook = new THREE.Vector3()
const look = new THREE.Vector3()
const ray = new THREE.Raycaster()
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()

export function CameraRig() {
  const { camera, gl, size, scene } = useThree()
  const focus = useRef(new THREE.Vector2(player.x, player.z))
  const lastInside = useRef<PlaceId | null>(null)
  const lastFinished = useRef(0)
  const lastBack = useRef(0)
  const panelOff = useRef(0)
  const panned = useRef(false)
  const roomActive = useRef(false)
  const init = useRef(false)

  // ---- input: wheel, drag, pinch, click-to-walk ----
  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>()
    let dragging = false
    let pinchSpan = 0
    let multi = false

    const zoomBy = (factor: number) => {
      const g = useGame.getState()
      if (factor < 1 && g.inside && cam.roomDismissed) {
        cam.roomDismissed = false
        if (cam.zoomTarget >= ROOM_ZOOM) cam.zoomTarget = 1.2
        return
      }
      cam.zoomTarget = clamp(cam.zoomTarget * factor, ZMIN, ZMAX)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 16
      else if (e.deltaMode === 2) dy *= 100
      dy = clamp(dy, -120, 120)
      zoomBy(Math.exp(dy * (e.ctrlKey ? 0.01 : 0.0015)))
    }

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY })
      try {
        el.setPointerCapture(e.pointerId)
      } catch {}
      if (pointers.size === 2) {
        multi = true
        const [a, b] = [...pointers.values()]
        pinchSpan = Math.hypot(a.x - b.x, a.y - b.y)
      }
    }

    const onMove = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        const span = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinchSpan > 0 && span > 0) zoomBy(pinchSpan / span)
        pinchSpan = span
        return
      }
      if (!dragging && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 5) {
        dragging = true
        el.classList.add('dragging')
      }
      if (!dragging || multi) return
      if (roomActive.current) {
        cam.yaw = clamp(cam.yaw - dx * 0.006, -1.25, 1.25)
        cam.pitch = clamp(cam.pitch + dy * 0.004, 0.13, 1.05)
      } else {
        const dist = Math.exp(cam.logDist)
        const u = (2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / Math.max(1, el.clientHeight)
        cam.gliding = false
        cam.panX -= dx * u
        cam.panZ -= (dy * u) / 0.83
      }
    }

    const onUp = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId)
      pointers.delete(e.pointerId)
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {}
      if (p && !dragging && !multi && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) < 6) {
        // click-to-walk
        const r = el.getBoundingClientRect()
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1
        const ny = -((e.clientY - r.top) / r.height) * 2 + 1
        ray.setFromCamera(new THREE.Vector2(nx, ny), camera)
        if (ray.ray.intersectPlane(ground, hit) && Math.hypot(hit.x, hit.z) < 39) {
          standUp()
          setPath([[hit.x, hit.z]])
          cam.gliding = true
        }
      }
      if (pointers.size === 0) {
        dragging = false
        multi = false
        pinchSpan = 0
        el.classList.remove('dragging')
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [gl, camera])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const g = useGame.getState()
    const pc = camera as THREE.PerspectiveCamera

    if (!init.current) {
      init.current = true
      focus.current.set(player.x, player.z)
    }

    // room enter/leave + task finished
    if (g.inside !== lastInside.current) {
      lastInside.current = g.inside
      cam.roomDismissed = false
      if (g.inside) {
        cam.yaw = 0
        cam.pitch = 0.68
        if (cam.zoomTarget > 1.6) cam.zoomTarget = 1.2
      }
    }
    if (g.finishedAt !== lastFinished.current) {
      lastFinished.current = g.finishedAt
      if (g.inside) cam.roomDismissed = true
    }
    if (g.backToMeNonce !== lastBack.current) {
      lastBack.current = g.backToMeNonce
      cam.gliding = true
    }

    // zoom easing in log space
    cam.logDist += (Math.log(32 * cam.zoomTarget) - cam.logDist) * damp(7, dt)
    const zoom = zoomNow()
    const dist = Math.exp(cam.logDist)

    // pan glide back to the player
    if (cam.gliding) {
      const k = damp(3, dt)
      cam.panX -= cam.panX * k
      cam.panZ -= cam.panZ * k
      if (Math.hypot(cam.panX, cam.panZ) < 0.05) {
        cam.panX = cam.panZ = 0
        cam.gliding = false
      }
    }
    // clamp the focus to the campus
    const fx = clamp(player.x + cam.panX, -38.5 + 8, 38.5 - 8)
    const fz = clamp(player.z + cam.panZ, -38.5 + 6, 38.5 - 10)
    cam.panX = fx - player.x
    cam.panZ = fz - player.z
    const isPanned = Math.hypot(cam.panX, cam.panZ) > 3
    if (isPanned !== panned.current) {
      panned.current = isPanned
      g.set({ panned: isPanned })
    }

    // map focus, drifting to the campus centre when zoomed out
    const drift = smoothstep(zoom, 1.9, 5.2)
    const tx = fx * (1 - drift)
    const tz = fz * (1 - drift)
    const kf = damp(4, dt)
    focus.current.x += (tx - focus.current.x) * kf
    focus.current.y += (tz - focus.current.y) * kf
    mapPos.set(focus.current.x + DIR.x * dist, DIR.y * dist, focus.current.y + DIR.z * dist)
    mapLook.set(focus.current.x, 0.8, focus.current.y)

    // room view
    const active = Boolean(g.inside) && zoom < ROOM_ZOOM && !cam.roomDismissed
    roomActive.current = active
    const roomId = g.inside ?? null
    cam.blend += ((active ? 1 : 0) - cam.blend) * damp(2.6, dt)
    const b = smoothstep(cam.blend, 0, 1)
    if (roomId) {
      const [plx, plz] = worldToLocal(roomId, player.x, player.z)
      const ox = plx * 0.35
      const oz = -0.78 + plz * 0.35
      const d = clamp(10.5 * Math.pow(Math.min(zoom, ROOM_ZOOM) / 1.2, 0.6), 5, 13)
      const cx = clamp(ox + Math.sin(cam.yaw) * Math.cos(cam.pitch) * d, -7.4, 7.4)
      const cz = clamp(oz + Math.cos(cam.yaw) * Math.cos(cam.pitch) * d, -5.3, 10.5)
      const [wx, wz] = localToWorld(roomId, cx, cz)
      roomPos.set(wx, 1.15 + Math.sin(cam.pitch) * d, wz)
      const [lx, lz] = localToWorld(roomId, ox, oz)
      roomLook.set(lx, 1.15, lz)
      if (active) {
        // shot forward on the ground: from the camera toward the orbit point
        const rot = roomFrame(roomId).rotY
        const fxl = -Math.sin(cam.yaw)
        const fzl = -Math.cos(cam.yaw)
        cam.shotFwdX = fxl * Math.cos(rot) + fzl * Math.sin(rot)
        cam.shotFwdZ = -fxl * Math.sin(rot) + fzl * Math.cos(rot)
      }
    } else {
      roomPos.copy(mapPos)
      roomLook.copy(mapLook)
    }
    if (!active) {
      cam.shotFwdX = 0
      cam.shotFwdZ = -1
    }

    camera.position.lerpVectors(mapPos, roomPos, b)
    look.lerpVectors(mapLook, roomLook, b)
    camera.lookAt(look)
    cam.fov = 30 + 14 * b
    if (Math.abs(pc.fov - cam.fov) > 0.01) {
      pc.fov = cam.fov
      pc.updateProjectionMatrix()
    }

    // panel framing: shift the picture so the room stays visible beside the side panel
    const w = size.width
    const h = size.height
    const phone = w < 640
    const want = g.panel ? (phone ? 0.36 * h : (Math.min(460, w - 24) + 12) / 2) : 0
    panelOff.current += (want - panelOff.current) * damp(5, dt)
    if (panelOff.current > 0.5) {
      pc.setViewOffset(w, h, phone ? 0 : panelOff.current, phone ? panelOff.current : 0, w, h)
    } else if (pc.view?.enabled) {
      pc.clearViewOffset()
    }

    // fog push-out so the zoomed-out view stays crisp
    const camDist = camera.position.distanceTo(look)
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = Math.max(110, 1.3 * camDist)
      scene.fog.far = Math.max(260, 2.6 * camDist)
    }

    camInfo.y = camera.position.y
    camInfo.x = camera.position.x
    camInfo.z = camera.position.z
    camInfo.mapView = b < 0.5
  })

  return null
}
