# MusiLab — Migração TypeScript

## Status atual: **FASE 1 CONCLUÍDA** (commit `594be7d`)

---

## Por que TypeScript?
O projeto tem 21.000+ linhas em JS/JSX sem tipagem. A migração é incremental
com `allowJs: true` — os arquivos `.jsx` continuam funcionando enquanto os
arquivos menores são convertidos primeiro. Nenhuma funcionalidade é alterada.

---

## Arquivos JÁ convertidos ✅ (Fase 1)

| Arquivo | Extensão anterior | Extensão atual | Observação |
|---------|------------------|----------------|------------|
| `src/main` | `.jsx` | `.tsx` | Entry point tipado |
| `src/lib/db` | `.js` | `.ts` | `dbInit`, `dbGet`, `dbSet`, `dbDel`, `dbSize` com tipos |
| `src/lib/utils` | `.js` | `.ts` | `sanitizar`, `gerarIdSeguro`, `syncToSupabase`, `loadFromSupabase` |
| `src/lib/supabase` | `.js` | `.ts` | `SupabaseClient` tipado |
| `src/utils/helpers` | `.js` | `.ts` | `lerLS<T>`, `salvarLS`, `formatarData` |
| `src/components/BancoPlanosContext` | `.js` | `.ts` | `createContext<BancoPlanosContextValue \| null>` |

## Arquivos criados ✅ (Fase 1)

| Arquivo | O que contém |
|---------|-------------|
| `tsconfig.json` | Configuração TypeScript (`allowJs`, `checkJs:false`, `strict:false`) |
| `src/vite-env.d.ts` | Declaração de `import.meta.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) |
| `src/types/index.ts` | **Todas as interfaces do domínio** — ver seção abaixo |

---

## Interfaces definidas em `src/types/index.ts`

```typescript
SyncStatus          // 'idle' | 'salvando' | 'salvo' | 'erro'
AtividadeRoteiro    // item do roteiro de uma aula
RegistroPosAula     // registro pós-aula
Plano               // plano de aula completo
Atividade           // atividade pedagógica
Musica              // música do repertório
SlotSequencia       // slot de uma sequência didática
Sequencia           // sequência didática com slots
Estrategia          // estratégia pedagógica
Turma               // turma dentro de um segmento
Segmento            // segmento dentro de uma escola
Escola              // escola com segmentos
AnoLetivo           // ano letivo com escolas
EventoEscolar       // evento no calendário escolar
SlotGrade           // slot da grade semanal
GradeSemanal        // grade semanal com slots
ModalConfirmState   // estado do modal de confirmação
Configuracoes       // configurações gerais do app
SupabaseRow<T>      // linha do banco Supabase
BancoPlanosContextValue  // ctx principal (parcial — expandir nas fases seguintes)
```

---

## Configuração do tsconfig.json

```json
{
  "compilerOptions": {
    "allowJs": true,       // .jsx continuam funcionando
    "checkJs": false,      // não exige tipos nos .jsx existentes
    "strict": false,       // migração gradual — sem erros imediatos
    "noEmit": true,        // Vite faz o build, TS só faz type-check
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "target": "ES2020"
  }
}
```

**Para verificar erros TypeScript:**
```bash
npx tsc --noEmit
```

---

## Roteiro das próximas fases

### Fase 2 — Componentes simples (próxima sessão)
Arquivos a converter (renomear `.jsx` → `.tsx` + adicionar tipos nas props):

- [ ] `src/components/ErrorBoundary.jsx` → `.tsx`
- [ ] `src/components/RichTextEditor.jsx` → `.tsx`
- [ ] `src/components/modals/ModalConfirm.jsx` → `.tsx`
- [ ] `src/components/modals/ModalConfiguracoes.jsx` → `.tsx`
- [ ] `src/components/modals/ModalAdicionarAoPlano.jsx` → `.tsx`
- [ ] `src/components/modals/ModalRegistroRapido.jsx` → `.tsx`
- [ ] `src/components/modals/ModalNovaMusicaInline.jsx` → `.tsx`
- [ ] `src/components/modals/ModalTemplatesRoteiro.jsx` → `.tsx`
- [ ] `src/components/modals/ModalNovaFaixa.jsx` → `.tsx`
- [ ] `src/components/modals/ModalNovaEscola.jsx` → `.tsx`
- [ ] `src/components/modals/ModalRegistroPosAula.jsx` → `.tsx`
- [ ] `src/components/modals/ModalGestaoTurmas.jsx` → `.tsx`
- [ ] `src/components/modals/ModalEventosEscolares.jsx` → `.tsx`
- [ ] `src/components/modals/ModalVincularMusica.jsx` → `.tsx`
- [ ] `src/components/modals/ModalImportarAtividade.jsx` → `.tsx`
- [ ] `src/components/modals/ModalImportarMusica.jsx` → `.tsx`
- [ ] `src/components/modals/ModalGradeSemanal.jsx` → `.tsx`

**Padrão de conversão dos modais:**
Todos usam `useBancoPlanos()` para acessar o ctx. Basta:
1. Renomear `.jsx` → `.tsx`
2. Adicionar `import type { Plano, Atividade, ... } from '../../types'` (se necessário)
3. Props: `() => JSX.Element` (sem props externas — tudo vem do ctx)

### Fase 3 — Componentes médios
- [ ] `src/utils/pdf.js` → `.ts` (jsPDF async, complexo)
- [ ] `src/components/ModuloAnoLetivo.jsx` → `.tsx`
- [ ] `src/components/ModuloEstrategias.jsx` → `.tsx`
- [ ] `src/components/ModuloAtividades.jsx` → `.tsx`
- [ ] `src/components/ModuloSequencias.jsx` → `.tsx`
- [ ] `src/components/ModuloHistoricoMusical.jsx` → `.tsx`
- [ ] `src/components/ModuloRepertorio.jsx` → `.tsx`
- [ ] `src/components/TelaCalendario.jsx` → `.tsx`
- [ ] `src/components/ModuloLista.jsx` → `.tsx`

### Fase 4 — Componentes grandes (maior esforço)
- [ ] `src/components/TelaPrincipal.jsx` → `.tsx` (~1400 linhas)
- [ ] `src/components/BancoPlanos.jsx` → `.tsx` (~3300 linhas, 172 useState)

### Fase 5 — App.jsx (código morto + refatoração)
- [ ] `src/App.jsx` → `.tsx`
  - ⚠️ Contém `BancoPlanosImpl` (~linhas 191–9750) que é **código morto**
  - Remover o código morto ANTES de tipar
  - Só o `LoginScreen` e o wrapper de auth precisam existir (~150 linhas)

---

## Como continuar em uma nova sessão

1. Ler este arquivo (`TYPESCRIPT_MIGRATION.md`) para entender o estado atual
2. Verificar o status com:
   ```bash
   npx tsc --noEmit   # zero erros esperado nos arquivos .ts
   npm run build      # deve passar
   npm test           # 35 testes devem passar
   ```
3. Continuar pela **Fase 2** — converter ErrorBoundary e os 14 modais para `.tsx`
4. Padrão de conversão de componente `.jsx` → `.tsx`:
   - Renomear o arquivo
   - Adicionar tipos nas props (se houver)
   - Importar tipos de `../../types` quando necessário
   - `useBancoPlanos()` já retorna `BancoPlanosContextValue` — ctx é tipado automaticamente

---

## Informações do projeto

- **Repositório**: https://github.com/rmribeiro2024/MusiLab
- **App online**: https://rmribeiro2024.github.io/MusiLab/
- **Branch de trabalho**: `claude/add-usestate-comments-evQWg`
- **Stack**: React 18 + Vite 5 + Tailwind CSS + Supabase + TypeScript (parcial)
- **Testes**: Vitest + React Testing Library (35 testes em `src/tests/`)

## Comandos úteis

```bash
npm run dev          # servidor local → http://localhost:5173
npm run build        # build de produção
npm test             # rodar testes
npx tsc --noEmit     # verificar erros TypeScript
```

## Arquivo .env (NÃO vai para o git — recriar se sumir)

```
VITE_SUPABASE_URL=https://eufwttfndthjrvxtturl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1Znd0dGZuZHRoanJ2eHR0dXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mzg4NjgsImV4cCI6MjA4NzIxNDg2OH0.-4soPgR28aL_EwjJXcrBzfLGF4MblxG2iDZC2LD6B0Y
```
