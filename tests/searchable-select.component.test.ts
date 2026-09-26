// @vitest-environment happy-dom

import { mount, type VueWrapper } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import SearchableSelect from '../app/components/SearchableSelect.vue'

const options = [
  { value: 'alpha', label: 'Alpha Part' },
  { value: 'beta', label: 'Beta Assembly' },
  { value: 'gamma', label: 'Gamma Tool', disabled: true },
]

function mountSelect(overrides: Record<string, unknown> = {}) {
  let wrapper: VueWrapper
  wrapper = mount(SearchableSelect, {
    props: {
      id: 'test-select',
      modelValue: 'alpha',
      options,
      'onUpdate:modelValue': (value: string | null) => wrapper.setProps({ modelValue: value }),
      ...overrides,
    },
  })
  return wrapper
}

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

describe('SearchableSelect', () => {
  it('opens with accessible combobox and listbox state', async () => {
    const wrapper = mountSelect()
    const input = wrapper.get('input')

    await input.trigger('focus')

    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-autocomplete')).toBe('list')
    expect(input.attributes('aria-expanded')).toBe('true')
    expect(input.attributes('aria-controls')).toBe('test-select-listbox')
    expect(wrapper.get('[role="listbox"]').isVisible()).toBe(true)
    expect(wrapper.findAll('[role="option"]')).toHaveLength(3)
  })

  it('filters suggestions and commits a pointer selection', async () => {
    const wrapper = mountSelect()
    const input = wrapper.get('input')
    await input.trigger('focus')
    await input.setValue('beta')

    expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
    expect(wrapper.get('[role="option"]').text()).toBe('Beta Assembly')
    await wrapper.get('[role="option"]').trigger('pointerdown')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['beta'])
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['beta'])
    expect(input.attributes('aria-expanded')).toBe('false')
    expect((input.element as HTMLInputElement).value).toBe('Beta Assembly')
  })

  it('supports arrow navigation and Enter while skipping disabled options', async () => {
    const wrapper = mountSelect()
    const input = wrapper.get('input')
    await input.trigger('focus')
    await input.trigger('keydown', { key: 'ArrowDown' })

    expect(input.attributes('aria-activedescendant')).toBe('test-select-option-1')
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toBe('test-select-option-0')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['beta'])
  })

  it('restores the selected label after Escape or blur without committing typed text', async () => {
    const wrapper = mountSelect()
    const input = wrapper.get('input')
    await input.trigger('focus')
    await input.setValue('unknown')
    await input.trigger('keydown', { key: 'Escape' })

    expect((input.element as HTMLInputElement).value).toBe('Alpha Part')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await input.trigger('focus')
    await input.setValue('beta')
    await input.trigger('blur')
    expect((input.element as HTMLInputElement).value).toBe('Alpha Part')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('does not open when disabled', async () => {
    const wrapper = mountSelect({ disabled: true })
    const input = wrapper.get('input')
    await input.trigger('focus')

    expect(input.attributes('disabled')).toBeDefined()
    expect(input.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })
})
