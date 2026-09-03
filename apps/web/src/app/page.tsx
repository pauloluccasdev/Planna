const steps = [
  [
    "01",
    "Organize",
    "Cursos, disciplinas, conteúdos e compromissos acadêmicos no mesmo lugar.",
  ],
  [
    "02",
    "Planeje",
    "Transforme prioridades e disponibilidade em uma grade semanal realista.",
  ],
  [
    "03",
    "Acompanhe",
    "Compare o que foi planejado com seu tempo efetivo de estudo.",
  ],
];

export default function Home() {
  return (
    <main>
      <header className="shell nav">
        <a
          className="brand"
          href="#inicio"
          aria-label="Planna — página inicial"
        >
          <span className="brand-mark">P</span>
          Planna
        </a>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a className="button button-small" href="#acesso">
            Entrar
          </a>
        </nav>
      </header>

      <section className="hero shell" id="inicio">
        <div className="hero-copy">
          <span className="eyebrow">Seu semestre, sob controle</span>
          <h1>
            Planeje o estudo.
            <br />
            Adapte à vida real.
          </h1>
          <p>
            O Planna transforma matérias, provas e seu tempo disponível em um
            plano de estudos claro — e ajuda você a reagir quando os planos
            mudam.
          </p>
          <div className="hero-actions" id="acesso">
            <a className="button" href="#como-funciona">
              Começar a planejar
            </a>
            <span>MVP em desenvolvimento</span>
          </div>
        </div>

        <div className="week-card" aria-label="Exemplo de planejamento semanal">
          <div className="week-heading">
            <div>
              <small>MINHA SEMANA</small>
              <strong>18 — 24 AGO</strong>
            </div>
            <span>82% realizado</span>
          </div>
          <div className="day-row">
            <b>SEG</b>
            <div className="block mint">
              <small>19:00</small> Fisiologia
            </div>
          </div>
          <div className="day-row">
            <b>TER</b>
            <div className="block lime">
              <small>19:00</small> Bioquímica
            </div>
          </div>
          <div className="day-row">
            <b>QUA</b>
            <div className="block sand">
              <small>19:00</small> Anatomia
            </div>
          </div>
          <div className="day-row">
            <b>QUI</b>
            <div className="block mint">
              <small>20:00</small> Fisiologia
            </div>
          </div>
          <div className="event-pill">Prova de Fisiologia em 6 dias</div>
        </div>
      </section>

      <section className="steps" id="como-funciona">
        <div className="shell">
          <span className="eyebrow">Um ciclo que acompanha você</span>
          <h2>Do conteúdo à conclusão.</h2>
          <div className="step-grid">
            {steps.map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
