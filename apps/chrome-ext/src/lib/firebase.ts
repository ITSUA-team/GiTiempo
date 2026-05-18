import { FirebaseError, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { getExtensionConfig, hasFirebaseConfig } from "./config";

const extensionConfig = getExtensionConfig();
const firebaseConfig = extensionConfig.firebase;
const firebaseApp = hasFirebaseConfig(extensionConfig) && firebaseConfig
  ? initializeApp(firebaseConfig)
  : null;

function getFirebaseAuth() {
  if (!firebaseApp) {
    throw new FirebaseError(
      "auth/missing-config",
      "Firebase Auth is not configured for apps/chrome-ext.",
    );
  }

  return getAuth(firebaseApp);
}

export async function signInWithGoogle(): Promise<string> {
  const provider = new GoogleAuthProvider();

  provider.addScope("profile");
  provider.addScope("email");

  const credential = await signInWithPopup(getFirebaseAuth(), provider);

  return credential.user.getIdToken();
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<string> {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );

  return credential.user.getIdToken();
}
