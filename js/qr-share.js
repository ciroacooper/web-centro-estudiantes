function setQrShareMessage(message, isError) {
  const el = document.getElementById('share-qr-message');
  if (!el) return;
  el.textContent = message;
  el.className = 'form-message ' + (isError ? 'form-message-error' : 'form-message-success');
}

async function shareQrImage() {
  const qrUrl = 'assets/qr-centro-estudiantes.png';
  try {
    if (!navigator.share) {
      setQrShareMessage('Tu navegador no permite compartir directo. Usá "Descargar QR".', true);
      return;
    }

    const response = await fetch(qrUrl);
    if (!response.ok) {
      throw new Error('No se pudo cargar el QR.');
    }

    const blob = await response.blob();
    const file = new File([blob], 'qr-centro-estudiantes.png', { type: blob.type || 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'QR Centro de Estudiantes EPET 21',
        text: 'Te comparto el QR del sitio del Centro de Estudiantes EPET 21.',
        files: [file]
      });
      setQrShareMessage('Listo. Se abrió el menú para enviar el QR.', false);
      return;
    }

    await navigator.share({
      title: 'Centro de Estudiantes EPET 21',
      text: 'Te comparto el sitio del Centro de Estudiantes EPET 21: https://centro-estudiantes.netlify.app/',
      url: 'https://centro-estudiantes.netlify.app/'
    });
    setQrShareMessage('Tu dispositivo compartió el enlace del sitio.', false);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return;
    }
    setQrShareMessage('No se pudo compartir ahora. Probá con "Descargar QR".', true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('share-qr-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    shareQrImage();
  });
});
