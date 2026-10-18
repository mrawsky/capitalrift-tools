import { describe, expect, it } from 'vitest'
import { decodeMenuCode, encodeMenuCode, encodeMenuFromRecipes, encodeRecipeCode, MAX_MENU_DISHES } from '../app/utils/domain/menuCode'
import { generateTrends } from '../app/utils/domain/trends'
import { optimizeTrend } from '../app/utils/domain/optimizer'
import type { Station } from '../app/utils/domain/types'

const dish = { name: 'Test Dog', vessel: 'grill' as const, mix: [{ ingredientId: 'FRANKS', share: 60 }, { ingredientId: 'BUNS', share: 40 }], price: 6, servings: 2 }

describe('menu code decoding', () => {
  it('round-trips a recipe code', () => {
    const result = decodeMenuCode(encodeMenuCode({ kind: 'recipe', dishes: [dish] }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.kind).toBe('recipe')
    expect(result.value.dishes[0]).toMatchObject({ name: 'Test Dog', vessel: 'grill', price: 6, servings: 2 })
    expect(result.value.dishes[0]!.mix).toEqual([{ ingredientId: 'FRANKS', share: 60 }, { ingredientId: 'BUNS', share: 40 }])
  })

  it('round-trips a menu of several dishes', () => {
    const result = decodeMenuCode(encodeMenuCode({ kind: 'menu', dishes: [dish, { ...dish, name: 'Second' }] }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.dishes).toHaveLength(2)
  })

  it('rejects unknown prefixes and malformed codes', () => {
    expect(decodeMenuCode('')).toMatchObject({ ok: false, error: 'Paste a CRRCP1 or CRMENU1 code.' })
    expect(decodeMenuCode('HELLO.world')).toMatchObject({ ok: false })
    expect(decodeMenuCode('CRRCP1.@@@@')).toMatchObject({ ok: false, error: 'This code could not be read. It may be incomplete or edited.' })
  })

  it('rejects shares that do not total 100', () => {
    const bad = encodeMenuCode({ kind: 'recipe', dishes: [{ ...dish, mix: [{ ingredientId: 'FRANKS', share: 60 }, { ingredientId: 'BUNS', share: 30 }] }] })
    expect(decodeMenuCode(bad)).toMatchObject({ ok: false, error: 'Ingredient shares must total exactly 100%.' })
  })

  it('rejects a recipe code that holds more than one dish', () => {
    const bad = encodeMenuCode({ kind: 'menu', dishes: [dish, dish] }).replace('CRMENU1', 'CRRCP1')
    expect(decodeMenuCode(bad)).toMatchObject({ ok: false, error: 'This code could not be read. It may be incomplete or edited.' })
  })
})

describe('menu code export helpers', () => {
  const parts = [{ ingredientId: 'FRANKS', share: 60 }, { ingredientId: 'BUNS', share: 40 }]

  it('builds a one-dish CRRCP1 code', () => {
    const code = encodeRecipeCode(parts, { name: 'Test Dog', vessel: 'grill', price: 6, servings: 2 })
    expect(code.startsWith('CRRCP1.')).toBe(true)
    const result = decodeMenuCode(code)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.kind).toBe('recipe')
    expect(result.value.dishes[0]).toMatchObject({ name: 'Test Dog', vessel: 'grill', price: 6, servings: 2 })
  })

  it('derives a name and clamps price and servings to valid values', () => {
    const result = decodeMenuCode(encodeRecipeCode(parts, { price: 500, servings: -2 }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.dishes[0]!.name).toBe('Franks & Buns Blend')
    expect(result.value.dishes[0]!.price).toBe(100)
    expect(result.value.dishes[0]!.servings).toBe(1)
  })

  it('builds a CRMENU1 code for a whole menu and rejects an empty one', () => {
    const code = encodeMenuFromRecipes([{ parts }, { parts, details: { name: 'Second' } }])
    expect(code.startsWith('CRMENU1.')).toBe(true)
    const result = decodeMenuCode(code)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.dishes.map(entry => entry.name)).toContain('Second')
    expect(() => encodeMenuFromRecipes([])).toThrow()
    expect(() => encodeMenuFromRecipes(Array.from({ length: MAX_MENU_DISHES + 1 }, () => ({ parts })))).toThrow()
  })

  it('keeps a one-dish whole menu as CRMENU1', () => {
    const result = decodeMenuCode(encodeMenuFromRecipes([{ parts }]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.kind).toBe('menu')
    expect(result.value.dishes).toHaveLength(1)
  })

  it('truncates dish names to the 40-character game limit', () => {
    const result = decodeMenuCode(encodeRecipeCode(parts, { name: 'A'.repeat(60) }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.dishes[0]!.name).toHaveLength(40)
  })

  it('falls back to prep for an unknown station and rounds price and servings', () => {
    const result = decodeMenuCode(encodeRecipeCode(parts, {
      vessel: 'toaster' as unknown as Station,
      price: 12.345,
      servings: 3.9,
    }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.dishes[0]).toMatchObject({ vessel: 'prep', price: 12.35, servings: 3 })
  })

  it('preserves per-dish station, price and servings inside a menu', () => {
    const result = decodeMenuCode(encodeMenuFromRecipes([
      { parts, details: { name: 'One', vessel: 'grill', price: 4, servings: 1 } },
      { parts: [{ ingredientId: 'BEEF', share: 50 }, { ingredientId: 'PORK', share: 50 }], details: { name: 'Two', vessel: 'oven', price: 9.5, servings: 3 } },
    ]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.dishes[0]).toMatchObject({ name: 'One', vessel: 'grill', price: 4, servings: 1 })
    expect(result.value.dishes[1]).toMatchObject({ name: 'Two', vessel: 'oven', price: 9.5, servings: 3 })
  })

  it('exports real optimizer candidates as a decodable menu', () => {
    const allowed = ['FRANKS', 'BUNS', 'BEEF', 'PORK', 'CHEESE', 'KETCHUP', 'ONIONS', 'LETTUCE']
    const recipes = generateTrends('15/18295/10789')
      .map(trend => optimizeTrend(trend, 4, true, allowed))
      .flatMap(result => result.candidates)
    expect(recipes.length).toBeGreaterThan(0)

    const decoded = decodeMenuCode(encodeMenuFromRecipes(recipes.slice(0, MAX_MENU_DISHES)))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.kind).toBe('menu')
    expect(decoded.value.dishes).toHaveLength(Math.min(MAX_MENU_DISHES, recipes.length))
    for (const entry of decoded.value.dishes) {
      expect(entry.mix.reduce((sum, part) => sum + part.share, 0)).toBe(100)
    }
  })
})
