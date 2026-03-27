import React, { useState, useEffect, useRef, Suspense } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import ModalRegistroPosAula from './modals/ModalRegistroPosAula'
import { showToast } from '../lib/toast'

export default function TelaPosAula() {
    const { planos, sugerirPlanoParaTurma, editarRegistro } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()
    const {
        obterTurmasDoDia,
        setModalRegistro,
        setPlanoParaRegistro,
        setNovoRegistro,
        setRegistroEditando,
        setVerRegistros,
        setRegAnoSel,
        setRegEscolaSel,
        setRegSegmentoSel,
        setRegTurmaSel,
    } = useCalendarioContext()
    const { aplicacoesPorData } = useAplicacoesContext()
    const { planejamentos, salvarPlanejamentoParaTurma } = usePlanejamentoTurmaContext()

    // ── Estado do modal "Planejar rápido" ─────────────────────────────────────
    const [planoRapidoIdx, setPlanoRapidoIdx] = useState<number | null>(null)
    const [roteiroRapido, setRoteiroRapido] = useState('')
    const [objetivoRapido, setObjetivoRapido] = useState('')
    const roteiroRef = useRef<HTMLTextAreaElement>(null)

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

    // Tempo atual em minutos — state estável para evitar flashing no badge "AO VIVO"
    const [minAgora, setMinAgora] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes() })
    useEffect(() => {
        const t = setInterval(() => { const n = new Date(); setMinAgora(n.getHours() * 60 + n.getMinutes()) }, 30_000)
        return () => clearInterval(t)
    }, [])
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
            const planoIdSugerido = !aplicacao ? sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId) : null
            const plano = aplicacao
                ? planos.find(p => String(p.id) === String(aplicacao.planoId))
                : planoIdSugerido ? planos.find(p => String(p.id) === planoIdSugerido) : undefined
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

        // Bug 7: se turma já registrada, abre com dados preenchidos
        if (t.registrada) {
            const reg = todosRegistros.find(
                r => r.data === dataSel && String(r.turma) === String(t.aula.turmaId)
            )
            if (reg) {
                editarRegistro(reg)
            } else {
                setNovoRegistro({ dataAula: dataSel, resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', anotacoesGerais: '', urlEvidencia: '', statusAula: undefined } as any)
                setRegistroEditando(null)
            }
        } else {
            setNovoRegistro({ dataAula: dataSel, resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', anotacoesGerais: '', urlEvidencia: '', statusAula: undefined } as any)
            setRegistroEditando(null)
        }

        setVerRegistros(false)
        // Pré-seleciona escola/turma diretamente pelos IDs da grade — sem depender do campo plano.escola
        setRegAnoSel(String(t.aula.anoLetivoId ?? ''))
        setRegEscolaSel(String(t.aula.escolaId ?? ''))
        setRegSegmentoSel(String(t.aula.segmentoId ?? ''))
        setRegTurmaSel(String(t.aula.turmaId ?? ''))
        setTurmaIdx(idx)
        setListaAberta(false)   // fecha a lista ao selecionar
    }

    // ── Planejamento rápido ───────────────────────────────────────────────────

    // Retorna PlanejamentoTurma existente para uma turma nesta data, se houver
    const getPlanoRapidoDaTurma = (t: typeof turmasEnriq[0]) =>
        planejamentos.find(p =>
            p.turmaId   === String(t.aula.turmaId)   &&
            p.escolaId  === String(t.aula.escolaId)  &&
            p.segmentoId=== String(t.aula.segmentoId)&&
            p.anoLetivoId=== String(t.aula.anoLetivoId) &&
            p.dataPrevista === dataSel
        )

    const abrirPlanoRapido = (e: React.MouseEvent, idx: number) => {
        e.stopPropagation()
        setRoteiroRapido('')
        setObjetivoRapido('')
        setPlanoRapidoIdx(idx)
        // Foca o textarea do roteiro após renderizar
        setTimeout(() => roteiroRef.current?.focus(), 80)
    }

    const fecharPlanoRapido = () => setPlanoRapidoIdx(null)

    const handleSalvarPlanoRapido = () => {
        if (planoRapidoIdx === null) return
        const t = turmasEnriq[planoRapidoIdx]
        if (!t || !roteiroRapido.trim()) return

        salvarPlanejamentoParaTurma(
            {
                anoLetivoId: String(t.aula.anoLetivoId ?? ''),
                escolaId:    String(t.aula.escolaId    ?? ''),
                segmentoId:  String(t.aula.segmentoId  ?? ''),
                turmaId:     String(t.aula.turmaId     ?? ''),
            },
            {
                oQuePretendoFazer: roteiroRapido.trim(),
                objetivo:          objetivoRapido.trim() || undefined,
                dataPrevista:      dataSel,
                origemAula:        'livre',
            }
        )

        setPlanoRapidoIdx(null)
        setRoteiroRapido('')
        setObjetivoRapido('')
        showToast('Plano salvo ✓')
    }

    // Bug 6: após salvar, sempre volta à lista de turmas
    const handleDepoisSalvar = () => {
        showToast('Registro salvo ✓')
        setListaAberta(true)
        setTurmaIdx(-1)
        setModalRegistro(false)
    }


    const turmaAtual = turmasEnriq[turmaIdx]

    return (
        <div className="max-w-2xl mx-auto pb-24">

            {/* ── CARD ÚNICO ── */}
            <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">

                {/* ══ CABEÇALHO ÚNICO (sempre compacto) ══ */}
                <div className="sticky top-0 z-10 v2-card border-b border-[#E6EAF0] dark:border-[#374151]">
                    <div
                        className={`px-4 py-3 flex items-center gap-2 select-none ${turmaAtual && !listaAberta ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/20 transition' : ''}`}
                        onClick={turmaAtual && !listaAberta ? () => { setListaAberta(true); setTurmaIdx(-1) } : undefined}>

                        {/* Voltar / toggle lista */}
                        {turmaAtual && !listaAberta ? (
                            <button
                                onClick={() => { setListaAberta(true); setTurmaIdx(-1) }}
                                className="text-[11px] text-slate-400 dark:text-[#6b7280] flex items-center gap-0.5 shrink-0 mr-1 cursor-pointer hover:text-slate-600 dark:hover:text-[#9CA3AF] transition">
                                <span>←</span>
                                <span className="ml-0.5">voltar</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setListaAberta(v => !v)}
                                className="text-[11px] text-slate-400 dark:text-[#6b7280] flex items-center gap-0.5 shrink-0 mr-1 cursor-pointer hover:text-slate-600 dark:hover:text-[#9CA3AF] transition">
                                <span>{listaAberta ? '▲' : '▼'}</span>
                                <span className="ml-0.5">todas</span>
                            </button>
                        )}

                        {/* Centro: data só / ou dot + turma quando selecionada */}
                        <div className="flex-1 min-w-0 flex items-center gap-[5px] text-[12px] overflow-hidden">
                            {turmaAtual ? (
                                <>
                                    <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${turmaAtual.registrada ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    <span className="font-semibold tabular-nums text-slate-700 dark:text-[#E5E7EB] shrink-0">{turmaAtual.aula.horario}</span>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="text-slate-400 dark:text-[#6b7280] truncate">{turmaAtual.escNome}</span>
                                    <span className="text-slate-300 dark:text-slate-600">·</span>
                                    <span className="font-bold text-slate-700 dark:text-[#E5E7EB] shrink-0">{turmaAtual.turNome}</span>
                                </>
                            ) : (
                                <span className="text-slate-500 dark:text-[#9CA3AF]">
                                    {labelDataCurta(dataSel)}{ehHoje ? ' · Hoje' : ''}
                                </span>
                            )}
                        </div>

                        {/* Direita: ‹ › dia (sempre) */}
                        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            {turmaAtual && (
                                <div className="w-px h-4 bg-[#E6EAF0] dark:bg-[#374151] mx-0.5" />
                            )}
                            {!ehHoje && !turmaAtual && (
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
                                            <span className="text-[12px] font-semibold tabular-nums text-slate-700 dark:text-[#E5E7EB] flex items-center gap-1">
                                                {t.aula.horario}
                                                {ehHoje && (() => {
                                                    const m = t.aula.horario?.match(/^(\d{1,2}):(\d{2})/)
                                                    const minI = m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null
                                                    return minI !== null && minAgora >= minI && minAgora <= minI + 50
                                                        ? <span className="w-[5px] h-[5px] rounded-full bg-red-500 animate-pulse shrink-0" title="Ao vivo" />
                                                        : null
                                                })()}
                                            </span>
                                            <span className="text-[12px] text-slate-400 dark:text-[#6b7280] truncate">{t.escNome || ''}</span>
                                            <span className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF] shrink-0">{t.segNome}</span>
                                            <span className="text-[12px] font-bold text-slate-700 dark:text-[#E5E7EB] truncate">{t.turNome}</span>
                                        </div>
                                        {/* Linha de status de planejamento */}
                                        {(() => {
                                            const pr = getPlanoRapidoDaTurma(t)
                                            if (pr) {
                                                return (
                                                    <p className="mt-[3px] text-[11px] text-slate-400 dark:text-[#6B7280] truncate">
                                                        <span className="text-[#5B5FEA] mr-1">✎</span>
                                                        {pr.oQuePretendoFazer}
                                                    </p>
                                                )
                                            }
                                            if (!t.plano && !t.registrada) {
                                                return (
                                                    <div className="mt-[3px] flex items-center gap-[6px]">
                                                        <span className="text-[11px] text-amber-500 dark:text-amber-400">Sem plano vinculado</span>
                                                        <button
                                                            onClick={e => abrirPlanoRapido(e, i)}
                                                            className="text-[11px] text-[#5B5FEA] font-medium hover:underline shrink-0 cursor-pointer">
                                                            Planejar rápido →
                                                        </button>
                                                    </div>
                                                )
                                            }
                                            return null
                                        })()}
                                    </div>

                                    {t.registrada
                                        ? <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">✓ registrada</span>
                                        : <span className={`text-[11px] shrink-0 ${turmaIdx === i ? 'text-[#5B5FEA] font-bold' : 'text-slate-300 dark:text-slate-600'}`}>›</span>
                                    }
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ══ FORMULÁRIO INLINE ══ */}
                {!listaAberta && turmaIdx >= 0 && turmaAtual && (
                    <Suspense fallback={<div className="px-4 py-8 text-center text-[13px] text-slate-400">Carregando...</div>}>
                        <ModalRegistroPosAula
                            inlineMode
                            hideHeader
                            onVoltar={handleDepoisSalvar}
                            saveLabel="Salvar"
                        />
                    </Suspense>
                )}

            </div>

            {/* ══ BOTTOM SHEET: PLANEJAR RÁPIDO ══ */}
            {planoRapidoIdx !== null && (() => {
                const t = turmasEnriq[planoRapidoIdx]
                if (!t) return null
                return (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40 bg-black/40"
                            onClick={fecharPlanoRapido}
                        />
                        {/* Sheet */}
                        <div className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto v2-card rounded-t-2xl border-t border-[#E6EAF0] dark:border-[#374151] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] px-4 pt-4 pb-8">

                            {/* Handle */}
                            <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4" />

                            {/* Cabeçalho */}
                            <div className="flex items-center justify-between mb-[2px]">
                                <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E5E7EB]">Planejar rápido</span>
                                <button
                                    onClick={fecharPlanoRapido}
                                    className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-[14px] cursor-pointer transition">
                                    ✕
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-[#6B7280] mb-4">
                                {t.aula.horario} · {t.escNome} · {t.turNome}
                            </p>

                            {/* Campo: Objetivo (opcional) */}
                            <label className="text-[11px] font-medium text-slate-500 dark:text-[#9CA3AF] mb-1 block">
                                Objetivo <span className="font-normal text-slate-400 dark:text-[#6B7280]">(opcional)</span>
                            </label>
                            <textarea
                                value={objetivoRapido}
                                onChange={e => setObjetivoRapido(e.target.value)}
                                rows={2}
                                placeholder="Ex: Desenvolver coordenação rítmica com palmas"
                                className="w-full rounded-lg border border-[#E6EAF0] dark:border-[#374151] v2-bg text-[12px] text-slate-700 dark:text-[#E5E7EB] placeholder-slate-300 dark:placeholder-[#4B5563] px-3 py-2 mb-3 resize-none focus:outline-none focus:border-[#5B5FEA]/50 transition"
                            />

                            {/* Campo: Roteiro (obrigatório) */}
                            <label className="text-[11px] font-medium text-slate-500 dark:text-[#9CA3AF] mb-1 block">
                                Roteiro de atividades
                            </label>
                            <textarea
                                ref={roteiroRef}
                                value={roteiroRapido}
                                onChange={e => setRoteiroRapido(e.target.value)}
                                rows={4}
                                placeholder={"Ex:\n- Aquecimento rítmico (5 min)\n- Treino da música X (15 min)\n- Leitura à primeira vista (10 min)"}
                                className="w-full rounded-lg border border-[#E6EAF0] dark:border-[#374151] v2-bg text-[12px] text-slate-700 dark:text-[#E5E7EB] placeholder-slate-300 dark:placeholder-[#4B5563] px-3 py-2 mb-4 resize-none focus:outline-none focus:border-[#5B5FEA]/50 transition"
                            />

                            {/* Botão salvar */}
                            <button
                                disabled={!roteiroRapido.trim()}
                                onClick={handleSalvarPlanoRapido}
                                className="w-full py-[11px] rounded-xl bg-[#5B5FEA] text-white text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition hover:bg-[#4B4FD9] cursor-pointer">
                                Salvar plano
                            </button>
                        </div>
                    </>
                )
            })()}

        </div>
    )
}
