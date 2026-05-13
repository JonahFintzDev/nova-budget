<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import VueApexCharts from 'vue3-apexcharts';

const props = withDefaults(
  defineProps<{
    series: number[];
    categories: string[];
    color?: string;
    height?: number;
    seriesName?: string;
  }>(),
  {
    color: '#818cf8',
    height: 200,
    seriesName: 'Spend',
  },
);

const isDark = ref(document.documentElement.getAttribute('data-theme') !== 'light');

let observer: MutationObserver | null = null;
onMounted(() => {
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.getAttribute('data-theme') !== 'light';
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
});
onUnmounted(() => observer?.disconnect());

const chartOptions = computed(() => ({
  chart: {
    type: 'area' as const,
    toolbar: { show: false },
    background: 'transparent',
    animations: { enabled: true, speed: 350, animateGradually: { enabled: false } },
    fontFamily: 'inherit',
    sparkline: { enabled: false },
  },
  theme: { mode: (isDark.value ? 'dark' : 'light') as 'dark' | 'light' },
  colors: [props.color],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' as const, width: 2 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.32,
      opacityTo: 0.02,
      stops: [0, 95, 100],
    },
  },
  grid: {
    borderColor: isDark.value ? '#282836' : '#e2e2ef',
    strokeDashArray: 4,
    padding: { top: 0, right: 8, bottom: 0, left: 0 },
  },
  xaxis: {
    categories: props.categories,
    labels: {
      style: { colors: isDark.value ? '#7b7b8f' : '#8888a0', fontSize: '11px' },
      rotate: 0,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
  },
  yaxis: {
    labels: {
      style: { colors: isDark.value ? '#7b7b8f' : '#8888a0', fontSize: '11px' },
      formatter: (v: number) => '€' + Math.round(v),
    },
  },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    y: { formatter: (v: number) => '€' + v.toFixed(2) },
  },
  markers: { size: 0, hover: { size: 4 } },
}));

const chartSeries = computed(() => [{ name: props.seriesName, data: props.series }]);
</script>

<template>
  <VueApexCharts
    type="area"
    :height="height"
    :options="chartOptions"
    :series="chartSeries"
  />
</template>
