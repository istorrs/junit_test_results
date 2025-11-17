import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TestDetailsModal from '../TestDetailsModal.vue'
import { apiClient } from '../../../api/client'

// Mock the API client
vi.mock('../../../api/client', () => ({
  apiClient: {
    getTestHistory: vi.fn(),
    getTestFlakiness: vi.fn(),
  },
}))

// Mock Modal component
vi.mock('../../shared/Modal.vue', () => ({
  default: {
    name: 'Modal',
    template: '<div v-if="open" class="mock-modal"><slot name="header"></slot><slot></slot></div>',
    props: ['open', 'size'],
    emits: ['close'],
  },
}))

// Mock sub-components
vi.mock('../../shared/FlakinessIndicator.vue', () => ({
  default: {
    name: 'FlakinessIndicator',
    template: '<div class="mock-flakiness-indicator"></div>',
    props: ['passRate', 'totalRuns'],
  },
}))

vi.mock('../../shared/ErrorStackTrace.vue', () => ({
  default: {
    name: 'ErrorStackTrace',
    template: '<div class="mock-stack-trace"></div>',
    props: ['stackTrace', 'language'],
  },
}))

vi.mock('../../charts/HistoryChart.vue', () => ({
  default: {
    name: 'HistoryChart',
    template: '<div class="mock-history-chart"></div>',
    props: ['data', 'height'],
  },
}))

describe('TestDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    open: true,
    testId: 'test-123',
    testName: 'testAddition',
    className: 'com.example.CalculatorTest',
    status: 'passed' as const,
    duration: 1.5,
    errorMessage: undefined,
    errorType: undefined,
    stackTrace: undefined,
  }

  it('renders modal when open', () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })
    expect(wrapper.find('.mock-modal').exists()).toBe(true)
  })

  it('does not render when closed', () => {
    const wrapper = mount(TestDetailsModal, {
      props: {
        ...defaultProps,
        open: false,
      },
    })
    // Component uses v-if, so nothing is rendered
    expect(wrapper.text()).toBe('')
  })

  it('displays test name and class name in header', () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })
    expect(wrapper.text()).toContain('testAddition')
    expect(wrapper.text()).toContain('com.example.CalculatorTest')
  })

  it('displays status badge with correct class', () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })
    const badge = wrapper.find('.badge')
    expect(badge.exists()).toBe(true)
    expect(badge.classes()).toContain('status-passed')
    expect(badge.text()).toBe('passed')
  })

  it('renders all four tabs', () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })
    const tabs = wrapper.findAll('.tab-button')
    expect(tabs).toHaveLength(4)
    expect(tabs[0].text()).toBe('Overview')
    expect(tabs[1].text()).toBe('Failure Details')
    expect(tabs[2].text()).toBe('History')
    expect(tabs[3].text()).toBe('Metadata')
  })

  it('renders tab navigation', () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })

    const tabs = wrapper.findAll('.tab-button')
    expect(tabs.length).toBe(4)
  })

  it('displays error details for failed tests', () => {
    const wrapper = mount(TestDetailsModal, {
      props: {
        ...defaultProps,
        status: 'failed',
        errorMessage: 'Expected 5 but was 3',
        errorType: 'AssertionError',
        stackTrace: 'at com.example.Test.method(Test.java:42)',
      },
    })

    expect(wrapper.text()).toContain('AssertionError')
    expect(wrapper.text()).toContain('Expected 5 but was 3')
  })

  it('displays "No failure details" for passed tests', async () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })

    const tabs = wrapper.findAll('.tab-button')
    await tabs[1].trigger('click') // Click Failure Details tab
    await flushPromises()

    expect(wrapper.text()).toContain('No failure details')
  })

  it('displays duration when provided', () => {
    const wrapper = mount(TestDetailsModal, {
      props: {
        ...defaultProps,
        duration: 2.5,
      },
    })

    // Duration should be displayed
    expect(wrapper.text()).toContain('Duration')
  })

  it('displays N/A for missing duration', () => {
    const wrapper = mount(TestDetailsModal, {
      props: {
        ...defaultProps,
        duration: undefined,
      },
    })

    expect(wrapper.text()).toContain('N/A')
  })

  it('emits close event when close is triggered', () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })

    wrapper.vm.handleClose()

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(apiClient.getTestHistory).mockRejectedValue(new Error('API Error'))
    vi.mocked(apiClient.getTestFlakiness).mockRejectedValue(new Error('API Error'))

    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })

    await flushPromises()

    // Should not crash, should handle error
    expect(wrapper.find('.mock-modal').exists()).toBe(true)
  })

  it('displays test information', () => {
    const wrapper = mount(TestDetailsModal, {
      props: {
        ...defaultProps,
        duration: 1.5,
      },
    })

    expect(wrapper.text()).toContain('testAddition')
    expect(wrapper.text()).toContain('com.example.CalculatorTest')
  })

  it('uses xl modal size', () => {
    const wrapper = mount(TestDetailsModal, {
      props: defaultProps,
    })

    // Check that Modal component receives size="xl"
    const modal = wrapper.findComponent({ name: 'Modal' })
    expect(modal.props('size')).toBe('xl')
  })

  it('handles test with "Unknown suite" when className is missing', () => {
    const wrapper = mount(TestDetailsModal, {
      props: {
        ...defaultProps,
        className: undefined,
      },
    })

    expect(wrapper.text()).toContain('Unknown suite')
  })
})
