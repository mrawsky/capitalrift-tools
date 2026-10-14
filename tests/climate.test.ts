import { describe, expect, it } from 'vitest'
import { acsToCool, heatOptions, outdoorTemperature, roomTemperature, slowdownFactor, temperatureCategory } from '../app/utils/climate'

describe('climate mechanics', () => {
  it('derives outdoor temperature from latitude', () => {
    expect(outdoorTemperature(0)).toBeCloseTo(27, 6)
    expect(outdoorTemperature(90)).toBeCloseTo(-5, 6)
    expect(outdoorTemperature(40)).toBeCloseTo(13.777, 2)
  })

  it('applies the indoor factor and comfort threshold', () => {
    expect(slowdownFactor(28)).toBe(1)
    expect(slowdownFactor(30)).toBeCloseTo(0.95, 6)
    expect(slowdownFactor(40)).toBe(0.75)
    expect(slowdownFactor(100)).toBe(0.75)
  })

  it('calculates room temperature with machines and cooling', () => {
    const plain = roomTemperature({ latDeg: 40, floor: 0, areaM2: 64, units: {} })
    expect(plain.tempC).toBeCloseTo(16.58, 2)
    expect(plain.speedFactor).toBe(1)
    expect(plain.category).toBe('Cool')

    const withFurnace = roomTemperature({ latDeg: 40, floor: 0, areaM2: 64, units: { furnace: 1 } })
    expect(withFurnace.machinesC).toBeCloseTo(225 / 64, 4)
    expect(withFurnace.tempC).toBeCloseTo(16.58 + 225 / 64, 2)

    const cooled = roomTemperature({ latDeg: 40, floor: 0, areaM2: 64, units: { industrial_ac: 1 } })
    expect(cooled.devicesC).toBeCloseTo(-1500 / 64, 4)
    expect(cooled.tempC).toBeLessThan(0)
  })

  it('rounds air conditioners up to the next whole unit', () => {
    expect(acsToCool(30, 64)).toBe(1)
    expect(acsToCool(28, 64)).toBe(0)
    expect(acsToCool(50, 100)).toBe(2)
  })

  it('labels temperature bands', () => {
    expect(temperatureCategory(-5)).toBe('Freezing')
    expect(temperatureCategory(5)).toBe('Cold')
    expect(temperatureCategory(20)).toBe('Comfortable')
    expect(temperatureCategory(32)).toBe('Hot')
  })

  it('lists heat sources for the planner', () => {
    const options = heatOptions()
    expect(options.find(option => option.id === 'industrial_ac')?.value).toBe(-1500)
    expect(options.find(option => option.id === 'steel_mill')?.value).toBe(300)
  })
})
