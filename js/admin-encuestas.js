/**
 * Panel admin: totales y desglose de la encuesta demo_v1
 */

const ENCUESTA_LABELS_Q1 = {
  mucho: 'Seguido',
  a_veces: 'A veces',
  poco: 'Casi nunca'
};

const ENCUESTA_LABELS_Q2 = {
  si: 'Sí',
  no: 'No',
  indistinto: 'Me da igual'
};

function encuestaLabelQ1(v) {
  return ENCUESTA_LABELS_Q1[v] || v;
}

function encuestaLabelQ2(v) {
  return ENCUESTA_LABELS_Q2[v] || v;
}

function aggregateCounts(rows, field) {
  const out = {};
  for (const row of rows) {
    const v = row[field];
    if (v == null) continue;
    out[v] = (out[v] || 0) + 1;
  }
  return out;
}

function renderBarRow(label, count, total) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return `
    <div class="encuesta-stat-row">
      <div class="encuesta-stat-line">
        <span class="encuesta-stat-label">${label}</span>
        <span class="encuesta-stat-num">${count}</span>
        <span class="encuesta-stat-pct">${pct}%</span>
      </div>
      <div class="encuesta-stat-bar-wrap" aria-hidden="true"><div class="encuesta-stat-bar" style="width:${pct}%"></div></div>
    </div>
  `;
}

function renderSection(title, counts, keysOrder, labelsMap, total) {
  let html = `<h3 class="encuesta-admin-h3">${title}</h3>`;
  for (const k of keysOrder) {
    const c = counts[k] || 0;
    html += renderBarRow(labelsMap[k] || k, c, total);
  }
  return html;
}

async function loadEncuestaAdmin(loadingId, errorId, statsId, tableId) {
  const loading = document.getElementById(loadingId);
  const errEl = document.getElementById(errorId);
  const statsEl = document.getElementById(statsId);
  const tableEl = document.getElementById(tableId);

  if (loading) loading.classList.remove('hidden');
  if (errEl) {
    errEl.classList.add('hidden');
    errEl.textContent = '';
  }
  if (statsEl) statsEl.innerHTML = '';
  if (tableEl) tableEl.innerHTML = '';

  try {
    const client = getSupabase();
    const { data, error } = await client
      .from('survey_responses')
      .select('id,q1,q2,comment,created_at,survey_key')
      .eq('survey_key', 'demo_v1')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('La tabla "survey_responses" no existe. Ejecutá supabase/survey-schema.sql en el SQL Editor de Supabase.');
      }
      throw error;
    }

    const rows = data || [];
    const total = rows.length;
    const q1c = aggregateCounts(rows, 'q1');
    const q2c = aggregateCounts(rows, 'q2');

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="encuesta-admin-summary">
          <p class="encuesta-admin-total"><strong>Total de respuestas:</strong> ${total}</p>
          <div class="encuesta-admin-blocks">
            <div class="encuesta-admin-block">
              ${renderSection('¿Con qué frecuencia usarías encuestas del centro en la web?', q1c, ['mucho', 'a_veces', 'poco'], ENCUESTA_LABELS_Q1, total)}
            </div>
            <div class="encuesta-admin-block">
              ${renderSection('¿Te interesa que las encuestas sean anónimas?', q2c, ['si', 'no', 'indistinto'], ENCUESTA_LABELS_Q2, total)}
            </div>
          </div>
        </div>
      `;
    }

    if (tableEl) {
      if (rows.length === 0) {
        tableEl.innerHTML = '<p class="intro">Aún no hay respuestas registradas.</p>';
      } else {
        let thead = '<table class="encuesta-admin-table"><thead><tr><th>Fecha</th><th>Pregunta 1</th><th>Pregunta 2</th><th>Comentario</th></tr></thead><tbody>';
        const body = rows.map((r) => {
          const d = r.created_at ? new Date(r.created_at).toLocaleString('es-AR') : '—';
          const c = r.comment ? String(r.comment).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—';
          return `<tr><td>${d}</td><td>${encuestaLabelQ1(r.q1)}</td><td>${encuestaLabelQ2(r.q2)}</td><td class="encuesta-admin-cell-comment">${c}</td></tr>`;
        }).join('');
        tableEl.innerHTML = thead + body + '</tbody></table>';
      }
    }
  } catch (e) {
    console.error(e);
    if (errEl) {
      errEl.textContent = e.message || 'Error al cargar las encuestas.';
      errEl.classList.remove('hidden');
    }
  } finally {
    if (loading) loading.classList.add('hidden');
  }
}

function initEncuestasAdmin() {
  loadEncuestaAdmin('encuestas-loading', 'encuestas-error', 'encuestas-stats', 'encuestas-tabla');
  const btn = document.getElementById('encuestas-refresh');
  if (btn) {
    btn.addEventListener('click', () => {
      loadEncuestaAdmin('encuestas-loading', 'encuestas-error', 'encuestas-stats', 'encuestas-tabla');
    });
  }
}
