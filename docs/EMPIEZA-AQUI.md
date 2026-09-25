# Empieza aquí · guía sin tecnicismos

Esta guía asume que no quieres entender el código. Sólo hacer que funcione.

---

## Parte 1 · Qué tienes, explicado con una pizzería

Imagina que Pix es una pizzería.

- **El backend** (lo que hice yo) es **la cocina**. Recibe ingredientes (cuotas
  de las casas de apuestas), los cocina (calcula qué parlay tiene valor) y deja
  los platos listos en la ventanilla.
- **El frontend** (lo que hace Codex) es **el salón**. Las mesas, la carta, la
  luz bonita. El cliente sólo ve esto.
- **La ventanilla** entre los dos se llama `/api/v1`. El salón pide por ahí y
  la cocina sirve.

Lo importante: **el salón nunca cocina**. Si Codex necesita un dato nuevo, se
pide a la cocina, no se inventa en el salón.

Las dos piezas viven en el mismo repositorio de GitHub:

```
proyectos-omnia/          ← LA COCINA (mía)
├── src/                  motor, IA, API, páginas de SEO
├── supabase/             la base de datos
├── scripts/              herramientas sueltas
└── apps/web/             ← EL SALÓN (de Codex) — aquí va pix-local
```

---

## Parte 2 · Llevarte el backend a Codex · 3 comandos

En tu computador, abre una terminal y escribe esto. Nada más.

```bash
git clone https://github.com/omniagroupve/proyectos-omnia.git
cd proyectos-omnia
git checkout claude/desarrollo-02bfq9
```

Ya tienes todo el backend en tu máquina. Ahora abre esa carpeta con Codex.

**Eso es todo.** No hay que copiar archivos ni configurar nada raro: la cocina
y el salón están en la misma caja.

### Meter tu pix-local dentro

Tu diseño está en otra carpeta. Muévelo al hueco que le dejé preparado:

```bash
rsync -a --exclude node_modules /ruta/donde/tienes/pix-local/src/ apps/web/src/
```

(en Windows, si `rsync` no existe, copia y pega la carpeta `src` a mano dentro
de `apps/web/`)

**No borres estos tres archivos**, son los cables que conectan salón y cocina:

- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/supabase.ts`
- `apps/web/vite.config.ts`

### Encenderlo

Dos terminales abiertas a la vez, siempre:

```bash
# Terminal 1 — la cocina
npm install
npm run dev
```

```bash
# Terminal 2 — el salón
cd apps/web
npm install
npm run dev
```

Abre **`http://localhost:5173`** en el navegador. Ese es Pix funcionando.

> Abre siempre el `5173`, nunca el `3000`. El 5173 es el salón, y él solo va a
> la cocina cuando hace falta.

### Comprobar que todo está sano

```bash
npm run build         # ¿la cocina compila?
npm run test:engine   # ¿la matemática está bien? (72 pruebas)
npm run test:api      # ¿la ventanilla responde? (40 pruebas, con el dev arriba)
```

Si los tres dicen que sí, puedes trabajar tranquilo.

---

## Parte 3 · El prompt para Codex

Cópialo y pégalo tal cual al abrir Codex. Le dice dónde está parado y qué no
debe tocar:

> Este repositorio tiene el backend ya construido y funcionando. Lee
> `apps/web/README.md` y `docs/api-v1.md` antes de escribir nada.
>
> Tu territorio es **sólo `apps/web/`**. No modifiques `src/`, `supabase/` ni
> `scripts/`: eso es del backend y lo mantiene otra persona.
>
> Los tipos de la API vienen de `@pix/contract` — impórtalos, nunca los
> redefinas. Para llamar al backend usa `apps/web/src/lib/api.ts`.
>
> Puedes trabajar sin claves ni base de datos: `api.demo()` y
> `api.evaluateParlay()` funcionan siempre.
>
> Reglas que no se rompen: el aviso **+18 y juego responsable** va visible en
> todas las pantallas, incluso encima de los modales. Nunca escribas "ganancias
> garantizadas", "sistema infalible" ni "inversión".
>
> Arranca con `npm run dev` y verifica en `http://localhost:5173`.

---

## Parte 4 · Hacer la web bonita con Higgsfield y tus skills

El orden importa: **primero la marca, después la pantalla.** Si generas
pantallas antes de tener colores y logo, cada una sale distinta.

### Paso 1 · La marca (Higgsfield, una vez)

Pídele a Higgsfield el kit de marca con el prompt largo que te pasé (el de
"liquid glass estilo Apple"). Lo que tienes que sacar de ahí:

1. **Logo** en tres versiones: color, monocromo y "vidrio"
2. **Paleta**: 5-6 colores con su código hex
3. **Tipografías**: una para títulos, otra para números
4. **Iconos** de los tres pasos
5. **Imagen del hero**

Guarda todo en `apps/web/public/brand/` y **anota los colores en un papel** —
los vas a pegar en el paso siguiente.

### Paso 2 · Convertir la marca en código (Codex, una vez)

Este es el paso que casi todo el mundo se salta y por eso las webs salen
desparejas. Dile a Codex:

> Crea `apps/web/src/styles/tokens.css` con variables CSS para esta paleta:
> [pega aquí los colores de Higgsfield]. Define también la escala de
> tipografías y los radios de esquina. A partir de ahora **todos** los
> componentes usan estas variables, nunca colores escritos a mano.

Desde ese momento, cambiar un color es cambiar una línea, no cuarenta.

### Paso 3 · Las pantallas (Codex, muchas veces)

Ahora sí, pantalla por pantalla. **Una por conversación**, no todas de golpe:

> Construye la pantalla del constructor de parlays usando los tokens de
> `tokens.css` y el cliente `src/lib/api.ts`. Los datos de `api.demo()`.
> Móvil primero. El aviso +18 siempre visible.

Orden recomendado, de más a menos importante:

1. **Constructor de parlays** — el corazón del producto
2. **Comparador de cuotas** — de aquí sale el dinero de afiliación
3. **Calculadora** — el imán que trae gente por Google
4. **Planes** — donde se cobra
5. **Perfil / mis parlays**

### Paso 4 · Las imágenes que faltan (Higgsfield, cuando haga falta)

Cuando Codex necesite una ilustración o un fondo, se lo pides a Higgsfield
**nombrando la paleta**: "usa estos colores exactos: #...". Así encaja con el
resto en vez de parecer pegado.

### El error que quiero que evites

Pedirle a Higgsfield "hazme la web entera". Genera algo precioso que luego no
se conecta con nada: sin datos reales, sin login, sin cuotas. Bonito y muerto.

**Higgsfield pone la cara. Codex la conecta al cuerpo. La cocina ya existe.**

---

## Parte 5 · Cuando tengas las llaves

El día que tengas las claves (Supabase, The Odds API, Anthropic):

```bash
cp .env.example .env.local
# pega las claves dentro de .env.local
```

Después, en orden:

```bash
npm run leagues:verify   # ¿las ligas que configuré existen de verdad?
npm run books:verify     # ¿con qué casas puedo hacer afiliación?
bash scripts/fetch-data.sh && npm run data:seed   # cargar el histórico
```

Y en Supabase (pestaña SQL Editor), pega y ejecuta en este orden:

1. `supabase/schema.sql`
2. `supabase/migrations/002_pix.sql`
3. `supabase/migrations/003_latam.sql`

> `.env.local` **nunca** se sube a GitHub. Ya está bloqueado, pero que lo sepas.

Para comprobar de una sola vez que no falta nada:

```bash
npm run doctor
```

Y para poner Pix en internet y que trabaje solo —despliegue, el reloj que lo
despierta cada 2h y la primera carga de datos— sigue con
**`docs/encender-el-motor.md`**.

---

## Chuleta de comandos

| Quiero… | Escribo |
|---|---|
| Arrancar la cocina | `npm run dev` |
| Arrancar el salón | `cd apps/web && npm run dev` |
| Ver si algo se rompió | `npm run build` |
| Probar la matemática | `npm run test:engine` |
| Probar la ventanilla | `npm run test:api` |
| Traerme lo que hizo el otro motor | `git pull` |
| Guardar mi trabajo | `git add -A && git commit -m "qué hice" && git push` |
