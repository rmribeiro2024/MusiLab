import { useState, useEffect } from 'react'

/** Retorna uma versão debounced do valor, atualizada apenas após `delay` ms sem mudanças. */
export function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState<T>(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])
    return debounced
}
