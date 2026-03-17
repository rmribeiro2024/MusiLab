# Roteiro de Atividades — Refatoração 2026

**Última atualização:** 2026-03-16
**Status:** ✅ TODOS OS 8 ITENS CONCLUÍDOS
**Branch:** `main`

---

## RESUMO DOS 8 ITENS

| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Preview YouTube/Spotify inline — TipTap | ✅ | `a7c833f` |
| 2 | Estratégia → browser lateral no Roteiro | ✅ | anterior |
| 3 | Conceito → sem mudanças (mantém) | ✅ | — |
| 4 | Tag → autocomplete `#` na descrição | ✅ | anterior |
| 5 | Remover "+ Link" dos cards de atividade | ✅ | anterior |
| 6 | 💾 → rodapé do plano com seleção individual | ✅ | anterior |
| 7 | Recursos (links gerais) + Materiais (físicos) | ✅ | anterior |
| 8 | Estratégia no Pós-Aula | ✅ | anterior |

---

## DETALHES POR ITEM

### Item 1 — TipTap (embed inline YouTube/Spotify)
- `src/components/TipTapEditor.tsx` — novo componente
- Colar URL do YouTube → iframe inline (como Notion)
- Colar URL do Spotify → player compacto inline
- BubbleMenu para B/I/U/lista ao selecionar texto
- `#` tag autocomplete preservado via HashExtension
- `sanitizarRich()` em `utils.ts` para renderizar iframes com segurança
- PDF: `htmlToText()` em `pdf.ts` converte iframes em `[YouTube: url]`
- TipTap v2.11 com `--legacy-peer-deps`

### Item 2 — Browser de Estratégias
- Botão `💡 Estratégias` no header do Roteiro de Atividades
- Abre painel com busca + lista de estratégias do banco
- Vincula à atividade expandida no momento
- `TelaPrincipal.tsx` linhas ~547-608

### Item 6 — 💾 Salvar no Banco
- Seção no rodapé do formulário (após adaptações por turma)
- Lista todas as atividades com checkboxes
- Botão "Salvar selecionadas" → `AtividadesContext`
- `TelaPrincipal.tsx` linhas ~1366-1400

### Item 7 — Recursos e Materiais
- **Recursos da Aula**: links externos com preview (YouTube thumb, etc.)
  - `TelaPrincipal.tsx` linha ~1134
- **Materiais**: lista de materiais físicos com input simples
  - `TelaPrincipal.tsx` linha ~821

### Item 8 — Estratégia no Pós-Aula
- "Estratégias que funcionaram hoje" no `ModalRegistroPosAula.tsx`
- Seção colapsável com picker do banco de estratégias
- Campo `estrategiasQueFunc` no registro
- `src/components/modals/ModalRegistroPosAula.tsx` linha ~960

---

## PRÓXIMAS MELHORIAS POSSÍVEIS

Se houver uma próxima sessão para o Roteiro de Atividades, as áreas de melhoria ainda em aberto são:

1. **Autocomplete de materiais físicos** — campo atual é texto livre; poderia sugerir materiais já usados em outros planos (similar ao autocomplete de conceitos)
2. **Sugestão automática de música** — ao digitar nome de música no texto da atividade, sugerir para capturar no banco de repertório (Item da sessão de design não implementado)
3. **Conceito com autocomplete aprimorado** — sugerir conceitos musicais já usados nos outros planos do professor

---

## ARQUITETURA DO TIPTAP EDITOR

O `TipTapEditor` é usado APENAS na descrição de atividades do Roteiro.
Os outros campos do editor (objetivoGeral, objetivosEspecificos, estratégia, planejamentoTurma)
continuam usando o `RichTextEditor` original.

### Extensions instaladas:
- `@tiptap/starter-kit` — negrito, itálico, listas
- `@tiptap/extension-underline` — sublinhado
- `@tiptap/extension-youtube` — embed inline automático
- `@tiptap/extension-link` — links com autolink
- `@tiptap/extension-placeholder` — placeholder text
- `SpotifyExtension` — custom node (definido dentro de TipTapEditor.tsx)
- `HashExtension` — custom ProseMirror plugin para autocomplete de tags
