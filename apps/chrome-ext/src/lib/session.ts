/* global chrome */

import { tokenPairResponseSchema, type TokenPairResponse } from "@gitiempo/shared";


export const EXTENSION_SESSION_STORAGE_KEY = "gitiempo.extension.session";
/**
 * A credential-free reminder that Firebase's extension-local persistence still
 * needs cleanup. It intentionally stores only a boolean so reopening the popup
 * can offer a retry without restoring a GiTiempo or provider session.
 */
export const EXTENSION_PROVIDER_CLEANUP_PENDING_STORAGE_KEY =
  "gitiempo.extension.provider-cleanup-pending";

export interface StorageAreaLike {
  get(keys?: null | string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(keys: string | string[]): Promise<void>;
  set(items: Record<string, unknown>): Promise<void>;
}


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

export async function hasPendingProviderCleanup(
  storage: StorageAreaLike = getChromeStorageArea(),
): Promise<boolean> {
  const stored = await storage.get(EXTENSION_PROVIDER_CLEANUP_PENDING_STORAGE_KEY);
  const value = stored[EXTENSION_PROVIDER_CLEANUP_PENDING_STORAGE_KEY];

  if (value === true) {
    return true;
  }

  if (value !== undefined) {
    await storage.remove(EXTENSION_PROVIDER_CLEANUP_PENDING_STORAGE_KEY);
  }

  return false;
}

export async function setPendingProviderCleanup(
  storage: StorageAreaLike = getChromeStorageArea(),
): Promise<void> {
  await storage.set({ [EXTENSION_PROVIDER_CLEANUP_PENDING_STORAGE_KEY]: true });
}

export async function clearPendingProviderCleanup(
  storage: StorageAreaLike = getChromeStorageArea(),
): Promise<void> {
  await storage.remove(EXTENSION_PROVIDER_CLEANUP_PENDING_STORAGE_KEY);
}
