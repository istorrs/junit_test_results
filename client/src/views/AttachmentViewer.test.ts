import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AttachmentViewer from './AttachmentViewer.vue'

const push = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'chart-attachment' } }),
  useRouter: () => ({ push }),
}))

describe('AttachmentViewer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:chart-preview'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders HTML chart attachments in a script-disabled sandbox', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<svg><text>Interface throughput</text></svg>', {
        headers: {
          'content-type': 'text/html',
          'content-disposition': 'inline; filename="Interface throughput"',
        },
      })
    )

    const wrapper = mount(AttachmentViewer)
    await flushPromises()

    const preview = wrapper.get('iframe.attachment-document')
    expect(preview.attributes('src')).toBe('blob:chart-preview')
    expect(preview.attributes('sandbox')).toBe('')
    expect(wrapper.find('pre.attachment-content').exists()).toBe(false)
    expect(wrapper.text()).toContain('Interface throughput')
  })
})
