if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-lifetop') throw Error('Only the demo-lifetop emulator project is allowed.');
await import('./rules.test.mjs');
await import('./chat.integration.mjs');
