import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import FailurePatternsSummary from '../FailurePatternsSummary.vue'

// Mock the API client module
vi.mock('../../../api/client', () => ({
  apiClient: {
    getFailurePatterns: vi.fn()
  }
}))

import { apiClient } from '../../../api/client'
const mockGetFailurePatterns = apiClient.getFailurePatterns as ReturnType<typeof vi.fn>

// Mock Card component
vi.mock('../../shared/Card.vue', () => ({
  default: {
    name: 'Card',
    template: '<div class="mock-card"><slot name="title"></slot><slot></slot></div>',
    props: ['title']
  }
}))

describe('FailurePatternsSummary', () => {
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()

    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/cases', name: 'cases', component: { template: '<div>Cases</div>' } }
      ]
    })
  })

  const mockPatterns = [
    {
      error_type: 'AssertionError',
      error_message: 'Expected 5 but was 3',
      count: 15,
      affected_tests: [
        { test_id: 'test-1', test_name: 'testAddition' },
        { test_id: 'test-2', test_name: 'testSubtraction' }
      ],
      trend: 'increasing' as const,
      first_seen: '2024-01-01T10:00:00Z'
    },
    {
      error_type: 'NullPointerException',
      error_message: 'Cannot invoke method on null object',
      count: 8,
      affected_tests: [
        { test_id: 'test-3', test_name: 'testNullHandling' }
      ],
      trend: 'stable' as const,
      first_seen: '2024-01-02T10:00:00Z'
    }
  ]

  it('renders card component', () => {
    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })
    expect(wrapper.find('.mock-card').exists()).toBe(true)
  })

  it('displays loading state initially', () => {
    mockGetFailurePatterns.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    expect(wrapper.find('.loading-state').exists()).toBe(true)
  })

  it('loads failure patterns on mount', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    expect(mockGetFailurePatterns).toHaveBeenCalledWith({ days: 7, limit: 5 })
  })

  it('displays patterns after loading', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('AssertionError')
    expect(wrapper.text()).toContain('NullPointerException')
    expect(wrapper.text()).toContain('Expected 5 but was 3')
  })

  it('displays pattern counts', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('15 tests')
    expect(wrapper.text()).toContain('8 tests')
  })

  it('shows trend indicators', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    const trendIndicators = wrapper.findAll('.trend-indicator')
    expect(trendIndicators[0].classes()).toContain('trend-increasing')
    expect(trendIndicators[1].classes()).toContain('trend-stable')
  })

  it('displays affected tests', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('testAddition')
    expect(wrapper.text()).toContain('testSubtraction')
    expect(wrapper.text()).toContain('testNullHandling')
  })

  it('truncates long error messages', async () => {
    const longMessagePattern = {
      error_type: 'TestError',
      error_message: 'A'.repeat(200),
      count: 5,
      affected_tests: [],
      trend: 'stable' as const,
      first_seen: '2024-01-01T10:00:00Z'
    }

    mockGetFailurePatterns.mockResolvedValue({
      patterns: [longMessagePattern]
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    const errorMessage = wrapper.find('.error-message').text()
    expect(errorMessage.length).toBeLessThan(200)
    expect(errorMessage).toContain('...')
  })

  it('displays empty state when no patterns', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: []
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('No failure patterns detected')
  })

  it('displays error state on API failure', async () => {
    mockGetFailurePatterns.mockRejectedValue(new Error('API Error'))

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.find('.error-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load failure patterns')
  })

  it('uses default values for days and limit', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    expect(mockGetFailurePatterns).toHaveBeenCalledWith({ days: 7, limit: 10 })
  })

  it('shows time range when showTimeRange is true', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5,
        showTimeRange: true
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Last 7 days')
  })

  it('does not show time range when showTimeRange is false', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5,
        showTimeRange: false
      }
    })

    await flushPromises()

    expect(wrapper.text()).not.toContain('Last 7 days')
  })

  it('navigates to test cases when clicking on a test', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    const testLinks = wrapper.findAll('.test-link')
    await testLinks[0].trigger('click')

    expect(router.currentRoute.value.path).toBe('/cases')
    expect(router.currentRoute.value.query.search).toBe('testAddition')
  })

  it('handles patterns with Unknown Error type', async () => {
    const unknownPattern = {
      error_type: null,
      error_message: 'Something went wrong',
      count: 3,
      affected_tests: [],
      trend: 'stable' as const,
      first_seen: '2024-01-01T10:00:00Z'
    }

    mockGetFailurePatterns.mockResolvedValue({
      patterns: [unknownPattern]
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Unknown Error')
  })

  it('displays affected tests section', async () => {
    mockGetFailurePatterns.mockResolvedValue({
      patterns: mockPatterns
    })

    const wrapper = mount(FailurePatternsSummary, {
      global: {
        plugins: [router]
      },
      props: {
        days: 7,
        limit: 5
      }
    })

    await flushPromises()

    const affectedTestsSection = wrapper.find('.affected-tests')
    expect(affectedTestsSection.exists()).toBe(true)
  })
})
