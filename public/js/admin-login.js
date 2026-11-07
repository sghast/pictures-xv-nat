import {
  iniciarSesionAdministrador,
  isFirebaseWebConfigured,
  obtenerTokenAdministrador,
} from './firebase-auth.js';

const formulario = document.querySelector('#formulario-acceso');
const campoCorreo = document.querySelector('#correo');
const campoContrasena = document.querySelector('#contrasena');
const botonAcceso = document.querySelector('#boton-acceso');
const estadoAcceso = document.querySelector('#estado-acceso');

function mostrarEstado(mensaje, tipo = '') {
  estadoAcceso.textContent = mensaje;
  estadoAcceso.className = 'estado-acceso';

  if (tipo) {
    estadoAcceso.classList.add(`estado-acceso--${tipo}`);
  }
}

function obtenerMensajeError(error) {
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'El correo electrónico o la contraseña no son correctos.';
    case 'auth/too-many-requests':
      return 'Hubo demasiados intentos. Espera un momento e inténtalo nuevamente.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar con Firebase. Comprueba tu conexión e inténtalo de nuevo.';
    default:
      return 'No fue posible iniciar sesión. Inténtalo nuevamente.';
  }
}

function obtenerMensajeErrorAutorizacion(error) {
  if (error.code === 'backend/unauthorized') {
    return 'Firebase inició sesión, pero el servidor no aceptó el token. Vuelve a iniciar sesión.';
  }

  if (error.code === 'backend/forbidden') {
    return 'Esta cuenta está autenticada, pero no tiene permisos de administrador.';
  }

  if (error.code === 'backend/connection') {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }

  if (error.code === 'backend/invalid-response') {
    return 'El servidor no pudo confirmar los permisos de administrador.';
  }

  if (error.message === 'La configuración de Firebase Web está incompleta.') {
    return 'Falta configurar Firebase Web. Completa public/js/firebase-web-config.js.';
  }

  if (
    error.code === 'auth/network-request-failed'
    || error instanceof TypeError
  ) {
    return 'No se pudo conectar con Firebase. Comprueba tu conexión e inténtalo de nuevo.';
  }

  return obtenerMensajeError(error);
}

if (!isFirebaseWebConfigured()) {
  mostrarEstado(
    'Falta configurar Firebase Web. Completa public/js/firebase-web-config.js con la configuración de la aplicación web.',
    'error',
  );
  botonAcceso.disabled = true;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  const correo = campoCorreo.value.trim();
  const contrasena = campoContrasena.value;

  if (!correo || !contrasena) {
    mostrarEstado('Escribe tu correo electrónico y contraseña.', 'error');
    return;
  }

  if (!isFirebaseWebConfigured()) {
    mostrarEstado(
      'Falta configurar Firebase Web. Completa public/js/firebase-web-config.js antes de iniciar sesión.',
      'error',
    );
    return;
  }

  botonAcceso.disabled = true;
  botonAcceso.textContent = 'Verificando…';
  mostrarEstado('Conectando con Firebase Authentication…');

  try {
    await iniciarSesionAdministrador(correo, contrasena);
    mostrarEstado('Verificando permisos con el servidor…');

    const token = await obtenerTokenAdministrador();
    let respuesta;

    try {
      respuesta = await fetch('/api/admin/verificar', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      const error = new Error('No se pudo conectar con el servidor.');
      error.code = 'backend/connection';
      throw error;
    }

    if (respuesta.status === 401) {
      const error = new Error('El servidor rechazó el token.');
      error.code = 'backend/unauthorized';
      throw error;
    }

    if (respuesta.status === 403) {
      const error = new Error('La cuenta no tiene permisos administrativos.');
      error.code = 'backend/forbidden';
      throw error;
    }

    if (!respuesta.ok) {
      const error = new Error('El servidor no confirmó los permisos.');
      error.code = 'backend/invalid-response';
      throw error;
    }

    let resultado;
    try {
      resultado = await respuesta.json();
    } catch {
      const error = new Error('El servidor devolvió una respuesta inválida.');
      error.code = 'backend/invalid-response';
      throw error;
    }

    if (!resultado || resultado.autenticado !== true) {
      const error = new Error('El servidor no confirmó los permisos.');
      error.code = 'backend/invalid-response';
      throw error;
    }

    mostrarEstado(
      'Acceso de administrador verificado correctamente.',
      'exito',
    );
    campoContrasena.value = '';
  } catch (error) {
    mostrarEstado(obtenerMensajeErrorAutorizacion(error), 'error');
  } finally {
    botonAcceso.disabled = !isFirebaseWebConfigured();
    botonAcceso.textContent = 'Iniciar sesión';
  }
});
