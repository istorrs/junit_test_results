<template>
  <div class="history-chart-container">
    <div v-if="!hasData" class="empty-state">
      <p>No history data available</p>
    </div>
    <div v-else ref="chartRef" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import * as echarts from 'echarts'

interface HistoryRun {
  run_id: string
  status: 'passed' | 'failed' | 'error' | 'skipped'
  time: number
  timestamp: string | Date
  error_message?: string
}

interface Props {
  data: HistoryRun[]
}

const props = defineProps<Props>()

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null
let retryCount = 0
let lastLoggedRetry = 0

const hasData = computed(() => props.data && props.data.length > 0)

// Prepare chart data
const chartData = computed(() => {
  if (!props.data) return { dates: [], statuses: [], times: [] }

  const sortedData = [...props.data].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })

  return {
    dates: sortedData.map(d => new Date(d.timestamp).toLocaleDateString()),
    statuses: sortedData.map(d => {
      if (d.status === 'passed') return 1
      if (d.status === 'failed') return -1
      if (d.status === 'error') return -2
      return 0 // skipped
    }),
    times: sortedData.map(d => d.time),
    runs: sortedData
  }
})

const initChart = () => {
  if (!chartRef.value || !hasData.value) return

  // Ensure container has dimensions
  const containerWidth = chartRef.value.offsetWidth
  const containerHeight = chartRef.value.offsetHeight

  if (containerWidth === 0 || containerHeight === 0) {
    retryCount++
    // Only log every 20 attempts (every 2 seconds) to avoid console spam
    if (retryCount === 1 || retryCount - lastLoggedRetry >= 20) {
      console.warn(`[HistoryChart] Container has no dimensions, delaying init (attempt ${retryCount})`)
      lastLoggedRetry = retryCount
    }
    // Stop retrying after 100 attempts (10 seconds)
    if (retryCount < 100) {
      setTimeout(() => initChart(), 100)
    }
    return
  }

  // Reset retry counter on successful init
  retryCount = 0
  lastLoggedRetry = 0

  console.log('[HistoryChart] Initializing chart with container size:', containerWidth, 'x', containerHeight)

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'

  chartInstance = echarts.init(chartRef.value)

  const getColors = () => {
    const style = getComputedStyle(document.documentElement)
    return {
      success: style.getPropertyValue('--success-color').trim() || '#10b981',
      error: style.getPropertyValue('--error-color').trim() || '#ef4444',
      warning: style.getPropertyValue('--warning-color').trim() || '#f59e0b',
      text: style.getPropertyValue('--text-primary').trim() || '#111827',
      textSecondary: style.getPropertyValue('--text-secondary').trim() || '#6b7280',
      border: style.getPropertyValue('--border-color').trim() || '#e5e7eb'
    }
  }

  const colors = getColors()

  // Calculate optimal bar width based on number of data points
  const dataPointCount = chartData.value.dates.length
  const calculateBarWidth = () => {
    if (dataPointCount === 1) return '60%'
    if (dataPointCount <= 3) return '50%'
    if (dataPointCount <= 5) return '40%'
    if (dataPointCount <= 10) return '30%'
    if (dataPointCount <= 20) return '60%'
    return '80%'
  }
  const barWidth = calculateBarWidth()

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderColor: colors.border,
      textStyle: {
        color: colors.text
      },
      formatter: (params: any) => {
        const index = params[0].dataIndex
        const run = chartData.value.runs?.[index]
        if (!run) return ''
        const status = run.status
        const time = (run.time * 1000).toFixed(0) + 'ms'

        let html = `<div style="padding: 0.5rem;">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">${params[0].name}</div>
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="color: ${status === 'passed' ? colors.success : colors.error};">●</span>
            <span>Status: ${status}</span>
          </div>
          <div>Duration: ${time}</div>
        </div>`

        return html
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.value.dates,
      boundaryGap: true,
      axisLine: {
        lineStyle: {
          color: colors.border
        }
      },
      axisLabel: {
        color: colors.textSecondary,
        fontSize: 11,
        rotate: 45
      }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Status',
        position: 'left',
        min: -2.5,
        max: 1.5,
        interval: 1,
        axisLine: {
          lineStyle: {
            color: colors.border
          }
        },
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 11,
          formatter: (value: number) => {
            if (value === 1) return 'Pass'
            if (value === 0) return 'Skip'
            if (value === -1) return 'Fail'
            if (value === -2) return 'Error'
            return ''
          }
        },
        splitLine: {
          lineStyle: {
            color: colors.border,
            opacity: 0.3
          }
        }
      },
      {
        type: 'value',
        name: 'Duration (s)',
        position: 'right',
        axisLine: {
          lineStyle: {
            color: colors.border
          }
        },
        axisLabel: {
          color: colors.textSecondary,
          fontSize: 11,
          formatter: '{value}s'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: 'Status',
        type: 'line',
        yAxisIndex: 0,
        data: chartData.value.statuses,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: (params: any) => {
            const value = params.value
            if (value === 1) return colors.success
            if (value === -1) return colors.error
            if (value === -2) return colors.warning
            return colors.textSecondary
          }
        },
        lineStyle: {
          width: 2,
          color: colors.text,
          opacity: 0.3
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
            { offset: 0.5, color: 'rgba(156, 163, 175, 0.1)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0.2)' }
          ])
        }
      },
      {
        name: 'Duration',
        type: 'bar',
        yAxisIndex: 1,
        data: chartData.value.times,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.8)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.3)' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: barWidth,
        barCategoryGap: '20%'
      }
    ]
  }

  chartInstance.setOption(option)

  // Listen for theme changes
  const observer = new MutationObserver(() => {
    if (chartInstance) {
      const newColors = getColors()
      chartInstance.setOption({
        tooltip: {
          backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1f2937' : '#ffffff',
          textStyle: {
            color: newColors.text
          }
        },
        xAxis: {
          axisLine: { lineStyle: { color: newColors.border } },
          axisLabel: { color: newColors.textSecondary }
        },
        yAxis: [
          {
            axisLine: { lineStyle: { color: newColors.border } },
            axisLabel: { color: newColors.textSecondary },
            splitLine: { lineStyle: { color: newColors.border } }
          },
          {
            axisLine: { lineStyle: { color: newColors.border } },
            axisLabel: { color: newColors.textSecondary }
          }
        ]
      })
    }
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })
}

const handleResize = () => {
  chartInstance?.resize()
}

// Expose resize method for parent components
const resize = () => {
  handleResize()
}

defineExpose({ resize })

watch(() => props.data, async () => {
  if (chartInstance && hasData.value) {
    chartInstance.dispose()
    await nextTick()
    initChart()
  } else if (!chartInstance && hasData.value) {
    await nextTick()
    initChart()
  }
}, { deep: true })

onMounted(async () => {
  if (hasData.value) {
    await nextTick()
    initChart()
    window.addEventListener('resize', handleResize)
  }
})

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.history-chart-container {
  width: 100%;
  min-height: 300px;
  position: relative;
}

.chart {
  width: 100%;
  height: 300px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}
</style>
