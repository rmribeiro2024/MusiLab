import React, { useState, useEffect } from 'react'
import type { ToastType } from '../lib/toast'

interface ToastItem {
    id: number
    msg: string
    type: ToastType
    duration: number
    onUndo?: () => void
}

let _nextId = 0

const COLORS: Record<ToastType, string> = {
    error:   'bg-red-600 text-white',
    success: 'bg-emerald-600 text-white',
    info:    'bg-slate-800 text-white',
}
const ICONS: Record<ToastType, string> = {
    error: '⚠️', success: '✅', info: 'ℹ️',
}

export default function Toast() {
    const [toasts, setToasts] = useState<ToastItem[]>([])

    useEffect(() => {
        const handler = (e: Event) => {
            const { msg, type, duration, onUndo } = (e as CustomEvent<{ msg: string; type: ToastType; duration: number; onUndo?: () => void }>).detail
            const id = _nextId++
            setToasts(prev => [...prev.slice(-2), { id, msg, type, duration, onUndo }])
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
        }
        window.addEventListener('musilab:toast', handler)
        return () => window.removeEventListener('musilab:toast', handler)
    }, [])

    if (toasts.length === 0) return null

    return (
        // mobile: topo (evita teclado virtual iOS + bottom nav); desktop: rodapé
        <div
            className="fixed top-4 left-4 right-4 sm:top-auto sm:bottom-6 sm:left-auto sm:right-4 sm:max-w-xs z-[9999] flex flex-col gap-2 w-auto pointer-events-none"
            aria-live="assertive"
            aria-atomic="false"
        >
            {toasts.map(t => (
                <div
                    key={t.id}
                    role="alert"
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${COLORS[t.type]}`}
                >
                    <span className="shrink-0">{ICONS[t.type]}</span>
                    <span className="flex-1">{t.msg}</span>
                    {t.onUndo && (
                        <button
                            onClick={() => {
                                t.onUndo!()
                                setToasts(prev => prev.filter(x => x.id !== t.id))
                            }}
                            className="shrink-0 ml-1 px-2 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors"
                        >
                            Desfazer
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
