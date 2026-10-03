import type { MaybeRefOrGetter } from 'vue'

export function useToolSeo(title: MaybeRefOrGetter<string>, description: MaybeRefOrGetter<string>, application = false) {
  const route = useRoute()
  const config = useRuntimeConfig()
  const canonical = computed(() => config.public.siteUrl ? `${String(config.public.siteUrl).replace(/\/$/, '')}${route.path.replace(/\/$/, '') || '/'}` : undefined)
  useSeoMeta({ title: () => toValue(title), description: () => toValue(description), ogTitle: () => toValue(title), ogDescription: () => toValue(description), ogType: 'website', ogUrl: () => canonical.value, twitterCard: 'summary', twitterTitle: () => toValue(title), twitterDescription: () => toValue(description) })
  useHead(() => ({
    link: canonical.value ? [{ rel: 'canonical', href: canonical.value }] : [],
    script: application ? [{ key: 'tool-application', type: 'application/ld+json', textContent: JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: toValue(title), description: toValue(description), url: canonical.value, applicationCategory: 'GameApplication', operatingSystem: 'Any modern browser', isAccessibleForFree: true }) }] : [],
  }))
}
