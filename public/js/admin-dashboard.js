import {
  cerrarSesionAdministrador,
  isFirebaseWebConfigured,
  observarSesionAdministrador,
  obtenerTokenAdministrador,
} from './firebase-auth.js';

const panelAdmin = document.querySelector('#panel-admin');
const estadoInicial = document.querySelector('#estado-inicial');
const mensajeInicial = document.querySelector('#mensaje-inicial');
const botonReintentarAcceso = document.querySelector('#reintentar-acceso');
const botonCerrarSesion = document.querySelector('#cerrar-sesion');
const botonActualizar = document.querySelector('#actualizar');
const botonPaginaAnterior = document.querySelector('#pagina-anterior');
const botonPaginaSiguiente = document.querySelector('#pagina-siguiente');
const indicadorPagina = document.querySelector('#indicador-pagina');
const contenedorGaleria = document.querySelector('#galeria-admin');
const estadoFotografias = document.querySelector('#estado-fotografias');
const totalFotografias = document.querySelector('#total-fotografias');
const ultimaSubida = document.querySelector('#ultima-subida');

const TAMANO_PAGINA = 20;
const cursoresPagina = [null];
let indicePagina = 0;
let siguienteCursor = null;
let solicitudEnCurso = false;
let usuarioAutenticado = null;

function mostrarEstadoInicial(mensaje, permitirReintento = false) {
  mensajeInicial.textContent = mensaje;
  botonReintentarAcceso.hidden = !permitirReintento;
  estadoInicial.hidden = false;
  panelAdmin.hidden = true;
}

function mostrarEstadoFotografias(mensaje, esError = false) {
  estadoFotografias.textContent = mensaje;
  estadoFotografias.classList.toggle('estado-fotografias--error', esError);
}

function crearError(codigo, mensaje) {
  const error = new Error(mensaje);
  error.code = codigo;
  return error;
}

async function consultarEndpointAdmin(ruta) {
  const token = await obtenerTokenAdministrador();
  let respuesta;

  try {
    respuesta = await fetch(ruta, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw crearError('backend/connection', 'No se pudo conectar con el servidor.');
  }

  if (respuesta.status === 401) {
    throw crearError('backend/unauthorized', 'La sesión ya no es válida.');
  }

  if (respuesta.status === 403) {
    throw crearError('backend/forbidden', 'La cuenta no tiene permisos de administrador.');
  }

  if (!respuesta.ok) {
    throw crearError('backend/request', 'El servidor no pudo completar la consulta.');
  }

  try {
    return await respuesta.json();
  } catch {
    throw crearError('backend/invalid-response', 'El servidor devolvió una respuesta inválida.');
  }
}

async function redirigirAlLogin() {
  try {
    await cerrarSesionAdministrador();
  } finally {
    window.location.replace('/admin/login/');
  }
}

async function manejarError(error, contexto) {
  if (error.code === 'backend/unauthorized' || error.code === 'backend/forbidden') {
    await redirigirAlLogin();
    return;
  }

  const mensaje = error.code === 'backend/connection'
    ? 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
    : 'No fue posible cargar la información. Inténtalo nuevamente.';

  if (contexto === 'acceso') {
    mostrarEstadoInicial(mensaje, true);
  } else {
    mostrarEstadoFotografias(mensaje, true);
  }
}

async function verificarPermisos() {
  try {
    const resultado = await consultarEndpointAdmin('/api/admin/verificar');

    if (resultado.autenticado !== true) {
      throw crearError('backend/invalid-response', 'No se confirmó la autorización.');
    }

    estadoInicial.hidden = true;
    panelAdmin.hidden = false;
    botonCerrarSesion.hidden = false;
    await actualizarInformacion(true);
  } catch (error) {
    await manejarError(error, 'acceso');
  }
}

function convertirFechaLegible(valor) {
  if (typeof valor !== 'string') {
    return 'Sin información';
  }

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 'Sin información';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha);
}

function obtenerUrlMiniatura(valor) {
  const url = new URL(valor);

  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
    throw new Error('La respuesta contiene una URL de miniatura no válida.');
  }

  return url.href;
}

function crearTarjetaFotografia(fotografia) {
  if (
    !fotografia
    || typeof fotografia.nombreOriginal !== 'string'
    || typeof fotografia.urlMiniatura !== 'string'
  ) {
    throw new Error('La respuesta contiene una fotografía no válida.');
  }

  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta-fotografia-admin';

  const imagen = document.createElement('img');
  imagen.src = obtenerUrlMiniatura(fotografia.urlMiniatura);
  imagen.alt = `Fotografía: ${fotografia.nombreOriginal}`;
  imagen.loading = 'lazy';
  imagen.decoding = 'async';

  const detalles = document.createElement('div');
  detalles.className = 'tarjeta-fotografia-admin__detalles';

  const nombre = document.createElement('p');
  nombre.className = 'tarjeta-fotografia-admin__nombre';
  nombre.textContent = fotografia.nombreOriginal;
  detalles.append(nombre);

  if (fotografia.fechaSubida) {
    const fecha = document.createElement('time');
    fecha.className = 'tarjeta-fotografia-admin__fecha';
    fecha.dateTime = fotografia.fechaSubida;
    fecha.textContent = convertirFechaLegible(fotografia.fechaSubida);
    detalles.append(fecha);
  }

  tarjeta.append(imagen, detalles);
  return tarjeta;
}

function mostrarFotografias(fotografias) {
  if (fotografias.length === 0) {
    const mensaje = document.createElement('p');
    mensaje.className = 'estado-vacio';
    mensaje.textContent = 'Aún no hay fotografías almacenadas.';
    contenedorGaleria.replaceChildren(mensaje);
    return;
  }

  const tarjetas = fotografias.map(crearTarjetaFotografia);
  contenedorGaleria.replaceChildren(...tarjetas);
}

function validarRespuestaPagina(resultado) {
  if (
    !resultado
    || !Array.isArray(resultado.fotografias)
    || (
      resultado.siguienteCursor !== null
      && typeof resultado.siguienteCursor !== 'string'
    )
  ) {
    throw crearError('backend/invalid-response', 'La página recibida no es válida.');
  }
}

function validarRespuestaEstadisticas(resultado) {
  if (
    !resultado
    || !Number.isSafeInteger(resultado.totalFotografias)
    || resultado.totalFotografias < 0
    || (resultado.fechaUltimaSubida !== null && typeof resultado.fechaUltimaSubida !== 'string')
  ) {
    throw crearError('backend/invalid-response', 'Las estadísticas recibidas no son válidas.');
  }
}

function actualizarControles() {
  botonPaginaAnterior.disabled = solicitudEnCurso || indicePagina === 0;
  botonPaginaSiguiente.disabled = solicitudEnCurso || !siguienteCursor;
  botonActualizar.disabled = solicitudEnCurso;
  indicadorPagina.textContent = `Página ${indicePagina + 1}`;
}

async function solicitarPagina(cursor) {
  const parametros = new URLSearchParams({ limite: String(TAMANO_PAGINA) });

  if (cursor) {
    parametros.set('cursor', cursor);
  }

  const resultado = await consultarEndpointAdmin(
    `/api/admin/fotografias?${parametros.toString()}`,
  );
  validarRespuestaPagina(resultado);
  return resultado;
}

async function actualizarInformacion(reiniciarPaginacion = false) {
  if (solicitudEnCurso) {
    return;
  }

  solicitudEnCurso = true;
  actualizarControles();
  mostrarEstadoFotografias('Cargando fotografías…');

  const cursorDestino = reiniciarPaginacion ? null : cursoresPagina[indicePagina];

  try {
    const [estadisticas, pagina] = await Promise.all([
      consultarEndpointAdmin('/api/admin/estadisticas'),
      solicitarPagina(cursorDestino),
    ]);

    validarRespuestaEstadisticas(estadisticas);
    mostrarFotografias(pagina.fotografias);

    totalFotografias.textContent = new Intl.NumberFormat('es-MX')
      .format(estadisticas.totalFotografias);
    ultimaSubida.textContent = convertirFechaLegible(estadisticas.fechaUltimaSubida);
    siguienteCursor = pagina.siguienteCursor;

    if (reiniciarPaginacion) {
      cursoresPagina.splice(0, cursoresPagina.length, null);
      indicePagina = 0;
    }

    if (pagina.fotografias.length === 0) {
      mostrarEstadoFotografias('No hay fotografías para mostrar.');
    } else {
      mostrarEstadoFotografias('');
    }
  } catch (error) {
    await manejarError(error, 'fotografias');
  } finally {
    solicitudEnCurso = false;
    actualizarControles();
  }
}

async function cambiarPagina(indiceDestino, cursorDestino) {
  if (solicitudEnCurso) {
    return;
  }

  solicitudEnCurso = true;
  actualizarControles();
  mostrarEstadoFotografias('Cargando fotografías…');

  try {
    const pagina = await solicitarPagina(cursorDestino);
    mostrarFotografias(pagina.fotografias);
    indicePagina = indiceDestino;
    cursoresPagina[indicePagina] = cursorDestino;
    siguienteCursor = pagina.siguienteCursor;
    mostrarEstadoFotografias(
      pagina.fotografias.length === 0 ? 'No hay fotografías para mostrar.' : '',
    );
  } catch (error) {
    await manejarError(error, 'fotografias');
  } finally {
    solicitudEnCurso = false;
    actualizarControles();
  }
}

async function manejarCambioDeSesion(usuario) {
  if (!usuario) {
    window.location.replace('/admin/login/');
    return;
  }

  usuarioAutenticado = usuario;
  await verificarPermisos();
}

botonActualizar.addEventListener('click', () => {
  actualizarInformacion(true);
});

botonPaginaAnterior.addEventListener('click', () => {
  if (indicePagina > 0) {
    cambiarPagina(indicePagina - 1, cursoresPagina[indicePagina - 1]);
  }
});

botonPaginaSiguiente.addEventListener('click', () => {
  if (siguienteCursor) {
    const indiceDestino = indicePagina + 1;
    cursoresPagina[indiceDestino] = siguienteCursor;
    cambiarPagina(indiceDestino, siguienteCursor);
  }
});

botonCerrarSesion.addEventListener('click', async () => {
  botonCerrarSesion.disabled = true;

  try {
    await cerrarSesionAdministrador();
    window.location.replace('/admin/login/');
  } catch {
    botonCerrarSesion.disabled = false;
    mostrarEstadoFotografias('No fue posible cerrar sesión. Inténtalo nuevamente.', true);
  }
});

botonReintentarAcceso.addEventListener('click', () => {
  if (usuarioAutenticado) {
    mostrarEstadoInicial('Verificando permisos de administrador…');
    verificarPermisos();
  }
});

if (!isFirebaseWebConfigured()) {
  window.location.replace('/admin/login/');
} else {
  observarSesionAdministrador(manejarCambioDeSesion).catch(() => {
    mostrarEstadoInicial(
      'No fue posible comprobar la sesión. Revisa la conexión e inténtalo de nuevo.',
      false,
    );
  });
}
