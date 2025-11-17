import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryChart from '../HistoryChart.vue'

// Mock ECharts with all required exports
vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
  graphic: {
    LinearGradient: class {
      constructor() {}
    },
  },
}))

describe('HistoryChart', () => {
  const mockData = [
    {
      run_id: '1',
      status: 'passed' as const,
      duration: 1.5,
      timestamp: '2024-01-01T10:00:00Z',
    },
    {
      run_id: '2',
      status: 'failed' as const,
      duration: 2.0,
      timestamp: '2024-01-02T10:00:00Z',
    },
    {
      run_id: '3',
      status: 'passed' as const,
      duration: 1.8,
      timestamp: '2024-01-03T10:00:00Z',
    },
    {
      run_id: '4',
      status: 'error' as const,
      duration: 0.5,
      timestamp: '2024-01-04T10:00:00Z',
    },
    {
      run_id: '5',
      status: 'skipped' as const,
      duration: 0,
      timestamp: '2024-01-05T10:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays empty state when no data', () => {
    const wrapper = mount(HistoryChart, {
      props: {
        data: [],
      },
    })
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('No history data available')
  })

  it('mounts without errors with data', () => {
    const wrapper = mount(HistoryChart, {
      props: {
        data: mockData,
      },
    })
    // Component should mount successfully
    expect(wrapper.exists()).toBe(true)
  })

  it('accepts height prop', () => {
    const wrapper = mount(HistoryChart, {
      props: {
        data: mockData,
        height: '500px',
      },
    })
    // Component should mount successfully with custom height
    expect(wrapper.exists()).toBe(true)
  })

  it('handles single data point without errors', () => {
    const singlePoint = [
      {
        run_id: '1',
        status: 'passed' as const,
        duration: 1.5,
        timestamp: '2024-01-01T10:00:00Z',
      },
    ]

    const wrapper = mount(HistoryChart, {
      props: {
        data: singlePoint,
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.empty-state').exists()).toBe(false)
  })
})
