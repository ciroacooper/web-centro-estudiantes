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
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4endpZnplbWlrc3pkbGxubG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NjAyNDAsImV4cCI6MjA4NjMzNjI0MH0.7449_oN8tMMiKMMrXmtIlEGo7PGvM_8PTC5mM6cR_t0';

/** Modo prueba: salta login y entra directo al panel. Poner false antes de publicar. */
const TEST_MODE = false;

