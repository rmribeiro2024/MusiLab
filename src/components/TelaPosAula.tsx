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
        setModalRegistro,
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

    // Minutos desde meia-noite — para calcular se aula já passou
    const agora = new Date()
    const minAgora = agora.getHours() * 60 + agora.getMinutes()
    const ehHoje = dataSel === hojeStr

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
            // Aula já passou: só relevante quando é hoje e horário já passou
            const match = aula.horario?.match(/^(\d{1,2}):(\d{2})/)
            const minInicio = match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null
            const passou = ehHoje && minInicio !== null ? minAgora > minInicio + 50 : !ehHoje
            const dimmed = passou

            return { aula, escNome: esc?.nome || '', segNome: seg?.nome || '?', turNome: tur?.nome || '?', plano, registrada, dimmed }
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
        setModalRegistro(true)
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

    return (
        <div className="max-w-2xl mx-auto space-y-4 pb-24">

            {/* ── CABEÇALHO ── */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">Pós-aula</h1>
                    <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">Registre o que aconteceu em cada aula</p>
                </div>
                {pendentes > 0 && ehHoje && (
                    <span className="text-[11px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full font-semibold">
                        {pendentes} pendente{pendentes > 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* ── SELETOR DE DATA ── */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setDataSel(hojeStr)}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: ehHoje ? 'none' : '1px solid #E6EAF0',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                        background: ehHoje ? '#5B5FEA' : 'var(--v2-card)',
                        color: ehHoje ? '#fff' : '#64748b',
                        boxShadow: ehHoje ? '0 1px 4px rgba(91,95,234,0.3)' : 'none',
                    }}>
                    Hoje
                </button>
                <input
                    type="date"
                    value={dataSel}
                    onChange={e => setDataSel(e.target.value)}
                    className="flex-1 border border-[#E6EAF0] dark:border-[#374151] rounded-[8px] px-3 py-[7px] text-[13px] font-medium text-slate-700 dark:text-[#E5E7EB] v2-card outline-none focus:border-[#5B5FEA] dark:focus:border-[#818cf8] transition"
                />
            </div>

            {/* ── TURMAS DO DIA ── */}
            <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#E6EAF0] dark:border-[#374151] flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-[#6b7280]">
                        {ehHoje ? 'Turmas de hoje' : labelData(dataSel)}
                    </span>
                    {turmasEnriq.length > 0 && (
                        <span className="text-[11px] text-slate-400 dark:text-[#6b7280]">
                            {concluidas}/{turmasEnriq.length} registradas
                        </span>
                    )}
                </div>

                {/* Lista */}
                {turmasEnriq.length === 0 ? (
                    <div className="px-4 py-10 text-center space-y-1">
                        <p className="text-[13px] text-slate-400 dark:text-[#6b7280]">Nenhuma aula na grade para este dia.</p>
                        <p className="text-[12px] text-slate-300 dark:text-[#4B5563]">Configure a grade em Configurações → Grade Semanal.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#F1F4F8] dark:divide-[#374151]/60">
                        {turmasEnriq.map(t => (
                            <div
                                key={t.aula.id}
                                className="px-4 py-3 flex items-center gap-3 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-800/30 transition"
                                style={{ opacity: t.dimmed ? 0.72 : 1 }}>
                                {/* Status dot */}
                                <span className={`shrink-0 w-2 h-2 rounded-full ${t.registrada ? 'bg-emerald-400' : 'bg-amber-400'}`} />

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[12px] font-semibold text-slate-700 dark:text-[#E5E7EB] shrink-0 tabular-nums">
                                            {t.aula.horario}
                                        </span>
                                        <span className="text-slate-200 dark:text-slate-700 text-xs">·</span>
                                        <span className="text-[12px] font-medium text-slate-600 dark:text-[#9CA3AF]">{t.segNome}</span>
                                        <span className="text-slate-200 dark:text-slate-700 text-xs">·</span>
                                        <span className="text-[12px] text-slate-400 dark:text-[#6b7280]">{t.turNome}</span>
                                    </div>
                                    {t.plano && typeof t.plano === 'object' && (
                                        <p className="text-[11px] text-slate-400 dark:text-[#6b7280] mt-0.5 truncate">
                                            {(t.plano as any).titulo}
                                        </p>
                                    )}
                                </div>

                                {/* Botão de ação */}
                                <button
                                    onClick={() => abrirRegistro(t)}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: '7px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        fontFamily: 'inherit',
                                        cursor: 'pointer',
                                        transition: 'all 120ms ease',
                                        flexShrink: 0,
                                        ...(t.registrada
                                            ? { background: 'transparent', border: '1px solid #E6EAF0', color: '#10b981' }
                                            : { background: '#5B5FEA', border: '1px solid transparent', color: '#fff', boxShadow: '0 1px 3px rgba(91,95,234,0.25)' }
                                        )
                                    }}>
                                    {t.registrada ? '✓ Ver' : 'Registrar'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── HISTÓRICO RECENTE ── */}
            {historicoRecente.length > 0 && (
                <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">
                    <div className="px-4 py-3 border-b border-[#E6EAF0] dark:border-[#374151]">
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-[#6b7280]">
                            Registros recentes
                        </span>
                    </div>
                    <div className="divide-y divide-[#F1F4F8] dark:divide-[#374151]/60">
                        {historicoRecente.map(ds => {
                            const regs = todosRegistros.filter(r => r.data === ds)
                            return (
                                <div
                                    key={ds}
                                    onClick={() => setDataSel(ds)}
                                    className="px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                                    <span className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF] w-24 shrink-0">
                                        {labelData(ds)}
                                    </span>
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                                        {regs.length} reg.
                                    </span>
                                    <span className="text-[11px] text-slate-400 dark:text-[#6b7280] truncate">
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
