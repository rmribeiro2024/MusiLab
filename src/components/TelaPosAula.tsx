import React, { useState, useEffect, useRef, Suspense } from 'react'
import { usePlanosContext } from '../contexts/PlanosContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAplicacoesContext } from '../contexts/AplicacoesContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import ModalRegistroPosAula from './modals/ModalRegistroPosAula'
import { showToast } from '../lib/toast'

export default function TelaPosAula({ onSaved }: { onSaved?: () => void } = {}) {
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
    const { aplicacoesPorData, criarAplicacoes } = useAplicacoesContext()
    const { planejamentos, salvarPlanejamentoParaTurma } = usePlanejamentoTurmaContext()

    // ── Estado do picker "Importar do banco" ──────────────────────────────────
    const [bancoPickerIdx, setBancoPickerIdx] = useState<number | null>(null)
    const [bancoBusca, setBancoBusca] = useState('')

    const fecharBancoPicker = () => { setBancoPickerIdx(null); setBancoBusca('') }

    const planosFiltradosBanco = bancoBusca.trim().length >= 1
        ? planos.filter(p => p.titulo?.toLowerCase().includes(bancoBusca.toLowerCase()))
        : planos.slice(0, 20)

    function vincularPlanoATurma(planoId: string | number, idx: number) {
        const t = turmasEnriq[idx]
        if (!t) return
        criarAplicacoes(planoId, [{
            anoLetivoId: t.aula.anoLetivoId,
            escolaId: t.aula.escolaId,
            segmentoId: t.aula.segmentoId,
            turmaId: t.aula.turmaId,
            data: dataSel,
            horario: t.aula.horario,
        }])
        fecharBancoPicker()
    }

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

    // ── Panel/sheet (substitui o inline form) ─────────────────────────────────
    const [painelAberto, setPainelAberto] = useState(false)
    const [painelVisible, setPainelVisible] = useState(false)

    useEffect(() => {
        if (painelAberto) requestAnimationFrame(() => setPainelVisible(true))
        else setPainelVisible(false)
    }, [painelAberto])

    const fecharPainel = () => {
        setPainelVisible(false)
        setTimeout(() => {
            setPainelAberto(false)
            requestAnimationFrame(() => {
                document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
            })
        }, 280)
    }

    const navDia = (delta: number) => {
        const d = new Date(dataSel + 'T12:00:00')
        d.setDate(d.getDate() + delta)
        setDataSel(toStr(d))
        setListaAberta(true)
    }

    // Tempo atual em minutos
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

    // Abre painel para registrar ou editar
    const abrirTurma = (idx: number) => {
        const t = turmasEnriq[idx]
        if (!t) return

        if (t.registrada) {
            const reg = todosRegistros.find(
                r => r.data === dataSel && String(r.turma) === String(t.aula.turmaId)
            )
            if (reg) {
                // Usa o plano que contém o registro (não apenas t.plano que pode ser stub)
                const planoDoReg = planos.find(p => String(p.id) === String(reg.planoId))
                const planoEfetivo = planoDoReg || (t.plano && typeof t.plano === 'object' ? t.plano as any
                    : { id: `stub-${t.aula.id}`, titulo: '', escola: t.escNome, segmento: t.segNome, turma: t.turNome })
                setPlanoParaRegistro(planoEfetivo)
                editarRegistro(reg)
                setVerRegistros(false)
            } else {
                // registrada=true mas reg não encontrado — mostra histórico para o usuário localizar
                const plano = t.plano && typeof t.plano === 'object' ? t.plano as any
                    : { id: `stub-${t.aula.id}`, titulo: '', escola: t.escNome, segmento: t.segNome, turma: t.turNome }
                setPlanoParaRegistro(plano)
                setRegistroEditando(null)
                setVerRegistros(true)
            }
        } else {
            const plano = t.plano && typeof t.plano === 'object' ? t.plano as any
                : { id: `stub-${t.aula.id}`, titulo: '', escola: t.escNome, segmento: t.segNome, turma: t.turNome }
            setPlanoParaRegistro(plano)
            setNovoRegistro({ dataAula: dataSel, resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', anotacoesGerais: '', urlEvidencia: '', statusAula: undefined } as any)
            setRegistroEditando(null)
            setVerRegistros(false)
        }
        setRegAnoSel(String(t.aula.anoLetivoId ?? ''))
        setRegEscolaSel(String(t.aula.escolaId ?? ''))
        setRegSegmentoSel(String(t.aula.segmentoId ?? ''))
        setRegTurmaSel(String(t.aula.turmaId ?? ''))
        setPainelAberto(true)
    }

    // ── Planejamento rápido ────────────────────────────────────────────────────
    const getPlanoRapidoDaTurma = (t: typeof turmasEnriq[0]) =>
        planejamentos.find(p =>
            p.turmaId    === String(t.aula.turmaId)    &&
            p.escolaId   === String(t.aula.escolaId)   &&
            p.segmentoId === String(t.aula.segmentoId) &&
            p.anoLetivoId=== String(t.aula.anoLetivoId) &&
            p.dataPrevista === dataSel
        )

    const abrirPlanoRapido = (e: React.MouseEvent, idx: number) => {
        e.stopPropagation()
        setRoteiroRapido('')
        setObjetivoRapido('')
        setPlanoRapidoIdx(idx)
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

    return (
        <div className="max-w-2xl mx-auto pb-24">

            {/* ── CARD ÚNICO ── */}
            <div className="v2-card rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] overflow-hidden border border-[#E6EAF0] dark:border-[#374151]">

                {/* ══ CABEÇALHO ══ */}
                <div className="sticky top-0 z-10 v2-card border-b border-[#E6EAF0] dark:border-[#374151]">
                    <div className="px-4 py-3 flex items-center gap-2 select-none">

                        {/* Toggle lista */}
                        <button
                            onClick={() => setListaAberta(v => !v)}
                            className="text-[11px] text-slate-400 dark:text-[#6b7280] flex items-center gap-0.5 shrink-0 mr-1 cursor-pointer hover:text-slate-600 dark:hover:text-[#9CA3AF] transition">
                            <span>{listaAberta ? '▲' : '▼'}</span>
                            <span className="ml-0.5">todas</span>
                        </button>

                        {/* Centro: data */}
                        <div className="flex-1 min-w-0 flex items-center gap-[5px] text-[12px] overflow-hidden">
                            <span className="text-slate-500 dark:text-[#9CA3AF]">
                                {labelDataCurta(dataSel)}{ehHoje ? ' · Hoje' : ''}
                            </span>
                        </div>

                        {/* Direita: ‹ › dia */}
                        <div className="flex items-center gap-1 shrink-0">
                            {!ehHoje && (
                                <button onClick={() => { setDataSel(hojeStr) }}
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

                    {/* Sub-linha — status */}
                    {listaAberta && turmasEnriq.length > 0 && (
                        <div className="px-4 pb-2 text-[11.5px] text-slate-400 dark:text-[#9CA3AF]">
                            {pendentes > 0
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
                                    className="px-4 py-3 flex items-center gap-3 transition cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30"
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
                                        {!t.plano && !t.registrada && !getPlanoRapidoDaTurma(t) && (
                                            <div className="mt-[3px] flex items-center gap-[6px] flex-wrap">
                                                <span className="text-[11px] text-amber-500 dark:text-amber-400">Sem plano vinculado</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setBancoPickerIdx(i); setBancoBusca('') }}
                                                    className="text-[11px] text-[#5B5FEA] font-medium hover:underline shrink-0 cursor-pointer">
                                                    Importar do banco →
                                                </button>
                                                <button
                                                    onClick={e => abrirPlanoRapido(e, i)}
                                                    className="text-[11px] text-slate-400 dark:text-[#6b7280] font-medium hover:underline shrink-0 cursor-pointer">
                                                    Planejar rápido
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botão direito — Registrar ou status */}
                                    {t.registrada ? (
                                        <span className="text-[10px] text-emerald-500 dark:text-emerald-400 shrink-0 font-medium">✓ registrada</span>
                                    ) : (
                                        <span className="text-[11px] shrink-0 px-[8px] py-[3px] rounded-[6px] bg-[#5B5FEA]/10 text-[#5B5FEA] dark:bg-[#5B5FEA]/15 dark:text-[#818cf8] font-semibold">
                                            Registrar
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* ══ PANEL / SHEET — Registro Pós-Aula ══ */}
            {painelAberto && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={fecharPainel}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 48,
                            opacity: painelVisible ? 1 : 0, transition: 'opacity 280ms ease',
                        }}
                    />
                    {/* Painel: mobile = bottom sheet / desktop = modal centralizado */}
                    <div style={typeof window !== 'undefined' && window.innerWidth >= 768 ? {
                        position: 'fixed',
                        top: '50%', left: '50%',
                        width: Math.min(window.innerWidth - 48, 540),
                        height: Math.min(window.innerHeight - 48, 860),
                        zIndex: 49, display: 'flex', flexDirection: 'column',
                        borderRadius: 16, overflow: 'hidden',
                        transform: painelVisible
                            ? 'translate(-50%, -50%) scale(1)'
                            : 'translate(-50%, -50%) scale(0.96)',
                        opacity: painelVisible ? 1 : 0,
                        transition: 'transform 260ms cubic-bezier(.4,0,.2,1), opacity 260ms ease',
                        boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
                    } : {
                        position: 'fixed', left: 0, right: 0, bottom: 0,
                        height: '93dvh',
                        zIndex: 49, display: 'flex', flexDirection: 'column',
                        borderRadius: '16px 16px 0 0', overflow: 'hidden',
                        transform: painelVisible ? 'translateY(0)' : 'translateY(100%)',
                        transition: 'transform 300ms cubic-bezier(.4,0,.2,1)',
                        boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
                    }}>
                        <Suspense fallback={
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: document.documentElement.classList.contains('dark') ? '#1F2937' : '#fff',
                                color: '#94a3b8', fontSize: 13 }}>
                                Carregando...
                            </div>
                        }>
                            <ModalRegistroPosAula
                                inlineMode={true}
                                onVoltar={fecharPainel}
                                onSaved={onSaved}
                            />
                        </Suspense>
                    </div>
                </>
            )}

            {/* ══ BOTTOM SHEET: IMPORTAR DO BANCO ══ */}
            {bancoPickerIdx !== null && (() => {
                const t = turmasEnriq[bancoPickerIdx]
                if (!t) return null
                return (
                    <>
                        <div className="fixed inset-0 z-40 bg-black/40" onClick={fecharBancoPicker} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 max-w-2xl mx-auto v2-card rounded-t-2xl border-t border-[#E6EAF0] dark:border-[#374151] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] px-4 pt-4 pb-8 flex flex-col" style={{ maxHeight: '80dvh' }}>
                            <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4 shrink-0" />
                            <div className="flex items-center justify-between mb-3 shrink-0">
                                <div>
                                    <span className="text-[13px] font-semibold text-slate-700 dark:text-[#E5E7EB]">Importar plano do banco</span>
                                    <p className="text-[11px] text-slate-400 dark:text-[#6b7280] mt-0.5">{t.segNome} · {t.turNome} — {t.escNome}</p>
                                </div>
                                <button onClick={fecharBancoPicker} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-[14px] cursor-pointer transition">×</button>
                            </div>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar plano..."
                                value={bancoBusca}
                                onChange={e => setBancoBusca(e.target.value)}
                                className="shrink-0 w-full px-3 py-2 text-sm border border-slate-200 dark:border-[#374151] rounded-xl bg-transparent text-slate-700 dark:text-[#E5E7EB] placeholder-slate-400 outline-none focus:border-[#5B5FEA] mb-3"
                            />
                            <div className="overflow-y-auto flex-1 flex flex-col gap-1.5">
                                {planosFiltradosBanco.length === 0 && (
                                    <p className="text-[13px] text-slate-400 dark:text-[#6b7280] text-center py-6">Nenhum plano encontrado</p>
                                )}
                                {planosFiltradosBanco.map(p => (
                                    <button
                                        key={String(p.id)}
                                        type="button"
                                        onClick={() => vincularPlanoATurma(p.id, bancoPickerIdx)}
                                        className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-[#374151] hover:border-[#5B5FEA]/40 hover:bg-indigo-50/40 dark:hover:bg-[#5B5FEA]/10 transition-colors">
                                        <div className="text-[13px] font-medium text-slate-700 dark:text-[#E5E7EB] truncate">{p.titulo}</div>
                                        {(p.escola || p.faixaEtaria?.length) && (
                                            <div className="text-[11px] text-slate-400 dark:text-[#6b7280] mt-0.5 truncate">
                                                {[p.escola, (p.faixaEtaria || []).join(', ')].filter(Boolean).join(' · ')}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )
            })()}

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
