import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationControls from './PaginationControls.vue'

describe('PaginationControls', () => {
  it('shows the current range and supports page navigation', async () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 2, limit: 50, total: 123, pages: 3 },
    })

    expect(wrapper.text()).toContain('Showing 51–100 of 123')
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('page-change')?.[0]).toEqual([3])
  })

  it('emits a new page size', async () => {
    const wrapper = mount(PaginationControls, {
      props: { page: 1, limit: 50, total: 123, pages: 3 },
    })
    const pageSizeSelect = wrapper.findAll('select')[0]

    await pageSizeSelect.setValue('100')
    expect(wrapper.emitted('limit-change')?.[0]).toEqual([100])
  })
})
