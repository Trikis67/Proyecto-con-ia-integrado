/**
 * El radar de la portada. El barrido gira y cada eco se enciende cuando el haz
 * pasa por encima (el retraso de cada eco sale de su ángulo).
 */
const ECOS = [
  { angulo: 35, distancia: 0.72, fuerte: true },
  { angulo: 118, distancia: 0.45, fuerte: false },
  { angulo: 200, distancia: 0.82, fuerte: false },
  { angulo: 262, distancia: 0.3, fuerte: true },
  { angulo: 318, distancia: 0.6, fuerte: false },
];

export function Radar() {
  const r = 140;
  return (
    <svg viewBox="-160 -160 320 320" className="w-full max-w-[22rem]" aria-hidden>
      <defs>
        <linearGradient id="haz" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--sello)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--sello)" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      {[1, 0.66, 0.33].map((f) => (
        <circle key={f} r={r * f} fill="none" stroke="var(--linea)" strokeWidth="1.25" />
      ))}
      <line x1={-r} x2={r} y1="0" y2="0" stroke="var(--linea)" />
      <line y1={-r} y2={r} x1="0" x2="0" stroke="var(--linea)" />

      <g className="radar-barrido">
        <path d={`M0 0 L${r} 0 A${r} ${r} 0 0 0 ${r * Math.cos(-0.6)} ${r * Math.sin(-0.6)} Z`} fill="url(#haz)" />
        <line x1="0" y1="0" x2={r} y2="0" stroke="var(--sello)" strokeWidth="1.5" />
      </g>

      {ECOS.map((e) => {
        const rad = (e.angulo * Math.PI) / 180;
        return (
          <circle
            key={e.angulo}
            className="radar-eco"
            cx={Math.cos(rad) * r * e.distancia}
            cy={Math.sin(rad) * r * e.distancia}
            r={e.fuerte ? 6 : 4}
            fill={e.fuerte ? "var(--sello)" : "var(--tinta-3)"}
            style={{ animationDelay: `${(e.angulo / 360) * 6 - 6 * 0.78}s` }}
          />
        );
      })}
      <circle r="3" fill="var(--tinta)" />
    </svg>
  );
}
