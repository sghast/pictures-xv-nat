import 'dotenv/config';

const requiredVariables = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missingVariables = requiredVariables.filter(
  (variableName) => !process.env[variableName]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(`Faltan estas variables de entorno: ${missingVariables.join(', ')}`);
  process.exitCode = 1;
} else {
  let firebaseModule;
  let cloudinaryModule;
  let hasFailures = false;

  try {
    firebaseModule = await import('../config/firebase.js');
  } catch (error) {
    hasFailures = true;
    console.error(`Firebase: no se pudo inicializar${error.code ? ` (${error.code})` : ''}.`);
  }

  try {
    cloudinaryModule = await import('../config/cloudinary.js');
  } catch (error) {
    hasFailures = true;
    console.error(`Cloudinary: no se pudo inicializar${error.code ? ` (${error.code})` : ''}.`);
  }

  const checks = [];

  if (firebaseModule) {
    checks.push(async () => {
      try {
        await firebaseModule.db.collection('fotografias').limit(1).get();
        console.log('Firebase: conexión correcta; consulta de solo lectura completada.');
      } catch (error) {
        hasFailures = true;
        console.error(`Firebase: falló la consulta de Firestore${error.code ? ` (${error.code})` : ''}.`);
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
      } catch (error) {
        hasFailures = true;
        console.error(`Cloudinary: falló la comprobación de la API${error.http_code ? ` (HTTP ${error.http_code})` : ''}.`);
      }
    });
  }

  await Promise.all(checks.map((check) => check()));

  if (hasFailures) {
    process.exitCode = 1;
  }
}
