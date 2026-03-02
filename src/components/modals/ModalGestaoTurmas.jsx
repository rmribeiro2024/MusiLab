import React from 'react'
import { useBancoPlanos } from '../BancoPlanosContext'

export default function ModalGestaoTurmas() {
    const {
        modalTurmas, setModalTurmas,
        mostrarArquivados, setMostrarArquivados,
        gtAnoNovo, setGtAnoNovo,
        gtAnoSel, setGtAnoSel,
        gtEscolaNome, setGtEscolaNome,
        gtEscolaSel, setGtEscolaSel,
        gtSegmentoNome, setGtSegmentoNome,
        gtSegmentoSel, setGtSegmentoSel,
        gtTurmaNome, setGtTurmaNome,
        anosLetivos,
        gtAddAno, gtRemoveAno,
        gtAddEscola, gtRemoveEscola,
        gtAddSegmento, gtRemoveSegmento,
        gtAddTurma, gtRemoveTurma,
        gtMudarStatusAno,
    } = useBancoPlanos()

    if (!modalTurmas) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalTurmas(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                <div className="bg-teal-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-lg font-bold">📅 Gerenciar Anos Letivos e Turmas</h2>
                    <button onClick={()=>setModalTurmas(false)} className="text-white text-xl font-bold">✕</button>
                </div>
                <div className="p-4 space-y-4">

                    {/* Toggle arquivados */}
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={mostrarArquivados} onChange={e=>setMostrarArquivados(e.target.checked)} />
                        Mostrar anos arquivados
                    </label>

                    {/* Adicionar Ano */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-indigo-800 mb-2">Novo Ano Letivo</p>
                        <div className="flex gap-2">
                            <input value={gtAnoNovo} onChange={e=>setGtAnoNovo(e.target.value)} onKeyPress={e=>e.key==='Enter'&&gtAddAno()}
                                className="flex-1 border-2 rounded-lg px-3 py-2 text-sm" placeholder="Ex: 2025" type="number" min="2020" max="2099" />
                            <button onClick={gtAddAno} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg font-bold text-sm transition">+ Adicionar</button>
                        </div>
                    </div>

                    {/* Lista de Anos */}
                    {anosLetivos.filter(a => mostrarArquivados || a.status !== 'arquivado').map(ano => (
                        <div key={ano.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                            {/* Header Ano */}
                            <div className={`px-4 py-3 flex justify-between items-center ${
                                ano.status==='ativo' ? 'bg-indigo-600 text-white' :
                                ano.status==='encerrado' ? 'bg-gray-400 text-white' : 'bg-gray-300 text-gray-600'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-bold">📅 {ano.ano}</span>
                                    {ano.status==='ativo' && <span className="bg-green-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">Ativo</span>}
                                    {ano.status==='encerrado' && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">Encerrado</span>}
                                    {ano.status==='arquivado' && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">Arquivado</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {ano.status==='ativo' && <button onClick={()=>gtMudarStatusAno(ano.id,'encerrado')} className="text-xs bg-white/20 px-2 py-1 rounded text-white font-bold">Encerrar</button>}
                                    {ano.status==='encerrado' && (
                                        <>
                                        <button onClick={()=>gtMudarStatusAno(ano.id,'ativo')} className="text-xs bg-white/20 px-2 py-1 rounded text-white font-bold">Reativar</button>
                                        <button onClick={()=>gtMudarStatusAno(ano.id,'arquivado')} className="text-xs bg-white/20 px-2 py-1 rounded text-white font-bold">Arquivar</button>
                                        </>
                                    )}
                                    {ano.status==='arquivado' && <button onClick={()=>gtMudarStatusAno(ano.id,'encerrado')} className="text-xs bg-white/20 px-2 py-1 rounded text-gray-600 font-bold">Desarquivar</button>}
                                    <button onClick={()=>gtRemoveAno(ano.id)} className="text-white font-bold text-sm ml-2">✕</button>
                                </div>
                            </div>

                            {/* Conteúdo do Ano */}
                            <div className="p-4 space-y-3">
                                {/* Add Escola */}
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                                    <p className="text-xs font-bold text-teal-800 mb-2">Nova Escola</p>
                                    <div className="flex gap-2">
                                        <input value={gtAnoSel===ano.id?gtEscolaNome:''} onClick={()=>setGtAnoSel(ano.id)}
                                            onChange={e=>{setGtAnoSel(ano.id);setGtEscolaNome(e.target.value);}}
                                            onKeyPress={e=>e.key==='Enter'&&gtAddEscola()}
                                            className="flex-1 border rounded-lg px-2 py-1.5 text-sm" placeholder="Nome da escola" />
                                        <button onClick={()=>{setGtAnoSel(ano.id);gtAddEscola();}} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm">+</button>
                                    </div>
                                </div>

                                {/* Escolas */}
                                {ano.escolas.map(esc => (
                                    <div key={esc.id} className="border border-gray-200 rounded-lg bg-white">
                                        <div className="bg-gray-100 px-3 py-2 flex justify-between items-center">
                                            <span className="font-bold text-sm">🏫 {esc.nome}</span>
                                            <button onClick={()=>gtRemoveEscola(ano.id,esc.id)} className="text-red-500 font-bold text-sm">✕</button>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {/* Add Segmento */}
                                            <div className="flex gap-2">
                                                <input value={gtEscolaSel===esc.id?gtSegmentoNome:''}
                                                    onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);}}
                                                    onChange={e=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoNome(e.target.value);}}
                                                    onKeyPress={e=>e.key==='Enter'&&gtAddSegmento()}
                                                    className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Segmento (ex: 1º ano)" />
                                                <button onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);gtAddSegmento();}}
                                                    className="bg-gray-600 text-white px-2 py-1 rounded text-xs font-bold">+ Seg</button>
                                            </div>

                                            {/* Segmentos */}
                                            {esc.segmentos.map(seg => (
                                                <div key={seg.id} className="border border-gray-200 rounded bg-gray-50 p-2">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-gray-700">{seg.nome}</span>
                                                        <button onClick={()=>gtRemoveSegmento(ano.id,esc.id,seg.id)} className="text-red-500 text-xs font-bold">✕</button>
                                                    </div>
                                                    {/* Add Turma */}
                                                    <div className="flex gap-1.5 mb-2">
                                                        <input value={gtSegmentoSel===seg.id?gtTurmaNome:''}
                                                            onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoSel(seg.id);}}
                                                            onChange={e=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoSel(seg.id);setGtTurmaNome(e.target.value);}}
                                                            onKeyPress={e=>e.key==='Enter'&&gtAddTurma()}
                                                            className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Turma" />
                                                        <button onClick={()=>{setGtAnoSel(ano.id);setGtEscolaSel(esc.id);setGtSegmentoSel(seg.id);gtAddTurma();}}
                                                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold">+</button>
                                                    </div>
                                                    {/* Turmas */}
                                                    {seg.turmas.length>0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {seg.turmas.map(t => (
                                                                <span key={t.id} className="bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1.5">
                                                                    {t.nome}
                                                                    <button onClick={()=>gtRemoveTurma(ano.id,esc.id,seg.id,t.id)} className="text-red-500 font-bold hover:text-red-700">×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
