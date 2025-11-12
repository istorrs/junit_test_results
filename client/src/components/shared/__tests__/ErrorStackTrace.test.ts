import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorStackTrace from '../ErrorStackTrace.vue'

describe('ErrorStackTrace', () => {
  const javaStackTrace = `java.lang.AssertionError: Expected 5 but was 3
    at org.junit.Assert.fail(Assert.java:88)
    at com.example.MyTest.testAddition(MyTest.java:42)
    at java.lang.reflect.Method.invoke(Method.java:498)
    at org.junit.runners.BlockJUnit4ClassRunner.runChild(BlockJUnit4ClassRunner.java:50)`

  const pythonStackTrace = `Traceback (most recent call last):
  File "test_calculator.py", line 15, in test_add
    assert result == 5
AssertionError`

  it('renders stack trace', () => {
    const wrapper = mount(ErrorStackTrace, {
      props: {
        stackTrace: javaStackTrace,
        language: 'java'
      }
    })
    expect(wrapper.find('.stack-trace').exists()).toBe(true)
    expect(wrapper.text()).toContain('AssertionError')
  })

  it('supports Python stack traces', () => {
    const wrapper = mount(ErrorStackTrace, {
      props: {
        stackTrace: pythonStackTrace,
        language: 'python'
      }
    })
    expect(wrapper.text()).toContain('Traceback')
    expect(wrapper.text()).toContain('test_calculator.py')
  })

  it('handles empty stack trace gracefully', () => {
    const wrapper = mount(ErrorStackTrace, {
      props: {
        stackTrace: '',
        language: 'java'
      }
    })
    // Component should render without error
    expect(wrapper.exists()).toBe(true)
  })

  it('displays stack trace content', () => {
    const wrapper = mount(ErrorStackTrace, {
      props: {
        stackTrace: javaStackTrace,
        language: 'java'
      }
    })
    // Should contain key parts of the stack trace
    expect(wrapper.text()).toContain('org.junit.Assert')
    expect(wrapper.text()).toContain('com.example.MyTest')
  })
})
