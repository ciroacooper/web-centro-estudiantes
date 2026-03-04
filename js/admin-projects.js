/**
 * Gestión de proyectos del Centro de Estudiantes
 * Crear, editar y eliminar proyectos (solo admins)
 */

const PROJECT_STATUS_LABELS = {
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  planificado: 'Planificado'
};

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Inicializa la página de gestión de proyectos
 */
async function initAdminProjects() {
  const listEl = document.getElementById('projects-list');
  const loadingEl = document.getElementById('projects-loading');
  const emptyEl = document.getElementById('projects-empty');
  const formEl = document.getElementById('project-form');
  const formContainerEl = document.getElementById('project-form-container');
  const cancelBtn = document.getElementById('project-cancel-btn');

  if (!listEl || !loadingEl) return;

  const client = getSupabase();

  async function loadProjects() {
    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    listEl.innerHTML = '';

    const { data, error } = await client
      .from('projects')
      .select('id, title, description, status, meta, display_order, created_at, updated_at')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    loadingEl.classList.add('hidden');

    if (error) {
      let msg = error.message || 'Error desconocido';
      if (error.code === '42P01') {
        msg = 'La tabla "projects" no existe. Ejecutá supabase/projects-schema.sql en el SQL Editor de Supabase.';
      }
      listEl.innerHTML = '<p class="form-message-error">Error al cargar: ' + escapeHtml(msg) + '</p>';
      return;
    }

    if (!data || data.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    data.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'project-admin-card';
      card.innerHTML = `
        <div class="project-admin-header">
          <span class="badge badge-status badge-${p.status}">${PROJECT_STATUS_LABELS[p.status] || p.status}</span>
          <span class="project-admin-date">${formatDate(p.created_at)}</span>
        </div>
        <h3 class="project-admin-title">${escapeHtml(p.title)}</h3>
        <p class="project-admin-desc">${escapeHtml(p.description.length > 120 ? p.description.slice(0, 120) + '...' : p.description)}</p>
        ${p.meta ? `<p class="project-admin-meta">${escapeHtml(p.meta)}</p>` : ''}
        <div class="project-admin-actions">
          <button type="button" class="btn btn-secondary btn-edit-project" data-id="${p.id}">Editar</button>
          <button type="button" class="btn btn-secondary btn-delete-project" data-id="${p.id}">Eliminar</button>
        </div>
      `;

      card.querySelector('.btn-edit-project').addEventListener('click', () => openEditForm(p));
      card.querySelector('.btn-delete-project').addEventListener('click', () => deleteProject(p.id, loadProjects));
      listEl.appendChild(card);
    });
  }

  function openEditForm(project = null) {
    if (formContainerEl) {
      formContainerEl.classList.remove('hidden');
      formContainerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const idEl = document.getElementById('project-id');
    const titleEl = document.getElementById('project-title');
    const descEl = document.getElementById('project-description');
    const statusEl = document.getElementById('project-status');
    const metaEl = document.getElementById('project-meta');
    const msgEl = document.getElementById('project-message');
    if (idEl) idEl.value = project ? project.id : '';
    if (titleEl) titleEl.value = project ? project.title : '';
    if (descEl) descEl.value = project ? project.description : '';
    if (statusEl) statusEl.value = project ? project.status : 'en_curso';
    if (metaEl) metaEl.value = project ? (project.meta || '') : '';
    if (msgEl) msgEl.textContent = '';
    titleEl?.focus();
  }

  function closeForm() {
    if (formContainerEl) formContainerEl.classList.add('hidden');
  }

  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('project-id').value;
      const title = document.getElementById('project-title').value.trim();
      const description = document.getElementById('project-description').value.trim();
      const status = document.getElementById('project-status').value;
      const meta = document.getElementById('project-meta').value.trim() || null;
      const messageEl = document.getElementById('project-message');
      const submitBtn = document.getElementById('project-submit-btn');

      if (!title || !description) {
        messageEl.textContent = 'Título y descripción son obligatorios.';
        messageEl.className = 'form-message form-message-error';
        return;
      }

      submitBtn.disabled = true;
      messageEl.textContent = 'Guardando...';
      messageEl.className = 'form-message';

      const payload = { title, description, status, meta, display_order: 0, updated_at: new Date().toISOString() };

      let error;
      if (id) {
        const result = await client.from('projects').update(payload).eq('id', id);
        error = result.error;
      } else {
        const result = await client.from('projects').insert(payload);
        error = result.error;
      }

      submitBtn.disabled = false;

      if (error) {
        messageEl.textContent = 'Error: ' + (error.message || 'Error desconocido');
        messageEl.className = 'form-message form-message-error';
        return;
      }

      messageEl.textContent = id ? 'Proyecto actualizado correctamente.' : 'Proyecto creado correctamente.';
      messageEl.className = 'form-message form-message-success';
      await loadProjects();
      setTimeout(() => { closeForm(); }, 1500);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeForm);
  }

  const newBtn = document.getElementById('project-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openEditForm(null);
    });
  }

  await loadProjects();
}

async function deleteProject(id, onSuccess) {
  if (!confirm('¿Eliminar este proyecto? Esta acción no se puede deshacer.')) return;
  const client = getSupabase();
  const { error } = await client.from('projects').delete().eq('id', id);
  if (error) {
    alert('Error al eliminar: ' + (error.message || 'Error desconocido'));
    return;
  }
  await onSuccess();
}
