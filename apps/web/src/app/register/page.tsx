import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel registration-panel">
        <Link
          className="brand"
          href="/"
          aria-label="Voltar ao início do Planna"
        >
          <span className="brand-mark">P</span>
          Planna
        </Link>
        <div className="auth-copy registration-copy">
          <span className="eyebrow">Comece seu planejamento</span>
          <h1>Crie sua conta.</h1>
          <p>
            Seus cursos, conteúdos e planejamento serão privados e vinculados
            apenas ao seu perfil.
          </p>
        </div>
        <RegisterForm />
      </section>
      <aside className="auth-aside" aria-label="Resumo da plataforma">
        <div>
          <span className="eyebrow">Planejado para universitários</span>
          <blockquote>
            “Transforme o calendário do semestre em blocos que cabem na sua
            rotina.”
          </blockquote>
        </div>
      </aside>
    </main>
  );
}
