import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type UserConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

const GECKO_MIN_VERSION = "112.0";

type ExtensionTarget = "chrome" | "firefox";

function resolveTarget(): ExtensionTarget {
  return process.env.EXT_TARGET === "firefox" ? "firefox" : "chrome";
}

function normalizeBaseUrl(value: string | undefined): string {
  return value?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

function getRequiredEnvValue(value: string | undefined, key: string): string {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    throw new Error(`Missing required extension environment variable: ${key}`);
  }

  return trimmed;
}

function buildManifest(mode: string): Record<string, unknown> {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = new URL(
    normalizeBaseUrl(env.VITE_EXTENSION_API_BASE_URL),
  ).origin;
  const extensionKey = env.VITE_EXTENSION_KEY?.trim();
  const geckoExtensionId = getRequiredEnvValue(
    env.VITE_EXTENSION_GECKO_ID,
    "VITE_EXTENSION_GECKO_ID",
  );

  getRequiredEnvValue(
    env.VITE_EXTENSION_GOOGLE_CLIENT_ID,
    "VITE_EXTENSION_GOOGLE_CLIENT_ID",
  );

  return {
    manifest_version: 3,
    name: "GiTiempo",
    ...(extensionKey ? { "{{chrome}}.key": extensionKey } : {}),
    version: "0.0.0",
    description:
      "Track GiTiempo timers directly from supported GitHub issue surfaces.",
    permissions: ["identity", "storage", "tabs"],
    host_permissions: [`${apiOrigin}/*`, "https://github.com/*"],
    "{{firefox}}.browser_specific_settings": {
      gecko: {
        id: geckoExtensionId,
        strict_min_version: GECKO_MIN_VERSION,
        data_collection_permissions: {
          required: ["websiteActivity"],
        },
      },
    },
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png",
    },
    action: {
      default_icon: {
        16: "icons/icon-16.png",
        32: "icons/icon-32.png",
      },
      default_popup: "popup.html",
    },
    "{{chrome}}.background": {
      service_worker: "src/background/main.ts",
      type: "module",
    },
    "{{firefox}}.background": {
      scripts: ["src/background/main.ts"],
      type: "module",
    },
    content_scripts: [
      {
        matches: [
          "https://github.com/*/*/issues/*",
          "https://github.com/*/*/pull/*",
          "https://github.com/orgs/*/projects/*",
        ],
        js: ["src/content/main.ts"],
        run_at: "document_idle",
      },
    ],
  };
}

export default defineConfig(({ mode }): UserConfig => {
  const browser = resolveTarget();

  return {
    build: {
      emptyOutDir: true,
      outDir: `dist/${browser}`,
    },
    define: {
      "import.meta.env.VITE_EXTENSION_BROWSER": JSON.stringify(browser),
    },
    plugins: [
      tailwindcss(),
      webExtension({
        browser,
        disableAutoLaunch: true,
        manifest: () => buildManifest(mode),
      }),
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
  };
});
