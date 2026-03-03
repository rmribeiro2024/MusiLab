import React from 'react'
import { useBancoPlanos } from '../BancoPlanosContext'

export default function ModalVincularMusica() {
    const {
        atividadeVinculandoMusica, setAtividadeVinculandoMusica,
        repertorio,
        vincularMusicaAtividade,
        setPendingAtividadeId,
        setNovaMusicaInline,
        setModalNovaMusicaInline,
    } = useBancoPlanos()

    if (!atividadeVinculandoMusica) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]" onClick={() => setAtividadeVinculandoMusica(null)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-y-contain p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-blue-700 mb-4">🎵 Vincular Música à Atividade</h2>

                <button onClick={() => {
                    setPendingAtividadeId(atividadeVinculandoMusica);
                    setNovaMusicaInline({ titulo: '', autor: '', origem: '', observacoes: '' });
                    setModalNovaMusicaInline(true);
                }} className="w-full mb-4 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">
                    ➕ Cadastrar Nova Música
                </button>

                <div className="space-y-2">
                    {repertorio.map(m => (
                        <div key={m.id} className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 hover:bg-blue-100 cursor-pointer" onClick={() => vincularMusicaAtividade(m)}>
                            <h3 className="font-bold text-gray-800">{m.titulo}</h3>
                            {m.autor && <p className="text-sm text-gray-600">{m.autor}</p>}
                        </div>
                    ))}
                </div>
                <button onClick={() => setAtividadeVinculandoMusica(null)} className="mt-4 w-full bg-gray-600 text-white py-2 rounded font-bold">Fechar</button>
            </div>
        </div>
    )
}
