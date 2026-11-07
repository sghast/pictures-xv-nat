import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';

const COLECCION_FOTOGRAFIAS = 'fotografias';
const LIMITE_PREDETERMINADO = 50;
const LIMITE_MAXIMO = 100;
const LIMITE_PAGINA_ADMINISTRACION = 50;

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

export async function listarFotografiasPaginadas({ limite = 20, cursor } = {}) {
  if (!Number.isInteger(limite) || limite < 1 || limite > LIMITE_PAGINA_ADMINISTRACION) {
    throw new RangeError(
      `El límite de página debe ser un entero entre 1 y ${LIMITE_PAGINA_ADMINISTRACION}.`,
    );
  }

  let consulta = db
    .collection(COLECCION_FOTOGRAFIAS)
    .orderBy('fechaSubida', 'desc');

  if (cursor !== undefined) {
    if (typeof cursor !== 'string' || !cursor.trim() || cursor.includes('/')) {
      throw new TypeError('El cursor de paginación no es válido.');
    }

    const documentoCursor = await db
      .collection(COLECCION_FOTOGRAFIAS)
      .doc(cursor)
      .get();

    if (!documentoCursor.exists) {
      return null;
    }

    consulta = consulta.startAfter(documentoCursor);
  }

  const resultado = await consulta.limit(limite + 1).get();
  const hayMas = resultado.docs.length > limite;
  const documentosPagina = resultado.docs.slice(0, limite);

  return {
    fotografias: documentosPagina.map((documento) => ({
      id: documento.id,
      ...documento.data(),
    })),
    siguienteCursor: hayMas
      ? documentosPagina[documentosPagina.length - 1].id
      : null,
  };
}

export async function obtenerEstadisticasFotografias() {
  const referenciaColeccion = db.collection(COLECCION_FOTOGRAFIAS);
  const [resultadoConteo, resultadoUltimaFotografia] = await Promise.all([
    referenciaColeccion.count().get(),
    referenciaColeccion
      .orderBy('fechaSubida', 'desc')
      .limit(1)
      .get(),
  ]);
  const ultimaFotografia = resultadoUltimaFotografia.docs[0];

  return {
    totalFotografias: resultadoConteo.data().count,
    fechaUltimaSubida: ultimaFotografia?.get('fechaSubida') ?? null,
  };
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

export async function eliminarFotografiaPorId(id) {
  if (typeof id !== 'string' || !id.trim() || id.includes('/')) {
    throw new TypeError('El ID de la fotografía debe ser un texto no vacío.');
  }

  const referencia = db.collection(COLECCION_FOTOGRAFIAS).doc(id);

  return db.runTransaction(async (transaccion) => {
    const documento = await transaccion.get(referencia);

    if (!documento.exists) {
      return false;
    }

    transaccion.delete(referencia);
    return true;
  });
}
