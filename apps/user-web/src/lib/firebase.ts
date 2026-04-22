import { FirebaseError, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { FirebaseOptions } from "firebase/app";

function getFirebaseConfig(): FirebaseOptions | null {
  const {
    VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET,
  } = import.meta.env;

  if (
    !VITE_FIREBASE_API_KEY ||
    !VITE_FIREBASE_APP_ID ||
    !VITE_FIREBASE_AUTH_DOMAIN ||
    !VITE_FIREBASE_PROJECT_ID
  ) {
    return null;
  }

  return {
    apiKey: VITE_FIREBASE_API_KEY,
    appId: VITE_FIREBASE_APP_ID,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
    projectId: VITE_FIREBASE_PROJECT_ID,
    storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
  };
}

const firebaseConfig = getFirebaseConfig();
const firebaseApp = firebaseConfig ? initializeApp(firebaseConfig) : null;

export function hasFirebaseConfig(): boolean {
  return firebaseApp !== null;
}

export function getFirebaseAuth() {
  if (!firebaseApp) {
    throw new FirebaseError(
      "auth/missing-config",
      "Firebase Auth is not configured for apps/user-web.",
    );
  }

  return getAuth(firebaseApp);
}
