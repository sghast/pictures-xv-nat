const contenedorGaleria = document.querySelector('#galeria-fotografias');
const contenedorMensaje = document.querySelector('#mensaje-galeria');
const botonCargarMas = document.querySelector('#cargar-mas');
const visorFotografia = document.querySelector('#visor-fotografia');
const imagenAmpliada = document.querySelector('#imagen-ampliada');
const botonCerrarVisor = document.querySelector('#cerrar-visor');
const LIMITE_PAGINA = 40;
const idsFotografias = new Set();

let siguienteCursor = null;
let solicitudActual = 0;
let solicitudEnCurso = false;

function mostrarMensaje(texto, clase) {
  const mensaje = document.createElement('p');
  mensaje.className = clase;
  mensaje.textContent = texto;

  contenedorMensaje.replaceChildren(mensaje);
}

function obtenerUrlSegura(valor) {
  const url = new URL(valor);

  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
    throw new Error('La respuesta contiene una URL de imagen no válida.');
  }

  return url.href;
}

function crearTarjeta(fotografia) {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta-fotografia';

  const nombreOriginal = fotografia.nombreOriginal || 'Fotografía del evento';
  const boton = document.createElement('button');
  boton.className = 'boton-fotografia';
  boton.type = 'button';
  boton.setAttribute('aria-label', `Ampliar fotografía: ${nombreOriginal}`);

  const imagen = document.createElement('img');
  imagen.src = obtenerUrlSegura(fotografia.urlMiniatura);
  imagen.alt = nombreOriginal;
  imagen.loading = 'lazy';

  boton.addEventListener('click', () => {
    imagenAmpliada.src = obtenerUrlSegura(fotografia.urlOriginal);
    imagenAmpliada.alt = nombreOriginal;
    visorFotografia.showModal();
  });

  boton.append(imagen);
  tarjeta.append(boton);

  return tarjeta;
}

botonCerrarVisor.addEventListener('click', () => {
  visorFotografia.close();
});

visorFotografia.addEventListener('click', (evento) => {
  if (evento.target === visorFotografia) {
    visorFotografia.close();
  }
});

visorFotografia.addEventListener('close', () => {
  imagenAmpliada.removeAttribute('src');
  imagenAmpliada.alt = '';
});

document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && visorFotografia.open) {
    visorFotografia.close();
  }
});

async function cargarPagina({ inicial = false } = {}) {
  if (solicitudEnCurso || (!inicial && !siguienteCursor)) {
    return;
  }

  const solicitud = ++solicitudActual;
  const cursorSolicitado = inicial ? null : siguienteCursor;
  solicitudEnCurso = true;

  if (inicial) {
    mostrarMensaje('Cargando fotografías…', 'indicador-carga');
  } else {
    botonCargarMas.disabled = true;
    botonCargarMas.setAttribute('aria-busy', 'true');
    botonCargarMas.textContent = 'Cargando…';
    mostrarMensaje('Cargando más fotografías…', 'indicador-carga');
  }

  try {
    const parametros = new URLSearchParams({ limite: String(LIMITE_PAGINA) });

    if (cursorSolicitado) {
      parametros.set('cursor', cursorSolicitado);
    }

    const respuesta = await fetch(`/api/fotografias?${parametros}`);

    if (!respuesta.ok) {
      throw new Error('No se pudieron cargar las fotografías.');
    }

    const datos = await respuesta.json();

    if (
      !Array.isArray(datos.fotografias)
      || (
        datos.siguienteCursor !== null
        && (typeof datos.siguienteCursor !== 'string' || !datos.siguienteCursor)
      )
    ) {
      throw new Error('La respuesta de la galería no es válida.');
    }

    if (solicitud !== solicitudActual) {
      return;
    }

    if (inicial && datos.fotografias.length === 0) {
      siguienteCursor = null;
      mostrarMensaje('Aún no hay fotografías en la galería.', 'estado-vacio');
      botonCargarMas.hidden = true;
      return;
    }

    const idsIncluidos = new Set(idsFotografias);
    const nuevasFotografias = [];

    for (const fotografia of datos.fotografias) {
      if (
        fotografia === null
        || typeof fotografia !== 'object'
        || typeof fotografia.id !== 'string'
        || !fotografia.id
      ) {
        throw new Error('La respuesta de la galería no es válida.');
      }

      if (!idsIncluidos.has(fotografia.id)) {
        idsIncluidos.add(fotografia.id);
        nuevasFotografias.push({
          id: fotografia.id,
          tarjeta: crearTarjeta(fotografia),
        });
      }
    }

    if (solicitud !== solicitudActual) {
      return;
    }

    const tarjetas = nuevasFotografias.map(({ tarjeta }) => tarjeta);
    contenedorGaleria.append(...tarjetas);
    nuevasFotografias.forEach(({ id }) => idsFotografias.add(id));
    siguienteCursor = datos.siguienteCursor;

    if (siguienteCursor) {
      botonCargarMas.hidden = false;
      contenedorMensaje.replaceChildren();
    } else {
      botonCargarMas.hidden = true;
      mostrarMensaje('Ya has visualizado todas las fotografías.', 'estado-vacio');
    }
  } catch {
    if (solicitud !== solicitudActual) {
      return;
    }

    mostrarMensaje(
      inicial
        ? 'No fue posible cargar la galería. Inténtalo de nuevo más tarde.'
        : 'No fue posible cargar más fotografías. Puedes intentarlo de nuevo.',
      'mensaje-error',
    );
  } finally {
    if (solicitud === solicitudActual) {
      solicitudEnCurso = false;
      botonCargarMas.disabled = false;
      botonCargarMas.removeAttribute('aria-busy');
      botonCargarMas.textContent = 'Cargar más';
    }
  }
}

botonCargarMas.addEventListener('click', () => {
  cargarPagina();
});

cargarPagina({ inicial: true });