import {
  iniciarSesionAdministrador,
  isFirebaseWebConfigured,
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
    mostrarEstado(
      'Autenticación completada. El servidor verificará los permisos en cada operación administrativa.',
      'exito',
    );
    campoContrasena.value = '';
  } catch (error) {
    if (error.code === 'auth/network-request-failed' || error instanceof TypeError) {
      mostrarEstado(
        'No se pudo conectar con Firebase. Comprueba tu conexión e inténtalo de nuevo.',
        'error',
      );
    } else if (error.message === 'La configuración de Firebase Web está incompleta.') {
      mostrarEstado(
        'Falta configurar Firebase Web. Completa public/js/firebase-web-config.js.',
        'error',
      );
    } else {
      mostrarEstado(obtenerMensajeError(error), 'error');
    }
  } finally {
    botonAcceso.disabled = !isFirebaseWebConfigured();
    botonAcceso.textContent = 'Iniciar sesión';
  }
});
