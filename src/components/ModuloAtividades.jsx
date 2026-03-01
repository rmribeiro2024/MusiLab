import React, { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { sanitizar, gerarIdSeguro } from '../lib/utils'
import { useBancoPlanos } from './BancoPlanosContext'

// ── CARD ATIVIDADE (memoizado — só re-renderiza quando a atividade muda) ──
const CardAtividade = React.memo(({ ativ, setAtividadeEditando, excluirAtividade, setModalAdicionarAoPlano }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-2xl" />
        <div className="p-4 flex flex-col flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-bold text-gray-800 leading-tight line-clamp-2">{ativ.nome}</h3>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={()=>setAtividadeEditando(ativ)} className="text-slate-400 hover:text-blue-600 p-1 rounded transition" title="Editar">✏️</button>
                    <button onClick={()=>excluirAtividade(ativ.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition" title="Excluir">🗑️</button>
                </div>
            </div>
            {ativ.descricao && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{ativ.descricao}</p>}
            <div className="flex flex-wrap gap-1.5 mb-3 mt-auto">
                {ativ.duracao && (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">⏱ {ativ.duracao}</span>
                )}
                {(ativ.faixaEtaria||[]).slice(0,2).map(f=>(
                    <span key={f} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">👥 {f}</span>
                ))}
                {(ativ.conceitos||[]).slice(0,1).map(c=>(
                    <span key={c} className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">🎵 {c}</span>
                ))}
                {(ativ.tags||[]).slice(0,2).map(t=>(
                    <span key={t} className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">#{t}</span>
                ))}
            </div>
            <button onClick={()=>setModalAdicionarAoPlano(ativ)}
                className="w-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-2 rounded-xl font-bold text-sm transition mt-1">
                + Adicionar ao Plano
            </button>
        </div>
    </div>
));

export default function ModuloAtividades() {
    const ctx = useBancoPlanos()
    const {
        adicionarRecursoAtiv,
        atividadeEditando,
        atividades,
        bold,
        buscaAtividade,
        conceitos,
        excluirAtividade,
        faixas,
        filtroConceitoAtividade,
        filtroFaixaAtividade,
        filtroTagAtividade,
        h,
        l,
        modoVisAtividades,
        novaAtividade,
        novoRecursoTipoAtiv,
        novoRecursoUrlAtiv,
        removerRecursoAtiv,
        salvarAtividade,
        setAtividadeEditando,
        setAtividadeVinculandoMusica,
        setBuscaAtividade,
        setConceitos,
        setFiltroConceitoAtividade,
        setFiltroFaixaAtividade,
        setFiltroTagAtividade,
        setModalAdicionarAoPlano,
        setModalConfirm,
        setModoVisAtividades,
        setNovoRecursoTipoAtiv,
        setNovoRecursoUrlAtiv,
        setTagsGlobais,
        setUnidades,
        tagsGlobais,
        unidades,
    } = ctx

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

    if (atividadeEditando) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={()=>setAtividadeEditando(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5">
                        ← Voltar
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{atividades.find(a=>a.id===atividadeEditando.id) ? '✏️ Editar Atividade' : '🧩 Nova Atividade'}</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Atividade pedagógica reutilizável</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400"/>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nome *</label>
                            <input type="text" placeholder="Ex: Brincadeira cantada em roda"
                                value={atividadeEditando.nome}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,nome:e.target.value})}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"/>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Descrição</label>
                                <button type="button" onClick={()=>setAtividadeVinculandoMusica(atividadeEditando.id)}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold transition">
                                    🎵 Vincular música
                                </button>
                            </div>
                            <textarea value={atividadeEditando.descricao}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,descricao:e.target.value})}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition resize-none"
                                rows="4" placeholder="Como fazer a atividade..."/>
                            {(atividadeEditando.musicasVinculadas||[]).length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {atividadeEditando.musicasVinculadas.map((musica,mi) => (
                                        <div key={mi} className="flex items-center justify-between bg-indigo-50 px-3 py-2 rounded-xl">
                                            <span className="text-indigo-700 text-sm font-semibold">🎵 {musica.titulo}{musica.autor && ` - ${musica.autor}`}</span>
                                            <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,musicasVinculadas:atividadeEditando.musicasVinculadas.filter((_,idx)=>idx!==mi)})} className="text-slate-400 hover:text-red-500 transition">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Faixa Etária</label>
                                <div className="flex flex-wrap gap-2">
                                    {faixas.slice(1).map(f=>(
                                        <button key={f} type="button"
                                            onClick={()=>{const tem=atividadeEditando.faixaEtaria.includes(f);setAtividadeEditando({...atividadeEditando,faixaEtaria:tem?atividadeEditando.faixaEtaria.filter(x=>x!==f):[...atividadeEditando.faixaEtaria,f]});}}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${atividadeEditando.faixaEtaria.includes(f)?'bg-amber-100 text-amber-700 border border-amber-300':'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200'}`}>
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Duração</label>
                                <input type="text" value={atividadeEditando.duracao}
                                    onChange={e=>setAtividadeEditando({...atividadeEditando,duracao:e.target.value})}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"
                                    placeholder="Ex: 15 min"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Materiais</label>
                            <textarea value={(atividadeEditando.materiais||[]).join('\n')}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,materiais:e.target.value.split('\n').filter(Boolean)})}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition resize-none"
                                rows="3" placeholder="Um por linha"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🎵 Conceitos Musicais</label>
                            {(atividadeEditando.conceitos||[]).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                                    {(atividadeEditando.conceitos||[]).map((conceito,idx)=>(
                                        <span key={idx} className="bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                            {conceito}
                                            <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,conceitos:atividadeEditando.conceitos.filter((_,i)=>i!==idx)})} className="hover:text-red-500 transition ml-1">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(conceitos||[]).map(conceito=>(
                                    <div key={conceito} className="flex items-center gap-1 bg-white border border-purple-200 rounded-full">
                                        <button type="button"
                                            onClick={()=>{if(!(atividadeEditando.conceitos||[]).includes(conceito)){setAtividadeEditando({...atividadeEditando,conceitos:[...(atividadeEditando.conceitos||[]),conceito]});}}}
                                            disabled={(atividadeEditando.conceitos||[]).includes(conceito)}
                                            className={`px-3 py-1 rounded-l-full text-sm transition ${(atividadeEditando.conceitos||[]).includes(conceito)?'text-purple-300 cursor-not-allowed':'text-purple-600 hover:bg-purple-50'}`}>
                                            {conceito}
                                        </button>
                                        <button type="button"
                                            onClick={()=>setModalConfirm({titulo:'Remover conceito?',conteudo:`Remover "${conceito}" da lista permanentemente?`,labelConfirm:'Remover',perigo:true,onConfirm:()=>{setConceitos(conceitos.filter(c=>c!==conceito));if((atividadeEditando.conceitos||[]).includes(conceito)){setAtividadeEditando({...atividadeEditando,conceitos:atividadeEditando.conceitos.filter(c=>c!==conceito)});}}})}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-r-full transition">✕</button>
                                    </div>
                                ))}
                            </div>
                            <input type="text"
                                onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target.value.trim()){e.preventDefault();const nc=e.target.value.trim();if(nc&&!(atividadeEditando.conceitos||[]).includes(nc)){setAtividadeEditando({...atividadeEditando,conceitos:[...(atividadeEditando.conceitos||[]),nc]});if(!conceitos.includes(nc)){setConceitos([...conceitos,nc].sort());}}e.target.value='';}}}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-purple-400 outline-none transition"
                                placeholder="Digite e pressione Enter... Ex: Ritmo, Melodia"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">🏷️ Tags</label>
                            {(atividadeEditando.tags||[]).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
                                    {(atividadeEditando.tags||[]).map((tag,idx)=>(
                                        <span key={idx} className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                                            #{tag}
                                            <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,tags:atividadeEditando.tags.filter((_,i)=>i!==idx)})} className="hover:text-red-500 transition ml-1">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(tagsGlobais||[]).map(tag=>(
                                    <div key={tag} className="flex items-center gap-1 bg-white border border-amber-200 rounded-full">
                                        <button type="button"
                                            onClick={()=>{if(!(atividadeEditando.tags||[]).includes(tag)){setAtividadeEditando({...atividadeEditando,tags:[...(atividadeEditando.tags||[]),tag]});}}}
                                            disabled={(atividadeEditando.tags||[]).includes(tag)}
                                            className={`px-3 py-1 rounded-l-full text-sm transition ${(atividadeEditando.tags||[]).includes(tag)?'text-amber-300 cursor-not-allowed':'text-amber-600 hover:bg-amber-50'}`}>
                                            #{tag}
                                        </button>
                                        <button type="button"
                                            onClick={()=>setModalConfirm({titulo:'Remover tag?',conteudo:`Remover "${tag}" da lista permanentemente?`,labelConfirm:'Remover',perigo:true,onConfirm:()=>{setTagsGlobais(tagsGlobais.filter(t=>t!==tag));if((atividadeEditando.tags||[]).includes(tag)){setAtividadeEditando({...atividadeEditando,tags:atividadeEditando.tags.filter(t=>t!==tag)});}}})}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-r-full transition">✕</button>
                                    </div>
                                ))}
                            </div>
                            <input type="text"
                                onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&e.target.value.trim()){e.preventDefault();const nt=e.target.value.trim().replace(/^#/,'');if(nt&&!(atividadeEditando.tags||[]).includes(nt)){setAtividadeEditando({...atividadeEditando,tags:[...(atividadeEditando.tags||[]),nt]});if(!tagsGlobais.includes(nt)){setTagsGlobais([...tagsGlobais,nt].sort());}}e.target.value='';}}}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"
                                placeholder="Digite e pressione Enter... Ex: roda, jogos"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Unidade (opcional)</label>
                            <select value={atividadeEditando._adicionandoUnidade ? '__NOVA__' : (atividadeEditando.unidade||'')}
                                onChange={e=>{if(e.target.value==='__NOVA__'){setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:true});}else{setAtividadeEditando({...atividadeEditando,unidade:e.target.value,_adicionandoUnidade:false});}}}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition bg-white">
                                <option value="">Selecione ou adicione...</option>
                                {unidades.map(u=><option key={u} value={u}>{u}</option>)}
                                <option value="__NOVA__">➕ Adicionar nova unidade...</option>
                            </select>
                            {atividadeEditando._adicionandoUnidade && (
                                <div className="flex gap-2 mt-2">
                                    <input type="text" autoFocus placeholder="Nome da unidade..."
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none"
                                        onKeyDown={e=>{if(e.key==='Enter'&&e.target.value.trim()){const u=e.target.value.trim();if(!unidades.includes(u)){setUnidades([...unidades,u].sort());}setAtividadeEditando({...atividadeEditando,unidade:u,_adicionandoUnidade:false});}if(e.key==='Escape'){setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:false});}}}/>
                                    <button type="button" onClick={()=>setAtividadeEditando({...atividadeEditando,_adicionandoUnidade:false})}
                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm transition">Cancelar</button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Observação (opcional)</label>
                            <textarea value={atividadeEditando.observacao||''}
                                onChange={e=>setAtividadeEditando({...atividadeEditando,observacao:e.target.value})}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition resize-none"
                                rows="2"/>
                        </div>
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">🔗 Links e Imagens</span>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2 flex-col sm:flex-row">
                                    <input type="text" placeholder="URL..."
                                        value={novoRecursoUrlAtiv}
                                        onChange={e=>setNovoRecursoUrlAtiv(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-amber-400 outline-none transition"/>
                                    <select value={novoRecursoTipoAtiv}
                                        onChange={e=>setNovoRecursoTipoAtiv(e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none">
                                        <option value="link">Link</option>
                                        <option value="imagem">Imagem</option>
                                    </select>
                                    <button type="button" onClick={adicionarRecursoAtiv}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition">Add</button>
                                </div>
                                <div className="space-y-2">
                                    {(atividadeEditando.recursos||[]).map((rec,idx)=>(
                                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span>{rec.tipo==='imagem'?'🖼️':'🔗'}</span>
                                                <span className="text-sm truncate max-w-xs text-slate-600">{rec.url}</span>
                                            </div>
                                            <button type="button" onClick={()=>removerRecursoAtiv(idx)} className="text-slate-400 hover:text-red-500 transition px-2">✕</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-slate-100">
                            <button onClick={()=>setAtividadeEditando(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition">
                                Cancelar
                            </button>
                            <button onClick={salvarAtividade}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                                Salvar Atividade
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* ── HEADER DA PÁGINA ── */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">🎯 Banco de Atividades</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{atividades.length} atividade{atividades.length !== 1 ? 's' : ''} cadastrada{atividades.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={novaAtividade}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2">
                    + Nova Atividade
                </button>
            </div>

            {/* ── FILTROS ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Buscar</label>
                        <input type="text" placeholder="Nome, descrição, tag..."
                            value={buscaAtividade} onChange={e=>setBuscaAtividade(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                    </div>
                    <div className="min-w-[140px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tag</label>
                        <select value={filtroTagAtividade} onChange={e=>setFiltroTagAtividade(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                            <option>Todas</option>
                            {todasAsTags.map(t=><option key={t}>#{t}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[140px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Conceito</label>
                        <select value={filtroConceitoAtividade} onChange={e=>setFiltroConceitoAtividade(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                            <option>Todos</option>
                            {conceitos.map(c=><option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[140px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Faixa Etária</label>
                        <select value={filtroFaixaAtividade} onChange={e=>setFiltroFaixaAtividade(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                            {faixas.map(f=><option key={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={()=>{setBuscaAtividade('');setFiltroTagAtividade('Todas');setFiltroFaixaAtividade('Todas');setFiltroConceitoAtividade('Todos');}}
                            className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition">
                            Limpar
                        </button>
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
                            {[{id:'grade',label:'⊞',title:'Grade'},{id:'lista',label:'☰',title:'Lista'},{id:'segmento',label:'👥',title:'Por Segmento'}].map(m=>(
                                <button key={m.id} onClick={()=>setModoVisAtividades(m.id)} title={m.title}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${modoVisAtividades===m.id?'bg-white text-indigo-600 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                {atividadesFiltradas.length !== atividades.length && (
                    <p className="text-xs text-indigo-600 mt-2 font-medium">
                        Mostrando {atividadesFiltradas.length} de {atividades.length} atividades
                    </p>
                )}
            </div>

            {/* ── CONTEÚDO ── */}
            {atividadesFiltradas.length === 0 ? (
                <div className="text-center py-24">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-slate-500 text-lg font-medium">Nenhuma atividade encontrada</p>
                    <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros ou crie uma nova atividade</p>
                    <button onClick={novaAtividade} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold transition">
                        + Nova Atividade
                    </button>
                </div>
            ) : (
                <>
                    {modoVisAtividades === 'grade' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {atividadesFiltradas.map(ativ => <CardAtividade key={ativ.id} ativ={ativ} setAtividadeEditando={setAtividadeEditando} excluirAtividade={excluirAtividade} setModalAdicionarAoPlano={setModalAdicionarAoPlano} />)}
                        </div>
                    )}
                    {modoVisAtividades === 'lista' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {atividadesFiltradas.map((ativ, i)=>(
                                <div key={ativ.id} className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition group ${i>0?'border-t border-slate-100':''}`}>
                                    <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-amber-400 to-orange-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-800 truncate">{ativ.nome}</h4>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {ativ.duracao && <span className="text-xs text-slate-400">⏱ {ativ.duracao}</span>}
                                            {(ativ.faixaEtaria||[]).slice(0,1).map(f=><span key={f} className="text-xs text-indigo-500">👥 {f}</span>)}
                                            {(ativ.tags||[]).slice(0,2).map(t=><span key={t} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">#{t}</span>)}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button onClick={()=>setModalAdicionarAoPlano(ativ)} className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition">+ Plano</button>
                                        <button onClick={()=>setAtividadeEditando(ativ)} className="bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-2 py-1.5 rounded-lg text-xs transition">✏️</button>
                                        <button onClick={()=>excluirAtividade(ativ.id)} className="bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 px-2 py-1.5 rounded-lg text-xs transition">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {modoVisAtividades === 'segmento' && (() => {
                        const porFaixa = {};
                        atividadesFiltradas.forEach(a => {
                            (a.faixaEtaria || ['Sem faixa definida']).forEach(f => {
                                if (!porFaixa[f]) porFaixa[f] = [];
                                porFaixa[f].push(a);
                            });
                        });
                        return Object.keys(porFaixa).sort().map(faixa=>(
                            <div key={faixa} className="mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-lg font-bold text-slate-700">👥 {faixa}</span>
                                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{porFaixa[faixa].length}</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
