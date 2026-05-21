import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

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

function createManifestPlugin(mode: string): Plugin {
  return {
    apply: "build",
    name: "gitiempo-extension-manifest",
    generateBundle() {
      const env = loadEnv(mode, process.cwd(), "");
      const apiOrigin = new URL(
        normalizeBaseUrl(env.VITE_EXTENSION_API_BASE_URL),
      ).origin;
      const googleClientId = getRequiredEnvValue(
        env.VITE_EXTENSION_GOOGLE_CLIENT_ID,
        "VITE_EXTENSION_GOOGLE_CLIENT_ID",
      );

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(
          {
            manifest_version: 3,
            name: "GiTiempo",
            version: "0.0.0",
            description:
              "Track GiTiempo timers directly from GitHub issue pages.",
            permissions: ["identity", "storage", "tabs"],
            host_permissions: [`${apiOrigin}/*`, "https://github.com/*"],
            oauth2: {
              client_id: googleClientId,
              scopes: ["openid", "email", "profile"],
            },
            action: {
              default_popup: "popup.html",
            },
            background: {
              service_worker: "background.js",
              type: "module",
            },
            content_scripts: [
              {
                matches: [
                  "https://github.com/*/*/issues/*",
                  "https://github.com/*/*/pull/*",
                ],
                js: ["content.js"],
                run_at: "document_idle",
              },
            ],
          },
          null,
          2,
        ),
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  appType: "custom",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/main.ts"),
        popup: resolve(__dirname, "popup.html"),
      },
      output: {
        assetFileNames: "assets/[name][extname]",
        chunkFileNames: "chunks/[name].js",
        entryFileNames: "[name].js",
      },
    },
  },
  plugins: [tailwindcss(), createManifestPlugin(mode)],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
}));
