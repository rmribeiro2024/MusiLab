# MusiLab — Refatoração: Divisão do Contexto em Domínios

## Para o Claude Code que vai continuar este trabalho

Leia este arquivo **inteiro** antes de escrever qualquer código.
Ele contém o estado atual, a estratégia completa e os passos detalhados de cada parte.

---

## Estado atual do projeto

- **Stack**: React 18 + Vite + TypeScript + Tailwind CSS + Supabase + IndexedDB (idb)
- **Repositório**: https://github.com/rmribeiro2024/MusiLab
- **Branch de trabalho**: `claude/add-usestate-comments-evQWg`
  - ⚠️ SEMPRE trabalhar neste branch e mergear para `main` após cada parte
- **Verificação obrigatória** antes de qualquer commit:
  ```bash
  npx tsc --noEmit   # deve ter ZERO erros
  npm run build      # deve passar
  npm test -- --run  # 35 testes devem passar
  ```

### Problema a resolver

`src/components/BancoPlanos.tsx` tem **84 useState** e expõe **~250 propriedades** em um único contexto global (`BancoPlanosContextValue`). Isso causa:
- Re-renders desnecessários em toda a árvore
- Arquivo de 3.300 linhas difícil de manter
- Contexto gigante com tudo misturado

### Solução

Dividir em **8 contextos por domínio** + **1 etapa de limpeza**, de forma incremental — o app continua funcionando após cada etapa.

---

## Arquitetura alvo

```
src/
  contexts/
    EstrategiasContext.tsx    ← Parte 2 (começar aqui)
    RepertorioContext.tsx      ← Parte 3
    AtividadesContext.tsx      ← Parte 4
    SequenciasContext.tsx      ← Parte 5
    HistoricoContext.tsx       ← Parte 5
    AnoLetivoContext.tsx       ← Parte 6 (inclui turmas, escolas, faixas)
    CalendarioContext.tsx      ← Parte 7 (inclui registro pós-aula)
    PlanosContext.tsx          ← Parte 8 (o maior, deixar por último)
  components/
    BancoPlanos.tsx            ← vai encolhendo a cada parte
    BancoPlanosContext.ts      ← mantido durante a migração; removido na Parte 9
```

Cada contexto novo é **adicionado ao Provider** em `App.tsx` e os componentes passam a usar o contexto específico.

---

## Regra de ouro da migração incremental

Para cada domínio extraído:
1. Criar `src/contexts/XxxContext.tsx` com os estados do domínio
2. Mover os `useState` do `BancoPlanos.tsx` para o novo contexto
3. **Manter** as variáveis no objeto `ctx` de `BancoPlanos.tsx` mas lendo do novo contexto (para não quebrar outros consumers ainda não migrados)
4. Atualizar `ModuloXxx.tsx` para usar o novo `useXxxContext()` diretamente
5. Após todos os consumers migrarem para o novo ctx, remover do `ctx` antigo

---

## Parte 1 — Infraestrutura (fazer PRIMEIRO)

### O que criar

**`src/contexts/index.ts`** — barrel export de todos os contextos:
```typescript
// será populado à medida que os contextos forem criados
export { useEstrategiasContext } from './EstrategiasContext'
// export { useRepertorioContext } from './RepertorioContext'  // descomentado na Parte 3
// etc.
```

**Atualizar `src/App.tsx`** para envolver com os providers:
```tsx
// Padrão de composição (adicionar um provider por vez conforme as partes avançam):
return (
  <ErrorBoundary modulo="MusiLab">
    <EstrategiasProvider>          {/* Parte 2 */}
      {/* <RepertorioProvider> */}  {/* Parte 3 */}
        <BancoPlanos session={session} />
      {/* </RepertorioProvider> */}
    </EstrategiasProvider>
  </ErrorBoundary>
);
```

**Atualizar `src/types/index.ts`** com interfaces dos novos contextos (ir adicionando conforme as partes).

### Verificação
```bash
npx tsc --noEmit && npm run build && npm test -- --run
```
Commit: `feat: refactor parte 1 — infraestrutura de contextos`

---

## Parte 2 — EstrategiasContext (COMEÇAR AQUI)

### Por quê primeiro?
- **12 useState** isolados — não dependem de nenhum outro domínio
- **1 único consumer**: `ModuloEstrategias.tsx` (já em TypeScript)
- Prova o padrão com o menor risco

### useState a mover do BancoPlanos.tsx (linhas ~318–342)

```typescript
// Dados
const [estrategias, setEstrategias] = useState([])            // linha ~318
const [estrategiaEditando, setEstrategiaEditando] = useState(null)  // linha ~322

// Filtros/busca
const [buscaEstrategia, setBuscaEstrategia] = useState('')    // linha ~323
const [filtroCategoriaEstrategia, setFiltroCategoriaEstrategia] = useState('Todas')  // ~324
const [filtroFuncaoEstrategia, setFiltroFuncaoEstrategia] = useState('Todas')        // ~325
const [filtroObjetivoEstrategia, setFiltroObjetivoEstrategia] = useState('Todos')    // ~326
const [mostrarArquivadasEstrategia, setMostrarArquivadasEstrategia] = useState(false) // ~327

// Dados de domínio customizáveis
const [categoriasEstrategia, setCategoriasEstrategia] = useState([...])  // ~328
const [funcoesEstrategia, setFuncoesEstrategia] = useState([...])        // ~332
const [objetivosEstrategia, setObjetivosEstrategia] = useState([...])    // ~336

// Inputs temporários (formulário)
const [novaCategoriaEstr, setNovaCategoriaEstr] = useState('')  // ~340
const [novaFuncaoEstr, setNovaFuncaoEstr] = useState('')        // ~341
const [novoObjetivoEstr, setNovoObjetivoEstr] = useState('')    // ~342
```

### Funções a mover do BancoPlanos.tsx (linhas ~1905–1948)

```typescript
novaEstrategia()       // linha ~1905 — abre modal com campos vazios + ID seguro
salvarEstrategia()     // linha ~1914 — salva (insert/update) + sync Supabase
excluirEstrategia(id)  // linha ~1930 — remove com confirmação
arquivarEstrategia(id) // linha ~1940 — ativo: false
restaurarEstrategia(id)// linha ~1944 — ativo: true
```

### useEffects a mover (sincronização IndexedDB/Supabase)

Buscar no BancoPlanos.tsx os `useEffect` que leem/escrevem `estrategias`, `categoriasEstrategia`, `funcoesEstrategia`, `objetivosEstrategia` no IndexedDB e Supabase. São cerca de 3-4 useEffects.

### Template do EstrategiasContext.tsx

```typescript
// src/contexts/EstrategiasContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase } from '../lib/utils'
import type { Estrategia } from '../types'

// ─── CATEGORIAS/FUNÇÕES/OBJETIVOS PADRÃO ─────────────────────────────────────
const CATEGORIAS_PADRAO = ['Escuta', 'Vocal', 'Corporal', 'Rítmica',
  'Instrumental', 'Improvisação', 'Criação', 'Jogo Musical', 'Análise Musical']
const FUNCOES_PADRAO = ['Foco inicial', 'Aquecimento corporal', 'Aquecimento vocal',
  'Desenvolvimento', 'Consolidação', 'Transição', 'Encerramento']
const OBJETIVOS_PADRAO = ['Desenvolver percepção auditiva', 'Consolidar consciência rítmica',
  'Desenvolver coordenação motora', 'Trabalhar afinação', 'Estimular criatividade musical',
  'Desenvolver improvisação', 'Ampliar escuta ativa', 'Desenvolver memória musical',
  'Desenvolver expressão musical', 'Desenvolver autonomia musical']

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────
interface EstrategiasContextValue {
  // Dados
  estrategias: Estrategia[]
  setEstrategias: React.Dispatch<React.SetStateAction<Estrategia[]>>
  estrategiaEditando: Estrategia | null
  setEstrategiaEditando: React.Dispatch<React.SetStateAction<Estrategia | null>>
  // Filtros
  buscaEstrategia: string
  setBuscaEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroCategoriaEstrategia: string
  setFiltroCategoriaEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroFuncaoEstrategia: string
  setFiltroFuncaoEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroObjetivoEstrategia: string
  setFiltroObjetivoEstrategia: React.Dispatch<React.SetStateAction<string>>
  mostrarArquivadasEstrategia: boolean
  setMostrarArquivadasEstrategia: React.Dispatch<React.SetStateAction<boolean>>
  // Customizações
  categoriasEstrategia: string[]
  setCategoriasEstrategia: React.Dispatch<React.SetStateAction<string[]>>
  funcoesEstrategia: string[]
  setFuncoesEstrategia: React.Dispatch<React.SetStateAction<string[]>>
  objetivosEstrategia: string[]
  setObjetivosEstrategia: React.Dispatch<React.SetStateAction<string[]>>
  // Inputs temporários
  novaCategoriaEstr: string
  setNovaCategoriaEstr: React.Dispatch<React.SetStateAction<string>>
  novaFuncaoEstr: string
  setNovaFuncaoEstr: React.Dispatch<React.SetStateAction<string>>
  novoObjetivoEstr: string
  setNovoObjetivoEstr: React.Dispatch<React.SetStateAction<string>>
  // Funções CRUD
  novaEstrategia: () => void
  salvarEstrategia: () => void
  excluirEstrategia: (id: string) => void
  arquivarEstrategia: (id: string) => void
  restaurarEstrategia: (id: string) => void
}

const EstrategiasContext = createContext<EstrategiasContextValue | null>(null)

export function useEstrategiasContext(): EstrategiasContextValue {
  const ctx = useContext(EstrategiasContext)
  if (!ctx) throw new Error('useEstrategiasContext deve ser usado dentro de EstrategiasProvider')
  return ctx
}

interface EstrategiasProviderProps {
  children: React.ReactNode
  userId?: string  // necessário para sincronização com Supabase
  // setModalConfirm será recebido do contexto global enquanto não for extraído
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setModalConfirm: (state: any) => void
}

export function EstrategiasProvider({ children, userId, setModalConfirm }: EstrategiasProviderProps) {
  // ── COPIAR OS useState do BancoPlanos.tsx ──
  const [estrategias, setEstrategias] = useState<Estrategia[]>([])
  const [estrategiaEditando, setEstrategiaEditando] = useState<Estrategia | null>(null)
  const [buscaEstrategia, setBuscaEstrategia] = useState('')
  const [filtroCategoriaEstrategia, setFiltroCategoriaEstrategia] = useState('Todas')
  const [filtroFuncaoEstrategia, setFiltroFuncaoEstrategia] = useState('Todas')
  const [filtroObjetivoEstrategia, setFiltroObjetivoEstrategia] = useState('Todos')
  const [mostrarArquivadasEstrategia, setMostrarArquivadasEstrategia] = useState(false)
  const [categoriasEstrategia, setCategoriasEstrategia] = useState<string[]>(CATEGORIAS_PADRAO)
  const [funcoesEstrategia, setFuncoesEstrategia] = useState<string[]>(FUNCOES_PADRAO)
  const [objetivosEstrategia, setObjetivosEstrategia] = useState<string[]>(OBJETIVOS_PADRAO)
  const [novaCategoriaEstr, setNovaCategoriaEstr] = useState('')
  const [novaFuncaoEstr, setNovaFuncaoEstr] = useState('')
  const [novoObjetivoEstr, setNovoObjetivoEstr] = useState('')

  // ── COPIAR OS useEffects de sincronização do BancoPlanos.tsx ──
  // (carregar e salvar estrategias, categoriasEstrategia, funcoesEstrategia, objetivosEstrategia)
  // [PREENCHER copiando do BancoPlanos.tsx]

  // ── COPIAR AS FUNÇÕES do BancoPlanos.tsx ──
  function novaEstrategia() { /* [PREENCHER copiando de BancoPlanos.tsx ~linha 1905] */ }
  function salvarEstrategia() { /* [PREENCHER copiando de BancoPlanos.tsx ~linha 1914] */ }
  function excluirEstrategia(id: string) { /* [PREENCHER copiando de BancoPlanos.tsx ~linha 1930] */ }
  function arquivarEstrategia(id: string) { /* [PREENCHER copiando de BancoPlanos.tsx ~linha 1940] */ }
  function restaurarEstrategia(id: string) { /* [PREENCHER copiando de BancoPlanos.tsx ~linha 1944] */ }

  const value: EstrategiasContextValue = {
    estrategias, setEstrategias,
    estrategiaEditando, setEstrategiaEditando,
    buscaEstrategia, setBuscaEstrategia,
    filtroCategoriaEstrategia, setFiltroCategoriaEstrategia,
    filtroFuncaoEstrategia, setFiltroFuncaoEstrategia,
    filtroObjetivoEstrategia, setFiltroObjetivoEstrategia,
    mostrarArquivadasEstrategia, setMostrarArquivadasEstrategia,
    categoriasEstrategia, setCategoriasEstrategia,
    funcoesEstrategia, setFuncoesEstrategia,
    objetivosEstrategia, setObjetivosEstrategia,
    novaCategoriaEstr, setNovaCategoriaEstr,
    novaFuncaoEstr, setNovaFuncaoEstr,
    novoObjetivoEstr, setNovoObjetivoEstr,
    novaEstrategia, salvarEstrategia, excluirEstrategia,
    arquivarEstrategia, restaurarEstrategia,
  }

  return <EstrategiasContext.Provider value={value}>{children}</EstrategiasContext.Provider>
}
```

### Atualizar ModuloEstrategias.tsx

Substituir `const ctx = useBancoPlanos()` por `const ctx = useEstrategiasContext()` e ajustar os imports.

### Atualizar BancoPlanos.tsx

Após mover as variáveis para o novo contexto:
- Remover os 12 `useState` de estratégias
- Remover as 5 funções de estratégias
- Remover os useEffects de estratégias
- Remover os campos de estratégia do objeto `ctx` (cerca de 32 campos)
- O `EstrategiasProvider` já envolve o BancoPlanos via App.tsx

### Verificação e commit
```bash
npx tsc --noEmit && npm run build && npm test -- --run
git add ...
git commit -m "feat: refactor parte 2 — EstrategiasContext isolado"
git push origin claude/add-usestate-comments-evQWg
git checkout main && git merge claude/add-usestate-comments-evQWg --no-edit && git push origin main
git checkout claude/add-usestate-comments-evQWg
```

---

## Parte 3 — RepertorioContext

### useState a mover (21 variáveis, linhas ~305–320 e filtros espalhados)

```
repertorio, buscaRepertorio,
filtroOrigem, filtroEstilo, filtroTonalidade, filtroEscala,
filtroCompasso, filtroAndamento, filtroEstrutura, filtroEnergia,
filtroInstrumentacao, filtroDinamica,
compassosCustomizados, tonalidadesCustomizadas, andamentosCustomizados,
escalasCustomizadas, estruturasCustomizadas, dinamicasCustomizadas,
energiasCustomizadas, instrumentacaoCustomizada,
(+ viewMode de repertório, accordionAberto, musicaEditando, buscaEstilo)
```

### Consumer principal
`ModuloRepertorio.tsx` — já em TypeScript.

### Observação importante
`repertorio` é referenciado em outros módulos (TelaPrincipal, ModuloAtividades para vincular música). Durante a migração, manter `repertorio` também no `ctx` antigo via proxy/bridge até que esses consumers sejam migrados.

---

## Parte 4 — AtividadesContext

### useState a mover (14 variáveis)
```
atividades, atividadeEditando, atividadeVinculandoMusica,
novoRecursoUrlAtiv, novoRecursoTipoAtiv, modoVisAtividades,
modalAdicionarAoPlano, filtroTagAtividade, filtroFaixaAtividade,
filtroConceitoAtividade, buscaAtividade, pendingAtividadeId,
modalNovaMusicaInline, novaMusicaInline
```

### Dependência
Usa `repertorio` do RepertorioContext (Parte 3 deve estar feita).

---

## Parte 5 — SequenciasContext + HistoricoContext

### SequenciasContext (9 variáveis)
```
sequencias, sequenciaEditando, sequenciaDetalhe,
filtroEscolaSequencias, filtroUnidadeSequencias, filtroPeriodoSequencias,
buscaProfundaSequencias, modalVincularPlano, buscaPlanoVinculo
```
Funções: `novaSequencia`, `salvarSequencia`, `excluirSequencia`,
         `atualizarRascunhoSlot`, `desvincularPlano`, `vincularPlanoAoSlot`

### HistoricoContext (5 variáveis)
```
hmFiltroTurma, hmFiltroInicio, hmFiltroFim, hmFiltroBusca, hmModalMusica
```

### Consumer
`ModuloSequencias.tsx` e `ModuloHistoricoMusical.tsx`

---

## Parte 6 — AnoLetivoContext

### useState a mover (28 variáveis — inclui turmas, escolas, faixas, conceitos, unidades)
```
anosLetivos, anoPlanoAtivoId, planejamentoAnual,
mostrandoFormNovoAno, formNovoAno, periodoExpId, periodoEditForm,
adicionandoPeriodoAno, formNovoPeriodo,
conceitos, unidades, faixas, tagsGlobais,
modalTurmas, anoLetivoSelecionadoModal,
gtAnoNovo, gtAnoSel, gtEscolaNome, gtEscolaSel,
gtSegmentoNome, gtSegmentoSel, gtTurmaNome,
mostrarArquivados,
modalNovaEscola, novaEscolaNome, novaEscolaAnoId,
modalNovaFaixa, novaFaixaNome,
eventosEscolares
```

### Observação importante
`anosLetivos`, `conceitos`, `unidades`, `faixas` são usados em MUITOS outros módulos. Manter bridge no ctx antigo até que todos os consumers sejam migrados.

### Consumer principal
`ModuloAnoLetivo.tsx`

---

## Parte 7 — CalendarioContext (inclui Registro Pós-Aula)

### useState a mover (27 variáveis)

**Calendário (16):**
```
dataCalendario, semanaResumo, modoResumo, dataDia, diasExpandidos,
gradesSemanas, dragActiveIndex, dragOverIndex,
modalGradeSemanal, gradeEditando,
periodoDias, dataInicioCustom, dataFimCustom,
modalRegistroRapido, rrData, rrAnoSel, rrEscolaSel, rrPlanosSegmento, rrTextos
```

**Registro Pós-Aula (12):**
```
modalRegistro, novoRegistro, verRegistros, registroEditando,
regAnoSel, regEscolaSel, regSegmentoSel, regTurmaSel,
filtroRegAno, filtroRegEscola, filtroRegSegmento, filtroRegTurma,
buscaRegistros, ytPreviewId
```

### Consumer principal
`TelaCalendario.tsx`

---

## Parte 8 — PlanosContext (o maior)

### useState a mover (25 variáveis)
```
planos, planoSelecionado, planoEditando, planoParaRegistro,
modoEdicao, formExpandido, modoVisualizacao, ordenacaoCards,
busca, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel,
filtroEscola, filtroTag, filtroFavorito, filtroStatus,
novoConceito, adicionandoConceito, novaUnidade, adicionandoUnidade,
novoRecursoUrl, novoRecursoTipo, materiaisBloqueados,
dadosCarregados (flag inicialização)
```

### Funções a mover (as mais importantes)
```
novoPlano, salvarPlano, editarPlano, excluirPlano, toggleFavorito,
adicionarAtividadeRoteiro, removerAtividadeRoteiro, atualizarAtividadeRoteiro,
sugerirBNCC, adicionarConceitoNovo, adicionarUnidadeNova,
adicionarDataEdicao, removerDataEdicao, adicionarRecurso, removerRecurso,
triggerSalvo, baixarBackup
```

### Consumer principal
`TelaPrincipal.tsx` + vários modais

---

## Parte 9 — Limpeza final

Após todas as partes anteriores:
1. Verificar se `BancoPlanosContext.ts` ainda é necessário ou pode ser removido
2. `BancoPlanos.tsx` deve conter apenas: providers compostos + UI global (darkMode, statusSalvamento, modalConfirm, modalConfiguracoes)
3. Remover campos vazios do objeto `ctx` antigo
4. Atualizar `src/types/index.ts` — remover campos migrados de `BancoPlanosContextValue`
5. Atualizar `CONTEXT_REFACTOR.md` marcando como concluído

---

## Checklist de progresso

- [x] Parte 1 — Infraestrutura (`src/contexts/`, `ModalContext.tsx`, atualizar `App.tsx`) — commit `b576530`
- [x] Parte 2 — `EstrategiasContext.tsx` + migrar `ModuloEstrategias.tsx` — commit `7800dca`
- [x] Parte 3 — `RepertorioContext.tsx` + migrar `ModuloRepertorio.tsx` — commit `00dc0ca`
- [x] Parte 4 — `AtividadesContext.tsx` + migrar `ModuloAtividades.tsx` — commit `70278bf`
- [x] Parte 5 — `SequenciasContext.tsx` + `HistoricoContext.tsx` — commit `05fda84`
- [ ] Parte 6 — `AnoLetivoContext.tsx` + migrar `ModuloAnoLetivo.tsx`
- [ ] Parte 7 — `CalendarioContext.tsx` + migrar `TelaCalendario.tsx`
- [ ] Parte 8 — `PlanosContext.tsx` + migrar `TelaPrincipal.tsx`
- [ ] Parte 9 — Limpeza final

---

## Informações do projeto

- **Repositório**: https://github.com/rmribeiro2024/MusiLab
- **App online**: https://rmribeiro2024.github.io/MusiLab/
- **Branch de trabalho**: `claude/add-usestate-comments-evQWg`
- **Stack**: React 18 + Vite 5 + Tailwind CSS + Supabase + TypeScript
- **Testes**: Vitest + React Testing Library (35 testes em `src/tests/`)

## Comandos úteis

```bash
npm run dev          # servidor local → http://localhost:5173
npm run build        # build de produção
npm test -- --run    # rodar testes (sem watch)
npx tsc --noEmit     # verificar erros TypeScript
```

## Arquivo .env (NÃO vai para o git — recriar se sumir)

```
VITE_SUPABASE_URL=https://eufwttfndthjrvxtturl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Znd0dGZuZHRoanJ2eHR0dXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mzg4NjgsImV4cCI6MjA4NzIxNDg2OH0.-4soPgR28aL_EwjJXcrBzfLGF4MblxG2iDZC2LD6B0Y
```
