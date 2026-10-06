import { FirebaseError, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";

import { appEnv } from "@/config/env";

function getFirebaseConfig(): FirebaseOptions | null {
  const {
    apiKey,
    appId,
    authDomain,
    messagingSenderId,
    projectId,
    storageBucket,
  } = appEnv.firebase;

  if (
    !apiKey ||
    !appId ||
    !authDomain ||
    !projectId
  ) {
    return null;
  }

  return {
    apiKey,
    appId,
    authDomain,
    messagingSenderId,
    projectId,
    storageBucket,
  };
}

let firebaseApp: FirebaseApp | null | undefined;
let emulatorConnected = false;

function getFirebaseApp(): FirebaseApp | null {
  if (firebaseApp !== undefined) {
    return firebaseApp;
  }

  const firebaseConfig = getFirebaseConfig();

  firebaseApp = firebaseConfig ? initializeApp(firebaseConfig) : null;

  return firebaseApp;
}

export function hasFirebaseConfig(): boolean {
  return getFirebaseApp() !== null;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();

  if (!app) {
    throw new FirebaseError(
      "auth/missing-config",
      "Firebase Auth is not configured for apps/user-web.",
    );
  }

  const auth = getAuth(app);

  const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost && !emulatorConnected) {
    connectAuthEmulator(auth, `http://${emulatorHost}`, {
      disableWarnings: true,
    });
    emulatorConnected = true;
  }

  return auth;
}
