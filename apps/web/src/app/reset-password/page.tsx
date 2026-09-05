import type { Metadata } from "next";
import Link from "next/link";
import { PasswordResetForm } from "./password-reset-form";

export const metadata: Metadata = { title: "Criar nova senha" };

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <Link
          className="brand"
          href="/"
          aria-label="Voltar ao início do Planna"
        >
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <div className="auth-copy">
          <span className="eyebrow">Recupere seu acesso</span>
          <h1>Crie uma nova senha.</h1>
          <p>O link é temporário e deixa de valer depois da alteração.</p>
        </div>
        <PasswordResetForm />
      </section>
      <aside className="auth-aside" aria-label="Segurança da recuperação">
        <div>
          <span className="eyebrow">Uma nova etapa</span>
          <blockquote>
            “Depois da alteração, use a nova senha para retornar ao seu
            planejamento.”
          </blockquote>
        </div>
      </aside>
    </main>
  );
}
