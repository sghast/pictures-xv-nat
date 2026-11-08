import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { subirFotografia as subirFotografiaMiddleware } from '../middlewares/subirFotografia.js';
import {
  listarFotografias as listarFotografiasController,
  subirFotografia as subirFotografiaController,
} from '../controllers/fotografiaController.js';

const router = Router();
// Antes de confiar en req.ip por visitante en Render, verificar la IP observada en un despliegue de prueba.
const limitarSubidasFotografias = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Has alcanzado el límite de subidas. Inténtalo de nuevo en 15 minutos.',
    });
  },
});

router.post('/', limitarSubidasFotografias, subirFotografiaMiddleware, subirFotografiaController);
router.get('/', listarFotografiasController);

export default router;
