import { describe, expect, it } from 'vitest'
import { decodeMenuCode, encodeMenuCode } from '../app/utils/domain/menuCode'

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
