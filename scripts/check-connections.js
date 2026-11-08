import 'dotenv/config';

const requiredCloudinaryVariables = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missingCloudinaryVariables = requiredCloudinaryVariables.filter(
  (variableName) => !process.env[variableName]?.trim(),
);

let firebaseModule;
let cloudinaryModule;
let hasFailures = false;

try {
  firebaseModule = await import('../config/firebase.js');
} catch {
  hasFailures = true;
  console.error('Firebase: no se pudo inicializar con las credenciales disponibles.');
}

if (missingCloudinaryVariables.length > 0) {
  hasFailures = true;
  console.error(
    `Faltan estas variables de entorno para Cloudinary: ${missingCloudinaryVariables.join(', ')}`,
  );
} else {
  try {
    cloudinaryModule = await import('../config/cloudinary.js');
  } catch {
    hasFailures = true;
    console.error('Cloudinary: no se pudo inicializar con las credenciales disponibles.');
  }
}

const checks = [];

if (firebaseModule) {
  checks.push(async () => {
    try {
      await firebaseModule.db.collection('fotografias').limit(1).get();
      console.log('Firebase: conexión correcta; consulta de solo lectura completada.');
    } catch {
      hasFailures = true;
      console.error('Firebase: falló la consulta de solo lectura a Firestore.');
    }
  });
}

if (cloudinaryModule) {
  checks.push(async () => {
    try {
      const result = await cloudinaryModule.default.api.ping();
      if (result.status !== 'ok') {
        throw new Error('Respuesta inesperada de Cloudinary.');
      }
      console.log('Cloudinary: conexión correcta; API ping completado.');
    } catch {
      hasFailures = true;
      console.error('Cloudinary: falló la comprobación de solo lectura de la API.');
    }
  });
}

await Promise.all(checks.map((check) => check()));

if (hasFailures) {
  process.exitCode = 1;
}
