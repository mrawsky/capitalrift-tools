import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'app/data/tool-metadata.json'), 'utf8'))
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'app/data/factory-catalog.json'), 'utf8'))
const tokens = { REPOSITORY: metadata.repository, RECIPE_COUNT: String(Object.keys(catalog.recipes).length) }
for (const name of ['llms', 'llms-full']) {
  const template = fs.readFileSync(path.join(root, `docs/${name}.template.md`), 'utf8')
  const rendered = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, token) => { if (!(token in tokens)) throw new Error(`Unknown reference token: ${token}`); return tokens[token] })
  fs.writeFileSync(path.join(root, `public/${name}.txt`), rendered)
}
console.log(`Generated discovery references for ${tokens.RECIPE_COUNT} crafting recipes and the changelog.`)
