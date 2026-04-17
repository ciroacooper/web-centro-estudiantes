/**
 * Menú lateral (icono hamburguesa): dos bloques — Sitio web y Administración.
 * Convierte el <nav class="nav"> existente: quita los <a> y deja tema / cerrar sesión.
 */
(function () {
  /** Solo en páginas bajo /admin/ — no en el sitio público */
  function canShowAdminSection(ctx) {
    return ctx.inAdmin === true;
  }

  function getNavContext() {
    const pathname = window.location.pathname.replace(/\\/g, '/');
    const segments = pathname.split('/').filter(Boolean);
    const file = segments.length ? segments[segments.length - 1] : 'index.html';
    const inAdmin = segments.includes('admin');
    const inEncuesta = segments.includes('encuesta');

    let root = '';
    let admin = 'admin/';
    if (inAdmin) {
      root = '../';
      admin = '';
    } else if (inEncuesta) {
      root = '../';
      admin = '../admin/';
    }

    return { root, admin, inAdmin, inEncuesta, file, pathname };
  }

  function normalizePathname(p) {
    let x = p.replace(/\\/g, '/');
    if (/\/index\.html$/i.test(x)) {
      x = x.slice(0, -'/index.html'.length);
    }
    x = x.replace(/\/+$/, '') || '/';
    return x;
  }

  function hrefIsActive(href) {
    try {
      const u = new URL(href, window.location.href);
      const a = normalizePathname(u.pathname);
      const b = normalizePathname(window.location.pathname);
      if (a === b) return true;
      if (b.includes('/admin/detalle') && u.pathname.replace(/\\/g, '/').endsWith('/admin/panel.html')) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function buildDrawerLinks(ctx) {
    const r = ctx.root;
    const a = ctx.admin;

    const sitio = [
      { label: 'Inicio', href: `${r}index.html` },
      { label: 'Explorar', href: `${r}explorar.html` },
      { label: 'Enviar idea', href: `${r}enviar-idea.html` },
      { label: 'Reportar problema', href: `${r}reportar-problema.html` },
      { label: 'Proyectos', href: `${r}proyectos.html` },
      { label: 'Descargar app', href: `${r}descargar-app.html` },
      { label: 'Contacto', href: `${r}contacto.html` },
      { label: 'Próximamente', href: `${r}encuesta/index.html` }
    ];

    const adminLinks = [
      { label: 'Acceso a la administración', href: `${a}index.html` },
      { label: 'Panel admin', href: `${a}panel.html` },
      { label: 'Encuestas (resultados)', href: `${a}encuestas.html` },
      { label: 'Proyectos (admin)', href: `${a}proyectos.html` },
      { label: 'Papelera', href: `${a}papelera.html` }
    ];

    return { sitio, adminLinks };
  }

  function renderList(links) {
    return links
      .map((item) => {
        const active = hrefIsActive(item.href) ? ' aria-current="page"' : '';
        return `<li><a href="${item.href}"${active}>${item.label}</a></li>`;
      })
      .join('');
  }

  function createDrawer(ctx) {
    const { sitio, adminLinks } = buildDrawerLinks(ctx);
    const showAdminSection = canShowAdminSection(ctx);
    const adminSectionHtml = showAdminSection
      ? `
          <section class="nav-drawer-group">
            <h3 class="nav-drawer-group-title">Administración</h3>
            <ul class="nav-drawer-list">${renderList(adminLinks)}</ul>
          </section>
        `
      : '';
    const el = document.createElement('div');
    el.id = 'nav-drawer';
    el.className = 'nav-drawer';
    el.setAttribute('hidden', '');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="nav-drawer-backdrop" tabindex="-1"></div>
      <aside class="nav-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="nav-drawer-title">
        <div class="nav-drawer-head">
          <span id="nav-drawer-title" class="nav-drawer-title">Menú</span>
          <button type="button" class="nav-drawer-close" aria-label="Cerrar menú">&times;</button>
        </div>
        <nav class="nav-drawer-body" aria-label="Secciones del sitio">
          <section class="nav-drawer-group">
            <h3 class="nav-drawer-group-title">Sitio web</h3>
            <ul class="nav-drawer-list">${renderList(sitio)}</ul>
          </section>
          ${adminSectionHtml}
        </nav>
      </aside>
    `;
    return el;
  }

  function openDrawer(drawer, toggle) {
    drawer.removeAttribute('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-drawer-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
    }
    const closeBtn = drawer.querySelector('.nav-drawer-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeDrawer(drawer, toggle) {
    drawer.setAttribute('hidden', '');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-drawer-open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  }

  function init() {
    const nav = document.querySelector('header .nav');
    if (!nav || nav.dataset.navDrawerInit === '1') return;
    nav.dataset.navDrawerInit = '1';

    nav.querySelectorAll('a').forEach((link) => link.remove());

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.id = 'nav-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'nav-drawer');
    toggle.setAttribute('aria-label', 'Abrir menú de navegación');
    toggle.innerHTML = '<span class="nav-toggle-bars" aria-hidden="true"></span>';

    nav.insertBefore(toggle, nav.firstChild);

    const ctx = getNavContext();
    const drawer = createDrawer(ctx);
    document.body.appendChild(drawer);

    /* navbar_loop_animation.html: slideIn + 85 ms entre cada ítem (índice global en el panel) */
    drawer.querySelectorAll('.nav-drawer-list li').forEach((li, i) => {
      li.style.setProperty('--nav-loop-delay', `${i * 85}ms`);
    });

    const backdrop = drawer.querySelector('.nav-drawer-backdrop');
    const closeBtn = drawer.querySelector('.nav-drawer-close');

    toggle.addEventListener('click', () => {
      if (drawer.hasAttribute('hidden')) {
        openDrawer(drawer, toggle);
      } else {
        closeDrawer(drawer, toggle);
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', () => closeDrawer(drawer, toggle));
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeDrawer(drawer, toggle));
    }

    drawer.querySelectorAll('.nav-drawer-list a').forEach((link) => {
      link.addEventListener('click', () => closeDrawer(drawer, toggle));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer.hasAttribute('hidden')) {
        closeDrawer(drawer, toggle);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
