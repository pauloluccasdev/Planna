# Requisitos não funcionais

## Status

Os requisitos abaixo definem qualidades mínimas do MVP. Metas numéricas marcadas como **propostas** precisam ser validadas antes da implementação ou contratação de infraestrutura.

## Segurança e privacidade

- **RNF-SEG-001 — Isolamento:** toda consulta e alteração acadêmica deve ser limitada ao proprietário autenticado do dado.
- **RNF-SEG-002 — Menor privilégio:** o papel administrativo deve acessar apenas informações necessárias à gestão de contas.
- **RNF-SEG-003 — Credenciais:** senhas devem ser armazenadas exclusivamente por algoritmo de hash apropriado e nunca registradas em texto puro, logs ou respostas.
- **RNF-SEG-004 — Transporte:** todo tráfego de produção deve utilizar HTTPS.
- **RNF-SEG-005 — Sessões:** tokens e cookies devem possuir expiração, proteção contra uso indevido e revogação no logout ou bloqueio da conta.
- **RNF-SEG-006 — Recuperação:** códigos ou links de redefinição devem ser temporários, de uso único e invalidados após utilização.
- **RNF-SEG-007 — Autorização no servidor:** ocultar uma ação na interface não substitui validação de permissão no backend.
- **RNF-SEG-008 — Dados sensíveis:** segredos, tokens e dados pessoais não devem aparecer em logs de aplicação.
- **RNF-SEG-009 — Auditoria:** ações administrativas, alterações de planejamento e transições críticas devem gerar registro auditável.
- **RNF-SEG-010 — Abuso:** autenticação e recuperação devem possuir proteção contra tentativas automatizadas. A política exata está a validar.

## Integridade e concorrência

- **RNF-INT-001 — Fonte oficial:** o banco central é a fonte oficial do estado no MVP.
- **RNF-INT-002 — Atomicidade:** confirmação de proposta, replanejamento e conclusão de sessão devem ser transacionais.
- **RNF-INT-003 — Sessão única:** a garantia de um cronômetro em execução deve funcionar mesmo com várias abas ou dispositivos.
- **RNF-INT-004 — Idempotência:** operações suscetíveis a repetição de requisição não podem criar sessões, blocos ou confirmações duplicados.
- **RNF-INT-005 — Histórico:** versões confirmadas não devem ser sobrescritas sem preservação do estado anterior quando as regras exigirem auditoria.
- **RNF-INT-006 — Tempo:** datas devem ser persistidas de forma inequívoca e apresentadas no fuso `America/Sao_Paulo`.

## Desempenho

- **RNF-DES-001 — Interação:** ações comuns devem apresentar resposta visual imediata, mesmo quando o processamento no servidor continuar.
- **RNF-DES-002 — API:** proposta inicial de percentil 95 abaixo de 500 ms para operações comuns, excluindo geração de planejamento e serviços externos.
- **RNF-DES-003 — Geração:** propostas longas devem exibir estado de processamento e impedir solicitações duplicadas. Meta de duração a validar com testes de volume.
- **RNF-DES-004 — Agenda:** a interface deve carregar por janelas de data e evitar buscar todo o histórico do aluno de uma vez.
- **RNF-DES-005 — Indicadores:** consultas devem usar agregações e filtros eficientes para não recalcular todo o histórico no cliente.

## Disponibilidade, recuperação e operação

- **RNF-OPS-001 — Ambientes:** desenvolvimento, teste/homologação e produção devem permanecer separados.
- **RNF-OPS-002 — Migrações:** mudanças de banco devem ser versionadas e reproduzíveis.
- **RNF-OPS-003 — Backup:** dados de produção devem ter backups automáticos e restauração testada. Frequência e retenção estão a validar.
- **RNF-OPS-004 — Observabilidade:** falhas, latência, geração de planos, notificações e tarefas automáticas devem ser monitoráveis.
- **RNF-OPS-005 — Correlação:** requisições e processos assíncronos devem possuir identificadores de correlação sem expor informações pessoais.
- **RNF-OPS-006 — Falha parcial:** indisponibilidade de e-mail ou push não deve impedir o uso das funções acadêmicas.
- **RNF-OPS-007 — Disponibilidade:** meta inicial proposta de 99,5% mensal, sujeita a orçamento e validação.

## Experiência e acessibilidade

- **RNF-UX-001 — Mobile-first:** os fluxos principais devem ser utilizáveis prioritariamente em telas de celular.
- **RNF-UX-002 — Responsividade:** a aplicação deve se adaptar também a tablet e desktop.
- **RNF-UX-003 — Acessibilidade:** objetivo mínimo proposto de conformidade WCAG 2.2 nível AA nos fluxos essenciais.
- **RNF-UX-004 — Teclado e foco:** todas as ações essenciais devem ser operáveis por teclado, com foco visível e ordem coerente.
- **RNF-UX-005 — Contraste e semântica:** estados não podem ser comunicados apenas por cor; componentes devem possuir nome e função acessíveis.
- **RNF-UX-006 — Confirmação:** ações destrutivas ou que alterem planejamento confirmado devem exibir consequências antes da confirmação.
- **RNF-UX-007 — Explicabilidade:** propostas, riscos e impedimentos devem indicar o motivo e a ação necessária.
- **RNF-UX-008 — Estado temporal:** o cronômetro deve ser reconstruído a partir de registros temporais, sem depender apenas de um contador visual contínuo.

## PWA e compatibilidade

- **RNF-PWA-001 — Instalação:** a aplicação deve possuir manifesto, ícones e modo de exibição adequados à instalação como PWA.
- **RNF-PWA-002 — Online:** o MVP pode exigir conexão; a interface deve informar claramente perda de conectividade.
- **RNF-PWA-003 — Cache seguro:** eventual cache de arquivos da aplicação não deve ser apresentado como suporte funcional offline.
- **RNF-PWA-004 — Navegadores:** a matriz mínima de navegadores e versões ainda deve ser definida antes dos testes de aceite.
- **RNF-PWA-005 — Atualização:** novas versões não devem deixar o usuário preso indefinidamente em arquivos incompatíveis de uma versão anterior.
- **RNF-PWA-006 — Push progressivo:** ausência de suporte a notificações push não deve bloquear instalação ou uso.

## Manutenibilidade e qualidade

- **RNF-MNT-001 — Modularidade:** regras de planejamento, execução, indicadores e identidade devem possuir limites explícitos.
- **RNF-MNT-002 — Rastreabilidade:** requisitos, regras de negócio, testes e decisões arquiteturais devem usar identificadores ou referências consistentes.
- **RNF-MNT-003 — Testes:** regras de autorização, conflitos, estados, KPIs e planejamento devem possuir testes automatizados proporcionais ao risco.
- **RNF-MNT-004 — Contratos:** interfaces entre frontend e backend devem ser versionadas ou evoluídas de maneira compatível.
- **RNF-MNT-005 — Documentação:** alterações de comportamento devem atualizar os documentos correspondentes no mesmo trabalho.
- **RNF-MNT-006 — Dados de teste:** ambientes não produtivos não devem depender de cópias identificáveis de dados reais.

## Localização

- **RNF-LOC-001 — Idioma:** o idioma inicial da interface será português do Brasil.
- **RNF-LOC-002 — Datas:** datas e horários devem ser exibidos em padrão compreensível no Brasil.
- **RNF-LOC-003 — Durações:** cálculos internos devem evitar erros de ponto flutuante, usando unidades inteiras adequadas.
