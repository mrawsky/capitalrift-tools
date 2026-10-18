// @vitest-environment happy-dom

import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import MenuCodeExport from '../app/components/MenuCodeExport.vue'
import { decodeMenuCode } from '../app/utils/domain/menuCode'

const parts = [{ ingredientId: 'FRANKS', share: 60 }, { ingredientId: 'BUNS', share: 40 }]

describe('MenuCodeExport', () => {
  it('generates a single-dish CRRCP1 code for one recipe', async () => {
    const wrapper = mount(MenuCodeExport, {
      props: { dishes: [{ parts, name: 'Test Dog' }], kind: 'recipe' },
    })

    await wrapper.get('button').trigger('click')
    const code = (wrapper.get('textarea').element as HTMLTextAreaElement).value
    expect(code.startsWith('CRRCP1.')).toBe(true)

    const decoded = decodeMenuCode(code)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.kind).toBe('recipe')
    expect(decoded.value.dishes[0]).toMatchObject({ name: 'Test Dog', vessel: 'prep', price: 1, servings: 1 })
  })

  it('generates a CRMENU1 code for the whole menu', async () => {
    const wrapper = mount(MenuCodeExport, {
      props: {
        dishes: [
          { parts, name: 'One' },
          { parts: [{ ingredientId: 'BEEF', share: 50 }, { ingredientId: 'PORK', share: 50 }], name: 'Two' },
        ],
        kind: 'menu',
      },
    })

    await wrapper.get('button').trigger('click')
    const code = (wrapper.get('textarea').element as HTMLTextAreaElement).value
    expect(code.startsWith('CRMENU1.')).toBe(true)

    const decoded = decodeMenuCode(code)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.kind).toBe('menu')
    expect(decoded.value.dishes.map(dish => dish.name)).toEqual(['One', 'Two'])
  })

  it('keeps a one-dish whole menu as CRMENU1', async () => {
    const wrapper = mount(MenuCodeExport, {
      props: { dishes: [{ parts }], kind: 'menu' },
    })

    await wrapper.get('button').trigger('click')
    const code = (wrapper.get('textarea').element as HTMLTextAreaElement).value
    expect(code.startsWith('CRMENU1.')).toBe(true)
    const decoded = decodeMenuCode(code)
    expect(decoded.ok).toBe(true)
    if (decoded.ok) expect(decoded.value.kind).toBe('menu')
  })

  it('shows validation errors instead of a code for a bad mix', async () => {
    const wrapper = mount(MenuCodeExport, {
      props: { dishes: [{ parts: [{ ingredientId: 'FRANKS', share: 60 }] }], kind: 'recipe' },
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.get('.error-list').text()).toContain('between 2 and 8 ingredients')
  })

  it('updates the code when the form values change', async () => {
    const wrapper = mount(MenuCodeExport, {
      props: { dishes: [{ parts, name: 'Test Dog' }], kind: 'recipe' },
    })

    await wrapper.get('button').trigger('click')
    await wrapper.get('input[maxlength="40"]').setValue('Renamed Dog')
    await wrapper.get('select').setValue('grill')
    const numbers = wrapper.findAll('input[type="number"]')
    await numbers[0]!.setValue('12')
    await numbers[1]!.setValue('3')

    const decoded = decodeMenuCode((wrapper.get('textarea').element as HTMLTextAreaElement).value)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.dishes[0]).toMatchObject({ name: 'Renamed Dog', vessel: 'grill', price: 12, servings: 3 })
  })

  it('copies the generated code to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    const wrapper = mount(MenuCodeExport, {
      props: { dishes: [{ parts, name: 'Test Dog' }], kind: 'recipe' },
    })
    await wrapper.get('button').trigger('click')
    const code = (wrapper.get('textarea').element as HTMLTextAreaElement).value

    const copyButton = wrapper.findAll('button').find(button => button.text().includes('Copy CRRCP1 code'))
    expect(copyButton).toBeDefined()
    await copyButton!.trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(code)
    expect(wrapper.text()).toContain('CRRCP1 code copied')
  })
})
