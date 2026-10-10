# OMNIA · Guía de negocios con IA y propuesta de web 3D

Dos documentos PDF interactivos con el mismo sistema visual 3D, más dos páginas web que los complementan.

| Entregable | Para quién | Dónde |
|---|---|---|
| **Guía post-asesoría: un negocio de IA que escala** (19 diapositivas) | Personas que empiezan a emprender con IA, después de una asesoría | `dist/Guia-Negocio-IA-Escalable.pdf` |
| Cuaderno de trabajo interactivo (enlazado desde la guía con QR) | La misma persona, para llenar su modelo y enviarlo antes de la próxima sesión | https://claude.ai/artifact/H3FN2sXVXQ81Lv5fzVtYaP · autohospedable en `dist/cuaderno/` |
| Propuesta de diseño web 3D e inmersivo (14 diapositivas) | Clientes que quieren una web 3D | `dist/Propuesta-Web-3D-Inmersivo.pdf` |
| Versión web 3D interactiva (ejemplo vivo, enlazado desde ambos PDF) | Clientes de la propuesta 3D; ejemplo en la guía | https://claude.ai/artifact/JyWwoL1Lq8JPLHFtbEMMuF · autohospedable en `dist/web/` |
| Imagen de cada diapositiva | Para compartir por WhatsApp o LinkedIn | `dist/slides-guia/*.jpg`, `dist/slides/*.jpg` |

## La guía

Recorre seis tramos, con un ejemplo de principio a fin (una clínica odontológica pequeña que pierde citas):

1. **Enfoque** (págs. 3–5): una cosa, un cliente, un dolor; la frase de enfoque; ficha de cliente ideal con la prueba de los 10 nombres; cómo entrevistar sin pedir opiniones (método de *The Mom Test*).
2. **Modelo** (6–7): el modelo en ocho preguntas y las cuentas que dicen si escala (horas por cliente a mano vs. con agentes).
3. **Service-as-a-Software** (8–10): vender el trabajo hecho y no la herramienta; la escalera de servicio a software (a mano → escrito → automatizado → vendido por resultado); seis ideas concretas.
4. **Tu web** (11–12): estructura de una página que vende, tips y cuándo el 3D sí aporta; imágenes y video con IA (Higgsfield).
5. **Skills y agentes** (13–17): qué es una skill (`SKILL.md`), las tres primeras (pensamiento, retroalimentación y proceso), la anatomía de un agente, cómo construir el primero en seis pasos y tres niveles (sin código, poco código, código), y agentes auditores.
6. **Plan y próxima sesión** (18–19): 30 días con entregables por semana, qué traer a la próxima sesión y qué se hará en ella, QR al cuaderno y contacto.

Interactividad en el PDF: mapa navegable, pestañas de sección en cada página, botones Índice/Anterior/Siguiente (214 enlaces internos), 19 marcadores y enlaces a las fuentes oficiales.

El cuaderno de trabajo genera la frase de enfoque, calcula si el modelo escala con los números de la persona, arma un `SKILL.md` y las instrucciones de un agente auditor, y copia un resumen listo para enviar. Guarda las respuestas en el navegador de quien lo usa.

## Supuestos que debes revisar

| Supuesto | Dónde cambiarlo |
|---|---|
| Nombre de la persona asesorada y fecha de la sesión vacíos (la portada no los muestra) | `config.json` → `mentee`, `sessionDate` |
| Marca: **OMNIA · Asesoría · Negocios con IA** | `config.json` → `studio`, `guideService` |
| Contacto: `omniagroupve@gmail.com`; WhatsApp y agenda vacíos (sus botones se ocultan) | `config.json` → `email`, `whatsapp`, `calendarUrl` |
| Ejemplo que recorre la guía: clínica odontológica pequeña | `deck/guia.html` (comentarios `SUPUESTO`) y `web/cuaderno.html` (botón de ejemplo) |
| Números de las cuentas (3.000 USD de meta, 300 USD de precio, 12 vs. 2 horas) son redondos de ejemplo, no datos de mercado | diapositiva 7 y valores iniciales del cuaderno |
| Herramientas citadas (Framer, Webflow, Carrd, Lovable, v0, n8n, Make, Claude Code, Claude Agent SDK) son ejemplos vigentes en octubre de 2026 | diapositivas 12 y 16 |
| La guía asume que en la asesoría se habló de estos temas ("lo que vimos en la asesoría") | portada |

## Antes de enviarlo

1. **Comparte las dos páginas web.** Los enlaces de claude.ai son privados hasta que los compartes: abre cada uno y usa Compartir. Si prefieres tu dominio, sube `dist/cuaderno/` y `dist/web/` a Vercel o Netlify, pon las URL en `config.json` (`workbookUrl`, `webUrl`) y ejecuta `npm run build`; los QR y botones se actualizan solos.
2. Llena `mentee` y `sessionDate` en `config.json` si quieres personalizar la portada.

## Fuentes verificadas (octubre de 2026)

- Service-as-Software: [Foundation Capital, «AI leads a service as software paradigm shift»](https://foundationcapital.com/ai-service-as-software/) (2024).
- Agent Skills: [crear skills en Claude](https://claude.com/docs/skills/how-to) (se suben en .zip; planes de pago con ejecución de código), [skills en Claude Code](https://code.claude.com/docs/en/skills) (carpeta `.claude/skills/`), [especificación abierta](https://agentskills.io/specification) (`name` y `description` obligatorios en `SKILL.md`).
- Subagentes: [Claude Code, subagentes](https://code.claude.com/docs/en/sub-agents) (archivos Markdown en `.claude/agents/` con `name` y `description`).
- Higgsfield: [planes](https://higgsfield.ai/creator-hub/help-center/plans/how-do-higgsfield-plans-work), [qué es la API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api), [blog de la API](https://higgsfield.ai/blog/higgsfield-api), [docs](https://docs.higgsfield.ai/docs). La API es de pago (saldo prepagado, recarga mínima de 5 USD según su blog); lo gratis es el plan Free de la web.
- Entrevistas: Rob Fitzpatrick, *The Mom Test*.

## Regenerar

Requisitos: Node 18+ y Chromium para Playwright (`npx playwright install chromium` la primera vez).

```bash
cd propuesta-3d
npm install
npm run build          # renders 3D → webs → PDFs
```

Pasos sueltos:

```bash
npm run render         # escenas Three.js → assets/renders/*.png + anchors.json
npm run web            # web/*.html + config.json → dist/web/ y dist/cuaderno/
npm run pdf            # ambos decks → PDF + imágenes por diapositiva
npm run pdf -- guia    # solo la guía
```

Si solo cambias textos o `config.json`, basta con `npm run web && npm run pdf`.

## Estructura

```
config.json            marca, contacto y enlaces (una sola fuente para PDFs y webs)
deck/guia.html         la guía (19 diapositivas, 1920×1080)
deck/deck.html         la propuesta 3D (14 diapositivas)
deck/base.css          estilos compartidos de los decks
deck/deck.js           navegación, configuración, QR y callouts compartidos
web/cuaderno.html      cuaderno de trabajo interactivo
web/experiencia.html   versión web 3D interactiva
web/scenes.js          escenas 3D compartidas (Three.js)
render/render.html     página que renderiza cada escena a PNG
scripts/               render-3d, build-web, build-pdf y servidor local
assets/fonts/          Unbounded, Figtree y JetBrains Mono (SIL OFL), instancias estáticas
assets/renders/        renders 3D y anclajes de los callouts
dist/                  salidas listas para usar
```
