import React, { useRef } from 'react'
import { useModalContext } from '../../contexts'

export default function ModalConfirm() {
    const { modalConfirm, setModalConfirm } = useModalContext()
    const cancelRef = useRef<HTMLButtonElement>(null)
    const confirmRef = useRef<HTMLButtonElement>(null)

    if (!modalConfirm) return null

    function handleCancel() { setModalConfirm(null); modalConfirm.onCancel?.() }
    function handleConfirm() { setModalConfirm(null); modalConfirm.onConfirm?.() }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') { handleCancel(); return }
        if (e.key === 'ArrowLeft') { e.preventDefault(); cancelRef.current?.focus() }
        if (e.key === 'ArrowRight') { e.preventDefault(); confirmRef.current?.focus() }
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50"
            onKeyDown={handleKeyDown}
        >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[90vh] overflow-y-auto overscroll-y-contain p-6">
                {modalConfirm.titulo && (
                    <h3 className="text-lg font-bold text-gray-800 mb-3">{modalConfirm.titulo}</h3>
                )}
                <div className="text-gray-600 text-sm mb-6 whitespace-pre-line">{modalConfirm.conteudo}</div>
                <div className="flex gap-3">
                    {!modalConfirm.somenteOk && (
                        <button
                            ref={cancelRef}
                            onClick={handleCancel}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-gray-400">
                            {modalConfirm.labelCancelar || 'Cancelar'}
                        </button>
                    )}
                    <button
                        ref={confirmRef}
                        onClick={handleConfirm}
                        autoFocus
                        className={`flex-1 py-3 rounded-xl font-semibold transition focus:outline-none focus:ring-2 ${modalConfirm.perigo ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400' : 'border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 focus:ring-slate-400'}`}>
                        {modalConfirm.labelConfirm || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    )
}
