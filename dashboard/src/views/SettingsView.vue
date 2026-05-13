<script setup lang="ts">
// node_modules
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

// classes
import { apiKeysApi } from '@/classes/api';

// types
import type { ApiKey, ApiKeyWithPlainKey } from '@/@types/index';

// lib
import {
  applyUserThemePreferences,
  deriveAppearanceChoice,
  settingsPatchForAppearance,
  type AppearanceChoice,
} from '@/lib/themes';
import { setLocale, type LocaleCode } from '@/lib/i18n';
import {
  canRequestPermission,
  getPermissionState,
  isNotificationsEnabled,
  requestPermission,
  setNotificationsEnabled,
  syncPushSubscription,
} from '@/lib/notifications';

// components
import PageHeader from '@/components/layout/PageHeader.vue';
import PageShell from '@/components/layout/PageShell.vue';

// stores
import { useSettingsStore } from '@/stores/settings';

// -------------------------------------------------- Data --------------------------------------------------
const { t } = useI18n();
const settingsStore = useSettingsStore();
const tab = ref<'general' | 'security' | 'notifications' | 'apiKeys'>('general');
const appearance = ref<AppearanceChoice>('auto');
const language = ref<LocaleCode>('en');

// Security
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const bSaving = ref(false);
const bPasswordSuccess = ref(false);
const passwordError = ref('');

// Notifications
const bNotificationsEnabled = ref(isNotificationsEnabled());
const notificationPermission = ref(getPermissionState());
const bNotifSyncing = ref(false);

// API Keys
const bApiKeysLoading = ref(false);
const bApiKeyGenerating = ref(false);
const apiKeysMessage = ref('');
const apiKeysError = ref('');
const apiKeysList = ref<ApiKey[]>([]);
const newKeyName = ref('');
const newKeyValue = ref<ApiKeyWithPlainKey | null>(null);

// -------------------------------------------------- Lifecycle --------------------------------------------------
onMounted(async () => {
  const settings = await settingsStore.load({ force: true });
  appearance.value = deriveAppearanceChoice({
    autoTheme: settings.autoTheme,
    darkTheme: settings.darkTheme,
    lightTheme: settings.lightTheme,
  });
  language.value = settings.language === 'de' ? 'de' : 'en';
  applyUserThemePreferences({
    autoTheme: settings.autoTheme,
    darkTheme: settings.darkTheme,
    lightTheme: settings.lightTheme,
  });
});

// -------------------------------------------------- Methods --------------------------------------------------
const persistAppearance = async (choice: AppearanceChoice): Promise<void> => {
  appearance.value = choice;
  const patch = settingsPatchForAppearance(choice);
  await settingsStore.update(patch);
  applyUserThemePreferences(patch);
};

const onLanguageChange = async (code: LocaleCode): Promise<void> => {
  language.value = code;
  setLocale(code);
  await settingsStore.update({ language: code });
};

const onToggleNotifications = async (): Promise<void> => {
  bNotifSyncing.value = true;
  try {
    if (!bNotificationsEnabled.value) {
      if (canRequestPermission() && notificationPermission.value !== 'granted') {
        const result = await requestPermission();
        notificationPermission.value = result;
        if (result !== 'granted') {
          bNotifSyncing.value = false;
          return;
        }
      }
      setNotificationsEnabled(true);
      bNotificationsEnabled.value = true;
      await syncPushSubscription(true);
    } else {
      setNotificationsEnabled(false);
      bNotificationsEnabled.value = false;
      await syncPushSubscription(false);
    }
  } catch {
    // ignore sync errors
  } finally {
    bNotifSyncing.value = false;
  }
};

const changePassword = async (): Promise<void> => {
  passwordError.value = '';
  bPasswordSuccess.value = false;
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = t('settings.passwordMismatch');
    return;
  }
  bSaving.value = true;
  try {
    const { authApi } = await import('@/classes/api');
    await authApi.changePassword(currentPassword.value, newPassword.value);
    bPasswordSuccess.value = true;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch {
    passwordError.value = t('common.error');
  } finally {
    bSaving.value = false;
  }
};

const loadApiKeys = async (): Promise<void> => {
  bApiKeysLoading.value = true;
  try {
    apiKeysList.value = await apiKeysApi.list();
  } catch {
    apiKeysError.value = t('common.error');
  } finally {
    bApiKeysLoading.value = false;
  }
};

const generateApiKey = async (): Promise<void> => {
  if (!newKeyName.value.trim()) {
    return;
  }
  apiKeysMessage.value = '';
  apiKeysError.value = '';
  bApiKeyGenerating.value = true;
  try {
    const created = await apiKeysApi.create(newKeyName.value.trim());
    newKeyValue.value = created;
    newKeyName.value = '';
    apiKeysMessage.value = t('apiKeys.keyGenerated');
    await loadApiKeys();
  } catch {
    apiKeysError.value = t('common.error');
  } finally {
    bApiKeyGenerating.value = false;
  }
};

const revokeApiKey = async (key: ApiKey): Promise<void> => {
  if (!confirm(t('apiKeys.confirmDeleteKey', { name: key.name }))) {
    return;
  }
  apiKeysMessage.value = '';
  apiKeysError.value = '';
  try {
    await apiKeysApi.delete(key.id);
    apiKeysList.value = apiKeysList.value.filter((item) => item.id !== key.id);
    if (newKeyValue.value?.id === key.id) {
      newKeyValue.value = null;
    }
    apiKeysMessage.value = t('apiKeys.keyDeleted');
  } catch {
    apiKeysError.value = t('common.error');
  }
};

const copyValue = async (value: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
    apiKeysMessage.value = t('apiKeys.copied');
  } catch {
    apiKeysError.value = t('common.error');
  }
};

watch(tab, (newTab) => {
  if (newTab === 'apiKeys') {
    apiKeysMessage.value = '';
    apiKeysError.value = '';
    loadApiKeys();
  }
});
</script>

<template>
  <PageShell narrow>
    <PageHeader :title="t('settings.title')" />
    <nav class="tab-navigation mb-6 overflow-x-auto whitespace-nowrap">
      <button type="button" :class="{ 'is-active': tab === 'general' }" @click="tab = 'general'">
        {{ t('settings.general') }}
      </button>
      <button
        type="button"
        :class="{ 'is-active': tab === 'notifications' }"
        @click="tab = 'notifications'"
      >
        {{ t('settings.notifications') }}
      </button>
      <button type="button" :class="{ 'is-active': tab === 'security' }" @click="tab = 'security'">
        {{ t('settings.security') }}
      </button>
      <button type="button" :class="{ 'is-active': tab === 'apiKeys' }" @click="tab = 'apiKeys'">
        {{ t('apiKeys.tabLabel') }}
      </button>
    </nav>

    <!-- General tab -->
    <div v-if="tab === 'general'" class="rounded-lg border border-border bg-surface p-4 space-y-6">
      <div class="field">
        <label class="label">{{ t('settings.theme') }}</label>
        <div
          class="inline-flex w-max max-w-full flex-wrap items-stretch gap-0.5 rounded-md border-0 bg-bg p-0.5"
        >
          <button
            type="button"
            class="button !h-9 !max-h-9 !min-h-9 shrink-0 border-0 px-4 py-0 text-sm"
            :class="appearance === 'auto' ? 'is-primary' : 'is-transparent'"
            @click="persistAppearance('auto')"
          >
            {{ t('settings.themeAuto') }}
          </button>
          <button
            type="button"
            class="button !h-9 !max-h-9 !min-h-9 shrink-0 border-0 px-4 py-0 text-sm"
            :class="appearance === 'light' ? 'is-primary' : 'is-transparent'"
            @click="persistAppearance('light')"
          >
            {{ t('settings.themeLight') }}
          </button>
          <button
            type="button"
            class="button !h-9 !max-h-9 !min-h-9 shrink-0 border-0 px-4 py-0 text-sm"
            :class="appearance === 'dark' ? 'is-primary' : 'is-transparent'"
            @click="persistAppearance('dark')"
          >
            {{ t('settings.themeDark') }}
          </button>
        </div>
      </div>
      <div class="field">
        <label class="label">{{ t('settings.displayLanguage') }}</label>
        <div
          class="inline-flex w-max max-w-full flex-wrap items-stretch gap-0.5 rounded-md border-0 bg-bg p-0.5"
        >
          <button
            type="button"
            class="button !h-9 !max-h-9 !min-h-9 shrink-0 border-0 px-4 py-0 text-sm"
            :class="language === 'en' ? 'is-primary' : 'is-transparent'"
            @click="onLanguageChange('en')"
          >
            {{ t('settings.languageEn') }}
          </button>
          <button
            type="button"
            class="button !h-9 !max-h-9 !min-h-9 shrink-0 border-0 px-4 py-0 text-sm"
            :class="language === 'de' ? 'is-primary' : 'is-transparent'"
            @click="onLanguageChange('de')"
          >
            {{ t('settings.languageDe') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Notifications tab -->
    <div v-else-if="tab === 'notifications'" class="space-y-6">
      <p class="text-sm text-text-muted">{{ t('settings.notificationsDesc') }}</p>

      <div
        v-if="notificationPermission === 'unsupported'"
        class="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-muted"
      >
        {{ t('settings.notificationsUnsupported') }}
      </div>

      <div
        v-else-if="notificationPermission === 'denied'"
        class="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      >
        {{ t('settings.notificationsBlocked') }}
      </div>

      <div v-else class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-text-primary">
            {{ t('settings.notificationsPush') }}
          </p>
          <p class="text-xs text-text-muted">{{ t('settings.notificationsPushDesc') }}</p>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="bNotificationsEnabled"
          :disabled="bNotifSyncing"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50"
          :class="bNotificationsEnabled ? 'bg-primary' : 'bg-border'"
          @click="onToggleNotifications"
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
            :class="bNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'"
          />
        </button>
      </div>
    </div>

    <!-- Security tab -->
    <div v-else-if="tab === 'security'" class="space-y-4">
      <div class="rounded-lg border border-border bg-surface p-4">
        <div class="field">
          <label class="label">{{ t('settings.currentPassword') }}</label>
          <input
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            class="border border-border"
          />
        </div>
        <div class="field">
          <label class="label">{{ t('settings.newPassword') }}</label>
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            class="border border-border"
          />
        </div>
        <div class="field">
          <label class="label">{{ t('settings.confirmPassword') }}</label>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            class="border border-border"
          />
        </div>
      </div>
      <p v-if="bPasswordSuccess" class="message is-success">{{ t('settings.passwordSuccess') }}</p>
      <p v-if="passwordError" class="message is-error">{{ passwordError }}</p>
      <button type="button" class="button is-primary" :disabled="bSaving" @click="changePassword">
        {{ t('settings.savePassword') }}
      </button>
    </div>

    <!-- API Keys tab -->
    <div v-else-if="tab === 'apiKeys'" class="space-y-6">
      <p class="text-sm text-text-muted">{{ t('apiKeys.desc') }}</p>

      <p v-if="apiKeysMessage" class="message is-success">{{ apiKeysMessage }}</p>
      <p v-if="apiKeysError" class="message is-error">{{ apiKeysError }}</p>

      <!-- Generated key banner (shown once) -->
      <div v-if="newKeyValue" class="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
        <p class="mb-2 text-xs font-medium text-text-primary">{{ t('apiKeys.keyGenerated') }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <input
            :value="newKeyValue.key"
            type="text"
            readonly
            class="min-w-0 flex-1 font-mono text-xs"
          />
          <button type="button" class="button is-primary" @click="copyValue(newKeyValue!.key)">
            {{ t('apiKeys.copy') }}
          </button>
        </div>
      </div>

      <!-- Generate key form -->
      <div class="rounded-lg border border-border bg-surface px-4 py-3">
        <h3 class="mb-3 text-sm font-semibold text-text-primary">{{ t('apiKeys.keysTitle') }}</h3>
        <p class="mb-3 text-xs text-text-muted">{{ t('apiKeys.keysDesc') }}</p>
        <div class="flex flex-wrap items-end gap-3">
          <div class="field mb-0 min-w-0 flex-1">
            <label class="label">{{ t('apiKeys.keyName') }}</label>
            <input
              v-model="newKeyName"
              type="text"
              :placeholder="t('apiKeys.keyNamePlaceholder')"
              @keydown.enter="generateApiKey"
            />
          </div>
          <button
            type="button"
            class="button is-primary shrink-0"
            :disabled="bApiKeyGenerating || !newKeyName.trim()"
            @click="generateApiKey"
          >
            {{ t('apiKeys.generateKey') }}
          </button>
        </div>
      </div>

      <!-- Keys list -->
      <div class="space-y-2">
        <p v-if="bApiKeysLoading" class="text-sm text-text-muted">{{ t('common.loading') }}</p>
        <p v-else-if="apiKeysList.length === 0" class="text-sm text-text-muted">
          {{ t('apiKeys.noKeys') }}
        </p>
        <article
          v-for="key in apiKeysList"
          :key="key.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text-primary">{{ key.name }}</p>
            <p class="text-xs text-text-muted">
              {{ t('apiKeys.keyPrefix') }}: <span class="font-mono">{{ key.keyPrefix }}…</span>
              &nbsp;·&nbsp;
              {{ t('apiKeys.keyCreated') }}: {{ new Date(key.createdAt).toLocaleDateString() }}
              &nbsp;·&nbsp;
              {{
                key.lastUsedAt
                  ? t('apiKeys.keyLastUsed') + ': ' + new Date(key.lastUsedAt).toLocaleDateString()
                  : t('apiKeys.keyNeverUsed')
              }}
            </p>
          </div>
          <button
            type="button"
            class="button is-transparent text-destructive hover:bg-destructive/10"
            @click="revokeApiKey(key)"
          >
            {{ t('common.delete') }}
          </button>
        </article>
      </div>
    </div>
  </PageShell>
</template>
