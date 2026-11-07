import { Router } from 'express';
import { verificarAdministrador } from '../controllers/adminController.js';
import { autenticarAdministrador } from '../middlewares/autenticarAdministrador.js';

const router = Router();

router.get('/verificar', autenticarAdministrador, verificarAdministrador);

export default router;
