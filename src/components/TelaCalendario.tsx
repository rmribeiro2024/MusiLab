import React, { useState, useMemo, useRef } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { usePlanosContext, useAnoLetivoContext, useRepertorioContext, useAplicacoesContext, useEventosContext } from '../contexts'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { verificarFeriado } from '../lib/feriados'
import { stripHTML } from '../lib/utils'
import type { AnoLetivo, AulaGrade, AplicacaoAula, Plano } from '../types'

// ─── Helpers compartilhados ────────────────────────────────────────────────────

function toStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getNomeTurma(
    anoLetivoId: string | undefined,
    escolaId: string | undefined,
    segmentoId: string,
    turmaId: string,
    anosLetivos: AnoLetivo[]
): string {
    if (!anoLetivoId || !escolaId) return turmaId
    // eslint-disable-next-line eqeqeq
    const ano = anosLetivos.find(a => a.id == anoLetivoId)
    // eslint-disable-next-line eqeqeq
    const esc = ano?.escolas.find(e => e.id == escolaId)
    // eslint-disable-next-line eqeqeq
    const seg = esc?.segmentos.find(s => s.id == segmentoId)
    // eslint-disable-next-line eqeqeq
    const tur = seg?.turmas.find(t => t.id == turmaId)
    return [esc?.nome, seg?.nome, tur?.nome].filter(Boolean).join(' › ') || turmaId
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AplicacaoAula['status'] }) {
    const cfg = {
        planejada:  { cls: 'bg-blue-100 text-blue-700',    label: '📅 Planejada' },
        realizada:  { cls: 'bg-emerald-100 text-emerald-700', label: '✅ Realizada' },
        cancelada:  { cls: 'bg-red-100 text-red-600',      label: '✕ Cancelada' },
    }
    const c = cfg[status] || cfg.planejada
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.cls}`}>{c.label}</span>
}

// ─── BLOCO APLICAÇÃO ──────────────────────────────────────────────────────────

interface BlocoProps {
    aplicacao: AplicacaoAula
    planoTitulo?: string
    nomeTurma: string
    onClick: () => void
}

function BlocoAplicacao({ aplicacao, planoTitulo, nomeTurma, onClick }: BlocoProps) {
    const borderCls = aplicacao.status === 'realizada'
        ? 'border-l-emerald-400'
        : aplicacao.status === 'cancelada'
        ? 'border-l-red-300'
        : 'border-l-indigo-400'

    return (
        <div
            onClick={onClick}
            className={`border-l-4 ${borderCls} bg-white rounded-r-lg p-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow mb-1`}
        >
            <p className="text-xs font-semibold text-slate-700 leading-tight truncate">{nomeTurma}</p>
            {planoTitulo && (
                <p className="text-[10px] text-slate-400 leading-tight truncate mt-0.5">{planoTitulo}</p>
            )}
            <div className="mt-1">
                <StatusBadge status={aplicacao.status} />
                {aplicacao.adaptacaoTexto && (
                    <span className="ml-1 text-[10px] text-amber-600 font-semibold">⚠ adapt.</span>
                )}
            </div>
        </div>
    )
}

// ─── SLOT VAZIO ───────────────────────────────────────────────────────────────

function SlotVazio({ nomeTurma }: { nomeTurma: string }) {
    return (
        <div className="border border-dashed border-[#E6EAF0] dark:border-[#374151] rounded-lg p-2 text-[10px] text-slate-300 dark:text-slate-500 truncate mb-1">
            {nomeTurma}
        </div>
    )
}

// ─── PAINEL DETALHES APLICAÇÃO (Fase 4) ───────────────────────────────────────

interface PainelProps {
    aplicacaoId: string
    onClose: () => void
}

function PainelDetalhesAplicacao({ aplicacaoId, onClose }: PainelProps) {
    const { aplicacoes, salvarAdaptacao, atualizarStatusAplicacao } = useAplicacoesContext()
    const { planos } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()

    const ap = aplicacoes.find(a => a.id === aplicacaoId)
    const plano: Plano | undefined = ap ? planos.find(p => String(p.id) === String(ap.planoId)) : undefined

    const [adaptacao, setAdaptacao] = useState(ap?.adaptacaoTexto || '')
    const [status, setStatus] = useState<AplicacaoAula['status']>(ap?.status || 'planejada')
    const [verRoteiro, setVerRoteiro] = useState(false)

    if (!ap || !plano) return null

    const nomeTurma = getNomeTurma(ap.anoLetivoId, ap.escolaId, ap.segmentoId, ap.turmaId, anosLetivos)
    const dataFormatada = ap.data.split('-').reverse().join('/')

    function salvar() {
        salvarAdaptacao(ap!.id, adaptacao)
        if (status !== ap!.status) atualizarStatusAplicacao(ap!.id, status)
        onClose()
    }

    const statusOpts: Array<{ v: AplicacaoAula['status']; label: string }> = [
        { v: 'planejada',  label: '📅 Planejada' },
        { v: 'realizada',  label: '✅ Realizada' },
        { v: 'cancelada',  label: '✕ Cancelada' },
    ]

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
            onClick={onClose}
        >
            <div
                className="v2-card w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
                    <div>
                        <p className="text-xs text-slate-400 mb-0.5">{dataFormatada}{ap.horario ? ` · ${ap.horario}` : ''}</p>
                        <h3 className="font-bold text-slate-800 text-base leading-tight">{nomeTurma}</h3>
                        <p className="text-xs text-indigo-600 mt-0.5 truncate max-w-[280px]">{plano.titulo}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition shrink-0 ml-2"
                    >
                        ✕
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
                    {/* Status */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                            Status da aula
                        </label>
                        <div className="flex gap-2">
                            {statusOpts.map(opt => (
                                <button
                                    key={opt.v}
                                    onClick={() => setStatus(opt.v)}
                                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition
                                        ${status === opt.v
                                            ? 'border-[#5B5FEA] bg-indigo-50 text-indigo-700'
                                            : 'border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:border-slate-300 dark:hover:border-slate-500'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Plano base (readonly) */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                            Plano base <span className="font-normal text-slate-400">(somente leitura)</span>
                        </label>
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="px-4 py-3 bg-slate-50">
                                <p className="text-xs font-bold text-slate-700 mb-1">Objetivo geral</p>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {plano.objetivoGeral ? stripHTML(plano.objetivoGeral) : <span className="italic text-slate-400">Não definido</span>}
                                </p>
                            </div>
                            {(plano.atividadesRoteiro || []).length > 0 && (
                                <div className="border-t border-slate-100">
                                    <button
                                        onClick={() => setVerRoteiro(v => !v)}
                                        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                                    >
                                        <span>📋 Roteiro ({plano.atividadesRoteiro.length} atividades)</span>
                                        <span className={`transition-transform ${verRoteiro ? 'rotate-180' : ''}`}>▾</span>
                                    </button>
                                    {verRoteiro && (
                                        <div className="px-4 pb-3 space-y-1.5">
                                            {plano.atividadesRoteiro.map((a, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs">
                                                    <span className="text-slate-300 shrink-0 font-mono">{i + 1}.</span>
                                                    <div>
                                                        <span className="font-medium text-slate-700">{a.nome}</span>
                                                        {a.duracao && <span className="text-slate-400 ml-1">({a.duracao}min)</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Adaptação desta turma */}
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                            Adaptação para esta turma
                        </label>
                        <textarea
                            value={adaptacao}
                            onChange={e => setAdaptacao(e.target.value)}
                            rows={4}
                            placeholder="Ex: Pular a atividade 2, focar mais no ritmo, reduzir duração da parte 3..."
                            className="w-full px-3 py-2 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm text-slate-700 dark:text-[#E5E7EB] resize-none focus:border-[#5B5FEA] dark:focus:border-[#818cf8] outline-none bg-white dark:bg-[#111827]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-white/5 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={salvar}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── RESUMO DO DIA (Fase 5) ───────────────────────────────────────────────────

interface ResumoDoDiaProps {
    data: string // YYYY-MM-DD
}

function ResumoDoDia({ data }: ResumoDoDiaProps) {
    const { aplicacoesPorData } = useAplicacoesContext()
    const { planos } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()

    const [aberto, setAberto] = useState(true)

    const aplicacoesDoDia = aplicacoesPorData[data] || []
    const hoje = toStr(new Date())

    // Agrupar aplicações por plano
    const porPlano = useMemo(() => {
        const mapa: Record<string, { plano: Plano | undefined; aplicacoes: AplicacaoAula[] }> = {}
        aplicacoesDoDia.forEach(ap => {
            const key = String(ap.planoId)
            if (!mapa[key]) {
                mapa[key] = { plano: planos.find(p => String(p.id) === key), aplicacoes: [] }
            }
            mapa[key].aplicacoes.push(ap)
        })
        return Object.values(mapa)
    }, [aplicacoesDoDia, planos])

    // Materiais únicos do dia
    const materiaisDoDia = useMemo(() => {
        const set = new Set<string>()
        porPlano.forEach(({ plano }) => {
            plano?.materiais?.forEach(m => m && set.add(m))
        })
        return [...set]
    }, [porPlano])

    // Fechar por padrão se não há aplicações e não é hoje
    const temAulas = aplicacoesDoDia.length > 0
    const ehHoje = data === hoje

    if (!temAulas && !ehHoje) return null
    if (!temAulas) return null

    const dataFormatada = data.split('-').reverse().join('/')

    return (
        <div className="bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 border border-[#5B5FEA]/20 dark:border-[#5B5FEA]/30 rounded-2xl overflow-hidden mb-3">
            {/* Cabeçalho */}
            <button
                onClick={() => setAberto(v => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-800 text-sm">
                        📋 Resumo do dia — {dataFormatada}
                    </span>
                    <span className="text-xs text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                        {aplicacoesDoDia.length} aula{aplicacoesDoDia.length > 1 ? 's' : ''}
                    </span>
                </div>
                <span
                    className="text-indigo-400 text-xs"
                    style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform .2s' }}
                >
                    ▼
                </span>
            </button>

            {aberto && (
                <div className="px-4 pb-4 space-y-3">
                    {/* Planos do dia */}
                    <div className="space-y-2">
                        {porPlano.map(({ plano, aplicacoes: aps }, i) => (
                            <div key={i} className="v2-card rounded-xl border border-[#5B5FEA]/15 dark:border-[#5B5FEA]/25 p-3">
                                <p className="text-xs font-bold text-slate-700 mb-1">
                                    {plano?.titulo || '(plano removido)'}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {aps.map(ap => (
                                        <div key={ap.id} className="flex items-center gap-1">
                                            <span className="text-xs text-slate-600">
                                                {getNomeTurma(ap.anoLetivoId, ap.escolaId, ap.segmentoId, ap.turmaId, anosLetivos)}
                                            </span>
                                            <StatusBadge status={ap.status} />
                                            {ap.adaptacaoTexto && (
                                                <span className="text-[10px] text-amber-600 font-semibold">⚠ adapt.</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Materiais */}
                    {materiaisDoDia.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1.5">
                                🎒 Materiais do dia
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {materiaisDoDia.map(m => (
                                    <span key={m} className="text-xs v2-card border border-[#5B5FEA]/25 dark:border-[#5B5FEA]/35 text-[#5B5FEA] dark:text-[#818cf8] px-2 py-0.5 rounded-full">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── CALENDÁRIO SEMANAL (Fase 3) ──────────────────────────────────────────────

interface CalendarioSemanalProps {
    semana: Date // segunda-feira da semana
    onBlocoClick: (aplicacaoId: string) => void
}

function CalendarioSemanal({ semana, onBlocoClick }: CalendarioSemanalProps) {
    const { gradesSemanas } = useCalendarioContext()
    const { aplicacoesPorData } = useAplicacoesContext()
    const { planos } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()

    const DIAS_PT = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
    const DIAS_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

    // Datas de Seg–Sex da semana atual
    const datasSemanais = useMemo<Date[]>(() =>
        Array.from({ length: 5 }, (_, i) => {
            const d = new Date(semana)
            d.setDate(semana.getDate() + i)
            return d
        }), [semana])

    const hojeStr = toStr(new Date())

    // Coletar horários únicos das grades ativas nesta semana
    const horarios = useMemo<string[]>(() => {
        const inicio = toStr(datasSemanais[0])
        const fim = toStr(datasSemanais[4])
        const set = new Set<string>()
        gradesSemanas.forEach(grade => {
            if (grade.dataFim < inicio || grade.dataInicio > fim) return
            grade.aulas.forEach(aula => {
                if (aula.horario) set.add(aula.horario)
            })
        })
        return [...set].sort()
    }, [gradesSemanas, datasSemanais])

    // Buscar AulaGrade que corresponde a (data, horario, diaSemana)
    function getAulasSlot(dataStr: string, horario: string, diaSemana: string): Array<AulaGrade & { anoLetivoId: string; escolaId: string }> {
        const result: Array<AulaGrade & { anoLetivoId: string; escolaId: string }> = []
        gradesSemanas.forEach(grade => {
            if (dataStr < grade.dataInicio || dataStr > grade.dataFim) return
            grade.aulas.forEach(aula => {
                if (aula.diaSemana === diaSemana && aula.horario === horario && aula.turmaId) {
                    result.push({ ...aula, anoLetivoId: grade.anoLetivoId, escolaId: grade.escolaId })
                }
            })
        })
        return result
    }

    if (horarios.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 text-sm mb-1">Nenhuma grade configurada para esta semana.</p>
                <p className="text-xs text-slate-300">Configure em Configurações → Grade Semanal.</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[480px] border-collapse">
                <thead>
                    <tr>
                        <th className="w-14 p-2 text-xs text-slate-300 font-medium border-b border-slate-100" />
                        {datasSemanais.map((d, i) => {
                            const ds = toStr(d)
                            const ehHoje = ds === hojeStr
                            return (
                                <th
                                    key={i}
                                    className={`p-2 text-center border-b border-slate-100 ${ehHoje ? 'bg-indigo-50' : ''}`}
                                >
                                    <p className={`text-xs font-semibold ${ehHoje ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {DIAS_LABEL[i]}
                                    </p>
                                    <p className={`text-base font-bold ${ehHoje ? 'text-indigo-700' : 'text-slate-800'}`}>
                                        {d.getDate()}
                                    </p>
                                </th>
                            )
                        })}
                    </tr>
                </thead>
                <tbody>
                    {horarios.map(horario => (
                        <tr key={horario}>
                            <td className="p-2 text-[10px] text-slate-400 font-mono border-b border-slate-50 text-center align-top whitespace-nowrap">
                                {horario}
                            </td>
                            {datasSemanais.map((d, i) => {
                                const dataStr = toStr(d)
                                const diaSemana = DIAS_PT[i]
                                const aulasSlot = getAulasSlot(dataStr, horario, diaSemana)
                                const apsDoDia = aplicacoesPorData[dataStr] || []
                                const ehHoje = dataStr === hojeStr

                                return (
                                    <td
                                        key={i}
                                        className={`p-1 border-b border-slate-50 align-top min-w-[100px] ${ehHoje ? 'bg-indigo-50/30' : ''}`}
                                    >
                                        {aulasSlot.length === 0 ? (
                                            <div className="min-h-[40px]" />
                                        ) : aulasSlot.map((aula, ai) => {
                                            const ap = apsDoDia.find(
                                                a => a.turmaId === aula.turmaId && a.anoLetivoId === aula.anoLetivoId
                                            )
                                            const nomeTurma = getNomeTurma(
                                                aula.anoLetivoId,
                                                aula.escolaId,
                                                aula.segmentoId,
                                                aula.turmaId,
                                                anosLetivos
                                            )
                                            if (ap) {
                                                const planoDoBloco = planos.find(p => String(p.id) === String(ap.planoId))
                                                return (
                                                    <BlocoAplicacao
                                                        key={ai}
                                                        aplicacao={ap}
                                                        planoTitulo={planoDoBloco?.titulo}
                                                        nomeTurma={nomeTurma}
                                                        onClick={() => onBlocoClick(ap.id)}
                                                    />
                                                )
                                            }
                                            return <SlotVazio key={ai} nomeTurma={nomeTurma} />
                                        })}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// Helper: segunda-feira da semana que contém `d`
function getSegundaDaSemana(d: Date): Date {
    const dia = d.getDay()
    const diff = dia === 0 ? -6 : 1 - dia
    const seg = new Date(d)
    seg.setDate(d.getDate() + diff)
    seg.setHours(0, 0, 0, 0)
    return seg
}

export function TelaCalendario() {
    const { planos, setPlanoSelecionado } = usePlanosContext()
    const { anosLetivos, setEventoEditando, setModalEventos } = useAnoLetivoContext()
    const {
        dataCalendario, setDataCalendario,
        ocultarFeriados, setOcultarFeriados,
        verificarEvento,
        setModalRegistro,
        setRrData, setRrAnoSel, setRrEscolaSel, setRrPlanosSegmento, setRrTextos,
        setRrResultados, setRrRubricas, setRrEncaminhamentos,
        setRrTurmaId, setRrSegmentoId,
        obterTurmasDoDia,
    } = useCalendarioContext()

    // ── Tab: Mês | Semana ──
    const [tabCal, setTabCal] = useState<'mes' | 'semana'>('mes')
    const [semanaGrid, setSemanaGrid] = useState<Date>(() => getSegundaDaSemana(new Date()))
    const [painelAplicacaoId, setPainelAplicacaoId] = useState<string | null>(null)

    // ── Rótulo da semana na view grade ──
    const mesesAbr = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    const sexta = new Date(semanaGrid); sexta.setDate(semanaGrid.getDate() + 4)
    const labelSemanaGrid = semanaGrid.getMonth() === sexta.getMonth()
        ? `${semanaGrid.getDate()}–${sexta.getDate()} ${mesesAbr[sexta.getMonth()]} ${sexta.getFullYear()}`
        : `${semanaGrid.getDate()} ${mesesAbr[semanaGrid.getMonth()]} – ${sexta.getDate()} ${mesesAbr[sexta.getMonth()]} ${sexta.getFullYear()}`

    const ehSemanaAtual = semanaGrid.getTime() === getSegundaDaSemana(new Date()).getTime()
    const hojeGridStr = toStr(new Date())

    // ── Construir grade mensal ──
    const ano = dataCalendario.getFullYear(); const mes = dataCalendario.getMonth();
    const diasNoMes = new Date(ano, mes+1, 0).getDate(); const inicio = new Date(ano, mes, 1).getDay();
    const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const dias = [];
    for(let i=0;i<inicio;i++) dias.push(<div key={`e-${i}`} className="bg-gray-100 min-h-[52px] sm:min-h-[80px]"></div>);
    for(let d=1;d<=diasNoMes;d++){
        const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const aulas = planos.filter(p=>p.historicoDatas?.includes(dataStr));
        const feriado = !ocultarFeriados ? verificarFeriado(dataStr) : null;
        const evento = verificarEvento(dataStr);

        let bgColor = 'bg-white';
        let borderColor = aulas.length ? 'border-indigo-300' : 'border-gray-200';

        if (feriado) {
            bgColor = 'bg-red-50';
            borderColor = 'border-red-300';
        } else if (evento) {
            bgColor = 'bg-orange-50';
            borderColor = 'border-orange-300';
        }

        const registrosNoDia = planos.reduce((acc: {planoTitulo:string}[],p)=>{
            (p.registrosPosAula||[]).forEach(r=>{ if(r.data===dataStr) acc.push({...r, planoTitulo:p.titulo}); });
            return acc;
        },[]);
        const temRegistro = registrosNoDia.length > 0;

        dias.push(
            <div key={d} className={`${bgColor} border ${borderColor} p-1 min-h-[52px] sm:min-h-[80px] transition group relative`}>
                <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    <button
                        onClick={()=>{
                            setRrData(dataStr);
                            const turmasDoDia = obterTurmasDoDia(dataStr);
                            if (turmasDoDia.length > 0) {
                                const primeira = turmasDoDia[0];
                                setRrAnoSel(primeira.anoLetivoId);
                                setRrEscolaSel(primeira.escolaId);
                            } else {
                                const anoAtivo = anosLetivos.find(a=>a.status==='ativo');
                                setRrAnoSel(anoAtivo?.id||'');
                                setRrEscolaSel('');
                            }
                            setRrTextos({}); setRrPlanosSegmento({}); setRrResultados({}); setRrRubricas({}); setRrEncaminhamentos({}); setRrTurmaId(''); setRrSegmentoId('');
                            setModalRegistro(true);
                        }}
                        className="hidden sm:block opacity-0 group-hover:opacity-100 bg-amber-400 hover:bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition"
                        title="Registro rápido">📝+</button>
                </div>
                {feriado && <div className="text-[10px] bg-red-200 text-red-800 p-1 mb-1 rounded font-bold">🎊 {feriado}</div>}
                {evento && <div className="text-[10px] bg-orange-200 text-orange-800 p-1 mb-1 rounded font-bold cursor-pointer" onClick={()=>setEventoEditando(evento)}>🎉 {evento.nome}</div>}
                {aulas.map(p=><div key={p.id} onClick={()=>setPlanoSelecionado(p)} className="text-[10px] bg-indigo-100 text-indigo-800 p-1 mb-1 rounded cursor-pointer truncate">{p.titulo}</div>)}
                {temRegistro && <div className="text-[10px] bg-emerald-100 text-emerald-800 p-1 rounded font-bold">✅ {registrosNoDia.length} reg.</div>}
            </div>
        );
    }

    return (
        <div className="v2-card rounded-2xl shadow-xl p-3 sm:p-6">
            {/* Tabs Mês / Semana */}
            <div className="flex items-center justify-between mb-3 sm:mb-5 gap-3 flex-wrap">
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                    <button
                        onClick={() => setTabCal('mes')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition
                            ${tabCal === 'mes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Mês
                    </button>
                    <button
                        onClick={() => setTabCal('semana')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition
                            ${tabCal === 'semana' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Semana
                    </button>
                </div>

                {/* Controles do Mês */}
                {tabCal === 'mes' && (
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                        <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-[#E5E7EB] self-center mr-1">{nomes[mes]} {ano}</h2>
                        <button onClick={()=>setDataCalendario(new Date(ano,mes-1,1))} className="px-3 py-1 bg-gray-200 rounded text-sm">◀</button>
                        <button onClick={()=>setDataCalendario(new Date())} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm">Hoje</button>
                        <button onClick={()=>setDataCalendario(new Date(ano,mes+1,1))} className="px-3 py-1 bg-gray-200 rounded text-sm">▶</button>
                        <button onClick={()=>setModalEventos(true)} className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded font-bold text-sm">🎉<span className="hidden sm:inline"> Eventos</span></button>
                        <label className="px-2 sm:px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm">
                            <input type="checkbox" checked={ocultarFeriados} onChange={e=>setOcultarFeriados(e.target.checked)} className="w-4 h-4" />
                            <span className="hidden sm:inline">Ocultar </span><span>Feriados</span>
                        </label>
                    </div>
                )}

                {/* Controles da Semana */}
                {tabCal === 'semana' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { const s = new Date(semanaGrid); s.setDate(s.getDate() - 7); setSemanaGrid(s) }}
                            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold"
                        >◀</button>
                        <div className="text-center">
                            <p className="font-bold text-slate-700 text-sm">{labelSemanaGrid}</p>
                        </div>
                        <button
                            onClick={() => { const s = new Date(semanaGrid); s.setDate(s.getDate() + 7); setSemanaGrid(s) }}
                            className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold"
                        >▶</button>
                        {!ehSemanaAtual && (
                            <button
                                onClick={() => setSemanaGrid(getSegundaDaSemana(new Date()))}
                                className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold"
                            >Hoje</button>
                        )}
                    </div>
                )}
            </div>

            {/* ── TAB MÊS ── */}
            {tabCal === 'mes' && (
                <>
                    <div className="grid grid-cols-7 gap-px sm:gap-1 text-center font-bold text-gray-500 text-[10px] sm:text-xs mb-2">
                        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((nome,i)=>(
                            <div key={i}><span className="hidden sm:inline">{nome}</span><span className="sm:hidden">{nome[0]}</span></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px sm:gap-1 bg-gray-200 border border-gray-200 rounded overflow-hidden">{dias}</div>
                </>
            )}

            {/* ── TAB SEMANA ── */}
            {tabCal === 'semana' && (
                <>
                    {/* Resumo do dia — Fase 5 */}
                    <ResumoDoDia data={hojeGridStr} />

                    {/* Grade semanal — Fase 3 */}
                    <CalendarioSemanal
                        semana={semanaGrid}
                        onBlocoClick={id => setPainelAplicacaoId(id)}
                    />

                    {/* Painel detalhes — Fase 4 */}
                    {painelAplicacaoId && (
                        <PainelDetalhesAplicacao
                            aplicacaoId={painelAplicacaoId}
                            onClose={() => setPainelAplicacaoId(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
}

export default function TelaResumoDia() {
    const { planos, sugerirPlanoParaTurma, setPlanoSelecionado } = usePlanosContext()
    const { anosLetivos } = useAnoLetivoContext()
    const { setViewMode } = useRepertorioContext()
    const { setModalGradeSemanal, dataDia, diasExpandidos, modoResumo, semanaResumo, obterTurmasDoDia, setDataDia, setDiasExpandidos, setModalRegistro, setModoResumo, setRrAnoSel, setRrData, setRrEscolaSel, setRrPlanosSegmento, setRrTextos, setRrResultados, setRrRubricas, setRrEncaminhamentos, setRrTurmaId, setRrSegmentoId, setSemanaResumo } = useCalendarioContext()
    const { aplicacoesPorData } = useAplicacoesContext()
    const { salvarPlanejamentoParaTurma } = usePlanejamentoTurmaContext()
    const { eventos, adicionarEvento, removerEvento } = useEventosContext()
    const [aulaAcaoAtiva, setAulaAcaoAtiva] = useState<AulaGrade | null>(null)
    const [extraMateriais, setExtraMateriais] = useState<Record<string, string[]>>({})
    const [inputMaterial, setInputMaterial] = useState('')
    const [inputEvento, setInputEvento] = useState('')
    const [planoRapidoAula, setPlanoRapidoAula] = useState<{ aula: AulaGrade; segNome: string; turNome: string } | null>(null)
    const [roteiroRapido, setRoteiroRapido] = useState('')
    const [objetivoRapido, setObjetivoRapido] = useState('')
    const roteiroRef = useRef<HTMLTextAreaElement>(null)

    const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

    // Todos os registros de todos os planos
    const todosRegistros = [];
    planos.forEach(plano => {
        (plano.registrosPosAula || []).forEach(reg => {
            todosRegistros.push({ ...reg, planoTitulo: plano.titulo, planoId: plano.id });
        });
    });

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const toStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const hojeStr = toStr(hoje);

    // Helpers de semana
    const diasDaSemana = Array.from({length: 7}, (_, i) => {
        const d = new Date(semanaResumo); d.setDate(semanaResumo.getDate() + i); return d;
    });
    const semanaAtual = (() => {
        const h = new Date(); const dia = h.getDay();
        const diff = dia === 0 ? -6 : 1 - dia;
        const seg = new Date(h); seg.setDate(h.getDate() + diff); seg.setHours(0,0,0,0);
        return seg.getTime() === semanaResumo.getTime();
    })();
    const irParaHoje = () => {
        const h = new Date(); const dia = h.getDay();
        const diff = dia === 0 ? -6 : 1 - dia;
        const seg = new Date(h); seg.setDate(h.getDate() + diff); seg.setHours(0,0,0,0);
        setSemanaResumo(seg);
        setDataDia(hojeStr);
        setDiasExpandidos({ [hojeStr]: true });
    };
    const semanaAnterior = () => { const s = new Date(semanaResumo); s.setDate(s.getDate()-7); setSemanaResumo(s); setDiasExpandidos({}); };
    const proximaSemana = () => { const s = new Date(semanaResumo); s.setDate(s.getDate()+7); setSemanaResumo(s); setDiasExpandidos({}); };

    const inicioSem = diasDaSemana[0]; const fimSem = diasDaSemana[6];
    const labelSemana = `${inicioSem.getDate()} ${meses[inicioSem.getMonth()]} – ${fimSem.getDate()} ${meses[fimSem.getMonth()]} ${fimSem.getFullYear()}`;
    const totalSemana = diasDaSemana.reduce((acc, d) => acc + todosRegistros.filter(r => r.data === toStr(d)).length, 0);

    const toggleDia = (dataStr) => setDiasExpandidos(prev => ({ ...prev, [dataStr]: !prev[dataStr] }));


    return (
        <>
        <div className="max-w-2xl mx-auto space-y-3">

            {/* ── BARRA DE VOLTA ── */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-indigo-50/90 backdrop-blur-sm flex items-center gap-3 border-b border-indigo-100">
                <button
                    onClick={()=>setViewMode('lista')}
                    className="flex items-center gap-1.5 text-indigo-700 font-bold text-sm active:opacity-60">
                    ← Voltar
                </button>
                <span className="text-indigo-300">|</span>
                <span className="text-indigo-800 font-bold text-sm">☀️ Hoje</span>
            </div>

            {/* ── PROGRESS BAR ANUAL ── */}
            {(() => {
                const anoAtivo = anosLetivos.find(a => a.status === 'ativo') ?? anosLetivos[0]
                if (!anoAtivo?.dataInicio || !anoAtivo?.dataFim) return null

                const inicio = new Date(anoAtivo.dataInicio + 'T12:00:00')
                const fim    = new Date(anoAtivo.dataFim    + 'T12:00:00')
                const agora  = new Date()
                const totalDias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86400000))
                const diasPassados = Math.max(0, Math.min(totalDias, Math.round((agora.getTime() - inicio.getTime()) / 86400000)))
                const pct = Math.round((diasPassados / totalDias) * 100)

                // Semana do ano
                const diffMs = agora.getTime() - inicio.getTime()
                const semanaAtual = Math.max(1, Math.min(Math.ceil(diffMs / (7 * 86400000)), 52))
                const totalSemanas = Math.round(totalDias / 7)

                // Aulas registradas por turma
                const aulasPorTurma: Record<string, number> = {}
                planos.forEach(p => {
                    ;(p.registrosPosAula || []).forEach(r => {
                        const turmaId = String(r.turma ?? '')
                        if (!turmaId) return
                        if (!aulasPorTurma[turmaId]) aulasPorTurma[turmaId] = 0
                        aulasPorTurma[turmaId]++
                    })
                })

                // Montar lista de turmas do ano ativo
                const turmasList: { id: string; label: string; aulas: number }[] = []
                for (const esc of anoAtivo.escolas ?? []) {
                    for (const seg of esc.segmentos ?? []) {
                        for (const tur of seg.turmas ?? []) {
                            turmasList.push({ id: String(tur.id), label: tur.nome, aulas: aulasPorTurma[String(tur.id)] ?? 0 })
                        }
                    }
                }

                return (
                    <div className="v2-card rounded-2xl shadow-sm border border-[#E6EAF0] dark:border-[#374151] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-600">
                                📅 {anoAtivo.nome ?? anoAtivo.ano} — Semana {semanaAtual} de {totalSemanas}
                            </span>
                            <span className="text-xs font-bold text-indigo-600">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full bg-indigo-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        {turmasList.length > 0 && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {turmasList.map(t => (
                                    <span key={t.id} className="text-[11px] text-slate-500">
                                        <span className="font-semibold text-slate-700">{t.label}</span>
                                        {' '}<span className={t.aulas === 0 ? 'text-red-400' : 'text-green-600'}>{t.aulas} aula{t.aulas !== 1 ? 's' : ''}</span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* ── BARRA DE CONTROLES ── */}
            <div className="v2-card rounded-2xl shadow-lg p-3 space-y-3">

                {/* Linha 1: Hoje | seletor de data | toggle modo */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={()=>{ irParaHoje(); setModoResumo('dia'); setDataDia(hojeStr); }}
                        className="shrink-0 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl">
                        Hoje
                    </button>
                    <input
                        type="date"
                        value={dataDia}
                        onChange={e => { setDataDia(e.target.value); setModoResumo('dia'); }}
                        className="flex-1 border-2 border-[#E6EAF0] dark:border-[#374151] rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-[#E5E7EB] bg-white dark:bg-[#111827] outline-none focus:border-[#5B5FEA] dark:focus:border-[#818cf8]"
                    />
                    <div className="flex shrink-0 bg-gray-100 rounded-xl p-1 gap-1">
                        <button
                            onClick={()=>setModoResumo('dia')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${modoResumo==='dia' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            Dia
                        </button>
                        <button
                            onClick={()=>setModoResumo('semana')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${modoResumo==='semana' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            Semana
                        </button>
                    </div>
                </div>

                {/* Linha 2 (só no modo semana): navegação ◀ semana ▶ */}
                {modoResumo === 'semana' && (
                    <div className="flex items-center gap-2">
                        <button onClick={semanaAnterior} className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600">◀</button>
                        <div className="flex-1 text-center">
                            <p className="font-bold text-slate-800 dark:text-[#E5E7EB] text-sm">{labelSemana}</p>
                            <p className="text-xs text-gray-400">{totalSemana === 0 ? 'Nenhum registro' : `${totalSemana} registro${totalSemana>1?'s':''}`}</p>
                        </div>
                        <button onClick={proximaSemana} className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600">▶</button>
                    </div>
                )}
                {modoResumo === 'semana' && !semanaAtual && (
                    <button onClick={irParaHoje} className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl">↩ Semana atual</button>
                )}
            </div>

            {/* ── MODO DIA ── */}
            {modoResumo === 'dia' && (() => {
                const dia = new Date(dataDia + 'T12:00:00');
                const regsNoDia = todosRegistros.filter(r => r.data === dataDia);
                const nomeDia = diasSemana[dia.getDay()];
                const ehHoje = dataDia === hojeStr;
                const labelDia = `${nomeDia}, ${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}/${dia.getFullYear()}`;
                return (
                    <div className={`v2-card rounded-2xl shadow-sm overflow-hidden border-l-4 ${ehHoje ? 'border-amber-400' : regsNoDia.length > 0 ? 'border-[#5B5FEA]' : 'border-[#E6EAF0] dark:border-[#374151]'}`}>
                        <div className={`px-4 py-3 flex justify-between items-center ${ehHoje ? 'bg-amber-50' : regsNoDia.length > 0 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-2">
                                {ehHoje && <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Hoje</span>}
                                <span className={`font-bold text-sm ${ehHoje ? 'text-amber-700' : 'text-gray-700'}`}>{labelDia}</span>
                            </div>
                            {regsNoDia.length > 0
                                ? <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{regsNoDia.length} turma{regsNoDia.length>1?'s':''}</span>
                                : <button
                                    onClick={() => setModalGradeSemanal(true)}
                                    title="Configurar grade de horários"
                                    className="text-slate-400 hover:text-indigo-500 transition-colors p-1 rounded-lg hover:bg-indigo-50"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                                    </svg>
                                  </button>
                            }
                        </div>

                        {/* Widget: Turmas do Dia (da Grade Semanal) */}
                        {(() => {
                            const turmasDoDia = obterTurmasDoDia(dataDia);
                            const apsDoDia = aplicacoesPorData[dataDia] || [];

                            if (turmasDoDia.length === 0) {
                                return (
                                    <div className="px-4 py-3 border-t border-gray-100">
                                        <p className="text-xs text-gray-400 italic text-center">
                                            {ehHoje ? 'Nenhuma aula agendada para hoje.' : 'Nenhuma aula agendada para este dia.'}
                                        </p>
                                    </div>
                                );
                            }

                            type AulaEnriq = {
                                aula: AulaGrade
                                escNome: string
                                segNome: string
                                turNome: string
                                aplicacao: AplicacaoAula | undefined
                                plano: Plano | undefined
                                status: 'realizada' | 'planejada' | 'sem-plano'
                            }

                            const aulasSorted = [...turmasDoDia].sort((a, b) => a.horario.localeCompare(b.horario));
                            const turmasEnriq: AulaEnriq[] = aulasSorted.map(aula => {
                                const ano = anosLetivos.find(a => a.id == aula.anoLetivoId);
                                const esc = ano?.escolas.find(e => e.id == aula.escolaId);
                                const seg = esc?.segmentos.find(s => s.id == aula.segmentoId);
                                const tur = seg?.turmas.find(t => t.id == aula.turmaId);
                                const aplicacao = apsDoDia.find(ap => ap.turmaId == aula.turmaId && ap.segmentoId == aula.segmentoId);
                                const plano = aplicacao ? planos.find(p => String(p.id) === String(aplicacao.planoId)) : undefined;
                                const status: 'realizada' | 'planejada' | 'sem-plano' =
                                    aplicacao?.status === 'realizada' ? 'realizada' :
                                    aplicacao ? 'planejada' :
                                    sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId) ? 'planejada' :
                                    'sem-plano';
                                return { aula, escNome: esc?.nome || '', segNome: seg?.nome || '?', turNome: tur?.nome || '?', aplicacao, plano, status };
                            });

                            const totalTurmas = turmasEnriq.length;
                            const totalRegistradas = turmasEnriq.filter(t => t.status === 'realizada').length;
                            const totalPendentes = totalTurmas - totalRegistradas;
                            const totalSemPlano = turmasEnriq.filter(t => t.status === 'sem-plano').length;
                            const minAgora = ehHoje ? (new Date().getHours() * 60 + new Date().getMinutes()) : -1;
                            const proximaAula = turmasEnriq.find(t => {
                                if (t.status === 'realizada') return false;
                                if (ehHoje) {
                                    const m = t.aula.horario?.match(/^(\d{1,2}):(\d{2})/);
                                    if (m) return parseInt(m[1]) * 60 + parseInt(m[2]) > minAgora;
                                }
                                return true;
                            }) ?? null;

                            const materiaisSet = new Set<string>();
                            turmasEnriq.forEach(t => {
                                t.plano?.materiais?.forEach(m => { if (m?.trim()) materiaisSet.add(m.trim().toLowerCase()); });
                            });
                            const materiaisList = Array.from(materiaisSet);

                            const porEscola: Record<string, AulaEnriq[]> = {};
                            turmasEnriq.forEach(t => {
                                const k = t.escNome || 'Escola';
                                if (!porEscola[k]) porEscola[k] = [];
                                porEscola[k].push(t);
                            });

                            const dotCls = (s: 'realizada' | 'planejada' | 'sem-plano') =>
                                s === 'realizada' ? 'bg-emerald-400' : s === 'planejada' ? 'bg-blue-400' : 'bg-gray-300';
                            const statusLbl = (s: 'realizada' | 'planejada' | 'sem-plano') =>
                                s === 'realizada' ? 'text-emerald-600' : s === 'planejada' ? 'text-blue-500' : 'text-gray-400';

                            return (
                                <div className="px-4 py-3 bg-purple-50 border-t border-purple-100 space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-purple-800 uppercase">📅 Minhas Turmas de Hoje</p>
                                        <button onClick={() => setViewMode('visaoSemana')} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold">
                                            Ver semana →
                                        </button>
                                    </div>

                                    {/* Resumo pedagógico */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{totalTurmas} turma{totalTurmas !== 1 ? 's' : ''}</span>
                                        {totalRegistradas > 0 && <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{totalRegistradas} registrada{totalRegistradas !== 1 ? 's' : ''}</span>}
                                        {totalPendentes > 0 && <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{totalPendentes} pendente{totalPendentes !== 1 ? 's' : ''}</span>}
                                        {totalSemPlano > 0 && <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{totalSemPlano} sem plano</span>}
                                    </div>

                                    {/* Próxima aula */}
                                    {proximaAula && ehHoje && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Próxima aula</p>
                                            <p className="font-bold text-amber-800 text-sm">{proximaAula.aula.horario}</p>
                                            <p className="text-xs text-amber-700">{proximaAula.segNome} • {proximaAula.turNome}</p>
                                            {proximaAula.plano
                                                ? <p className="text-xs text-amber-600 mt-0.5">{proximaAula.plano.titulo}</p>
                                                : <p className="text-xs text-gray-400 italic mt-0.5">Sem plano</p>}
                                        </div>
                                    )}

                                    {/* Lista por escola */}
                                    {Object.keys(porEscola).sort((a, b) => {
                                        const ha = porEscola[a][0]?.aula.horario || '';
                                        const hb = porEscola[b][0]?.aula.horario || '';
                                        return ha.localeCompare(hb);
                                    }).map(escolaNome => (
                                        <div key={escolaNome} className="v2-card rounded-lg border border-purple-200 dark:border-purple-800/50 p-2">
                                            <p className="text-xs font-bold text-purple-900 mb-2">🏫 {escolaNome}</p>
                                            <div className="space-y-0.5">
                                                {porEscola[escolaNome].map(t => (
                                                    <div key={t.aula.id}>
                                                        <div
                                                            onClick={() => setAulaAcaoAtiva(prev => prev?.id === t.aula.id ? null : t.aula)}
                                                            className={`flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${aulaAcaoAtiva?.id === t.aula.id ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-50'}`}
                                                        >
                                                                <span className={`shrink-0 w-2.5 h-2.5 rounded-full mt-0.5 ${dotCls(t.status)}`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-mono font-bold text-purple-700 shrink-0">{t.aula.horario}</span>
                                                                        <span className="text-gray-400">•</span>
                                                                        <span className="text-purple-800 font-medium">{t.segNome}</span>
                                                                        <span className="text-gray-400">•</span>
                                                                        <span className="text-gray-700">{t.turNome}</span>
                                                                    </div>
                                                                    {t.plano
                                                                        ? <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                                                            {t.plano.titulo}
                                                                            {t.plano.notasAdaptacao?.some(n => String(n.turmaId) === String(t.aula.turmaId)) && (
                                                                                <span className="text-amber-500" title="Tem nota de adaptação para esta turma">📌</span>
                                                                            )}
                                                                          </p>
                                                                        : <p className="text-[11px] text-gray-300 italic mt-0.5">Sem plano</p>}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    {t.status !== 'realizada' && (
                                                                        <button
                                                                            onClick={e => {
                                                                                e.stopPropagation();
                                                                                setRrData(dataDia);
                                                                                setRrAnoSel(t.aula.anoLetivoId);
                                                                                setRrEscolaSel(t.aula.escolaId);
                                                                                setRrTextos({}); setRrPlanosSegmento({}); setRrResultados({}); setRrRubricas({}); setRrEncaminhamentos({});
                                                                                setRrTurmaId(String(t.aula.turmaId));
                                                                                setRrSegmentoId(String(t.aula.segmentoId));
                                                                                setModalRegistro(true);
                                                                                setAulaAcaoAtiva(null);
                                                                            }}
                                                                            className="text-green-700 bg-green-50 border border-green-200 rounded-md px-1.5 py-0.5 text-[10px] font-bold hover:bg-green-100 transition"
                                                                            title="Registrar pós-aula">
                                                                            📝
                                                                        </button>
                                                                    )}
                                                                    <span className={`text-[10px] font-semibold ${statusLbl(t.status)}`}>
                                                                        {t.status === 'realizada' ? 'realizada' : t.status === 'planejada' ? 'planejada' : 'sem plano'}
                                                                    </span>
                                                                </div>
                                                        </div>
                                                        {/* Painel de ações rápidas */}
                                                        {aulaAcaoAtiva?.id === t.aula.id && (
                                                            <div className="mx-2 mb-1.5 mt-0.5 flex flex-col gap-1">
                                                                {t.plano && (
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setPlanoSelecionado(t.plano!); setViewMode('lista'); setAulaAcaoAtiva(null); }}
                                                                        className="w-full text-left px-3 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-xs text-indigo-700 font-medium">
                                                                        📄 Ver plano de aula
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        setRrData(dataDia);
                                                                        setRrAnoSel(t.aula.anoLetivoId);
                                                                        setRrEscolaSel(t.aula.escolaId);
                                                                        setRrTextos({}); setRrPlanosSegmento({}); setRrResultados({}); setRrRubricas({}); setRrEncaminhamentos({});
                                                                        setRrTurmaId(String(t.aula.turmaId));
                                                                        setRrSegmentoId(String(t.aula.segmentoId));
                                                                        setModalRegistro(true);
                                                                        setAulaAcaoAtiva(null);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg text-xs text-green-700 font-medium">
                                                                    📝 Registrar pós-aula
                                                                </button>
                                                                {!t.plano && (
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setPlanoRapidoAula({ aula: t.aula, segNome: t.segNome, turNome: t.turNome }); setRoteiroRapido(''); setObjetivoRapido(''); setAulaAcaoAtiva(null); setTimeout(() => roteiroRef.current?.focus(), 80); }}
                                                                        className="w-full text-left px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs text-amber-700 font-medium">
                                                                        ⚡ Planejar rápido
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); setViewMode('turmas'); setAulaAcaoAtiva(null); }}
                                                                    className="w-full text-left px-3 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-xs text-purple-700 font-medium">
                                                                    👥 Abrir planejamento da turma
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Eventos escolares do dia */}
                                    {(() => {
                                        const eventosDoDia = eventos.filter(e => e.data === dataDia)
                                        const adicionarEv = () => {
                                            const nome = inputEvento.trim()
                                            if (!nome) return
                                            adicionarEvento({ data: dataDia, nome })
                                            setInputEvento('')
                                        }
                                        return (
                                            <div className="v2-card rounded-lg border border-slate-200 dark:border-[#374151] p-3">
                                                <p className="text-xs font-bold text-slate-600 dark:text-[#9CA3AF] uppercase tracking-wider mb-2">Eventos do dia</p>
                                                {eventosDoDia.length > 0 && (
                                                    <ul className="space-y-1 mb-2">
                                                        {eventosDoDia.map(ev => (
                                                            <li key={String(ev.id)} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-[#E5E7EB]">
                                                                <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                                                <span className="flex-1">{ev.nome}</span>
                                                                <button onClick={() => removerEvento(ev.id!)} className="text-slate-300 hover:text-red-400 font-bold leading-none transition-colors">×</button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {eventosDoDia.length === 0 && (
                                                    <p className="text-[11px] text-slate-400 italic mb-2">Nenhum evento cadastrado para este dia.</p>
                                                )}
                                                <div className="flex gap-1">
                                                    <input
                                                        type="text"
                                                        value={inputEvento}
                                                        onChange={e => setInputEvento(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') adicionarEv() }}
                                                        placeholder="Adicionar evento…"
                                                        className="flex-1 text-xs border border-slate-200 dark:border-[#374151] rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-slate-300 bg-white dark:bg-[#1F2937] text-slate-700 dark:text-[#E5E7EB]"
                                                    />
                                                    <button
                                                        onClick={adicionarEv}
                                                        className="text-xs px-2 py-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition">
                                                        ＋
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Materiais necessários */}
                                    {(() => {
                                        // dataDia é string "YYYY-MM-DD" — usar diretamente
                                        const dataDiaStr: string = dataDia
                                        const extras = extraMateriais[dataDiaStr] || []
                                        const todosMateriaisList = [...materiaisList, ...extras.filter(e => !materiaisList.includes(e.toLowerCase()))]
                                        const adicionarMaterial = () => {
                                            const val = inputMaterial.trim()
                                            if (!val) return
                                            setExtraMateriais(prev => {
                                                const atuais = prev[dataDiaStr] || []
                                                if (atuais.map(x => x.toLowerCase()).includes(val.toLowerCase())) return prev
                                                return { ...prev, [dataDiaStr]: [...atuais, val] }
                                            })
                                            setInputMaterial('')
                                        }
                                        const removerExtra = (item: string) => {
                                            setExtraMateriais(prev => ({
                                                ...prev,
                                                [dataDiaStr]: (prev[dataDiaStr] || []).filter(x => x !== item)
                                            }))
                                        }
                                        return (
                                            <div className="v2-card rounded-lg border border-purple-200 dark:border-purple-800/50 p-3">
                                                <p className="text-xs font-bold text-purple-900 mb-2">🎵 Materiais necessários hoje</p>
                                                {todosMateriaisList.length > 0 && (
                                                    <ul className="space-y-0.5 mb-2">
                                                        {materiaisList.map(m => (
                                                            <li key={m} className="text-xs text-gray-600 flex items-center gap-1.5">
                                                                <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                                                                {m}
                                                            </li>
                                                        ))}
                                                        {extras.filter(e => !materiaisList.includes(e.toLowerCase())).map(m => (
                                                            <li key={m} className="text-xs text-gray-600 flex items-center gap-1.5">
                                                                <span className="w-1 h-1 rounded-full bg-indigo-400 shrink-0" />
                                                                <span className="flex-1">{m}</span>
                                                                <button onClick={() => removerExtra(m)} className="text-gray-300 hover:text-red-400 font-bold leading-none">×</button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                <div className="flex gap-1 mt-1.5">
                                                    <input
                                                        type="text"
                                                        value={inputMaterial}
                                                        onChange={e => setInputMaterial(e.target.value)}
                                                        onKeyDown={e => { if (e.key === 'Enter') adicionarMaterial() }}
                                                        placeholder="Adicionar material…"
                                                        className="flex-1 text-xs border border-purple-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300 placeholder:text-gray-300 bg-purple-50/50"
                                                    />
                                                    <button
                                                        onClick={adicionarMaterial}
                                                        className="text-xs px-2 py-1 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition">
                                                        ＋
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            );
                        })()}

                    </div>
                );
            })()}

            {/* ── MODO SEMANA — visão consolidada com status ── */}
            {modoResumo === 'semana' && (() => {
                // Mostrar TODOS os dias úteis (Seg–Sex) da semana
                const diasUteis = diasDaSemana.filter(d => d.getDay() >= 1 && d.getDay() <= 6);

                return (
                    <div className="space-y-2">
                        {diasUteis.map(dia => {
                            const dataStr = toStr(dia);
                            const regsNoDia = todosRegistros.filter(r => r.data === dataStr);
                            const turmasDoDia = obterTurmasDoDia(dataStr);
                            const ehHoje = dia.getTime() === hoje.getTime();
                            const ehFuturo = dia > hoje;
                            const expandido = !!diasExpandidos[dataStr];
                            const nomeDia = diasSemana[dia.getDay()];
                            const labelDia = `${nomeDia} · ${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}`;

                            // Calcular status de cada turma da grade
                            const turmasComStatus = turmasDoDia.map(aula => {
                                const ano = anosLetivos.find(a=>a.id==aula.anoLetivoId);
                                const esc = ano?.escolas.find(e=>e.id==aula.escolaId);
                                const seg = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                const tur = seg?.turmas.find(t=>t.id==aula.turmaId);
                                const temRegistroNoDia = regsNoDia.some(r =>
                                    r.anoLetivo==aula.anoLetivoId && r.escola==aula.escolaId &&
                                    (r.segmento||r.serie)==aula.segmentoId && r.turma==aula.turmaId
                                );
                                const planoSugerido = sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId);
                                return { aula, seg, tur, esc, temRegistroNoDia, temPlano: !!planoSugerido };
                            });

                            const totalDadas    = turmasComStatus.filter(t=>t.temRegistroNoDia).length;
                            const totalPlanej   = turmasComStatus.filter(t=>!t.temRegistroNoDia && t.temPlano).length;
                            const totalSemPlano = turmasComStatus.filter(t=>!t.temRegistroNoDia && !t.temPlano).length;

                            // Cor da borda: verde se tudo dado, amarelo se parcial, cinza se sem nada
                            const borderCol = ehHoje ? 'border-amber-400' :
                                totalDadas > 0 && totalDadas === turmasComStatus.length ? 'border-emerald-400' :
                                totalDadas > 0 ? 'border-blue-400' :
                                turmasComStatus.length > 0 ? 'border-gray-300' : 'border-gray-200';

                            const bgHeader = ehHoje ? 'bg-amber-50' :
                                totalDadas > 0 && totalDadas === turmasComStatus.length ? 'bg-emerald-50' :
                                totalDadas > 0 ? 'bg-blue-50' : 'bg-gray-50';

                            return (
                                <div key={dataStr} className={`v2-card rounded-2xl shadow-sm overflow-hidden border-l-4 ${borderCol}`}>
                                    {/* Cabeçalho */}
                                    <button onClick={()=>toggleDia(dataStr)}
                                        className={`w-full px-4 py-3 flex justify-between items-center text-left ${bgHeader}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {ehHoje && <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Hoje</span>}
                                            {ehFuturo && <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">Futuro</span>}
                                            <span className={`font-bold text-sm ${ehHoje ? 'text-amber-700' : 'text-gray-700'}`}>{labelDia}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Pílulas de status */}
                                            {totalDadas > 0 && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ {totalDadas}</span>}
                                            {totalPlanej > 0 && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📋 {totalPlanej}</span>}
                                            {totalSemPlano > 0 && <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">⬜ {totalSemPlano}</span>}
                                            {turmasComStatus.length === 0 && regsNoDia.length === 0 && <span className="text-xs text-gray-400">sem aulas</span>}
                                            <span className={`text-gray-400 text-xs ml-1 ${expandido?'rotate-180':''}`} style={{display:'inline-block',transition:'transform .2s'}}>▼</span>
                                        </div>
                                    </button>

                                    {/* Conteúdo expandido */}
                                    {expandido && (
                                        <div>
                                            {/* Grade do dia — turmas com status */}
                                            {turmasComStatus.length > 0 && (
                                                <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-[#374151] space-y-1.5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-xs font-bold text-slate-500 uppercase">Turmas do dia</p>
                                                        <button onClick={()=>{
                                                            setRrData(dataStr);
                                                            const primeira = turmasDoDia[0];
                                                            setRrAnoSel(primeira?.anoLetivoId||'');
                                                            setRrEscolaSel(primeira?.escolaId||'');
                                                            setRrTextos({}); setRrPlanosSegmento({}); setRrResultados({}); setRrRubricas({}); setRrEncaminhamentos({}); setRrTurmaId(''); setRrSegmentoId('');
                                                            setModalRegistro(true);
                                                        }} className="text-xs bg-amber-400 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg">
                                                            📝 Registrar
                                                        </button>
                                                    </div>
                                                    {turmasComStatus.map(({aula, seg, tur, esc, temRegistroNoDia, temPlano}, idx) => (
                                                        <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                                                            temRegistroNoDia ? 'bg-emerald-50 border border-emerald-200' :
                                                            temPlano ? 'bg-blue-50 border border-blue-200' :
                                                            'bg-white border border-gray-200'}`}>
                                                            <span className="shrink-0 w-5 h-5 flex items-center justify-center leading-none text-base">
                                                                {temRegistroNoDia ? '✅' : temPlano ? '📋' : <span className="w-3.5 h-3.5 border-2 border-slate-300 rounded-sm inline-block" />}
                                                            </span>
                                                            <span className="font-mono font-bold text-slate-600 shrink-0">{aula.horario}</span>
                                                            <span className="text-slate-500 shrink-0">{esc?.nome}</span>
                                                            <span className="text-slate-400">›</span>
                                                            <span className="font-medium text-slate-700">{seg?.nome}</span>
                                                            <span className="text-slate-400">›</span>
                                                            <span className="text-slate-600">{tur?.nome}</span>
                                                            <span className="ml-auto text-slate-400 italic text-[10px]">
                                                                {temRegistroNoDia ? 'Registrada' : temPlano ? 'Planejada' : 'Sem plano'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Dia sem nada */}
                                            {turmasComStatus.length === 0 && regsNoDia.length === 0 && (
                                                <p className="px-4 py-4 text-xs text-gray-400 text-center italic">Nenhuma turma nem registro para este dia.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Legenda */}
                        <div className="flex gap-3 px-2 pt-1 flex-wrap">
                            <span className="text-xs text-gray-400 flex items-center gap-1">✅ <span>Aula registrada</span></span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">📋 <span>Planejada (sem registro)</span></span>
                            <span className="text-xs text-gray-400 flex items-center gap-1"><span className="w-3.5 h-3.5 border-2 border-slate-300 rounded-sm inline-block" /> <span>Sem plano vinculado</span></span>
                        </div>
                    </div>
                );
            })()}

        </div>

        {/* ── MODAL PLANEJAR RÁPIDO ── */}
        {planoRapidoAula && (
            <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setPlanoRapidoAula(null)}>
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative w-full max-w-lg bg-white rounded-t-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-slate-200" />
                    </div>
                    {/* Header */}
                    <div className="px-5 pt-2 pb-3 border-b border-slate-100">
                        <p className="font-bold text-slate-800 text-sm">⚡ Planejar rápido</p>
                        <p className="text-xs text-slate-400 mt-0.5">{planoRapidoAula.segNome} · {planoRapidoAula.turNome} · {dataDia}</p>
                    </div>
                    {/* Fields */}
                    <div className="px-5 py-4 space-y-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Objetivo <span className="font-normal normal-case">(opcional)</span></label>
                            <textarea
                                value={objetivoRapido}
                                onChange={e => setObjetivoRapido(e.target.value)}
                                rows={2}
                                placeholder="O que você espera que os alunos aprendam ou desenvolvam..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Roteiro de atividades <span className="text-red-400">*</span></label>
                            <textarea
                                ref={roteiroRef}
                                value={roteiroRapido}
                                onChange={e => setRoteiroRapido(e.target.value)}
                                rows={4}
                                placeholder="Descreva as atividades planejadas para esta aula..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none"
                            />
                        </div>
                    </div>
                    {/* Footer */}
                    <div className="px-5 pb-6">
                        <button
                            disabled={!roteiroRapido.trim()}
                            onClick={() => {
                                if (!roteiroRapido.trim()) return
                                salvarPlanejamentoParaTurma(
                                    {
                                        anoLetivoId: planoRapidoAula.aula.anoLetivoId ?? '',
                                        escolaId: planoRapidoAula.aula.escolaId ?? '',
                                        segmentoId: planoRapidoAula.aula.segmentoId,
                                        turmaId: planoRapidoAula.aula.turmaId,
                                    },
                                    {
                                        dataPrevista: dataDia,
                                        oQuePretendoFazer: roteiroRapido.trim(),
                                        objetivo: objetivoRapido.trim() || undefined,
                                        origemAula: 'livre',
                                    }
                                )
                                setPlanoRapidoAula(null)
                                setRoteiroRapido('')
                                setObjetivoRapido('')
                            }}
                            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                            Salvar plano
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
