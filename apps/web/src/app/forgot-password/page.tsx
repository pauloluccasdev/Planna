import type { Metadata } from "next";
import Link from "next/link";
import { PasswordRecoveryForm } from "./password-recovery-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
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
          <h1>Esqueceu sua senha?</h1>
          <p>Informe o e-mail usado no cadastro para receber um link seguro.</p>
        </div>
        <PasswordRecoveryForm />
      </section>
      <aside className="auth-aside" aria-label="Segurança da recuperação">
        <div>
          <span className="eyebrow">Acesso protegido</span>
          <blockquote>
            “O Planna nunca envia sua senha. Você cria uma nova usando um link
            temporário.”
          </blockquote>
        </div>
      </aside>
    </main>
  );
}
