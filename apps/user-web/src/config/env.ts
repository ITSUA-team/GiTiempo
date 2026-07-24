export interface UserWebEnv {
  adminAppUrl?: string;
  apiBaseUrl?: string;
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
  // GitHub sign-in shows by default. Set VITE_GITHUB_SIGNIN_ENABLED=false to hide
  // the button in environments where the Firebase GitHub provider is not yet
  // configured. The OAuth App credentials live in the Firebase console, not here.
  get githubSignInEnabled() {
    return import.meta.env.VITE_GITHUB_SIGNIN_ENABLED !== "false";
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
