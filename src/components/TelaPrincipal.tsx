import React, { useState, useRef, useMemo, useEffect } from 'react'
import { sanitizar } from '../lib/utils'
import { showToast } from '../lib/toast'
import { dbSize } from '../lib/db'
import { useInfiniteScroll } from '../lib/hooks'
import { carimbарTimestamp, marcarPendente } from '../lib/offlineSync' // [offlineSync]
import { usePlanosContext, useAnoLetivoContext, useAtividadesContext, useRepertorioContext, useModalContext, useCalendarioContext, useEstrategiasContext } from '../contexts'
import RichTextEditor from './RichTextEditor'
import { exportarPlanoPDF, gerarLinkCompartilhavel } from '../utils/pdf'
import ModalAplicarEmTurmas from './modals/ModalAplicarEmTurmas'
import ModalMusicasDetectadas from './modals/ModalMusicasDetectadas'
import ModalEstrategiaDetectada from './modals/ModalEstrategiaDetectada'
import type { Plano } from '../types'
import SecaoAdaptacoesTurma from './SecaoAdaptacoesTurma'

// ── LINHA PLANO (memoizado — só re-renderiza quando o próprio plano muda) ──
interface LinhaPlanoProps {
  plano: Plano
  showEscola?: boolean
  toggleFavorito: (plano: Plano, e?: React.MouseEvent) => void
  setPlanoSelecionado: (plano: Plano) => void
  abrirModalRegistro: (plano: Plano, e: React.MouseEvent) => void
  editarPlano: (plano: Plano) => void
}
const LinhaPlano = React.memo(({ plano, showEscola = true, toggleFavorito, setPlanoSelecionado, abrirModalRegistro, editarPlano }: LinhaPlanoProps) => {
    const conceito1 = (plano.conceitos || [])[0] || '';
    const faixa = (plano.faixaEtaria || [])[0] || plano.nivel || '';
    const status = plano.statusPlanejamento || 'A Fazer';
    const statusCfg = {
        'Concluído':    { dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
        'Em Andamento': { dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700' },
        'A Fazer':      { dot: 'bg-slate-300',   badge: 'bg-slate-100 text-slate-500' }
    };
    const sc = statusCfg[status] || statusCfg['A Fazer'];
    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors duration-150 group">
            <div className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
            <button onClick={(e)=>{e.stopPropagation();toggleFavorito(plano,e);}} aria-label={plano.destaque ? 'Remover dos favoritos' : 'Marcar como favorito'} className="text-base shrink-0 opacity-50 hover:opacity-100 transition-opacity">{plano.destaque?'⭐':'☆'}</button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={()=>setPlanoSelecionado(plano)}>
                <div className="flex items-center gap-2 flex-wrap">
                    {plano.numeroAula && <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-full shrink-0">#{plano.numeroAula}</span>}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${sc.badge}`}>{status}</span>
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
    const { anosLetivos, conceitos, setConceitos, faixas, tagsGlobais, setTagsGlobais, unidades, setModalNovaEscola, setNovaEscolaAnoId, setNovaEscolaNome, setModalNovaFaixa, setNovaFaixaNome } = useAnoLetivoContext()
    const { atividades, setAtividades, setAtividadeVinculandoMusica } = useAtividadesContext()
    const { repertorio } = useRepertorioContext()
    const { setModalConfirm } = useModalContext()
    const { periodoDias, setPeriodoDias, dataInicioCustom, setDataInicioCustom, dataFimCustom, setDataFimCustom } = useCalendarioContext()
    const { estrategias } = useEstrategiasContext()

    // Itens de planos: via PlanosContext
    const {
        abrirModalRegistro,
        baixarBackup,
        novoPlano,
        userId,
        setModalTemplates,
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
    } = usePlanosContext()

    // Constantes estáticas (não precisam vir do ctx)
    const niveis = ["Todos", "Iniciante", "Intermediário", "Avançado"]

    // ── Modal Aplicar em Turmas ──
    const [planoParaAplicar, setPlanoParaAplicar] = useState<Plano | null>(null)

    // ── Dropdown Restaurar versão ──
    const [restaurarOpen, setRestaurarOpen] = useState(false)

    // ── Feedback visual do botão Salvar ──
    const [estadoSalvar, setEstadoSalvar] = useState<'idle' | 'salvando' | 'salvo'>('idle')
    const handleSalvarPlano = () => {
        setEstadoSalvar('salvando')
        salvarPlano()
        setTimeout(() => setEstadoSalvar('salvo'), 400)
        setTimeout(() => setEstadoSalvar('idle'), 1900)
    }

    // ── Modo Rápido ──
    const [modoRapido, setModoRapido] = useState(false)

    // ── Filtros colapsáveis (padrão: aberto, preferência persistida) ──
    const [filtrosPlanos, setFiltrosPlanos] = useState(() => localStorage.getItem('planos_filtros_abertos') !== 'false')
    const toggleFiltrosPlanos = (v: boolean) => { setFiltrosPlanos(v); localStorage.setItem('planos_filtros_abertos', String(v)) }

    // ── Painel contexto da turma ──
    const [contextoAberto, setContextoAberto] = useState(true)

    // ── Picker de estratégia por atividade ──
    const [pickerEstrategiaIdx, setPickerEstrategiaIdx] = useState<number | null>(null)
    const [buscaEstrategia, setBuscaEstrategia] = useState('')

    // ── Picker manual de músicas vinculadas ao plano ──
    const [buscaManual, setBuscaManual] = useState('')
    const [pickerAberto, setPickerAberto] = useState(false)

    // ── Drag-and-drop: só permite arrastar quando iniciado pelo handle ──
    const dragFromHandle = useRef(false)

    // ── ACCORDION do formulário de plano ──
    // Mobile (< 640px): só roteiro aberto por padrão — evita scroll longo entre aulas
    const [secoesForm, setSecoesForm] = useState<Set<string>>(
        () => window.innerWidth < 640
            ? new Set(['roteiro'])
            : new Set(['faixaEtaria', 'roteiro', 'materiais', 'objetivos', 'classificacao', 'bncc', 'recursos'])
    )
    function toggleSecaoForm(id: string) {
        setSecoesForm(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
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
    {/* Overlay escuro — só no modo expandido */}
    {formExpandido && <div className="fixed inset-0 bg-black/60 z-40" onClick={()=>setFormExpandido(false)}/>}

    {/* Container externo — inline compacto OU tela cheia */}
    <div className={formExpandido ? "fixed inset-0 z-50 flex items-center justify-center p-2" : "max-w-3xl mx-auto mb-10"}>

        {/* Linha "Voltar" — só no modo compacto */}
        {!formExpandido && (
            <div className="flex items-center gap-3 mb-4">
                <button type="button" onClick={handleFechar} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition-colors flex items-center gap-1.5">← Voltar</button>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{planoEditando.id ? 'Editar plano' : 'Novo plano de aula'}</h2>
                </div>
            </div>
        )}

        {/* Card principal */}
        <div className={`bg-white rounded-2xl overflow-hidden flex flex-col ${formExpandido ? 'w-full h-full max-w-[98vw] max-h-[85dvh] sm:max-h-[97vh] shadow-2xl' : 'shadow-sm border border-slate-200'}`}>

            {/* ── HEADER EXPANDIDO ── */}
            {formExpandido ? (
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center flex-shrink-0">
                    <div>
                        <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide mb-0.5">{planoEditando.id ? 'Editar Plano' : 'Novo Plano'}</p>
                        <h2 className="text-xl font-bold truncate leading-tight">{planoEditando.titulo||"Sem título"}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={()=>toggleFavorito(planoEditando)} className={`text-sm px-3 py-1.5 rounded-xl flex-shrink-0 transition-colors ${planoEditando.destaque ? 'bg-amber-400 text-amber-900 font-bold' : 'bg-white/20 hover:bg-white/30'}`}>
                            {planoEditando.destaque ? '★ Favorito' : '☆ Favoritar'}
                        </button>
                        <button type="button" onClick={()=>setFormExpandido(false)} title="Compactar" className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors text-lg leading-none">⤡</button>
                        <button type="button" onClick={handleFechar} title="Fechar" className="p-2 rounded-xl bg-white/20 hover:bg-red-500/60 text-white transition-colors text-lg leading-none">✕</button>
                    </div>
                </div>
            ) : (
                /* ── HEADER COMPACTO ── */
                <>
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 flex-shrink-0"/>
                    <div className="px-5 py-3.5 flex justify-between items-center border-b border-slate-100 flex-shrink-0">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{planoEditando.id ? 'Editar' : 'Novo'}</p>
                            <h3 className="font-bold text-slate-800 text-sm leading-tight truncate max-w-xs">{planoEditando.titulo||"Sem título"}</h3>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={()=>toggleFavorito(planoEditando)} className={`text-xs px-2.5 py-1.5 rounded-xl transition-colors ${planoEditando.destaque ? 'bg-amber-100 text-amber-700 border border-amber-200 font-semibold' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                                {planoEditando.destaque ? '★' : '☆'}
                            </button>
                            <button type="button" onClick={()=>setFormExpandido(true)} title="Expandir para tela cheia" className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-500 text-slate-400 transition-colors text-base leading-none">⤢</button>
                            <button type="button" onClick={handleFechar} title="Fechar" className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-400 text-slate-400 transition-colors text-base leading-none">✕</button>
                        </div>
                    </div>
                </>
            )}

            {/* ── CONTEÚDO DO FORM (igual nos dois modos) ── */}
            <div className={`overflow-y-auto ${formExpandido ? 'flex-1' : ''}`} style={!formExpandido ? {maxHeight:'calc(100dvh - 260px)'} : {}}>

                {/* ─── MODO RÁPIDO toggle ─── */}
                <div className="px-3 sm:px-6 pt-3 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Modo de edição</span>
                    <button type="button" onClick={() => {
                        const next = !modoRapido
                        setModoRapido(next)
                        setSecoesForm(next
                            ? new Set(['roteiro', 'materiais'])
                            : new Set(['faixaEtaria', 'roteiro', 'materiais', 'objetivos', 'classificacao', 'bncc', 'recursos'])
                        )
                    }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${modoRapido ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                        ⚡ {modoRapido ? 'Modo Rápido (ativo)' : 'Modo Rápido'}
                    </button>
                </div>

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

                {/* ─── TÍTULO + DURAÇÃO — sempre visíveis ─── */}
                <div className="px-3 sm:px-6 pt-5 pb-4 border-b border-slate-100 space-y-4">
                    <div>
                        <label htmlFor="plano-titulo" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Título *</label>
                        <input id="plano-titulo" ref={tituloInputRef} type="text" value={planoEditando.titulo} onChange={e=>setPlanoEditando({...planoEditando, titulo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duração</label>
                        <input type="text" value={planoEditando.duracao} onChange={e=>setPlanoEditando({...planoEditando, duracao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="Ex: 50 min" list="duracoes-list" />
                        <datalist id="duracoes-list">{duracoesSugestao.map(d=><option key={d} value={d}/>)}</datalist>
                    </div>
                </div>

                {/* ════════════ ACCORDION: FAIXA ETÁRIA ════════════ */}
                {!modoRapido && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('faixaEtaria')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Faixa Etária</span>
                            {!secoesForm.has('faixaEtaria') && (planoEditando.faixaEtaria||[]).length > 0 && (
                                <p className="text-[11px] text-slate-300 mt-0.5 truncate">{(planoEditando.faixaEtaria||[]).join(', ')}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('faixaEtaria') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('faixaEtaria') && (
                        <div className="px-3 sm:px-6 pb-5">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Faixa Etária</label>
                                <button type="button" onClick={()=>{ setNovaFaixaNome(''); setModalNovaFaixa(true); }}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                                    title="Adicionar nova faixa etária">+ Nova faixa</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {faixas.slice(1).map(faixa => (
                                    <button key={faixa} type="button" onClick={() => toggleFaixa(faixa)}
                                        className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${planoEditando.faixaEtaria.includes(faixa) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                        {faixa}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* ════════════ ACCORDION: ROTEIRO DE ATIVIDADES ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('roteiro')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
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
                        <div className="px-3 sm:px-6 pb-5">
                            {/* Roteiro de Atividades */}
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">📋 Roteiro de Atividades</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setModalTemplates(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                        📐 Templates
                                    </button>
                                    <button type="button" onClick={adicionarAtividadeRoteiro} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                        + Atividade
                                    </button>
                                    <button type="button" onClick={() => setModalImportarAtividade(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                        📚 Importar
                                    </button>
                                </div>
                            </div>
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
                                const cor = diff === null ? 'text-indigo-700' : diff > 5 ? 'text-red-600' : diff < -5 ? 'text-amber-600' : 'text-green-600';
                                const icon = diff === null ? '⏱️' : diff > 5 ? '⚠️' : diff < -5 ? '💡' : '✅';
                                return (
                                    <div className={`flex items-center gap-2 mb-3 text-sm font-bold ${cor}`}>
                                        <span>{icon} Tempo total: {totalMin} min{temIndefinido ? '+' : ''}</span>
                                        {diff !== null && <span className="font-normal text-xs opacity-80">({diff > 0 ? '+' : ''}{diff} min em relação à duração da aula)</span>}
                                    </div>
                                );
                            })()}

                            {(!planoEditando.atividadesRoteiro || planoEditando.atividadesRoteiro.length === 0) ? (
                                <div className="text-center py-8 text-gray-400">
                                    <p>Nenhuma atividade adicionada ainda.</p>
                                    <p className="text-sm mt-2">Clique em "+ Adicionar Atividade" para começar.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(planoEditando.atividadesRoteiro || []).map((atividade, index) => (
                                        <div key={atividade.id}
                                            draggable
                                            onDragStart={(e) => { if (!dragFromHandle.current) { e.preventDefault(); return; } handleDragStart(index); }}
                                            onDragEnter={() => handleDragEnter(index)}
                                            onDragEnd={() => { dragFromHandle.current = false; handleDragEnd(); }}
                                            onDragOver={e => e.preventDefault()}
                                            className={`bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm transition-opacity hover:border-indigo-200 ${dragActiveIndex === index ? 'dragging' : ''} ${dragOverIndex === index && dragActiveIndex !== index ? 'drag-over' : ''}`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2 select-none">
                                                    <span
                                                        className="hidden sm:inline text-gray-300 hover:text-indigo-400 transition text-lg cursor-grab active:cursor-grabbing touch-none"
                                                        title="Arraste para reordenar"
                                                        onPointerDown={() => { dragFromHandle.current = true; }}
                                                    >⠿</span>
                                                    {/* Botões ↑↓ de reordenação — fallback mobile para drag */}
                                                    <div className="flex sm:hidden gap-1">
                                                        <button type="button"
                                                            onClick={() => { const arr = [...(planoEditando.atividadesRoteiro||[])]; if(index===0) return; arr.unshift(arr.splice(index,1)[0]); setPlanoEditando({...planoEditando, atividadesRoteiro:arr}); }}
                                                            disabled={index===0}
                                                            title="Mover para o início"
                                                            className="p-2.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-lg transition text-sm leading-none">⇈</button>
                                                        <button type="button"
                                                            onClick={() => { const arr = [...(planoEditando.atividadesRoteiro||[])]; if(index===0) return; [arr[index-1],arr[index]]=[arr[index],arr[index-1]]; setPlanoEditando({...planoEditando, atividadesRoteiro:arr}); }}
                                                            disabled={index===0}
                                                            className="p-2.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-lg transition text-sm leading-none">↑</button>
                                                        <button type="button"
                                                            onClick={() => { const arr = [...(planoEditando.atividadesRoteiro||[])]; if(index===arr.length-1) return; [arr[index],arr[index+1]]=[arr[index+1],arr[index]]; setPlanoEditando({...planoEditando, atividadesRoteiro:arr}); }}
                                                            disabled={index===(planoEditando.atividadesRoteiro||[]).length-1}
                                                            className="p-2.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-lg transition text-sm leading-none">↓</button>
                                                        <button type="button"
                                                            onClick={() => { const arr = [...(planoEditando.atividadesRoteiro||[])]; if(index===arr.length-1) return; arr.push(arr.splice(index,1)[0]); setPlanoEditando({...planoEditando, atividadesRoteiro:arr}); }}
                                                            disabled={index===(planoEditando.atividadesRoteiro||[]).length-1}
                                                            title="Mover para o final"
                                                            className="p-2.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded-lg transition text-sm leading-none">⇊</button>
                                                    </div>
                                                    <span className="font-bold text-indigo-700">Atividade {index + 1}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleRecursosAtiv(index)}
                                                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold hover:bg-blue-200"
                                                    >
                                                        📎 Links
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if(!atividade.nome?.trim()) {
                                                                showToast('Nome obrigatório!', 'error');
                                                                return;
                                                            }
                                                            const existe = atividades.find(a => a.nome.toLowerCase().trim() === atividade.nome.toLowerCase().trim());
                                                            if(existe) {
                                                                setModalConfirm({ titulo: 'Atividade já existe', conteudo: `"${atividade.nome}" já existe no Banco de Atividades.\n\nAtualizar?`, labelConfirm: 'Atualizar', onConfirm: () => {
                                                                    const atualizada = {
                                                                        ...existe,
                                                                        descricao: atividade.descricao || existe.descricao,
                                                                        duracao: atividade.duracao || existe.duracao,
                                                                        conceitos: [...new Set([...(existe.conceitos||[]), ...(atividade.conceitos||[])])],
                                                                        tags: [...new Set([...(existe.tags||[]), ...(atividade.tags||[])])],
                                                                        recursos: [...(existe.recursos||[]), ...(atividade.recursos||[])].filter((r,i,a) => a.findIndex(x=>x.url===r.url)===i),
                                                                        faixaEtaria: planoEditando.faixaEtaria || existe.faixaEtaria,
                                                                        escola: planoEditando.escola || existe.escola,
                                                                        unidade: planoEditando.unidades?.[0] || existe.unidade
                                                                    };
                                                                    setAtividades(atividades.map(a => a.id === existe.id ? atualizada : a));
                                                                    showToast('Atividade atualizada no Banco de Atividades!', 'success');
                                                                } });
                                                            } else {
                                                                const nova = {
                                                                    id: Date.now(),
                                                                    nome: atividade.nome,
                                                                    descricao: atividade.descricao || '',
                                                                    duracao: atividade.duracao || '',
                                                                    conceitos: atividade.conceitos || [],
                                                                    tags: atividade.tags || [],
                                                                    recursos: atividade.recursos || [],
                                                                    materiais: [],
                                                                    faixaEtaria: planoEditando.faixaEtaria || [],
                                                                    escola: planoEditando.escola || '',
                                                                    unidade: planoEditando.unidades?.[0] || ''
                                                                };
                                                                setAtividades([...atividades, nova]);
                                                                showToast('Atividade salva no Banco de Atividades!', 'success');
                                                            }
                                                        }}
                                                        className="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-600"
                                                    >
                                                        💾 → Atividades
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removerAtividadeRoteiro(atividade.id)}
                                                        aria-label="Remover atividade"
                                                        title="Remover atividade"
                                                        className="text-red-500 hover:text-red-700 font-bold px-2"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>

                                            {recursosExpandidos[index] && (
                                                <div className="mb-3 p-3 bg-blue-50 rounded border">
                                                    <div className="flex gap-2 mb-2">
                                                        <input type="text" id={`recurso-${index}`} placeholder="URL" className="flex-1 px-2 py-1 border rounded text-sm" />
                                                        <button type="button" onClick={() => {
                                                            const el = document.getElementById(`recurso-${index}`) as HTMLInputElement | null;
                                                            const url = el?.value.trim();
                                                            if(url) {
                                                                const atualizado = [...planoEditando.atividadesRoteiro];
                                                                atualizado[index].recursos = [...(atualizado[index].recursos||[]), {url, tipo:'link'}];
                                                                setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                if (el) el.value = '';
                                                            }
                                                        }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">+</button>
                                                    </div>
                                                    {(atividade.recursos||[]).map((r, ri) => (
                                                        <div key={ri} className="flex items-center gap-2 bg-white p-2 rounded text-xs mb-1">
                                                            <span className="flex-1 truncate">🔗 {r.url}</span>
                                                            <button type="button" onClick={() => {
                                                                const atualizado = [...planoEditando.atividadesRoteiro];
                                                                atualizado[index].recursos.splice(ri, 1);
                                                                setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                            }} className="text-red-500 font-bold">✕</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div className="md:col-span-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <label className="block text-sm font-bold text-gray-700">Nome da Atividade</label>
                                                            <button type="button" onClick={() => setAtividadeVinculandoMusica(atividade.id)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-blue-600">
                                                                🎵 Vincular música
                                                            </button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={atividade.nome}
                                                            onChange={(e) => atualizarAtividadeRoteiro(atividade.id, 'nome', e.target.value)}
                                                            className="w-full px-3 py-2 border-2 rounded-lg"
                                                            placeholder="Ex: Música Tindolelê, Aquecimento Vocal..."
                                                        />
                                                        {/* Músicas Vinculadas */}
                                                        {(atividade.musicasVinculadas||[]).length > 0 && (
                                                            <div className="mt-2 space-y-1">
                                                                {atividade.musicasVinculadas.map((musica, mi) => (
                                                                    <div key={mi} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded text-xs">
                                                                        <span className="text-blue-700">🎵 {musica.titulo} {musica.autor && `- ${musica.autor}`}</span>
                                                                        <button type="button" onClick={() => {
                                                                            const atualizado = [...planoEditando.atividadesRoteiro];
                                                                            atualizado[index].musicasVinculadas = atualizado[index].musicasVinculadas.filter((_, idx) => idx !== mi);
                                                                            setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                        }} className="text-red-500 font-bold hover:text-red-700">×</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-bold text-gray-700 mb-1">⏱️ Duração</label>
                                                        <input
                                                            type="text"
                                                            value={atividade.duracao || ''}
                                                            onChange={(e) => atualizarAtividadeRoteiro(atividade.id, 'duracao', e.target.value)}
                                                            className="w-full px-3 py-2 border-2 rounded-lg"
                                                            placeholder="Ex: 15min"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <label className="block text-sm font-bold text-gray-700">Descrição / Como Fazer</label>
                                                        <button type="button" onClick={() => setAtividadeVinculandoMusica(atividade.id)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-blue-600">
                                                            🎵 Vincular música
                                                        </button>
                                                    </div>
                                                    <RichTextEditor
                                                        value={atividade.descricao}
                                                        onChange={(val) => atualizarAtividadeRoteiro(atividade.id, 'descricao', val)}
                                                        placeholder="Descreva como realizar esta atividade..."
                                                        rows={10}
                                                    />
                                                    {/* Músicas Vinculadas */}
                                                    {(atividade.musicasVinculadas||[]).length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {atividade.musicasVinculadas.map((musica, mi) => (
                                                                <div key={mi} className="flex items-center justify-between bg-blue-50 px-2 py-1 rounded text-xs">
                                                                    <span className="text-blue-700">🎵 {musica.titulo} {musica.autor && `- ${musica.autor}`}</span>
                                                                    <button type="button" onClick={() => {
                                                                        const atualizado = [...planoEditando.atividadesRoteiro];
                                                                        atualizado[index].musicasVinculadas = atualizado[index].musicasVinculadas.filter((_, idx) => idx !== mi);
                                                                        setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                    }} className="text-red-500 font-bold hover:text-red-700">×</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* ── Estratégias Vinculadas ── */}
                                                <div className="mt-3">
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        {(atividade.estrategiasVinculadas || []).map((nome, ei) => (
                                                            <span key={ei} className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-semibold px-2 py-1 rounded-lg">
                                                                🧩 {nome}
                                                                <button type="button" onClick={() => {
                                                                    const arr = [...planoEditando.atividadesRoteiro]
                                                                    arr[index] = { ...arr[index], estrategiasVinculadas: (arr[index].estrategiasVinculadas || []).filter((_, i) => i !== ei) }
                                                                    setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
                                                                }} className="hover:text-red-600 font-bold ml-0.5">×</button>
                                                            </span>
                                                        ))}
                                                        <button type="button"
                                                            onClick={() => { setPickerEstrategiaIdx(pickerEstrategiaIdx === index ? null : index); setBuscaEstrategia('') }}
                                                            className="text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 px-2 py-1 rounded-lg transition-colors">
                                                            + Estratégia
                                                        </button>
                                                    </div>
                                                    {pickerEstrategiaIdx === index && (
                                                        <div className="bg-white border border-violet-200 rounded-xl shadow-lg p-3 mb-2">
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                placeholder="Buscar estratégia..."
                                                                value={buscaEstrategia}
                                                                onChange={e => setBuscaEstrategia(e.target.value)}
                                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs mb-2 focus:border-violet-400 outline-none"
                                                            />
                                                            {estrategias.length === 0
                                                                ? <p className="text-xs text-slate-400 text-center py-2">Nenhuma estratégia na biblioteca ainda.</p>
                                                                : <div className="max-h-40 overflow-y-auto space-y-1">
                                                                    {estrategias
                                                                        .filter(e => !buscaEstrategia || e.nome.toLowerCase().includes(buscaEstrategia.toLowerCase()))
                                                                        .map(e => {
                                                                            const jaVinculada = (atividade.estrategiasVinculadas || []).includes(e.nome)
                                                                            return (
                                                                                <button key={e.id} type="button"
                                                                                    onClick={() => {
                                                                                        if (jaVinculada) return
                                                                                        const arr = [...planoEditando.atividadesRoteiro]
                                                                                        arr[index] = { ...arr[index], estrategiasVinculadas: [...(arr[index].estrategiasVinculadas || []), e.nome] }
                                                                                        setPlanoEditando({ ...planoEditando, atividadesRoteiro: arr })
                                                                                        setPickerEstrategiaIdx(null)
                                                                                    }}
                                                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${jaVinculada ? 'bg-violet-50 text-violet-400 cursor-default' : 'hover:bg-violet-50 text-slate-700 hover:text-violet-700'}`}>
                                                                                    <span className="font-semibold">🧩 {e.nome}</span>
                                                                                    {e.categoria && <span className="text-slate-400 ml-1">· {e.categoria}</span>}
                                                                                    {jaVinculada && <span className="text-violet-400 ml-1">✓</span>}
                                                                                </button>
                                                                            )
                                                                        })}
                                                                </div>
                                                            }
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Conceitos/Tags Editáveis */}
                                                <div className="mt-3 space-y-2">
                                                    <div>
                                                        <div className="flex flex-wrap gap-1 mb-1">
                                                            {(atividade.conceitos||[]).map((c, ci) => (
                                                                <span key={ci} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                                    🎵 {c}
                                                                    <button type="button" onClick={() => {
                                                                        const atualizado = [...planoEditando.atividadesRoteiro];
                                                                        atualizado[index].conceitos = atualizado[index].conceitos.filter((_,idx)=>idx!==ci);
                                                                        setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                    }} className="hover:text-red-600 font-bold">×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Novo conceito + Enter"
                                                                onKeyPress={(e) => {
                                                                    const t = e.target as HTMLInputElement;
                                                                    if(e.key === 'Enter') {
                                                                        let val = t.value.trim();
                                                                        if(val && !(atividade.conceitos||[]).includes(val)) {
                                                                            const atualizado = [...planoEditando.atividadesRoteiro];
                                                                            atualizado[index].conceitos = [...(atualizado[index].conceitos||[]), val];
                                                                            setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                            t.value = '';
                                                                        }
                                                                    }
                                                                }}
                                                                className="flex-1 text-xs px-2 py-1 border rounded"
                                                            />
                                                            <select onChange={(e) => {
                                                                if(e.target.value && !(atividade.conceitos||[]).includes(e.target.value)) {
                                                                    const atualizado = [...planoEditando.atividadesRoteiro];
                                                                    atualizado[index].conceitos = [...(atualizado[index].conceitos||[]), e.target.value];
                                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                    e.target.value = '';
                                                                }
                                                            }} className="text-xs px-2 py-1 border rounded">
                                                                <option value="">+ Conceito</option>
                                                                {conceitos.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap gap-1 mb-1">
                                                            {(atividade.tags||[]).map((t, ti) => (
                                                                <span key={ti} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                                    #{t}
                                                                    <button type="button" onClick={() => {
                                                                        const atualizado = [...planoEditando.atividadesRoteiro];
                                                                        atualizado[index].tags = atualizado[index].tags.filter((_,idx)=>idx!==ti);
                                                                        setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                    }} className="hover:text-red-600 font-bold">×</button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <input
                                                                type="text"
                                                                placeholder="Nova tag + Enter"
                                                                onKeyPress={(e) => {
                                                                    const t = e.target as HTMLInputElement;
                                                                    if(e.key === 'Enter') {
                                                                        let val = t.value.trim().replace(/^#/, '');
                                                                        if(val && !(atividade.tags||[]).includes(val)) {
                                                                            const atualizado = [...planoEditando.atividadesRoteiro];
                                                                            atualizado[index].tags = [...(atualizado[index].tags||[]), val];
                                                                            setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                            t.value = '';
                                                                        }
                                                                    }
                                                                }}
                                                                className="flex-1 text-xs px-2 py-1 border rounded"
                                                            />
                                                            <select onChange={(e) => {
                                                                if(e.target.value && !(atividade.tags||[]).includes(e.target.value)) {
                                                                    const atualizado = [...planoEditando.atividadesRoteiro];
                                                                    atualizado[index].tags = [...(atualizado[index].tags||[]), e.target.value];
                                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                                                    e.target.value = '';
                                                                }
                                                            }} className="text-xs px-2 py-1 border rounded">
                                                                <option value="">+ Tag</option>
                                                                {tagsGlobais.map(t => <option key={t} value={t}>#{t}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ════════════ ACCORDION: MATERIAIS ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('materiais')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Materiais</span>
                            {!secoesForm.has('materiais') && planoEditando.materiais.length > 0 && (
                                <p className="text-[11px] text-slate-300 mt-0.5">{planoEditando.materiais.length} material{planoEditando.materiais.length > 1 ? 'is' : ''}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('materiais') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('materiais') && (
                        <div className="px-3 sm:px-6 pb-5">
                            {/* MATERIAIS - Sistema Inteligente */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">📦 Materiais</label>
                                {/* Sugestões Rápidas (Checkboxes) */}
                                <div className="mb-4">
                                    <p className="text-xs text-slate-400 mb-2">Sugestões do seu histórico:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {(() => {
                                            const materiaisContagem: Record<string, number> = {};
                                            planos.forEach(p => {
                                                (p.materiais || []).forEach(mat => {
                                                    const m = mat.trim();
                                                    if (m && !materiaisBloqueados.includes(m)) {
                                                        materiaisContagem[m] = (materiaisContagem[m] || 0) + 1;
                                                    }
                                                });
                                            });
                                            const sugestoes = Object.entries(materiaisContagem)
                                                .sort((a, b) => b[1] - a[1])
                                                .slice(0, 8)
                                                .map(([mat]) => mat);
                                            const sugestoesPadrao = [
                                                'Flauta doce', 'Instrumentos Orff', 'Aparelho de som',
                                                'Caderno de música', 'Lápis/Canetas', 'Papel pautado',
                                                'Computador/Projetor', 'Caixa de som portátil'
                                            ].filter(m => !materiaisBloqueados.includes(m));
                                            const sugestoesFinais = sugestoes.length > 0 ? sugestoes : sugestoesPadrao;
                                            return sugestoesFinais.map(mat => {
                                                const jaAdicionado = planoEditando.materiais.includes(mat);
                                                return (
                                                    <div key={mat} className="flex items-center gap-1 bg-white p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={jaAdicionado}
                                                                onChange={(e) => {
                                                                    const novos = e.target.checked
                                                                        ? [...planoEditando.materiais, mat]
                                                                        : planoEditando.materiais.filter(m => m !== mat);
                                                                    setPlanoEditando({...planoEditando, materiais: novos});
                                                                }}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-sm flex-1">{mat}</span>
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setModalConfirm({ titulo: 'Remover sugestão?', conteudo: `Remover "${mat}" das sugestões permanentemente?`, labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                                                    setMateriaisBloqueados([...materiaisBloqueados, mat]);
                                                                    if (jaAdicionado) {
                                                                        setPlanoEditando({
                                                                            ...planoEditando,
                                                                            materiais: planoEditando.materiais.filter(m => m !== mat)
                                                                        });
                                                                    }
                                                                } });
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 text-xs font-bold px-1"
                                                            title="Remover das sugestões"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                                {/* Campo Livre para Novos Materiais */}
                                <div>
                                    <p className="text-xs text-slate-400 mb-2">Adicionar outros:</p>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="text"
                                            placeholder="Ex: Pandeiro, Violão, Microfone..."
                                            onKeyPress={(e) => {
                                                const t = e.target as HTMLInputElement;
                                                if (e.key === 'Enter' && t.value.trim()) {
                                                    const novoMat = t.value.trim();
                                                    if (!planoEditando.materiais.includes(novoMat)) {
                                                        setPlanoEditando({
                                                            ...planoEditando,
                                                            materiais: [...planoEditando.materiais, novoMat]
                                                        });
                                                    }
                                                    t.value = '';
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">Pressione Enter para adicionar</p>
                                </div>
                                {/* Lista de Materiais Selecionados */}
                                {planoEditando.materiais.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-purple-300">
                                        <p className="text-xs text-slate-400 mb-2">Selecionados ({planoEditando.materiais.length}):</p>
                                        <div className="flex flex-wrap gap-2">
                                            {planoEditando.materiais.map((mat, idx) => (
                                                <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                                    {mat}
                                                    <button
                                                        type="button"
                                                        onClick={() => setPlanoEditando({
                                                            ...planoEditando,
                                                            materiais: planoEditando.materiais.filter((_, i) => i !== idx)
                                                        })}
                                                        className="text-slate-400 hover:text-red-500 font-bold"
                                                    >
                                                        ✕
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════════ ACCORDION: OBJETIVOS ════════════ */}
                {!modoRapido && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('objetivos')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Objetivos</span>
                            {!secoesForm.has('objetivos') && planoEditando.objetivoGeral && (
                                <p className="text-[11px] text-slate-300 mt-0.5 truncate">{planoEditando.objetivoGeral.replace(/<[^>]*>/g,'').slice(0,70)}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('objetivos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('objetivos') && (
                        <div className="px-3 sm:px-6 pb-5 space-y-5">
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={sugerirObjetivosIA}
                                    disabled={gerandoObjetivos}
                                    className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {gerandoObjetivos ? '⏳ Gerando...' : '✨ Gerar com IA'}
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🎯 Objetivo Geral *</label>
                                <RichTextEditor
                                    value={planoEditando.objetivoGeral}
                                    onChange={val => setPlanoEditando({...planoEditando, objetivoGeral: val})}
                                    placeholder="Descreva o objetivo geral da aula..."
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🎯 Objetivos Específicos</label>
                                <RichTextEditor
                                    value={Array.isArray(planoEditando.objetivosEspecificos)
                                        ? (planoEditando.objetivosEspecificos.length > 0 && typeof planoEditando.objetivosEspecificos[0] === 'string' && !planoEditando.objetivosEspecificos[0].startsWith('<')
                                            ? '<ul>' + planoEditando.objetivosEspecificos.map(o=>`<li>${o}</li>`).join('') + '</ul>'
                                            : planoEditando.objetivosEspecificos.join('\n'))
                                        : planoEditando.objetivosEspecificos}
                                    onChange={val => setPlanoEditando({...planoEditando, objetivosEspecificos: [val]})}
                                    placeholder="Liste os objetivos específicos da aula..."
                                    rows={5}
                                />
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* ════════════ ACCORDION: CLASSIFICAÇÃO PEDAGÓGICA ════════════ */}
                {!modoRapido && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('classificacao')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Classificação Pedagógica</span>
                            {!secoesForm.has('classificacao') && (() => {
                                const parts: string[] = []
                                if (planoEditando.statusPlanejamento) parts.push(planoEditando.statusPlanejamento)
                                if ((planoEditando.conceitos||[]).length > 0) parts.push(`${(planoEditando.conceitos||[]).length} conceito${(planoEditando.conceitos||[]).length > 1 ? 's' : ''}`)
                                if ((planoEditando.tags||[]).length > 0) parts.push(`${(planoEditando.tags||[]).length} tag${(planoEditando.tags||[]).length > 1 ? 's' : ''}`)
                                return parts.length > 0 ? <p className="text-[11px] text-slate-300 mt-0.5 truncate">{parts.join(' · ')}</p> : null
                            })()}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('classificacao') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('classificacao') && (
                        <div className="px-3 sm:px-6 pb-5 space-y-5">
                            {/* Status do Planejamento */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">📊 Status</label>
                                <div className="flex gap-2">
                                    {[
                                        {value: 'A Fazer', color: 'bg-slate-50 border-slate-200 text-slate-500', activeColor: 'bg-slate-600 border-slate-600 text-white'},
                                        {value: 'Em Andamento', color: 'bg-blue-50 border-blue-200 text-blue-600', activeColor: 'bg-blue-500 border-blue-500 text-white'},
                                        {value: 'Concluído', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', activeColor: 'bg-emerald-500 border-emerald-500 text-white'}
                                    ].map(s => (
                                        <button key={s.value} type="button"
                                            onClick={()=>setPlanoEditando({...planoEditando, statusPlanejamento: s.value})}
                                            className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                                                (planoEditando.statusPlanejamento || 'A Fazer') === s.value ? s.activeColor : s.color
                                            }`}>
                                            {s.value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Conceitos Musicais */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">🎵 Conceitos Musicais</label>
                                    <div className="flex gap-1.5">
                                        {!adicionandoConceito && (
                                            <>
                                                <button type="button" onClick={() => setAdicionandoConceito('editar')}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${adicionandoConceito === 'editar' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>
                                                    Editar
                                                </button>
                                                <button type="button" onClick={() => setAdicionandoConceito(true)}
                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                                    + Novo
                                                </button>
                                            </>
                                        )}
                                        {adicionandoConceito === 'editar' && (
                                            <button type="button" onClick={() => setAdicionandoConceito(false)}
                                                className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                                ✓ Concluir
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {adicionandoConceito === true && (
                                    <div className="mb-3 flex gap-2">
                                        <input type="text" value={novoConceito} onChange={(e) => setNovoConceito(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && adicionarConceitoNovo()} className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="Nome do conceito..." autoFocus />
                                        <button type="button" onClick={adicionarConceitoNovo} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✓</button>
                                        <button type="button" onClick={() => { setAdicionandoConceito(false); setNovoConceito(""); }} className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✕</button>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {(conceitos || []).map(conceito => (
                                        adicionandoConceito === 'editar' ? (
                                            <span key={conceito} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border ${(planoEditando.conceitos || []).includes(conceito) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                {conceito}
                                                <button type="button"
                                                    onClick={() => setConceitos(prev => prev.filter(c => c !== conceito))}
                                                    className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/20 text-xs leading-none transition-colors">
                                                    ×
                                                </button>
                                            </span>
                                        ) : (
                                            <button key={conceito} type="button" onClick={() => toggleConceito(conceito)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${(planoEditando.conceitos || []).includes(conceito) ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{conceito}</button>
                                        )
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">🏷️ Tags</label>
                                {(planoEditando.tags || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                                        {(planoEditando.tags || []).map((tag, idx) => (
                                            <span key={idx} className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                                #{tag}
                                                <button
                                                    type="button"
                                                    onClick={() => setPlanoEditando({
                                                        ...planoEditando,
                                                        tags: planoEditando.tags.filter((_,i)=>i!==idx)
                                                    })}
                                                    className="hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center text-indigo-500 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-slate-400 mb-2">Selecione das existentes:</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(tagsGlobais || []).map(tag => (
                                        <div key={tag} className="flex items-center gap-0 bg-white border border-slate-200 rounded-full hover:border-slate-300 transition-colors">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!(planoEditando.tags||[]).includes(tag)) {
                                                        setPlanoEditando({
                                                            ...planoEditando,
                                                            tags: [...(planoEditando.tags||[]), tag]
                                                        });
                                                    }
                                                }}
                                                disabled={(planoEditando.tags||[]).includes(tag)}
                                                className={`px-3 py-1 rounded-l-full text-sm transition-all ${
                                                    (planoEditando.tags||[]).includes(tag)
                                                    ? 'text-slate-300 cursor-not-allowed'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                #{tag}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setModalConfirm({ titulo: 'Remover tag?', conteudo: `Remover "${tag}" da lista permanentemente?`, labelConfirm: 'Remover', perigo: true, onConfirm: () => {
                                                        setTagsGlobais(tagsGlobais.filter(t => t !== tag));
                                                        if ((planoEditando.tags||[]).includes(tag)) {
                                                            setPlanoEditando({
                                                                ...planoEditando,
                                                                tags: planoEditando.tags.filter(t => t !== tag)
                                                            });
                                                        }
                                                    } });
                                                }}
                                                className="text-slate-300 hover:text-red-400 px-2 py-1 rounded-r-full transition-all"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mb-2">Ou adicione nova:</p>
                                <input
                                    type="text"
                                    onKeyDown={e => {
                                        const t = e.target as HTMLInputElement;
                                        if ((e.key === 'Enter' || e.key === ' ') && t.value.trim()) {
                                            e.preventDefault();
                                            const novaTag = t.value.trim().replace(/^#/, '');
                                            if (novaTag && !(planoEditando.tags || []).includes(novaTag)) {
                                                setPlanoEditando({
                                                    ...planoEditando,
                                                    tags: [...(planoEditando.tags||[]), novaTag]
                                                });
                                                if (!tagsGlobais.includes(novaTag)) {
                                                    setTagsGlobais([...tagsGlobais, novaTag].sort());
                                                }
                                            }
                                            t.value = '';
                                        }
                                    }}
                                    className="w-full px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-sm focus:border-indigo-400 outline-none"
                                    placeholder="Digite e pressione Enter... Ex: roda, jogos"
                                />
                            </div>

                            {/* Unidades */}
                            <div>
                                <div className="flex justify-between items-center mb-3"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">📚 Unidades</label>{!adicionandoUnidade && (<button type="button" onClick={() => setAdicionandoUnidade(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">+ Novo</button>)}</div>
                                {adicionandoUnidade && (<div className="mb-3 flex gap-2"><input type="text" value={novaUnidade} onChange={(e) => setNovaUnidade(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && adicionarUnidadeNova()} className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="Nome da unidade..." autoFocus /><button type="button" onClick={adicionarUnidadeNova} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✓</button><button type="button" onClick={() => { setAdicionandoUnidade(false); setNovaUnidade(""); }} className="bg-slate-100 hover:bg-slate-200 text-slate-500 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✕</button></div>)}
                                <div className="flex flex-wrap gap-2">{(unidades || []).map(unidade => (<button key={unidade} type="button" onClick={() => toggleUnidade(unidade)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${(planoEditando.unidades || []).includes(unidade) ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{unidade}</button>))}</div>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* ════════════ ACCORDION: BNCC ════════════ */}
                {!modoRapido && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('bncc')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">BNCC</span>
                            {!secoesForm.has('bncc') && (planoEditando.habilidadesBNCC||[]).filter(Boolean).length > 0 && (
                                <p className="text-[11px] text-slate-300 mt-0.5">{(planoEditando.habilidadesBNCC||[]).filter(Boolean).length} habilidade{(planoEditando.habilidadesBNCC||[]).filter(Boolean).length > 1 ? 's' : ''}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('bncc') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('bncc') && (
                        <div className="px-3 sm:px-6 pb-5">
                            <div className="flex justify-between items-center mb-2"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">🏛️ Habilidades BNCC</label><button type="button" onClick={sugerirBNCC} disabled={gerandoBNCC} className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{gerandoBNCC ? '⏳ Gerando...' : '✨ Sugerir com IA'}</button></div>
                            <textarea value={(planoEditando.habilidadesBNCC || []).join('\n')} onChange={e => setPlanoEditando({...planoEditando, habilidadesBNCC: e.target.value.split('\n')})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" rows={5} placeholder="EF15ARXX - Descrição..." />
                        </div>
                    )}
                </div>
                )}

                {/* ════════════ ACCORDION: RECURSOS DA AULA ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('recursos')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0 flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">🎬 Recursos da Aula</span>
                            {(planoEditando.recursos || []).length > 0 && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">{(planoEditando.recursos || []).length}</span>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('recursos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('recursos') && (
                        <div className="px-3 sm:px-6 pb-5">
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
                                                {!modoRapido && (
                                                    <button type="button" onClick={() => removerRecurso(idx)} className="text-slate-300 hover:text-red-500 transition shrink-0 text-xs mt-0.5">✕</button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : modoRapido ? (
                                <p className="text-[11px] text-slate-400 italic">Nenhum recurso adicionado.</p>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* ════════════ ACCORDION: AVALIAÇÃO / OBSERVAÇÕES ════════════ */}
                {!modoRapido && (
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('avaliacao')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Avaliação / Observações</span>
                            {!secoesForm.has('avaliacao') && planoEditando.avaliacaoObservacoes && (
                                <p className="text-[11px] text-slate-300 mt-0.5 truncate">{planoEditando.avaliacaoObservacoes.slice(0,60)}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('avaliacao') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('avaliacao') && (
                        <div className="px-3 sm:px-6 pb-5">
                            <textarea value={planoEditando.avaliacaoObservacoes} onChange={(e) => setPlanoEditando({...planoEditando, avaliacaoObservacoes: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" rows={3} />
                        </div>
                    )}
                </div>
                )}

                {/* ════════════ MÚSICAS VINCULADAS AO PLANO ════════════ */}
                {(() => {
                    const vinculadas = planoEditando.musicasVinculadasPlano || []
                    const vinculadosIds = new Set(vinculadas.map(v => String(v.musicaId)))
                    const sugestoesManual = buscaManual.trim().length >= 2
                        ? repertorio.filter(m =>
                            !vinculadosIds.has(String(m.id ?? m.titulo)) &&
                            m.titulo.toLowerCase().includes(buscaManual.toLowerCase())
                          ).slice(0, 8)
                        : []
                    function adicionarManual(m: import('../types').Musica) {
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
                    return (
                        <div className="border-b border-slate-100 px-3 sm:px-6 py-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em]">🎵 Músicas vinculadas ao plano</p>
                                <button type="button"
                                    onClick={() => setPickerAberto(o => !o)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                    {pickerAberto ? '✕ Fechar' : '+ Adicionar'}
                                </button>
                            </div>

                            {/* Picker manual */}
                            {pickerAberto && (
                                <div className="mb-3 relative">
                                    <input type="text" autoFocus
                                        placeholder="Buscar no repertório…"
                                        className="w-full px-3 py-2 border border-indigo-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                        value={buscaManual}
                                        onChange={e => setBuscaManual(e.target.value)} />
                                    {sugestoesManual.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-10 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden max-h-48 overflow-y-auto">
                                            {sugestoesManual.map(m => (
                                                <button key={String(m.id ?? m.titulo)} type="button"
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-slate-100 last:border-0"
                                                    onClick={() => adicionarManual(m)}>
                                                    <span className="font-medium text-slate-800">{m.titulo}</span>
                                                    {m.autor && <span className="text-slate-400 ml-2 text-xs">{m.autor}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {buscaManual.trim().length >= 2 && sugestoesManual.length === 0 && (
                                        <p className="text-xs text-slate-400 mt-1.5">Nenhuma música no repertório com esse nome.</p>
                                    )}
                                </div>
                            )}

                            {/* Lista de vínculos */}
                            {vinculadas.length === 0 && !pickerAberto && (
                                <p className="text-xs text-slate-400 italic">Nenhuma música vinculada ainda.</p>
                            )}
                            {vinculadas.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    {vinculadas.map(v => (
                                        <div key={String(v.musicaId)}
                                            className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                                            <span className="flex-1 min-w-0 truncate text-slate-700">
                                                {v.titulo}
                                                {v.autor && <span className="text-slate-400 ml-1.5 text-xs">· {v.autor}</span>}
                                                {v.confirmadoPor === 'auto' && (
                                                    <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">auto</span>
                                                )}
                                                {v.origemDeteccao === 'manual' && (
                                                    <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">manual</span>
                                                )}
                                            </span>
                                            <button type="button"
                                                onClick={() => {
                                                    setPlanoEditando({ ...planoEditando, musicasVinculadasPlano: vinculadas.filter(x => String(x.musicaId) !== String(v.musicaId)) })
                                                    desvincularMusicaDoPlano(planoEditando.id, v.musicaId)
                                                }}
                                                className="text-slate-300 hover:text-red-500 text-base leading-none shrink-0 transition-colors"
                                                title="Remover vínculo">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* ════════════ ADAPTAÇÕES POR TURMA ════════════ */}
                {(() => {
                    const turmasFlat = anosLetivos.flatMap(a =>
                        a.escolas.flatMap(e =>
                            e.segmentos.flatMap(s =>
                                s.turmas.map(t => ({
                                    id: String(t.id),
                                    nome: [e.nome, s.nome, t.nome].filter(Boolean).join(' › ')
                                }))
                            )
                        )
                    )
                    // Ler notas do estado atual em planos (não de planoEditando que é snapshot)
                    const planoAtual = planos.find(p => String(p.id) === String(planoEditando.id))
                    const notasAtuais = planoAtual?.notasAdaptacao ?? planoEditando.notasAdaptacao ?? []
                    return (
                        <div className="px-3 sm:px-6 pb-4">
                            <SecaoAdaptacoesTurma
                                planoId={planoEditando.id}
                                notas={notasAtuais}
                                turmasDisponiveis={turmasFlat}
                            />
                        </div>
                    )
                })()}

                {/* ─── FOOTER STICKY ─── */}
                <div className="px-3 sm:px-4 py-3 sm:py-4 bg-white border-t border-slate-100 sticky bottom-0">
                    <div className="flex gap-2">
                        <button type="button" onClick={handleFechar} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm active:scale-95">Cancelar</button>
                        {planoEditando._historicoVersoes?.length ? (
                            <div className="relative">
                                <button type="button" onClick={() => setRestaurarOpen(o => !o)}
                                    className="h-full px-3 py-2.5 rounded-xl font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors text-sm active:scale-95 whitespace-nowrap">
                                    ↩ Restaurar
                                </button>
                                {restaurarOpen && (
                                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]"
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
                        <button type="button" onClick={handleSalvarPlano} disabled={estadoSalvar !== 'idle'} className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-all shadow-sm text-sm active:scale-95 ${estadoSalvar === 'salvo' ? 'bg-emerald-500' : estadoSalvar === 'salvando' ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'}`}>
                            {estadoSalvar === 'salvando' ? 'Salvando...' : estadoSalvar === 'salvo' ? '✓ Salvo!' : 'Salvar Plano'}
                        </button>
                    </div>
                </div>
            </div>{/* fim conteúdo */}
        </div>{/* fim card principal */}
    </div>{/* fim container externo */}
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
            <h1 className="text-[22px] font-bold tracking-[-0.025em] text-slate-900 dark:text-[#E5E7EB] mb-[3px]">Planos de Aula</h1>
            <p className="text-[13.5px] text-slate-500 dark:text-[#9CA3AF] tracking-[-0.005em]">
                {totalPlanos} plano{totalPlanos !== 1 ? 's' : ''} · {porStatus['Em Andamento']} em edição
                {proximaAula ? ` · próxima aula em ${Math.max(0, Math.ceil((new Date(proximaAula.data+'T12:00:00').getTime() - Date.now()) / 86400000))} dias` : ''}
            </p>
        </div>

        {/* ── INDICADORES ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-[#5B5FEA] dark:text-[#818cf8] leading-none mb-[5px]">{totalPlanos}</div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Planos de Aula</div>
            </div>
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-amber-500 leading-none mb-[5px]">{totalRegistros}</div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Registros Pós-Aula</div>
            </div>
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-[#10b981] leading-none mb-[5px]">{proximaAula ? new Date(proximaAula.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—'}</div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Próxima Aula</div>
            </div>
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm px-4 py-3.5 card-hover">
                <div className="text-2xl font-extrabold tracking-[-0.03em] text-slate-800 dark:text-[#E5E7EB] leading-none mb-[5px]">{totalRepertorio}</div>
                <div className="text-[12px] font-medium text-slate-500 dark:text-[#9CA3AF]">Músicas no Repertório</div>
            </div>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="v2-card flex items-center gap-[10px] border-[1.5px] border-[#E6EAF0] dark:border-[#374151] rounded-[9px] px-[14px] py-[9px] mb-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-[border-color] duration-[120ms] hover:border-[#5B5FEA]/40 dark:hover:border-[#818cf8]/40 cursor-text">
            <span className="text-[13px] text-slate-400 dark:text-[#6b7280] flex-none select-none">🔍</span>
            <input type="text" inputMode="search" value={busca} onChange={e=>setBusca(e.target.value)}
                placeholder="Buscar por título, objetivo, conceito..."
                className="flex-1 border-none outline-none text-[14px] tracking-[-0.01em] text-slate-800 dark:text-[#E5E7EB] bg-transparent placeholder:text-slate-400 dark:placeholder:text-[#6b7280]" />
            <span className="text-[10.5px] font-semibold text-slate-400 dark:text-[#6b7280] bg-[#F1F4F8] dark:bg-[#273344] border border-[#E6EAF0] dark:border-[#374151] rounded-[5px] px-[7px] py-[2px] flex-none tracking-[0.01em]">Ctrl K</span>
        </div>

        {/* ── FILTER CHIPS ── */}
        <div className="flex gap-[6px] flex-wrap mb-[18px]">
            {(['Todos','A Fazer','Em Andamento','Concluído'] as const).map(s => (
                <button key={s} onClick={()=>setFiltroStatus(s)}
                    className={`px-[11px] py-[4px] rounded-full text-[12px] font-medium border-[1.5px] transition-all duration-[120ms] tracking-[-0.01em]
                        ${filtroStatus === s
                            ? 'bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 border-[#5B5FEA]/30 dark:border-[#818cf8]/30 text-[#5B5FEA] dark:text-[#818cf8] font-semibold'
                            : 'bg-[#ffffff] dark:bg-[#1F2937] border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/50 hover:text-[#5B5FEA] dark:hover:border-[#818cf8]/50 dark:hover:text-[#818cf8]'}`}>
                    {s}
                </button>
            ))}
            {faixas.slice(1).map(faixa => (
                <button key={faixa} onClick={()=>setFiltroFaixa(filtroFaixa===faixa?'Todos':faixa)}
                    className={`px-[11px] py-[4px] rounded-full text-[12px] font-medium border-[1.5px] transition-all duration-[120ms] tracking-[-0.01em]
                        ${filtroFaixa === faixa
                            ? 'bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 border-[#5B5FEA]/30 dark:border-[#818cf8]/30 text-[#5B5FEA] dark:text-[#818cf8] font-semibold'
                            : 'bg-[#ffffff] dark:bg-[#1F2937] border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/50 hover:text-[#5B5FEA] dark:hover:border-[#818cf8]/50 dark:hover:text-[#818cf8]'}`}>
                    {faixa}
                </button>
            ))}
            <button onClick={()=>setFiltroFavorito(!filtroFavorito)}
                className={`px-[11px] py-[4px] rounded-full text-[12px] font-medium border-[1.5px] transition-all duration-[120ms]
                    ${filtroFavorito
                        ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300/60 dark:border-amber-400/30 text-amber-600 dark:text-amber-400 font-semibold'
                        : 'bg-[#ffffff] dark:bg-[#1F2937] border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:border-amber-300/60 hover:text-amber-600'}`}>
                {filtroFavorito ? '★ Favoritos' : '☆ Favoritos'}
            </button>
            <button onClick={()=>toggleFiltrosPlanos(!filtrosPlanos)}
                className="px-[11px] py-[4px] rounded-full text-[12px] font-medium border-[1.5px] border-[#E6EAF0] dark:border-[#374151] bg-[#ffffff] dark:bg-[#1F2937] text-slate-400 dark:text-[#6b7280] hover:border-[#5B5FEA]/50 hover:text-[#5B5FEA] transition-all duration-[120ms]">
                {filtrosPlanos ? '▲ menos' : '▼ mais filtros'}
            </button>
            {(busca||filtroStatus!=='Todos'||filtroFaixa!=='Todos'||filtroFavorito) && (
                <button onClick={()=>{setBusca("");setFiltroEscola("Todas");setFiltroNivel("Todos");setFiltroConceito("Todos");setFiltroFaixa("Todos");setFiltroFavorito(false);setFiltroStatus("Todos");setFiltroTag("Todas");setFiltroSegmento("Todos");setFiltroUnidade("Todos");}}
                    className="px-[11px] py-[4px] rounded-full text-[12px] border-[1.5px] border-red-200 dark:border-red-500/30 text-red-400 dark:text-red-400 hover:text-red-600 bg-[#ffffff] dark:bg-[#1F2937] transition-all duration-[120ms]">
                    ✕ limpar
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
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Unidade</label><select value={filtroUnidade} onChange={e=>setFiltroUnidade(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none"><option value="Todos">Todos</option>{unidades.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="block text-[10px] font-bold text-slate-400 dark:text-[#6b7280] uppercase tracking-[0.06em] mb-1.5">Tag</label><select value={filtroTag} onChange={e=>setFiltroTag(e.target.value)} className="w-full px-2.5 py-1.5 border border-[#E6EAF0] dark:border-[#374151] rounded-lg text-xs bg-transparent text-slate-700 dark:text-[#E5E7EB] outline-none"><option value="Todas">Todas</option>{tagsGlobais.map(t=><option key={t} value={t}>#{t}</option>)}</select></div>
            </div>
        )}

        {/* ── Contagem + Ordenar + Modo de visualização ── */}
        <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-slate-400 dark:text-[#6b7280] px-[2px]">{planosFiltrados.length} plano{planosFiltrados.length!==1?'s':''}</p>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#F1F4F8] dark:bg-[#273344] rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] text-slate-400 dark:text-[#6b7280] font-semibold mr-0.5">Ordenar:</span>
                    {([{id:'recente',label:'Recente'},{id:'az',label:'A–Z'},{id:'status',label:'Status'},{id:'favoritos',label:'★'}] as const).map(o=>(
                        <button key={o.id} onClick={()=>setOrdenacaoCards(o.id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all duration-[120ms] ${ordenacaoCards===o.id ? 'bg-[#5B5FEA] dark:bg-[#818cf8] text-white' : 'text-slate-400 dark:text-[#6b7280] hover:text-slate-700 dark:hover:text-[#9CA3AF]'}`}>
                            {o.label}
                        </button>
                    ))}
                </div>
                <div className="flex bg-[#F1F4F8] dark:bg-[#273344] rounded-lg p-1 gap-0.5">
                    {([{id:'grade',label:'⊞',title:'Grade'},{id:'compacto',label:'☰',title:'Lista'},{id:'kanban',label:'⠿',title:'Kanban'},{id:'periodo',label:'📆',title:'Por Período'},{id:'segmento',label:'👥',title:'Por Segmento'}] as const).map(m=>(
                        <button key={m.id} onClick={()=>setModoVisualizacao(m.id)} title={m.title}
                            className={`px-2.5 py-1 rounded text-[13px] font-bold transition-all duration-[120ms] ${modoVisualizacao===m.id ? 'bg-[#ffffff] dark:bg-[#1F2937] text-[#5B5FEA] dark:text-[#818cf8] shadow-sm' : 'text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF]'}`}>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>
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
                        <div className="p-[18px] flex-1">
                            {/* Status dot + label UPPERCASE + favorito */}
                            <div className="flex items-center justify-between mb-[9px]">
                                <div className="relative">
                                    <button onClick={e=>{e.stopPropagation();setStatusDropdownId(statusDropdownId===plano.id?null:plano.id);}}
                                        className="flex items-center gap-[5px] hover:opacity-70 transition">
                                        <span style={{width:6,height:6,borderRadius:'50%',background:dotColor,flexShrink:0,display:'inline-block'}} />
                                        <span style={{color:dotColor}} className="text-[11px] font-bold uppercase tracking-[0.01em]">{status}</span>
                                    </button>
                                    {statusDropdownId === plano.id && (
                                        <div className="v2-card absolute top-full left-0 mt-1 border border-[#E6EAF0] dark:border-[#374151] rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]"
                                             onClick={e=>e.stopPropagation()}>
                                            {(['A Fazer','Em Andamento','Concluído'] as const).map(s => (
                                                <button key={s}
                                                    onClick={()=>{setPlanos(planos.map(p=>p.id===plano.id?{...p,statusPlanejamento:s}:p));setStatusDropdownId(null);}}
                                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 transition hover:bg-[#F6F8FB] dark:hover:bg-white/5 text-slate-700 dark:text-[#E5E7EB] ${status===s?'opacity-50 cursor-default':''}`}>
                                                    {s}{status===s&&<span className="ml-auto text-slate-300">✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={e=>{e.stopPropagation();toggleFavorito(plano,e);}} className={`text-[15px] shrink-0 hover:scale-110 transition leading-none ${plano.destaque?'text-amber-400':'text-slate-300 dark:text-[#4B5563] hover:text-amber-300'}`}>
                                    {plano.destaque?'★':'☆'}
                                </button>
                            </div>

                            {/* Título */}
                            <h3 className="font-semibold text-slate-900 dark:text-[#E5E7EB] text-[14px] leading-[1.35] tracking-[-0.01em] mb-[5px]">{plano.titulo}</h3>

                            {/* Meta */}
                            <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] mb-[9px] leading-none">
                                {[(plano.faixaEtaria||[])[0],(plano.unidades||[])[0]].filter(Boolean).join(' · ') || '\u00A0'}
                            </p>

                            {/* Tags (conceitos) — indigo pill */}
                            {(plano.conceitos||[]).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {(plano.conceitos||[]).slice(0,2).map(c=>(
                                        <span key={c} className="text-[11px] font-semibold text-[#5B5FEA] dark:text-[#818cf8] bg-[#5B5FEA]/[0.08] dark:bg-[#5B5FEA]/[0.16] px-[8px] py-[3px] rounded-full">{c}</span>
                                    ))}
                                    {(plano.conceitos||[]).length > 2 && <span className="text-[11px] text-slate-400 dark:text-[#6b7280]">+{(plano.conceitos||[]).length-2}</span>}
                                </div>
                            )}
                        </div>

                        {/* Rodapé */}
                        <div className="border-t border-[#E6EAF0] dark:border-[#374151] px-[14px] py-[10px] flex items-center">
                            <button onClick={e=>{e.stopPropagation();setPlanoSelecionado(plano);}}
                                className="flex-1 text-[13px] font-semibold text-[#5B5FEA] dark:text-[#818cf8] hover:underline text-left transition">
                                Ver plano
                            </button>
                            <div className="flex items-center">
                                <button onClick={e=>{e.stopPropagation();setPlanoParaAplicar(plano);}} title="Agendar"
                                    className="p-[6px] text-slate-400 dark:text-[#6b7280] hover:text-[#5B5FEA] dark:hover:text-[#818cf8] rounded-lg transition-all duration-[120ms] text-[14px] leading-none">📅</button>
                                <button onClick={e=>{e.stopPropagation();editarPlano(plano);}} title="Editar"
                                    className="p-[6px] text-slate-400 dark:text-[#6b7280] hover:text-[#5B5FEA] dark:hover:text-[#818cf8] rounded-lg transition-all duration-[120ms] text-[14px] leading-none">✏️</button>
                                <button onClick={e=>{e.stopPropagation();exportarPlanoPDF(plano);}} title="PDF"
                                    className="p-[6px] text-slate-400 dark:text-[#6b7280] hover:text-[#5B5FEA] dark:hover:text-[#818cf8] rounded-lg transition-all duration-[120ms] text-[14px] leading-none">📄</button>
                                <button onClick={e=>{e.stopPropagation();excluirPlano(plano.id);}} title="Excluir"
                                    className="p-[6px] text-slate-400 dark:text-[#6b7280] hover:text-red-400 rounded-lg transition-all duration-[120ms] text-[14px] leading-none">🗑</button>
                            </div>
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
                {planosFiltrados.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} />)}
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
                                    {g.planos.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} />)}
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
                            {gruposSegmento[seg].map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} />)}
                        </div>
                    ))}
                    {semSegmento.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gray-400 text-white px-4 py-2.5 flex justify-between items-center">
                                <span className="font-bold text-sm">📄 Sem segmento definido</span>
                                <span className="text-gray-200 text-xs">{semSegmento.length} plano{semSegmento.length!==1?'s':''}</span>
                            </div>
                            {semSegmento.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} toggleFavorito={toggleFavorito} setPlanoSelecionado={setPlanoSelecionado} abrirModalRegistro={abrirModalRegistro} editarPlano={editarPlano} />)}
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
        <ModalEstrategiaDetectada />
    </>
    );

}
