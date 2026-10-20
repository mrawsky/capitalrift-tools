import mechanics from '../data/equipment-mechanics.json'
export const EQUIPMENT_MECHANICS = mechanics
function finitePositive(value: number) { return Number.isFinite(value) && value > 0 }
export function tripsRequired(quantity: number, capacity: number): number | null {
  if (!Number.isFinite(quantity) || quantity < 0 || !finitePositive(capacity)) return null
  return Math.ceil(quantity / capacity)
}
export function containersRequired(quantity: number, capacity: number | undefined) {
  return capacity === undefined ? null : tripsRequired(quantity, capacity)
}
// Connects a measured round trip to a steady demand: how many vehicles keep up,
// how often each delivers, and the stock consumed between deliveries.
export function throughputPlan(demandPerMinute: number, capacity: number, roundTripMinutes: number) {
  if (!Number.isFinite(demandPerMinute) || demandPerMinute < 0 || !finitePositive(capacity) || !finitePositive(roundTripMinutes)) return null
  const perVehiclePerMinute = capacity / roundTripMinutes
  return {
    perVehiclePerMinute,
    vehiclesNeeded: demandPerMinute === 0 ? 0 : Math.ceil(demandPerMinute / perVehiclePerMinute),
    tripsPerHour: 60 / roundTripMinutes,
    bufferStock: demandPerMinute * roundTripMinutes,
  }
}
export function miningAssignment(miners: number, vehicles: Readonly<Record<string, number>>) {
  if (!Number.isInteger(miners) || miners < 0 || miners > 1000) return []
  const selected: number[] = []
  for (const equipment of [...mechanics.mining].sort((a, b) => b.multiplier - a.multiplier)) {
    const count = Number.isFinite(vehicles[equipment.itemId]) ? Math.min(miners - selected.length, Math.max(0, Math.floor(vehicles[equipment.itemId] ?? 0))) : 0
    for (let index = 0; index < count; index++) selected.push(equipment.multiplier)
  }
  while (selected.length < miners) selected.push(1)
  return selected
}

export type GarageVehicle = typeof mechanics.garage.fleet[number]

export function garageVehicle(id: string): GarageVehicle | undefined {
  return mechanics.garage.fleet.find(entry => entry.id === id)
}

// A garage mechanic fuels and repairs the fleet from the room's own stock, so a
// garage needs fuel, repair kits and parking spaces before it earns anything.
export function garagePlan(vehicles: readonly { id: string, count: number }[]) {
  const rows = vehicles
    .map(entry => {
      const vehicle = garageVehicle(entry.id)
      if (!vehicle || !Number.isFinite(entry.count) || entry.count <= 0) return null
      const count = Math.floor(entry.count)
      return {
        id: vehicle.id,
        name: vehicle.name,
        count,
        fuel: vehicle.fuel,
        fuelPerMin: vehicle.fuelPerMin * count,
        tankUnits: vehicle.tankUnits * count,
        topRatePerMin: vehicle.topRatePerMin * count,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

  const totalVehicles = rows.reduce((sum, row) => sum + row.count, 0)
  const fuelPerMin = rows.reduce((sum, row) => sum + row.fuelPerMin, 0)
  const topRatePerMin = rows.reduce((sum, row) => sum + row.topRatePerMin, 0)
  const fuelByItem: Record<string, number> = {}
  for (const row of rows) fuelByItem[row.fuel] = (fuelByItem[row.fuel] ?? 0) + row.fuelPerMin

  return {
    rows,
    totalVehicles,
    fuelPerMin,
    topRatePerMin,
    fuelByItem,
    mechanicsNeeded: Math.ceil(totalVehicles / mechanics.garage.vehiclesPerMechanic),
    // A mechanic fills each vehicle from the room's stock; the tank sets how
    // long one full tank lasts at that vehicle's burn rate. Tank units divided
    // by units per minute gives minutes, so the result is scaled to hours.
    tankHours: rows.map(row => ({
      id: row.id,
      name: row.name,
      count: row.count,
      hours: row.fuelPerMin > 0 ? (row.tankUnits / row.fuelPerMin) / 60 : 0,
    })),
  }
}
