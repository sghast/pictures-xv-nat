import 'dotenv/config';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function obtenerCredencialFirebase() {
  const cuentaServicioJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  if (!cuentaServicioJson) {
    return applicationDefault();
  }

  try {
    return cert(JSON.parse(cuentaServicioJson));
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON debe contener credenciales de servicio válidas en formato JSON.',
    );
  }
}

const existingDefaultApp = getApps().find((app) => app.name === '[DEFAULT]');

export const firebaseApp = existingDefaultApp ?? initializeApp({
  credential: obtenerCredencialFirebase(),
});

export const db = getFirestore(firebaseApp);

export default db;
