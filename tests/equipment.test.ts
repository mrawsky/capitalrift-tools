import { describe, expect, it } from 'vitest'
import { EQUIPMENT_MECHANICS, containersRequired, garagePlan, garageVehicle, miningAssignment, throughputPlan, tripsRequired } from '../app/utils/equipment'

describe('equipment mechanics', () => {
  it('counts whole trips for a quantity and a capacity', () => {
    expect(tripsRequired(1000, 1200)).toBe(1)
    expect(tripsRequired(1201, 1200)).toBe(2)
    expect(tripsRequired(0, 1200)).toBe(0)
    expect(tripsRequired(1000, 0)).toBeNull()
    expect(tripsRequired(1000, -5)).toBeNull()
    expect(tripsRequired(-1, 1200)).toBeNull()
    expect(containersRequired(1000, undefined)).toBeNull()
    expect(containersRequired(1000, 300)).toBe(4)
  })

  it('turns a round trip into vehicles, frequency and buffer stock', () => {
    const plan = throughputPlan(60, 1200, 8)
    expect(plan?.perVehiclePerMinute).toBe(150)
    expect(plan?.vehiclesNeeded).toBe(1)
    expect(plan?.tripsPerHour).toBe(7.5)
    expect(plan?.bufferStock).toBe(480)
    expect(throughputPlan(60, 0, 8)).toBeNull()
    expect(throughputPlan(60, 1200, 0)).toBeNull()
  })

  it('assigns the strongest mining vehicles first', () => {
    expect(miningAssignment(3, { drill_rig: 1, mining_barrow: 1 })).toEqual([3, 1.5, 1])
    expect(miningAssignment(0, { drill_rig: 5 })).toEqual([])
    expect(miningAssignment(-1, {})).toEqual([])
  })

  it('plans a garage fleet with fuel burn, mechanics and tank life', () => {
    const single = garagePlan([{ id: 'sedan', count: 1 }])
    expect(single.totalVehicles).toBe(1)
    expect(single.fuelPerMin).toBeCloseTo(0.005, 9)
    expect(single.topRatePerMin).toBeCloseTo(0.5, 9)
    expect(single.mechanicsNeeded).toBe(1)
    expect(single.fuelByItem.gasoline).toBeCloseTo(0.005, 9)
    // A four unit tank at 0.005 per minute is 800 minutes, which is 13.3 hours.
    expect(single.tankHours[0]?.hours).toBeCloseTo(800 / 60, 6)

    const fleet = garagePlan([{ id: 'van', count: 5 }, { id: 'truck', count: 2 }])
    expect(fleet.totalVehicles).toBe(7)
    expect(fleet.mechanicsNeeded).toBe(1)
    expect(fleet.fuelPerMin).toBeCloseTo(5 * 0.012 + 2 * 0.02, 9)
    expect(fleet.fuelByItem.gasoline).toBeCloseTo(5 * 0.012, 9)
    expect(fleet.fuelByItem.diesel).toBeCloseTo(2 * 0.02, 9)
    expect(fleet.topRatePerMin).toBeCloseTo(5 * 1.5 + 2 * 3, 9)

    const big = garagePlan([{ id: 'truck', count: 11 }])
    expect(big.mechanicsNeeded).toBe(2)
  })

  it('ignores unknown vehicles and non-positive counts', () => {
    const plan = garagePlan([{ id: 'submarine', count: 3 }, { id: 'van', count: 0 }])
    expect(plan.totalVehicles).toBe(0)
    expect(plan.fuelPerMin).toBe(0)
    expect(garageVehicle('van')?.fuel).toBe('gasoline')
    expect(garageVehicle('submarine')).toBeUndefined()
  })

  it('keeps the garage table aligned with the checked client values', () => {
    expect(EQUIPMENT_MECHANICS.garage.vehiclesPerMechanic).toBe(10)
    expect(EQUIPMENT_MECHANICS.garage.fuelItems).toEqual(['gasoline', 'diesel'])
    expect(EQUIPMENT_MECHANICS.garage.supplyItems).toEqual(['gasoline', 'diesel', 'vehicle_repair_kit'])
    expect(EQUIPMENT_MECHANICS.garage.fleet.map(entry => entry.id)).toEqual(['sedan', 'suv', 'van', 'truck'])
  })
})
