import { useState, useCallback } from 'react'

export type BancoPanelTab = 'atividades' | 'estrategias' | 'musicas'

export interface UseBancoPainelReturn {
  open: boolean
  tab: BancoPanelTab
  busca: string
  toggle: () => void
  setOpen: (v: boolean) => void
  changeTab: (tab: BancoPanelTab) => void
  setBusca: (v: string) => void
}

/**
 * Hook que encapsula estado e lógica do painel lateral "Banco"
 * no editor de plano de aula (Opção C).
 *
 * - `toggle()` abre/fecha e limpa a busca
 * - `changeTab()` troca de aba e limpa a busca
 */
export function useBancoPainel(): UseBancoPainelReturn {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<BancoPanelTab>('atividades')
  const [busca, setBusca] = useState('')

  const toggle = useCallback(() => {
    setOpen(o => !o)
    setBusca('')
  }, [])

  const changeTab = useCallback((newTab: BancoPanelTab) => {
    setTab(newTab)
    setBusca('')
  }, [])

  return { open, tab, busca, toggle, setOpen, changeTab, setBusca }
}
