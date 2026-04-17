/**
 * Tema claro/oscuro para todas las páginas excepto Inicio.
 * Inicio (page-landing) siempre queda con fondo negro.
 */
(function () {
  var STORAGE_KEY = 'centro-theme';

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  }

  function setStored(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
  }

  function isDark() {
    return getStored() === 'dark';
  }

  function applyToDocument() {
    if (document.body.classList.contains('page-landing')) {
      updateButton();
      return;
    }
    if (isDark()) {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
    updateButton();
  }

  function updateButton() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    if (document.body.classList.contains('page-landing')) {
      btn.disabled = true;
      btn.setAttribute('aria-label', 'Inicio siempre tiene fondo negro');
      var label = btn.querySelector('.theme-toggle-label');
      if (label) label.textContent = 'black';
      btn.classList.add('theme-toggle-on');
      btn.classList.add('theme-toggle-disabled');
      return;
    }
    btn.disabled = false;
    btn.classList.remove('theme-toggle-disabled');
    var label = btn.querySelector('.theme-toggle-label');
    if (label) label.textContent = isDark() ? 'black' : 'white';
    btn.setAttribute('aria-checked', isDark() ? 'true' : 'false');
    btn.setAttribute('aria-label', isDark() ? 'Fondo negro activo. Pulsá para el fondo blanco' : 'Fondo blanco. Pulsá para el fondo negro');
    if (isDark()) btn.classList.add('theme-toggle-on'); else btn.classList.remove('theme-toggle-on');
  }

  function toggle() {
    var btn = document.getElementById('theme-toggle');
    if (document.body.classList.contains('page-landing') || !btn || btn.disabled) return;
    var next = isDark() ? 'light' : 'dark';
    setStored(next);
    applyToDocument();
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyToDocument();
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggle);
  });
})();
