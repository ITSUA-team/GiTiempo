interface ImportMetaEnv {
  readonly VITE_EXTENSION_API_BASE_URL?: string;
  readonly VITE_EXTENSION_FIREBASE_API_KEY?: string;
  readonly VITE_EXTENSION_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_EXTENSION_FIREBASE_PROJECT_ID?: string;
  readonly VITE_EXTENSION_USER_SPA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
