"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({ pending }: { pending: number }) {
  return (
    <Link
      href="/responsavel/ajuda"
      className="relative inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:border-primary/30 hover:bg-primary-soft/60 hover:text-primary-strong"
      aria-label={
        pending > 0
          ? `${pending} pedido${pending > 1 ? "s" : ""} de ajuda pendente${pending > 1 ? "s" : ""}`
          : "Pedidos de ajuda"
      }
      title="Pedidos de ajuda"
    >
      <Bell className="size-5" aria-hidden />
      {pending > 0 && (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-help px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white">
          {pending}
        </span>
      )}
    </Link>
  );
}
