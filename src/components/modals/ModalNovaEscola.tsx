import React from 'react'
import { useBancoPlanos } from '../BancoPlanosContext'

export default function ModalNovaEscola() {
    const {
        modalNovaEscola,
        setModalNovaEscola,
        novaEscolaNome,
        setNovaEscolaNome,
        anosLetivos,
        novaEscolaAnoId,
        setNovaEscolaAnoId,
        planoEditando,
        setPlanoEditando,
        salvarNovaEscola,
    } = useBancoPlanos()

    if (!modalNovaEscola) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-indigo-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">🏫 Nova Escola</h2>
                        <p className="text-indigo-200 text-sm mt-0.5">A escola será cadastrada no sistema</p>
                    </div>
                    <button onClick={()=>setModalNovaEscola(false)} className="text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Nome da escola */}
                    <div>
                        <label className="block font-bold text-gray-700 mb-2">Nome da Escola *</label>
                        <input
                            type="text"
                            value={novaEscolaNome}
                            onChange={e=>setNovaEscolaNome(e.target.value)}
                            onKeyDown={e=>{ if(e.key==='Enter') salvarNovaEscola(); }}
                            placeholder="Ex: EMEF João da Silva"
                            autoFocus
                            className="w-full px-4 py-3 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl text-base outline-none"
                        />
                    </div>

                    {/* Vincular ao Ano Letivo */}
                    <div>
                        <label className="block font-bold text-gray-700 mb-2">Vincular ao Ano Letivo</label>
                        {anosLetivos.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                                ⚠️ Nenhum ano letivo cadastrado. A escola será salva apenas no plano atual.<br/>
                                <span className="text-xs mt-1 block">Acesse <b>Turmas</b> para criar anos letivos.</span>
                            </div>
                        ) : (
                            <select
                                value={novaEscolaAnoId}
                                onChange={e=>setNovaEscolaAnoId(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base">
                                <option value="">— Selecione um ano letivo (opcional) —</option>
                                {anosLetivos.map(a=>(
                                    <option key={a.id} value={a.id}>
                                        {a.ano}{a.status==='ativo' ? ' ✓ (ativo)' : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Escolas existentes */}
                    {anosLetivos.flatMap(a=>a.escolas).length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-500 mb-2">Escolas já cadastradas:</label>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {anosLetivos.flatMap(a=>a.escolas.map(e=>({nome:e.nome,ano:a.ano}))).map((item,i)=>(
                                    <span key={i} onClick={()=>{ if(modalNovaEscola==='plano') setPlanoEditando({...planoEditando, escola: item.nome}); setModalNovaEscola(false); }}
                                        className="cursor-pointer bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium transition"
                                        title={`Clique para usar: ${item.nome} (${item.ano})`}>
                                        {item.nome}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Clique em uma escola existente para selecioná-la direto.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 pt-0 flex gap-3">
                    <button onClick={()=>setModalNovaEscola(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold transition">
                        Cancelar
                    </button>
                    <button onClick={salvarNovaEscola}
                        className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-3 rounded-xl font-bold transition">
                        🏫 Cadastrar Escola
                    </button>
                </div>
            </div>
        </div>
    )
}
