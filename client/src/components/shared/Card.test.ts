import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Card from './Card.vue'

describe('Card Component', () => {
  it('should render with default slot content', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>Card content</p>',
      },
    })

    expect(wrapper.html()).toContain('Card content')
    expect(wrapper.classes()).toContain('card')
  })

  it('should render with title', () => {
    const wrapper = mount(Card, {
      props: {
        title: 'Card Title',
      },
      slots: {
        default: '<p>Card content</p>',
      },
    })

    expect(wrapper.find('.card-title').text()).toBe('Card Title')
  })

  it('should render with title slot', () => {
    const wrapper = mount(Card, {
      slots: {
        title: '<h2>Custom Title</h2>',
        default: '<p>Card content</p>',
      },
    })

    expect(wrapper.find('.card-header').html()).toContain('Custom Title')
  })

  it('should render with footer slot', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>Card content</p>',
        footer: '<button>Action</button>',
      },
    })

    expect(wrapper.find('.card-footer').exists()).toBe(true)
    expect(wrapper.find('.card-footer').html()).toContain('Action')
  })

  it('should render with padding by default', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>Content</p>',
      },
    })

    expect(wrapper.classes()).toContain('card-padded')
  })

  it('should render without padding when noPadding is true', () => {
    const wrapper = mount(Card, {
      props: {
        noPadding: true,
      },
      slots: {
        default: '<p>Content</p>',
      },
    })

    expect(wrapper.classes()).not.toContain('card-padded')
  })

  it('should render with shadow by default', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>Content</p>',
      },
    })

    expect(wrapper.classes()).toContain('card-shadow')
  })

  it('should render without shadow when noShadow is true', () => {
    const wrapper = mount(Card, {
      props: {
        noShadow: true,
      },
      slots: {
        default: '<p>Content</p>',
      },
    })

    expect(wrapper.classes()).not.toContain('card-shadow')
  })

  it('should render as clickable when onClick prop is provided', async () => {
    const wrapper = mount(Card, {
      props: {
        clickable: true,
      },
      slots: {
        default: '<p>Clickable card</p>',
      },
    })

    expect(wrapper.classes()).toContain('card-clickable')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('should not be clickable by default', () => {
    const wrapper = mount(Card, {
      slots: {
        default: '<p>Normal card</p>',
      },
    })

    expect(wrapper.classes()).not.toContain('card-clickable')
  })
})
