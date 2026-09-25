import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PieChart from '../PieChart.vue'
import LineChart from '../LineChart.vue'

const chart = vi.hoisted(() => ({ setOption: vi.fn(), dispose: vi.fn(), resize: vi.fn() }))

vi.mock('echarts', () => ({ init: vi.fn(() => chart) }))
vi.mock('../../../utils/statusColors', () => ({
  resolvedStatusColor: (status: string) => `color-for-${status.toLowerCase()}`,
}))

describe('status charts', () => {
  beforeEach(() => chart.setOption.mockClear())
  afterEach(() => chart.dispose.mockClear())

  it('colors pie slices by status name, even when absent statuses change their order', () => {
    const wrapper = mount(PieChart, {
      props: {
        data: [
          { name: 'Failed', value: 3 },
          { name: 'Passed', value: 10 },
          { name: 'Errors', value: 1 },
          { name: 'Skipped', value: 2 },
          { name: 'Unknown', value: 1 },
        ],
      },
    })
    const option = chart.setOption.mock.calls.at(-1)?.[0]
    expect(
      option.series[0].data.map((slice: { itemStyle: { color: string } }) => slice.itemStyle.color)
    ).toEqual([
      'color-for-failed',
      'color-for-passed',
      'color-for-errors',
      'color-for-skipped',
      'color-for-unknown',
    ])
    expect(option.legend.orient).toBe('horizontal')
    expect(option.legend.bottom).toBe(0)
    expect(option.series[0].center[1]).toBe('40%')
    expect(option.series[0].label.show).toBe(false)
    expect(option.series[0].labelLine.show).toBe(false)
    wrapper.unmount()
  })

  it('colors line series by status name rather than default palette order', () => {
    const wrapper = mount(LineChart, {
      props: {
        xAxisData: ['run 1'],
        series: [
          { name: 'Failed', data: [1] },
          { name: 'Passed', data: [4] },
          { name: 'Errors', data: [2] },
          { name: 'Skipped', data: [3] },
          { name: 'Unknown', data: [1] },
        ],
      },
    })
    const option = chart.setOption.mock.calls.at(-1)?.[0]
    expect(
      option.series.map((series: { itemStyle: { color: string } }) => series.itemStyle.color)
    ).toEqual([
      'color-for-failed',
      'color-for-passed',
      'color-for-errors',
      'color-for-skipped',
      'color-for-unknown',
    ])
    wrapper.unmount()
  })
})
