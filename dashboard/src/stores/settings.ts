// node_modules
import { ref } from 'vue';
import { defineStore } from 'pinia';

// classes
import { settingsApi } from '@/classes/api';

// types
import type { UserSettings } from '@/@types/index';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings | null>(null);
  const bLoaded = ref(false);

  const load = async (options?: { force?: boolean }): Promise<UserSettings> => {
    if (bLoaded.value && settings.value && options?.force !== true) {
      return settings.value;
    }
    const loaded = await settingsApi.get();
    settings.value = loaded;
    bLoaded.value = true;
    return loaded;
  };

  const update = async (patch: Partial<UserSettings>): Promise<UserSettings> => {
    const updated = await settingsApi.update(patch);
    settings.value = updated;
    bLoaded.value = true;
    return updated;
  };

  const clear = (): void => {
    settings.value = null;
    bLoaded.value = false;
  };

  return {
    settings,
    bLoaded,
    load,
    update,
    clear,
  };
});
