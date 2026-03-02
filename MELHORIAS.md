# MusiLab — Análise e Sugestões de Melhoria

> Gerado em: 2026-03-01
> Branch de trabalho: `claude/add-usestate-comments-evQWg`
> Estado do projeto: migração modular concluída
> Última atualização: 2026-03-02 — melhorias #2 e #7 implementadas

---

## Estado Atual (pós-migração)

| Arquivo | Linhas |
|---|---|
| `BancoPlanos.jsx` | ~4.999 |
| `TelaPrincipal.jsx` | 1.403 |
| `ModuloRepertorio.jsx` | 840 |
| `TelaCalendario.jsx` | 580 |
| `ModuloSequencias.jsx` | 528 |
| `ModuloHistoricoMusical.jsx` | 500 |
| `ModuloAtividades.jsx` | 451 |
| `ModuloEstrategias.jsx` | 404 |
| `ModuloAnoLetivo.jsx` | 358 |
| `ModuloLista.jsx` | 611 |
| `RichTextEditor.jsx` | 72 |

**Bundle de produção:** 1.057 kB (298 kB gzip) — `npm run build` passa sem erros.

---

## Problemas Identificados

### Críticos
- `BancoPlanos.jsx` ainda tem **172 variáveis de estado** num único componente
- **Zero testes** automatizados — refatorações podem quebrar sem avisar
- **Zero memoização** — useCallback, useMemo, React.memo não usados
- **13 useEffects** de sincronização separados, cada um disparando timer de 2s

### Moderados
- ~~`jspdf` (~15 MB descompactado) carregado no bundle inicial mesmo sem uso de PDF~~ ✅ Resolvido na melhoria #5
- LocalStorage com risco de estouro (limite 5–10 MB) em contas com muitos dados
- ~~Sem `ErrorBoundary` — um bug derruba toda a tela~~ ✅ Resolvido na melhoria #3
- Sem loading state para exportação de PDF e operações async

### Menores
- Projeto em JavaScript puro — sem tipos nem autocomplete para os 172 estados
- ~~Todos os módulos carregam juntos — sem code splitting por rota~~ ✅ Resolvido na melhoria #10

---

## Sugestões de Melhoria (priorizadas)

### PRIORIDADE ALTA

#### 1. Dividir o estado em contextos menores
**Problema:** 172 `useState` num componente. Qualquer mudança re-renderiza tudo.
**Solução:** Criar contextos separados por domínio:

```
BancoPlanosContext      → planos e edição (já existe, expandir)
RepertorioContext       → músicas, filtros de repertório
EstrategiasContext      → estratégias e categorias
SequenciasContext       → sequências didáticas
AnoLetivoContext        → anos letivos, escolas, feriados
```

**Ganho:** Re-render isolado por módulo — performance proporcional ao tamanho da tela aberta.

---

#### 2. Extrair os modais/seções restantes do BancoPlanos.jsx ✅ IMPLEMENTADO (2026-03-02)
**Commit:** `feat: extrai 13 modais inline para src/components/modals/ (melhoria #2)`

**O que foi feito:**
- 13 blocos de JSX inline removidos de `BancoPlanos.jsx`
- 7 novos arquivos criados em `src/components/modals/`:
  - `ModalRegistroPosAula.jsx` (~200 linhas) — registro pós-aula com seleção em 4 níveis e histórico
  - `ModalGestaoTurmas.jsx` (~140 linhas) — gerenciamento de anos letivos, escolas, segmentos e turmas
  - `ModalEventosEscolares.jsx` (~100 linhas) — cadastro e edição de eventos escolares
  - `ModalVincularMusica.jsx` (~40 linhas) — vincular música do repertório a uma atividade
  - `ModalImportarAtividade.jsx` (~55 linhas) — importar atividade do banco para um plano
  - `ModalImportarMusica.jsx` (~30 linhas) — importar música como atividade em um plano
  - `ModalGradeSemanal.jsx` (~160 linhas) — editor completo de grade semanal (dias × horários × turmas)
- 6 modais que tinham arquivos em `/modals/` mas ainda renderizavam inline agora conectados via `<ModalXxx />`:
  - `ModalConfiguracoes`, `ModalAdicionarAoPlano`, `ModalRegistroRapido`,
    `ModalNovaMusicaInline`, `ModalTemplatesRoteiro`, `ModalNovaFaixa`
- Código morto removido (`{false && (...)}` de modal excluído, ~310 linhas)
- Todos os modais usam o padrão `useBancoPlanos()` + `if (!state) return null`

**Resultado:**
| | Antes | Depois |
|---|---|---|
| `BancoPlanos.jsx` | ~4.999 linhas | **~3.328 linhas** |
| Modais inline | 13 | **0** |
| Arquivos em `/modals/` | 7 | **14** |
| Bundle inicial (gzip) | 140 kB | 142 kB (+2 kB — modais sempre estiveram no bundle principal) |

---

#### 3. Error Boundary ✅ IMPLEMENTADO (2026-03-01)
**Commit:** `e88334d feat: implementa ErrorBoundary por módulo (melhoria #3)`

**O que foi feito:**
- Criado `src/components/ErrorBoundary.jsx` — componente reutilizável com prop `modulo`
- Removida classe `ErrorBoundary` inline duplicada do `App.jsx`
- Todos os 9 módulos agora têm boundary individual no `BancoPlanos.jsx`:
  Início, Resumo do Dia, Calendário, Histórico Musical, Meu Ano Letivo,
  Estratégias, Atividades, Sequências, Repertório
- Fallback inline (não tela cheia) com botões "Tentar novamente" e "Recarregar MusiLab"
- Crash em um módulo não derruba mais o app inteiro

---

### PRIORIDADE MÉDIA

#### 4. Memoização de handlers e cálculos pesados ✅ IMPLEMENTADO (2026-03-01)
**Commit:** `c3dc009 perf: useCallback em handlers críticos + React.memo em LinhaPlano e CardAtividade (melhoria #4)`

**O que foi feito:**

`BancoPlanos.jsx`:
- `toggleFavorito` → updates funcionais + `useCallback([])`
- `excluirPlano`, `excluirAtividade` → `setX(prev => ...)` + `useCallback([])`
- `editarPlano`, `abrirModalRegistro`, `handleDragStart`, `handleDragEnter` → `useCallback([])`

`TelaPrincipal.jsx`:
- `LinhaPlano` movido para nível de módulo, aceita handlers como props, envolto em `React.memo`

`ModuloAtividades.jsx`:
- `CardAtividade` movido para nível de módulo, aceita handlers como props, envolto em `React.memo`
- `atividadesFiltradas` envolvido em `useMemo`

---

#### 5. Lazy loading do jsPDF ✅ IMPLEMENTADO (2026-03-01)
**Commit:** `b9559dd perf: lazy load do jsPDF sob demanda (melhoria #5)`

**O que foi feito:**
- Removido `import { jsPDF } from 'jspdf'` estático do topo de `App.jsx` e `utils/pdf.js`
- Adicionado `const { jsPDF } = await import('jspdf')` dentro de cada função async
  (`exportarPlanoPDF` e `exportarSequenciaPDF`) em ambos os arquivos
- Vite cria automaticamente chunk separado: `jspdf.es.min.js`

**Resultado real (medido):**
| | Antes | Depois |
|---|---|---|
| Bundle inicial (gzip) | 298 kB | 180 kB |
| jsPDF | embutido | chunk separado 118 kB gzip |
| **Redução** | — | **−118 kB (−40%)** |

---

#### 6. Consolidar os useEffects de sincronização ✅ IMPLEMENTADO (2026-03-01)
**Commit:** `da6427b perf: consolida 9 useEffects de sync em 1 com detecção de mudança (melhoria #6)`

**O que foi feito:**
- Substituídos 9 `useEffect` individuais (1 por tabela) por 1 único efeito
- Adicionado `_prevSyncData = useRef(null)` para comparar por referência qual tabela realmente mudou
- Na primeira execução após carga (`prev === null`), o efeito retorna sem sincronizar (evita regravar tudo)
- Em execuções seguintes, itera `Object.entries(atual)` e chama `syncDelay` só nas tabelas com referência alterada
- Config `useEffect` (tabela `cfg`) permanece separado — tem dependências diferentes

**Resultado:** Qualquer edição dispara no máximo 1 timer de 2s (a tabela que mudou), em vez de 9 simultâneos.

---

#### 7. Migrar localStorage para IndexedDB ✅ IMPLEMENTADO (2026-03-02)
**Commit:** `feat: migra localStorage para IndexedDB via idb (melhoria #7)`

**O que foi feito:**
- Instalado `idb@8.0.3` (~1 kB gzip)
- Criado `src/lib/db.js` — wrapper com cache síncrono em memória:
  - `dbInit()` — carrega todos os dados do IndexedDB no cache antes do React montar; migra automaticamente dados existentes do localStorage para o IndexedDB na primeira execução
  - `dbGet(key)` — leitura síncrona do cache (substitui `localStorage.getItem`)
  - `dbSet(key, value)` — escrita síncrona no cache + persist async no IndexedDB (substitui `localStorage.setItem`)
  - `dbDel(key)` — remoção síncrona do cache + persist async (substitui `localStorage.removeItem`)
  - `dbSize()` — tamanho estimado em bytes (para o aviso de armazenamento)
- `src/main.jsx` — `await dbInit()` antes de `ReactDOM.createRoot(...).render()`
- `src/utils/helpers.js` — `lerLS`/`salvarLS` agora usam `dbGet`/`dbSet`
- `src/components/BancoPlanos.jsx` — 50 chamadas substituídas (22 `getItem`, 27 `setItem`, 1 `removeItem`)
- `src/components/ModuloRepertorio.jsx` — 17 chamadas `setItem` substituídas
- `src/components/TelaPrincipal.jsx` e `ModuloLista.jsx` — cálculo de tamanho usa `dbSize()`
- Compatibilidade total: dados do localStorage antigo migrados automaticamente no primeiro acesso

**Resultado:**
| | Antes | Depois |
|---|---|---|
| Limite de armazenamento | 5–10 MB | **50+ MB** (IndexedDB) |
| Bloqueio da UI ao salvar | Sim (sync) | **Não** (async, fire-and-forget) |
| Migração de dados existentes | — | **Automática** |
| Bundle gzip | 142 kB | **143.7 kB** (+1.7 kB pelo idb) |

---

### PRIORIDADE BAIXA (crescimento futuro)

#### 8. Testes automatizados (Vitest + React Testing Library)
**Problema:** Zero testes. Refatorações podem quebrar fluxos críticos.
**Stack sugerida:**
- `Vitest` — já compatível com Vite, zero configuração extra
- `React Testing Library` — testa comportamento, não implementação

**Fluxos críticos para começar:**
1. Criar plano de aula
2. Exportar PDF
3. Sincronizar dados com Supabase

---

#### 9. TypeScript (migração gradual)
**Problema:** 172 estados sem tipos. Difícil saber o formato exato de `plano`, `atividade`, `estrategia`.
**Abordagem:** Renomear `.jsx` → `.tsx` um arquivo por vez, começando pelos utilitários.
**Ganho:** Autocomplete, detecção de erros em desenvolvimento, documentação automática dos tipos de dados.

---

#### 10. Code splitting por módulo
**Problema:** Todos os 14 componentes carregam juntos na abertura do app.
**Solução:**

```jsx
const ModuloRepertorio = lazy(() => import('./ModuloRepertorio'))
const TelaCalendario   = lazy(() => import('./TelaCalendario'))
```

#### 10. Code splitting por módulo ✅ IMPLEMENTADO (2026-03-01)
**Commit:** `27b225d perf: code splitting por módulo com React.lazy + Suspense (melhoria #10)`

**O que foi feito:**
- 9 imports estáticos convertidos para `React.lazy()` no `BancoPlanos.jsx`
- `Suspense` com fallback `<CarregandoModulo />` adicionado dentro de cada `ErrorBoundary`
- Vite criou 10 chunks independentes — cada módulo carrega só quando o usuário navega

**Resultado real (medido):**
| | Antes | Após #5 | Após #10 |
|---|---|---|---|
| Bundle inicial (gzip) | 298 kB | 180 kB | **140 kB** |
| Aviso chunk >500 kB | ⚠️ | ⚠️ | ✅ **eliminado** |
| Chunks separados | 0 | 1 | **10** |
| **Redução total vs. início** | — | −40% | **−53%** |

---

## Resumo Executivo

| # | Melhoria | Esforço | Impacto |
|---|---|---|---|
| # | Melhoria | Esforço | Impacto | Status |
|---|---|---|---|---|
| 1 | Dividir contextos de estado | Alto | Alto | 🟡 Adiado (decisão do usuário) |
| 2 | Extrair modais restantes do BancoPlanos | Médio | Alto | ✅ **Feito** |
| 3 | Error Boundary | **Baixo** | Alto | ✅ **Feito** |
| 4 | useCallback / React.memo | Médio | Médio | ✅ **Feito** |
| 5 | Lazy load jsPDF | **Baixo** | Médio | ✅ **Feito** |
| 6 | Consolidar useEffects de sync | Médio | Médio | ✅ **Feito** |
| 7 | IndexedDB (substituir localStorage) | Médio | Médio | ✅ **Feito** |
| 8 | Testes automatizados (Vitest) | Alto | Alto | 🔜 Pendente |
| 9 | TypeScript | Alto | Médio | 🔜 Pendente |
| 10 | Code splitting por módulo | **Baixo** | Alto | ✅ **Feito** |

> **Próximo recomendado:** #8 (Testes Vitest) ou #1 (dividir contextos de estado).
