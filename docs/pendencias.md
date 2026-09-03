# Pendências e decisões futuras

Estes pontos não bloqueiam a consolidação inicial, mas devem ser decididos antes da implementação da área correspondente.

## Regras ainda a detalhar

- Campos obrigatórios e limites de tamanho para cursos, disciplinas, conteúdos, partes e observações.
- Estados completos e transições permitidas para blocos, sessões, propostas, conteúdos e partes.
- Fórmula e pesos exatos do motor de priorização.
- Duração mínima e máxima de blocos gerados automaticamente.
- Distribuição dos ciclos de Pomodoro dentro de blocos de diferentes durações.
- Critério preciso para considerar um conteúdo concluído quando não possui partes.
- Comportamento de uma parte associada a vários blocos.
- Validação de sobreposição em registros retroativos.
- Limites para séries recorrentes e geração de planejamento semestral.
- Antecedências e categorias exatas das notificações.
- Tratamento quando a permissão de notificação for negada.
- Política de sessão interrompida, frequência de confirmação de atividade e correção de horário.
- Política de retenção do registro técnico de itens cancelados ou excluídos.
- Dados mínimos do perfil e consentimentos de privacidade.
- Fluxo operacional de solicitação de exclusão de conta fora do aplicativo.
- Obrigatoriedade ou não de verificar o e-mail antes do primeiro acesso.
- Comportamento ao cadastrar ou editar evento sobre um bloco já confirmado.
- Comportamento ao arquivar conteúdo ou disciplina com blocos futuros.
- Permissão ou não para cancelar um bloco enquanto sua sessão está em execução.
- Política para proposta que se torna inválida enquanto está sendo revisada.
- Possível expiração de propostas e sugestões não respondidas.
- Regra para recorrência diária que encontra evento ou indisponibilidade em uma data futura.
- Consequência de reutilizar em novos blocos uma parte já concluída.
- Estado final de uma sessão reconciliada após fechamento inesperado.
- Regra de redução da estimativa restante para conclusão antecipada, tempo excedente e estudo não planejado.
- Forma de exibir tempo não planejado no KPI principal.
- Data de atribuição histórica de cancelamentos e replanejamentos.
- Inclusão ou não do indicador histórico de atrasos ocorridos, além dos atrasos atuais.
- Faixas visuais de pressão e risco de capacidade.
- Política para bloco atrasado parcialmente executado: duração original ou somente remanescente.
- Critérios de concentração e espaçamento de conteúdos no motor automático.
- Normalização e regras de unicidade de nome de usuário e e-mail.
- Estratégia de retenção para propostas descartadas, tokens expirados e inscrições push inválidas.
- Persistência ou cálculo sob demanda dos diagnósticos históricos de risco.
- Política de criação parcial ou atômica de série recorrente quando houver ocorrência inválida.

## Decisões técnicas ainda não tomadas

- Framework e hospedagem da PWA.
- Localização da camada de aplicação entre servidor da PWA e Supabase Edge Functions.
- Estratégia física detalhada de migração no Supabase/PostgreSQL.
- Configuração final do Supabase Auth e provedor de envio de e-mail.
- Infraestrutura de notificações push.
- Hospedagem, observabilidade, backups e ambientes.
- Estratégia de concorrência para garantir uma sessão ativa por aluno.
- Estratégia de ambientes/projetos separados no Supabase.

## Fora do núcleo atual

- Momento exato de entrada da IA no roadmap.
- Contratos de ferramentas somente de leitura para a IA.
- Fluxo de confirmação de ações sugeridas pela IA.
- Importação padronizada de blocos via planilha e PDF.
- Estratégia offline.
