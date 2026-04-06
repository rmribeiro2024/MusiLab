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

const DOT_COLOR: Record<ToastType, string> = {
    error:   '#f87171',
    success: '#34d399',
    info:    '#94a3b8',
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
        <div
            className="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
            aria-live="assertive"
            aria-atomic="false"
        >
            {toasts.map(t => (
                <div
                    key={t.id}
                    role="alert"
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl pointer-events-auto"
                    style={{
                        background: 'var(--v2-card, #ffffff)',
                        border: '1px solid #E6EAF0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
                        minWidth: 200,
                        maxWidth: 320,
                    }}
                >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: DOT_COLOR[t.type], flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#374151' }}>{t.msg}</span>
                    {t.onUndo && (
                        <button
                            onClick={() => { t.onUndo!(); setToasts(prev => prev.filter(x => x.id !== t.id)) }}
                            style={{ fontSize: 11, fontWeight: 600, color: '#5B5FEA', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0 }}
                        >
                            Desfazer
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}
