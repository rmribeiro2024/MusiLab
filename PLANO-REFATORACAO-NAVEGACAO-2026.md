# Plano de Refatoração de Navegação — MusiLab 2026

> **Criado em:** 2026-03-25
> **Status:** ✅ CONCLUÍDO (2026-03-25)
> **Objetivo:** Reestruturar a navegação do app para eliminar redundâncias, clarificar o fluxo mental do professor e reduzir o número de módulos desnecessários.

---

## 1. CONTEXTO E MOTIVAÇÃO

### O problema original
A navegação atual do MusiLab cresceu organicamente e acumulou problemas sérios:

- **Módulos duplicados:** "Agenda → Semana" e "Planejamento → Visão da Semana" mostravam basicamente a mesma coisa em lugares diferentes
- **Módulos inacessíveis:** `AgendaSemanal.tsx` (~15k linhas) e `TelaCalendario.tsx` (1.304 linhas) existem no código mas não têm entrada de navegação — são código morto do ponto de vista do usuário
- **Criação fragmentada:** "Nova Aula" e "Aula por Turma" eram dois pontos de entrada separados para a mesma ação mental do professor ("vou planejar uma aula")
- **Pós-aula isolado:** O registro pós-aula era um módulo separado, quando conceitualmente é uma continuação do "Hoje"
- **Planejamento inchado:** 5 itens no grupo Planejamento para 3 necessidades distintas
- **"Aula por Turma" mal posicionado:** Era planejamento específico de turma, não um filtro

### A regra central descoberta na análise
> **"Criação não é um lugar — é uma ação dentro de um contexto."**

E como corolário:
> **"História grande demais para inline — acessível a partir do contexto, não como destino autônomo."**

---

## 2. ESTADO ATUAL DA NAVEGAÇÃO (antes da refatoração)

### Arquivo-chave: `src/components/BancoPlanos.tsx`
- Linhas 759–767: `VIEWMODE_TO_GROUP` — mapeamento de viewMode para grupo
- Linhas 773–827: `NAV_GROUPS` — definição completa da navegação

### Grupos e itens atuais:

```
posAula
  ├── Registro        (mode: 'posAula')
  └── Histórico       (mode: 'posAulaHistorico')

agenda
  └── Agenda          (mode: 'agenda')  ← AgendaView.tsx com 3 tabs: Hoje/Semana/Mês

planejamento
  ├── Visão da Semana  (mode: 'visaoSemana')
  ├── Banco de Aulas   (mode: 'lista')
  ├── Nova Aula        (mode: 'nova')        ← accent:true, chama novoPlano()
  ├── Aula por Turma   (mode: 'porTurmas')
  └── Sequência de Aulas (mode: 'sequencias')

turmas
  ├── Painel da Turma  (mode: 'turmas')
  ├── Histórico        (mode: 'historicoMusical')
  └── Encaminhamentos  (mode: 'continuidade_enc') ← FAKE: redireciona para historicoMusical

biblioteca
  ├── Repertório       (mode: 'repertorio')
  ├── Atividades       (mode: 'atividades')
  └── Estratégias      (mode: 'estrategias')

relatorios
  └── Relatórios       (mode: 'relatorios')

configuracoes
  ├── Estrutura Escolar (mode: 'anoLetivo')
  ├── Grade Semanal    (mode: 'modal_grade')
  └── Backup           (mode: 'modal_config')
```

### ViewModes órfãos (existem no código mas sem entrada de nav):
- `agendaSemanal` → `AgendaSemanal.tsx` (~15k linhas, inacessível)
- `calendario` → `TelaCalendario.tsx` (1.304 linhas, inacessível)
- `resumoDia` → referenciado no VIEWMODE_TO_GROUP mas sem nav

---

## 3. NOVA ESTRUTURA ALVO

### Estrutura de navegação final:

```
HOJE (tela principal / home screen)
│   └── Cards das turmas do dia
│         ├── Editar roteiro inline
│         ├── [Registrar pós-aula] ← ação do card, não módulo separado
│         └── Materiais do dia

PLANEJAMENTO
│   ├── Semana / Mês (toggle)
│   │     └── slot clicado →
│   │           ├── [resumo última aula + Ver histórico completo →]
│   │           ├── Do zero
│   │           ├── Adaptar da anterior
│   │           └── Buscar no Banco
│   │
│   ├── Banco de Aulas
│   │     └── [+ Nova aula] — CTA proeminente (criação genérica sem contexto de turma)
│   │
│   └── Sequências
│         └── [+ Nova sequência]

TURMAS
│   ├── Painel da Turma (ModuloPlanejamentoTurma)
│   └── Histórico — absorve histórico de registros pós-aula

BIBLIOTECA
│   ├── Repertório
│   ├── Atividades
│   └── Estratégias

RELATÓRIOS
└── Relatórios

CONFIGURAÇÕES
│   ├── Estrutura Escolar
│   ├── Grade Semanal
│   └── Backup
```

### O que foi eliminado e por quê:

| Item eliminado | Motivo | Absorvido por |
|---|---|---|
| Grupo "Pós-aula" | Registro é continuação do dia, não módulo separado | Ação nos cards de Hoje |
| Agenda → tab Semana | Duplicava Planejamento → Semana | Planejamento → Semana |
| Agenda → tab Mês | Placeholder sem implementação real | Toggle em Planejamento → Semana |
| Módulo "Agenda" como grupo | Hoje vira tela principal standalone | Hoje (home) |
| Nav item "Nova Aula" | Criação não é lugar | "+ Nova aula" CTA no Banco |
| Nav item "Aula por Turma" | Era contexto/filtro, não destino autônomo | Slot da Semana + Turmas |
| Nav fake "Encaminhamentos" | Só redirecionava para Histórico | Removido |
| Mês como tab separada | Toggle suficiente | Toggle dentro de Semana |

---

## 4. FLUXOS CRÍTICOS — COMO FUNCIONAM NA NOVA ARQUITETURA

### 4.1 Professor chega e quer ver o que tem hoje
1. Abre o app → Hoje (home screen)
2. Vê cards com turmas do dia
3. Clica no card → expande com roteiro, materiais, ações

### 4.2 Professor quer registrar o que aconteceu na aula
1. Está em Hoje → clica no card da turma
2. Botão "Registrar pós-aula" inline no card
3. Preenche o registro sem sair do contexto de "Hoje"

### 4.3 Professor quer planejar a próxima semana
1. Vai para Planejamento → Semana
2. Vê a grade seg–sex com turmas
3. Clica num slot vazio (ou com plano existente)
4. Drawer abre com: resumo última aula + opções de criação
5. Escolhe: Do zero | Adaptar da anterior | Buscar no Banco

### 4.4 Professor quer reutilizar uma aula que deu certo
1. Opção A: Semana → slot → "Buscar no Banco"
2. Opção B: vai direto para Banco de Aulas → busca → aplica

### 4.5 Professor quer criar uma aula base para reutilização futura
1. Vai para Planejamento → Banco de Aulas
2. Clica em "+ Nova aula"
3. Preenche o formulário (sem contexto de turma)

### 4.6 Professor quer ver o histórico detalhado de uma turma
1. Opção A: Planejamento → Semana → slot da turma → "Ver histórico completo →"
2. Opção B: Turmas → seleciona turma → vê histórico

### 4.7 Professor quer ver o mês todo
1. Planejamento → toggle "Mês" (ao lado de "Semana")
2. Conecta com TelaCalendario.tsx (já existe, só inacessível)

---

## 5. ARQUIVOS PRINCIPAIS ENVOLVIDOS

| Arquivo | O que é | Impacto na refatoração |
|---|---|---|
| `src/components/BancoPlanos.tsx` | App shell + navegação (NAV_GROUPS) | Alto — toda mudança de nav acontece aqui |
| `src/components/AgendaView.tsx` | Tabs Hoje/Semana/Mês (747 linhas) | Tab Hoje vira home; Semana é removida; Mês conecta toggle |
| `src/components/VisaoSemana.tsx` | Grade semanal com InlineCardDrawer (946 linhas) | Recebe picker de criação e contexto histórico |
| `src/components/TelaPosAula.tsx` | Módulo registro pós-aula | Dissolve — funcionalidade move para Hoje |
| `src/components/TelaPosAulaHistorico.tsx` | Histórico de registros | Move para Turmas |
| `src/components/ModuloPorTurmas.tsx` | "Aula por Turma" (998 linhas) | Nav item removido; histórico acessível via Semana |
| `src/components/TelaCalendario.tsx` | Calendário mensal (1.304 linhas) | Conectar ao toggle de Mês em Semana |
| `src/components/AgendaSemanal.tsx` | Grade semanal legada (~15k linhas) | Avaliar se pode ser removida com segurança |
| `src/components/TelaPrincipal.tsx` | Formulário Nova Aula | "+ Nova aula" CTA passa a abrir este componente |

---

## 6. PLANO DE TRANSFORMAÇÃO — ETAPAS

> ⚠️ **REGRA FUNDAMENTAL:** Uma etapa por vez. Testar no navegador antes de prosseguir. Nunca quebrar funcionalidade existente.

> 🔒 **PRINCÍPIO:** Cada etapa é atômica — se algo der errado, só precisa reverter aquela etapa.

---

### FASE 1 — Limpeza de navegação (sem tocar em componentes)

- [ ] **Etapa 1.1** — Remover item fake "Encaminhamentos" do grupo Turmas em `NAV_GROUPS`
  - Risco: zero (só remove item de menu que redirecionava para outro lugar)
  - Arquivo: `BancoPlanos.tsx` linha ~802

- [ ] **Etapa 1.2** — Renomear "Visão da Semana" → "Semana" no nav
  - Risco: zero (só label visual)
  - Arquivo: `BancoPlanos.tsx` linha ~790

- [ ] **Etapa 1.3** — Adicionar "Hoje" como item standalone antes de todos os grupos (ou como primeiro grupo com 1 item)
  - Risco: baixo — `viewMode: 'agenda'` já existe, só reorganiza onde aparece
  - Arquivo: `BancoPlanos.tsx` — adicionar grupo 'hoje' com defaultMode: 'agenda'
  - Atualizar `VIEWMODE_TO_GROUP` para mapear 'agenda' → 'hoje'

---

### FASE 2 — Hoje como tela principal

- [ ] **Etapa 2.1** — Mudar viewMode inicial de `'agenda'` para `'agenda'` (já é, confirmar)
  - Verificar linha onde `viewMode` é inicializado em `BancoPlanos.tsx`
  - Confirmar que ao abrir o app a tab "Hoje" da AgendaView aparece por padrão

- [ ] **Etapa 2.2** — AgendaView: fazer a tab "Hoje" ser a ativa por padrão
  - Verificar se AgendaView já abre em "Hoje" ou em outra tab
  - Arquivo: `AgendaView.tsx`

---

### FASE 3 — Simplificar Planejamento (só remover nav items)

- [ ] **Etapa 3.1** — Remover "Nova Aula" do nav (item com `mode: 'nova'`)
  - Ainda mantém o componente funcionando — só remove a entrada de nav
  - Risco: baixo, mas verificar se algum código faz `setViewMode('nova')` de outras formas
  - Grep: `setViewMode('nova')` e `setViewMode("nova")` no projeto inteiro

- [ ] **Etapa 3.2** — Adicionar botão "+ Nova aula" dentro do Banco de Aulas
  - Arquivo: `TelaPrincipal.tsx` (componente do Banco)
  - Botão proeminente no header do Banco que chama a mesma função `novoPlano()` + `setViewMode('lista')`
  - Risco: baixo — reusa lógica existente

- [ ] **Etapa 3.3** — Remover "Aula por Turma" do nav (item com `mode: 'porTurmas'`)
  - Manter o componente `ModuloPorTurmas.tsx` intacto
  - Verificar se algum código externo faz `setViewMode('porTurmas')`
  - Grep: `setViewMode('porTurmas')` e `setViewMode("porTurmas")`
  - Risco: médio — verificar todos os pontos de entrada antes de remover

---

### FASE 4 — Toggle Semana/Mês no Planejamento

- [ ] **Etapa 4.1** — Adicionar toggle "Semana | Mês" no header de VisaoSemana
  - Quando "Mês" clicado: renderizar TelaCalendario.tsx inline (ou setViewMode temporário)
  - Risco: médio — TelaCalendario.tsx existe mas nunca foi testado em produção recente
  - Testar TelaCalendario isoladamente primeiro antes de conectar

- [ ] **Etapa 4.2** — Remover tab "Semana" de AgendaView (já coberta por VisaoSemana)
  - Arquivo: `AgendaView.tsx`
  - Risco: baixo após Etapa 4.1 confirmada

- [ ] **Etapa 4.3** — Remover tab "Mês" de AgendaView (já coberta pelo toggle)
  - Arquivo: `AgendaView.tsx`
  - Risco: baixo após Etapa 4.1 confirmada

---

### FASE 5 — Picker de criação no slot da Semana

- [ ] **Etapa 5.1** — No InlineCardDrawer de VisaoSemana: adicionar cabeçalho com resumo da última aula
  - Extrair últimos dados de `PlanejamentoTurmaContext` / `AplicacoesContext` para a turma do slot
  - Mostrar: tema, data, nota resumida (máx. 2 linhas)
  - Link "Ver histórico completo →" que abre ModuloPorTurmas filtrado para aquela turma
  - Risco: médio — não altera fluxo existente, só adiciona contexto visual

- [ ] **Etapa 5.2** — Para slots vazios: adicionar picker "Como planejar?"
  - Opções: Do zero | Adaptar da anterior | Buscar no Banco
  - "Do zero" → abre formulário normal (fluxo existente)
  - "Adaptar da anterior" → abre formulário pré-preenchido com última aula da turma
  - "Buscar no Banco" → abre BancoPicker (já existe em outras partes do app)
  - Risco: alto — nova UX, testar extensivamente

---

### FASE 6 — Pós-aula dissolve para Hoje (fase mais complexa)

- [ ] **Etapa 6.1** — Mapear o que TelaPosAula.tsx faz que AgendaView não faz ainda
  - Ler TelaPosAula.tsx e comparar com funcionalidades já em AgendaView → tab Hoje
  - Identificar gap de funcionalidade antes de qualquer mudança

- [ ] **Etapa 6.2** — Adicionar botão "Registrar pós-aula" nos cards de Hoje em AgendaView
  - Abre o mesmo modal/formulário que TelaPosAula usa hoje
  - Risco: médio — reusa componente existente em novo contexto

- [ ] **Etapa 6.3** — Testar fluxo completo: abrir app → Hoje → card → registrar → salvar → verificar que dado aparece no histórico
  - Só avançar para 6.4 se 6.3 funcionar perfeitamente

- [ ] **Etapa 6.4** — Remover grupo "Pós-aula" do NAV_GROUPS
  - Manter os componentes TelaPosAula.tsx e TelaPosAulaHistorico.tsx intactos por enquanto
  - Só remove a entrada de nav
  - Risco: baixo após 6.3 validado

---

### FASE 7 — Histórico de pós-aula vai para Turmas

- [ ] **Etapa 7.1** — Adicionar link/botão "Ver histórico de registros" no ModuloPlanejamentoTurma
  - Renderiza TelaPosAulaHistorico filtrado para a turma selecionada
  - Risco: médio

- [ ] **Etapa 7.2** — Remover "Histórico" do grupo Pós-aula no nav (se ainda existir após 6.4)
  - Verificar que Turmas oferece acesso equivalente

---

### FASE 8 — Limpeza final

- [ ] **Etapa 8.1** — Avaliar AgendaSemanal.tsx (~15k linhas): ainda é usado? Pode ser removido?
  - Grep: `AgendaSemanal` em todo o projeto
  - Se não renderizado em nenhum lugar: deletar o arquivo

- [ ] **Etapa 8.2** — Remover viewModes órfãos de VIEWMODE_TO_GROUP se não forem mais usados
  - `agendaSemanal`, `resumoDia` — verificar se ainda há referências

- [ ] **Etapa 8.3** — Revisar VIEWMODE_TO_GROUP para refletir nova estrutura

- [ ] **Etapa 8.4** — Remover o grupo 'agenda' antigo do VIEWMODE_TO_GROUP (substituído por 'hoje')

---

## 7. PRINCÍPIOS DE SEGURANÇA DURANTE A REFATORAÇÃO

1. **Uma etapa por commit** — cada etapa vira um commit independente com mensagem clara
2. **Grep antes de remover** — qualquer `mode`, `viewMode` ou `setViewMode` a ser removido deve ser buscado no projeto inteiro antes
3. **Manter componentes** — remover apenas entradas de nav primeiro; os componentes `.tsx` ficam intactos até a fase de limpeza
4. **Testar no browser** a cada etapa antes de commitar
5. **Não tocar em contextos** (CalendarioContext, AplicacoesContext, etc.) — refatoração é apenas de navegação e UI
6. **Fases 1–3 são seguras** — só mudanças de nav, risco muito baixo
7. **Fases 4–7 requerem testes** — mexem em componentes reais

---

## 8. ESTADO DE PROGRESSO

```
Fase 1 — Limpeza nav:         [x] 1.1  [x] 1.2  [x] 1.3
Fase 2 — Hoje como home:      [x] 2.1  [x] 2.2
Fase 3 — Simplificar Planos:  [x] 3.1  [x] 3.2  [x] 3.3
Fase 4 — Toggle Semana/Mês:   [x] 4.1  [x] 4.2  [x] 4.3
  ⚠️  DÍVIDA TÉCNICA: Vista "Mês" usa TelaCalendario.tsx (componente abandonado).
      Problemas: toggle interno duplicado + design inconsistente com o app atual.
      Precisa ser RECONSTRUÍDA do zero com design system v2.
      Por ora funciona como placeholder — prioridade futura antes do deploy.
Fase 5 — Picker de criação:   [x] 5.1  [x] 5.2
Fase 6 — Pós-aula → Hoje:     [x] 6.1  [x] 6.2  [x] 6.3  [x] 6.4
Fase 7 — Histórico → Turmas:  [x] 7.1  [x] 7.2
Fase 8 — Limpeza final:       [x] 8.1  [x] 8.2  [x] 8.3  [x] 8.4

✅ REFATORAÇÃO COMPLETA — 2026-03-25
```

---

*Documento de referência para continuidade entre sessões. Atualizar checkboxes à medida que etapas forem concluídas.*
