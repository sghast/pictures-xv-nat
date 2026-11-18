import { Readable } from 'node:stream';
import cloudinary from '../config/cloudinary.js';
import { iterarFotografiasParaDescarga } from '../models/fotografiaModel.js';
import { transmitirZipRecuerdos } from './zipRecuerdos.js';

const FORMATOS_ORIGINALES = new Map([
  ['jpg', { extension: 'jpg', mime: 'image/jpeg' }],
  ['jpeg', { extension: 'jpg', mime: 'image/jpeg' }],
  ['png', { extension: 'png', mime: 'image/png' }],
  ['webp', { extension: 'webp', mime: 'image/webp' }],
]);

function obtenerFormato(formato) {
  if (typeof formato !== 'string') {
    throw new TypeError('El formato de una fotografía no es válido.');
  }

  const configuracion = FORMATOS_ORIGINALES.get(formato.toLowerCase());
  if (!configuracion) {
    throw new TypeError('El formato de una fotografía no está permitido.');
  }

  return configuracion;
}

function crearNombreEntrada(fotografia, indice, extension) {
  const nombreOriginal = typeof fotografia.nombreOriginal === 'string'
    ? fotografia.nombreOriginal
    : '';
  const nombreBase = nombreOriginal
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\.[^.]*$/, '')
    .replace(/[<>:"|?*]/g, '_')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 100);

  return `${String(indice).padStart(4, '0')}-${nombreBase || 'fotografia'}.${extension}`;
}

function crearUrlOriginal(publicId, formato) {
  if (typeof publicId !== 'string' || !publicId.trim()) {
    throw new TypeError('Una fotografía no tiene identificador de almacenamiento.');
  }

  const url = new URL(cloudinary.url(publicId, {
    secure: true,
    resource_type: 'image',
    type: 'upload',
    format: formato.extension,
  }));
  const nombreNube = cloudinary.config().cloud_name;

  if (
    url.protocol !== 'https:'
    || url.hostname !== 'res.cloudinary.com'
    || !nombreNube
    || !url.pathname.startsWith(`/${nombreNube}/image/upload/`)
  ) {
    throw new Error('No se pudo construir una URL válida para el original.');
  }

  return url.href;
}

async function obtenerStreamOriginal(fotografia, formato, signal) {
  const url = crearUrlOriginal(fotografia.publicId, formato);
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 120_000);
  const cancelarPorCliente = () => controlador.abort();
  signal?.addEventListener('abort', cancelarPorCliente, { once: true });

  const limpiar = () => {
    clearTimeout(temporizador);
    signal?.removeEventListener('abort', cancelarPorCliente);
  };

  try {
    const respuesta = await fetch(url, {
      signal: controlador.signal,
      redirect: 'error',
    });

    if (!respuesta.ok || !respuesta.body) {
      await respuesta.body?.cancel();
      limpiar();
      throw new Error('Cloudinary no pudo entregar una fotografía original.');
    }

    const tipoContenido = respuesta.headers.get('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase();

    if (tipoContenido !== formato.mime) {
      await respuesta.body.cancel();
      limpiar();
      throw new Error('Cloudinary devolvió un formato de imagen inesperado.');
    }

    const stream = Readable.fromWeb(respuesta.body);
    stream.once('end', limpiar);
    stream.once('close', limpiar);
    stream.once('error', limpiar);
    return stream;
  } catch (error) {
    limpiar();
    throw error;
  }
}

async function* crearEntradas(signal) {
  let indice = 0;

  for await (const fotografia of iterarFotografiasParaDescarga()) {
    const formato = obtenerFormato(fotografia.formato);
    indice += 1;

    yield {
      nombre: crearNombreEntrada(fotografia, indice, formato.extension),
      stream: await obtenerStreamOriginal(fotografia, formato, signal),
    };
  }
}

export function transmitirRecuerdosZip(destino, signal) {
  return transmitirZipRecuerdos({
    entradas: crearEntradas(signal),
    destino,
    signal,
  });
}
