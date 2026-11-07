import {
  listarFotografiasPaginadas,
  obtenerEstadisticasFotografias,
} from '../models/fotografiaModel.js';

export function verificarAdministrador(req, res) {
  return res.status(200).json({
    autenticado: true,
    mensaje: 'Administrador autenticado.',
  });
}

function convertirFechaAISO(fecha) {
  if (!fecha) {
    return null;
  }

  if (typeof fecha.toDate === 'function') {
    return fecha.toDate().toISOString();
  }

  return null;
}

function serializarFotografia(fotografia) {
  return {
    id: fotografia.id,
    nombreOriginal: fotografia.nombreOriginal,
    urlMiniatura: fotografia.urlMiniatura,
    fechaSubida: convertirFechaAISO(fotografia.fechaSubida),
  };
}

export async function listarFotografiasAdministrador(req, res, next) {
  const limite = req.query.limite === undefined ? 20 : Number(req.query.limite);
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
        || cursor.includes('/')
      )
    )
  ) {
    return res.status(400).json({
      error: 'Los parámetros de paginación no son válidos.',
    });
  }

  try {
    const pagina = await listarFotografiasPaginadas({ limite, cursor });

    if (!pagina) {
      return res.status(400).json({
        error: 'El cursor de paginación ya no existe. Actualiza la lista.',
      });
    }

    return res.status(200).json({
      fotografias: pagina.fotografias.map(serializarFotografia),
      siguienteCursor: pagina.siguienteCursor,
    });
  } catch (error) {
    return next(error);
  }
}

export async function obtenerEstadisticasAdministrador(req, res, next) {
  try {
    const estadisticas = await obtenerEstadisticasFotografias();

    return res.status(200).json({
      totalFotografias: estadisticas.totalFotografias,
      fechaUltimaSubida: convertirFechaAISO(estadisticas.fechaUltimaSubida),
    });
  } catch (error) {
    return next(error);
  }
}
