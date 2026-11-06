'use client'
// Canvas root: lights, environment, post-processing, campus, rooms, player, camera.
import { Canvas } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, SMAA, SSAO, TiltShift2, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Suspense } from 'react'
import { CameraRig } from './CameraRig'
import { Campus } from './campus/Campus'
import { Player } from './Player'
import { Rooms } from './rooms/Rooms'

function Lights() {
  return (
    <>
      <hemisphereLight args={['#E2DCFF', '#A89272', 0.55]} />
      <directionalLight
        position={[26, 48, 20]}
        intensity={3.2}
        color="#FFE6C7"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-48}
        shadow-camera-right={48}
        shadow-camera-top={48}
        shadow-camera-bottom={-48}
        shadow-camera-near={1}
        shadow-camera-far={140}
      />
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={0.35} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer intensity={0.25} color="#DCE8FF" position={[-20, 5, 10]} rotation-y={Math.PI / 2} scale={[30, 10, 1]} />
        <Lightformer intensity={0.2} color="#FFE8D0" position={[20, 5, -10]} rotation-y={-Math.PI / 2} scale={[30, 10, 1]} />
      </Environment>
    </>
  )
}

function Effects() {
  return (
    <EffectComposer enableNormalPass multisampling={0}>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={16}
        rings={4}
        radius={0.08}
        intensity={12}
        luminanceInfluence={0.5}
        worldDistanceThreshold={60}
        worldDistanceFalloff={10}
        worldProximityThreshold={1}
        worldProximityFalloff={1}
      />
      <TiltShift2 blur={0.03} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.35} />
      <SMAA />
    </EffectComposer>
  )
}

export default function World() {
  return (
    <Canvas
      className="dh-canvas"
      shadows="percentage"
      flat
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 40, 36], fov: 30, near: 0.5, far: 400 }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#E6E2F3']} />
      <fog attach="fog" args={['#E6E2F3', 110, 260]} />
      <Lights />
      <Suspense fallback={null}>
        <Campus />
        <Rooms />
        <Player />
      </Suspense>
      <CameraRig />
      <Effects />
    </Canvas>
  )
}
