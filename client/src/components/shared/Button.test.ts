import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from './Button.vue'

describe('Button Component', () => {
  it('should render with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    })

    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.classes()).toContain('btn')
    expect(wrapper.classes()).toContain('btn-primary')
  })

  it('should render with secondary variant', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'secondary',
      },
      slots: {
        default: 'Secondary',
      },
    })

    expect(wrapper.classes()).toContain('btn-secondary')
  })

  it('should render with danger variant', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'danger',
      },
      slots: {
        default: 'Delete',
      },
    })

    expect(wrapper.classes()).toContain('btn-danger')
  })

  it('should render with success variant', () => {
    const wrapper = mount(Button, {
      props: {
        variant: 'success',
      },
      slots: {
        default: 'Save',
      },
    })

    expect(wrapper.classes()).toContain('btn-success')
  })

  it('should render small size', () => {
    const wrapper = mount(Button, {
      props: {
        size: 'sm',
      },
      slots: {
        default: 'Small',
      },
    })

    expect(wrapper.classes()).toContain('btn-sm')
  })

  it('should render large size', () => {
    const wrapper = mount(Button, {
      props: {
        size: 'lg',
      },
      slots: {
        default: 'Large',
      },
    })

    expect(wrapper.classes()).toContain('btn-lg')
  })

  it('should be disabled when disabled prop is true', () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled',
      },
    })

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('btn-disabled')
  })

  it('should emit click event when clicked', async () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('should not emit click when disabled', async () => {
    const wrapper = mount(Button, {
      props: {
        disabled: true,
      },
      slots: {
        default: 'Disabled',
      },
    })

    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  it('should render loading state', () => {
    const wrapper = mount(Button, {
      props: {
        loading: true,
      },
      slots: {
        default: 'Loading',
      },
    })

    expect(wrapper.classes()).toContain('btn-loading')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.spinner').exists()).toBe(true)
  })

  it('should render full width', () => {
    const wrapper = mount(Button, {
      props: {
        fullWidth: true,
      },
      slots: {
        default: 'Full Width',
      },
    })

    expect(wrapper.classes()).toContain('btn-full-width')
  })
})
