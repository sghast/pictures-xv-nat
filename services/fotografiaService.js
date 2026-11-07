import { Readable } from 'node:stream';
import cloudinary, { CLOUDINARY_FOLDER } from '../config/cloudinary.js';

function validarArchivo(archivo) {
  if (!archivo || typeof archivo !== 'object') {
    throw new TypeError('Se requiere un archivo de Multer.');
  }

  if (!Buffer.isBuffer(archivo.buffer) || archivo.buffer.length === 0) {
    throw new TypeError('El archivo debe contener un buffer válido y no vacío.');
  }

  if (typeof archivo.originalname !== 'string' || !archivo.originalname.trim()) {
    throw new TypeError('El archivo debe tener un nombre original válido.');
  }

  if (typeof archivo.mimetype !== 'string' || !archivo.mimetype.trim()) {
    throw new TypeError('El archivo debe tener un tipo MIME válido.');
  }

  if (!Number.isSafeInteger(archivo.size) || archivo.size !== archivo.buffer.length) {
    throw new TypeError('El tamaño del archivo no coincide con su buffer.');
  }
}

function cargarBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const flujoCloudinary = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: CLOUDINARY_FOLDER,
        overwrite: false,
      },
      (error, resultado) => {
        if (error) {
          reject(error);
          return;
        }

        if (!resultado) {
          reject(new Error('Cloudinary no devolvió información de la imagen subida.'));
          return;
        }

        resolve(resultado);
      },
    );

    flujoCloudinary.on('error', reject);
    Readable.from([buffer]).on('error', reject).pipe(flujoCloudinary);
  });
}

export async function subirFotografiaCloudinary(archivo) {
  validarArchivo(archivo);

  const resultado = await cargarBuffer(archivo.buffer);

  if (
    typeof resultado.public_id !== 'string'
    || !resultado.public_id
    || typeof resultado.secure_url !== 'string'
    || !resultado.secure_url
    || typeof resultado.format !== 'string'
    || !resultado.format
  ) {
    throw new Error('Cloudinary devolvió una respuesta incompleta para la imagen subida.');
  }

  const urlMiniatura = cloudinary.url(resultado.public_id, {
    secure: true,
    transformation: [
      {
        width: 600,
        height: 600,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
      },
    ],
  });

  return {
    nombreOriginal: archivo.originalname.trim(),
    urlOriginal: resultado.secure_url,
    urlMiniatura,
    publicId: resultado.public_id,
    formato: resultado.format,
    tamano: archivo.size,
  };
}
