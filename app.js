import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearMiddlewaresCookieVisitante } from './middlewares/cookieVisitanteSubidas.js';
import adminRoutes from './routes/adminRoutes.js';
import fotografiaRoutes from './routes/fotografiaRoutes.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const app = express();
const { emitirCookieEnInicio } = crearMiddlewaresCookieVisitante(
  process.env.UPLOAD_COOKIE_SECRET,
);

app.use(helmet({
  contentSecurityPolicy: {
    reportOnly: true,
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://www.gstatic.com'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'blob:', 'https://res.cloudinary.com'],
      connectSrc: [
        "'self'",
        'https://identitytoolkit.googleapis.com',
        'https://securetoken.googleapis.com',
        'https://fotos-nat-xv.firebaseapp.com',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ['https://fotos-nat-xv.firebaseapp.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));
app.use(emitirCookieEnInicio);
app.use(express.static(path.join(currentDirectory, 'public')));
app.use('/api/fotografias', fotografiaRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (request, response) => {
  response.status(200).json({ status: 'ok' });
});

export default app;
