/**
 * Autenticación y protección de rutas del panel de administración
 */

let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    if (typeof supabase === 'undefined' || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
        supabaseClient = supabase.createClient(
          'https://placeholder.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
        );
      } else {
        throw new Error('Supabase no está configurado. Revisa js/config.js');
      }
    } else {
      supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  }
  return supabaseClient;
}

/**
 * Verifica si el usuario actual es admin (vía RPC que usa SECURITY DEFINER)
 */
async function checkIsAdmin() {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return false;

  const { data, error } = await client.rpc('check_if_admin');
  if (error || data !== true) return false;
  return true;
}

/**
 * Requiere que el usuario esté autenticado y sea admin.
 * Redirige a login si no está autenticado.
 * Muestra mensaje de acceso denegado si no es admin.
 * @param {string} redirectTo - Página a la que redirigir si no autenticado
 */
async function requireAdmin(redirectTo = 'admin/index.html') {
  if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
    return { user: { email: 'test' }, isAdmin: true };
  }
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();

  if (!user) {
    window.location.href = redirectTo;
    return null;
  }

  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    window.location.href = redirectTo;
    return null;
  }

  return { user, isAdmin: true };
}

/**
 * Inicia sesión con email y contraseña
 */
async function login(email, password) {
  const client = getSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Cierra sesión
 */
async function logout() {
  const client = getSupabase();
  await client.auth.signOut();
  // Script is only loaded from admin/*.html, so index.html is admin login
  window.location.href = 'index.html';
}
