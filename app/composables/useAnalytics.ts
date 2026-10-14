import type { PostHog } from 'posthog-js'
import { ANALYTICS_EVENTS } from '../utils/analytics'

// Analytics must never interrupt a local tool: every call is guarded and the
// PostHog client is resolved once in setup so event handlers stay synchronous.

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>

function resolveClient(): PostHog | undefined {
  try { return useNuxtApp().$posthog as unknown as PostHog | undefined }
  catch { return undefined }
}

export function useAnalytics() {
  const client: PostHog | undefined = import.meta.client ? resolveClient() : undefined

  function capture(event: string, properties?: AnalyticsProperties) {
    if (!client) return
    try { client.capture(event, properties) }
    catch { /* Analytics must never interrupt a local tool. */ }
  }

  function captureTool(tool: string, properties?: AnalyticsProperties) {
    capture('tool_calculated', { tool, ...properties })
  }

  function log(level: 'info' | 'error', message: string, attributes?: AnalyticsProperties) {
    if (!client?.logger) return
    try { client.logger[level](message, attributes) }
    catch { /* Logging must never interrupt a local tool. */ }
  }

  return { capture, captureTool, log }
}

// Evaluates a PostHog feature flag after hydration so the server-rendered HTML
// and the first client render always agree. Falls back to `true` when PostHog
// is unavailable or the flag is undefined.
export function useFeatureFlag(key: string, fallback = true) {
  const enabled = ref(fallback)
  if (import.meta.client) {
    const client = resolveClient()
    if (client) {
      const apply = () => {
        try {
          const value = client.getFeatureFlag(key)
          if (value !== undefined && value !== null) enabled.value = value === true || value === 'true'
        }
        catch { /* A failed flag read keeps the fallback. */ }
      }
      onMounted(() => {
        apply()
        try { client.onFeatureFlags(apply) }
        catch { /* Ignore flag-listener failures. */ }
      })
    }
  }
  return enabled
}

// Shared telemetry for a tool page: a page view, a debounced "calculated" event
// (so live inputs do not spam PostHog) and explicit actions.
export function useToolTelemetry(tool: string) {
  const { capture } = useAnalytics()
  const startedAt = Date.now()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  onMounted(() => capture('tool_viewed', { tool }))

  function emit(event: string, properties?: AnalyticsProperties, delay = 0) {
    const fire = () => {
      timers.delete(event)
      capture(event, { tool, engagement_ms: Date.now() - startedAt, ...properties })
    }
    if (delay > 0) {
      const existing = timers.get(event)
      if (existing) clearTimeout(existing)
      timers.set(event, setTimeout(fire, delay))
    }
    else fire()
  }

  function calculated(properties?: AnalyticsProperties, delay = 1200) {
    emit(ANALYTICS_EVENTS.toolCalculated, properties, delay)
  }

  function action(name: string, properties?: AnalyticsProperties, delay = 0) {
    emit(name, properties, delay)
  }

  function engagementMs() { return Date.now() - startedAt }

  return { calculated, action, engagementMs }
}
