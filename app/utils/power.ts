import mechanics from '../data/power-mechanics.json'
import { FACTORY_CATALOG, itemName } from './factory/catalog'

export const POWER_MECHANICS = mechanics

export type MachineState = 'running' | 'idle' | 'paused'
export type DrawCategory = 'devices' | 'kitchen' | 'survey' | 'machines' | 'pumps'
export type GeneratorKind = keyof typeof POWER_MECHANICS.generators

export interface DrawOption { id: string; name: string; category: DrawCategory; watts: number; duty: number }

const CATEGORY_LABELS: Record<DrawCategory, string> = {
  devices: 'Lights and appliances',
  kitchen: 'Kitchen stations',
  survey: 'Survey gear',
  machines: 'Factory machines',
  pumps: 'Oil pumps',
}

export function categoryLabel(category: DrawCategory) { return CATEGORY_LABELS[category] }

function finite(value: number) { return Number.isFinite(value) && value > 0 }

export function machineStationId(powerKey: string): string { return (POWER_MECHANICS.machineStation as Record<string, string>)[powerKey] ?? powerKey }

function machineDisplayName(powerKey: string) {
  const stationId = machineStationId(powerKey)
  return FACTORY_CATALOG.itemById.get(stationId)?.name ?? itemName(stationId)
}

// The client device table stores rated watts and a duty cycle. Average
// continuous draw is rated watts times duty, matching the client helper.
export function deviceDrawKw(deviceId: string): number {
  const entry = (POWER_MECHANICS.deviceDraw as Record<string, { w: number; duty: number }>)[deviceId]
  return entry ? entry.w * entry.duty / 1000 : 0
}

export function deviceRatedWatts(deviceId: string): number {
  const entry = (POWER_MECHANICS.deviceDraw as Record<string, { w: number; duty: number }>)[deviceId]
  return entry?.w ?? 0
}

export function deviceDuty(deviceId: string): number {
  const entry = (POWER_MECHANICS.deviceDraw as Record<string, { w: number; duty: number }>)[deviceId]
  return entry?.duty ?? 0
}

export function machineDrawKw(stationId: string): number {
  return (POWER_MECHANICS.machineDrawKw as Record<string, number>)[stationId] ?? 0
}

const STATION_TO_POWER_KEY = (() => {
  const map = new Map<string, string>()
  for (const [powerKey, stationId] of Object.entries(POWER_MECHANICS.machineStation as Record<string, string>)) map.set(stationId, powerKey)
  return map
})()

// Machine power is keyed by the client's short keys (press, refinery, …).
// Resolve a catalog station id back to its client key before looking up draw.
export function machineDrawKwForStation(stationId: string): number {
  return machineDrawKw(STATION_TO_POWER_KEY.get(stationId) ?? stationId)
}

// Machines draw their full rating while working, a standby fraction while
// switched on but idle, and nothing while paused.
export function machineEffectiveKw(stationId: string, state: MachineState): number {
  const rated = machineDrawKw(stationId)
  if (state === 'running') return rated
  if (state === 'idle') return rated * POWER_MECHANICS.machineStandby
  return 0
}

// Power is billed in kWh using the client's kWh-per-kW-per-minute factor.
export function kwhPerMinute(kw: number): number {
  return finite(kw) ? kw * POWER_MECHANICS.kwhPerKwMin : 0
}

export function costPerMinute(kw: number, pricePerKwh: number): number {
  if (!finite(pricePerKwh)) return 0
  return kwhPerMinute(kw) * pricePerKwh
}

// Maps a price onto the client's log curve between the floor and ceiling.
export function priceCurvePosition(pricePerKwh: number): number {
  if (!finite(pricePerKwh)) return 0
  const { priceFloor, priceCeiling } = POWER_MECHANICS
  const position = Math.log(pricePerKwh / priceFloor) / Math.log(priceCeiling / priceFloor)
  return Math.min(1, Math.max(0, position))
}

export function priceAtCurvePosition(position: number): number {
  const { priceFloor, priceCeiling } = POWER_MECHANICS
  const clamped = Math.min(1, Math.max(0, position))
  return priceFloor * Math.pow(priceCeiling / priceFloor, clamped)
}

export function generatorSpec(kind: GeneratorKind) { return POWER_MECHANICS.generators[kind] }

export function generatorRatedKw(kind: GeneratorKind): number { return generatorSpec(kind)?.ratedKw ?? 0 }

export function generatorFuelPerMin(kind: GeneratorKind, fuelItem: string): number {
  const spec = generatorSpec(kind)
  const fuel = spec?.fuels.find(entry => entry.item === fuelItem)
  if (!fuel) return 0
  return spec.ratedKw * POWER_MECHANICS.kwhPerKwMin / 1000 * fuel.perMwh
}

export function generatorOutputKwhPerMin(kind: GeneratorKind): number {
  return kwhPerMinute(generatorRatedKw(kind))
}

export interface StationInputs { kind: GeneratorKind; fuelItem?: string; fuelPrice?: number; pricePerKwh: number; machines?: number }

export interface StationResult {
  ratedKw: number
  outputKwhPerMin: number
  fuelItem: string | null
  fuelPerMin: number
  fuelCostPerMin: number
  revenuePerMin: number
  marginPerMin: number
  breakEvenPricePerKwh: number | null
  needsFuel: boolean
}

export function stationEconomics(input: StationInputs): StationResult {
  const machines = finite(input.machines ?? 1) ? Math.max(1, Math.floor(input.machines ?? 1)) : 1
  const spec = generatorSpec(input.kind)
  const ratedKw = (spec?.ratedKw ?? 0) * machines
  const fuel = spec?.fuels.find(entry => entry.item === input.fuelItem)
  const fuelPerMin = fuel ? ratedKw * POWER_MECHANICS.kwhPerKwMin / 1000 * fuel.perMwh : 0
  const fuelPrice = Number.isFinite(input.fuelPrice) && (input.fuelPrice ?? 0) >= 0 ? input.fuelPrice! : 0
  const fuelCostPerMin = fuel ? fuelPerMin * fuelPrice : 0
  const outputKwhPerMin = kwhPerMinute(ratedKw)
  const revenuePerMin = outputKwhPerMin * (finite(input.pricePerKwh) ? input.pricePerKwh : 0)
  const breakEvenPricePerKwh = outputKwhPerMin > 0 && fuel ? fuelCostPerMin / outputKwhPerMin : null
  return { ratedKw, outputKwhPerMin, fuelItem: fuel?.item ?? null, fuelPerMin, fuelCostPerMin, revenuePerMin, marginPerMin: revenuePerMin - fuelCostPerMin, breakEvenPricePerKwh, needsFuel: Boolean(spec?.fuels.length) }
}

export function drawOptions(): DrawOption[] { return drawOptionGroups().flatMap(group => group.options) }

// Continuous draw for any selectable option. Machine options respect the
// running/idle/paused state; lights, appliances, stations and gear draw their
// average rated value.
export function optionContinuousKw(id: string, state: MachineState = 'running'): number {
  if (id === 'oil_pump') return POWER_MECHANICS.oilPumpKw
  if (id in POWER_MECHANICS.deviceDraw) return deviceDrawKw(id)
  if (id in POWER_MECHANICS.kitchenDraw) { const entry = (POWER_MECHANICS.kitchenDraw as Record<string, { w: number; duty: number }>)[id]!; return entry.w * entry.duty / 1000 }
  if (id in POWER_MECHANICS.surveyDraw) { const entry = (POWER_MECHANICS.surveyDraw as Record<string, { w: number; duty: number }>)[id]!; return entry.w * entry.duty / 1000 }
  return machineEffectiveKw(id, state)
}

export interface DrawOptionGroup { category: DrawCategory; label: string; options: DrawOption[] }

export function drawOptionGroups(): DrawOptionGroup[] {
  const groups: DrawOptionGroup[] = []
  const devices = Object.entries(POWER_MECHANICS.deviceDraw as Record<string, { w: number; duty: number }>).map(([id, entry]) => ({ id, name: itemName(id), category: 'devices' as DrawCategory, watts: entry.w, duty: entry.duty }))
  const kitchen = Object.entries(POWER_MECHANICS.kitchenDraw as Record<string, { w: number; duty: number }>).map(([id, entry]) => ({ id, name: itemName(id), category: 'kitchen' as DrawCategory, watts: entry.w, duty: entry.duty }))
  const survey = Object.entries(POWER_MECHANICS.surveyDraw as Record<string, { w: number; duty: number }>).map(([id, entry]) => ({ id, name: itemName(id), category: 'survey' as DrawCategory, watts: entry.w, duty: entry.duty }))
  const machines = Object.entries(POWER_MECHANICS.machineDrawKw as Record<string, number>).map(([id, kw]) => ({ id, name: machineDisplayName(id), category: 'machines' as DrawCategory, watts: kw * 1000, duty: 1 }))
  const pumps: DrawOption[] = [{ id: 'oil_pump', name: itemName('oil_pump'), category: 'pumps', watts: POWER_MECHANICS.oilPumpKw * 1000, duty: 1 }]
  const groupsByCategory: [DrawCategory, DrawOption[]][] = [['devices', devices], ['kitchen', kitchen], ['survey', survey], ['machines', machines], ['pumps', pumps]]
  for (const [category, options] of groupsByCategory) groups.push({ category, label: CATEGORY_LABELS[category], options: options.sort((a, b) => a.name.localeCompare(b.name, 'en')) })
  return groups
}
