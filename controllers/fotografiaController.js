import cloudinary from '../config/cloudinary.js';
import {
  crearFotografia,
  listarFotografias as listarFotografiasModel,
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
  try {
    const limite = req.query.limite === undefined
      ? undefined
      : Number(req.query.limite);
    const fotografias = limite === undefined
      ? await listarFotografiasModel()
      : await listarFotografiasModel(limite);

    return res.status(200).json({
      fotografias,
      cantidad: fotografias.length,
    });
  } catch (error) {
    return next(error);
  }
}
