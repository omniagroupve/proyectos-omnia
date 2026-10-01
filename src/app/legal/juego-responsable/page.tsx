import Link from "next/link";

export const metadata = {
  title: "Juego responsable",
  description:
    "Señales de alerta, herramientas de autocontrol y recursos de ayuda para el juego problemático.",
};

export default function JuegoResponsable() {
  return (
    <div className="container-x max-w-3xl py-14">
      <h1 className="text-3xl font-bold">Juego responsable</h1>

      <p className="mt-6 leading-relaxed text-white/85">
        Apostar debe ser una actividad controlada y planificada. Si en algún
        momento deja de serlo, ninguna ventaja matemática compensa el coste.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Señales de alerta</h2>
        <ul className="mt-4 space-y-2 text-white/85">
          <li>· Apostar dinero destinado a gastos esenciales</li>
          <li>· Intentar recuperar pérdidas aumentando los importes</li>
          <li>· Ocultar la actividad a personas cercanas</li>
          <li>· Pedir prestado para apostar</li>
          <li>· Ansiedad o irritabilidad cuando no puedes apostar</li>
          <li>· Dedicarle más tiempo del que tenías previsto, de forma repetida</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Herramientas de autocontrol</h2>
        <p className="mt-3 leading-relaxed text-white/85">
          Todas las casas reguladas ofrecen límites de depósito, límites de
          pérdida, pausas temporales y autoexclusión. Configúralos antes de
          necesitarlos, no después. También existen registros nacionales de
          autoexclusión que bloquean el acceso a todos los operadores
          licenciados a la vez.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Dónde pedir ayuda</h2>
        <p className="mt-3 leading-relaxed text-white/85">
          Jugadores Anónimos opera grupos de apoyo gratuitos en la mayoría de
          países de habla hispana. En España, la FEJAR ofrece atención
          especializada y también existe una línea nacional de atención al
          jugador. En México, Argentina, Colombia y Venezuela hay programas
          públicos y asociaciones locales de ayuda al juego patológico.
        </p>
        <p className="mt-3 leading-relaxed text-white/85">
          Si te preocupa tu relación con el juego, hablar con un profesional de
          salud mental es un buen primer paso, y no hace falta esperar a que la
          situación sea grave.
        </p>
      </section>

      <div className="card mt-12 p-6 text-sm text-muted">
        Puedes cerrar tu cuenta y cancelar cualquier suscripción de forma
        inmediata desde tu panel, sin justificación ni penalización.{" "}
        <Link href="/precios" className="text-accent hover:underline">Ver planes</Link>
      </div>
    </div>
  );
}
