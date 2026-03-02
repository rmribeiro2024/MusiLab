import React from 'react'
import { useBancoPlanos } from '../BancoPlanosContext'

export default function ModalImportarMusica() {
    const {
        modalImportarMusica, setModalImportarMusica,
        repertorio,
        importarMusicaParaPlano,
    } = useBancoPlanos()

    if (!modalImportarMusica) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalImportarMusica(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-blue-700 mb-4">🎵 Importar Música como Atividade</h2>
                <div className="space-y-2">
                    {repertorio.map(m => (
                        <div key={m.id} className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 hover:bg-blue-100 cursor-pointer" onClick={() => importarMusicaParaPlano(m)}>
                            <h3 className="font-bold text-gray-800">{m.titulo}</h3>
                            {m.autor && <p className="text-sm text-gray-600">{m.autor}</p>}
                            <p className="text-xs text-blue-500 mt-1">🔗 {(m.planosVinculados||[]).length} plano(s) vinculado(s)</p>
                        </div>
                    ))}
                </div>
                <button onClick={() => setModalImportarMusica(false)} className="mt-4 w-full bg-gray-600 text-white py-2 rounded font-bold">Fechar</button>
            </div>
        </div>
    )
}
