<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: number;
  max: number | null;
  color?: string;
  height?: number;
}>();

const accent = computed(() => props.color ?? '#818cf8');

const pct = computed(() => {
  if (props.max == null || props.max <= 0) return 100;
  return Math.min(100, (props.value / props.max) * 100);
});

const over = computed(() => props.max != null && props.value > props.max);

const fillColor = computed(() => (over.value ? 'var(--danger)' : accent.value));

const fillOpacity = computed(() => (props.max == null || props.max <= 0 ? 0.18 : 1));
</script>

<template>
  <div class="nb-progress" :style="height ? { height: height + 'px' } : {}">
    <div
      class="fill"
      :style="{
        width: pct + '%',
        background: fillColor,
        opacity: fillOpacity,
      }"
    />
  </div>
</template>
