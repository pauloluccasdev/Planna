"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Setup = {
  hasCourse: boolean;
  hasSubject: boolean;
  hasContent: boolean;
  hasEstimate: boolean;
  hasAvailability: boolean;
};

const mainItems = [
  { href: "/app", label: "Semana", icon: "calendar" },
  { href: "/app/courses", label: "Organizar", icon: "book" },
  { href: "/app/planning", label: "Planejar", icon: "spark" },
  { href: "/app/study/new", label: "Estudar", icon: "play" },
  { href: "/app/metrics", label: "Progresso", icon: "chart" },
] as const;

function Icon({ name }: { name: (typeof mainItems)[number]["icon"] }) {
  const paths = {
    calendar: (
      <path d="M5 3v3m6-3v3M3.5 8h9M4 4.5h8a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
    ),
    book: (
      <path d="M3 3.5h7a2 2 0 0 1 2 2V13H5a2 2 0 0 0-2 1V3.5Zm9 2h1a1 1 0 0 1 1 1V14H5" />
    ),
    spark: (
      <path d="m8 2 .9 3.1L12 6l-3.1.9L8 10l-.9-3.1L4 6l3.1-.9L8 2Zm4 8 .5 1.5L14 12l-1.5.5L12 14l-.5-1.5L10 12l1.5-.5L12 10Z" />
    ),
    play: (
      <>
        <path d="M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" />
        <path d="m6.8 5.5 3.5 2.5-3.5 2.5v-5Z" />
      </>
    ),
    chart: <path d="M3 13V8m5 5V3m5 10V6M2 14h12" />,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      {paths[name]}
    </svg>
  );
}

function isCurrent(pathname: string, href: string) {
  if (href === "/app")
    return pathname === href || pathname.startsWith("/app/blocks/");
  if (href === "/app/courses")
    return ["/app/courses", "/app/subjects", "/app/contents"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  if (href === "/app/planning")
    return (
      pathname.startsWith("/app/planning") ||
      pathname.startsWith("/app/replanning")
    );
  if (href === "/app/study/new")
    return (
      pathname.startsWith("/app/study") || pathname.startsWith("/app/session")
    );
  return pathname.startsWith(href);
}

export function AppNavigation({
  setup,
  isAdmin,
  userId,
}: {
  setup: Setup;
  isAdmin: boolean;
  userId: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigationItems = isAdmin
    ? [
        { href: "/app", label: "Início", icon: "calendar" as const },
        { href: "/app/admin", label: "Contas", icon: "book" as const },
      ]
    : mainItems;

  const steps = useMemo(
    () => [
      {
        done: setup.hasCourse,
        label: "Cadastrar um curso",
        href: "/app/courses",
      },
      {
        done: setup.hasSubject,
        label: "Adicionar uma disciplina",
        href: "/app/courses",
      },
      {
        done: setup.hasContent,
        label: "Criar conteúdos e prioridades",
        href: "/app/courses",
      },
      {
        done: setup.hasEstimate,
        label: "Informar horas de dedicação",
        href: "/app/courses",
      },
      {
        done: setup.hasAvailability,
        label: "Definir disponibilidade semanal",
        href: "/app/settings/study",
      },
    ],
    [setup],
  );
  const completed = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  useEffect(() => {
    if (isAdmin) return;
    const storageKey = `planna-setup-progress:${userId}`;
    const savedProgress = window.localStorage.getItem(storageKey);
    const lastShownProgress =
      savedProgress === null ? -1 : Number(savedProgress);

    window.localStorage.setItem(storageKey, String(completed));

    if (completed === steps.length) {
      const timer = window.setTimeout(() => setOpen(false), 0);
      return () => window.clearTimeout(timer);
    }

    if (completed > lastShownProgress) {
      const timer = window.setTimeout(() => {
        setHelpOpen(false);
        setOpen(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [completed, isAdmin, steps.length, userId]);

  function openSetup() {
    setHelpOpen(false);
    setOpen(true);
  }

  return (
    <>
      <nav className="app-navigation" aria-label="Navegação do Planna">
        <div className="app-navigation-inner">
          {navigationItems.map((item) => (
            <Link
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
              className={isCurrent(pathname, item.href) ? "is-current" : ""}
              href={item.href}
              key={item.href}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
          {!isAdmin ? (
            <>
              <button
                aria-expanded={helpOpen}
                aria-controls="navigation-help-panel"
                className="navigation-help-trigger"
                onClick={() => {
                  setOpen(false);
                  setHelpOpen((value) => !value);
                }}
                type="button"
              >
                <span aria-hidden="true">?</span>
                <span>Ajuda</span>
              </button>
              <button
                aria-expanded={open}
                aria-controls="setup-navigation-panel"
                className="setup-navigation-trigger"
                onClick={() => {
                  setHelpOpen(false);
                  setOpen((value) => !value);
                }}
                type="button"
              >
                <span className="setup-navigation-progress">{completed}/5</span>
                <span>Preparar plano</span>
              </button>
            </>
          ) : null}
        </div>
      </nav>
      {helpOpen ? (
        <div
          className="setup-navigation-backdrop"
          onClick={() => setHelpOpen(false)}
        >
          <aside
            aria-label="Ajuda de navegação"
            aria-modal="true"
            className="setup-navigation-panel navigation-help-panel"
            id="navigation-help-panel"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">Bem-vindo ao Planna</span>
                <h2>Seu estudo, passo a passo</h2>
              </div>
              <button
                aria-label="Fechar ajuda"
                onClick={() => setHelpOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <p className="navigation-help-intro">
              Você não precisa configurar tudo de uma vez. Comece pela sua
              estrutura acadêmica e o Planna indicará o próximo passo.
            </p>
            <ol className="navigation-help-journey">
              <li>
                <span>1</span>
                <div>
                  <strong>Organize</strong>
                  <p>Cadastre cursos, disciplinas, conteúdos e prioridades.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Planeje</strong>
                  <p>Informe seus horários e gere ou monte sua agenda.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Estude</strong>
                  <p>Execute blocos planejados ou registre um estudo livre.</p>
                </div>
              </li>
              <li>
                <span>4</span>
                <div>
                  <strong>Acompanhe</strong>
                  <p>
                    Veja seu progresso e trate atrasos sem perder o controle.
                  </p>
                </div>
              </li>
            </ol>
            <div className="navigation-help-note">
              <strong>Está procurando alguma área?</strong>
              <p>
                Use o menu principal. No celular, ele permanece visível na parte
                inferior da tela.
              </p>
            </div>
            <button
              className="button setup-next-action"
              onClick={openSetup}
              type="button"
            >
              {next ? "Ver minha próxima etapa" : "Revisar minha preparação"}
            </button>
          </aside>
        </div>
      ) : null}
      {open ? (
        <div
          className="setup-navigation-backdrop"
          onClick={() => setOpen(false)}
        >
          <aside
            aria-label="Etapas para preparar o planejamento"
            aria-modal="true"
            className="setup-navigation-panel"
            id="setup-navigation-panel"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">Seu caminho</span>
                <h2>
                  {completed === 5
                    ? "Tudo pronto para planejar"
                    : "Prepare seu planejamento"}
                </h2>
              </div>
              <button
                aria-label="Fechar"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <div
              className="setup-progress-track"
              aria-label={`${completed} de 5 etapas concluídas`}
            >
              <span style={{ width: `${completed * 20}%` }} />
            </div>
            <ol className="setup-step-list">
              {steps.map((step, index) => (
                <li
                  className={
                    step.done ? "is-done" : next === step ? "is-next" : ""
                  }
                  key={step.label}
                >
                  <span>{step.done ? "✓" : index + 1}</span>
                  <Link href={step.href} onClick={() => setOpen(false)}>
                    {step.label}
                  </Link>
                </li>
              ))}
            </ol>
            {next ? (
              <Link
                className="button setup-next-action"
                href={next.href}
                onClick={() => setOpen(false)}
              >
                Continuar: {next.label}
              </Link>
            ) : (
              <Link
                className="button setup-next-action"
                href="/app/planning"
                onClick={() => setOpen(false)}
              >
                Gerar planejamento
              </Link>
            )}
            <nav className="setup-secondary-links" aria-label="Outras áreas">
              <Link href="/app/settings/study">Configurações</Link>
              <Link href="/app/notifications">Notificações</Link>
              <Link href="/app/replanning">Replanejamento</Link>
              {isAdmin ? (
                <Link href="/app/admin">Administrar contas</Link>
              ) : null}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
