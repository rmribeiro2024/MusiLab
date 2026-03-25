# MusiLab — Estado Atual do Projeto
**Atualizado em: 2026-03-15 (sessão atual)**

---

## ✅ O QUE JÁ ESTÁ FEITO

### Design System v2 — todos os módulos ✅
| Módulo | Commit | Status |
|--------|--------|--------|
| `TelaPrincipal.tsx` (Planos) | `cfa0c8a` | ✅ Referência |
| `ModuloAnoLetivo.tsx` | `c0b46db` | ✅ |
| `ModuloAtividades.tsx` | `c0b46db` | ✅ |
| `ModuloRepertorio.tsx` | `f11a969` | ✅ |
| `ModuloRelatorios.tsx` | `9a48c1b` | ✅ |
| `ModuloSequencias.tsx` | `9a48c1b` | ✅ |
| `TelaCalendario.tsx` | `9a48c1b` | ✅ |
| `ModuloEstrategias.tsx` | `a5987d7` | ✅ (concluído nesta sessão) |

**Tokens v2:**
| Token | Valor |
|-------|-------|
| Accent | `#5B5FEA` (hover: `#4f53d4`) · dark: `#818cf8` |
| Borda light | `border-[#E6EAF0]` |
| Borda dark | `dark:border-[#374151]` |
| Card bg | classe `v2-card` |
| Input bg dark | `dark:bg-[#111827]` |
| Texto dark primário | `dark:text-[#E5E7EB]` |
| Texto dark secundário | `dark:text-[#9CA3AF]` |
| Barra topo | `h-[3px] bg-[#5B5FEA]/30` (gradiente removido) |

---

### Arquitetura de Navegação — já implementada ✅

**Nav principal (`BancoPlanos.tsx` — `NAV_GROUPS`):**
```
Agenda | Planejamento | Turmas | Biblioteca | Relatórios | Configurações
```

**Sub-itens por grupo (estado atual):**
| Grupo | Sub-itens (viewMode) |
|-------|-----------|
| Agenda | Hoje (`resumoDia`) · Semana (`agendaSemanal`) · Calendário (`calendario`) |
| Planejamento | Planos (`lista`) · Nova Aula · Sequências (`sequencias`) |
| Turmas | Painel da Turma (`turmas`) · Histórico (`historicoMusical`) · Encaminhamentos |
| Biblioteca | Repertório (`repertorio`) · Atividades (`atividades`) · Estratégias (`estrategias`) |
| Relatórios | Relatórios (`relatorios`) |
| Configurações | Estrutura Escolar (`anoLetivo`) · Grade Semanal · Backup |

**Sidebar lateral (`ModuleSidebar.tsx`) — já implementada ✅**
- Componente: `src/components/ModuleSidebar.tsx`
- Sidebar fixa lateral, conteúdo rola independente
- Colapsável no desktop (estado no localStorage)
- Mobile: drawer deslizante com botão ☰
- Grupos com 1 sub-item ficam sem sidebar (ex: Relatórios)

**`AgendaSemanal.tsx` — já implementado ✅**
- Fica em: Agenda → Semana
- Grid SEG→SEX com turmas, blocos de aula, status
- Vincula planos a slots, registra pós-aula, filtro por escola
- Usa: `CalendarioContext` + `AnoLetivoContext` + `AplicacoesContext` + `PlanosContext`
- **Importante:** este componente é foco em *registro/execução* (o que aconteceu)
- A "Visão da Semana" em Planejamento tem foco diferente: *preparação* (o que preciso preparar)

---

## ⏳ O QUE FALTA — Nova Arquitetura de Planejamento

### Etapa 4 — Visão da Semana no Planejamento *(próxima)*

**Decisão de design a tomar antes de implementar:**

**Opção A — Reaproveitar `AgendaSemanal`** como sub-aba em Planejamento também
- Vantagem: zero código novo
- Desvantagem: mistura planejamento (preparação futura) com agenda (registro do passado)
- Como fazer: adicionar `{ label: 'Semana', mode: 'agendaSemanal', ... }` no grupo Planejamento

**Opção B — Criar `VisaoSemana.tsx` simplificado e focado em preparação** *(recomendado)*
- Mostra turmas da semana com foco em: "o que preciso preparar?"
- Status por bloco: `Planejado` / `Sem plano`
- Mais simples que `AgendaSemanal` — sem registro pós-aula, sem histórico
- Arquivo: `src/components/VisaoSemana.tsx`
- Dados necessários: `gradesSemanas` (grade de horários) + `anosLetivos` (turmas) + `planos` (status)
- Risco: baixo (só leitura)

**Layout conceitual da Opção B:**
```
← 10–14 mar 2026  →

SEG 10      TER 11      QUA 12      QUI 13      SEX 14
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1ºA        [2ºB        [1ºA        [3ºC        [2ºB
 Planejado] Sem plano]  Planejado]  Sem plano]  Sem plano]
            [3ºC
             Sem plano]
```

**Onde adicionar no nav (`BancoPlanos.tsx`):**
```ts
// No grupo 'planejamento', adicionar como primeiro item:
{ label: 'Visão da Semana', short: 'Semana', icon: '📅',
  mode: 'visaoSemana', action: () => setViewMode('visaoSemana') }
```
E adicionar `{viewMode === 'visaoSemana' && <VisaoSemana />}` no render.

---

### Etapa 5 — Status binário nos blocos
Cada bloco mostra:
- `Planejado` — existe plano com `data` coincidente com o dia do bloco E `turma` coincidente
- `Sem plano` — ausência de vínculo

Cruza `plano.data` (campo já existe) + nome/id de turma nos planos.
**Risco:** baixo (leitura de dados existentes, sem modelo novo)

---

### Etapa 6 — Blocos clicáveis
- Clicar em `Planejado` → abre o plano vinculado (`setPlanoSelecionado`)
- Clicar em `Sem plano` → navega para Planejamento → Nova Aula, com turma+data pré-preenchidos

**Risco:** baixo

---

### *(pausa para avaliar resultados antes de continuar)*

### Etapa 7 — Vínculo formal plano ↔ turma ↔ data
Campos opcionais novos no tipo `Plano`: `turmaId?: string` e `dataAula?: string`.
Torna o status da Etapa 5 explícito em vez de inferido.
**Risco:** médio (mudança de modelo, mas opcional — não quebra planos existentes)

### Etapa 8 — Status "Revisar" e "Continuar"
Flag opcional no registro pós-aula → aparece na Visão da Semana na semana seguinte.
**Risco:** médio

### Etapa 9 — Insights pedagógicos
Área abaixo do grid: "X turmas sem plano esta semana", "Y aulas para revisar".
**Risco:** baixo

### Etapa 10 — Turmas: foco em acompanhamento pedagógico
Progresso por parâmetro musical, descritores alcançados, histórico por turma.
**Risco:** médio-alto (maior escopo)

---

## Pendências técnicas (baixa prioridade)

| Tarefa | Risco | Notas |
|--------|-------|-------|
| **S6** — Migrar IDs `string\|number` → `string` only | Alto | Sessão dedicada com testes |
| **P4** — Context splitting de `PlanosContext` | Médio | Separar CRUD / Filters / UI |
| Virtualização de listas (`react-window`) | Baixo | Quando >150 planos/músicas |

---

## Estado atual do repositório

```
Branch: main
Último commit: a5987d7 — refactor(ui): aplicar design system v2 em Estratégias
Build: ✅ limpo
TypeScript: ✅ 0 erros
Arquivos não commitados: apenas arquivos de preview HTML e docs (não precisam ir para o git)
```

## Próximo passo

**Etapa 4** — Decidir entre Opção A (reaproveitar AgendaSemanal) ou Opção B (VisaoSemana.tsx novo).
Após decisão: adicionar sub-aba em Planejamento e implementar o componente escolhido.
