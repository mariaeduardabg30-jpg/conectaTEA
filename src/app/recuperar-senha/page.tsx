"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";
import { ErrorNote, InlineSpinner } from "@/components/ui/page-header";
import { friendlyAuthError, useApp } from "@/lib/data/provider";

export default function ForgotPasswordPage() {
  const { backend, mode } = useApp();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const isDemo = mode === "demo";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    setSending(true);
    try {
      await backend.requestPasswordReset(email.trim());
      setSent(true);
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Brand />
        <Link href="/entrar" className="btn-ghost min-h-10 px-3 text-sm">
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para entrar
        </Link>
      </header>

      <main className="mx-auto max-w-md px-4 pb-16 pt-4 sm:px-6 lg:pt-10">
        <section className="card p-6 sm:p-8">
          {isDemo ? (
            <div className="text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Sparkles className="size-7" aria-hidden />
              </span>
              <h1 className="mt-4 font-display text-2xl font-black text-ink">
                Recuperação de senha
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                O modo demonstração não envia e-mails. Para experimentar, volte à tela de entrada e
                use qualquer e-mail com uma senha de 4 caracteres ou mais.
              </p>
              <Link href="/entrar" className="btn-primary mt-6 w-full">
                <ArrowLeft className="size-4" aria-hidden />
                Voltar para entrar
              </Link>
            </div>
          ) : sent ? (
            <div className="text-center">
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
                <CheckCircle2 className="size-8" aria-hidden />
              </span>
              <h1 className="mt-4 font-display text-2xl font-black text-ink">
                Confira seu e-mail
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Se existir uma conta com <strong className="text-ink">{email}</strong>, enviamos um
                link para você criar uma nova senha.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                O link expira em pouco tempo. Verifique também a caixa de spam ou lixo eletrônico.
              </p>
              <Link href="/entrar" className="btn-secondary mt-6 w-full">
                <ArrowLeft className="size-4" aria-hidden />
                Voltar para entrar
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setError(null);
                }}
                className="mt-4 text-sm font-extrabold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-strong"
              >
                Enviar para outro e-mail
              </button>
            </div>
          ) : (
            <div>
              <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Mail className="size-6" aria-hidden />
              </span>
              <h1 className="mt-4 font-display text-2xl font-black text-ink">
                Esqueceu a senha?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha com
                segurança.
              </p>

              <form className="mt-6 space-y-4" onSubmit={submit}>
                <div>
                  <label htmlFor="email" className="label">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                      aria-hidden
                    />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className="input pl-12"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <ErrorNote>{error}</ErrorNote>}

                <button
                  type="submit"
                  disabled={sending}
                  className="btn-primary min-h-12 w-full text-base"
                >
                  {sending ? <InlineSpinner className="size-4" /> : <Mail className="size-4" aria-hidden />}
                  {sending ? "Enviando…" : "Enviar link de recuperação"}
                  {!sending && <ArrowRight className="size-4" aria-hidden />}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-muted">
                Lembrou a senha?{" "}
                <Link
                  href="/entrar"
                  className="font-extrabold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-strong"
                >
                  Entrar
                </Link>
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
