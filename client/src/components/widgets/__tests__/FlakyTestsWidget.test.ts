import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { nextTick } from 'vue'
import FlakyTestsWidget from '../FlakyTestsWidget.vue'

// Mock the API client module
vi.mock('../../../api/client', () => ({
  apiClient: {
    getFlakyTests: vi.fn()
  }
}))

import { apiClient } from '../../../api/client'
const mockGetFlakyTests = apiClient.getFlakyTests as ReturnType<typeof vi.fn>

// Mock Card component
vi.mock('../../shared/Card.vue', () => ({
  default: {
    name: 'Card',
    template: '<div class="mock-card"><slot name="title"></slot><slot></slot></div>',
    props: ['title']
  }
}))

describe('FlakyTestsWidget', () => {
  let router: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a mock router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/cases', name: 'cases', component: { template: '<div>Cases</div>' } }
      ]
    })
  })

  const mockFlakyTests = [
    {
      test_id: 'test-1',
      test_name: 'testFlaky1',
      class_name: 'com.example.Test1',
      pass_rate: 70,
      flakiness_score: 30,
      recent_runs: 20,
      recent_failures: 6
    },
    {
      test_id: 'test-2',
      test_name: 'testFlaky2',
      class_name: 'com.example.Test2',
      pass_rate: 85,
      flakiness_score: 15,
      recent_runs: 20,
      recent_failures: 3
    }
  ]

  it('renders card with title', () => {
    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })
    expect(wrapper.find('.mock-card').exists()).toBe(true)
  })

  it('displays loading state initially', async () => {
    mockGetFlakyTests.mockImplementation(() => new Promise(() => {}))

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    // Wait for onMounted to run
    await nextTick()

    // Check immediately before promise resolves
    expect(wrapper.find('.loading-state').exists()).toBe(true)
  })

  it('loads flaky tests on mount', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    expect(mockGetFlakyTests).toHaveBeenCalledWith(5)
  })

  it('displays flaky tests after loading', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('testFlaky1')
    expect(wrapper.text()).toContain('testFlaky2')
    expect(wrapper.text()).toContain('com.example.Test1')
  })

  it('displays flakiness scores', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('30%')
    expect(wrapper.text()).toContain('15%')
  })

  it('applies correct score classes', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    const scores = wrapper.findAll('.flaky-score')
    // Flakiness score 30 is medium (< 50), score 15 is low
    expect(scores[0].classes()).toContain('score-medium')
    expect(scores[1].classes()).toContain('score-low')
  })

  it('displays empty state when no flaky tests', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: []
    })

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('No flaky tests detected')
  })

  it('displays error state on API failure', async () => {
    mockGetFlakyTests.mockRejectedValue(new Error('API Error'))

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    expect(wrapper.find('.error-state').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load flaky tests')
  })

  it('respects limit prop', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 10
      }
    })

    await flushPromises()

    expect(mockGetFlakyTests).toHaveBeenCalledWith(10)
  })

  it('uses default limit of 5 when not specified', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      }
    })

    await flushPromises()

    expect(mockGetFlakyTests).toHaveBeenCalledWith(5)
  })

  it('navigates to test cases on "View All" click', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()
    await router.isReady()

    const viewAllButton = wrapper.find('.view-all-button')
    await viewAllButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/cases')
  })

  it('test items are clickable', async () => {
    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: mockFlakyTests
    })

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    const items = wrapper.findAll('.flaky-test-item')
    expect(items.length).toBeGreaterThan(0)
  })

  it('formats test names correctly', async () => {
    const longNameTest = {
      test_id: 'test-3',
      test_name: 'testVeryLongMethodNameThatShouldBeTruncated',
      class_name: 'com.example.VeryLongClassNameTest',
      pass_rate: 60,
      flakiness_score: 40,
      recent_runs: 10,
      recent_failures: 4
    }

    mockGetFlakyTests.mockResolvedValue({
      flaky_tests: [longNameTest]
    })

    const wrapper = mount(FlakyTestsWidget, {
      global: {
        plugins: [router]
      },
      props: {
        limit: 5
      }
    })

    await flushPromises()

    // Should display the full name (truncation would be in CSS)
    expect(wrapper.text()).toContain('testVeryLongMethodNameThatShouldBeTruncated')
  })
})
