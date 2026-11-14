import { rateLimit } from 'express-rate-limit';

export function crearLimitadoresSubida({
  limiteNavegador,
  limiteIp,
  ventanaMs,
}) {
  const limitarPorIp = rateLimit({
    windowMs: ventanaMs,
    limit: limiteIp,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Se alcanzó el límite agregado de subidas. Inténtalo de nuevo más tarde.',
      });
    },
  });

  const limitarPorNavegador = rateLimit({
    windowMs: ventanaMs,
    limit: limiteNavegador,
    keyGenerator: (req) => req.uploadVisitorId,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Este navegador alcanzó el límite de subidas. Inténtalo de nuevo más tarde.',
      });
    },
  });

  return {
    limitarPorIp,
    limitarPorNavegador,
  };
}
