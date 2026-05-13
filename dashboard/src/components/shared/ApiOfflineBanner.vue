<script setup lang="ts">
// node_modules
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

// classes
import { getApiReachable, subscribeApiReachable } from '@/classes/api';

// -------------------------------------------------- Data --------------------------------------------------
const { t } = useI18n();
const bApiReachable = ref(getApiReachable());
const bBrowserOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
let unsubscribeApi: (() => void) | null = null;

// -------------------------------------------------- Computed --------------------------------------------------
const bWorkingOffline = computed(() => !bBrowserOnline.value || !bApiReachable.value);

// -------------------------------------------------- Methods --------------------------------------------------
const onBrowserOffline = (): void => {
  bBrowserOnline.value = false;
};

const onBrowserOnline = (): void => {
  bBrowserOnline.value = true;
};

// -------------------------------------------------- Lifecycle --------------------------------------------------
onMounted(() => {
  unsubscribeApi = subscribeApiReachable((online) => {
    bApiReachable.value = online;
  });
  window.addEventListener('offline', onBrowserOffline);
  window.addEventListener('online', onBrowserOnline);
});

onUnmounted(() => {
  unsubscribeApi?.();
  window.removeEventListener('offline', onBrowserOffline);
  window.removeEventListener('online', onBrowserOnline);
});
</script>

<template>
  <div
    v-if="bWorkingOffline"
    class="flex items-center justify-center border-b border-border bg-muted/30 px-4 py-1.5 text-center text-xs text-text-muted"
    role="status"
  >
    {{ t('common.offlineBannerTitle') }}
  </div>
</template>
