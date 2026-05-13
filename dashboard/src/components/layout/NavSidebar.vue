<script setup lang="ts">
import { LayoutDashboard, Wallet, Settings, Shield } from 'lucide-vue-next';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();

const isBudget = () =>
  route.name === 'budget' || route.name === 'budget-category';
</script>

<template>
  <aside class="sidebar">
    <!-- Brand -->
    <div class="brand">
      <div class="brand-icon">€</div>
      <div class="brand-text">
        <span class="brand-name">Nova Budget</span>
        <span class="brand-sub">Budget Tracker</span>
      </div>
    </div>

    <!-- Main nav -->
    <RouterLink
      to="/"
      class="nav-item"
      :class="{ active: route.name === 'home' }"
    >
      <LayoutDashboard :size="18" :stroke-width="2" />
      <span>Home</span>
    </RouterLink>

    <RouterLink
      to="/budget"
      class="nav-item"
      :class="{ active: isBudget() }"
    >
      <Wallet :size="18" :stroke-width="2" />
      <span>Budget</span>
    </RouterLink>

    <!-- Bottom-pinned -->
    <div class="sidebar-bottom">
      <RouterLink
        to="/settings"
        class="nav-item"
        :class="{ active: route.name === 'settings' }"
      >
        <Settings :size="18" :stroke-width="2" />
        <span>Settings</span>
      </RouterLink>

      <RouterLink
        v-if="authStore.bIsAdmin"
        to="/admin"
        class="nav-item"
        :class="{ active: route.name === 'admin' }"
      >
        <Shield :size="18" :stroke-width="2" />
        <span>Admin</span>
      </RouterLink>
    </div>
  </aside>
</template>
