# MusiLab — Histórico de Mudanças

> Última atualização: 2026-03-08 (Fase 1 AplicacaoAula concluída — commit `0625702`)

---

## Bugs Corrigidos

### 1. Botão ⚙️ Configurações não abria
**Arquivo:** `src/components/modals/ModalConfiguracoes.tsx`
**Causa:** O modal lia `modalConfiguracoes` de `usePlanosContext()`, mas esse estado está no `useBancoPlanos()` (contexto antigo).
**Correção:** Trocado `usePlanosContext` por `useBancoPlanos` para `modalConfiguracoes`, `setModalConfiguracoes`, `baixarBackup` e `restaurarBackup`.

---

### 2. Indicador "Salvando" ficava preso
**Arquivo:** `src/components/BancoPlanos.tsx`
**Causa:** O `triggerSalvo()` com usuário logado dependia 100% do `onSyncStatus` do Supabase para resolver. Se a rede estivesse lenta ou o callback não chegasse, ficava preso em "salvando" para sempre.
**Correção:** Adicionado timeout de fallback de 16s que resolve o status automaticamente caso o Supabase não responda.

---

### 3. Consumo excessivo de Disk I/O no Supabase
**Arquivo:** `src/components/BancoPlanos.tsx`
**Causa:** O `syncDelay` enviava dados ao Supabase a cada 2 segundos, gerando muitas escritas e esgotando o budget de Disk I/O do plano gratuito.
**Correção:** Delay aumentado de **2s → 15s**. Dados continuam salvos imediatamente no IndexedDB local — a nuvem sincroniza após 15s de inatividade.

---

### 4. ModalTemplatesRoteiro com contexto errado
**Arquivo:** `src/components/modals/ModalTemplatesRoteiro.tsx`
**Causa:** `modalTemplates`, `setModalTemplates`, `templatesRoteiro`, `setTemplatesRoteiro`, `nomeNovoTemplate`, `setNomeNovoTemplate` eram buscados de `usePlanosContext()` mas estão no `useBancoPlanos()`.
**Correção:** Esses estados movidos para `useBancoPlanos`. `planoEditando` e `setPlanoEditando` mantidos no `usePlanosContext`.

---

### 5. ModalRegistroRapido com contexto errado
**Arquivo:** `src/components/modals/ModalRegistroRapido.tsx`
**Causa:** `sugerirPlanoParaTurma` e `salvarRegistroRapido` eram buscados de `usePlanosContext()` mas estão no `useBancoPlanos()`.
**Correção:** Essas funções movidas para `useBancoPlanos`. `planos` mantido no `usePlanosContext`.

---

## Melhorias Implementadas

### 6. Campo "O que poderia ter sido melhor" no Registro Pós-Aula
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Adicionado textarea com borda laranja entre "❌ O que não funcionou" e "💡 Ideias para a próxima aula"
- Campo exibido no histórico de registros
- Campo incluído na busca textual do histórico
- Armazenado em `novoRegistro.poderiaMelhorar`

---

### 7. Ano letivo auto-selecionado ao abrir o Registro Pós-Aula
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Ao abrir o modal, busca automaticamente o ano letivo com `status: 'ativo'`
- Se não encontrar, seleciona o mais próximo do ano atual
- Evita que o professor tenha que selecionar o ano manualmente toda vez

---

### 8. Escola, segmento e turma pré-selecionados no Registro Pós-Aula
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Ao abrir o registro de um plano, o sistema cruza `plano.escola` com os nomes das escolas cadastradas nos anos letivos
- Cruza `plano.faixaEtaria` (array) com os nomes dos segmentos cadastrados
- Pré-seleciona automaticamente: ano letivo → escola → segmento → turma
- Fallback: se não encontrar a escola, seleciona só o ano letivo ativo

---

### 9. Redesign completo do ModalRegistroPosAula
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Modal transformado em janela flutuante drag-and-drop (posição fixa, não centralizado com overlay)
- Controles de janela no header: **— minimizar**, **⤢ maximizar**, **✕ fechar**
  - Minimizar: janela encolhe para barra de 300px no canto inferior direito; clique restaura
  - Maximizar: janela ocupa 100vw/100vh, ícone muda para ⊡
- **Drag:** arrastar pelo header move a janela livremente; cursor `grab`; botões têm `e.stopPropagation()`
- **Resize:** 8 alças invisíveis (N, S, E, W, NE, NW, SE, SW) com cursors corretos; tamanho mínimo 360×300px
- Tamanho padrão: 512×600px; abre centralizado na tela
- Overlay escurecido (rgba 0,0,0,0.4) só exibido no modo normal (não no minimizado/maximizado)
- Header: `linear-gradient(135deg, #1e293b, #334155)`, padding 22px 20px 18px, título 17px/800
- Seleção de turma usa **pills clicáveis** (fundo #475569 quando selecionado) em vez de selects
- **Tabs:** "Novo registro" / "📚 Histórico" com badge de contagem

---

### 10. Campos do Registro Pós-Aula convertidos para Accordion Chips
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Criado componente `AccordionChip` (forwardRef) que expõe `open()` via `useImperativeHandle`
- Cada campo é um chip recolhível com ícone, label uppercase, chevron animado
- Badge ✓ verde aparece quando o campo tem conteúdo
- Fundo uniforme `#f8fafc` e borda `#e2e8f0` (não muda ao preencher — visual limpo)
- **Tab key:** fecha chip atual → abre próximo (autoFocus) → no último, foca botão Salvar
- Ordem final dos chips:
  1. 📋 O que foi realizado *(abre por padrão)*
  2. ✅ O que funcionou bem
  3. ⚠️ O que não funcionou
  4. 🔧 O que poderia ter sido melhor
  5. 👥 Comportamento da turma *(chip especial — ver item 11)*
  6. 📝 Anotações gerais
  7. 💡 Ideias / estratégias
- Botão Salvar: ghost style, ✓ verde, onFocus mostra fundo cinza para Enter-to-save

---

### 11. BehaviorChip — Comportamento da turma com tags clicáveis
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Criado componente `BehaviorChip` separado do `AccordionChip` genérico
- 6 tags clicáveis (seleção múltipla):
  - Focada e participativa
  - Muito dispersa / difícil conduzir
  - Apática / pouco engajamento
  - Instável — alternou bem e mal
  - Tímida / retraída
  - Muito falante / difícil silêncio
- Tags selecionadas: fundo `#f0fdf4` (verde clarinho), texto `#16a34a`, borda `#bbf7d0` — visual sutil
- Tags sem ícones coloridos (removidos por poluição visual)
- Campo livre (textarea) abaixo das tags para descrição personalizada
- Valor final combinado: texto das tags selecionadas + texto livre, separados por `. `

---

### 12. Campo "Anotações gerais" adicionado ao Registro Pós-Aula
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Novo chip 📝 "Anotações gerais" adicionado como penúltimo campo
- Placeholder: "Ex: Aluno Pedro faltou, combinar reposição. Lembrar material para semana que vem..."
- Armazenado em `novoRegistro.anotacoesGerais`
- Exibido no histórico com `RegistroChip` igual aos demais campos
- Incluído na busca textual do histórico

---

### 13. Renomeação e reposicionamento do campo "Próxima Aula"
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Campo renomeado de "Ideias para a próxima aula" → **"Ideias / estratégias"**
  - Justificativa: nem sempre é específico para a próxima aula — pode ser uma ideia geral
- Campo movido para **último** na ordem (após Anotações gerais)
- Ícone mantido: 💡

---

### 14. Remoção do bloco "Preencher rapidamente" (templates rápidos)
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Removido o bloco com 4 templates pré-definidos (🌟 Ótimo engajamento, 🔄 Precisamos revisitar, 🆕 Introdução, ✅ Aula tranquila)
- Justificativa: os templates preenchiam com texto genérico que raramente corresponde ao que realmente aconteceu — o professor acabava reescrevendo tudo de qualquer forma
- O modal agora vai direto: Data da aula → chips accordion → Salvar

---

### 15. Redesign da aba Histórico no ModalRegistroPosAula (Opção A)
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Criado componente `RegistroChip` para exibição readonly (mesmo visual dos chips de edição)
- Ano letivo e escola **pré-selecionados automaticamente** ao abrir o histórico (mesma lógica do Novo Registro)
- Filtro de turma em **pills clicáveis** (mesmo estilo da seleção de turma no Novo Registro), substituindo os 4 selects empilhados
- Registros exibidos como **cards colapsáveis por data**: cabeçalho clicável com data + badge de turma + botões ✏️ 🗑️ + chevron animado
- Ao expandir: chips de leitura apenas para campos preenchidos (campos vazios são omitidos)
- Busca textual mantida, agora inclui campo `anotacoesGerais`
- Estado de expansão gerenciado por `Set<id>` (cada card independente)
- Botões ✏️ e 🗑️ com `e.stopPropagation()` para não colidir com o toggle do card

---

### 16. Implementação de Offline-First com Merge ao Reconectar
**Arquivos:** `src/lib/offlineSync.ts` *(novo)*, `src/components/BancoPlanos.tsx`, `src/components/TelaPrincipal.tsx`

**Problema resolvido:**
- Antes: ao reconectar com Supabase, os dados da nuvem sobrescreviam tudo que havia sido criado/editado offline, com risco de perda
- Depois: merge inteligente — o item com `_updatedAt` mais recente prevalece; itens criados offline que não existem na nuvem são injetados

**Arquivo novo — `src/lib/offlineSync.ts`:**
- `marcarPendente(tabela, id)` — registra IDs pendentes de sync numa fila no IndexedDB (chave `offlineQueue`)
- `limparPendentes(tabela, ids)` — remove da fila após sync bem-sucedido
- `totalPendentes()` — retorna total de itens aguardando sync
- `carimbарTimestamp(item)` — adiciona/atualiza campo `_updatedAt: ISO string` em qualquer item ao salvar
- `mergeOffline(tabela, dadosNuvem, dadosLocais)` — lógica de merge:
  - Item só local (novo offline) → adiciona na nuvem
  - Item nos dois lados → ganha quem tem `_updatedAt` mais recente
  - Item só na nuvem → mantém da nuvem
  - Nuvem retornou `null` (falha) → usa local integralmente
- `useVoltouOnline()` — hook React que retorna `true` por 3s quando o browser dispara o evento `online`

**Mudanças em `BancoPlanos.tsx`:**
- Import de todas as funções do `offlineSync`
- `voltouOnline = useVoltouOnline()` declarado dentro do componente
- Bloco de carga da nuvem substituído: em vez de `setPlanos(planosC)` direto, agora chama `mergeOffline('planos', planosC, planosLocais)` e `mergeOffline('grades_semanas', gradesC, gradesLocais)`
- Se `totalPendentes() > 0` após o merge: sobe imediatamente para Supabase e exibe toast de confirmação
- `dbSet` atualizado para salvar o array mergeado (não mais o bruto da nuvem)
- Novo `useEffect([voltouOnline])`: ao reconectar, sincroniza imediatamente os pendentes e exibe toast
- `carimbарTimestamp` aplicado em:
  - `salvarRegistro()` modo edição — carimba o plano atualizado
  - `salvarRegistro()` modo criação — carimba o plano com novo registro
  - `adicionarAtividadeAoPlano()` — carimba o plano ao vincular atividade
- `marcarPendente('planos', id)` chamado nos 3 pontos acima quando `!userId` (offline)

**Mudanças em `TelaPrincipal.tsx`:**
- Import de `carimbарTimestamp` e `marcarPendente` de `../lib/offlineSync`
- Duplicar plano: `copia` agora recebe `carimbарTimestamp({...})` e chama `marcarPendente` se offline

**Pendência restante:**
- `salvarPlano()` e `novoPlano()` definidos no `PlanosContext` (arquivo não disponível ainda) precisam receber `carimbарTimestamp` para proteger criação/edição de planos do zero quando offline

---

## Pendências Futuras

### Migração: Faixa Etária → Segmento
**Decisão:** Faixa etária e segmento são na prática o mesmo campo ("1º ano", "Infantil", etc.). Decidido manter os dois por enquanto e migrar futuramente.
**Impacto:** Formulário de criação de plano, filtros, registros, relatórios.
**Ação necessária:** Script de migração que copia `faixaEtaria` para `segmento` em todos os planos existentes antes de remover o campo `faixaEtaria`.

### Carimbo de timestamp em PlanosContext
**Arquivo:** `src/contexts/PlanosContext.tsx` (ou onde `salvarPlano`/`novoPlano` estão definidos)
**Ação necessária:**
- Importar `carimbарTimestamp` e `marcarPendente` de `../lib/offlineSync`
- Em `salvarPlano()`: aplicar `carimbарTimestamp(planoEditando)` antes do `setPlanos`
- Em `novoPlano()` ao confirmar criação: aplicar `carimbарTimestamp(novoPlano)` antes do `setPlanos`
- Chamar `marcarPendente('planos', String(id))` quando `!userId`
- Sem isso, edições de planos do zero feitas offline podem ser sobrescritas pela nuvem ao reconectar

---

## Observações Técnicas

- **Contexto antigo (`useBancoPlanos`)** ainda é a fonte de vários estados enquanto a migração para contextos por domínio não termina. Ao criar novos modais, verificar sempre se o estado está no `usePlanosContext` ou no `useBancoPlanos`.
- **IndexedDB** é o armazenamento local principal (migrado do localStorage). Dados persistem entre sessões do navegador. Limite ~50MB.
- **Supabase** sincroniza após 15s de inatividade. Com usuário logado, o `onSyncStatus` confirma o sync. Sem usuário, o fallback local resolve em 400ms.
- **offlineQueue** (chave IndexedDB): fila de IDs pendentes de sync por tabela. Criada pelo `offlineSync.ts`. Apagada automaticamente quando fica vazia.
- **`_updatedAt`** (campo nos itens): timestamp ISO adicionado pelo `carimbарTimestamp()`. Usado pelo `mergeOffline()` para desempate. Itens sem esse campo (criados antes da feature) são tratados como mais antigos — a nuvem prevalece nesses casos, o que é seguro.
- **Alerta de armazenamento crítico (1188%):** o app estava usando ~60MB de 5MB disponíveis no localStorage/IndexedDB. Com Supabase integrado, os dados vivem na nuvem e o local é só cache. Solução imediata: fazer backup pelo botão ⬇ Backup em Configurações e garantir login ativo no Supabase.
- **Branch de trabalho:** `claude/add-usestate-comments-evQWg` — mergear para `main` após cada sessão.

---

## Sessão 2026-03-07 — Estabilização do Supabase + Melhorias

---

### 17. App travava no carregamento quando Supabase estava fora do ar
**Arquivo:** `src/App.tsx`
**Causa:** `supabase.auth.getSession()` ficava pendente indefinidamente quando o servidor retornava erro 522 (connection timeout). O estado `session` nunca saía de `undefined`, mantendo a tela de carregamento para sempre.
**Correção:**
- Adicionado timeout de **8 segundos**: se o Supabase não responder, `session` é forçado para `null` e a tela de login aparece normalmente
- Adicionado botão **"Usar sem login (modo local)"** na tela de login
- Estado `modoLocal` permite abrir o app sem autenticação, usando apenas IndexedDB
- Todos os providers recebem `userId = session?.user?.id ?? ''` (string vazia no modo local)

---

### 18. Modo local não carregava dados do IndexedDB
**Arquivo:** `src/components/BancoPlanos.tsx`
**Causa:** Quando `userId` era vazio (modo local ou sem login), o bloco de carregamento fazia `return` imediatamente com `setDadosCarregados(true)` sem carregar nada — os dados do IndexedDB eram ignorados.
**Correção:** No modo local (`!userId`), agora carrega explicitamente do IndexedDB:
- `dbGet('planosAula')` → `setPlanos`
- `dbGet('gradesSemanas')` → `setGradesSemanas`
- `dbGet('templatesRoteiro')` → `setTemplatesRoteiro`
- Todos os dados já salvos ficam disponíveis sem precisar de login

---

### 19. Diagnóstico e correção do Supabase — Loop de Realtime derrubando o banco
**Problema identificado:** O projeto entrou em estado "Unhealthy" (Database, PostgREST, Auth, Realtime, Storage todos com ⚠️) em 04/Mar/2026.
**Causa raiz (cascata):**
1. Disk I/O esgotado no plano Nano (baseline 43 Mbps, burst 30min/dia) — causado pelo syncDelay de 2s (já corrigido para 15s na sessão anterior)
2. Banco ficou lento → serviço Realtime entrou em loop tentando aplicar migrations a cada 15s
3. Loop de migrations esgotou o pool de 60 conexões do plano Free
4. Auth caiu junto → login passou a retornar erro 522 → app travava no carregamento

**Evidências nos logs:**
- `MigrationsFailedToRun: connection not available after 15000ms` — repetindo dezenas de vezes
- `ABORTED REQ` nos logs de health check do Realtime
- CPU 100% em 04/Mar no gráfico de Infrastructure

**Ações tomadas:**
- Restart do projeto via Settings → General → Restart project (resolve estado Unhealthy imediatamente)
- Database → Publications confirmado: `supabase_realtime` já tinha **0 tables** (nenhuma tabela exposta)
- Realtime desligado no cliente JavaScript via `src/lib/supabase.ts`

---

### 20. Realtime desligado no cliente Supabase
**Arquivo:** `src/lib/supabase.ts`
**O que foi feito:**
- Adicionada opção `realtime: { params: { eventsPerSecond: -1 } }` no `createClient`
- Impede que o cliente JS abra conexão WebSocket com o servidor Realtime
- O MusiLab não usa Realtime (sincronização é via REST normal) — zero impacto funcional
- Reduz consumo de conexões no banco e elimina o loop de migrations que derrubava o serviço

---

### 21. Campo "Próxima aula" com seleção visual no Registro Pós-Aula
**Arquivo:** `src/components/modals/ModalRegistroPosAula.tsx`
**O que foi feito:**
- Adicionado campo **"🗓 Próxima aula"** logo após o chip "💡 Ideias / estratégias"
- Componente `ProximaAulaSelector` com 4 opções de encaminhamento:
  - Iniciar nova aula
  - Revisar / retomar conteúdo
  - Revisar + iniciar nova aula
  - Decidir depois
- Visual estilo C (minimalista com traço lateral): fundo `#eff6ff`, borda `#93c5fd`, texto `#1d4ed8` quando selecionado — azul clarinho
- **Navegação por teclado:** Tab navega entre as 4 opções; Enter seleciona e avança o foco para o botão Salvar
- Valor armazenado em `novoRegistro.proximaAulaOpcao` (string)
- Botão "limpar" discreto no cabeçalho quando há opção selecionada
- Reset incluído no botão de limpar formulário (`proximaAulaOpcao: ''`)

---

---

## Sessão 2026-03-08

---

### 22. Busca na página principal não encontrava atividades do roteiro
**Arquivo:** `src/contexts/PlanosContext.tsx`
**Causa:** A função `buscaAvancada` verificava título, tema, metodologia, objetivo geral, escola, objetivos específicos e habilidades BNCC, mas não percorria o array `atividadesRoteiro` do plano.
**Correção:** Adicionada linha que verifica `nome` e `descricao` de cada atividade do roteiro:
```typescript
const atividadeMatch = (plano.atividadesRoteiro || []).some((a: any) => check(a.nome) || check(a.descricao))
```
**Commit:** `5912964`

---

### 23. Sequências — 4 correções (commit `c39fe8a`)
**Arquivo:** `src/components/ModuloSequencias.tsx`

**23a. Ano letivo não era auto-selecionado ao criar nova sequência**
- Causa: `novaSequencia()` era chamada sem argumento; a função espera `anosLetivos` para encontrar o ano ativo
- Correção: Todas as chamadas passam agora `novaSequencia(anosLetivos)`

**23b. Botão "Excluir" acionava editar**
- Causa: Botão na vista de detalhe tinha label "🗑️ Excluir" mas chamava `setSequenciaEditando(seq)`
- Correção: Botão corrigido para ✏️ Editar; excluir real ficou com confirmação via `setModalConfirm`

**23c. Layout desproporcional e colorido demais**
- Cards: removido `border-t-4 border-rose-500 shadow-lg`; agora `border border-slate-200 hover:border-slate-300`
- Slots: removido `border-rose-300`; agora `border border-slate-200`
- Cores rose/teal substituídas por slate em todo o módulo
- Botões padronizados: `border border-slate-300 hover:border-slate-400 hover:bg-slate-50`

**23d. Objetivo geral exibia HTML bruto (negrito ilegível)**
- Causa: `planoVinc.objetivoGeral` contém tags HTML do RichTextEditor (`<strong>`, `<em>`, etc.)
- Correção: Função `stripHTML()` adicionada no topo do arquivo; aplicada ao renderizar o objetivo nos slots

---

### 24. Sequências — formulário inline como Estratégias/Atividades (commit `6cf06bf`)
**Arquivo:** `src/components/ModuloSequencias.tsx`
- Formulário de nova/editar sequência migrado de modal (`fixed inset-0`) para view inline
- Padrão: `if (sequenciaEditando) { return (<div className="max-w-2xl mx-auto">...) }`
- Mesma estrutura de Estratégias: card branco com faixa de cor no topo, botão ← Voltar, labels uppercase
- Modal de vincular plano mantido como modal (é um picker, não um formulário)

---

### 25. ModalConfiguracoes — redesign clean (commit `e6ec458`)
**Arquivo:** `src/components/modals/ModalConfiguracoes.tsx`
- Removidas todas as cores: indigo, teal, purple, blue, orange
- Header: gradiente escuro → simples `border-b border-slate-100`, título `text-slate-800`
- Cards: backgrounds coloridos → `border border-slate-100 rounded-xl` (branco puro)
- Botões: `bg-teal-600`, `bg-purple-600`, `bg-blue-600`, `bg-orange-500` → todos `border border-slate-200 hover:bg-slate-50 text-slate-600`
- Componente auxiliar `ConfigItem` extraído para evitar repetição
- Layout compactado: `sm:max-w-sm` (era `sm:max-w-md`)

---

### 26. ModalGestaoTurmas + ModalGradeSemanal — redesign clean (commit `55b8c7f`)
- Headers: `bg-teal-600` / `bg-purple-600` → `border-b border-slate-100`, sticky branco
- Ano ativo: `bg-indigo-600 text-white` → badge `bg-emerald-100 text-emerald-700`
- Escolas: `bg-gray-100` → `bg-slate-50 border-b border-slate-100`
- Todos os botões coloridos → `border border-slate-200 hover:bg-slate-50 text-slate-600`
- Excluir → `hover:border-red-200 hover:bg-red-50 hover:text-red-500`
- Grade cards: `border-2 border-purple-200 bg-purple-50` → `border border-slate-200`
- Botões Salvar/Cancelar: preenchidos → outline sutil

### 27. HTML bruto em "Ver Plano" e cards de Atividades (commit `97b026d`)
- **Causa:** Campos editados com RichTextEditor salvam HTML (`<strong>`, `<p>`, `&nbsp;` etc). Ao renderizar em texto puro, as tags apareciam visivelmente.
- **Solução:** Exportado `stripHTML()` em `src/lib/utils.ts` (compartilhado).
- **Aplicado em:**
  - `ModuloPlanejamentoTurma.tsx` — `ModalPreviewPlano`: `plano.objetivoGeral` e `a.descricao`
  - `ModuloAtividades.tsx` — `CardAtividade`: `ativ.descricao` no card
- `stripHTML` remove tags, `&nbsp;`, `&amp;`, `&lt;`, `&gt;` antes de exibir como texto puro.

---

## Observações Técnicas Adicionais

- **Plano Supabase Free (Nano):** 60 conexões máximas, 43 Mbps Disk I/O baseline, burst de 30min/dia, sem SLA. Suficiente para uso pessoal com as otimizações aplicadas (syncDelay 15s + Realtime desligado).
- **Realtime desligado:** O MusiLab sincroniza via REST (não WebSocket). Desligar o Realtime não afeta uso em múltiplos dispositivos — tablet/celular sincronizam normalmente ao abrir o app, puxando dados do Supabase via REST.
- **Modo local:** Funciona completamente offline com dados do IndexedDB. Indicado quando Supabase estiver fora do ar. Dados não sincronizam com a nuvem nesse modo.

---

## Sessão 2026-03-08 (continuação) — Bugs visuais + Sync robusto

---

### 28. HTML bruto em "Ver Plano" — seção Roteiro de Atividades (commit `074b468`)
**Arquivo:** `src/components/BancoPlanos.tsx` (linha ~2464)
**Causa:** `{ativ.descricao}` renderizava o conteúdo do RichTextEditor como texto puro — tags `<b>`, `<br>`, `<ol>` etc. apareciam visíveis.
**Correção:** Substituído por `dangerouslySetInnerHTML={{ __html: sanitizar(ativ.descricao) }}` com a classe `rich-editor-area`, consistente com o objetivo geral do mesmo modal (linha ~2402).

---

### 29. "1° ano" aparecia duplicado nos cards e metadados do plano (commit `074b468`)
**Arquivo:** `src/contexts/PlanosContext.tsx`
**Causa:** `normalizePlano` e `salvarPlano` não deduplicavam o array `faixaEtaria` — ao editar o plano, o valor era adicionado novamente mesmo que já existisse.
**Correção:**
- `normalizePlano` linha ~74: `faixaEtaria: [...new Set(p.faixaEtaria || [])]`
- `salvarPlano` linha ~491: `faixaEtaria: [...new Set(planoEditando.faixaEtaria || [])]`

---

### 30. PDF gerado com conteúdo cortado na margem inferior (commit `074b468`)
**Arquivo:** `src/utils/pdf.ts`
**Causa:** Margem inferior `mB = 20mm` era insuficiente — conteúdo chegava a ~14mm da borda. Além disso, linhas do título não verificavam se havia espaço suficiente na página antes de imprimir.
**Correção:**
- `mB` aumentado de `20 → 28mm`
- Nova página inicia em `y = 22` (consistente com outras seções)
- `titleLines.forEach(l => { chk(9); doc.text(l, mL, y); y += 9; })` — `chk()` antes de cada linha do título

---

### 31. Backup automático (File System Access API) precisava ser reconfigurado a cada abertura (commit `1be965d`)
**Arquivos:** `src/lib/db.ts`, `src/components/BancoPlanos.tsx`
**Causa:** O `FileSystemFileHandle` ficava apenas no estado React — perdido ao fechar o browser.
**Correção:**
- `db.ts`: adicionadas `dbSetRaw(key, value)` e `dbGetRaw(key)` para armazenar objetos nativos do browser diretamente no IndexedDB (sem serialização JSON — `FileSystemFileHandle` não é serializável)
- `configurarAutoBackup`: agora chama `await dbSetRaw('autoBackupHandle', handle)` após o usuário escolher o arquivo
- `desativarAutoBackup`: chama `dbDel('autoBackupHandle')` para limpar o IDB
- Novo `useEffect` no mount: recupera o handle do IDB via `dbGetRaw`, verifica permissão com `queryPermission / requestPermission` (sem abrir o seletor de arquivo novamente)
- **Limitação:** se o browser apaga dados (IndexedDB incluso), o handle é perdido — usuário deve reconfigurar

---

### 32. Sincronização Supabase robusta — timeout, delay e badge clicável (commit `4431fa1`)
**Arquivos:** `src/lib/utils.ts`, `src/components/BancoPlanos.tsx`, `src/types/index.ts`

**Problemas resolvidos:**

**32a. "Sem conexão" falso positivo**
- Causa: `navigator.onLine` em `syncToSupabase` retornava `false` em certas redes/extensões mesmo com internet normal
- Correção: verificação removida — se sem internet, o fetch falha naturalmente no catch

**32b. Sync ficava pendurado ~1 minuto sem resposta**
- Causa: requisições Supabase sem timeout — se o servidor não respondesse, ficavam esperando para sempre
- Correção: `AbortController` com 10s de timeout por requisição; `.abortSignal(controller.signal)` adicionado em todos os `.upsert()` e `.delete()` do Supabase

**32c. Delay 15s causava perda de dados**
- Causa: com `syncDelay` de 15s, dados salvos e o browser fechado em menos de 15s nunca chegavam ao Supabase
- Correção: delay reduzido para **3s**; `setStatusSalvamento('salvando')` movido para dentro do timer (não mostra mais "Salvando" durante os 3s de espera)
- Fallback de `triggerSalvo` ajustado de 16s → 5s (3s delay + ~2s rede)

**32d. Botão "Salvar agora" não fazia nada (browser limpa IDB)**
- Causa: `salvarAutoBackupAgora` chamava `_gravarNoArquivo(handle)` mas o handle era `null` porque o IndexedDB foi apagado pelo browser ao limpar histórico/cookies
- Correção: `salvarAutoBackupAgora` agora verifica: se handle disponível → grava no arquivo; se `null` → chama `baixarBackup()` (download JSON direto, não depende de nenhum dado do browser)

**32e. Badge de erro sem ação**
- Antes: `<span>⚠ Sem conexão — salvo localmente</span>` (não clicável)
- Depois: `<button onClick={baixarBackup}>⚠ Erro nuvem — ⬇ baixar backup</button>` — clicar no badge dispara download imediato de segurança

**32f. Ctrl+S agora força sync imediato**
- Antes: só salvava o plano em edição
- Depois: também cancela o timer de debounce pendente e chama `sincronizarAgora()` — envia para o Supabase agora

**32g. Nova função `sincronizarAgora()`**
- Cancela todos os timers pendentes do `syncDelay`
- Chama `syncToSupabase('planos', ...)` e `syncToSupabase('grades_semanas', ...)` em paralelo
- Atualiza o badge de status conforme resultado
- Exposta no context (`BancoPlanosContextValue`) para uso externo

---

## Observações Técnicas Adicionais (Sessão 2026-03-08 continuação)

- **Browser que apaga histórico/cookies:** o IndexedDB também é apagado. Para esses usuários, a única persistência confiável é o Supabase (cloud). Recomendação: pressionar **Ctrl+S** após cada trabalho importante para forçar sync imediato. O badge "⚠ Erro nuvem" aparece em caso de falha e permite baixar backup.
- **`dbSetRaw`/`dbGetRaw`:** ao contrário de `dbSet`/`dbGet` (que usam o cache de strings + JSON), essas funções acessam o IndexedDB diretamente sem serialização, permitindo guardar objetos nativos do browser (ex: `FileSystemFileHandle`, `Blob`).
- **Retry delay uniforme:** o `DELAY_RETRY` mudou de progressivo (`* tentativa`) para fixo 2s entre cada tentativa. Com 3 tentativas e 10s de timeout cada, o pior caso agora é ~34s (antes podia ser indefinido).

---

## PLANO — Novo modelo de planejamento operacional (AplicacaoAula)

> Decisão de arquitetura tomada em 2026-03-08. Implementação em andamento.

### Contexto / Problema
O MusiLab mistura dado pedagógico (`Plano`) com dado operacional (quando e para quem foi aplicado). Hoje não existe entidade "aplicação de aula" — o sistema usa `plano.historicoDatas[]` como proxy. A grade semanal existe mas não está conectada aos planos. Objetivo: separar **aula-base** (pedagógica, reutilizável) de **AplicacaoAula** (operacional: turma + data + adaptação), sem quebrar fluxo atual.

### Novos tipos — `src/types/index.ts`
- `AplicacaoAula`: `{ id, planoId, anoLetivoId, escolaId, segmentoId, turmaId, data, horario?, status, adaptacaoTexto?, atividadesOcultas?, _updatedAt }`
- `AplicacaoAulaSlot`: helper para criar aplicações em lote a partir de slots da grade

### Arquivos principais envolvidos
| Arquivo | O que muda |
|---|---|
| `src/types/index.ts` | + `AplicacaoAula`, `AplicacaoAulaSlot`, campos em `BancoPlanosContextValue` |
| `src/contexts/AplicacoesContext.tsx` | **Novo** — contexto completo seguindo padrão EstrategiasContext |
| `src/contexts/index.ts` | + export de `useAplicacoesContext` e `AplicacoesProvider` |
| `src/App.tsx` | + `<AplicacoesProvider>` entre CalendarioProvider e PlanosProvider |
| `src/components/BancoPlanos.tsx` | + import, destructuring, backup, restore, ctx bridge, listener de compat. |
| `supabase/rls.sql` | + tabela `aplicacoes_aula` + RLS |
| `src/components/TelaPrincipal.tsx` | Fase 2: botão "Aplicar em turmas" |
| `src/components/TelaCalendario.tsx` | Fase 3: tab Semana + grid; Fase 4: painel; Fase 5: resumo do dia |

### Decisões-chave
- **Abordagem aditiva**: nada é removido do Plano existente; `historicoDatas` e `registrosPosAula` permanecem no Plano por agora
- **Compat. retroativa**: ao marcar aplicação como `realizada`, dispara `CustomEvent('musilab:aplicacaoRealizada')` → BancoPlanos adiciona data em `plano.historicoDatas` automaticamente
- **registrosPosAula**: ficam no Plano (migração para AplicacaoAula é fase futura)
- **sync Supabase**: debounce 3s (consistente com o novo syncDelay — commit `4431fa1`)
- **Performance**: `useMemo` para `aplicacoesPorData: Record<string, AplicacaoAula[]>` — lookup O(1) no calendário

---

### Checklist de implementação

#### ✅ Fase 1 — Fundação (modelo + contexto + Supabase) — CONCLUÍDA (commit `0625702`)
- [x] `src/types/index.ts` — adicionar `AplicacaoAula` e `AplicacaoAulaSlot` após `GradeEditando` (~linha 33)
- [x] `src/types/index.ts` — adicionar campos de aplicações em `BancoPlanosContextValue`
- [x] `src/contexts/AplicacoesContext.tsx` — criar arquivo completo (padrão EstrategiasContext)
- [x] `src/contexts/index.ts` — adicionar export
- [x] `src/App.tsx` — adicionar `<AplicacoesProvider>` entre CalendarioProvider e PlanosProvider
- [x] `src/components/BancoPlanos.tsx` — import + destructuring + backup + restore + listener + ctx bridge
- [x] `supabase/rls.sql` — adicionar tabela `aplicacoes_aula` + RLS
- [ ] Executar SQL no Supabase Dashboard ← **pendente (manual)**
- [x] `npx tsc --noEmit` → 0 erros
- [x] `npm run build` → sucesso
- [x] commit `0625702` + push → deploy ativo

#### ⬜ Fase 2 — "Aplicar em turmas" UI
- [ ] Botão `📅 Aplicar em turmas` no card do plano salvo (`TelaPrincipal.tsx`)
- [ ] Novo modal `ModalAplicarEmTurmas.tsx`
  - [ ] Seletor de data (semana atual por padrão)
  - [ ] Turmas do dia via `obterTurmasDoDia(data)` com checkboxes
  - [ ] Turmas já agendadas: badge de status (não duplicar)
  - [ ] Aviso quando sem grade configurada
  - [ ] Bottom sheet em mobile
- [ ] Confirmar → `criarAplicacoes(plano.id, slotsChecked)` + toast
- [ ] `npx tsc --noEmit` → 0 erros / `npm run build` / commit

#### ⬜ Fase 3 — Calendário semanal
- [ ] Tab "Semana" em `TelaCalendario.tsx`
- [ ] Componente `CalendarioSemanal`:
  - [ ] Header: semana atual + setas de navegação
  - [ ] Grid: colunas = dias úteis, linhas = horários únicos da grade
  - [ ] `BlocoAplicacao`: nome turma + título plano + badge de status colorido
  - [ ] `SlotVazio`: célula cinza quando a grade tem turma mas sem plano agendado
- [ ] `useMemo` para `horariosUnicos[]` e `aplicacoesDaSemana`
- [ ] `npx tsc --noEmit` → 0 erros / `npm run build` / commit

#### ⬜ Fase 4 — Painel de adaptação da turma
- [ ] Clicar no BlocoAplicacao → abrir `PainelDetalhesAplicacao`
- [ ] Seção "Plano base": objetivo geral + roteiro (minimizado) + materiais (minimizado) — **readonly**
- [ ] Seção "Adaptação desta turma": textarea/rich text + botão Salvar
- [ ] `salvarAdaptacao(id, texto)` → nunca altera o plano base
- [ ] Dropdown de status (planejada / realizada / cancelada)
  - [ ] Ao marcar realizada: `musilab:aplicacaoRealizada` disparado → historicoDatas atualizado
- [ ] `npx tsc --noEmit` → 0 erros / `npm run build` / commit

#### ⬜ Fase 5 — Resumo do dia
- [ ] Banner colapsável no topo do calendário semanal
- [ ] Lista de planos do dia agrupados + turmas por plano
- [ ] Badge "⚠ com adaptação" quando `aplicacao.adaptacaoTexto` não está vazio
- [ ] Materiais do dia: union sem duplicatas de todos os planos do dia
- [ ] Aberto por padrão em dias com aulas, fechado nos demais
- [ ] `npx tsc --noEmit` → 0 erros / `npm run build` / commit
