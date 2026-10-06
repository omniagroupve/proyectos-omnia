# Sección "Inversión" · Propuesta Domina

Sección nueva para la propuesta (`propuesta-domina-production.up.railway.app`): tres opciones de precio para capacitar a 15 personas en el AI Back Office de Panal.

| Nivel | Nombre | Precio | Por persona |
|---|---|---|---|
| 1 | Fundamentos | US$200 | ≈ US$13 |
| 2 | Operación (recomendado) | US$300 | US$20 |
| 3 | Dominio | US$500 | ≈ US$33 |

## Qué hace

- Piso de panal en 3D (three.js 0.170) del que suben tres columnas de miel. Cada celda apilada vale US$50, así que la altura de cada columna es el precio: 4, 6 y 10 celdas.
- Las columnas caen celda a celda cuando la sección entra en pantalla, y el precio de cada tarjeta sube de 50 en 50 al mismo ritmo.
- Al pasar el mouse por una tarjeta (o tocarla en el móvil), su columna se ilumina y se abre. Señalar una columna resalta su tarjeta.
- Tarjetas de vidrio con inclinación 3D, y una tabla comparativa plegable debajo.
- Sin WebGL o sin conexión al CDN se ven las mismas columnas en plano. Con "reducir movimiento" activado no hay animación.
- Solo dibuja mientras la sección está a la vista.

## Cómo integrarla

1. Copia todo lo que hay entre `SECCIÓN INVERSIÓN · inicio` y `SECCIÓN INVERSIÓN · fin` de `seccion-inversion.html` y pégalo donde va la sección (después de la #7).
2. Si la propuesta ya carga three.js con su propio `importmap`, borra el de este bloque y deja uno solo con las dos rutas (`three` y `three/addons/`). Las dos versiones deben coincidir.
3. Si la navegación de la propuesta usa anclas numéricas (`#7`), cambia `id="inversion"` por el número que le toque.

## Cómo editarla

- **Precios:** atributo `data-price` de cada `<li class="pnl-tier">` y el número visible dentro de `.pnl-tier__num`. Las columnas 3D se recalculan solas.
- **Valor de cada celda:** `data-unit="50"` en el `<section>`.
- **Tabla comparativa, "por persona" y respaldo plano:** son texto fijo y hay que actualizarlos a mano si cambian los precios.
- **Colores:** variables al inicio del CSS (`--tinta`, `--miel`, `--niebla`, etc.). Son las del manual de Panal. Si la propuesta usa otra paleta, se cambian ahí y en las constantes de color del script 3D (`0xFF9F0A`, `0x111113`).

## Pendiente

El dominio de Railway estaba bloqueado en el entorno donde se construyó esto, así que no se pudo ver la propuesta original. La estética sigue el manual de Panal (fondo de noche, miel, celdas hexagonales del logo) tal como está en el showreel del repo. Hay que comprobar que las fuentes, los radios y los colores coinciden con las secciones vecinas antes de publicar.
