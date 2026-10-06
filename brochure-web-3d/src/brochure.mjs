// Genera el HTML de las 14 páginas del PDF.
// Todos los textos viven aquí: edítalos y vuelve a correr `npm run pdf`.
import QRCode from "qrcode";
import { SIZE } from "../scripts/lib/renders.mjs";

const TOTAL = 14;

// Pestañas de navegación (enlaces internos del PDF)
const TABS = [
  ["Índice", 2, "indice"],
  ["Skills", 4, "skills"],
  ["Dolores", 5, "dolores"],
  ["Higgsfield", 10, "higgsfield"],
  ["Proceso", 13, "proceso"],
  ["Contacto", 14, "contacto"],
];

const R = (name) => `../web/assets/renders/${name}.png`;

function fit(name, maxW, maxH) {
  const { w, h } = SIZE[name];
  const k = Math.min(maxW / w, maxH / h);
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

const LOGO = `<svg width="22" height="24" viewBox="0 0 22 24" aria-hidden="true"><path d="M11 1 21 6.5 11 12 1 6.5Z" fill="#FFB04A"/><path d="M1 6.5 11 12v11L1 17.5Z" fill="#1E2535" stroke="#6FE3F0" stroke-width=".8"/><path d="M21 6.5 11 12v11l10-5.5Z" fill="#6FE3F0"/></svg>`;

// Suelo en perspectiva (vectorial: nítido a cualquier zoom)
function floorGrid({ width = 1280, height = 200, cell = 120, rows = 7, opacity = 0.32 } = {}) {
  const cx = width / 2;
  const vpY = -height * 1.6;
  let lines = "";
  for (let i = -14; i <= 14; i++) {
    const xb = cx + i * cell;
    const xt = cx + (xb - cx) * ((0 - vpY) / (height - vpY));
    lines += `<line x1="${xt.toFixed(1)}" y1="0" x2="${xb.toFixed(1)}" y2="${height}"/>`;
  }
  let hz = "";
  for (let k = 1; k <= rows; k++) {
    const y = height * Math.pow(k / rows, 1.9);
    hz += `<line x1="0" y1="${y.toFixed(1)}" x2="${width}" y2="${y.toFixed(1)}" stroke-opacity="${(0.15 + 0.85 * (k / rows)).toFixed(2)}"/>`;
  }
  return `<svg class="floor" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <defs><linearGradient id="fg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${height}">
      <stop offset="0" stop-color="#6FE3F0" stop-opacity="0"/><stop offset="1" stop-color="#6FE3F0" stop-opacity="${opacity}"/></linearGradient></defs>
    <g stroke="url(#fg)" stroke-width="1">${lines}</g>
    <g stroke="#6FE3F0" stroke-width="1" opacity="${opacity}">${hz}</g>
  </svg>`;
}

function pin(anchor, box, { title, text = "", up = 70, down = 0, dx = 0, align = "left", cool = false } = {}) {
  const x = anchor[0] * box.w;
  const y = anchor[1] * box.h;
  const v = down ? `top:${down}px;` : `bottom:${up}px;`;
  const tagPos =
    align === "left"
      ? `left:${-14 + dx}px; ${v}`
      : align === "right"
        ? `right:${-14 - dx}px; ${v}`
        : `left:${dx}px; ${v} transform:translateX(-50%);`;
  const stem = down ? `top:6px; height:${down - 6}px` : `top:${-up}px; height:${up - 6}px`;
  return `<div class="pin${cool ? " cool" : ""}" style="left:${x.toFixed(1)}px; top:${y.toFixed(1)}px">
    <span class="stem" style="${stem}"></span>
    <span class="dot"></span>
    <span class="tag" style="${tagPos}"><b>${title}</b>${text}</span>
  </div>`;
}

async function qr(url, size = 84) {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0A0C12", light: "#FFFFFF" },
  });
  return svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
}

function slide(n, { cls = "", tab = null, where = "", body = "", floor = "" }) {
  const tabs = TABS.map(([label, page, key]) => `<a href="#p${page}" class="${key === tab ? "on" : ""}">${label}</a>`).join("");
  const prev = n > 1 ? `<a class="navbtn" href="#p${n - 1}"><span class="arr">←</span> Anterior</a>` : "";
  const next = n < TOTAL ? `<a class="navbtn" href="#p${n + 1}">Siguiente <span class="arr">→</span></a>` : "";
  const home = n !== 2 ? `<a class="navbtn home" href="#p2">Índice</a>` : "";
  return `<section class="slide ${cls}" id="p${n}">
    ${floor}
    <header class="topbar">
      <a class="brand" href="#p1">${LOGO}<span>OMNIA</span><small>Web 3D e inmersiva</small></a>
      <nav class="tabs">${tabs}</nav>
      <span class="count"><b>${String(n).padStart(2, "0")}</b> / ${TOTAL}</span>
    </header>
    <div class="content">${body}</div>
    <footer class="bottombar"><span class="where">${where}</span>${home}${prev}${next}</footer>
  </section>`;
}

export async function brochureHTML(cfg, anchors) {
  const web = cfg.webUrl;
  const mail = `mailto:${cfg.email}?subject=${encodeURIComponent("Quiero una web 3D")}`;
  const mailWork = `mailto:${cfg.email}?subject=${encodeURIComponent("Mi caso para una web 3D")}&body=${encodeURIComponent("Hola, te adjunto el ejercicio de la página 9 con mi caso.")}`;
  const qrWeb = await qr(web, 84);
  const qrCases = await qr(`${web}#casos`, 64);
  const wa = cfg.whatsapp ? `<span>WhatsApp · <b>${cfg.whatsapp}</b></span>` : "";

  const pages = [];

  // ── 1 · Portada ─────────────────────────────────────────────
  pages.push(
    slide(1, {
      cls: "cover",
      where: `${cfg.brand} · Propuesta ${cfg.year}`,
      floor: floorGrid({ height: 230, opacity: 0.3 }),
      body: `
      <div class="render"><img src="${R("hero")}" alt="Ventana de navegador con un objeto 3D que sale de la pantalla"></div>
      <div class="copy">
        <div class="eyebrow">Diseño web 3D e inmersivo</div>
        <h1 class="h1">Webs que tus clientes pueden recorrer.</h1>
        <p class="lead">Diseño sitios en 3D que explican tu producto en segundos y hacen que tus clientes se queden a explorarlo. Aquí te cuento qué hago, qué problemas resuelve y cómo empezar.</p>
        <div class="actions">
          <a class="btn primary" href="#p2">Empezar <span class="arr">→</span></a>
          <a class="btn ghost" href="${web}">Ver la versión interactiva <span class="arr">↗</span></a>
        </div>
        <div class="meta">14 páginas · 5 minutos de lectura · Toca los botones para navegar</div>
      </div>
      <div class="qr"><span>Escanéalo<br>y gíralo en<br>tu celular</span><div class="tile">${qrWeb}</div></div>`,
    })
  );

  // ── 2 · Índice ──────────────────────────────────────────────
  const tocCard = (num, title, text, page, img) => `
    <a class="card slab" href="#p${page}">
      <div class="thumb"><img src="${R(img)}" alt=""></div>
      <div class="body"><span class="num">${num}</span><h3 class="h3">${title}</h3><p>${text}</p></div>
      <span class="go"><span>Página ${page}</span><span>Ir <span class="arr">→</span></span></span>
    </a>`;
  pages.push(
    slide(2, {
      cls: "toc",
      tab: "indice",
      where: "Índice",
      body: `
      <div class="head">
        <div style="display:grid;gap:12px"><div class="eyebrow">Índice · toca una tarjeta para saltar</div><h2 class="h2">¿Qué vas a encontrar?</h2></div>
      </div>
      <div class="grid">
        ${tocCard("01", "Lo que hago", "Mis habilidades en una sola página, con las herramientas que uso.", 4, "icon-ux")}
        ${tocCard("02", "Dolores que el 3D resuelve", "Cómo detectar dónde duda tu cliente y tres casos con solución.", 5, "tower")}
        ${tocCard("03", "Higgsfield sin pagar (casi)", "Qué es, qué parte es gratis de verdad y cómo empezar sin saber programar.", 10, "higgs")}
        ${tocCard("04", "Cómo trabajamos", "Las fases del proyecto, tiempos de referencia y el siguiente paso.", 13, "steps")}
      </div>
      <p class="pre">¿Primera vez que oyes hablar de webs 3D? <a href="#p3">La página 3 explica por qué funcionan</a>.</p>`,
    })
  );

  // ── 3 · Por qué 3D ──────────────────────────────────────────
  pages.push(
    slide(3, {
      cls: "why",
      where: "Antes de empezar",
      body: `
      <div class="copy">
        <div class="eyebrow">Antes de empezar</div>
        <h2 class="h2">Una web plana se lee. Una web 3D se explora.</h2>
        <div class="points">
          <div class="point"><i></i><div><b>Se entiende sin explicarla</b><span>Tu cliente gira el producto, abre el plano o ve la pieza por dentro. Menos texto y menos dudas.</span></div></div>
          <div class="point"><i></i><div><b>Se recuerda</b><span>Si todas las webs de tu sector usan la misma plantilla, la que se puede explorar es la que tu cliente recuerda al día siguiente.</span></div></div>
          <div class="point"><i></i><div><b>Vende a distancia</b><span>Quien compra desde otra ciudad u otro país ve lo que va a pagar antes de pagarlo.</span></div></div>
        </div>
      </div>
      <span class="flat-label">Hoy · plana</span>
      <div class="render flat"><img src="${R("layers-flat")}" alt="Interfaz plana"></div>
      <span class="arrow">→</span>
      <span class="depth-label">Con profundidad · cada capa se mueve</span>
      <div class="render depth"><img src="${R("layers-depth")}" alt="La misma interfaz separada en capas 3D"></div>
      <div class="stat slab">
        <span class="big">+94%</span>
        <p>de conversión en productos que muestran contenido 3D o de realidad aumentada, frente a los que no lo tienen.
        <span class="src">Fuente: Shopify (2020). Es un dato de la propia plataforma: úsalo como referencia, no como promesa.</span></p>
      </div>`,
    })
  );

  // ── 4 · Skills ──────────────────────────────────────────────
  const skill = (img, title, text, tools) => `
    <div class="tile slab">
      <img src="${R("icon-" + img)}" alt="">
      <div><h3 class="h3">${title}</h3><p>${text}</p><div class="chips">${tools.map((t) => `<span class="chip">${t}</span>`).join("")}</div></div>
    </div>`;
  pages.push(
    slide(4, {
      cls: "skills",
      tab: "skills",
      where: "01 · Lo que hago",
      body: `
      <div class="head">
        <div style="display:grid;gap:10px"><div class="eyebrow">01 · Lo que hago</div>
        <h2 class="h2">Seis habilidades para que tu cliente entienda tu producto y lo compre.</h2></div>
      </div>
      <div class="grid">
        ${skill("modelado", "Modelado 3D", "Productos, espacios y piezas que se ven reales y pesan poco para cargar rápido.", ["Blender", "glTF"])}
        ${skill("interaccion", "Interacción", "Girar, arrastrar, elegir colores, abrir por dentro. Tu cliente explora en vez de leer.", ["Three.js", "WebGL"])}
        ${skill("animacion", "Animación", "Movimiento que guía la mirada y acompaña el scroll, sin marear a nadie.", ["GSAP", "Scroll"])}
        ${skill("ux", "UX y conversión", "Cada efecto tiene un trabajo: llevar a la compra, a la cita o al WhatsApp.", ["Figma", "Analítica"])}
        ${skill("rendimiento", "Rendimiento", "Rápida en el celular y con versión de respaldo si el equipo no soporta 3D.", ["Draco", "KTX2", "Lighthouse"])}
        ${skill("ia", "IA generativa", "Fotos, videos y modelos 3D producidos en días en lugar de semanas.", ["Higgsfield"])}
      </div>
      <div class="standard">
        <span class="eyebrow">Estándar de entrega</span>
        <span>Fluida en celulares de gama media</span><span>Modelos 3D comprimidos (meta: menos de 2 MB)</span><span>Versión de respaldo sin 3D</span>
      </div>`,
    })
  );

  // ── 5 · Detectar el dolor ───────────────────────────────────
  pages.push(
    slide(5, {
      cls: "pain",
      tab: "dolores",
      where: "02 · Dolores que el 3D resuelve",
      body: `
      <div class="copy">
        <div class="eyebrow">02 · Dolores que el 3D resuelve</div>
        <h2 class="h2">Primero, encuentra dónde se cae la venta.</h2>
        <p class="lead" style="max-width:none;font-size:18px">Antes de diseñar en 3D busco el momento exacto en que tu cliente duda. Puedes encontrarlo en una tarde:</p>
      </div>
      <div class="steps">
        <div class="step slab"><span class="n">1</span><h3 class="h3">Escucha</h3><p>Lee tus últimos 30 chats de WhatsApp o mensajes directos. ¿Qué pregunta se repite? <q>¿De qué tamaño es?</q> <q>¿Cómo es por dentro?</q> <q>¿Ese color cómo se ve?</q></p></div>
        <div class="step slab"><span class="n">2</span><h3 class="h3">Mide</h3><p>En tu analítica, busca la página donde más gente se va sin escribirte ni comprar. Ese es el hueco que hay que tapar.</p></div>
        <div class="step slab"><span class="n">3</span><h3 class="h3">Observa</h3><p>Pregúntate qué necesita ver o tocar tu cliente antes de decidir y que hoy una foto no le muestra.</p></div>
      </div>
      <div class="formula">
        <div class="cell hot"><span class="eyebrow">Dolor</span><p>«No sé si me cabe en la sala»</p></div>
        <span class="to">→</span>
        <div class="cell cold"><span class="eyebrow cool">Experiencia 3D</span><p>El mueble en 3D con medidas reales</p></div>
        <span class="to">→</span>
        <div class="cell"><span class="eyebrow" style="color:var(--paper)">Resultado medible</span><p>Menos devoluciones por tamaño</p></div>
      </div>
      <p class="small" style="position:absolute;right:0;top:34px">En las 3 páginas siguientes: casos ilustrativos<br>de cómo aplico este método por sector.</p>`,
    })
  );

  // ── 6–8 · Casos ─────────────────────────────────────────────
  const tryBox = `<a class="try qr" href="${web}#casos"><span>Pruébalo<br>en 3D <span class="arr">↗</span></span><span class="tile">${qrCases}</span></a>`;
  const caseCopy = ({ tag, quote, today, solution, bullets, measure }) => `
    <div class="copy">
      <div class="eyebrow">${tag}</div>
      <p class="quote">${quote}</p>
      <div class="block"><span class="eyebrow cool">Lo que pasa hoy</span><p>${today}</p></div>
      <div class="block"><span class="eyebrow cool">La experiencia 3D</span><p style="color:var(--text)">${solution}</p>
        <ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul></div>
      <div class="block"><span class="eyebrow cool">Qué medimos</span><div class="measure">${measure.map((m) => `<span class="chip">${m}</span>`).join("")}</div></div>
    </div>`;

  const tower = fit("tower", 600, 540);
  pages.push(
    slide(6, {
      cls: "case",
      tab: "dolores",
      where: "02 · Caso ilustrativo 1 de 3",
      body: `
      ${caseCopy({
        tag: "Caso 1 · Inmobiliaria en preventa",
        quote: "Me interesa, pero no puedo comprar algo que no he visto.",
        today: "El edificio todavía no existe y muchos compradores viven en otra ciudad o fuera del país. El vendedor manda PDFs y renders sueltos por WhatsApp y la conversación se enfría.",
        solution: "Una torre 3D que se recorre desde el celular.",
        bullets: [
          "Tocas un piso y ves qué apartamentos quedan libres",
          "Metraje, distribución y hacia dónde da la vista",
          "El comprador llega a la llamada con su unidad elegida",
        ],
        measure: ["Contactos con unidad elegida", "Reservas por visita", "Tiempo en la página"],
      })}
      <div class="stage" style="width:${tower.w}px;height:${tower.h}px;top:4px;right:10px">
        <div class="render"><img src="${R("tower")}" alt="Torre residencial en 3D con un piso resaltado"></div>
        ${pin(anchors.tower.selected, tower, { title: "Piso 7 · Apto 7B", text: "84 m² · vista al parque<br>Disponible", up: 96, dx: 0, align: "left" })}
      </div>
      ${tryBox}`,
    })
  );

  const bottles = fit("bottles", 600, 520);
  pages.push(
    slide(7, {
      cls: "case",
      tab: "dolores",
      where: "02 · Caso ilustrativo 2 de 3",
      body: `
      ${caseCopy({
        tag: "Caso 2 · Tienda online de producto",
        quote: "En la foto se veía distinto.",
        today: "Fotos planas, las mismas preguntas por color y tamaño todos los días y devoluciones que se comen el margen.",
        solution: "Un configurador 3D en la ficha del producto.",
        bullets: [
          "El cliente gira el producto y revisa cada detalle",
          "Cambia colores y acabados al instante",
          "Lo compara con un objeto conocido para entender el tamaño",
        ],
        measure: ["Tasa de devolución", "Conversión de la ficha", "Preguntas por color y tamaño"],
      })}
      <div class="stage" style="width:${bottles.w}px;height:${bottles.h}px;top:-10px;right:40px">
        <div class="render"><img src="${R("bottles")}" alt="Botella térmica en tres colores"></div>
        <div style="position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);display:flex;gap:10px;align-items:center;padding:8px 14px;border-radius:99px;background:rgba(16,20,29,.92);border:1px solid var(--line);font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:var(--soft);white-space:nowrap">
          <span style="width:20px;height:20px;border-radius:50%;background:#ffa443;box-shadow:0 0 0 2px var(--ink),0 0 0 4px #ffa443"></span>Ámbar
          <span style="width:20px;height:20px;border-radius:50%;background:#5fd6e6;margin-left:6px"></span>Glaciar
          <span style="width:20px;height:20px;border-radius:50%;background:#ece6da;margin-left:6px"></span>Marfil
          <span style="margin-left:10px;color:var(--rim)">← Arrastra →</span>
        </div>
      </div>
      ${tryBox}`,
    })
  );

  const pump = fit("pump", 700, 400);
  const P = anchors.pump;
  pages.push(
    slide(8, {
      cls: "case",
      tab: "dolores",
      where: "02 · Caso ilustrativo 3 de 3",
      body: `
      ${caseCopy({
        tag: "Caso 3 · Equipos y maquinaria",
        quote: "No entiendo por qué este cuesta el doble que el otro.",
        today: "El valor está por dentro y nadie lo ve. Cada venta depende de una llamada larga con un técnico que explica lo mismo una y otra vez.",
        solution: "Una vista explosionada que se abre con el scroll.",
        bullets: [
          "El equipo se separa pieza por pieza",
          "Cada pieza dice qué hace y por qué dura más",
          "El vendedor manda un enlace y la explicación ya está hecha",
        ],
        measure: ["Días hasta el cierre", "Llamadas técnicas por venta", "Cotizaciones desde la web"],
      })}
      <div class="stage" style="width:${pump.w}px;height:${pump.h}px;top:110px;right:20px">
        <div class="render"><img src="${R("pump")}" alt="Bomba de agua en vista explosionada"></div>
        ${pin(P.motor, pump, { title: "Motor eficiente", text: "Consume y calienta menos", up: 80 })}
        ${pin(P.impulsor, pump, { title: "Impulsor de bronce", text: "Más caudal, menos desgaste", up: 80 })}
        ${pin(P.rodamiento_b, pump, { title: "Rodamiento sellado", text: "Sin mantenimiento", down: 64, align: "right", cool: true })}
        ${pin(P.carcasa_b, pump, { title: "Carcasa reforzada", text: "Aguanta presión y golpes", down: 54, cool: true })}
        <div style="position:absolute;left:50%;bottom:-48px;transform:translateX(-50%);display:flex;gap:12px;align-items:center;font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);white-space:nowrap">
          Cerrado <span style="position:relative;width:220px;height:4px;border-radius:2px;background:var(--line)"><span style="position:absolute;left:0;top:0;bottom:0;width:78%;border-radius:2px;background:var(--rim)"></span><span style="position:absolute;left:78%;top:-7px;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:var(--key);box-shadow:0 0 0 4px rgba(255,176,74,.2)"></span></span> Abierto
        </div>
      </div>
      ${tryBox}`,
    })
  );

  // ── 9 · Ejercicio rellenable ────────────────────────────────
  const field = (id, n, label) => `
    <div class="field"><label for="${id}"><span>${n}</span>${label}</label><div class="box" data-field="${id}"></div></div>`;
  pages.push(
    slide(9, {
      cls: "work",
      tab: "dolores",
      where: "02 · Tu caso",
      body: `
      <div class="head">
        <div style="display:grid;gap:10px"><div class="eyebrow">02 · Ejercicio de 5 minutos</div>
        <h2 class="h2">Ahora tu caso. Escribe aquí mismo y envíamelo.</h2></div>
        <p class="small">Puedes escribir directo en este PDF con Adobe Acrobat Reader, Vista Previa (Mac) o el navegador. Guárdalo y adjúntalo al correo.</p>
      </div>
      <div class="fields">
        ${field("pregunta", "1 · ESCUCHA", "¿Qué pregunta te hacen tus clientes una y otra vez?")}
        ${field("momento", "2 · MIDE", "¿En qué momento se enfrían o se van sin comprar?")}
        ${field("ver", "3 · OBSERVA", "¿Qué necesitarían ver o tocar para decidirse?")}
        ${field("numero", "RESULTADO", "Si lo resolvemos, ¿qué número debería mejorar?")}
      </div>
      <div class="send">
        <a class="btn primary" href="${mailWork}">Enviar mi caso por correo <span class="arr">↗</span></a>
        <p>Con estas cuatro respuestas te preparo una propuesta concreta para tu negocio, con la experiencia 3D que tiene más sentido y cómo la vamos a medir.</p>
      </div>`,
    })
  );

  // ── 10 · Higgsfield en palabras simples ─────────────────────
  const hf = fit("higgs", 690, 456);
  pages.push(
    slide(10, {
      cls: "hf",
      tab: "higgsfield",
      where: "03 · Higgsfield sin pagar (casi)",
      body: `
      <div class="copy">
        <div class="eyebrow">03 · Higgsfield sin pagar (casi)</div>
        <h2 class="h2">Higgsfield, en palabras simples</h2>
        <p class="lead" style="font-size:18px">Es una plataforma de inteligencia artificial que convierte una idea escrita o una foto en imágenes, videos cortos y modelos 3D. Para tu web significa contenido visual más rápido y más barato.</p>
        <div class="uses">
          <div class="use"><b>Foto de tu producto</b><i>→</i><span>un modelo 3D para que el cliente lo gire</span></div>
          <div class="use"><b>Una descripción</b><i>→</i><span>un video corto para la portada de tu web</span></div>
          <div class="use"><b>Un solo objeto</b><i>→</i><span>versiones en otros colores, fondos y ángulos</span></div>
        </div>
      </div>
      <div class="stage" style="width:${hf.w}px;height:${hf.h}px">
        <div class="render"><img src="${R("higgs")}" alt="Una foto que se convierte en un modelo 3D"></div>
        ${pin(anchors.higgs.photo, hf, { title: "Tu foto", text: "JPG o PNG del producto", up: 40, cool: true })}
        ${pin(anchors.higgs.model, hf, { title: "Modelo 3D", text: "Listo para la web (.glb)", up: 26, align: "right" })}
      </div>
      <div class="analogy slab">
        <span class="h3">¿Y qué es <span class="hl-rim">la API</span>?</span>
        <p>Piensa en Higgsfield como un restaurante. <b>La app web es el salón:</b> entras, pides y te sirven. <b>La API es la ventanilla de delivery:</b> tu página web hace el pedido sola, sin que nadie entre al salón. Útil cuando quieres generar contenido de forma automática.</p>
      </div>`,
    })
  );

  // ── 11 · ¿Es gratis? ────────────────────────────────────────
  pages.push(
    slide(11, {
      cls: "free",
      tab: "higgsfield",
      where: "03 · Lo que es gratis y lo que no",
      body: `
      <div class="head">
        <div style="display:grid;gap:10px"><div class="eyebrow">03 · Lo que es gratis y lo que no</div>
        <h2 class="h2">¿Es gratis? Una parte sí.</h2></div>
        <span class="stamp">Revisado: ${cfg.reviewedOn}</span>
      </div>
      <div class="cols">
        <div class="col slab">
          <img class="pop" src="${R("icon-ux")}" alt="">
          <div class="top"><h3 class="h3">La app web</h3><span class="badge yes">Tiene plan gratis</span></div>
          <span class="url">higgsfield.ai</span>
          <ul>
            <li><b>Creas tu cuenta sin pagar</b> y pruebas desde el navegador.</li>
            <li>Sirve para probar ideas. El plan gratis trae <b>pocos modelos</b>, los resultados salen <b>con marca de agua</b> y <b>no permite uso comercial</b>.</li>
            <li>Los créditos y pruebas gratis <b>cambian según la promoción</b> del momento. Algunas pruebas piden tarjeta y se cobran solas si no las cancelas a tiempo.</li>
          </ul>
        </div>
        <div class="col slab">
          <img class="pop" src="${R("icon-interaccion")}" alt="">
          <div class="top"><h3 class="h3">La API</h3><span class="badge no">Pago por uso</span></div>
          <span class="url">cloud.higgsfield.ai</span>
          <ul>
            <li><b>No encontré un plan gratuito para la API.</b> Necesitas saldo prepagado o una tarjeta registrada.</li>
            <li>Pagas por cada generación que sale bien. En pruebas publicadas por terceros, <b>un video costó entre US$0,20 y US$3,23</b> según el modelo elegido.</li>
            <li>Para experimentar suele bastar un saldo pequeño, <b>de US$5 a US$10</b>.</li>
          </ul>
        </div>
      </div>
      <div class="rec">
        <span class="eyebrow">Mi recomendación</span>
        <p>Prueba gratis en la app web. Cuando tengamos claro qué quieres generar, conectamos la API con un saldo pequeño y medimos el costo real de cada pieza.</p>
      </div>
      <div class="verify">
        <p><b style="color:var(--text)">Precios y promociones cambian seguido.</b> Confírmalos en la fuente oficial antes de decidir.</p>
        <div class="links">
          <a class="btn ghost sm" href="https://higgsfield.ai/pricing">Precios <span class="arr">↗</span></a>
          <a class="btn ghost sm" href="https://docs.higgsfield.ai">Documentación API <span class="arr">↗</span></a>
          <a class="btn ghost sm" href="https://cloud.higgsfield.ai">Consola de llaves <span class="arr">↗</span></a>
        </div>
      </div>`,
    })
  );

  // ── 12 · Paso a paso ────────────────────────────────────────
  pages.push(
    slide(12, {
      cls: "how",
      tab: "higgsfield",
      where: "03 · Cómo empezar",
      body: `
      <div class="head" style="display:grid;gap:10px"><div class="eyebrow">03 · Cómo empezar</div>
        <h2 class="h2">Dos caminos, según lo que quieras hacer.</h2></div>
      <div class="lanes">
        <div class="lane a slab">
          <div class="top"><h3 class="h3">Ruta A · Probar gratis</h3><span class="chip" style="color:var(--rim);border-color:rgba(111,227,240,.5)">Sin tarjeta</span></div>
          <ol>
            <li><span>Entra a <b>higgsfield.ai</b> y crea tu cuenta con tu correo o con Google.</span></li>
            <li><span>Revisa en tu perfil cuántos <b>créditos o generaciones gratis</b> tienes hoy.</span></li>
            <li><span>Sube una <b>foto de tu producto</b> y pide un video corto o un modelo 3D.</span></li>
            <li><span><b>Descarga el resultado y mándamelo.</b> Vemos juntos si sirve para tu web antes de gastar un dólar.</span></li>
          </ol>
          <p class="note" style="margin-top:auto">Si una prueba gratis te pide tarjeta, anota la fecha en que se cobra y cancélala antes si no la vas a usar.</p>
        </div>
        <div class="lane b slab">
          <div class="top"><h3 class="h3">Ruta B · Conectarlo a tu web</h3><span class="chip" style="color:var(--key);border-color:rgba(255,176,74,.5)">Lo hago contigo</span></div>
          <ol>
            <li><span>Creas tu cuenta en <b>cloud.higgsfield.ai</b> y cargas un saldo pequeño.</span></li>
            <li><span>Generas una <b>llave de acceso</b>: un ID y una clave secreta.</span></li>
            <li><span>Yo la instalo <b>en el servidor de tu web</b>, nunca en el código que ve el visitante. Desde ahí tu web pide imágenes, videos o modelos 3D sola.</span></li>
          </ol>
          <div class="warn"><i>!</i><span>La clave secreta es como la llave de tu casa. No la mandes por WhatsApp ni por correo: compártela con un gestor de contraseñas (por ejemplo, Bitwarden o 1Password).</span></div>
          <p class="note">Los nombres de menús y botones pueden cambiar. La guía oficial está en <a href="https://docs.higgsfield.ai">docs.higgsfield.ai</a>.</p>
        </div>
      </div>
      <div class="need">
        <span class="eyebrow">Ten a mano</span>
        <span class="chip">Correo o cuenta de Google</span>
        <span class="chip">2 o 3 fotos del producto con buena luz</span>
        <span class="chip">Tarjeta o saldo (solo Ruta B)</span>
        <span class="chip">Un gestor de contraseñas (solo Ruta B)</span>
      </div>`,
    })
  );

  // ── 13 · Proceso ────────────────────────────────────────────
  const steps = { w: 984, h: 290 };
  const S = anchors.steps;
  const stepsFit = fit("steps", steps.w, steps.h);
  const offX = (steps.w - stepsFit.w) / 2;
  const badge = (a, n, hot) =>
    `<span style="position:absolute;left:${(offX + a[0] * stepsFit.w).toFixed(1)}px;top:${(a[1] * stepsFit.h).toFixed(1)}px;transform:translate(-50%,-100%);font-family:var(--display);font-weight:700;font-size:15px;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:${hot ? "var(--key)" : "var(--rim)"};color:var(--ink);box-shadow:0 8px 20px rgba(0,0,0,.4)">${n}</span>`;
  pages.push(
    slide(13, {
      cls: "process",
      tab: "proceso",
      where: "04 · Cómo trabajamos",
      body: `
      <div class="head"><div style="display:grid;gap:10px"><div class="eyebrow">04 · Cómo trabajamos</div>
        <h2 class="h2">Cuatro fases. Ves el 3D funcionando antes de producir todo.</h2></div><span class="small">Tiempos de referencia para<br>un proyecto mediano.</span></div>
      <div class="stage">
        <div class="render"><img src="${R("steps")}" alt="Cuatro bloques que suben"></div>
        ${badge(S.s1, 1)}${badge(S.s2, 2)}${badge(S.s3, 3)}${badge(S.s4, 4, true)}
      </div>
      <div class="phases">
        <div class="phase"><span class="when">Semana 1</span><h3 class="h3">Diagnóstico</h3><p>Una llamada de 45 minutos. Revisamos tu web, tus chats y tus números para encontrar el dolor.</p></div>
        <div class="phase"><span class="when">Semanas 2 y 3</span><h3 class="h3">Prototipo</h3><p>Te muestro la idea en 3D funcionando, en tu celular, antes de invertir en la producción completa.</p></div>
        <div class="phase"><span class="when">Semanas 3 a 6</span><h3 class="h3">Producción</h3><p>Modelos 3D, interacción, textos, versión móvil y versión de respaldo.</p></div>
        <div class="phase last"><span class="when">Semana 7 en adelante</span><h3 class="h3">Lanzamiento y medición</h3><p>Publicamos, medimos los números que acordamos y ajustamos con datos.</p></div>
      </div>
      <div class="includes">
        <span class="eyebrow">Siempre incluye</span>
        <span class="chip">Modelos 3D optimizados</span><span class="chip">Versión móvil</span><span class="chip">Versión sin 3D de respaldo</span><span class="chip">Medición de resultados</span><span class="chip">30 días de ajustes</span>
        
      </div>`,
    })
  );

  // ── 14 · Cierre ─────────────────────────────────────────────
  pages.push(
    slide(14, {
      cls: "cta",
      tab: "contacto",
      where: "Siguiente paso",
      floor: floorGrid({ height: 210, opacity: 0.28 }),
      body: `
      <div class="render"><img src="${R("portal")}" alt="Portal 3D"></div>
      <div class="copy">
        <div class="eyebrow">Siguiente paso</div>
        <h2 class="h1" style="font-size:52px">¿Hablamos de tu proyecto?</h2>
        <p class="lead">Mándame el ejercicio de la página 9 o escríbeme directo. Te respondo en 48 horas con una idea concreta para tu negocio.</p>
        <div class="actions">
          <a class="btn primary" href="${mail}">Escribirme <span class="arr">↗</span></a>
          <a class="btn ghost" href="${web}">Ver la versión interactiva <span class="arr">↗</span></a>
          <a class="btn quiet" href="#p9">Ir al ejercicio</a>
        </div>
        <div class="contact"><span>Correo · <b>${cfg.email}</b></span>${wa}</div>
      </div>
      <div class="qr"><span>La versión<br>interactiva<br>en tu celular</span><div class="tile">${qrWeb}</div></div>`,
    })
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${cfg.brand} · ${cfg.service}</title>
<link rel="stylesheet" href="brochure.css">
</head>
<body>
${pages.join("\n")}
</body>
</html>`;
}
