import { transmitirRecuerdosZip } from '../services/recuerdosZipService.js';

export async function descargarRecuerdosZip(req, res) {
  const controlador = new AbortController();
  const abortarSiSeDesconecta = () => {
    if (!res.writableEnded) {
      controlador.abort();
    }
  };

  res.once('close', abortarSiSeDesconecta);
  res.status(200).set({
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="recuerdos_xv.zip"',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });

  try {
    await transmitirRecuerdosZip(res, controlador.signal);
  } catch (error) {
    if (controlador.signal.aborted) {
      return;
    }

    console.error('No se pudo completar la generación del ZIP de recuerdos.', {
      codigo: typeof error?.code === 'string' ? error.code : 'ERROR',
    });

    if (res.headersSent) {
      res.destroy();
      return;
    }

    res.removeHeader('Content-Type');
    res.removeHeader('Content-Disposition');
    return res.status(502).json({
      error: 'No fue posible preparar todos los recuerdos. Inténtalo nuevamente.',
    });
  } finally {
    res.off('close', abortarSiSeDesconecta);
  }
}
