import React from 'react'
import { useAtividadesContext } from '../../contexts'
import { usePlanosContext } from '../../contexts'

export default function ModalAdicionarAoPlano() {
    const { modalAdicionarAoPlano, setModalAdicionarAoPlano } = useAtividadesContext()
    const { planos, adicionarAtividadeAoPlano } = usePlanosContext()

    if (!modalAdicionarAoPlano) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalAdicionarAoPlano(null)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto overscroll-y-contain" onClick={e=>e.stopPropagation()}>
                <div className="bg-green-600 text-white p-4 flex justify-between items-center sticky top-0">
                    <h2 className="text-lg font-bold">Adicionar ao Plano</h2>
                    <button onClick={()=>setModalAdicionarAoPlano(null)} className="text-white text-xl">✕</button>
                </div>
                <div className="p-4">
                    <p className="text-sm text-gray-600 mb-4">Selecione o plano onde deseja adicionar "<strong>{modalAdicionarAoPlano.nome}</strong>":</p>
                    {planos.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Nenhum plano cadastrado ainda.</p>
                    ) : (
                        <div className="space-y-2">
                            {planos.map(p=>(
                                <button key={p.id} onClick={()=>adicionarAtividadeAoPlano(modalAdicionarAoPlano.id, p.id)} className="w-full text-left px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition">
                                    <p className="font-bold text-gray-800">{p.titulo}</p>
                                    <p className="text-xs text-gray-500">{p.escola} • {(p.faixaEtaria||[]).join(', ')}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
