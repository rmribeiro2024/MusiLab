import { useState, useEffect, useRef, useCallback } from 'react'

/** Retorna uma versão debounced do valor, atualizada apenas após `delay` ms sem mudanças. */
export function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debounced
}

/** Retorna a largura atual da janela, atualizada no resize. */
export function useWindowWidth(): number {
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
    useEffect(() => {
        const handler = () => setWidth(window.innerWidth)
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])
    return width
}

/**
 * Renderiza apenas os primeiros `pageSize` itens; carrega mais conforme o
 * sentinel (div no final da lista) entra no viewport (IntersectionObserver).
 * Reset automático quando o array `items` muda (ex.: filtro alterado).
 */
export function useInfiniteScroll<T>(items: T[], pageSize = 50) {
    const [count, setCount] = useState(pageSize)
    const observerRef = useRef<IntersectionObserver | null>(null)

    // Reset ao trocar a lista (filtro ou busca mudou)
    useEffect(() => { setCount(pageSize) }, [items, pageSize])

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect()
            observerRef.current = null
        }
        if (!node) return
        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setCount(prev => Math.min(prev + pageSize, items.length))
                }
            },
            { rootMargin: '300px' }
        )
        observerRef.current.observe(node)
    }, [items.length, pageSize])

    return {
        visible: items.slice(0, count),
        hasMore: count < items.length,
        sentinelRef,
    }
}
