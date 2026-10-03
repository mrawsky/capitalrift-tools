export default defineEventHandler((event) => {
  const origin = String(useRuntimeConfig(event).public.siteUrl || '').replace(/\/$/, '')
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ''}`
})
