import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlakinessIndicator from '../FlakinessIndicator.vue'

describe('FlakinessIndicator', () => {
  it('renders nothing when pass rate is 100%', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 100,
        recentRuns: 10,
        failureCount: 0,
      },
    })
    expect(wrapper.find('.flakiness-indicator').exists()).toBe(false)
  })

  it('renders nothing when pass rate is 0%', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 0,
        recentRuns: 20,
        failureCount: 20,
      },
    })
    expect(wrapper.find('.flakiness-indicator').exists()).toBe(false)
  })

  it('renders low severity indicator for flakiness < 10%', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 95, // 5% flakiness
        recentRuns: 20,
        failureCount: 1,
      },
    })
    expect(wrapper.find('.flakiness-indicator').exists()).toBe(true)
    expect(wrapper.find('.severity-low').exists()).toBe(true)
    expect(wrapper.find('.label').text()).toContain('95%')
  })

  it('renders medium severity indicator for flakiness 10-30%', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 80, // 20% flakiness
        recentRuns: 20,
        failureCount: 4,
      },
    })
    expect(wrapper.find('.flakiness-indicator').exists()).toBe(true)
    expect(wrapper.find('.severity-medium').exists()).toBe(true)
    expect(wrapper.find('.label').text()).toContain('80%')
  })

  it('renders high severity indicator for flakiness >= 30%', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 50, // 50% flakiness
        recentRuns: 20,
        failureCount: 10,
      },
    })
    expect(wrapper.find('.flakiness-indicator').exists()).toBe(true)
    expect(wrapper.find('.severity-high').exists()).toBe(true)
    expect(wrapper.find('.label').text()).toContain('50%')
  })

  it('includes tooltip text with run information', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 60,
        recentRuns: 50,
        failureCount: 20,
      },
    })
    const indicator = wrapper.find('.flakiness-indicator')
    expect(indicator.attributes('title')).toContain('20/50')
    expect(indicator.attributes('title')).toContain('60%')
  })

  it('supports different sizes', () => {
    const wrapperSm = mount(FlakinessIndicator, {
      props: {
        passRate: 80,
        recentRuns: 10,
        failureCount: 2,
        size: 'sm',
      },
    })
    expect(wrapperSm.find('.size-sm').exists()).toBe(true)

    const wrapperMd = mount(FlakinessIndicator, {
      props: {
        passRate: 80,
        recentRuns: 10,
        failureCount: 2,
        size: 'md',
      },
    })
    expect(wrapperMd.find('.size-md').exists()).toBe(true)
  })

  it('hides label when showLabel is false', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 70,
        recentRuns: 20,
        failureCount: 6,
        showLabel: false,
      },
    })
    expect(wrapper.find('.label').text()).toBe('')
  })

  it('rounds pass rate correctly', () => {
    const wrapper = mount(FlakinessIndicator, {
      props: {
        passRate: 66.7,
        recentRuns: 30,
        failureCount: 10,
      },
    })
    expect(wrapper.find('.label').text()).toContain('67%')
  })
})
