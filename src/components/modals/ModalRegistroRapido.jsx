import React from 'react'
import { useBancoPlanos } from '../BancoPlanosContext'

export default function ModalRegistroRapido() {
    const {
        modalRegistroRapido,
        setModalRegistroRapido,
        rrData,
        setRrData,
        rrAnoSel,
        setRrAnoSel,
        rrEscolaSel,
        setRrEscolaSel,
        rrPlanosSegmento,
        setRrPlanosSegmento,
        rrTextos,
        setRrTextos,
        anosLetivos,
        planos,
        obterTurmasDoDia,
        sugerirPlanoParaTurma,
        salvarRegistroRapido,
    } = useBancoPlanos()

    if (!modalRegistroRapido) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalRegistroRapido(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div className="bg-green-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-lg font-bold">⚡ Registro Rápido</h2>
                    <button onClick={()=>setModalRegistroRapido(false)} className="text-white text-xl font-bold">✕</button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Data e Ano Letivo */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">📅 Data da Aula</label>
                            <input type="date" value={rrData} onChange={e=>setRrData(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">📆 Ano Letivo</label>
                            <select value={rrAnoSel} onChange={e=>{setRrAnoSel(e.target.value);setRrEscolaSel('');setRrPlanosSegmento({});setRrTextos({});}}
                                className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {anosLetivos.filter(a => a.status !== 'arquivado').map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Escola */}
                    {rrAnoSel && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">🏫 Escola</label>
                            <select value={rrEscolaSel} onChange={e=>{setRrEscolaSel(e.target.value);setRrPlanosSegmento({});setRrTextos({});}}
                                className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                <option value="">Selecione...</option>
                                {anosLetivos.find(a=>a.id==rrAnoSel)?.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Turmas agrupadas por Segmento */}
                    {rrAnoSel && rrEscolaSel && (() => {
                        const ano = anosLetivos.find(a=>a.id==rrAnoSel);
                        const esc = ano?.escolas.find(e=>e.id==rrEscolaSel);
                        const dataFormatada = new Date(rrData+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

                        if (!esc || esc.segmentos.length === 0) {
                            return <p className="text-sm text-gray-400 italic text-center py-4">Nenhum segmento cadastrado nesta escola.</p>;
                        }

                        return (
                            <div className="space-y-4">
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                                    <p className="text-sm font-bold text-indigo-800">{esc.nome} – {dataFormatada}</p>
                                </div>

                                {esc.segmentos.map(seg => {
                                    if (!seg.turmas || seg.turmas.length === 0) return null;

                                    // Sugestão automática de plano (só na primeira vez)
                                    if (!rrPlanosSegmento[seg.id]) {
                                        const sugerido = sugerirPlanoParaTurma(rrAnoSel, rrEscolaSel, seg.id, seg.turmas[0]?.id);
                                        if (sugerido) {
                                            setRrPlanosSegmento({...rrPlanosSegmento, [seg.id]: sugerido});
                                        }
                                    }

                                    return (
                                        <div key={seg.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white">
                                            {/* Header do Segmento */}
                                            <h3 className="font-bold text-gray-800 mb-3">👥 {seg.nome}</h3>

                                            {/* Seleção de Plano */}
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                                                <label className="block text-xs font-bold text-blue-800 mb-2">📚 Plano de Aula</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={rrPlanosSegmento[seg.id] || ''}
                                                        onChange={e=>setRrPlanosSegmento({...rrPlanosSegmento, [seg.id]: e.target.value})}
                                                        className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white">
                                                        <option value="">Sem plano vinculado</option>
                                                        {planos.map(p=><option key={p.id} value={p.id}>{p.titulo}</option>)}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={()=>{
                                                            const planoId = rrPlanosSegmento[seg.id];
                                                            if(!planoId) return;
                                                            const novos = {...rrPlanosSegmento};
                                                            seg.turmas.forEach(t=>{ novos[seg.id] = planoId; });
                                                            setRrPlanosSegmento(novos);
                                                        }}
                                                        className="shrink-0 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                                        Aplicar
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Turmas */}
                                            <div className="space-y-2">
                                                {(() => {
                                                    // Ordenar turmas pela grade semanal (se disponível)
                                                    const turmasDoDia = obterTurmasDoDia(rrData).filter(a =>
                                                        a.anoLetivoId == rrAnoSel &&
                                                        a.escolaId == rrEscolaSel &&
                                                        a.segmentoId == seg.id
                                                    ).sort((a,b) => a.horario.localeCompare(b.horario));

                                                    // Se há turmas na grade, ordena por ela; senão, ordem padrão
                                                    let turmasOrdenadas = seg.turmas;
                                                    if (turmasDoDia.length > 0) {
                                                        const ordemIds = turmasDoDia.map(a => a.turmaId);
                                                        turmasOrdenadas = [
                                                            ...seg.turmas.filter(t => ordemIds.includes(t.id)).sort((a,b) =>
                                                                ordemIds.indexOf(a.id) - ordemIds.indexOf(b.id)
                                                            ),
                                                            ...seg.turmas.filter(t => !ordemIds.includes(t.id))
                                                        ];
                                                    }

                                                    return turmasOrdenadas.map(turma => {
                                                        // Verificar se já existe registro desta turma neste dia
                                                        const planoId = rrPlanosSegmento[seg.id];
                                                        const plano = planos.find(p => p.id == planoId);
                                                        const jaTemRegistro = plano?.registrosPosAula?.some(r =>
                                                            r.data === rrData && r.turma == turma.id
                                                        );

                                                        // Buscar horário da grade (se houver)
                                                        const aulaGrade = turmasDoDia.find(a => a.turmaId == turma.id);

                                                        return (
                                                            <div key={turma.id} className="flex items-center gap-2">
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {aulaGrade && (
                                                                        <span className="text-xs font-mono font-bold text-purple-700 shrink-0">
                                                                            {aulaGrade.horario}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded min-w-[3rem] text-center">
                                                                        Turma {turma.nome}
                                                                    </span>
                                                                    {jaTemRegistro && (
                                                                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold" title="Já tem registro neste dia">
                                                                            +
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={rrTextos[turma.id] || ''}
                                                                    onChange={e=>setRrTextos({...rrTextos, [turma.id]: e.target.value})}
                                                                    placeholder={jaTemRegistro ? "Adicionar ao registro existente..." : "O que foi feito nesta turma..."}
                                                                    className={`flex-1 px-3 py-2 border-2 rounded-lg text-sm ${jaTemRegistro ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                                                                />
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>

                {/* Footer */}
                {rrAnoSel && rrEscolaSel && (
                    <div className="p-4 bg-gray-50 flex gap-3 sticky bottom-0 border-t">
                        <button onClick={()=>setModalRegistroRapido(false)} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-bold">
                            Cancelar
                        </button>
                        <button onClick={salvarRegistroRapido} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">
                            💾 Salvar Registros
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
