<template>
  <div ref="chartRef" :style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

interface Props {
  xAxisData: string[]
  seriesData: number[]
  title?: string
  width?: string
  height?: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  width: '100%',
  height: '400px',
  color: '#3b82f6',
})

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  const option: echarts.EChartsOption = {
    title: {
      text: props.title,
      left: 'center',
      top: 10,
      textStyle: {
        fontSize: 16,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 60,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: props.xAxisData,
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        type: 'bar',
        data: props.seriesData,
        itemStyle: {
          color: props.color,
        },
      },
    ],
  }

  chartInstance.setOption(option)
}

const updateChart = () => {
  if (!chartInstance) return

  chartInstance.setOption({
    xAxis: {
      data: props.xAxisData,
    },
    series: [
      {
        data: props.seriesData,
      },
    ],
  })
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chartInstance?.resize())
})

watch([() => props.xAxisData, () => props.seriesData], updateChart, { deep: true })

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', () => chartInstance?.resize())
})
</script>
