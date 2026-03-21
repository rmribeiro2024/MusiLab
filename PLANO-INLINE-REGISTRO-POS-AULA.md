# Plano — Registro Pós-Aula Inline (sem modal flutuante)

**Criado em:** 2026-03-21
**Status:** 🟡 Planejado — não iniciado
**Prioridade:** Alta (destoa do padrão UX do resto do app)

---

## 1. Contexto e Problema

### Situação atual
Quando o usuário clica em uma turma no módulo **Pós-aula**, o `ModalRegistroPosAula` abre como
janela flutuante, arrastável e redimensionável (estilo app desktop). O componente tem **2006 linhas**
e vive em `src/components/modals/ModalRegistroPosAula.tsx`.

### Por que isso é um problema
- Todo o resto do app abre seções inline (Banco de Aulas, Nova Aula, Aula por Turma)
- A janela flutuante com gradient escuro destoa visualmente do design system v2
- Em mobile, o modal já funciona em tela-cheia (há lógica `isMobile` que força isso)
- Arraste e redimensionamento não fazem sentido num app focado em mobile/tablet

### O que queremos
Clicar em uma turma em `TelaPosAula` → abre a **mesma** tela de registro, porém renderizada
**inline** como uma tela normal do app (com header "← Voltar", sem backdrop, sem drag/resize).

---

## 2. Análise técnica do `ModalRegistroPosAula`

### Arquivo
`src/components/modals/ModalRegistroPosAula.tsx` — 2006 linhas

### Componentes internos (não exportados)
- `AccordionChip` — campo colapsável com voz (linhas 10–103)
- `TurmaChip` / `ChipTurmaStatus` — chips de seleção de turma
- `RESIZE_HANDLES` — handles de redimensionamento

### Contextos consumidos
```ts
useCalendarioContext()  → modalRegistro, planoParaRegistro, verRegistros, registroEditando,
                          novoRegistro, setModalRegistro, setPlanoParaRegistro,
                          regAnoSel/regEscolaSel/regSegmentoSel/regTurmaSel (setters),
                          filtroReg* (setters), buscaRegistros
useAnoLetivoContext()   → anosLetivos, RUBRICAS_PADRAO
usePlanosContext()      → planos, salvarPlano
useAplicacoesContext()  → aplicacoesPorData
useEstrategiasContext() → estrategias
```

### Guard crítico (linha 662)
```ts
if (!modalRegistro || !planoParaRegistro) return null
```
O modal só renderiza se `modalRegistro === true` E `planoParaRegistro !== null`.

### Lógica de posição (linhas 664–669)
```ts
const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
const modalStyle = (maximizado || isMobile)
    ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', ... }  // full-screen
    : minimizado ? { ... }
    : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h, ... }
```

### useEffects relevantes
| Linha | Trigger | O que faz |
|-------|---------|-----------|
| 527 | `registroEditando` | Preenche campos quando editando registro existente |
| 555 | `verRegistros, filtroRegTurma, filtroRegData` | Expande o registro mais recente ao abrir histórico |
| 572 | `modalRegistro` | Centraliza posição ao abrir / limpa ao fechar |
| 579 | `modalRegistro` | **Pré-seleção de turma** — usa `planoParaRegistro.escola/segmento/turma` (nomes) para resolver IDs nos `anosLetivos` |

---

## 3. Abordagem escolhida — Prop `inlineMode`

**Estratégia:** adicionar prop `inlineMode?: boolean` ao `ModalRegistroPosAula`.

- Quando `inlineMode = true`:
  - Sem `position: fixed` — renderiza no fluxo normal do documento
  - Sem backdrop overlay
  - Sem drag/resize handles
  - Header simplificado (botão "← Voltar" + título, sem gradient escuro)
  - Ocupa 100% da largura disponível (mesma área que TelaPosAula já usa)
  - Ignora estados `pos`, `size`, `minimizado`, `maximizado`

- Quando `inlineMode = false` (padrão): comportamento **idêntico ao atual** — nada quebra

**Por que essa abordagem:**
- Cirúrgica — toca o mínimo possível do código existente
- O modal já tem lógica `isMobile` que força tela-cheia; `inlineMode` é extensão natural disso
- Não duplica as 2006 linhas de lógica
- Os outros pontos de acesso (calendário, página de planos) continuam usando o modal flutuante sem mudança

---

## 4. Etapas de implementação

### Etapa A — Adicionar `inlineMode` ao `ModalRegistroPosAula` ⬛

**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`

**A.1 — Adicionar prop à assinatura do componente**
```tsx
// Antes (componente sem props):
export default function ModalRegistroPosAula() {

// Depois:
export default function ModalRegistroPosAula({ inlineMode = false }: { inlineMode?: boolean }) {
```

**A.2 — Substituir o guard + lógica de estilo**
```tsx
// Linha 662 — guard:
if (!modalRegistro || !planoParaRegistro) return null

// Linha 664–669 — estilo condicional:
// ANTES:
const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
const modalStyle: React.CSSProperties = (maximizado || isMobile)
    ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', ... }
    : minimizado ? { ... }
    : { position: 'fixed', left: ..., top: ..., width: size.w, height: size.h, ... }

// DEPOIS — adicionar `inlineMode` à condição:
const isMobile = !inlineMode && typeof window !== 'undefined' && window.innerWidth < 640
const modalStyle: React.CSSProperties = inlineMode
    ? { width: '100%', display: 'flex', flexDirection: 'column' }
    : (maximizado || isMobile)
    ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', borderRadius: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }
    : minimizado
    ? { position: 'fixed', bottom: 16, right: 16, width: 300, zIndex: 50, borderRadius: 16 }
    : { position: 'fixed', left: pos?.x ?? ..., top: pos?.y ?? ..., width: size.w, height: size.h, zIndex: 50, borderRadius: 16, display: 'flex', flexDirection: 'column' }
```

**A.3 — Suprimir backdrop quando inlineMode**
```tsx
// Trecho atual (linha 680):
{!minimizado && !maximizado && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 49 }}
         onClick={() => setModalRegistro(false)} />
)}

// Novo:
{!inlineMode && !minimizado && !maximizado && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 49 }}
         onClick={() => setModalRegistro(false)} />
)}
```

**A.4 — Suprimir resize handles quando inlineMode**
```tsx
// Linha 686:
{!maximizado && !minimizado && RESIZE_HANDLES.map(...)}

// Novo:
{!inlineMode && !maximizado && !minimizado && RESIZE_HANDLES.map(...)}
```

**A.5 — Header alternativo quando inlineMode**
```tsx
// O header atual (linha 691) tem gradient escuro + botões minimizar/maximizar/fechar.
// Quando inlineMode, substituir por header limpo com "← Voltar":

{inlineMode ? (
    // Header inline — sem gradient, sem drag, sem min/max
    <div className="px-4 py-3 border-b border-[#E6EAF0] dark:border-[#374151] flex items-center gap-3 shrink-0">
        <button
            onClick={() => { setModalRegistro(false); setPlanoParaRegistro(null) }}
            className="text-[13px] text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] transition">
            ← Voltar
        </button>
        <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E5E7EB] truncate flex-1">
            {planoParaRegistro.titulo || 'Registro Pós-Aula'}
        </span>
    </div>
) : (
    // Header original com gradient (código existente, sem mudança)
    <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', ... }}
         onMouseDown={onHeaderMouseDown} ...>
        {/* ... código existente ... */}
    </div>
)}
```

**A.6 — Ajustar useEffect de centralização (linha 572)**

O `useEffect` que centraliza ao abrir (`setPos(...)`) não deve rodar em inlineMode:
```tsx
// Linha 572:
React.useEffect(() => {
    if (modalRegistro && pos === null) {
        setPos({ x: ..., y: ... })
    }
    if (!modalRegistro) { setPos(null); setMinimizado(false); setMaximizado(false) }
}, [modalRegistro])

// Novo:
React.useEffect(() => {
    if (inlineMode) return   // inline não precisa de posição
    if (modalRegistro && pos === null) {
        setPos({ x: ..., y: ... })
    }
    if (!modalRegistro) { setPos(null); setMinimizado(false); setMaximizado(false) }
}, [modalRegistro])
```

---

### Etapa B — Adicionar `viewMode = 'posAulaRegistro'` ao roteamento ⬛

**Arquivo:** `src/components/BancoPlanos.tsx`

**B.1 — VIEWMODE_TO_GROUP**
```tsx
// Adicionar:
posAulaRegistro: 'posAula',
```

**B.2 — Renderização condicional**
```tsx
// Adicionar junto dos outros viewModes:
{viewMode === 'posAulaRegistro' && (
    <ErrorBoundary modulo="Registro Pós-Aula">
        <ModalRegistroPosAula inlineMode />
    </ErrorBoundary>
)}
```
> Nota: `ModalRegistroPosAula` já é importado no arquivo — não precisa de lazy import adicional.

---

### Etapa C — Modificar `TelaPosAula.abrirRegistro()` ⬛

**Arquivo:** `src/components/TelaPosAula.tsx`

Adicionar `setViewMode` ao destructuring do contexto (ou receber via prop de BancoPlanos).

**Opção recomendada:** passar `onAbrirRegistro` como callback de BancoPlanos → TelaPosAula,
para manter TelaPosAula desacoplado do roteamento global.

```tsx
// BancoPlanos.tsx — passar callback:
{viewMode === 'posAula' && (
    <TelaPosAula onAbrirRegistro={() => setViewMode('posAulaRegistro')} />
)}

// TelaPosAula.tsx — receber e usar:
export default function TelaPosAula({ onAbrirRegistro }: { onAbrirRegistro?: () => void }) {
    ...
    const abrirRegistro = (t: typeof turmasEnriq[0]) => {
        // Prepara estados (código existente):
        setPlanoParaRegistro(plano)
        setNovoRegistro({ dataAula: dataSel, ... })
        setRegistroEditando(null)
        setVerRegistros(false)

        // Navega inline em vez de abrir modal flutuante:
        if (onAbrirRegistro) {
            onAbrirRegistro()          // → setViewMode('posAulaRegistro')
        } else {
            setModalRegistro(true)     // fallback — abre modal flutuante
        }
    }
```

---

### Etapa D — Botão "← Voltar" fecha inline e retorna à lista ⬛

O botão "← Voltar" do header inline (Etapa A.5) precisa:
1. `setModalRegistro(false)` — reset do guard
2. `setPlanoParaRegistro(null)` — reset do plano
3. `setViewMode('posAula')` — retorna à tela da lista de turmas

Como o `ModalRegistroPosAula` não conhece `setViewMode`, passar via prop `onVoltar`:

```tsx
// BancoPlanos.tsx:
{viewMode === 'posAulaRegistro' && (
    <ModalRegistroPosAula
        inlineMode
        onVoltar={() => { setModalRegistro(false); setPlanoParaRegistro(null); setViewMode('posAula') }}
    />
)}

// ModalRegistroPosAula.tsx — adicionar à assinatura:
export default function ModalRegistroPosAula({
    inlineMode = false,
    onVoltar,
}: {
    inlineMode?: boolean
    onVoltar?: () => void
}) {
    // No header inline, usar onVoltar ao invés de setModalRegistro(false):
    <button onClick={onVoltar ?? (() => setModalRegistro(false))}>← Voltar</button>
```

---

### Etapa E — Build, testes e deploy ⬛

```bash
npx tsc --noEmit   # zero erros TypeScript
npm run build      # deve passar sem warnings críticos
```

**Testes manuais:**
- [ ] Desktop: clicar turma em Pós-aula → abre inline, sem modal flutuante
- [ ] Desktop: preencher e salvar registro → status da turma atualiza (bolinha verde)
- [ ] Desktop: botão "← Voltar" retorna à lista de turmas
- [ ] Mobile: mesmo fluxo funciona
- [ ] Calendário: clicar "Registrar" em turma do calendário → ainda abre modal flutuante (sem `inlineMode`)
- [ ] Página de planos: "Ver registros" continua abrindo modal flutuante
- [ ] Dark mode: header inline usa tokens dark corretos
- [ ] Histórico: sub-item do sidebar ainda funciona normalmente

---

## 5. Ordem de execução

```
A (modificar ModalRegistroPosAula) → B (roteamento BancoPlanos) → C (TelaPosAula) → D (onVoltar) → E (build + teste)
```

Cada etapa pode ser feita em commit separado ou tudo em um único commit.
Estimativa de linhas modificadas: ~60–80 linhas no total.

---

## 6. Pontos de atenção / riscos

| Risco | Mitigação |
|-------|-----------|
| `useEffect` de centralização (linha 572) rodando em inlineMode | Proteger com `if (inlineMode) return` |
| Outros lugares que chamam `setModalRegistro(true)` não devem ser afetados | `inlineMode` tem default `false` — zero impacto |
| TypeScript: prop `inlineMode` precisa ser opcional | `inlineMode?: boolean` com default `= false` |
| `className` Tailwind no header inline pode não funcionar se modal usa só inline styles | Verificar se `dark:` variants chegam (modal é filho de `body`, fora do wrapper com `.dark`) — usar `document.documentElement.classList.contains('dark')` se necessário |

---

## 7. Histórico

| Data | Ação |
|------|------|
| 2026-03-21 | Plano criado — não iniciado |
