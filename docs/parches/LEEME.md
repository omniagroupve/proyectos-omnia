# Parches listos para aplicar

Cambios escritos y revisados, pero que **no puedo verificar desde el entorno
donde trabajo** porque necesitan salir a internet al compilar. Prefiero
dejarlos aquí a subirlos sin probar: un build roto en la rama que vas a
desplegar cuesta más que la mejora.

---

## `fuentes-autoalojadas.patch`

**Qué hace.** Cambia las fuentes de un `<link>` a Google Fonts a
`next/font/google`, que las descarga al compilar y las sirve desde tu dominio.

**Qué ganas.** Una petición externa menos en cada visita, nada que depender de
un tercero, y se acaba el salto de maquetación al cambiar de la fuente de
reserva a la definitiva. Cuenta para Core Web Vitals, que es posicionamiento.

**Por qué no está aplicado.** Lo probé y el build falla aquí con:

```
An error occurred in `next/font`.
TypeError: Cannot read properties of null (reading '1')
```

No es un fallo del código: `next/font` intenta descargar los ficheros de
`fonts.googleapis.com` durante la compilación y este entorno tiene la salida
bloqueada. En tu máquina y en Vercel hay red, así que debería funcionar.

**Cómo aplicarlo** (en tu computador, con internet):

```bash
git apply docs/parches/fuentes-autoalojadas.patch
npm run build          # si compila, está bien
```

Si compila, súbelo. Si falla por otro motivo, deshazlo con:

```bash
git checkout src/app/layout.tsx tailwind.config.ts
```

**Cómo comprobar que funcionó.** Abre la web, F12 → pestaña Red, recarga.
Antes aparecían peticiones a `fonts.googleapis.com` y `fonts.gstatic.com`;
después no debería salir ninguna.
