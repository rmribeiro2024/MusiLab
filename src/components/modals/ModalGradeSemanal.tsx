import React from 'react'
import { useCalendarioContext, useAnoLetivoContext } from '../../contexts'

export default function ModalGradeSemanal() {
    const {
        modalGradeSemanal, setModalGradeSemanal,
        gradeEditando, setGradeEditando,
        gradesSemanas,
        novaGradeSemanal, salvarGradeSemanal, excluirGradeSemanal,
        adicionarAulaGrade, atualizarAulaGrade, duplicarAulaGrade, removerAulaGrade,
    } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()

    if (!modalGradeSemanal) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalGradeSemanal(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div className="bg-purple-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-lg font-bold">📅 Grade Semanal</h2>
                    <button onClick={()=>setModalGradeSemanal(false)} className="text-white text-xl font-bold">✕</button>
                </div>

                <div className="p-4 space-y-4">
                    {!gradeEditando ? (
                        <>
                            {/* Botão Nova Grade */}
                            <button onClick={novaGradeSemanal} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold">
                                + Nova Grade Semanal
                            </button>

                            {/* Lista de Grades Existentes */}
                            {gradesSemanas.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Nenhuma grade cadastrada ainda.</p>
                            ) : (
                                <div className="space-y-3">
                                    {gradesSemanas.map(grade => {
                                        const ano = anosLetivos.find(a => a.id == grade.anoLetivoId);
                                        const esc = ano?.escolas.find(e => e.id == grade.escolaId);
                                        const inicio = new Date(grade.dataInicio+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
                                        const fim = new Date(grade.dataFim+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'});

                                        return (
                                            <div key={grade.id} className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-bold text-purple-900">{esc?.nome || 'Escola não encontrada'} - {ano?.ano || '?'}</h3>
                                                        <p className="text-sm text-purple-700">{inicio} até {fim}</p>
                                                        <p className="text-xs text-purple-600 mt-1">{grade.aulas.length} aula(s) cadastrada(s)</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={()=>setGradeEditando(grade)} className="bg-blue-500 text-white px-3 py-1 rounded font-bold text-sm">Editar</button>
                                                        <button onClick={()=>excluirGradeSemanal(grade.id)} className="bg-red-500 text-white px-3 py-1 rounded font-bold text-sm">Excluir</button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Editor de Grade */}
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                                <h3 className="font-bold text-purple-900">Configuração da Grade</h3>

                                {/* Ano Letivo e Escola */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Ano Letivo</label>
                                        <select value={gradeEditando.anoLetivoId} onChange={e=>setGradeEditando({...gradeEditando, anoLetivoId: e.target.value, escolaId: ''})}
                                            className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                            <option value="">Selecione...</option>
                                            {anosLetivos.filter(a=>a.status!=='arquivado').map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Escola</label>
                                        <select value={gradeEditando.escolaId} onChange={e=>setGradeEditando({...gradeEditando, escolaId: e.target.value})}
                                            className="w-full px-3 py-2 border-2 rounded-lg bg-white" disabled={!gradeEditando.anoLetivoId}>
                                            <option value="">Selecione...</option>
                                            {anosLetivos.find(a=>a.id==gradeEditando.anoLetivoId)?.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Período */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Data Início</label>
                                        <input type="date" value={gradeEditando.dataInicio} onChange={e=>setGradeEditando({...gradeEditando, dataInicio: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Data Término</label>
                                        <input type="date" value={gradeEditando.dataFim} onChange={e=>setGradeEditando({...gradeEditando, dataFim: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Aulas */}
                            {gradeEditando.escolaId && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800">Aulas da Semana</h3>
                                        <button onClick={adicionarAulaGrade} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm">
                                            + Adicionar Aula
                                        </button>
                                    </div>

                                    {gradeEditando.aulas.length === 0 ? (
                                        <p className="text-center text-gray-400 py-4 text-sm">Nenhuma aula cadastrada. Clique em "+ Adicionar Aula"</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {gradeEditando.aulas.sort((a,b)=>a.horario.localeCompare(b.horario)).map(aula => {
                                                const ano = anosLetivos.find(a=>a.id==gradeEditando.anoLetivoId);
                                                const esc = ano?.escolas.find(e=>e.id==gradeEditando.escolaId);
                                                const seg = esc?.segmentos.find(s=>s.id==aula.segmentoId);

                                                return (
                                                    <div key={aula.id} className="border-2 border-gray-200 rounded-lg p-3 bg-white">
                                                        <div className="grid grid-cols-12 gap-2 items-center">
                                                            {/* Dia */}
                                                            <select value={aula.diaSemana} onChange={e=>atualizarAulaGrade(aula.id,'diaSemana',e.target.value)}
                                                                className="col-span-2 px-2 py-1.5 border rounded text-sm bg-white">
                                                                <option>Segunda</option>
                                                                <option>Terça</option>
                                                                <option>Quarta</option>
                                                                <option>Quinta</option>
                                                                <option>Sexta</option>
                                                                <option>Sábado</option>
                                                            </select>

                                                            {/* Horário */}
                                                            <input type="time" value={aula.horario} onChange={e=>atualizarAulaGrade(aula.id,'horario',e.target.value)}
                                                                className="col-span-2 px-2 py-1.5 border rounded text-sm" />

                                                            {/* Segmento */}
                                                            <select
                                                                value={aula.segmentoId || ''}
                                                                onChange={e=>{
                                                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                                                    atualizarAulaGrade(aula.id,'segmentoId',val);
                                                                    atualizarAulaGrade(aula.id,'turmaId','');
                                                                }}
                                                                className="col-span-3 px-2 py-1.5 border rounded text-sm bg-white">
                                                                <option value="">Segmento...</option>
                                                                {esc?.segmentos.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                                                            </select>

                                                            {/* Turma */}
                                                            <select
                                                                value={aula.turmaId || ''}
                                                                onChange={e=>{
                                                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                                                    atualizarAulaGrade(aula.id,'turmaId',val);
                                                                }}
                                                                className="col-span-2 px-2 py-1.5 border rounded text-sm bg-white"
                                                                disabled={!aula.segmentoId}>
                                                                <option value="">Turma...</option>
                                                                {(() => {
                                                                    const segAtual = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                                                    return segAtual?.turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>);
                                                                })()}
                                                            </select>

                                                            {/* Ações */}
                                                            <div className="col-span-3 flex gap-1">
                                                                <button onClick={()=>duplicarAulaGrade(aula)} title="Duplicar" className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">📋</button>
                                                                <button onClick={()=>removerAulaGrade(aula.id)} title="Remover" className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">✕</button>
                                                            </div>
                                                        </div>

                                                        {/* Observação (opcional) */}
                                                        <input type="text" value={aula.observacao||''} onChange={e=>atualizarAulaGrade(aula.id,'observacao',e.target.value)}
                                                            placeholder="Observação (opcional)..." className="w-full mt-2 px-2 py-1 border rounded text-xs text-gray-600" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botões */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button onClick={()=>setGradeEditando(null)} className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl font-bold">
                                    Cancelar
                                </button>
                                <button onClick={salvarGradeSemanal} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold">
                                    💾 Salvar Grade
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
