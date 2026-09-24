import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AllureDetails from './AllureDetails.vue'

describe('AllureDetails', () => {
  it('renders passing and failing nested steps, fixtures, metadata, and attachments', () => {
    const wrapper = mount(AllureDetails, {
      props: {
        test: {
          id: 'case-1',
          name: 'camera test',
          time: 0.5,
          status: 'failed',
          result_format: 'allure',
          description: 'Camera behavior',
          labels: [{ name: 'tag', value: 'video' }],
          parameters: [{ name: 'device', value: '/dev/video0' }],
          attachments: [
            {
              attachment_id: 'attachment-1',
              source: 'log.txt',
              name: 'log',
              size: 12,
            },
          ],
          steps: [
            {
              name: 'Start stream',
              status: 'failed',
              steps: [{ name: 'Wait for frame', status: 'failed' }],
            },
          ],
          fixtures: { befores: [{ name: 'Open camera', status: 'passed' }] },
        },
      },
    })

    expect(wrapper.text()).toContain('Start stream')
    expect(wrapper.text()).toContain('Wait for frame')
    expect(wrapper.text()).toContain('Open camera')
    expect(wrapper.text()).toContain('/dev/video0')
    const attachment = wrapper.get('a[href="/api/v1/attachments/attachment-1"]')
    expect(attachment.text()).toContain('View log')
    expect(attachment.attributes('target')).toBe('_blank')
  })
})
