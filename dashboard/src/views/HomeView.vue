<script setup lang="ts">
// node_modules
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

// components
import PageShell from '@/components/layout/PageShell.vue';

// stores
import { useAuthStore } from '@/stores/auth';

// -------------------------------------------------- Store --------------------------------------------------
const authStore = useAuthStore();
const { t } = useI18n();

// -------------------------------------------------- Computed --------------------------------------------------
const greetingKey = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'home.greetingMorning';
  }
  if (hour < 18) {
    return 'home.greetingAfternoon';
  }
  return 'home.greetingEvening';
});

const greetingName = computed(() => authStore.username || t('nav.home'));
</script>

<template>
  <PageShell>
    <section class="mb-8 space-y-2">
      <h1 class="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
        {{ t(greetingKey, { name: greetingName }) }}
      </h1>
    </section>
    <section class="rounded-3xl border border-border bg-card/30 p-8 text-center">
      <div
        class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"
      >
        <span class="material-icons text-2xl text-primary">account_balance_wallet</span>
      </div>
      <h2 class="mb-2 text-xl font-semibold text-text-primary">{{ t('home.comingSoon') }}</h2>
      <p class="text-sm text-text-muted">{{ t('home.comingSoonDesc') }}</p>
    </section>
  </PageShell>
</template>
