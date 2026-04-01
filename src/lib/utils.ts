import DOMPurify from 'dompurify'
import { supabase } from './supabase'
import type { SyncStatus } from '../types'

// ── LISTA CURADA DE CONCEITOS MUSICAIS PEDAGÓGICOS ──────────────────────────
// Usada como lista fechada para detecção por IA — impede conceitos genéricos.
// Baseada em: Swanwick (CLASP), Orff-Schulwerk, Dalcroze, Gordon (MLT),
// Elliott (Music Matters), BNCC Arte/Música, parâmetros do som clássicos.
export const CONCEITOS_MUSICAIS: string[] = [
  // Ritmo e Organização Temporal
  'Pulsação', 'Andamento', 'Métrica', 'Compasso Binário', 'Compasso Ternário',
  'Compasso Quaternário', 'Células Rítmicas', 'Síncope', 'Ostinato', 'Polirritmia',
  'Acento Rítmico', 'Subdivisão',
  // Altura e Melodia
  'Altura', 'Grave e Agudo', 'Contorno Melódico', 'Fraseado', 'Intervalos',
  'Escala', 'Escala Pentatônica', 'Tonalidade', 'Modo', 'Afinação',
  // Harmonia e Textura
  'Acorde', 'Campo Harmônico', 'Consonância', 'Dissonância', 'Textura Musical',
  'Uníssono', 'Polifonia', 'Homofonia', 'Bordão',
  // Forma e Estrutura
  'Forma AB', 'Forma ABA', 'Cânone', 'Rondó', 'Motivo', 'Frase Musical',
  'Repetição', 'Contraste', 'Variação', 'Introdução e Coda',
  // Dinâmica e Expressão
  'Dinâmica', 'Crescendo', 'Decrescendo', 'Articulação', 'Legato', 'Staccato',
  'Timbre', 'Caráter Musical', 'Expressão Musical',
  // Voz e Corpo
  'Respiração Diafragmática', 'Emissão Vocal', 'Ressonância Vocal',
  'Percussão Corporal', 'Coordenação Motora', 'Movimento Expressivo',
  // Processos Criativos
  'Improvisação', 'Composição', 'Arranjo', 'Criação Coletiva',
  // Escuta e Percepção
  'Escuta Ativa', 'Percepção Rítmica', 'Percepção Melódica', 'Análise Auditiva',
  // Contexto Cultural
  'Gênero Musical', 'Folclore Brasileiro', 'Ciranda', 'Samba', 'Maracatu',
]

// ── COR ESTÁVEL POR CONCEITO (hash determinístico) ───────────────────────────
// Mesmo conceito → mesma cor em qualquer renderização.
const CONCEPT_COLORS = [
  { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)',  text: '#6366f1' }, // indigo
  { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)',  text: '#8b5cf6' }, // violet
  { bg: 'rgba(20,184,166,0.12)', border: 'rgba(20,184,166,0.3)',  text: '#0d9488' }, // teal
  { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)',  text: '#d97706' }, // amber
  { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)',  text: '#db2777' }, // pink
  { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.3)',  text: '#0284c7' }, // sky
]
export function getConceptColor(concept: string) {
  let h = 0
  for (let i = 0; i < concept.length; i++) h = (h * 31 + concept.charCodeAt(i)) >>> 0
  return CONCEPT_COLORS[h % CONCEPT_COLORS.length]
}

// ── SANITIZAÇÃO XSS ──
// Usa DOMPurify para limpar HTML antes de renderizar no DOM.
// Permite apenas tags seguras de formatação de texto (sem script, iframe, etc).
export function sanitizar(html: string): string {
    if (!html) return ''
    if (typeof DOMPurify === 'undefined') return html // fallback se CDN falhar
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'p', 'span'],
        ALLOWED_ATTR: [], // nenhum atributo permitido (bloqueia onclick, href malicioso, etc)
    })
}

// ── SANITIZAÇÃO RICH (para conteúdo do TipTapEditor) ──
// Permite iframes de YouTube/Spotify e links — conteúdo gerado pelo próprio professor.
export function sanitizarRich(html: string): string {
    if (!html) return ''
    if (typeof DOMPurify === 'undefined') return html
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'ul', 'ol', 'li', 'p', 'span',
                       'a', 'div', 'iframe'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'width', 'height', 'frameborder',
                       'allow', 'loading', 'style', 'data-spotify', 'data-youtube-video',
                       'data-type', 'class'],
        ALLOW_DATA_ATTR: false,
        FORCE_BODY: false,
    })
}

// ── SANITIZAÇÃO DE URL ──
// Bloqueia protocolos perigosos (javascript:, vbscript:, data:text/html).
// Permite data URIs de arquivos uploadados (imagens, áudio, PDF).
export function sanitizeUrl(url: string): string {
    if (!url) return '#'
    const trimmed = url.trim()
    // data: URIs de arquivos binários são permitidos (upload local)
    if (
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('data:audio/') ||
        trimmed.startsWith('data:video/') ||
        trimmed.startsWith('data:application/pdf')
    ) return trimmed
    // Bloqueia qualquer outro protocolo perigoso
    const lower = trimmed.toLowerCase().replace(/[\s\t\n\r]/g, '')
    if (
        lower.startsWith('javascript:') ||
        lower.startsWith('vbscript:') ||
        lower.startsWith('data:')
    ) return '#'
    return trimmed
}

// ── LABEL LEGÍVEL PARA URLs ──
// Converte URLs longas em nomes curtos e legíveis para exibição no preview do plano.
export function getLinkLabel(url: string): string {
    if (!url) return 'Link'
    try {
        const u = new URL(url)
        const host = u.hostname.replace(/^www\./, '')
        // Google Drive — arquivo
        if (host === 'drive.google.com') {
            if (u.pathname.includes('/folders/')) return 'Pasta Google Drive'
            if (u.pathname.includes('/file/d/')) return 'Google Drive'
            return 'Google Drive'
        }
        // Google Docs / Sheets / Slides
        if (host === 'docs.google.com') {
            if (u.pathname.includes('/spreadsheets/')) return 'Google Sheets'
            if (u.pathname.includes('/presentation/')) return 'Google Slides'
            return 'Google Docs'
        }
        // YouTube
        if (host === 'youtube.com' || host === 'youtu.be') return 'YouTube'
        // Spotify
        if (host === 'open.spotify.com') return 'Spotify'
        // SoundCloud
        if (host === 'soundcloud.com') return 'SoundCloud'
        // Outros: mostra só o domínio
        return host
    } catch {
        // URL inválida — mostra primeiros 40 chars
        return url.length > 40 ? url.slice(0, 38) + '…' : url
    }
}

// ── VALIDAÇÃO DE SCHEMA DE BACKUP ──
// Verifica se o arquivo JSON importado tem a estrutura esperada do MusiLab.
export function validarBackup(data: unknown): { valido: boolean; erro?: string } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { valido: false, erro: 'O arquivo não é reconhecido como backup do MusiLab.' }
    }
    const b = data as Record<string, unknown>
    if (!Array.isArray(b.planos)) {
        return { valido: false, erro: 'Backup inválido: seção "planos" ausente ou corrompida.' }
    }
    const LIMITE = 5000
    const campos = ['planos', 'atividades', 'repertorio', 'sequencias', 'anosLetivos', 'eventosEscolares', 'gradesSemanas'] as const
    for (const campo of campos) {
        const v = b[campo]
        if (v !== undefined) {
            if (!Array.isArray(v)) return { valido: false, erro: `Campo "${campo}" inválido no backup.` }
            if ((v as unknown[]).length > LIMITE) return { valido: false, erro: `O backup contém muitos itens em "${campo}" (limite: ${LIMITE}). Arquivo suspeito.` }
        }
    }
    return { valido: true }
}

// ── GERAÇÃO DE ID ÚNICO ──
// Usa crypto.randomUUID() (nativo, seguro) com fallback para browsers antigos.
export function gerarIdSeguro(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    // Fallback: UUID v4 manual (browsers antigos)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
}

type OnStatus = (status: SyncStatus, detail?: string) => void

// Último erro de sync — usado para mostrar detalhe no toast de erro
export let lastSyncErrorDetail = ''

// Extrai mensagem de erro — lida com PostgrestError (objeto Supabase) e JS Error
function extractMsg(e: unknown): string {
    if (!e) return 'erro desconhecido'
    if (e instanceof Error) return e.message
    if (typeof e === 'object') {
        const o = e as Record<string, unknown>
        const parts = [o['code'], o['message'], o['details'], o['hint']].filter(Boolean)
        return parts.length ? parts.join(' | ') : JSON.stringify(e)
    }
    return String(e)
}

// ── SYNC ROBUSTO: upsert por item individual com retry ──
// Cada item precisa ter um campo 'id' único para o upsert funcionar.
// A tabela no Supabase deve ter coluna unique em (user_id, item_id).
export async function syncToSupabase(
    tabela: string,
    itens: Record<string, unknown>[],
    userId: string,
    onStatus?: OnStatus
): Promise<boolean> {
    const MAX_TENTATIVAS = 3
    const DELAY_RETRY = 2000
    // AbortController REMOVIDO — causava "AbortError: signal is aborted without reason"
    // em redes lentas. O timeout natural do fetch/TCP é suficiente para evitar hang indefinido.
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        try {
            if (itens && itens.length > 0) {
                const rows = itens.map(item => {
                    if (!item.id) item.id = gerarIdSeguro()
                    return { user_id: userId, item_id: String(item.id), data: item }
                })

                const LOTE = 3 // lote pequeno — evita timeout 57014 com JSONB grandes // reduzido de 50 → evita timeout 57014 com JSONB grandes
                for (let i = 0; i < rows.length; i += LOTE) {
                    const lote = rows.slice(i, i + LOTE)
                    const { error } = await supabase
                        .from(tabela)
                        .upsert(lote, { onConflict: 'user_id,item_id' })
                    if (error) throw error
                }

                const idsAtivos = rows.map(r => r.item_id)
                const { error: deleteError } = await supabase
                    .from(tabela)
                    .delete()
                    .eq('user_id', userId)
                    .not('item_id', 'in', `(${idsAtivos.join(',')})`)
                if (deleteError) throw deleteError
            } else {
                await supabase.from(tabela).delete().eq('user_id', userId)
            }

            if (onStatus) onStatus('salvo')
            return true
        } catch(e: unknown) {
            const msg = extractMsg(e)
            console.warn(`[MusiLab] Tentativa ${tentativa}/${MAX_TENTATIVAS} falhou para '${tabela}':`, msg)
            if (tentativa < MAX_TENTATIVAS) {
                await sleep(DELAY_RETRY)
            } else {
                console.error(`[MusiLab] Falha definitiva ao sincronizar '${tabela}'. Dados salvos localmente.`)
                lastSyncErrorDetail = `${tabela}: ${msg}`
                if (onStatus) onStatus('erro', `${tabela}: ${msg}`)
                return false
            }
        }
    }
    return false
}

// ── DELTA SYNC: envia apenas itens alterados + deleta apenas removidos ──
// Mais eficiente que syncToSupabase completo quando poucos itens mudaram.
export async function syncDelta(
    tabela: string,
    changed: Record<string, unknown>[],   // itens novos ou modificados
    deletedIds: string[],                  // IDs removidos
    userId: string,
    onStatus?: OnStatus
): Promise<boolean> {
    const MAX_TENTATIVAS = 3
    const DELAY_RETRY = 2000
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        try {
            if (changed.length > 0) {
                const LOTE = 3 // lote pequeno — evita timeout 57014 com JSONB grandes
                for (let i = 0; i < changed.length; i += LOTE) {
                    const lote = changed.slice(i, i + LOTE).map(item => ({
                        user_id: userId,
                        item_id: String(item.id || gerarIdSeguro()),
                        data: item,
                    }))
                    const { error } = await supabase
                        .from(tabela)
                        .upsert(lote, { onConflict: 'user_id,item_id' })
                    if (error) throw error
                }
            }
            if (deletedIds.length > 0) {
                const { error } = await supabase
                    .from(tabela)
                    .delete()
                    .eq('user_id', userId)
                    .in('item_id', deletedIds)
                if (error) throw error
            }
            if (onStatus) onStatus('salvo')
            return true
        } catch(e: unknown) {
            const msg = extractMsg(e)
            console.warn(`[MusiLab] delta tentativa ${tentativa}/${MAX_TENTATIVAS} falhou para '${tabela}':`, msg)
            if (tentativa < MAX_TENTATIVAS) {
                await sleep(DELAY_RETRY)
            } else {
                lastSyncErrorDetail = `${tabela}: ${msg}`
                if (onStatus) onStatus('erro', `${tabela}: ${msg}`)
                return false
            }
        }
    }
    return false
}

export async function syncConfiguracoes(
    cfg: Record<string, unknown>,
    userId: string,
    onStatus?: OnStatus
): Promise<boolean> {
    // Mesma estratégia de retry do syncToSupabase — evita mostrar erro por falha transitória
    const MAX_TENTATIVAS = 3
    const DELAY_RETRY = 2000
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        try {
            // navigator.onLine REMOVIDO — pode dar falso positivo em certas redes/configs
            const { error } = await supabase
                .from('configuracoes')
                .upsert({ user_id: userId, data: cfg }, { onConflict: 'user_id' })
            if (error) throw error
            if (onStatus) onStatus('salvo')
            return true
        } catch(e: unknown) {
            const msg = extractMsg(e)
            console.warn(`[MusiLab] Tentativa ${tentativa}/${MAX_TENTATIVAS} falhou para 'configuracoes':`, msg)
            if (tentativa < MAX_TENTATIVAS) {
                await sleep(DELAY_RETRY)
            } else {
                console.error('[MusiLab] Falha definitiva ao sincronizar configuracoes.')
                lastSyncErrorDetail = `configuracoes: ${msg}`
                if (onStatus) onStatus('erro', `configuracoes: ${msg}`)
                return false
            }
        }
    }
    return false
}

export async function loadFromSupabase<T = unknown>(
    tabela: string,
    userId: string
): Promise<T[] | null> {
    try {
        const { data, error } = await supabase
            .from(tabela)
            .select('data')
            .eq('user_id', userId)
        if (error) throw error
        return (data as { data: T }[]).map(row => row.data)
    } catch(e: unknown) {
        const msg = extractMsg(e)
        console.error('[MusiLab] Erro ao carregar ' + tabela + ':', msg)
        return null
    }
}

/**
 * Carrega dados do Supabase página por página (50 itens/página por padrão).
 * `onPage` é chamado com cada página assim que chega — permite mostrar dados
 * progressivamente sem esperar o carregamento completo.
 */
export async function loadFromSupabasePaginated<T = unknown>(
    tabela: string,
    userId: string,
    onPage: (items: T[], isLast: boolean) => void,
    pageSize = 50
): Promise<void> {
    let from = 0
    try {
        while (true) {
            const { data, error } = await supabase
                .from(tabela)
                .select('data')
                .eq('user_id', userId)
                .range(from, from + pageSize - 1)
            if (error) throw error
            if (!data || data.length === 0) {
                if (from === 0) onPage([], true) // tabela vazia
                break
            }
            const items = (data as { data: T }[]).map(row => row.data)
            const isLast = data.length < pageSize
            onPage(items, isLast)
            if (isLast) break
            from += pageSize
        }
    } catch (e: unknown) {
        const msg = extractMsg(e)
        console.error('[MusiLab] Erro ao carregar ' + tabela + ' paginado:', msg)
    }
}

export async function loadConfiguracoes(userId: string): Promise<Record<string, unknown> | null> {
    try {
        const { data, error } = await supabase
            .from('configuracoes')
            .select('data')
            .eq('user_id', userId)
            .single()
        if (error) return null
        return (data as { data: Record<string, unknown> } | null)?.data || null
    } catch { return null }
}

// ── STRIP HTML ──
// Remove tags HTML e entidades comuns — para exibir como texto puro campos do RichTextEditor.
export function stripHTML(html: string): string {
    return html ? html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : ''
}

// ── YOUTUBE URL → ID ──
export function ytIdFromUrl(url: string | null | undefined): string | null {
    if (!url) return null
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
    return m ? m[1] : null
}
