import mechanics from '../data/market-mechanics.json'

export const MARKET_MECHANICS = mechanics
export type CategoryName = keyof typeof mechanics.categorySpreads

export function basePrice(itemId: string): number | null {
  const key = itemId.toLowerCase()
  return Object.prototype.hasOwnProperty.call(mechanics.basePrices, key) ? (mechanics.basePrices as Record<string, number>)[key]! : null
}

export function categorySpread(category: CategoryName): number {
  return (mechanics.categorySpreads as Record<string, number>)[category] ?? 0
}

// The client widens the base price by half the category spread before the
// store markup is applied. `spread` is optional so callers can override it.
export function marketPrice(itemId: string, spread = 0): number | null {
  const base = basePrice(itemId)
  return base === null ? null : base * (1 + spread / 2)
}

export function storePrice(itemId: string, spread = 0): number | null {
  const price = marketPrice(itemId, spread)
  return price === null ? null : price * mechanics.storeMarkup
}

export function categoryNames(): CategoryName[] {
  return Object.keys(mechanics.categorySpreads).sort((a, b) => a.localeCompare(b, 'en')) as CategoryName[]
}

export interface MarketRow { itemId: string; base: number; spread: number; market: number; store: number }

export function marketRows(itemIds: readonly string[], spread = 0): MarketRow[] {
  const rows: MarketRow[] = []
  for (const itemId of itemIds) {
    const base = basePrice(itemId)
    if (base === null) continue
    const market = base * (1 + spread / 2)
    rows.push({ itemId, base, spread, market, store: market * mechanics.storeMarkup })
  }
  return rows
}
