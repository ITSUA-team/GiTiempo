import admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'gitiempo-dev',
});

const auth = admin.auth();

const SEED_USERS = [
  { uid: 'admin-uid', email: 'admin@example.com', password: 'password123', displayName: 'Admin (seed)' },
  { uid: 'seed-user-1', email: 'alice@gitiempo.dev', password: 'password123', displayName: 'Alice (seed)' },
  { uid: 'seed-user-2', email: 'bob@gitiempo.dev', password: 'password123', displayName: 'Bob (seed)' },
  { uid: 'seed-user-3', email: 'carol@gitiempo.dev', password: 'password123', displayName: 'Carol (seed)' },
  { uid: '5EU7Psf9HfeBoyq9qb91fHhj5jg2', email: 'gitiempo@itsua.com', password: 'password123', displayName: 'Admin gitempo' },
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
      console.log(`Created: ${user.email} (uid: ${user.uid})`);
    } catch (err: unknown) {
      const code = (err as { errorInfo?: { code?: string } }).errorInfo?.code;
      if (code === 'auth/uid-already-exists') {
        await auth.updateUser(user.uid, {
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });
        console.log(`Updated: ${user.email} (uid: ${user.uid})`);
      } else if (code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(user.email);
        await auth.deleteUser(existing.uid);
        await auth.createUser({
          uid: user.uid,
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          emailVerified: true,
        });
        console.log(`Replaced: ${user.email} (uid: ${user.uid}, was ${existing.uid})`);
      } else {
        throw err;
      }
    }
  }
  console.log('Firebase emulator users seeded.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});