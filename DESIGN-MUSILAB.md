# Design MusiLab
> Decisões de design do projeto — atualizar a cada nova decisão relevante.
> Consultar antes de criar qualquer componente novo.

---

## 1. Princípios gerais

### Text-first UI
Botões de ação usam **texto**, não ícones nem emoji.

| ❌ Evitar | ✅ Usar |
|-----------|---------|
| `✏️` | `Editar` |
| `🗑️` | `Excluir` |
| `➕` | `Adicionar` |
| `▲ Fechar` | `Fechar` |

**Exceção aceita:** emoji como *marcador de dado* (não de ação).
Ex.: `💡 Próxima aula`, `✅ O que aprenderam` — labels de campos que identificam tipo de informação.

**Não é exceção:** chips/badges clicáveis que filtram ou executam ação — mesmo que exibam dados, são botões e devem ser texto.
Ex.: `Atenção: marcos ×`, `Engajamento ×` — sem emoji.

**Referência:** Notion, Linear, Vercel — todos usam labels de texto em botões.

---

### Sem clique implícito em linhas de lista
Linhas de lista **não são clicáveis como um todo**. Ações são sempre botões explícitos.

| ❌ Evitar | ✅ Usar |
|-----------|---------|
| Linha inteira clicável | Botões "Ver" e "Editar" explícitos na linha |
| Chevron ▼ como único indicador | Botão com label clara |

**Motivo:** clique implícito cria contradição quando há outros elementos interativos na linha (badges, filtros).

---

### Modernidade vs. app infantil
- Sem gradientes decorativos desnecessários
- Sem sombras pesadas
- Sem bordas coloridas chamativas como elemento principal
- Tipografia pequena e bem espaçada é mais sofisticada que tamanhos grandes
- Cores de destaque usadas com parcimônia (só onde têm semântica)

---

## 2. Tokens de cor

### Accent principal
```
#5B5FEA  — roxo/índigo — usado em: seleção ativa, hover de destaque, estado aberto
```

### Paleta de turmas (TURMA_COLORS)
Sequência usada para identificar turmas visualmente. Atribuída por ordem de aparecimento.
```
['#5B5FEA', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']
```

### CSS Custom Properties (index.css)
```css
/* Light */
:root {
  --v2-card: #ffffff;
  --v2-head: #ffffff;
  --v2-side: #F1F4F8;
  --v2-bg:   #F6F8FB;
}

/* Dark */
.dark {
  --v2-card: #1F2937;
  --v2-head: #1E2A4A;
  --v2-side: #111827;
  --v2-bg:   #0F172A;
}
```

### Cores semânticas
| Uso | Cor | Contexto |
|-----|-----|----------|
| Estado aberto/selecionado | `#5B5FEA` (light) / `#818cf8` (dark) | Botão "Ver" ativo, data block ativa |
| Contagem de registros | `#059669` (light) / `#34d399` (dark) | Badge "N reg." |
| Lacuna / alerta | `#f97316` | "N dias sem registro" |
| Texto secundário | `#94a3b8` | Labels, trechos, meta-info |
| Borda padrão | `#E6EAF0` (light) / `#374151` (dark) | Cards, inputs, separadores |

---

## 3. Tipografia

### Fonte
**Inter** — carregada via Google Fonts em `index.html`.
```css
body { font-family: 'Inter', system-ui, sans-serif; }
```

### Escala usada nos componentes
| Elemento | Tamanho | Peso |
|----------|---------|------|
| Título de página | 17px | 700 |
| Subtítulo / descrição | 12.5px | 400 |
| Cabeçalho de card (turma/data) | 13px | 600 |
| Label de item na lista | 12px | 600 |
| Texto secundário / trecho | 11.5px | 400 italic |
| Badge / meta | 11px | 400–600 |
| Label de campo expandido | 10.5px | 600 uppercase |
| Conteúdo expandido | 12.5px | 400 |
| Botões de ação inline | 11px | 500 |

---

## 4. Layout

### Container principal
```
max-w-2xl mx-auto  — módulos de formulário/lista
max-w-7xl mx-auto  — telas de painel/kanban
padding: 30px      — lateral em telas largas
```

### Cards
```
border-radius: 12px
border: 1px solid var(--border)
box-shadow: 0 1px 3px rgba(0,0,0,0.06)  /* light */
box-shadow: 0 1px 3px rgba(0,0,0,0.2)   /* dark */
overflow: hidden
```

### Grid de cards (TelaPrincipal)
```
xl:grid-cols-4, gap: 14px
```

---

## 5. Padrões de componente

### Mini-timeline (Histórico — V3)
Usado para listas de registros dentro de um card agrupador.

```
[Card agrupador]
  [Cabeçalho]  ← clicável, abre/fecha o corpo
  [Linha 1]    dot/bloco ── conector ── conteúdo ── Ver  Editar
  [Linha 2]    dot/bloco ── conector ── conteúdo ── Ver  Editar
  ...
```

**Por turma:** cabeçalho = nome da turma + barra de cor. Linhas = data (dia + mês).

**Por data:** cabeçalho = data block (38×38px, dia + mês). Linhas = dot colorido da turma + escola · seg · turma.

**Date block (38×38px):**
- Inativo: fundo `#F1F4F8` / dark `#111827`, borda sutil
- Ativo (aberto): fundo `#EEF0FF` / dark `rgba(91,95,234,0.1)`, borda `#c7d2fe`, texto `#5B5FEA`

**Conector vertical:**
- Linha: 1px, cor `#E6EAF0` / dark `#374151`
- Dot: 5×5px, circle, mesma cor

### Expansão inline
Ao clicar "Ver", o registro expande abaixo da linha sem modal.
- Fundo levemente diferente: `rgba(0,0,0,0.015)` / dark `rgba(255,255,255,0.02)`
- Indent: `padding-left: 62px` (alinhado com o conteúdo, pulando dot + conector)
- Campos: label 10.5px uppercase + valor 12.5px
- Botão "Ver" fica roxo (`#5B5FEA`) e muda label para "Fechar"

### Botões de ação inline (nas linhas de lista)
```
Ver    — expande inline. Ativo: fundo #EEF0FF, cor #5B5FEA. Label muda para "Fechar".
Editar — abre modal de edição.
```
Estilo base:
```css
font-size: 11px;
font-weight: 500;
padding: 3px 9px;
border-radius: 6px;
border: 1px solid var(--border);
background: transparent;
```

---

## 6. Dark mode

- Toggle: botão único ☀️ / 🌙 / 🖥️ no header direito — cicla a cada clique
- Implementado via classe `.dark` no `<html>`
- Detectado em componentes via hook `useIsDark()` (MutationObserver na classe do `document.documentElement`)
- **Atenção:** regras `!important` em `index.css` linhas 31–62 têm precedência sobre `dark:` variants do Tailwind — checar conflitos ao adicionar novas regras

---

## 7. Interação e UX

### Filtros
- Selects nativos estilizados (sem biblioteca), `appearance: none` + chevron posicionado
- "limpar" em texto simples, sem botão chamativo
- Chips de filtro ativo aparecem abaixo dos selects com `×` para remover

### Insights / banners
- Fundo sutil (`#F8FAFC` / dark `#1F2937`), borda esquerda 3px `#94a3b8`
- Ícone ⚡ + texto + botão `×` para dispensar
- Nunca bloquear o fluxo — sempre dispensável

### Estados de lacuna
- Linha tracejada horizontal com texto centralizado
- Cor apagada (`#94a3b8`) — informativo, não alarmante

---

## 8. Regras de acessibilidade mínima

- Todo botão tem `cursor: pointer` e `fontFamily: inherit`
- Hover states em todas as linhas clicáveis (`hover:bg-slate-50 dark:hover:bg-white/[0.02]`)
- Transições curtas: `transition: all 120ms` para estados de botão
- Texto nunca abaixo de 10px

---

## Histórico de decisões

| Data | Decisão | Motivo |
|------|---------|--------|
| 2026-03-14 | Design System v2 — tokens, Inter, theme toggle | Padronização visual |
| 2026-03-17 | Mini-timeline V3 para Histórico | Substituir lista plana por agrupamento visual |
| 2026-03-22 | Text-first UI — sem emoji em botões de ação | Clareza, profissionalismo, modernidade |
| 2026-03-22 | Chips/badges clicáveis também sem emoji | São botões — regra text-first se aplica |
| 2026-03-22 | Linhas de lista não são clicáveis como todo | Evitar contradição com elementos interativos inline |
| 2026-03-22 | "Por data" idêntico ao "Por turma" | Consistência entre modos de vista |
