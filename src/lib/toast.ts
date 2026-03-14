export type ToastType = 'success' | 'error' | 'info'

/**
 * Dispara um toast global via CustomEvent.
 * O componente <Toast /> em App.tsx escuta e renderiza.
 * Suporta callback opcional `onUndo` para desfazer ações.
 */
export function showToast(msg: string, type: ToastType = 'info', duration = 4500, onUndo?: () => void): void {
    if (typeof window === 'undefined') return
    window.dispatchEvent(
        new CustomEvent('musilab:toast', { detail: { msg, type, duration, onUndo } })
    )
}
