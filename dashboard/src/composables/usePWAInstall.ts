// node_modules
import { onMounted, onUnmounted, ref } from 'vue';

export const usePWAInstall = () => {
  const deferredPrompt = ref<Event | null>(null);
  const isInstallable = ref(false);
  const isInstalled = ref(false);

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt.value = e;
    isInstallable.value = true;
  };

  const installPWA = async () => {
    if (!deferredPrompt.value) {
      return false;
    }
    (deferredPrompt.value as any).prompt();
    const choiceResult = await (deferredPrompt.value as any).userChoice;
    if (choiceResult.outcome === 'accepted') {
      isInstalled.value = true;
      isInstallable.value = false;
      return true;
    }
    return false;
  };

  const checkIfInstalled = () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true;
      isInstallable.value = false;
    }
  };

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
    });
    checkIfInstalled();
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  });

  return {
    isInstallable,
    isInstalled,
    installPWA,
  };
};
