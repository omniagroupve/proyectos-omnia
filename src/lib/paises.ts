// ═══════════════════════════════════════════════════════════════════════════
// PAÍSES · segmentación geográfica para SEO
// ═══════════════════════════════════════════════════════════════════════════
//
// Quien busca «predicciones deportivas con IA» desde México y quien busca lo
// mismo desde Argentina no quiere la misma página: quiere ver SU liga. Cada
// país tiene aquí su propia URL con sus competiciones.
//
// LO QUE NO SE DICE AQUÍ: qué casas tienen licencia en cada país. No tenemos
// ese dato verificado y equivocarse es un problema legal, no un fallo de SEO.
// Todas las páginas remiten a comprobar la jurisdicción.

import { LEAGUES, type LeagueConfig } from "./config.ts";

export interface Pais {
  slug: string;
  codigo: string;
  nombre: string;
  /** Cómo se llama al deporte rey y su liga en la calle, para que el texto suene local. */
  gancho: string;
  /** Zona horaria de referencia, para explicar cuándo hay partidos. */
  husoNota: string;
}

export const PAISES: Pais[] = [
  {
    slug: "mexico", codigo: "MX", nombre: "México",
    gancho: "la Liga MX",
    husoNota: "Los partidos de la NBA y la NFL caen a buena hora en México, así que casi siempre hay algo abierto por la noche.",
  },
  {
    slug: "argentina", codigo: "AR", nombre: "Argentina",
    gancho: "la Liga Profesional",
    husoNota: "Entre la Liga Profesional, la Libertadores y la NBA de madrugada, rara vez hay un hueco sin partidos.",
  },
  {
    slug: "colombia", codigo: "CO", nombre: "Colombia",
    gancho: "la Liga BetPlay",
    husoNota: "La Liga BetPlay y la Libertadores concentran la semana; los fines de semana se suman las ligas europeas de mañana.",
  },
  {
    slug: "chile", codigo: "CL", nombre: "Chile",
    gancho: "la Primera División",
    husoNota: "La Primera División y la Sudamericana marcan el calendario, con Europa a primera hora del sábado.",
  },
  {
    slug: "peru", codigo: "PE", nombre: "Perú",
    gancho: "la Liga 1",
    husoNota: "La Liga 1 y los torneos Conmebol, más las ligas europeas los fines de semana por la mañana.",
  },
  {
    slug: "venezuela", codigo: "VE", nombre: "Venezuela",
    gancho: "la Liga FUTVE y el béisbol",
    husoNota: "Con la MLB y la NBA en el mismo huso, hay partidos prácticamente toda la tarde y la noche.",
  },
  {
    slug: "brasil", codigo: "BR", nombre: "Brasil",
    gancho: "el Brasileirão",
    husoNota: "El Brasileirão, la Série B y la Libertadores cubren casi todos los días de la semana.",
  },
  {
    slug: "espana", codigo: "ES", nombre: "España",
    gancho: "LaLiga",
    husoNota: "LaLiga y la Champions en horario europeo, con la NBA de madrugada para quien aguante.",
  },
];

export const paisPorSlug = (slug: string) => PAISES.find((p) => p.slug === slug);

/**
 * Competiciones relevantes para un país: las suyas primero, después las
 * continentales y las que ve todo el mundo.
 */
export function ligasDePais(codigo: string): { locales: LeagueConfig[]; resto: LeagueConfig[] } {
  const locales = LEAGUES.filter((l) => l.country === codigo && l.seo);
  const continental = codigo === "ES"
    ? ["champions", "europa-league"]
    : ["libertadores", "sudamericana"];
  const resto = LEAGUES.filter(
    (l) => l.seo && l.country !== codigo &&
      (continental.includes(l.slug) || ["nba", "premier", "laliga", "champions", "nfl", "mlb"].includes(l.slug))
  );
  return { locales, resto };
}
