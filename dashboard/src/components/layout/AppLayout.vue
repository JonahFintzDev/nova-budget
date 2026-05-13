<script setup lang="ts">
// node_modules
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterView, useRoute } from 'vue-router';

// lib
import { pageEnter, pageLeave } from '@/lib/gsap';

// components
import ApiOfflineBanner from '@/components/shared/ApiOfflineBanner.vue';
import NavSidebar from '@/components/layout/NavSidebar.vue';
import NavTopBar from '@/components/layout/NavTopBar.vue';

// -------------------------------------------------- Data --------------------------------------------------
const route = useRoute();
const { t } = useI18n();
const navSidebarRef = ref<{ openDrawer: () => void } | null>(null);

// -------------------------------------------------- Methods --------------------------------------------------
const openNavDrawer = (): void => {
  navSidebarRef.value?.openDrawer();
};

// -------------------------------------------------- Computed --------------------------------------------------
const pageTitle = computed(() => {
  const name = route.name;
  if (name === 'home') {
    return t('nav.home');
  }
  if (name === 'settings') {
    return t('settings.title');
  }
  if (name === 'admin') {
    return t('admin.title');
  }
  return 'Nova Budget';
});
</script>

<template>
  <div class="app-shell relative z-10 flex bg-bg text-text-primary">
    <NavSidebar ref="navSidebarRef" />
    <div class="flex min-w-0 flex-1 flex-col lg:ms-0">
      <ApiOfflineBanner />
      <NavTopBar :title="pageTitle" @menu="openNavDrawer" />
      <main class="relative z-0 min-h-0 flex-1 overflow-y-auto">
        <RouterView v-slot="{ Component }">
          <Transition mode="out-in" :css="false" @enter="pageEnter" @leave="pageLeave">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>
