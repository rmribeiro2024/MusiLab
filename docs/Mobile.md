# MusiLab — Adaptação para Mobile

## Para o Claude Code que vai continuar este trabalho

Leia este arquivo **inteiro** antes de escrever qualquer código.
Ele contém o diagnóstico real do app, a estratégia completa e os passos detalhados de cada fase.

---

## ⚠️ ANTES DE COMEÇAR — Leia isto

### 1. Testar o app funcionalmente primeiro

O app passou por refatoração grande (9 partes de contextos) e pode ter bugs de runtime
além do `dragItem is not defined` (já corrigido no commit `47cde92`). Antes de qualquer
trabalho de mobile, verificar que cada módulo abre e funciona:

| Módulo | O que testar |
|--------|-------------|
| Planos de Aula | Criar novo plano, editar, salvar, excluir |
| Repertório | Adicionar música, filtrar, buscar |
| Atividades | Criar atividade, vincular música |
| Sequências | Criar sequência, vincular plano a slot |
| Calendário | Navegar meses, visualizar semana |
| Registro pós-aula | Abrir modal, preencher, salvar |
| Ano Letivo | Abrir módulo, verificar turmas |
| Histórico | Verificar filtros e lista |

Se encontrar erro de runtime → corrigir antes de começar o mobile.

### 2. Contexto de uso real (impacta as prioridades)

Professores de música usam o app em **dois contextos distintos**:

| Contexto | Dispositivo provável | Módulos mais críticos |
|----------|---------------------|-----------------------|
| Planejamento (casa/escola) | Desktop/Laptop | Planos, Repertório, Sequências |
| Em sala de aula | **Celular/Tablet** | **Calendário, Ver plano, Registro pós-aula** |

Isso confirma que Fase 1 (Calendário) e Fase 2 (Registro pós-aula/modais) são as
mais impactantes para o uso real.

### 3. Testar em dispositivo real

O Chrome DevTools emula mobile, mas falha em:
- Comportamento do teclado virtual (empurra o layout)
- Performance real em dispositivos antigos
- Bugs específicos do iOS Safari

**Como testar no celular real:**
```bash
npm run dev
# Vite mostra o IP local: ex. http://192.168.1.10:5173
# Acessar pelo celular na mesma rede Wi-Fi
```

---

---

## Estado atual do projeto

- **Stack**: React 18 + Vite + TypeScript + Tailwind CSS 3.4.14 + Supabase
- **Repositório**: https://github.com/rmribeiro2024/MusiLab
- **App publicado**: https://rmribeiro2024.github.io/MusiLab/
- **Branch de trabalho**: `claude/add-usestate-comments-evQWg`
  - ⚠️ SEMPRE trabalhar neste branch e mergear para `main` após cada fase
- **Verificação obrigatória** antes de qualquer commit:
  ```bash
  npx tsc --noEmit   # deve ter ZERO erros
  npm run build      # deve passar
  npm test -- --run  # 35 testes devem passar
  ```

---

## Diagnóstico: o que já funciona bem

O MusiLab tem **base sólida** para responsividade:

| Aspecto | Status |
|---------|--------|
| `<meta name="viewport" content="width=device-width, initial-scale=1.0">` em `index.html` | ✅ OK |
| Tailwind CSS com breakpoints padrão (`sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`) | ✅ OK |
| 45+ ocorrências de `sm:`, 30+ de `md:`, 12+ de `lg:` nos componentes | ✅ OK |
| Grids já responsivos em `ModuloAnoLetivo`, `ModuloAtividades`, `ModuloEstrategias` | ✅ OK |
| Modais com `rounded-t-2xl sm:rounded-2xl` (bottom sheet em mobile) | ✅ OK |

**Score atual: 6/10** — usável em mobile, mas com problemas críticos.

---

## Diagnóstico: problemas identificados

### 🔴 CRÍTICOS (impedem uso real no celular)

| # | Problema | Arquivo | Linha aprox. |
|---|----------|---------|--------------|
| C1 | `grid grid-cols-7` fixo no calendário — 7 colunas em tela de 360px = células de ~48px ilegíveis | `TelaCalendario.tsx` | 570 |
| C2 | Tabela HTML sem fallback mobile — `hidden sm:table-cell` esconde dados mas não oferece alternativa | `ModuloHistoricoMusical.tsx` | 221–265 |
| C3 | `min-w-[250px]` e similares em dropdowns/flex items — força scroll horizontal | `ModuloRepertorio.tsx`, `ModuloLista.tsx`, `BancoPlanos.tsx` | vários |

### 🟠 ALTOS (prejudicam experiência mas não impedem uso)

| # | Problema | Arquivo |
|---|----------|---------|
| A1 | Nav tabs do header sem wrap — abas cortadas em telas < 400px | `BancoPlanos.tsx` |
| A2 | `text-[9px]` e `text-[10px]` — ilegível até em tablet | `TelaCalendario.tsx` |
| A3 | Modais com padding insuficiente em mobile (< 320px) | Vários modais |
| A4 | Form expansível de plano (`TelaPrincipal.tsx`) sem tratamento de teclado virtual | `TelaPrincipal.tsx` |
| A5 | Cards de plano com filtros laterais em flex-row sem wrap | `ModuloLista.tsx` |

### 🟡 MÉDIOS (polimento final)

| # | Problema |
|---|----------|
| M1 | Padding fixo `p-4/5/6` sem variante mobile menor |
| M2 | Botões de ação muito juntos em mobile (área de toque < 44px) |
| M3 | Drag-and-drop de cards/sequências não funciona bem em touch |
| M4 | Campos de formulário sem `inputMode` e `autocomplete` otimizados para mobile |
| M5 | Ausência de feedback tátil (haptic) — boa prática em PWA |

---

## Arquitetura da solução

### Princípio geral

Não reescrever — **ajuste cirúrgico componente por componente**.
O Tailwind já está configurado; a solução é adicionar classes responsivas onde faltam.

### Padrão de breakpoints a adotar

```
mobile first: sem prefixo = mobile (< 640px)
sm: = tablet pequeno (640px+)
md: = tablet grande (768px+)
lg: = desktop (1024px+)
```

### Padrão para modais mobile (bottom sheet)

Modais em mobile devem abrir como "gaveta de baixo":
```tsx
// Container do modal
className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"

// Card do modal
className="w-full rounded-t-2xl sm:rounded-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto"
```

### Padrão para tabelas em mobile

Tabelas devem virar cards em mobile:
```tsx
{/* Mobile: cards */}
<div className="block sm:hidden space-y-2">
  {registros.map(r => <CardRegistro key={r.id} registro={r} />)}
</div>
{/* Desktop: tabela */}
<table className="hidden sm:table w-full">...</table>
```

---

## Fases de implementação

### Fase 0 — Pré-requisitos iOS (fazer ANTES de tudo, 15 min)

Duas correções de CSS globais que resolvem os bugs mais recorrentes do iOS Safari.
Zero risco, impacto imediato.

#### 0A — `100dvh` em vez de `100vh`

No iPhone, `100vh` não desconta a barra de endereço do browser, causando overflow
e scroll indesejado. `dvh` = "dynamic viewport height" = considera a UI do browser.

**Em `src/index.css`, adicionar:**
```css
/* Fix iOS Safari: vh não desconta a barra de endereço */
@supports (height: 100dvh) {
  .min-h-screen { min-height: 100dvh; }
  .h-screen     { height: 100dvh; }
}
```

Ou substituir diretamente nas classes Tailwind mais críticas:
- `min-h-screen` → `min-h-[100dvh]`
- `max-h-[97vh]` em modais → `max-h-[97dvh]`

#### 0B — `font-size: 16px` em inputs (previne auto-zoom no iOS)

O Safari no iPhone dá zoom automático em qualquer `<input>` com `font-size < 16px`.
O app usa `text-sm` (14px) em muitos campos — isso causa zoom involuntário.

**Em `src/index.css`, adicionar:**
```css
/* Previne auto-zoom em inputs no iOS Safari */
@media screen and (max-width: 768px) {
  input[type="text"],
  input[type="search"],
  input[type="email"],
  input[type="url"],
  input[type="date"],
  input[type="number"],
  textarea,
  select {
    font-size: 16px !important;
  }
}
```

**Verificação pós-Fase 0:**
```bash
npx tsc --noEmit && npm run build && npm test -- --run
```
Commit: `fix: mobile fase 0 — 100dvh e font-size iOS`

---

### Fase 1 — Críticos: Calendário + Tabela + min-w

**Objetivo:** Eliminar os 3 problemas críticos que impedem uso real no celular.
**Esforço estimado:** 3–4 horas
**Impacto:** Alto — resolve os casos onde o app é basicamente inutilizável

#### 1A — TelaCalendario.tsx: Grid 7 colunas

**O que fazer:**

1. Reduzir `gap` e fontes no calendário mensal em mobile:
```tsx
// ANTES
<div className="grid grid-cols-7 gap-1 ...">

// DEPOIS
<div className="grid grid-cols-7 gap-0 sm:gap-1 ...">
```

2. Células do calendário: altura mínima menor em mobile:
```tsx
// ANTES
className="min-h-[80px] p-1 ..."

// DEPOIS
className="min-h-[50px] sm:min-h-[80px] p-0.5 sm:p-1 ..."
```

3. Textos internos das células: tamanho legível mínimo `text-xs` (12px):
```tsx
// ANTES: text-[9px] text-[10px]
// DEPOIS: text-[10px] sm:text-xs
// (10px é o mínimo real; texto de 9px é ilegível em qualquer tela)
```

4. Cabeçalhos dos dias: abreviar para 1 letra em mobile:
```tsx
// ANTES: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// DEPOIS: mobile = ['D','S','T','Q','Q','S','S'], desktop = ['Dom','Seg',...]

const diasSemana = useMediaMobile()
  ? ['D','S','T','Q','Q','S','S']
  : ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
```

5. **Alternativa** (mais impactante): Em telas < 640px, mostrar visão de **semana** em vez do mês inteiro.
O `modoResumo` já existe em `CalendarioContext` — usar isso para default mobile.

**Hook a criar** (em `src/hooks/useIsMobile.ts`):
```typescript
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler, { passive: true })
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}
```

#### 1B — ModuloHistoricoMusical.tsx: Tabela → Cards em mobile

**O que fazer:**

Adicionar visão em cards para mobile (a tabela já existe para desktop):

```tsx
{/* Mobile: cards */}
<div className="block sm:hidden space-y-3">
  {registrosFiltrados.map(musica => (
    <div key={musica.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="font-semibold text-slate-800 text-sm">{musica.titulo}</div>
      <div className="text-xs text-slate-500 mt-0.5">{musica.autor}</div>
      <div className="flex justify-between mt-2 text-xs text-slate-600">
        <span>1ª vez: {fmtData(musica.primeiraVez)}</span>
        <span>Última: {fmtData(musica.ultimaVez)}</span>
      </div>
      {musica.turmas?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {musica.turmas.map(t => (
            <span key={t} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}
    </div>
  ))}
</div>

{/* Desktop: tabela existente */}
<table className="hidden sm:table w-full text-sm">
  {/* ... código existente sem alteração ... */}
</table>
```

#### 1C — min-w fixos: Converter para w-full em mobile

**O que buscar e corrigir:**

```bash
# Buscar todos os min-w fixos
grep -rn "min-w-\[" src/components/
```

**Padrão de correção:**
```tsx
// ANTES
<div className="min-w-[250px]">

// DEPOIS (dropdown: usar w-full em mobile)
<div className="w-full sm:min-w-[250px]">

// ANTES (inline em flex row)
<div className="flex gap-2">
  <div className="min-w-[160px]">

// DEPOIS
<div className="flex flex-wrap gap-2">
  <div className="w-full sm:min-w-[160px] sm:w-auto">
```

**Verificação pós-Fase 1:**
```bash
npx tsc --noEmit && npm run build && npm test -- --run
```
Commit: `feat: mobile fase 1 — calendário, tabela histórico e min-w`

---

### Fase 2 — Altos: Navegação + Forms + Modais

**Objetivo:** Melhorar a experiência geral de navegação e entrada de dados em mobile.
**Esforço estimado:** 3–4 horas

#### 2A — BancoPlanos.tsx: Tabs de navegação em mobile

As abas do header (Planos, Repertório, Sequências, etc.) podem ficar cortadas em mobile.

**O que fazer:**

1. Adicionar scroll horizontal nas tabs:
```tsx
// Wrapper das tabs
<div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 -mb-1">
  {/* tabs individuais */}
</div>
```

2. Reduzir padding e texto das tabs em mobile:
```tsx
<button className="px-2 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap rounded-t-lg ...">
  <span className="hidden sm:inline">Planos de Aula</span>
  <span className="sm:hidden">Planos</span>
</button>
```

3. **Alternativa** (se tabs forem muitas): Menu hamburguer em mobile + tabs em desktop.

#### 2B — TelaPrincipal.tsx: Form de plano em mobile

O form expansível de plano ocupa quase a tela toda em mobile.

**O que fazer:**

1. Ajustar `max-h` para levar em conta o teclado virtual:
```tsx
// ANTES
className="... max-h-[97vh] ..."

// DEPOIS
className="... max-h-[85vh] sm:max-h-[97vh] ..."
```

2. Sticky bottom buttons para salvar/cancelar (já existem, verificar se ficam visíveis):
```tsx
// Garantir que o botão salvar seja sempre visível
className="sticky bottom-0 bg-white border-t border-slate-100 px-3 sm:px-4 py-3 flex gap-2"
```

3. Campos de formulário com `inputMode` correto:
```tsx
<input type="number" inputMode="numeric" ... />
<input type="text" autoComplete="off" ... />
```

#### 2C — Modais: Padding e tamanho correto

Revisar todos os modais em `src/components/modals/` e garantir o padrão:

```tsx
// Container externo (overlay)
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">

// Card interno
<div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl
                max-h-[90vh] overflow-y-auto">
  {/* Header do modal */}
  <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex justify-between items-center">
    <h2 className="text-base sm:text-lg font-semibold">{titulo}</h2>
    <button className="p-1.5 rounded-full hover:bg-slate-100" onClick={fechar}>✕</button>
  </div>

  {/* Conteúdo scrollável */}
  <div className="p-4">...</div>

  {/* Botões fixos no bottom */}
  <div className="sticky bottom-0 bg-white border-t border-slate-100 p-3 flex gap-2">
    <button className="flex-1 py-2.5 ...">Cancelar</button>
    <button className="flex-1 py-2.5 ...">Confirmar</button>
  </div>
</div>
```

**Modais a revisar (em ordem de prioridade):**
1. `ModalRegistroPosAula.tsx` (303 linhas — maior e mais usado)
2. `ModalGradeSemanal.tsx` (203 linhas — calendário)
3. `ModalRegistroRapido.tsx` (208 linhas — acesso rápido)
4. `ModalGestaoTurmas.tsx` (150 linhas — formulário longo)
5. Demais modais menores (< 120 linhas)

#### 2B (opcional) — Bottom navigation bar em mobile

O app tem ~7 abas no topo. Em mobile, mesmo com scroll horizontal, é difícil de usar.
A solução moderna (Instagram, YouTube, apps nativos) é uma **barra de navegação inferior**
em mobile + abas horizontais mantidas no desktop.

**Estrutura visual:**
```
┌─────────────────────────────────┐
│         conteúdo do módulo      │
│                                 │
│                                 │
├─────────────────────────────────┤
│  🗓️ Agenda  📋 Planos  🎵 Rep.  ⋯ Mais  │
└─────────────────────────────────┘
```

**Implementação sugerida em `BancoPlanos.tsx`:**
```tsx
{/* Bottom nav — apenas em mobile */}
<nav className="fixed bottom-0 left-0 right-0 sm:hidden bg-white border-t border-slate-200
                flex justify-around items-center py-2 z-40"
     style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
  {[
    { id: 'lista', icon: '📋', label: 'Planos' },
    { id: 'calendario', icon: '🗓️', label: 'Agenda' },
    { id: 'repertorio', icon: '🎵', label: 'Músicas' },
    { id: 'mais', icon: '⋯', label: 'Mais' },
  ].map(tab => (
    <button key={tab.id} onClick={() => setViewMode(tab.id)}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg
        ${viewMode === tab.id ? 'text-indigo-600' : 'text-slate-400'}`}>
      <span className="text-xl">{tab.icon}</span>
      <span className="text-[10px] font-medium">{tab.label}</span>
    </button>
  ))}
</nav>

{/* Espaçador para compensar o bottom nav em mobile */}
<div className="h-16 sm:hidden" />
```

Esta é a mudança de maior impacto em UX, mas também a mais trabalhosa. Fazer por último.

#### 2C — ModuloLista.tsx: Filtros laterais em mobile

Os filtros de planos podem estar em `flex-row` que quebra em mobile.

**O que fazer:**
1. Mover filtros para um drawer/accordion em mobile:
```tsx
{/* Mobile: filtros colapsáveis */}
<div className="sm:hidden">
  <button onClick={() => setFiltrosAbertos(!filtrosAbertos)}
    className="w-full flex justify-between items-center py-2 px-3 bg-slate-100 rounded-lg text-sm">
    🔍 Filtros {filtrosAtivos > 0 && <span className="badge">{filtrosAtivos}</span>}
    <ChevronDown className={filtrosAbertos ? 'rotate-180' : ''} />
  </button>
  {filtrosAbertos && <div className="mt-2 space-y-2">{/* filtros */}</div>}
</div>

{/* Desktop: filtros sempre visíveis */}
<div className="hidden sm:flex flex-wrap gap-2">{/* filtros */}</div>
```

**Verificação pós-Fase 2:**
```bash
npx tsc --noEmit && npm run build && npm test -- --run
```
Commit: `feat: mobile fase 2 — navegação, forms e modais`

---

### Fase 3 — Médios: Polimento geral

**Objetivo:** Refinamento final — tamanhos de fonte, espaçamentos, áreas de toque.
**Esforço estimado:** 2–3 horas

#### 3A — Áreas de toque mínimas (44×44px)

Apple e Google recomendam área de toque mínima de 44×44px. Verificar botões pequenos:

```tsx
// Botões de ação em cards (editar, excluir, arquivar)
// ANTES
<button className="p-1 text-xs rounded">

// DEPOIS
<button className="p-2 sm:p-1 text-xs rounded min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0">
// OU usar padding maior com tap area virtual:
<button className="relative p-1 rounded before:absolute before:-inset-2 before:content-['']">
```

#### 3B — Tipografia responsiva

Escalar tamanhos de fonte suavemente:

```tsx
// Títulos de seção
className="text-base sm:text-lg font-semibold"  // 16px → 18px

// Subtextos e metadados
className="text-xs sm:text-sm text-slate-500"   // 12px → 14px

// NUNCA usar text-[9px] — mínimo absoluto é text-[10px] = 10px
// Preferir text-xs (12px) como mínimo padrão
```

#### 3C — Campos de formulário otimizados para mobile

Adicionar atributos que melhoram experiência em mobile:

```tsx
// Números (duração, quantidade)
<input type="text" inputMode="numeric" pattern="[0-9]*" />

// URLs de recursos/links
<input type="url" inputMode="url" autoComplete="url" />

// Datas
<input type="date" />  // já adequado

// Busca
<input type="search" inputMode="search" />

// Nomes (escola, turma)
<input type="text" autoComplete="organization" />
```

#### 3D — Feedback visual de ações em mobile

Adicionar `active:scale-95` em botões para feedback tátil visual:

```tsx
// Botões principais
<button className="... active:scale-95 transition-transform">

// Cards clicáveis
<div className="... cursor-pointer active:scale-[0.98] transition-transform">
```

#### 3E — Scroll behavior melhorado

Em listas longas, garantir que o scroll seja suave:

```tsx
// Listas de cards
<div className="space-y-3 overflow-y-auto overscroll-contain">

// Prevenir bounce indesejado em iOS
// Em index.css, adicionar:
body { overscroll-behavior: none; }
.scrollable { overscroll-behavior: contain; }
```

**Verificação pós-Fase 3:**
```bash
npx tsc --noEmit && npm run build && npm test -- --run
```
Commit: `feat: mobile fase 3 — polimento, touch areas e tipografia`

---

### Fase 4 — Bônus: PWA e otimizações avançadas (opcional)

**Objetivo:** Transformar o app em uma PWA instalável, com experiência próxima de app nativo.
**Esforço estimado:** 4–6 horas
**Pré-requisito:** Fases 1–3 concluídas

#### 4A — PWA: Manifesto e Service Worker

1. Criar `public/manifest.json`:
```json
{
  "name": "MusiLab",
  "short_name": "MusiLab",
  "description": "Planejamento Musical Educacional",
  "start_url": "/MusiLab/",
  "display": "standalone",
  "background_color": "#1e1b4b",
  "theme_color": "#1e1b4b",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/MusiLab/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/MusiLab/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

2. Adicionar link no `index.html`:
```html
<link rel="manifest" href="/MusiLab/manifest.json" />
<meta name="theme-color" content="#1e1b4b" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

3. Instalar `vite-plugin-pwa` para service worker automático:
```bash
npm install -D vite-plugin-pwa
```

4. Configurar em `vite.config.ts`:
```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/eufwttfndthjrvxtturl\.supabase\.co\/.*/,
          handler: 'NetworkFirst',
          options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50 } }
        }]
      }
    })
  ]
})
```

#### 4B — Ícones para PWA

Criar ícones em `public/`:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)
- `apple-touch-icon.png` (180×180px)

Podem ser gerados a partir do emoji 🎵 ou de um logo customizado.

#### 4C — Safe Area Insets (iPhone X+)

Para iPhones com notch/Dynamic Island:

```css
/* index.css */
.safe-top    { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

```tsx
// Header principal
<div className="... pt-safe">

// Tab bar / footer fixo
<div className="... pb-safe">
```

#### 4D — Drag-and-drop: suporte a touch

O app usa drag-and-drop em cards e sequências (`handleDragStart`, `handleDragEnter`, etc.).
A API nativa `drag` do HTML não funciona em iOS/Android.

**Solução:** Adicionar suporte a pointer events como fallback:

```typescript
// Wrapper para drag handlers com suporte touch
function useDragTouch({
  onDragStart,
  onDragEnter,
  onDragEnd
}: DragHandlers) {
  // Implementar com PointerEvents que funcionam em touch
  // ...
}
```

**Alternativa mais simples:** Adicionar botões de "mover para cima/baixo" em mobile como fallback para drag:
```tsx
{isMobile && (
  <div className="flex flex-col gap-1">
    <button onClick={() => moverParaCima(idx)}>↑</button>
    <button onClick={() => moverParaBaixo(idx)}>↓</button>
  </div>
)}
```

**Verificação pós-Fase 4:**
```bash
npx tsc --noEmit && npm run build && npm test -- --run
# Testar PWA: npm run preview → inspecionar no Chrome DevTools → Application → Manifest
```
Commit: `feat: mobile fase 4 — PWA, safe area e touch drag`

---

## Checklist de progresso

- [x] **Pré-requisito**: Testar app funcionalmente — OK (confirmado pelo usuário em 2026-03-03)
- [x] Fase 0 — iOS fixes: `100dvh` + `font-size 16px` em inputs — commit `a04395b`
- [x] Fase 1 — Críticos: calendário + tabela histórico + min-w — commit `b7d3c09`
  - 1A: TelaCalendario — padding reduzido mobile, header empilhado, day names 1 letra, célula min-h-[52px], botão hover oculto em touch
  - 1B: ModuloHistoricoMusical — card view mobile (sm:hidden) + tabela (hidden sm:block)
  - 1C: BancoPlanos widget "hoje" oculto em mobile (hidden sm:block) — evita overflow horizontal no header
- [x] Fase 2 — Altos: navegação/tabs + forms + modais — commit `3e8589f`
  - 2A: BancoPlanos tabs — labels abreviados mobile (`short`), gap/px reduzidos, `scrollbar-hide`
  - 2B: TelaPrincipal form — `max-h-[85dvh]` mobile, grid 1col mobile, padding reduzido, `active:scale-95`
  - 2C: 11 modais — bottom sheet (`items-end sm:items-center`, `rounded-t-2xl sm:rounded-2xl`, `p-0 sm:p-4`)
- [x] Fase 2B (opcional) — Bottom navigation bar em mobile — commit `5d47f7a`
  - Nav fixa no bottom: 🏠 Início, 📅 Agenda, ➕ Nova, 🎼 Músicas, ⋯ Mais (sm:hidden)
  - Painel "Mais" com 6 módulos secundários (Hoje, Meu Ano, Histórico, Estratégias, Atividades, Sequências)
  - `safe-area-inset-bottom` para iPhone X+ e espaçador `h-16` para conteúdo não ficar sob o nav
- [x] Fase 3 — Médios: polimento, touch areas, tipografia — commit `bdec360`
  - 3A: Botões ✏️🗑️ visíveis no mobile (`sm:opacity-0`) + `p-2 sm:p-1` (44px touch target) — ModuloAtividades, ModuloAnoLetivo
  - 3C: `inputMode="numeric"` em campos numéricos (ModuloSequencias, ModalGestaoTurmas); `inputMode="search"` em barras de busca (TelaPrincipal, ModuloHistoricoMusical)
  - 3D: `active:scale-[0.98]` em cards clicáveis — ModuloSequencias (2 cards), ModuloLista
  - 3E: `overscroll-y-contain` em todos os 10 modais com `overflow-y-auto`
- [x] Fase 4 — Bônus: PWA e touch drag — commit `9c80457`
  - 4A: `vite-plugin-pwa` com service worker (workbox), manifest gerado automaticamente
  - 4B: `public/icon.svg` (512x512 SVG com gradiente indigo e nota musical)
  - 4C: `viewport-fit=cover` + meta apple-mobile-web-app + classes `.safe-pt/.safe-pb` no CSS; header com `.safe-pt` (notch/Dynamic Island)
  - 4D: botões ↑↓ `sm:hidden` nas atividades do roteiro (fallback mobile para drag-and-drop)

---

## Regras de trabalho

- Trabalhar SEMPRE no branch `claude/add-usestate-comments-evQWg`
- **APÓS CADA FASE**: `npx tsc --noEmit && npm run build && npm test -- --run` → commit → push → merge para main
- **Testar no DevTools**: Chrome → Toggle device toolbar → iPhone SE (375px) e iPhone 14 Pro Max (430px)
- **Não quebrar desktop**: cada mudança deve funcionar em mobile E desktop
- `.env` NUNCA vai para o git

## Como testar localmente em mobile

```bash
npm run dev
# O Vite expõe na rede local: geralmente http://192.168.x.x:5173
# Acessar pelo celular conectado na mesma rede Wi-Fi
```

Ou usar Chrome DevTools:
1. F12 → ícone de celular (Toggle device toolbar)
2. Testar em: iPhone SE (375px), iPad (768px), Galaxy S21 (384px)

---

## Informações do projeto

- **Repositório**: https://github.com/rmribeiro2024/MusiLab
- **App online**: https://rmribeiro2024.github.io/MusiLab/
- **Branch de trabalho**: `claude/add-usestate-comments-evQWg`
- **Stack**: React 18 + Vite 5 + Tailwind CSS 3.4.14 + Supabase + TypeScript
- **Testes**: Vitest + React Testing Library (35 testes em `src/tests/`)
- **Contextos de domínio**: 8 contextos em `src/contexts/` (refatoração concluída)

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
