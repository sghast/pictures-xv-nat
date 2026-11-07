import { getAuth } from 'firebase-admin/auth';
import { firebaseApp } from '../config/firebase.js';

const autenticacion = getAuth(firebaseApp);

export async function autenticarAdministrador(req, res, next) {
  const encabezadoAutorizacion = req.get('authorization');
  const coincidencia = typeof encabezadoAutorizacion === 'string'
    ? encabezadoAutorizacion.trim().match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!coincidencia) {
    return res.status(401).json({
      error: 'Se requiere un token de autenticación válido.',
    });
  }

  let tokenVerificado;

  try {
    tokenVerificado = await autenticacion.verifyIdToken(coincidencia[1]);
  } catch {
    return res.status(401).json({
      error: 'Se requiere un token de autenticación válido.',
    });
  }

  if (typeof tokenVerificado?.uid !== 'string') {
    return res.status(401).json({
      error: 'Se requiere un token de autenticación válido.',
    });
  }

  const adminUid = process.env.ADMIN_UID;

  if (!adminUid?.trim()) {
    return res.status(500).json({
      error: 'La autenticación administrativa no está configurada.',
    });
  }

  if (tokenVerificado.uid !== adminUid) {
    return res.status(403).json({
      error: 'No tienes permisos para realizar esta operación.',
    });
  }

  return next();
}
