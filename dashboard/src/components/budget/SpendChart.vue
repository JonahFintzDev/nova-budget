<script setup lang="ts">
import { computed } from 'vue';

export interface ChartPoint {
  label: string;
  value: number;
}

const props = withDefaults(
  defineProps<{
    data: ChartPoint[];
    accent?: string;
    width?: number;
    height?: number;
  }>(),
  {
    accent: '#818cf8',
    width: 640,
    height: 220,
  },
);

const pad = { l: 36, r: 16, t: 16, b: 26 };

const chartW = computed(() => props.width - pad.l - pad.r);
const chartH = computed(() => props.height - pad.t - pad.b);

const niceMax = computed(() => {
  const max = Math.max(...props.data.map((d) => d.value), 1);
  return Math.ceil(max / 50) * 50 || 50;
});

const stepX = computed(() =>
  chartW.value / Math.max(1, props.data.length - 1),
);

const pts = computed(() =>
  props.data.map((d, i) => ({
    x: pad.l + i * stepX.value,
    y: pad.t + chartH.value - (d.value / niceMax.value) * chartH.value,
    label: d.label,
    value: d.value,
  })),
);

const linePath = computed(() =>
  pts.value
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts.value[i - 1];
      const cx1 = prev.x + stepX.value / 2;
      const cx2 = p.x - stepX.value / 2;
      return `C ${cx1} ${prev.y} ${cx2} ${p.y} ${p.x} ${p.y}`;
    })
    .join(' '),
);

const areaPath = computed(() => {
  const last = pts.value[pts.value.length - 1];
  const first = pts.value[0];
  const bottom = pad.t + chartH.value;
  return linePath.value + ` L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
});

const gridYs = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((t) => pad.t + chartH.value * t),
);

const yLabels = computed(() =>
  [0, 0.5, 1].map((t) => ({
    y: pad.t + chartH.value * (1 - t),
    val: Math.round(niceMax.value * t),
  })),
);

const showLabel = (i: number) => {
  if (props.data.length <= 8) return true;
  return i % 2 === 0 || i === props.data.length - 1;
};

const gradId = 'chart-area-' + Math.random().toString(36).slice(2);
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    style="width: 100%; height: auto; display: block; overflow: visible"
  >
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="accent" stop-opacity="0.28" />
        <stop offset="100%" :stop-color="accent" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Grid lines -->
    <line
      v-for="(y, i) in gridYs"
      :key="i"
      :x1="pad.l"
      :y1="y"
      :x2="pad.l + chartW"
      :y2="y"
      stroke="var(--border-1)"
      stroke-width="1"
    />

    <!-- Y labels -->
    <text
      v-for="(lbl, i) in yLabels"
      :key="i"
      :x="pad.l - 8"
      :y="lbl.y + 4"
      text-anchor="end"
      font-size="10"
      fill="var(--fg-4)"
      font-family="var(--font-sans)"
    >€{{ lbl.val }}</text>

    <!-- Area fill -->
    <path v-if="data.length > 0" :d="areaPath" :fill="`url(#${gradId})`" />

    <!-- Line -->
    <path
      v-if="data.length > 0"
      :d="linePath"
      fill="none"
      :stroke="accent"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Points -->
    <circle
      v-for="(p, i) in pts"
      :key="i"
      :cx="p.x"
      :cy="p.y"
      r="3"
      fill="var(--bg-2)"
      :stroke="accent"
      stroke-width="2"
    />

    <!-- X labels -->
    <text
      v-for="(p, i) in pts"
      v-show="showLabel(i)"
      :key="i"
      :x="p.x"
      :y="pad.t + chartH + 16"
      text-anchor="middle"
      font-size="10"
      fill="var(--fg-4)"
      font-family="var(--font-sans)"
    >{{ p.label }}</text>
  </svg>
</template>
