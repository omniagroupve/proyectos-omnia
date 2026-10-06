# Propuesta Web 3D · PDF interactivo + versión web

Material para clientes potenciales de diseño web 3D e inmersivo.

| Entregable | Dónde está | Qué es |
|---|---|---|
| **PDF interactivo** (14 págs.) | `dist/OMNIA-Propuesta-Web-3D.pdf` | Listo para enviar. 3,6 MB. |
| **Versión web interactiva** | `web/` | 3D real con Three.js. Se despliega tal cual en Vercel. |
| **Código que genera todo** | `src/`, `scripts/` | Cambias un texto y regeneras el PDF en ~1 minuto. |

## Qué tiene de interactivo el PDF

- **Índice navegable** (pág. 2) con tarjetas que saltan a cada sección.
- **Barra de pestañas en todas las páginas** (Índice, Skills, Dolores, Higgsfield, Proceso, Contacto) y botones Anterior / Siguiente / Índice.
- **Marcadores laterales**: el PDF abre con el panel de marcadores visible.
- **Formulario rellenable** (pág. 9): 4 campos que el cliente llena dentro del PDF y te devuelve por correo.
- **Enlaces externos**: precios, documentación y consola de Higgsfield; correo; versión web.
- **Códigos QR** que abren la versión web en el celular (portada, cada caso y cierre).

### Por qué el 3D del PDF son imágenes y no 3D real

El 3D dentro de un PDF (U3D/PRC) solo funciona en Adobe Acrobat de escritorio y no en Chrome, Vista Previa, celulares ni Gmail, que es donde tu cliente lo va a abrir. Por eso:

1. **En el PDF**: cada ilustración es un render de una escena 3D real (geometría, luces y sombras con Three.js), no un dibujo plano. Las etiquetas se colocan sobre las piezas con coordenadas calculadas desde la propia escena.
2. **En la web**: las mismas escenas se pueden tocar. La torre deja elegir pisos, la botella cambia de color y gira, la bomba se abre y se cierra con un control, y la interfaz de la pág. 3 se separa en capas al hacer scroll.

Las dos versiones comparten un solo archivo de escenas (`web/scenes.js`), así que lo que se ve impreso es lo mismo que gira en la web.

## Cómo regenerar el PDF

Requisitos: Node 18+.

```bash
npm install
npm run build      # renders 3D + PDF (≈1 min)
npm run pdf        # solo el PDF, si no cambiaste las escenas 3D
```

Para revisar cada página como imagen: `PREVIEW=preview npm run pdf` guarda un PNG por página en `preview/`.

## Qué editar

| Quieres cambiar… | Archivo |
|---|---|
| Correo, WhatsApp, enlace de la versión web, fecha de revisión | `config.json` |
| Textos del PDF | `src/brochure.mjs` |
| Colores y tipografías del PDF | `src/brochure.css` (variables en `:root`) |
| Textos de la web | `web/index.html` |
| Escenas 3D (formas, colores, cámaras) | `web/scenes.js` |

Si llenas `whatsapp` en `config.json`, aparece solo en la página de contacto.

## Publicar la versión web en Vercel

1. En Vercel, **New Project** → importa este repositorio.
2. En **Root Directory** elige `brochure-web-3d/web`. Framework: *Other*. Sin comando de build.
3. Cuando tengas el dominio, ponlo en `webUrl` dentro de `config.json` y corre `npm run pdf`. Los botones y QR del PDF pasan a apuntar a tu dominio.

Hoy `webUrl` apunta a la versión publicada en Claude (`claude.ai/artifact/…`). Es privada: tus clientes no la pueden abrir hasta que la compartas desde el menú **Share** de esa página, o hasta que cambies el enlace por tu dominio de Vercel.

## Supuestos que debes revisar

Estos datos no estaban en el encargo. Los marqué como supuestos razonables:

| # | Supuesto | Dónde cambiarlo |
|---|---|---|
| 1 | La marca del servicio es **OMNIA**, con estética dark-tech. | `config.json`, `src/brochure.mjs` (logo y textos), `web/index.html` |
| 2 | Contacto: **omniagroupve@gmail.com**. Sin WhatsApp. | `config.json` |
| 3 | Las 6 habilidades y herramientas (Blender, glTF, Three.js, WebGL, GSAP, Figma, Draco, KTX2, Lighthouse, Higgsfield). | pág. 4 |
| 4 | Estándar de entrega: fluida en gama media, modelos de menos de 2 MB, versión de respaldo. Es un compromiso: déjalo solo si lo cumples. | pág. 4 |
| 5 | Los 3 casos (inmobiliaria en preventa, tienda online, maquinaria) son **ilustrativos**, no clientes reales. Así lo dice el PDF. Si tienes casos reales con números, reemplázalos. | págs. 6–8 |
| 6 | Tiempos: diagnóstico semana 1, prototipo 2–3, producción 3–6, lanzamiento 7+. Llamada de 45 min. 30 días de ajustes. | pág. 13 |
| 7 | Respuesta en 48 horas. | pág. 14 |
| 8 | El dato **+94 % de conversión con 3D/AR** es de Shopify (2020) y lo reporta la propia plataforma. El PDF lo aclara. | pág. 3 |

## Higgsfield: qué se verificó y qué no

Revisado el 6 de octubre de 2026. El sitio oficial (`higgsfield.ai`, `docs.higgsfield.ai`) no se pudo abrir desde el entorno donde se armó este material, así que los datos vienen de fuentes secundarias y del SDK oficial en GitHub. Antes de enviar el PDF, confírmalos en la fuente oficial.

| Dato en el PDF | Nivel de confianza | Fuente |
|---|---|---|
| Las llaves de la API se crean en `cloud.higgsfield.ai` y son un ID + una clave secreta | Alto | [SDK oficial en GitHub](https://github.com/higgsfield-ai/higgsfield-client); doc. de autenticación (`docs.higgsfield.ai/docs/authentication`) |
| La clave debe vivir en el servidor, nunca en el código del navegador | Alto | Documentación de autenticación de Higgsfield |
| La API es de pago por uso y no tiene plan gratuito | Medio | Guías de terceros ([layer3labs](https://www.layer3labs.io/guides/higgsfield-api), [mindstudio](https://www.mindstudio.ai/blog/higgsfield-api-pricing-pay-per-use)) |
| Un video por API costó entre US$0,20 y US$3,23 en pruebas | Medio (un solo tercero) | [mindstudio](https://www.mindstudio.ai/blog/higgsfield-api-pricing-pay-per-use) |
| La app web tiene plan gratis con pocos modelos, marca de agua y sin uso comercial | Medio. Las promociones cambian seguido | [creatify](https://creatify.ai/blog/is-higgsfield-free-free-plan-trials-and-promo-codes-explained-(2026)), [costbench](https://costbench.com/software/ai-video-generators/higgsfield/free-plan/) |
| Higgsfield convierte una foto en un modelo 3D (.glb) | Alto | Herramientas oficiales de Higgsfield (generación 3D a partir de imagen) |
| URL de precios `higgsfield.ai/pricing` | **No verificada.** Ábrela antes de enviar | — |

## Estructura

```
brochure-web-3d/
├── config.json             datos editables (contacto, enlaces, fecha)
├── dist/                   PDF final
├── src/
│   ├── brochure.mjs        textos y maquetación de las 14 páginas
│   ├── brochure.css        sistema visual del PDF
│   ├── render.html         página que renderiza cada escena a PNG
│   └── fonts/              Unbounded, Instrument Sans, JetBrains Mono (OFL)
├── scripts/
│   ├── render-assets.mjs   escenas 3D → PNG transparentes + anclas de etiquetas
│   ├── build-pdf.mjs       HTML → PDF + marcadores, campos y metadatos
│   └── lib/
└── web/
    ├── index.html          versión interactiva
    ├── scenes.js           escenas 3D compartidas (Three.js r160)
    └── assets/renders/     renders usados por el PDF y como respaldo en la web
```
