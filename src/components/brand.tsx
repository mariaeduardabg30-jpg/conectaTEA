import Image from "next/image";
import Link from "next/link";

// O app também roda em um subdiretório (GitHub Pages). O next/image não
// aplica o basePath sozinho, então montamos o caminho completo aqui.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-[28%] bg-primary-soft ring-1 ring-black/5 ${className}`}
    >
      <Image
        src={`${basePath}/mascote.jpeg`}
        alt=""
        fill
        sizes="64px"
        className="object-cover"
      />
    </span>
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
