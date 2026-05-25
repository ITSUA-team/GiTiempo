import { describe, expect, it } from "vitest";

import {
  clearStoredSession,
  EXTENSION_SESSION_STORAGE_KEY,
  getStoredSession,
  setStoredSession,
  type StorageAreaLike,
} from "./session";

function createStorage(initialValue?: unknown): {
  data: Record<string, unknown>;
  storage: StorageAreaLike;
} {
  const data: Record<string, unknown> = initialValue
    ? { [EXTENSION_SESSION_STORAGE_KEY]: initialValue }
    : {};

  return {
    data,
    storage: {
      async get() {
        return data;
      },
      async remove(keys) {
        const values = Array.isArray(keys) ? keys : [keys];

        for (const key of values) {
          delete data[key];
        }
      },
      async set(items) {
        Object.assign(data, items);
      },
    },
  };
}

describe("extension session storage", () => {
  it("stores and loads token pairs from chrome.storage", async () => {
    const { storage } = createStorage();

    await setStoredSession(
      {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
      storage,
    );

    await expect(getStoredSession(storage)).resolves.toEqual({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token",
    });
  });

  it("clears invalid stored session payloads", async () => {
    const { data, storage } = createStorage({ accessToken: "broken" });

    await expect(getStoredSession(storage)).resolves.toBeNull();
    expect(data).toEqual({});
  });

  it("removes the stored session", async () => {
    const { data, storage } = createStorage({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token",
    });

    await clearStoredSession(storage);

    expect(data).toEqual({});
  });
});
