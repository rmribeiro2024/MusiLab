import React, { useState, useMemo } from 'react'
import { sanitizar, gerarIdSeguro, stripHTML } from '../lib/utils'
import { useAtividadesContext, useAnoLetivoContext, useModalContext, useRepertorioContext, usePlanosContext } from '../contexts'
import type { Atividade } from '../types'
import { exportarAtividadePDF, gerarLinkCompartilhavel } from '../utils/pdf'

/** Converte HTML para texto legível preservando estrutura de listas */
function htmlParaTextoLegivel(html: string): string {
    if (!html) return ''
    return html
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<\/li>/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ').trim()
}

interface CardAtividadeProps {
  ativ: Atividade
  setAtividadeEditando: (a: Atividade) => void
  excluirAtividade: (id: string | number) => void
  setModalAdicionarAoPlano: (v: Atividade | null) => void
}

// ── CARD ATIVIDADE (memoizado) ──
const CardAtividade = React.memo(({ ativ, setAtividadeEditando, excluirAtividade, setModalAdicionarAoPlano }: CardAtividadeProps) => {
    const { setViewMode } = useRepertorioContext()
    const { setBusca } = usePlanosContext()

    return (
        <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
            <div className="p-[18px] flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-[#E5E7EB] text-[14px] leading-[1.35] line-clamp-2">{ativ.nome}</h3>
                    <div className="flex gap-0.5 shrink-0 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => exportarAtividadePDF(ativ)}
                            className="text-slate-300 dark:text-slate-600 hover:text-emerald-500 p-[6px] rounded-md transition" title="Exportar PDF">
                            <i className="fas fa-file-pdf text-[12px]"/>
                        </button>
                        <button onClick={() => {
                                const link = gerarLinkCompartilhavel('atividade', ativ as Record<string, unknown>)
                                navigator.clipboard.writeText(link).then(() =>
                                    window.dispatchEvent(new CustomEvent('musilab:toast', { detail: { msg: 'Link copiado!', type: 'success' } }))
                                )
                            }}
                            className="text-slate-300 dark:text-slate-600 hover:text-indigo-400 dark:hover:text-indigo-300 p-[6px] rounded-md transition" title="Copiar link">
                            <i className="fas fa-link text-[12px]"/>
                        </button>
                        <button onClick={()=>setAtividadeEditando(ativ)}
                            className="text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-300 p-[6px] rounded-md transition" title="Editar">
                            <i className="fas fa-pencil text-[12px]"/>
                        </button>
                        <button onClick={()=>excluirAtividade(ativ.id)}
                            className="text-slate-300 dark:text-slate-600 hover:text-red-400 p-[6px] rounded-md transition" title="Excluir">
                            <i className="fas fa-trash-can text-[12px]"/>
                        </button>
                    </div>
                </div>
                {ativ.descricao && <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] line-clamp-2 mb-2">{htmlParaTextoLegivel(ativ.descricao)}</p>}
                {ativ.origemAula && (
                    <button
                        onClick={() => { setBusca(ativ.origemAula.planoTitulo); setViewMode('lista') }}
                        className="text-left text-[11px] text-[#5B5FEA] dark:text-[#818cf8] hover:text-[#4f53d4] bg-[#5B5FEA]/5 dark:bg-[#5B5FEA]/10 border border-[#5B5FEA]/20 px-2.5 py-1 rounded-lg mb-2 transition truncate font-medium"
                        title="Ver aula de origem">
                        ↗ De: {ativ.origemAula.planoTitulo}
                    </button>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3 mt-auto">
                    {ativ.duracao && (
                        <span className="text-[11px] bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#9CA3AF] px-2 py-0.5 rounded-full font-medium">{ativ.duracao}</span>
                    )}
                    {(ativ.faixaEtaria||[]).slice(0,2).map(f=>(
                        <span key={f} className="text-[11px] bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 text-[#5B5FEA] dark:text-[#818cf8] border border-[#5B5FEA]/20 px-2 py-0.5 rounded-full font-medium">{f}</span>
                    ))}
                    {(ativ.conceitos||[]).slice(0,1).map(c=>(
                        <span key={c} className="text-[11px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-[#9CA3AF] px-2 py-0.5 rounded-full font-medium">{c}</span>
                    ))}
                    {(ativ.tags||[]).slice(0,2).map(t=>(
                        <span key={t} className="text-[11px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-[#9CA3AF] px-2 py-0.5 rounded-full">#{t}</span>
                    ))}
                </div>
                {ativ.contadorUso != null && ativ.contadorUso > 0 ? (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mb-2">
                        {ativ.ultimoUso ? `Última: ${new Date(ativ.ultimoUso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · ` : ''}
                        {ativ.contadorUso} uso{ativ.contadorUso !== 1 ? 's' : ''}
                    </p>
                ) : (
                    <p className="text-[11px] text-slate-300 dark:text-slate-600 mb-2 italic">Nunca usada em plano</p>
                )}
                <button onClick={()=>setModalAdicionarAoPlano(ativ)}
                    className="w-full border border-[#E6EAF0] dark:border-[#374151] hover:border-[#5B5FEA]/40 dark:hover:border-[#818cf8]/40 hover:bg-[#5B5FEA]/5 dark:hover:bg-[#5B5FEA]/10 text-slate-600 dark:text-[#9CA3AF] hover:text-[#5B5FEA] dark:hover:text-[#818cf8] py-2 rounded-xl font-semibold text-[12px] transition mt-1">
                    + Adicionar ao Plano
                </button>
            </div>
        </div>
    )
});

// ── input base classes ──
const inp = "w-full px-4 py-3 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm focus:border-[#5B5FEA] dark:focus:border-[#818cf8] outline-none transition bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E5E7EB] placeholder:text-slate-400 dark:placeholder:text-[#6b7280]"
const inpSm = "w-full px-3 py-2 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm focus:border-[#5B5FEA] dark:focus:border-[#818cf8] outline-none transition bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E5E7EB] placeholder:text-slate-400 dark:placeholder:text-[#6b7280]"
const lbl = "block text-[11px] font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wide mb-1.5"

export default function ModuloAtividades() {
    const {
        adicionarRecursoAtiv,
        atividadeEditando,
        atividades,
        buscaAtividade,
        excluirAtividade,
        filtroConceitoAtividade,
        filtroFaixaAtividade,
        filtroTagAtividade,
        modoVisAtividades,
        novaAtividade,
        novoRecursoTipoAtiv,
        novoRecursoUrlAtiv,
        removerRecursoAtiv,
        salvarAtividade,
        setAtividadeEditando,
        setAtividadeVinculandoMusica,
        setBuscaAtividade,
        setFiltroConceitoAtividade,
        setFiltroFaixaAtividade,
        setFiltroTagAtividade,
        setModalAdicionarAoPlano,
        setModoVisAtividades,
        setNovoRecursoTipoAtiv,
        setNovoRecursoUrlAtiv,
    } = useAtividadesContext()
    const { conceitos, faixas, setConceitos, tagsGlobais, setTagsGlobais, unidades, setUnidades } = useAnoLetivoContext()
    const { setModalConfirm } = useModalContext()
    const todasAsTags = useMemo(() => [...new Set(atividades.flatMap(a => a.tags || []))], [atividades])
    const [filtrosAbertos, setFiltrosAbertos] = useState(() => localStorage.getItem('atividades_filtros_abertos') !== 'false')
    const toggleFiltros = (v: boolean) => { setFiltrosAbertos(v); localStorage.setItem('atividades_filtros_abertos', String(v)) }

    const atividadesFiltradas = useMemo(() => atividades.filter(a => {
        const termoBusca = buscaAtividade.toLowerCase();
        const matchBusca = !buscaAtividade ||
            a.nome.toLowerCase().includes(termoBusca) ||
            (a.descricao||'').toLowerCase().includes(termoBusca) ||
            (a.duracao||'').toLowerCase().includes(termoBusca) ||
            (a.materiais||[]).some(m=>m.toLowerCase().includes(termoBusca)) ||
            (a.tags||[]).some(t=>t.toLowerCase().includes(termoBusca)) ||
            (a.unidade||'').toLowerCase().includes(termoBusca) ||
            (a.observacao||'').toLowerCase().includes(termoBusca);
        const tagSelecionada = filtroTagAtividade.replace(/^#/, '');
        const matchTag = filtroTagAtividade === 'Todas' || (a.tags || []).includes(tagSelecionada);
        const matchFaixa = filtroFaixaAtividade === 'Todas' || (a.faixaEtaria || []).includes(filtroFaixaAtividade);
        const matchConceito = filtroConceitoAtividade === 'Todos' || (a.conceitos || []).includes(filtroConceitoAtividade);
        return matchBusca && matchTag && matchFaixa && matchConceito;
    }), [atividades, buscaAtividade, filtroTagAtividade, filtroFaixaAtividade, filtroConceitoAtividade]);

    // ── FORMULÁRIO DE EDIÇÃO ──
    if (atividadeEditando) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={()=>setAtividadeEditando(null)}
                        className="bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-[#9CA3AF] px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5">
                        ← Voltar
                    </button>
                    <div>
                        <h2 className="text-[22px] font-bold tracking-[-0.025em] text-slate-900 dark:text-[#E5E7EB]">
                            {atividades.find(a=>a.id===atividadeEditando.id) ? 'Editar Atividade' : 'Nova Atividade'}
                        </h2>
                        <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">Atividade pedagógica reutilizável</p>
                    </div>
                </div>
                <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm overflow-hidden">
                    <div className="p-[18px] space-y-5">
                        <div>
                            <label className={lbl}>Nome *</label>
                            <input type="text" placeholder="Ex: Brincadeira cantada em roda"
                                value={atividadeEditando.nome}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,nome:e.target.value})}
                                className={inp}/>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className={lbl.replace(' mb-1.5','')}>Descrição</label>
                                <button type="button" onClick={()=>setAtividadeVinculandoMusica(atividadeEditando.id)}
                                    className="bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 hover:bg-[#5B5FEA]/20 text-[#5B5FEA] dark:text-[#818cf8] px-3 py-1 rounded-lg text-xs font-bold transition">
                                    Vincular música
                                </button>
                            </div>
                            <textarea value={atividadeEditando.descricao}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,descricao:e.target.value})}
                                className={inp + " resize-none"}
                                rows={3} placeholder="Como fazer a atividade..."/>
                            {(atividadeEditando.musicasVinculadas||[]).length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {atividadeEditando.musicasVinculadas.map((musica,mi) => (
                                        <div key={mi} className="flex items-center justify-between bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 border border-[#5B5FEA]/20 px-3 py-2 rounded-xl">
                                            <span className="text-[#5B5FEA] dark:text-[#818cf8] text-sm font-semibold">{musica.titulo}{musica.autor && ` — ${musica.autor}`}</span>
                                            <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,musicasVinculadas:atividadeEditando.musicasVinculadas.filter((_,idx)=>idx!==mi)})} className="text-slate-400 hover:text-red-500 transition">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={lbl}>Nível</label>
                                <div className="flex flex-wrap gap-2">
                                    {faixas.slice(1).map(f=>(
                                        <button key={f} type="button"
                                            onClick={()=>{const tem=atividadeEditando.faixaEtaria.includes(f);setAtividadeEditando({...atividadeEditando,faixaEtaria:tem?atividadeEditando.faixaEtaria.filter(x=>x!==f):[...atividadeEditando.faixaEtaria,f]});}}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${atividadeEditando.faixaEtaria.includes(f)?'bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 text-[#5B5FEA] dark:text-[#818cf8] border border-[#5B5FEA]/30':'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#9CA3AF] border border-transparent hover:bg-slate-200 dark:hover:bg-white/15'}`}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={lbl}>Duração</label>
                                <input type="text" value={atividadeEditando.duracao}
                                    onChange={e=>setAtividadeEditando({...atividadeEditando,duracao:e.target.value})}
                                    className={inp} placeholder="Ex: 15 min"/>
                            </div>
                        </div>
                        <div>
                            <label className={lbl}>Materiais</label>
                            <textarea value={(atividadeEditando.materiais||[]).join('\n')}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,materiais:e.target.value.split('\n').filter(Boolean)})}
                                className={inp + " resize-none"} rows={3} placeholder="Um por linha"/>
                        </div>
                        <div>
                            <label className={lbl}>Conceitos Musicais</label>
                            {(atividadeEditando.conceitos||[]).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-[#E6EAF0] dark:border-[#374151]">
                                    {(atividadeEditando.conceitos||[]).map((conceito,idx)=>(
                                        <span key={idx} className="bg-[#5B5FEA]/8 dark:bg-[#5B5FEA]/15 text-[#5B5FEA] dark:text-[#818cf8] border border-[#5B5FEA]/25 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                            {conceito}
                                            <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,conceitos:atividadeEditando.conceitos.filter((_,i)=>i!==idx)})} className="hover:text-red-500 transition ml-1">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(conceitos||[]).map(conceito=>(
                                    <div key={conceito} className="flex items-center gap-1 v2-card border border-[#E6EAF0] dark:border-[#374151] rounded-full">
                                        <button type="button"
                                            onClick={()=>{if(!(atividadeEditando.conceitos||[]).includes(conceito)){setAtividadeEditando({...atividadeEditando,conceitos:[...(atividadeEditando.conceitos||[]),conceito]});}}}
                                            disabled={(atividadeEditando.conceitos||[]).includes(conceito)}
                                            className={`px-3 py-1 rounded-l-full text-sm transition ${(atividadeEditando.conceitos||[]).includes(conceito)?'text-slate-300 dark:text-slate-600 cursor-not-allowed':'text-[#5B5FEA] dark:text-[#818cf8] hover:bg-[#5B5FEA]/5'}`}>
                                            {conceito}
                                        </button>
                                        <button type="button"
                                            onClick={()=>setModalConfirm({titulo:'Remover conceito?',conteudo:`Remover "${conceito}" da lista permanentemente?`,labelConfirm:'Remover',perigo:true,onConfirm:()=>{setConceitos(conceitos.filter(c=>c!==conceito));if((atividadeEditando.conceitos||[]).includes(conceito)){setAtividadeEditando({...atividadeEditando,conceitos:atividadeEditando.conceitos.filter(c=>c!==conceito)});}}})}
                                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded-r-full transition">✕</button>
                                    </div>
                                ))}
                            </div>
                            <input type="text"
                                onKeyDown={e=>{const t=e.target as HTMLInputElement;if((e.key==='Enter'||e.key===' ')&&t.value.trim()){e.preventDefault();const nc=t.value.trim();if(nc&&!(atividadeEditando.conceitos||[]).includes(nc)){setAtividadeEditando({...atividadeEditando,conceitos:[...(atividadeEditando.conceitos||[]),nc]});if(!conceitos.includes(nc)){setConceitos([...conceitos,nc].sort());}}t.value='';}}}
                                className={inpSm} placeholder="Digite e pressione Enter... Ex: Ritmo, Melodia"/>
                        </div>
                        <div>
                            <label className={lbl}>Tags</label>
                            {(atividadeEditando.tags||[]).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-[#E6EAF0] dark:border-[#374151]">
                                    {(atividadeEditando.tags||[]).map((tag,idx)=>(
                                        <span key={idx} className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#9CA3AF] border border-[#E6EAF0] dark:border-[#374151] px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                            #{tag}
                                            <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,tags:atividadeEditando.tags.filter((_,i)=>i!==idx)})} className="hover:text-red-500 transition ml-1">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(tagsGlobais||[]).map(tag=>(
                                    <div key={tag} className="flex items-center gap-1 v2-card border border-[#E6EAF0] dark:border-[#374151] rounded-full">
                                        <button type="button"
                                            onClick={()=>{if(!(atividadeEditando.tags||[]).includes(tag)){setAtividadeEditando({...atividadeEditando,tags:[...(atividadeEditando.tags||[]),tag]});}}}
                                            disabled={(atividadeEditando.tags||[]).includes(tag)}
                                            className={`px-3 py-1 rounded-l-full text-sm transition ${(atividadeEditando.tags||[]).includes(tag)?'text-slate-300 dark:text-slate-600 cursor-not-allowed':'text-slate-600 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                            #{tag}
                                        </button>
                                        <button type="button"
                                            onClick={()=>setModalConfirm({titulo:'Remover tag?',conteudo:`Remover "${tag}" da lista permanentemente?`,labelConfirm:'Remover',perigo:true,onConfirm:()=>{setTagsGlobais(tagsGlobais.filter(t=>t!==tag));if((atividadeEditando.tags||[]).includes(tag)){setAtividadeEditando({...atividadeEditando,tags:atividadeEditando.tags.filter(t=>t!==tag)});}}})}
                                            className="text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded-r-full transition">✕</button>
                                    </div>
                                ))}
                            </div>
                            <input type="text"
                                onKeyDown={e=>{const t=e.target as HTMLInputElement;if((e.key==='Enter'||e.key===' ')&&t.value.trim()){e.preventDefault();const nt=t.value.trim().replace(/^#/,'');if(nt&&!(atividadeEditando.tags||[]).includes(nt)){setAtividadeEditando({...atividadeEditando,tags:[...(atividadeEditando.tags||[]),nt]});if(!tagsGlobais.includes(nt)){setTagsGlobais([...tagsGlobais,nt].sort());}}t.value='';}}}
                                className={inpSm} placeholder="Digite e pressione Enter... Ex: roda, jogos"/>
                        </div>
                        <div>
                            <label className={lbl}>Unidade (opcional)</label>
                            <select value={atividadeEditando._adicionandoUnidade ? '__NOVA__' : (atividadeEditando.unidade||'')}
                                onChange={e=>{if(e.target.value==='__NOVA__'){setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:true});}else{setAtividadeEditando({...atividadeEditando,unidade:e.target.value,_adicionandoUnidade:false});}}}
                                className={inp}>
                                <option value="">Selecione ou adicione...</option>
                                {unidades.map(u=><option key={u} value={u}>{u}</option>)}
                                <option value="__NOVA__">+ Adicionar nova unidade...</option>
                            </select>
                            {atividadeEditando._adicionandoUnidade && (
                                <div className="flex gap-2 mt-2">
                                    <input type="text" autoFocus placeholder="Nome da unidade..."
                                        className={inpSm}
                                        onKeyDown={e=>{const t=e.target as HTMLInputElement;if(e.key==='Enter'&&t.value.trim()){const u=t.value.trim();if(!unidades.includes(u)){setUnidades([...unidades,u].sort());}setAtividadeEditando({...atividadeEditando,unidade:u,_adicionandoUnidade:false});}if(e.key==='Escape'){setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:false});}}}/>
                                    <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:false})}
                                        className="px-3 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-[#9CA3AF] rounded-xl text-sm transition">Cancelar</button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={lbl}>Observação (opcional)</label>
                            <textarea value={atividadeEditando.observacao||''}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,observacao:e.target.value})}
                                className={inp + " resize-none"} rows={2}/>
                        </div>
                        <div className="rounded-xl border border-[#E6EAF0] dark:border-[#374151] overflow-hidden">
                            <div className="bg-slate-50 dark:bg-white/5 px-4 py-2.5 border-b border-[#E6EAF0] dark:border-[#374151]">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-[#9CA3AF] uppercase tracking-wide">Links e Imagens</span>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2 flex-col sm:flex-row">
                                    <input type="text" placeholder="URL..."
                                        value={novoRecursoUrlAtiv}
                                        onChange={e=>setNovoRecursoUrlAtiv(e.target.value)}
                                        className={inpSm}/>
                                    <select value={novoRecursoTipoAtiv}
                                        onChange={e=>setNovoRecursoTipoAtiv(e.target.value)}
                                        className="px-3 py-2 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm bg-white dark:bg-[#111827] text-slate-700 dark:text-[#E5E7EB] outline-none">
                                        <option value="link">Link</option>
                                        <option value="imagem">Imagem</option>
                                    </select>
                                    <button type="button" onClick={adicionarRecursoAtiv}
                                        className="bg-[#5B5FEA] hover:bg-[#4f53d4] text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm">Add</button>
                                </div>
                                <div className="space-y-2">
                                    {(atividadeEditando.recursos||[]).map((rec,idx)=>(
                                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-2 rounded-xl border border-[#E6EAF0] dark:border-[#374151]">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <i className={`fas ${rec.tipo==='imagem'?'fa-image':'fa-link'} text-slate-400 dark:text-slate-500 text-[12px]`}/>
                                                <span className="text-sm truncate max-w-xs text-slate-600 dark:text-[#9CA3AF]">{rec.url}</span>
                                            </div>
                                            <button type="button" onClick={()=>removerRecursoAtiv(idx)} className="text-slate-400 hover:text-red-500 transition px-2">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-[#E6EAF0] dark:border-[#374151]">
                            <button onClick={()=>setAtividadeEditando(null)}
                                className="flex-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-[#9CA3AF] py-3 rounded-xl font-semibold text-sm transition">
                                Cancelar
                            </button>
                            <button onClick={salvarAtividade}
                                className="flex-1 bg-[#5B5FEA] hover:bg-[#4f53d4] text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                                Salvar Atividade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── LISTAGEM ──
    return (
        <>
            {/* ── HEADER ── */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-[22px] font-bold tracking-[-0.025em] text-slate-900 dark:text-[#E5E7EB]">Banco de Atividades</h2>
                    <p className="text-[12px] text-slate-500 dark:text-[#9CA3AF] mt-0.5">{atividades.length} atividade{atividades.length !== 1 ? 's' : ''} cadastrada{atividades.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={novaAtividade}
                    className="bg-[#5B5FEA] hover:bg-[#4f53d4] text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2 text-sm">
                    + Nova Atividade
                </button>
            </div>

            {/* ── FILTROS ── */}
            <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm p-[18px] mb-5">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px]">
                        <input type="text" placeholder="Buscar nome, descrição, tag..."
                            value={buscaAtividade} onChange={e=>setBuscaAtividade(e.target.value)}
                            className={inpSm}/>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={()=>toggleFiltros(!filtrosAbertos)}
                            className={`px-3 py-2 text-[12px] font-semibold border-[1.5px] rounded-xl transition whitespace-nowrap
                                ${filtrosAbertos
                                    ? 'bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 border-[#5B5FEA]/30 text-[#5B5FEA] dark:text-[#818cf8]'
                                    : 'v2-card border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:border-[#5B5FEA]/40 hover:text-[#5B5FEA]'}`}>
                            {filtrosAbertos ? '▲ Menos' : '▼ Filtros'}
                        </button>
                        <div className="flex items-center gap-0.5">
                            {([
                                {id:'grade',   icon:'fa-table-cells-large', title:'Grade'},
                                {id:'lista',   icon:'fa-list',              title:'Lista'},
                                {id:'segmento',icon:'fa-users',             title:'Por Segmento'},
                            ] as const).map(m=>(
                                <button key={m.id} onClick={()=>setModoVisAtividades(m.id)} title={m.title}
                                    className={`px-[7px] py-[4px] rounded-[5px] transition-all duration-[120ms] ${modoVisAtividades===m.id?'bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 text-[#5B5FEA] dark:text-[#818cf8]':'text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF]'}`}>
                                    <i className={`fas ${m.icon} text-[13px]`}/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {filtrosAbertos && (
                    <div className="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t border-[#E6EAF0] dark:border-[#374151]">
                        {[
                            { label:'Tag', value:filtroTagAtividade, onChange:setFiltroTagAtividade,
                              options:[<option key="t">Todas</option>, ...todasAsTags.map(t=><option key={t}>#{t}</option>)] },
                            { label:'Conceito', value:filtroConceitoAtividade, onChange:setFiltroConceitoAtividade,
                              options:[<option key="t">Todos</option>, ...conceitos.map(c=><option key={c}>{c}</option>)] },
                            { label:'Nível', value:filtroFaixaAtividade, onChange:setFiltroFaixaAtividade,
                              options:faixas.map(f=><option key={f}>{f}</option>) },
                        ].map(({label,value,onChange,options})=>(
                            <div key={label} className="min-w-[140px]">
                                <label className={lbl}>{label}</label>
                                <select value={value} onChange={e=>onChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-sm focus:border-[#5B5FEA] outline-none bg-white dark:bg-[#111827] text-slate-700 dark:text-[#E5E7EB]">
                                    {options}
                                </select>
                            </div>
                        ))}
                        <button onClick={()=>{setBuscaAtividade('');setFiltroTagAtividade('Todas');setFiltroFaixaAtividade('Todas');setFiltroConceitoAtividade('Todos');}}
                            className="px-4 py-2 text-[12px] border border-[#E6EAF0] dark:border-[#374151] rounded-xl text-slate-600 dark:text-[#9CA3AF] hover:bg-slate-50 dark:hover:bg-white/5 transition self-end">
                            Limpar
                        </button>
                    </div>
                )}
                {atividadesFiltradas.length !== atividades.length && (
                    <p className="text-[11px] text-[#5B5FEA] dark:text-[#818cf8] mt-2 font-medium">
                        Mostrando {atividadesFiltradas.length} de {atividades.length} atividades
                    </p>
                )}
            </div>

            {/* ── CONTEÚDO ── */}
            {atividadesFiltradas.length === 0 ? (
                <div className="text-center py-24">
                    <div className="text-5xl mb-4">🎯</div>
                    <p className="text-slate-500 dark:text-[#9CA3AF] text-lg font-medium">Nenhuma atividade encontrada</p>
                    <p className="text-slate-400 dark:text-[#6b7280] text-sm mt-1">Tente ajustar os filtros ou crie uma nova atividade</p>
                    <button onClick={novaAtividade} className="mt-4 bg-[#5B5FEA] hover:bg-[#4f53d4] text-white px-5 py-2.5 rounded-xl font-bold transition shadow-sm text-sm">
                        + Nova Atividade
                    </button>
                </div>
            ) : (
                <>
                    {modoVisAtividades === 'grade' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
                            {atividadesFiltradas.map(ativ => <CardAtividade key={ativ.id} ativ={ativ} setAtividadeEditando={setAtividadeEditando} excluirAtividade={excluirAtividade} setModalAdicionarAoPlano={setModalAdicionarAoPlano} />)}
                        </div>
                    )}
                    {modoVisAtividades === 'lista' && (
                        <div className="v2-card rounded-xl border border-[#E6EAF0] dark:border-[#374151] shadow-sm overflow-hidden">
                            {atividadesFiltradas.map((ativ, i)=>(
                                <div key={ativ.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-white/5 transition group ${i>0?'border-t border-[#E6EAF0] dark:border-[#374151]':''}`}>
                                    <div className="w-[3px] h-10 rounded-full bg-[#5B5FEA]/40 dark:bg-[#818cf8]/40 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-800 dark:text-[#E5E7EB] text-[14px] truncate">{ativ.nome}</h4>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {ativ.duracao && <span className="text-[11px] text-slate-400 dark:text-[#6b7280]">{ativ.duracao}</span>}
                                            {(ativ.faixaEtaria||[]).slice(0,1).map(f=><span key={f} className="text-[11px] text-[#5B5FEA] dark:text-[#818cf8]">{f}</span>)}
                                            {(ativ.tags||[]).slice(0,2).map(t=><span key={t} className="text-[11px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-[#9CA3AF] px-2 py-0.5 rounded-full border border-[#E6EAF0] dark:border-[#374151]">#{t}</span>)}
                                            {ativ.contadorUso != null && ativ.contadorUso > 0
                                                ? <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{ativ.contadorUso} uso{ativ.contadorUso !== 1 ? 's' : ''}</span>
                                                : <span className="text-[11px] text-slate-300 dark:text-slate-600 italic">Nunca usada</span>
                                            }
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button onClick={()=>setModalAdicionarAoPlano(ativ)}
                                            className="border border-[#E6EAF0] dark:border-[#374151] hover:border-[#5B5FEA]/40 hover:text-[#5B5FEA] dark:hover:text-[#818cf8] text-slate-600 dark:text-[#9CA3AF] px-3 py-1.5 rounded-lg text-[11px] font-bold transition">
                                            + Plano
                                        </button>
                                        <button onClick={()=>setAtividadeEditando(ativ)}
                                            className="text-slate-300 dark:text-slate-600 hover:text-amber-400 p-[7px] rounded-lg transition">
                                            <i className="fas fa-pencil text-[12px]"/>
                                        </button>
                                        <button onClick={()=>excluirAtividade(ativ.id)}
                                            className="text-slate-300 dark:text-slate-600 hover:text-red-400 p-[7px] rounded-lg transition">
                                            <i className="fas fa-trash-can text-[12px]"/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {modoVisAtividades === 'segmento' && (() => {
                        const porFaixa: Record<string, Atividade[]> = {};
                        atividadesFiltradas.forEach(a => {
                            (a.faixaEtaria || ['Sem faixa definida']).forEach(f => {
                                if (!porFaixa[f]) porFaixa[f] = [];
                                porFaixa[f].push(a);
                            });
                        });
                        return Object.keys(porFaixa).sort().map(faixa=>(
                            <div key={faixa} className="mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-[15px] font-bold text-slate-700 dark:text-[#D1D5DB]">{faixa}</h3>
                                    <span className="text-[11px] bg-[#5B5FEA]/10 dark:bg-[#5B5FEA]/20 text-[#5B5FEA] dark:text-[#818cf8] px-2 py-0.5 rounded-full font-medium">{porFaixa[faixa].length}</span>
                                    <div className="flex-1 h-px bg-[#E6EAF0] dark:bg-[#374151]" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[14px]">
                                    {porFaixa[faixa].map(ativ=><CardAtividade key={ativ.id} ativ={ativ} setAtividadeEditando={setAtividadeEditando} excluirAtividade={excluirAtividade} setModalAdicionarAoPlano={setModalAdicionarAoPlano} />)}
                                </div>
                            </div>
                        ));
                    })()}
                </>
            )}
        </>
    );

}
