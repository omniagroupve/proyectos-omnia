# Propuesta · Diseño web 3D e inmersivo

PDF interactivo de 14 diapositivas para clientes potenciales, más una versión web con 3D real que lo complementa.

| Entregable | Dónde |
|---|---|
| **PDF listo para enviar** | `dist/Propuesta-Web-3D-Inmersivo.pdf` |
| Imagen de cada diapositiva (para WhatsApp o LinkedIn) | `dist/slides/*.jpg` |
| Versión web autohospedable (Vercel, Netlify o cualquier hosting estático) | `dist/web/` |
| Versión web publicada (privada hasta que la compartas) | https://claude.ai/artifact/JyWwoL1Lq8JPLHFtbEMMuF |

## Qué tiene el PDF

1. Portada · 2. Índice navegable · 3. Por qué 3D · 4. **Skills** (una diapositiva) · 5. Método para encontrar dolores · 6–8. Tres casos ilustrativos (inmobiliaria, producto técnico, pagos) · 9. Guía por sector · 10–12. **Higgsfield** (gratis vs. pago, paso a paso, uso en el proyecto) · 13. Proceso · 14. Versión 3D (con QR) y contacto.

Interactividad dentro del PDF:

- Índice con tarjetas que saltan a cada sección.
- En cada página: pestañas de sección arriba; botones Índice, Anterior y Siguiente abajo (145 enlaces internos).
- Marcadores del PDF (panel lateral del lector) para las 14 diapositivas.
- Enlaces externos a la documentación oficial de Higgsfield, a la versión web y al correo.

El 3D del PDF son renders reales de Three.js (los mismos objetos que la web), con callouts alineados por proyección de cámara. Un PDF no puede ejecutar 3D en tiempo real de forma fiable, así que la diapositiva 14 lleva a la versión web, donde se gira el edificio, se elige piso y unidad, se abre el kit solar y se sigue el dinero paso a paso.

## Supuestos que debes revisar

| Supuesto | Dónde cambiarlo |
|---|---|
| Marca **OMNIA · Experiencias web 3D**, estética oscura | `config.json` (`studio`, `service`) |
| Contacto: `omniagroupve@gmail.com`; WhatsApp y agenda vacíos (sus botones se ocultan) | `config.json` (`email`, `whatsapp`, `calendarUrl`) |
| Región: "Venezuela · Colombia · remoto para LatAm" | `config.json` (`region`) |
| Seis skills y herramientas (Blender, Spline, Three.js, React Three Fiber, GSAP, glTF/Draco/KTX2) | `deck/deck.html` (diapositiva 4) y `web/experiencia.html` (#skills) |
| Los tres casos son **ilustrativos**, no clientes reales, y así se rotulan | diapositivas 6–8 y `web/experiencia.html` (#dolores) |
| Tiempos del proceso: 1 + 1 + 2 + 4 semanas + 30 días de medición | diapositiva 13 y `web/experiencia.html` (#proceso) |
| La versión web enlazada es el artifact de claude.ai | `config.json` (`webUrl`) |

Cada supuesto también está marcado con un comentario `<!-- SUPUESTO: ... -->` en `deck/deck.html`.

## Antes de enviarlo a un cliente

1. **Comparte la versión web.** El enlace del artifact es privado: ábrelo en claude.ai y usa Compartir para darle acceso público. Si prefieres tu dominio, sube `dist/web/` a Vercel o Netlify, pon esa URL en `config.json` → `webUrl` y regenera (el QR y los botones se actualizan solos).
2. Revisa los datos de Higgsfield (diapositivas 10–12): se verificaron el **6 de octubre de 2026** en sus páginas oficiales y cambian con frecuencia.

## Higgsfield: qué está verificado y qué no

Verificado en fuentes oficiales (blog, centro de ayuda y docs de Higgsfield, 6 oct 2026):

- La **API no es gratis**: saldo prepagado en USD, sin suscripción, recarga mínima de 5 USD (blog oficial); solo cobra generaciones exitosas (FAQ).
- La API usa su propia llave y su propio saldo; no consume ni hereda el plan de la web.
- La web (higgsfield.ai) tiene un plan Free con un grupo limitado de modelos.
- Para crear una key: cuenta (persona o empresa) → método de pago y saldo → API key, que se muestra una sola vez.

No confirmado, y el documento lo dice así:

- Si el plan Free permite uso comercial (se pide revisar sus términos).
- Condiciones de la prueba de 1 día: pide tarjeta y puede renovarse sola; se indica cancelarla a tiempo.
- Si la conversión imagen → modelo 3D (GLB) está incluida en cada plan o en la API.
- La URL exacta de la consola: se enlaza `console.higgsfield.ai`; si cambia, el Quickstart oficial lleva a la correcta.

Fuentes: [Qué es la API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api) · [Blog: la API](https://higgsfield.ai/blog/higgsfield-api) · [Planes](https://higgsfield.ai/creator-hub/help-center/plans/how-do-higgsfield-plans-work) · [Docs](https://docs.higgsfield.ai/docs) · [Quickstart](https://docs.higgsfield.ai/docs/quickstart) · [FAQ](https://docs.higgsfield.ai/docs/help/faq)

## Regenerar

Requisitos: Node 18+ y Chromium para Playwright (`npx playwright install chromium` la primera vez).

```bash
cd propuesta-3d
npm install
npm run build      # renders 3D → web → PDF
```

Pasos sueltos:

```bash
npm run render     # escenas Three.js → assets/renders/*.png + anchors.json (también captura la web para el mockup)
npm run web        # web/experiencia.html + config.json → dist/web/
npm run pdf        # deck/deck.html → dist/Propuesta-Web-3D-Inmersivo.pdf + dist/slides/
```

Si solo cambias textos o `config.json`, basta con `npm run web && npm run pdf`.

## Estructura

```
config.json            datos de contacto y marca (una sola fuente para PDF y web)
web/scenes.js          escenas 3D compartidas (hero, capas, iconos, edificio, kit solar, pagos, pipeline, dispositivos)
web/experiencia.html   versión web interactiva
deck/deck.html         las 14 diapositivas (1920×1080)
render/render.html     página que renderiza cada escena a PNG
scripts/               render-3d, build-web, build-pdf y un servidor local
assets/fonts/          Unbounded, Figtree y JetBrains Mono (SIL OFL), instancias estáticas
assets/renders/        renders 3D y anclajes para los callouts
dist/                  salidas listas para usar
```
