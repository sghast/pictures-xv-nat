import 'dotenv/config';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
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

const limitarSubidasFotografias = rateLimit({
  windowMs: ventanaSubidasMs,
  limit: limiteSubidas,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Has alcanzado el límite de subidas. Inténtalo de nuevo más tarde.',
    });
  },
});

router.post('/', limitarSubidasFotografias, subirFotografiaMiddleware, subirFotografiaController);
router.get('/', listarFotografiasController);

export default router;
