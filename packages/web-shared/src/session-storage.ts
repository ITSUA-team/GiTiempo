export const REFRESH_TOKEN_STORAGE_KEY = "gitiempo.refresh-token";

type StorageLike = Pick<Storage, "getItem" | "removeItem" | "setItem">;

function createMemoryStorage(): StorageLike {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

const fallbackStorage = createMemoryStorage();

function getStorage(): StorageLike {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return fallbackStorage;
}

export function getRefreshToken(): string | null {
  return getStorage().getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setRefreshToken(refreshToken: string): void {
  getStorage().setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearRefreshToken(): void {
  getStorage().removeItem(REFRESH_TOKEN_STORAGE_KEY);
}
