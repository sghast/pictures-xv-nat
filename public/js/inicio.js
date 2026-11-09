const TAMANO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

const formulario = document.querySelector('#formulario-fotografia');
const entradaArchivo = document.querySelector('#archivo-camara');
const vistaPrevia = document.querySelector('#vista-previa');
const imagenPrevia = document.querySelector('#imagen-previa');
const nombreArchivo = document.querySelector('#nombre-archivo');
const tamanoArchivo = document.querySelector('#tamano-archivo');
const botonQuitar = document.querySelector('#quitar-fotografia');
const botonSubir = document.querySelector('#boton-subir');
const estadoSubida = document.querySelector('#estado-subida');

let fotografiaSeleccionada = null;
let urlPrevia = null;
let validacionActual = 0;
let subiendo = false;

function mostrarEstado(mensaje, tipo = '') {
  estadoSubida.textContent = mensaje;
  estadoSubida.className = 'estado-subida';

  if (tipo) {
    estadoSubida.classList.add(`estado-subida--${tipo}`);
  }
}

function formatearTamano(tamano) {
  if (tamano < 1024 * 1024) {
    return `${(tamano / 1024).toFixed(1)} KB`;
  }

  return `${(tamano / (1024 * 1024)).toFixed(2)} MB`;
}

function liberarVistaPrevia() {
  if (urlPrevia) {
    URL.revokeObjectURL(urlPrevia);
    urlPrevia = null;
  }

  imagenPrevia.removeAttribute('src');
  imagenPrevia.alt = '';
}

function limpiarSeleccion() {
  fotografiaSeleccionada = null;
  validacionActual += 1;
  entradaArchivo.value = '';
  entradaArchivo.disabled = false;
  liberarVistaPrevia();
  vistaPrevia.hidden = true;
  botonSubir.disabled = true;
}

function detectarTipoPorFirma(bytes) {
  if (
    bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (bytes.length >= 8) {
    const firmaPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (firmaPng.every((byte, indice) => bytes[indice] === byte)) {
      return 'image/png';
    }
  }

  if (
    bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

async function seleccionarFotografia(archivo) {
  if (subiendo) {
    return;
  }

  limpiarSeleccion();

  if (!archivo) {
    return;
  }

  const idValidacion = ++validacionActual;

  if (archivo.size > TAMANO_MAXIMO) {
    mostrarEstado('La fotografía no puede superar los 10 MB.', 'error');
    return;
  }

  mostrarEstado('Verificando la fotografía seleccionada…');

  try {
    const bytes = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());

    if (idValidacion !== validacionActual) {
      return;
    }

    if (!TIPOS_PERMITIDOS.has(detectarTipoPorFirma(bytes))) {
      mostrarEstado('El contenido del archivo no corresponde a una imagen válida.', 'error');
      return;
    }

    fotografiaSeleccionada = archivo;
    urlPrevia = URL.createObjectURL(archivo);
    imagenPrevia.src = urlPrevia;
    imagenPrevia.alt = `Vista previa de ${archivo.name}`;
    nombreArchivo.textContent = archivo.name;
    tamanoArchivo.textContent = formatearTamano(archivo.size);
    vistaPrevia.hidden = false;
    botonSubir.disabled = false;
    mostrarEstado('Fotografía seleccionada. Puedes revisarla antes de compartirla.');
  } catch {
    if (idValidacion === validacionActual) {
      mostrarEstado('No se pudo leer la fotografía. Inténtalo con otro archivo.', 'error');
    }
  }
}

entradaArchivo.addEventListener('change', () => {
  const archivo = entradaArchivo.files?.[0];
  entradaArchivo.value = '';
  void seleccionarFotografia(archivo);
});

botonQuitar.addEventListener('click', () => {
  limpiarSeleccion();
  mostrarEstado('Se quitó la fotografía seleccionada.');
});

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  if (!fotografiaSeleccionada || subiendo) {
    return;
  }

  const formularioDatos = new FormData();
  formularioDatos.append('fotografia', fotografiaSeleccionada);
  subiendo = true;
  botonSubir.disabled = true;
  entradaArchivo.disabled = true;
  botonSubir.textContent = 'Subiendo fotografía…';
  mostrarEstado('Subiendo fotografía…');

  try {
    const respuesta = await fetch('/api/fotografias', {
      method: 'POST',
      body: formularioDatos,
    });
    let resultado;

    try {
      resultado = await respuesta.json();
    } catch {
      throw new Error('Error al subir la fotografía. Inténtalo nuevamente.');
    }

    if (!respuesta.ok || resultado?.exito !== true) {
      throw new Error(
        typeof resultado?.error === 'string'
          ? resultado.error
          : 'No se pudo subir la fotografía. Inténtalo nuevamente.',
      );
    }

    limpiarSeleccion();
    mostrarEstado('¡Fotografía subida correctamente! Gracias por compartirla.', 'exito');
  } catch (error) {
    mostrarEstado(
      error instanceof Error && error.message
        ? error.message
        : 'Error al subir la fotografía. Comprueba tu conexión e inténtalo de nuevo.',
      'error',
    );
  } finally {
    subiendo = false;
    entradaArchivo.disabled = false;
    botonSubir.textContent = 'Compartir fotografía';
    botonSubir.disabled = !fotografiaSeleccionada;
  }
});

window.addEventListener('beforeunload', liberarVistaPrevia);
