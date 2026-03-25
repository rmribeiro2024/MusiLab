# Melhorias — 2026-03-11

## Melhoria 1 — Detectar músicas do repertório citadas no plano ✅ `fc7292e`

**O que foi feito:**
- `src/lib/detectarMusicas.ts` (novo): matching por string normalizada em todos os campos de texto do plano
- `PlanosContext`: chama `detectarMusicasNoPlano()` após salvar e expõe `musicasDetectadas` + `limparMusicasDetectadas`
- `TelaPrincipal`: banner âmbar com chips das músicas detectadas (origem como tooltip) + botão dispensar

---

## Melhorias 2–8 — Classificação, modal e modelo de dados para músicas ✅ `bcfc51b`

**O que foi feito:**

### Modelo de dados (Melhoria 7 — extensível para usos futuros)
- `VinculoMusicaPlano` separa a entidade Música da relação de uso (plano ↔ música)
- Campos: `musicaId, titulo, autor, atividadeIdx? (futuro), origemDeteccao, confirmadoPor, confirmadoEm`
- `Plano.musicasVinculadasPlano?: VinculoMusicaPlano[]` — permite depois responder: em quais planos a música foi usada, por quais turmas, quantas vezes

### Classificação (Melhoria 2)
- `ClassificacaoMusica = 'encontrada' | 'ambigua' | 'nova'`
- Fase 1: match de títulos do repertório no texto → agrupa sobrepostos → `ambigua`; único → `encontrada`
- Fase 2: extração de citações entre aspas não cobertas → `nova`

### Automação para encontradas (Melhoria 4)
- Ao salvar, todas `encontrada` (match único) são auto-vinculadas (`confirmadoPor: 'auto'`)
- Sem necessidade de ação manual para casos claros

### Modal pós-save (Melhoria 3)
- `ModalMusicasDetectadas.tsx`: 3 seções coloridas
  - ✅ Encontradas: "Vinculada automaticamente" + botão Desfazer
  - ⚠️ Ambíguas: picker de candidatas + Vincular / Ignorar (Melhoria 6)
  - 🆕 Novas: campo autor + Adicionar ao Repertório / Revisar depois / Ignorar (Melhorias 5)

### Seção visual no form (Melhoria 8)
- "Músicas vinculadas ao plano" no formulário Nova Aula
- Lista de vínculos com tag `auto` + botão × para remover

---

---

## Módulo Estratégias — Fase 1 completa ✅ `863ae6f`

### Contexto
Baseado no documento `MusiLab_ClaudeCode_20Semanas-2.docx` (Fase 1, Semanas 2–7).
Campos antigos (`categoria`, `funcao`, `objetivos`, `faixaEtaria`) **preservados** — campos novos adicionados ao lado.

### Novos campos na interface `Estrategia` (retrocompatíveis)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `dimensoes` | `string[]` | `'Musical'`, `'Condução'`, `'Cultura de Sala de Aula'` |
| `origem` | `string` | Referência pedagógica: Kodály, RCPPM... |
| `variacoes` | `string` | Campo separado da descrição, em destaque na modal |
| `tempoEstimado` | `string` | Duração estimada da estratégia |
| `contadorUso` | `number` | Incrementa a cada plano salvo que use a estratégia |
| `historicoUso` | `HistoricoUsoEstrategia[]` | `{ planoId, planoTitulo, data }` por uso |

### Formulário (`ModuloEstrategias.tsx`)
- 3 botões visuais clicáveis para dimensões: **violeta** Musical / **azul** Condução / **verde** Cultura
- Multi-seleção; destaques com borda e fundo coloridos ao selecionar
- Campo **Tempo Estimado** + **Origem / Referência** lado a lado (opcionais)
- Campo **Variações Conhecidas** (textarea, opcional)
- Campos originais categoria, função, objetivos e faixa etária **mantidos abaixo**

### Cards (listagem)
- Badges de dimensão coloridos acima dos badges originais
  - `Musical` → violeta; `Condução` → azul; `Cultura de Sala de Aula` → abrev. `Cultura` (tooltip completo)
- Badge 🕐 `tempoEstimado` quando preenchido
- Rodapé: **`Usada N×`** (violeta) ou **`Não usada ainda`** (cinza) + **✨** quando tem variações
- Botão **👁** (detalhes) ao lado de ✏️ / 📦 / 🗑️

### Filtros
- Select **Dimensão** adicionado ao lado dos filtros existentes (não substituiu nenhum)
- Busca por texto agora inclui `origem` e `variacoes`
- "Limpar filtros" também reseta `filtroDimensao`

### Modal de detalhes (👁)
- Abre sem entrar no modo edição
- Header: nome + badges de dimensão + meta (tempo, origem, categoria, função, contador)
- **Variações** em destaque com fundo violeta quando preenchidas
- Descrição HTML sanitizada com `sanitizar()`
- Objetivos pedagógicos listados com 🎯
- **Histórico de uso**: lista plano + data em pt-BR; estado vazio amigável
- Botões Fechar e Editar; fecha ao clicar fora

### Dashboard colapsável (📊 Ver painel)
- Começa **fechado** — professor abre quando quiser
- Grid 2×2 (mobile) / 1×4 (desktop): total ativas + conta por dimensão
- **Mais usadas**: top 3 por `contadorUso` com contador; mensagem amigável se vazio
- **Nunca usadas**: lista das ativas com `contadorUso === 0` (máx 5); oculta quando todas foram usadas
- Cálculo direto no render — sem `useState` extra

### Contador automático de mielinização (`EstrategiasContext` + `PlanosContext`)
- `registrarUsoEstrategia(id, planoId, planoTitulo)` — anti-duplicata por `planoId`
- `PlanosContext.salvarPlano` importa `useEstrategiasContext` e, ao salvar, coleta todos os nomes em `atividade.estrategiasVinculadas[]` de todas as atividades do roteiro, encontra os IDs correspondentes e chama `registrarUsoEstrategia`
- Hierarquia de providers respeitada: `EstrategiasProvider` envolve `PlanosProvider` → sem circular dependency

---

## Melhorias 9–10 — Picker manual + relação bidirecional ✅ `13cc0af`

### Seção "Músicas vinculadas" completa (Melhoria 9)
- Sempre visível no form (mesmo com lista vazia)
- Mensagem "Nenhuma música vinculada ainda" quando vazia
- Botão **+ Adicionar** abre picker de busca no repertório (≥ 2 chars)
- Resultados filtram músicas já vinculadas; clique adiciona com `origemDeteccao: 'manual'`
- Tags visuais: `auto` (verde) para auto-detectadas, `manual` (cinza) para adições manuais

### Relação bidirecional plano ↔ repertório (Melhoria 10)
- `vincularMusicaAoPlano` e `desvincularMusicaDoPlano` agora sincronizam `musica.planosVinculados`
- Auto-link no `salvarPlano` também atualiza `planosVinculados`
- Permite responder no futuro:
  - Em quais planos uma música foi usada? → `musica.planosVinculados`
  - Repertório mais usado no mês? → contar `planosVinculados`
  - Planos que trabalharam música X? → filtrar por `planosVinculados`
  - Base para sugestões IA e histórico de turma


