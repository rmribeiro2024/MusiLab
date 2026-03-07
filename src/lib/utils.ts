import DOMPurify from 'dompurify'
import { supabase } from './supabase'
import type { SyncStatus } from '../types'

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

type OnStatus = (status: SyncStatus) => void

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
    const DELAY_RETRY = 1500
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
        try {
            if (!navigator.onLine) throw new Error('Sem conexão com a internet.')

            if (itens && itens.length > 0) {
                const rows = itens.map(item => {
                    if (!item.id) {
                        item.id = gerarIdSeguro()
                    }
                    return {
                        user_id: userId,
                        item_id: String(item.id),
                        data: item
                    }
                })

                // Upsert em lotes de 50 para evitar timeout
                const LOTE = 50
                for (let i = 0; i < rows.length; i += LOTE) {
                    const lote = rows.slice(i, i + LOTE)
                    const { error } = await supabase
                        .from(tabela)
                        .upsert(lote, { onConflict: 'user_id,item_id' })
                    if (error) throw error
                }

                const idsAtivos = rows.map(r => r.item_id)
                await supabase
                    .from(tabela)
                    .delete()
                    .eq('user_id', userId)
                    .not('item_id', 'in', `(${idsAtivos.join(',')})`)
            } else {
                // Lista vazia: apagar tudo do usuário nesta tabela
                await supabase.from(tabela).delete().eq('user_id', userId)
            }

            if (onStatus) onStatus('salvo')
            return true
        } catch(e: unknown) {
            const msg = e instanceof Error ? e.message : String(e)
            console.warn(`[MusiLab] Tentativa ${tentativa}/${MAX_TENTATIVAS} falhou para '${tabela}':`, msg)
            if (tentativa < MAX_TENTATIVAS) {
                await sleep(DELAY_RETRY * tentativa)
            } else {
                console.error(`[MusiLab] Falha definitiva ao sincronizar '${tabela}'. Dados salvos localmente.`)
                if (onStatus) onStatus('erro')
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
    try {
        if (!navigator.onLine) throw new Error('Sem conexão.')
        const { error } = await supabase
            .from('configuracoes')
            .upsert({ user_id: userId, data: cfg }, { onConflict: 'user_id' })
        if (error) throw error
        if (onStatus) onStatus('salvo')
        return true
    } catch(e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('[MusiLab] Erro sync configuracoes:', msg)
        if (onStatus) onStatus('erro')
        return false
    }
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
        const msg = e instanceof Error ? e.message : String(e)
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
        const msg = e instanceof Error ? e.message : String(e)
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

// ── YOUTUBE URL → ID ──
export function ytIdFromUrl(url: string | null | undefined): string | null {
    if (!url) return null
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
    return m ? m[1] : null
}
