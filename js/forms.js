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
      error: 'El contenido contiene palabras o frases inapropiadas. Por favor, usá un lenguaje respetuoso.' 
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

/** Opciones solo para type === 'problema': fotos desde galería o cámara */
const MAX_REPORT_IMAGES = 3;
const MAX_IMAGE_BYTES_BEFORE_COMPRESS = 8 * 1024 * 1024;
/** Si no se puede comprimir (HEIC en Chrome, tipo vacío, etc.), subimos el archivo tal cual hasta este tamaño */
const MAX_RAW_IMAGE_BYTES = 6 * 1024 * 1024;

function isLikelyImageFile(file) {
  if (file.type && file.type.startsWith('image/')) return true;
  const n = (file.name || '').toLowerCase();
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(n);
}

function guessImageExt(file) {
  const n = (file.name || '').toLowerCase();
  if (n.endsWith('.heic')) return 'heic';
  if (n.endsWith('.heif')) return 'heif';
  if (n.endsWith('.png')) return 'png';
  if (n.endsWith('.webp')) return 'webp';
  if (n.endsWith('.gif')) return 'gif';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/heic' || file.type === 'image/heif') return 'heic';
  return 'jpg';
}

function mimeForExt(ext) {
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    bmp: 'image/bmp'
  };
  return map[ext] || 'image/jpeg';
}

/**
 * Comprime una imagen a JPEG (ancho máx. 1920 px). Falla en HEIC en muchos navegadores → usar prepareImageForUpload.
 */
function compressImageToJpegBlob(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (!w || !h) {
        reject(new Error('decode'));
        return;
      }
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('decode'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('decode'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode'));
    };
    img.src = url;
  });
}

/**
 * Sube la imagen al Storage. Fotos ≤ MAX_RAW_IMAGE_BYTES van en crudo (evita fallos de canvas/toBlob en algunos móviles).
 * Solo se comprime cuando hace falta bajar el tamaño (> 6 MB y ≤ límite previo).
 */
async function prepareImageForUpload(file) {
  if (file.type === 'image/gif' || guessImageExt(file) === 'gif') {
    return { body: file, ext: 'gif', contentType: 'image/gif' };
  }
  if (file.size <= MAX_RAW_IMAGE_BYTES) {
    const ext = guessImageExt(file);
    const contentType =
      file.type && file.type.startsWith('image/') ? file.type : mimeForExt(ext);
    return { body: file, ext, contentType };
  }
  try {
    const blob = await compressImageToJpegBlob(file, 1920, 0.82);
    if (blob.size > MAX_RAW_IMAGE_BYTES) {
      throw new Error('decode');
    }
    return { body: blob, ext: 'jpg', contentType: 'image/jpeg' };
  } catch {
    throw new Error(
      'Esta foto no se pudo comprimir en el navegador y pesa más de 6 MB. En el iPhone: Ajustes → Cámara → Formatos → "Más compatible". O elegí una foto JPG/PNG más chica.'
    );
  }
}

async function uploadReportImagesToStorage(client, files) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!isLikelyImageFile(file)) {
      throw new Error('Solo se permiten archivos de imagen (JPEG, PNG, WebP, GIF, HEIC, etc.).');
    }
    if (file.size > MAX_IMAGE_BYTES_BEFORE_COMPRESS) {
      throw new Error('Alguna imagen es demasiado grande (máx. 8 MB antes de comprimir).');
    }
    const { body, ext, contentType } = await prepareImageForUpload(file);
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
    const path = `reports/${id}.${ext}`;
    const { error: upErr } = await client.storage.from('report-images').upload(path, body, {
      contentType,
      upsert: false
    });
    if (upErr) {
      console.error('Storage upload error:', upErr);
      const raw = `${upErr.message || ''} ${upErr.error || ''} ${upErr.statusCode || ''}`.toLowerCase();
      if (raw.includes('bucket not found') || raw.includes('404')) {
        throw new Error(
          'Falta el bucket de fotos en Supabase. En el panel: Storage → New bucket → nombre e id: report-images → público. Luego ejecutá supabase/storage-report-images.sql en el SQL Editor del mismo proyecto (misma URL que en js/config.js).'
        );
      }
      if (raw.includes('row-level security') || raw.includes('policy') || raw.includes('rls')) {
        throw new Error(
          'La subida de fotos está bloqueada por políticas en Supabase. Ejecutá supabase/storage-report-images.sql en el SQL Editor (políticas de Storage para report-images).'
        );
      }
      throw new Error(upErr.message || 'Error al subir una foto');
    }
    const { data: pub } = client.storage.from('report-images').getPublicUrl(path);
    if (pub && pub.publicUrl) urls.push(pub.publicUrl);
  }
  return urls;
}

/**
 * @param {object} [imageOptions] - solo para problemas: { inputId, previewId }
 */
function initForm(type, formId, contentId, charCountId, submitBtnId, imageOptions) {
  const form = document.getElementById(formId);
  const contentInput = document.getElementById(contentId);
  const charCountSpan = document.getElementById(charCountId);
  const submitBtn = document.getElementById(submitBtnId);
  const imageInput = imageOptions && imageOptions.inputId ? document.getElementById(imageOptions.inputId) : null;
  const previewEl = imageOptions && imageOptions.previewId ? document.getElementById(imageOptions.previewId) : null;

  if (!form || !contentInput || !charCountSpan || !submitBtn) return;

  let lastSubmitTime = 0;

  function renderImagePreview() {
    if (!previewEl || !imageInput) return;
    previewEl.innerHTML = '';
    const files = Array.from(imageInput.files || []);
    files.forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'report-image-preview-item';
      const img = document.createElement('img');
      img.alt = '';
      const objUrl = URL.createObjectURL(f);
      img.src = objUrl;
      img.onload = () => URL.revokeObjectURL(objUrl);
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        wrap.innerHTML = '';
        const span = document.createElement('span');
        span.className = 'report-image-preview-fallback';
        span.textContent = 'Foto';
        span.title = 'Vista previa no disponible en este navegador; igual se intentará subir';
        wrap.appendChild(span);
      };
      wrap.appendChild(img);
      previewEl.appendChild(wrap);
    });
    previewEl.classList.toggle('hidden', files.length === 0);
  }

  if (imageInput && type === 'problema') {
    imageInput.addEventListener('change', renderImagePreview);
  }

  // Contador de caracteres y validación en tiempo real
  contentInput.addEventListener('input', () => {
    charCountSpan.textContent = contentInput.value.length;
    
    // Validación en tiempo real de palabras prohibidas
    const prohibitedWords = detectProhibitedWords(contentInput.value);
    if (prohibitedWords.length > 0) {
      contentInput.style.borderColor = 'var(--color-error)';
      showMessage('form-message', '⚠️ El texto contiene palabras inapropiadas. Por favor, usá un lenguaje respetuoso.', true);
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

    let imageFiles = [];
    if (type === 'problema' && imageInput) {
      imageFiles = Array.from(imageInput.files || []);
      if (imageFiles.length > MAX_REPORT_IMAGES) {
        showMessage('form-message', `Podés adjuntar hasta ${MAX_REPORT_IMAGES} fotos.`, true);
        return;
      }
    }

    // Guardar el contenido validado (la sanitización se hace al mostrar en el admin)
    const contentToSend = validation.value;
    submitBtn.disabled = true;
    showMessage('form-message', imageFiles.length ? 'Subiendo fotos...' : 'Enviando...', false);

    try {
      if (typeof supabase === 'undefined') {
        throw new Error('Supabase no está cargado. Verificá tu conexión a internet.');
      }
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
          SUPABASE_URL.includes('TU_PROYECTO') || SUPABASE_ANON_KEY.includes('TU_ANON')) {
        throw new Error('Supabase no está configurado. Editá js/config.js con la URL y la anon key de tu proyecto en supabase.com');
      }

      const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      let imageUrls = [];
      if (imageFiles.length) {
        showMessage('form-message', 'Subiendo fotos...', false);
        try {
          imageUrls = await uploadReportImagesToStorage(client, imageFiles);
        } catch (uploadErr) {
          console.error('Error al subir fotos:', uploadErr);
          const detail = uploadErr.message || 'Error desconocido';
          const sendTextOnly = window.confirm(
            `No se pudieron subir las fotos.\n\n${detail}\n\n¿Enviar el reporte solo con el texto (sin fotos)?`
          );
          if (!sendTextOnly) {
            showMessage('form-message', detail, true);
            return;
          }
          imageUrls = [];
          showMessage('form-message', 'Enviando solo el texto del reporte...', false);
        }
      }

      const row = {
        type,
        content: contentToSend,
        status: 'pendiente'
      };
      if (type === 'problema' && imageUrls.length) {
        row.image_urls = imageUrls;
      }

      const { error } = await client.from('submissions').insert(row);

      if (error) {
        if (error.code === '42P01') {
          throw new Error('La tabla "submissions" no existe. Ejecutá supabase/schema.sql en el SQL Editor de Supabase.');
        }
        if (error.message && error.message.includes('image_urls')) {
          throw new Error(
            'Falta la columna image_urls en la tabla. Ejecutá supabase/submissions-image-urls.sql en Supabase.'
          );
        }
        if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
          throw new Error('La anon key es inválida. Verificá js/config.js con la clave de Settings > API en Supabase.');
        }
        throw error;
      }

      const okMsg = imageFiles.length && !row.image_urls
        ? '¡Enviado el texto! Las fotos no se pudieron subir: revisá Storage en Supabase (bucket report-images) y volvé a intentar con fotos.'
        : '¡Enviado correctamente! Será revisado por el centro de estudiantes.';
      showMessage('form-message', okMsg, false);
      lastSubmitTime = Date.now();
      contentInput.value = '';
      charCountSpan.textContent = '0';
      if (imageInput) {
        imageInput.value = '';
        renderImagePreview();
      }
    } catch (err) {
      console.error('Error al enviar:', err);
      let msg = err.message || 'Hubo un error al enviar. Intentá de nuevo más tarde.';
      if (msg === 'decode' || /(^|[^a-z])decode([^a-z]|$)/i.test(msg)) {
        msg =
          'No pudimos procesar esa foto en el navegador. Probá con otra imagen, exportá como JPG, o actualizá la página (recarga forzada).';
      }
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
        msg = 'Error de conexión. Si abrís la página como archivo (file://), probá con un servidor local (ej. npx serve) o subí el sitio a Netlify/Vercel.';
      }
      showMessage('form-message', msg, true);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
