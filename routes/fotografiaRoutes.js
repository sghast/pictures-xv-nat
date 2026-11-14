import 'dotenv/config';
import { Router } from 'express';
import { crearMiddlewaresCookieVisitante } from '../middlewares/cookieVisitanteSubidas.js';
import { crearLimitadoresSubida } from '../middlewares/limitadoresSubida.js';
import { subirFotografia as subirFotografiaMiddleware } from '../middlewares/subirFotografia.js';
import {
  listarFotografias as listarFotografiasController,
  subirFotografia as subirFotografiaController,
} from '../controllers/fotografiaController.js';

const router = Router();
// Antes de confiar en req.ip por visitante en Render, verificar la IP observada en un despliegue de prueba.
function leerEnteroPositivoEnv(nombre, valorPredeterminado) {
  const valor = process.env[nombre];

  if (valor === undefined || valor.trim() === '') {
    return valorPredeterminado;
  }

  if (!/^[1-9]\d*$/.test(valor)) {
    console.warn(
      `Valor inválido para ${nombre}; se utilizará el valor predeterminado.`,
    );
    return valorPredeterminado;
  }

  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) {
    console.warn(
      `Valor inválido para ${nombre}; se utilizará el valor predeterminado.`,
    );
    return valorPredeterminado;
  }

  return numero;
}

const limiteSubidas = leerEnteroPositivoEnv('UPLOAD_RATE_LIMIT_MAX', 5);
const ventanaSubidasMs = leerEnteroPositivoEnv('UPLOAD_RATE_LIMIT_WINDOW_MS', 900000);
const limiteSubidasIp = leerEnteroPositivoEnv('UPLOAD_RATE_LIMIT_IP_MAX', 1000);

const { limitarPorIp, limitarPorNavegador } = crearLimitadoresSubida({
  limiteNavegador: limiteSubidas,
  limiteIp: limiteSubidasIp,
  ventanaMs: ventanaSubidasMs,
});
const { requerirCookieValida } = crearMiddlewaresCookieVisitante(
  process.env.UPLOAD_COOKIE_SECRET,
);

router.post(
  '/',
  limitarPorIp,
  requerirCookieValida,
  limitarPorNavegador,
  subirFotografiaMiddleware,
  subirFotografiaController,
);
router.get('/', listarFotografiasController);

export default router;
