import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const ENDPOINT = 'https://pictures-xv-nat-test.onrender.com/api/fotografias';
const CAMPO_ARCHIVO = 'fotografia';
const TAMANO_MAXIMO = 10 * 1024 * 1024;
const SOLICITUDES_PREDETERMINADAS = 2;
const CONCURRENCIA_PREDETERMINADA = 2;
const SOLICITUDES_MAXIMAS = 15;
const CONCURRENCIA_MAXIMA = 5;

const FORMATOS_PERMITIDOS = new Map([
  ['.jpg', { extension: '.jpg', mime: 'image/jpeg' }],
  ['.jpeg', { extension: '.jpg', mime: 'image/jpeg' }],
  ['.png', { extension: '.png', mime: 'image/png' }],
  ['.webp', { extension: '.webp', mime: 'image/webp' }],
]);

function mostrarUso() {
  console.log(`Uso:
  node scripts/load-test.js <ruta-fotografia> [--requests <1-${SOLICITUDES_MAXIMAS}>] [--concurrency <1-${CONCURRENCIA_MAXIMA}>]

Valores predeterminados: ${SOLICITUDES_PREDETERMINADAS} solicitudes y concurrencia ${CONCURRENCIA_PREDETERMINADA}.
Destino fijo: ${ENDPOINT}
Formatos permitidos: JPEG, PNG y WebP; tamaño máximo: 10 MB.`);
}

function leerArgumentos(argumentos) {
  let rutaFotografia;
  let solicitudes = SOLICITUDES_PREDETERMINADAS;
  let concurrencia = CONCURRENCIA_PREDETERMINADA;

  for (let indice = 0; indice < argumentos.length; indice += 1) {
    const argumento = argumentos[indice];

    if (argumento === '--help' || argumento === '-h') {
      return { ayuda: true };
    }

    if (argumento === '--requests' || argumento === '--concurrency') {
      const valor = argumentos[indice + 1];
      if (valor === undefined || !/^[1-9]\d*$/.test(valor)) {
        throw new Error(`El valor de ${argumento} debe ser un entero positivo.`);
      }

      if (argumento === '--requests') {
        solicitudes = Number(valor);
      } else {
        concurrencia = Number(valor);
      }

      indice += 1;
      continue;
    }

    if (argumento.startsWith('-')) {
      throw new Error(`Opción desconocida: ${argumento}`);
    }

    if (rutaFotografia !== undefined) {
      throw new Error('Indica una sola ruta de fotografía.');
    }

    rutaFotografia = argumento;
  }

  if (!rutaFotografia) {
    throw new Error('Debes indicar la ruta de una fotografía local.');
  }

  if (solicitudes > SOLICITUDES_MAXIMAS) {
    throw new Error(`El máximo permitido es ${SOLICITUDES_MAXIMAS} solicitudes por ejecución.`);
  }

  if (concurrencia > CONCURRENCIA_MAXIMA) {
    throw new Error(`El máximo permitido es una concurrencia de ${CONCURRENCIA_MAXIMA}.`);
  }

  return {
    ayuda: false,
    rutaFotografia: path.resolve(rutaFotografia),
    solicitudes,
    concurrencia: Math.min(concurrencia, solicitudes),
  };
}

async function cargarFotografia(rutaFotografia) {
  const formato = FORMATOS_PERMITIDOS.get(path.extname(rutaFotografia).toLowerCase());
  if (!formato) {
    throw new Error('La extensión debe corresponder a JPEG, PNG o WebP.');
  }

  const informacion = await stat(rutaFotografia);
  if (!informacion.isFile() || informacion.size === 0) {
    throw new Error('La ruta debe apuntar a un archivo de fotografía no vacío.');
  }

  if (informacion.size > TAMANO_MAXIMO) {
    throw new Error('La fotografía supera el límite de 10 MB.');
  }

  return {
    contenido: await readFile(rutaFotografia),
    formato,
  };
}

async function enviarFotografia(contenido, formato, numero, idEjecucion) {
  const nombreArchivo = `LOADTEST-${idEjecucion}-${String(numero).padStart(2, '0')}${formato.extension}`;
  const formulario = new FormData();
  formulario.append(
    CAMPO_ARCHIVO,
    new Blob([contenido], { type: formato.mime }),
    nombreArchivo,
  );

  const inicio = performance.now();

  try {
    const respuesta = await fetch(ENDPOINT, {
      method: 'POST',
      body: formulario,
      signal: AbortSignal.timeout(120_000),
    });
    const duracionMs = performance.now() - inicio;
    let resultado;

    try {
      resultado = await respuesta.json();
    } catch {
      resultado = null;
    }

    const exitosa = respuesta.status === 201 && resultado?.exito === true;
    return {
      numero,
      status: respuesta.status,
      duracionMs,
      exitosa,
      error: exitosa
        ? null
        : typeof resultado?.error === 'string'
          ? resultado.error
          : 'La respuesta no confirmó la subida.',
    };
  } catch (error) {
    return {
      numero,
      status: 'ERROR',
      duracionMs: performance.now() - inicio,
      exitosa: false,
      error: error.name === 'TimeoutError'
        ? 'La solicitud superó el tiempo máximo de espera.'
        : 'No se pudo completar la solicitud.',
    };
  }
}

async function ejecutarPrueba(opciones) {
  const { contenido, formato } = await cargarFotografia(opciones.rutaFotografia);
  const idEjecucion = `${new Date().toISOString().replace(/[-:.TZ]/g, '')}-${randomUUID().slice(0, 8)}`;
  const resultados = [];
  let siguienteNumero = 1;

  console.log(`Destino: ${ENDPOINT}`);
  console.log(`Solicitudes: ${opciones.solicitudes}; concurrencia: ${opciones.concurrencia}`);
  console.log(`Archivo local: ${path.basename(opciones.rutaFotografia)} (${formato.mime})`);
  console.log('Las solicitudes crearán registros e imágenes de prueba en el servicio remoto.');

  async function trabajador() {
    while (siguienteNumero <= opciones.solicitudes) {
      const numero = siguienteNumero;
      siguienteNumero += 1;
      const resultado = await enviarFotografia(
        contenido,
        formato,
        numero,
        idEjecucion,
      );
      resultados.push(resultado);
      console.log(
        `Solicitud ${numero}: ${resultado.status} en ${resultado.duracionMs.toFixed(0)} ms`
        + (resultado.error ? ` — ${resultado.error}` : ''),
      );
    }
  }

  await Promise.all(
    Array.from({ length: opciones.concurrencia }, () => trabajador()),
  );

  const exitosas = resultados.filter((resultado) => resultado.exitosa).length;
  const fallidas = resultados.length - exitosas;
  const tiempos = resultados.map((resultado) => resultado.duracionMs);
  const sumaTiempos = tiempos.reduce((suma, tiempo) => suma + tiempo, 0);
  const codigos = new Map();

  for (const resultado of resultados) {
    const codigo = String(resultado.status);
    codigos.set(codigo, (codigos.get(codigo) ?? 0) + 1);
  }

  console.log('\nResumen');
  console.log(`Exitosas: ${exitosas}`);
  console.log(`Fallidas: ${fallidas}`);
  console.log(
    `Códigos HTTP: ${[...codigos.entries()]
      .map(([codigo, cantidad]) => `${codigo}: ${cantidad}`)
      .join(', ')}`,
  );
  console.log(`Tiempo promedio: ${(sumaTiempos / tiempos.length).toFixed(0)} ms`);
  console.log(`Tiempo mínimo: ${Math.min(...tiempos).toFixed(0)} ms`);
  console.log(`Tiempo máximo: ${Math.max(...tiempos).toFixed(0)} ms`);
  console.log(`Prefijo de archivos de esta ejecución: LOADTEST-${idEjecucion}-`);
}

async function main() {
  try {
    const opciones = leerArgumentos(process.argv.slice(2));
    if (opciones.ayuda) {
      mostrarUso();
      return;
    }

    await ejecutarPrueba(opciones);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    mostrarUso();
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
