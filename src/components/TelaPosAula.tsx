import React, { useState, useRef } from 'react'
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
    const dateInputRef = useRef<HTMLInputElement>(null)

    const navDia = (delta: number) => {
        const d = new Date(dataSel + 'T12:00:00')
        d.setDate(d.getDate() + delta)
        setDataSel(toStr(d))
    }

    // Minutos desde meia-noite — para calcular se aula já passou
    const agora = new Date()
    const minAgora = agora.getHours() * 60 + agora.getMinutes()
    const ehHoje = dataSel === hojeStr

    // Label da data selecionada
    const diasSemanaLabel = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const mesesLabel = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    const labelDataLonga = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLabel[d.getDay()]}, ${d.getDate()} de ${mesesLabel[d.getMonth()]}`
    }

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

    // Botão de navegação reutilizável
    const NavBtn = ({ delta }: { delta: number }) => (
        <button
            onClick={() => navDia(delta)}
            style={{
                width: 30, height: 30, borderRadius: 7,
                border: '1px solid #E6EAF0', background: 'var(--v2-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#94a3b8', fontSize: 13, flexShrink: 0,
                transition: 'all 120ms ease', fontFamily: 'inherit',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#5B5FEA'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(91,95,234,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E6EAF0' }}>
            {delta < 0 ? '‹' : '›'}
        </button>
    )

    return (
        <div className="max-w-2xl mx-auto space-y-4 pb-24">

            {/* ── CABEÇALHO ── */}
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">Pós-aula</h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">Registre o que aconteceu em cada aula</p>
            </div>

            {/* ── BARRA DE CONTEXTO (Opção 4) ── */}
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] px-4 py-3 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {/* Esquerda: dot + data + status */}
                <div className="flex items-center gap-3 min-w-0">
                    {ehHoje && <span className="w-2 h-2 rounded-full bg-[#5B5FEA] shrink-0" />}
                    {/* Clicável para abrir datepicker nativo */}
                    <button
                        onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div className="text-[13px] font-semibold text-slate-700 dark:text-[#E5E7EB] flex items-center gap-2">
                            {labelDataLonga(dataSel)}
                            {ehHoje && <span className="text-[11px] font-medium text-[#5B5FEA] dark:text-[#818cf8] bg-[#5B5FEA]/8 dark:bg-[#818cf8]/10 px-1.5 py-0.5 rounded">Hoje</span>}
                        </div>
                        {turmasEnriq.length > 0 && (
                            <div className="text-[11px] text-slate-400 dark:text-[#6b7280] mt-0.5">
                                {pendentes > 0 ? `${pendentes} pendente${pendentes > 1 ? 's' : ''}` : 'tudo registrado'}
                                {concluidas > 0 && pendentes > 0 && ` · ${concluidas} registrada${concluidas > 1 ? 's' : ''}`}
                            </div>
                        )}
                    </button>
                    {/* Input invisível para acionar datepicker */}
                    <input
                        ref={dateInputRef}
                        type="date"
                        value={dataSel}
                        onChange={e => setDataSel(e.target.value)}
                        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                    />
                </div>

                {/* Direita: setas + botão Hoje */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <NavBtn delta={-1} />
                    <NavBtn delta={+1} />
                    {!ehHoje && (
                        <button
                            onClick={() => setDataSel(hojeStr)}
                            style={{
                                marginLeft: 4, padding: '4px 10px', borderRadius: 6,
                                border: '1px solid #E6EAF0', background: 'var(--v2-card)',
                                fontSize: 11, fontWeight: 500, color: '#64748b',
                                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 120ms ease',
                            }}>
                            Hoje
                        </button>
                    )}
                </div>
            </div>

            {/* ── TURMAS DO DIA ── */}
            <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#E6EAF0] dark:border-[#374151] flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-[#6b7280]">
                        Turmas
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
                                className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition"
                                style={{ opacity: t.dimmed ? 0.72 : 1 }}>

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
                                        padding: '5px 12px', borderRadius: '7px',
                                        fontSize: '12px', fontWeight: 500,
                                        fontFamily: 'inherit', cursor: 'pointer',
                                        transition: 'all 120ms ease', flexShrink: 0,
                                        background: 'transparent',
                                        border: '1px solid #E6EAF0',
                                        color: t.registrada ? '#64748b' : '#5B5FEA',
                                    }}>
                                    {t.registrada ? 'Ver' : 'Registrar'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}
