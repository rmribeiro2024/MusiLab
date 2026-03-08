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
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => setModalGradeSemanal(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center px-5 pt-5 pb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Grade Semanal</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Horários fixos por escola e semana</p>
                    </div>
                    <button onClick={() => setModalGradeSemanal(false)} className="text-slate-300 hover:text-slate-500 text-xl leading-none transition">×</button>
                </div>

                <div className="p-5 space-y-4">
                    {!gradeEditando ? (
                        <>
                            {/* Botão Nova Grade */}
                            <button
                                onClick={novaGradeSemanal}
                                className="w-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 py-2.5 rounded-xl text-sm font-semibold transition"
                            >
                                + Nova Grade Semanal
                            </button>

                            {/* Lista de Grades */}
                            {gradesSemanas.length === 0 ? (
                                <p className="text-center text-slate-400 py-8 text-sm">Nenhuma grade cadastrada ainda.</p>
                            ) : (
                                <div className="space-y-2">
                                    {gradesSemanas.map(grade => {
                                        const ano = anosLetivos.find(a => a.id == grade.anoLetivoId)
                                        const esc = ano?.escolas.find(e => e.id == grade.escolaId)
                                        const inicio = new Date(grade.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                                        const fim = new Date(grade.dataFim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

                                        return (
                                            <div key={grade.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{esc?.nome || 'Escola não encontrada'} · {ano?.ano || '?'}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{inicio} — {fim}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{grade.aulas.length} aula(s)</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setGradeEditando(grade)}
                                                        className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                                    >
                                                        ✏️ Editar
                                                    </button>
                                                    <button
                                                        onClick={() => excluirGradeSemanal(grade.id)}
                                                        className="border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* Editor de Grade */}
                            <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Configuração da Grade</p>

                                {/* Ano e Escola */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ano Letivo</label>
                                        <select
                                            value={gradeEditando.anoLetivoId}
                                            onChange={e => setGradeEditando({ ...gradeEditando, anoLetivoId: e.target.value, escolaId: '' })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-slate-400"
                                        >
                                            <option value="">Selecione...</option>
                                            {anosLetivos.filter(a => a.status !== 'arquivado').map(a => (
                                                <option key={a.id} value={a.id}>{a.ano}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Escola</label>
                                        <select
                                            value={gradeEditando.escolaId}
                                            onChange={e => setGradeEditando({ ...gradeEditando, escolaId: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:border-slate-400"
                                            disabled={!gradeEditando.anoLetivoId}
                                        >
                                            <option value="">Selecione...</option>
                                            {anosLetivos.find(a => a.id == gradeEditando.anoLetivoId)?.escolas.map(e => (
                                                <option key={e.id} value={e.id}>{e.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Datas */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Data Início</label>
                                        <input
                                            type="date"
                                            value={gradeEditando.dataInicio}
                                            onChange={e => setGradeEditando({ ...gradeEditando, dataInicio: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Data Término</label>
                                        <input
                                            type="date"
                                            value={gradeEditando.dataFim}
                                            onChange={e => setGradeEditando({ ...gradeEditando, dataFim: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Aulas da Semana */}
                            {gradeEditando.escolaId && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Aulas da Semana</p>
                                        <button
                                            onClick={adicionarAulaGrade}
                                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                        >
                                            + Adicionar Aula
                                        </button>
                                    </div>

                                    {gradeEditando.aulas.length === 0 ? (
                                        <p className="text-center text-slate-400 py-4 text-sm">Nenhuma aula cadastrada.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {gradeEditando.aulas.sort((a, b) => a.horario.localeCompare(b.horario)).map(aula => {
                                                const ano = anosLetivos.find(a => a.id == gradeEditando.anoLetivoId)
                                                const esc = ano?.escolas.find(e => e.id == gradeEditando.escolaId)

                                                return (
                                                    <div key={aula.id} className="border border-slate-200 rounded-lg p-3 bg-white">
                                                        <div className="grid grid-cols-12 gap-2 items-center">
                                                            {/* Dia */}
                                                            <select
                                                                value={aula.diaSemana}
                                                                onChange={e => atualizarAulaGrade(aula.id, 'diaSemana', e.target.value)}
                                                                className="col-span-2 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                                                            >
                                                                <option>Segunda</option>
                                                                <option>Terça</option>
                                                                <option>Quarta</option>
                                                                <option>Quinta</option>
                                                                <option>Sexta</option>
                                                                <option>Sábado</option>
                                                            </select>

                                                            {/* Horário */}
                                                            <input
                                                                type="time"
                                                                value={aula.horario}
                                                                onChange={e => atualizarAulaGrade(aula.id, 'horario', e.target.value)}
                                                                className="col-span-2 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                                                            />

                                                            {/* Segmento */}
                                                            <select
                                                                value={aula.segmentoId || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value === '' ? '' : Number(e.target.value)
                                                                    atualizarAulaGrade(aula.id, 'segmentoId', val)
                                                                    atualizarAulaGrade(aula.id, 'turmaId', '')
                                                                }}
                                                                className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                                                            >
                                                                <option value="">Segmento...</option>
                                                                {esc?.segmentos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                                                            </select>

                                                            {/* Turma */}
                                                            <select
                                                                value={aula.turmaId || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value === '' ? '' : Number(e.target.value)
                                                                    atualizarAulaGrade(aula.id, 'turmaId', val)
                                                                }}
                                                                className="col-span-2 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                                                                disabled={!aula.segmentoId}
                                                            >
                                                                <option value="">Turma...</option>
                                                                {(() => {
                                                                    const segAtual = esc?.segmentos.find(s => s.id == aula.segmentoId)
                                                                    return segAtual?.turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)
                                                                })()}
                                                            </select>

                                                            {/* Ações */}
                                                            <div className="col-span-3 flex gap-1">
                                                                <button
                                                                    onClick={() => duplicarAulaGrade(aula)}
                                                                    title="Duplicar"
                                                                    className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 px-2 py-1 rounded-lg text-xs font-semibold transition"
                                                                >
                                                                    📋
                                                                </button>
                                                                <button
                                                                    onClick={() => removerAulaGrade(aula.id)}
                                                                    title="Remover"
                                                                    className="border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 px-2 py-1 rounded-lg text-xs font-semibold transition"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Observação */}
                                                        <input
                                                            type="text"
                                                            value={aula.observacao || ''}
                                                            onChange={e => atualizarAulaGrade(aula.id, 'observacao', e.target.value)}
                                                            placeholder="Observação (opcional)..."
                                                            className="w-full mt-2 px-2 py-1 border border-slate-100 rounded-lg text-xs text-slate-500 focus:outline-none focus:border-slate-300"
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botões */}
                            <div className="flex gap-3 pt-2 border-t border-slate-100">
                                <button
                                    onClick={() => setGradeEditando(null)}
                                    className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-500 py-3 rounded-xl text-sm font-semibold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={salvarGradeSemanal}
                                    className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 py-3 rounded-xl text-sm font-semibold transition"
                                >
                                    Salvar Grade
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
