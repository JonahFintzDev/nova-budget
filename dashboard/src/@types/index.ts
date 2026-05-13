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
