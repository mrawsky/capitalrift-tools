import { describe, expect, it } from 'vitest'
import { buildingValue, cashRunway, hireCost, leaseTerms, listingFee, rentPerDay, seizureRecovery, solvencyForecast, wageCostPerMin } from '../app/utils/business'

describe('business mechanics', () => {
  const property = { unitAreaM2: 64, buildingAreaM2: 400, floors: 3, basements: 0, busyness: 1.2 }

  it('derives daily rent from area, busyness and floors', () => {
    expect(rentPerDay(property)).toBe(65)
    expect(rentPerDay({ ...property, unitAreaM2: 5, busyness: 0.4 })).toBe(6)
  })

  it('computes lease terms from daily rent', () => {
    expect(leaseTerms(65)).toMatchObject({ downPayment: 3120, perTerm: 10920, compensation: 10920, evictionArrears: 1560, termRealDays: 7 })
  })

  it('estimates building value with floor factors', () => {
    expect(buildingValue({ buildingAreaM2: 400, floors: 3, basements: 0, busyness: 1.2 })).toBe(104050)
    expect(buildingValue({ buildingAreaM2: 10, floors: 1, basements: 0, busyness: 1.2 })).toBe(2500)
  })

  it('classifies solvency tiers', () => {
    const critical = solvencyForecast({ netPerMin: -10, cash: 500, rentPerMin: 65 / 60, nowMs: 0 })
    expect(critical.tier).toBe('critical')
    expect(critical.burnPerMin).toBe(10)
    expect(solvencyForecast({ netPerMin: 5, cash: 0, rentPerMin: 1 }).tier).toBe('ok')
    expect(solvencyForecast({ netPerMin: -1, cash: 1000000, rentPerMin: 1 }).tier).toBe('burning')
  })

  it('estimates cash runway after a down payment', () => {
    const danger = cashRunway({ netPerMin: 0, cash: 5000, rentPerDay: 65, downPayment: 0 })
    expect(danger.tier).toBe('danger')
    expect(danger.runwayMin).toBeCloseTo(4615.38, 1)
    expect(cashRunway({ netPerMin: 10, cash: 5000, rentPerDay: 65, downPayment: 0 }).tier).toBe('good')
    expect(cashRunway({ netPerMin: 10, cash: 10, rentPerDay: 65, downPayment: 100 }).tier).toBe('short')
  })

  it('prices wages, hiring and seized assets', () => {
    expect(wageCostPerMin(3)).toBeCloseTo(9.9, 6)
    expect(hireCost(10)).toBe(10000)
    expect(seizureRecovery(1000)).toMatchObject({ redeemCost: 200, saleProceeds: 900, liquidationValue: 800, holdRealDays: 2 })
    expect(listingFee(1000)).toBe(10)
  })
})
