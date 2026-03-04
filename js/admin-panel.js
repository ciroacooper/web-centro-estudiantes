/**
 * Panel de administración: lista de submissions y moderación
 * Usa getSupabase() de admin-auth.js
 */

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado'
};

const TYPE_LABELS = {
  idea: 'Idea',
  problema: 'Problema'
};

/** Datos de demostración para modo prueba sin Supabase configurado */
const DEMO_SUBMISSIONS = [
  { id: 'demo-1', type: 'idea', content: 'Proponer más actividades recreativas en los recreos.', status: 'pendiente', created_at: new Date().toISOString(), deleted_at: null },
  { id: 'demo-2', type: 'problema', content: 'El baño del primer piso tiene una canilla que gotea.', status: 'en_proceso', created_at: new Date(Date.now() - 86400000).toISOString(), deleted_at: null },
  { id: 'demo-3', type: 'idea', content: 'Crear un espacio de estudio silencioso en la biblioteca.', status: 'aprobado', created_at: new Date(Date.now() - 172800000).toISOString(), deleted_at: null }
];

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

/**
 * Inicializa el panel con lista de submissions y filtros
 */
async function initPanel(listId, loadingId, emptyId, filterTypeId, filterStatusId) {
  const listEl = document.getElementById(listId);
  const loadingEl = document.getElementById(loadingId);
  const emptyEl = document.getElementById(emptyId);
  const filterType = document.getElementById(filterTypeId);
  const filterStatus = document.getElementById(filterStatusId);

  async function loadAndRender() {
    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    listEl.innerHTML = '';

    const client = getSupabase();
    let query = client
      .from('submissions')
      .select('id, type, content, status, created_at, deleted_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const typeVal = filterType.value;
    const statusVal = filterStatus.value;
    if (typeVal) query = query.eq('type', typeVal);
    if (statusVal) query = query.eq('status', statusVal);

    let data, error;
    try {
      const result = await query;
      data = result.data;
      error = result.error;
    } catch (e) {
      error = e;
    }

    loadingEl.classList.add('hidden');

    if (error && typeof TEST_MODE !== 'undefined' && TEST_MODE) {
      data = DEMO_SUBMISSIONS.filter(s => {
        if (s.deleted_at) return false;
        if (typeVal && s.type !== typeVal) return false;
        if (statusVal && s.status !== statusVal) return false;
        return true;
      });
      listEl.innerHTML = '<p class="form-message" style="color:var(--color-text-muted);margin-bottom:1rem;">Modo prueba: mostrando datos de demostración (Supabase no conectado).</p>';
    } else if (error) {
      listEl.innerHTML = '<p class="form-message-error">Error al cargar: ' + escapeHtml(error.message || 'Error desconocido') + '</p>';
      return;
    }

    if (!data || data.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    data.forEach((s) => {
      const card = document.createElement('article');
      card.className = 'submission-card' + (s.deleted_at ? ' submission-card-deleted' : '');
      card.dataset.submissionId = s.id;
      const preview = s.content.length > 150 ? s.content.slice(0, 150) + '...' : s.content;
      const isDeleted = !!s.deleted_at;
      card.innerHTML = `
        <div class="submission-card-header">
          <span class="badge badge-${s.type}">${TYPE_LABELS[s.type] || s.type}</span>
          <span class="badge badge-status badge-${s.status}">${STATUS_LABELS[s.status] || s.status}</span>
          ${isDeleted ? '<span class="badge badge-deleted">Borrado</span>' : ''}
          <span class="submission-date">${formatDate(s.created_at)}</span>
        </div>
        ${isDeleted ? `
          <p class="submission-deleted-note">Mensaje borrado</p>
          <div class="submission-preview-wrap submission-preview-hidden" aria-hidden="true">
            <p class="submission-preview">${escapeHtml(preview)}</p>
          </div>
          <button type="button" class="btn btn-link btn-toggle-content" aria-pressed="false">Ver contenido</button>
        ` : `
          <p class="submission-preview">${escapeHtml(preview)}</p>
          <div class="submission-actions">
            <button type="button" class="btn btn-secondary btn-open-chat" data-id="${s.id}">Abrir chat</button>
            <button type="button" class="btn btn-secondary btn-delete-message" data-id="${s.id}">Borrar mensaje</button>
            <a href="detalle.html?id=${s.id}" class="link">Ver detalle</a>
          </div>
        `}
      `;
      
      if (isDeleted) {
        const toggleBtn = card.querySelector('.btn-toggle-content');
        const wrap = card.querySelector('.submission-preview-wrap');
        if (toggleBtn && wrap) {
          toggleBtn.addEventListener('click', () => {
            const hidden = wrap.classList.toggle('submission-preview-hidden');
            wrap.setAttribute('aria-hidden', hidden);
            toggleBtn.textContent = hidden ? 'Ver contenido' : 'Ocultar contenido';
            toggleBtn.setAttribute('aria-pressed', !hidden);
          });
        }
      } else {
        const chatBtn = card.querySelector('.btn-open-chat');
        if (chatBtn) {
          chatBtn.addEventListener('click', () => {
            openChat(s, client);
          });
        }
        const deleteBtn = card.querySelector('.btn-delete-message');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (!confirm('¿Borrar este mensaje? Se mostrará como "Mensaje borrado" y no se puede deshacer.')) return;
            const { error } = await client.from('submissions').update({ deleted_at: new Date().toISOString() }).eq('id', s.id);
            if (error) {
              alert('Error al borrar: ' + (error.message || 'Error desconocido'));
              return;
            }
            await loadAndRender();
          });
        }
      }
      
      listEl.appendChild(card);
    });
  }

  filterType.addEventListener('change', loadAndRender);
  filterStatus.addEventListener('change', loadAndRender);
  await loadAndRender();
  
  // Inicializar chat del panel
  const client = getSupabase();
  initPanelChat(client);
}

/**
 * Inicializa el chat en el panel de administración
 */
function initPanelChat(client) {
  const chatContainer = document.getElementById('chat-container');
  const adminInfo = document.getElementById('admin-info');
  const closeChatBtn = document.getElementById('close-chat-btn');
  
  if (closeChatBtn && chatContainer && adminInfo) {
    closeChatBtn.addEventListener('click', () => {
      chatContainer.classList.add('hidden');
      adminInfo.classList.remove('hidden');
      // Deseleccionar todas las tarjetas
      document.querySelectorAll('.submission-card').forEach(card => {
        card.classList.remove('selected');
      });
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Inicializa la página de detalle de un submission
 */
async function initDetalle(
  id,
  loadingId,
  containerId,
  notFoundId,
  formId,
  statusSelectId,
  saveBtnId,
  messageId
) {
  const loadingEl = document.getElementById(loadingId);
  const containerEl = document.getElementById(containerId);
  const notFoundEl = document.getElementById(notFoundId);
  const form = document.getElementById(formId);
  const statusSelect = document.getElementById(statusSelectId);
  const saveBtn = document.getElementById(saveBtnId);
  const messageEl = document.getElementById(messageId);

  const client = getSupabase();

  let submission, error;
  if (typeof TEST_MODE !== 'undefined' && TEST_MODE && String(id).startsWith('demo-')) {
    submission = DEMO_SUBMISSIONS.find(s => s.id === id);
    error = submission ? null : { message: 'No encontrado' };
  } else {
    const result = await client.from('submissions').select('id, type, content, status, created_at, deleted_at').eq('id', id).single();
    submission = result.data;
    error = result.error;
  }

  loadingEl.classList.add('hidden');

  if (error || !submission) {
    notFoundEl.classList.remove('hidden');
    return;
  }

  containerEl.classList.remove('hidden');
  const detailMeta = document.getElementById('detail-meta') || containerEl.querySelector('.detail-meta');
  const detailContent = document.getElementById('detail-content') || containerEl.querySelector('.detail-content');
  const detailContentText = document.getElementById('detail-content-text');

  document.getElementById('detail-type').textContent = TYPE_LABELS[submission.type] || submission.type;
  document.getElementById('detail-type').className = 'badge badge-' + submission.type;
  document.getElementById('detail-status').textContent = STATUS_LABELS[submission.status] || submission.status;
  document.getElementById('detail-status').className = 'badge badge-status badge-' + submission.status;
  document.getElementById('detail-date').textContent = formatDate(submission.created_at);
  detailContentText.textContent = submission.content;
  statusSelect.value = submission.status;

  const isDeleted = !!submission.deleted_at;
  if (detailMeta && isDeleted) {
    const badgeDeleted = document.createElement('span');
    badgeDeleted.className = 'badge badge-deleted';
    badgeDeleted.textContent = 'Borrado';
    detailMeta.appendChild(badgeDeleted);
  }

  if (detailContent) {
    if (isDeleted) {
      detailContent.classList.add('detail-content-is-deleted');
      const note = document.createElement('p');
      note.className = 'submission-deleted-note';
      note.textContent = 'Mensaje borrado';
      const wrap = document.createElement('div');
      wrap.className = 'submission-preview-wrap submission-preview-hidden';
      wrap.setAttribute('aria-hidden', 'true');
      detailContentText.parentNode.insertBefore(note, detailContentText);
      wrap.appendChild(detailContentText);
      detailContent.appendChild(wrap);
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn btn-link btn-toggle-content';
      toggleBtn.setAttribute('aria-pressed', 'false');
      toggleBtn.textContent = 'Ver contenido';
      toggleBtn.addEventListener('click', () => {
        const hidden = wrap.classList.toggle('submission-preview-hidden');
        wrap.setAttribute('aria-hidden', hidden);
        toggleBtn.textContent = hidden ? 'Ver contenido' : 'Ocultar contenido';
        toggleBtn.setAttribute('aria-pressed', !hidden);
      });
      detailContent.appendChild(toggleBtn);
    } else {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-secondary btn-delete-message';
      deleteBtn.textContent = 'Borrar mensaje';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('¿Borrar este mensaje? Se mostrará como "Mensaje borrado" y no se puede deshacer.')) return;
        if (typeof TEST_MODE !== 'undefined' && TEST_MODE && String(id).startsWith('demo-')) {
          submission.deleted_at = new Date().toISOString();
          detailContent.innerHTML = '';
          const h3 = document.createElement('h3');
          h3.textContent = 'Contenido (solo lectura)';
          detailContent.appendChild(h3);
          const note = document.createElement('p');
          note.className = 'submission-deleted-note';
          note.textContent = 'Mensaje borrado';
          detailContent.appendChild(note);
          const wrap = document.createElement('div');
          wrap.className = 'submission-preview-wrap submission-preview-hidden';
          wrap.setAttribute('aria-hidden', 'true');
          const p = document.createElement('div');
          p.id = 'detail-content-text';
          p.className = 'detail-content-text';
          p.textContent = submission.content;
          wrap.appendChild(p);
          detailContent.appendChild(wrap);
          const toggleBtn = document.createElement('button');
          toggleBtn.type = 'button';
          toggleBtn.className = 'btn btn-link btn-toggle-content';
          toggleBtn.setAttribute('aria-pressed', 'false');
          toggleBtn.textContent = 'Ver contenido';
          toggleBtn.addEventListener('click', () => {
            const hidden = wrap.classList.toggle('submission-preview-hidden');
            wrap.setAttribute('aria-hidden', hidden);
            toggleBtn.textContent = hidden ? 'Ver contenido' : 'Ocultar contenido';
            toggleBtn.setAttribute('aria-pressed', !hidden);
          });
          detailContent.appendChild(toggleBtn);
          if (detailMeta && !detailMeta.querySelector('.badge-deleted')) {
            const badgeDeleted = document.createElement('span');
            badgeDeleted.className = 'badge badge-deleted';
            badgeDeleted.textContent = 'Borrado';
            detailMeta.appendChild(badgeDeleted);
          }
          deleteBtn.remove();
          return;
        }
        const { error: updateError } = await client.from('submissions').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (updateError) {
          alert('Error al borrar: ' + (updateError.message || 'Error desconocido'));
          return;
        }
        submission.deleted_at = new Date().toISOString();
        if (detailMeta && !detailMeta.querySelector('.badge-deleted')) {
          const badgeDeleted = document.createElement('span');
          badgeDeleted.className = 'badge badge-deleted';
          badgeDeleted.textContent = 'Borrado';
          detailMeta.appendChild(badgeDeleted);
        }
        deleteBtn.remove();
        detailContent.classList.add('detail-content-is-deleted');
        const note = document.createElement('p');
        note.className = 'submission-deleted-note';
        note.textContent = 'Mensaje borrado';
        const wrap = document.createElement('div');
        wrap.className = 'submission-preview-wrap submission-preview-hidden';
        wrap.setAttribute('aria-hidden', 'true');
        const textEl = detailContent.querySelector('.detail-content-text');
        if (textEl) {
          textEl.parentNode.insertBefore(note, textEl);
          wrap.appendChild(textEl);
          detailContent.appendChild(wrap);
        }
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'btn btn-link btn-toggle-content';
        toggleBtn.setAttribute('aria-pressed', 'false');
        toggleBtn.textContent = 'Ver contenido';
        toggleBtn.addEventListener('click', () => {
          const hidden = wrap.classList.toggle('submission-preview-hidden');
          wrap.setAttribute('aria-hidden', hidden);
          toggleBtn.textContent = hidden ? 'Ver contenido' : 'Ocultar contenido';
          toggleBtn.setAttribute('aria-pressed', !hidden);
        });
        detailContent.appendChild(toggleBtn);
      });
      detailContent.appendChild(deleteBtn);
    }
  }

  function showMsg(msg, isError) {
    messageEl.textContent = msg;
    messageEl.className = 'form-message ' + (isError ? 'form-message-error' : 'form-message-success');
  }

  async function loadHistory() {
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '';
    if (typeof TEST_MODE !== 'undefined' && TEST_MODE && String(id).startsWith('demo-')) {
      listEl.innerHTML = '<p>Sin cambios registrados (modo demo).</p>';
      return;
    }
    const { data: history } = await client
      .from('submission_history')
      .select('previous_status, new_status, changed_at')
      .eq('submission_id', id)
      .order('changed_at', { ascending: false });

    if (!history || history.length === 0) {
      listEl.innerHTML = '<p>Sin cambios registrados.</p>';
      return;
    }
    history.forEach((h) => {
      const li = document.createElement('div');
      li.className = 'history-item';
      li.textContent = `${formatDate(h.changed_at)}: ${STATUS_LABELS[h.previous_status] || h.previous_status} → ${STATUS_LABELS[h.new_status] || h.new_status}`;
      listEl.appendChild(li);
    });
  }

  await loadHistory();

  // Inicializar foro de comentarios
  try {
    initForum(id, client);
  } catch (err) {
    console.error('Error al inicializar el foro:', err);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newStatus = statusSelect.value;
    if (newStatus === submission.status) {
      showMsg('El estado no ha cambiado.', false);
      return;
    }

    saveBtn.disabled = true;
    showMsg('Guardando...', false);

    let updateError;
    if (typeof TEST_MODE !== 'undefined' && TEST_MODE && String(id).startsWith('demo-')) {
      submission.status = newStatus;
      document.getElementById('detail-status').textContent = STATUS_LABELS[newStatus] || newStatus;
      document.getElementById('detail-status').className = 'badge badge-status badge-' + newStatus;
      showMsg('Estado actualizado (modo demo, no se guarda en base de datos).', false);
      saveBtn.disabled = false;
      return;
    }
    const result = await client.from('submissions').update({ status: newStatus }).eq('id', id);
    updateError = result.error;

    saveBtn.disabled = false;

    if (updateError) {
      showMsg(updateError.message || 'Error al guardar.', true);
      return;
    }

    submission.status = newStatus;
    document.getElementById('detail-status').textContent = STATUS_LABELS[newStatus] || newStatus;
    document.getElementById('detail-status').className = 'badge badge-status badge-' + newStatus;
    showMsg('Estado actualizado correctamente.', false);
    await loadHistory();
  });
}

/**
 * Datos de demostración para comentarios en modo prueba
 */
const DEMO_COMMENTS = [
  { id: 'demo-comment-1', admin_email: 'admin1@ejemplo.com', comment: 'Creo que esta idea es muy buena y debería aprobarse.', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 'demo-comment-2', admin_email: 'admin2@ejemplo.com', comment: 'Estoy de acuerdo, pero necesitamos más detalles sobre cómo implementarla.', created_at: new Date(Date.now() - 1800000).toISOString() }
];

/**
 * Inicializa el foro de comentarios para un submission
 */
async function initForum(submissionId, client) {
  const commentForm = document.getElementById('comment-form');
  const commentText = document.getElementById('comment-text');
  const commentCharCount = document.getElementById('comment-char-count');
  const submitCommentBtn = document.getElementById('submit-comment-btn');
  const commentMessage = document.getElementById('comment-message');
  const commentsList = document.getElementById('comments-list');
  const commentsLoading = document.getElementById('comments-loading');
  const commentsEmpty = document.getElementById('comments-empty');

  // Verificar que todos los elementos existan
  if (!commentForm || !commentText || !commentCharCount || !submitCommentBtn || 
      !commentMessage || !commentsList || !commentsLoading || !commentsEmpty) {
    console.error('Error: No se encontraron todos los elementos del foro', {
      commentForm: !!commentForm,
      commentText: !!commentText,
      commentCharCount: !!commentCharCount,
      submitCommentBtn: !!submitCommentBtn,
      commentMessage: !!commentMessage,
      commentsList: !!commentsList,
      commentsLoading: !!commentsLoading,
      commentsEmpty: !!commentsEmpty
    });
    return;
  }

  // Contador de caracteres
  commentText.addEventListener('input', () => {
    commentCharCount.textContent = commentText.value.length;
  });

  // Función para mostrar mensajes
  function showCommentMsg(msg, isError) {
    commentMessage.textContent = msg;
    commentMessage.className = 'form-message ' + (isError ? 'form-message-error' : 'form-message-success');
  }

  // Función para cargar comentarios
  async function loadComments() {
    if (!commentsLoading || !commentsEmpty || !commentsList) return;
    
    commentsLoading.classList.remove('hidden');
    commentsEmpty.classList.add('hidden');
    commentsList.innerHTML = '';

    let comments, error;
    
    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
      // En modo demo, usar comentarios de demostración para cualquier submission
      comments = DEMO_COMMENTS;
      error = null;
    } else {
      try {
        const result = await client
          .from('submission_comments')
          .select('id, admin_email, comment, created_at')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: true });
        comments = result.data;
        error = result.error;
      } catch (e) {
        error = e;
        comments = null;
      }
    }

    commentsLoading.classList.add('hidden');

    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
      // En modo demo, mostrar comentarios de demostración
      if (comments && comments.length > 0) {
        renderComments(comments);
      } else {
        commentsEmpty.classList.remove('hidden');
      }
    } else if (error) {
      // En caso de error, mostrar mensaje pero permitir comentar
      commentsList.innerHTML = '<p class="form-message" style="color:var(--color-text-muted);">No se pudieron cargar comentarios anteriores. Puedes agregar nuevos comentarios.</p>';
    } else {
      if (!comments || comments.length === 0) {
        commentsEmpty.classList.remove('hidden');
      } else {
        renderComments(comments);
      }
    }
  }

  // Función para renderizar comentarios
  function renderComments(comments) {
    if (!commentsList) return;
    commentsList.innerHTML = '';
    comments.forEach((comment) => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment-item';
      commentEl.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.admin_email)}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <div class="comment-content">${escapeHtml(comment.comment)}</div>
      `;
      commentsList.appendChild(commentEl);
    });
    // Auto-scroll al final de la lista de comentarios
    setTimeout(() => {
      if (commentsList) {
        commentsList.scrollTop = commentsList.scrollHeight;
      }
    }, 100);
  }

  // Manejar envío de comentario
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comment = commentText.value.trim();

    if (!comment) {
      showCommentMsg('Por favor escribe un comentario.', true);
      return;
    }

    submitCommentBtn.disabled = true;
    showCommentMsg('Publicando comentario...', false);

    let currentUser;
    let adminEmail = 'admin@ejemplo.com'; // Valor por defecto para modo demo

    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
      // En modo demo, simular comentario
      const demoComment = {
        id: 'demo-comment-' + Date.now(),
        admin_email: adminEmail,
        comment: comment,
        created_at: new Date().toISOString()
      };
      DEMO_COMMENTS.push(demoComment);
      commentText.value = '';
      commentCharCount.textContent = '0';
      showCommentMsg('Comentario publicado (modo demo).', false);
      submitCommentBtn.disabled = false;
      await loadComments();
      return;
    }

    // Obtener usuario actual
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user || !user.email) {
        throw new Error('No se pudo obtener el usuario actual');
      }
      currentUser = user;
      adminEmail = user.email;
    } catch (err) {
      showCommentMsg('Error al obtener información del usuario: ' + err.message, true);
      submitCommentBtn.disabled = false;
      return;
    }

    // Insertar comentario
    const { data, error } = await client
      .from('submission_comments')
      .insert({
        submission_id: submissionId,
        admin_id: currentUser.id,
        admin_email: adminEmail,
        comment: comment
      })
      .select()
      .single();

    submitCommentBtn.disabled = false;

    if (error) {
      showCommentMsg('Error al publicar comentario: ' + (error.message || 'Error desconocido'), true);
      return;
    }

    commentText.value = '';
    commentCharCount.textContent = '0';
    showCommentMsg('Comentario publicado correctamente.', false);
    await loadComments();
    // Enfocar el textarea después de publicar
    setTimeout(() => {
      commentText.focus();
    }, 100);
  });

  // Cargar comentarios al inicializar
  await loadComments();
}

/**
 * Inicializa el chat en el panel de administración
 */
function initPanelChat(client) {
  const chatContainer = document.getElementById('chat-container');
  const adminInfo = document.getElementById('admin-info');
  const closeChatBtn = document.getElementById('close-chat-btn');
  
  if (closeChatBtn && chatContainer && adminInfo) {
    closeChatBtn.addEventListener('click', () => {
      chatContainer.classList.add('hidden');
      adminInfo.classList.remove('hidden');
      // Deseleccionar todas las tarjetas
      document.querySelectorAll('.submission-card').forEach(card => {
        card.classList.remove('selected');
      });
    });
  }
}

/**
 * Abre el chat para un submission específico en el panel
 */
function openChat(submission, client = null) {
  if (!client) {
    client = getSupabase();
  }
  
  const chatContainer = document.getElementById('chat-container');
  const adminInfo = document.getElementById('admin-info');
  const chatSubmissionTitle = document.getElementById('chat-submission-title');
  const chatSubmissionInfo = document.getElementById('chat-submission-info');
  
  if (!chatContainer || !adminInfo) return;
  
  // Ocultar información de administradores y mostrar el chat
  adminInfo.classList.add('hidden');
  chatContainer.classList.remove('hidden');
  
  // Actualizar información del submission
  const preview = submission.content.length > 100 ? submission.content.slice(0, 100) + '...' : submission.content;
  if (chatSubmissionTitle) {
    chatSubmissionTitle.textContent = `Chat - ${TYPE_LABELS[submission.type] || submission.type}`;
  }
  if (chatSubmissionInfo) {
    chatSubmissionInfo.innerHTML = `
      <div class="chat-submission-meta">
        <span class="badge badge-${submission.type}">${TYPE_LABELS[submission.type] || submission.type}</span>
        <span class="badge badge-status badge-${submission.status}">${STATUS_LABELS[submission.status] || submission.status}</span>
        <span class="chat-submission-date">${formatDate(submission.created_at)}</span>
      </div>
      <p class="chat-submission-content">${escapeHtml(preview)}</p>
    `;
  }
  
  // Inicializar el chat para este submission
  initPanelForum(submission.id, client);
  
  // Marcar la tarjeta como seleccionada
  document.querySelectorAll('.submission-card').forEach(card => {
    card.classList.remove('selected');
    if (card.dataset.submissionId === submission.id) {
      card.classList.add('selected');
    }
  });
}

/**
 * Inicializa el foro de comentarios en el panel (versión para panel.html)
 */
async function initPanelForum(submissionId, client) {
  const commentForm = document.getElementById('chat-comment-form');
  const commentText = document.getElementById('chat-comment-text');
  const commentCharCount = document.getElementById('chat-comment-char-count');
  const submitCommentBtn = document.getElementById('chat-submit-comment-btn');
  const commentMessage = document.getElementById('chat-comment-message');
  const commentsList = document.getElementById('chat-comments-list');
  const commentsLoading = document.getElementById('chat-comments-loading');
  const commentsEmpty = document.getElementById('chat-comments-empty');

  if (!commentForm || !commentText || !commentCharCount || !submitCommentBtn || 
      !commentMessage || !commentsList || !commentsLoading || !commentsEmpty) {
    console.error('Error: No se encontraron todos los elementos del chat del panel');
    return;
  }

  // Remover listeners anteriores si existen
  const newCommentForm = commentForm.cloneNode(true);
  commentForm.parentNode.replaceChild(newCommentForm, commentForm);
  const newCommentText = document.getElementById('chat-comment-text');
  const newCommentCharCount = document.getElementById('chat-comment-char-count');

  // Limpiar formulario
  newCommentText.value = '';
  newCommentCharCount.textContent = '0';
  commentMessage.textContent = '';
  commentMessage.className = 'form-message';

  // Contador de caracteres
  newCommentText.addEventListener('input', () => {
    newCommentCharCount.textContent = newCommentText.value.length;
  });

  // Función para mostrar mensajes
  function showCommentMsg(msg, isError) {
    commentMessage.textContent = msg;
    commentMessage.className = 'form-message ' + (isError ? 'form-message-error' : 'form-message-success');
  }

  // Función para cargar comentarios
  async function loadComments() {
    if (!commentsLoading || !commentsEmpty || !commentsList) return;
    
    commentsLoading.classList.remove('hidden');
    commentsEmpty.classList.add('hidden');
    commentsList.innerHTML = '';

    let comments, error;
    
    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
      comments = DEMO_COMMENTS;
      error = null;
    } else {
      try {
        const result = await client
          .from('submission_comments')
          .select('id, admin_email, comment, created_at')
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: true });
        comments = result.data;
        error = result.error;
      } catch (e) {
        error = e;
        comments = null;
      }
    }

    commentsLoading.classList.add('hidden');

    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
      if (comments && comments.length > 0) {
        renderComments(comments);
      } else {
        commentsEmpty.classList.remove('hidden');
      }
    } else if (error) {
      commentsList.innerHTML = '<p class="form-message" style="color:var(--color-text-muted);">No se pudieron cargar comentarios anteriores. Puedes agregar nuevos comentarios.</p>';
    } else {
      if (!comments || comments.length === 0) {
        commentsEmpty.classList.remove('hidden');
      } else {
        renderComments(comments);
      }
    }
  }

  // Función para renderizar comentarios
  function renderComments(comments) {
    if (!commentsList) return;
    commentsList.innerHTML = '';
    comments.forEach((comment) => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment-item';
      commentEl.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${escapeHtml(comment.admin_email)}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <div class="comment-content">${escapeHtml(comment.comment)}</div>
      `;
      commentsList.appendChild(commentEl);
    });
    setTimeout(() => {
      if (commentsList) {
        commentsList.scrollTop = commentsList.scrollHeight;
      }
    }, 100);
  }

  // Manejar envío de comentario
  newCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comment = newCommentText.value.trim();

    if (!comment) {
      showCommentMsg('Por favor escribe un comentario.', true);
      return;
    }

    submitCommentBtn.disabled = true;
    showCommentMsg('Publicando comentario...', false);

    let currentUser;
    let adminEmail = 'admin@ejemplo.com';

    if (typeof TEST_MODE !== 'undefined' && TEST_MODE) {
      const demoComment = {
        id: 'demo-comment-' + Date.now(),
        admin_email: adminEmail,
        comment: comment,
        created_at: new Date().toISOString()
      };
      DEMO_COMMENTS.push(demoComment);
      newCommentText.value = '';
      newCommentCharCount.textContent = '0';
      showCommentMsg('Comentario publicado (modo demo).', false);
      submitCommentBtn.disabled = false;
      await loadComments();
      return;
    }

    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user || !user.email) {
        throw new Error('No se pudo obtener el usuario actual');
      }
      currentUser = user;
      adminEmail = user.email;
    } catch (err) {
      showCommentMsg('Error al obtener información del usuario: ' + err.message, true);
      submitCommentBtn.disabled = false;
      return;
    }

    const { data, error } = await client
      .from('submission_comments')
      .insert({
        submission_id: submissionId,
        admin_id: currentUser.id,
        admin_email: adminEmail,
        comment: comment
      })
      .select()
      .single();

    submitCommentBtn.disabled = false;

    if (error) {
      showCommentMsg('Error al publicar comentario: ' + (error.message || 'Error desconocido'), true);
      return;
    }

    newCommentText.value = '';
    newCommentCharCount.textContent = '0';
    showCommentMsg('Comentario publicado correctamente.', false);
    await loadComments();
    setTimeout(() => {
      newCommentText.focus();
    }, 100);
  });

  // Cargar comentarios al inicializar
  await loadComments();
}

/**
 * Inicializa la bandeja de mensajes borrados (Papelera)
 */
async function initPapelera(listId, loadingId, emptyId) {
  const listEl = document.getElementById(listId);
  const loadingEl = document.getElementById(loadingId);
  const emptyEl = document.getElementById(emptyId);

  if (!listEl || !loadingEl) return;

  const client = getSupabase();

  async function loadAndRender() {
    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    listEl.innerHTML = '';

    const { data, error } = await client
      .from('submissions')
      .select('id, type, content, status, created_at, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    loadingEl.classList.add('hidden');

    if (error) {
      listEl.innerHTML = '<p class="form-message-error">Error al cargar: ' + escapeHtml(error.message || 'Error desconocido') + '</p>';
      return;
    }

    if (!data || data.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    data.forEach((s) => {
      const card = document.createElement('article');
      card.className = 'submission-card submission-card-deleted';
      card.dataset.submissionId = s.id;
      const preview = s.content.length > 150 ? s.content.slice(0, 150) + '...' : s.content;
      const deletedDate = s.deleted_at ? formatDate(s.deleted_at) : '';
      card.innerHTML = `
        <div class="submission-card-header">
          <span class="badge badge-${s.type}">${TYPE_LABELS[s.type] || s.type}</span>
          <span class="badge badge-status badge-${s.status}">${STATUS_LABELS[s.status] || s.status}</span>
          <span class="badge badge-deleted">Borrado</span>
          <span class="submission-date">${formatDate(s.created_at)}</span>
        </div>
        <p class="submission-deleted-note">Borrado el ${deletedDate}</p>
        <div class="submission-preview-wrap">
          <p class="submission-preview">${escapeHtml(preview)}</p>
        </div>
        <div class="submission-actions">
          <button type="button" class="btn btn-secondary btn-restore-message" data-id="${s.id}">Restaurar</button>
          <a href="detalle.html?id=${s.id}" class="link">Ver detalle</a>
        </div>
      `;

      card.querySelector('.btn-restore-message').addEventListener('click', async () => {
        if (!confirm('¿Restaurar este mensaje? Volverá a aparecer en el panel principal.')) return;
        const { error: updateError } = await client.from('submissions').update({ deleted_at: null }).eq('id', s.id);
        if (updateError) {
          alert('Error al restaurar: ' + (updateError.message || 'Error desconocido'));
          return;
        }
        await loadAndRender();
      });

      listEl.appendChild(card);
    });
  }

  await loadAndRender();
}
