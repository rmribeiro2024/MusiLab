import { createContext, useContext } from 'react'
import type { BancoPlanosContextValue } from '../types'

export const BancoPlanosContext = createContext<BancoPlanosContextValue | null>(null)

export function useBancoPlanos(): BancoPlanosContextValue {
    const ctx = useContext(BancoPlanosContext)
    if (!ctx) throw new Error('useBancoPlanos deve ser usado dentro de BancoPlanosContext.Provider')
    return ctx
}
