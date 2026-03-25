# MusiLab — Guia de Novas Funcionalidades 2026

> **Para quem é este guia?**
> Este documento explica, em linguagem acessível, cada uma das 12 melhorias implementadas no MusiLab ao longo de março de 2026. Ideal para novos professores que estão descobrindo o sistema ou para quem quer entender o que há de novo.

---

## Como o MusiLab está organizado (visão geral rápida)

O MusiLab é organizado em 5 módulos principais:

- **Planos** — onde você cria e gerencia seus planos de aula
- **Caderno da Turma** — ficha de cada turma com alunos, histórico e mapa pedagógico
- **Hoje** — resumo do dia, calendário e aulas agendadas
- **Biblioteca** — Repertório, Atividades, Estratégias e Sequências Didáticas
- **Pós-aula** — registro do que aconteceu na aula (aberto pelo botão 📝 em cada plano)

---

## FASE A — Alunos e Chamada

### A1 — Ficha completa do aluno

**Onde fica:** Caderno da Turma → aba "Alunos"

**O que era antes:** Cada aluno era apenas um nome com uma flag colorida ("⚠️ atenção") e uma nota rápida de texto livre.

**O que é agora:** Cada aluno tem uma ficha expandível com três camadas de informação:

1. **Instrumento** — um campo pequeno ao lado do nome, visível sem precisar abrir a ficha. Exemplo: "João Silva — violão".

2. **Anotações pedagógicas** — um histórico de observações por aula. Você pode registrar, por exemplo: *"Dificuldade com leitura de colcheias"* ou *"Muito engajado com a peça nova"*. Cada anotação fica com data e pode ter um tipo (ex: "comportamento", "técnica", "repertório") — os tipos são configuráveis pela turma (ver A3).

3. **Marcos pedagógicos** — conquistas importantes do aluno. Exemplo: *"Tocou a música inteira sem partitura pela primeira vez"*. Diferente das anotações do dia a dia, os marcos ficam em destaque com ⭐ e representam saltos de aprendizado significativos.

**Como usar:**
- Clique no card do aluno para expandir a ficha
- Clique em "+ Anotação" para registrar uma observação
- Clique em "⭐ Novo marco" para registrar uma conquista
- As anotações ficam ordenadas por data e persistem entre sessões

---

### A2 — Chamada rápida no pós-aula

**Onde fica:** Botão 📝 (pós-aula) em qualquer plano → seção "Chamada"

**O que era antes:** Não havia controle de presença. Você sabia quantos alunos estavam na aula, mas não tinha registro de quem especificamente estava presente.

**O que é agora:** Quando você abre o pós-aula de um plano, aparece automaticamente a lista de alunos da turma com dois chips para cada um: **✓ Presente** (verde) e **✗ Ausente** (vermelho). Basta clicar para marcar.

No topo da seção aparece o total: **"N/Total presentes"**, com os nomes dos ausentes listados logo abaixo.

**No histórico de registros**, cada aula que teve chamada mostra um badge com o número de presentes. Assim você consegue visualizar rapidamente o padrão de frequência da turma ao longo do tempo.

**Como usar:**
- Ao abrir o pós-aula, role até a seção "Chamada"
- Clique em cada chip para alternar entre presente e ausente
- O contador atualiza em tempo real
- A chamada fica salva junto com o registro da aula

---

### A3 — Tipos de anotação configuráveis por turma

**Onde fica:** Caderno da Turma → aba "Alunos" → ícone ⚙️ de configuração

**O que era antes:** As anotações dos alunos eram texto livre sem categorização.

**O que é agora:** Cada turma pode ter sua própria lista de tipos de anotação. Por exemplo:
- Uma turma de musicalização infantil pode ter: "Coordenação motora", "Atenção", "Participação"
- Uma turma de violão avançado pode ter: "Técnica de mão direita", "Leitura", "Expressividade"

**Como configurar:**
- Acesse a turma no Caderno da Turma
- Clique no ícone ⚙️ ao lado de "Alunos"
- Adicione ou remova tipos de anotação conforme a necessidade da turma
- Os tipos criados ficam disponíveis como atalhos ao registrar anotações dos alunos daquela turma

---

## FASE B — Pós-aula mais estruturado

### B1 — Rubrica de avaliação configurável

**Onde fica:** Botão 📝 (pós-aula) → seção "Rubrica"

**O que era antes:** O pós-aula tinha campos livres (resumo, o que funcionou, o que não funcionou). Não havia avaliação estruturada.

**O que é agora:** Você pode avaliar a aula segundo critérios pedagógicos predefinidos, usando uma escala numérica. O sistema vem com 3 critérios padrão:

| Critério | Escala |
|----------|--------|
| Participação | 1 a 5 |
| Desenvolvimento técnico | 1 a 5 |
| Engajamento | 1 a 5 |

Para cada critério, aparecem botões numerados. Clique no número que melhor representa o desempenho da turma naquela aula. O botão selecionado fica em destaque azul.

**Personalizar os critérios:**
- Acesse o Caderno da Turma
- Clique em ⚙️ "Configurar Rubrica"
- Adicione seus próprios critérios e escolha a escala (1-3 para avaliações simples, 1-5 para mais granularidade)
- Os critérios configurados aparecem automaticamente no pós-aula de planos daquela turma

**Para que serve:** Com os dados de rubrica ao longo do tempo, você consegue ver se a turma como um todo está evoluindo ou se há uma queda de engajamento — um sinal para revisar a abordagem pedagógica.

---

### B2 — Encaminhamentos para a próxima aula

**Onde fica:** Botão 📝 (pós-aula) → seção "Encaminhamentos" + banner amarelo ao abrir a próxima aula

**O que era antes:** O campo "Próxima aula" era texto livre, mas ficava "esquecido" até você lembrar de abrir o registro antigo.

**O que é agora:** Os encaminhamentos são uma lista de tarefas pendentes que você cria no final de uma aula. Exemplos:

- *"Trazer violão na semana que vem"*
- *"Retomar exercício de solfejo — ficou pela metade"*
- *"Pesquisar nova música para o João"*

**Como funciona na prática:**
1. **Ao registrar a aula:** escreva o encaminhamento e pressione Enter (ou clique em "+ Add")
2. **Na próxima aula da mesma turma:** ao abrir o modo "Nova aula" (seletor de turma), aparece um **banner azul** listando os encaminhamentos pendentes daquela turma. Assim você não precisa se lembrar — o sistema lembra por você.
3. **Ao registrar a próxima aula:** os encaminhamentos pendentes aparecem listados. Marque como ✓ concluído conforme for resolvendo.
4. **No roteiro gerado pela IA** ("Adaptar" → gerar sugestão): os encaminhamentos pendentes são incluídos automaticamente como contexto, para que a sugestão seja mais relevante.

---

### B3 — Nota de voz no pós-aula

**Onde fica:** Botão 📝 (pós-aula) → seção "Nota de voz" (logo antes do botão Salvar)

**O que era antes:** Não existia. O pós-aula era só texto.

**O que é agora:** Você pode gravar uma nota de voz de até 60 segundos diretamente no pós-aula, sem nenhum aplicativo externo. O áudio fica salvo no dispositivo junto com o registro da aula.

**Como usar:**
1. Clique em **⏺ Gravar nota de voz**
2. O navegador pode pedir permissão para usar o microfone — clique em "Permitir"
3. O contador mostra o tempo gravado em tempo real (●REC 0:23 / 60s)
4. Clique em **⏹ Parar** quando terminar (ou aguarde os 60s — para automaticamente)
5. Aparece um player de áudio para você ouvir antes de salvar
6. Se quiser refazer, clique em 🗑 Excluir e grave novamente
7. Salve o pós-aula normalmente — o áudio é salvo junto

**No histórico de registros:** registros com nota de voz mostram o ícone 🎙️ no cabeçalho. Ao expandir o registro, o player de áudio aparece para reprodução.

**Armazenamento:** o áudio fica salvo localmente no IndexedDB (memória do navegador no seu dispositivo), sem custo adicional e sem passar pelo servidor.

---

## FASE C — Visão anual e produtividade

### C1 — Barra de progresso anual

**Onde fica:** Aba "Hoje" → widget "Progresso do Ano Letivo" (acima das aulas do dia)

**O que era antes:** Você sabia o dia, mas não tinha noção de onde estava no calendário do ano letivo como um todo.

**O que é agora:** Um widget discreto no topo da tela "Hoje" que mostra:

```
Semana 14 de 40 · 35% do ano letivo
[████████░░░░░░░░░░░░░░░] 35%

Turma A: 12 aulas  ·  Turma B: 9 aulas  ·  Turma C: 14 aulas
```

- **Semana do ano letivo:** calculada automaticamente a partir das datas de início e fim configuradas no Ano Letivo
- **Barra de progresso:** visual para você perceber intuitivamente se está adiantado ou atrasado
- **Contagem de aulas por turma:** quantas aulas já foram registradas via pós-aula para cada turma

**Pré-requisito:** ter configurado as datas de início e fim no módulo "Estrutura Escolar" (Ano Letivo). Se as datas não estiverem configuradas, o widget não aparece.

---

### C2 — Mapa de cobertura pedagógica

**Onde fica:** Caderno da Turma → aba "Cobertura"

**O que era antes:** Não existia visão consolidada de "o que esta turma já viu".

**O que é agora:** Um painel que mostra, em barras proporcionais, quais **categorias de atividade** e quais **dimensões pedagógicas** foram mais trabalhadas com a turma ao longo do ano.

**Exemplo visual:**
```
Categorias de atividade:
  Aquecimento    ██████████████  14 vezes
  Técnica        █████████       9 vezes
  Repertório     ███████████████ 15 vezes
  Teoria         ████            4 vezes

Dimensões pedagógicas:
  Criação        ████████████    12 vezes
  Performance    ████████████████ 16 vezes
  Apreciação     ████            4 vezes
```

**Para que serve:**
- Ver rapidamente se você está equilibrando teoria e prática
- Identificar lacunas ("essa turma não teve nenhuma atividade de criação musical nos últimos 2 meses")
- Usar como base para justificar seu planejamento para a coordenação pedagógica

**Como é calculado:** o sistema conta as atividades e estratégias vinculadas a todos os planos aplicados à turma. O cálculo é automático — você não precisa fazer nada além de registrar normalmente seus planos.

---

### C3 — Vista Kanban de planos

**Onde fica:** Aba "Planos" → botão **⠿** no toggle de visualização (ao lado de ⊞ Grade e ☰ Lista)

**O que era antes:** Os planos só podiam ser vistos em grade (cards) ou lista.

**O que é agora:** Uma terceira opção de visualização que organiza seus planos em 4 colunas de acordo com o status de produção:

| Coluna | Significado |
|--------|-------------|
| ✏️ **Rascunho** | Plano em elaboração, não está pronto para aplicar |
| ✅ **Pronto** | Plano finalizado e validado, pode ser aplicado |
| 🎵 **Aplicado** | Plano já foi aplicado em aula |
| 🔍 **Revisado** | Plano aplicado e revisado com as anotações do pós-aula |

**Como usar:**
1. Clique em **⠿** para entrar no modo Kanban
2. Os planos sem status definido aparecem automaticamente em "Rascunho"
3. Para mover um plano de coluna: clique nas setas **←** ou **→** no card
4. Clique no título do plano para abrir e visualizar

**Dica de fluxo de trabalho:**
- Ao criar um plano novo → Rascunho
- Quando revisar e validar → Pronto
- Após aplicar em aula → Aplicado (via botão 📝 do pós-aula, mova manualmente)
- Após revisar o pós-aula e ajustar o plano → Revisado

---

### C5 — PDF do plano individual

**Onde fica:** Botão de exportação em qualquer plano aberto

> ℹ️ Esta funcionalidade já existia na versão anterior e foi mantida. Está listada aqui para conhecimento de novos usuários.

**O que faz:** Gera um PDF formatado de um único plano de aula, com:
- Cabeçalho com escola, nível, data, duração
- Objetivos (geral e específicos)
- Roteiro completo por seção (aquecimento, desenvolvimento, fechamento)
- Músicas vinculadas
- Atividades e materiais
- Rodapé com data de exportação

**Para que serve:** Enviar para coordenação, imprimir para ter em mãos na aula, ou arquivar.

---

### C6 — Resumo para pais via Inteligência Artificial

**Onde fica:** Botão 📝 (pós-aula) → após clicar em Salvar, seção "📱 Resumo para os pais"

**O que era antes:** O pós-aula era só para uso interno do professor.

**O que é agora:** Depois de salvar o pós-aula, aparece um botão **✨ Gerar** na seção roxa "Resumo para os pais". Ao clicar, o sistema usa o Gemini (IA do Google) para transformar suas anotações técnicas numa mensagem amigável para enviar aos pais/responsáveis via WhatsApp ou e-mail.

**Exemplo:**
- O professor registrou: *"Trabalhamos os compassos 8-16 da música, dificuldade na passagem cromática, exercício de escala como tarefa"*
- A IA gera: *"Olá! Hoje na aula trabalhamos uma música nova e avançamos bem. Para praticar em casa, o(a) estudante pode exercitar as escalas que fizemos — uns 10 minutinhos por dia já ajudam muito! Qualquer dúvida, estou à disposição 😊"*

**Como usar:**
1. Salve o pós-aula normalmente
2. Clique em **✨ Gerar** na seção roxa
3. Aguarde 2-3 segundos enquanto a IA processa
4. Leia o resumo gerado
5. Clique em **📋 Copiar** para copiar o texto
6. Cole no WhatsApp ou e-mail para os pais
7. Se não gostar do resultado, clique em **Regenerar** para uma nova versão

**Privacidade:** o sistema envia para a IA apenas o conteúdo do pós-aula (sem nome de alunos, sem dados pessoais). A IA não aprende com seus dados.

---

### C4 — Planejamento sequencial de unidades

**Onde fica:** Biblioteca → Sequências Didáticas → botão **📅 Planejar** em cada sequência

**O que eram as Sequências Didáticas antes:** Uma coleção de roteiros encadeados (ex: "Unidade de Música Brasileira — 8 aulas") que ficavam guardados na Biblioteca sem conexão direta com o calendário.

**O que é agora:** Você pode "agendar" uma sequência inteira para uma turma com um único clique, e o sistema cria automaticamente todos os planos rascunho nas datas corretas.

**Como usar (passo a passo):**

1. Acesse **Biblioteca → Sequências**
2. Encontre a sequência que quer aplicar (ex: "Introdução ao Samba — 6 aulas")
3. Clique em **📅 Planejar**
4. No modal que abre, configure:
   - **Data da 1ª aula:** quando começa a sequência
   - **Dias da semana:** em quais dias você tem aula com essa turma (pode selecionar múltiplos dias, ex: Segunda + Quinta)
   - **Escola** e **Nível** (opcionais, para organização)
5. O sistema mostra um **preview das datas calculadas**:
   ```
   Aula 1: seg, 17/03
   Aula 2: qui, 20/03
   Aula 3: seg, 24/03
   ...
   ```
6. Clique em **Criar N planos rascunho**
7. Acesse a aba **Planos** — os planos criados aparecem lá com:
   - Status: Rascunho (na vista Kanban)
   - Badge azul **📚 Seq. #1**, **📚 Seq. #2**, etc. indicando a origem
   - Datas já preenchidas conforme o calendário calculado

**O que fica pré-preenchido em cada plano criado:**
- Título: *"[Nome da Sequência] — Aula N"*
- Data: calculada automaticamente
- Materiais: os materiais listados no rascunho do slot correspondente

**Depois:** você edita cada plano individualmente para detalhar o roteiro, objetivos e atividades antes de aplicar.

**Para que serve:** ideal para unidades temáticas longas — em vez de criar 8 planos na mão, você cria todos de uma vez e depois preenche os detalhes.

---

## Resumo rápido — o que mudou e onde encontrar

| O que você quer fazer | Onde encontrar |
|-----------------------|----------------|
| Ver o histórico de um aluno | Caderno da Turma → aba Alunos → clique no card do aluno |
| Registrar conquista de um aluno | Caderno da Turma → aluno expandido → ⭐ Novo marco |
| Fazer chamada da turma | Pós-aula 📝 → seção Chamada |
| Ver o que ficou pendente da aula passada | Aparece automaticamente ao selecionar turma no Nova Aula |
| Avaliar a aula por critérios | Pós-aula 📝 → seção Rubrica |
| Gravar uma nota de voz sobre a aula | Pós-aula 📝 → seção Nota de voz |
| Gerar mensagem para pais/WhatsApp | Pós-aula 📝 → seção "Resumo para os pais" (após salvar) |
| Ver progresso do ano letivo | Aba Hoje → widget no topo |
| Ver cobertura pedagógica da turma | Caderno da Turma → aba Cobertura |
| Organizar planos por status | Aba Planos → botão ⠿ (Kanban) |
| Criar planos de uma unidade inteira | Biblioteca → Sequências → 📅 Planejar |

---

## Dúvidas frequentes

**"Preciso preencher tudo para cada aula?"**
Não. Todos os campos novos são opcionais. Você usa o que fizer sentido para o seu fluxo de trabalho. Se quiser só o resumo de texto como antes, continue normalmente.

**"Os dados do áudio vão para a nuvem?"**
Não. O áudio fica salvo apenas no IndexedDB do seu navegador/dispositivo. Ele não é sincronizado com o servidor para não consumir armazenamento da conta.

**"E se eu trocar de dispositivo?"**
Os dados de texto sincronizam normalmente com a nuvem. O áudio, por ser local, não migra automaticamente. Recomenda-se usar o recurso de áudio em um dispositivo fixo.

**"O Kanban substitui a visualização em Grade/Lista?"**
Não. É uma opção adicional. Você pode alternar livremente entre Grade, Lista, Kanban, Por Período e Por Segmento a qualquer momento — clique nos botões no canto superior direito da aba Planos.

**"Os planos criados pelo Sequential Planning já estão prontos para aplicar?"**
São criados como rascunho. Você precisa abrir cada um e adicionar os detalhes (objetivos, roteiro, atividades) antes de considerar pronto. A ideia é que o esqueleto (datas, sequência, materiais básicos) já esteja criado para você economizar tempo.

---

*Guia gerado em 12/03/2026 · MusiLab v2026.03*
