import Link from "next/link";

/** Logotipo: un radar mínimo + el nombre. */
export function Marca({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-tinta no-underline"
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.45" />
        <path d="M12 12 L19.4 4.6" stroke="var(--sello)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16.5" cy="15.5" r="1.6" fill="var(--sello)" />
      </svg>
      Triki Radar
    </Link>
  );
}
