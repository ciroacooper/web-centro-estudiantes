# Pasos que tenés que hacer vos (después del deploy PWA)

El proyecto ya incluye: `manifest.json`, iconos en `assets/icons/`, `sw.js`, `js/pwa.js`, enlaces en todas las páginas y cabecera en Netlify para el manifest.

---

## 1. Subir los cambios a GitHub (y que Netlify despliegue)

En una terminal, en la carpeta del proyecto:

```powershell
cd "c:\Users\Ciro\OneDrive\Desktop\web centro de estudiantes-js"
git add .
git commit -m "PWA: manifest, iconos, service worker"
git push
```

Esperá a que Netlify termine el deploy (panel del sitio en verde).

Si `git` no se reconoce, abrí **Git Bash** o la terminal de **GitHub Desktop** desde ese repositorio y ejecutá los mismos comandos ahí.

---

## 2. Supabase (producción)

En [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto:

1. **Authentication** → **URL Configuration**
   - **Site URL**: `https://TU-SITIO.netlify.app` (tu URL real).
   - **Redirect URLs**: agregá una línea como  
     `https://TU-SITIO.netlify.app/**`

2. En **js/config.js** tenés que tener la **URL del proyecto** y la **anon key** reales (no los placeholders).

Sin esto, el login del admin y los formularios pueden fallar en la web publicada.

---

## 3. Probar la PWA en el celular

1. Abrí Chrome en Android y entrá a `https://TU-SITIO.netlify.app/`.
2. Menú (⋮) → **Instalar app** o **Agregar a la pantalla de inicio** (el texto varía).
3. En **iPhone (Safari)**: botón compartir → **Añadir a inicio**.  
   (En iOS no es idéntico a Android, pero sirve para acceso rápido.)

Si no aparece “Instalar”, probá de nuevo después de una segunda visita o con el sitio ya desplegado con HTTPS.

---

## 4. Regenerar iconos (opcional)

Los archivos `assets/icons/icon-192.png` e `icon-512.png` se generaron recortando el centro de `assets/logo.png`. Si querés otro encuadre:

1. Editá el logo en un editor de imágenes.
2. Exportá **cuadrado** 192×192 y 512×512.
3. Sobrescribí esos dos PNG en `assets/icons/`.
4. Volvé a hacer `git add`, `commit` y `push`.

---

## 5. QR para carteles

1. Entrá a un generador gratuito (por ejemplo [goqr.me](https://goqr.me)).
2. Tipo **URL**: `https://TU-SITIO.netlify.app/`
3. Descargá un PNG grande e imprimí con buen tamaño (varios cm de lado).

---

## 6. Dominio propio (opcional)

En Netlify: **Domain settings** → agregar dominio personalizado y seguir el asistente (DNS en tu proveedor de dominio). Después actualizá:

- La URL en Supabase (Site URL y Redirect URLs).
- Los QR y carteles con la nueva URL.

---

## 7. App en Google Play / App Store

Eso **no** se hace solo con esta web: hace falta un contenedor tipo **Capacitor**, cuenta de desarrollador y proceso de revisión. Es un proyecto aparte; si lo necesitás, conviene planificarlo con tiempo o ayuda de alguien con experiencia en publicación de apps.

---

## 8. Comprobar que el manifest y el SW cargan

En el navegador (en la web ya desplegada):

- Abrí `https://TU-SITIO.netlify.app/manifest.json` → debería verse el JSON.
- En **Herramientas de desarrollador** → pestaña **Application** (Chrome) → **Manifest** y **Service Workers** para ver si está registrado.

Si algo falla, revisá la consola (F12) en rojo y el log de deploy en Netlify.
