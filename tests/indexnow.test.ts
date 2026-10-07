import { describe, expect, it, vi } from 'vitest'
import { createPayload, parseArguments, submitPayload } from '../scripts/indexnow.mjs'

const key = '0123456789abcdef0123456789abcdef'
const siteUrl = 'https://capitalrift.mrawsky.pro'
const sitemap = `<urlset><url><loc>${siteUrl}/</loc></url><url><loc>${siteUrl}/factory/recipes/space-heater</loc></url></urlset>`
const payload = () => createPayload({ sitemap, siteUrl, key, all: true })

describe('explicit IndexNow workflow', () => {
  it('defaults to a dry run and requires an explicit URL selection', () => {
    expect(parseArguments(['--all'])).toMatchObject({ all: true, submit: false })
    expect(parseArguments(['--url', '/factory/recipes/space-heater', '--submit'])).toMatchObject({ all: false, submit: true, urls: ['/factory/recipes/space-heater'] })
    for (const args of [[], ['--url'], ['--all', '--url', '/'], ['--all', '--submit', '--dry-run'], ['--unknown']]) expect(() => parseArguments(args)).toThrow()
  })

  it('selects and deduplicates canonical URLs against the production sitemap', () => {
    expect(createPayload({ sitemap, siteUrl, key, urls: ['/', `${siteUrl}/`] }).urlList).toEqual([`${siteUrl}/`])
    for (const url of ['https://example.com/', '/missing', '/?id=personal', '/#recipe', '/methodology']) expect(() => createPayload({ sitemap, siteUrl, key, urls: [url] })).toThrow()
    expect(() => createPayload({ sitemap, siteUrl: 'http://localhost:3000', key, all: true })).toThrow()
    expect(() => createPayload({ sitemap: sitemap.replace(siteUrl, 'https://example.com'), siteUrl, key, all: true })).toThrow()
    expect(() => createPayload({ sitemap, siteUrl, key: 'invalid', all: true })).toThrow()
    expect(() => createPayload({ sitemap: '<sitemapindex/>', siteUrl, key, all: true })).toThrow()
  })

  it.each([200, 202])('verifies the live key before reporting HTTP %i accurately', async status => {
    const mock = vi.fn().mockResolvedValueOnce(new Response(key + '\n')).mockResolvedValueOnce(new Response('', { status }))
    const result = await submitPayload(payload(), mock)
    expect(result).toContain(status === 202 ? 'pending' : 'not guaranteed')
    expect(mock.mock.calls[0][0]).toBe(`${siteUrl}/indexnow-key.txt`)
    expect(mock.mock.calls[1][0]).toBe('https://api.indexnow.org/indexnow')
    expect(JSON.parse(mock.mock.calls[1][1].body)).toEqual(payload())
  })

  it('stops before submitting when the deployed key is missing or mismatched', async () => {
    for (const response of [new Response('wrong'), new Response('', { status: 404 })]) {
      const mock = vi.fn().mockResolvedValue(response)
      await expect(submitPayload(payload(), mock)).rejects.toThrow('Deploy the key')
      expect(mock).toHaveBeenCalledTimes(1)
    }
  })

  it.each([400, 403, 422, 429, 500])('reports HTTP %i without automatic resubmission', async status => {
    const mock = vi.fn().mockResolvedValueOnce(new Response(key)).mockResolvedValueOnce(new Response('', { status }))
    await expect(submitPayload(payload(), mock)).rejects.toThrow(`IndexNow ${status}`)
    expect(mock).toHaveBeenCalledTimes(2)
  })
})
