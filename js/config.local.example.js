/**
 * Ejemplo de overrides. Podés pegar propiedades dentro del Object.assign de js/config.local.js:
 *
 * window.CENTRO_CONFIG_LOCAL = Object.assign(window.CENTRO_CONFIG_LOCAL || {}, {
 *   SUPABASE_URL: 'https://TU_PROYECTO.supabase.co',
 *   SUPABASE_ANON_KEY: 'eyJ... o sb_publishable_...',
 *   TEST_MODE: false,
 *   ENABLE_REPORT_IMAGES: true,
 *   USE_AI_MODERATION: true,
 * });
 *
 * Groq (gsk_...) solo en el servidor:
 *   supabase secrets set GROQ_API_KEY=gsk_...
 * Nunca service_role ni Groq en el navegador.
 */
window.CENTRO_CONFIG_LOCAL = Object.assign(window.CENTRO_CONFIG_LOCAL || {}, {});
