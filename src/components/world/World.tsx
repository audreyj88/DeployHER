'use client'
import { Canvas } from '@react-three/fiber'
import { PLACES, roomFrame, ROOM_D, ROOM_W } from '@/lib/places'

export default function World() {
  return (
    <Canvas className="dh-canvas" shadows dpr={[1, 2]} gl={{ antialias: false }} camera={{ position: [0, 40, 36], fov: 30, near: 0.5, far: 400 }}>
      <color attach="background" args={['#E6E2F3']} />
      <hemisphereLight args={['#E2DCFF', '#A89272', 0.55]} />
      <directionalLight position={[26, 48, 20]} intensity={3.2} color="#FFE6C7" />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#9CC27E" />
      </mesh>
      {PLACES.map((p) => {
        const f = roomFrame(p.id)
        return (
          <mesh key={p.id} position={[f.cx, 0.5, f.cz]} rotation-y={f.rotY}>
            <boxGeometry args={[ROOM_W, 1, ROOM_D]} />
            <meshStandardMaterial color={p.accent} />
          </mesh>
        )
      })}
    </Canvas>
  )
}
