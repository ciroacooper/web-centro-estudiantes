/**
 * Configuración de Supabase
 *
 * 1. Entrá a https://supabase.com/dashboard y abrí tu proyecto (o creá uno).
 * 2. En el menú: Settings (⚙️) → API.
 * 3. Copiá:
 *    - Project URL → reemplazá SUPABASE_URL abajo.
 *    - anon public → reemplazá SUPABASE_ANON_KEY abajo.
 * La anon key es pública; la seguridad viene de las políticas RLS en Supabase.
 */
const SUPABASE_URL = 'https://yxzwifzemikszdllnlmo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EMcmbLJAJN2RclVVkvR7Zg_SI6KjczB';

/** Modo prueba: salta login y entra directo al panel. Poner false antes de publicar. */
const TEST_MODE = false;

