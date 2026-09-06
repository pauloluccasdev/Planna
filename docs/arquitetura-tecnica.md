# Arquitetura técnica

## Status

Arquitetura de referência do MVP com Next.js, NestJS, Prisma e Supabase/PostgreSQL. A hospedagem ainda será decidida.

## Visão geral

```text
PWA Next.js online e mobile-first
          │ HTTPS + JWT
          ▼
API NestJS + Prisma
├── login por username
├── comandos transacionais
├── motor de planejamento
├── indicadores e riscos
├── administração restrita
└── integrações de e-mail/push
          │
          ▼
Supabase
├── Auth
├── PostgreSQL
│   ├── RLS e grants
│   ├── funções, constraints e índices
│   └── migrations
├── Cron/pg_cron
└── Edge Functions quando adequadas
```

## Estilo arquitetural

Adotar um **monólito modular**. Identidade, estrutura acadêmica, calendário, planejamento, execução, indicadores e notificações são módulos lógicos da mesma solução, não microsserviços.

Isso favorece transações entre entidades, evolução rápida das regras e operação simples no MVP. Os limites modulares preservam a possibilidade de extração futura.

## Módulos

- **Identidade e acesso:** cadastro, login por nome de usuário, recuperação, renovação automática, logout e bloqueio; Supabase Auth é a autoridade de credenciais. Tokens ficam em cookies HTTP-only, e o proxy do Next.js renova sessões antes de renderizar rotas privadas.
- **Estrutura acadêmica:** cursos, períodos, disciplinas, conteúdos, partes e arquivamento.
- **Calendário:** disponibilidade, eventos, blocos, recorrências e conflitos.
- **Planejamento:** propostas determinísticas e explicáveis; confirmação é comando separado.
- **Execução:** sessão ativa, foco, pausas, conclusão, reconciliação e registro retroativo.
- **Adaptação:** atrasos, riscos e sugestões individuais de replanejamento.
- **Indicadores:** cumprimento, tempo, atrasos, cancelamentos, replanejamentos e capacidade.
- **Notificações:** inscrições push, agendamento e entrega.
- **Administração:** somente contas e acesso, sem dados acadêmicos.

## Fronteiras de acesso aos dados

A PWA não acessa tabelas acadêmicas pelo Data API do Supabase. Leituras e comandos passam pela API NestJS, que valida o JWT, a propriedade e o caso de uso antes de acessar o PostgreSQL com Prisma.

Devem ser transacionais:

- cadastro e login por nome de usuário;
- confirmação de proposta;
- início, retomada, troca entre blocos, conclusão e reconciliação de sessão;
- recorrências;
- alteração de disponibilidade com blocos futuros;
- aceitação de replanejamento;
- geração do planejamento;
- registro retroativo;
- ações administrativas;
- envio de notificação.

## Autorização em profundidade

```text
Interface restringe ações
        ↓
NestJS valida JWT, ator e caso de uso
        ↓
RLS e grants bloqueiam o Data API público
        ↓
Constraints protegem invariantes locais
        ↓
Transação protege mudanças compostas
```

Nenhuma camada isolada é suficiente.

## Processamento

### Síncrono

- CRUD acadêmico;
- agenda por intervalo;
- bloco manual;
- início, pausa, retomada e conclusão;
- confirmação de proposta pronta;
- indicadores de consulta rápida.

### Assíncrono

- planejamento longo;
- detecção periódica de atrasos;
- reavaliação de riscos;
- criação e entrega de notificações;
- limpeza de artefatos temporários.

Processos assíncronos usam identificadores idempotentes, estado observável e retentativas limitadas.

Enquanto o job periódico não estiver implantado, a API reconcilia blocos vencidos de forma idempotente antes de responder agenda, blocos e indicadores. O job futuro complementa essa garantia para notificações sem acesso ativo do aluno.

A camada inicial de notificações já separa registro/revogação da inscrição,
consulta da caixa e leitura das futuras políticas de agendamento e entrega. A
PWA somente solicita permissão por ação do aluno e apenas quando uma chave VAPID
pública estiver configurada. Endpoint e chaves da inscrição permanecem somente
na API e não são reapresentados ao cliente.

A PWA observa o estado de conectividade do navegador e informa explicitamente
quando fica offline. O aviso não promete operação offline nem introduz cache de
dados acadêmicos; ele desaparece quando a conectividade é restabelecida. O
service worker assume a versão nova imediatamente e reutiliza uma janela aberta
ao tocar em uma futura notificação, evitando acumular instalações ou abas.
O manifesto abre a área autenticada e oferece ícones PNG de 192 e 512 pixels,
além de uma variante `maskable` com fundo opaco para instalação adaptável em
Android e um ícone dedicado para a tela inicial do iOS.

## Tarefas agendadas

Supabase Cron pode executar SQL ou chamar Edge Functions. Jobs candidatos:

- marcar blocos vencidos e criar a primeira sugestão;
- agendar e enviar notificações;
- reavaliar capacidade após mudanças;
- expirar artefatos temporários conforme política futura.

Frequência e concorrência serão definidas conforme regras de antecedência e custo.

## Motor de planejamento

O núcleo deve permanecer uma função de domínio pura:

```text
entradas imutáveis + parâmetros + versão
                 ↓
         algoritmo determinístico
                 ↓
proposta + diagnósticos + justificativas
```

Persistência, fila e HTTP ficam fora do algoritmo, permitindo testes rápidos e reprodução.

## Sessão e cronômetro

- servidor registra transições e timestamps;
- cliente apresenta tempo derivado, sem ser fonte única;
- bloqueio de tela ou minimização não pausa;
- segmentos de foco e pausa são persistidos;
- exclusividade de sessão ativa é garantida no PostgreSQL/transação;
- interrupção incerta exige reconciliação do aluno.
- início, pausa, retomada, troca, mudança de ciclo, conclusão e registro
  retroativo geram auditoria na mesma transação, sem nomes de conteúdos ou
  observações do aluno.
- início planejado ou livre, conclusão e registro retroativo podem usar chave
  idempotente; a referência ao resultado é gravada atomicamente com o comando e
  não duplica texto acadêmico.
- a PWA recebe do servidor uma chave estável por ação crítica e a reenvia em
  novas tentativas do mesmo formulário ou comando.

## Confirmação de proposta

1. Autenticar o aluno.
2. Validar a revisão/fingerprint das entradas.
3. Revalidar disponibilidade, partes e conflitos.
4. Falhar integralmente se a proposta estiver obsoleta.
5. Criar todos os blocos em uma transação.
6. Marcar a proposta como confirmada.
7. Emitir trabalho de notificações somente após commit.

## Privacidade administrativa

- área administrativa consulta projeção exclusiva de contas;
- não existem joins administrativos com tabelas acadêmicas;
- privilégio de serviço fica no servidor;
- ações administrativas são auditadas;
- métricas operacionais não incluem conteúdo acadêmico identificável.

## Segredos e ambientes

- URL e chave publicável só aparecem em configuração destinada ao cliente.
- `service_role`, senha do banco e tokens externos nunca entram no Git ou bundle da PWA.
- desenvolvimento, homologação e produção devem usar credenciais separadas.
- `.env.example` futuro contém apenas nomes e valores fictícios.
- migrations são a fonte versionada do schema; mudanças manuais isoladas no dashboard devem ser evitadas.

## Observabilidade

Registrar ID de correlação, caso de uso, duração, sucesso/código de falha, versão do algoritmo e resultado dos jobs. Não registrar senha, token, observações, títulos de conteúdo ou payload acadêmico completo.

A API aceita um `x-request-id` seguro fornecido pelo chamador ou gera um UUID
quando ausente ou inválido. O mesmo valor é devolvido no cabeçalho e em
`meta.request_id` tanto nas respostas de sucesso quanto de erro, permitindo
correlacionar a interação sem incluir dados pessoais no identificador.

## Estratégia de testes

- unitários para motor, KPI e estados;
- integração para funções e transações;
- RLS por operação e papel;
- concorrência para sessão única e confirmação;
- contratos da API;
- fluxos mobile/PWA;
- jobs idempotentes;
- restauração de backup em ambiente seguro.

## Decisões abertas

- hospedagem do frontend e da API;
- provedor de e-mail e web push;
- necessidade de fila adicional ao Cron;
- estratégia de cache sem suporte offline;
- projetos Supabase por ambiente;
- metas finais de desempenho e disponibilidade.
