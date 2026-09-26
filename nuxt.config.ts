import tailwindcss from '@tailwindcss/vite'

const productionSiteUrl = (
  process.env.NUXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '')

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/sitemap',
    '@vercel/analytics',
    '@vercel/speed-insights',
  ],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: false },
  compatibilityDate: '2026-09-22',
  vite: {
    plugins: [tailwindcss()],
  },
  runtimeConfig: {
    public: {
      siteUrl: productionSiteUrl,
    },
  },
  site: {
    url: productionSiteUrl || undefined,
    name: 'Capital Rift Tools',
  },
  sitemap: {
    enabled: Boolean(productionSiteUrl),
    discoverImages: false,
    zeroRuntime: true,
  },
  nitro: {
    prerender: {
      routes: productionSiteUrl ? ['/sitemap.xml'] : [],
    },
  },
  routeRules: {
    '/methodology': { redirect: { to: '/recipe/methodology', statusCode: 301 } },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'theme-color', content: '#10100e' },
        { name: 'color-scheme', content: 'dark' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'sitemap', href: '/sitemap.xml', type: 'application/xml' },
        { rel: 'alternate', href: '/llms.txt', type: 'text/plain', title: 'LLMs.txt' },
      ],
    },
  },
})
