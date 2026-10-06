/**
 * Creates test users in the Firebase Auth Emulator with UIDs that match
 * the API seed data (apps/api/src/db/seed.ts).
 *
 * Prerequisites:
 *   1. Java 17+ installed
 *   2. Firebase Auth Emulator running on localhost:9099
 *      (pnpm dlx firebase-tools emulators:start --only auth)
 *
 * Usage:
 *   node scripts/create-emulator-users.mjs
 */
import { generateKeyPairSync } from "node:crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gitiempo-dev";

// Point firebase-admin at the emulator.
process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_HOST;

// Generate a throwaway RSA key so firebase-admin's cert() can parse it.
// The emulator does not verify credentials — the key just needs to be
// structurally valid PEM.
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

initializeApp({
  credential: cert({
    projectId: PROJECT_ID,
    clientEmail: `dummy@${PROJECT_ID}.iam.gserviceaccount.com`,
    privateKey,
  }),
  projectId: PROJECT_ID,
});

const auth = getAuth();

const SEED_USERS = [
  { uid: "admin-uid", email: "admin@example.com", password: "password123", displayName: "Admin (seed)" },
  { uid: "seed-user-1", email: "alice@gitiempo.dev", password: "password123", displayName: "Alice (seed)" },
  { uid: "seed-user-2", email: "bob@gitiempo.dev", password: "password123", displayName: "Bob (seed)" },
  { uid: "seed-user-3", email: "carol@gitiempo.dev", password: "password123", displayName: "Carol (seed)" },
];

async function main() {
  for (const user of SEED_USERS) {
    try {
      await auth.createUser({
        uid: user.uid,
        email: user.email,
        password: user.password,
        displayName: user.displayName,
        emailVerified: true,
      });
      console.log(`  \u2713 ${user.email} (uid: ${user.uid})`);
    } catch (err) {
      if (err.code === "auth/email-already-exists" || err.code === "auth/uid-already-exists") {
        console.log(`  \u21bb ${user.email} already exists \u2014 skipping`);
      } else {
        throw err;
      }
    }
  }
  console.log("\nDone! You can now log in via the frontend with:");
  console.log("  admin@example.com / password123");
  console.log("  alice@gitiempo.dev / password123");
  console.log("  bob@gitiempo.dev / password123");
  console.log("  carol@gitiempo.dev / password123");
}

main().catch((err) => {
  console.error("Failed to create emulator users:", err);
  process.exit(1);
});
