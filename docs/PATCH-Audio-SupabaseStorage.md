# PATCH — Migração de Áudio: base64 → Supabase Storage

**Data de criação:** 2026-03-12
**Status:** ⏸️ NÃO IMPLEMENTADO — documentado para implementação futura
**Motivo do adiamento:** Supabase com egress estourado (incidente 11/03). Implementar após reset do billing.

---

## Por que fazer esta mudança

O áudio gravado no celular após a aula fica salvo como base64 dentro do objeto `Plano` (campo `RegistroPosAula.audioNotaDeVoz`). Este dado sobe para o Supabase junto com o plano via `syncToSupabase('planos', ...)`.

**O problema:** se o sync não rodou antes de fechar o celular (offline, egress estourado, app fechado rápido), o áudio fica preso no IndexedDB local do celular e não aparece no desktop.

**A solução:** fazer upload do áudio diretamente para o Supabase Storage logo após gravar. O Storage é independente do ciclo de sync — a URL fica disponível em qualquer dispositivo imediatamente.

---

## Estado atual (ANTES da mudança) — para rollback

### `src/types/index.ts` — campos de áudio em `RegistroPosAula` (linhas ~132-134):
```ts
audioNotaDeVoz?: string   // base64 do blob de áudio (sem prefixo data:...)
audioDuracao?: number     // segundos gravados
audioMime?: string        // mime type (ex: 'audio/webm')
```

### `src/lib/audioRecorder.ts` — arquivo completo (não muda no rollback):
```ts
// Funções existentes que permanecem:
startRecording(): Promise<void>
stopRecording(): Promise<Blob>
blobToBase64(blob: Blob): Promise<string>
base64ToObjectUrl(base64: string, mimeType?: string): string
base64SizeKb(base64: string): number
```

### `src/components/modals/ModalRegistroPosAula.tsx` — pontos de uso do áudio:
- **Linha 5 (import):** `import { startRecording, stopRecording, blobToBase64, base64ToObjectUrl, base64SizeKb } from '../../lib/audioRecorder'`
- **Linhas 413-416 (estados):** `audioBase64`, `audioDuracao`, `audioMime`, `audioUrl`
- **Linha ~1040-1043 (após parar gravação automática):** converte blob → base64 → seta `novoRegistro.audioNotaDeVoz`
- **Linha ~1068-1072 (após parar gravação manual):** idem
- **Linha ~1079-1090 (player):** `<audio src={audioUrl}>` onde `audioUrl` é um ObjectURL criado do base64
- **Linha ~1086-1088 (excluir áudio):** revoga ObjectURL + remove campos do novoRegistro
- **Linha ~1394 (lista histórico):** badge 🎙️ se `reg.audioNotaDeVoz` existe
- **Linha ~1482-1490 (player no histórico):** `base64ToObjectUrl(reg.audioNotaDeVoz, reg.audioMime)` como src

### Commit de referência do áudio implementado:
```
99390a2  feat(audio): nota de voz no pós-aula (B3) — gravar/reproduzir/excluir
```

**Para rollback completo:** `git revert 99390a2` ou `git checkout 99390a2~1 -- src/lib/audioRecorder.ts src/types/index.ts src/components/modals/ModalRegistroPosAula.tsx`

---

## O que muda com a implementação do Storage

### Fluxo atual (base64):
```
Gravar → Blob → base64 string → salvo em novoRegistro.audioNotaDeVoz
                               → sobe com o plano no próximo sync
                               → desktop reconstrói blob via base64ToObjectUrl()
```

### Fluxo novo (Storage):
```
Gravar → Blob → upload imediato → supabase.storage.from('audio-notas').upload(path, blob)
                                → salva apenas audioUrl: "https://...supabase.co/..."
                                → URL disponível em qualquer device imediatamente
                                → <audio src={audioUrl}> toca direto
```

---

## Passo a passo de implementação

### Pré-requisito (Supabase Dashboard — 5 minutos):
1. Acesse https://supabase.com/dashboard → seu projeto → Storage
2. Clique "New bucket" → Nome: `audio-notas` → marque "Public bucket" → Create
3. Vá em Storage → Policies → audio-notas → Add policy:
   - Policy name: `allow_authenticated_upload`
   - Allowed operations: INSERT, SELECT, DELETE
   - Target roles: `authenticated`
   - Using expression: `(auth.uid() = owner)` ou `true` (mais simples para começar)

### Mudança 1 — `src/types/index.ts`:
```ts
// REMOVER:
audioNotaDeVoz?: string
audioMime?: string

// ADICIONAR:
audioUrl?: string         // URL pública no Supabase Storage
audioDuracao?: number     // mantém (não muda)
```
> **Retrocompatibilidade:** manter `audioNotaDeVoz` como campo opcional deprecated por 1 versão para não quebrar registros antigos que ainda têm base64 salvo.

### Mudança 2 — `src/lib/audioRecorder.ts`:
Adicionar função de upload:
```ts
import { supabase } from './supabase'

export async function uploadAudioBlob(
  blob: Blob,
  userId: string,
  registroId: string
): Promise<string> {
  const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm'
  const path = `${userId}/${registroId}.${ext}`

  const { error } = await supabase.storage
    .from('audio-notas')
    .upload(path, blob, { upsert: true, contentType: blob.type })

  if (error) throw new Error(`Upload falhou: ${error.message}`)

  const { data } = supabase.storage.from('audio-notas').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteAudioFromStorage(audioUrl: string): Promise<void> {
  // Extrai o path da URL pública
  const match = audioUrl.match(/audio-notas\/(.+)$/)
  if (!match) return
  const path = match[1]
  await supabase.storage.from('audio-notas').remove([path])
}
```

### Mudança 3 — `src/components/modals/ModalRegistroPosAula.tsx`:

**Import — adicionar:**
```ts
import { startRecording, stopRecording, uploadAudioBlob, deleteAudioFromStorage, base64SizeKb } from '../../lib/audioRecorder'
```
(remover `blobToBase64`, `base64ToObjectUrl` dos imports)

**Estado — remover `audioBase64`, `audioMime`; adicionar `audioStorageUrl`:**
```ts
const [audioStorageUrl, setAudioStorageUrl] = React.useState<string | null>(null)
const [audioDuracao, setAudioDuracao] = React.useState(0)
const [uploadingAudio, setUploadingAudio] = React.useState(false)
```

**Após parar gravação — substituir conversão base64 por upload:**
```ts
const blob = await stopRecording()
setUploadingAudio(true)
try {
  const url = await uploadAudioBlob(blob, userId!, novoRegistro.id ?? String(Date.now()))
  setAudioStorageUrl(url)
  setNovoRegistro((prev: any) => ({ ...prev, audioUrl: url, audioDuracao: dur }))
} catch (err) {
  // fallback: mostrar erro ao usuário
  console.error('Upload de áudio falhou:', err)
} finally {
  setUploadingAudio(false)
}
```

**Player no modal — simplificar:**
```tsx
{audioStorageUrl && (
  <audio controls src={audioStorageUrl} style={{ width: '100%', height: 32 }} />
)}
```

**Excluir áudio — chamar deleteAudioFromStorage:**
```ts
if (audioStorageUrl) await deleteAudioFromStorage(audioStorageUrl)
setAudioStorageUrl(null)
setNovoRegistro((prev: any) => { const { audioUrl: _u, audioDuracao: _d, ...rest } = prev; return rest })
```

**Player no histórico — usar URL direta:**
```tsx
{reg.audioUrl && (
  <audio controls src={reg.audioUrl} style={{ width: '100%', height: 32 }} />
)}
// Manter fallback para registros antigos com base64:
{!reg.audioUrl && reg.audioNotaDeVoz && (
  <audio controls src={base64ToObjectUrl(reg.audioNotaDeVoz, reg.audioMime || 'audio/webm')} />
)}
```

---

## Considerações de custo (Supabase Free Tier)

| Métrica | Limite free | Estimativa de uso real |
|---------|-------------|----------------------|
| Armazenamento | 1 GB | 30s × 60KB = ~60KB/áudio → 16.000 gravações |
| Banda (egress) | 2 GB/mês | Áudio só baixado ao clicar play → baixíssimo |
| Risco de estouro | Baixo | Áudio não baixa no sync geral — só sob demanda |

---

## Quando implementar

✅ Implementar quando:
- Supabase estiver com egress normalizado (após reset de billing)
- Tiver confirmado que o problema de sync entre dispositivos persiste no uso real

⏸️ Adiar se:
- Base64 via sync já estiver resolvendo o problema (monitorar por 1 semana)
- Egress ainda estiver alto

---

*Documento criado em 2026-03-12. Commit de referência para rollback: `99390a2`*
