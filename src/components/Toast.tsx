import React, { useState, useEffect } from 'react'
import type { ToastType } from '../lib/toast'

interface ToastItem {
    id: number
    msg: string
    type: ToastType
    duration: number
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
            const { msg, type, duration } = (e as CustomEvent<{ msg: string; type: ToastType; duration: number }>).detail
            const id = _nextId++
            setToasts(prev => [...prev.slice(-2), { id, msg, type, duration }])
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
        }
        window.addEventListener('musilab:toast', handler)
        return () => window.removeEventListener('musilab:toast', handler)
    }, [])

    if (toasts.length === 0) return null

    return (
        // bottom-20 em mobile = acima da bottom nav (h-16); bottom-6 em desktop
        <div
            className="fixed bottom-20 sm:bottom-6 right-4 z-[9999] flex flex-col gap-2 w-full max-w-xs pointer-events-none"
            aria-live="assertive"
            aria-atomic="false"
        >
            {toasts.map(t => (
                <div
                    key={t.id}
                    role="alert"
                    className={`flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto ${COLORS[t.type]}`}
                >
                    <span className="shrink-0">{ICONS[t.type]}</span>
                    <span>{t.msg}</span>
                </div>
            ))}
        </div>
    )
}
