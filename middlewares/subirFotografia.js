import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

const TAMANO_MAXIMO = 10 * 1024 * 1024;
const LIMITE_MAXIMO_PIXELES = 40_000_000;
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FORMATOS_POR_TIPO = new Map([
  ['image/jpeg', 'jpeg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const recibirUnArchivo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: TAMANO_MAXIMO,
    files: 1,
  },
}).single('fotografia');

async function validarImagenDecodificable(buffer, tipoMime) {
  const opcionesMetadatos = {
    animated: true,
    failOn: 'warning',
    limitInputPixels: false,
  };

  try {
    const metadatos = await sharp(buffer, opcionesMetadatos).metadata();
    const altoFotograma = metadatos.pageHeight ?? metadatos.height;
    const cantidadFotogramas = metadatos.pages ?? 1;
    const totalPixeles = metadatos.width * altoFotograma * cantidadFotogramas;

    if (
      metadatos.format !== FORMATOS_POR_TIPO.get(tipoMime)
      || !Number.isSafeInteger(totalPixeles)
      || totalPixeles <= 0
    ) {
      return { valida: false, excedeDimensiones: false };
    }

    if (totalPixeles > LIMITE_MAXIMO_PIXELES) {
      return { valida: false, excedeDimensiones: true };
    }

    await sharp(buffer, {
      ...opcionesMetadatos,
      limitInputPixels: LIMITE_MAXIMO_PIXELES,
    }).stats();

    return { valida: true, excedeDimensiones: false };
  } catch {
    return { valida: false, excedeDimensiones: false };
  }
}

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

      const resultadoValidacion = await validarImagenDecodificable(
        req.file.buffer,
        tipoDetectado.mime,
      );

      if (resultadoValidacion.excedeDimensiones) {
        return res.status(413).json({
          error: 'La imagen supera el límite de 40 megapíxeles.',
        });
      }

      if (!resultadoValidacion.valida) {
        return res.status(415).json({
          error: 'La imagen está dañada o no se puede decodificar correctamente.',
        });
      }

      return next();
    } catch (validationError) {
      return next(validationError);
    }
  });
}
