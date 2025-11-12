<template>
  <div ref="chartRef" :style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'

interface Props {
  data: Array<{ name: string; value: number }>
  title?: string
  width?: string
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '100%',
  height: '400px',
})

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

// Detect dark mode
const isDarkMode = computed(() => {
  return document.documentElement.getAttribute('data-theme') === 'dark'
})

// Get CSS variable values
const getThemeColors = () => {
  const root = document.documentElement
  const computedStyle = getComputedStyle(root)

  return {
    textColor: computedStyle.getPropertyValue('--text-primary').trim(),
    textSecondary: computedStyle.getPropertyValue('--text-secondary').trim(),
    bgColor: computedStyle.getPropertyValue('--bg-primary').trim(),
    borderColor: computedStyle.getPropertyValue('--border-color').trim(),
  }
}

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)
  updateChartTheme()
}

const updateChartTheme = () => {
  if (!chartInstance) return

  const colors = getThemeColors()

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    title: {
      text: props.title,
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
        color: colors.textColor,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: colors.bgColor,
      borderColor: colors.borderColor,
      textStyle: {
        color: colors.textColor,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle',
      textStyle: {
        color: colors.textColor,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
    },
    series: [
      {
        type: 'pie',
        radius: '60%',
        center: ['50%', '55%'],
        data: props.data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        label: {
          formatter: '{b}: {d}%',
          color: colors.textColor,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        },
      },
    ],
  }

  chartInstance.setOption(option, true)
}

const updateChart = () => {
  updateChartTheme()
}

// Watch for theme changes
watch(isDarkMode, () => {
  updateChartTheme()
})

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chartInstance?.resize())

  // Watch for theme attribute changes
  const observer = new MutationObserver(() => {
    updateChartTheme()
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

watch(() => props.data, updateChart, { deep: true })

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', () => chartInstance?.resize())
})
</script>
