// Lógica compartida de los decks: barra de navegación, configuración, rejilla en perspectiva y callouts.
// Uso: initDeck({ tabs: [[clave, etiqueta, idDiapositiva], ...], serviceKey: 'service', mailSubject: '...' })
export async function initDeck({ tabs: TABS, serviceKey = 'service', mailSubject = 'Proyecto web 3D' }) {
  const SITE = await fetch('../config.json').then((r) => r.json());
  window.SITE = SITE;
  const anchors = await fetch('../assets/renders/anchors.json').then((r) => r.json());
  const slides = [...document.querySelectorAll('.slide')];
  const N = slides.length;
  const pad = (n) => String(n).padStart(2, '0');

  // Barra superior + navegación inferior en cada diapositiva (todo son enlaces internos del PDF)
  slides.forEach((s, i) => {
    const top = document.createElement('div');
    top.className = 'chrome-top';
    top.innerHTML = `<a class="brand" href="#s1">${SITE.studio}<small>${SITE[serviceKey]}</small></a>
      <nav class="tabs">${TABS.map(([k, label, id]) => `<a href="#${id}" class="${s.dataset.tab === k ? 'on' : ''}">${label}</a>`).join('')}</nav>`;
    const bottom = document.createElement('div');
    bottom.className = 'chrome-bottom';
    const prev = i > 0 ? `<a class="navbtn" href="#${slides[i - 1].id}"><span class="ar">←</span>Anterior</a>` : '';
    const next = i < N - 1 ? `<a class="navbtn" href="#${slides[i + 1].id}">Siguiente<span class="ar">→</span></a>` : `<a class="navbtn" href="#s1">Volver al inicio<span class="ar">↑</span></a>`;
    bottom.innerHTML = `${i > 0 ? '<a class="navbtn" href="#s2"><span class="ham"></span>Índice</a>' : '<span class="count">Este PDF se navega: toca el índice, las pestañas o las flechas.</span>'}
      <div class="pager"><span class="count"><b>${pad(i + 1)}</b> / ${pad(N)}</span>${prev}${next}</div>`;
    s.prepend(top); s.append(bottom);
  });

  // Configuración
  document.querySelectorAll('[data-cfg]').forEach((el) => { el.textContent = SITE[el.dataset.cfg] ?? ''; });
  document.querySelectorAll('[data-if]').forEach((el) => { if (!SITE[el.dataset.if]) el.hidden = true; });
  document.querySelectorAll('[data-cfg-href]').forEach((el) => {
    const k = el.dataset.cfgHref;
    if (k === 'mailto') el.href = `mailto:${SITE.email}?subject=${encodeURIComponent(mailSubject)}`;
    else if (k === 'whatsapp') el.href = `https://wa.me/${String(SITE.whatsapp).replace(/\D/g, '')}`;
    else el.href = SITE[k];
  });

  // Rejilla en perspectiva (vectorial) para dar suelo a las escenas
  document.querySelectorAll('svg[data-grid]').forEach((svg) => {
    const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
    const vx = w * 0.62, vy = -h * 0.9;
    let out = '<defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5be4ff" stop-opacity="0"/><stop offset="1" stop-color="#5be4ff" stop-opacity=".22"/></linearGradient></defs>';
    for (let x = -w; x <= w * 2; x += 120) out += `<line x1="${vx + (x - vx) * 0.08}" y1="0" x2="${x}" y2="${h}" stroke="url(#gf)" stroke-width="1.2"/>`;
    for (let k = 1; k <= 9; k++) { const y = h * Math.pow(k / 9, 2.2); out += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#5be4ff" stroke-opacity="${0.04 + 0.16 * (y / h)}" stroke-width="1.2"/>`; }
    svg.innerHTML = out;
  });

  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));

  // Posición de cada anclaje (en px de la diapositiva) a partir de anchors.json
  const slideRect = (el) => el.closest('.slide').getBoundingClientRect();
  function anchorPoint(key) {
    const [name, id] = key.split(':');
    const box = document.querySelector(`.slide [data-anchors="${name}"]`);
    const a = anchors[name]?.find((x) => x.id === id);
    if (!box || !a) return null;
    const r = box.getBoundingClientRect(), s = slideRect(box);
    return { x: r.left - s.left + (a.x / 100) * r.width, y: r.top - s.top + (a.y / 100) * r.height, slide: box.closest('.slide') };
  }
  function leaders(slide) {
    let s = slide.querySelector(':scope > svg.leaders');
    if (!s) { s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'leaders'); s.setAttribute('viewBox', '0 0 1920 1080'); slide.appendChild(s); }
    return s;
  }
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#080912" stroke="#5be4ff" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="3.5" fill="#ffb088"/>`;

  // Callouts y mockups colocados respecto a su anclaje
  document.querySelectorAll('[data-place]').forEach((el) => {
    const p = anchorPoint(el.dataset.place);
    if (!p) return;
    el.style.left = `${p.x + Number(el.dataset.dx || 0)}px`;
    el.style.top = `${p.y + Number(el.dataset.dy || 0)}px`;
    if (el.classList.contains('card') || el.classList.contains('ui-mock')) {
      const r = el.getBoundingClientRect(), s = slideRect(el);
      const box = { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top };
      const tx = Math.min(Math.max(p.x, box.l), box.r), ty = Math.min(Math.max(p.y, box.t), box.b);
      leaders(p.slide).insertAdjacentHTML('beforeend', `<line x1="${p.x}" y1="${p.y}" x2="${tx}" y2="${ty}" stroke="#5be4ff" stroke-width="2" stroke-dasharray="6 6"/>${dot(p.x, p.y)}`);
    }
  });

  // Callouts con posición fija y línea hasta su anclaje
  document.querySelectorAll('[data-at]').forEach((el) => {
    const [x, y] = el.dataset.at.split(',').map(Number);
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    const p = anchorPoint(el.dataset.for);
    if (!p) return;
    const r = el.getBoundingClientRect(), s = slideRect(el);
    const box = { l: r.left - s.left, t: r.top - s.top, r: r.right - s.left, b: r.bottom - s.top };
    const tx = Math.min(Math.max(p.x, box.l), box.r), ty = Math.min(Math.max(p.y, box.t), box.b);
    leaders(p.slide).insertAdjacentHTML('beforeend', `<line x1="${p.x}" y1="${p.y}" x2="${tx}" y2="${ty}" stroke="#5be4ff" stroke-width="2" stroke-dasharray="6 6"/>${dot(p.x, p.y)}`);
  });
  // Línea del marcador del edificio hacia la tarjeta de selección
  document.querySelectorAll('[data-pinline]').forEach((svg) => {
    const p = anchorPoint(svg.dataset.pinline);
    const mock = svg.parentElement.querySelector('.ui-mock');
    if (!p || !mock) return;
    const r = mock.getBoundingClientRect(), s = slideRect(mock);
    svg.innerHTML = `<polyline points="${p.x},${p.y} ${p.x + 40},${r.bottom - s.top + 30} ${r.left - s.left + 40},${r.bottom - s.top + 30} ${r.left - s.left + 40},${r.bottom - s.top}" fill="none" stroke="#5be4ff" stroke-width="2" stroke-dasharray="6 6"/>${dot(p.x, p.y)}`;
  });

  // Líneas en codo para la lista de skills
  document.querySelectorAll('[data-leader]').forEach((el) => {
    const p = anchorPoint(el.dataset.leader);
    if (!p) return;
    const r = el.getBoundingClientRect(), s = slideRect(el);
    const lx = r.left - s.left - 14, ly = r.top - s.top + 26;
    const mx = Math.max(p.x + 24, lx - 40);
    leaders(p.slide).insertAdjacentHTML('beforeend',
      `<polyline points="${p.x},${p.y} ${mx},${p.y} ${lx - 12},${ly} ${lx},${ly}" fill="none" stroke="#5be4ff" stroke-opacity=".75" stroke-width="2"/>${dot(p.x, p.y)}`);
  });

  document.body.dataset.ready = '1';
}
