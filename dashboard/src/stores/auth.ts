// node_modules
import { defineStore } from 'pinia';
import { ref } from 'vue';

// classes
import { authApi, getStoredToken, setStoredToken } from '@/classes/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(getStoredToken());
  const username = ref<string | null>(null);
  const userId = ref<string | null>(null);
  const bIsAdmin = ref(false);
  const bValidated = ref(false);

  const login = async (user: string, password: string): Promise<void> => {
    const response = await authApi.login(user, password);
    token.value = response.token;
    setStoredToken(response.token);
    username.value = user;
    await validate();
  };

  const register = async (user: string, password: string): Promise<void> => {
    const response = await authApi.register(user, password);
    token.value = response.token;
    setStoredToken(response.token);
    username.value = user;
    await validate();
  };

  const logout = (): void => {
    token.value = null;
    username.value = null;
    userId.value = null;
    bIsAdmin.value = false;
    bValidated.value = false;
    setStoredToken(null);
  };

  const validate = async (): Promise<boolean> => {
    if (!token.value) {
      bValidated.value = false;
      return false;
    }
    const response = await authApi.validate();
    if (!response.valid || !response.username) {
      logout();
      return false;
    }
    username.value = response.username;
    userId.value = response.userId ?? null;
    bIsAdmin.value = response.isAdmin;
    bValidated.value = true;
    return true;
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await authApi.changePassword(currentPassword, newPassword);
  };

  return {
    token,
    username,
    userId,
    bIsAdmin,
    bValidated,
    login,
    register,
    logout,
    validate,
    changePassword,
  };
});
