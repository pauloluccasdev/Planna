# Motor de planejamento

## Objetivo

O motor transforma conteúdos elegíveis, eventos acadêmicos, blocos existentes e disponibilidade em uma **proposta explicável de blocos**. Ele não confirma nem altera o planejamento vigente.

Para o MVP, o motor deve ser determinístico e baseado em regras. IA generativa não participa da decisão de alocação.

## Princípios

1. Nunca alocar fora da disponibilidade semanal.
2. Nunca sobrepor blocos confirmados ou intervalos de eventos acadêmicos com término.
3. Preservar todo bloco já confirmado.
4. Incluir atrasos mesmo quando não estiverem na seleção inicial.
5. Excluir da geração automática conteúdo sem estimativa.
6. Separar prioridade informada pelo aluno de urgência calculada.
7. Permitir que urgência por prazo supere prioridade manual.
8. Informar carga que não coube, em vez de criar uma agenda impossível.
9. Explicar por que cada conteúdo foi priorizado e alocado.
10. Produzir somente uma proposta, sujeita a revisão e confirmação.

## Entradas

### Solicitação do aluno

- início e fim do período desejado;
- cursos selecionados;
- disciplinas selecionadas;
- identidade do aluno;
- versão dos dados usada para detectar alterações concorrentes.

### Estrutura acadêmica

- conteúdos ativos das disciplinas selecionadas;
- prioridade de 1 a 5;
- estimativa total, quando informada;
- estado e progresso;
- partes cadastradas apenas para informação — o aluno as associa durante a revisão.

### Pressão temporal

- eventos dentro ou próximos ao período;
- data, horário inicial e término opcional de cada evento;
- conteúdos explicitamente relacionados;
- eventos marcados como “conteúdos ainda não informados”.

### Capacidade e ocupação

- intervalos recorrentes de disponibilidade materializados no período;
- blocos confirmados;
- eventos acadêmicos;
- blocos atrasados;
- carga já planejada para cada conteúdo;
- histórico necessário para calcular progresso e risco.

## Saídas

Uma geração deve produzir:

- proposta identificável e versionada;
- blocos propostos com conteúdo, início, fim e duração;
- partes ainda pendentes de associação pelo aluno;
- justificativa de prioridade por conteúdo;
- carga solicitada, alocada e não alocada;
- conteúdos ignorados e motivo;
- alertas de risco e capacidade;
- fotografia/versão das entradas relevantes;
- parâmetros e versão do algoritmo utilizados.

## Elegibilidade

Um conteúdo é elegível quando:

- pertence ao aluno;
- está ativo, assim como sua disciplina e curso;
- pertence à seleção da solicitação, ou possui bloco atrasado;
- não está concluído;
- possui prioridade válida;
- possui estimativa de duração.

O conteúdo deve ser listado como não elegível, com motivo, quando falhar nessas condições. Conteúdo sem estimativa continua disponível para planejamento manual.

## Construção dos horários livres

1. Materializar a grade semanal entre início e fim escolhidos.
2. Recortar o intervalo inicial para não alocar no passado.
3. Subtrair os intervalos de eventos acadêmicos que possuam término.
4. Subtrair blocos confirmados elegíveis à ocupação da agenda.
5. Normalizar intervalos restantes em ordem cronológica.
6. Descartar fragmentos menores que a duração mínima do bloco — parâmetro ainda a validar.

Intervalos de eventos sobrepostos devem ser combinados na subtração para não duplicar tempo ocupado.

## Carga de um conteúdo

### Valores conceituais

- `estimativa_total`: duração informada para o conteúdo.
- `carga_cumprida`: parte da estimativa considerada satisfeita por blocos concluídos.
- `carga_confirmada_futura`: duração de blocos futuros já confirmados.
- `carga_atrasada`: duração ainda atribuída a blocos atrasados.
- `carga_a_propor`: trabalho restante que o motor tentará alocar.

### Fórmula candidata

```text
carga_a_propor = max(
  0,
  estimativa_total
  - carga_cumprida
  - carga_confirmada_futura
)
```

A fórmula evita duplicar horas já presentes no calendário. O modo exato de calcular `carga_cumprida` ainda precisa ser decidido, especialmente para conclusão antecipada, tempo excedente e sessões não planejadas.

Blocos atrasados precisam ser considerados uma única vez: como carga a recuperar, nunca simultaneamente como carga futura válida.

## Prioridade, urgência e ordenação

### Componentes confirmados

O ordenamento deve considerar:

- prioridade manual;
- proximidade de evento relacionado;
- carga restante;
- progresso atual;
- existência de atraso;
- capacidade disponível até o prazo.

### Modelo de pontuação candidato

Cada componente deve ser normalizado para uma faixa comum antes da combinação:

```text
score =
    peso_prioridade   * prioridade_normalizada
  + peso_prazo        * urgencia_prazo
  + peso_atraso       * indicador_atraso
  + peso_risco        * risco_capacidade
  + peso_progresso    * pressao_de_conclusao
```

Os pesos e as curvas ainda não estão aprovados. O modelo expressa a estrutura, não valores definitivos.

### Urgência de prazo candidata

Para conteúdo relacionado a eventos, a urgência cresce conforme diminuem os dias úteis de estudo até o evento. Não deve haver divisão direta apenas por dias corridos, pois a capacidade real depende da grade do aluno.

Uma abordagem candidata é usar:

```text
pressao = carga_restante_ate_evento / capacidade_livre_ate_evento
```

- abaixo de `1`: a carga ainda cabe;
- igual a `1`: toda a capacidade disponível será necessária;
- acima de `1`: há déficit e risco inevitável sem mudança de disponibilidade ou escopo.

Quando um evento está marcado como “conteúdos ainda não informados”, ele aumenta o risco informativo da disciplina, mas não autoriza o motor a inventar conteúdos relacionados.

### Desempate candidato

Quando os scores forem iguais:

1. evento relacionado mais próximo;
2. bloco atrasado mais antigo;
3. maior prioridade manual;
4. menor carga restante, favorecendo conclusão;
5. identificador estável, garantindo resultado reproduzível.

A ordem de desempate é proposta técnica e requer validação com cenários reais.

## Alocação

### Estratégia recomendada para o MVP

Usar alocação gulosa com reavaliação de prioridade a cada bloco:

1. Ordenar candidatos pelo score atual.
2. Escolher o candidato mais crítico.
3. Encontrar o primeiro horário livre adequado antes de seu prazo relevante.
4. Determinar duração compatível com o intervalo e com a configuração de Pomodoro.
5. Criar bloco proposto.
6. Reduzir carga não alocada e capacidade livre.
7. Recalcular pressão e score dos candidatos afetados.
8. Repetir até não haver carga ou horários utilizáveis.

Essa estratégia é explicável e testável. O motor deve ser isolado para permitir substituição futura por otimização mais sofisticada sem mudar as regras externas.

### Dimensionamento do bloco

O bloco deve respeitar:

- tamanho do intervalo livre;
- carga restante do conteúdo;
- ciclos da configuração padrão de Pomodoro;
- duração mínima e máxima ainda a validar;
- limite do evento relacionado;
- blocos e eventos adjacentes.

Pausas do Pomodoro fazem parte da duração planejada do bloco conforme a regra atual.

### Partes

O motor não distribui partes automaticamente. Ele propõe o conteúdo e deixa a associação das partes como pendência obrigatória da revisão quando o conteúdo as possuir.

## Eventos e prazos

- Conteúdo explicitamente relacionado deve ter sua carga tentada antes do evento.
- Um evento pode elevar conteúdo de prioridade baixa acima de outro sem prazo próximo.
- O intervalo do evento com término é indisponível para estudo.
- Evento sem término é marcador pontual e não reduz a disponibilidade.
- Eventos sobrepostos permanecem válidos e geram alerta.
- Evento sem conteúdos conhecidos não permite alocação inventada; deve produzir alerta para completar a informação.
- O tratamento de evento criado sobre bloco já confirmado permanece pendente.

## Detecção de capacidade insuficiente

Para cada conteúdo com evento:

```text
deficit = max(0, carga_necessaria_ate_evento - capacidade_alocavel_ate_evento)
```

Também deve existir visão agregada por disciplina, curso e período.

O resultado deve informar:

- horas necessárias;
- horas já cumpridas;
- horas já planejadas;
- horas livres utilizáveis;
- déficit;
- evento e conteúdos afetados;
- ações possíveis, sem alteração automática.

## Planejamento de longo prazo

O aluno pode solicitar até um semestre. O mesmo algoritmo pode ser usado, mas a proposta deve:

- alertar que horizontes longos são mais sujeitos a mudança;
- preservar a versão das entradas;
- ser paginável ou processada de forma assíncrona se necessário;
- nunca sacrificar validações por causa do volume.

Limites máximos de período e quantidade de blocos ainda precisam ser definidos.

## Replanejamento de bloco atrasado

O replanejamento usa o mesmo calendário de capacidade, mas opera sobre um único bloco.

Fluxo candidato:

1. Detectar o atraso depois do fim programado.
2. Verificar se já houve primeira sugestão automática.
3. Determinar a carga do bloco a recuperar.
4. Localizar o primeiro horário futuro válido considerando urgência do conteúdo.
5. Criar sugestão com justificativa, sem reservar definitivamente o horário.
6. Revalidar o horário quando o aluno aceitar ou editar.
7. Em confirmação, marcar o original como replanejado e criar o substituto atomicamente.

Após rejeição, outra sugestão só pode ser produzida por solicitação do aluno.

**A validar:** se um bloco parcialmente executado deve ser sugerido com duração original ou apenas duração remanescente.

## Validação antes da confirmação

Como a agenda pode mudar enquanto uma proposta está aberta, a confirmação deve revalidar:

- propriedade e estado dos conteúdos;
- disponibilidade vigente;
- conflitos com eventos e blocos;
- datas no passado;
- partes pertencentes ao conteúdo;
- versão dos itens preservados;
- ausência de confirmação duplicada.

Se houver conflito, nenhum bloco da proposta deve ser confirmado parcialmente. O tratamento visual de proposta desatualizada ainda precisa de validação.

## Explicabilidade

Cada bloco proposto deve carregar motivos estruturados, por exemplo:

```text
Conteúdo: Sistema cardiovascular
Motivos:
- prioridade manual: alta
- prova relacionada em 8 dias
- 3h restantes para 4h livres antes da prova
- 1 bloco atrasado
```

Não armazenar somente texto. Os fatores numéricos e categorias devem estar disponíveis para testes, auditoria e futura apresentação pela IA.

## Reprodutibilidade e versionamento

Uma geração deve registrar:

- versão do algoritmo;
- parâmetros e pesos;
- instante e fuso da geração;
- intervalo solicitado;
- identificadores/versões das entradas;
- resultado e déficits.

Com as mesmas entradas e parâmetros, a geração deve produzir o mesmo resultado.

## Cenários mínimos de teste

1. Um conteúdo cabe integralmente em um intervalo.
2. Um conteúdo precisa ser dividido em vários dias.
3. Dois conteúdos possuem prioridades diferentes e nenhum evento.
4. Conteúdo de baixa prioridade possui prova próxima.
5. A carga total excede a capacidade.
6. Um conteúdo não possui estimativa.
7. Há blocos confirmados no período.
8. Há evento dentro da disponibilidade.
9. Há eventos sobrepostos.
10. Um conteúdo atrasado ficou fora da seleção inicial.
11. O horizonte cobre um semestre.
12. A proposta fica desatualizada antes da confirmação.
13. Não existe fragmento grande o suficiente para o bloco mínimo.
14. Um evento não possui conteúdos informados.
15. Duas gerações recebem exatamente as mesmas entradas.

## Decisões pendentes específicas

- pesos e curvas do score;
- desempates definitivos;
- duração mínima e máxima de bloco;
- política de carga cumprida por conclusão antecipada ou excedente;
- efeito de sessões não planejadas na carga restante;
- duração sugerida para bloco parcialmente executado;
- limite de horizonte e quantidade de blocos;
- tratamento de propostas desatualizadas;
- distribuição desejável entre disciplinas para evitar concentração excessiva;
- necessidade de espaçamento/revisão como regra do MVP ou evolução.
