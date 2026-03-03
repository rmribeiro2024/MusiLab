import React from 'react'
import { useAnoLetivoContext } from '../contexts'

export default function ModuloAnoLetivo() {
    const {
        adicionandoPeriodoAno,
        adicionarMetaNoAno,
        adicionarPeriodoNoAno,
        anoPlanoAtivoId,
        criarAnoLetivoPainel,
        excluirAnoPlano,
        excluirMetaDoAno,
        excluirPeriodoDoAno,
        formNovoAno,
        formNovoPeriodo,
        mostrandoFormNovoAno,
        periodoEditForm,
        periodoExpId,
        planejamentoAnual,
        salvarEdicaoPeriodo,
        setAdicionandoPeriodoAno,
        setAnoPlanoAtivoId,
        setFormNovoAno,
        setFormNovoPeriodo,
        setMostrandoFormNovoAno,
        setPeriodoEditForm,
        setPeriodoExpId,
    } = useAnoLetivoContext()

    const anoAtivo = planejamentoAnual.find(a => a.id === anoPlanoAtivoId) || planejamentoAnual[0] || null;

    const fmtData = (s) => {
        if (!s) return '';
        const partes = s.split('-');
        if (partes.length < 2) return s;
        const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
        const m = parseInt(partes[1]) - 1;
        return partes[2] ? `${partes[2]}/${meses[m]}` : `${meses[m]}/${partes[0]}`;
    };

    // ── Formulário de criar/editar ano (reutilizado) ──
    const FormNovoAno = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 p-5 mb-5">
            <div className="h-1 bg-gradient-to-r from-indigo-400 to-blue-400 rounded-full mb-4"/>
            <h3 className="font-bold text-slate-700 mb-4">{planejamentoAnual.length === 0 ? '🗓️ Criar meu primeiro ano letivo' : '🗓️ Novo Ano Letivo'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome *</label>
                    <input type="text" placeholder="Ex: 2026, 2026-A..."
                        value={formNovoAno.nome}
                        onChange={e=>setFormNovoAno({...formNovoAno, nome:e.target.value})}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Início</label>
                    <input type="date" value={formNovoAno.dataInicio}
                        onChange={e=>setFormNovoAno({...formNovoAno, dataInicio:e.target.value})}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fim</label>
                    <input type="date" value={formNovoAno.dataFim}
                        onChange={e=>setFormNovoAno({...formNovoAno, dataFim:e.target.value})}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                </div>
            </div>
            <div className="flex gap-2 mt-4">
                {planejamentoAnual.length > 0 && (
                    <button onClick={()=>setMostrandoFormNovoAno(false)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition">
                        Cancelar
                    </button>
                )}
                <button onClick={criarAnoLetivoPainel}
                    className="px-6 py-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-sm font-bold transition shadow-sm">
                    ✓ Criar Ano Letivo
                </button>
            </div>
        </div>
    );

    // ── Estado vazio: nenhum ano criado ──
    if (!anoAtivo && !mostrandoFormNovoAno) {
        return (
            <div className="text-center py-16">
                <div className="text-6xl mb-4">🗓️</div>
                <h2 className="text-2xl font-bold text-slate-700 mb-2">Meu Ano Letivo</h2>
                <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">Organize seu ano com visão macro — temas, focos e metas pedagógicas por período.</p>
                <button onClick={()=>setMostrandoFormNovoAno(true)}
                    className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-7 py-3 rounded-xl font-bold transition shadow-sm">
                    + Criar meu primeiro ano letivo
                </button>
            </div>
        );
    }

    if (!anoAtivo && mostrandoFormNovoAno) {
        return <FormNovoAno/>;
    }

    const metasGerais = (anoAtivo.metas||[]).filter(m=>m.tipo==='geral');
    const metasMusicais = (anoAtivo.metas||[]).filter(m=>m.tipo==='musical');
    const metasMetodologicas = (anoAtivo.metas||[]).filter(m=>m.tipo==='metodologica');

    return (
        <>
            {/* Formulário novo ano (quando aberto) */}
            {mostrandoFormNovoAno && <FormNovoAno/>}

            {/* ── HEADER ── */}
            {!mostrandoFormNovoAno && (
                <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-2xl font-bold text-slate-800">🗓️ {anoAtivo.nome}</h2>
                            {planejamentoAnual.length > 1 && (
                                <select value={anoPlanoAtivoId||''}
                                    onChange={e=>setAnoPlanoAtivoId(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-600">
                                    {planejamentoAnual.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
                                </select>
                            )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                            {(anoAtivo.dataInicio && anoAtivo.dataFim) ? `${fmtData(anoAtivo.dataInicio)} → ${fmtData(anoAtivo.dataFim)} · ` : ''}
                            {(anoAtivo.periodos||[]).length} período{(anoAtivo.periodos||[]).length!==1?'s':''} · {(anoAtivo.metas||[]).length} meta{(anoAtivo.metas||[]).length!==1?'s':''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={()=>excluirAnoPlano(anoAtivo.id)}
                            className="text-slate-300 hover:text-red-400 p-2 rounded-lg transition" title="Excluir ano">🗑️</button>
                        <button onClick={()=>{ setMostrandoFormNovoAno(true); setFormNovoAno({ nome: String(new Date().getFullYear()), dataInicio: '', dataFim: '' }); }}
                            className="border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-4 py-2 rounded-xl font-bold text-sm transition">
                            + Novo Ano
                        </button>
                    </div>
                </div>
            )}

            {/* ── SEÇÃO 1: PERÍODOS ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-slate-700 text-lg">📆 Organização por Períodos</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Bimestres, trimestres ou módulos personalizados</p>
                    </div>
                    <button onClick={()=>{ setAdicionandoPeriodoAno(true); setPeriodoExpId(null); setFormNovoPeriodo({ nome:'', dataInicio:'', dataFim:'', tema:'', foco:'' }); }}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-semibold text-sm transition flex items-center gap-1.5">
                        + Período
                    </button>
                </div>

                {/* Grid de períodos */}
                {((anoAtivo.periodos||[]).length > 0 || adicionandoPeriodoAno) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(anoAtivo.periodos||[]).map(p => {
                            const editando = periodoExpId === p.id;
                            return (
                                <div key={p.id} className={`rounded-2xl border flex flex-col overflow-hidden transition-all group ${editando ? 'border-indigo-300 shadow-md' : 'border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}>
                                    <div className="h-1.5 bg-gradient-to-r from-indigo-400 to-blue-400"/>
                                    {editando ? (
                                        /* Modo Edição */
                                        <div className="p-4 space-y-3">
                                            <input type="text" placeholder="Nome do período *"
                                                value={periodoEditForm?.nome||''}
                                                onChange={e=>setPeriodoEditForm({...periodoEditForm, nome:e.target.value})}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none font-semibold"/>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-1">Início</label>
                                                    <input type="date" value={periodoEditForm?.dataInicio||''}
                                                        onChange={e=>setPeriodoEditForm({...periodoEditForm, dataInicio:e.target.value})}
                                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-400 block mb-1">Fim</label>
                                                    <input type="date" value={periodoEditForm?.dataFim||''}
                                                        onChange={e=>setPeriodoEditForm({...periodoEditForm, dataFim:e.target.value})}
                                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                                </div>
                                            </div>
                                            <input type="text" placeholder="Tema principal..."
                                                value={periodoEditForm?.tema||''}
                                                onChange={e=>setPeriodoEditForm({...periodoEditForm, tema:e.target.value})}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                            <input type="text" placeholder="Foco musical..."
                                                value={periodoEditForm?.foco||''}
                                                onChange={e=>setPeriodoEditForm({...periodoEditForm, foco:e.target.value})}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                            <textarea placeholder="📝 Reflexão do período (opcional)..."
                                                value={periodoEditForm?.reflexao||''}
                                                onChange={e=>setPeriodoEditForm({...periodoEditForm, reflexao:e.target.value})}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none resize-none"/>
                                            <div className="flex gap-2">
                                                <button onClick={()=>{ setPeriodoExpId(null); setPeriodoEditForm(null); }}
                                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition">
                                                    Cancelar
                                                </button>
                                                <button onClick={()=>salvarEdicaoPeriodo(anoAtivo.id, p.id)}
                                                    className="flex-1 py-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition">
                                                    Salvar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Modo Display */
                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="flex items-start justify-between gap-1 mb-1">
                                                <h4 className="font-bold text-slate-800 text-sm leading-tight">{p.nome}</h4>
                                                <div className="flex gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={()=>{ setPeriodoExpId(p.id); setPeriodoEditForm({nome:p.nome, dataInicio:p.dataInicio||'', dataFim:p.dataFim||'', tema:p.tema||'', foco:p.foco||'', reflexao:p.reflexao||''}); }}
                                                        className="text-slate-400 hover:text-indigo-600 p-2 sm:p-1 rounded transition" title="Editar">✏️</button>
                                                    <button onClick={()=>excluirPeriodoDoAno(anoAtivo.id, p.id)}
                                                        className="text-slate-400 hover:text-red-500 p-2 sm:p-1 rounded transition" title="Excluir">🗑️</button>
                                                </div>
                                            </div>
                                            {(p.dataInicio || p.dataFim) && (
                                                <p className="text-xs text-slate-400 mb-2">
                                                    {p.dataInicio ? fmtData(p.dataInicio) : '?'} → {p.dataFim ? fmtData(p.dataFim) : '?'}
                                                </p>
                                            )}
                                            {p.tema && (
                                                <div className="mb-1.5">
                                                    <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Tema </span>
                                                    <span className="text-xs text-slate-700">{p.tema}</span>
                                                </div>
                                            )}
                                            {p.foco && (
                                                <div className="mb-2">
                                                    <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Foco </span>
                                                    <span className="text-xs text-slate-700">{p.foco}</span>
                                                </div>
                                            )}
                                            {!p.tema && !p.foco && (
                                                <p className="text-xs text-slate-300 italic mb-2">Clique em ✏️ para definir tema e foco</p>
                                            )}
                                            {p.reflexao && (
                                                <div className="mt-auto pt-2 border-t border-slate-100">
                                                    <p className="text-xs text-slate-400 line-clamp-2">📝 {p.reflexao}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Card: Adicionar novo período */}
                        {adicionandoPeriodoAno && (
                            <div className="rounded-2xl border border-indigo-300 shadow-md flex flex-col overflow-hidden">
                                <div className="h-1.5 bg-gradient-to-r from-indigo-300 to-blue-300"/>
                                <div className="p-4 space-y-3">
                                    <input type="text" placeholder="Nome do período *" autoFocus
                                        value={formNovoPeriodo.nome}
                                        onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, nome:e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none font-semibold"/>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">Início</label>
                                            <input type="date" value={formNovoPeriodo.dataInicio}
                                                onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, dataInicio:e.target.value})}
                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">Fim</label>
                                            <input type="date" value={formNovoPeriodo.dataFim}
                                                onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, dataFim:e.target.value})}
                                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"/>
                                        </div>
                                    </div>
                                    <input type="text" placeholder="Tema principal..."
                                        value={formNovoPeriodo.tema}
                                        onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, tema:e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                    <input type="text" placeholder="Foco musical..."
                                        value={formNovoPeriodo.foco}
                                        onChange={e=>setFormNovoPeriodo({...formNovoPeriodo, foco:e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none"/>
                                    <div className="flex gap-2">
                                        <button onClick={()=>{ setAdicionandoPeriodoAno(false); setFormNovoPeriodo({ nome:'', dataInicio:'', dataFim:'', tema:'', foco:'' }); }}
                                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition">
                                            Cancelar
                                        </button>
                                        <button onClick={()=>adicionarPeriodoNoAno(anoAtivo.id)}
                                            className="flex-1 py-2 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition">
                                            + Adicionar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Estado vazio de períodos */
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl">
                        <div className="text-3xl mb-2">📆</div>
                        <p className="text-slate-400 text-sm mb-3">Nenhum período definido ainda</p>
                        <button onClick={()=>{ setAdicionandoPeriodoAno(true); setFormNovoPeriodo({ nome:'', dataInicio:'', dataFim:'', tema:'', foco:'' }); }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-2 rounded-xl text-sm font-semibold transition">
                            + Adicionar primeiro período
                        </button>
                    </div>
                )}
            </div>

            {/* ── SEÇÃO 2: METAS ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h3 className="font-bold text-slate-700 text-lg mb-1">🎯 Metas do Ano</h3>
                <p className="text-xs text-slate-400 mb-5">Intenções pedagógicas que guiam o ano letivo</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { tipo:'geral', label:'Metas Gerais', icon:'🌟', cor:'blue', metas: metasGerais },
                        { tipo:'musical', label:'Metas Musicais', icon:'🎵', cor:'indigo', metas: metasMusicais },
                        { tipo:'metodologica', label:'Metas Metodológicas', icon:'🧠', cor:'violet', metas: metasMetodologicas },
                    ].map(({ tipo, label, icon, cor, metas: listaMetas }) => (
                        <div key={tipo} className="flex flex-col">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-base">{icon}</span>
                                <h4 className="font-semibold text-slate-700 text-sm">{label}</h4>
                                {listaMetas.length > 0 && (
                                    <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full ml-auto">{listaMetas.length}</span>
                                )}
                            </div>
                            <ul className="space-y-2 mb-3 flex-1">
                                {listaMetas.length === 0 && (
                                    <li className="text-xs text-slate-300 italic">Nenhuma meta ainda</li>
                                )}
                                {listaMetas.map(m => (
                                    <li key={m.id} className="flex items-start gap-2 group">
                                        <span className={`text-${cor}-400 mt-0.5 shrink-0`}>•</span>
                                        <span className="text-sm text-slate-700 flex-1 leading-snug">{m.descricao}</span>
                                        <button onClick={()=>excluirMetaDoAno(anoAtivo.id, m.id)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition shrink-0 text-xs leading-none pt-0.5">✕</button>
                                    </li>
                                ))}
                            </ul>
                            {/* Input para nova meta (uncontrolled) */}
                            <div className="flex gap-2 mt-auto">
                                <input type="text" placeholder="+ Adicionar meta..."
                                    onKeyDown={e=>{ const t=e.target as HTMLInputElement; if(e.key==='Enter' && t.value.trim()){ adicionarMetaNoAno(anoAtivo.id, t.value, tipo); t.value=''; }}}
                                    className={`flex-1 px-3 py-2 border border-dashed border-slate-200 hover:border-${cor}-300 focus:border-${cor}-400 rounded-xl text-xs outline-none transition bg-slate-50`}/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );

}
