export interface UserWebEnv {
  adminAppUrl?: string;
  apiBaseUrl?: string;
  extensionInstallUrl?: string;
  githubSignInEnabled: boolean;
  firebase: {
    apiKey?: string;
    appId?: string;
    authDomain?: string;
    messagingSenderId?: string;
    projectId?: string;
    storageBucket?: string;
  };
}

export const appEnv: UserWebEnv = {
  get adminAppUrl() {
    return import.meta.env.VITE_ADMIN_APP_URL;
  },
  get apiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL;
  },
  get extensionInstallUrl() {
    // Where the login callout sends users to get the browser extension.
    // Unset hides the callout rather than linking nowhere.
    return import.meta.env.VITE_EXTENSION_INSTALL_URL;
  },

  get githubSignInEnabled() {
    // Default on: a deployment is expected to wire the backend GITHUB_SIGNIN_*
    // secrets, so the flag exists to hide the button where GitHub sign-in is
    // deliberately unwanted (VITE_GITHUB_SIGNIN_ENABLED='false').
    return import.meta.env.VITE_GITHUB_SIGNIN_ENABLED !== 'false';
  },
  firebase: {
    get apiKey() {
      return import.meta.env.VITE_FIREBASE_API_KEY;
    },
    get appId() {
      return import.meta.env.VITE_FIREBASE_APP_ID;
    },
    get authDomain() {
      return import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
    },
    get messagingSenderId() {
      return import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
    },
    get projectId() {
      return import.meta.env.VITE_FIREBASE_PROJECT_ID;
    },
    get storageBucket() {
      return import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
    },
  },
};
