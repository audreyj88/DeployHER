'use client'
// Everything outside the rooms.
import { Beacon } from './Beacon'
import { DoorTags } from './DoorTags'
import { CafeKiosk, Garden, PicnicTables, Pond } from './Features'
import { FoodTruck } from './FoodTruck'
import { Ground } from './Ground'
import { MissionMap } from './MissionMap'
import { Nature } from './Nature'
import { PlazaFurniture } from './PlazaFurniture'

export function Campus() {
  return (
    <group>
      <Ground />
      <MissionMap />
      <PlazaFurniture />
      <Nature />
      <CafeKiosk />
      <Pond />
      <PicnicTables />
      <Garden />
      <FoodTruck />
      <Beacon />
      <DoorTags />
    </group>
  )
}
