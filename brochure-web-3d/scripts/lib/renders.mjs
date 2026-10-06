// Tamaño en px de salida (≈1.6× el tamaño en página para nitidez al imprimir).
export const RENDERS = [
  ["hero", 1300, 1060],
  ["layers-flat", 760, 520],
  ["layers-depth", 1160, 860],
  ["icon-modelado", 360, 360],
  ["icon-interaccion", 360, 360],
  ["icon-animacion", 360, 360],
  ["icon-ux", 360, 360],
  ["icon-rendimiento", 360, 360],
  ["icon-ia", 360, 360],
  ["tower", 1000, 1000],
  ["bottles", 1040, 980],
  ["pump", 1500, 820],
  ["higgs", 1240, 820],
  ["steps", 1800, 640],
  ["portal", 1000, 1000],
];

export const SIZE = Object.fromEntries(RENDERS.map(([n, w, h]) => [n, { w, h }]));
