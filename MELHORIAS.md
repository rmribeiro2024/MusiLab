# MusiLab — Análise e Sugestões de Melhoria

> Gerado em: 2026-03-01
> Branch de referência: `claude/add-usestate-comments-evQWg`
> Estado do projeto: migração modular concluída

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
- `jspdf` (~15 MB descompactado) carregado no bundle inicial mesmo sem uso de PDF
- LocalStorage com risco de estouro (limite 5–10 MB) em contas com muitos dados
- Sem `ErrorBoundary` — um bug derruba toda a tela
- Sem loading state para exportação de PDF e operações async

### Menores
- Projeto em JavaScript puro — sem tipos nem autocomplete para os 172 estados
- Todos os módulos carregam juntos — sem code splitting por rota

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

#### 2. Extrair os modais/seções restantes do BancoPlanos.jsx
Ainda embutido no arquivo:

| Seção | Linhas estimadas |
|---|---|
| Modal de detalhes do plano | ~800 |
| Gerenciamento de turmas/escolas | ~400 |
| Grade semanal | ~300 |
| Registro pós-aula | ~200 |
| Configurações | ~160 |

**Solução:** `ModalDetalhePlano.jsx`, `GerenciadorTurmas.jsx`, `GradeSemanal.jsx`, etc.

---

#### 3. Error Boundary
**Problema:** Zero tratamento de erro na UI. Um bug em qualquer módulo derruba toda a tela.
**Solução:** Componente simples envolvendo cada módulo:

```jsx
<ErrorBoundary fallback={<div>Erro no calendário. Recarregue.</div>}>
  <TelaCalendario />
</ErrorBoundary>
```

**Esforço:** Baixo. **Impacto:** Alto.

---

### PRIORIDADE MÉDIA

#### 4. Memoização de handlers e cálculos pesados
**Problema:** Nenhum `useCallback` ou `React.memo` no projeto. Handlers recriados a cada render.

```jsx
// Hoje — recriado em cada render
<button onClick={() => deletarPlano(id)}>

// Com useCallback — recriado só quando id muda
const handleDelete = useCallback(() => deletarPlano(id), [id])
```

Candidatos a `React.memo`: `LinhaPlano`, itens de lista, modais.

---

#### 5. Lazy loading do jsPDF
**Problema:** `jspdf` (~15 MB) carregado no bundle inicial mesmo sem exportar PDF.
**Solução:**

```js
// Carrega só quando o usuário clicar em "Exportar PDF"
const { exportarPlanoPDF } = await import('./utils/pdf')
```

**Ganho estimado:** −150 kB no bundle inicial (gzip).

---

#### 6. Consolidar os 13 useEffects de sincronização
**Problema:** 13 `useEffect` separados chamando `syncToSupabase`. Qualquer digitação dispara 13 timers de 2s.
**Solução:** Um único `useEffect` observando todos os estados, sincronizando em lote.

---

#### 7. Migrar localStorage para IndexedDB
**Problema:** Limite de 5–10 MB. Planos com HTML rico podem estourar.
**Solução:** Biblioteca `idb` (~1 kB) com API idêntica ao localStorage atual.
**Ganho:** Suporte a 50 MB+, assíncrono, sem bloqueio da UI.

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

**Ganho estimado:** Bundle inicial pode cair de 1.057 kB para ~400 kB.

---

## Resumo Executivo

| # | Melhoria | Esforço | Impacto |
|---|---|---|---|
| 1 | Dividir contextos de estado | Alto | Alto |
| 2 | Extrair modais restantes do BancoPlanos | Médio | Alto |
| 3 | Error Boundary | **Baixo** | Alto |
| 4 | useCallback / React.memo | Médio | Médio |
| 5 | Lazy load jsPDF | **Baixo** | Médio |
| 6 | Consolidar useEffects de sync | Médio | Médio |
| 7 | IndexedDB (substituir localStorage) | Médio | Médio |
| 8 | Testes automatizados (Vitest) | Alto | Alto |
| 9 | TypeScript | Alto | Médio |
| 10 | Code splitting por módulo | **Baixo** | Alto |

> **Começo recomendado:** itens 3, 5 e 10 — baixo esforço, alto impacto imediato.
