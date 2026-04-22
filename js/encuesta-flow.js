/**
 * Flujo multipágina de encuesta: guards, sesión y envío a Supabase.
 */
function encuestaGetRespondentKey() {
  try {
    let k = localStorage.getItem(ENCUESTA_STORAGE_RESPONDENT);
    if (!k) {
      k = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(ENCUESTA_STORAGE_RESPONDENT, k);
    }
    return k;
  } catch {
    return 'anon-' + String(Date.now());
  }
}

function encuestaIsCompleted() {
  try {
    return localStorage.getItem(ENCUESTA_STORAGE_COMPLETED) === '1';
  } catch {
    return false;
  }
}

function encuestaSetCompleted() {
  try {
    localStorage.setItem(ENCUESTA_STORAGE_COMPLETED, '1');
  } catch (_) {}
}

function encuestaClearSessionFlow() {
  try {
    sessionStorage.removeItem(ENCUESTA_SESSION_STARTED);
    sessionStorage.removeItem(ENCUESTA_SESSION_AUTH);
    sessionStorage.removeItem(ENCUESTA_SESSION_Q1);
    sessionStorage.removeItem(ENCUESTA_SESSION_Q2);
  } catch (_) {}
}

function encuestaStarted() {
  return sessionStorage.getItem(ENCUESTA_SESSION_STARTED) === '1';
}

function encuestaAuthed() {
  return sessionStorage.getItem(ENCUESTA_SESSION_AUTH) === '1';
}

function encuestaRedirect(path) {
  window.location.href = path;
}

function encuestaSanitizeComment(text) {
  if (typeof text !== 'string') return '';
  const t = text.trim().slice(0, 500);
  if (/<script\b|javascript:\s|on\w+\s*=/i.test(t)) return '';
  return t;
}

function initEncuestaBienvenida() {
  if (encuestaIsCompleted()) {
    encuestaRedirect('gracias.html');
    return;
  }
  const btn = document.getElementById('encuesta-start');
  if (btn) {
    btn.addEventListener('click', () => {
      sessionStorage.setItem(ENCUESTA_SESSION_STARTED, '1');
      encuestaRedirect('acceso.html');
    });
  }
}

function initEncuestaAcceso() {
  if (encuestaIsCompleted()) {
    encuestaRedirect('gracias.html');
    return;
  }
  if (!encuestaStarted()) {
    encuestaRedirect('index.html');
    return;
  }

  const form = document.getElementById('form-encuesta-acceso');
  const msg = document.getElementById('encuesta-acceso-msg');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('encuesta-password');
    const val = input && input.value ? String(input.value).trim() : '';
    if (val === ENCUESTA_DEMO_PASSWORD) {
      sessionStorage.setItem(ENCUESTA_SESSION_AUTH, '1');
      if (input) input.value = '';
      if (msg) {
        msg.textContent = '';
        msg.className = 'form-message';
      }
      encuestaRedirect('pregunta-1.html');
    } else {
      if (msg) {
        msg.textContent = 'Contraseña incorrecta.';
        msg.className = 'form-message form-message-error';
      }
    }
  });
}

function initEncuestaPregunta1() {
  if (encuestaIsCompleted()) {
    encuestaRedirect('gracias.html');
    return;
  }
  if (!encuestaStarted()) {
    encuestaRedirect('index.html');
    return;
  }
  if (!encuestaAuthed()) {
    encuestaRedirect('acceso.html');
    return;
  }

  const form = document.getElementById('form-encuesta-p1');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sel = form.querySelector('input[name="q1"]:checked');
    if (!sel) return;
    sessionStorage.setItem(ENCUESTA_SESSION_Q1, sel.value);
    encuestaRedirect('pregunta-2.html');
  });
}

function initEncuestaPregunta2() {
  if (encuestaIsCompleted()) {
    encuestaRedirect('gracias.html');
    return;
  }
  if (!encuestaStarted() || !encuestaAuthed()) {
    encuestaRedirect('index.html');
    return;
  }
  if (!sessionStorage.getItem(ENCUESTA_SESSION_Q1)) {
    encuestaRedirect('pregunta-1.html');
    return;
  }

  const form = document.getElementById('form-encuesta-p2');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sel = form.querySelector('input[name="q2"]:checked');
    if (!sel) return;
    sessionStorage.setItem(ENCUESTA_SESSION_Q2, sel.value);
    encuestaRedirect('comentario.html');
  });
}

function initEncuestaComentario() {
  if (encuestaIsCompleted()) {
    encuestaRedirect('gracias.html');
    return;
  }
  if (!encuestaStarted() || !encuestaAuthed()) {
    encuestaRedirect('index.html');
    return;
  }
  const q1 = sessionStorage.getItem(ENCUESTA_SESSION_Q1);
  const q2 = sessionStorage.getItem(ENCUESTA_SESSION_Q2);
  if (!q1 || !q2) {
    encuestaRedirect('pregunta-1.html');
    return;
  }

  const form = document.getElementById('form-encuesta-comentario');
  const msg = document.getElementById('encuesta-comentario-msg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ta = document.getElementById('encuesta-comment');
    const comment = encuestaSanitizeComment(ta ? ta.value : '');

    if (typeof supabase === 'undefined') {
      if (msg) {
        msg.textContent = 'No se pudo cargar el envío. Revisá tu conexión.';
        msg.className = 'form-message form-message-error';
      }
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
        String(SUPABASE_URL).includes('TU_PROYECTO') || String(SUPABASE_ANON_KEY).includes('TU_ANON')) {
      if (msg) {
        msg.textContent =
          'Supabase no está configurado. Editá js/config.js o js/config.local.js y ejecutá supabase/survey-schema.sql en el proyecto.';
        msg.className = 'form-message form-message-error';
      }
      return;
    }

    const btn = document.getElementById('encuesta-submit-final');
    if (btn) btn.disabled = true;
    if (msg) {
      msg.textContent = 'Enviando...';
      msg.className = 'form-message';
    }

    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const respondentKey = encuestaGetRespondentKey();

    try {
      const { error } = await client.from('survey_responses').insert({
        survey_key: ENCUESTA_SURVEY_KEY,
        q1,
        q2,
        comment: comment || null,
        respondent_key: respondentKey
      });

      if (error) {
        if (error.code === '23505') {
          encuestaSetCompleted();
          encuestaClearSessionFlow();
          encuestaRedirect('gracias.html');
          return;
        }
        if (error.code === '42P01') {
          throw new Error('Falta la tabla. Ejecutá supabase/survey-schema.sql en Supabase.');
        }
        throw error;
      }

      encuestaSetCompleted();
      encuestaClearSessionFlow();
      encuestaRedirect('gracias.html');
    } catch (err) {
      console.error(err);
      if (msg) {
        msg.textContent = err.message || 'Error al enviar. Intentá de nuevo.';
        msg.className = 'form-message form-message-error';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function initEncuestaGracias() {
  if (!encuestaIsCompleted()) {
    encuestaRedirect('index.html');
    return;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body && document.body.getAttribute('data-encuesta-page');
  switch (page) {
    case 'bienvenida':
      initEncuestaBienvenida();
      break;
    case 'acceso':
      initEncuestaAcceso();
      break;
    case 'pregunta-1':
      initEncuestaPregunta1();
      break;
    case 'pregunta-2':
      initEncuestaPregunta2();
      break;
    case 'comentario':
      initEncuestaComentario();
      break;
    case 'gracias':
      initEncuestaGracias();
      break;
    default:
      break;
  }

  const warn = document.getElementById('file-protocol-warning');
  if (warn && window.location.protocol === 'file:') {
    warn.classList.remove('hidden');
  }
});
