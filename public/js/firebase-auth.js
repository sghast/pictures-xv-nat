import { firebaseWebConfig } from './firebase-web-config.js';

const firebaseSdkVersion = '13.2.0';
const firebaseSdkBaseUrl = `https://www.gstatic.com/firebasejs/${firebaseSdkVersion}`;
const requiredConfigFields = ['apiKey', 'authDomain', 'projectId', 'appId'];

let firebaseAuthPromise;

export function isFirebaseWebConfigured() {
  return requiredConfigFields.every((field) => (
    typeof firebaseWebConfig[field] === 'string'
    && firebaseWebConfig[field].trim().length > 0
  ));
}

async function getFirebaseAuth() {
  if (!isFirebaseWebConfigured()) {
    throw new Error('La configuración de Firebase Web está incompleta.');
  }

  if (!firebaseAuthPromise) {
    firebaseAuthPromise = Promise.all([
      import(`${firebaseSdkBaseUrl}/firebase-app.js`),
      import(`${firebaseSdkBaseUrl}/firebase-auth.js`),
    ])
      .then(([firebaseAppSdk, firebaseAuthSdk]) => {
        const existingApp = firebaseAppSdk.getApps().find((app) => app.name === '[DEFAULT]');
        const app = existingApp ?? firebaseAppSdk.initializeApp(firebaseWebConfig);

        return {
          auth: firebaseAuthSdk.getAuth(app),
          sdk: firebaseAuthSdk,
        };
      })
      .catch((error) => {
        firebaseAuthPromise = undefined;
        throw error;
      });
  }

  return firebaseAuthPromise;
}

export async function iniciarSesionAdministrador(correo, contrasena) {
  const { auth, sdk } = await getFirebaseAuth();

  await sdk.setPersistence(auth, sdk.browserSessionPersistence);

  const credencial = await sdk.signInWithEmailAndPassword(auth, correo, contrasena);
  return credencial.user.getIdToken();
}

export async function obtenerTokenAdministrador(forceRefresh = false) {
  const { auth } = await getFirebaseAuth();
  const usuarioActual = auth.currentUser;

  if (!usuarioActual) {
    throw new Error('No hay una sesión de administrador iniciada.');
  }

  return usuarioActual.getIdToken(forceRefresh);
}
