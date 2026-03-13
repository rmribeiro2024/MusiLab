# Análise de Fricções de UX — MusiLab
**Data:** 2026-03-12
**Metodologia:** Leitura completa do código dos componentes principais (BancoPlanos.tsx, TelaPrincipal.tsx, ModuloAtividades.tsx, ModuloRepertorio.tsx, ModalRegistroPosAula.tsx e modais principais).
**Escopo:** Apenas melhorias de fluidez e simplicidade — sem novas funcionalidades.

---

## Resumo Executivo

| # | Fricção | Arquivo(s) | Impacto | Status |
|---|---------|------------|---------|--------|
| 1 | App bloqueia na tela de loading (IndexedDB ignorado) | App.tsx | 🔴 Alto | ✅ `502278a` |
| 2 | Foco não vai para o título ao criar plano | TelaPrincipal.tsx | 🔴 Alto | ✅ `502278a` |
| 3 | Filtros avançados de repertório ocultos por padrão | ModuloRepertorio.tsx | 🔴 Alto | ✅ `502278a` |
| 4 | Sem autosave local — risco de perda de rascunho | PlanosContext.tsx | 🟠 Médio | ✅ `502278a` |
| 5 | Botões de ação invisíveis até o hover (desktop) | TelaPrincipal.tsx, ModuloAtividades.tsx | 🟠 Médio | ✅ `d069da5` |
| 6 | Modal pós-aula longo demais para mobile | ModalRegistroPosAula.tsx | 🟠 Médio | ✅ `65189be` |
| 7 | Três padrões diferentes de filtro nos módulos | ModuloAtividades, ModuloRepertorio, TelaPrincipal | 🟠 Médio | ✅ `65189be` |
| 8 | Sem feedback visual no botão Salvar | TelaPrincipal.tsx | 🟠 Médio | ✅ `502278a` |
| 9 | Mover atividade no roteiro exige N cliques no mobile | TelaPrincipal.tsx | 🟡 Baixo | ✅ `d069da5` |
| 10 | Busca global (Ctrl+K) sem discovery visual na UI | BancoPlanos.tsx | 🟡 Baixo | ✅ já existia |
| 11 | Empty states sem call-to-action | Múltiplos módulos | 🟡 Baixo | ✅ `d069da5` |
| 12 | Emojis inconsistentes nos labels de botão | Interface toda | 🟡 Baixo | ⬜ pendente |

---

## 🔴 IMPACTO ALTO

---

### ✅ Fricção #1 — Loading screen bloqueia acesso aos dados locais
> **Implementado em `502278a`** — `App.tsx`: lê sessão sincronamente do localStorage (`sb-*-auth-token`). Retorna `null` se sem token (login imediato), `Session` se token válido (app imediato), `undefined` se token expirado (spinner breve). Timeout reduzido de 8s para 3s.

**Onde ocorre:**
- `src/components/BancoPlanos.tsx`
- State `dadosCarregados` (inicializado como `false`)
- O app aguarda `Promise.all([loadFromSupabase('planos'), loadFromSupabase('grades_semanas'), loadConfiguracoes()])` antes de exibir a UI principal
- Adicionalmente, 7+ contextos (EstrategiasContext, RepertorioContext, AtividadesContext, SequenciasContext, AnoLetivoContext, AplicacoesContext, PlanejamentoTurmaContext) fazem requisições Supabase simultâneas no boot

**Por que atrapalha:**
O app é offline-first — todos os dados já estão disponíveis no IndexedDB local. Mesmo assim, o professor fica olhando uma tela de carregamento enquanto o Supabase responde. Com conexão móvel lenta ou projeto pausado no tier gratuito (como o incidente de 2026-03-11), pode levar 5-15 segundos ou travar indefinidamente. O usuário não tem acesso aos seus dados mesmo eles estando no dispositivo.

**Melhoria simples:**
1. Remover o gate de `dadosCarregados` — renderizar a UI imediatamente com dados do IndexedDB
2. Supabase sync roda em background (já existe a estrutura)
3. Exibir apenas um indicador discreto de sync no canto (ex: spinner pequeno no header) enquanto sincroniza
4. Remover o `await` do bloco que bloqueia a renderização — converter para fire-and-forget com callback de atualização

**Código de referência:**
```typescript
// ATUAL — bloqueia UI:
const [dadosCarregados, setDadosCarregados] = useState(false)
// ... await Promise.all([loadFromSupabase(...)])
setDadosCarregados(true)
// UI só aparece aqui ↑

// PROPOSTO — renderiza imediatamente:
const [dadosCarregados, setDadosCarregados] = useState(true) // sempre true
const [sincronizando, setSincronizando] = useState(false)
// IndexedDB carrega sincronamente no boot, Supabase em background
```

**Impacto:** 🔴 Alto — afeta 100% dos carregamentos. Especialmente crítico no mobile com conexão instável.

---

### ✅ Fricção #2 — Foco não vai para o campo título ao criar plano
> **Implementado em `502278a`** — `TelaPrincipal.tsx`: `autoFocus={!planoEditando.titulo}` no input do título. Foco automático quando título está vazio (novo plano); sem impacto na edição.

**Onde ocorre:**
- `src/components/TelaPrincipal.tsx`
- Formulário de criação/edição de plano
- O `<input>` do título não tem `autoFocus` quando `modoEdicao === 'novo'`

**Por que atrapalha:**
Criar um novo plano é a tarefa mais frequente do app. Após clicar em "Novo Plano", o formulário abre mas o professor precisa clicar manualmente no campo título antes de começar a digitar. São 2 cliques onde deveria ser 1. Acontece dezenas de vezes por semana — é o tipo de micro-fricção que acumula fadiga.

**Melhoria simples:**
Adicionar `autoFocus` no input do título condicionado ao modo de criação:
```tsx
// No input do título dentro de TelaPrincipal.tsx:
<input
  type="text"
  autoFocus={modoEdicaoAtivo === 'novo'} // ou equivalente ao estado de criação
  // ... demais props
/>
```
Uma linha de código. Sem efeitos colaterais na edição (autoFocus só ativa na criação).

**Impacto:** 🔴 Alto — tarefa mais frequente do app, micro-fricção repetitiva.

---

### ✅ Fricção #3 — Filtros avançados de Repertório ocultos por padrão
> **Implementado em `502278a`** — `ModuloRepertorio.tsx`: `useState(() => localStorage.getItem('repertorio_filtros_abertos') !== 'false')` — aberto por padrão, preferência persistida. Função `toggleFiltrosAvancados` salva no localStorage.

**Onde ocorre:**
- `src/components/ModuloRepertorio.tsx`
- State `filtrosAvancadosAbertos` inicializado como `false`
- Filtros de Estilo, Tonalidade, Compasso, Dificuldade ficam ocultos até o professor clicar em "▼ Mais filtros"

**Por que atrapalha:**
Um professor buscando repertório para uma aula de teoria (ex: músicas em Dó Maior, compasso 3/4) precisa de um clique extra antes de ver os campos mais relevantes para ele. A tonalidade e o compasso são critérios pedagógicos centrais — não são "avançados". O rótulo "Mais filtros" sugere que são opcionais/raros, quando na verdade são frequentes.

**Melhoria simples:**
Duas opções (escolher uma):
- **Opção A (mais simples):** Mudar default para `useState(true)` — filtros sempre visíveis
- **Opção B (mais inteligente):** Persistir preferência em `localStorage`:
```typescript
const [filtrosAvancadosAbertos, setFiltrosAvancadosAbertos] = useState(() => {
  return localStorage.getItem('repertorio_filtros_abertos') !== 'false'
})
// + ao alterar: localStorage.setItem('repertorio_filtros_abertos', String(v))
```

**Impacto:** 🔴 Alto — afeta diretamente a busca de repertório, que é central no fluxo diário do professor.

---

## 🟠 IMPACTO MÉDIO

---

### ✅ Fricção #4 — Sem autosave local — risco de perda de rascunho
> **Implementado em `502278a`** — `PlanosContext.tsx`: `useEffect` com timer de 30s salva `planoEditando` em `dbSet('rascunho_plano', ...)` quando há conteúdo. Em `novoPlano()`: detecta rascunho e oferece restaurar via `setModalConfirm`. Em `salvarPlano()`: `dbDel('rascunho_plano')` limpa após salvar.

**Onde ocorre:**
- `src/components/TelaPrincipal.tsx`
- Formulário de plano não persiste rascunho localmente
- Existe detecção de mudanças via `JSON.stringify` comparison (`planoOriginalRef`)
- Existe modal de confirmação ao fechar com alterações
- Mas: fechamento acidental, bateria acabando, browser crashando = dados perdidos

**Por que atrapalha:**
O professor preenche título, 5 atividades, objetivos e materiais. Se tocar fora do modal no mobile (que fecha o modal), o modal de confirmação aparece — mas se o navegador travar ou a bateria acabar antes, perde tudo. O app sabe que há alterações não salvas (`isDirty` implícito), mas não age proativamente.

**Melhoria simples:**
Autosave no IndexedDB a cada 30 segundos quando há alterações, usando uma chave de rascunho separada:
```typescript
// Quando plano tem alterações não salvas:
useEffect(() => {
  if (!isDirty) return
  const timer = setTimeout(() => {
    dbSet('rascunho_plano', JSON.stringify(planoEditando))
  }, 30_000)
  return () => clearTimeout(timer)
}, [planoEditando, isDirty])

// Ao abrir formulário de novo plano: verificar se existe rascunho e oferecer restaurar
// Ao salvar com sucesso: limpar rascunho
```
Não precisa de sync com Supabase — só IndexedDB local. Sem nenhum estado visual adicional necessário.

**Impacto:** 🟠 Médio — mobile tem mais risco (toques acidentais, interrupções). Mitiga perda de trabalho.

---

### ✅ Fricção #5 — Botões de ação invisíveis até o hover (desktop)
> **Implementado em `d069da5`** — `TelaPrincipal.tsx` + `ModuloAtividades.tsx`: `opacity-60 group-hover:opacity-100` em vez de `opacity-0`. Botões visíveis o tempo todo, ficam totalmente opacos no hover.

**Onde ocorre:**
- `src/components/TelaPrincipal.tsx` — lista de planos
- `src/components/ModuloAtividades.tsx` — cards de atividade
- Pattern: `opacity-0 group-hover:opacity-100 transition-opacity`
- Afeta os botões: ✏️ Editar, 🗑️ Excluir, ⭐ Favorito, 📝 Registrar pós-aula

**Por que atrapalha:**
No desktop, o professor não sabe que os botões existem até passar o mouse sobre o item. É um padrão que esconde ações primárias. Editar um plano não é uma ação rara — é o que o professor faz toda aula. Para novos usuários, o app parece não ter botões de edição.

**Melhoria simples:**
Diferenciar por criticidade:
- Ações primárias (✏️ editar, ⭐ favorito): `opacity-60` no estado normal, `opacity-100` no hover
- Ações destrutivas (🗑️ excluir): manter `opacity-0` no hover — reveladas por hover para evitar clique acidental
```tsx
// ANTES:
className="opacity-0 group-hover:opacity-100"

// DEPOIS (para ações primárias):
className="opacity-60 group-hover:opacity-100"
```

**Impacto:** 🟠 Médio — afeta descoberta de funcionalidade para novos usuários e eficiência para usuários regulares.

---

### ✅ Fricção #6 — Modal de registro pós-aula longo demais para mobile
> **Implementado em `65189be`** — `ModalRegistroPosAula.tsx`: botão "Salvar registro" movido para footer sticky fora da área scrollável (entre o body e o fechamento do `!minimizado` wrapper). Botão sempre visível sem scroll, estilo mais proeminente (fundo escuro #1e293b). Conteúdo do onClick inalterado — só mudou o posicionamento.

### Fricção #6 — Modal de registro pós-aula longo demais para mobile (original)

**Onde ocorre:**
- `src/components/modals/ModalRegistroPosAula.tsx`
- Bottom sheet em mobile com 8+ campos: Resumo, Funcionou Bem, Não Funcionou, Comportamento (chips), Chamada, Próxima Aula (radio), Rubricas, Áudio (30s)
- O botão "Salvar" fica fora da viewport sem scroll

**Por que atrapalha:**
O registro pós-aula é feito tipicamente logo após a aula, no celular, às vezes em pé no corredor. Com tantos campos empilhados, o professor precisa rolar para chegar no botão Salvar. O fluxo ideal seria: abrir, escrever uma frase, fechar. Atualmente é: abrir, rolar, expandir acordeões, rolar de novo, salvar.

**Melhoria simples:**
Reorganizar a hierarquia visual — colocar o campo mais importante em primeiro, com salvamento acessível sem scroll:
1. **Campo único "Como foi?" sempre visível** (textarea + botão Salvar) no topo do modal — salva com um toque
2. **Seção "Detalhar" colapsável** abaixo — para quem quer preencher o resto
3. O botão Salvar fica sticky no rodapé do modal (já é um padrão, só mover o posicionamento)

Não remove nenhum campo — apenas reorganiza a ordem e prioridade visual.

**Impacto:** 🟠 Médio — afeta o hábito de registrar pós-aula, que é um dos valores centrais do app.

---

### ✅ Fricção #7 — Três padrões diferentes de filtro nos módulos
> **Implementado em `65189be`** — Padrão unificado colapsável com localStorage persistence nos 3 módulos:
> - **ModuloAtividades**: busca + "▼ Mais filtros" toggle + view mode sempre visíveis; Tag/Conceito/Faixa colapsáveis (chave `atividades_filtros_abertos`)
> - **TelaPrincipal**: busca + "▼ Mais filtros" toggle sempre visíveis; 8 selects + Favoritos/Limpar colapsáveis (chave `planos_filtros_abertos`); Ordenar/ViewMode sempre visíveis
> - **ModuloRepertorio**: já tinha o padrão implementado em `502278a` (chave `repertorio_filtros_abertos`)

### Fricção #7 — Três padrões diferentes de filtro nos módulos (original)

**Onde ocorre:**
- `src/components/ModuloAtividades.tsx` — barra horizontal com `<select>` nativos
- `src/components/ModuloRepertorio.tsx` — linha 1 visível + linhas 2-3 colapsáveis
- `src/components/TelaPrincipal.tsx` — filtros embutidos no header da lista de planos

**Por que atrapalha:**
Cada módulo inventou seu próprio padrão de filtro. Um professor que aprende a filtrar atividades não sabe como filtrar músicas no Repertório. A inconsistência cria carga cognitiva — o cérebro precisa "re-aprender" a interface a cada módulo.

**Melhoria simples:**
Padronizar uma estrutura única em todos os módulos:
```
[Busca textual] [Filtro 1 ▼] [Filtro 2 ▼] [Filtros ▼] ← abre popover com avançados
```
Não é redesign — é consistência de layout usando os mesmos componentes já existentes. O `<select>` nativo que já existe pode ser reaproveitado nos 3 módulos com a mesma estrutura de container.

**Impacto:** 🟠 Médio — reduz curva de aprendizado e sensação de fragmentação entre módulos.

---

### ✅ Fricção #8 — Sem feedback visual durante o salvamento
> **Implementado em `502278a`** — `TelaPrincipal.tsx`: estado `estadoSalvar: 'idle' | 'salvando' | 'salvo'`. Botão muda: `💾 Salvar Plano` → `⏳ Salvando...` (400ms) → `✓ Salvo!` verde (1.5s) → volta ao normal. Botão desabilitado durante o processo.

**Onde ocorre:**
- `src/components/TelaPrincipal.tsx` — botão "Salvar Plano"
- `src/components/BancoPlanos.tsx` — `statusSalvamento` state existe mas não tem indicador proeminente
- O botão não muda de estado após o clique — não há "Salvando..." nem confirmação de sucesso

**Por que atrapalha:**
Após clicar "Salvar Plano", não há confirmação visual clara. O professor não sabe se o plano foi salvo ou se precisa clicar de novo. Com sync offline, isso gera dúvida: "Isso foi salvo localmente? Sincronizou com a nuvem?". O professor frequentemente clica duas vezes por insegurança.

**Melhoria simples:**
Estado transitório no botão:
```
Clique → "Salvando..." (spinner pequeno, 300-800ms)
         → "✓ Salvo" (verde, 1.5s)
         → retorna ao normal "Salvar Plano"
```
```typescript
const [estadoBotao, setEstadoBotao] = useState<'idle' | 'salvando' | 'salvo'>('idle')

const handleSalvar = async () => {
  setEstadoBotao('salvando')
  await salvarPlano(...)
  setEstadoBotao('salvo')
  setTimeout(() => setEstadoBotao('idle'), 1500)
}
```

**Impacto:** 🟠 Médio — questão de confiança no sistema. Reduz ansiedade e cliques duplos acidentais.

---

## 🟡 IMPACTO BAIXO

---

### ✅ Fricção #9 — Reordenar atividades no roteiro exige muitos cliques no mobile
> **Implementado em `d069da5`** — `TelaPrincipal.tsx`: botões ⇈ (mover para início) e ⇊ (mover para final) adicionados ao controle mobile de reordenação, junto com os ↑↓ existentes. `arr.unshift(arr.splice(index,1)[0])` e `arr.push(arr.splice(index,1)[0])` para mover em 1 clique.

**Onde ocorre:**
- `src/components/TelaPrincipal.tsx` — seção "Roteiro de Atividades"
- Desktop: drag-and-drop nativo com handle `⠿`
- Mobile: botões ↑↓ (um passo por vez)

**Por que atrapalha:**
Com 6 atividades no roteiro, mover a última atividade para o topo exige 5 cliques em ↑. Com 8 atividades = 7 cliques. É tedioso para roteiros mais longos.

**Melhoria simples:**
Adicionar "Mover para o início" e "Mover para o final" no menu de cada atividade (ou long-press no mobile). Não requer nova infraestrutura — apenas 2 ações adicionais no array de controles existente:
```typescript
// Já existe: moverAtividade(index, index - 1) e moverAtividade(index, index + 1)
// Adicionar: moverAtividade(index, 0) e moverAtividade(index, lista.length - 1)
```

**Impacto:** 🟡 Baixo — afeta roteiros com 5+ atividades, não o fluxo padrão.

---

### ✅ Fricção #10 — Busca global (Ctrl+K) sem discovery visual
> **Já existia** — `BancoPlanos.tsx` linha 2372: botão `🔍 Busca Ctrl+K` no header, sempre visível abaixo do nome do usuário. Nenhuma alteração necessária.

**Onde ocorre:**
- `src/components/BancoPlanos.tsx` — atalho `Ctrl+K` implementado
- Nenhuma barra de busca ou ícone 🔍 visível na interface principal
- Sem tooltip, sem hint, sem badge "Ctrl+K"

**Por que atrapalha:**
O Ctrl+K é uma feature poderosa (busca em planos, atividades, estratégias, músicas, sequências simultaneamente) que a maioria dos usuários nunca vai descobrir porque não há nenhuma pista visual de que ela existe. Features não descobertas não existem para o usuário.

**Melhoria simples:**
Adicionar um botão 🔍 no header ou na barra de navegação que dispara o mesmo modal:
```tsx
// No header do BancoPlanos:
<button onClick={() => setShowBuscaGlobal(true)} title="Busca global (Ctrl+K)">
  🔍
</button>
```
O atalho de teclado continua funcionando. Adiciona apenas discovery para usuários que não usam atalhos.

**Impacto:** 🟡 Baixo-Médio — depends on user profile. Para professores que usam principalmente mobile, pode ser mais relevante.

---

### ✅ Fricção #11 — Empty states sem call-to-action
> **Implementado em `d069da5`** — `TelaPrincipal.tsx`: empty state com emoji 📋, texto adaptado (sem filtros vs. com filtros ativos) e botão "+ Novo Plano de Aula". `ModuloRepertorio.tsx`: empty state com emoji 🎼, texto adaptado e botão "+ Adicionar Música". `ModuloAtividades.tsx`: já tinha CTA (sem alteração).

**Onde ocorre:**
- `src/components/ModuloAtividades.tsx` — "Nenhuma atividade encontrada"
- `src/components/ModuloRepertorio.tsx` — estado vazio sem orientação
- `src/components/TelaPrincipal.tsx` — lista vazia de planos

**Por que atrapalha:**
Quando não há dados, o usuário vê uma mensagem mas não sabe o que fazer. O botão de criar está no topo da tela — o olhar do usuário está na área vazia. Essa desconexão é especialmente confusa para novos usuários na primeira semana.

**Melhoria simples:**
Empty states orientados a ação com botão inline contextualizado:
```tsx
// ANTES:
<p className="text-slate-400">Nenhuma atividade encontrada</p>

// DEPOIS:
<div className="text-center py-8">
  <p className="text-slate-400 mb-3">Nenhuma atividade ainda</p>
  <button onClick={abrirFormNova} className="btn-primary">
    + Criar primeira atividade
  </button>
</div>
```
O botão é o mesmo que já existe no topo — só está duplicado no contexto onde o usuário está olhando.

**Impacto:** 🟡 Baixo — mais relevante na primeira semana de uso e para novos usuários.

---

### Fricção #12 — Emojis inconsistentes nos labels de botão

**Onde ocorre:**
- Interface toda
- Exemplos de inconsistência:
  - `+ Nova Atividade` (sem emoji)
  - `💾 Salvar` (emoji decorativo)
  - `✏️ Editar` (emoji funcional)
  - `🗑️` (emoji substitui texto completamente)
  - `📝 Registrar` vs `Salvar Registro` (um tem emoji, outro não)

**Por que atrapalha:**
Emojis usados de forma inconsistente criam ruído visual sem hierarquia clara. O usuário não consegue distinguir quais botões são primários, secundários ou destrutivos apenas pela aparência. Em leitores de tela (acessibilidade), emojis decorativos geram texto desnecessário.

**Melhoria simples:**
Adotar uma convenção e aplicar gradualmente:
- **Ações de navegação/contexto:** emoji antes do texto (`📝 Registrar pós-aula`, `📊 Relatório`)
- **Ações CRUD:** apenas texto (`Salvar`, `Excluir`, `Editar`, `Novo plano`)
- **Botões destrutivos:** ícone SVG (mais semântico que emoji) ou apenas texto vermelho
- Não precisa refatorar tudo de uma vez — aplicar nas telas de maior uso primeiro

**Impacto:** 🟡 Baixo — consistência visual e acessibilidade. Não bloqueante.

---

## Prioridade Sugerida de Implementação

### Sprint 1 — Impacto imediato (mudanças de 5-20 linhas cada)
1. **#2** — `autoFocus` no título ao criar plano (1 linha)
2. **#8** — Feedback visual no botão Salvar (estado transitório)
3. **#5** — Botões primários com `opacity-60` em vez de `opacity-0`
4. **#10** — Botão 🔍 no header para busca global

### Sprint 2 — Melhorias de médio prazo
5. **#1** — Remover gate `dadosCarregados` — renderizar com IndexedDB imediato
6. **#3** — Filtros de repertório abertos por padrão (ou persistir em localStorage)
7. **#11** — Empty states com call-to-action inline

### Sprint 3 — Refatoração de consistência
8. **#7** — Padronizar padrão de filtros nos 3 módulos
9. **#6** — Reorganizar modal pós-aula para hierarquia mobile-first
10. **#4** — Autosave rascunho no IndexedDB
11. **#9** — Ações "Mover para início/fim" no roteiro
12. **#12** — Convenção de emojis nos botões

---

## Notas Técnicas para Implementação

### Sobre #1 (Loading gate)
O `dadosCarregados` está em `BancoPlanos.tsx`. Cada contexto (EstrategiasContext, RepertorioContext, etc.) carrega seus dados do IndexedDB de forma síncrona no `useState` inicial via `JSON.parse(await dbGet(...))`. O Supabase sync acontece DEPOIS. Portanto, a UI já tem dados válidos imediatamente — o gate só serve para esperar Supabase, que não deveria bloquear.

### Sobre #4 (Autosave)
A detecção de mudanças já existe via `planoOriginalRef` e comparação `JSON.stringify`. O rascunho pode ser salvo em IndexedDB com chave `draft_plano_atual`. Ao abrir "Novo Plano", verificar se `draft_plano_atual` existe e oferecer "Restaurar rascunho".

### Sobre #6 (Modal pós-aula)
`ModalRegistroPosAula.tsx` já usa acordeões (`AccordionChip`). A melhoria é apenas reordenar os componentes e tornar o campo "Resumo" o único sempre expandido por padrão, com os demais colapsados.

### Sobre #8 (Feedback salvamento)
O `statusSalvamento` já existe em `BancoPlanos.tsx`. A melhoria é conectar esse estado ao botão de salvar em `TelaPrincipal.tsx` via prop ou context, e adicionar as classes de estado transitório no botão.

---

*Gerado em sessão de análise UX em 2026-03-12. Implementação pode ser feita em sessões futuras seguindo a prioridade sugerida.*
