import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transmitirZipRecuerdos } from '../services/zipRecuerdos.js';

function crearDestinoCapturado() {
  const fragmentos = [];
  const destino = new Writable({
    write(fragmento, codificacion, callback) {
      fragmentos.push(Buffer.from(fragmento));
      callback();
    },
  });

  return {
    destino,
    obtenerArchivo: () => Buffer.concat(fragmentos),
  };
}

test('transmite todas las entradas en secuencia dentro de un ZIP', async () => {
  const { destino, obtenerArchivo } = crearDestinoCapturado();
  let entradasCreadas = 0;

  async function* crearEntradas() {
    for (let indice = 1; indice <= 55; indice += 1) {
      entradasCreadas += 1;
      yield {
        nombre: `${String(indice).padStart(4, '0')}-foto-${indice}.jpg`,
        stream: Readable.from([Buffer.from(`imagen-${indice}`)]),
      };
    }
  }

  const cantidad = await transmitirZipRecuerdos({
    entradas: crearEntradas(),
    destino,
  });
  const zip = obtenerArchivo();

  assert.equal(cantidad, 55);
  assert.equal(entradasCreadas, 55);
  assert.deepEqual(zip.subarray(0, 4), Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  assert.ok(zip.includes(Buffer.from('0055-foto-55.jpg')));
  assert.ok(zip.includes(Buffer.from([0x50, 0x4b, 0x06, 0x06])));
  assert.deepEqual(zip.subarray(-22, -18), Buffer.from([0x50, 0x4b, 0x05, 0x06]));
});

test('rechaza errores de una imagen en lugar de finalizar un ZIP incompleto', async () => {
  const { destino, obtenerArchivo } = crearDestinoCapturado();
  const entradas = [{
    nombre: '0001-foto.jpg',
    stream: new Readable({
      read() {
        this.push(Buffer.from('parcial'));
        this.destroy(new Error('error simulado de origen'));
      },
    }),
  }];

  await assert.rejects(
    transmitirZipRecuerdos({ entradas, destino }),
    /error simulado de origen/,
  );
  assert.equal(destino.writableFinished, false);
  assert.equal(
    obtenerArchivo().includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])),
    false,
  );
});

test('el endpoint ZIP se encuentra detrás de la autenticación administrativa', async () => {
  const rutas = await readFile(new URL('../routes/adminRoutes.js', import.meta.url), 'utf8');
  const controlador = await readFile(
    new URL('../controllers/recuerdosZipController.js', import.meta.url),
    'utf8',
  );

  assert.match(
    rutas,
    /router\.get\(\s*'\/fotografias\/descargar',\s*autenticarAdministrador,\s*descargarRecuerdosZip,/,
  );
  assert.match(controlador, /filename="recuerdos_xv\.zip"/);
});

test('el botón de descarga solo está en el panel admin y guarda el stream sin Blob', async () => {
  const paginaAdmin = await readFile(
    new URL('../public/admin/index.html', import.meta.url),
    'utf8',
  );
  const paginaPublica = await readFile(
    new URL('../public/index.html', import.meta.url),
    'utf8',
  );
  const dashboard = await readFile(
    new URL('../public/js/admin-dashboard.js', import.meta.url),
    'utf8',
  );

  assert.match(paginaAdmin, /<svg[\s\S]*?<\/svg>[\s\S]*?Descargar todos los recuerdos/);
  assert.doesNotMatch(paginaPublica, /Descargar todos los recuerdos/);
  assert.match(dashboard, /showSaveFilePicker/);
  assert.match(dashboard, /Authorization: `Bearer \$\{token\}`/);
  assert.match(dashboard, /respuesta\.body\.pipeTo\(archivoEscribible\)/);
  assert.doesNotMatch(dashboard, /\bnew Blob\b/);
});
