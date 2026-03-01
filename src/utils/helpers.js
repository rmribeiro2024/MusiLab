// ── LOCALSTORAGE ──
export function lerLS(chave) {
    try { return JSON.parse(localStorage.getItem(chave) || '[]'); } catch { return []; }
}

export function salvarLS(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* quota exceeded silenciado */ }
}

// ── FORMATAÇÃO DE DATA ──
export function formatarData(dateStr, opcoes = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', opcoes);
    } catch { return dateStr; }
}
