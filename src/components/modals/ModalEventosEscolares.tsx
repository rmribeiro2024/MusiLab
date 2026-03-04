import React from 'react'
import { useAnoLetivoContext } from '../../contexts'

export default function ModalEventosEscolares() {
    const {
        modalEventos, setModalEventos,
        eventoEditando, setEventoEditando,
        eventosEscolares,
        anosLetivos,
        novoEvento, salvarEvento, excluirEvento,
    } = useAnoLetivoContext()

    if (!modalEventos) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>{setModalEventos(false);setEventoEditando(null);}}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto overscroll-y-contain" onClick={e=>e.stopPropagation()}>
                <div className="bg-pink-500 text-white p-4 flex justify-between items-center sticky top-0">
                    <h2 className="text-lg font-bold">🎉 Eventos Escolares</h2>
                    <button onClick={()=>{setModalEventos(false);setEventoEditando(null);}} className="text-white text-xl">✕</button>
                </div>

                {!eventoEditando ? (
                    <div className="p-4">
                        <button onClick={novoEvento} className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold mb-4">+ Novo Evento</button>
                        {eventosEscolares.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">Nenhum evento cadastrado</p>
                        ) : (
                            <div className="space-y-2">
                                {eventosEscolares.sort((a,b)=>a.data.localeCompare(b.data)).map(ev=>{
                                    const ano = anosLetivos.find(a=>a.id==ev.anoLetivoId);
                                    const esc = ano?.escolas.find(e=>e.id==ev.escolaId);
                                    const dataObj = new Date(ev.data+'T12:00:00');
                                    const dataFormatada = dataObj.toLocaleDateString('pt-BR');

                                    return (
                                        <div key={ev.id} className="border-2 border-orange-200 rounded-lg p-3 hover:border-orange-400">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-800">{ev.nome}</h3>
                                                    <p className="text-sm text-gray-600">📅 {dataFormatada} • {esc?.nome || 'Sem escola'}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={()=>setEventoEditando(ev)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold text-sm">✏️</button>
                                                    <button onClick={()=>excluirEvento(ev.id)} className="bg-red-100 text-red-600 px-3 py-1 rounded font-bold text-sm">🗑️</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block font-bold mb-2">Nome do Evento *</label>
                            <input type="text" value={eventoEditando.nome} onChange={e=>setEventoEditando({...eventoEditando, nome:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg" placeholder="Ex: Festa Junina, Reunião de Pais"/>
                        </div>
                        <div>
                            <label className="block font-bold mb-2">Data *</label>
                            <input type="date" value={eventoEditando.data} onChange={e=>setEventoEditando({...eventoEditando, data:e.target.value})} className="w-full px-4 py-2 border-2 rounded-lg"/>
                        </div>
                        <div>
                            <label className="block font-bold mb-2">Ano Letivo *</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={eventoEditando.anoLetivoId ? (anosLetivos.find(a=>a.id===eventoEditando.anoLetivoId)?.ano || '') : ''}
                                    readOnly
                                    className="flex-1 px-4 py-2 border-2 rounded-lg bg-gray-50"
                                    placeholder={`Ano atual: ${new Date().getFullYear()}`}
                                />
                                <select
                                    value={eventoEditando.anoLetivoId || ''}
                                    onChange={e=>setEventoEditando({...eventoEditando, anoLetivoId:e.target.value ? Number(e.target.value) : '', escolaId:''})}
                                    className="px-4 py-2 border-2 rounded-lg bg-white"
                                >
                                    <option value="">📅 Alterar</option>
                                    {anosLetivos.map(a=><option key={a.id} value={a.id}>{a.ano || a.nome}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block font-bold mb-2">Escola</label>
                            <select value={eventoEditando.escolaId} onChange={e=>setEventoEditando({...eventoEditando, escolaId:Number(e.target.value)})} className="w-full px-4 py-2 border-2 rounded-lg" disabled={!eventoEditando.anoLetivoId}>
                                <option value="">Selecione...</option>
                                {eventoEditando.anoLetivoId && anosLetivos.find(a=>a.id==eventoEditando.anoLetivoId)?.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button onClick={()=>setEventoEditando(null)} className="flex-1 bg-gray-300 py-3 rounded-xl font-bold">Cancelar</button>
                            <button onClick={salvarEvento} className="flex-1 bg-pink-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
