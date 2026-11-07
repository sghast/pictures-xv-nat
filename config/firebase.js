import 'dotenv/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
  throw new Error('Falta la variable de entorno GOOGLE_APPLICATION_CREDENTIALS.');
}

const existingDefaultApp = getApps().find((app) => app.name === '[DEFAULT]');

export const firebaseApp = existingDefaultApp ?? initializeApp({
  credential: applicationDefault(),
});

export const db = getFirestore(firebaseApp);

export default db;
