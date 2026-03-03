import React from 'react'
import { useBancoPlanos } from '../BancoPlanosContext'

export default function ModalImportarAtividade() {
    const {
        modalImportarAtividade, setModalImportarAtividade,
        buscaAtividade, setBuscaAtividade,
        atividades,
        importarAtividadeParaPlano,
    } = useBancoPlanos()

    if (!modalImportarAtividade) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => {setModalImportarAtividade(false); setBuscaAtividade('');}}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-2xl w-full max-h-[90vh] overflow-y-auto overscroll-y-contain p-6" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-blue-700 mb-4">📚 Importar Atividade do Banco</h2>

                <input
                    type="text"
                    value={buscaAtividade}
                    onChange={e => setBuscaAtividade(e.target.value)}
                    placeholder="🔍 Buscar atividade pelo nome..."
                    className="w-full px-4 py-3 border-2 rounded-lg mb-4 text-sm"
                />

                <div className="space-y-2">
                    {atividades.length === 0 ? (
                        <p className="text-center text-gray-400 py-8">Nenhuma atividade no banco ainda</p>
                    ) : (
                        atividades
                            .filter(a => !buscaAtividade || a.nome.toLowerCase().includes(buscaAtividade.toLowerCase()))
                            .map(a => (
                                <div key={a.id} className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 hover:bg-blue-100 cursor-pointer" onClick={() => {importarAtividadeParaPlano(a); setBuscaAtividade('');}}>
                                    <h3 className="font-bold text-gray-800">{a.nome}</h3>
                                    {a.descricao && <p className="text-sm text-gray-600 truncate">{a.descricao}</p>}
                                    {a.duracao && <p className="text-xs text-blue-500 mt-1">⏱️ {a.duracao}</p>}
                                </div>
                            ))
                    )}
                    {atividades.length > 0 && atividades.filter(a => !buscaAtividade || a.nome.toLowerCase().includes(buscaAtividade.toLowerCase())).length === 0 && (
                        <p className="text-center text-gray-400 py-8">Nenhuma atividade encontrada</p>
                    )}
                </div>
                <button onClick={() => {setModalImportarAtividade(false); setBuscaAtividade('');}} className="mt-4 w-full bg-gray-600 text-white py-2 rounded font-bold">Fechar</button>
            </div>
        </div>
    )
}
