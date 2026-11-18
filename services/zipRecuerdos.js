import { finished } from 'node:stream/promises';
import { ZipArchive } from 'archiver';

function esperarEntrada(archive, stream, nombre, signal) {
  return new Promise((resolve, reject) => {
    const limpiar = () => {
      archive.off('entry', alCompletar);
      archive.off('error', alFallar);
      archive.off('warning', alFallar);
      stream.off('error', alFallar);
      signal?.removeEventListener('abort', alAbortar);
    };

    const alCompletar = (entrada) => {
      if (entrada.name !== nombre) {
        return;
      }

      limpiar();
      resolve();
    };

    const alFallar = (error) => {
      limpiar();
      reject(error);
    };

    const alAbortar = () => {
      limpiar();
      reject(new Error('La descarga del archivo ZIP fue interrumpida.'));
    };

    archive.on('entry', alCompletar);
    archive.once('error', alFallar);
    archive.once('warning', alFallar);
    stream.once('error', alFallar);
    signal?.addEventListener('abort', alAbortar, { once: true });

    if (signal?.aborted) {
      alAbortar();
      return;
    }

    archive.append(stream, { name: nombre });
  });
}

function esperarFinalizacion(archive) {
  return new Promise((resolve, reject) => {
    const limpiar = () => {
      archive.off('end', alCompletar);
      archive.off('error', alFallar);
      archive.off('warning', alFallar);
    };

    const alCompletar = () => {
      limpiar();
      resolve();
    };

    const alFallar = (error) => {
      limpiar();
      reject(error);
    };

    archive.once('end', alCompletar);
    archive.once('error', alFallar);
    archive.once('warning', alFallar);
  });
}

export async function transmitirZipRecuerdos({ entradas, destino, signal }) {
  const archive = new ZipArchive({
    forceZip64: true,
    zlib: { level: 0 },
  });
  archive.pipe(destino);

  const destinoFinalizado = finished(destino);
  destinoFinalizado.catch((error) => archive.destroy(error));

  let errorArchivador;
  archive.on('error', (error) => {
    errorArchivador ??= error;
  });

  const alAbortar = () => archive.destroy(new Error('La descarga del archivo ZIP fue interrumpida.'));
  signal?.addEventListener('abort', alAbortar, { once: true });

  let cantidadEntradas = 0;

  try {
    for await (const entrada of entradas) {
      if (
        !entrada
        || typeof entrada.nombre !== 'string'
        || !entrada.nombre
        || !entrada.stream
        || typeof entrada.stream.pipe !== 'function'
      ) {
        throw new TypeError('La entrada del archivo ZIP no es válida.');
      }

      if (signal?.aborted) {
        throw new Error('La descarga del archivo ZIP fue interrumpida.');
      }

      await esperarEntrada(archive, entrada.stream, entrada.nombre, signal);
      cantidadEntradas += 1;
    }

    if (errorArchivador) {
      throw errorArchivador;
    }

    const archivoFinalizado = esperarFinalizacion(archive);
    await Promise.all([archive.finalize(), archivoFinalizado]);
    await destinoFinalizado;

    return cantidadEntradas;
  } catch (error) {
    archive.unpipe(destino);
    archive.abort();
    throw error;
  } finally {
    signal?.removeEventListener('abort', alAbortar);
  }
}

