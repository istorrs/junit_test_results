import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AsyncEntitySelect from './AsyncEntitySelect.vue'

describe('AsyncEntitySelect', () => {
  afterEach(() => vi.useRealTimers())

  it('loads pages, searches, and retains the selected option', async () => {
    vi.useFakeTimers()
    const loadOptions = vi.fn(async (search: string, page: number) => ({
      options: [{ value: `${search || 'run'}-${page}`, label: `Run ${page}` }],
      total: 50,
      pages: 2,
    }))
    const wrapper = mount(AsyncEntitySelect, {
      props: {
        modelValue: '',
        inputId: 'run-picker',
        placeholder: 'Select a run',
        searchLabel: 'Search runs',
        loadOptions,
      },
    })
    await flushPromises()

    expect(loadOptions).toHaveBeenCalledWith('', 1, 25)
    await wrapper.get('select').setValue('run-1')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['run-1'])
    await wrapper.setProps({ modelValue: 'run-1' })

    await wrapper.get('button:nth-of-type(2)').trigger('click')
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledWith('', 2, 25)
    expect(wrapper.get('select').element.value).toBe('run-1')

    await wrapper.get('input[type="search"]').setValue('gateway')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(loadOptions).toHaveBeenCalledWith('gateway', 1, 25)
  })

  it('shows a retry action when loading fails', async () => {
    const loadOptions = vi.fn().mockRejectedValueOnce(new Error('Service unavailable'))
    const wrapper = mount(AsyncEntitySelect, {
      props: {
        modelValue: '',
        inputId: 'release-picker',
        placeholder: 'Select a release',
        searchLabel: 'Search releases',
        loadOptions,
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Service unavailable')
    expect(wrapper.get('.page-actions button:last-child').text()).toBe('Try again')
  })
})
