import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import express from 'express';
import test from 'node:test';
import { crearMiddlewaresCookieVisitante } from '../middlewares/cookieVisitanteSubidas.js';
import { crearLimitadoresSubida } from '../middlewares/limitadoresSubida.js';

function crearAplicacionPrueba({
  limiteNavegador = 15,
  limiteIp = 1000,
} = {}) {
  const middlewaresCookie = crearMiddlewaresCookieVisitante(
    randomBytes(32).toString('base64url'),
    { segura: true },
  );
  const { limitarPorIp, limitarPorNavegador } = crearLimitadoresSubida({
    limiteNavegador,
    limiteIp,
    ventanaMs: 60_000,
  });
  const app = express();
  const estado = { llegadasAMulter: 0 };

  app.use(middlewaresCookie.emitirCookieEnInicio);
  app.get('/', (req, res) => res.status(200).send('<main>inicio</main>'));
  app.post(
    '/api/fotografias',
    limitarPorIp,
    middlewaresCookie.requerirCookieValida,
    limitarPorNavegador,
    (req, res, next) => {
      estado.llegadasAMulter += 1;
      return next();
    },
    (req, res) => res.status(201).json({ exito: true }),
  );

  return { app, estado };
}

async function iniciarServidor(t, configuracion) {
  const { app, estado } = crearAplicacionPrueba(configuracion);
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  t.after(() => new Promise((resolve) => servidor.close(resolve)));

  return {
    estado,
    url: `http://127.0.0.1:${servidor.address().port}`,
  };
}

async function obtenerCookieVisitante(url) {
  const respuesta = await fetch(url);
  assert.equal(respuesta.status, 200);
  const setCookie = respuesta.headers.get('set-cookie');
  assert.ok(setCookie);
  return setCookie.split(';', 1)[0];
}

async function subir(url, cookie) {
  const headers = cookie ? { cookie } : {};
  return fetch(`${url}/api/fotografias`, {
    method: 'POST',
    headers,
  });
}

test('emite una cookie firmada antes de servir el inicio', async (t) => {
  const { url } = await iniciarServidor(t);
  const respuesta = await fetch(url);
  const setCookie = respuesta.headers.get('set-cookie');

  assert.equal(respuesta.status, 200);
  assert.match(await respuesta.text(), /<main>inicio<\/main>/);
  assert.match(setCookie, /^upload_visitor=[A-Za-z0-9_-]{43}\.\d{13}\.[A-Za-z0-9_-]{43};/);
  assert.match(setCookie, /Max-Age=172800/);
  assert.match(setCookie, /Path=\//);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Secure/);
  assert.match(respuesta.headers.get('cache-control'), /private, no-store/);
});

test('separa cuotas entre navegadores y conserva la cuota del mismo navegador', async (t) => {
  const { url, estado } = await iniciarServidor(t, { limiteNavegador: 1 });
  const cookieA = await obtenerCookieVisitante(url);
  const cookieB = await obtenerCookieVisitante(url);

  assert.equal((await subir(url, cookieA)).status, 201);
  assert.equal((await subir(url, cookieB)).status, 201);
  assert.equal((await subir(url, cookieA)).status, 429);
  assert.equal(estado.llegadasAMulter, 2);
});

test('rechaza cookies ausentes o manipuladas antes de Multer', async (t) => {
  const { url, estado } = await iniciarServidor(t);
  const cookie = await obtenerCookieVisitante(url);
  const cookieManipulada = `${cookie}x`;

  assert.equal((await subir(url)).status, 403);
  assert.equal((await subir(url, cookieManipulada)).status, 403);
  assert.equal((await subir(url, cookie)).status, 201);
  assert.equal(estado.llegadasAMulter, 1);
});

test('el límite agregado por IP también actúa antes de Multer', async (t) => {
  const { url, estado } = await iniciarServidor(t, {
    limiteNavegador: 10,
    limiteIp: 1,
  });
  const cookieA = await obtenerCookieVisitante(url);
  const cookieB = await obtenerCookieVisitante(url);

  assert.equal((await subir(url, cookieA)).status, 201);
  assert.equal((await subir(url, cookieB)).status, 429);
  assert.equal(estado.llegadasAMulter, 1);
});

test('la app emite cookie antes de estáticos y la ruta ejecuta ambos límites antes de Multer', async () => {
  const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const routeSource = await readFile(
    new URL('../routes/fotografiaRoutes.js', import.meta.url),
    'utf8',
  );

  assert.ok(
    appSource.indexOf('app.use(emitirCookieEnInicio)')
      < appSource.indexOf('app.use(express.static'),
  );
  assert.match(
    routeSource,
    /router\.post\([\s\S]*?limitarPorIp,[\s\S]*?requerirCookieValida,[\s\S]*?limitarPorNavegador,[\s\S]*?subirFotografiaMiddleware/,
  );
});
