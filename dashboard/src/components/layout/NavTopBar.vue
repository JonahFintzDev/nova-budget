<script setup lang="ts">
import { Settings, LogOut } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { dropdownEnter, dropdownLeave } from '@/lib/gsap';
import { useAuthStore } from '@/stores/auth';

defineProps<{ title: string }>();

const authStore = useAuthStore();
const bMenu = ref(false);
const menuRoot = ref<HTMLElement | null>(null);

const initial = () =>
  (authStore.username ?? 'U').charAt(0).toUpperCase();

const logout = () => {
  authStore.logout();
  window.location.href = '/login';
};

const onDocClick = (e: MouseEvent) => {
  if (bMenu.value && menuRoot.value && !menuRoot.value.contains(e.target as Node)) {
    bMenu.value = false;
  }
};

onMounted(() => document.addEventListener('click', onDocClick));
onUnmounted(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <header class="topbar">
    <div class="topbar-title">{{ title }}</div>
    <div class="topbar-right">
      <div ref="menuRoot" style="position:relative">
        <div class="nb-avatar" @click.stop="bMenu = !bMenu">{{ initial() }}</div>
        <Transition name="gsap-dropdown" :css="false" @enter="dropdownEnter" @leave="dropdownLeave">
          <div
            v-if="bMenu"
            style="position:absolute;right:0;top:calc(100% + 8px);min-width:160px;background:var(--bg-2);border:1px solid var(--border-2);border-radius:var(--r-md);padding:4px;z-index:50;box-shadow:var(--shadow-md)"
          >
            <RouterLink
              to="/settings"
              style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;color:var(--fg-2);font-size:13.5px;text-decoration:none;transition:background 120ms"
              @click="bMenu = false"
              @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--bg-3)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.background = ''"
            >
              <Settings :size="15" /> Settings
            </RouterLink>
            <button
              style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;color:var(--fg-2);font-size:13.5px;width:100%;text-align:left;background:none;border:none;cursor:pointer;font-family:var(--font-sans);transition:background 120ms"
              @click="bMenu = false; logout()"
              @mouseover="($event.currentTarget as HTMLElement).style.background = 'var(--bg-3)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.background = ''"
            >
              <LogOut :size="15" /> Log out
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>
