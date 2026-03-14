import React, { useRef } from 'react'
import { showToast } from '../lib/toast'
import { useSequenciasContext, useAnoLetivoContext, useAtividadesContext, usePlanosContext, useModalContext } from '../contexts'
import { exportarSequenciaPDF } from '../utils/pdf'

function stripHTML(html: string): string {
    return html ? html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : ''
}

export default function ModuloSequencias() {
    const {
        buscaPlanoVinculo, buscaProfundaSequencias, desvincularPlano,
        excluirSequencia, filtroEscolaSequencias, filtroPeriodoSequencias, filtroUnidadeSequencias,
        modalVincularPlano, novaSequencia, salvarSequencia, sequenciaDetalhe, sequenciaEditando,
        sequencias, setBuscaPlanoVinculo, setBuscaProfundaSequencias, setFiltroEscolaSequencias,
        setFiltroPeriodoSequencias, setFiltroUnidadeSequencias, setModalVincularPlano,
        setSequenciaDetalhe, setSequenciaEditando, setSequencias, vincularPlanoAoSlot,
    } = useSequenciasContext()
    const { anosLetivos, unidades } = useAnoLetivoContext()
    const { atividades } = useAtividadesContext()
    const { planos, criarPlanosDeSequencia } = usePlanosContext()
    const { setModalConfirm } = useModalContext()

    const dragSlotIdx = useRef<number | null>(null)

    // ── estado do modal C4 (sequential planning) ──
    const [seqParaPlanejar, setSeqParaPlanejar] = React.useState<typeof sequencias[0] | null>(null)
    const [planDataInicio, setPlanDataInicio] = React.useState(new Date().toISOString().split('T')[0])
    const [planDiasSemana, setPlanDiasSemana] = React.useState<number[]>([1]) // segunda-feira por padrão
    const [planEscola, setPlanEscola] = React.useState('')
    const [planNivel, setPlanNivel] = React.useState('')

    const reordenarSlots = (seqId: string, fromIdx: number, toIdx: number) => {
        const novas = sequencias.map(s => {
            if (s.id !== seqId) return s
            const slots = [...s.slots]
            const [removed] = slots.splice(fromIdx, 1)
            slots.splice(toIdx, 0, removed)
            return { ...s, slots: slots.map((sl, i) => ({ ...sl, ordem: i + 1 })) }
        })
        setSequencias(novas)
        setSequenciaDetalhe(novas.find(s => s.id === seqId) || null)
    }

    const obterInfoSequencia = (seq) => {
        const ano = anosLetivos.find(a => a.id == seq.anoLetivoId)
        if (!ano) return null
        const escola = ano.escolas?.find(e => e.id == seq.escolaId)
        if (!escola) return null
        const nomesSegmentos = (seq.segmentos || []).map(segId => {
            const seg = escola.segmentos?.find(s => s.id == segId)
            return seg ? seg.nome : null
        }).filter(Boolean)
        return { ano: ano.nome, escola: escola.nome, segmentos: nomesSegmentos, turmaEspecifica: seq.turmaEspecifica || null }
    }

    // ══════════════════════════════════════════════
    // VISTA 1 — Formulário (nova / editar sequência)
    // ══════════════════════════════════════════════
    if (sequenciaEditando) {
        const isEdicao = !!sequencias.find(s => s.id === sequenciaEditando.id)
        return (
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => setSequenciaEditando(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition"
                    >
                        ← Voltar
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {isEdicao ? 'Editar Sequência' : 'Nova Sequência'}
                        </h2>
                        <p className="text-slate-500 text-xs mt-0.5">Sequência didática de aulas</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-slate-400 to-slate-600" />
                    <div className="p-6 space-y-5">

                        {/* Título */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Título *</label>
                            <input
                                type="text"
                                value={sequenciaEditando.titulo}
                                onChange={e => setSequenciaEditando({ ...sequenciaEditando, titulo: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 text-sm"
                                placeholder="Ex: Projeto Folclore, Música Brasileira..."
                                autoFocus
                            />
                        </div>

                        {/* Ano Letivo */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ano Letivo *</label>
                            <select
                                value={sequenciaEditando.anoLetivoId}
                                onChange={e => setSequenciaEditando({ ...sequenciaEditando, anoLetivoId: e.target.value, escolaId: '', segmentos: [] })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-slate-400"
                            >
                                <option value="">Selecione...</option>
                                {anosLetivos.map(ano => (
                                    <option key={ano.id} value={ano.id}>{ano.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Escola */}
                        {sequenciaEditando.anoLetivoId && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Escola *</label>
                                <select
                                    value={sequenciaEditando.escolaId}
                                    onChange={e => setSequenciaEditando({ ...sequenciaEditando, escolaId: e.target.value, segmentos: [] })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-slate-400"
                                >
                                    <option value="">Selecione...</option>
                                    {anosLetivos.find(a => a.id == sequenciaEditando.anoLetivoId)?.escolas?.map(escola => (
                                        <option key={escola.id} value={escola.id}>{escola.nome}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Segmentos */}
                        {sequenciaEditando.escolaId && (() => {
                            const ano = anosLetivos.find(a => a.id == sequenciaEditando.anoLetivoId)
                            const escola = ano?.escolas?.find(e => e.id == sequenciaEditando.escolaId)
                            const segmentos = escola?.segmentos || []
                            const toggleSegmento = (segId) => {
                                const atual = sequenciaEditando.segmentos || []
                                const novos = atual.includes(segId) ? atual.filter(s => s !== segId) : [...atual, segId]
                                setSequenciaEditando({ ...sequenciaEditando, segmentos: novos })
                            }
                            return (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                        Segmentos * <span className="font-normal normal-case">(um ou mais)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {segmentos.map(seg => (
                                            <button
                                                key={seg.id}
                                                type="button"
                                                onClick={() => toggleSegmento(seg.id)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
                                                    (sequenciaEditando.segmentos || []).includes(seg.id)
                                                        ? 'bg-slate-800 text-white border-slate-800'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                                }`}
                                            >
                                                {seg.nome}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Turma */}
                        {sequenciaEditando.escolaId && (sequenciaEditando.segmentos?.length ?? 0) > 0 && (() => {
                            const ano = anosLetivos.find(a => a.id == sequenciaEditando.anoLetivoId)
                            const escola = ano?.escolas?.find(e => e.id == sequenciaEditando.escolaId)
                            const turmasDisponiveis: any[] = []
                            ;(sequenciaEditando.segmentos || []).forEach(segId => {
                                const seg = escola?.segmentos?.find(s => s.id == segId)
                                if (seg?.turmas) {
                                    seg.turmas.forEach(t => {
                                        if (!turmasDisponiveis.find(td => td.id == t.id))
                                            turmasDisponiveis.push({ ...t, segmentoNome: seg.nome })
                                    })
                                }
                            })
                            return (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                        Turma <span className="font-normal normal-case">(opcional)</span>
                                    </label>
                                    <select
                                        value={sequenciaEditando.turmaEspecifica || ''}
                                        onChange={e => setSequenciaEditando({ ...sequenciaEditando, turmaEspecifica: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-slate-400"
                                    >
                                        <option value="">Todas as turmas</option>
                                        {turmasDisponiveis.map(t => (
                                            <option key={t.id} value={t.nome}>{t.segmentoNome} — {t.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            )
                        })()}

                        {/* Unidade */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unidade Pedagógica</label>
                            <select
                                value={sequenciaEditando.unidadePredominante || ''}
                                onChange={e => setSequenciaEditando({ ...sequenciaEditando, unidadePredominante: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-slate-400"
                            >
                                <option value="">Selecione...</option>
                                {unidades.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>

                        {/* Duração */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Duração</label>
                            <select
                                value={sequenciaEditando.duracao}
                                onChange={e => {
                                    const d = e.target.value
                                    let num = 4
                                    if (d === 'bimestral') num = 8
                                    else if (d === 'semestral') num = 20
                                    setSequenciaEditando({ ...sequenciaEditando, duracao: d, numeroSlots: num })
                                }}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:border-slate-400"
                            >
                                <option value="mensal">Mensal (4 aulas)</option>
                                <option value="bimestral">Bimestral (8 aulas)</option>
                                <option value="semestral">Semestral (20 aulas)</option>
                                <option value="manual">Manual</option>
                            </select>
                        </div>

                        {sequenciaEditando.duracao === 'manual' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Número de Aulas</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    max="50"
                                    value={sequenciaEditando.numeroSlots}
                                    onChange={e => setSequenciaEditando({ ...sequenciaEditando, numeroSlots: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                />
                            </div>
                        )}

                        {/* Datas */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Data Início</label>
                                <input
                                    type="date"
                                    value={sequenciaEditando.dataInicio || ''}
                                    onChange={e => setSequenciaEditando({ ...sequenciaEditando, dataInicio: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Data Fim</label>
                                <input
                                    type="date"
                                    value={sequenciaEditando.dataFim || ''}
                                    onChange={e => setSequenciaEditando({ ...sequenciaEditando, dataFim: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                />
                            </div>
                        </div>

                        {/* Botões */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setSequenciaEditando(null)}
                                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-500 py-3 rounded-xl font-semibold text-sm transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvarSequencia}
                                className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-semibold text-sm transition"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ══════════════════════════════════════════════
    // Filtros auxiliares
    // ══════════════════════════════════════════════
    const escolasComSequencias = [...new Set(sequencias.map(s => {
        const ano = anosLetivos.find(a => a.id == s.anoLetivoId)
        const escola = ano?.escolas?.find(e => e.id == s.escolaId)
        return escola?.nome || 'Sem escola'
    }))]
    const unidadesComSequencias = [...new Set(sequencias.map(s => s.unidadePredominante).filter(Boolean))]
    const sequenciasFiltradas = sequencias.filter(s => {
        const ano = anosLetivos.find(a => a.id == s.anoLetivoId)
        const escola = ano?.escolas?.find(e => e.id == s.escolaId)
        const nomeEscola = escola?.nome || 'Sem escola'
        if (filtroEscolaSequencias !== 'Todas' && nomeEscola !== filtroEscolaSequencias) return false
        if (filtroUnidadeSequencias !== 'Todas' && s.unidadePredominante !== filtroUnidadeSequencias) return false
        if (filtroPeriodoSequencias !== 'Todos' && s.duracao !== filtroPeriodoSequencias) return false
        if (buscaProfundaSequencias) {
            const busca = buscaProfundaSequencias.toLowerCase()
            const emTitulo = s.titulo?.toLowerCase().includes(busca)
            const emSlots = (s.slots || []).some(slot => {
                const plano = planos.find(p => p.id == slot.planoVinculado)
                return plano?.titulo?.toLowerCase().includes(busca)
            })
            if (!emTitulo && !emSlots) return false
        }
        return true
    })

    const seq = sequenciaDetalhe
    const infoSeq = sequenciaDetalhe ? obterInfoSequencia(sequenciaDetalhe) : null

    return (
        <>
        <div>
            {/* ══════════════════════════════════════════════
                VISTA 2 — Detalhe (slots de uma sequência)
            ══════════════════════════════════════════════ */}
            {sequenciaDetalhe ? (
            <>
                <div className="mb-6 flex items-center gap-4">
                    <button
                        onClick={() => setSequenciaDetalhe(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition"
                    >
                        ← Voltar
                    </button>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold text-slate-800 truncate">{seq.titulo}</h2>
                        {infoSeq && (
                            <p className="text-sm text-slate-500">
                                {infoSeq.escola} · {infoSeq.segmentos.join(', ')}
                                {infoSeq.turmaEspecifica && <span> · Turma {infoSeq.turmaEspecifica}</span>}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={() => { setSeqParaPlanejar(seq); setPlanDataInicio(new Date().toISOString().split('T')[0]); setPlanDiasSemana([1]); setPlanEscola(''); setPlanNivel('') }}
                            className="border border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
                        >
                            📅 Planejar
                        </button>
                        <button
                            onClick={() => setSequenciaEditando(seq)}
                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
                        >
                            ✏️ Editar
                        </button>
                        <button
                            onClick={() => { setSequencias([...sequencias]); showToast('Alterações salvas!', 'success') }}
                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
                        >
                            💾 Salvar
                        </button>
                        <button
                            onClick={() => exportarSequenciaPDF(seq)}
                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition"
                        >
                            📄 PDF
                        </button>
                        <button
                            onClick={() => setModalConfirm({
                                titulo: 'Excluir sequência?',
                                conteudo: 'Esta ação não pode ser desfeita.',
                                labelConfirm: 'Excluir',
                                perigo: true,
                                onConfirm: () => { excluirSequencia(seq.id); setSequenciaDetalhe(null) }
                            })}
                            className="border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-500 px-4 py-2 rounded-lg font-semibold text-sm transition"
                        >
                            🗑️ Excluir
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {(seq.slots || []).map((slot, index) => {
                        const planoVinc = slot.planoVinculado ? planos.find(p => p.id == slot.planoVinculado) : null

                        return (
                            <div
                                key={slot.id}
                                draggable
                                onDragStart={() => { dragSlotIdx.current = index }}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => {
                                    if (dragSlotIdx.current !== null && dragSlotIdx.current !== index) {
                                        reordenarSlots(seq.id, dragSlotIdx.current, index)
                                        dragSlotIdx.current = null
                                    }
                                }}
                                className="border border-slate-200 rounded-xl p-4 bg-white cursor-grab active:cursor-grabbing hover:border-slate-300 transition"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-300 select-none">⠿</span>
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Aula {slot.ordem}</span>
                                    </div>
                                    {planoVinc && (
                                        <button onClick={() => desvincularPlano(seq.id, index)} className="text-xs text-slate-400 hover:text-red-500 transition">
                                            ✕ Desvincular
                                        </button>
                                    )}
                                </div>

                                {planoVinc ? (
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-2">{planoVinc.titulo}</h4>
                                        {planoVinc.objetivoGeral && (
                                            <div className="bg-slate-50 rounded-lg p-3 mb-2 border border-slate-200">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Objetivo</p>
                                                <p className="text-sm text-slate-600 line-clamp-2">{stripHTML(planoVinc.objetivoGeral)}</p>
                                            </div>
                                        )}
                                        {planoVinc.atividadesRoteiro?.length > 0 && (
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Roteiro</p>
                                                <ul className="text-sm text-slate-600 space-y-1">
                                                    {planoVinc.atividadesRoteiro.map(ativ => (
                                                        <li key={ativ.id} className="flex items-start gap-2">
                                                            <span className="text-slate-300">·</span>
                                                            <span>
                                                                {ativ.nome || 'Atividade'}
                                                                {ativ.duracao && <span className="text-xs text-slate-400 ml-1">({ativ.duracao})</span>}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-slate-400 text-sm mb-3">Slot vazio</p>
                                        <button
                                            onClick={() => setModalVincularPlano({ sequenciaId: seq.id, slotIndex: index })}
                                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                                        >
                                            🔗 Vincular Plano
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </>

            ) : (
            /* ══════════════════════════════════════════════
               VISTA 3 — Lista de sequências
            ══════════════════════════════════════════════ */
            <>
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Sequências</h2>
                        <button
                            onClick={() => novaSequencia(anosLetivos)}
                            className="shrink-0 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
                        >
                            + Nova Sequência
                        </button>
                    </div>

                    {sequencias.length > 0 && (
                        <input
                            type="text"
                            value={buscaProfundaSequencias}
                            onChange={e => setBuscaProfundaSequencias(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm mb-4 focus:outline-none focus:border-slate-400"
                            placeholder="Buscar nas aulas (título, atividades)..."
                        />
                    )}

                    {sequencias.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Escola</label>
                                    <select value={filtroEscolaSequencias} onChange={e => setFiltroEscolaSequencias(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm">
                                        <option value="Todas">Todas</option>
                                        {escolasComSequencias.map(e => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Unidade</label>
                                    <select value={filtroUnidadeSequencias} onChange={e => setFiltroUnidadeSequencias(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm">
                                        <option value="Todas">Todas</option>
                                        {unidadesComSequencias.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Período</label>
                                    <select value={filtroPeriodoSequencias} onChange={e => setFiltroPeriodoSequencias(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm">
                                        <option value="Todos">Todos</option>
                                        <option value="1trim">1° Trimestre</option>
                                        <option value="2trim">2° Trimestre</option>
                                        <option value="3trim">3° Trimestre</option>
                                        <option value="4trim">4° Trimestre</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-xs text-slate-400">{sequenciasFiltradas.length} sequência{sequenciasFiltradas.length !== 1 ? 's' : ''}</p>
                                {(filtroEscolaSequencias !== 'Todas' || filtroUnidadeSequencias !== 'Todas' || filtroPeriodoSequencias !== 'Todos' || buscaProfundaSequencias) && (
                                    <button
                                        onClick={() => { setFiltroEscolaSequencias('Todas'); setFiltroUnidadeSequencias('Todas'); setFiltroPeriodoSequencias('Todos'); setBuscaProfundaSequencias('') }}
                                        className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                                    >
                                        ✕ Limpar filtros
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {sequenciasFiltradas.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-slate-400 mb-4">Nenhuma sequência encontrada</p>
                        <button
                            onClick={() => novaSequencia(anosLetivos)}
                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-sm transition"
                        >
                            + Criar Primeira Sequência
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sequenciasFiltradas.map(s => {
                            const info = obterInfoSequencia(s)
                            const total = s.slots?.length || 0
                            const preenchidos = s.slots?.filter(sl => sl.planoVinculado).length || 0
                            const pct = total > 0 ? (preenchidos / total) * 100 : 0
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => setSequenciaDetalhe(s)}
                                    className="bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition cursor-pointer active:scale-[0.98]"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-semibold text-slate-800 leading-snug">{s.titulo}</h3>
                                        {s.unidadePredominante && (
                                            <span className="ml-2 shrink-0 bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-xs">{s.unidadePredominante}</span>
                                        )}
                                    </div>
                                    {info && (
                                        <p className="text-xs text-slate-500 mb-2">
                                            {info.escola} · {info.segmentos.join(', ')}
                                            {info.turmaEspecifica && <span> · {info.turmaEspecifica}</span>}
                                        </p>
                                    )}
                                    {(s.dataInicio || s.dataFim) && (
                                        <p className="text-xs text-slate-400 mb-3">
                                            {s.dataInicio && new Date(s.dataInicio).toLocaleDateString('pt-BR')}
                                            {s.dataInicio && s.dataFim && ' — '}
                                            {s.dataFim && new Date(s.dataFim).toLocaleDateString('pt-BR')}
                                        </p>
                                    )}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                                            <span>{preenchidos}/{total} aulas</span>
                                            <span>{Math.round(pct)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                            <div className="bg-slate-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={e => { e.stopPropagation(); setSequenciaEditando(s) }}
                                            className="border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-xs font-semibold transition"
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); setModalConfirm({ titulo: 'Excluir sequência?', conteudo: `"${s.titulo}" será removida permanentemente.`, labelConfirm: 'Excluir', perigo: true, onConfirm: () => excluirSequencia(s.id) }) }}
                                            className="border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 px-3 py-1 rounded-lg text-xs font-semibold transition"
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
            )}

            {/* Modal vincular plano (picker — mantido como modal) */}
            {modalVincularPlano && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => { setModalVincularPlano(null); setBuscaPlanoVinculo('') }}>
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Vincular Plano</h2>
                        <input
                            type="text"
                            value={buscaPlanoVinculo}
                            onChange={e => setBuscaPlanoVinculo(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg mb-4 text-sm focus:outline-none focus:border-slate-400"
                            placeholder="Buscar plano..."
                        />
                        <div className="space-y-2">
                            {planos
                                .filter(p => !buscaPlanoVinculo || p.titulo.toLowerCase().includes(buscaPlanoVinculo.toLowerCase()))
                                .slice(0, 20)
                                .map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => vincularPlanoAoSlot(p.id)}
                                        className="border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition"
                                    >
                                        <h4 className="font-semibold text-slate-800 text-sm">{p.titulo}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5">{p.escola} · {p.faixaEtaria?.join(', ')}</p>
                                        {p.atividadesRoteiro?.length > 0 && (
                                            <p className="text-xs text-slate-400 mt-1">{p.atividadesRoteiro.length} atividade(s)</p>
                                        )}
                                    </div>
                                ))}
                            {planos.filter(p => !buscaPlanoVinculo || p.titulo.toLowerCase().includes(buscaPlanoVinculo.toLowerCase())).length === 0 && (
                                <p className="text-center text-slate-400 py-8 text-sm">Nenhum plano encontrado</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ── MODAL SEQUENTIAL PLANNING (C4) ── */}
        {seqParaPlanejar && (() => {
            const DIAS = [
                { idx: 0, label: 'Dom' }, { idx: 1, label: 'Seg' }, { idx: 2, label: 'Ter' },
                { idx: 3, label: 'Qua' }, { idx: 4, label: 'Qui' }, { idx: 5, label: 'Sex' }, { idx: 6, label: 'Sáb' },
            ]
            // Preview das datas calculadas
            function proximasDatas(inicio: string, qtd: number, dias: number[]): string[] {
                if (!inicio || dias.length === 0 || qtd === 0) return []
                const res: string[] = []; const d = new Date(inicio + 'T12:00:00')
                while (res.length < qtd) {
                    if (dias.includes(d.getDay())) res.push(d.toISOString().split('T')[0])
                    d.setDate(d.getDate() + 1)
                }
                return res
            }
            const preview = proximasDatas(planDataInicio, seqParaPlanejar.slots.length, planDiasSemana)
            return (
                <div style={{ position: 'fixed', inset: 0, background: '#0007', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setSeqParaPlanejar(null)}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90dvh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>📅 Planejar sequência</p>
                                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{seqParaPlanejar.titulo} · {seqParaPlanejar.slots.length} aulas</p>
                            </div>
                            <button onClick={() => setSeqParaPlanejar(null)} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                        </div>
                        {/* Data de início */}
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                            Data da 1ª aula
                        </label>
                        <input type="date" value={planDataInicio} onChange={e => setPlanDataInicio(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 14, boxSizing: 'border-box' as const }} />
                        {/* Dias da semana */}
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                            Dias da semana
                        </label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                            {DIAS.map(d => {
                                const sel = planDiasSemana.includes(d.idx)
                                return (
                                    <button key={d.idx} type="button"
                                        onClick={() => setPlanDiasSemana(prev => sel ? prev.filter(x => x !== d.idx) : [...prev, d.idx].sort())}
                                        style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: sel ? '1.5px solid #6366f1' : '1px solid #e2e8f0', background: sel ? '#eef2ff' : '#f8fafc', color: sel ? '#4f46e5' : '#64748b', cursor: 'pointer' }}>
                                        {d.label}
                                    </button>
                                )
                            })}
                        </div>
                        {/* Escola / nível (opcionais) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Escola</label>
                                <input type="text" value={planEscola} onChange={e => setPlanEscola(e.target.value)} placeholder="Opcional"
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box' as const }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Nível</label>
                                <input type="text" value={planNivel} onChange={e => setPlanNivel(e.target.value)} placeholder="Ex: Básico"
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box' as const }} />
                            </div>
                        </div>
                        {/* Preview de datas */}
                        {preview.length > 0 && (
                            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 12px', marginBottom: 16, border: '1px solid #e2e8f0' }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Datas previstas</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {preview.map((dt, i) => (
                                        <span key={dt} style={{ fontSize: 12, color: '#334155' }}>
                                            Aula {i + 1}: {new Date(dt + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {planDiasSemana.length === 0 && (
                            <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>Selecione ao menos um dia da semana.</p>
                        )}
                        <button type="button"
                            disabled={planDiasSemana.length === 0 || !planDataInicio}
                            onClick={() => {
                                const qtd = criarPlanosDeSequencia(seqParaPlanejar, {
                                    escola: planEscola, nivel: planNivel || 'Geral',
                                    dataInicio: planDataInicio, diasSemana: planDiasSemana,
                                })
                                setSeqParaPlanejar(null)
                                showToast(`${qtd} plano${qtd !== 1 ? 's' : ''} criado${qtd !== 1 ? 's' : ''} na aba Planos!`, 'success')
                            }}
                            style={{ width: '100%', padding: '11px', borderRadius: 10, background: planDiasSemana.length === 0 || !planDataInicio ? '#e2e8f0' : '#6366f1', color: planDiasSemana.length === 0 || !planDataInicio ? '#94a3b8' : '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: planDiasSemana.length === 0 || !planDataInicio ? 'default' : 'pointer', transition: 'all .15s' }}>
                            Criar {seqParaPlanejar.slots.length} planos
                        </button>
                    </div>
                </div>
            )
        })()}
        </>
    )
}
