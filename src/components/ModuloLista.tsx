import React, { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { sanitizar, gerarIdSeguro } from '../lib/utils'
import { dbSize } from '../lib/db'
import { usePlanosContext, useAnoLetivoContext, useRepertorioContext, useModalContext, useCalendarioContext } from '../contexts'
import { exportarPlanoPDF } from '../utils/pdf'
import ModalInserirEmSequencia from './modals/ModalInserirEmSequencia'
import type { Plano } from '../types'

export default function ModuloLista() {
    const {
        abrirModalRegistro, baixarBackup,
        busca, setBusca,
        editarPlano, escolas, excluirPlano,
        filtroConceito, setFiltroConceito,
        filtroEscola, setFiltroEscola,
        filtroFaixa, setFiltroFaixa,
        filtroFavorito, setFiltroFavorito,
        filtroNivel, setFiltroNivel,
        filtroStatus, setFiltroStatus,
        filtroTag, setFiltroTag,
        filtroUnidade, setFiltroUnidade,
        modoVisualizacao, setModoVisualizacao,
        ordenacaoCards, setOrdenacaoCards,
        planos, planosFiltrados,
        setPlanoSelecionado, setPlanos,
        setStatusDropdownId, statusDropdownId,
        toggleFavorito, userId,
    } = usePlanosContext()
    const { conceitos, faixas, tagsGlobais, unidades } = useAnoLetivoContext()
    const { repertorio } = useRepertorioContext()
    const { setModalConfirm } = useModalContext()
    const { periodoDias, setPeriodoDias, dataInicioCustom, setDataInicioCustom, dataFimCustom, setDataFimCustom } = useCalendarioContext()

    // Constantes estáticas (não precisam vir do ctx)
    const niveis = ["Todos", "Iniciante", "Intermediário", "Avançado"]

    // ── Modal Inserir em Sequência ──
    const [planoParaSequencia, setPlanoParaSequencia] = useState<Plano | null>(null)

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

    // ── COMPONENTE DE LINHA REUTILIZÁVEL ──
    const LinhaPlano = ({ plano, showEscola = true }) => {
        const nRegs = (plano.registrosPosAula || []).length;
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
                {/* Ponto de status */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                {/* Favorito */}
                <button onClick={(e)=>{e.stopPropagation();toggleFavorito(plano,e);}} className="text-base shrink-0 opacity-50 hover:opacity-100 transition-opacity">{plano.destaque?'⭐':'☆'}</button>
                {/* Info principal — clicável */}
                <div className="flex-1 min-w-0 cursor-pointer transition-transform active:scale-[0.98]" onClick={()=>setPlanoSelecionado(plano)}>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Número da aula */}
                        {plano.numeroAula && <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full shrink-0">#{plano.numeroAula}</span>}
                        {/* Status badge */}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${sc.badge}`}>{status}</span>
                        {/* Título */}
                        <span className="font-semibold text-slate-800 text-sm truncate">{plano.titulo}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {/* Escola */}
                        {showEscola && plano.escola && <span className="text-xs text-indigo-600 font-medium">🏫 {plano.escola}</span>}
                        {showEscola && plano.escola && faixa && <span className="text-xs text-slate-300">·</span>}
                        {/* Segmento/Faixa */}
                        {faixa && <span className="text-xs text-slate-500">{faixa}</span>}
                        {faixa && conceito1 && <span className="text-xs text-slate-300">·</span>}
                        {/* Conteúdo musical */}
                        {conceito1 && <span className="text-xs text-teal-600 font-medium">{conceito1}</span>}
                        {/* Registros */}
                        {nRegs > 0 && <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-0.5 rounded-full">📝 {nRegs}</span>}
                    </div>
                </div>
                {/* Ações rápidas — reveladas no hover */}
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button onClick={(e)=>abrirModalRegistro(plano,e)} title="Registro Pós-Aula" className="p-2 rounded-xl text-amber-500 hover:bg-amber-50 transition-colors text-sm">📝</button>
                    <button onClick={(e)=>{e.stopPropagation();editarPlano(plano);}} title="Editar" className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 transition-colors text-sm">✏️</button>
                    <button onClick={()=>setPlanoSelecionado(plano)} title="Ver completo" className="p-2 rounded-xl text-indigo-500 hover:bg-indigo-50 transition-colors text-sm">👁</button>
                </div>
            </div>
        );
    };

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
                <div className="md:col-span-6"><input type="text" placeholder="🔍 Buscar por título, objetivo, conceito..." value={busca} onChange={(e)=>setBusca(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" /></div>
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
                                {plano.historicoDatas?.length > 0 && <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">📅 {plano.historicoDatas.length}×</span>}
                                {(plano.unidades||[])[0] && <span className="text-xs text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">📚 {(plano.unidades||[])[0]}</span>}
                                {plano.registrosPosAula?.length > 0 && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">📝 {plano.registrosPosAula.length}</span>}
                                {(() => { const t=(plano.atividadesRoteiro||[]).reduce((s,a)=>s+(parseInt(a.duracao)||0),0); return t>0?<span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">⏱ {t}min</span>:null; })()}
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
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button onClick={(e)=>abrirModalRegistro(plano,e)}
                                    className="text-amber-500 hover:text-amber-700 hover:bg-amber-50 p-2 rounded-xl transition" title="Registro Pós-Aula">📝</button>
                                <button onClick={(e)=>{e.stopPropagation();editarPlano(plano)}}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition" title="Editar">✏️</button>
                                <button onClick={(e)=>{e.stopPropagation();exportarPlanoPDF(plano)}}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition text-xs font-bold" title="PDF">PDF</button>
                                <button onClick={(e)=>{e.stopPropagation();setPlanoParaSequencia(plano)}}
                                    className="text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition" title="Inserir em sequência">
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>
                                </button>
                                <button onClick={(e)=>{e.stopPropagation(); const copia={...plano, id:Date.now(), titulo:'[Cópia] '+plano.titulo, statusPlanejamento:'A Fazer', historicoDatas:[], registrosPosAula:[], destaque:false}; setPlanos(prev=>[...prev, copia]); setModalConfirm({ conteudo: '✅ Plano duplicado!', somenteOk: true, labelConfirm: 'OK' });}}
                                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-2 rounded-xl transition" title="Duplicar">⎘</button>
                                <button onClick={(e)=>{e.stopPropagation();excluirPlano(plano.id)}}
                                    className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition" title="Excluir">🗑</button>
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
                {planosFiltrados.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
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
                                    {g.planos.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
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
                            {gruposSegmento[seg].map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
                        </div>
                    ))}
                    {semSegmento.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-gray-400 text-white px-4 py-2.5 flex justify-between items-center">
                                <span className="font-bold text-sm">📄 Sem segmento definido</span>
                                <span className="text-gray-200 text-xs">{semSegmento.length} plano{semSegmento.length!==1?'s':''}</span>
                            </div>
                            {semSegmento.map(plano => <LinhaPlano key={plano.id} plano={plano} showEscola={true} />)}
                        </div>
                    )}
                </div>
            );
        })()}
    {planoParaSequencia && (
        <ModalInserirEmSequencia plano={planoParaSequencia} onClose={() => setPlanoParaSequencia(null)} />
    )}
    </>
    );

}
