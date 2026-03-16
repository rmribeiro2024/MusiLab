# Refatoração do Roteiro de Atividades — MusiLab

> Criado em 2026-03-16. Este documento serve como guia completo para continuar a implementação
> numa nova sessão do Claude Code. Leia tudo antes de começar.

---

## Contexto geral

O módulo **Nova Aula** tem uma seção chamada **Roteiro de Atividades** dentro do editor
(`src/components/TelaPrincipal.tsx`). Cada atividade é um card colapsável com:
- Header: nome, duração, 💾, ×, chevron
- Corpo expandido: RichTextEditor (descrição) + meta row (músicas, estratégias, conceitos, tags, links)

O professor valida a lógica da UX atual mas vários elementos precisam de ajuste de fluxo.
Todos os 8 itens abaixo foram **discutidos e confirmados pelo professor/dono do app**.

---

## Estado do código ANTES desta refatoração

### Arquivos principais modificados anteriormente (já commitados):
- `src/components/TelaPrincipal.tsx` — editor completo com cards colapsáveis (commit `0c6ed97` e outros)
- `src/components/RichTextEditor.tsx` — toolbar flutuante ao selecionar texto (já implementado)
- `src/components/modals/ModalNovaFaixa.tsx` — modal de níveis (substituído por painel inline em TelaPrincipal)

### Estado atual do card de atividade (TelaPrincipal.tsx ~linha 620-720):
```
Header colapsável:
  [≡ drag] [↑↓ mobile] [input nome] [input duração] [💾] [×] [chevron]

Corpo expandido (quando aberto):
  RichTextEditor — descrição com toolbar flutuante (floatingToolbar prop)

  Meta row chips: 🎵músicas · 🧩estratégias · 🎓conceitos · #tags · 🔗links

  Botões add: [+ Música] · [+ Estratégia] · [+ Conceito Enter↵] · [#tag Enter↵] · [+ Link]
```

### Estados relevantes em TelaPrincipal.tsx (buscar por estas vars):
- `atividadesExpandidas: Set<string>` — quais cards estão abertos
- `linkInputIdx` / `linkInputVal` — input de link inline
- `gerenciarNiveisOpen` / `novoNivelInput` — painel inline de níveis
- `pickerEstrategiaIdx` / `buscaEstrategia` — picker de estratégia atual (dentro do card)
- `atividadeVinculandoMusica` — modal de vincular música

---

## Os 8 itens — decisões e implementação

---

### ITEM 1 ✅ Preview YouTube/Spotify inline na descrição
**Status: A IMPLEMENTAR**

**Decisão confirmada:**
Quando o professor cola uma URL do YouTube ou Spotify diretamente no campo de descrição
da atividade (RichTextEditor), aparece automaticamente um card visual de preview
**abaixo** da área de texto. Não há campo separado de link para isso.

**Como implementar — RichTextEditor.tsx:**

1. Adicionar prop `showLinkPreviews?: boolean` na interface
2. Adicionar estado `previewUrls: string[]`
3. Criar helpers:
   ```typescript
   function getYouTubeId(url: string): string | null {
     const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/)
     return m ? m[1] : null
   }
   function getSpotifyEmbed(url: string): string | null {
     const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([^?]+)/)
     return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null
   }
   function extractMediaUrls(html: string): string[] {
     const parser = new DOMParser()
     const doc = parser.parseFromString(html, 'text/html')
     const urls: string[] = []
     doc.querySelectorAll('a').forEach(a => { if (a.href) urls.push(a.href) })
     const text = doc.body.textContent || ''
     const regex = /https?:\/\/[^\s<>"']+/g
     let m: RegExpExecArray | null
     while ((m = regex.exec(text)) !== null) urls.push(m[0])
     return [...new Set(urls)].filter(u =>
       /youtube\.com|youtu\.be/.test(u) || /open\.spotify\.com/.test(u)
     )
   }
   ```
4. Chamar `setPreviewUrls(extractMediaUrls(html))` no `handleBlur` e no `useEffect` inicial
5. Renderizar preview cards APÓS o div editável (mas dentro do container border):
   ```tsx
   {showLinkPreviews && previewUrls.length > 0 && (
     <div className="px-4 pb-3 space-y-2 border-t border-slate-100 dark:border-[#374151] pt-3">
       {previewUrls.map((url, i) => {
         const ytId = getYouTubeId(url)
         if (ytId) return (
           <a key={i} href={url} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-[#374151]
                        hover:bg-slate-50 dark:hover:bg-white/[0.03] transition group">
             <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                  alt="YouTube" className="w-24 h-14 rounded object-cover shrink-0 bg-black" />
             <div className="min-w-0">
               <div className="text-xs text-red-500 font-semibold mb-0.5">▶ YouTube</div>
               <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                 {url.length > 50 ? url.substring(0,50)+'…' : url}
               </p>
             </div>
           </a>
         )
         const spotifyEmbed = getSpotifyEmbed(url)
         if (spotifyEmbed) return (
           <div key={i} className="rounded-lg overflow-hidden border border-slate-200 dark:border-[#374151]">
             <iframe src={spotifyEmbed} width="100%" height="80" frameBorder="0"
               allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
               loading="lazy" />
           </div>
         )
         return null
       })}
     </div>
   )}
   ```
6. Em TelaPrincipal.tsx, adicionar `showLinkPreviews` ao RichTextEditor da atividade:
   ```tsx
   <RichTextEditor
     value={atividade.descricao}
     onChange={val => atualizarAtividadeRoteiro(atividade.id, 'descricao', val)}
     placeholder="Descreva como realizar esta atividade..."
     rows={6}
     floatingToolbar
     showLinkPreviews   {/* NOVO */}
   />
   ```

---

### ITEM 2 ✅ Estratégia — browser lateral no nível do Roteiro
**Status: A IMPLEMENTAR**

**Decisão confirmada:**
- Remover o botão `+ Estratégia` de DENTRO de cada card de atividade
- Adicionar botão `💡 Explorar estratégias →` no HEADER da seção Roteiro de Atividades
  (ao lado do botão `+ Adicionar Atividade`)
- Clicar abre um drawer/painel lateral ou modal com busca nas estratégias do banco
- A estratégia escolhida é vinculada à atividade que estiver **expandida no momento**
  (a que está em `atividadesExpandidas`)
- Se nenhuma estiver expandida, mostra toast: "Expanda uma atividade primeiro"

**No Pós-Aula (ITEM 8 — ver abaixo):** seção opcional "Estratégias que funcionaram hoje"

**Como implementar — TelaPrincipal.tsx:**

1. Adicionar estado `estrategiaBrowserOpen: boolean`
2. No header da seção Roteiro, ao lado de `+ Adicionar Atividade`:
   ```tsx
   <button type="button" onClick={() => setEstrategiaBrowserOpen(true)}
     className="text-[11px] font-semibold text-violet-500 hover:text-violet-700 transition-colors">
     💡 Estratégias
   </button>
   ```
3. Remover `+ Estratégia` e `pickerEstrategiaIdx` dos cards individuais
4. Painel de estratégias (drawer ou modal):
   - Input de busca filtrando `estrategias` do contexto
   - Cards clicáveis das estratégias encontradas
   - Ao clicar: verifica `atividadesExpandidas`, se vazia → toast; senão → vincula à primeira expandida
   - Fechar com botão × ou clique fora

---

### ITEM 3 ✅ Conceito — sem mudanças funcionais
**Status: NADA A FAZER** (apenas trocar ícone 🎵 → 🎓 nos chips de conceito)

Arquivo: TelaPrincipal.tsx ~linha 675-679
```tsx
// Mudar de:
🎵 {c}
// Para:
🎓 {c}
```

---

### ITEM 4 ✅ Tag — autocomplete `#` na descrição
**Status: A IMPLEMENTAR**

**Decisão confirmada:**
Ao digitar `#` no campo de DESCRIÇÃO da atividade (o RichTextEditor com `contentEditable`),
aparece um dropdown inline com as tags já usadas nos planos do professor.
Selecionar uma tag → inserida como chip na meta row da atividade.
O campo `#tag Enter↵` da meta row continua existindo como atalho alternativo.

**Como implementar:**

Esta feature é complexa em `contentEditable`. Abordagem recomendada:

1. No `onKeyUp` do RichTextEditor, passar callback opcional `onHashTrigger`:
   ```typescript
   // Prop nova no RichTextEditor:
   onHashTrigger?: (query: string, position: { top: number; left: number }) => void
   onHashCancel?: () => void
   ```
2. No `onKeyUp`, detectar se cursor está após `#` numa palavra:
   ```typescript
   const checkHashTrigger = () => {
     const sel = window.getSelection()
     if (!sel || !editorRef.current?.contains(sel.anchorNode)) return
     const range = sel.getRangeAt(0)
     const textBefore = range.startContainer.textContent?.substring(0, range.startOffset) || ''
     const hashMatch = textBefore.match(/#(\w*)$/)
     if (hashMatch) {
       const rect = range.getBoundingClientRect()
       const cRect = containerRef.current?.getBoundingClientRect()
       onHashTrigger?.(hashMatch[1], {
         top: rect.bottom - (cRect?.top || 0),
         left: rect.left - (cRect?.left || 0)
       })
     } else {
       onHashCancel?.()
     }
   }
   ```
3. Em TelaPrincipal.tsx, passar as callbacks e renderizar dropdown de tags:
   ```tsx
   const [hashDropdown, setHashDropdown] = useState<{query:string; pos:{top:number;left:number}; atividadeId: string} | null>(null)

   // Todas as tags já usadas (de todos os planos + atividades atuais):
   const todasAsTags = useMemo(() => {
     const set = new Set<string>()
     planos.forEach(p => p.atividadesRoteiro?.forEach(a => a.tags?.forEach(t => set.add(t))))
     planoEditando?.atividadesRoteiro?.forEach(a => a.tags?.forEach(t => set.add(t)))
     return [...set].sort()
   }, [planos, planoEditando])

   // Dropdown renderizado absolutamente sobre o card
   {hashDropdown && (
     <div style={{ position:'absolute', top: hashDropdown.pos.top, left: hashDropdown.pos.left }}
       className="z-50 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl shadow-xl py-1 min-w-[160px]">
       {todasAsTags.filter(t => t.startsWith(hashDropdown.query)).map(tag => (
         <button key={tag} type="button"
           onClick={() => {
             // inserir tag na meta row da atividade
             atualizarAtividadeRoteiro(hashDropdown.atividadeId, 'tags',
               [...(getAtividade(hashDropdown.atividadeId).tags||[]), tag])
             // limpar o #query do texto do editor
             setHashDropdown(null)
           }}
           className="w-full text-left px-3 py-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-400/10">
           #{tag}
         </button>
       ))}
     </div>
   )}
   ```

---

### ITEM 5 ✅ Remover "+ Link" da meta row
**Status: A IMPLEMENTAR (junto com Item 1)**

**Decisão confirmada:**
Links do YouTube/Spotify → inline no texto → preview automático (Item 1)
Remover o botão `+ Link` e o estado `linkInputIdx`/`linkInputVal` dos cards de atividade.

**Atenção:** Manter o campo de links na seção **Recursos** (nível do plano) — ver Item 7.

---

### ITEM 6 ✅ Salvar no Banco — mover para rodapé do plano
**Status: A IMPLEMENTAR**

**Decisão confirmada:**
- Remover 💾 do header de cada card de atividade
- Remover 💾 / "Salvar" da meta row mobile
- Adicionar ao rodapé do formulário do plano (após a seção de Roteiro, antes dos botões Salvar/Cancelar):

```tsx
{/* Salvar atividades no banco */}
{planoEditando?.atividadesRoteiro?.length > 0 && (
  <div className="border border-dashed border-emerald-200 dark:border-emerald-500/30
                  rounded-xl p-4 space-y-3">
    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
      💾 Salvar atividade(s) no Banco de Atividades
    </p>
    <div className="space-y-1.5">
      {planoEditando.atividadesRoteiro.map(a => (
        <label key={a.id} className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" defaultChecked className="accent-emerald-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">{a.nome || '(sem nome)'}</span>
        </label>
      ))}
    </div>
    <button type="button" onClick={() => salvarAtividadesSelecionadasNoBanco()}
      className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600
                 px-4 py-2 rounded-lg transition">
      Salvar selecionadas
    </button>
  </div>
)}
```

A função `salvarAtividadesSelecionadasNoBanco` usa a lógica já existente de `saveToBank`
mas iterando pelas atividades selecionadas.

---

### ITEM 7 ✅ Recursos — links gerais + materiais físicos
**Status: A IMPLEMENTAR**

**Decisão confirmada:**
A seção "Recursos" do acordeão (nível do plano, não dos cards) mantém links gerais
(para referências que não são de uma atividade específica) E ganha campo de materiais físicos.

**Implementar:**
- Manter o campo de links existente na seção Recursos
- Adicionar abaixo: campo "Materiais necessários" com lista de itens (pandeiro, papel A4, etc.)
- Autocomplete com materiais já usados em outros planos
- Chips de material: 📦 {nome} ×
- Novo campo em `PlanoAula`: `materiaisNecessarios?: string[]`

---

### ITEM 8 ✅ Estratégia no Pós-Aula
**Status: A IMPLEMENTAR**

**Arquivo:** `src/components/modals/ModalPosAula.tsx`

Adicionar seção opcional "Estratégias que funcionaram hoje" ao final do modal:
```tsx
{/* Estratégias que funcionaram */}
<div className="space-y-2">
  <button type="button" onClick={() => setShowEstrategias(!showEstrategias)}
    className="text-xs font-semibold text-violet-500 hover:text-violet-700 transition-colors">
    🧩 {showEstrategias ? '▼' : '▶'} Estratégias que funcionaram hoje
  </button>
  {showEstrategias && (
    <div className="space-y-2">
      {/* picker de estratégias do banco + lista das selecionadas */}
    </div>
  )}
</div>
```
Salvar em `RegistroPosAula.estrategiasQueFunc?: string[]`

---

## Ordem de implementação

1. **Item 1 + 5** juntos: preview YouTube/Spotify + remover "+ Link" dos cards
2. **Item 3**: trocar ícone 🎵→🎓 nos chips de conceito (2 min)
3. **Item 6**: mover 💾 para rodapé do plano
4. **Item 4**: autocomplete `#` para tags
5. **Item 7**: materiais físicos na seção Recursos
6. **Item 2**: browser de estratégias no nível do Roteiro
7. **Item 8**: estratégias no Pós-Aula

Entre cada item: `npx tsc --noEmit` e `npm run build`.
Commit após cada item ou grupo de itens relacionados.

---

## Arquivos que serão modificados

| Arquivo | Mudanças |
|---|---|
| `src/components/RichTextEditor.tsx` | + prop `showLinkPreviews`, + prop `onHashTrigger`/`onHashCancel`, preview cards |
| `src/components/TelaPrincipal.tsx` | Remover 💾/+ Link dos cards, adicionar browser estratégias, rodapé salvar banco, autocomplete tags, ícone conceito |
| `src/components/modals/ModalPosAula.tsx` | + seção estratégias que funcionaram |
| `src/types/index.ts` | + `materiaisNecessarios?: string[]` em PlanoAula, + `estrategiasQueFunc?: string[]` em RegistroPosAula |

---

## Referências rápidas

- Branch: `main` (deploy automático GitHub Pages)
- Build: `npm run build` (deve passar antes de qualquer commit)
- TypeScript: `npx tsc --noEmit` (zero erros antes de commit)
- Arquivo `.env` NUNCA vai pro git
- Arquivo `nul` na raiz — não commitar, não deletar
