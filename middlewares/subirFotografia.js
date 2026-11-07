import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);

const recibirUnArchivo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: TAMANO_MAXIMO,
    files: 1,
  },
}).single('fotografia');

export function subirFotografia(req, res, next) {
  recibirUnArchivo(req, res, async (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'La fotografía no puede superar los 10 MB.',
        });
      }

      if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Envía un solo archivo en el campo fotografia.',
        });
      }

      return res.status(400).json({
        error: 'No se pudo procesar el archivo enviado.',
      });
    }

    if (error) {
      return next(error);
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Debes enviar una fotografía en el campo fotografia.',
      });
    }

    try {
      const tipoDetectado = await fileTypeFromBuffer(req.file.buffer);

      if (!tipoDetectado || !TIPOS_PERMITIDOS.has(tipoDetectado.mime)) {
        return res.status(415).json({
          error: 'El archivo debe ser una imagen JPEG, PNG o WebP válida.',
        });
      }

      return next();
    } catch (validationError) {
      return next(validationError);
    }
  });
}
