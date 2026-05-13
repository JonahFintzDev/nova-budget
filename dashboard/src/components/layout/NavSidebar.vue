<script setup lang="ts">
// node_modules
import { LayoutDashboard, Settings, Shield } from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';

// stores
import { useAuthStore } from '@/stores/auth';

// -------------------------------------------------- Store --------------------------------------------------
const authStore = useAuthStore();
const route = useRoute();
const { t } = useI18n();

// -------------------------------------------------- Data --------------------------------------------------
const bOpen = ref(false);

// -------------------------------------------------- Methods --------------------------------------------------
const openDrawer = (): void => {
  bOpen.value = true;
};

const closeMobileDrawer = (): void => {
  bOpen.value = false;
};

defineExpose({ openDrawer });
</script>

<template>
  <aside
    class="flex h-full w-64 shrink-0 flex-col border-r max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:transition-transform lg:static lg:z-auto lg:translate-x-0"
    :class="[
      bOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
      'border-border bg-surface',
    ]"
  >
    <div class="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <RouterLink
        to="/"
        class="flex min-h-0 min-w-0 flex-col gap-0 rounded-md px-2 py-1.5 hover:bg-fg/[0.05]"
        @click="closeMobileDrawer"
      >
        <span class="flex items-center gap-2 font-bold text-text-primary leading-tight">
          <img src="/icon.svg" class="h-5 w-5 shrink-0" alt="" aria-hidden="true" />
          Nova Budget
        </span>
        <span class="ps-6 text-[11px] text-text-muted leading-tight">Budget Tracker</span>
      </RouterLink>
      <button type="button" class="button is-icon is-transparent lg:!hidden" @click="bOpen = false">
        ×
      </button>
    </div>
    <div class="flex-1 overflow-y-auto px-2 py-3">
      <RouterLink
        to="/"
        class="flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium"
        :class="
          route.name === 'home'
            ? 'bg-primary/10 text-primary'
            : 'text-text-muted hover:bg-fg/[0.05] hover:text-text-primary'
        "
        @click="closeMobileDrawer"
      >
        <LayoutDashboard class="h-5 w-5 shrink-0" />
        {{ t('nav.home') }}
      </RouterLink>
    </div>
    <div class="border-t border-border p-2">
      <RouterLink
        to="/settings"
        class="flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-muted hover:bg-fg/[0.05] hover:text-text-primary"
        :class="route.name === 'settings' ? 'bg-primary/10 !text-primary' : ''"
        @click="closeMobileDrawer"
      >
        <Settings class="h-5 w-5 shrink-0" />
        {{ t('nav.settings') }}
      </RouterLink>
      <RouterLink
        v-if="authStore.bIsAdmin"
        to="/admin"
        class="flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-muted hover:bg-fg/[0.05] hover:text-text-primary"
        :class="route.name === 'admin' ? 'bg-primary/10 !text-primary' : ''"
        @click="closeMobileDrawer"
      >
        <Shield class="h-5 w-5 shrink-0" />
        {{ t('nav.admin') }}
      </RouterLink>
    </div>
  </aside>
  <div v-if="bOpen" class="fixed inset-0 z-30 bg-black/50 lg:hidden" @click="bOpen = false" />
</template>
