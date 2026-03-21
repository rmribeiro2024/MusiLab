import React, { useState } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'

export default function TelaPosAula() {
    const { planos, sugerirPlanoParaTurma } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()
    const {
        obterTurmasDoDia,
        setModalRegistroRapido,
        setRrData, setRrAnoSel, setRrEscolaSel,
        setRrTextos, setRrPlanosSegmento, setRrResultados, setRrRubricas, setRrEncaminhamentos,
        setRrTurmaId, setRrSegmentoId,
    } = useCalendarioContext()
    const { aplicacoesPorData } = useAplicacoesContext()

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const toStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const hojeStr = toStr(hoje)

    const [dataSel, setDataSel] = useState(hojeStr)

    // Todos os registros de todos os planos
    const todosRegistros = planos.flatMap(p =>
        (p.registrosPosAula || []).map(r => ({ ...r, planoTitulo: p.titulo, planoId: p.id }))
    )

    // Turmas do dia selecionado enriquecidas
    const turmasDoDia = obterTurmasDoDia(dataSel)
    const apsDoDia = aplicacoesPorData[dataSel] || []

    const turmasEnriq = [...turmasDoDia]
        .sort((a, b) => a.horario.localeCompare(b.horario))
        .map(aula => {
            const ano = anosLetivos.find(a => a.id == aula.anoLetivoId)
            const esc = ano?.escolas.find(e => e.id == aula.escolaId)
            const seg = esc?.segmentos.find(s => s.id == aula.segmentoId)
            const tur = seg?.turmas.find(t => t.id == aula.turmaId)
            const aplicacao = apsDoDia.find(ap => ap.turmaId == aula.turmaId && ap.segmentoId == aula.segmentoId)
            const plano = aplicacao
                ? planos.find(p => String(p.id) === String(aplicacao.planoId))
                : sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId) || undefined
            const registrada = todosRegistros.some(
                r => r.data === dataSel && String(r.turma) === String(aula.turmaId)
            )
            return { aula, escNome: esc?.nome || '', segNome: seg?.nome || '?', turNome: tur?.nome || '?', plano, registrada }
        })

    const pendentes = turmasEnriq.filter(t => !t.registrada).length
    const concluidas = turmasEnriq.filter(t => t.registrada).length

    const abrirRegistro = (t: typeof turmasEnriq[0]) => {
        setRrData(dataSel)
        setRrAnoSel(t.aula.anoLetivoId)
        setRrEscolaSel(t.aula.escolaId)
        setRrTextos({})
        setRrPlanosSegmento({})
        setRrResultados({})
        setRrRubricas({})
        setRrEncaminhamentos({})
        setRrTurmaId(String(t.aula.turmaId))
        setRrSegmentoId(String(t.aula.segmentoId))
        setModalRegistroRapido(true)
    }

    // Histórico: últimos 14 dias com pelo menos 1 registro
    const diasSemanaLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const mesesLabel = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    const historicoRecente = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(hoje)
        d.setDate(hoje.getDate() - i - 1)
        return toStr(d)
    }).filter(ds => todosRegistros.some(r => r.data === ds))

    const labelData = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLabel[d.getDay()]}, ${d.getDate()} ${mesesLabel[d.getMonth()]}`
    }

    const nomeTurma = (r: any) => {
        const ano = anosLetivos.find(a => a.id == r.anoLetivo)
        const esc = ano?.escolas.find(e => e.id == r.escola)
        const seg = esc?.segmentos.find(s => s.id == (r.segmento || r.serie))
        const tur = seg?.turmas.find(t => t.id == r.turma)
        return tur?.nome || '?'
    }

    const ehHoje = dataSel === hojeStr

    return (
        <div className="max-w-2xl mx-auto space-y-4 pb-24">

            {/* ── CABEÇALHO ── */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pós-aula</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Registre o que aconteceu em cada aula</p>
                </div>
                {pendentes > 0 && ehHoje && (
                    <span className="text-[11px] bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                        {pendentes} pendente{pendentes > 1 ? 's' : ''} hoje
                    </span>
                )}
            </div>

            {/* ── SELETOR DE DATA ── */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setDataSel(hojeStr)}
                    className={`shrink-0 font-bold text-sm px-4 py-2 rounded-xl transition ${
                        ehHoje
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                    }`}>
                    Hoje
                </button>
                <input
                    type="date"
                    value={dataSel}
                    onChange={e => setDataSel(e.target.value)}
                    className="flex-1 border-2 border-[#E6EAF0] dark:border-[#374151] rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-[#E5E7EB] bg-white dark:bg-[#111827] outline-none focus:border-[#5B5FEA] dark:focus:border-[#818cf8]"
                />
            </div>

            {/* ── TURMAS DO DIA ── */}
            <div className="v2-card rounded-2xl shadow-sm overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">
                {/* Header */}
                <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
                        {ehHoje ? '📅 Turmas de hoje' : `📅 ${labelData(dataSel)}`}
                    </span>
                    <div className="flex gap-1.5">
                        {concluidas > 0 && (
                            <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                {concluidas} ✅
                            </span>
                        )}
                        {pendentes > 0 && (
                            <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                {pendentes} pendente{pendentes > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* Lista */}
                {turmasEnriq.length === 0 ? (
                    <div className="px-4 py-10 text-center space-y-1">
                        <p className="text-sm text-gray-400">Nenhuma aula na grade para este dia.</p>
                        <p className="text-xs text-gray-300">Configure a grade em Configurações → Grade Semanal.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {turmasEnriq.map(t => (
                            <div key={t.aula.id} className="px-4 py-3 flex items-center gap-3">
                                {/* Status dot */}
                                <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${t.registrada ? 'bg-emerald-400' : 'bg-amber-400'}`} />

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs shrink-0">
                                            {t.aula.horario}
                                        </span>
                                        <span className="text-gray-300 text-xs">•</span>
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.segNome}</span>
                                        <span className="text-gray-300 text-xs">•</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{t.turNome}</span>
                                    </div>
                                    {t.plano && typeof t.plano === 'object' && (
                                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">📄 {(t.plano as any).titulo}</p>
                                    )}
                                </div>

                                {/* Botão de ação */}
                                <button
                                    onClick={() => abrirRegistro(t)}
                                    className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                                        t.registrada
                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm'
                                    }`}>
                                    {t.registrada ? '✓ Ver' : 'Registrar'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── HISTÓRICO RECENTE ── */}
            {historicoRecente.length > 0 && (
                <div className="v2-card rounded-2xl shadow-sm overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Registros recentes
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {historicoRecente.map(ds => {
                            const regs = todosRegistros.filter(r => r.data === ds)
                            return (
                                <div
                                    key={ds}
                                    onClick={() => setDataSel(ds)}
                                    className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                    <span className="text-xs font-medium text-slate-500 w-24 shrink-0">
                                        {labelData(ds)}
                                    </span>
                                    <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                                        {regs.length} reg.
                                    </span>
                                    <span className="text-xs text-gray-400 truncate">
                                        {regs.map(r => nomeTurma(r)).join(', ')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
