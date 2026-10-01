export const metadata = {
  title: "Términos y condiciones",
  description: "Términos de uso del servicio.",
};

export default function Terminos() {
  return (
    <div className="container-x max-w-3xl py-14">
      <h1 className="text-3xl font-bold">Términos y condiciones</h1>
      <div className="mt-8 space-y-6 leading-relaxed text-white/85">
        <p className="text-sm text-muted">
          Última actualización: enero de 2026. Plantilla base — revísala con un
          abogado antes de operar comercialmente.
        </p>

        <section>
          <h2 className="text-xl font-bold">1. Naturaleza del servicio</h2>
          <p className="mt-2">
            Este sitio ofrece contenido informativo y analítico sobre mercados
            deportivos. No somos una casa de apuestas, no aceptamos apuestas, no
            gestionamos fondos de terceros y no prestamos asesoramiento
            financiero ni de inversión.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">2. Ausencia de garantías</h2>
          <p className="mt-2">
            No garantizamos beneficios de ningún tipo. Los resultados históricos
            publicados no predicen resultados futuros. Toda decisión de apuesta
            es responsabilidad exclusiva del usuario, que asume íntegramente el
            riesgo económico.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">3. Edad y jurisdicción</h2>
          <p className="mt-2">
            El servicio está reservado a mayores de 18 años. El usuario es
            responsable de comprobar que la actividad de apuestas sea legal en su
            país y región de residencia antes de utilizar la información.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">4. Suscripciones y reembolsos</h2>
          <p className="mt-2">
            Las suscripciones se renuevan automáticamente hasta su cancelación,
            que puede efectuarse en cualquier momento desde el panel de usuario.
            La cancelación mantiene el acceso hasta el fin del periodo abonado.
            Los pagos son procesados por Lemon Squeezy como vendedor registrado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">5. Uso permitido</h2>
          <p className="mt-2">
            Queda prohibida la redistribución, reventa o publicación de los picks
            y análisis a terceros. La cuenta es personal e intransferible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold">6. Enlaces de afiliación</h2>
          <p className="mt-2">
            Algunos enlaces a operadores pueden generar una comisión. Esto no
            altera el análisis: el modelo selecciona siempre la mejor cuota
            disponible con independencia de la relación comercial.
          </p>
        </section>
      </div>
    </div>
  );
}
