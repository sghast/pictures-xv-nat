import { Router } from 'express';
import {
  eliminarFotografiaAdministrador,
  listarFotografiasAdministrador,
  obtenerEstadisticasAdministrador,
  verificarAdministrador,
} from '../controllers/adminController.js';
import { descargarRecuerdosZip } from '../controllers/recuerdosZipController.js';
import { autenticarAdministrador } from '../middlewares/autenticarAdministrador.js';

const router = Router();

router.get('/verificar', autenticarAdministrador, verificarAdministrador);
router.get(
  '/fotografias/descargar',
  autenticarAdministrador,
  descargarRecuerdosZip,
);
router.get('/fotografias', autenticarAdministrador, listarFotografiasAdministrador);
router.get('/estadisticas', autenticarAdministrador, obtenerEstadisticasAdministrador);
router.delete(
  '/fotografias/:id',
  autenticarAdministrador,
  eliminarFotografiaAdministrador,
);

export default router;
