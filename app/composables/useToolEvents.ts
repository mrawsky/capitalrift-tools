import { track } from '@vercel/analytics'

export function useToolEvents() {
  return (event: 'batch_calculation' | 'open_planner' | 'plan_save' | 'plan_share' | 'recipe_share' | 'restaurant_save', productId?: string) => {
    if (!import.meta.client) return
    try { track(event, productId ? { productId } : undefined) }
    catch { /* Analytics must never interrupt a local tool. */ }
  }
}
