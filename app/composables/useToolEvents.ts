import { track } from '@vercel/analytics'

export type ToolEventName = 'batch_calculation' | 'open_planner' | 'plan_save' | 'plan_share' | 'recipe_share' | 'restaurant_save'

export function useToolEvents() {
  const { capture } = useAnalytics()
  return (event: ToolEventName, productId?: string) => {
    if (!import.meta.client) return
    try { track(event, productId ? { productId } : undefined) }
    catch { /* Analytics must never interrupt a local tool. */ }
    capture(event, productId ? { product_id: productId } : undefined)
  }
}
