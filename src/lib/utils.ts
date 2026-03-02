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
