// ═══════════════════════════════════════════════════════════════════════════
// PRUEBAS DE CUMPLIMIENTO · que el texto publicado no nos meta en un lío
// ═══════════════════════════════════════════════════════════════════════════
//
//   npm run test:cumplimiento
//
// No comprueba código: comprueba PALABRAS. Existe porque una frase de
// marketing puede costar más que un fallo de software.
//
//   · "inversión" / "rentabilidad" referidas al dinero del cliente nos
//     convierten en servicio de inversión no autorizado — competencia de la
//     CNMV en España, y un problema mucho peor que el del juego.
//   · "garantizado" / "infalible" es publicidad engañosa en cualquier
//     jurisdicción donde vayamos a operar.
//   · El aviso de +18 y juego responsable es obligatorio en todas las páginas.
//
// Ya se coló una vez: /guias decía "que apostar sea una decisión de inversión".
// Compilaba, pasaba las pruebas y era exactamente la frase que no podía estar.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? "\n      " + detail : ""}`); }
}

/** Todos los .ts/.tsx bajo src/, que es lo que acaba viéndose. */
function fuentes(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const ruta = join(dir, e);
    if (statSync(ruta).isDirectory()) fuentes(ruta, acc);
    else if (/\.tsx?$/.test(e)) acc.push(ruta);
  }
  return acc;
}

const archivos = fuentes("src");

// Ficheros donde la palabra es legítima: el prompt que se las prohíbe a la IA
// y los textos legales, que tienen que poder decir "no garantizamos".
const EXENTOS = [
  "src/lib/ai.ts",
  "src/app/legal/",
  "scripts/",
];
const exento = (f: string) => EXENTOS.some((e) => f.startsWith(e));

const PROHIBIDAS: Array<[RegExp, string]> = [
  [/\binversi[óo]n\b/i, "«inversión» → servicio de inversión no autorizado (CNMV)"],
  [/\binvertir\b/i, "«invertir» → mismo problema"],
  [/\brentabilidad\b/i, "«rentabilidad» → mismo problema"],
  [/ganancias?\s+garantizad/i, "«ganancias garantizadas» → publicidad engañosa"],
  [/gesti[óo]n\s+de\s+capital/i, "«gestión de capital» → suena a gestora de fondos"],
  [/\bdinero\s+seguro\b/i, "promete un resultado"],
  [/sistema\s+infalible/i, "promete un resultado"],
];

console.log("\n── Palabras que no pueden aparecer en el producto ──");
for (const [re, porque] of PROHIBIDAS) {
  const golpes: string[] = [];
  for (const f of archivos) {
    if (exento(f)) continue;
    const texto = readFileSync(f, "utf8");
    texto.split("\n").forEach((linea, i) => {
      if (re.test(linea)) golpes.push(`${f}:${i + 1}  ${linea.trim().slice(0, 90)}`);
    });
  }
  check(porque, golpes.length === 0, golpes.join("\n      "));
}

console.log("\n── Avisos obligatorios ──");
const chrome = readFileSync("src/components/SiteChrome.tsx", "utf8");
check("el pie de página está en todas las páginas (layout)",
  readFileSync("src/app/layout.tsx", "utf8").includes("<Footer"));
check("el pie incluye el aviso de edad", /ageWarning|\+18/.test(chrome));
check("el pie incluye el descargo", /disclaimer/.test(chrome));

const es = readFileSync("src/lib/i18n.ts", "utf8");
check("el descargo dice que no se garantizan beneficios",
  /No garantizamos beneficios/i.test(es));
check("el aviso de edad prohíbe a menores",
  /Prohibido para menores/i.test(es));
check("hay página de juego responsable",
  readdirSync("src/app/legal").includes("juego-responsable"));

console.log(`\n${"─".repeat(56)}`);
console.log(`${pass} pasados · ${fail} fallidos\n`);
process.exit(fail > 0 ? 1 : 0);
