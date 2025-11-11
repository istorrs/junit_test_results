<template>
  <div ref="chartRef" :style="{ width: width, height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'

interface DataSeries {
  name: string
  data: number[]
}

interface Props {
  xAxisData: string[]
  series: DataSeries[]
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
    },
    legend: {
      data: props.series.map((s) => s.name),
      top: 40,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 80,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.xAxisData,
    },
    yAxis: {
      type: 'value',
    },
    series: props.series.map((s) => ({
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: true,
    })),
  }

  chartInstance.setOption(option)
}

const updateChart = () => {
  if (!chartInstance) return

  chartInstance.setOption({
    xAxis: {
      data: props.xAxisData,
    },
    series: props.series.map((s) => ({
      name: s.name,
      data: s.data,
    })),
  })
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chartInstance?.resize())
})

watch([() => props.xAxisData, () => props.series], updateChart, { deep: true })

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', () => chartInstance?.resize())
})
</script>
