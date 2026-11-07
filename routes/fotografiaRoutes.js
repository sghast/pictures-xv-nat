import { Router } from 'express';
import { subirFotografia as subirFotografiaMiddleware } from '../middlewares/subirFotografia.js';
import {
  listarFotografias as listarFotografiasController,
  subirFotografia as subirFotografiaController,
} from '../controllers/fotografiaController.js';

const router = Router();

router.post('/', subirFotografiaMiddleware, subirFotografiaController);
router.get('/', listarFotografiasController);

export default router;
