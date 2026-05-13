<script setup lang="ts">
// node_modules
import { useI18n } from 'vue-i18n';

// lib
import { modalTransitionEnter, modalTransitionLeave } from '@/lib/gsap';

const { t } = useI18n();

// -------------------------------------------------- Props --------------------------------------------------
defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  destructive?: boolean;
  confirmLabel?: string;
}>();

// -------------------------------------------------- Emits --------------------------------------------------
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <Transition :css="false" @enter="modalTransitionEnter" @leave="modalTransitionLeave">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="modal-backdrop" @click="emit('close')" />
      <div class="modal-panel max-w-sm">
        <div class="modal-header">
          <h3 class="text-base font-semibold text-text-primary">{{ title }}</h3>
        </div>
        <div class="modal-body">{{ message }}</div>
        <div class="modal-footer">
          <button type="button" class="button" @click="emit('close')">
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :class="['button', destructive ? 'is-destructive' : 'is-primary']"
            @click="emit('confirm')"
          >
            {{ confirmLabel || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
