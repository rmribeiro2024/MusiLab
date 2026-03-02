// ── ARMAZENAMENTO (IndexedDB via cache síncrono) ──
import { dbGet, dbSet } from '../lib/db'

export function lerLS(chave) {
    const val = dbGet(chave)
    try { return JSON.parse(val || '[]') } catch { return [] }
}

export function salvarLS(chave, valor) {
    dbSet(chave, JSON.stringify(valor))
}

// ── FORMATAÇÃO DE DATA ──
export function formatarData(dateStr, opcoes = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', opcoes);
    } catch { return dateStr; }
}
