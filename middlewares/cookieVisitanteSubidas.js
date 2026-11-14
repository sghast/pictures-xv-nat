import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const NOMBRE_COOKIE = 'upload_visitor';
const DURACION_COOKIE_SEGUNDOS = 48 * 60 * 60;
const DURACION_COOKIE_MS = DURACION_COOKIE_SEGUNDOS * 1000;
const PATRON_COOKIE = /^([A-Za-z0-9_-]{43})\.(\d{13})\.([A-Za-z0-9_-]{43})$/;

function obtenerValorCookie(req) {
  const cabecera = req.headers.cookie;
  if (typeof cabecera !== 'string') {
    return null;
  }

  const cookies = cabecera.split(';').map((parte) => parte.trim());
  const coincidencias = cookies.filter((cookie) => cookie.startsWith(`${NOMBRE_COOKIE}=`));

  if (coincidencias.length !== 1) {
    return null;
  }

  return coincidencias[0].slice(NOMBRE_COOKIE.length + 1);
}

function firmar(payload, secreto) {
  return createHmac('sha256', secreto)
    .update(payload)
    .digest('base64url');
}

function verificarCookie(valor, secreto, ahora) {
  if (typeof valor !== 'string') {
    return null;
  }

  const coincidencia = PATRON_COOKIE.exec(valor);
  if (!coincidencia) {
    return null;
  }

  const [, id, marcaTiempoTexto, firmaTexto] = coincidencia;
  const marcaTiempo = Number(marcaTiempoTexto);
  if (
    !Number.isSafeInteger(marcaTiempo)
    || marcaTiempo > ahora
    || ahora - marcaTiempo >= DURACION_COOKIE_MS
  ) {
    return null;
  }

  const payload = `${id}.${marcaTiempoTexto}`;
  const firmaEsperada = Buffer.from(firmar(payload, secreto), 'base64url');
  const firmaRecibida = Buffer.from(firmaTexto, 'base64url');

  if (
    firmaEsperada.length !== firmaRecibida.length
    || !timingSafeEqual(firmaEsperada, firmaRecibida)
  ) {
    return null;
  }

  return id;
}

function crearValorCookie(secreto, ahora) {
  const id = randomBytes(32).toString('base64url');
  const payload = `${id}.${ahora}`;
  return `${payload}.${firmar(payload, secreto)}`;
}

function serializarCookie(valor, segura, maxAge) {
  const atributos = [
    `${NOMBRE_COOKIE}=${valor}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (segura) {
    atributos.push('Secure');
  }

  return atributos.join('; ');
}

export function crearMiddlewaresCookieVisitante(
  secreto,
  { segura = process.env.NODE_ENV !== 'development', ahora = Date.now } = {},
) {
  if (typeof secreto !== 'string' || Buffer.byteLength(secreto, 'utf8') < 32) {
    throw new Error('UPLOAD_COOKIE_SECRET debe contener al menos 32 bytes.');
  }

  function emitirCookieEnInicio(req, res, next) {
    if (req.method !== 'GET' || req.path !== '/') {
      return next();
    }

    const idExistente = verificarCookie(
      obtenerValorCookie(req),
      secreto,
      ahora(),
    );

    if (idExistente) {
      req.uploadVisitorId = idExistente;
      return next();
    }

    const marcaTiempo = ahora();
    const valor = crearValorCookie(secreto, marcaTiempo);
    const id = valor.slice(0, valor.indexOf('.'));

    res.append(
      'Set-Cookie',
      serializarCookie(valor, segura, DURACION_COOKIE_SEGUNDOS),
    );
    res.set('Cache-Control', 'private, no-store');
    req.uploadVisitorId = id;
    return next();
  }

  function requerirCookieValida(req, res, next) {
    const id = verificarCookie(
      obtenerValorCookie(req),
      secreto,
      ahora(),
    );

    if (!id) {
      res.append('Set-Cookie', serializarCookie('', segura, 0));
      return res.status(403).json({
        error: 'La identificación de esta sesión no es válida. Recarga la página para continuar.',
      });
    }

    req.uploadVisitorId = id;
    return next();
  }

  return {
    emitirCookieEnInicio,
    requerirCookieValida,
  };
}
