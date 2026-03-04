import React from 'react'
import { useModalContext } from '../../contexts'

export default function ModalConfirm() {
    const { modalConfirm, setModalConfirm } = useModalContext()

    if (!modalConfirm) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[90vh] overflow-y-auto overscroll-y-contain p-6">
                {modalConfirm.titulo && (
                    <h3 className="text-lg font-bold text-gray-800 mb-3">{modalConfirm.titulo}</h3>
                )}
                <div className="text-gray-600 text-sm mb-6 whitespace-pre-line">{modalConfirm.conteudo}</div>
                <div className={`flex gap-3 ${modalConfirm.somenteOk ? '' : ''}`}>
                    {!modalConfirm.somenteOk && (
                        <button onClick={() => { setModalConfirm(null); if (modalConfirm.onCancel) modalConfirm.onCancel(); }}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition">
                            {modalConfirm.labelCancelar || 'Cancelar'}
                        </button>
                    )}
                    <button onClick={() => { setModalConfirm(null); if (modalConfirm.onConfirm) modalConfirm.onConfirm(); }}
                        autoFocus
                        className={`flex-1 py-3 rounded-xl font-semibold transition ${modalConfirm.perigo ? 'bg-red-500 hover:bg-red-600 text-white' : 'border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800'}`}>
                        {modalConfirm.labelConfirm || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    )
}
