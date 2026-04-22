/**
 * Configuración de Supabase
 *
 * 1. Dashboard: https://supabase.com/dashboard → tu proyecto → Settings (⚙️) → API.
 * 2. Project URL → SUPABASE_URL.
 * 3. Clave pública del cliente:
 *    - puede aparecer como "anon" "public" o "publishable" (a veces empieza con sb_publishable_);
 *    - la clave JWT larga (eyJ...) también sirve como anon key.
 * 4. Nunca pegues la "service_role" en el front: solo en backend; con ella se saltan las RLS.
 *
 * Overrides por entorno: editá js/config.local.js (vacío por defecto) o mirá js/config.local.example.js.
 * En cada HTML que carga config.js, va primero config.local.js.
 */
window.CENTRO_CONFIG_LOCAL = window.CENTRO_CONFIG_LOCAL || {};

const _CENTRO_DEFAULTS = {
  SUPABASE_URL: 'https://yxzwifzemikszdllnlmo.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_EMcmbLJAJN2RclVVkvR7Zg_SI6KjczB',
  /** Modo prueba: salta login y entra directo al panel. Poner false antes de publicar. */
  TEST_MODE: false,
  /** Habilita adjuntar fotos en "Reportar problema". */
  ENABLE_REPORT_IMAGES: true,
  /**
   * Moderación con Groq vía Edge Function `verify-report`.
   * La API de Groq NO va acá: solo en el servidor.
   *   supabase secrets set GROQ_API_KEY=gsk_...
   *   supabase functions deploy verify-report --no-verify-jwt
   * La lista de palabras en forms.js sigue como primera capa local.
   */
  USE_AI_MODERATION: true,
};

const _cfg = Object.assign({}, _CENTRO_DEFAULTS, window.CENTRO_CONFIG_LOCAL);
const SUPABASE_URL = _cfg.SUPABASE_URL;
const SUPABASE_ANON_KEY = _cfg.SUPABASE_ANON_KEY;
const TEST_MODE = _cfg.TEST_MODE;
const ENABLE_REPORT_IMAGES = _cfg.ENABLE_REPORT_IMAGES;
const USE_AI_MODERATION = _cfg.USE_AI_MODERATION;
