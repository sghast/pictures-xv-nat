const contenedorGaleria = document.querySelector('#galeria-fotografias');
const contenedorMensaje = document.querySelector('#mensaje-galeria');
const visorFotografia = document.querySelector('#visor-fotografia');
const imagenAmpliada = document.querySelector('#imagen-ampliada');
const botonCerrarVisor = document.querySelector('#cerrar-visor');

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

  const boton = document.createElement('button');
  boton.className = 'boton-fotografia';
  boton.type = 'button';
  boton.setAttribute('aria-label', `Ampliar fotografía: ${fotografia.nombreOriginal}`);

  const imagen = document.createElement('img');
  imagen.src = obtenerUrlSegura(fotografia.urlMiniatura);
  imagen.alt = fotografia.nombreOriginal;
  imagen.loading = 'lazy';

  boton.addEventListener('click', () => {
    imagenAmpliada.src = obtenerUrlSegura(fotografia.urlOriginal);
    imagenAmpliada.alt = fotografia.nombreOriginal;
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

async function cargarFotografias() {
  mostrarMensaje('Cargando fotografías…', 'indicador-carga');

  try {
    const respuesta = await fetch('/api/fotografias');

    if (!respuesta.ok) {
      throw new Error('No se pudieron cargar las fotografías.');
    }

    const datos = await respuesta.json();

    if (!Array.isArray(datos.fotografias)) {
      throw new Error('La respuesta de la galería no es válida.');
    }

    if (datos.fotografias.length === 0) {
      mostrarMensaje('Aún no hay fotografías en la galería.', 'estado-vacio');
      return;
    }

    const tarjetas = datos.fotografias.map(crearTarjeta);
    contenedorGaleria.replaceChildren(...tarjetas);
    contenedorMensaje.replaceChildren();
  } catch {
    contenedorGaleria.replaceChildren();
    mostrarMensaje(
      'No fue posible cargar la galería. Inténtalo de nuevo más tarde.',
      'mensaje-error',
    );
  }
}

cargarFotografias();