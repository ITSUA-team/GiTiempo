export interface AdminWebEnv {
  apiBaseUrl?: string;
  firebase: {
    apiKey?: string;
    appId?: string;
    authDomain?: string;
    messagingSenderId?: string;
    projectId?: string;
    storageBucket?: string;
  };
  githubAppInstallUrl?: string;
  userAppUrl?: string;
}

export const appEnv: AdminWebEnv = {
  get apiBaseUrl() {
    return import.meta.env.VITE_API_BASE_URL;
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
  get userAppUrl() {
    return import.meta.env.VITE_USER_APP_URL;
  },
  get githubAppInstallUrl() {
    return import.meta.env.VITE_GITHUB_APP_INSTALL_URL;
  },
};
