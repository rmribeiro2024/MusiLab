// src/contexts/ModalContext.tsx
// Contexto global para o modal de confirmação/aviso reutilizado em todo o app.
// Permite que qualquer Provider de domínio (EstrategiasContext, etc.) chame
// setModalConfirm sem depender de BancoPlanosContext.

import React, { createContext, useContext, useState, useMemo } from 'react'
import type { ModalConfirmState } from '../types'

// ─── INTERFACE ────────────────────────────────────────────────────────────────

interface ModalContextValue {
  modalConfirm: ModalConfirmState | null
  setModalConfirm: React.Dispatch<React.SetStateAction<ModalConfirmState | null>>
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModalContext(): ModalContextValue {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('useModalContext deve ser usado dentro de ModalProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmState | null>(null)

  const value = useMemo(() => ({ modalConfirm, setModalConfirm }), [modalConfirm])

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  )
}
