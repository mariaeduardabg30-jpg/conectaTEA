import Link from "next/link";

export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Símbolo do ConectaTEA: duas pessoas conectadas"
      className={className}
    >
      <defs>
        <linearGradient id="conecta-mark" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3A8172" />
          <stop offset="1" stopColor="#1F5348" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="15" fill="url(#conecta-mark)" />
      <path
        d="M15.5 27.5c0-6 4.5-10.5 10.5-10.5 4 0 7 2 8.5 5.5"
        stroke="#FFFCF6"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      <circle cx="16" cy="29" r="5.5" fill="#FFFCF6" />
      <circle cx="32.5" cy="32" r="4.5" fill="#F3C36B" />
      <circle cx="34" cy="14" r="2.4" fill="#F3C36B" />
    </svg>
  );
}

export function Brand({
  href = "/",
  compact = false,
  className = "",
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-3 rounded-2xl ${className}`}
      aria-label="ConectaTEA — página inicial"
    >
      <LogoMark className={compact ? "size-9" : "size-11"} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-black tracking-tight text-ink sm:text-[1.35rem]">
          Conecta<span className="text-primary">TEA</span>
        </span>
        {!compact && (
          <span className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted">
            autonomia e conexão
          </span>
        )}
      </span>
    </Link>
  );
}
