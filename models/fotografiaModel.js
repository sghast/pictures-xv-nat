import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

const COLECCION_FOTOGRAFIAS = 'fotografias';
const LIMITE_PREDETERMINADO = 50;
const LIMITE_MAXIMO = 100;

const CAMPOS_REQUERIDOS = [
  'nombreOriginal',
  'urlOriginal',
  'urlMiniatura',
  'publicId',
  'formato',
];

function validarLimite(limite) {
  if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO) {
    throw new RangeError(`El límite debe ser un entero entre 1 y ${LIMITE_MAXIMO}.`);
  }
}

function validarDatosFotografia(datosFotografia) {
  if (
    datosFotografia === null
    || typeof datosFotografia !== 'object'
    || Array.isArray(datosFotografia)
  ) {
    throw new TypeError('Los datos de la fotografía deben ser un objeto.');
  }

  for (const campo of CAMPOS_REQUERIDOS) {
    if (typeof datosFotografia[campo] !== 'string' || !datosFotografia[campo].trim()) {
      throw new TypeError(`El campo ${campo} es obligatorio y debe ser texto.`);
    }
  }

  if (!Number.isSafeInteger(datosFotografia.tamano) || datosFotografia.tamano < 0) {
    throw new TypeError('El campo tamano debe ser un entero no negativo.');
  }
}

export async function crearFotografia(datosFotografia) {
  validarDatosFotografia(datosFotografia);

  const referencia = await db.collection(COLECCION_FOTOGRAFIAS).add({
    nombreOriginal: datosFotografia.nombreOriginal.trim(),
    urlOriginal: datosFotografia.urlOriginal.trim(),
    urlMiniatura: datosFotografia.urlMiniatura.trim(),
    publicId: datosFotografia.publicId.trim(),
    fechaSubida: FieldValue.serverTimestamp(),
    formato: datosFotografia.formato.trim(),
    tamano: datosFotografia.tamano,
  });

  const documento = await referencia.get();

  return {
    id: documento.id,
    ...documento.data(),
  };
}

export async function listarFotografias(limite = LIMITE_PREDETERMINADO) {
  validarLimite(limite);

  const resultado = await db
    .collection(COLECCION_FOTOGRAFIAS)
    .orderBy('fechaSubida', 'desc')
    .limit(limite)
    .get();

  return resultado.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}

export async function obtenerFotografiaPorId(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new TypeError('El ID de la fotografía debe ser un texto no vacío.');
  }

  const documento = await db.collection(COLECCION_FOTOGRAFIAS).doc(id).get();

  if (!documento.exists) {
    return null;
  }

  return {
    id: documento.id,
    ...documento.data(),
  };
}
