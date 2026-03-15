// src/components/ModuloPorTurmas.tsx
// Etapa 6 — Planejar por Turma
// Foco: "O que vou dar para esta turma na próxima aula?"

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useCalendarioContext } from '../contexts/CalendarioContext'
import { useAnoLetivoContext } from '../contexts/AnoLetivoContext'
import { usePlanejamentoTurmaContext } from '../contexts/PlanejamentoTurmaContext'
import { useRepertorioContext } from '../contexts/RepertorioContext'
import { usePlanosContext } from '../contexts/PlanosContext'
import type { TurmaSelecionada } from '../contexts/PlanejamentoTurmaContext'
import type { AnoLetivo, RegistroPosAula, Plano } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    return d
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
}

function toYMD(date: Date): string {
    return date.toISOString().slice(0, 10)
}

function formatDataCurta(ymd: string): string {
    const [, mm, dd] = ymd.split('-')
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return `${parseInt(dd)} ${meses[parseInt(mm) - 1]}`
}

function getDiaSemana(date: Date): string {
    const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    return dias[date.getDay()]
}

// Avança apenas para dias úteis (Seg–Sex)
function stepDiaUtil(date: Date, dir: 1 | -1): Date {
    let d = addDays(date, dir)
    while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, dir)
    return d
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
    return [seg?.nome, tur?.nome].filter(Boolean).join(' › ') || turmaId
}

function getNomeEscola(
    anoLetivoId: string | undefined,
    escolaId: string | undefined,
    anosLetivos: AnoLetivo[]
): string {
    if (!anoLetivoId || !escolaId) return ''
    // eslint-disable-next-line eqeqeq
    const ano = anosLetivos.find(a => a.id == anoLetivoId)
    // eslint-disable-next-line eqeqeq
    return ano?.escolas.find(e => e.id == escolaId)?.nome ?? ''
}

// ─── Paleta de cores por escola (mesma de VisaoSemana) ───────────────────────

const ESCOLA_COLORS: { light: string; dark: string }[] = [
    { light: '#7c83d4', dark: '#bfc3f5' },
    { light: '#3b8fc2', dark: '#9dd5f0' },
    { light: '#2a9c70', dark: '#8edbbf' },
    { light: '#b8860e', dark: '#e6be6a' },
    { light: '#c0527a', dark: '#f0a8c3' },
    { light: '#7a5bbf', dark: '#c8b4f0' },
    { light: '#c94040', dark: '#f0a8a8' },
    { light: '#1a9090', dark: '#7dd8d8' },
]

function buildEscolaColorMap(anosLetivos: AnoLetivo[]): Record<string, { light: string; dark: string }> {
    const map: Record<string, { light: string; dark: string }> = {}
    let idx = 0
    for (const ano of anosLetivos) {
        for (const esc of (ano.escolas ?? [])) {
            const key = String(esc.id)
            if (!map[key]) {
                map[key] = ESCOLA_COLORS[idx % ESCOLA_COLORS.length]
                idx++
            }
        }
    }
    return map
}

// ─── Sub-componente: Seletor de turma (sidebar compacta) ─────────────────────

interface SeletorProps {
    dataSelecionada: Date
    onDataChange: (d: Date) => void
    turmaSelecionada: TurmaSelecionada | null
    onSelecionarTurma: (t: TurmaSelecionada) => void
}

function SeletorTurma({ dataSelecionada, onDataChange, turmaSelecionada, onSelecionarTurma }: SeletorProps) {
    const { obterTurmasDoDia } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()
    const escolaColorMap = useMemo(() => buildEscolaColorMap(anosLetivos), [anosLetivos])

    const ymd = toYMD(dataSelecionada)
    const aulasDoDia = useMemo(
        () => obterTurmasDoDia(ymd).sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? '')),
        [ymd, obterTurmasDoDia]
    )

    const diaNome  = getDiaSemana(dataSelecionada)
    const diaNum   = dataSelecionada.getDate()
    const mesNomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    const mesNome  = mesNomes[dataSelecionada.getMonth()]

    return (
        <aside className="w-52 flex-shrink-0 flex flex-col gap-3">

            {/* ── Navegação de data ── */}
            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">
                {/* Cabeçalho data */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#E6EAF0] dark:border-[#374151]">
                    <button
                        onClick={() => onDataChange(stepDiaUtil(dataSelecionada, -1))}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#374151] transition text-sm"
                    >‹</button>

                    <div className="text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#6B7280]">
                            {diaNome}
                        </div>
                        <div className="text-[18px] font-bold leading-tight text-slate-800 dark:text-[#E5E7EB]">
                            {diaNum}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#6B7280]">{mesNome}</div>
                    </div>

                    <button
                        onClick={() => onDataChange(stepDiaUtil(dataSelecionada, 1))}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[#374151] transition text-sm"
                    >›</button>
                </div>

                {/* Lista de turmas do dia */}
                <div className="py-1">
                    {aulasDoDia.length === 0 ? (
                        <div className="px-3 py-4 text-center text-[11px] text-slate-400 dark:text-[#6B7280]">
                            Nenhuma turma neste dia
                        </div>
                    ) : (
                        aulasDoDia.map((aula, i) => {
                            const nome      = getNomeTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId, anosLetivos)
                            const escola    = getNomeEscola(aula.anoLetivoId, aula.escolaId, anosLetivos)
                            const escolaCor = escolaColorMap[String(aula.escolaId ?? '')]
                            const isAtiva   = turmaSelecionada
                                // eslint-disable-next-line eqeqeq
                                ? String(turmaSelecionada.turmaId) == String(aula.turmaId)
                                : false

                            return (
                                <button
                                    key={`${aula.turmaId}-${i}`}
                                    onClick={() => onSelecionarTurma({
                                        anoLetivoId: String(aula.anoLetivoId ?? ''),
                                        escolaId:    String(aula.escolaId ?? ''),
                                        segmentoId:  String(aula.segmentoId),
                                        turmaId:     String(aula.turmaId),
                                    })}
                                    style={escolaCor
                                        ? { '--escola-l': escolaCor.light, '--escola-d': escolaCor.dark } as React.CSSProperties
                                        : undefined}
                                    className={`w-full text-left px-3 py-2 transition-all ${
                                        isAtiva
                                            ? 'bg-[#5B5FEA]/[0.09] dark:bg-[#5B5FEA]/[0.16]'
                                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                                    }`}
                                >
                                    <div className={`text-[12.5px] font-semibold leading-tight truncate ${
                                        isAtiva
                                            ? 'text-indigo-700 dark:text-indigo-300'
                                            : 'text-slate-700 dark:text-[#D1D5DB]'
                                    }`}>
                                        {nome}
                                    </div>
                                    {escola && (
                                        <div className="escola-label text-[10px] font-medium truncate mt-[1px]">
                                            {escola}
                                        </div>
                                    )}
                                    {aula.horario && (
                                        <div className="text-[10px] text-slate-500 dark:text-[#C1C8D4] mt-[1px]">
                                            {aula.horario.replace(':','h').replace(/h00$/, 'h')}
                                        </div>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ── Atalho: semana atual ── */}
            <button
                onClick={() => {
                    const seg = getMondayOf(new Date())
                    const hoje = new Date(); hoje.setHours(0,0,0,0)
                    // Se hoje for útil, vai para hoje; senão vai para segunda
                    const target = (hoje.getDay() >= 1 && hoje.getDay() <= 5) ? hoje : seg
                    onDataChange(target)
                }}
                className="text-[11px] text-center text-slate-400 dark:text-[#6B7280] hover:text-indigo-500 dark:hover:text-indigo-400 transition"
            >
                ir para hoje
            </button>
        </aside>
    )
}

// ─── Sub-componente: Estado vazio ─────────────────────────────────────────────

function EstadoVazio({ dataYmd }: { dataYmd: string }) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <svg className="w-8 h-8 mb-4 text-slate-300 dark:text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <p className="text-[14px] font-semibold text-slate-600 dark:text-[#9CA3AF] mb-1">
                Selecione uma turma
            </p>
            <p className="text-[12px] text-[#94A3B8] dark:text-[#4B5563]">
                {formatDataCurta(dataYmd)} · escolha uma turma ao lado para planejar
            </p>
        </div>
    )
}

// ─── Helper: resultado da aula → label + cor ─────────────────────────────────

function inferResultado(r: RegistroPosAula): { emoji: string; label: string; cor: string } {
    const s = r.statusAula ?? r.resultadoAula ?? r.proximaAulaOpcao ?? ''
    if (s === 'concluida' || s === 'bem' || s === 'funcionou')
        return { emoji: '✓', label: 'Concluída',  cor: 'text-emerald-600 dark:text-emerald-400' }
    if (s === 'revisao' || s === 'revisar-nova')
        return { emoji: '↻', label: 'Revisão',    cor: 'text-blue-600 dark:text-blue-400' }
    if (s === 'incompleta' || s === 'parcial' || s === 'revisar')
        return { emoji: '↩', label: 'Incompleta', cor: 'text-amber-600 dark:text-amber-400' }
    if (s === 'nao_houve' || s === 'nao' || s === 'nao_funcionou')
        return { emoji: '✗', label: 'Não houve',  cor: 'text-red-500 dark:text-red-400' }
    return { emoji: '·', label: 'Registrado', cor: 'text-slate-400 dark:text-[#6B7280]' }
}

function formatDataRegistro(ymd: string): string {
    if (!ymd) return ''
    const [, mm, dd] = ymd.split('-')
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return `${parseInt(dd)} ${meses[parseInt(mm) - 1]}`
}

// ─── Sub-componente: bloco "Aula anterior" ───────────────────────────────────

function BlocoAulaAnterior({ registro }: { registro: RegistroPosAula | null }) {
    const [expandido, setExpandido] = useState(false)

    if (!registro) {
        return (
            <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] px-5 py-4">
                <span className="text-[10px] font-semibold uppercase tracking-[.7px] text-slate-500 dark:text-[#ACB3BF]">
                    Registros da aula anterior
                </span>
                <p className="text-[12.5px] text-slate-400 dark:text-[#6B7280] italic mt-3">
                    Nenhum registro encontrado para esta turma.
                </p>
            </div>
        )
    }

    const res       = inferResultado(registro)
    const dataLabel = formatDataRegistro(registro.dataAula ?? registro.dataRegistro ?? registro.data ?? '')

    // ── Campos sempre visíveis ──
    const encaminhamentos = (registro.encaminhamentos ?? []).filter(e => !e.concluido)
    const proximaAula     = registro.proximaAula?.trim()
    const temLembretes    = encaminhamentos.length > 0 || !!proximaAula
    const resumo          = registro.resumoAula?.trim()
    const comportamento   = registro.comportamento?.trim()
    const temAudio        = !!registro.audioNotaDeVoz
    const audioSrc        = temAudio
        ? `data:${registro.audioMime ?? 'audio/webm'};base64,${registro.audioNotaDeVoz}`
        : null
    const audioDurStr = registro.audioDuracao ? `${Math.floor(registro.audioDuracao)}s` : ''

    // ── Campos recolhidos ──
    const funcionouBem    = registro.funcionouBem?.trim()
    const naoFuncionou    = registro.naoFuncionou?.trim()
    const poderiaMelhorar = registro.poderiaMelhorar?.trim()
    const anotacoesGerais = registro.anotacoesGerais?.trim()
    const temDetalhes     = !!(funcionouBem || naoFuncionou || poderiaMelhorar || anotacoesGerais || comportamento)

    return (
        <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">

            {/* ── Cabeçalho ── */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E6EAF0] dark:border-[#2D3748]">
                <span className="text-[10px] font-semibold uppercase tracking-[.7px] text-slate-500 dark:text-[#ACB3BF]">
                    Registros da aula anterior
                </span>
                <div className="flex items-center gap-2">
                    {dataLabel && (
                        <span className="text-[11px] text-[#94A3B8] dark:text-[#C9D1DB]">{dataLabel}</span>
                    )}
                    <span className={`text-[11px] font-semibold ${res.cor}`}>
                        {res.emoji} {res.label}
                    </span>
                </div>
            </div>

            {/* ── Corpo ── */}
            <div className="px-5 py-4 flex flex-col gap-3">

                {/* 📌 Meus lembretes da última aula */}
                {temLembretes && (
                    <div className="border-l-[1.5px] border-indigo-200 dark:border-indigo-800 pl-3 py-0.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-indigo-500 dark:text-indigo-300/60 mb-1.5">
                            📌 Meus lembretes da última aula
                        </p>
                        {encaminhamentos.length > 0 && (
                            <ul className="flex flex-col gap-1.5 mb-1">
                                {encaminhamentos.map(e => (
                                    <li key={e.id} className="flex items-start gap-2 text-[12.5px] text-slate-700 dark:text-[#D1D5DB]">
                                        <span className="mt-[5px] w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500 flex-shrink-0" />
                                        {e.texto}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {proximaAula && (
                            <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{proximaAula}</p>
                        )}
                    </div>
                )}

                {/* O que foi realizado */}
                {resumo && (
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">
                            O que foi realizado
                        </p>
                        <p className="text-[13px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed line-clamp-3">
                            {resumo}
                        </p>
                    </div>
                )}

                {/* 🎤 Áudio — compacto, sempre visível */}
                {audioSrc && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#6B7280] shrink-0">
                            🎤 Áudio{audioDurStr ? ` · ${audioDurStr}` : ''}
                        </span>
                        <audio controls src={audioSrc}
                            className="flex-1 min-w-0 h-7"
                            style={{ colorScheme: 'light dark' }}
                        />
                    </div>
                )}

                {/* ── [+ Ver mais] — campos de reflexão ── */}
                {temDetalhes && (
                    <>
                        <button
                            onClick={() => setExpandido(v => !v)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-[#6B7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] transition w-fit pt-1"
                        >
                            <span className="text-[9px]">{expandido ? '▾' : '▸'}</span>
                            <span>{expandido ? 'Ver menos' : '+ Ver mais'}</span>
                        </button>

                        {expandido && (
                            <div className="flex flex-col gap-3 pt-2 border-t border-[#E6EAF0] dark:border-[#2D3748]">
                                {comportamento && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5]">🎭 Comportamento da turma:</span>
                                        <span className="text-[12px] text-slate-700 dark:text-[#D1D5DB] italic">{comportamento}</span>
                                    </div>
                                )}
                                {funcionouBem && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">✓ O que funcionou</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{funcionouBem}</p>
                                    </div>
                                )}
                                {naoFuncionou && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">✗ O que não funcionou</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{naoFuncionou}</p>
                                    </div>
                                )}
                                {poderiaMelhorar && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">💭 Poderia melhorar</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{poderiaMelhorar}</p>
                                    </div>
                                )}
                                {anotacoesGerais && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.6px] text-slate-400 dark:text-[#8896A5] mb-1">📝 Anotações gerais</p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">{anotacoesGerais}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

            </div>
        </div>
    )
}

// ─── Helper: monta texto inicial para modo Adaptar ───────────────────────────

function buildTextoAdaptar(r: RegistroPosAula | null): string {
    if (!r) return ''
    const parts: string[] = []
    if (r.proximaAula?.trim())
        parts.push(`Para a próxima aula:\n${r.proximaAula.trim()}`)
    const pendentes = (r.encaminhamentos ?? []).filter(e => !e.concluido)
    if (pendentes.length)
        parts.push(`Encaminhamentos pendentes:\n${pendentes.map(e => `• ${e.texto}`).join('\n')}`)
    if (r.poderiaMelhorar?.trim())
        parts.push(`Poderia melhorar:\n${r.poderiaMelhorar.trim()}`)
    return parts.join('\n\n')
}

// ─── Sub-componente: Formulário inline de planejamento ───────────────────────

type ModoForm = 'adaptar' | 'importar' | 'criar'

function FormPlanoTurma({
    modo,
    ultimoRegistro,
    onClose,
}: {
    modo: ModoForm
    ultimoRegistro: RegistroPosAula | null
    onClose: () => void
}) {
    const { salvarPlanejamento } = usePlanejamentoTurmaContext()
    const { planos } = usePlanosContext()

    const textoInicial = modo === 'adaptar' ? buildTextoAdaptar(ultimoRegistro) : ''
    const [notas, setNotas] = useState(textoInicial)
    const [planoImportadoId, setPlanoImportadoId] = useState<string | null>(null)
    const [busca, setBusca] = useState('')
    const [salvoNoBanco, setSalvoNoBanco] = useState(false)
    // Referência da aula anterior — colapsada por padrão (mobile-first)
    const [refAberta, setRefAberta] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => { textareaRef.current?.focus() }, [])

    // Filtra planos do banco para modo importar
    const planosFiltrados = useMemo<Plano[]>(() => {
        if (modo !== 'importar') return []
        const q = busca.toLowerCase()
        return planos
            .filter(p => !p.arquivado)
            .filter(p => !q || p.titulo.toLowerCase().includes(q) || (p.tema ?? '').toLowerCase().includes(q))
            .slice(0, 12)
    }, [planos, busca, modo])

    const planoSelecionado = planos.find(p => String(p.id) === planoImportadoId) ?? null

    // Encaminhamentos pendentes da última aula
    const encPendentes = (ultimoRegistro?.encaminhamentos ?? []).filter(e => !e.concluido)
    const temRef = modo === 'adaptar' && ultimoRegistro && (
        ultimoRegistro.proximaAula || encPendentes.length > 0 || ultimoRegistro.poderiaMelhorar
    )

    function handleSalvar() {
        const origemMap: Record<ModoForm, 'banco' | 'adaptacao' | 'livre'> = {
            adaptar: 'adaptacao', importar: 'banco', criar: 'livre',
        }
        salvarPlanejamento({
            oQuePretendoFazer: notas || (planoSelecionado?.objetivoGeral ?? ''),
            objetivo: planoSelecionado?.objetivoGeral,
            origemAula: origemMap[modo],
            materiais: planoSelecionado?.materiais ?? [],
            planosRelacionadosIds: planoImportadoId ? [planoImportadoId] : [],
        })
        setSalvoNoBanco(true)
        setTimeout(onClose, 1200)
    }

    const modoLabel: Record<ModoForm, string> = {
        adaptar:  '🔄 Adaptar da aula anterior',
        importar: '🏛 Importar do banco de aulas',
        criar:    '✏️ Nova aula',
    }

    return (
        <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E6EAF0] dark:border-[#2D3748]">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-[#C1C8D4]">
                    {modoLabel[modo]}
                </span>
                {/* min-h-[44px] garante área de toque adequada no mobile */}
                <button
                    onClick={onClose}
                    className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-3 text-slate-400 hover:text-slate-600 dark:hover:text-[#9CA3AF] transition text-[20px] leading-none"
                >
                    ×
                </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-3">

                {/* Referência colapsável — só no modo adaptar */}
                {temRef && (
                    <div className="rounded-lg border border-indigo-100 dark:border-indigo-900/60 overflow-hidden">
                        <button
                            onClick={() => setRefAberta(v => !v)}
                            className="w-full flex items-center justify-between px-3 min-h-[44px] bg-indigo-50/70 dark:bg-indigo-950/30 text-left"
                        >
                            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                📋 Ver referência da aula anterior
                            </span>
                            <span
                                className="text-[10px] text-indigo-400 dark:text-indigo-500 transition-transform duration-200"
                                style={{ display: 'inline-block', transform: refAberta ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            >▼</span>
                        </button>
                        {refAberta && (
                            <div className="px-4 py-3 flex flex-col gap-2.5 border-t border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10">
                                {ultimoRegistro!.proximaAula && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.5px] text-indigo-400 dark:text-indigo-500 mb-0.5">
                                            Para a próxima aula
                                        </p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">
                                            {ultimoRegistro!.proximaAula}
                                        </p>
                                    </div>
                                )}
                                {encPendentes.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.5px] text-indigo-400 dark:text-indigo-500 mb-0.5">
                                            Encaminhamentos pendentes
                                        </p>
                                        <ul className="flex flex-col gap-0.5">
                                            {encPendentes.map((enc, i) => (
                                                <li key={i} className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] flex gap-1.5 leading-relaxed">
                                                    <span className="text-indigo-300 dark:text-indigo-600 shrink-0 mt-[1px]">•</span>
                                                    {enc.texto}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {ultimoRegistro!.poderiaMelhorar && (
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-[.5px] text-indigo-400 dark:text-indigo-500 mb-0.5">
                                            Poderia melhorar
                                        </p>
                                        <p className="text-[12.5px] text-slate-700 dark:text-[#D1D5DB] leading-relaxed">
                                            {ultimoRegistro!.poderiaMelhorar}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Modo importar: seletor de plano do banco */}
                {modo === 'importar' && (
                    <div className="flex flex-col gap-2">
                        {/* font-size 16px evita zoom automático no iOS */}
                        <input
                            type="text"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Buscar no banco de aulas..."
                            style={{ fontSize: 16 }}
                            className="w-full px-3 py-2.5 rounded-lg border border-[#E6EAF0] dark:border-[#374151] bg-[var(--v2-card)] text-slate-700 dark:text-[#E5E7EB] placeholder:text-slate-400 dark:placeholder:text-[#6B7280] outline-none focus:border-indigo-400"
                        />
                        {planosFiltrados.length > 0 && (
                            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                                {planosFiltrados.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setPlanoImportadoId(String(p.id)); setNotas(p.objetivoGeral ?? '') }}
                                        className={`w-full text-left px-3 py-3 rounded-lg text-[12.5px] transition border ${
                                            planoImportadoId === String(p.id)
                                                ? 'border-indigo-300 dark:border-indigo-700 bg-[#5B5FEA]/[0.07] text-indigo-700 dark:text-indigo-300'
                                                : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-700 dark:text-[#D1D5DB]'
                                        }`}
                                    >
                                        <span className="font-medium">{p.titulo}</span>
                                        {p.data && <span className="ml-2 text-[11px] text-slate-400 dark:text-[#6B7280]">{p.data}</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Notas / objetivo */}
                <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[.6px] text-[#94A3B8] dark:text-[#6B7280] block mb-1.5">
                        {modo === 'adaptar' ? 'O que pretendo retomar / ajustar' : 'O que pretendo fazer'}
                    </label>
                    {/* font-size 16px evita zoom automático no iOS ao focar o campo */}
                    <textarea
                        ref={textareaRef}
                        value={notas}
                        onChange={e => setNotas(e.target.value)}
                        rows={5}
                        style={{ fontSize: 16 }}
                        placeholder="Descreva o planejamento para a próxima aula..."
                        className="w-full px-3 py-2.5 rounded-lg border border-[#E6EAF0] dark:border-[#374151] bg-[var(--v2-card)] text-slate-700 dark:text-[#E5E7EB] placeholder:text-slate-400 dark:placeholder:text-[#6B7280] outline-none focus:border-indigo-400 resize-none leading-relaxed"
                    />
                </div>

                {/* Ações — min-h-[44px] para área de toque mobile */}
                <div className="flex items-center justify-between pt-1">
                    <button
                        onClick={onClose}
                        className="flex items-center min-h-[44px] px-1 text-[12px] text-slate-400 dark:text-[#6B7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] transition"
                    >
                        Cancelar
                    </button>
                    {salvoNoBanco ? (
                        <span className="text-[12px] text-emerald-500 font-medium">✓ Salvo</span>
                    ) : (
                        <button
                            onClick={handleSalvar}
                            disabled={!notas.trim() && !planoImportadoId}
                            className="flex items-center min-h-[44px] px-5 rounded-lg bg-[#5B5FEA] text-white text-[13px] font-semibold hover:bg-[#4B4FD9] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            Salvar planejamento
                        </button>
                    )}
                </div>

            </div>
        </div>
    )
}

// ─── Sub-componente: Conteúdo da turma selecionada ───────────────────────────

function ConteudoTurma({ turmaSelecionada }: { turmaSelecionada: TurmaSelecionada }) {
    const { ultimoRegistroDaTurma } = usePlanejamentoTurmaContext()
    const [modoAtivo, setModoAtivo] = useState<ModoForm | null>(null)

    const temUltimoRegistro = !!ultimoRegistroDaTurma

    return (
        <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Bloco: Aula anterior */}
            <BlocoAulaAnterior registro={ultimoRegistroDaTurma} />

            {/* Bloco: Planejamento da próxima aula */}
            {modoAtivo ? (
                <FormPlanoTurma
                    modo={modoAtivo}
                    ultimoRegistro={ultimoRegistroDaTurma}
                    onClose={() => setModoAtivo(null)}
                />
            ) : (
                <div className="v2-card rounded-[10px] border border-[#E6EAF0] dark:border-[#374151] px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[.7px] text-[#94A3B8] dark:text-[#6B7280] mb-3">
                        Planejar próxima aula
                    </p>
                    {/* py-3 garante 44px de área de toque no mobile */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => setModoAtivo('adaptar')}
                            disabled={!temUltimoRegistro}
                            className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            🔄 <span>Adaptar da aula anterior</span>
                        </button>
                        <button
                            onClick={() => setModoAtivo('criar')}
                            className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
                        >
                            ✏️ <span>Nova aula</span>
                        </button>
                        <button
                            onClick={() => setModoAtivo('importar')}
                            className="flex items-center gap-2 px-4 py-3 sm:py-2 text-[12.5px] font-medium rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-[#273344] transition"
                        >
                            🏛 <span>Importar do banco de aulas</span>
                        </button>
                    </div>
                </div>
            )}

        </div>
    )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ModuloPorTurmas() {
    const { selecionarTurma, turmaSelecionada, dataNavegacao, setDataNavegacao } = usePlanejamentoTurmaContext()
    const { setViewMode } = useRepertorioContext()

    // Data local — independente do AgendaSemanal e VisaoSemana
    const [dataSelecionada, setDataSelecionada] = useState<Date>(() => {
        const d = new Date(); d.setHours(0,0,0,0)
        // Se fim de semana, avança para segunda
        if (d.getDay() === 0) return addDays(d, 1)
        if (d.getDay() === 6) return addDays(d, 2)
        return d
    })
    const [voltarPara, setVoltarPara] = useState<string | null>(null)

    // Navegação vinda da Visão da Semana — aplica a data e registra origem
    useEffect(() => {
        if (!dataNavegacao) return
        setDataSelecionada(dataNavegacao)
        setVoltarPara('visaoSemana')
        setDataNavegacao(null)
    }, [dataNavegacao, setDataNavegacao])

    const ymd = toYMD(dataSelecionada)

    return (
        <div className="flex flex-col gap-6">

            {/* Botão voltar — só aparece quando navegou da Visão da Semana */}
            {voltarPara === 'visaoSemana' && (
                <button
                    onClick={() => { setVoltarPara(null); setViewMode('visaoSemana') }}
                    className="self-start flex items-center gap-1.5 text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF] hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                    <span className="text-[14px] leading-none">←</span>
                    Visão da Semana
                </button>
            )}

            {/* Cabeçalho */}
            <div>
                <h1 className="text-[17px] font-bold tracking-tight text-slate-800 dark:text-[#E5E7EB]">
                    Planejar por Turma
                </h1>
                <p className="text-[12.5px] text-slate-500 dark:text-[#9CA3AF] mt-1">
                    O que vou dar para esta turma na próxima aula?
                </p>
            </div>

            {/* Layout: sidebar + conteúdo */}
            <div className="flex gap-5 items-start">
                <SeletorTurma
                    dataSelecionada={dataSelecionada}
                    onDataChange={setDataSelecionada}
                    turmaSelecionada={turmaSelecionada}
                    onSelecionarTurma={selecionarTurma}
                />

                {turmaSelecionada
                    ? <ConteudoTurma turmaSelecionada={turmaSelecionada} />
                    : <EstadoVazio dataYmd={ymd} />
                }
            </div>

        </div>
    )
}
