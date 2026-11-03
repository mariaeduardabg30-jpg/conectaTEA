"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ErrorNote, InlineSpinner, LoadingBlock } from "@/components/ui/page-header";
import { friendlyAuthError, useApp } from "@/lib/data/provider";

export default function ResetPasswordPage() {
  const { backend, mode, ready, user } = useApp();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isDemo = mode === "demo";
  const minLength = isDemo ? 4 : 6;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < minLength) {
      setError(`A senha precisa ter pelo menos ${minLength} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não são iguais. Digite a mesma senha nos dois campos.");
      return;
    }
    setSaving(true);
    try {
      await backend.updatePassword(password);
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch (cause) {
      setError(friendlyAuthError(cause));
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (isDemo) {
      return (
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Sparkles className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-black text-ink">Definir nova senha</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            O modo demonstração não usa links de recuperação. Volte à tela de entrada e use qualquer
            e-mail com uma senha de 4 caracteres ou mais.
          </p>
          <Link href="/entrar" className="btn-primary mt-6 w-full">
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para entrar
          </Link>
        </div>
      );
    }

    if (!ready) {
      return <LoadingBlock label="Verificando seu link…" />;
    }

    if (!user) {
      return (
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-help-soft text-help">
            <LockKeyhole className="size-7" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-black text-ink">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Não encontramos uma sessão de recuperação. Solicite um novo e-mail para redefinir sua
            senha.
          </p>
          <Link href="/recuperar-senha" className="btn-primary mt-6 w-full">
            Pedir novo link
          </Link>
          <Link href="/entrar" className="btn-secondary mt-2 w-full">
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para entrar
          </Link>
        </div>
      );
    }

    if (done) {
      return (
        <div className="text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <CheckCircle2 className="size-8" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-black text-ink">Senha atualizada</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Tudo certo! Sua nova senha já está valendo e você continua conectado.
          </p>
          <Link href="/responsavel" className="btn-primary mt-6 w-full">
            Continuar para o app
          </Link>
        </div>
      );
    }

    return (
      <div>
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-black text-ink">Defina sua nova senha</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Escolha uma senha com pelo menos {minLength} caracteres. Você continuará conectado depois
          de salvar.
        </p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="new-password" className="label">
              Nova senha
            </label>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id="new-password"
                name="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="input px-12"
                placeholder={`Mínimo de ${minLength} caracteres`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={minLength}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="label">
              Confirme a nova senha
            </label>
            <div className="relative">
              <LockKeyhole
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="input pl-12"
                placeholder="Digite a senha novamente"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={minLength}
              />
            </div>
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          <button type="submit" disabled={saving} className="btn-primary min-h-12 w-full text-base">
            {saving ? <InlineSpinner className="size-4" /> : <ShieldCheck className="size-4" aria-hidden />}
            {saving ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          O link de recuperação pode ser usado uma única vez. Se algo der errado, peça um novo em{" "}
          <Link
            href="/recuperar-senha"
            className="font-extrabold text-primary underline decoration-primary/30 underline-offset-4 hover:text-primary-strong"
          >
            recuperar senha
          </Link>
          .
        </p>
      </div>
    );
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
        <section className="card p-6 sm:p-8">{renderContent()}</section>
      </main>
    </div>
  );
}
