export function Pie() {
  return (
    <footer className="border-t border-linea">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-tinta-2 sm:flex-row sm:justify-between">
        <p>Triki Radar · hecho por Trikis</p>
        <p>
          Datos de licitaciones:{" "}
          <a className="underline hover:text-tinta" href="https://ocds.guatecompras.gt/" target="_blank" rel="noreferrer">
            Guatecompras, Ministerio de Finanzas Públicas
          </a>{" "}
          (CC BY 4.0)
        </p>
      </div>
    </footer>
  );
}
