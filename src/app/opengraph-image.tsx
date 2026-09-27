// Imagen que sale cuando alguien comparte pix en WhatsApp, X o Telegram.
// Se genera en el servidor con next/og, así que no hay ningún archivo que
// mantener ni ninguna petición externa: cambia sola si cambia la marca.
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Pix · Arma tu parlay y te decimos si vale";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = process.env.NEXT_PUBLIC_BRAND || "Pix";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0A0B0D",
          padding: 72,
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14, background: "#00D680",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0A0B0D", fontSize: 34, fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>{BRAND}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
            Arma tu parlay.
          </div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: "#00D680" }}>
            Te decimos si vale.
          </div>
          <div style={{ fontSize: 30, color: "#8A929E", marginTop: 26, maxWidth: 880 }}>
            Comparamos la cuota que te pagan con la que de verdad vale. Gratis y sin registro.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#8A929E" }}>
          <div>Servicio de información y análisis · no es una casa de apuestas</div>
          <div>+18</div>
        </div>
      </div>
    ),
    size
  );
}
