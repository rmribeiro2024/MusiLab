// ModalRegistroRapido.tsx
// Registro pós-aula focado: status + encaminhamentos + nota de voz
// Abre já focado na turma clicada (rrTurmaId) — as demais ficam colapsadas

import React, { useState, useRef } from 'react'
import { useCalendarioContext } from '../../contexts'
import { useAnoLetivoContext } from '../../contexts'
import { usePlanosContext } from '../../contexts'
import { useBancoPlanos } from '../BancoPlanosContext'
import { startRecording, stopRecording, blobToBase64, base64ToObjectUrl } from '../../lib/audioRecorder'

type Resultado = 'concluida' | 'revisao' | 'incompleta' | 'nao_houve' | ''

const RESULTADO_CFG: { value: Resultado; label: string; emoji: string; bg: string; border: string; text: string }[] = [
  { value: 'concluida',  label: 'Concluída',   emoji: '✓', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700' },
  { value: 'revisao',    label: 'Revisar',      emoji: '↻', bg: 'bg-yellow-50',  border: 'border-yellow-300',  text: 'text-yellow-700'  },
  { value: 'incompleta', label: 'Incompleta',   emoji: '↩', bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700'   },
  { value: 'nao_houve',  label: 'Não houve',    emoji: '✗', bg: 'bg-slate-50',   border: 'border-slate-300',   text: 'text-slate-600'   },
]

const MAX_AUDIO = 60 // segundos

export default function ModalRegistroRapido() {
    const {
        modalRegistroRapido, setModalRegistroRapido,
        rrData, rrAnoSel, rrEscolaSel,
        rrPlanosSegmento, setRrPlanosSegmento,
        rrResultados, setRrResultados,
        rrRubricas, setRrRubricas,
        rrEncaminhamentos, setRrEncaminhamentos,
        rrAudios, setRrAudios,
        rrTurmaId,
        obterTurmasDoDia,
        setModalRegistro, setPlanoParaRegistro,
        setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel,
        setVerRegistros, setRegistroEditando, setNovoRegistro,
        setFiltroRegAno, setFiltroRegEscola, setFiltroRegSegmento, setFiltroRegTurma, setFiltroRegData,
    } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext() as any
    const { planos } = usePlanosContext()
    const { sugerirPlanoParaTurma, salvarRegistroRapido } = useBancoPlanos()

    // Estado local
    const [inputEnc, setInputEnc] = useState<Record<string, string>>({})
    // Turmas expandidas: por padrão só a turma clicada
    const [expandidas, setExpandidas] = useState<Record<string, boolean>>({})
    // Áudio por turma
    const [gravando, setGravando] = useState<Record<string, boolean>>({})
    const [timer, setTimer] = useState<Record<string, number>>({})
    const [erroAudio, setErroAudio] = useState<Record<string, string | null>>({})
    const timerRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({})

    // Inicializa expansão quando modal abre: só a turma clicada
    React.useEffect(() => {
        if (modalRegistroRapido && rrTurmaId) {
            setExpandidas({ [rrTurmaId]: true })
        } else if (modalRegistroRapido) {
            setExpandidas({})
        }
        setErroAudio({})
    }, [modalRegistroRapido, rrTurmaId])

    if (!modalRegistroRapido) return null

    const turmasDoDia = obterTurmasDoDia(rrData)
        .filter(a =>
            (!rrAnoSel   || String(a.anoLetivoId) === String(rrAnoSel)) &&
            (!rrEscolaSel || String(a.escolaId)    === String(rrEscolaSel))
        )
        .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))

    const ano = anosLetivos.find(a => String(a.id) === String(rrAnoSel))
    const esc = ano?.escolas.find(e => String(e.id) === String(rrEscolaSel))
    const nomeEscola = esc?.nome || ''

    const [y, m, d] = rrData.split('-')
    const dataFmt = `${d}/${m}/${y}`
    const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    const diaSemana = diasSemana[new Date(rrData + 'T12:00:00').getDay()] || ''

    function getNomeTurma(aula: typeof turmasDoDia[0]): string {
        const seg = esc?.segmentos.find(s => String(s.id) === String(aula.segmentoId))
        const tur = seg?.turmas.find(t => String(t.id) === String(aula.turmaId))
        return [seg?.nome, tur?.nome].filter(Boolean).join(' › ') || String(aula.turmaId)
    }

    function getPlanoDoSlot(aula: typeof turmasDoDia[0]) {
        const segId = String(aula.segmentoId)
        let planoId = rrPlanosSegmento[segId]
        if (!planoId) {
            planoId = sugerirPlanoParaTurma(String(rrAnoSel), String(rrEscolaSel), segId, String(aula.turmaId)) ?? undefined
            if (planoId) setRrPlanosSegmento(prev => ({ ...prev, [segId]: planoId }))
        }
        return planoId ? planos.find(p => String(p.id) === String(planoId)) : null
    }

    function toggleExpandida(turmaId: string) {
        setExpandidas(prev => ({ ...prev, [turmaId]: !prev[turmaId] }))
    }

    function setResultado(turmaId: string, valor: Resultado) {
        setRrResultados(prev => ({ ...prev, [turmaId]: valor }))
    }
    function setRubricaValor(turmaId: string, criterioId: string, valor: number) {
        setRrRubricas(prev => {
            const atual = prev[turmaId] || []
            return { ...prev, [turmaId]: [...atual.filter(r => r.criterioId !== criterioId), { criterioId, valor }] }
        })
    }
    function getRubricaValor(turmaId: string, criterioId: string): number {
        return rrRubricas[turmaId]?.find(r => r.criterioId === criterioId)?.valor ?? 0
    }
    function addEncaminhamento(turmaId: string) {
        const txt = (inputEnc[turmaId] || '').trim()
        if (!txt) return
        setRrEncaminhamentos(prev => ({
            ...prev,
            [turmaId]: [...(prev[turmaId] || []), { id: Date.now().toString(), texto: txt, concluido: false }]
        }))
        setInputEnc(prev => ({ ...prev, [turmaId]: '' }))
    }
    function removeEncaminhamento(turmaId: string, id: string) {
        setRrEncaminhamentos(prev => ({ ...prev, [turmaId]: (prev[turmaId] || []).filter(e => e.id !== id) }))
    }

    // ── Áudio ──
    async function iniciarGravacao(turmaId: string) {
        setErroAudio(prev => ({ ...prev, [turmaId]: null }))
        try {
            await startRecording()
            setGravando(prev => ({ ...prev, [turmaId]: true }))
            setTimer(prev => ({ ...prev, [turmaId]: 0 }))
            timerRefs.current[turmaId] = setInterval(() => {
                setTimer(prev => {
                    const next = (prev[turmaId] || 0) + 1
                    if (next >= MAX_AUDIO) {
                        clearInterval(timerRefs.current[turmaId])
                        pararGravacao(turmaId, next)
                    }
                    return { ...prev, [turmaId]: next }
                })
            }, 1000)
        } catch {
            setErroAudio(prev => ({ ...prev, [turmaId]: 'Microfone indisponível. Verifique as permissões.' }))
        }
    }
    async function pararGravacao(turmaId: string, durSeg?: number) {
        clearInterval(timerRefs.current[turmaId])
        const blob = await stopRecording()
        const b64 = await blobToBase64(blob)
        const mime = blob.type || 'audio/webm'
        const dur = durSeg ?? (timer[turmaId] || 0)
        setRrAudios(prev => ({ ...prev, [turmaId]: { base64: b64, mime, duracao: dur } }))
        setGravando(prev => ({ ...prev, [turmaId]: false }))
    }
    function removerAudio(turmaId: string) {
        setRrAudios(prev => { const n = { ...prev }; delete n[turmaId]; return n })
    }

    function abrirRegistroCompleto(aula: typeof turmasDoDia[0]) {
        const plano = getPlanoDoSlot(aula)
        if (!plano) return
        setPlanoParaRegistro(plano)
        setRegAnoSel(String(aula.anoLetivoId ?? ''))
        setRegEscolaSel(String(aula.escolaId ?? ''))
        setRegSegmentoSel(String(aula.segmentoId))
        setRegTurmaSel(String(aula.turmaId))
        setVerRegistros(false)
        setFiltroRegAno(''); setFiltroRegEscola(''); setFiltroRegSegmento('')
        setFiltroRegTurma(''); setFiltroRegData('')
        setRegistroEditando(null)
        setNovoRegistro({ dataAula: rrData, funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', statusAula: (rrResultados[String(aula.turmaId)] as any) || undefined, anotacoesGerais: '', urlEvidencia: '' } as any)
        setModalRegistro(true)
        setModalRegistroRapido(false)
    }

    const temAlgumDado = turmasDoDia.some(a => {
        const tid = String(a.turmaId)
        return rrResultados[tid] || (rrEncaminhamentos[tid] || []).length > 0 || rrAudios[tid]
    })

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => setModalRegistroRapido(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92dvh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between shrink-0 rounded-t-2xl sm:rounded-t-2xl">
                    <div>
                        <h2 className="text-base font-bold flex items-center gap-2">⚡ Registro Rápido</h2>
                        <p className="text-xs text-emerald-100 mt-0.5">{diaSemana}, {dataFmt}{nomeEscola ? ` · ${nomeEscola}` : ''} · {turmasDoDia.length} turma{turmasDoDia.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={() => setModalRegistroRapido(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition text-lg font-bold">✕</button>
                </div>

                {/* ── Barra de ações (sticky) ── */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0 bg-white">
                    <button
                        onClick={salvarRegistroRapido}
                        disabled={!temAlgumDado}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        💾 Salvar registros
                    </button>
                    <p className="text-xs text-slate-400 flex-1">Preencha ao menos um campo por turma</p>
                </div>

                {/* ── Lista de turmas ── */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {turmasDoDia.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <p className="text-4xl mb-3">📅</p>
                            <p className="text-sm font-semibold">Nenhuma turma agendada para hoje</p>
                            <p className="text-xs mt-1 text-slate-300">Configure a grade semanal em Configurações.</p>
                        </div>
                    ) : turmasDoDia.map(aula => {
                        const turmaId = String(aula.turmaId)
                        const nomeTurma = getNomeTurma(aula)
                        const plano = getPlanoDoSlot(aula)
                        const resultado = (rrResultados[turmaId] || '') as Resultado
                        const encList = rrEncaminhamentos[turmaId] || []
                        const isExpanded = !!expandidas[turmaId]
                        const temDados = !!(rrResultados[turmaId] || encList.length > 0 || rrAudios[turmaId])
                        const audioInfo = rrAudios[turmaId]
                        const estaGravando = !!gravando[turmaId]
                        const timerSec = timer[turmaId] || 0

                        return (
                            <div key={aula.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${isExpanded ? 'border-emerald-300' : 'border-slate-200'}`}>
                                {/* Card header — sempre visível, clicável para expandir */}
                                <button
                                    type="button"
                                    onClick={() => toggleExpandida(turmaId)}
                                    className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left transition ${isExpanded ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {aula.horario && <span className="text-[11px] font-bold text-slate-400 tabular-nums shrink-0">{aula.horario}</span>}
                                            <p className="text-sm font-bold text-slate-800 truncate">{nomeTurma}</p>
                                            {temDados && <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-400" title="Tem dados preenchidos" />}
                                        </div>
                                        {plano
                                            ? <p className="text-xs text-slate-400 mt-0.5 truncate text-left">📚 {plano.titulo}</p>
                                            : <p className="text-xs text-slate-300 italic mt-0.5 text-left">Sem plano vinculado</p>
                                        }
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {plano && !isExpanded && (
                                            <button
                                                type="button"
                                                onClick={e => { e.stopPropagation(); abrirRegistroCompleto(aula) }}
                                                className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold hover:underline transition whitespace-nowrap">
                                                Completo →
                                            </button>
                                        )}
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                                        </svg>
                                    </div>
                                </button>

                                {/* Corpo — só visível quando expandido */}
                                {isExpanded && (
                                    <div className="px-4 py-4 space-y-5">

                                        {/* Link registro completo */}
                                        {plano && (
                                            <div className="flex justify-end">
                                                <button onClick={() => abrirRegistroCompleto(aula)}
                                                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition">
                                                    📋 Registro completo
                                                </button>
                                            </div>
                                        )}

                                        {/* Como foi + Voz — única linha */}
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                {RESULTADO_CFG.map(r => (
                                                    <button
                                                        key={r.value}
                                                        type="button"
                                                        onClick={() => setResultado(turmaId, resultado === r.value ? '' : r.value)}
                                                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl border-2 transition-all ${resultado === r.value ? `${r.bg} ${r.border} ${r.text}` : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                                        {r.emoji} {r.label}
                                                    </button>
                                                ))}

                                                {/* divisor */}
                                                <div className="w-px h-5 bg-slate-200 shrink-0 mx-0.5" />

                                                {/* Mic — idle */}
                                                {!audioInfo && !estaGravando && (
                                                    <button type="button" onClick={() => iniciarGravacao(turmaId)}
                                                        title="Gravar nota de voz"
                                                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-400 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50 transition-all">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z"/>
                                                            <path fillRule="evenodd" d="M5 10a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.93V19h2a1 1 0 110 2H9a1 1 0 110-2h2v-2.07A7 7 0 015 10z" clipRule="evenodd"/>
                                                        </svg>
                                                    </button>
                                                )}

                                                {/* Mic — gravando */}
                                                {estaGravando && (
                                                    <button type="button" onClick={() => pararGravacao(turmaId)}
                                                        title="Parar gravação"
                                                        className="shrink-0 flex items-center gap-1 px-2 h-8 rounded-xl border-2 border-red-300 bg-red-50 text-red-600 text-[10px] font-bold tabular-nums transition-all hover:bg-red-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                                        {String(Math.floor(timerSec/60)).padStart(2,'0')}:{String(timerSec%60).padStart(2,'0')}
                                                    </button>
                                                )}

                                                {/* Mic — com áudio gravado */}
                                                {audioInfo && !estaGravando && (
                                                    <button type="button" onClick={() => removerAudio(turmaId)}
                                                        title={`Áudio de ${audioInfo.duracao}s · toque para remover`}
                                                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-600 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-all">
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z"/>
                                                            <path fillRule="evenodd" d="M5 10a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.93V19h2a1 1 0 110 2H9a1 1 0 110-2h2v-2.07A7 7 0 015 10z" clipRule="evenodd"/>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Player — só quando há áudio */}
                                            {audioInfo && !estaGravando && (
                                                <audio src={base64ToObjectUrl(audioInfo.base64, audioInfo.mime)}
                                                    controls className="w-full mt-2" style={{ height: 28, minWidth: 0 }} />
                                            )}

                                            {/* Erro de microfone */}
                                            {erroAudio[turmaId] && (
                                                <p className="text-[10px] text-red-400 mt-1">{erroAudio[turmaId]}</p>
                                            )}
                                        </div>


                                        {/* Encaminhamentos */}
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">📌 O que fazer na próxima aula</p>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={inputEnc[turmaId] || ''}
                                                    onChange={e => setInputEnc(prev => ({ ...prev, [turmaId]: e.target.value }))}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEncaminhamento(turmaId) } }}
                                                    placeholder="Ex: Retomar atividade 2, revisar ritmo do compasso 3..."
                                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => addEncaminhamento(turmaId)}
                                                    className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition shrink-0">
                                                    + Add
                                                </button>
                                            </div>
                                            {encList.length > 0 && (
                                                <ul className="space-y-1">
                                                    {encList.map(enc => (
                                                        <li key={enc.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                            <span className="flex-1">{enc.texto}</span>
                                                            <button onClick={() => removeEncaminhamento(turmaId, enc.id)} className="text-slate-300 hover:text-red-400 transition shrink-0 font-bold">✕</button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* ── Footer ── */}
                <div className="px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                    <button onClick={() => setModalRegistroRapido(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition">
                        Cancelar
                    </button>
                    <button
                        onClick={salvarRegistroRapido}
                        disabled={!temAlgumDado}
                        className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        💾 Salvar registros
                    </button>
                </div>
            </div>
        </div>
    )
}
