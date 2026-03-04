/**
 * Carga y muestra los proyectos en la página pública proyectos.html
 */

const PROJECT_STATUS_LABELS = {
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  planificado: 'Planificado'
};

const PROJECT_STATUS_CLASSES = {
  en_curso: 'project-status-active',
  finalizado: 'project-status-finalizado',
  planificado: 'project-status-planificado'
};

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Carga los proyectos desde Supabase y los renderiza
 */
async function loadProjects() {
  const gridEl = document.getElementById('projects-grid');
  const loadingEl = document.getElementById('projects-loading');
  const emptyEl = document.getElementById('projects-empty');
  const moreEl = document.getElementById('projects-more');

  if (!gridEl) return;

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (emptyEl) emptyEl.classList.add('hidden');

  if (typeof supabase === 'undefined' || !SUPABASE_URL || !SUPABASE_ANON_KEY ||
      SUPABASE_URL.includes('TU_PROYECTO') || SUPABASE_ANON_KEY.includes('TU_ANON')) {
    if (loadingEl) loadingEl.classList.add('hidden');
    return; // Mantener el contenido estático de ejemplo
  }

  try {
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await client
      .from('projects')
      .select('id, title, description, status, meta, display_order, created_at')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (loadingEl) loadingEl.classList.add('hidden');

    if (error) {
      console.error('Error al cargar proyectos:', error);
      return;
    }

    if (!data || data.length === 0) {
      gridEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (moreEl) moreEl.classList.remove('hidden');
      return;
    }

    // Limpiar el grid y reemplazar con proyectos reales
    gridEl.innerHTML = '';

    data.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'project-card';
      const statusClass = PROJECT_STATUS_CLASSES[p.status] || 'project-status-active';
      card.innerHTML = `
        <span class="project-status ${statusClass}">${PROJECT_STATUS_LABELS[p.status] || p.status}</span>
        <h3 class="project-title">${escapeHtml(p.title)}</h3>
        <p class="project-desc">${escapeHtml(p.description)}</p>
        ${p.meta ? `<p class="project-meta">${escapeHtml(p.meta)}</p>` : ''}
      `;
      gridEl.appendChild(card);
    });
  } catch (err) {
    console.error('Error al cargar proyectos:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
  }
}
