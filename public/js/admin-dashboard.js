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
let eliminacionEnCurso = false;
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

async function consultarEndpointAdmin(ruta, opciones = {}) {
  const token = await obtenerTokenAdministrador();
  let respuesta;

  try {
    respuesta = await fetch(ruta, {
      ...opciones,
      headers: {
        ...opciones.headers,
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

  if (respuesta.status === 400) {
    throw crearError('backend/bad-request', 'La solicitud no pudo completarse.');
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
    || typeof fotografia.id !== 'string'
    || !fotografia.id
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

  const botonEliminar = document.createElement('button');
  botonEliminar.className = 'boton boton--eliminar';
  botonEliminar.type = 'button';
  botonEliminar.textContent = 'Eliminar';
  botonEliminar.setAttribute(
    'aria-label',
    `Eliminar fotografía: ${fotografia.nombreOriginal}`,
  );
  botonEliminar.addEventListener('click', () => {
    eliminarFotografia(fotografia.id, fotografia.nombreOriginal, tarjeta, botonEliminar);
  });
  detalles.append(botonEliminar);

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
  const controlesOcupados = solicitudEnCurso || eliminacionEnCurso;
  botonPaginaAnterior.disabled = controlesOcupados || indicePagina === 0;
  botonPaginaSiguiente.disabled = controlesOcupados || !siguienteCursor;
  botonActualizar.disabled = controlesOcupados;
  botonCerrarSesion.disabled = controlesOcupados;
  contenedorGaleria.querySelectorAll('.boton--eliminar').forEach((boton) => {
    boton.disabled = controlesOcupados;
  });
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

async function actualizarInformacion(
  reiniciarPaginacion = false,
  duranteEliminacion = false,
) {
  if (solicitudEnCurso || (eliminacionEnCurso && !duranteEliminacion)) {
    return false;
  }

  solicitudEnCurso = true;
  actualizarControles();
  mostrarEstadoFotografias('Cargando fotografías…');

  try {
    let indiceDestino = reiniciarPaginacion ? 0 : indicePagina;
    let [estadisticas, pagina] = await Promise.all([
      consultarEndpointAdmin('/api/admin/estadisticas'),
      solicitarPagina(
        reiniciarPaginacion ? null : cursoresPagina[indiceDestino],
      ),
    ]);

    if (pagina.fotografias.length === 0 && indiceDestino > 0) {
      indiceDestino -= 1;
      pagina = await solicitarPagina(cursoresPagina[indiceDestino]);
    }

    validarRespuestaEstadisticas(estadisticas);
    mostrarFotografias(pagina.fotografias);

    indicePagina = indiceDestino;
    if (reiniciarPaginacion) {
      cursoresPagina.splice(0, cursoresPagina.length, null);
    }

    totalFotografias.textContent = new Intl.NumberFormat('es-MX')
      .format(estadisticas.totalFotografias);
    ultimaSubida.textContent = convertirFechaLegible(estadisticas.fechaUltimaSubida);
    siguienteCursor = pagina.siguienteCursor;

    if (eliminacionEnCurso) {
      cursoresPagina.splice(indicePagina + 1);
    }

    if (pagina.fotografias.length === 0) {
      mostrarEstadoFotografias('No hay fotografías para mostrar.');
    } else {
      mostrarEstadoFotografias('');
    }
    return true;
  } catch (error) {
    if (
      eliminacionEnCurso
      && indicePagina > 0
      && error.code === 'backend/bad-request'
    ) {
      try {
        const [estadisticas, pagina] = await Promise.all([
          consultarEndpointAdmin('/api/admin/estadisticas'),
          solicitarPagina(null),
        ]);
        validarRespuestaEstadisticas(estadisticas);
        mostrarFotografias(pagina.fotografias);
        indicePagina = 0;
        cursoresPagina.splice(0, cursoresPagina.length, null);
        totalFotografias.textContent = new Intl.NumberFormat('es-MX')
          .format(estadisticas.totalFotografias);
        ultimaSubida.textContent = convertirFechaLegible(estadisticas.fechaUltimaSubida);
        siguienteCursor = pagina.siguienteCursor;
        mostrarEstadoFotografias(
          pagina.fotografias.length === 0 ? 'No hay fotografías para mostrar.' : '',
        );
        return true;
      } catch (errorRecarga) {
        await manejarError(errorRecarga, 'fotografias');
        return false;
      }
    }

    await manejarError(error, 'fotografias');
    return false;
  } finally {
    solicitudEnCurso = false;
    actualizarControles();
  }
}

async function cambiarPagina(indiceDestino, cursorDestino) {
  if (solicitudEnCurso || eliminacionEnCurso) {
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

async function eliminarFotografia(id, nombreOriginal, tarjeta, boton) {
  if (solicitudEnCurso || eliminacionEnCurso) {
    return;
  }

  const confirmacion = window.confirm(
    `¿Eliminar permanentemente "${nombreOriginal}"? Esta fotografía dejará de estar disponible en la galería pública.`,
  );

  if (!confirmacion) {
    return;
  }

  eliminacionEnCurso = true;
  boton.disabled = true;
  boton.classList.add('boton--eliminando');
  boton.setAttribute('aria-busy', 'true');
  boton.textContent = 'Eliminando…';
  actualizarControles();
  mostrarEstadoFotografias('Eliminando fotografía…');

  try {
    await consultarEndpointAdmin(
      `/api/admin/fotografias/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    );

    const informacionActualizada = await actualizarInformacion(false, true);

    if (informacionActualizada) {
      mostrarEstadoFotografias('La fotografía se eliminó correctamente.');
    } else {
      tarjeta.remove();
      mostrarEstadoFotografias(
        'La fotografía se eliminó, pero no se pudo actualizar el resto de la información. Pulsa «Actualizar información».',
        true,
      );
    }
  } catch (error) {
    if (error.code === 'backend/unauthorized' || error.code === 'backend/forbidden') {
      await manejarError(error, 'fotografias');
    } else {
      mostrarEstadoFotografias(
        'No fue posible eliminar la fotografía. Inténtalo nuevamente.',
        true,
      );
    }
  } finally {
    eliminacionEnCurso = false;
    if (boton.isConnected) {
      boton.disabled = false;
      boton.classList.remove('boton--eliminando');
      boton.removeAttribute('aria-busy');
      boton.textContent = 'Eliminar';
    }
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
