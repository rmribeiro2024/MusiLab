# MusiLab — Plano de Migração para Vite

---

## ✅ FASE 0 — Reorganização do index.html (CONCLUÍDA)

**Data:** 25/02/2025
**Branch:** `claude/add-usestate-comments-evQWg`

### O que foi feito:
- 7 IIFEs inline convertidos em componentes React internos nomeados
- 169 `useState` agrupados por módulo com comentários separadores
- 26 grupos de funções auxiliares organizados por módulo
- `console.error` de debug removido
- `ErrorBoundary` corrigido (fallback seguro para `.message`)
- Mapa estrutural inserido no topo do arquivo

### Componentes criados no index.html:

| Componente | ~Linha | Tamanho | Responsabilidade |
|---|---|---|---|
| `ModuloAnoLetivo` | 3665 | 322 linhas | Ano letivo e períodos |
| `ModuloHistoricoMusical` | 3989 | 465 linhas | Histórico por turma |
| `ModuloEstrategias` | 4456 | 358 linhas | Estratégias pedagógicas |
| `ModuloAtividades` | 4816 | 406 linhas | Banco de atividades |
| `ModuloSequencias` | 5224 | 313 linhas | Sequências didáticas |
| `ModuloRepertorio` | 5539 | 758 linhas | Repertório inteligente |
| `ModuloLista` | 6327 | 550 linhas | Dashboard + lista de planos |

---

## 🔜 FASE 1 — Migração para Vite (PRÓXIMA SESSÃO)

### Contexto para o início da sessão:
> *"Estamos na Fase 1 da migração do MusiLab para Vite. A Fase 0 foi concluída —
> o `index.html` está reorganizado com 7 componentes internos (ModuloLista,
> ModuloRepertorio, etc.), estados e funções agrupados por módulo.
> Repositório: `rmribeiro2024/MusiLab`, branch `claude/add-usestate-comments-evQWg`.
> Objetivo: criar projeto Vite e migrar um módulo por vez."*

### Objetivo:
Transformar o `index.html` único em um projeto Vite com múltiplos arquivos `.jsx`,
mantendo toda a funcionalidade intacta.

### Regras:
1. A cada passo, o sistema deve funcionar ao rodar `npm run dev`
2. Migre **um módulo por vez** — nunca vários ao mesmo tempo
3. Se algo quebrar: reverter o último passo e tentar abordagem diferente
4. Manter o `index.html` original como backup até a migração completa

### Ordem de migração (mais simples → mais complexo):

| Ordem | Módulo | Motivo |
|---|---|---|
| 1º | `ModuloAnoLetivo` | Menor, menos dependências |
| 2º | `ModuloEstrategias` | Sem vínculos complexos |
| 3º | `ModuloAtividades` | Dependências simples |
| 4º | `ModuloSequencias` | Usa planos mas sem edição |
| 5º | `ModuloHistoricoMusical` | Lógica de filtro complexa |
| 6º | `ModuloRepertorio` | Maior, subcomponentes internos |
| 7º | `ModuloLista` | Maior, mais dependências — por último |

### Stack atual (index.html):
- React 18 via CDN (Babel inline)
- Tailwind CSS via CDN
- Supabase `@supabase/supabase-js@2`
- jsPDF `2.5.1`
- DOMPurify `3.1.6`

### Stack alvo (Vite):
- React 18 + Vite
- Tailwind CSS (PostCSS)
- Supabase (npm)
- jsPDF (npm)
- DOMPurify (npm)
- Context API ou Zustand para os estados compartilhados

### Passo a passo esperado para cada módulo:
1. Criar `src/modules/ModuloXXX.jsx`
2. Receber estados necessários via props ou Context
3. Importar no componente principal
4. Rodar `npm run dev` e testar
5. Só então partir para o próximo módulo

---

## 📋 Tecnologias

| Tecnologia | Uso |
|---|---|
| React 18 | UI |
| Tailwind CSS | Estilização |
| Supabase | Auth + sincronização na nuvem |
| jsPDF | Exportação de planos em PDF |
| DOMPurify | Sanitização de HTML no editor rich text |
