import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import posthog from 'posthog-js'
import type { PostHog, PostHogInterface } from 'posthog-js'

export default defineNuxtPlugin<{ posthog: PostHog | undefined }>((nuxtApp) => {
  const runtimeConfig = useRuntimeConfig()
  const { projectToken, host, defaults } = runtimeConfig.public.posthog

  if (!projectToken || !host) {
    if (import.meta.dev) {
      const missingVariable = !projectToken
        ? 'NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN'
        : 'NUXT_PUBLIC_POSTHOG_HOST'

      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      )
    }

    return {
      provide: {
        posthog: undefined,
      },
    }
  }

  const posthogClient = posthog.init(projectToken, {
    api_host: host,
    defaults: defaults as any,
    logs: {
      serviceName: 'capitalrift-recipe-web',
      environment: import.meta.dev ? 'development' : 'production',
    },
    loaded: (client: PostHogInterface) => {
      if (import.meta.dev) client.debug()
    },
  })

  nuxtApp.hook('vue:error', (error) => {
    posthogClient.captureException(error)
  })

  return {
    provide: {
      posthog: posthogClient as PostHog,
    },
  }
})
