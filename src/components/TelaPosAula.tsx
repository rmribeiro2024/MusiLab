import React, { useState, Suspense } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import ModalRegistroPosAula from './modals/ModalRegistroPosAula'

export default function TelaPosAula() {
    const { planos, sugerirPlanoParaTurma } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()
    const {
        obterTurmasDoDia,
        setModalRegistro,
        setPlanoParaRegistro,
        setNovoRegistro,
        setRegistroEditando,
        setVerRegistros,
    } = useCalendarioContext()
    const { aplicacoesPorData } = useAplicacoesContext()

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const toStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const hojeStr = toStr(hoje)

    const [dataSel, setDataSel] = useState(hojeStr)
    const [listaAberta, setListaAberta] = useState(true)
    const [turmaIdx, setTurmaIdx] = useState(-1)
    const navDia = (delta: number) => {
        const d = new Date(dataSel + 'T12:00:00')
        d.setDate(d.getDate() + delta)
        setDataSel(toStr(d))
        setListaAberta(true)
        setTurmaIdx(-1)
        setModalRegistro(false)
    }

    const agora = new Date()
    const minAgora = agora.getHours() * 60 + agora.getMinutes()
    const ehHoje = dataSel === hojeStr

    const diasSemanaLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const diasSemanaLong  = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const mesesLabel = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

    const labelDataCurta = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLabel[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    const labelDataLonga = (ds: string) => {
        const d = new Date(ds + 'T12:00:00')
        return `${diasSemanaLong[d.getDay()]}, ${d.getDate()} de ${mesesLabel[d.getMonth()]}`
    }

    const todosRegistros = planos.flatMap(p =>
        (p.registrosPosAula || []).map(r => ({ ...r, planoTitulo: p.titulo, planoId: p.id }))
    )

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
            const ehPassado = dataSel < hojeStr
            const passou = ehHoje && minInicio !== null ? minAgora > minInicio + 50 : ehPassado
            const dimmed = passou

            return { aula, escNome: esc?.nome || '', segNome: seg?.nome || '?', turNome: tur?.nome || '?', plano, registrada, dimmed }
        })

    const pendentes  = turmasEnriq.filter(t => !t.registrada).length
    const concluidas = turmasEnriq.filter(t =>  t.registrada).length

    // Seleciona turma pelo índice — fecha a lista
    const abrirTurma = (idx: number) => {
        const t = turmasEnriq[idx]
        if (!t) return
        const plano = t.plano && typeof t.plano === 'object'
            ? t.plano as any
            : { id: `stub-${t.aula.id}`, titulo: '', escola: t.escNome, segmento: t.segNome, turma: t.turNome }
        setPlanoParaRegistro(plano)
        setNovoRegistro({ dataAula: dataSel, resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', anotacoesGerais: '', urlEvidencia: '', statusAula: undefined } as any)
        setRegistroEditando(null)
        setVerRegistros(false)
        setTurmaIdx(idx)
        setListaAberta(false)   // fecha a lista ao selecionar
    }

    // Após salvar: avança para próxima pendente ou volta à lista
    const handleDepoisSalvar = () => {
        const proxIdx = turmasEnriq.findIndex((t, i) => i > turmaIdx && !t.registrada)
        if (proxIdx >= 0) {
            abrirTurma(proxIdx)
        } else {
            const proxAntes = turmasEnriq.findIndex((t, i) => i !== turmaIdx && !t.registrada)
            if (proxAntes >= 0) {
                abrirTurma(proxAntes)
            } else {
                setListaAberta(true)
                setTurmaIdx(-1)
                setModalRegistro(false)
            }
        }
    }

    // Navegar entre turmas com ‹ ›
    const navTurma = (delta: number, e: React.MouseEvent) => {
        e.stopPropagation()
        const prox = turmaIdx + delta
        if (prox < 0 || prox >= turmasEnriq.length) return
        abrirTurma(prox)
    }

    const turmaAtual = turmasEnriq[turmaIdx]

    return (
        <div className="max-w-2xl mx-auto pb-24">

            {/* ── CARD ÚNICO ── */}
            <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">

                {/* ══ CABEÇALHO ÚNICO (sempre compacto) ══ */}
                <div className="sticky top-0 z-10 v2-card border-b border-[#E6EAF0] dark:border-[#374151]">
                    <div
                        className="px-4 py-3 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition select-none"
                        onClick={() => setListaAberta(v => !v)}>

                        {/* Toggle lista */}
                        <span className="text-[11px] text-slate-400 dark:text-[#6b7280] flex items-center gap-0.5 shrink-0 mr-1">
                            <span>{listaAberta ? '▲' : '▼'}</span>
                            <span className="ml-0.5">todas</span>
                        </span>

                        {/* Info — sempre compacto */}
                        <div className="flex-1 min-w-0 flex items-center gap-[5px] text-[12px] overflow-hidden">
                            {turmaAtual ? (
                                <>
                                    <span className="font-bold tabular-nums text-slate-800 dark:text-[#E5E7EB] shrink-0">{turmaAtual.aula.horario}</span>
                                    <span className="text-slate-200 dark:text-slate-700">·</span>
                                    <span className="text-slate-500 dark:text-[#9CA3AF] truncate">{turmaAtual.escNome}</span>
                                    <span className="text-slate-200 dark:text-slate-700">·</span>
                                    <span className="font-bold text-slate-800 dark:text-[#E5E7EB] shrink-0">{turmaAtual.turNome}</span>
                                    <span className="text-slate-200 dark:text-slate-700">·</span>
                                    <span className="text-[#5B5FEA] dark:text-[#818cf8] text-[11px] shrink-0">{labelDataCurta(dataSel)}</span>
                                    <span className={`w-[7px] h-[7px] rounded-full shrink-0 ml-0.5 ${turmaAtual.registrada ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                </>
                            ) : (
                                /* Sem turma selecionada: só a data pequena */
                                <span className="text-[12px] text-slate-500 dark:text-[#9CA3AF]">{labelDataCurta(dataSel)}{ehHoje ? ' · Hoje' : ''}</span>
                            )}
                        </div>

                        {/* Controles direita */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            {turmaAtual ? (
                                <>
                                    {/* Setas de turma */}
                                    <button onClick={e => navTurma(-1, e)} disabled={turmaIdx === 0}
                                        className="w-[28px] h-[28px] rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card flex items-center justify-center text-[13px] text-slate-400 dark:text-[#6b7280] disabled:opacity-30 transition hover:text-[#5B5FEA] hover:border-[#5B5FEA]/30 cursor-pointer">‹</button>
                                    <span className="text-[11px] font-semibold text-slate-400 dark:text-[#6b7280] min-w-[28px] text-center tabular-nums">{turmaIdx + 1}/{turmasEnriq.length}</span>
                                    <button onClick={e => navTurma(1, e)} disabled={turmaIdx === turmasEnriq.length - 1}
                                        className="w-[28px] h-[28px] rounded-[7px] border border-[#cbd5e1] dark:border-[#374151] bg-transparent flex items-center justify-center text-[13px] text-slate-500 dark:text-[#9CA3AF] disabled:opacity-30 transition hover:border-[#94a3b8] dark:hover:border-[#6b7280] hover:text-slate-700 dark:hover:text-[#E5E7EB] cursor-pointer">›</button>
                                </>
                            ) : (
                                /* Setas de dia */
                                <>
                                    {!ehHoje && (
                                        <button onClick={() => { setDataSel(hojeStr); setTurmaIdx(-1) }}
                                            className="mr-1 px-[10px] py-[4px] rounded-[6px] border border-[#E6EAF0] dark:border-[#374151] v2-card text-[11px] font-medium text-slate-500 dark:text-[#9CA3AF] cursor-pointer transition hover:text-slate-700">
                                            Hoje
                                        </button>
                                    )}
                                    {[-1, 1].map(d => (
                                        <button key={d} onClick={() => navDia(d)}
                                            className="w-[28px] h-[28px] rounded-[7px] border border-[#E6EAF0] dark:border-[#374151] v2-card flex items-center justify-center text-[13px] text-slate-400 dark:text-[#6b7280] transition hover:text-[#5B5FEA] hover:border-[#5B5FEA]/30 cursor-pointer">
                                            {d < 0 ? '‹' : '›'}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sub-linha — instrução ou status */}
                    {listaAberta && turmasEnriq.length > 0 && (
                        <div className="px-4 pb-2 text-[11.5px] text-slate-400 dark:text-[#9CA3AF]">
                            {turmaIdx === -1
                                ? <span>Selecione uma turma para registrar o pós-aula</span>
                                : pendentes > 0
                                    ? <span>{pendentes} pendente{pendentes > 1 ? 's' : ''}{concluidas > 0 ? ` · ${concluidas} registrada${concluidas > 1 ? 's' : ''}` : ''}</span>
                                    : <span className="text-emerald-500">Tudo registrado ✓</span>
                            }
                        </div>
                    )}
                </div>

                {/* ══ LISTA DE TURMAS (colapsável) ══ */}
                <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: listaAberta ? '2000px' : '0px', opacity: listaAberta ? 1 : 0 }}>

                    {turmasEnriq.length === 0 ? (
                        <div className="px-4 py-10 text-center space-y-1">
                            <p className="text-[13px] text-slate-400 dark:text-[#6b7280]">Nenhuma aula na grade para este dia.</p>
                            <p className="text-[12px] text-slate-300 dark:text-[#4B5563]">Configure a grade em Configurações → Grade Semanal.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#F1F4F8] dark:divide-[#374151]/60">
                            {turmasEnriq.map((t, i) => (
                                <div
                                    key={t.aula.id}
                                    onClick={() => abrirTurma(i)}
                                    className={`px-4 py-3 flex items-center gap-3 transition cursor-pointer
                                        ${turmaIdx === i ? 'bg-[#EEF0FF] dark:bg-[#5B5FEA]/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                                    style={{ opacity: t.dimmed ? 0.72 : 1 }}>

                                    <span className={`w-2 h-2 rounded-full shrink-0 ${t.registrada ? 'bg-emerald-400' : 'bg-amber-400'}`} />

                                    <div className="flex-1 min-w-0">
                                        <div style={{ display: 'grid', gridTemplateColumns: '54px minmax(0, 110px) auto 1fr', columnGap: '6px', alignItems: 'center' }}>
                                            <span className="text-[12px] font-semibold tabular-nums text-slate-700 dark:text-[#E5E7EB]">{t.aula.horario}</span>
                                            <span className="text-[12px] text-slate-400 dark:text-[#6b7280] truncate">{t.escNome || ''}</span>
                                            <span className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF] shrink-0">{t.segNome}</span>
                                            <span className="text-[12px] font-bold text-slate-700 dark:text-[#E5E7EB] truncate">{t.turNome}</span>
                                        </div>
                                        {t.plano && typeof t.plano === 'object' && (
                                            <p className="text-[11px] text-slate-400 dark:text-[#9CA3AF] mt-0.5 truncate">{(t.plano as any).titulo}</p>
                                        )}
                                    </div>

                                    {t.registrada
                                        ? <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full shrink-0">✓ registrada</span>
                                        : <span className={`text-[11px] shrink-0 ${turmaIdx === i ? 'text-[#5B5FEA] font-bold' : 'text-slate-300 dark:text-slate-600'}`}>›</span>
                                    }
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ══ FORMULÁRIO INLINE — só aparece quando o professor clicou numa turma ══ */}
                {!listaAberta && turmaIdx >= 0 && (
                    <div className={listaAberta ? 'border-t border-[#E6EAF0] dark:border-[#374151]' : ''}>
                        <Suspense fallback={<div className="px-4 py-8 text-center text-[13px] text-slate-400">Carregando...</div>}>
                            <ModalRegistroPosAula
                                inlineMode
                                hideHeader
                                onVoltar={handleDepoisSalvar}
                                saveLabel="Salvar"
                            />
                        </Suspense>
                    </div>
                )}

            </div>
        </div>
    )
}
