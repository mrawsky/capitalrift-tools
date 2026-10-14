import mechanics from '../data/climate-mechanics.json'
import { FACTORY_CATALOG, itemName } from './factory/catalog'

export const CLIMATE_MECHANICS = mechanics
const CONFIG = mechanics.config

export type HeatKind = 'device' | 'machine'

export function outdoorTemperature(latDeg: number): number {
  if (!Number.isFinite(latDeg)) return CONFIG.outdoorBase
  const sinLat = Math.sin(latDeg * Math.PI / 180)
  return CONFIG.outdoorBase - CONFIG.outdoorLatAmplitude * sinLat * sinLat
}

export function heatValue(id: string): { kind: HeatKind; value: number } | null {
  if (id in mechanics.deviceHeat) return { kind: 'device', value: (mechanics.deviceHeat as Record<string, number>)[id]! }
  if (id in mechanics.machineHeat) return { kind: 'machine', value: (mechanics.machineHeat as Record<string, number>)[id]! }
  return null
}

export function deviceHeat(id: string): number { return (mechanics.deviceHeat as Record<string, number>)[id] ?? 0 }
export function machineHeat(id: string): number { return (mechanics.machineHeat as Record<string, number>)[id] ?? 0 }

export function slowdownFactor(tempC: number): number {
  if (!Number.isFinite(tempC) || tempC <= CONFIG.comfortThreshold) return 1
  return Math.max(CONFIG.slowdownFloor, 1 - CONFIG.slowdownPerDegree * (tempC - CONFIG.comfortThreshold))
}

// Air-conditioning units required to bring a room under the comfort threshold.
// Matches the client's ceil((rawC - 28) * area / 1500).
export function acsToCool(rawC: number, areaM2: number): number {
  const area = Math.max(CONFIG.minArea, Number.isFinite(areaM2) ? areaM2 : 0)
  const excess = rawC - CONFIG.comfortThreshold
  if (!(excess > 1e-9) || !(CONFIG.acCoolingPerUnit > 0) || !(area > 0)) return 0
  return Math.ceil(excess * area / CONFIG.acCoolingPerUnit - 1e-9)
}

export interface RoomInput { latDeg: number; floor: number; areaM2: number; units: Record<string, number> }

export interface RoomResult {
  outdoorC: number
  buildingC: number
  depthC: number
  devicesC: number
  machinesC: number
  rawC: number
  tempC: number
  areaM2: number
  speedFactor: number
  slowdownPercent: number
  acsToCool: number
  category: string
}

export function roomTemperature(input: RoomInput): RoomResult {
  const outdoorC = outdoorTemperature(input.latDeg)
  const buildingC = CONFIG.indoorBase + CONFIG.indoorOutdoorFactor * (outdoorC - CONFIG.indoorBase)
  const floor = Math.trunc(Number.isFinite(input.floor) ? input.floor : 0)
  const depthC = floor > 0
    ? Math.min(CONFIG.floorDepthMax, floor * CONFIG.floorDepthPerFloor)
    : floor < 0 ? floor * CONFIG.basementDepthPerFloor : 0
  const areaM2 = Math.max(CONFIG.minArea, Number.isFinite(input.areaM2) ? input.areaM2 : 0)
  let devicesC = 0
  let machinesC = 0
  for (const [id, count] of Object.entries(input.units)) {
    if (!(count > 0)) continue
    const device = deviceHeat(id)
    if (device !== 0) { devicesC += device * count / areaM2; continue }
    const machine = machineHeat(id)
    if (machine !== 0) machinesC += machine * count / areaM2
  }
  const rawC = buildingC + depthC + devicesC + machinesC
  const tempC = Math.max(CONFIG.minTemp, Math.min(CONFIG.maxTemp, rawC))
  const speedFactor = slowdownFactor(tempC)
  return {
    outdoorC,
    buildingC,
    depthC,
    devicesC,
    machinesC,
    rawC,
    tempC,
    areaM2,
    speedFactor,
    slowdownPercent: Math.round((1 - speedFactor) * 1000) / 10,
    acsToCool: acsToCool(rawC, areaM2),
    category: temperatureCategory(tempC),
  }
}

export function temperatureCategory(tempC: number): string {
  if (!Number.isFinite(tempC)) return 'Unknown'
  if (tempC < 0) return 'Freezing'
  if (tempC < 10) return 'Cold'
  if (tempC < CONFIG.comfortLow) return 'Cool'
  if (tempC <= CONFIG.comfortHigh) return 'Comfortable'
  if (tempC <= 30) return 'Warm'
  return 'Hot'
}

export interface HeatOption { id: string; name: string; kind: HeatKind; value: number }

export function heatOptions(): HeatOption[] {
  const devices = Object.entries(mechanics.deviceHeat as Record<string, number>).map(([id, value]) => ({ id, name: itemName(id), kind: 'device' as HeatKind, value }))
  const machines = Object.entries(mechanics.machineHeat as Record<string, number>).map(([id, value]) => ({ id, name: FACTORY_CATALOG.itemById.get(id)?.name ?? itemName(id), kind: 'machine' as HeatKind, value }))
  return [...devices, ...machines].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'en'))
}
