<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    username: string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  { size: 'md' },
);

const initial = computed(() => (props.username?.[0] ?? '?').toUpperCase());

const sizeClass = computed(() => {
  if (props.size === 'sm') {
    return 'h-7 w-7 text-xs';
  }
  if (props.size === 'lg') {
    return 'h-16 w-16 text-2xl';
  }
  return 'h-9 w-9 text-sm';
});

const bgClass = computed(() => {
  const colors = [
    'bg-violet-500',
    'bg-indigo-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-teal-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-orange-500',
  ];
  let hash = 0;
  for (let i = 0; i < props.username.length; i++) {
    hash = (hash * 31 + props.username.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
});
</script>

<template>
  <span
    :class="[
      sizeClass,
      'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
    ]"
  >
    <span
      :class="[bgClass, 'flex h-full w-full items-center justify-center font-semibold text-white']"
    >
      {{ initial }}
    </span>
  </span>
</template>
