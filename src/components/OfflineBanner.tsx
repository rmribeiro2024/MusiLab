import React, { useState, useEffect } from 'react'

export default function OfflineBanner() {
    const [online, setOnline] = useState(navigator.onLine)

    useEffect(() => {
        const handleOnline  = () => setOnline(true)
        const handleOffline = () => setOnline(false)
        window.addEventListener('online',  handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online',  handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    if (online) return null

    return (
        <div
            role="status"
            aria-live="assertive"
            className="fixed top-0 left-0 right-0 z-[9998] bg-slate-800 text-white text-sm font-semibold text-center py-2 flex items-center justify-center gap-2"
        >
            📵 Você está offline — os dados serão sincronizados quando a conexão voltar
        </div>
    )
}
