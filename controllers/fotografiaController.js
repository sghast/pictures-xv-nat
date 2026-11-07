import cloudinary from '../config/cloudinary.js';
import {
  crearFotografia,
  listarFotografiasPaginadas,
} from '../models/fotografiaModel.js';
import { subirFotografiaCloudinary } from '../services/fotografiaService.js';

export async function subirFotografia(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      exito: false,
      error: 'Debes enviar una fotografía.',
    });
  }

  let datosFotografia;

  try {
    datosFotografia = await subirFotografiaCloudinary(req.file);
  } catch (error) {
    return next(error);
  }

  try {
    const fotografia = await crearFotografia(datosFotografia);

    return res.status(201).json({
      exito: true,
      fotografia,
    });
  } catch (error) {
    try {
      const resultado = await cloudinary.uploader.destroy(datosFotografia.publicId, {
        resource_type: 'image',
      });

      if (resultado?.result !== 'ok') {
        console.error(
          'La compensación de Cloudinary no confirmó la eliminación de la imagen.',
          resultado?.result ?? 'Sin resultado',
        );
      }
    } catch (errorCompensacion) {
      console.error(
        'No se pudo eliminar de Cloudinary la imagen subida sin registro en Firestore.',
        errorCompensacion,
      );
    }

    return next(error);
  }
}

export async function listarFotografias(req, res, next) {
  const limite = req.query.limite === undefined ? 40 : Number(req.query.limite);
  const cursor = req.query.cursor;

  if (
    !Number.isInteger(limite)
    || limite < 1
    || limite > 50
    || (
      cursor !== undefined
      && (
        typeof cursor !== 'string'
        || !cursor.trim()
        || cursor.trim() !== cursor
        || cursor.includes('/')
      )
    )
  ) {
    return res.status(400).json({
      error: 'Los parámetros de consulta no son válidos.',
    });
  }

  try {
    const pagina = await listarFotografiasPaginadas({ limite, cursor });

    if (!pagina) {
      return res.status(400).json({
        error: 'El cursor de paginación no es válido.',
      });
    }

    return res.status(200).json({
      fotografias: pagina.fotografias,
      cantidad: pagina.fotografias.length,
      siguienteCursor: pagina.siguienteCursor,
    });
  } catch (error) {
    return next(error);
  }
}
