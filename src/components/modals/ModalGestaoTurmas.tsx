import React from 'react'
import { useAnoLetivoContext } from '../../contexts'

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
    } = useAnoLetivoContext()

    if (!modalTurmas) return null

    const statusLabel: Record<string, string> = {
        ativo: 'Ativo',
        encerrado: 'Encerrado',
        arquivado: 'Arquivado',
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => setModalTurmas(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Anos Letivos & Turmas</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Gerencie escolas, segmentos e turmas</p>
                    </div>
                    <button onClick={() => setModalTurmas(false)} className="text-slate-300 hover:text-slate-500 text-xl leading-none transition">×</button>
                </div>

                <div className="p-5 space-y-5">

                    {/* Toggle arquivados */}
                    <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                        <input type="checkbox" checked={mostrarArquivados} onChange={e => setMostrarArquivados(e.target.checked)} className="rounded" />
                        Mostrar anos arquivados
                    </label>

                    {/* Adicionar Ano */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Novo Ano Letivo</p>
                        <div className="flex gap-2">
                            <input
                                value={gtAnoNovo}
                                onChange={e => setGtAnoNovo(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && gtAddAno()}
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
                                placeholder="Ex: 2026"
                                type="number" inputMode="numeric" min="2020" max="2099"
                            />
                            <button
                                onClick={gtAddAno}
                                className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
                            >
                                + Adicionar
                            </button>
                        </div>
                    </div>

                    {/* Lista de Anos */}
                    <div className="space-y-4">
                        {anosLetivos.filter(a => mostrarArquivados || a.status !== 'arquivado').map(ano => (
                            <div key={ano.id} className="border border-slate-200 rounded-xl overflow-hidden">

                                {/* Header do Ano */}
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800">{ano.ano}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            ano.status === 'ativo'     ? 'bg-emerald-100 text-emerald-700' :
                                            ano.status === 'encerrado' ? 'bg-slate-100 text-slate-500' :
                                                                          'bg-slate-100 text-slate-400'
                                        }`}>
                                            {statusLabel[ano.status] || ano.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {ano.status === 'ativo' && (
                                            <button onClick={() => gtMudarStatusAno(ano.id, 'encerrado')} className="text-xs text-slate-500 hover:text-slate-700 font-semibold transition">Encerrar</button>
                                        )}
                                        {ano.status === 'encerrado' && (
                                            <>
                                                <button onClick={() => gtMudarStatusAno(ano.id, 'ativo')} className="text-xs text-slate-500 hover:text-slate-700 font-semibold transition">Reativar</button>
                                                <button onClick={() => gtMudarStatusAno(ano.id, 'arquivado')} className="text-xs text-slate-500 hover:text-slate-700 font-semibold transition">Arquivar</button>
                                            </>
                                        )}
                                        {ano.status === 'arquivado' && (
                                            <button onClick={() => gtMudarStatusAno(ano.id, 'encerrado')} className="text-xs text-slate-500 hover:text-slate-700 font-semibold transition">Desarquivar</button>
                                        )}
                                        <button onClick={() => gtRemoveAno(ano.id)} className="text-slate-300 hover:text-red-400 text-sm font-bold transition ml-1">×</button>
                                    </div>
                                </div>

                                {/* Conteúdo */}
                                <div className="p-4 space-y-3">

                                    {/* Add Escola */}
                                    <div className="flex gap-2">
                                        <input
                                            value={gtAnoSel === ano.id ? gtEscolaNome : ''}
                                            onClick={() => setGtAnoSel(ano.id)}
                                            onChange={e => { setGtAnoSel(ano.id); setGtEscolaNome(e.target.value) }}
                                            onKeyPress={e => e.key === 'Enter' && gtAddEscola()}
                                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-slate-400"
                                            placeholder="Nova escola..."
                                        />
                                        <button
                                            onClick={() => { setGtAnoSel(ano.id); gtAddEscola() }}
                                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                        >
                                            + Escola
                                        </button>
                                    </div>

                                    {/* Escolas */}
                                    {ano.escolas.map(esc => (
                                        <div key={esc.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                            <div className="bg-slate-50 px-3 py-2 flex justify-between items-center border-b border-slate-100">
                                                <span className="text-sm font-semibold text-slate-700">{esc.nome}</span>
                                                <button onClick={() => gtRemoveEscola(ano.id, esc.id)} className="text-slate-300 hover:text-red-400 text-sm font-bold transition">×</button>
                                            </div>
                                            <div className="p-3 space-y-2">

                                                {/* Add Segmento */}
                                                <div className="flex gap-2">
                                                    <input
                                                        value={gtEscolaSel === esc.id ? gtSegmentoNome : ''}
                                                        onClick={() => { setGtAnoSel(ano.id); setGtEscolaSel(esc.id) }}
                                                        onChange={e => { setGtAnoSel(ano.id); setGtEscolaSel(esc.id); setGtSegmentoNome(e.target.value) }}
                                                        onKeyPress={e => e.key === 'Enter' && gtAddSegmento()}
                                                        className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-slate-400"
                                                        placeholder="Novo segmento (ex: 1º ano)..."
                                                    />
                                                    <button
                                                        onClick={() => { setGtAnoSel(ano.id); setGtEscolaSel(esc.id); gtAddSegmento() }}
                                                        className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 px-2 py-1.5 rounded-lg text-xs font-semibold transition"
                                                    >
                                                        + Seg
                                                    </button>
                                                </div>

                                                {/* Segmentos */}
                                                {esc.segmentos.map(seg => (
                                                    <div key={seg.id} className="border border-slate-100 rounded-lg bg-white p-2">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-xs font-semibold text-slate-600">{seg.nome}</span>
                                                            <button onClick={() => gtRemoveSegmento(ano.id, esc.id, seg.id)} className="text-slate-300 hover:text-red-400 text-xs font-bold transition">×</button>
                                                        </div>

                                                        {/* Add Turma */}
                                                        <div className="flex gap-1.5 mb-2">
                                                            <input
                                                                value={gtSegmentoSel === seg.id ? gtTurmaNome : ''}
                                                                onClick={() => { setGtAnoSel(ano.id); setGtEscolaSel(esc.id); setGtSegmentoSel(seg.id) }}
                                                                onChange={e => { setGtAnoSel(ano.id); setGtEscolaSel(esc.id); setGtSegmentoSel(seg.id); setGtTurmaNome(e.target.value) }}
                                                                onKeyPress={e => e.key === 'Enter' && gtAddTurma()}
                                                                className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-slate-400"
                                                                placeholder="Nova turma..."
                                                            />
                                                            <button
                                                                onClick={() => { setGtAnoSel(ano.id); setGtEscolaSel(esc.id); setGtSegmentoSel(seg.id); gtAddTurma() }}
                                                                className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 px-2 py-1 rounded-lg text-xs font-semibold transition"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        {/* Turmas */}
                                                        {seg.turmas.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {seg.turmas.map(t => (
                                                                    <span key={t.id} className="bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-lg text-xs flex items-center gap-1">
                                                                        {t.nome}
                                                                        <button onClick={() => gtRemoveTurma(ano.id, esc.id, seg.id, t.id)} className="text-slate-300 hover:text-red-400 font-bold transition">×</button>
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
        </div>
    )
}
