import React, { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { sanitizar, gerarIdSeguro } from '../lib/utils'
import { useEstrategiasContext } from '../contexts'
import { useModalContext } from '../contexts'
import RichTextEditor from './RichTextEditor'

export default function ModuloEstrategias() {
    // Estratégias: estado e CRUD do EstrategiasContext (Parte 2)
    const {
        arquivarEstrategia,
        buscaEstrategia,
        categoriasEstrategia,
        estrategiaEditando,
        estrategias,
        excluirEstrategia,
        filtroCategoriaEstrategia,
        filtroDimensaoEstrategia,
        filtroFuncaoEstrategia,
        filtroObjetivoEstrategia,
        funcoesEstrategia,
        mostrarArquivadasEstrategia,
        novaCategoriaEstr,
        novaEstrategia,
        novaFuncaoEstr,
        novoObjetivoEstr,
        objetivosEstrategia,
        restaurarEstrategia,
        salvarEstrategia,
        setBuscaEstrategia,
        setCategoriasEstrategia,
        setEstrategiaEditando,
        setFiltroCategoriaEstrategia,
        setFiltroDimensaoEstrategia,
        setFiltroFuncaoEstrategia,
        setFiltroObjetivoEstrategia,
        setFuncoesEstrategia,
        setMostrarArquivadasEstrategia,
        setNovaCategoriaEstr,
        setNovaFuncaoEstr,
        setNovoObjetivoEstr,
        setObjetivosEstrategia,
    } = useEstrategiasContext()

    // Estado local: modal de detalhes
    const [detalhesEstrategia, setDetalhesEstrategia] = useState<import('../types').Estrategia | null>(null)
    const { setModalConfirm } = useModalContext()

    // Formulário de edição
    if (estrategiaEditando !== null) {
        return (
            <div className="max-w-2xl mx-auto">
                {/* Header do formulário */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={()=>setEstrategiaEditando(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5">
                        ← Voltar
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{estrategiaEditando._criadoEm && estrategias.find(e=>e.id===estrategiaEditando.id) ? '✏️ Editar Estratégia' : '🧩 Nova Estratégia'}</h2>
                        <p className="text-slate-500 text-xs mt-0.5">Procedimento pedagógico reutilizável</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Barra topo roxa */}
                    <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500"/>
                    <div className="p-6 space-y-5">

                        {/* Nome */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nome da Estratégia *</label>
                            <input type="text" placeholder="Ex: Ostinato rítmico em grupo"
                                value={estrategiaEditando.nome}
                                onChange={e=>setEstrategiaEditando({...estrategiaEditando, nome:e.target.value})}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none transition"/>
                        </div>

                        {/* Dimensões Pedagógicas */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                Dimensões Pedagógicas
                                <span className="text-slate-400 font-normal normal-case ml-1">(selecione uma ou mais)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {([
                                    { label: 'Musical',               cor: 'violet' },
                                    { label: 'Condução',              cor: 'blue'   },
                                    { label: 'Cultura de Sala de Aula', cor: 'green' },
                                ] as const).map(({ label, cor }) => {
                                    const sel = (estrategiaEditando.dimensoes || []).includes(label)
                                    const base = 'px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all'
                                    const style =
                                        cor === 'violet' ? (sel ? `${base} bg-violet-100 border-violet-400 text-violet-800` : `${base} bg-white border-slate-200 text-slate-500 hover:border-violet-300`) :
                                        cor === 'blue'   ? (sel ? `${base} bg-blue-100 border-blue-400 text-blue-800`       : `${base} bg-white border-slate-200 text-slate-500 hover:border-blue-300`)   :
                                                           (sel ? `${base} bg-green-100 border-green-400 text-green-800`    : `${base} bg-white border-slate-200 text-slate-500 hover:border-green-300`)
                                    return (
                                        <button key={label} type="button" className={style}
                                            onClick={() => {
                                                const atual = estrategiaEditando.dimensoes || []
                                                setEstrategiaEditando({
                                                    ...estrategiaEditando,
                                                    dimensoes: sel ? atual.filter(d => d !== label) : [...atual, label],
                                                })
                                            }}>
                                            {label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Tempo Estimado + Origem lado a lado */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Tempo Estimado <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                                </label>
                                <input type="text" placeholder="Ex: 5 min, 10-15 min"
                                    value={estrategiaEditando.tempoEstimado || ''}
                                    onChange={e=>setEstrategiaEditando({...estrategiaEditando, tempoEstimado:e.target.value})}
                                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none transition"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Origem / Referência <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                                </label>
                                <input type="text" placeholder="Ex: Kodály, RCPPM, própria"
                                    value={estrategiaEditando.origem || ''}
                                    onChange={e=>setEstrategiaEditando({...estrategiaEditando, origem:e.target.value})}
                                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none transition"/>
                            </div>
                        </div>

                        {/* Variações Conhecidas */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                Variações Conhecidas <span className="text-slate-400 font-normal normal-case">(opcional)</span>
                            </label>
                            <textarea placeholder="Descreva variações ou adaptações desta estratégia..."
                                value={estrategiaEditando.variacoes || ''}
                                onChange={e=>setEstrategiaEditando({...estrategiaEditando, variacoes:e.target.value})}
                                rows={3}
                                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none transition resize-none"/>
                        </div>

                        {/* Categoria + Função lado a lado */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Categoria */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Categoria</label>
                                <select value={estrategiaEditando.categoria}
                                    onChange={e=>setEstrategiaEditando({...estrategiaEditando, categoria:e.target.value})}
                                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                                    <option value="">Selecionar...</option>
                                    {categoriasEstrategia.map(c=><option key={c}>{c}</option>)}
                                </select>
                                {/* Adicionar nova categoria */}
                                <div className="flex gap-2 mt-2">
                                    <input type="text" placeholder="+ Nova categoria"
                                        value={novaCategoriaEstr}
                                        onChange={e=>setNovaCategoriaEstr(e.target.value)}
                                        onKeyDown={e=>{ if(e.key==='Enter'&&novaCategoriaEstr.trim()){ setCategoriasEstrategia([...categoriasEstrategia, novaCategoriaEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, categoria:novaCategoriaEstr.trim()}); setNovaCategoriaEstr(''); }}}
                                        className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs outline-none focus:border-violet-400"/>
                                    {novaCategoriaEstr.trim() && (
                                        <button onClick={()=>{ setCategoriasEstrategia([...categoriasEstrategia, novaCategoriaEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, categoria:novaCategoriaEstr.trim()}); setNovaCategoriaEstr(''); }}
                                            className="bg-violet-500 text-white px-2 py-1 rounded-lg text-xs font-bold">✓</button>
                                    )}
                                </div>
                            </div>

                            {/* Função na Aula */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Função na Aula</label>
                                <select value={estrategiaEditando.funcao}
                                    onChange={e=>setEstrategiaEditando({...estrategiaEditando, funcao:e.target.value})}
                                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                                    <option value="">Selecionar...</option>
                                    {funcoesEstrategia.map(f=><option key={f}>{f}</option>)}
                                </select>
                                {/* Adicionar nova função */}
                                <div className="flex gap-2 mt-2">
                                    <input type="text" placeholder="+ Nova função"
                                        value={novaFuncaoEstr}
                                        onChange={e=>setNovaFuncaoEstr(e.target.value)}
                                        onKeyDown={e=>{ if(e.key==='Enter'&&novaFuncaoEstr.trim()){ setFuncoesEstrategia([...funcoesEstrategia, novaFuncaoEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, funcao:novaFuncaoEstr.trim()}); setNovaFuncaoEstr(''); }}}
                                        className="flex-1 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-xs outline-none focus:border-violet-400"/>
                                    {novaFuncaoEstr.trim() && (
                                        <button onClick={()=>{ setFuncoesEstrategia([...funcoesEstrategia, novaFuncaoEstr.trim()]); setEstrategiaEditando({...estrategiaEditando, funcao:novaFuncaoEstr.trim()}); setNovaFuncaoEstr(''); }}
                                            className="bg-violet-500 text-white px-2 py-1 rounded-lg text-xs font-bold">✓</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Objetivos Pedagógicos */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Objetivos Pedagógicos</label>
                            <div className="space-y-1.5">
                                {objetivosEstrategia.map(obj=>{
                                    const sel = (estrategiaEditando.objetivos||[]).includes(obj);
                                    return (
                                        <label key={obj} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition ${sel ? 'bg-violet-50 border border-violet-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                                            <input type="checkbox" checked={sel}
                                                onChange={()=>{
                                                    const atual = estrategiaEditando.objetivos||[];
                                                    setEstrategiaEditando({...estrategiaEditando, objetivos: sel ? atual.filter(o=>o!==obj) : [...atual, obj]});
                                                }}
                                                className="rounded text-violet-600 accent-violet-600"/>
                                            <span className="text-sm text-slate-700">{obj}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            {/* Adicionar novo objetivo */}
                            <div className="flex gap-2 mt-2">
                                <input type="text" placeholder="+ Novo objetivo pedagógico"
                                    value={novoObjetivoEstr}
                                    onChange={e=>setNovoObjetivoEstr(e.target.value)}
                                    onKeyDown={e=>{ if(e.key==='Enter'&&novoObjetivoEstr.trim()){ const novo=novoObjetivoEstr.trim(); setObjetivosEstrategia([...objetivosEstrategia, novo]); setEstrategiaEditando({...estrategiaEditando, objetivos:[...(estrategiaEditando.objetivos||[]), novo]}); setNovoObjetivoEstr(''); }}}
                                    className="flex-1 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-sm outline-none focus:border-violet-400"/>
                                {novoObjetivoEstr.trim() && (
                                    <button onClick={()=>{ const novo=novoObjetivoEstr.trim(); setObjetivosEstrategia([...objetivosEstrategia, novo]); setEstrategiaEditando({...estrategiaEditando, objetivos:[...(estrategiaEditando.objetivos||[]), novo]}); setNovoObjetivoEstr(''); }}
                                        className="bg-violet-500 text-white px-3 py-2 rounded-xl text-sm font-bold">✓</button>
                                )}
                            </div>
                        </div>

                        {/* Descrição (Rich Text) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Descrição</label>
                            <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:border-violet-400 transition">
                                <RichTextEditor
                                    value={estrategiaEditando.descricao||''}
                                    onChange={v=>setEstrategiaEditando({...estrategiaEditando, descricao:v})}
                                    placeholder="Descreva o procedimento: como aplicar, variações, dicas..."
                                    rows={5}/>
                            </div>
                        </div>

                        {/* Faixa Etária */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Faixa Etária <span className="text-slate-400 font-normal normal-case">(opcional)</span></label>
                            <input type="text" placeholder="Ex: 6-10 anos, Infantil, EF1..."
                                value={estrategiaEditando.faixaEtaria||''}
                                onChange={e=>setEstrategiaEditando({...estrategiaEditando, faixaEtaria:e.target.value})}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none transition"/>
                        </div>

                        {/* Botões */}
                        <div className="flex gap-3 pt-2 border-t border-slate-100">
                            <button onClick={()=>setEstrategiaEditando(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm transition">
                                Cancelar
                            </button>
                            <button onClick={salvarEstrategia}
                                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">
                                💾 Salvar Estratégia
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Listagem
    const estrategiasFiltradas = estrategias.filter(e => {
        if (!mostrarArquivadasEstrategia && e.ativo === false) return false;
        const termo = buscaEstrategia.toLowerCase();
        const matchBusca = !buscaEstrategia ||
            e.nome.toLowerCase().includes(termo) ||
            (e.descricao||'').toLowerCase().includes(termo) ||
            (e.categoria||'').toLowerCase().includes(termo) ||
            (e.funcao||'').toLowerCase().includes(termo) ||
            (e.origem||'').toLowerCase().includes(termo) ||
            (e.variacoes||'').toLowerCase().includes(termo) ||
            (e.objetivos||[]).some(o=>o.toLowerCase().includes(termo));
        const matchCat   = filtroCategoriaEstrategia === 'Todas' || e.categoria === filtroCategoriaEstrategia;
        const matchFunc  = filtroFuncaoEstrategia === 'Todas' || e.funcao === filtroFuncaoEstrategia;
        const matchObj   = filtroObjetivoEstrategia === 'Todos' || (e.objetivos||[]).includes(filtroObjetivoEstrategia);
        const matchDim   = filtroDimensaoEstrategia === 'Todas' || (e.dimensoes||[]).includes(filtroDimensaoEstrategia);
        return matchBusca && matchCat && matchFunc && matchObj && matchDim;
    });

    const ativas = estrategiasFiltradas.filter(e => e.ativo !== false);
    const arquivadas = estrategiasFiltradas.filter(e => e.ativo === false);

    // Dados do dashboard (calculados em render, sem estado extra)
    const ativasTotal = estrategias.filter(e => e.ativo !== false)
    const countDim = (dim: string) => ativasTotal.filter(e => (e.dimensoes||[]).includes(dim)).length
    const top3 = [...ativasTotal].sort((a,b) => (b.contadorUso||0) - (a.contadorUso||0)).filter(e=>(e.contadorUso||0)>0).slice(0,3)
    const nuncaUsadas = ativasTotal.filter(e => (e.contadorUso||0) === 0).slice(0,5)

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">🧩 Estratégias Pedagógicas</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{ativasTotal.length} estratégia{ativasTotal.length !== 1 ? 's' : ''} ativa{ativasTotal.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={novaEstrategia}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2">
                    + Nova Estratégia
                </button>
            </div>

            {/* Dashboard colapsável */}
            {(() => {
                const [dashAberto, setDashAberto] = React.useState(false)
                return (
                    <div className="mb-5">
                        <button onClick={()=>setDashAberto(o=>!o)}
                            className="text-sm text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1.5 mb-2">
                            <span>{dashAberto ? '▲' : '▼'}</span>
                            <span>📊 {dashAberto ? 'Ocultar painel' : 'Ver painel'}</span>
                        </button>
                        {dashAberto && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
                                {/* Grid de contadores */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Ativas', value: ativasTotal.length, bg: 'bg-violet-50', text: 'text-violet-700' },
                                        { label: 'Musical', value: countDim('Musical'), bg: 'bg-violet-50', text: 'text-violet-600' },
                                        { label: 'Condução', value: countDim('Condução'), bg: 'bg-blue-50', text: 'text-blue-600' },
                                        { label: 'Cultura', value: countDim('Cultura de Sala de Aula'), bg: 'bg-green-50', text: 'text-green-600' },
                                    ].map(c => (
                                        <div key={c.label} className={`${c.bg} rounded-xl p-3 text-center`}>
                                            <p className={`text-2xl font-bold ${c.text}`}>{c.value}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Top 3 mais usadas */}
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Mais usadas</p>
                                    {top3.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">Comece a vincular estratégias aos planos para ver dados aqui.</p>
                                    ) : (
                                        <ul className="space-y-1.5">
                                            {top3.map(e => (
                                                <li key={e.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
                                                    <span className="text-slate-700 font-medium truncate flex-1">{e.nome}</span>
                                                    <span className="text-violet-600 font-bold text-xs ml-2">{e.contadorUso}×</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {/* Nunca usadas */}
                                {nuncaUsadas.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Nunca usadas</p>
                                        <ul className="space-y-1.5">
                                            {nuncaUsadas.map(e => (
                                                <li key={e.id} className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
                                                    <span className="truncate">{e.nome}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            })()}

            {/* Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-5">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Buscar</label>
                        <input type="text" placeholder="Nome, categoria, origem, variação..."
                            value={buscaEstrategia} onChange={e=>setBuscaEstrategia(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none"/>
                    </div>
                    <div className="min-w-[160px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dimensão</label>
                        <select value={filtroDimensaoEstrategia} onChange={e=>setFiltroDimensaoEstrategia(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                            <option>Todas</option>
                            <option>Musical</option>
                            <option>Condução</option>
                            <option>Cultura de Sala de Aula</option>
                        </select>
                    </div>
                    <div className="min-w-[150px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Categoria</label>
                        <select value={filtroCategoriaEstrategia} onChange={e=>setFiltroCategoriaEstrategia(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                            <option>Todas</option>
                            {categoriasEstrategia.map(c=><option key={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[150px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Função</label>
                        <select value={filtroFuncaoEstrategia} onChange={e=>setFiltroFuncaoEstrategia(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                            <option>Todas</option>
                            {funcoesEstrategia.map(f=><option key={f}>{f}</option>)}
                        </select>
                    </div>
                    <div className="min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Objetivo</label>
                        <select value={filtroObjetivoEstrategia} onChange={e=>setFiltroObjetivoEstrategia(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-violet-400 outline-none bg-white">
                            <option>Todos</option>
                            {objetivosEstrategia.map(o=><option key={o}>{o}</option>)}
                        </select>
                    </div>
                    {(buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos' || filtroDimensaoEstrategia !== 'Todas') && (
                        <button onClick={()=>{ setBuscaEstrategia(''); setFiltroCategoriaEstrategia('Todas'); setFiltroFuncaoEstrategia('Todas'); setFiltroObjetivoEstrategia('Todos'); setFiltroDimensaoEstrategia('Todas'); }}
                            className="text-xs text-slate-400 hover:text-slate-600 underline whitespace-nowrap">
                            Limpar filtros
                        </button>
                    )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 select-none">
                        <input type="checkbox" checked={mostrarArquivadasEstrategia} onChange={e=>setMostrarArquivadasEstrategia(e.target.checked)} className="accent-violet-500"/>
                        Mostrar estratégias arquivadas
                        {estrategias.filter(e=>e.ativo===false).length > 0 && (
                            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{estrategias.filter(e=>e.ativo===false).length} arquivada{estrategias.filter(e=>e.ativo===false).length!==1?'s':''}</span>
                        )}
                    </label>
                </div>
            </div>

            {/* Estado vazio */}
            {estrategiasFiltradas.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                    <div className="text-5xl mb-3">🧩</div>
                    <h3 className="text-lg font-bold text-slate-700 mb-1">
                        {buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos' || filtroDimensaoEstrategia !== 'Todas'
                            ? 'Nenhuma estratégia encontrada'
                            : 'Nenhuma estratégia ainda'}
                    </h3>
                    <p className="text-slate-400 text-sm mb-5">
                        {buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos' || filtroDimensaoEstrategia !== 'Todas'
                            ? 'Tente ajustar os filtros de busca.'
                            : 'Cadastre procedimentos pedagógicos reutilizáveis para suas aulas.'}
                    </p>
                    {!(buscaEstrategia || filtroCategoriaEstrategia !== 'Todas' || filtroFuncaoEstrategia !== 'Todas' || filtroObjetivoEstrategia !== 'Todos' || filtroDimensaoEstrategia !== 'Todas') && (
                        <button onClick={novaEstrategia}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl font-bold transition">
                            + Criar primeira estratégia
                        </button>
                    )}
                </div>
            )}

            {/* Cards ativos */}
            {ativas.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                    {ativas.map(e => (
                        <div key={e.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">
                            {/* Barra roxa topo */}
                            <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-400 rounded-t-2xl"/>
                            <div className="p-4 flex flex-col flex-1">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 text-sm">{e.nome}</h3>
                                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={()=>setDetalhesEstrategia(e)}
                                            className="text-slate-400 hover:text-violet-600 p-1 rounded transition" title="Ver detalhes">👁</button>
                                        <button onClick={()=>setEstrategiaEditando({...e})}
                                            className="text-slate-400 hover:text-blue-600 p-1 rounded transition" title="Editar">✏️</button>
                                        <button onClick={()=>{ setModalConfirm({ titulo:'Arquivar estratégia?', conteudo:'A estratégia será ocultada, mas o histórico será preservado.', labelConfirm:'Arquivar', labelCancelar:'Cancelar', onConfirm:()=>arquivarEstrategia(e.id) }); }}
                                            className="text-slate-400 hover:text-amber-500 p-1 rounded transition" title="Arquivar">📦</button>
                                        <button onClick={()=>excluirEstrategia(e.id)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded transition" title="Excluir">🗑️</button>
                                    </div>
                                </div>

                                {/* Badges de dimensões pedagógicas (novos) */}
                                {(e.dimensoes||[]).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {(e.dimensoes||[]).map(d => (
                                            <span key={d} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                                d === 'Musical'               ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                                d === 'Condução'              ? 'bg-blue-50 text-blue-700 border-blue-200'       :
                                                                                'bg-green-50 text-green-700 border-green-200'
                                            }`} title={d}>
                                                {d === 'Cultura de Sala de Aula' ? 'Cultura' : d}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Badges originais: categoria, função, faixa etária */}
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {e.categoria && (
                                        <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-medium">
                                            {e.categoria}
                                        </span>
                                    )}
                                    {e.funcao && (
                                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium">
                                            ⏱ {e.funcao}
                                        </span>
                                    )}
                                    {e.faixaEtaria && (
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                            👥 {e.faixaEtaria}
                                        </span>
                                    )}
                                    {e.tempoEstimado && (
                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                            🕐 {e.tempoEstimado}
                                        </span>
                                    )}
                                </div>

                                {/* Objetivos */}
                                {(e.objetivos||[]).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {(e.objetivos||[]).slice(0,2).map(o=>(
                                            <span key={o} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">🎯 {o}</span>
                                        ))}
                                        {(e.objetivos||[]).length > 2 && (
                                            <span className="text-xs text-slate-400">+{(e.objetivos||[]).length - 2}</span>
                                        )}
                                    </div>
                                )}

                                {/* Descrição resumida */}
                                {e.descricao && (
                                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                                        {e.descricao.replace(/<[^>]+>/g,'').substring(0,100)}
                                    </p>
                                )}

                                {/* Rodapé: contador + variações */}
                                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <span className={`text-[11px] font-medium ${(e.contadorUso||0) > 0 ? 'text-violet-600' : 'text-slate-400'}`}>
                                        {(e.contadorUso||0) > 0 ? `Usada ${e.contadorUso}×` : 'Não usada ainda'}
                                    </span>
                                    {e.variacoes && <span className="text-sm" title="Possui variações registradas">✨</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Arquivadas */}
            {mostrarArquivadasEstrategia && arquivadas.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span>📦 Arquivadas</span>
                        <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full text-xs">{arquivadas.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {arquivadas.map(e => (
                            <div key={e.id} className="bg-slate-50 rounded-2xl border border-slate-200 flex flex-col overflow-hidden opacity-70 hover:opacity-90 transition">
                                <div className="h-1.5 bg-slate-300 rounded-t-2xl"/>
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-semibold text-slate-600 text-sm leading-tight line-clamp-2">{e.nome}</h3>
                                        <div className="flex gap-0.5 shrink-0">
                                            <button onClick={()=>restaurarEstrategia(e.id)}
                                                className="text-slate-400 hover:text-emerald-600 p-1 rounded transition text-xs" title="Restaurar">♻️</button>
                                            <button onClick={()=>excluirEstrategia(e.id)}
                                                className="text-slate-400 hover:text-red-500 p-1 rounded transition" title="Excluir">🗑️</button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {e.categoria && <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{e.categoria}</span>}
                                        {e.funcao && <span className="text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">{e.funcao}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {/* ════════ MODAL DE DETALHES ════════ */}
            {detalhesEstrategia && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                    onClick={()=>setDetalhesEstrategia(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
                    <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
                        onClick={e=>e.stopPropagation()}>
                        {/* Barra roxa */}
                        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-purple-500 shrink-0"/>
                        {/* Header */}
                        <div className="px-6 pt-5 pb-3 shrink-0 border-b border-slate-100">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <h2 className="text-lg font-bold text-slate-800 leading-tight">{detalhesEstrategia.nome}</h2>
                                    {/* Dimensões */}
                                    {(detalhesEstrategia.dimensoes||[]).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {(detalhesEstrategia.dimensoes||[]).map(d=>(
                                                <span key={d} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                                    d==='Musical'  ? 'bg-violet-100 text-violet-700' :
                                                    d==='Condução' ? 'bg-blue-100 text-blue-700'     :
                                                                     'bg-green-100 text-green-700'
                                                }`}>{d}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button onClick={()=>setDetalhesEstrategia(null)}
                                    className="text-slate-400 hover:text-slate-600 text-xl leading-none mt-0.5">✕</button>
                            </div>
                            {/* Meta: tempo, origem, contador */}
                            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                                {detalhesEstrategia.tempoEstimado && <span>🕐 {detalhesEstrategia.tempoEstimado}</span>}
                                {detalhesEstrategia.origem && <span>📚 {detalhesEstrategia.origem}</span>}
                                {detalhesEstrategia.categoria && <span>🏷 {detalhesEstrategia.categoria}</span>}
                                {detalhesEstrategia.funcao && <span>⏱ {detalhesEstrategia.funcao}</span>}
                                <span className={`font-semibold ${(detalhesEstrategia.contadorUso||0)>0?'text-violet-600':'text-slate-400'}`}>
                                    {(detalhesEstrategia.contadorUso||0)>0 ? `Usada ${detalhesEstrategia.contadorUso}×` : 'Não usada ainda'}
                                </span>
                            </div>
                        </div>
                        {/* Corpo scrollável */}
                        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
                            {/* Variações */}
                            {detalhesEstrategia.variacoes && (
                                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                                    <p className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-1.5">✨ Variações Conhecidas</p>
                                    <p className="text-sm text-violet-900 whitespace-pre-line">{detalhesEstrategia.variacoes}</p>
                                </div>
                            )}
                            {/* Descrição */}
                            {detalhesEstrategia.descricao && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Descrição</p>
                                    <div className="text-sm text-slate-700 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: sanitizar(detalhesEstrategia.descricao) }}/>
                                </div>
                            )}
                            {/* Objetivos */}
                            {(detalhesEstrategia.objetivos||[]).length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Objetivos Pedagógicos</p>
                                    <ul className="space-y-1">
                                        {(detalhesEstrategia.objetivos||[]).map(o=>(
                                            <li key={o} className="text-sm text-slate-700 flex items-start gap-1.5">
                                                <span className="text-emerald-500 mt-0.5">🎯</span>{o}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {/* Histórico de uso */}
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Histórico de Uso</p>
                                {(detalhesEstrategia.historicoUso||[]).length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">Ainda não foi usada em nenhum plano.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {(detalhesEstrategia.historicoUso||[]).map((h,i)=>(
                                            <li key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                                                <span className="text-slate-700 font-medium truncate flex-1">{h.planoTitulo}</span>
                                                <span className="text-slate-400 text-xs ml-2 shrink-0">
                                                    {new Date(h.data).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                            <button onClick={()=>setDetalhesEstrategia(null)}
                                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                                Fechar
                            </button>
                            <button onClick={()=>{ setEstrategiaEditando({...detalhesEstrategia}); setDetalhesEstrategia(null) }}
                                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition">
                                ✏️ Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

}
