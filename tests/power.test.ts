import { describe, expect, it } from 'vitest'
import {
  costPerMinute,
  deviceDrawKw,
  drawOptionGroups,
  generatorFuelPerMin,
  kwhPerMinute,
  machineDrawKw,
  machineEffectiveKw,
  machineStationId,
  priceAtCurvePosition,
  priceCurvePosition,
  stationEconomics,
} from '../app/utils/power'

describe('power mechanics', () => {
  it('computes average device draw from rated watts and duty', () => {
    expect(deviceDrawKw('lamp')).toBeCloseTo(0.03, 6)
    expect(deviceDrawKw('industrial_ac')).toBeCloseTo(15, 6)
    expect(deviceDrawKw('does_not_exist')).toBe(0)
  })

  it('applies running, idle and paused machine states', () => {
    expect(machineDrawKw('steel_mill')).toBe(10)
    expect(machineEffectiveKw('steel_mill', 'running')).toBe(10)
    expect(machineEffectiveKw('steel_mill', 'idle')).toBeCloseTo(1, 6)
    expect(machineEffectiveKw('steel_mill', 'paused')).toBe(0)
  })

  it('maps machine power keys to catalog stations', () => {
    expect(machineStationId('press')).toBe('manufacturing_press')
    expect(machineStationId('refinery')).toBe('oil_refinery')
    expect(machineStationId('steel_mill')).toBe('steel_mill')
  })

  it('bills energy with the client kWh-per-kW-per-minute factor', () => {
    expect(kwhPerMinute(10)).toBe(5)
    expect(costPerMinute(10, 0.162)).toBeCloseTo(0.81, 6)
  })

  it('uses the log price curve between the floor and ceiling', () => {
    expect(priceCurvePosition(0.06)).toBeCloseTo(0, 6)
    expect(priceCurvePosition(0.4)).toBeCloseTo(1, 6)
    expect(priceCurvePosition(0.162)).toBeCloseTo(0.5236, 3)
    expect(priceAtCurvePosition(0)).toBeCloseTo(0.06, 6)
    expect(priceAtCurvePosition(1)).toBeCloseTo(0.4, 6)
  })

  it('calculates generator fuel demand and margins', () => {
    expect(generatorFuelPerMin('coal', 'COAL')).toBeCloseTo(9, 6)
    expect(generatorFuelPerMin('oil', 'DIESEL')).toBeCloseTo(6.8, 6)
    expect(generatorFuelPerMin('oil', 'CRUDE_OIL')).toBeCloseTo(13, 6)
    expect(generatorFuelPerMin('wind', 'COAL')).toBe(0)
    const result = stationEconomics({ kind: 'coal', fuelItem: 'COAL', fuelPrice: 7, pricePerKwh: 0.162 })
    expect(result.ratedKw).toBe(5000)
    expect(result.outputKwhPerMin).toBe(2500)
    expect(result.fuelPerMin).toBeCloseTo(9, 6)
    expect(result.fuelCostPerMin).toBeCloseTo(63, 6)
    expect(result.revenuePerMin).toBeCloseTo(405, 6)
    expect(result.breakEvenPricePerKwh).toBeCloseTo(0.0252, 4)
  })

  it('groups every draw option for the calculator', () => {
    const groups = drawOptionGroups()
    expect(groups).toHaveLength(5)
    expect(groups.find(group => group.category === 'machines')!.options).toHaveLength(22)
  })
})
