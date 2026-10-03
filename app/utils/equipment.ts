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
