import React from 'react'
import { useAnoLetivoContext } from '../../contexts'
import { usePlanosContext } from '../../contexts'
import { useModalContext } from '../../contexts'
import { showToast } from '../../lib/toast'

export default function ModalNovaFaixa() {
    const {
        modalNovaFaixa,
        setModalNovaFaixa,
        faixas,
        setFaixas,
        novaFaixaNome,
        setNovaFaixaNome,
        salvarNovaFaixa,
    } = useAnoLetivoContext()
    const { planos, setPlanos } = usePlanosContext()
    const { setModalConfirm } = useModalContext()

    if (!modalNovaFaixa) return null

    return (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100]" onClick={()=>setModalNovaFaixa(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
                <div className="bg-indigo-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold">👥 Faixas Etárias</h2>
                        <p className="text-indigo-200 text-xs mt-0.5">Adicione, renomeie ou remova rótulos</p>
                    </div>
                    <button onClick={()=>setModalNovaFaixa(false)} className="text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
                </div>

                {/* Lista editável */}
                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                    {faixas.slice(1).map((f) => (
                        <div key={f} className="flex items-center gap-2 group">
                            <input
                                type="text"
                                defaultValue={f}
                                onBlur={e => {
                                    const novo = e.target.value.trim();
                                    if (!novo) { e.target.value = f; return; }
                                    if (novo === f) return;
                                    if (faixas.includes(novo)) { showToast('Já existe uma faixa com esse nome!', 'error'); e.target.value = f; return; }
                                    setFaixas(faixas.map(x => x === f ? novo : x));
                                    setPlanos(planos.map(p => ({
                                        ...p,
                                        faixaEtaria: (p.faixaEtaria||[]).map(fe => fe === f ? novo : fe)
                                    })));
                                }}
                                onKeyDown={e => { const t = e.target as HTMLInputElement; if(e.key==='Enter') t.blur(); if(e.key==='Escape') { t.value=f; t.blur(); }}}
                                className="flex-1 px-3 py-2 border-2 border-transparent hover:border-indigo-200 focus:border-indigo-500 rounded-lg text-sm font-medium outline-none bg-indigo-50 focus:bg-white transition"
                            />
                            <button
                                onClick={() => {
                                    setModalConfirm({ titulo: `Remover faixa "${f}"?`, conteudo: 'Os planos que a usam perderão esse rótulo.', labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                        setFaixas(faixas.filter(x => x !== f));
                                        setPlanos(planos.map(p => ({
                                            ...p,
                                            faixaEtaria: (p.faixaEtaria||[]).filter(fe => fe !== f)
                                        })));
                                    } });
                                }}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition text-lg leading-none"
                                title="Remover faixa">×</button>
                        </div>
                    ))}
                    {faixas.slice(1).length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">Nenhuma faixa cadastrada ainda.</p>
                    )}
                </div>

                {/* Adicionar nova */}
                <div className="p-5 pt-0 border-t border-gray-100">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={novaFaixaNome}
                            onChange={e=>setNovaFaixaNome(e.target.value)}
                            onKeyDown={e=>{ if(e.key==='Enter') salvarNovaFaixa(); }}
                            placeholder="Nova faixa (ex: Maternal, EJA...)"
                            className="flex-1 px-3 py-2.5 border-2 border-indigo-200 focus:border-indigo-500 rounded-xl text-sm outline-none"
                        />
                        <button onClick={salvarNovaFaixa}
                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-xl font-bold text-sm transition">
                            + Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
