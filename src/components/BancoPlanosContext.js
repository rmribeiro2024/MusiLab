import { createContext, useContext } from 'react'

export const BancoPlanosContext = createContext(null)
export const useBancoPlanos = () => useContext(BancoPlanosContext)
