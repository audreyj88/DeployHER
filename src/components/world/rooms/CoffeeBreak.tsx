'use client'
// The Coffee Break (Debrief): espresso bar with Theo, café tables, Nia waiting at her table.
import { useMemo } from 'react'
import { useGame } from '@/store/game'
import { DEBRIEF_LEARNER, DEBRIEF_NIA, NIA_TABLE } from '../seats'
import { talkingFromBusy } from '../state'
import { NIA, Person, SeatedPerson, THEO } from '../people'
import { CafeChair, CafeTable, Counter, EspressoMachine, Mat, Mug, PastryCase, PendantLamp, Plant, Vase } from './props'
import { floorTexture, RoomShell, type BoardData } from './RoomShell'
import { useColliders } from './util'

const ID = 'debrief' as const
const ACCENT = '#9A5B3A'

/** Nia's table: two seats on the z axis (Nia at -z facing the door, the learner at +z). */
function NiaTable({ talking }: { talking: boolean }) {
  return (
    <group>
      <group position={[NIA_TABLE.x, 0, NIA_TABLE.z]}>
        <mesh position-y={0.74} castShadow receiveShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 24]} />
          <Mat color="#C99A6B" rough={0.55} />
        </mesh>
        <mesh position-y={0.37}>
          <cylinderGeometry args={[0.04, 0.04, 0.72, 10]} />
          <Mat color="#3B2A20" />
        </mesh>
        <mesh position-y={0.02}>
          <cylinderGeometry args={[0.22, 0.24, 0.04, 16]} />
          <Mat color="#3B2A20" />
        </mesh>
        <Vase position={[0.18, 0.76, 0]} />
        <Mug position={[0, 0.76, -0.22]} color="#F0735A" />
        <Mug position={[0, 0.76, 0.22]} />
      </group>
      <CafeChair position={[DEBRIEF_NIA.x, 0, DEBRIEF_NIA.z - 0.12]} rotationY={DEBRIEF_NIA.heading} accent={ACCENT} />
      <CafeChair position={[DEBRIEF_LEARNER.x, 0, DEBRIEF_LEARNER.z + 0.12]} rotationY={DEBRIEF_LEARNER.heading} accent={ACCENT} />
      <SeatedPerson position={[DEBRIEF_NIA.x, 0, DEBRIEF_NIA.z - 0.08]} rotationY={DEBRIEF_NIA.heading} look={NIA} pose="talking" talking={talking} name="Nia · your coach" />
    </group>
  )
}

export function CoffeeBreak() {
  const busy = useGame((s) => s.busy)
  const grade = useGame((s) => s.session?.grade ?? null)
  const talk = talkingFromBusy(busy)
  const floor = useMemo(() => floorTexture('wood', '#D8B48A'), [])
  const board: BoardData = {
    bars: grade ? grade.rubric.map((r) => ({ v: r.score / r.max, color: r.score / r.max >= 0.6 ? '#22C55E' : r.score > 0 ? '#F59E0B' : '#EF4444' })) : [],
    busy: talk.nia,
  }
  // South-row layout: counter at (-3.6, 2.25), Theo behind it facing -z (toward the back/camera side).
  useColliders(ID, [
    { id: 'counter', x: -3.6, z: 2.25, w: 3.4, d: 0.95 },
    { id: 'theo', x: -3.6, z: 3.15, r: 0.35 },
    { id: 'cafe-1', x: -2.4, z: -3.1, r: 1.05 },
    { id: 'cafe-2', x: 1.3, z: -2.0, r: 1.0 },
    { id: 'nia-table', x: NIA_TABLE.x, z: NIA_TABLE.z, r: 0.5 },
    { id: 'nia', x: DEBRIEF_NIA.x, z: DEBRIEF_NIA.z - 0.1, r: 0.3 },
    { id: 'plant-br', x: 7.2, z: -5.2, r: 0.35 },
  ])
  return (
    <RoomShell id={ID} floor={floor} board={board}>
      <Counter position={[-3.6, 0, 2.25]} body="#8A5A3B" accent={ACCENT} width={3.2} />
      <EspressoMachine position={[-4.4, 1.05, 2.15]} rotationY={Math.PI} accent={ACCENT} />
      <PastryCase position={[-2.7, 1.05, 2.2]} />
      <Mug position={[-3.4, 1.05, 2.0]} color="#F0735A" />
      <Person position={[-3.6, 0, 3.15]} rotationY={Math.PI} look={THEO} name="Theo · barista" />
      <CafeTable position={[-2.4, 0, -3.1]} seats={3} accent={ACCENT} />
      <CafeTable position={[1.3, 0, -2.0]} seats={2} accent={ACCENT} seatAngles={[Math.PI / 2, -Math.PI / 2]} />
      <NiaTable talking={talk.nia} />
      <PendantLamp position={[-2.4, 0, -3.1]} accent={ACCENT} />
      <PendantLamp position={[1.3, 0, -2.0]} accent={ACCENT} />
      <PendantLamp position={[NIA_TABLE.x, 0, NIA_TABLE.z]} accent={ACCENT} />
      <pointLight position={[0, 2.1, -2.5]} color="#FFD9A0" intensity={6} distance={9} decay={2} />
      <Plant position={[7.2, 0, -5.2]} seed={12} />
    </RoomShell>
  )
}
