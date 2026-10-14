import tailwindcss from '@tailwindcss/vite'
import catalog from './app/data/factory-catalog.json'
import metadata from './app/data/tool-metadata.json'

const recipeRoutes = [...new Set(Object.values(catalog.recipes).map(recipe => `/factory/recipes/${recipe.product.replaceAll('_', '-')}`))]
const publicRoutes = ['/', '/recipe', '/recipe/methodology', '/recipe/menu', '/factory', '/factory/recipes', '/factory/planner', '/factory/blueprints', '/factory/shopping', '/factory/statistics', '/factory/production', '/factory/machines', '/tools/electricity', '/tools/cooling', '/tools/power-station', '/tools/business', '/tools/logistics', '/tools/resources', '/tools/troubleshoot', '/tools/market', '/changelog']

const productionSiteUrl = (
  process.env.NUXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : metadata.siteUrl)
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
      posthog: {
        projectToken: process.env.NUXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
        host: process.env.NUXT_PUBLIC_POSTHOG_HOST,
        defaults: '2026-01-30',
      },
    },
  },
  site: {
    url: productionSiteUrl,
    name: 'Capital Rift Tools',
  },
  sitemap: {
    enabled: true,
    discoverImages: false,
    zeroRuntime: false,
    urls: [...publicRoutes, ...recipeRoutes],
    exclude: ['/methodology'],
  },
  nitro: {
    prerender: {
      routes: [...publicRoutes, ...recipeRoutes, '/robots.txt', '/sitemap.xml'],
      failOnError: true,
    },
  },
  routeRules: {
    '/methodology': { redirect: { to: '/recipe/methodology', statusCode: 301 } },
    '/tools/hauling': { redirect: { to: '/tools/logistics', statusCode: 301 } },
    '/tools/storage': { redirect: { to: '/tools/logistics', statusCode: 301 } },
    '/tools/mining': { redirect: { to: '/tools/resources', statusCode: 301 } },
    '/tools/rental': { redirect: { to: '/tools/business', statusCode: 301 } },
    '/factory/recipes/**': { prerender: true },
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
