import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adminRoutes from './routes/adminRoutes.js';
import fotografiaRoutes from './routes/fotografiaRoutes.js';

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

const app = express();

app.use(express.static(path.join(currentDirectory, 'public')));
app.use('/api/fotografias', fotografiaRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (request, response) => {
  response.status(200).json({ status: 'ok' });
});

export default app;
