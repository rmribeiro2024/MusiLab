import React from 'react'
import { useBancoPlanos } from './BancoPlanosContext'
import { useCalendarioContext } from '../contexts/CalendarioContext'

export function TelaCalendario() {
    const ctx = useBancoPlanos()
    const {
        bold,
        dia,
        h,
        ocultarFeriados,
        planos,
        verificarEvento,
        verificarFeriado,
        setEventoEditando,
        setModalEventos,
        setOcultarFeriados,
        setPlanoSelecionado,
    } = ctx

    const {
        anosLetivos,
    } = ctx as any // eslint-disable-line @typescript-eslint/no-explicit-any

    const cal = useCalendarioContext()
    const {
        dataCalendario,
        setDataCalendario,
        setModalRegistroRapido,
        setRrData,
        setRrAnoSel,
        setRrEscolaSel,
        setRrPlanosSegmento,
        setRrTextos,
        obterTurmasDoDia,
    } = cal

    // Suppress unused-variable warnings for formatting helpers used in JSX indirectly
    void bold; void dia; void h

    const ano = dataCalendario.getFullYear(); const mes = dataCalendario.getMonth();
    const diasNoMes = new Date(ano, mes+1, 0).getDate(); const inicio = new Date(ano, mes, 1).getDay();
    const nomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const dias = [];
    for(let i=0;i<inicio;i++) dias.push(<div key={`e-${i}`} className="bg-gray-100 min-h-[80px]"></div>);
    for(let d=1;d<=diasNoMes;d++){
        const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const aulas = planos.filter(p=>p.historicoDatas?.includes(dataStr));
        const feriado = !ocultarFeriados ? verificarFeriado(dataStr) : null;
        const evento = verificarEvento(dataStr);

        let bgColor = 'bg-white';
        let borderColor = aulas.length ? 'border-indigo-300' : 'border-gray-200';

        if (feriado) {
            bgColor = 'bg-red-50';
            borderColor = 'border-red-300';
        } else if (evento) {
            bgColor = 'bg-orange-50';
            borderColor = 'border-orange-300';
        }

        // Verificar registros pós-aula neste dia
        const registrosNoDia = planos.reduce((acc,p)=>{
            (p.registrosPosAula||[]).forEach(r=>{ if(r.data===dataStr) acc.push({...r, planoTitulo:p.titulo}); });
            return acc;
        },[]);
        const temRegistro = registrosNoDia.length > 0;

        dias.push(
            <div key={d} className={`${bgColor} border ${borderColor} p-1 min-h-[80px] transition group relative`}>
                <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-gray-500">{d}</span>
                    {/* Botão registro rápido — aparece no hover */}
                    <button
                        onClick={()=>{
                            setRrData(dataStr);
                            const turmasDoDia = obterTurmasDoDia(dataStr);
                            if (turmasDoDia.length > 0) {
                                const primeira = turmasDoDia[0];
                                setRrAnoSel(primeira.anoLetivoId);
                                setRrEscolaSel(primeira.escolaId);
                            } else {
                                const anoAtivo = anosLetivos.find(a=>a.status==='ativo');
                                setRrAnoSel(anoAtivo?.id||'');
                                setRrEscolaSel('');
                            }
                            setRrTextos({}); setRrPlanosSegmento({});
                            setModalRegistroRapido(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 bg-amber-400 hover:bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded transition"
                        title="Registro rápido">📝+</button>
                </div>
                {feriado && <div className="text-[10px] bg-red-200 text-red-800 p-1 mb-1 rounded font-bold">🎊 {feriado}</div>}
                {evento && <div className="text-[10px] bg-orange-200 text-orange-800 p-1 mb-1 rounded font-bold cursor-pointer" onClick={()=>setEventoEditando(evento)}>🎉 {evento.nome}</div>}
                {aulas.map(p=><div key={p.id} onClick={()=>setPlanoSelecionado(p)} className="text-[10px] bg-indigo-100 text-indigo-800 p-1 mb-1 rounded cursor-pointer truncate">{p.titulo}</div>)}
                {/* Indicador de registros feitos */}
                {temRegistro && <div className="text-[10px] bg-emerald-100 text-emerald-800 p-1 rounded font-bold">✅ {registrosNoDia.length} reg.</div>}
            </div>
        );
    }
    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">📅 {nomes[mes]} {ano}</h2>
                <div className="flex gap-2">
                    <button onClick={()=>setDataCalendario(new Date(ano,mes-1,1))} className="px-3 py-1 bg-gray-200 rounded">◀</button>
                    <button onClick={()=>setDataCalendario(new Date())} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded">Hoje</button>
                    <button onClick={()=>setDataCalendario(new Date(ano,mes+1,1))} className="px-3 py-1 bg-gray-200 rounded">▶</button>
                    <button onClick={()=>setModalEventos(true)} className="px-4 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded font-bold text-sm">🎉 Eventos</button>
                    <label className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={ocultarFeriados} onChange={e=>setOcultarFeriados(e.target.checked)} className="w-4 h-4" />
                        <span>Ocultar Feriados</span>
                    </label>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-gray-500 text-xs mb-2"><div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>
            <div className="grid grid-cols-7 gap-1 bg-gray-200 border border-gray-200 rounded overflow-hidden">{dias}</div>
        </div>
    );
}

export default function TelaResumoDia() {
    const ctx = useBancoPlanos()
    const {
        escolas,
        italic,
        l,
        para,
        planos,
        sugerirPlanoParaTurma,
        underline,
        setModalGradeSemanal,
        setViewMode,
    } = ctx

    const {
        anosLetivos,
        bold,
        dia,
        h,
    } = ctx as any // eslint-disable-line @typescript-eslint/no-explicit-any

    const cal = useCalendarioContext()
    const {
        dataDia,
        diasExpandidos,
        modoResumo,
        semanaResumo,
        obterTurmasDoDia,
        setDataDia,
        setDiasExpandidos,
        setModalRegistroRapido,
        setModoResumo,
        setRrAnoSel,
        setRrData,
        setRrEscolaSel,
        setRrPlanosSegmento,
        setRrTextos,
        setSemanaResumo,
    } = cal

    // Suppress unused-variable warnings for formatting helpers used in JSX indirectly
    void bold; void dia; void h; void italic; void l; void para; void underline; void escolas

    const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

    // Todos os registros de todos os planos
    const todosRegistros = [];
    planos.forEach(plano => {
        (plano.registrosPosAula || []).forEach(reg => {
            todosRegistros.push({ ...reg, planoTitulo: plano.titulo, planoId: plano.id });
        });
    });

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const toStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const hojeStr = toStr(hoje);

    // Helpers de semana
    const diasDaSemana = Array.from({length: 7}, (_, i) => {
        const d = new Date(semanaResumo); d.setDate(semanaResumo.getDate() + i); return d;
    });
    const semanaAtual = (() => {
        const h = new Date(); const dia = h.getDay();
        const diff = dia === 0 ? -6 : 1 - dia;
        const seg = new Date(h); seg.setDate(h.getDate() + diff); seg.setHours(0,0,0,0);
        return seg.getTime() === semanaResumo.getTime();
    })();
    const irParaHoje = () => {
        const h = new Date(); const dia = h.getDay();
        const diff = dia === 0 ? -6 : 1 - dia;
        const seg = new Date(h); seg.setDate(h.getDate() + diff); seg.setHours(0,0,0,0);
        setSemanaResumo(seg);
        setDataDia(hojeStr);
        setDiasExpandidos({ [hojeStr]: true });
    };
    const semanaAnterior = () => { const s = new Date(semanaResumo); s.setDate(s.getDate()-7); setSemanaResumo(s); setDiasExpandidos({}); };
    const proximaSemana = () => { const s = new Date(semanaResumo); s.setDate(s.getDate()+7); setSemanaResumo(s); setDiasExpandidos({}); };

    const inicioSem = diasDaSemana[0]; const fimSem = diasDaSemana[6];
    const labelSemana = `${inicioSem.getDate()} ${meses[inicioSem.getMonth()]} – ${fimSem.getDate()} ${meses[fimSem.getMonth()]} ${fimSem.getFullYear()}`;
    const totalSemana = diasDaSemana.reduce((acc, d) => acc + todosRegistros.filter(r => r.data === toStr(d)).length, 0);

    const toggleDia = (dataStr) => setDiasExpandidos(prev => ({ ...prev, [dataStr]: !prev[dataStr] }));

    // Renderiza o conteúdo de registros de um dia (compartilhado entre modo dia e semana)
    const renderRegistrosDia = (dataStr) => {
        const regsNoDia = todosRegistros.filter(r => r.data === dataStr);
        if (regsNoDia.length === 0) return <p className="px-4 py-3 text-xs text-gray-400 italic">Nenhum registro para este dia.</p>;
        return (
            <div className="divide-y divide-gray-100">
                {regsNoDia.map(reg => {
                    // Buscar label na nova estrutura (compatibilidade com registros antigos)
                    let labelTurma = '';
                    let ano = anosLetivos.find(a => a.id == reg.anoLetivo);
                    let esc = ano?.escolas.find(e => e.id == reg.escola);
                    let seg = esc?.segmentos.find(s => s.id == (reg.segmento || reg.serie));
                    let tur = seg?.turmas.find(t => t.id == reg.turma);

                    // Compatibilidade: registros antigos sem anoLetivo
                    if (!ano && reg.escola) {
                        for (const a of anosLetivos) {
                            const e = a.escolas.find(e => e.id == reg.escola);
                            if (e) {
                                const s = e.segmentos.find(s => s.id == (reg.segmento || reg.serie));
                                if (s) {
                                    const t = s.turmas.find(t => t.id == reg.turma);
                                    labelTurma = [a.ano, e.nome, s.nome, t?.nome].filter(Boolean).join(' › ');
                                    break;
                                }
                            }
                        }
                    } else {
                        labelTurma = [ano?.ano, esc?.nome, seg?.nome, tur?.nome].filter(Boolean).join(' › ');
                    }

                    return (
                        <div key={reg.id} className="px-4 py-3">
                            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                                {labelTurma
                                    ? <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full shrink-0">{labelTurma}</span>
                                    : <span className="text-xs text-gray-400 italic shrink-0">Turma não identificada</span>
                                }
                                {reg.hora && <span className="text-xs text-gray-400">{reg.hora}</span>}
                                {reg.dataRegistro && reg.dataRegistro !== reg.data && <span className="text-xs text-gray-300 italic">reg. depois</span>}
                            </div>
                            {reg.resumoAula
                                ? <p className="text-sm font-medium text-gray-800 leading-snug">{reg.resumoAula}</p>
                                : <p className="text-xs text-gray-400 italic">Sem resumo registrado</p>
                            }
                            {(reg.funcionouBem || reg.naoFuncionou || reg.proximaAula || reg.comportamento) && (
                                <details className="mt-2">
                                    <summary className="text-xs text-indigo-500 cursor-pointer select-none hover:text-indigo-700">ver detalhes ▾</summary>
                                    <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-indigo-100">
                                        {reg.funcionouBem && <p className="text-xs text-gray-600"><span className="font-bold text-green-700">✅ </span>{reg.funcionouBem}</p>}
                                        {reg.naoFuncionou && <p className="text-xs text-gray-600"><span className="font-bold text-red-600">❌ </span>{reg.naoFuncionou}</p>}
                                        {reg.proximaAula && <p className="text-xs text-gray-600"><span className="font-bold text-blue-600">💡 </span>{reg.proximaAula}</p>}
                                        {reg.comportamento && <p className="text-xs text-gray-600"><span className="font-bold text-purple-600">👥 </span>{reg.comportamento}</p>}
                                    </div>
                                </details>
                            )}
                            <p className="text-xs text-gray-400 mt-1.5">📄 {reg.planoTitulo}</p>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="max-w-2xl mx-auto space-y-3">

            {/* ── BARRA DE VOLTA ── */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-indigo-50/90 backdrop-blur-sm flex items-center justify-between gap-3 border-b border-indigo-100">
                <div className="flex items-center gap-3">
                    <button
                        onClick={()=>setViewMode('lista')}
                        className="flex items-center gap-1.5 text-indigo-700 font-bold text-sm active:opacity-60">
                        ← Voltar
                    </button>
                    <span className="text-indigo-300">|</span>
                    <span className="text-indigo-800 font-bold text-sm">☀️ Resumo do Dia</span>
                </div>
                <button
                    onClick={()=>{
                        const hoje = new Date().toISOString().split('T')[0];
                        setRrData(hoje);

                        // Buscar turmas do dia na grade semanal
                        const turmasDoDia = obterTurmasDoDia(hoje);

                        if (turmasDoDia.length > 0) {
                            // Pegar primeira turma para pré-selecionar ano e escola
                            const primeira = turmasDoDia[0];
                            setRrAnoSel(primeira.anoLetivoId);
                            setRrEscolaSel(primeira.escolaId);

                            // Pré-preencher planos por segmento (sugestão automática)
                            const planosPorSeg = {};
                            turmasDoDia.forEach(aula => {
                                if (!planosPorSeg[aula.segmentoId]) {
                                    const sugerido = sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId);
                                    if (sugerido) planosPorSeg[aula.segmentoId] = sugerido;
                                }
                            });
                            setRrPlanosSegmento(planosPorSeg);
                        } else {
                            // Sem grade: pré-selecionar apenas ano ativo se houver
                            const anoAtivo = anosLetivos.find(a => a.status === 'ativo');
                            if (anoAtivo) {
                                setRrAnoSel(anoAtivo.id);
                            } else {
                                setRrAnoSel('');
                            }
                            setRrEscolaSel('');
                            setRrPlanosSegmento({});
                        }

                        setRrTextos({});
                        setModalRegistroRapido(true);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                    + Registro Rápido
                </button>
            </div>

            {/* ── BARRA DE CONTROLES ── */}
            <div className="bg-white rounded-2xl shadow-lg p-3 space-y-3">

                {/* Linha 1: Hoje | seletor de data | toggle modo */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={()=>{ irParaHoje(); setModoResumo('dia'); setDataDia(hojeStr); }}
                        className="shrink-0 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl">
                        Hoje
                    </button>
                    <input
                        type="date"
                        value={dataDia}
                        onChange={e => { setDataDia(e.target.value); setModoResumo('dia'); }}
                        className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 bg-white outline-none focus:border-indigo-400"
                    />
                    <div className="flex shrink-0 bg-gray-100 rounded-xl p-1 gap-1">
                        <button
                            onClick={()=>setModoResumo('dia')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${modoResumo==='dia' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            Dia
                        </button>
                        <button
                            onClick={()=>setModoResumo('semana')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${modoResumo==='semana' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            Semana
                        </button>
                    </div>
                </div>

                {/* Linha 2 (só no modo semana): navegação ◀ semana ▶ */}
                {modoResumo === 'semana' && (
                    <div className="flex items-center gap-2">
                        <button onClick={semanaAnterior} className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600">◀</button>
                        <div className="flex-1 text-center">
                            <p className="font-bold text-gray-800 text-sm">{labelSemana}</p>
                            <p className="text-xs text-gray-400">{totalSemana === 0 ? 'Nenhum registro' : `${totalSemana} registro${totalSemana>1?'s':''}`}</p>
                        </div>
                        <button onClick={proximaSemana} className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600">▶</button>
                    </div>
                )}
                {modoResumo === 'semana' && !semanaAtual && (
                    <button onClick={irParaHoje} className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl">↩ Semana atual</button>
                )}
            </div>

            {/* ── MODO DIA ── */}
            {modoResumo === 'dia' && (() => {
                const dia = new Date(dataDia + 'T12:00:00');
                const regsNoDia = todosRegistros.filter(r => r.data === dataDia);
                const nomeDia = diasSemana[dia.getDay()];
                const ehHoje = dataDia === hojeStr;
                const labelDia = `${nomeDia}, ${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}/${dia.getFullYear()}`;
                return (
                    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${ehHoje ? 'border-amber-400' : regsNoDia.length > 0 ? 'border-indigo-400' : 'border-gray-200'}`}>
                        <div className={`px-4 py-3 flex justify-between items-center ${ehHoje ? 'bg-amber-50' : regsNoDia.length > 0 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                            <div className="flex items-center gap-2">
                                {ehHoje && <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Hoje</span>}
                                <span className={`font-bold text-sm ${ehHoje ? 'text-amber-700' : 'text-gray-700'}`}>{labelDia}</span>
                            </div>
                            {regsNoDia.length > 0
                                ? <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{regsNoDia.length} turma{regsNoDia.length>1?'s':''}</span>
                                : <span className="text-xs text-gray-400">sem registros</span>
                            }
                        </div>

                        {/* Widget: Turmas do Dia (da Grade Semanal) */}
                        {(() => {
                            const turmasDoDia = obterTurmasDoDia(dataDia);

                            if (turmasDoDia.length === 0) {
                                return (
                                    <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
                                        <p className="text-xs text-purple-600 text-center">
                                            📅 Nenhuma turma cadastrada na Grade Semanal para este dia.
                                            <button onClick={()=>setModalGradeSemanal(true)} className="underline ml-1 font-bold hover:text-purple-800">
                                                Cadastrar grade
                                            </button>
                                        </p>
                                    </div>
                                );
                            }

                            // Agrupar por escola
                            const porEscola = {};
                            turmasDoDia.forEach(aula => {
                                const ano = anosLetivos.find(a=>a.id==aula.anoLetivoId);
                                const esc = ano?.escolas.find(e=>e.id==aula.escolaId);
                                const escolaNome = esc?.nome || 'Escola não encontrada';
                                if (!porEscola[escolaNome]) porEscola[escolaNome] = [];
                                porEscola[escolaNome].push(aula);
                            });

                            return (
                                <div className="px-4 py-3 bg-purple-50 border-t border-purple-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-purple-800 uppercase">📅 Minhas Turmas de Hoje</p>
                                        <button onClick={()=>setModalGradeSemanal(true)} className="text-xs text-purple-600 hover:text-purple-800 underline font-bold">
                                            Ver grade
                                        </button>
                                    </div>

                                    {Object.keys(porEscola).sort().map(escolaNome => {
                                        const aulas = porEscola[escolaNome].sort((a,b) => a.horario.localeCompare(b.horario));
                                        return (
                                            <div key={escolaNome} className="bg-white rounded-lg border border-purple-200 p-2">
                                                <p className="text-xs font-bold text-purple-900 mb-2">🏫 {escolaNome}</p>
                                                <div className="space-y-1">
                                                    {aulas.map(aula => {
                                                        const ano = anosLetivos.find(a=>a.id==aula.anoLetivoId);
                                                        const esc = ano?.escolas.find(e=>e.id==aula.escolaId);
                                                        const seg = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                                        const tur = seg?.turmas.find(t=>t.id==aula.turmaId);

                                                        return (
                                                            <div key={aula.id} className="flex items-center gap-2 text-xs">
                                                                <span className="font-mono font-bold text-purple-700 shrink-0">{aula.horario}</span>
                                                                <span className="text-gray-400">•</span>
                                                                <span className="text-purple-800 font-medium">{seg?.nome || '?'}</span>
                                                                <span className="text-gray-400">›</span>
                                                                <span className="text-gray-700">{tur?.nome || '?'}</span>
                                                                {aula.observacao && (
                                                                    <span className="text-gray-400 italic text-xs">({aula.observacao})</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {renderRegistrosDia(dataDia)}
                    </div>
                );
            })()}

            {/* ── MODO SEMANA — visão consolidada com status ── */}
            {modoResumo === 'semana' && (() => {
                // Mostrar TODOS os dias úteis (Seg–Sex) da semana
                const diasUteis = diasDaSemana.filter(d => d.getDay() >= 1 && d.getDay() <= 6);

                return (
                    <div className="space-y-2">
                        {diasUteis.map(dia => {
                            const dataStr = toStr(dia);
                            const regsNoDia = todosRegistros.filter(r => r.data === dataStr);
                            const turmasDoDia = obterTurmasDoDia(dataStr);
                            const ehHoje = dia.getTime() === hoje.getTime();
                            const ehFuturo = dia > hoje;
                            const expandido = !!diasExpandidos[dataStr];
                            const nomeDia = diasSemana[dia.getDay()];
                            const labelDia = `${nomeDia} · ${String(dia.getDate()).padStart(2,'0')}/${String(dia.getMonth()+1).padStart(2,'0')}`;

                            // Calcular status de cada turma da grade
                            const turmasComStatus = turmasDoDia.map(aula => {
                                const ano = anosLetivos.find(a=>a.id==aula.anoLetivoId);
                                const esc = ano?.escolas.find(e=>e.id==aula.escolaId);
                                const seg = esc?.segmentos.find(s=>s.id==aula.segmentoId);
                                const tur = seg?.turmas.find(t=>t.id==aula.turmaId);
                                const temRegistroNoDia = regsNoDia.some(r =>
                                    r.anoLetivo==aula.anoLetivoId && r.escola==aula.escolaId &&
                                    (r.segmento||r.serie)==aula.segmentoId && r.turma==aula.turmaId
                                );
                                const planoSugerido = sugerirPlanoParaTurma(aula.anoLetivoId, aula.escolaId, aula.segmentoId, aula.turmaId);
                                return { aula, seg, tur, esc, temRegistroNoDia, temPlano: !!planoSugerido };
                            });

                            const totalDadas    = turmasComStatus.filter(t=>t.temRegistroNoDia).length;
                            const totalPlanej   = turmasComStatus.filter(t=>!t.temRegistroNoDia && t.temPlano).length;
                            const totalSemPlano = turmasComStatus.filter(t=>!t.temRegistroNoDia && !t.temPlano).length;

                            // Cor da borda: verde se tudo dado, amarelo se parcial, cinza se sem nada
                            const borderCol = ehHoje ? 'border-amber-400' :
                                totalDadas > 0 && totalDadas === turmasComStatus.length ? 'border-emerald-400' :
                                totalDadas > 0 ? 'border-blue-400' :
                                turmasComStatus.length > 0 ? 'border-gray-300' : 'border-gray-200';

                            const bgHeader = ehHoje ? 'bg-amber-50' :
                                totalDadas > 0 && totalDadas === turmasComStatus.length ? 'bg-emerald-50' :
                                totalDadas > 0 ? 'bg-blue-50' : 'bg-gray-50';

                            return (
                                <div key={dataStr} className={`bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 ${borderCol}`}>
                                    {/* Cabeçalho */}
                                    <button onClick={()=>toggleDia(dataStr)}
                                        className={`w-full px-4 py-3 flex justify-between items-center text-left ${bgHeader}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {ehHoje && <span className="bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">Hoje</span>}
                                            {ehFuturo && <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">Futuro</span>}
                                            <span className={`font-bold text-sm ${ehHoje ? 'text-amber-700' : 'text-gray-700'}`}>{labelDia}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {/* Pílulas de status */}
                                            {totalDadas > 0 && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ {totalDadas}</span>}
                                            {totalPlanej > 0 && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📋 {totalPlanej}</span>}
                                            {totalSemPlano > 0 && <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">⬜ {totalSemPlano}</span>}
                                            {turmasComStatus.length === 0 && regsNoDia.length === 0 && <span className="text-xs text-gray-400">sem aulas</span>}
                                            <span className={`text-gray-400 text-xs ml-1 ${expandido?'rotate-180':''}`} style={{display:'inline-block',transition:'transform .2s'}}>▼</span>
                                        </div>
                                    </button>

                                    {/* Conteúdo expandido */}
                                    {expandido && (
                                        <div>
                                            {/* Grade do dia — turmas com status */}
                                            {turmasComStatus.length > 0 && (
                                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 space-y-1.5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-xs font-bold text-slate-500 uppercase">Turmas do dia</p>
                                                        <button onClick={()=>{
                                                            setRrData(dataStr);
                                                            const primeira = turmasDoDia[0];
                                                            setRrAnoSel(primeira?.anoLetivoId||'');
                                                            setRrEscolaSel(primeira?.escolaId||'');
                                                            setRrTextos({}); setRrPlanosSegmento({});
                                                            setModalRegistroRapido(true);
                                                        }} className="text-xs bg-amber-400 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg">
                                                            📝 Registrar
                                                        </button>
                                                    </div>
                                                    {turmasComStatus.map(({aula, seg, tur, esc, temRegistroNoDia, temPlano}, idx) => (
                                                        <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                                                            temRegistroNoDia ? 'bg-emerald-50 border border-emerald-200' :
                                                            temPlano ? 'bg-blue-50 border border-blue-200' :
                                                            'bg-white border border-gray-200'}`}>
                                                            <span className="shrink-0 text-base">
                                                                {temRegistroNoDia ? '✅' : temPlano ? '📋' : '⬜'}
                                                            </span>
                                                            <span className="font-mono font-bold text-slate-600 shrink-0">{aula.horario}</span>
                                                            <span className="text-slate-500 shrink-0">{esc?.nome}</span>
                                                            <span className="text-slate-400">›</span>
                                                            <span className="font-medium text-slate-700">{seg?.nome}</span>
                                                            <span className="text-slate-400">›</span>
                                                            <span className="text-slate-600">{tur?.nome}</span>
                                                            <span className="ml-auto text-slate-400 italic text-[10px]">
                                                                {temRegistroNoDia ? 'Registrada' : temPlano ? 'Planejada' : 'Sem plano'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Registros feitos */}
                                            {renderRegistrosDia(dataStr)}
                                            {/* Dia sem nada */}
                                            {turmasComStatus.length === 0 && regsNoDia.length === 0 && (
                                                <p className="px-4 py-4 text-xs text-gray-400 text-center italic">Nenhuma turma nem registro para este dia.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Legenda */}
                        <div className="flex gap-3 px-2 pt-1 flex-wrap">
                            <span className="text-xs text-gray-400 flex items-center gap-1">✅ <span>Aula registrada</span></span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">📋 <span>Planejada (sem registro)</span></span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">⬜ <span>Sem plano vinculado</span></span>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
