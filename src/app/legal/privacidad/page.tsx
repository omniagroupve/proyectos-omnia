export const metadata = {
  title: "Política de privacidad",
  description: "Cómo tratamos tus datos personales.",
};

export default function Privacidad() {
  return (
    <div className="container-x max-w-3xl py-14">
      <h1 className="text-3xl font-bold">Política de privacidad</h1>
      <div className="mt-8 space-y-6 leading-relaxed text-white/85">
        <p className="text-sm text-muted">
          Plantilla base conforme a RGPD. Adáptala a tu operativa real.
        </p>

        <section>
          <h2 className="text-xl font-bold">Datos que recogemos</h2>
          <p className="mt-2">
            Correo electrónico para la cuenta, datos de suscripción gestionados
            por el procesador de pagos, y datos de uso agregados y anonimizados.
            No almacenamos datos de tarjeta en ningún momento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Finalidad</h2>
          <p className="mt-2">
            Prestar el servicio, gestionar el acceso según el plan contratado,
            enviar avisos operativos y, si lo consientes, comunicaciones
            comerciales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Encargados del tratamiento</h2>
          <p className="mt-2">
            Supabase (base de datos y autenticación), Lemon Squeezy (pagos),
            Vercel (alojamiento). Todos con garantías adecuadas de transferencia
            internacional.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">Tus derechos</h2>
          <p className="mt-2">
            Puedes solicitar acceso, rectificación, supresión, portabilidad y
            oposición escribiendo a la dirección de contacto. Responderemos en un
            plazo máximo de 30 días.
          </p>
        </section>
      </div>
    </div>
  );
}
