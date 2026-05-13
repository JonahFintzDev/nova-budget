<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import ApiOfflineBanner from '@/components/shared/ApiOfflineBanner.vue';
import NavSidebar from '@/components/layout/NavSidebar.vue';
import NavTopBar from '@/components/layout/NavTopBar.vue';
import CategoryModal from '@/components/budget/CategoryModal.vue';
import ItemModal from '@/components/budget/ItemModal.vue';
import { useBudgetStore } from '@/stores/budget';

const route = useRoute();
const { t } = useI18n();
const budgetStore = useBudgetStore();

onMounted(() => {
  budgetStore.init();
});

const pageTitle = computed(() => {
  const name = route.name;
  if (name === 'home') return t('nav.home');
  if (name === 'budget' || name === 'budget-category') return t('nav.budget');
  if (name === 'settings') return t('settings.title');
  if (name === 'admin') return t('admin.title');
  return 'Nova Budget';
});
</script>

<template>
  <div class="app">
    <NavSidebar />
    <div class="main">
      <ApiOfflineBanner />
      <NavTopBar :title="pageTitle" />
      <div class="canvas">
        <RouterView />
      </div>
    </div>
  </div>

  <!-- Global budget modals -->
  <CategoryModal />
  <ItemModal />
</template>
