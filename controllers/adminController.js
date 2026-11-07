export function verificarAdministrador(req, res) {
  return res.status(200).json({
    autenticado: true,
    mensaje: 'Administrador autenticado.',
  });
}
