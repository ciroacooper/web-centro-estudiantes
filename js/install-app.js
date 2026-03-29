/**
 * Botón "Instalar app" cuando el navegador dispara beforeinstallprompt (p. ej. Chrome Android).
 */
(function () {
  const btn = document.getElementById('pwa-install-btn');
  const hint = document.getElementById('pwa-install-hint');
  if (!btn) return;

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    btn.hidden = false;
    if (hint) hint.hidden = true;
  });

  btn.addEventListener('click', async function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.hidden = true;
  });

  window.addEventListener('appinstalled', function () {
    btn.hidden = true;
    if (hint) {
      hint.textContent = 'Listo: la app quedó instalada en tu dispositivo.';
      hint.hidden = false;
    }
  });
})();
