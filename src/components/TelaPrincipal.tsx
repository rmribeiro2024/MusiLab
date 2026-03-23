import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { FloatingPlayer } from './TipTapEditor'

// ── Card de música com player flutuante (padrão idêntico ao TipTapEditor) ─────
function MusicaCardComPlayer({ v, onRemover, getYoutubeId }: {
    v: import('../types').VinculoMusicaPlano
    onRemover: () => void
    getYoutubeId: (url: string) => string | null
}) {
    const [player, setPlayer] = useState<{ url: string; title: string; kind: 'youtube' | 'spotify' } | null>(null)
    if (!v.url) return null
    const ytId = getYoutubeId(v.url)
    const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null
    const isSpotify = /spotify\.com/i.test(v.url)
    const mediaKind: 'youtube' | 'spotify' | null = ytId ? 'youtube' : isSpotify ? 'spotify' : null
    const displayTitle = (v.titulo === '▶ Link YouTube' || v.titulo === '🎵 Link Spotify') ? '' : v.titulo
    return (
        <>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-[#374151] bg-slate-50 dark:bg-white/[0.03]">
                <div className="relative w-14 h-9 shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-slate-200 dark:bg-white/10">
                    <span className="text-lg leading-none">{ytId ? '▶' : '🎵'}</span>
                    {thumbUrl && <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-[#D1D5DB] truncate font-medium">
                        {displayTitle || (ytId ? 'YouTube' : 'Spotify')}
                    </p>
                    {v.confirmadoPor === 'auto' && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded">detectada</span>
                    )}
                </div>
                {mediaKind && (
                    <button type="button"
                        onClick={() => setPlayer({ url: v.url!, title: displayTitle || (ytId ? 'YouTube' : 'Spotify'), kind: mediaKind })}
                        className="shrink-0 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition">
                        {ytId ? '▶ Abrir' : '▶ Player'}
                    </button>
                )}
                <button type="button" onClick={onRemover}
                    className="text-slate-300 hover:text-red-500 transition shrink-0 text-xs">✕</button>
            </div>
            {player && (
                <FloatingPlayer
                    url={player.url}
                    title={player.title}
                    kind={player.kind}
                    onClose={() => setPlayer(null)}
                />
            )}
        </>
    )
}
import { sanitizar } from '../lib/utils'
import { showToast } from '../lib/toast'
import { detectarMusicasNoPlano } from '../lib/detectarMusicas'

import { agruparPorCategoria } from '../lib/taxonomia'

// ── Detecção de conceitos via Gemini (chamada avulsa, sem estado React) ───────
async function analisarConceitosAtividade(nome: string, descricaoHtml: string, apiKey: string): Promise<string[]> {
    const texto = descricaoHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (texto.length < 10) return []
    const prompt = `Você é especialista em pedagogia musical. Analise a atividade abaixo e identifique os conceitos musicais pedagógicos presentes.

Atividade: "${nome}"
Descrição: "${texto.slice(0, 600)}"

Use APENAS conceitos destas categorias:
1. Parâmetros Físicos do Som: Altura, Duração, Intensidade, Timbre
2. Ritmo e Organização Temporal: Pulsação, Andamento, Métrica, Células Rítmicas, Síncope, Ostinato
3. Melodia e Alturas: Fraseado, Contorno, Escalas, Intervalos, Tonalidade
4. Harmonia e Textura: Acordes, Campo Harmônico, Consonância, Textura, Densidade
5. Estrutura e Forma: Motivo, Frase, Período, Formas (AB, ABA, Rondó, Sonata)
6. Dinâmica e Expressividade: Crescendo, Articulação, Caráter
7. Processos Criativos e Ações: Criação, Execução, Apreciação, Escuta ativa
8. Movimento e Corpo: Espaço, Peso, Fluência, Percussão Corporal, Coordenação Motora
9. Contexto e Cultura: Gêneros, História, Etnomusicologia
10. Tecnologia Musical: Áudio, MIDI, Software

Retorne máximo 5 conceitos. Responda APENAS com JSON: {"conceitos": ["conceito1", "conceito2"]}
Se não identificar nenhum, retorne: {"conceitos": []}`
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
        )
        if (!res.ok) return []
        const json = await res.json()
        const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
        if (!match) return []
        const result = JSON.parse(match[1] || match[0])
        return Array.isArray(result.conceitos) ? result.conceitos : []
    } catch { return [] }
}
import { dbSize } from '../lib/db'
import { useInfiniteScroll } from '../lib/hooks'
import { carimbарTimestamp, marcarPendente } from '../lib/offlineSync' // [offlineSync]
import { usePlanosContext, useAnoLetivoContext, useAtividadesContext, useRepertorioContext, useModalContext, useCalendarioContext, useEstrategiasContext } from '../contexts'
import { useBancoPlanos } from './BancoPlanosContext'
import RichTextEditor from './RichTextEditor'
import TipTapEditor from './TipTapEditor'
import { exportarPlanoPDF, previewPlanoPDF, gerarLinkCompartilhavel } from '../utils/pdf'
import ModalAplicarEmTurmas from './modals/ModalAplicarEmTurmas'
import ModalMusicasDetectadas from './modals/ModalMusicasDetectadas'
import type { Plano } from '../types'
import CardAtividadeRoteiro from './CardAtividadeRoteiro'
import { useBancoPainel } from '../hooks/useBancoPainel'
import { BNCC_MUSICA, buscarBNCC, extrairCodigo } from '../lib/bnccMusica'

// ── Modal revisão de conceitos detectados no plano ───────────────────────────
interface ModalConceitosPlanoProps {
    conceitos: string[]
    onConfirmar: (conceitos: string[]) => void
    onFechar: () => void
}
function ModalConceitosPlano({ conceitos, onConfirmar, onFechar }: ModalConceitosPlanoProps) {
    const [draft, setDraft] = React.useState<string[]>([...conceitos])
    const [novoConceito, setNovoConceito] = React.useState('')

    function remover(c: string) {
        setDraft(prev => prev.filter(x => x !== c))
    }
    function adicionar() {
        const val = novoConceito.trim()
        if (!val) return
        setDraft(prev => [...new Set([...prev, val])])
        setNovoConceito('')
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
            <div className="bg-white dark:bg-[#1F2937] rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#374151] flex-shrink-0">
                    <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Conceitos da aula</p>
                        <p className="text-[11px] text-slate-400 dark:text-[#9CA3AF] mt-0.5">Detectados pela IA — revise antes de aplicar</p>
                    </div>
                    <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-base leading-none transition-colors">×</button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                    {draft.length === 0 ? (
                        <p className="text-[11px] text-slate-400 dark:text-[#4B5563] italic">
                            Nenhum conceito identificado — adicione manualmente.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(agruparPorCategoria(draft)).map(([cat, cs]) => (
                                <div key={cat}>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-[#4B5563] mb-1">{cat}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cs.map(c => (
                                            <span key={c} className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-400/10 text-purple-600 dark:text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                                                {c}
                                                <button type="button" onClick={() => remover(c)}
                                                    className="hover:text-rose-500 transition-colors leading-none ml-0.5">×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* + adicionar conceito */}
                    <div className="flex gap-1.5 pt-1">
                        <input
                            type="text"
                            value={novoConceito}
                            onChange={e => setNovoConceito(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
                            placeholder="+ Adicionar conceito"
                            className="flex-1 border border-slate-200 dark:border-[#374151] rounded-lg px-2.5 py-1.5 text-[11px] bg-white dark:bg-[var(--v2-card)] dark:text-white focus:border-indigo-400 outline-none transition-colors"
                        />
                        <button type="button" onClick={adicionar}
                            disabled={!novoConceito.trim()}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40">
                            Add
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-[#374151] flex gap-2 flex-shrink-0">
                    <button type="button" onClick={onFechar}
                        className="flex-1 text-sm border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition">
                        Ignorar
                    </button>
                    <button type="button" onClick={() => onConfirmar(draft)}
                        className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-2 font-medium transition">
                        ✓ Aplicar conceitos
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── LINHA PLANO (memoizado — só re-renderiza quando o próprio plano muda) ──
interface LinhaPlanoProps {
  plano: Plano
  showEscola?: boolean
  toggleFavorito: (plano: Plano, e?: React.MouseEvent) => void
  setPlanoSelecionado: (plano: Plano) => void
  abrirModalRegistro: (plano: Plano, e: React.MouseEvent) => void
  editarPlano: (plano: Plano) => void
  statusDropdownId: string | number | null
  setStatusDropdownId: (id: string | number | null) => void
  onStatusChange: (id: string | number, status: string) => void
}
const STATUS_CORES: Record<string, string> = {
  'Concluído':    '#10b981',
  'Em Andamento': '#5B5FEA',
  'A Fazer':      '#f59e0b',
}
const LinhaPlano = React.memo(({ plano, showEscola = true, toggleFavorito, setPlanoSelecionado, abrirModalRegistro, editarPlano, statusDropdownId, setStatusDropdownId, onStatusChange }: LinhaPlanoProps) => {
    const conceito1 = (plano.conceitos || [])[0] || '';
    const faixa = (plano.faixaEtaria || [])[0] || plano.nivel || '';
    const status = plano.statusPlanejamento || 'A Fazer';
    const dotColor = STATUS_CORES[status] || STATUS_CORES['A Fazer'];
    const isOpen = statusDropdownId === plano.id;
    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors duration-150 group">
            {/* Bolinha de status clicável */}
            <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                <button
                    type="button"
                    title={status}
                    onClick={() => setStatusDropdownId(isOpen ? null : plano.id)}
                    className="w-2.5 h-2.5 rounded-full block p-0 transition-transform hover:scale-150 focus:outline-none"
                    style={{ background: dotColor }}
                />
                {isOpen && (
                    <div className="absolute top-full left-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px] py-1">
                        {(['A Fazer', 'Em Andamento', 'Concluído'] as const).map(s => (
                            <button key={s} type="button"
                                onClick={() => { onStatusChange(plano.id, s); setStatusDropdownId(null); }}
                                className="w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors text-slate-700">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_CORES[s] }} />
                                {s}
                                {status === s && <span className="ml-auto text-slate-400">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button onClick={(e)=>{e.stopPropagation();toggleFavorito(plano,e);}} aria-label={plano.destaque ? 'Remover dos favoritos' : 'Marcar como favorito'} className="text-base shrink-0 opacity-50 hover:opacity-100 transition-opacity">{plano.destaque?'⭐':'☆'}</button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>setPlanoSelecionado(plano)}>
                <div className="flex items-center gap-2 flex-wrap">
                    {plano.numeroAula && <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-full shrink-0">#{plano.numeroAula}</span>}
                    <span className="font-semibold text-slate-800 text-sm truncate">{plano.titulo}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {showEscola && plano.escola && <span className="text-xs text-indigo-600 font-medium">🏫 {plano.escola}</span>}
                    {showEscola && plano.escola && faixa && <span className="text-xs text-slate-300">·</span>}
                    {faixa && <span className="text-xs text-slate-500">{faixa}</span>}
                    {faixa && conceito1 && <span className="text-xs text-slate-300">·</span>}
                    {conceito1 && <span className="text-xs text-teal-600 font-medium">{conceito1}</span>}
                    {(plano.segmentos||[]).map(s=>(
                        <span key={s} className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md">{s}</span>
                    ))}
                    {plano.origemSequenciaId && <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded-md">📚 Seq. #{plano.origemSlotOrdem ?? '?'}</span>}
                </div>
            </div>
            <div className="flex gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity duration-150">
                <button onClick={(e)=>abrirModalRegistro(plano,e)} title="Registro Pós-Aula" aria-label="Registro pós-aula" className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 transition-colors text-sm">📝</button>
                <button onClick={(e)=>{e.stopPropagation();editarPlano(plano);}} title="Editar" aria-label="Editar plano" className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 transition-colors text-sm">✏️</button>
                <button onClick={()=>setPlanoSelecionado(plano)} title="Ver completo" className="p-2 rounded-xl text-indigo-500 hover:bg-indigo-50 transition-colors text-sm">👁</button>
            </div>
        </div>
    );
});

export default function TelaPrincipal() {
    const { anosLetivos, conceitos, setConceitos, faixas, setFaixas, tagsGlobais, setTagsGlobais, unidades, setModalNovaEscola, setNovaEscolaAnoId, setNovaEscolaNome, setModalNovaFaixa, setNovaFaixaNome } = useAnoLetivoContext()
    const { atividades, setAtividades, setAtividadeVinculandoMusica } = useAtividadesContext()
    const { repertorio } = useRepertorioContext()
    const { setModalConfirm } = useModalContext()
    const { periodoDias, setPeriodoDias, dataInicioCustom, setDataInicioCustom, dataFimCustom, setDataFimCustom, gradesSemanas } = useCalendarioContext()
    const { estrategias, adicionarEstrategiaRapida } = useEstrategiasContext()
    const { setModalTemplates } = useBancoPlanos()

    // Itens de planos: via PlanosContext
    const {
        abrirModalRegistro,
        baixarBackup,
        novoPlano,
        userId,
        adicionandoConceito,
        adicionandoUnidade,
        adicionarAtividadeRoteiro,
        adicionarConceitoNovo,
        adicionarDataEdicao,
        adicionarRecurso,
        adicionarUnidadeNova,
        atualizarAtividadeRoteiro,
        busca,
        dataEdicao,
        dragActiveIndex,
        dragOverIndex,
        duracoesSugestao,
        editarPlano,
        escolas,
        segmentosPlanos,
        excluirPlano,
        fecharModal,
        restaurarVersao,
        filtroConceito,
        filtroEscola,
        filtroFaixa,
        filtroFavorito,
        filtroNivel,
        filtroSegmento,
        filtroStatus,
        filtroTag,
        filtroUnidade,
        formExpandido,
        handleDragEnd,
        handleDragEnter,
        handleDragStart,
        materiaisBloqueados,
        modoEdicao,
        modoVisualizacao,
        novaUnidade,
        novoConceito,
        novoRecursoTipo,
        novoRecursoUrl,
        ordenacaoCards,
        planoEditando,
        planos,
        planosFiltrados,
        recursosExpandidos,
        removerAtividadeRoteiro,
        removerDataEdicao,
        removerRecurso,
        salvarPlano,
        statusDropdownId,
        sugerirBNCC,
        gerandoBNCC,
        sugerirObjetivosIA,
        gerandoObjetivos,
        toggleConceito,
        toggleFaixa,
        toggleFavorito,
        toggleRecursosAtiv,
        toggleUnidade,
        setAdicionandoConceito,
        setAdicionandoUnidade,
        setBusca,
        setDataEdicao,
        setFiltroConceito,
        setFiltroEscola,
        setFiltroFaixa,
        setFiltroFavorito,
        setFiltroNivel,
        setFiltroSegmento,
        setFiltroStatus,
        setFiltroTag,
        setFiltroUnidade,
        setFormExpandido,
        setMateriaisBloqueados,
        setModalImportarAtividade,
        setModoVisualizacao,
        setNovaUnidade,
        setNovoConceito,
        setNovoRecursoTipo,
        setNovoRecursoUrl,
        setOrdenacaoCards,
        setPlanoEditando,
        setPlanoSelecionado,
        setPlanos,
        setStatusDropdownId,
        desvincularMusicaDoPlano,
        vincularMusicaAoPlano,
        atualizarKanbanStatus,
        importarAtividadeParaPlano,
        importarMusicaParaPlano,
        setMusicasDetectadas,
        setShowModalMusicas,
    } = usePlanosContext()

    // Constantes estáticas (não precisam vir do ctx)
    const niveis = ["Todos", "Iniciante", "Intermediário", "Avançado"]

    // Unidades temáticas únicas derivadas dos próprios planos
    const unidadesPlanos = useMemo(() =>
        ['Todos', ...Array.from(new Set(planos.map(p => p.unidade).filter((u): u is string => !!u?.trim()))).sort()]
    , [planos])

    // ── Modal Aplicar em Turmas ──
    const [planoParaAplicar, setPlanoParaAplicar] = useState<Plano | null>(null)

    // ── Dropdown Restaurar versão ──
    const [restaurarOpen, setRestaurarOpen] = useState(false)

    // ── Feedback visual do botão Salvar ──
    // salvarPlano() é síncrono (atualiza estado local imediatamente).
    // requestAnimationFrame garante que 'salvando' seja pintado antes de transicionar.
    const [estadoSalvar, setEstadoSalvar] = useState<'idle' | 'salvando' | 'salvo'>('idle')
    const handleSalvarPlano = () => {
        setEstadoSalvar('salvando')
        salvarPlano()
        requestAnimationFrame(() => {
            setEstadoSalvar('salvo')
            setTimeout(() => setEstadoSalvar('idle'), 1400)
        })
        // Fluxo 3: detectar músicas ao salvar
        const detectarAtivo = localStorage.getItem('musilab_detectar_musicas_ao_salvar') !== 'false'
        if (detectarAtivo && planoEditando) {
            const detectadas = detectarMusicasNoPlano(planoEditando, repertorio)
            if (detectadas.length > 0) {
                setMusicasDetectadas(detectadas)
                setShowModalMusicas(true)
            }
        }
        // Fluxo 4: detectar conceitos → abrir modal de revisão (visão unificada do plano)
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
        const planoId = planoEditando?.id
        if (apiKey && planoEditando && planoId) {
            const semConceitos = (planoEditando.atividadesRoteiro || []).filter(
                a => a.descricao?.replace(/<[^>]*>/g, '').trim().length > 10 && !(a.conceitos?.length)
            )
            if (semConceitos.length > 0) {
                setDetectandoConceitos(true)
                Promise.all(semConceitos.map(a => analisarConceitosAtividade(a.nome || '', a.descricao || '', apiKey)))
                    .then(resultados => {
                        // Merge: conceitos Gemini (novos) + conceitos já existentes nas atividades
                        const existentes = (planoEditando.atividadesRoteiro || []).flatMap(a => a.conceitos || [])
                        const novos = resultados.flat()
                        const merged = [...new Set([...existentes, ...novos])].filter(Boolean)
                        // Só abre o modal se houver conceitos ainda não salvos no plano
                        const conceitosJaSalvos = planoEditando.conceitos ?? []
                        const temNovos = merged.some(c => !conceitosJaSalvos.includes(c))
                        if (merged.length > 0 && temNovos) setModalConceitosPlano({ planoId: String(planoId), conceitos: merged })
                    })
                    .catch(() => {/* silencioso */})
                    .finally(() => setDetectandoConceitos(false))
            }
        }
    }

    // ── Modal revisão de conceitos do plano ──
    const [modalConceitosPlano, setModalConceitosPlano] = useState<{ planoId: string; conceitos: string[] } | null>(null)
    const [detectandoConceitos, setDetectandoConceitos] = useState(false)

    // ── Modo do formulário: rápido | completo | detalhado ──
    const [modoForm, setModoForm] = useState<'rapido' | 'completo' | 'detalhado'>('completo')
    const modoRapido = modoForm === 'rapido'
    const modoDetalhado = modoForm === 'detalhado'

    // ── Preview PDF ──
    const [previewPDFUrl, setPreviewPDFUrl] = useState<string | null>(null)
    const [gerandoPreview, setGerandoPreview] = useState(false)
    async function abrirPreviewPDF(plano: Plano) {
        setGerandoPreview(true)
        try {
            const url = await previewPlanoPDF(plano)
            setPreviewPDFUrl(url)
        } catch { /* silencioso */ } finally {
            setGerandoPreview(false)
        }
    }

    // ── Filtros colapsáveis (padrão: aberto, preferência persistida) ──
    const [filtrosPlanos, setFiltrosPlanos] = useState(() => localStorage.getItem('planos_filtros_abertos') !== 'false')
    const toggleFiltrosPlanos = (v: boolean) => { setFiltrosPlanos(v); localStorage.setItem('planos_filtros_abertos', String(v)) }

    // ── Painel contexto da turma ──
    const [contextoAberto, setContextoAberto] = useState(true)

    // ── Banco lateral (painel C) ──
    const {
        open: bancoPanelOpen,
        tab: bancoPanelTab,
        busca: bancoPanelBusca,
        toggle: toggleBancoPainel,
        setOpen: setBancoPanelOpen,
        changeTab: setBancoPanelTab,
        setBusca: setBancoPanelBusca,
    } = useBancoPainel()
    // mantido para compatibilidade com código legado (não mais exposto na UI)
    const [estrategiaBrowserOpen, setEstrategiaBrowserOpen] = useState(false)
    const [buscaEstrategiaBrowser, setBuscaEstrategiaBrowser] = useState('')

    // ── BNCC picker ──
    const [bnccBusca, setBnccBusca] = useState('')

    // ── Gerenciar Níveis — painel inline (substitui modal) ──
    const [gerenciarNiveisOpen, setGerenciarNiveisOpen] = useState(false)
    const [novoNivelInput, setNovoNivelInput] = useState('')
    const adicionarNivel = () => {
        const nome = novoNivelInput.trim()
        if (!nome || faixas.includes(nome)) return
        setFaixas([...faixas, nome])
        setNovoNivelInput('')
    }
    const removerNivel = (f: string) => {
        setFaixas(faixas.filter(x => x !== f))
    }

    // ── Cards colapsáveis do roteiro — Set de IDs expandidos ──
    const [atividadesExpandidas, setAtividadesExpandidas] = useState<Set<string>>(() => new Set())
    const prevAtivCountRef = useRef<number>(-1)
    const toggleExpandidaAtiv = (id: string | number) => {
        setAtividadesExpandidas(prev => {
            const s = new Set(prev)
            s.has(String(id)) ? s.delete(String(id)) : s.add(String(id))
            return s
        })
    }
    // Reset ao trocar de plano
    useEffect(() => {
        setAtividadesExpandidas(new Set())
        prevAtivCountRef.current = (planoEditando?.atividadesRoteiro || []).length
    }, [planoEditando?.id]) // eslint-disable-line

    // Bug 1: sincroniza notasAdaptacao do planoEditando com o estado vivo em planos.
    // salvarNotaAdaptacao atualiza `planos` diretamente; planoEditando é snapshot e fica stale.
    useEffect(() => {
        if (!modoEdicao || !planoEditando?.id) return
        const live = planos.find(p => String(p.id) === String(planoEditando.id))
        if (!live?.notasAdaptacao) return
        const mesmaNota = JSON.stringify(planoEditando.notasAdaptacao ?? []) === JSON.stringify(live.notasAdaptacao)
        if (!mesmaNota) setPlanoEditando({ ...planoEditando, notasAdaptacao: live.notasAdaptacao })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planos])
    // Auto-expande a última atividade adicionada + scroll até ela
    useEffect(() => {
        const ativs = planoEditando?.atividadesRoteiro || []
        if (prevAtivCountRef.current >= 0 && ativs.length > prevAtivCountRef.current && ativs.length > 0) {
            const lastId = ativs[ativs.length - 1].id
            setAtividadesExpandidas(prev => { const s = new Set(prev); s.add(String(lastId)); return s })
            // Scroll suave até a nova atividade
            setTimeout(() => {
                const el = document.querySelector(`[data-activity-id="${lastId}"]`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }, 80)
        }
        prevAtivCountRef.current = ativs.length
    }, [(planoEditando?.atividadesRoteiro || []).length]) // eslint-disable-line



    // ── Reordenação mobile — memoizados + debounce para evitar swap duplo no double-tap ──
    const reorderingRef = useRef(false)
    const handleMoveUp = useCallback((index: number) => {
        if (reorderingRef.current) return
        reorderingRef.current = true
        setTimeout(() => { reorderingRef.current = false }, 300)
        const arr = [...(planoEditando?.atividadesRoteiro || [])]
        if (index === 0) return
        ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
    }, [planoEditando, setPlanoEditando])

    const handleMoveDown = useCallback((index: number) => {
        if (reorderingRef.current) return
        reorderingRef.current = true
        setTimeout(() => { reorderingRef.current = false }, 300)
        const arr = [...(planoEditando?.atividadesRoteiro || [])]
        if (index === arr.length - 1) return
        ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
    }, [planoEditando, setPlanoEditando])

    // ── Autocomplete # para tags na descrição ──
    const [hashDropdown, setHashDropdown] = useState<{ query: string; pos: { top: number; left: number }; atividadeId: string } | null>(null)
    const todasAsTags = useMemo(() => {
        const set = new Set<string>()
        planos.forEach(p => (p.atividadesRoteiro || []).forEach(a => (a.tags || []).forEach(t => set.add(t))))
        ;(planoEditando?.atividadesRoteiro || []).forEach(a => (a.tags || []).forEach(t => set.add(t)))
        return [...set].sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planos, planoEditando?.atividadesRoteiro])

    // ── Picker manual de músicas vinculadas ao plano ──
    const [buscaManual, setBuscaManual] = useState('')
    const [pickerAberto, setPickerAberto] = useState(false)
    // ── Drag-and-drop: só permite arrastar quando iniciado pelo handle ──
    const dragFromHandle = useRef(false)

    // ── ACCORDION do formulário de plano ──
    // Mobile (< 640px): só roteiro aberto por padrão — evita scroll longo entre aulas
    const [secoesForm, setSecoesForm] = useState<Set<string>>(
        () => new Set(['roteiro'])
    )
    function toggleSecaoForm(id: string) {
        setSecoesForm(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
                // Fechando o roteiro → fecha o painel Banco junto
                if (id === 'roteiro') setBancoPanelOpen(false)
            } else {
                next.add(id)
            }
            return next
        })
        // Abrindo outra seção → fecha o Banco (contexto muda)
        if (id !== 'roteiro') setBancoPanelOpen(false)
    }

    // ── Helpers para detecção de tipo de recurso externo ──
    function detectarTipoRecurso(url: string): string {
        if (!url) return 'link'
        if (/youtube\.com|youtu\.be/.test(url)) return 'video'
        if (/spotify\.com\/playlist/.test(url)) return 'playlist'
        if (/spotify\.com/.test(url)) return 'musica'
        if (/drive\.google\.com/.test(url)) return 'link'
        if (/\.pdf(\?|$)/i.test(url)) return 'pdf'
        if (/\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url)) return 'imagem'
        if (/gstatic\.com|googleusercontent\.com|imgur\.com|i\.pinimg\.com/.test(url)) return 'imagem'
        return 'link'
    }
    function getYoutubeId(url: string): string | null {
        const m = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/shorts\/))([a-zA-Z0-9_-]{11})/)
        return m ? m[1] : null
    }
    function getDriveThumb(url: string): string | null {
        const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
        return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w320` : null
    }
    const RECURSO_TIPOS = [
        { value: 'musica',   label: 'Música',         icone: '🎵' },
        { value: 'video',    label: 'Vídeo',           icone: '▶️' },
        { value: 'pdf',      label: 'PDF / Partitura', icone: '📄' },
        { value: 'imagem',   label: 'Imagem',          icone: '🖼️' },
        { value: 'link',     label: 'Link externo',    icone: '🔗' },
        { value: 'playlist', label: 'Playlist',        icone: '🎶' },
    ]
    function getRecursoMeta(tipo: string): { label: string; icone: string; cor: string } {
        const t = tipo === 'youtube' ? 'video' : (tipo === 'spotify' || tipo === 'drive') ? 'musica' : tipo
        const found = RECURSO_TIPOS.find(r => r.value === t)
        const icone = found?.icone ?? '🔗'
        const label = found?.label ?? 'Link'
        const cor =
            t === 'musica'   ? 'bg-green-50 border-green-100 text-green-700' :
            t === 'video'    ? 'bg-red-50 border-red-100 text-red-600' :
            t === 'pdf'      ? 'bg-orange-50 border-orange-100 text-orange-600' :
            t === 'imagem'   ? 'bg-violet-50 border-violet-100 text-violet-600' :
            t === 'playlist' ? 'bg-teal-50 border-teal-100 text-teal-700' :
                               'bg-slate-50 border-slate-100 text-slate-500'
        return { label, icone, cor }
    }

    // ── Detecção de alterações não salvas ──
    const planoOriginalRef = useRef<any>(null)
    const tituloInputRef = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (modoEdicao && planoEditando) {
            planoOriginalRef.current = JSON.parse(JSON.stringify(planoEditando))
            // Foca no título apenas para novos planos (sem título)
            if (!planoEditando.titulo) {
                const t = setTimeout(() => tituloInputRef.current?.focus(), 50)
                return () => clearTimeout(t)
            }
        } else {
            planoOriginalRef.current = null
        }
    }, [modoEdicao]) // eslint-disable-line react-hooks/exhaustive-deps

    function handleFechar() {
        if (planoOriginalRef.current && planoEditando) {
            const changed = JSON.stringify(planoEditando) !== JSON.stringify(planoOriginalRef.current)
            if (changed) {
                setModalConfirm({
                    titulo: 'Alterações não salvas',
                    conteudo: 'Você fez alterações neste plano que ainda não foram salvas.',
                    labelCancelar: 'Descartar alterações',
                    labelConfirm: '💾 Salvar',
                    onCancel: fecharModal,
                    onConfirm: salvarPlano,
                })
                return
            }
        }
        fecharModal()
    }

    // ════ MODO EDIÇÃO (formulário de criação/edição de plano) ════
    if (modoEdicao && planoEditando) {
        return (
    <>
    {/* Container externo — inline, largura total */}
    <div className="w-full mb-10">

        {/* Card principal */}
        <div className="v2-card rounded-2xl border border-slate-200 dark:border-[#374151] overflow-hidden flex flex-col shadow-sm">

            {/* ── HEADER ── */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500 flex-shrink-0"/>
            <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-100 dark:border-[#374151] flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={handleFechar} className="text-slate-400 dark:text-[#9CA3AF] hover:text-slate-600 dark:hover:text-white text-sm font-semibold transition flex items-center gap-1">← Voltar</button>
                    <span className="text-slate-200 dark:text-[#374151]">|</span>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight truncate max-w-xs">
                        {planoEditando.id ? 'Editar plano' : 'Novo plano de aula'}
                    </h3>
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Seletor 3 camadas: rápido · completo · detalhado */}
                    <div className="flex bg-slate-100 dark:bg-[#374151] rounded-xl p-0.5 gap-0.5" title="Modo do formulário">
                        {([
                            { key: 'rapido',    icon: '⚡', title: 'Rápido: só roteiro e dados essenciais' },
                            { key: 'completo',  icon: '📋', title: 'Completo: + objetivos e avaliação' },
                            { key: 'detalhado', icon: '🔬', title: 'Detalhado: todos os campos' },
                        ] as const).map(m => (
                            <button key={m.key} type="button"
                                onClick={() => setModoForm(m.key)}
                                title={m.title}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-[9px] transition-all ${
                                    modoForm === m.key
                                        ? 'bg-white dark:bg-[#1F2937] text-slate-700 dark:text-white shadow-sm'
                                        : 'text-slate-400 dark:text-[#6B7280] hover:text-slate-600 dark:hover:text-[#9CA3AF]'
                                }`}
                            >{m.icon}</button>
                        ))}
                    </div>
                    <button onClick={()=>toggleFavorito(planoEditando)} className={`text-xs px-2.5 py-1.5 rounded-xl transition-colors ${planoEditando.destaque ? 'bg-amber-100 text-amber-700 border border-amber-200 font-semibold' : 'bg-slate-100 dark:bg-[#374151] text-slate-400 dark:text-[#9CA3AF] hover:bg-slate-200 dark:hover:bg-[#4B5563]'}`}>
                        {planoEditando.destaque ? '★' : '☆'}
                    </button>
                </div>
            </div>

            {/* ── CONTEÚDO DO FORM ── */}
            <div className="overflow-y-auto">

                {/* ─── CONTEXTO DA TURMA — painel recolhível ─── */}
                {(() => {
                    const registros = [...(planoEditando.registrosPosAula || [])].sort((a, b) => (b.data || '').localeCompare(a.data || ''))
                    const ultimoReg = registros[0]
                    const musicas = Array.from(new Set(
                        (planoEditando.atividadesRoteiro || [])
                            .flatMap(a => (a.musicasVinculadas || []).map((m: { titulo?: string }) => m.titulo || '').filter(Boolean))
                    ))
                    if (!ultimoReg && musicas.length === 0) return null
                    return (
                        <div className="border-b border-blue-100 bg-blue-50/40">
                            <button type="button" onClick={() => setContextoAberto(v => !v)}
                                className="w-full flex items-center justify-between px-3 sm:px-6 py-3 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">📚 Contexto deste plano</span>
                                    {ultimoReg && <span className="text-[10px] text-blue-400 font-medium">Última aula: {ultimoReg.data ? new Date(ultimoReg.data + 'T12:00').toLocaleDateString('pt-BR') : '—'}</span>}
                                </div>
                                <svg className={`w-3.5 h-3.5 text-blue-400 transition-transform duration-200 ${contextoAberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            {contextoAberto && (
                                <div className="px-3 sm:px-6 pb-4 space-y-3">
                                    {ultimoReg && (
                                        <div className="bg-white rounded-xl border border-blue-100 p-3 text-xs space-y-1.5">
                                            {ultimoReg.resumoAula && <p className="text-slate-700"><span className="font-semibold text-slate-500">Resumo:</span> {ultimoReg.resumoAula}</p>}
                                            {ultimoReg.funcionouBem && <p className="text-emerald-700"><span className="font-semibold">✓ Funcionou:</span> {ultimoReg.funcionouBem}</p>}
                                            {ultimoReg.naoFuncionou && <p className="text-red-600"><span className="font-semibold">✗ Não funcionou:</span> {ultimoReg.naoFuncionou}</p>}
                                            {ultimoReg.proximaAula && <p className="text-indigo-700"><span className="font-semibold">→ Próxima aula:</span> {ultimoReg.proximaAula}</p>}
                                            {registros.length > 1 && <p className="text-slate-400 pt-1">{registros.length} registros no total</p>}
                                        </div>
                                    )}
                                    {musicas.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1.5">Músicas vinculadas</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {musicas.map(m => (
                                                    <span key={m} className="bg-white border border-blue-100 text-blue-700 text-[11px] font-medium px-2 py-1 rounded-lg">🎵 {m}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* ─── TÍTULO + DURAÇÃO + NÍVEL — sempre visíveis ─── */}
                <div className="px-3 sm:px-6 pt-5 pb-5 border-b border-slate-100 dark:border-[#374151] space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                        <div>
                            <label htmlFor="plano-titulo" className="block text-xs font-semibold text-slate-500 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">Título *</label>
                            <input id="plano-titulo" ref={tituloInputRef} type="text" value={planoEditando.titulo} onChange={e=>setPlanoEditando({...planoEditando, titulo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-sm focus:border-indigo-400 outline-none bg-white dark:bg-[var(--v2-card)] text-slate-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">Duração</label>
                            <input type="text" value={planoEditando.duracao} onChange={e=>setPlanoEditando({...planoEditando, duracao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-sm focus:border-indigo-400 outline-none bg-white dark:bg-[var(--v2-card)] text-slate-800 dark:text-white" placeholder="Ex: 50 min" list="duracoes-list" />
                            <datalist id="duracoes-list">{duracoesSugestao.map(d=><option key={d} value={d}/>)}</datalist>
                        </div>
                    </div>
                    {(() => {
                        const unidadeVal = planoEditando.unidade || ''
                        const sugestoesUnidade = unidadesPlanos.filter(u => u !== 'Todos' && u.toLowerCase().includes(unidadeVal.toLowerCase()) && u !== unidadeVal)
                        return (
                            <div className="relative">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-[#6B7280] uppercase tracking-wide mb-1.5">Unidade Temática</label>
                                <input
                                    type="text"
                                    value={unidadeVal}
                                    onChange={e => setPlanoEditando({...planoEditando, unidade: e.target.value})}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-sm focus:border-indigo-400 outline-none bg-white dark:bg-[var(--v2-card)] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#4B5563]"
                                    placeholder="Ex: Flauta Doce, Ritmo e Pulso, Canto Coral..."
                                />
                                {sugestoesUnidade.length > 0 && unidadeVal.length > 0 && (
                                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--v2-card)] border border-slate-200 dark:border-[#374151] rounded-xl shadow-lg overflow-hidden">
                                        {sugestoesUnidade.map(u => (
                                            <button key={u} type="button"
                                                onMouseDown={e => { e.preventDefault(); setPlanoEditando({...planoEditando, unidade: u}) }}
                                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors">
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })()}
                    {/* Segmento — multi-select */}
                    {(() => {
                        const SEGMENTOS_FIXOS = ['Ed. Infantil', 'Fundamental I', 'Fundamental II', 'Ensino Médio']
                        const etapas = planoEditando.etapasEnsino || []
                        const etapasFixas = etapas.filter(e => SEGMENTOS_FIXOS.includes(e))
                        const outrosValor = etapas.find(e => !SEGMENTOS_FIXOS.includes(e))
                        const outrosConfirmado = outrosValor !== undefined && outrosValor !== ''
                        const outrosEditando = outrosValor !== undefined && outrosValor === ''

                        const toggleFixo = (seg: string) => {
                            setPlanoEditando({...planoEditando, etapasEnsino:
                                etapas.includes(seg) ? etapas.filter(e => e !== seg) : [...etapas, seg]
                            })
                        }
                        const abrirOutros = () => {
                            if (outrosValor !== undefined) return // já aberto
                            setPlanoEditando({...planoEditando, etapasEnsino: [...etapas, '']})
                        }
                        const confirmarOutros = (val: string) => {
                            const limpo = val.trim()
                            if (!limpo) {
                                // vazio → remove Outros
                                setPlanoEditando({...planoEditando, etapasEnsino: etapasFixas})
                            } else {
                                setPlanoEditando({...planoEditando, etapasEnsino: [...etapasFixas, limpo]})
                            }
                        }
                        const removerOutros = () => setPlanoEditando({...planoEditando, etapasEnsino: etapasFixas})

                        return (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-[#6B7280] uppercase tracking-wide mb-2">Segmento</label>
                                <div className="flex gap-1.5 flex-wrap items-center">
                                    {SEGMENTOS_FIXOS.map(seg => (
                                        <button key={seg} type="button" onClick={() => toggleFixo(seg)}
                                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${etapas.includes(seg)
                                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                                                : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-[#6B7280] hover:bg-slate-200 dark:hover:bg-white/[0.10]'
                                            }`}>{seg}</button>
                                    ))}
                                    {/* Outros — chip confirmado com × */}
                                    {outrosConfirmado ? (
                                        <span className="inline-flex items-center gap-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg">
                                            {outrosValor}
                                            <button type="button" onClick={removerOutros} className="hover:opacity-70 transition-opacity leading-none">×</button>
                                        </span>
                                    ) : outrosEditando ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            defaultValue=""
                                            onBlur={e => confirmarOutros(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') removerOutros() }}
                                            placeholder="Ex: EJA, Conservatório..."
                                            className="px-3 py-1.5 border border-slate-300 dark:border-[#374151] rounded-lg text-xs focus:border-indigo-400 outline-none bg-white dark:bg-[var(--v2-card)] text-slate-800 dark:text-white placeholder:text-slate-400 w-44"
                                        />
                                    ) : (
                                        <button type="button" onClick={abrirOutros}
                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-[#6B7280] hover:bg-slate-200 dark:hover:bg-white/[0.10]">
                                            Outros
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })()}
                </div>

                {/* ════════════ ACCORDION: MÚSICAS DA AULA ════════════ */}
                <div className="border-b border-slate-100 dark:border-[#374151]">
                    <button type="button" onClick={() => toggleSecaoForm('musicas')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="min-w-0 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">🎵 Músicas da Aula</span>
                            {(planoEditando.musicasVinculadasPlano || []).length > 0 && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">
                                    {(planoEditando.musicasVinculadasPlano || []).length}
                                </span>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('musicas') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('musicas') && (() => {
                    const vinculadas = planoEditando.musicasVinculadasPlano || []
                    const vinculadosIds = new Set(vinculadas.map(v => String(v.musicaId)))

                    const isUrl = (s: string) => /^https?:\/\//i.test(s.trim())
                    const isYoutubeUrl = (s: string) => /youtube\.com|youtu\.be/i.test(s)
                    const isSpotifyUrl = (s: string) => /spotify\.com/i.test(s)

                    const sugestoesManual = (!isUrl(buscaManual) && buscaManual.trim().length >= 2)
                        ? repertorio.filter(m =>
                            !vinculadosIds.has(String(m.id ?? m.titulo)) &&
                            m.titulo.toLowerCase().includes(buscaManual.toLowerCase())
                          ).slice(0, 8)
                        : []

                    function adicionarDeRepertorio(m: import('../types').Musica) {
                        const vinculo = {
                            musicaId: m.id ?? m.titulo,
                            titulo: m.titulo,
                            autor: m.autor,
                            origemDeteccao: 'manual' as const,
                            confirmadoPor: 'professor' as const,
                            confirmadoEm: new Date().toISOString(),
                        }
                        setPlanoEditando({ ...planoEditando, musicasVinculadasPlano: [...vinculadas, vinculo] })
                        vincularMusicaAoPlano(planoEditando.id, vinculo)
                        setBuscaManual('')
                        setPickerAberto(false)
                    }

                    function adicionarUrl(url: string) {
                        const u = url.trim()
                        const ytId = getYoutubeId(u)
                        const titulo = isSpotifyUrl(u) ? '🎵 Link Spotify' : ytId ? '▶ Link YouTube' : u
                        const vinculo = {
                            musicaId: u,
                            titulo,
                            url: u,
                            origemDeteccao: 'manual' as const,
                            confirmadoPor: 'professor' as const,
                            confirmadoEm: new Date().toISOString(),
                        }
                        setPlanoEditando({ ...planoEditando, musicasVinculadasPlano: [...vinculadas, vinculo] })
                        vincularMusicaAoPlano(planoEditando.id, vinculo)
                        setBuscaManual('')
                        setPickerAberto(false)
                    }

                    function adicionarNome(nome: string) {
                        const vinculo = {
                            musicaId: nome,
                            titulo: nome,
                            origemDeteccao: 'nova' as const,
                            confirmadoPor: 'professor' as const,
                            confirmadoEm: new Date().toISOString(),
                        }
                        setPlanoEditando({ ...planoEditando, musicasVinculadasPlano: [...vinculadas, vinculo] })
                        vincularMusicaAoPlano(planoEditando.id, vinculo)
                        setBuscaManual('')
                        setPickerAberto(false)
                    }

                    return (
                        <div className="px-3 sm:px-6 py-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em]">🎵 Músicas da aula</p>
                                <button type="button"
                                    onClick={() => setPickerAberto(o => !o)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-3">
                                    {pickerAberto ? '✕ Fechar' : '+ Adicionar'}
                                </button>
                            </div>

                            {/* Picker */}
                            {pickerAberto && (
                                <div className="mb-3 relative">
                                    <input type="text" autoFocus
                                        placeholder="Nome da música, artista ou link YouTube/Spotify…"
                                        className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        value={buscaManual}
                                        onChange={e => setBuscaManual(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key !== 'Enter') return
                                            const val = buscaManual.trim()
                                            if (!val) return
                                            if (isUrl(val)) { adicionarUrl(val); return }
                                            if (sugestoesManual.length === 0) adicionarNome(val)
                                        }} />

                                    {/* Sugestões do repertório */}
                                    {sugestoesManual.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-10 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden max-h-48 overflow-y-auto">
                                            {sugestoesManual.map(m => (
                                                <button key={String(m.id ?? m.titulo)} type="button"
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0"
                                                    onClick={() => adicionarDeRepertorio(m)}>
                                                    <span className="font-medium text-slate-800">{m.titulo}</span>
                                                    {m.autor && <span className="text-slate-400 ml-2 text-xs">{m.autor}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Preview de URL colada */}
                                    {isUrl(buscaManual) && (
                                        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-400/10 border border-indigo-200 rounded-xl">
                                            <span className="text-lg">{isYoutubeUrl(buscaManual) ? '▶' : isSpotifyUrl(buscaManual) ? '🎵' : '🔗'}</span>
                                            <span className="flex-1 text-xs text-slate-500 truncate">{buscaManual.trim()}</span>
                                            <button type="button"
                                                onClick={() => adicionarUrl(buscaManual)}
                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap transition-colors">
                                                Adicionar →
                                            </button>
                                        </div>
                                    )}

                                    {/* Nome digitado sem match no repertório */}
                                    {!isUrl(buscaManual) && buscaManual.trim().length >= 2 && sugestoesManual.length === 0 && (
                                        <div className="mt-1.5 flex items-center gap-2">
                                            <p className="text-xs text-slate-400">Não encontrada no seu repertório.</p>
                                            <button type="button"
                                                onClick={() => adicionarNome(buscaManual.trim())}
                                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors">
                                                Adicionar mesmo assim →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Empty state */}
                            {vinculadas.length === 0 && !pickerAberto && (
                                <button type="button" onClick={() => setPickerAberto(true)}
                                    className="w-full text-left px-3 py-3 rounded-xl border border-dashed border-slate-200 dark:border-[#374151] hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-400/5 transition-all group space-y-0.5">
                                    <span className="block text-xs text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        Adicione as músicas desta aula — nome, artista ou link do YouTube/Spotify
                                    </span>
                                    <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                                        Links colados no texto do roteiro também aparecem aqui ao salvar
                                    </span>
                                </button>
                            )}

                            {/* Lista de vínculos */}
                            {vinculadas.length > 0 && (
                                <div className="space-y-1.5">
                                    {vinculadas.map(v => {
                                        // Cards com link → MusicaCardComPlayer (FloatingPlayer próprio)
                                        if (v.url) {
                                            return (
                                                <MusicaCardComPlayer
                                                    key={String(v.musicaId)}
                                                    v={v}
                                                    getYoutubeId={getYoutubeId}
                                                    onRemover={() => {
                                                        setPlanoEditando({ ...planoEditando, musicasVinculadasPlano: vinculadas.filter(x => String(x.musicaId) !== String(v.musicaId)) })
                                                        desvincularMusicaDoPlano(planoEditando.id, v.musicaId)
                                                    }}
                                                />
                                            )
                                        }
                                        // Cards sem link → só título (do repertório ou digitado)
                                        return (
                                            <div key={String(v.musicaId)}
                                                className="flex items-center gap-2 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-[#374151] rounded-lg px-3 py-2">
                                                <span className="text-base">🎵</span>
                                                <span className="flex-1 min-w-0 text-sm text-slate-700 dark:text-[#D1D5DB] truncate">
                                                    {v.titulo}
                                                    {v.autor && <span className="text-slate-400 ml-1.5 text-xs">· {v.autor}</span>}
                                                </span>
                                                {v.confirmadoPor === 'auto' && (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded shrink-0">detectada</span>
                                                )}
                                                <button type="button"
                                                    onClick={() => {
                                                        setPlanoEditando({ ...planoEditando, musicasVinculadasPlano: vinculadas.filter(x => String(x.musicaId) !== String(v.musicaId)) })
                                                        desvincularMusicaDoPlano(planoEditando.id, v.musicaId)
                                                    }}
                                                    className="text-slate-300 hover:text-red-500 transition shrink-0 text-xs">✕</button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                    })()}
                </div>

                {/* ── Conceitos do plano — chips sempre visíveis ── */}
                {(planoEditando.conceitos || []).length > 0 && (
                    <div className="px-3 sm:px-6 py-3 border-b border-slate-100 dark:border-[#374151] flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#4B5563] uppercase tracking-[0.08em] shrink-0 mr-0.5">Conceitos</span>
                        {(planoEditando.conceitos || []).map(c => (
                            <span key={c} className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-400/10 text-purple-600 dark:text-purple-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                                {c}
                                <button type="button"
                                    onClick={() => setPlanoEditando({ ...planoEditando, conceitos: (planoEditando.conceitos || []).filter(x => x !== c) })}
                                    className="hover:text-rose-500 transition-colors leading-none ml-0.5">×</button>
                            </span>
                        ))}
                        <button type="button"
                            onClick={() => setSecoesForm(prev => new Set([...prev, 'classificacao']))}
                            className="text-[10px] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 underline transition-colors ml-1">
                            + editar
                        </button>
                    </div>
                )}

                {/* ════════════ ACCORDION: ROTEIRO DE ATIVIDADES ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('roteiro')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Roteiro de Atividades</span>
                            {!secoesForm.has('roteiro') && (() => {
                                const n = (planoEditando.atividadesRoteiro||[]).length
                                if (n === 0) return null
                                let totalMin = 0
                                ;(planoEditando.atividadesRoteiro||[]).forEach(a => { const num = parseInt((a.duracao||'').toString()); if (!isNaN(num)) totalMin += num })
                                const parts = [`${n} atividade${n > 1 ? 's' : ''}`]
                                if (totalMin > 0) parts.push(`${totalMin} min`)
                                return <p className="text-[11px] text-slate-300 mt-0.5">{parts.join(' · ')}</p>
                            })()}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {(planoEditando.atividadesRoteiro||[]).length > 0 && (
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                    {(planoEditando.atividadesRoteiro||[]).length}
                                </span>
                            )}
                            <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 ${secoesForm.has('roteiro') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                    </button>
                    {secoesForm.has('roteiro') && (
                        <div className="px-3 sm:px-6 pt-5 pb-5">
                            {/* ── Alerta de tempo ── */}
                            {(() => {
                                const duracaoAula = parseInt((planoEditando.duracao || '').replace(/[^\d]/g, ''))
                                if (!duracaoAula || isNaN(duracaoAula)) return null
                                let totalRoteiro = 0
                                ;(planoEditando.atividadesRoteiro || []).forEach(a => {
                                    const n = parseInt((a.duracao || '').toString())
                                    if (!isNaN(n)) totalRoteiro += n
                                })
                                if (totalRoteiro === 0 || totalRoteiro <= duracaoAula) return null
                                const excesso = totalRoteiro - duracaoAula
                                return (
                                    <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-xl px-3 py-2.5 mb-3">
                                        <span className="text-base shrink-0">⏱️</span>
                                        <div>
                                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                                Roteiro passa {excesso} min do tempo da aula
                                            </p>
                                            <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                                                Total do roteiro: <strong>{totalRoteiro} min</strong> · Aula: <strong>{duracaoAula} min</strong>. Considere reduzir ou marcar alguma atividade como opcional.
                                            </p>
                                        </div>
                                    </div>
                                )
                            })()}
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setModalTemplates(true)} className="bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                        📐 Templates
                                    </button>
                                    <button type="button" onClick={adicionarAtividadeRoteiro} className="border border-slate-300 dark:border-[#374151] hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                        + Atividade
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleBancoPainel}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${bancoPanelOpen ? 'bg-slate-200 text-slate-700 dark:bg-white/[0.10] dark:text-slate-200' : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] text-slate-600 dark:text-slate-300'}`}
                                    >
                                        📚 Biblioteca
                                    </button>
                                </div>
                            </div>

                            {/* ── Painel Banco lateral (Opção C) ── */}
                            <div className={`flex gap-4 ${bancoPanelOpen ? 'items-start' : ''}`}>
                                <div className="flex-1 min-w-0">
                            {/* ⏱️ Contador de tempo total */}
                            {(() => {
                                const ativs = planoEditando.atividadesRoteiro || [];
                                if (ativs.length === 0) return null;
                                let totalMin = 0; let temIndefinido = false;
                                ativs.forEach(a => {
                                    const num = parseInt((a.duracao||'').toString().trim());
                                    if (!isNaN(num)) totalMin += num;
                                    else if ((a.duracao||'').trim()) temIndefinido = true;
                                });
                                const duracaoAula = parseInt(planoEditando.duracao) || 0;
                                const diff = duracaoAula ? totalMin - duracaoAula : null;
                                const cor = diff === null ? 'text-slate-400 dark:text-slate-500' : diff > 5 ? 'text-red-500' : diff < -5 ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-600';
                                const icon = diff === null ? '⏱' : diff > 5 ? '⚠️' : diff < -5 ? '⏱' : '✓';
                                return (
                                    <div className={`flex items-center gap-1.5 mb-3 text-xs font-medium ${cor}`}>
                                        <svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>
                                        <span>Tempo total: {totalMin} min{temIndefinido ? '+' : ''}</span>
                                        {diff !== null && <span className="opacity-60 font-normal">({diff > 0 ? '+' : ''}{diff} min)</span>}
                                    </div>
                                );
                            })()}

                            {/* ── Empty state ── */}
                            {(!planoEditando.atividadesRoteiro || planoEditando.atividadesRoteiro.length === 0) ? (
                                <div className="flex flex-col items-center gap-3 py-10">
                                    <p className="text-sm font-semibold text-slate-400 dark:text-[#4B5563]">Nenhuma atividade ainda</p>
                                    <button type="button" onClick={adicionarAtividadeRoteiro}
                                        className="mt-1 px-5 py-2 border border-slate-300 dark:border-[#374151] hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl transition-colors">
                                        + Adicionar atividade
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(planoEditando.atividadesRoteiro || []).map((atividade, index) => (
                                        <CardAtividadeRoteiro
                                            key={atividade.id}
                                            atividade={atividade}
                                            index={index}
                                            isOpen={atividadesExpandidas.has(String(atividade.id))}
                                            atividadesCount={(planoEditando.atividadesRoteiro || []).length}
                                            dragActiveIndex={dragActiveIndex}
                                            dragOverIndex={dragOverIndex}
                                            dragFromHandle={dragFromHandle}
                                            onDragStart={handleDragStart}
                                            onDragEnter={handleDragEnter}
                                            onDragEnd={handleDragEnd}
                                            onToggle={toggleExpandidaAtiv}
                                            onFieldChange={atualizarAtividadeRoteiro}
                                            onRemove={removerAtividadeRoteiro}
                                            onMoveUp={() => handleMoveUp(index)}
                                            onMoveDown={() => handleMoveDown(index)}
                                            planoEditando={planoEditando}
                                            setPlanoEditando={setPlanoEditando}
                                            hashDropdown={hashDropdown}
                                            setHashDropdown={setHashDropdown}
                                            todasAsTags={todasAsTags}
                                            onSaveAsStrategy={adicionarEstrategiaRapida}
                                            onVincularMusica={setAtividadeVinculandoMusica}
                                            bancoAtividades={atividades}
                                            setBancoAtividades={setAtividades}
                                            setModalConfirm={setModalConfirm}
                                        />
                                    ))}
                                </div>
                            )}
                                </div>{/* flex-1 min-w-0 */}

                                {/* ── Painel lateral do Banco ── */}
                                {bancoPanelOpen && (
                                    <div className="w-56 shrink-0 border-l border-slate-100 dark:border-[#374151] pl-4 pt-1">
                                        {/* Abas + X */}
                                        <div className="flex items-center mb-3">
                                            {(['atividades', 'estrategias', 'musicas'] as const).map(tab => (
                                                <button key={tab} type="button"
                                                    onClick={() => setBancoPanelTab(tab)}
                                                    className={`flex-1 py-1.5 text-[11px] font-semibold border-b-2 transition-colors ${bancoPanelTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {tab === 'atividades' ? '📦' : tab === 'estrategias' ? '💡' : '🎵'}
                                                    <span className="ml-1">{tab === 'atividades' ? 'Ativ.' : tab === 'estrategias' ? 'Estrat.' : 'Músicas'}</span>
                                                </button>
                                            ))}
                                            <button type="button" onClick={() => setBancoPanelOpen(false)}
                                                className="ml-1 shrink-0 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 transition-colors p-1 rounded"
                                                title="Fechar painel">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>
                                        {/* Busca */}
                                        <input autoFocus type="text" placeholder="Buscar..."
                                            value={bancoPanelBusca}
                                            onChange={e => setBancoPanelBusca(e.target.value)}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-[#374151] rounded-lg text-[11px] mb-2 outline-none bg-white dark:bg-[var(--v2-card)] dark:text-white focus:border-indigo-400"
                                        />
                                        {/* Lista */}
                                        <div className="overflow-y-auto max-h-72 space-y-0.5">
                                            {bancoPanelTab === 'atividades' && (() => {
                                                const items = atividades.filter(a => !bancoPanelBusca || a.nome.toLowerCase().includes(bancoPanelBusca.toLowerCase()))
                                                if (items.length === 0) return <p className="text-[11px] text-slate-400 text-center py-3">Nenhuma atividade no banco</p>
                                                return items.map(a => (
                                                    <button key={a.id} type="button"
                                                        onClick={() => { importarAtividadeParaPlano(a); showToast(`"${a.nome}" adicionada!`, 'success') }}
                                                        className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors group"
                                                    >
                                                        <span className="font-semibold block truncate">{a.nome}</span>
                                                        {a.duracao && <span className="text-slate-400 text-[10px]">{a.duracao} min · </span>}
                                                        <span className="text-indigo-400 text-[10px] opacity-0 group-hover:opacity-100">+ adicionar</span>
                                                    </button>
                                                ))
                                            })()}
                                            {bancoPanelTab === 'estrategias' && (() => {
                                                const expandida = [...atividadesExpandidas][0]
                                                const atividadeAlvo = expandida ? (planoEditando.atividadesRoteiro || []).find((a: any) => String(a.id) === expandida) : null
                                                const items = estrategias.filter(e => !bancoPanelBusca || e.nome.toLowerCase().includes(bancoPanelBusca.toLowerCase()))
                                                return <>
                                                    {atividadeAlvo
                                                        ? <p className="text-[10px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 rounded-lg px-2 py-1 mb-1.5 truncate">→ <span className="font-semibold">{atividadeAlvo.nome || 'Atividade sem nome'}</span></p>
                                                        : <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-white/[0.03] rounded-lg px-2 py-1 mb-1.5">⬆ Expanda uma atividade para vincular</p>
                                                    }
                                                    {items.length === 0
                                                        ? <p className="text-[11px] text-slate-400 text-center py-3">Nenhuma estratégia no banco</p>
                                                        : items.map(est => (
                                                            <button key={est.id} type="button"
                                                                onClick={() => {
                                                                    const expId = [...atividadesExpandidas][0]
                                                                    if (!expId) { showToast('Expanda uma atividade primeiro!', 'error'); return }
                                                                    const idx = (planoEditando.atividadesRoteiro || []).findIndex((a: any) => String(a.id) === expId)
                                                                    if (idx < 0) { showToast('Expanda uma atividade primeiro!', 'error'); return }
                                                                    const vinculadas = planoEditando.atividadesRoteiro[idx].estrategiasVinculadas || []
                                                                    // Checa por ID (novo) ou por nome (dados legados)
                                                                    const jaVinculada = vinculadas.some((v: string) => v === est.id || v === est.nome)
                                                                    if (jaVinculada) { showToast('Estratégia já vinculada!', 'error'); return }
                                                                    const arr = [...planoEditando.atividadesRoteiro]
                                                                    arr[idx] = { ...arr[idx], estrategiasVinculadas: [...(arr[idx].estrategiasVinculadas || []), est.id] }
                                                                    setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
                                                                    showToast(`"${est.nome}" vinculada!`, 'success')
                                                                }}
                                                                className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                                                            >
                                                                <span className="font-semibold block truncate">🧩 {est.nome}</span>
                                                                {est.categoria && <span className="text-slate-400 text-[10px]">{est.categoria}</span>}
                                                            </button>
                                                        ))
                                                    }
                                                </>
                                            })()}
                                            {bancoPanelTab === 'musicas' && (() => {
                                                const expandida = [...atividadesExpandidas][0]
                                                const atividadeAlvo = expandida ? (planoEditando.atividadesRoteiro || []).find((a: any) => String(a.id) === expandida) : null
                                                const items = repertorio.filter(m => !bancoPanelBusca || m.titulo.toLowerCase().includes(bancoPanelBusca.toLowerCase()))
                                                return <>
                                                    {atividadeAlvo
                                                        ? <p className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-2 py-1 mb-1.5 truncate">→ <span className="font-semibold">{atividadeAlvo.nome || 'Atividade sem nome'}</span></p>
                                                        : <p className="text-[10px] text-slate-400 bg-slate-50 dark:bg-white/[0.03] rounded-lg px-2 py-1 mb-1.5">⬆ Expanda uma atividade para vincular</p>
                                                    }
                                                    {items.length === 0
                                                        ? <p className="text-[11px] text-slate-400 text-center py-3">Nenhuma música no repertório</p>
                                                        : items.map(m => (
                                                            <button key={m.id} type="button"
                                                                onClick={() => {
                                                                    const expId = [...atividadesExpandidas][0]
                                                                    if (!expId) { showToast('Expanda uma atividade primeiro!', 'error'); return }
                                                                    const idx = (planoEditando.atividadesRoteiro || []).findIndex((a: any) => String(a.id) === expId)
                                                                    if (idx < 0) { showToast('Expanda uma atividade primeiro!', 'error'); return }
                                                                    const arr = [...planoEditando.atividadesRoteiro]
                                                                    const jaVinculada = (arr[idx].musicasVinculadas || []).find((mv: any) => (typeof mv === 'string' ? mv : mv.id) === m.id)
                                                                    if (jaVinculada) { showToast('Música já vinculada!', 'error'); return }
                                                                    arr[idx] = { ...arr[idx], musicasVinculadas: [...(arr[idx].musicasVinculadas || []), { id: m.id, titulo: m.titulo, autor: m.autor }] }
                                                                    setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
                                                                    showToast(`"${m.titulo}" vinculada!`, 'success')
                                                                }}
                                                                className="w-full text-left px-2.5 py-2 rounded-lg text-[11px] text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                                                            >
                                                                <span className="font-semibold block truncate">🎵 {m.titulo}</span>
                                                                {m.autor && <span className="text-slate-400 text-[10px]">{m.autor}</span>}
                                                            </button>
                                                        ))
                                                    }
                                                </>
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>{/* flex gap-4 */}
                        </div>
                    )}
                </div>


                {/* ════════════ ACCORDION: OBJETIVOS ════════════ */}
                {!modoRapido && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('objetivos')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Objetivos</span>
                            {!secoesForm.has('objetivos') && planoEditando.objetivoGeral && (
                                <p className="text-[11px] text-slate-300 mt-0.5 truncate">{planoEditando.objetivoGeral.replace(/<[^>]*>/g,'').slice(0,70)}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('objetivos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('objetivos') && (
                        <div className="px-3 sm:px-6 pt-3 pb-5 space-y-4">
                            {/* Objetivo Geral — input 1 linha */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">🎯 Objetivo Geral *</label>
                                    <button
                                        type="button"
                                        onClick={sugerirObjetivosIA}
                                        disabled={gerandoObjetivos}
                                        className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {gerandoObjetivos ? '⏳ Gerando...' : '✨ Gerar com IA'}
                                    </button>
                                </div>
                                <textarea
                                    value={(planoEditando.objetivoGeral || '').replace(/<[^>]+>/g, '')}
                                    onChange={e => setPlanoEditando({...planoEditando, objetivoGeral: e.target.value})}
                                    placeholder="Ex: Executar padrão rítmico binário usando percussão corporal..."
                                    rows={2}
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#374151] rounded-xl text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-[var(--v2-card)] placeholder:text-slate-400 dark:placeholder:text-[#4B5563] focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 resize-none transition-colors"
                                />
                            </div>

                            {/* Objetivos Específicos — lista dinâmica, máx 3 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                    🎯 Objetivos Específicos
                                    <span className="ml-1 font-normal normal-case text-slate-400 dark:text-[#4B5563]">(máx. 3)</span>
                                </label>
                                {(() => {
                                    // Normaliza array: lida com legado HTML e strings simples
                                    const rawObjs = planoEditando.objetivosEspecificos || []
                                    const objs: string[] = (() => {
                                        if (rawObjs.length === 0) return []
                                        if (rawObjs.length === 1 && typeof rawObjs[0] === 'string' && rawObjs[0].startsWith('<')) {
                                            // Legado: HTML em um único item — extrai texto de cada <li>
                                            return rawObjs[0]
                                                .replace(/<\/?(ul|ol)>/gi, '')
                                                .split(/<\/li>/i)
                                                .map(s => s.replace(/<[^>]+>/g, '').trim())
                                                .filter(Boolean)
                                        }
                                        return rawObjs  // preserva strings vazias (itens recém-adicionados)
                                    })()
                                    const setObjs = (next: string[]) => setPlanoEditando({...planoEditando, objetivosEspecificos: next})
                                    return (
                                        <div className="space-y-1.5">
                                            {objs.map((obj, i) => (
                                                <div key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2">
                                                    <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0">{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={obj}
                                                        onChange={e => {
                                                            const next = [...objs]
                                                            next[i] = e.target.value
                                                            setObjs(next)
                                                        }}
                                                        className="flex-1 text-sm text-slate-700 dark:text-slate-200 bg-transparent border-none outline-none placeholder:text-slate-400 dark:placeholder:text-[#4B5563]"
                                                        placeholder={
                                                            i === 0 ? "Ex: Reconhecer e distinguir pulsação de ritmo..." :
                                                            i === 1 ? "Ex: Cantar a melodia com afinação e expressão..." :
                                                                       "Ex: Criar uma variação rítmica em grupo..."
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setObjs(objs.filter((_, j) => j !== i))}
                                                        className="shrink-0 text-slate-300 hover:text-red-500 dark:text-[#374151] dark:hover:text-red-400 transition-colors text-sm leading-none mt-0.5"
                                                    >×</button>
                                                </div>
                                            ))}
                                            {objs.length < 3 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setObjs([...objs, ''])}
                                                    className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                                                >
                                                    + Adicionar objetivo
                                                </button>
                                            )}
                                            {objs.length === 0 && (
                                                <p className="text-xs text-slate-400 dark:text-[#4B5563] italic">Nenhum objetivo específico. Clique em "+ Adicionar" para incluir.</p>
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* ════════════ ACCORDION: AVALIAÇÃO ════════════ */}
                {!modoRapido && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('avaliacao')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Avaliação</span>
                            {!secoesForm.has('avaliacao') && (() => {
                                const preview = planoEditando.avaliacaoEvidencia || planoEditando.avaliacaoFechamento || planoEditando.avaliacaoObservacoes
                                return preview ? <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{preview.slice(0,60)}</p> : null
                            })()}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('avaliacao') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('avaliacao') && (
                        <div className="px-3 sm:px-6 pt-4 pb-5 space-y-4">
                            {/* Field 1 — Evidência */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                    📊 O que observarei para saber se funcionou?
                                </label>
                                <div className="border border-slate-200 dark:border-[#374151] rounded-xl overflow-hidden">
                                    <TipTapEditor
                                        key={`tp-ev-${planoEditando.id}`}
                                        initialValue={planoEditando.avaliacaoEvidencia ?? ((!planoEditando.avaliacaoEvidencia && !planoEditando.avaliacaoFechamento && planoEditando.avaliacaoObservacoes) ? planoEditando.avaliacaoObservacoes : '') ?? ''}
                                        onChange={val => setPlanoEditando({ ...planoEditando, avaliacaoEvidencia: val })}
                                        placeholder="Ex: alunos conseguem tocar o ritmo sem apoio visual, participam da improvisação…"
                                        toolbarMode="lists-only"
                                    />
                                </div>
                            </div>
                            {/* Field 2 — Fechamento */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                    ❓ Qual pergunta farei no fechamento?
                                </label>
                                <div className="border border-slate-200 dark:border-[#374151] rounded-xl overflow-hidden">
                                    <TipTapEditor
                                        key={`tp-fech-${planoEditando.id}`}
                                        initialValue={planoEditando.avaliacaoFechamento ?? ''}
                                        onChange={val => setPlanoEditando({ ...planoEditando, avaliacaoFechamento: val })}
                                        placeholder="Ex: O que foi mais difícil? O que vocês notaram sobre o ritmo?"
                                        toolbarMode="lists-only"
                                    />
                                </div>
                            </div>
                            {/* Field 3 — Contingência (opcional) */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                                    ⚡ Se não funcionar, o que farei?
                                    <span className="font-normal text-[#94A3B8] ml-1">(opcional)</span>
                                </label>
                                <div className="border border-slate-200 dark:border-[#374151] rounded-xl overflow-hidden">
                                    <TipTapEditor
                                        key={`tp-cont-${planoEditando.id}`}
                                        initialValue={planoEditando.avaliacaoContingencia ?? ''}
                                        onChange={val => setPlanoEditando({ ...planoEditando, avaliacaoContingencia: val })}
                                        placeholder="Ex: simplificar o ritmo para colcheia/semínima, trocar a atividade pelo jogo de eco…"
                                        toolbarMode="lists-only"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* ════════════ ACCORDION: RECURSOS DA AULA ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('recursos')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="min-w-0 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">🎬 Recursos e Materiais</span>
                            {(planoEditando.recursos || []).length > 0 && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">{(planoEditando.recursos || []).length}</span>
                            )}
                            {(() => { const n = [...planoEditando.materiais, ...(planoEditando.materiaisNecessarios || [])].length; return n > 0 ? <span className="text-[10px] bg-amber-100 text-amber-600 font-bold px-1.5 py-0.5 rounded-full">📦 {n}</span> : null })()}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('recursos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('recursos') && (
                        <div className="px-3 sm:px-6 pt-5 pb-5 space-y-5">
                            {!modoRapido && (
                                <>
                                    <p className="text-[11px] text-slate-400 mb-3">Conteúdos digitais de apoio — músicas, vídeos, partituras, imagens, links.</p>
                                    <div className="flex gap-2 mb-3">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Cole aqui: YouTube, Spotify, PDF, link..." value={novoRecursoUrl}
                                                onChange={e => { setNovoRecursoUrl(e.target.value); if (e.target.value) setNovoRecursoTipo(detectarTipoRecurso(e.target.value)); }}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarRecurso(); } }}
                                                className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                                            {novoRecursoUrl && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base">{getRecursoMeta(detectarTipoRecurso(novoRecursoUrl)).icone}</span>
                                            )}
                                        </div>
                                        <button type="button" onClick={adicionarRecurso} disabled={!novoRecursoUrl.trim()} className="border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">+ Add</button>
                                    </div>
                                </>
                            )}
                            {(planoEditando.recursos || []).length > 0 ? (
                                <div className="space-y-1.5">
                                    {(planoEditando.recursos || []).map((rec, idx) => {
                                        const tipo = rec.tipo || detectarTipoRecurso(rec.url)
                                        const { icone, label, cor } = getRecursoMeta(tipo)
                                        const ytId = (tipo === 'video' || tipo === 'youtube') ? getYoutubeId(rec.url) : null
                                        const driveThumb = /drive\.google\.com/.test(rec.url) ? getDriveThumb(rec.url) : null
                                        const isImagem = tipo === 'imagem'
                                        const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : driveThumb ?? (isImagem ? rec.url : null)
                                        return (
                                            <div key={idx} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${cor.split(' ').slice(0,2).join(' ')}`}>
                                                <a href={rec.url} target="_blank" rel="noopener noreferrer" className="relative w-16 h-11 shrink-0 flex items-center justify-center rounded-lg overflow-hidden bg-white/60">
                                                    <span className="text-xl leading-none">{icone}</span>
                                                    {thumbUrl && <img src={thumbUrl} alt="thumb" className="absolute inset-0 w-full h-full object-cover rounded-lg shadow-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                                                </a>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${cor.split(' ').slice(2).join(' ')}`}>{label}</span>
                                                    <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-400 hover:underline truncate block">{rec.url}</a>
                                                </div>
                                                {modoDetalhado && (
                                                    <button type="button" onClick={() => removerRecurso(idx)} className="text-slate-300 hover:text-red-500 transition shrink-0 text-xs mt-0.5">✕</button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : modoRapido ? (
                                <p className="text-[11px] text-slate-400 italic">Nenhum recurso adicionado.</p>
                            ) : null}

                            {/* ── O que preciso levar (materiais físicos) ── */}
                            {modoDetalhado && (() => {
                                const todosMat = [
                                    ...planoEditando.materiais,
                                    ...(planoEditando.materiaisNecessarios || []).filter(m => !planoEditando.materiais.includes(m))
                                ]
                                const removerMat = (mat: string) => setPlanoEditando({
                                    ...planoEditando,
                                    materiais: planoEditando.materiais.filter(m => m !== mat),
                                    materiaisNecessarios: (planoEditando.materiaisNecessarios || []).filter(m => m !== mat),
                                })
                                const adicionarMat = (val: string) => {
                                    if (!val || todosMat.includes(val)) return
                                    setPlanoEditando({ ...planoEditando, materiaisNecessarios: [...(planoEditando.materiaisNecessarios || []), val] })
                                }
                                return (
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">📦 O que preciso levar</p>
                                        {todosMat.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {todosMat.map((mat, mi) => (
                                                    <span key={mi} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                                                        {mat}
                                                        <button type="button" onClick={() => removerMat(mat)} className="hover:text-rose-500 ml-0.5 leading-none">×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <input type="text" placeholder="Ex: pandeiro, papel A4, bola… Enter ↵"
                                            onKeyDown={(e) => {
                                                const t = e.target as HTMLInputElement
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    adicionarMat(t.value.trim())
                                                    t.value = ''
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-xs outline-none focus:border-indigo-400 bg-white dark:bg-[var(--v2-card)] dark:text-white" />
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>

                {/* ════════════ ACCORDION: BNCC ════════════ */}
                {modoDetalhado && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('bncc')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group bg-slate-50/70 dark:bg-transparent hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">BNCC</span>
                            {!secoesForm.has('bncc') && (planoEditando.habilidadesBNCC||[]).filter(Boolean).length > 0 && (
                                <p className="text-[11px] text-[#94A3B8] mt-0.5">{(planoEditando.habilidadesBNCC||[]).filter(Boolean).length} habilidade{(planoEditando.habilidadesBNCC||[]).filter(Boolean).length > 1 ? 's' : ''}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('bncc') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('bncc') && (
                        <div className="px-3 sm:px-6 pt-5 pb-5 space-y-4">

                            {/* Header */}
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">🏛️ Habilidades BNCC</label>
                                <button type="button" onClick={sugerirBNCC} disabled={gerandoBNCC}
                                    className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-400/10 dark:hover:bg-violet-400/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-400/25 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {gerandoBNCC ? '⏳ Gerando...' : '✨ Sugerir com IA'}
                                </button>
                            </div>

                            {/* Chips de habilidades já adicionadas */}
                            {(planoEditando.habilidadesBNCC || []).filter(Boolean).length > 0 && (
                                <div className="flex flex-col gap-2">
                                    {(planoEditando.habilidadesBNCC || []).filter(Boolean).map((hab, i) => {
                                        const codigo = extrairCodigo(hab)
                                        const encontrado = BNCC_MUSICA.find(b => b.codigo === codigo)
                                        return (
                                            <div key={i} className="flex items-start gap-2.5 bg-violet-50 dark:bg-violet-400/10 border border-violet-200 dark:border-violet-400/20 rounded-xl px-3 py-2.5">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{codigo}</span>
                                                        {encontrado && <span className="text-[10px] font-medium text-violet-400 dark:text-violet-500 bg-violet-100 dark:bg-violet-400/10 px-1.5 py-px rounded-full">{encontrado.anos}</span>}
                                                    </div>
                                                    <p className="text-[11px] text-violet-600 dark:text-violet-400 leading-relaxed">
                                                        {encontrado?.descricao ?? hab.replace(/^EF\w+\s*-?\s*/, '')}
                                                    </p>
                                                </div>
                                                <button type="button"
                                                    onClick={() => setPlanoEditando({...planoEditando, habilidadesBNCC: (planoEditando.habilidadesBNCC || []).filter((_, j) => j !== i)})}
                                                    className="text-violet-300 dark:text-violet-600 hover:text-red-500 dark:hover:text-red-400 transition text-base leading-none shrink-0 mt-0.5">×</button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Busca manual */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={bnccBusca}
                                    onChange={e => setBnccBusca(e.target.value)}
                                    placeholder="Buscar por código (EI03TS01, EF15AR14…) ou palavra (ritmo, improvisação…)"
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#374151] rounded-xl text-sm bg-white dark:bg-[var(--v2-card)] dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#4B5563] focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-colors"
                                />
                                {bnccBusca.trim() && (() => {
                                    const resultados = buscarBNCC(bnccBusca).slice(0, 6)
                                    if (resultados.length === 0) return (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl shadow-xl z-50 px-3 py-2.5">
                                            <p className="text-xs text-slate-400 dark:text-[#6B7280]">Nenhuma habilidade encontrada para "{bnccBusca}"</p>
                                        </div>
                                    )
                                    return (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl shadow-xl z-50 overflow-hidden">
                                            {resultados.map(b => {
                                                const jaAdicionado = (planoEditando.habilidadesBNCC || []).some(h => extrairCodigo(h) === b.codigo)
                                                return (
                                                    <button key={b.codigo} type="button"
                                                        disabled={jaAdicionado}
                                                        onClick={() => {
                                                            if (!jaAdicionado) {
                                                                setPlanoEditando({...planoEditando, habilidadesBNCC: [...(planoEditando.habilidadesBNCC || []), `${b.codigo} - ${b.descricao}`]})
                                                                setBnccBusca('')
                                                            }
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-400/10 transition border-b border-slate-100 dark:border-[#374151] last:border-0 disabled:opacity-40">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{b.codigo}</span>
                                                            <span className="text-[10px] text-slate-400 dark:text-[#6B7280]">{b.anos}</span>
                                                            {jaAdicionado && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-auto font-semibold">✓ adicionado</span>}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 dark:text-[#9CA3AF] line-clamp-2">{b.descricao}</p>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )
                                })()}
                            </div>

                            {/* Empty state */}
                            {(planoEditando.habilidadesBNCC || []).filter(Boolean).length === 0 && !gerandoBNCC && (
                                <p className="text-xs text-slate-400 dark:text-[#4B5563] italic">
                                    Clique em "✨ Sugerir com IA" ou busque um código acima. Habilidades disponíveis: EI01–EI03 (Ed. Infantil) · EF15AR14–EF15AR18 (1º–5º) · EF69AR16–EF69AR25 (6º–9º).
                                </p>
                            )}
                        </div>
                    )}
                </div>
                )}


                {/* ─── ALERTAS PEDAGÓGICOS AUTOMÁTICOS ─── */}
                {(() => {
                    const atividades = planoEditando.atividadesRoteiro || []
                    const musicas = planoEditando.musicasVinculadasPlano || []
                    const alertas: { icon: string; texto: string }[] = []

                    // 1. Roteiro com atividades mas sem fechamento
                    if (atividades.length >= 2) {
                        const temFechamento = atividades.some(a => a.tipoFase === 'fechamento')
                        if (!temFechamento) {
                            alertas.push({ icon: '⚠️', texto: 'Roteiro sem atividade de Fechamento' })
                        }
                    }
                    // 2. Sem músicas vinculadas
                    if (musicas.length === 0 && (planoEditando.titulo || '').trim()) {
                        alertas.push({ icon: '🎵', texto: 'Nenhuma música vinculada ao plano' })
                    }
                    // 3. Objetivos preenchidos mas roteiro vazio
                    const temObjetivos = (planoEditando.objetivoGeral || '').replace(/<[^>]+>/g,'').trim() ||
                                        (planoEditando.objetivosEspecificos || []).filter(Boolean).length > 0
                    if (temObjetivos && atividades.length === 0) {
                        alertas.push({ icon: '📋', texto: 'Objetivos definidos mas roteiro vazio' })
                    }
                    // 4. Avaliação vazia
                    const temAvaliacao = (planoEditando.avaliacaoEvidencia || '').trim() ||
                                        (planoEditando.avaliacaoFechamento || '').trim() ||
                                        (planoEditando.avaliacaoObservacoes || '').trim()
                    if (!temAvaliacao && (planoEditando.titulo || '').trim()) {
                        alertas.push({ icon: '📊', texto: 'Avaliação não preenchida' })
                    }

                    if (alertas.length === 0) return null
                    return (
                        <div className="px-3 sm:px-6 pb-4 pt-1 border-t border-slate-100 dark:border-[#374151]">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1.5 pt-3">Sugestões</p>
                            <div className="flex flex-wrap gap-1.5">
                                {alertas.map((a, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#374151] px-2.5 py-1 rounded-lg">
                                        <span className="text-[10px]">{a.icon}</span>
                                        {a.texto}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )
                })()}

                {/* ─── FOOTER STICKY ─── */}
                <div className="px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[var(--v2-card)] border-t border-slate-100 dark:border-[#374151] sticky bottom-0">
                    <div className="flex gap-2">
                        <button type="button" onClick={handleFechar} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm active:scale-95">Cancelar</button>
                        {planoEditando._historicoVersoes?.length ? (
                            <div className="relative">
                                <button type="button" onClick={() => setRestaurarOpen(o => !o)}
                                    className="h-full px-3 py-2.5 rounded-xl font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors text-sm active:scale-95 whitespace-nowrap">
                                    ↩ Restaurar
                                </button>
                                {restaurarOpen && (
                                    <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl shadow-xl z-50 overflow-y-auto max-h-[280px] min-w-[160px]"
                                         onClick={e => e.stopPropagation()}>
                                        {planoEditando._historicoVersoes.map((v, i) => (
                                            <button key={i} type="button"
                                                onClick={() => { restaurarVersao(planoEditando, v); setRestaurarOpen(false); }}
                                                className="w-full text-left px-4 py-2.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition border-b border-slate-100 last:border-0">
                                                {new Date(v._versaoSalvaEm).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : null}
                        <button type="button"
                            onClick={() => abrirPreviewPDF(planoEditando)}
                            disabled={gerandoPreview}
                            title="Pré-visualizar PDF"
                            className="px-3 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-[#374151] transition-colors text-sm active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-1.5">
                            {gerandoPreview
                                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            }
                            <span className="hidden sm:inline text-xs">Preview</span>
                        </button>
                        <button type="button" onClick={handleSalvarPlano} disabled={estadoSalvar !== 'idle'} className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-all text-sm active:scale-95 ${estadoSalvar === 'salvo' ? 'bg-emerald-500' : estadoSalvar === 'salvando' ? 'bg-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'}`}>
                            {estadoSalvar === 'salvando' ? 'Salvando...' : estadoSalvar === 'salvo' ? '✓ Salvo!' : 'Salvar Plano'}
                        </button>
                    </div>
                </div>
            </div>{/* fim conteúdo */}
        </div>{/* fim card principal */}
    </div>{/* fim container externo */}

    {/* ── MODAL PREVIEW PDF ── */}
    {previewPDFUrl && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewPDFUrl(null)}>
            <div className="bg-white dark:bg-[#1F2937] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#374151]">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">📄 Preview — {planoEditando.titulo}</h3>
                    <div className="flex items-center gap-2">
                        <button type="button"
                            onClick={() => { exportarPlanoPDF(planoEditando); setPreviewPDFUrl(null) }}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
                            ⬇ Baixar PDF
                        </button>
                        <button type="button" onClick={() => setPreviewPDFUrl(null)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg leading-none px-2">✕</button>
                    </div>
                </div>
                <iframe
                    src={previewPDFUrl}
                    className="flex-1 rounded-b-2xl"
                    style={{ minHeight: '70vh' }}
                    title="Preview PDF"
                />
            </div>
        </div>
    )}
    </>
        )
    }

    // ════ LISTA DE PLANOS / DASHBOARD ════
    // ── DASHBOARD ──
    const totalPlanos = planos.length;
    const porStatus = {
        'A Fazer':      planos.filter(p => (p.statusPlanejamento||'A Fazer') === 'A Fazer').length,
        'Em Andamento': planos.filter(p => p.statusPlanejamento === 'Em Andamento').length,
        'Concluído':    planos.filter(p => p.statusPlanejamento === 'Concluído').length,
    };
    const totalRegistros = planos.reduce((s,p) => s + (p.registrosPosAula||[]).length, 0);
    const totalRepertorio = repertorio.length;

    // Próxima aula agendada
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const hojeStr = hoje.toISOString().split('T')[0];
    let proximaAula = null;
    planos.forEach(p => {
        (p.historicoDatas||[]).forEach(d => {
            if (d >= hojeStr) {
                if (!proximaAula || d < proximaAula.data)
                    proximaAula = { data: d, plano: p };
            }
        });
    });

    // Próxima aula pela Grade Semanal (fonte primária)
    const _diasNomes = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    let proximaDataGrade: string | null = null;
    for (let i = 1; i <= 90 && !proximaDataGrade; i++) {
        const d = new Date(hoje); d.setDate(d.getDate() + i);
        const dataStr = d.toISOString().split('T')[0];
        const diaNome = _diasNomes[d.getDay()];
        const temAula = gradesSemanas.some(grade => {
            if (dataStr < grade.dataInicio || dataStr > grade.dataFim) return false;
            return grade.aulas.some(a => a.diaSemana === diaNome && a.turmaId);
        });
        if (temAula) proximaDataGrade = dataStr;
    }
    // Usa grade semanal se disponível, senão fallback para historicoDatas
    const proximaDataCard = proximaDataGrade ?? proximaAula?.data ?? null;

    // Próximo registro pelo Registro Pós-Aula
    let proximoRegistroData = null;
    planos.forEach(p => {
        (p.registrosPosAula||[]).forEach(r => {
            if (r.data >= hojeStr) {
                if (!proximoRegistroData || r.data < proximoRegistroData.data)
                    proximoRegistroData = { data: r.data, plano: p };
            }
        });
    });

    // Último registro feito
    let ultimoRegistro = null;
    planos.forEach(p => {
        (p.registrosPosAula||[]).forEach(r => {
            if (!ultimoRegistro || (r.data||'') >= (ultimoRegistro.data||''))
                ultimoRegistro = { ...r, planoTitulo: p.titulo };
        });
    });

    // Turmas com registros hoje (pelo Registro Pós-Aula)
    const turmasHoje = [];
    planos.forEach(p => {
        (p.registrosPosAula||[]).forEach(r => {
            if (r.data === hojeStr) turmasHoje.push(p.turma || p.titulo);
        });
    });

    // ── AVISO DE ARMAZENAMENTO (#11) ──
    // Só exibe o aviso se o usuário NÃO está logado (sem Supabase).
    // Com conta ativa, os dados ficam na nuvem e o IndexedDB é só cache temporário.
    let avisoStorage = null;
    if (!userId) {
        try {
            const total = dbSize();
            const pct = (total / (5 * 1024 * 1024)) * 100;
            if (pct >= 80)
                avisoStorage = { pct: pct.toFixed(0), usado: (total/1024).toFixed(0), critico: pct >= 95 };
        } catch(e) {}
    }

    return (
    <>
        {/* ── AVISO DE ARMAZENAMENTO (#11) ── */}
        {avisoStorage && (
            <div className={`mb-4 flex items-start gap-3 px-4 py-3 rounded-xl border ${avisoStorage.critico ? 'bg-red-50 border-red-300 text-red-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
                <span className="text-xl shrink-0">{avisoStorage.critico ? '🚨' : '⚠️'}</span>
                <div className="flex-1 text-sm">
                    <p className="font-bold mb-0.5">{avisoStorage.critico ? 'Armazenamento crítico!' : 'Armazenamento quase cheio'}</p>
                    <p>Você está usando <strong>{avisoStorage.pct}%</strong> (~{avisoStorage.usado} KB de 5.120 KB) do espaço local do navegador.
                    {avisoStorage.critico ? ' Salve um backup agora para não perder dados.' : ' Considere exportar um backup em breve.'}</p>
                </div>
                <button onClick={()=>baixarBackup()}
                    className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg ${avisoStorage.critico ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                    ⬇ Backup
                </button>
            </div>
        )}

        {/* ── PAGE HEADER ── */}
        <div className="mb-5">
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-slate-900 dark:text-[#E5E7EB]">Planos de Aula</h1>
        </div>

        {/* ── INDICADORES ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-[#5B5FEA] dark:text-[#818cf8] leading-none mb-[5px]">{totalPlanos}</div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Planos de Aula</div>
            </div>
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-slate-700 dark:text-[#D1D5DB] leading-none mb-[5px]">{totalRegistros}</div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Registros Pós-Aula</div>
            </div>
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-slate-700 dark:text-[#D1D5DB] leading-none mb-[5px]">
                    {proximaDataCard ? new Date(proximaDataCard+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—'}
                </div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Próxima Aula</div>
            </div>
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-slate-700 dark:text-[#D1D5DB] leading-none mb-[5px]">{totalRepertorio}</div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Músicas no Repertório</div>
            </div>
        </div>

        {/* ── SEARCH BAR + FILTROS BTN ── */}
        <div className="flex items-center gap-[8px] mb-[14px]">
            <div className="v2-card flex-1 flex items-center gap-[10px] border-[1.5px] border-[#E6EAF0] dark:border-[#374151] rounded-[9px] px-[14px] py-[9px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[border-color] duration-[120ms] hover:border-[#5B5FEA]/40 dark:hover:border-[#818cf8]/40 cursor-text">
                <span className="text-[13px] text-slate-400 dark:text-[#6b7280] flex-none select-none">🔍</span>
                <input type="text" inputMode="search" value={busca} onChange={e=>setBusca(e.target.value)}
                    placeholder="Buscar por título, objetivo, conceito..."
                    style={{backgroundColor:'var(--v2-card)',colorScheme:'inherit'}}
                    className="flex-1 border-none outline-none text-[14px] tracking-[-0.01em] text-slate-800 dark:text-[#E5E7EB] placeholder:text-slate-400 dark:placeholder:text-[#6b7280]" />
                {busca ? (
                    <button onClick={()=>setBusca('')} className="text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] text-[13px] flex-none transition">✕</button>
                ) : (
                    <span className="text-[10.5px] font-semibold text-slate-400 dark:text-[#6b7280] border border-[#E6EAF0] dark:border-[#374151] rounded-[5px] px-[7px] py-[2px] flex-none tracking-[0.01em] select-none">Ctrl K</span>
                )}
            </div>
            <button onClick={()=>toggleFiltrosPlanos(!filtrosPlanos)}
                className={`flex items-center gap-[5px] px-[12px] py-[8px] rounded-[9px] text-[12.5px] font-medium border-[1.5px] transition-all duration-[120ms] whitespace-nowrap flex-none
                    ${filtrosPlanos
                        ? 'bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 border-[#5B5FEA]/30 dark:border-[#818cf8]/30 text-[#5B5FEA] dark:text-[#818cf8]'
                        : 'v2-card border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/40 hover:text-[#5B5FEA] dark:hover:text-[#818cf8]'}`}>
                <span>{filtrosPlanos ? '▲' : '▼'}</span>
                <span>Filtros</span>
                {(filtroStatus!=='Todos'||filtroFaixa!=='Todos'||filtroFavorito||filtroEscola!=='Todas'||filtroNivel!=='Todos'||filtroConceito!=='Todos') && (
                    <span className="w-[6px] h-[6px] rounded-full bg-[#5B5FEA] dark:bg-[#818cf8] flex-none" />
                )}
            </button>
            {(busca||filtroStatus!=='Todos'||filtroFaixa!=='Todos'||filtroFavorito||filtroEscola!=='Todas'||filtroNivel!=='Todos'||filtroConceito!=='Todos') && (
                <button onClick={()=>{setBusca("");setFiltroEscola("Todas");setFiltroNivel("Todos");setFiltroConceito("Todos");setFiltroFaixa("Todos");setFiltroFavorito(false);setFiltroStatus("Todos");setFiltroTag("Todas");setFiltroSegmento("Todos");setFiltroUnidade("Todos");}}
                    className="px-[10px] py-[8px] rounded-[9px] text-[12px] border-[1.5px] border-red-200 dark:border-red-500/30 text-red-400 hover:text-red-600 v2-card transition-all duration-[120ms] flex-none">
                    ✕
                </button>
            )}
        </div>

        {/* Filtros avançados — colapsáveis */}
        {filtrosPlanos && (
            <div className="v2-card grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4 p-4 border border-[#E6EAF0] dark:border-[#374151] rounded-xl">
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Escola</label><select value={filtroEscola} onChange={e=>setFiltroEscola(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none">{escolas.map(e=><option key={e} value={e}>{e}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Nível</label><select value={filtroNivel} onChange={e=>setFiltroNivel(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none">{niveis.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Segmento</label><select value={filtroSegmento} onChange={e=>setFiltroSegmento(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none">{segmentosPlanos.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Conceito</label><select value={filtroConceito} onChange={e=>setFiltroConceito(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none"><option value="Todos">Todos</option>{conceitos.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Unidade</label><select value={filtroUnidade} onChange={e=>setFiltroUnidade(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none">{unidadesPlanos.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Tag</label><select value={filtroTag} onChange={e=>setFiltroTag(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none"><option value="Todas">Todas</option>{tagsGlobais.map(t=><option key={t} value={t}>#{t}</option>)}</select></div>
            </div>
        )}

        {/* ── Contagem + Ordenar + Modo de visualização ── */}
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-[2px]">
                <span className="text-[11px] text-slate-400 dark:text-[#6b7280] font-medium px-[4px] select-none">Ordenar</span>
                {([{id:'recente',label:'Recente'},{id:'az',label:'A–Z'},{id:'status',label:'Status'},{id:'favoritos',label:'★'}] as const).map(o=>(
                    <button key={o.id} onClick={()=>setOrdenacaoCards(o.id)}
                        className={`px-[8px] py-[3px] rounded-[5px] text-[11px] font-semibold transition-all duration-[120ms] ${ordenacaoCards===o.id ? 'bg-[#5B5FEA] text-white' : 'text-slate-500 dark:text-[#6b7280] hover:text-slate-700 dark:hover:text-[#9CA3AF]'}`}>
                        {o.label}
                    </button>
                ))}
                <span className="w-px h-[14px] bg-[#D1D5DB] dark:bg-[#4B5563] mx-[6px] flex-none" />
                {([
                    {id:'grade',   icon:'fa-table-cells-large', title:'Grade'},
                    {id:'compacto',icon:'fa-list',              title:'Lista'},
                    {id:'kanban',  icon:'fa-table-columns',     title:'Kanban'},
                    {id:'periodo', icon:'fa-calendar-week',     title:'Por Período'},
                    {id:'segmento',icon:'fa-users',             title:'Por Segmento'},
                ] as const).map(m=>(
                    <button key={m.id} onClick={()=>setModoVisualizacao(m.id)} title={m.title}
                        className={`px-[7px] py-[4px] rounded-[5px] transition-all duration-[120ms] ${modoVisualizacao===m.id ? 'bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 text-[#5B5FEA] dark:text-[#818cf8]' : 'text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF]'}`}>
                        <i className={`fas ${m.icon} text-[13px]`} />
                    </button>
                ))}
            </div>
            {planosFiltrados.length < planos.length && (
                <p className="text-[12px] text-slate-400 dark:text-[#6b7280] font-medium">
                    {planosFiltrados.length} de {planos.length} planos
                </p>
            )}
        </div>

        {/* ── MODO GRADE ── */}
        {modoVisualizacao === 'grade' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
                {planosFiltrados.length === 0 && (
                    <div className="col-span-4 text-center py-16">
                        <div className="text-5xl mb-3">📋</div>
                        <p className="text-slate-500 dark:text-[#9CA3AF] font-medium mb-1">{busca||filtroStatus!=='Todos'||filtroFaixa!=='Todos'?'Nenhum plano encontrado com esses filtros.':'Nenhum plano de aula ainda.'}</p>
                        <button onClick={novoPlano} className="mt-4 bg-[#5B5FEA] hover:bg-[#4f53d4] text-white px-5 py-2.5 rounded-xl font-bold transition text-sm">+ Novo Plano de Aula</button>
                    </div>
                )}
                {planosFiltrados.map(plano => {
                    const status = plano.statusPlanejamento || 'A Fazer';
                    const dotColor = status === 'Concluído' ? '#10b981' : status === 'Em Andamento' ? '#5B5FEA' : '#f59e0b';
                    return (
                    <div key={plano.id}
                        className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] card-hover flex flex-col overflow-hidden cursor-pointer"
                        onClick={()=>setPlanoSelecionado(plano)}>
                        <div className="p-[18px] flex-1 relative">
                            {/* Estrela — absoluta topo direito, não ocupa linha */}
                            <button onClick={e=>{e.stopPropagation();toggleFavorito(plano,e);}} title="Favorito"
                                className={`absolute top-[14px] right-[14px] text-[15px] hover:scale-110 transition leading-none ${plano.destaque?'text-amber-400':'text-slate-200/80 dark:text-slate-500/80 hover:text-amber-300'}`}>
                                {plano.destaque?'★':'☆'}
                            </button>

                            {/* Título com dot de status inline */}
                            <div className="flex items-start gap-2 mb-[6px]">
                                <div className="relative shrink-0 mt-[5px]">
                                    <button
                                        onClick={e=>{e.stopPropagation();setStatusDropdownId(statusDropdownId===plano.id?null:plano.id);}}
                                        title={status}
                                        className="w-2 h-2 rounded-full block p-0 hover:scale-150 transition-transform focus:outline-none"
                                        style={{background:dotColor}}
                                    />
                                    {statusDropdownId === plano.id && (
                                        <div className="v2-card absolute top-full left-0 mt-1 border border-[#E6EAF0] dark:border-[#374151] rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px] py-1"
                                             onClick={e=>e.stopPropagation()}>
                                            {(['A Fazer','Em Andamento','Concluído'] as const).map(s => (
                                                <button key={s}
                                                    onClick={()=>{setPlanos(planos.map(p=>p.id===plano.id?{...p,statusPlanejamento:s}:p));setStatusDropdownId(null);}}
                                                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition hover:bg-[#F6F8FB] dark:hover:bg-white/5 text-slate-700 dark:text-[#E5E7EB] ${status===s?'opacity-50 cursor-default':''}`}>
                                                    <span className="w-2 h-2 rounded-full shrink-0" style={{background: STATUS_CORES[s]}} />
                                                    {s}{status===s&&<span className="ml-auto text-slate-400">✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-[#E5E7EB] text-[14px] leading-[1.35] tracking-[-0.01em] line-clamp-2 pr-[24px]">
                                    {plano.titulo === plano.titulo.toUpperCase()
                                        ? plano.titulo.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
                                        : plano.titulo}
                                </h3>
                            </div>

                            {/* Meta — só renderiza se houver info */}
                            {[(plano.faixaEtaria||[])[0],(plano.unidades||[])[0]].filter(Boolean).length > 0 && (
                                <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] mb-[8px] leading-[1.4]">
                                    {[(plano.faixaEtaria||[])[0],(plano.unidades||[])[0]].filter(Boolean).join(' · ')}
                                </p>
                            )}

                            {/* Tags (conceitos) — texto simples, alinhado com meta */}
                            {(plano.conceitos||[]).length > 0 && (
                                <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] leading-[1.4]">
                                    {(plano.conceitos||[]).slice(0,2).join(' · ')}
                                    {(plano.conceitos||[]).length > 2 && <span className="text-slate-400 dark:text-[#6b7280]"> +{(plano.conceitos||[]).length-2}</span>}
                                </p>
                            )}
                        </div>

                        {/* Rodapé — ações à direita */}
                        <div className="border-t border-slate-100 dark:border-slate-700/50 px-[10px] py-[5px] flex justify-end items-center"
                             onClick={e=>e.stopPropagation()}>
                            <button onClick={e=>{e.stopPropagation();setPlanoParaAplicar(plano);}} title="Agendar"
                                className="p-[7px] text-indigo-300/70 dark:text-indigo-400/50 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-md transition-colors duration-[120ms]">
                                <i className="fas fa-calendar text-[14px]" />
                            </button>
                            <button onClick={e=>{e.stopPropagation();editarPlano(plano);}} title="Editar"
                                className="p-[7px] text-amber-300/70 dark:text-amber-400/50 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-md transition-colors duration-[120ms]">
                                <i className="fas fa-pencil text-[14px]" />
                            </button>
                            <button onClick={e=>{e.stopPropagation();exportarPlanoPDF(plano);}} title="Exportar PDF"
                                className="p-[7px] text-emerald-400/70 dark:text-emerald-400/50 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md transition-colors duration-[120ms]">
                                <span className="text-[11px] font-bold tracking-wide">PDF</span>
                            </button>
                            <button onClick={e=>{e.stopPropagation();excluirPlano(plano.id);}} title="Excluir"
                                className="p-[7px] text-slate-300 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors duration-[120ms]">
                                <i className="fas fa-trash-can text-[14px]" />
                            </button>
                        </div>
                    </div>
                    );
                })}
            </div>
        )}

        {/* ── MODO LISTA (COMPACTO) ── */}
        {modoVisualizacao === 'compacto' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {planosFiltrados.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">📋</div>
                        <p className="text-slate-500 font-medium mb-1">
                            {busca || filtroConceito !== 'Todos' || filtroFaixa !== 'Todos' || filtroEscola !== 'Todas' || filtroStatus !== 'Todos'
                                ? 'Nenhum plano encontrado com esses filtros.'
                                : 'Nenhum plano de aula ainda.'}
                        </p>
                        <p className="text-slate-400 text-sm mb-4">
                            {busca || filtroConceito !== 'Todos' || filtroFaixa !== 'Todos' || filtroEscola !== 'Todas' || filtroStatus !== 'Todos'
                                ? 'Tente ajustar os filtros ou criar um novo plano.'
                                : 'Comece criando seu primeiro plano de aula.'}
                        </p>
                        <button onClick={novoPlano} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition text-sm">
                            + Novo Plano de Aula
                        </button>
                    </div>
                )}
                {planosFiltrados.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} statusDropdownId={statusDropdownId} setStatusDropdownId={setStatusDropdownId} onStatusChange={(id, s) => setPlanos(prev => prev.map(p => p.id === id ? {...p, statusPlanejamento: s} : p))} />)}
            </div>
        )}

        {/* ── MODO POR PERÍODO ── */}
        {modoVisualizacao === 'periodo' && (() => {
            const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

            // Calcular datas de início e fim do período
            let dataFim = new Date(); dataFim.setHours(0,0,0,0);
            let dataInicio;
            if (periodoDias === 'custom') {
                if (!dataInicioCustom || !dataFimCustom) {
                    dataInicio = new Date(); dataInicio.setDate(dataInicio.getDate() - 30);
                } else {
                    dataInicio = new Date(dataInicioCustom + 'T00:00:00');
                    dataFim = new Date(dataFimCustom + 'T23:59:59');
                }
            } else {
                dataInicio = new Date(); dataInicio.setDate(dataInicio.getDate() - Number(periodoDias));
            }
            dataInicio.setHours(0,0,0,0);

            // Agrupar por mês
            const grupos = {};
            planosFiltrados.forEach(plano => {
                const datas = plano.historicoDatas || [];
                const ref = datas.length > 0 ? datas[datas.length - 1] : new Date().toISOString().slice(0,10);
                const dataRef = new Date(ref + 'T12:00:00');
                if (dataRef < dataInicio || dataRef > dataFim) return; // fora do período
                const [ano, mes] = ref.split('-');
                const chave = `${ano}-${mes}`;
                if (!grupos[chave]) grupos[chave] = { ano, mes: parseInt(mes), planos: [] };
                grupos[chave].planos.push(plano);
            });

            const ordenado = Object.keys(grupos).sort((a,b)=>b.localeCompare(a));

            return (
                <>
                    {/* Seletor de período */}
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Período</p>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                {d:30,  l:'1 mês'},
                                {d:60,  l:'2 meses'},
                                {d:90,  l:'3 meses'},
                                {d:180, l:'6 meses'},
                                {d:365, l:'1 ano'},
                                {d:'custom', l:'📅 Customizar'}
                            ].map(p=>(
                                <button key={p.d} onClick={()=>setPeriodoDias(p.d)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${periodoDias===p.d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'}`}>
                                    {p.l}
                                </button>
                            ))}
                        </div>
                        {periodoDias === 'custom' && (
                            <div className="flex gap-2 mt-3 items-center flex-wrap">
                                <input type="date" value={dataInicioCustom} onChange={e=>setDataInicioCustom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
                                <span className="text-gray-400">até</span>
                                <input type="date" value={dataFimCustom} onChange={e=>setDataFimCustom(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
                            </div>
                        )}
                    </div>

                    {/* Meses com planos */}
                    {ordenado.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum plano neste período.</p>}
                    <div className="space-y-4">
                        {ordenado.map(chave => {
                            const g = grupos[chave];
                            return (
                                <div key={chave} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                                    <div className="bg-indigo-600 text-white px-4 py-2.5 flex justify-between items-center">
                                        <span className="font-bold text-sm">{mesesNomes[g.mes-1]} {g.ano}</span>
                                        <span className="text-indigo-200 text-xs">{g.planos.length} plano{g.planos.length!==1?'s':''}</span>
                                    </div>
                                    {g.planos.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} statusDropdownId={statusDropdownId} setStatusDropdownId={setStatusDropdownId} onStatusChange={(id, s) => setPlanos(prev => prev.map(p => p.id === id ? {...p, statusPlanejamento: s} : p))} />)}
                                </div>
                            );
                        })}
                    </div>
                </>
            );
        })()}

        {/* ── MODO POR SEGMENTO ── */}
        {modoVisualizacao === 'segmento' && (() => {
            // Agrupa por faixaEtaria[0] ou nivel
            const gruposSegmento = {};
            const semSegmento = [];

            planosFiltrados.forEach(plano => {
                const seg = (plano.faixaEtaria||[])[0] || plano.nivel;
                if (!seg) { semSegmento.push(plano); return; }
                if (!gruposSegmento[seg]) gruposSegmento[seg] = [];
                gruposSegmento[seg].push(plano);
            });

            const segmentosOrdenados = Object.keys(gruposSegmento).sort();

            if (segmentosOrdenados.length === 0 && semSegmento.length === 0)
                return <p className="text-center text-gray-400 py-10">Nenhum plano encontrado.</p>;

            return (
                <div className="space-y-4">
                    {segmentosOrdenados.map(seg => (
                        <div key={seg} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-teal-600 text-white px-4 py-2.5 flex justify-between items-center">
                                <span className="font-bold text-sm">👥 {seg}</span>
                                <span className="text-teal-200 text-xs">{gruposSegmento[seg].length} plano{gruposSegmento[seg].length!==1?'s':''}</span>
                            </div>
                            {gruposSegmento[seg].map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} statusDropdownId={statusDropdownId} setStatusDropdownId={setStatusDropdownId} onStatusChange={(id, s) => setPlanos(prev => prev.map(p => p.id === id ? {...p, statusPlanejamento: s} : p))} />)}
                        </div>
                    ))}
                    {semSegmento.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gray-400 text-white px-4 py-2.5 flex justify-between items-center">
                                <span className="font-bold text-sm">📄 Sem segmento definido</span>
                                <span className="text-gray-200 text-xs">{semSegmento.length} plano{semSegmento.length!==1?'s':''}</span>
                            </div>
                            {semSegmento.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} statusDropdownId={statusDropdownId} setStatusDropdownId={setStatusDropdownId} onStatusChange={(id, s) => setPlanos(prev => prev.map(p => p.id === id ? {...p, statusPlanejamento: s} : p))} />)}
                        </div>
                    )}
                </div>
            );
        })()}

        {/* ── MODO KANBAN ── */}
        {modoVisualizacao === 'kanban' && (() => {
            const COLUNAS: { id: 'rascunho' | 'pronto' | 'aplicado' | 'revisado'; label: string; cor: string; bg: string }[] = [
                { id: 'rascunho',  label: '✏️ Rascunho',  cor: '#64748b', bg: '#f1f5f9' },
                { id: 'pronto',    label: '✅ Pronto',     cor: '#2563eb', bg: '#eff6ff' },
                { id: 'aplicado',  label: '🎵 Aplicado',  cor: '#059669', bg: '#f0fdf4' },
                { id: 'revisado',  label: '🔍 Revisado',  cor: '#7c3aed', bg: '#faf5ff' },
            ]
            const porColuna = (colId: string) =>
                planosFiltrados.filter(p => (p.kanbanStatus ?? 'rascunho') === colId)
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
                    {COLUNAS.map(col => {
                        const itens = porColuna(col.id)
                        return (
                            <div key={col.id} style={{ background: col.bg, borderRadius: 14, padding: '10px 8px', minHeight: 200, border: `1.5px solid ${col.cor}22` }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 4px' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: col.cor }}>{col.label}</span>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: col.cor, background: `${col.cor}18`, borderRadius: 99, padding: '1px 8px' }}>{itens.length}</span>
                                </div>
                                {itens.length === 0 && (
                                    <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>Vazio</p>
                                )}
                                {itens.map(plano => {
                                    const colidx = COLUNAS.findIndex(c => c.id === col.id)
                                    const podeMover = (dir: -1 | 1) => {
                                        const next = COLUNAS[colidx + dir]
                                        if (!next) return null
                                        return (
                                            <button
                                                onClick={() => atualizarKanbanStatus(plano.id, next.id)}
                                                style={{ padding: '2px 7px', fontSize: 11, color: next.cor, background: next.bg, border: `1px solid ${next.cor}44`, borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                                                title={`Mover para ${next.label}`}>
                                                {dir === -1 ? '←' : '→'}
                                            </button>
                                        )
                                    }
                                    return (
                                        <div key={plano.id}
                                            style={{ background: '#fff', borderRadius: 10, padding: '8px 10px', marginBottom: 7, border: '1px solid #e2e8f0', cursor: 'pointer', boxShadow: '0 1px 3px #0001' }}
                                            onClick={() => setPlanoSelecionado(plano)}>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.4, wordBreak: 'break-word' as const }}>{plano.titulo}</p>
                                            {plano.escola && <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 6px' }}>{plano.escola}</p>}
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                {podeMover(-1)}
                                                {podeMover(1)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            )
        })()}

        {/* ── MODAL APLICAR EM TURMAS ── */}
        {planoParaAplicar && (
            <ModalAplicarEmTurmas
                plano={planoParaAplicar}
                onClose={() => setPlanoParaAplicar(null)}
            />
        )}
        <ModalMusicasDetectadas />

        {/* ── Modal revisão de conceitos do plano ── */}
        {modalConceitosPlano && (
            <ModalConceitosPlano
                conceitos={modalConceitosPlano.conceitos}
                onConfirmar={(conceitos) => {
                    const pid = modalConceitosPlano.planoId
                    setPlanos(prev => prev.map(p =>
                        String(p.id) === pid ? { ...p, conceitos } : p
                    ))
                    setPlanoEditando(prev =>
                        prev && String(prev.id) === pid ? { ...prev, conceitos } : prev
                    )
                    setModalConceitosPlano(null)
                    // Abre o accordion de Classificação para o professor ver os chips aplicados
                    setSecoesForm(prev => new Set([...prev, 'classificacao']))
                    showToast('Conceitos do plano atualizados', 'success')
                }}
                onFechar={() => setModalConceitosPlano(null)}
            />
        )}

        {/* ── Indicador sutil enquanto Gemini analisa conceitos ── */}
        {detectandoConceitos && (
            <div className="fixed bottom-20 right-4 z-40 bg-white dark:bg-[#1F2937] border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#9CA3AF]">
                <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                Detectando conceitos…
            </div>
        )}
    </>
    );

}
