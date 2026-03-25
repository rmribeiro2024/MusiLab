# PLANO DE MELHORIAS — MÓDULO "NOVA AULA" (MusiLab)

**Baseado em:** Auditoria Pedagógica Consolidada (2026-03-17 + 2026-03-18)
**Autoria:** Claude Sonnet 4.6 | **Data:** 2026-03-18
**Objetivo:** Transformar análise em decisões práticas de produto

---

# PARTE 1 — PRINCÍPIOS NORTEADORES

*Estes 7 princípios funcionam como filtro de cada decisão de redesign.
Se uma mudança contradiz um deles, não entra.*

---

### P1 — Atividade é a unidade central de pensamento do professor
Professores reais pensam primeiro em "o que faremos" e só depois em "por quê". O roteiro de atividades permanece como coração do formulário. Campos de objetivos e avaliação vêm depois, não antes.
**Base:** Yinger (1980), Clark & Peterson (1986), Elliott (1995)

### P2 — Repertório é ponto de partida na educação musical
Para o professor de música, a pergunta inicial é "qual música vou usar?", não "qual objetivo vou alcançar?". Músicas sobem para o topo do formulário — são identidade da aula, não apêndice.
**Base:** Elliott (1995), Green (2008), Reimer (1970)

### P3 — Um campo, uma função. Sem duplicações.
Cada informação existe em um único lugar. Materiais duplicados, conceitos em dois lugares, dois tipos de tags confusos — tudo isso gera carga cognitiva sem valor pedagógico.
**Base:** Sweller (1988), Nielsen (1995)

### P4 — O formulário deve promover reflexão, não documentação
Campos vazios sem scaffolding não produzem reflexão — produzem blank stare ou planejamento performativo. Cada campo obriga a uma decisão pedagógica real. Se não obriga, ou tem template ou sai.
**Base:** Schön (1983), Vasconcellos (2000), Perrenoud (1999)

### P5 — Três camadas, não duas
Modo Rápido → Modo Profissional → Modo Documentação. A camada do meio (profissional) é a mais usada e estava ausente. O salto de "só título+roteiro" para "tudo" era abrupto demais.
**Base:** Nielsen (1995) — progressive disclosure em 3 camadas

### P6 — Avaliação é planejada antes, não preenchida depois
Avaliação é a segunda coisa a definir numa aula (o que observarei para saber se funcionou?), não a última. Campo reestruturado com 3 linhas orientadas, não um textarea vazio ao final.
**Base:** Wiliam (2011), Wiggins & McTighe (1998), Black & Wiliam (1998)

### P7 — Burocracia separada de planejamento
BNCC, status administrativo, tags globais e unidades didáticas são documentação — úteis, mas não planejamento. Ficam num bloco isolado, colapsado por padrão, chamado explicitamente "Documentação".
**Base:** Saviani (neotecnicismo), Tardif (2002), Vasconcellos (2000)

---

# PARTE 2 — NOVA ARQUITETURA DO FORMULÁRIO

---

## 2.1 Visão geral — 3 camadas

| Camada | Nome | Tempo de preenchimento | Para quem |
|--------|------|----------------------|-----------|
| 1 | **Modo Rápido** | 2–3 minutos | Professor experiente, aula rotineira |
| 2 | **Modo Profissional** | 10–15 minutos | Plano completo, reflexão pedagógica real |
| 3 | **Modo Documentação** | + 5–10 minutos | Registro formal, portfólio, escola exige |

---

## 2.2 Estrutura completa do formulário — Bloco a Bloco

---

### HEADER FIXO (sempre visível, todas as camadas)

**Objetivo:** Identidade mínima da aula — o que e quanto tempo.

| Campo | UI | Notas |
|-------|-----|-------|
| Título | Input texto | Placeholder: "Ex: Explorando pulsação — 2º ano" |
| Duração | Input numérico + selector (min/h) | Validado — alimenta o contador do roteiro |
| Botão de camada | Toggle 3 estados: ⚡ Rápido / 📋 Profissional / 📁 Documentação | Substitui o toggle binário atual |
| Favorito | Ícone toggle ☆/★ | Mantém |

---

### BLOCO A — Contexto (condicional, aparece sempre se houver dados)
**Camada:** Todas | **Estado padrão:** Colapsado (expandir sob demanda)

**Objetivo:** Conectar esta aula com a anterior. Implementa continuidade pedagógica.

| Campo | UI | Notas |
|-------|-----|-------|
| Resumo do último pós-aula | Readonly — já existe | Manter |
| O que funcionou / não funcionou | Readonly — já existe | Manter |
| Próxima aula sugerida no pós-aula | Readonly — já existe | Manter |
| **NOVO: "Como esta aula continua a anterior?"** | Input 1 linha | Placeholder: "Ex: Aprofundamos a pulsação trabalhada na semana passada" |

**Mudança:** Campo ativo de continuidade é novo. Força o professor a articular a conexão antes de planejar.

---

### BLOCO B — Músicas da Aula *(sobe do final para cá)*
**Camada:** Rápido + | **Estado padrão:** Aberto

**Objetivo:** Ponto de partida musical da aula. Repertório como identidade, não como apêndice.

| Campo | UI | Notas |
|-------|-----|-------|
| Músicas vinculadas ao plano | Cards com preview (já existe) | Sobe do final para cá |
| Picker de repertório | Input busca + dropdown (já existe) | Manter |
| Músicas detectadas via embed | Automático (já existe) | Manter |

**Mudança:** Posição. De seção fixa ao final → segundo bloco visível. Justificativa: P2 (Elliott).

---

### BLOCO C — Roteiro de Atividades *(seção principal — sem mudança de posição)*
**Camada:** Rápido + | **Estado padrão:** Aberto

**Objetivo:** O que professor e alunos farão na aula. Unidade central do planejamento.

#### Nível do bloco
| Campo | UI | Notas |
|-------|-----|-------|
| Botão "+ Atividade" | Ação | Manter |
| Botão "📐 Templates" | Ação | Manter |
| Botão "📚 Biblioteca" | Toggle painel | Manter |
| Contador de tempo + alerta | Computed (já existe) | Manter |

#### Por atividade (CardAtividadeRoteiro) — mudanças
| Campo | Mudança | UI | Notas |
|-------|---------|-----|-------|
| Nome da atividade | Manter | Input inline | — |
| Duração | **Validar como número** | Input numérico | Resolver falha do contador |
| **NOVO: Fase da atividade** | **Adicionar** | Select compacto | Aquecimento / Desenvolvimento / Prática guiada / Criação / Fechamento |
| Descrição | Manter | TipTap rich text | — |
| Músicas vinculadas | Manter | Chips | — |
| Estratégias vinculadas | Manter | Chips | — |
| Conceitos pedagógicos | Manter (IA detecta) | Chips | — |
| Tags | Manter | Chips | — |
| Menu ··· | Manter | Dropdown | — |

**Campo "Fase da atividade"** é a mudança mais impactante deste bloco. Com 5 opções, o professor estrutura a progressão interna da aula. O sistema pode alertar automaticamente se não houver "Fechamento" ou se todas forem "Desenvolvimento".

---

### BLOCO D — Objetivos
**Camada:** Profissional + | **Estado padrão:** Aberto (Modo Profissional), Colapsado (Modo Documentação)

**Objetivo:** Nomear a intenção pedagógica da aula após definir o que se fará.

| Campo | Mudança | UI | Notas |
|-------|---------|-----|-------|
| Objetivo da aula | **Reformular completamente** | Input 1 linha | Template: "Os alunos serão capazes de [verbo] [conteúdo musical]" |
| Objetivos específicos (lista) | **Reformular** | Lista dinâmica de inputs | Botão "+ Adicionar objetivo" — máximo 3 |
| Botão ✨ Gerar com IA | **Melhorar trigger** | Ação | Só ativa após roteiro preenchido — gera objetivos a partir das atividades |

**Decisão sobre Tyler vs. Elliott:** O formulário segue fluxo Elliott (roteiro primeiro, objetivos depois). O botão de IA implementa isso: gera objetivos a partir do que foi planejado no roteiro — não exige que o professor pense em objetivos antes de pensar em atividades.

---

### BLOCO E — Como Saberei Que Aprenderam *(substitui "Avaliação / Observações")*
**Camada:** Profissional + | **Estado padrão:** Colapsado

**Objetivo:** Planejar evidências de aprendizagem antes da aula — não preencher observações depois.

| Campo | UI | Notas |
|-------|-----|-------|
| "O que observarei nesta aula para saber se funcionou?" | Input 1–2 linhas | Placeholder: "Ex: Conseguem manter pulsação constante por 8 compassos" |
| "Qual pergunta farei no fechamento?" | Input 1 linha | Placeholder: "Ex: O que vocês percebem de diferente ao ouvir agora?" |
| "Se não funcionar, o que farei?" | Input 1 linha (opcional) | Placeholder: "Ex: Simplificar para 4 compassos, usar batida corporal" |

**Remove:** Textarea vazio "Avaliação / Observações".
**Substitui por:** 3 campos curtos e orientados — evidência planejada, pergunta de fechamento, contingência pedagógica.

---

### BLOCO F — Recursos e Materiais *(fusão de dois acordeons em um)*
**Camada:** Profissional + | **Estado padrão:** Colapsado

**Objetivo:** Tudo que o professor precisa preparar antes da aula — digital e físico no mesmo lugar.

| Campo | Mudança | UI | Notas |
|-------|---------|-----|-------|
| Links digitais (YouTube/Spotify/PDF) | Manter | Cards com preview | — |
| **Materiais físicos** | **Unificar aqui** | Lista com chips | Elimina accordion "Materiais" separado |

**Remove:** Accordion separado "Materiais" (campo `materiais: string[]`).
**Mantém:** `materiaisNecessarios` dentro deste bloco unificado.
**Resultado:** Uma informação, um lugar. Sem duplicação.

---

### BLOCO G — Adaptações por Turma
**Camada:** Profissional + | **Estado padrão:** Colapsado

**Objetivo:** Registrar como adaptar este plano para cada turma específica.

| Campo | Mudança | UI | Notas |
|-------|---------|-----|-------|
| Accordion por turma + textarea | Manter MVP | Accordion + textarea | — |
| `nivelRelativo` | **Expor na Fase 2** | Select: simplificado / igual / avançado | Campo já existe no tipo, sem UI |

---

### BLOCO H — Documentação *(renomear "Classificação Pedagógica")*
**Camada:** Documentação | **Estado padrão:** Sempre colapsado

**Objetivo:** Metadados para organização, busca e exigências institucionais. Separado explicitamente do planejamento.

| Campo | Mudança | UI | Notas |
|-------|---------|-----|-------|
| Status do plano | **Renomear opções** | Select: Rascunho / Pronto / Aplicado / Revisado | Mais descritivo que A Fazer / Em Andamento / Concluído |
| Conceitos musicais | Manter (confirmação do resultado da IA) | Chips | — |
| Unidades didáticas | **Renomear label** | Chips | "Projeto / Tema do Bimestre" em vez de "Unidades Didáticas" |
| Tags globais | Manter | Chips | — |
| BNCC | **Reformular UI** | Picker com busca | Substituir textarea por seletor de habilidades pesquisável por código ou palavra-chave |
| Botão ✨ Sugerir BNCC com IA | Manter como caminho principal | Ação | — |

---

## 2.3 O que sai completamente do formulário

| Campo / Elemento | Motivo |
|-----------------|--------|
| Accordion "Materiais" (separado) | Duplicado — absorvido pelo Bloco F |
| Textarea "Avaliação / Observações" (vazio) | Substituído pelo Bloco E estruturado |
| Campo `escola` no tipo Plano | Sem UI ativa, sem uso no plano individual |
| Campo `metodologia` no tipo Plano | Campo fantasma — nunca implementado |
| Objetivo Geral + Específicos como dois rich text editors | Substituídos por 1 linha + lista dinâmica |
| BNCC como textarea livre | Substituído por picker com busca |
| Label "Classificação Pedagógica" | Renomeado para "Documentação" |

---

## 2.4 Comparação visual — Antes e Depois

| Posição | ANTES | DEPOIS |
|---------|-------|--------|
| 1 | Título / Duração / Nível | **Header:** Título / Duração / Toggle camada |
| 2 | Contexto (condicional) | **Bloco A:** Contexto + campo continuidade |
| 3 | Roteiro de Atividades | **Bloco B:** Músicas da Aula *(subiu do final)* |
| 4 | Materiais | **Bloco C:** Roteiro *(com campo Fase por atividade)* |
| 5 | Objetivos | **Bloco D:** Objetivos *(template + lista dinâmica)* |
| 6 | Classificação Pedagógica | **Bloco E:** Como Saberei Que Aprenderam *(novo)* |
| 7 | BNCC | **Bloco F:** Recursos + Materiais *(fusão)* |
| 8 | Recursos da Aula | **Bloco G:** Adaptações por Turma |
| 9 | Avaliação / Observações | **Bloco H:** Documentação *(BNCC + meta)* |
| 10 | Músicas Vinculadas *(final)* | — *(subiu para Bloco B)* |
| 11 | Adaptações por Turma | — |

---

# PARTE 3 — MELHORIAS CAMPO A CAMPO

---

## 3.1 Campo: FASE DA ATIVIDADE (novo)

**O que é:** Select compacto dentro de cada CardAtividadeRoteiro.

**Opções:** Aquecimento · Desenvolvimento · Prática Guiada · Criação · Fechamento

**UI:** Dropdown ou botões pill pequenos no header do card, ao lado de nome e duração.

**Lógica automática sugerida:**
- Se o roteiro tem ≥ 3 atividades e nenhuma é "Fechamento" → alerta amarelo: "Sua aula não tem fechamento planejado"
- Se todas as atividades são "Desenvolvimento" → dica: "Considere adicionar aquecimento ou fechamento"
- Não bloqueia o professor — apenas informa

**Por quê:** Hunter (7 passos), Saviani (momentos didáticos), 5E model, Libâneo (estrutura da aula). Todos os frameworks exigem distinção de fases — o formulário atual trata todas as atividades como equivalentes.

---

## 3.2 Campo: OBJETIVO DA AULA (reformulado)

**Antes:** Dois rich text editors ("Objetivo Geral" + "Objetivos Específicos"), textareas com placeholder vago.

**Depois:**
```
Objetivo principal:
[ Os alunos serão capazes de _________________ ]
                   ↑ placeholder como template, não texto descritivo

+ Adicionar objetivo específico   (máximo 3 itens)
  [ ________________________________ ]
  [ ________________________________ ]
  [ ________________________________ ]
```

**Botão IA:** Só ativa quando o roteiro tem pelo menos 1 atividade preenchida. Texto do botão: "✨ Gerar a partir do roteiro" (não "Gerar com IA" genérico).

**Por quê:** Bloom (verbos de ação), Libâneo (objetivos como componente obrigatório). O template substitui a ansiedade da página em branco por uma âncora cognitiva. Limite de 3 objetivos: objetivos demais raramente são todos atingidos (Sweller — carga cognitiva do professor).

---

## 3.3 Campo: COMO SABEREI QUE APRENDERAM (novo — substitui textarea vazio)

**Antes:** Textarea vazio, última posição, zero scaffolding.

**Depois — 3 campos curtos:**
```
📊 O que observarei para saber se funcionou?
   [ Ex: Conseguem manter pulsação constante por 8 compassos     ]

❓ Qual pergunta farei no fechamento?
   [ Ex: O que vocês percebem de diferente ao ouvir agora?       ]

⚡ Se não funcionar, o que farei? (opcional)
   [ Ex: Simplificar para 4 compassos, usar batida corporal      ]
```

**Por quê:** Wiliam (2011) — evidência formativa deve ser planejada antes. Wiggins & McTighe — avaliação antes das atividades (backward design). Os 3 campos implementam: evidência observável + verificação oral + contingência pedagógica. Cada um é 1 linha — sem textarea longo que intimida.

---

## 3.4 Campo: BNCC (reformulado)

**Antes:** Textarea livre onde professor digita códigos de memória.

**Depois:** Picker com busca por código (EF15AR17) ou palavra-chave ("improviso", "leitura musical"). Resultado: chips selecionáveis.

**Caminho principal:** Botão "✨ Sugerir com IA" — gera sugestões a partir do roteiro e objetivos. Professor confirma ou rejeita cada chip.

**Posição:** Último bloco (Documentação), colapsado por padrão.

**Por quê:** Sweller — campo que exige conhecimento especializado externo gera carga extrínseca máxima. O professor não deve memorizar a BNCC para usar o app. A IA elimina essa fricção; o picker permite correção manual quando necessário.

---

## 3.5 Campo: CONTEXTO (melhorado)

**Antes:** Exibe o último pós-aula (readonly). Aparece condicionalmente.

**Depois:** Exibe o último pós-aula (readonly) + **1 campo novo ativo:**
```
"Como esta aula continua a anterior?"
[ Ex: Aprofundamos a pulsação trabalhada com a turma 5A semana passada ]
```

**Aparece sempre** (não só quando há dados) — com texto "Nenhum registro anterior ainda" quando vazio.

**Por quê:** Ausubel — ativar conhecimento prévio é o fator mais importante da aprendizagem. Gandin — diagnóstico é etapa do planejamento. Yinger — planejamento está sempre dentro de contexto maior. O campo de 1 linha força a articulação da continuidade antes de qualquer outro campo.

---

## 3.6 Campo: NÍVEL / FAIXA ETÁRIA (reformulado)

**Antes:** Campo único que mistura nível musical com faixa etária.

**Depois:** Dois campos distintos no Header:
- **Faixa etária:** dado demográfico fixo (Infantil / Fundamental I / Fundamental II / Médio / Adulto)
- **Nível musical para esta aula:** contextual à aula (Iniciando / Desenvolvendo / Consolidando / Expandindo)

**Por quê:** Vygotsky — ZDP é dinâmica e contextual. Um aluno de 10 anos pode estar "Consolidando" em rítmica e "Iniciando" em harmonia. Separar os dois conceitos permite planejamento mais preciso.

---

## 3.7 Campo: RECURSOS + MATERIAIS (fusão)

**Antes:** Dois campos separados — accordion "Materiais" (`materiais: string[]`) e "Materiais físicos" dentro de Recursos (`materiaisNecessarios`).

**Depois:** Um único bloco com duas sub-seções:
```
🔗 Links e recursos digitais
   [URL ___________] + detecção automática de tipo (já existe)

📦 O que preciso levar
   [ pandeiros × ] [ papel × ] [ ___________ + ]
```

**Migration:** `materiais` e `materiaisNecessarios` unificados em um único array. Dados existentes migrados automaticamente (union dos dois arrays, dedup).

---

# PARTE 4 — MELHORIAS DE UX E COGNIÇÃO

---

## 4.1 Progressive Disclosure — 3 camadas reais

**Problema atual:** Toggle binário "⚡ Rápido" colapsa da Camada 3 para a Camada 1, pulando a Camada 2 (a mais usada).

**Solução:**

| Modo | Campos visíveis | Blocos |
|------|----------------|--------|
| ⚡ **Rápido** | Título, Duração, Músicas, Roteiro (com Fase) | Header + B + C |
| 📋 **Profissional** | + Contexto, Objetivos, Avaliação, Recursos | Header + A + B + C + D + E + F + G |
| 📁 **Documentação** | + BNCC, Conceitos, Unidades, Tags | Tudo |

**Padrão ao criar novo plano:** Modo Profissional. O professor médio planeja no nível intermediário.

---

## 4.2 Redução de carga cognitiva — decisões concretas

**Carga intrínseca** (complexidade real do planejamento — não reduzível):
- Aceitar: planejar aula é complexo
- Estratégia: scaffolding via templates e placeholders orientadores

**Carga extrínseca** (gerada por design ruim — eliminar):

| Problema atual | Solução |
|----------------|---------|
| 35+ campos visíveis | 3 camadas: Rápido exibe ≤ 8 campos |
| Dois campos de materiais | 1 campo unificado |
| Placeholder vago "Descreva o objetivo..." | Template com verbo de ação |
| BNCC textarea livre | Picker com busca + IA |
| Textarea de avaliação vazio | 3 campos curtos estruturados |
| "Classificação Pedagógica" como label | Renomear para "Documentação" |
| Toggle binário Rápido/Completo | Toggle 3 estados |

**Carga germânica** (associada a construir esquemas pedagógicos — fomentar):
- Campo "Como esta aula continua a anterior?" → força reflexão de continuidade
- Campo "Como saberei que aprenderam?" → força reflexão avaliativa
- Fase por atividade → força reflexão sobre estrutura da aula

---

## 4.3 Defaults inteligentes

| Campo | Default sugerido |
|-------|-----------------|
| Duração | Última duração usada para esta turma |
| Nível musical | Último nível registrado para a turma |
| Fase da 1ª atividade | "Aquecimento" |
| Fase da última atividade | "Fechamento" |
| Músicas | Sugerir músicas do repertório mais usadas com esta turma |
| Modo de exibição | Modo Profissional (não Rápido) |

---

## 4.4 IA — uso estratégico, não decorativo

**Princípio:** IA deve reduzir trabalho mecânico, nunca substituir decisão pedagógica.

| Função de IA | Trigger certo | Problema a resolver |
|-------------|--------------|---------------------|
| Gerar objetivos | Após roteiro preenchido (≥1 atividade) | Professor novato em branco no campo |
| Detectar conceitos | Ao salvar o plano | Classificação manual demorada |
| Detectar músicas | Ao salvar o plano | Músicas embutidas no TipTap não registradas |
| Sugerir BNCC | Após objetivos + roteiro preenchidos | BNCC impossível de preencher manualmente |
| Alertar desequilíbrio | Ao adicionar atividades | Roteiro todo de "Desenvolvimento", sem fechamento |

**IA que NÃO deve existir:**
- IA que preenche campo automaticamente sem revisão do professor
- IA que bloqueia salvar enquanto "processa"
- IA como feature decorativa sem função real

---

## 4.5 Feedback visual e alertas pedagógicos

| Situação | Feedback | Tipo |
|----------|----------|------|
| Soma de durações > duração da aula | "Roteiro excede 10min a duração prevista" | ⚠️ Alerta amarelo (já existe) |
| Nenhuma atividade com fase "Fechamento" | "Sua aula não tem fechamento planejado" | 💡 Dica azul (novo) |
| Objetivos preenchidos mas roteiro vazio | "Adicione atividades para concretizar o objetivo" | 💡 Dica azul (novo) |
| Avaliação não preenchida no Modo Profissional | Badge discreto no accordion | 🔵 Indicador passivo (novo) |
| Roteiro salvo sem músicas (em aula de música) | "Esta aula não tem músicas vinculadas" | 💡 Dica azul (novo) |

---

# PARTE 5 — ROADMAP DE IMPLEMENTAÇÃO

---

## FASE 1 — Ajustes de alto impacto, baixa complexidade
*Implementável sem refatoração arquitetural. Mudanças cirúrgicas.*

---

### F1.1 — Mover Músicas para o Bloco 2 (subir do final)
**O que fazer:** Mover o componente `SecaoMusicasVinculadas` do final do formulário para logo após o Header.
**Impacto pedagógico:** Alto — implementa P2 (Elliott). Professores de música passam a ter seu ponto de partida natural no topo.
**Impacto UX:** Alto — formulário passa a ter identidade musical imediata.
**Dificuldade:** Baixa — mover JSX de posição, ajustar scroll refs.

### F1.2 — Fundir os dois campos de Materiais
**O que fazer:** Unificar `materiais` e `materiaisNecessarios` em um único campo no Bloco de Recursos. Migration: union dos dois arrays ao carregar o plano.
**Impacto pedagógico:** Médio — elimina confusão cognitiva real.
**Impacto UX:** Alto — remove campo duplicado que ninguém sabe qual usar.
**Dificuldade:** Baixa — mudança de tipo + UI.

### F1.3 — Substituir textarea de Avaliação pelos 3 campos estruturados
**O que fazer:** Substituir `<textarea>` único por 3 inputs de linha com placeholders orientadores. Armazenar como `avaliacaoObservacoes` com separador ou como 3 campos no tipo.
**Impacto pedagógico:** Muito alto — transforma o campo mais fraco do formulário em instrumento de reflexão real.
**Impacto UX:** Alto — professores vão preencher porque os campos dizem o que escrever.
**Dificuldade:** Baixa-Média — mudança de UI + ajuste no tipo Plano.

### F1.4 — Mover BNCC para o último accordion
**O que fazer:** Reposicionar accordion BNCC para após Avaliação. Renomear label do accordion para "Documentação Institucional".
**Impacto pedagógico:** Médio — remove campo burocrático do fluxo de planejamento.
**Impacto UX:** Médio — reduz sobrecarga no fluxo principal.
**Dificuldade:** Baixa — reordenação de JSX.

### F1.5 — Renomear "Classificação Pedagógica" para "Documentação"
**O que fazer:** Mudar label do accordion. Possivelmente agrupar BNCC aqui também.
**Impacto pedagógico:** Baixo direto, alto semântico — professor entende que esta seção é para o sistema, não para ele.
**Impacto UX:** Médio.
**Dificuldade:** Muito baixa.

### F1.6 — Adicionar campo "Como esta aula continua a anterior?" no Contexto
**O que fazer:** 1 input de linha no bloco de Contexto. Salvar em `Plano.continuidade?: string` (novo campo opcional).
**Impacto pedagógico:** Alto — força reflexão de continuidade antes do planejamento.
**Impacto UX:** Baixo (1 campo novo).
**Dificuldade:** Baixa.

---

## FASE 2 — Reestruturação média
*Requer ajustes em componentes. Impacto maior. 1–2 semanas de implementação.*

---

### F2.1 — Campo "Fase da Atividade" no CardAtividadeRoteiro
**O que fazer:** Adicionar select `tipoFase: 'aquecimento' | 'desenvolvimento' | 'pratica' | 'criacao' | 'fechamento'` ao tipo `AtividadeRoteiro`. UI: botões pill compactos no header do card. Alertas automáticos se sem "fechamento".
**Impacto pedagógico:** Muito alto — estrutura interna da aula emerge. Hunter, 5E, Saviani implementados.
**Impacto UX:** Alto — professor passa a ver a "forma" da aula.
**Dificuldade:** Média — novo campo no tipo, novo componente UI, lógica de alertas.

### F2.2 — Reformular campo Objetivos
**O que fazer:** Substituir RichTextEditor por input 1 linha com template + lista dinâmica de objetivos específicos (máximo 3). Atualizar `objetivosEspecificos: string[]` para ser editado como lista de inputs. Melhorar trigger do botão IA (só ativa com roteiro preenchido).
**Impacto pedagógico:** Alto — objetivos com template Bloom produzem mais qualidade que textarea livre.
**Impacto UX:** Alto — reduz ansiedade da página em branco.
**Dificuldade:** Média — refatoração do componente de objetivos.

### F2.3 — Toggle de 3 camadas (substituir toggle binário)
**O que fazer:** Substituir o toggle "⚡ Rápido / Completo" por um seletor de 3 estados. Definir quais blocos aparecem em cada camada. Padrão: Modo Profissional.
**Impacto pedagógico:** Médio — mais adequado ao espectro de professores (novato / experiente / burocracia).
**Impacto UX:** Muito alto — elimina o salto abrupto entre os dois extremos.
**Dificuldade:** Média — lógica de visibilidade de accordions por camada.

### F2.4 — Validar duração das atividades como número
**O que fazer:** Substituir input texto de duração por input numérico (ou com parse de formatos). Resolver falha silenciosa do contador quando professor digita "dez minutos".
**Impacto pedagógico:** Baixo direto, mas resolve bug real no contador de tempo.
**Impacto UX:** Médio.
**Dificuldade:** Baixa-Média.

### F2.5 — Separar Nível Musical de Faixa Etária
**O que fazer:** Dois campos distintos. Faixa etária: chips fixos no Header. Nível musical: select contextual por aula.
**Impacto pedagógico:** Médio — permite diagnóstico mais preciso.
**Impacto UX:** Médio.
**Dificuldade:** Média.

### F2.6 — Alertas pedagógicos automáticos
**O que fazer:** Lógica que verifica: (a) sem fechamento no roteiro, (b) sem músicas em aula de música, (c) objetivos preenchidos mas roteiro vazio, (d) avaliação não preenchida no Modo Profissional.
**Impacto pedagógico:** Alto — sistema "pensa junto" com o professor.
**Impacto UX:** Médio — desde que os alertas sejam sugestões, não bloqueios.
**Dificuldade:** Média — lógica computada sobre o estado do plano.

---

## FASE 3 — Evolução avançada
*Features diferenciadoras. Requerem desenvolvimento mais longo ou integrações novas.*

---

### F3.1 — BNCC com picker e busca
**O que fazer:** Criar base de dados das habilidades BNCC de Arte/Música (EF01AR–EF09AR). Interface de busca por código ou palavra-chave. IA como caminho principal, picker como alternativa manual.
**Impacto pedagógico:** Alto — remove a principal barreira burocrática do formulário.
**Impacto UX:** Muito alto — campo que hoje é abandonado passa a ser utilizável.
**Dificuldade:** Alta — base de dados, componente de busca, integração com IA.

### F3.2 — "Diagnóstico da Turma" como campo persistente
**O que fazer:** Campo associado à turma (não ao plano): "Onde esta turma está em relação a [conceito X]?". Atualizado após cada pós-aula. Exibido no Bloco de Contexto.
**Impacto pedagógico:** Muito alto — implementa ZDP vygotskiana na prática. O professor passa a ter diagnóstico real antes de planejar.
**Impacto UX:** Alto — contextualiza cada plano com a realidade da turma.
**Dificuldade:** Alta — novo dado no tipo Turma, nova UI, integração com pós-aula.

### F3.3 — Dimensão CLASP por atividade (opcional)
**O que fazer:** Campo opcional por atividade: [Composição | Literatura | Audição | Habilidades | Performance] — espiral Swanwick.
**Impacto pedagógico:** Alto — permite ao professor verificar equilíbrio de dimensões musicais na aula.
**Impacto UX:** Médio — campo extra por atividade, mas opcional.
**Dificuldade:** Média.

### F3.4 — "Fase de responsabilidade" por atividade (GRR)
**O que fazer:** Campo opcional por atividade: [Professor modela | Juntos | Alunos independentes] — gradual release of responsibility.
**Impacto pedagógico:** Alto — diagnostica automaticamente se o professor está transferindo responsabilidade ou dominando toda a aula.
**Impacto UX:** Médio.
**Dificuldade:** Média.

### F3.5 — Relatório pedagógico da aula / da turma
**O que fazer:** Análise automática dos conceitos, fases e músicas trabalhadas. Gráfico de equilíbrio: muito Ritmo, pouca Criação. Histórico por turma ao longo do ano.
**Impacto pedagógico:** Muito alto — professor passa a ter dados reais sobre sua prática.
**Impacto UX:** Alto — transforma dados de planejamento em inteligência pedagógica.
**Dificuldade:** Alta — análise de dados, visualização, componentes novos.

---

## 5.1 Tabela-resumo do roadmap

| # | Mudança | Fase | Impacto Ped. | Impacto UX | Dificuldade |
|---|---------|------|-------------|-----------|-------------|
| F1.1 | Mover Músicas para topo | 1 | ★★★★★ | ★★★★☆ | ★☆☆☆☆ |
| F1.2 | Fundir Materiais | 1 | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ |
| F1.3 | Substituir textarea Avaliação | 1 | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| F1.4 | Mover BNCC para o final | 1 | ★★★☆☆ | ★★★☆☆ | ★☆☆☆☆ |
| F1.5 | Renomear "Documentação" | 1 | ★★☆☆☆ | ★★★☆☆ | ★☆☆☆☆ |
| F1.6 | Campo continuidade | 1 | ★★★★☆ | ★★☆☆☆ | ★☆☆☆☆ |
| F2.1 | Fase da atividade | 2 | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| F2.2 | Reformular Objetivos | 2 | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| F2.3 | Toggle 3 camadas | 2 | ★★★☆☆ | ★★★★★ | ★★★☆☆ |
| F2.4 | Validar duração | 2 | ★★☆☆☆ | ★★★☆☆ | ★★☆☆☆ |
| F2.5 | Separar Nível/Faixa etária | 2 | ★★★☆☆ | ★★★☆☆ | ★★★☆☆ |
| F2.6 | Alertas pedagógicos | 2 | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| F3.1 | BNCC picker | 3 | ★★★★☆ | ★★★★★ | ★★★★☆ |
| F3.2 | Diagnóstico da turma | 3 | ★★★★★ | ★★★★☆ | ★★★★☆ |
| F3.3 | CLASP por atividade | 3 | ★★★★☆ | ★★★☆☆ | ★★★☆☆ |
| F3.4 | Fase de responsabilidade (GRR) | 3 | ★★★★☆ | ★★★☆☆ | ★★★☆☆ |
| F3.5 | Relatório pedagógico | 3 | ★★★★★ | ★★★★★ | ★★★★★ |

---

## 5.2 Por onde começar amanhã

Se pudesse implementar apenas 3 mudanças esta semana:

1. **Mover Músicas para o topo** — 1 hora de trabalho, máximo impacto pedagógico e visual
2. **Substituir textarea Avaliação por 3 campos estruturados** — 2–3 horas, transforma o campo mais fraco em um dos mais fortes
3. **Campo Fase da Atividade** — 1 dia, estrutura toda a lógica interna da aula

Essas 3 mudanças sozinhas já tornam o formulário substancialmente mais sólido pedagogicamente — sem reescrever a arquitetura.

---

*Plano gerado em 2026-03-18. Arquivo: PLANO-MELHORIAS-NOVA-AULA.md*
*Baseado em: AUDITORIA-NOVA-AULA-CONSOLIDADA.md*
