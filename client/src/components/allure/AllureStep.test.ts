import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AllureStep from './AllureStep.vue'

describe('AllureStep', () => {
  it('renders an explicit unknown fixture status without treating it as an error', () => {
    const wrapper = mount(AllureStep, {
      props: { step: { name: 'fixture::<lambda>', status: 'unknown', time: 0 } },
    })

    expect(wrapper.get('.step-status').text()).toBe('unknown')
    expect(wrapper.get('.step-status').classes()).toContain('unknown')
    expect(wrapper.get('.step-status').classes()).not.toContain('error')
  })

  it('recognizes legacy missing-status fixture entries while preserving real errors', async () => {
    const wrapper = mount(AllureStep, {
      props: {
        step: {
          name: 'console_ready::<lambda>',
          status: 'error',
          start: '2026-09-24T03:17:32.878Z',
          time: 0,
          status_details: {},
        },
      },
    })

    expect(wrapper.get('.step-status').text()).toBe('unknown')

    await wrapper.setProps({
      step: {
        name: 'real teardown failure',
        status: 'error',
        start: '2026-09-24T03:17:32.878Z',
        time: 0,
        status_details: { message: 'teardown failed' },
      },
    })
    expect(wrapper.get('.step-status').text()).toBe('error')
  })
})
