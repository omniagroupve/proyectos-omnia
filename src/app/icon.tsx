// El icono de la pestaña, generado igual que la imagen para compartir:
// sin archivo que mantener y siempre coherente con la marca.
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", background: "#00D680", color: "#0A0B0D",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, borderRadius: 7,
        }}
      >
        P
      </div>
    ),
    size
  );
}
