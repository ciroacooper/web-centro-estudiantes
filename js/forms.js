/**
 * Envío de formularios de ideas y reclamos
 * Validación, sanitización y envío a Supabase
 */

const MAX_CHARS = 700;

/**
 * Escapa caracteres para evitar XSS e inyección de HTML
 * Orden: & primero para evitar doble codificación
 */
function sanitize(text) {
  if (typeof text !== 'string') return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Lista de palabras prohibidas (insultos y malas palabras comunes en español)
 * Se detectan variaciones con números, mayúsculas, acentos, etc.
 */
const PROHIBITED_WORDS = [
  // Insultos graves
  'puto', 'puta', 'putos', 'putas', 'hijo de puta', 'hijos de puta', 'hdp',
  'concha', 'conchudo', 'conchuda', 'conchudos', 'conchudas',
  'pelotudo', 'pelotuda', 'pelotudos', 'pelotudas',
  'boludo', 'boluda', 'boludos', 'boludas',
  'forro', 'forra', 'forros', 'forras',
  'mogolico', 'mogolica', 'mogolicos', 'mogolicas',
  'retrasado', 'retrasada', 'retrasados', 'retrasadas',
  'imbecil', 'imbeciles', 'imbécil', 'imbéciles',
  'estupido', 'estupida', 'estupidos', 'estupidas', 'estúpido', 'estúpida', 'estúpidos', 'estúpidas',
  'marica', 'maricon', 'maricón', 'maricas', 'maricones',
  'joto', 'jota', 'jotos', 'jotas',
  'culero', 'culera', 'culeros', 'culeras',
  'pendejo', 'pendeja', 'pendejos', 'pendejas',
  'mamerto', 'mamerta', 'mamertos', 'mamertas',
  'huevon', 'huevona', 'huevones', 'huevonas', 'huevón', 'huevones',
  'gil', 'giles',
  'tarado', 'tarada', 'tarados', 'taradas',
  'capullo', 'capullos',
  'cabron', 'cabrona', 'cabrones', 'cabronas', 'cabrón',
  'mamaguevo', 'mamaguevos',
  'verga', 'vergas',
  'pito', 'pitos',
  'pija', 'pijas',
  'chupame', 'chupame la', 'chupar',
  'coger', 'cogerte', 'cogerse',
  'follar', 'follarte', 'follarse',
  'joder', 'jodete', 'joderse',
  'carajo', 'carajos',
  'coño', 'coños',
  'mierda', 'mierdas',
  'caca', 'cacas',
  'culo', 'culos', 'culo roto', 'culos rotos',
  'mamada', 'mamadas',
  'mamar', 'mamarte',
  'mamón', 'mamona', 'mamones', 'mamonas',
  'mamarracho', 'mamarrachos',
  'desgraciado', 'desgraciada', 'desgraciados', 'desgraciadas',
  'malparido', 'malparida', 'malparidos', 'malparidas',
  'hijo de perra', 'hijos de perra',
  'perra', 'perras',
  'zorra', 'zorras',
  'chupamedias', 'chupamedia',
  'lameculos', 'lameculo',
  'arrastrado', 'arrastrada', 'arrastrados', 'arrastradas',
  'vendido', 'vendida', 'vendidos', 'vendidas',
  'cobarde', 'cobardes'
];

/**
 * Normaliza el texto para comparación (elimina acentos, convierte a minúsculas, elimina espacios extra)
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[0-9]/g, '') // Elimina números
    .replace(/[^\w\s]/g, ' ') // Reemplaza caracteres especiales con espacios
    .replace(/\s+/g, ' ') // Normaliza espacios múltiples
    .trim();
}

/**
 * Detecta palabras prohibidas en el texto
 */
function detectProhibitedWords(text) {
  const normalized = normalizeText(text);
  const foundWords = [];

  for (const prohibitedWord of PROHIBITED_WORDS) {
    const normalizedProhibited = normalizeText(prohibitedWord);
    
    // Para frases de múltiples palabras, buscar la frase completa
    if (prohibitedWord.includes(' ')) {
      if (normalized.includes(normalizedProhibited)) {
        foundWords.push(prohibitedWord);
      }
    } else {
      // Para palabras individuales, buscar como palabra completa (con límites de palabra)
      const regex = new RegExp(`\\b${normalizedProhibited.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalized)) {
        foundWords.push(prohibitedWord);
      }
    }
  }

  return foundWords;
}

/**
 * Valida el contenido del formulario
 */
// Patrones que podrían indicar intento de inyección (bloqueo preventivo)
const BLOCKED_PATTERNS = /<script\b|javascript:\s|<\s*iframe|data:\s*text\/html|on(click|load|error|submit)\s*=/i;

function validateContent(content) {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'El campo no puede estar vacío.' };
  }
  if (trimmed.length > MAX_CHARS) {
    return { valid: false, error: `Máximo ${MAX_CHARS} caracteres.` };
  }
  if (BLOCKED_PATTERNS.test(trimmed)) {
    return { valid: false, error: 'El contenido contiene texto no permitido.' };
  }
  
  // Verificar palabras prohibidas
  const prohibitedWords = detectProhibitedWords(trimmed);
  if (prohibitedWords.length > 0) {
    return { 
      valid: false, 
      error: 'El contenido contiene palabras o frases inapropiadas. Por favor, utiliza un lenguaje respetuoso.' 
    };
  }
  
  return { valid: true, value: trimmed };
}

/**
 * Muestra un mensaje en el formulario
 */
function showMessage(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = 'form-message ' + (isError ? 'form-message-error' : 'form-message-success');
  el.setAttribute('role', 'alert');
}

/**
 * Inicializa un formulario de envío
 * @param {string} type - 'idea' o 'problema'
 * @param {string} formId - ID del formulario
 * @param {string} contentId - ID del textarea
 * @param {string} charCountId - ID del span del contador
 * @param {string} submitBtnId - ID del botón de envío
 */
const SUBMIT_COOLDOWN_MS = 5000; // Evita spam: mínimo 5 segundos entre envíos

function initForm(type, formId, contentId, charCountId, submitBtnId) {
  const form = document.getElementById(formId);
  const contentInput = document.getElementById(contentId);
  const charCountSpan = document.getElementById(charCountId);
  const submitBtn = document.getElementById(submitBtnId);

  if (!form || !contentInput || !charCountSpan || !submitBtn) return;

  let lastSubmitTime = 0;

  // Contador de caracteres y validación en tiempo real
  contentInput.addEventListener('input', () => {
    charCountSpan.textContent = contentInput.value.length;
    
    // Validación en tiempo real de palabras prohibidas
    const prohibitedWords = detectProhibitedWords(contentInput.value);
    if (prohibitedWords.length > 0) {
      contentInput.style.borderColor = 'var(--color-error)';
      showMessage('form-message', '⚠️ El texto contiene palabras inapropiadas. Por favor, utiliza un lenguaje respetuoso.', true);
    } else {
      contentInput.style.borderColor = '';
      const messageEl = document.getElementById('form-message');
      if (messageEl && messageEl.textContent.includes('inapropiadas')) {
        messageEl.textContent = '';
        messageEl.className = 'form-message';
      }
    }
  });
  charCountSpan.textContent = contentInput.value.length;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmitTime < SUBMIT_COOLDOWN_MS) {
      showMessage('form-message', 'Esperá unos segundos antes de enviar otro.', true);
      return;
    }
    const rawContent = contentInput.value;
    const validation = validateContent(rawContent);

    if (!validation.valid) {
      showMessage('form-message', validation.error, true);
      return;
    }

    // Guardar el contenido validado (la sanitización se hace al mostrar en el admin)
    const contentToSend = validation.value;
    submitBtn.disabled = true;
    showMessage('form-message', 'Enviando...', false);

    try {
      if (typeof supabase === 'undefined') {
        throw new Error('Supabase no está cargado. Verificá tu conexión a internet.');
      }
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
          SUPABASE_URL.includes('TU_PROYECTO') || SUPABASE_ANON_KEY.includes('TU_ANON')) {
        throw new Error('Supabase no está configurado. Editá js/config.js con la URL y la anon key de tu proyecto en supabase.com');
      }

      const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { error } = await client
        .from('submissions')
        .insert({
          type,
          content: contentToSend,
          status: 'pendiente'
        });

      if (error) {
        if (error.code === '42P01') {
          throw new Error('La tabla "submissions" no existe. Ejecutá supabase/schema.sql en el SQL Editor de Supabase.');
        }
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          throw new Error('La anon key es inválida. Verificá js/config.js con la clave de Settings > API en Supabase.');
        }
        throw error;
      }

      showMessage('form-message', '¡Enviado correctamente! Será revisado por el centro de estudiantes.', false);
      lastSubmitTime = Date.now();
      contentInput.value = '';
      charCountSpan.textContent = '0';
    } catch (err) {
      console.error('Error al enviar:', err);
      let msg = err.message || 'Hubo un error al enviar. Intentá de nuevo más tarde.';
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
        msg = 'Error de conexión. Si abrís la página como archivo (file://), probá con un servidor local (ej. npx serve) o subí el sitio a Netlify/Vercel.';
      }
      showMessage('form-message', msg, true);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
