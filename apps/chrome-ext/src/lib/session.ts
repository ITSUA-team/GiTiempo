/* global chrome */

import { tokenPairResponseSchema, type TokenPairResponse } from "@gitiempo/shared";

/* eslint-disable no-unused-vars */

export const EXTENSION_SESSION_STORAGE_KEY = "gitiempo.extension.session";

export interface StorageAreaLike {
  get(keys?: null | string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(keys: string | string[]): Promise<void>;
  set(items: Record<string, unknown>): Promise<void>;
}

/* eslint-enable no-unused-vars */

export function getChromeStorageArea(): StorageAreaLike {
  return chrome.storage.local;
}

export async function getStoredSession(
  storage: StorageAreaLike = getChromeStorageArea(),
): Promise<TokenPairResponse | null> {
  const stored = await storage.get(EXTENSION_SESSION_STORAGE_KEY);
  const parsed = tokenPairResponseSchema.safeParse(
    stored[EXTENSION_SESSION_STORAGE_KEY],
  );

  if (!parsed.success) {
    await storage.remove(EXTENSION_SESSION_STORAGE_KEY);
    return null;
  }

  return parsed.data;
}

export async function setStoredSession(
  tokenPair: TokenPairResponse,
  storage: StorageAreaLike = getChromeStorageArea(),
): Promise<void> {
  await storage.set({
    [EXTENSION_SESSION_STORAGE_KEY]: tokenPairResponseSchema.parse(tokenPair),
  });
}

export async function clearStoredSession(
  storage: StorageAreaLike = getChromeStorageArea(),
): Promise<void> {
  await storage.remove(EXTENSION_SESSION_STORAGE_KEY);
}
