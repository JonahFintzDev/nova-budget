// node_modules
import axios, { type AxiosInstance } from 'axios';

// types
import type { ApiKey, ApiKeyWithPlainKey, AppSettings, Category, Transaction, User, UserSettings } from '@/@types/index';

const TOKEN_KEY = 'nova-budget-token';

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 30000,
});

let bApiReachable = true;
const reachabilityListeners = new Set<(online: boolean) => void>();

export const getApiReachable = (): boolean => {
  return bApiReachable;
};

export const subscribeApiReachable = (listener: (online: boolean) => void): (() => void) => {
  reachabilityListeners.add(listener);
  return () => {
    reachabilityListeners.delete(listener);
  };
};

const setApiReachable = (online: boolean): void => {
  if (bApiReachable === online) {
    return;
  }
  bApiReachable = online;
  for (const listener of reachabilityListeners) {
    listener(online);
  }
};

api.interceptors.request.use((configuration) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    configuration.headers.Authorization = `Bearer ${token}`;
  }
  return configuration;
});

api.interceptors.response.use(
  (response) => {
    setApiReachable(true);
    return response;
  },
  (error) => {
    if (!error.response && error.code !== 'ERR_CANCELED') {
      setApiReachable(false);
    } else if (error.response) {
      setApiReachable(true);
    }
    return Promise.reject(error);
  },
);

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

// -------------------------------------------------- Health --------------------------------------------------

export const healthApi = {
  async check(): Promise<{
    ok: boolean;
    needsSetup: boolean;
    registrationEnabled: boolean;
  }> {
    const response = await api.get<{
      ok: boolean;
      needsSetup: boolean;
      registrationEnabled: boolean;
    }>('/api/health');
    return response.data;
  },
};

// -------------------------------------------------- Auth --------------------------------------------------

export const authApi = {
  async register(username: string, password: string): Promise<{ token: string }> {
    const response = await api.post<{ token: string }>('/api/auth/register', {
      username,
      password,
    });
    return response.data;
  },
  async login(username: string, password: string): Promise<{ token: string }> {
    const response = await api.post<{ token: string }>('/api/auth/login', { username, password });
    return response.data;
  },
  async validate(): Promise<{
    valid: boolean;
    username: string | null;
    userId: string | null;
    isAdmin: boolean;
  }> {
    const response = await api.post<{
      valid: boolean;
      username: string | null;
      userId: string | null;
      isAdmin: boolean;
    }>('/api/auth/validate');
    return response.data;
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch('/api/auth/password', { currentPassword, newPassword });
  },
};

// -------------------------------------------------- Settings --------------------------------------------------

export const settingsApi = {
  async get(): Promise<UserSettings> {
    const response = await api.get<UserSettings>('/api/settings');
    return response.data;
  },
  async update(payload: Partial<UserSettings>): Promise<UserSettings> {
    const response = await api.patch<UserSettings>('/api/settings', payload);
    return response.data;
  },
};

// -------------------------------------------------- Push --------------------------------------------------

export const pushApi = {
  async getPublicKey(): Promise<{ enabled: boolean; publicKey: string | null }> {
    const response = await api.get<{ enabled: boolean; publicKey: string | null }>(
      '/api/push/public-key',
    );
    return response.data;
  },
  async subscribe(payload: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<void> {
    await api.post('/api/push/subscribe', payload);
  },
  async unsubscribe(endpoint: string): Promise<void> {
    await api.post('/api/push/unsubscribe', { endpoint });
  },
};

// -------------------------------------------------- Admin --------------------------------------------------

export const adminApi = {
  async listUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/api/admin/users');
    return response.data;
  },
  async updateUser(id: string, payload: { isAdmin?: boolean }): Promise<User> {
    const response = await api.patch<User>(`/api/admin/users/${id}`, payload);
    return response.data;
  },
  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/admin/users/${id}`);
  },
  async getSettings(): Promise<AppSettings> {
    const response = await api.get<AppSettings>('/api/admin/settings');
    return response.data;
  },
  async updateSettings(payload: Partial<AppSettings>): Promise<AppSettings> {
    const response = await api.patch<AppSettings>('/api/admin/settings', payload);
    return response.data;
  },
};

// -------------------------------------------------- Budget --------------------------------------------------

export const budgetApi = {
  async getCategories(): Promise<Category[]> {
    const response = await api.get<Category[]>('/api/categories');
    return response.data;
  },
  async createCategory(payload: Omit<Category, 'id'>): Promise<Category> {
    const response = await api.post<Category>('/api/categories', payload);
    return response.data;
  },
  async updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>): Promise<Category> {
    const response = await api.patch<Category>(`/api/categories/${id}`, patch);
    return response.data;
  },
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/api/categories/${id}`);
  },
  async getTransactions(): Promise<Transaction[]> {
    const response = await api.get<Transaction[]>('/api/transactions');
    return response.data;
  },
  async createTransaction(payload: Omit<Transaction, 'id'>): Promise<Transaction> {
    const response = await api.post<Transaction>('/api/transactions', payload);
    return response.data;
  },
  async updateTransaction(id: string, patch: Partial<Omit<Transaction, 'id'>>): Promise<Transaction> {
    const response = await api.patch<Transaction>(`/api/transactions/${id}`, patch);
    return response.data;
  },
  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/api/transactions/${id}`);
  },
};

// -------------------------------------------------- API Keys --------------------------------------------------

export const apiKeysApi = {
  async list(): Promise<ApiKey[]> {
    const response = await api.get<ApiKey[]>('/api/keys');
    return response.data;
  },
  async create(name: string): Promise<ApiKeyWithPlainKey> {
    const response = await api.post<ApiKeyWithPlainKey>('/api/keys', { name });
    return response.data;
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/api/keys/${id}`);
  },
};
