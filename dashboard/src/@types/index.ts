export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  language: string;
  autoTheme: boolean;
  darkTheme: string | null;
  lightTheme: string | null;
}

export interface UserSettings {
  language: string;
  autoTheme: boolean;
  darkTheme: string | null;
  lightTheme: string | null;
}

export interface AppSettings {
  registrationEnabled: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ApiKeyWithPlainKey extends ApiKey {
  key: string;
}

// ── Budget types ──────────────────────────────────────────────

export type IconKey =
  | 'gamepad'
  | 'cart'
  | 'shirt'
  | 'utensils'
  | 'car'
  | 'refresh'
  | 'house'
  | 'heart'
  | 'plane'
  | 'film'
  | 'coffee'
  | 'book'
  | 'gift'
  | 'pet'
  | 'tools'
  | 'sparkle';

export interface Category {
  id: string;
  name: string;
  icon: IconKey;
  color: string;
  resetDay: number;
  limit: number | null;
}

export interface Transaction {
  id: string;
  categoryId: string;
  name: string;
  tag: string;
  price: number;
  date: string; // YYYY-MM-DD
}

export type CategoryModalState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; initial: Category };

export type ItemModalState =
  | { open: false }
  | { open: true; mode: 'create'; defaultCategoryId: string | null }
  | { open: true; mode: 'edit'; initial: Transaction };
