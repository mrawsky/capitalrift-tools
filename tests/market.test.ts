import { describe, expect, it } from 'vitest'
import { basePrice, categoryNames, categorySpread, marketPrice, marketRows, storePrice } from '../app/utils/market'

describe('market mechanics', () => {
  it('looks up base prices by lowercased item id', () => {
    expect(basePrice('ketchup')).toBeCloseTo(0.05, 6)
    expect(basePrice('nails')).toBeCloseTo(1.5, 6)
    expect(basePrice('unknown_item')).toBeNull()
  })

  it('exposes category spreads', () => {
    expect(categorySpread('Bundle')).toBeCloseTo(0.05, 6)
    expect(categorySpread('Furniture')).toBeCloseTo(0.1, 6)
    expect(categoryNames()).toContain('Furniture')
  })

  it('widens the price by half the spread and applies the store markup', () => {
    expect(marketPrice('ketchup', 0.06)).toBeCloseTo(0.0515, 6)
    expect(storePrice('ketchup', 0.06)).toBeCloseTo(0.06695, 6)
    expect(marketPrice('unknown_item', 0.06)).toBeNull()
  })

  it('builds reference rows', () => {
    const rows = marketRows(['ketchup', 'unknown_item'], 0.06)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ itemId: 'ketchup' })
  })
})
