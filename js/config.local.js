/**
 * Overrides opcionales (mirá js/config.local.example.js).
 * Se fusionan con los valores por defecto de js/config.js.
 * Si este archivo solo tiene `{}`, no sube nada sensible a git; si agregás claves reales y el repo es público, agregá js/config.local.js al .gitignore o no commitees ese cambio.
 */
window.CENTRO_CONFIG_LOCAL = Object.assign(window.CENTRO_CONFIG_LOCAL || {}, {
    USE_AI_MODERATION: true,
  });