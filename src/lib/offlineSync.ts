/**
 * offlineSync.ts — Merge offline-first para MusiLab
 *
 * PROBLEMA QUE RESOLVE:
 *   Antes: ao reconectar, Supabase sobrescrevia tudo que foi criado offline.
 *   Agora: itens criados/editados offline são mergeados com a nuvem, sem perda.
 *
 * ESTRATÉGIA:
 *   1. Todo item salvo offline ganha um campo `_updatedAt` (timestamp ISO).
 *   2. Uma "fila offline" (IndexedDB key: 'offlineQueue') guarda os IDs pendentes
 *      por tabela: { planos: Set<id>, grades_semanas: Set<id>, ... }
 *   3. Ao reconectar com userId, mergeOffline() é chamado ANTES de aplicar
 *      os dados da nuvem. Ele identifica quais itens locais são mais novos
 *      e os injeta no array da nuvem (ou adiciona se não existem lá).
 *   4. O array mergeado é enviado ao Supabase e aplicado no estado React.
 *
 * USO em BancoPlanos.tsx — veja comentários "// [offlineSync]" abaixo.
 */

import { dbGet, dbSet, dbDel } from './db'
import { syncToSupabase } from './utils'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
type Tabela = 'planos' | 'grades_semanas' | 'anos_letivos'

interface ItemComTimestamp {
    id: string | number
    _updatedAt?: string   // ISO — adicionado pelo MusiLab ao salvar
    [key: string]: unknown
}

interface OfflineQueue {
    planos:         string[]
    grades_semanas: string[]
    anos_letivos:   string[]
}

// ─────────────────────────────────────────────
// FILA OFFLINE — persiste no IndexedDB
// ─────────────────────────────────────────────
const QUEUE_KEY = 'offlineQueue'

function lerFila(): OfflineQueue {
    try {
        const raw = dbGet(QUEUE_KEY)
        if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return { planos: [], grades_semanas: [], anos_letivos: [] }
}

function salvarFila(fila: OfflineQueue): void {
    dbSet(QUEUE_KEY, JSON.stringify(fila))
}

/** Marca um item como pendente de sync (chamado ao salvar offline) */
export function marcarPendente(tabela: Tabela, id: string): void {
    const fila = lerFila()
    if (!fila[tabela].includes(id)) {
        fila[tabela] = [...fila[tabela], id]
        salvarFila(fila)
    }
}

/** Remove itens da fila após sync bem-sucedido */
export function limparPendentes(tabela: Tabela, ids: string[]): void {
    const fila = lerFila()
    fila[tabela] = fila[tabela].filter(id => !ids.includes(id))
    salvarFila(fila)
    // Se fila vazia, remove a chave
    if (fila.planos.length === 0 && fila.grades_semanas.length === 0 && fila.anos_letivos.length === 0) {
        dbDel(QUEUE_KEY)
    }
}

/** Quantos itens ainda estão pendentes no total */
export function totalPendentes(): number {
    const fila = lerFila()
    return fila.planos.length + fila.grades_semanas.length + fila.anos_letivos.length
}

// ─────────────────────────────────────────────
// ADICIONAR _updatedAt AO SALVAR
// ─────────────────────────────────────────────

/**
 * Chame esta função sempre que criar ou editar um item,
 * tanto online quanto offline. Adiciona/atualiza `_updatedAt`.
 *
 * Exemplo em PlanosContext ao salvar plano:
 *   const planoAtualizado = carimbарTimestamp(plano)
 *   setPlanos([...outros, planoAtualizado])
 */
export function carimbарTimestamp<T extends ItemComTimestamp>(item: T): T {
    return { ...item, _updatedAt: new Date().toISOString() }
}

// ─────────────────────────────────────────────
// MERGE PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Mergeia dados locais pendentes com dados vindos do Supabase.
 *
 * Regra de prioridade:
 *   - Se item existe só localmente (não está na nuvem) → adiciona na nuvem
 *   - Se item existe nos dois lugares → ganha quem tem _updatedAt mais recente
 *   - Se item existe só na nuvem → mantém da nuvem
 *
 * @param tabela       Nome da tabela ('planos' | 'grades_semanas')
 * @param dadosNuvem   Array retornado pelo Supabase (pode ser null se falhou)
 * @param dadosLocais  Array atual no estado React / IndexedDB
 * @returns            Array mergeado, pronto para setPlanos() / setGradesSemanas()
 */
export function mergeOffline<T extends ItemComTimestamp>(
    tabela: Tabela,
    dadosNuvem: T[] | null,
    dadosLocais: T[]
): T[] {
    const fila = lerFila()
    const pendentes = new Set(fila[tabela])

    // Sem pendentes e nuvem retornou dados → usa nuvem diretamente (comportamento original)
    if (pendentes.size === 0 && dadosNuvem !== null) {
        return dadosNuvem
    }

    // Se nuvem falhou (null) → usa local integralmente
    if (dadosNuvem === null) {
        console.warn(`[offlineSync] Nuvem retornou null para "${tabela}" — usando dados locais.`)
        return dadosLocais
    }

    // Monta mapa da nuvem por id para lookup O(1)
    const mapaId = new Map<string, T>()
    dadosNuvem.forEach(item => mapaId.set(String(item.id), item))

    // Processa itens locais pendentes
    const idsInjetados: string[] = []

    dadosLocais.forEach(itemLocal => {
        const idStr = String(itemLocal.id)
        if (!pendentes.has(idStr)) return // não é pendente — ignora

        const itemNuvem = mapaId.get(idStr)

        if (!itemNuvem) {
            // Item novo criado offline — não existe na nuvem ainda → injeta
            mapaId.set(idStr, itemLocal)
            idsInjetados.push(idStr)
            console.info(`[offlineSync] "${tabela}" id=${idStr} adicionado (criado offline)`)
        } else {
            // Item existe nos dois → ganha o mais recente
            const tsLocal  = itemLocal._updatedAt  ? new Date(itemLocal._updatedAt).getTime()  : 0
            const tsNuvem  = itemNuvem._updatedAt   ? new Date(itemNuvem._updatedAt).getTime()   : 0

            if (tsLocal > tsNuvem) {
                mapaId.set(idStr, itemLocal)
                idsInjetados.push(idStr)
                console.info(`[offlineSync] "${tabela}" id=${idStr} local mais recente (${itemLocal._updatedAt} > ${itemNuvem._updatedAt})`)
            } else {
                console.info(`[offlineSync] "${tabela}" id=${idStr} nuvem mais recente — descartando local`)
            }
        }
    })

    const resultado = Array.from(mapaId.values())

    // Limpa itens que foram resolvidos
    if (idsInjetados.length > 0) {
        limparPendentes(tabela, idsInjetados)
    }

    return resultado
}

// ─────────────────────────────────────────────
// HOOK DE RECONEXÃO
// ─────────────────────────────────────────────

/**
 * Retorna true quando o navegador volta a ficar online.
 * Use no BancoPlanos para disparar o sync ao reconectar.
 *
 * Exemplo:
 *   const voltouOnline = useVoltouOnline()
 *   useEffect(() => {
 *     if (voltouOnline && userId) triggerSyncPendentes()
 *   }, [voltouOnline])
 */
export function useVoltouOnline(): boolean {
    const [voltou, setVoltou] = React.useState(false)

    React.useEffect(() => {
        let timer: ReturnType<typeof setTimeout>

        const handleOnline = () => {
            setVoltou(true)
            // Reseta após 3s para não disparar mais de uma vez
            timer = setTimeout(() => setVoltou(false), 3000)
        }
        const handleOffline = () => {
            setVoltou(false)
            clearTimeout(timer)
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearTimeout(timer)
        }
    }, [])

    return voltou
}

// React precisa ser importado para o hook funcionar
import React from 'react'
