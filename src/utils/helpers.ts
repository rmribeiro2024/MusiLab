import { dbGet, dbSet } from '../lib/db'

/** Lê e deserializa um valor do IndexedDB. Retorna array vazio em caso de erro. */
export function lerLS<T = unknown[]>(chave: string): T {
    const val = dbGet(chave)
    try { return JSON.parse(val || '[]') as T } catch { return [] as unknown as T }
}

/** Serializa e salva um valor no IndexedDB. */
export function salvarLS(chave: string, valor: unknown): void {
    dbSet(chave, JSON.stringify(valor))
}

/** Formata uma string de data para o padrão brasileiro (DD/MM/AAAA). */
export function formatarData(
    dateStr: string,
    opcoes: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
): string {
    if (!dateStr) return ''
    try {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', opcoes)
    } catch { return dateStr }
}
