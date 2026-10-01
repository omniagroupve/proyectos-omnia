// Configuración de ESLint · existía el script `npm run lint` pero no esto, así
// que abría un asistente interactivo y CI no podía ejecutarlo.
//
// Criterio: sólo se marca como ERROR lo que rompe el producto o engaña al
// usuario. Lo estilístico queda en aviso o fuera. Un lint que grita por todo
// se acaba ignorando, y entonces no avisa de lo que importa.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "apps/**",        // territorio de Codex, con su propia configuración
      "scripts/**",     // se ejecutan con node --experimental-strip-types
      "*.config.*",
      "next-env.d.ts",  // lo genera Next en cada build: no es nuestro
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Un `any` suelto es deuda, no un incendio.
      "@typescript-eslint/no-explicit-any": "warn",
      // Útil, pero no debe tumbar un despliegue.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
