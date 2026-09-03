import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
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
          <span className="eyebrow">Bem-vindo de volta</span>
          <h1>Entre para ver seu plano.</h1>
          <p>Use o nome de usuário e a senha cadastrados no Planna.</p>
        </div>
        <LoginForm />
      </section>
      <aside className="auth-aside" aria-label="Resumo da plataforma">
        <div>
          <span className="eyebrow">
            Planejamento que acompanha a realidade
          </span>
          <blockquote>
            “Organize o semestre, execute cada bloco e saiba exatamente onde
            ajustar.”
          </blockquote>
        </div>
      </aside>
    </main>
  );
}
