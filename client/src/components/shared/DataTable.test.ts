import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable from './DataTable.vue'

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status' },
]
const data = [
  { name: 'Zulu', status: 'failed' },
  { name: 'Alpha', status: 'passed' },
]

describe('DataTable Component', () => {
  it('exposes sorting as a keyboard-accessible button', async () => {
    const wrapper = mount(DataTable, { props: { columns, data, paginate: false } })
    const sortButton = wrapper.get('button.sort-button')
    const sortHeader = sortButton.element.closest('th')

    expect(sortHeader?.getAttribute('aria-sort')).toBe('none')
    await sortButton.trigger('click')

    expect(sortHeader?.getAttribute('aria-sort')).toBe('ascending')
    expect(wrapper.find('tbody tr td').text()).toBe('Alpha')
  })

  it.each(['Enter', ' '])('opens clickable rows with the %s key', async (key) => {
    const wrapper = mount(DataTable, {
      props: {
        columns,
        data,
        paginate: false,
        rowClickable: true,
        rowAriaLabel: (row) => `Open ${row.name}`,
      },
    })
    const row = wrapper.get('tbody tr')

    expect(row.attributes('tabindex')).toBe('0')
    expect(row.attributes('aria-label')).toBe('Open Zulu')
    await row.trigger('keydown', { key })

    expect(wrapper.emitted('row-click')?.[0]).toEqual([data[0]])
  })
})
