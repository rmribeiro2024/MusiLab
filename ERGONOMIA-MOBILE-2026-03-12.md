# Ergonomia Mobile — MusiLab
**Data:** 2026-03-12
**Contexto:** Professor usando com uma mão, entre aulas, possivelmente andando.
**Critério mínimo tap target:** 44×44px (Apple HIG / Google Material).

---

## Status Geral

| # | Problema | Severidade | Arquivo(s) | Status |
|---|----------|-----------|------------|--------|
| A | Botões de reordenação do roteiro: 24px, gap 2px | 🔴 Crítico | TelaPrincipal.tsx:546 | ✅ `b4797bf` |
| B | Bottom nav labels em `text-[10px]` (ilegível em movimento) | 🔴 Crítico | BancoPlanos.tsx:2763 | ✅ `b4797bf` |
| C | Botões ✏️/🗑️ atividades: 32×24px, gap 6px | 🔴 Crítico | ModuloAtividades.tsx:462 | ✅ `b4797bf` |
| D | Formulário de plano: scroll excessivo com seções abertas | 🟠 Médio | TelaPrincipal.tsx:415–650 | ⬜ pendente |
| E | Botões Editar/Excluir repertório sem separação visual | 🟠 Médio | ModuloRepertorio.tsx:467 | ⬜ pendente |
| F | Campo "Duração" sem `inputMode="numeric"` | 🟠 Médio | TelaPrincipal.tsx:418 | ⬜ pendente |
| G | Quick options pós-aula: padding 3px×8px, fontSize 10 | 🟠 Médio | ModalRegistroPosAula.tsx:24 | ⬜ pendente |
| H | Botões Excluir/Editar colados no painel de detalhe do plano | 🟠 Médio | BancoPlanos.tsx:2698 | ⬜ pendente |
| I | Listas sem paginação (50+ itens, scroll longo) | 🟡 Baixo | Todos os módulos | ⬜ pendente |
| J | `rows={4}` em textareas no formulário de atividade | 🟡 Baixo | ModuloAtividades.tsx:170 | ⬜ pendente |
| K | Badges com `py-0.5` — interface visualmente apertada | 🟡 Baixo | TelaPrincipal.tsx:39 | ⬜ pendente |

---

## Detalhamento por problema

---

### ✅ A — Botões de reordenação do roteiro
**Arquivo:** `src/components/TelaPrincipal.tsx` linha ~546
**Problema:** Botões ⇈↑↓⇊ com `p-1.5` (~24×24px) e `gap-0.5` (2px entre eles). Impossível distinguir e tocar individualmente com o polegar em movimento.
**Fix aplicado (`b4797bf`):**
- `p-1.5` → `p-2.5` (~40×40px)
- `gap-0.5` → `gap-1` (4px de separação)
- `text-xs` → `text-sm leading-none` (símbolo maior e legível)
- `rounded` → `rounded-lg` (área de toque visualmente maior)

---

### ✅ B — Bottom nav labels ilegíveis
**Arquivo:** `src/components/BancoPlanos.tsx` linha ~2763
**Problema:** Labels "Planos", "Agenda", "Nova", "Músicas", "Mais" em `text-[10px]` (10px) — ilegível em tela pequena e em movimento. Gap entre ícone e label de apenas `gap-0.5`.
**Fix aplicado (`b4797bf`):**
- `text-[10px]` → `text-xs` (12px)
- `gap-0.5` → `gap-1`
- `py-2` → `py-2.5` (área de toque um pouco mais alta)

---

### ✅ C — Botões ✏️/🗑️ na lista de atividades
**Arquivo:** `src/components/ModuloAtividades.tsx` linha ~462
**Problema:** Botões de editar e excluir com `px-2 py-1.5 text-xs` (~32×24px). Abaixo do mínimo de 44×44px. Gap entre eles de apenas `gap-1.5` (6px).
**Fix aplicado (`b4797bf`):**
- `px-2 py-1.5` → `px-3 py-2` (~44×36px — mais próximo do mínimo)
- `text-xs` → `text-sm` (ícone emoji maior)
- `gap-1.5` → `gap-2` (8px de separação)

---

### ⬜ D — Formulário de plano: scroll excessivo
**Arquivo:** `src/components/TelaPrincipal.tsx` linhas 415–650
**Problema:** Quando seções accordion abertas (roteiro, materiais, objetivos), scroll pode chegar a 800–1000px em mobile. Professor entre aulas não tem tempo/paciência para isso.
**Melhoria sugerida:**
- Seções fechadas por padrão com preferência persistida no localStorage (já existe padrão: ver `secoesForm`)
- Verificar quais seções estão abertas por padrão no mobile e fechar as menos usadas
- Arquivo: procurar `secoesForm` no contexto — já é um Set que controla quais estão abertas

---

### ⬜ E — Botões Editar/Excluir no card de música (Repertório)
**Arquivo:** `src/components/ModuloRepertorio.tsx` linha ~467
**Problema:** `px-3 py-1.5 text-xs` com gap pequeno entre Editar e botão de uso. Fácil tocar o errado.
**Melhoria sugerida:**
- `py-1.5` → `py-2`
- `text-xs` → `text-sm`
- Aumentar gap entre eles para `gap-2`

---

### ⬜ F — Campo "Duração" sem `inputMode="numeric"`
**Arquivo:** `src/components/TelaPrincipal.tsx` linha ~418
```tsx
<input type="text" ... placeholder="Ex: 50 min" list="duracoes-list" />
```
**Problema:** Abre teclado alfanumérico completo em vez do teclado numérico. Um passo extra para digitar "50 min".
**Melhoria sugerida:**
- Adicionar `inputMode="numeric"` ou manter `type="text"` com `inputMode="text"` mas com sugestão de datalist já funcional
- Alternativa: remover "min" do placeholder e tratar como número puro com select de unidade

---

### ⬜ G — Quick options pós-aula muito pequenas
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx` linha ~24 (dentro de `AccordionChip`)
**Problema:** Botões de resposta rápida (chips dentro dos accordions) com `fontSize: 10, padding: '3px 8px'`. Área de toque ~60×22px — muito baixo verticalmente.
**Melhoria sugerida:**
- `padding: '3px 8px'` → `padding: '6px 10px'`
- `fontSize: 10` → `fontSize: 12`

---

### ⬜ H — Botões Editar/Excluir colados no painel de detalhe do plano
**Arquivo:** `src/components/BancoPlanos.tsx` linhas ~2698–2699
**Problema:** Dois botões lado a lado em `flex gap-2` dentro de `py-3 rounded-xl` — OK em altura, mas Excluir (vermelho) fica imediatamente ao lado de Editar sem separação visual clara.
**Melhoria sugerida:**
- Adicionar separador visual ou aumentar gap para `gap-3`
- Mover "Excluir" para linha separada ou adicionar confirmação direta no botão (ex: segurar 1s)

---

### ⬜ I — Listas sem paginação
**Arquivo:** Todos os módulos (planos, atividades, repertório)
**Problema:** 50+ itens renderizados de uma vez. Scroll longo até o final. Em mobile, difícil retomar a posição.
**Melhoria sugerida:**
- Implementar "Carregar mais" (load more) paginando em blocos de 20–30
- Ou usar `react-virtual` para virtualização (mais complexo)
- Prioridade baixa porque os filtros já reduzem bem a lista na prática

---

### ⬜ J — `rows={4}` em textarea do formulário de atividade
**Arquivo:** `src/components/ModuloAtividades.tsx` linha ~170
**Problema:** Textarea com 4 linhas visíveis ocupa ~120px em mobile, forçando scroll interno + scroll da página simultaneamente (confuso e difícil de controlar).
**Melhoria sugerida:**
- `rows={4}` → `rows={3}` em mobile (via classe `sm:rows-4` não existe no Tailwind — usar `style`)
- Ou usar `rows={3}` fixo (suficiente para ver o início do texto)

---

### ⬜ K — Badges com `py-0.5` (apertadas visualmente)
**Arquivo:** `src/components/TelaPrincipal.tsx` linha ~39
**Problema:** Badges não são clicáveis, mas `py-0.5` (2px) passa sensação de interface congestionada, especialmente em mobile onde os olhos já estão cansados.
**Melhoria sugerida:**
- `py-0.5` → `py-1` nas badges de número de aula e métricas
- Baixa prioridade — só visual, não bloqueia uso

---

## Prioridade Sugerida para Próximas Sessões

### Sprint 1 — Críticos (feitos ✅)
- ✅ A, B, C — commit `b4797bf`

### Sprint 2 — Médios (próxima sessão)
1. **F** — `inputMode="numeric"` no campo duração (1 linha)
2. **E** — Botões repertório: `py-1.5` → `py-2`, `text-xs` → `text-sm`
3. **G** — Quick options pós-aula: padding `3px 8px` → `6px 10px`
4. **H** — Separar Editar/Excluir no painel de detalhe do plano

### Sprint 3 — Baixos / complexos
5. **D** — Verificar quais seções do formulário ficam abertas por padrão no mobile
6. **J** — `rows={4}` → `rows={3}` nas textareas do formulário de atividade
7. **K** — Badges `py-0.5` → `py-1`
8. **I** — Paginação/virtualização das listas (complexo, baixo impacto prático)

---

## Notas para implementação

- Testes passando: 50/50 após cada sprint ✅
- Build deve passar com `npm run build` antes de cada commit
- Sempre verificar `npx tsc --noEmit` antes do commit
- Arquivo de referência técnica: `UX-FRICOES-2026-03-12.md` (fricções de UX mais amplas)
