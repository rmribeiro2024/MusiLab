import React, { useState, useRef, useMemo, useEffect } from 'react'
import { sanitizar } from '../lib/utils'
import { dbSize } from '../lib/db'
import { useInfiniteScroll } from '../lib/hooks'
import { carimbарTimestamp, marcarPendente } from '../lib/offlineSync' // [offlineSync]
import { usePlanosContext, useAnoLetivoContext, useAtividadesContext, useRepertorioContext, useModalContext, useCalendarioContext } from '../contexts'
import RichTextEditor from './RichTextEditor'
import { exportarPlanoPDF } from '../utils/pdf'
import ModalAplicarEmTurmas from './modals/ModalAplicarEmTurmas'
import type { Plano } from '../types'

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
                    {plano.numeroAula && <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full shrink-0">#{plano.numeroAula}</span>}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${sc.badge}`}>{status}</span>
                    <span className="font-semibold text-slate-800 text-sm truncate">{plano.titulo}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {showEscola && plano.escola && <span className="text-xs text-indigo-600 font-medium">🏫 {plano.escola}</span>}
                    {showEscola && plano.escola && faixa && <span className="text-xs text-slate-300">·</span>}
                    {faixa && <span className="text-xs text-slate-500">{faixa}</span>}
                    {faixa && conceito1 && <span className="text-xs text-slate-300">·</span>}
                    {conceito1 && <span className="text-xs text-teal-600 font-medium">{conceito1}</span>}
                </div>
            </div>
            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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

    // Itens de planos: via PlanosContext
    const {
        abrirModalRegistro,
        baixarBackup,
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
        excluirPlano,
        fecharModal,
        restaurarVersao,
        filtroConceito,
        filtroEscola,
        filtroFaixa,
        filtroFavorito,
        filtroNivel,
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
    } = usePlanosContext()

    // Constantes estáticas (não precisam vir do ctx)
    const niveis = ["Todos", "Iniciante", "Intermediário", "Avançado"]

    // ── Modal Aplicar em Turmas ──
    const [planoParaAplicar, setPlanoParaAplicar] = useState<Plano | null>(null)

    // ── ACCORDION do formulário de plano ──
    const [secoesForm, setSecoesForm] = useState<Set<string>>(
        () => new Set(['detalhes', 'classificacao', 'objetivos', 'roteiro', 'recursos'])
    )
    function toggleSecaoForm(id: string) {
        setSecoesForm(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
    }

    // ── Detecção de alterações não salvas ──
    const planoOriginalRef = useRef<any>(null)
    useEffect(() => {
        if (modoEdicao && planoEditando) {
            planoOriginalRef.current = JSON.parse(JSON.stringify(planoEditando))
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

                {/* ─── TÍTULO + ESCOLA — sempre visível ─── */}
                <div className="px-3 sm:px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div><label htmlFor="plano-titulo" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Título *</label><input id="plano-titulo" type="text" value={planoEditando.titulo} onChange={e=>setPlanoEditando({...planoEditando, titulo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" /></div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Escola</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input type="text" value={planoEditando.escola} onChange={e=>setPlanoEditando({...planoEditando, escola: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" list="escolas-list" placeholder="Selecione ou digite..." />
                                    <datalist id="escolas-list">
                                        {/* Escolas dos anos letivos */}
                                        {anosLetivos.flatMap(a => a.escolas.map(e => e.nome)).filter((v,i,arr)=>arr.indexOf(v)===i).map(e=><option key={e} value={e}/>)}
                                        {/* Escolas dos planos (legado) */}
                                        {escolas.filter(e=>e!=='Todas').map(e=><option key={'p_'+e} value={e}/>)}
                                    </datalist>
                                </div>
                                <button type="button" onClick={()=>{ setNovaEscolaNome(''); setNovaEscolaAnoId(''); setModalNovaEscola('plano'); }} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl font-bold text-lg leading-none transition-colors" title="Cadastrar nova escola">+</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════ ACCORDION 1: DETALHES DA AULA ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('detalhes')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Detalhes da aula</span>
                            {!secoesForm.has('detalhes') && (planoEditando.statusPlanejamento || planoEditando.nivel || planoEditando.duracao) && (
                                <p className="text-[11px] text-slate-300 mt-0.5 truncate">{[planoEditando.statusPlanejamento, planoEditando.nivel, planoEditando.duracao].filter(Boolean).join(' · ')}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('detalhes') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('detalhes') && (
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
                            {/* Datas */}
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">📅 Datas</label><div className="flex gap-2 mb-2"><input type="date" value={dataEdicao} onChange={e=>setDataEdicao(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:border-indigo-400 outline-none"/><button type="button" onClick={adicionarDataEdicao} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl font-semibold text-sm transition-colors">Add</button></div><div className="flex flex-wrap gap-2">{planoEditando.historicoDatas?.map(d=><span key={d} className="bg-white border border-slate-200 px-2.5 py-1 rounded-full text-sm text-slate-700 font-medium">{new Date(d+'T12:00:00').toLocaleDateString('pt-BR')} <button type="button" onClick={()=>removerDataEdicao(d)} className="text-red-400 hover:text-red-600 font-bold ml-1">×</button></span>)}</div></div>
                            {/* Nível + Duração */}
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nível</label><select value={planoEditando.nivel} onChange={e=>setPlanoEditando({...planoEditando, nivel: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{niveis.slice(1).map(n=><option key={n}>{n}</option>)}</select></div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Duração</label>
                                    {/* AUTOCOMPLETE DE DURAÇÃO */}
                                    <input type="text" value={planoEditando.duracao} onChange={e=>setPlanoEditando({...planoEditando, duracao: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="Ex: 50 min" list="duracoes-list" />
                                    <datalist id="duracoes-list">{duracoesSugestao.map(d=><option key={d} value={d}/>)}</datalist>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════════ ACCORDION 2: CLASSIFICAÇÃO ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('classificacao')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Classificação</span>
                            {!secoesForm.has('classificacao') && (() => {
                                const parts: string[] = []
                                if ((planoEditando.faixaEtaria||[]).length > 0) parts.push((planoEditando.faixaEtaria||[]).join(', '))
                                if ((planoEditando.conceitos||[]).length > 0) parts.push(`${(planoEditando.conceitos||[]).length} conceito${(planoEditando.conceitos||[]).length > 1 ? 's' : ''}`)
                                if ((planoEditando.tags||[]).length > 0) parts.push(`${(planoEditando.tags||[]).length} tag${(planoEditando.tags||[]).length > 1 ? 's' : ''}`)
                                return parts.length > 0 ? <p className="text-[11px] text-slate-300 mt-0.5 truncate">{parts.join(' · ')}</p> : null
                            })()}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('classificacao') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('classificacao') && (
                        <div className="px-3 sm:px-6 pb-5 space-y-5">
                            {/* Faixa Etária */}
                            <div>
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

                {/* ════════════ ACCORDION 3: OBJETIVOS E BNCC ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('objetivos')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Objetivos e BNCC</span>
                            {!secoesForm.has('objetivos') && planoEditando.objetivoGeral && (
                                <p className="text-[11px] text-slate-300 mt-0.5 truncate">{planoEditando.objetivoGeral.replace(/<[^>]*>/g,'').slice(0,70)}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('objetivos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('objetivos') && (
                        <div className="px-3 sm:px-6 pb-5 space-y-5">
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
                            <div>
                                <div className="flex justify-between items-center mb-2"><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">🏛️ Habilidades BNCC</label><button type="button" onClick={sugerirBNCC} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">✨ Sugerir</button></div>
                                <textarea value={(planoEditando.habilidadesBNCC || []).join('\n')} onChange={e => setPlanoEditando({...planoEditando, habilidadesBNCC: e.target.value.split('\n')})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" rows={5} placeholder="EF15ARXX - Descrição..." />
                            </div>
                        </div>
                    )}
                </div>

                {/* ════════════ ACCORDION 4: ROTEIRO DE ATIVIDADES ════════════ */}
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
                                            onDragStart={() => handleDragStart(index)}
                                            onDragEnter={() => handleDragEnter(index)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={e => e.preventDefault()}
                                            className={`bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm transition-opacity hover:border-indigo-200 ${dragActiveIndex === index ? 'dragging' : ''} ${dragOverIndex === index && dragActiveIndex !== index ? 'drag-over' : ''}`}>
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2 sm:cursor-grab sm:active:cursor-grabbing select-none" title="Arraste para reordenar">
                                                    <span className="hidden sm:inline text-gray-300 hover:text-indigo-400 transition text-lg">⠿</span>
                                                    {/* Botões ↑↓ de reordenação — fallback mobile para drag */}
                                                    <div className="flex sm:hidden gap-0.5">
                                                        <button type="button"
                                                            onClick={() => { const arr = [...(planoEditando.atividadesRoteiro||[])]; if(index===0) return; [arr[index-1],arr[index]]=[arr[index],arr[index-1]]; setPlanoEditando({...planoEditando, atividadesRoteiro:arr}); }}
                                                            disabled={index===0}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded transition">↑</button>
                                                        <button type="button"
                                                            onClick={() => { const arr = [...(planoEditando.atividadesRoteiro||[])]; if(index===arr.length-1) return; [arr[index],arr[index+1]]=[arr[index+1],arr[index]]; setPlanoEditando({...planoEditando, atividadesRoteiro:arr}); }}
                                                            disabled={index===(planoEditando.atividadesRoteiro||[]).length-1}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded transition">↓</button>
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
                                                                setModalConfirm({ conteudo: '⚠️ Nome obrigatório!', somenteOk: true, labelConfirm: 'OK' });
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
                                                                    setModalConfirm({ conteudo: '✅ Atividade atualizada no Banco de Atividades!', somenteOk: true, labelConfirm: 'OK' });
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
                                                                setModalConfirm({ conteudo: '✅ Atividade salva no Banco de Atividades!', somenteOk: true, labelConfirm: 'OK' });
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

                {/* ════════════ ACCORDION 5: RECURSOS E AVALIAÇÃO ════════════ */}
                <div className="border-b border-slate-100">
                    <button type="button" onClick={() => toggleSecaoForm('recursos')} className="w-full flex items-center justify-between px-3 sm:px-6 py-3.5 text-left group">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.08em] group-hover:text-slate-600 transition-colors">Recursos e Avaliação</span>
                            {!secoesForm.has('recursos') && planoEditando.materiais.length > 0 && (
                                <p className="text-[11px] text-slate-300 mt-0.5">{planoEditando.materiais.length} material{planoEditando.materiais.length > 1 ? 'is' : ''}</p>
                            )}
                        </div>
                        <svg className={`w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-all duration-200 flex-shrink-0 ml-3 ${secoesForm.has('recursos') ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {secoesForm.has('recursos') && (
                        <div className="px-3 sm:px-6 pb-5 space-y-5">
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
                            {/* Links e Imagens */}
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🔗 Links e Imagens</label><div className="flex gap-2 mb-3 flex-col md:flex-row"><input type="text" placeholder="URL..." value={novoRecursoUrl} onChange={e => setNovoRecursoUrl(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" /><select value={novoRecursoTipo} onChange={e => setNovoRecursoTipo(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white"><option value="link">Link</option><option value="imagem">Imagem</option></select><button type="button" onClick={adicionarRecurso} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">Add</button></div><div className="space-y-2">{(planoEditando.recursos || []).map((rec, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200"><div className="flex items-center gap-2 overflow-hidden"><span>{rec.tipo === 'imagem' ? '🖼️' : '🔗'}</span><span className="text-sm truncate max-w-xs text-slate-700">{rec.url}</span></div><button type="button" onClick={() => removerRecurso(idx)} className="text-red-400 hover:text-red-600 font-bold px-2">✕</button></div>))}</div></div>
                            {/* Avaliação / Observações */}
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">📝 Avaliação / Observações</label><textarea value={planoEditando.avaliacaoObservacoes} onChange={(e) => setPlanoEditando({...planoEditando, avaliacaoObservacoes: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" rows={3} /></div>
                        </div>
                    )}
                </div>

                {/* ─── FOOTER STICKY ─── */}
                <div className="px-3 sm:px-4 py-3 sm:py-4 bg-white border-t border-slate-100 sticky bottom-0">
                    {planoEditando._historicoVersoes?.length ? (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            <span className="text-xs text-slate-400">↩ Restaurar:</span>
                            {planoEditando._historicoVersoes.map((v, i) => (
                                <button key={i} type="button" onClick={() => restaurarVersao(planoEditando, v)}
                                    className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg transition font-medium">
                                    {new Date(v._versaoSalvaEm).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}
                                </button>
                            ))}
                        </div>
                    ) : null}
                    <div className="flex gap-3">
                        <button type="button" onClick={handleFechar} className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm active:scale-95">Cancelar</button>
                        <button type="button" onClick={() => salvarPlano()} className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm text-sm active:scale-95">💾 Salvar Plano</button>
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

        {/* ── DASHBOARD (#1) ── */}
        <div className="mb-6 space-y-3">
            {/* Linha 1: KPIs principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total de planos */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Planos de Aula</p>
                    <p className="text-3xl font-bold text-slate-800">{totalPlanos}</p>
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{porStatus['A Fazer']} a fazer</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{porStatus['Em Andamento']} em andamento</span>
                        <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{porStatus['Concluído']} concluídos</span>
                    </div>
                </div>
                {/* Registros Pós-Aula */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Registros Pós-Aula</p>
                    <p className="text-3xl font-bold text-amber-600">{totalRegistros}</p>
                    {ultimoRegistro ? (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                            Último: <span className="text-slate-600 font-medium">{ultimoRegistro.planoTitulo}</span>
                            {ultimoRegistro.data && <> · {new Date(ultimoRegistro.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</>}
                        </p>
                    ) : <p className="text-xs text-slate-400 mt-2">Nenhum registro ainda</p>}
                </div>
                {/* Próxima aula */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Próxima Aula</p>
                    {proximaAula ? (
                        <>
                            <p className="text-xl font-bold text-indigo-700">
                                {new Date(proximaAula.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 font-medium">{proximaAula.plano.titulo}</p>
                            {proximaAula.plano.escola && <p className="text-xs text-indigo-400 mt-0.5">🏫 {proximaAula.plano.escola}</p>}
                        </>
                    ) : <p className="text-2xl font-bold text-slate-300 mt-1">—</p>}
                </div>
                {/* Repertório */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Repertório</p>
                    <p className="text-3xl font-bold text-purple-600">{totalRepertorio}</p>
                    <p className="text-xs text-slate-400 mt-2">{totalRepertorio === 1 ? 'música cadastrada' : 'músicas cadastradas'}</p>
                </div>
            </div>

            {/* Linha 2: Barra de progresso de status + Turmas hoje */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Progresso geral */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Progresso Geral dos Planos</p>
                    {totalPlanos === 0 ? (
                        <p className="text-sm text-slate-400">Nenhum plano criado ainda.</p>
                    ) : (
                        <>
                            <div className="flex rounded-full overflow-hidden h-4 mb-2">
                                {porStatus['Concluído'] > 0 && <div style={{width: `${(porStatus['Concluído']/totalPlanos*100).toFixed(1)}%`}} className="bg-emerald-400 transition-all" title="Concluído"></div>}
                                {porStatus['Em Andamento'] > 0 && <div style={{width: `${(porStatus['Em Andamento']/totalPlanos*100).toFixed(1)}%`}} className="bg-blue-400 transition-all" title="Em Andamento"></div>}
                                {porStatus['A Fazer'] > 0 && <div style={{width: `${(porStatus['A Fazer']/totalPlanos*100).toFixed(1)}%`}} className="bg-slate-200 transition-all" title="A Fazer"></div>}
                            </div>
                            <div className="flex gap-4 text-xs text-slate-500 mt-1">
                                <span>✅ {(porStatus['Concluído']/totalPlanos*100).toFixed(0)}% concluídos</span>
                                <span>🔵 {(porStatus['Em Andamento']/totalPlanos*100).toFixed(0)}% em andamento</span>
                                <span>⬜ {(porStatus['A Fazer']/totalPlanos*100).toFixed(0)}% a fazer</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Hoje */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Hoje</p>
                    {turmasHoje.length > 0 ? (
                        <>
                            <p className="text-sm font-bold text-emerald-700 mb-2">🎓 {turmasHoje.length} aula(s) registrada(s) hoje</p>
                            <div className="flex flex-wrap gap-1.5">
                                {turmasHoje.map((t,i) => (
                                    <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{t}</span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-400">Nenhuma aula registrada hoje.</p>
                    )}
                    {ultimoRegistro && ultimoRegistro.data !== hojeStr && (
                        <p className="text-xs text-slate-400 mt-2 border-t border-slate-100 pt-2">
                            Último registro: <span className="text-slate-600 font-medium">{new Date(ultimoRegistro.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</span>
                            {' · '}{ultimoRegistro.planoTitulo}
                        </p>
                    )}
                </div>
            </div>
        </div>

        {/* FILTROS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-5">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-6"><input type="text" inputMode="search" placeholder="🔍 Buscar por título, objetivo, conceito..." value={busca} onChange={(e)=>setBusca(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" /></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Escola</label><select value={filtroEscola} onChange={(e)=>setFiltroEscola(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{escolas.map(e=><option key={e} value={e}>{e}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nível</label><select value={filtroNivel} onChange={(e)=>setFiltroNivel(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{niveis.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Faixa Etária</label><select value={filtroFaixa} onChange={(e)=>setFiltroFaixa(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">{faixas.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Conceito</label>
                    <select value={filtroConceito} onChange={(e)=>setFiltroConceito(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white"><option value="Todos">Todos</option>{conceitos.map(c=><option key={c} value={c}>{c}</option>)}</select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Unidade</label>
                    <select value={filtroUnidade} onChange={(e)=>setFiltroUnidade(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white"><option value="Todos">Todos</option>{unidades.map(u=><option key={u} value={u}>{u}</option>)}</select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tag</label>
                    <select value={filtroTag} onChange={(e)=>setFiltroTag(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                        <option value="Todas">Todas</option>
                        {tagsGlobais.map(t=><option key={t} value={t}>#{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                    <select value={filtroStatus} onChange={(e)=>setFiltroStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                        <option value="Todos">Todos</option>
                        <option value="A Fazer">A Fazer</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                    </select>
                </div>
                <div className="md:col-span-6 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={()=>setFiltroFavorito(!filtroFavorito)} className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${filtroFavorito ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600'}`}>
                            {filtroFavorito ? '★ Favoritos' : '☆ Favoritos'}
                        </button>
                        <button onClick={()=>{setBusca("");setFiltroEscola("Todas");setFiltroNivel("Todos");setFiltroConceito("Todos");setFiltroFaixa("Todos");setFiltroFavorito(false);setFiltroStatus("Todos");setFiltroTag("Todas");}} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 transition">Limpar filtros</button>
                    </div>
                    {/* Ordenação + Seletor de modo */}
                    <div className="flex gap-2 items-center flex-wrap">
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
                            <span className="text-xs text-slate-400 font-semibold">Ordenar:</span>
                            {[
                                {id:'recente',   label:'Recente'},
                                {id:'az',        label:'A–Z'},
                                {id:'status',    label:'Status'},
                                {id:'favoritos', label:'★'},
                            ].map(o=>(
                                <button key={o.id} onClick={()=>setOrdenacaoCards(o.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${ordenacaoCards===o.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                            {[
                                { id:'grade',    label:'⊞', title:'Grade' },
                                { id:'compacto', label:'☰', title:'Lista' },
                                { id:'periodo',  label:'📆', title:'Por Período' },
                                { id:'segmento', label:'👥', title:'Por Segmento' },
                            ].map(m=>(
                                <button key={m.id} onClick={()=>setModoVisualizacao(m.id)} title={m.title}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${modoVisualizacao===m.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Contagem */}
        <p className="text-xs text-gray-400 mb-3 px-1">{planosFiltrados.length} plano{planosFiltrados.length!==1?'s':''}</p>

        {/* ── MODO GRADE ── */}
        {modoVisualizacao === 'grade' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {planosFiltrados.map(plano => {
                    const status = plano.statusPlanejamento || 'A Fazer';
                    const barraGrad = plano.destaque
                        ? 'from-amber-400 to-yellow-300'
                        : status === 'Concluído'    ? 'from-emerald-400 to-teal-400'
                        : status === 'Em Andamento' ? 'from-blue-400 to-indigo-400'
                        : 'from-slate-300 to-slate-400';
                    const statusStyle = {
                        'A Fazer':      'bg-slate-100 text-slate-500',
                        'Em Andamento': 'bg-blue-50 text-blue-600 border border-blue-100',
                        'Concluído':    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }[status];
                    return (
                    <div key={plano.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col overflow-hidden group">
                        {/* Barra gradiente de status no topo */}
                        <div className={`h-1.5 bg-gradient-to-r ${barraGrad}`}/>
                        <div className="p-4 flex-1">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Badge de status clicável com dropdown */}
                                    <div className="relative">
                                        <button
                                            onClick={(e)=>{e.stopPropagation(); setStatusDropdownId(statusDropdownId===plano.id ? null : plano.id);}}
                                            title="Clique para alterar o status"
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition flex items-center gap-1 ${statusStyle}`}>
                                            {status} <span className="opacity-40 text-xs">▾</span>
                                        </button>
                                        {statusDropdownId === plano.id && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]"
                                                 onClick={e=>e.stopPropagation()}>
                                                {['A Fazer','Em Andamento','Concluído'].map(s => {
                                                    const cores = {
                                                        'A Fazer':      'hover:bg-slate-50 text-slate-600',
                                                        'Em Andamento': 'hover:bg-blue-50 text-blue-700',
                                                        'Concluído':    'hover:bg-emerald-50 text-emerald-700'
                                                    };
                                                    const icons = {'A Fazer':'⬜','Em Andamento':'🔵','Concluído':'✅'};
                                                    return (
                                                        <button key={s}
                                                            onClick={()=>{ setPlanos(planos.map(p=>p.id===plano.id?{...p,statusPlanejamento:s}:p)); setStatusDropdownId(null); }}
                                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-2 ${cores[s]} ${status===s?'opacity-50 cursor-default':''}`}>
                                                            {icons[s]} {s}
                                                            {status===s && <span className="ml-auto text-slate-300">✓</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {plano.numeroAula && <span className="text-xs text-slate-400 font-medium">{plano.numeroAula}</span>}
                                </div>
                                <button onClick={(e)=>toggleFavorito(plano,e)} className={`text-base shrink-0 hover:scale-110 transition ${plano.destaque ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}>
                                    {plano.destaque ? '★' : '☆'}
                                </button>
                            </div>

                            <h3 className="font-bold text-slate-800 text-base leading-snug mb-1">{plano.titulo}</h3>
                            {plano.tema && <p className="text-xs text-slate-400 mb-3 line-clamp-1">{plano.tema}</p>}

                            {/* Badges */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {plano.escola && <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">🏫 {plano.escola}</span>}
                                {(plano.faixaEtaria||[])[0] && <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">👥 {(plano.faixaEtaria||[])[0]}</span>}
                                {(plano.unidades||[])[0] && <span className="text-xs text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">📚 {(plano.unidades||[])[0]}</span>}
                            </div>

                            {/* Conceitos */}
                            {(plano.conceitos||[]).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {(plano.conceitos||[]).slice(0,3).map(c=>(
                                        <span key={c} className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full">{c}</span>
                                    ))}
                                    {(plano.conceitos||[]).length > 3 && <span className="text-xs text-slate-400">+{(plano.conceitos||[]).length-3}</span>}
                                </div>
                            )}
                        </div>

                        {/* Rodapé com ações */}
                        <div className="border-t border-slate-100 px-3 py-2.5 flex items-center gap-1">
                            <button onClick={(e)=>{e.stopPropagation();setPlanoSelecionado(plano)}}
                                className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold py-2 px-3 rounded-xl transition">
                                Ver plano
                            </button>
                            <button onClick={(e)=>{e.stopPropagation();setPlanoParaAplicar(plano)}}
                                title="Aplicar em turmas"
                                className="p-2 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-500 rounded-xl transition shrink-0">
                                📅
                            </button>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button onClick={(e)=>abrirModalRegistro(plano,e)}
                                    className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-xl transition" title="Registro Pós-Aula" aria-label="Registro pós-aula">📝</button>
                                <button onClick={(e)=>{e.stopPropagation();editarPlano(plano)}}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition" title="Editar" aria-label="Editar plano">✏️</button>
                                <button onClick={(e)=>{e.stopPropagation();exportarPlanoPDF(plano)}}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition text-xs font-bold" title="PDF">PDF</button>
                                <button onClick={(e)=>{e.stopPropagation(); const copia=carimbарTimestamp({...plano, id:Date.now(), titulo:'[Cópia] '+plano.titulo, statusPlanejamento:'A Fazer', historicoDatas:[], registrosPosAula:[], destaque:false}); setPlanos(prev=>[...prev, copia]); if (!userId) marcarPendente('planos', String(copia.id)); setModalConfirm({ conteudo: '✅ Plano duplicado!', somenteOk: true, labelConfirm: 'OK' });}}
                                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition" title="Duplicar">⎘</button>
                                <button onClick={(e)=>{e.stopPropagation();excluirPlano(plano.id)}}
                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition" title="Excluir" aria-label="Excluir plano">🗑</button>
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
                {planosFiltrados.length === 0 && <p className="text-center text-gray-400 py-10">Nenhum plano encontrado.</p>}
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
                const ref = datas.length > 0 ? datas[datas.length - 1] : new Date(plano.id).toISOString().slice(0,10);
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

        {/* ── MODAL APLICAR EM TURMAS ── */}
        {planoParaAplicar && (
            <ModalAplicarEmTurmas
                plano={planoParaAplicar}
                onClose={() => setPlanoParaAplicar(null)}
            />
        )}
    </>
    );

}
