import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Modal from './Modal.vue'

describe('Modal Component', () => {
  beforeEach(() => {
    // Create a div for the modal to be teleported to
    const el = document.createElement('div')
    el.id = 'teleport-target'
    document.body.appendChild(el)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should not render when open is false', () => {
    const wrapper = mount(Modal, {
      props: {
        open: false,
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    // Check in document body since Teleport renders there
    expect(document.querySelector('.modal-overlay')).toBeNull()
    wrapper.unmount()
  })

  it('should render when open is true', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    // Wait for next tick to ensure Teleport has rendered
    await wrapper.vm.$nextTick()

    // Check in document body since Teleport renders there
    expect(document.querySelector('.modal-overlay')).toBeTruthy()
    expect(document.body.innerHTML).toContain('Modal content')
    wrapper.unmount()
  })

  it('should render with title', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
        title: 'Modal Title',
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    const titleEl = document.querySelector('.modal-title')
    expect(titleEl?.textContent).toBe('Modal Title')
    wrapper.unmount()
  })

  it('should emit close event when close button is clicked', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    const closeBtn = document.querySelector('.modal-close') as HTMLElement
    closeBtn?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')).toHaveLength(1)
    wrapper.unmount()
  })

  it('should emit close event when overlay is clicked', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    const overlay = document.querySelector('.modal-overlay') as HTMLElement
    overlay?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('should not emit close when modal content is clicked', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    const content = document.querySelector('.modal-content') as HTMLElement
    content?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })

  it('should not close on overlay click when closeOnOverlay is false', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
        closeOnOverlay: false,
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    const overlay = document.querySelector('.modal-overlay') as HTMLElement
    overlay?.click()
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })

  it('should render small size', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
        size: 'sm',
      },
      slots: {
        default: '<p>Small modal</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    expect(document.querySelector('.modal-sm')).toBeTruthy()
    wrapper.unmount()
  })

  it('should render large size', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
        size: 'lg',
      },
      slots: {
        default: '<p>Large modal</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    expect(document.querySelector('.modal-lg')).toBeTruthy()
    wrapper.unmount()
  })

  it('should render full size', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
        size: 'full',
      },
      slots: {
        default: '<p>Full modal</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    expect(document.querySelector('.modal-full')).toBeTruthy()
    wrapper.unmount()
  })

  it('should render footer slot', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
      },
      slots: {
        default: '<p>Modal content</p>',
        footer: '<button>Save</button>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    const footer = document.querySelector('.modal-footer')
    expect(footer).toBeTruthy()
    expect(footer?.innerHTML).toContain('Save')
    wrapper.unmount()
  })

  it('should hide close button when hideClose is true', async () => {
    const wrapper = mount(Modal, {
      props: {
        open: true,
        hideClose: true,
      },
      slots: {
        default: '<p>Modal content</p>',
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    expect(document.querySelector('.modal-close')).toBeNull()
    wrapper.unmount()
  })
})
