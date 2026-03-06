import React from 'react'
import { useCalendarioContext } from '../../contexts'
import { useAnoLetivoContext } from '../../contexts'
import { usePlanosContext } from '../../contexts'

export default function ModalRegistroPosAula() {
    const {
        modalRegistro, setModalRegistro,
        planoParaRegistro,
        verRegistros, setVerRegistros,
        registroEditando, setRegistroEditando,
        novoRegistro, setNovoRegistro,
        regAnoSel, setRegAnoSel,
        regEscolaSel, setRegEscolaSel,
        regSegmentoSel, setRegSegmentoSel,
        regTurmaSel, setRegTurmaSel,
        filtroRegAno, setFiltroRegAno,
        filtroRegEscola, setFiltroRegEscola,
        filtroRegSegmento, setFiltroRegSegmento,
        filtroRegTurma, setFiltroRegTurma,
        buscaRegistros, setBuscaRegistros,
    } = useCalendarioContext()
    const { anosLetivos } = useAnoLetivoContext()
    const { planos, salvarRegistro, editarRegistro, excluirRegistro } = usePlanosContext()
    // setRegSerieSel era backward-compat — componente inline ainda pode referenciar sem erro
    const setRegSerieSel: ((v: string) => void) | undefined = undefined

    // Auto-selecionar o ano letivo ativo (ou mais próximo do atual) ao abrir o modal
    React.useEffect(() => {
        if (modalRegistro && !regAnoSel && anosLetivos.length > 0) {
            const anoAtual = new Date().getFullYear()
            const ativo = anosLetivos.find(a => a.status === 'ativo')
            const maisProximo = anosLetivos
                .filter(a => a.status !== 'arquivado')
                .sort((a, b) => Math.abs((a.ano as number) - anoAtual) - Math.abs((b.ano as number) - anoAtual))[0]
            const selecionado = ativo || maisProximo
            if (selecionado) setRegAnoSel(String(selecionado.id))
        }
    }, [modalRegistro]) // eslint-disable-line

    if (!modalRegistro || !planoParaRegistro) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalRegistro(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div className="bg-amber-500 text-white p-4 flex justify-between items-start rounded-t-2xl sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-bold">📝 Registro Pós-Aula</h2>
                        <p className="text-amber-100 text-xs mt-0.5 line-clamp-1">{planoParaRegistro.titulo}</p>
                    </div>
                    <button onClick={()=>setModalRegistro(false)} className="text-white text-xl font-bold ml-4">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button onClick={()=>{setVerRegistros(false);}} className={`flex-1 py-3 font-bold text-sm ${!verRegistros ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>
                        {registroEditando ? '✏️ Editando' : '✏️ Novo'}
                    </button>
                    <button onClick={()=>setVerRegistros(true)} className={`flex-1 py-3 font-bold text-sm ${verRegistros ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500'}`}>
                        📚 Histórico {planoParaRegistro.registrosPosAula?.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full ml-1">{planoParaRegistro.registrosPosAula.length}</span>}
                    </button>
                </div>

                <div className="p-4 space-y-3">
                {!verRegistros ? (
                    <>
                        {/* Banner modo edição */}
                        {registroEditando && (
                            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                                <span className="text-xs font-bold text-blue-700">✏️ Editando registro</span>
                                <button onClick={()=>{ setRegistroEditando(null); setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula:'', funcionouBem:'', naoFuncionou:'', proximaAula:'', comportamento:'' }); setRegEscolaSel(''); setRegSerieSel && setRegSerieSel(''); setRegTurmaSel(''); }} className="text-xs text-gray-500 font-bold hover:text-red-500">✕ Cancelar</button>
                            </div>
                        )}

                        {/* Seleção de turma — 4 níveis: Ano → Escola → Segmento → Turma */}
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-bold text-teal-800 mb-1">🏫 Identificar turma</p>

                            {/* Ano Letivo */}
                            <select value={regAnoSel} onChange={e=>{setRegAnoSel(e.target.value);setRegEscolaSel('');setRegSegmentoSel('');setRegTurmaSel('');}} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm bg-white">
                                <option value="">— Ano Letivo —</option>
                                {anosLetivos.filter(a => a.status !== 'arquivado').map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                            </select>

                            {/* Escola */}
                            {regAnoSel && (() => {
                                const ano = anosLetivos.find(a=>a.id==regAnoSel);
                                return ano && ano.escolas.length > 0 ? (
                                    <select value={regEscolaSel} onChange={e=>{setRegEscolaSel(e.target.value);setRegSegmentoSel('');setRegTurmaSel('');}} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm bg-white">
                                        <option value="">— Escola —</option>
                                        {ano.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                    </select>
                                ) : <p className="text-xs text-teal-600 italic">Nenhuma escola cadastrada neste ano.</p>;
                            })()}

                            {/* Segmento */}
                            {regEscolaSel && (() => {
                                const ano = anosLetivos.find(a=>a.id==regAnoSel);
                                const esc = ano?.escolas.find(e=>e.id==regEscolaSel);
                                return esc && esc.segmentos.length > 0 ? (
                                    <select value={regSegmentoSel} onChange={e=>{setRegSegmentoSel(e.target.value);setRegTurmaSel('');}} className="w-full px-3 py-2 border border-teal-300 rounded-lg text-sm bg-white">
                                        <option value="">— Segmento —</option>
                                        {esc.segmentos.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                                    </select>
                                ) : <p className="text-xs text-teal-600 italic">Nenhum segmento cadastrado para esta escola.</p>;
                            })()}

                            {/* Turma */}
                            {regSegmentoSel && (() => {
                                const ano = anosLetivos.find(a=>a.id==regAnoSel);
                                const esc = ano?.escolas.find(e=>e.id==regEscolaSel);
                                const seg = esc?.segmentos.find(s=>s.id==regSegmentoSel);
                                return seg && seg.turmas.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {seg.turmas.map(t=>(
                                            <button key={t.id} type="button" onClick={()=>setRegTurmaSel(t.id==regTurmaSel?'':t.id)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition ${regTurmaSel==t.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'}`}>
                                                {t.nome}
                                            </button>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-teal-600 italic">Nenhuma turma cadastrada para este segmento.</p>;
                            })()}

                            {(!regAnoSel) && <p className="text-xs text-gray-400">Cadastre anos letivos, escolas e turmas em <strong>🏫 Turmas</strong> no menu principal.</p>}
                        </div>

                        {/* Banner "Última aula com esta turma" */}
                        {regTurmaSel && (() => {
                            const todosRegs = [];
                            planos.forEach(p => {
                                (p.registrosPosAula||[]).forEach(r => {
                                    if (r.turma == regTurmaSel && !(registroEditando && r.id === registroEditando.id))
                                        todosRegs.push({ ...r, planoTitulo: p.titulo });
                                });
                            });
                            if (todosRegs.length === 0) return null;
                            const ultimo = todosRegs.sort((a,b) => (b.data||'').localeCompare(a.data||''))[0];
                            const dataFmt = ultimo.data ? new Date(ultimo.data+'T12:00:00').toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'}) : '';
                            return (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs">
                                    <p className="font-bold text-indigo-700 mb-1">🔁 Última aula com esta turma — {dataFmt}</p>
                                    <p className="text-indigo-600 font-medium mb-1">📋 {ultimo.planoTitulo}</p>
                                    {ultimo.resumoAula && <p className="text-gray-700 mb-1"><span className="font-bold">Realizado:</span> {ultimo.resumoAula}</p>}
                                    {ultimo.proximaAula && <p className="text-gray-700"><span className="font-bold text-blue-700">💡 Planejado para hoje:</span> {ultimo.proximaAula}</p>}
                                </div>
                            );
                        })()}

                        {/* Data da Aula */}
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                            <span className="text-xs font-bold text-amber-700 shrink-0">📅 Data da aula</span>
                            <input
                                type="date"
                                autoFocus
                                value={novoRegistro.dataAula}
                                onChange={e=>setNovoRegistro({...novoRegistro, dataAula: e.target.value})}
                                className="flex-1 bg-transparent text-sm font-bold text-amber-900 outline-none border-none text-right"
                            />
                        </div>

                        {/* Templates rápidos */}
                        {!registroEditando && (
                            <div>
                                <p className="text-xs font-bold text-gray-500 mb-2">⚡ Preencher rapidamente:</p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: '🌟 Ótimo engajamento', resumoAula: 'Aula com excelente participação da turma.', funcionouBem: 'Alto engajamento e entusiasmo. Participação ativa em todas as atividades.', naoFuncionou: '', proximaAula: 'Avançar para o próximo conteúdo planejado.', comportamento: 'Turma muito receptiva e colaborativa.' },
                                        { label: '🔄 Precisamos revisitar', resumoAula: 'Revisão do conteúdo anterior.', funcionouBem: 'Os alunos que compreenderam ajudaram os colegas.', naoFuncionou: 'Conteúdo não foi suficientemente assimilado.', proximaAula: 'Retomar com abordagem diferente e mais exemplos.', comportamento: 'Turma dispersa em momentos. Necessário reforço.' },
                                        { label: '🆕 Introdução', resumoAula: 'Introdução de novo conteúdo/repertório.', funcionouBem: 'Boa receptividade ao material novo. Curiosidade demonstrada.', naoFuncionou: '', proximaAula: 'Aprofundar o novo conteúdo introduzido hoje.', comportamento: 'Turma atenta e curiosa.' },
                                        { label: '✅ Aula tranquila', resumoAula: 'Aula conforme planejado.', funcionouBem: 'Execução do plano sem intercorrências.', naoFuncionou: '', proximaAula: 'Continuar com o sequenciamento previsto.', comportamento: 'Turma colaborativa e dentro do esperado.' },
                                    ].map(t => (
                                        <button
                                            key={t.label}
                                            type="button"
                                            onClick={() => setNovoRegistro({ ...novoRegistro, resumoAula: t.resumoAula, funcionouBem: t.funcionouBem, naoFuncionou: t.naoFuncionou, proximaAula: t.proximaAula, comportamento: t.comportamento })}
                                            className="px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold rounded-lg hover:bg-amber-100 active:scale-95 transition"
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Campos de texto */}
                        <div>
                            <label htmlFor="reg-resumo" className="block font-bold text-gray-800 mb-1 text-sm">📋 O que foi realizado nesta aula</label>
                            <textarea id="reg-resumo" value={novoRegistro.resumoAula} onChange={e=>setNovoRegistro({...novoRegistro, resumoAula: e.target.value})} className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-gray-500 outline-none" rows={2} placeholder="Ex: Ritmo corporal + início da música X" />
                        </div>
                        <div>
                            <label htmlFor="reg-funcionou" className="block font-bold text-green-700 mb-1 text-sm">✅ O que funcionou bem</label>
                            <textarea id="reg-funcionou" value={novoRegistro.funcionouBem} onChange={e=>setNovoRegistro({...novoRegistro, funcionouBem: e.target.value})} className="w-full px-3 py-2 border-2 border-green-200 rounded-lg text-sm focus:border-green-400 outline-none" rows={2} placeholder="Ex: A atividade rítmica em grupo engajou muito..." />
                        </div>
                        <div>
                            <label htmlFor="reg-nao-funcionou" className="block font-bold text-red-600 mb-1 text-sm">❌ O que não funcionou</label>
                            <textarea id="reg-nao-funcionou" value={novoRegistro.naoFuncionou} onChange={e=>setNovoRegistro({...novoRegistro, naoFuncionou: e.target.value})} className="w-full px-3 py-2 border-2 border-red-200 rounded-lg text-sm focus:border-red-400 outline-none" rows={2} placeholder="Ex: Tempo insuficiente para a etapa de criação..." />
                        </div>
                        <div>
                            <label htmlFor="reg-proxima" className="block font-bold text-blue-600 mb-1 text-sm">💡 Ideias para a próxima aula</label>
                            <textarea id="reg-proxima" value={novoRegistro.proximaAula} onChange={e=>setNovoRegistro({...novoRegistro, proximaAula: e.target.value})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg text-sm focus:border-blue-400 outline-none" rows={2} placeholder="Ex: Começar com o ostinato antes da canção..." />
                        </div>
                        <div>
                            <label className="block font-bold text-purple-600 mb-1 text-sm">👥 Comportamento da turma</label>
                            <textarea value={novoRegistro.comportamento} onChange={e=>setNovoRegistro({...novoRegistro, comportamento: e.target.value})} className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg text-sm focus:border-purple-400 outline-none" rows={2} placeholder="Ex: Turma agitada no início, focou após aquecimento..." />
                        </div>
                        <button onClick={salvarRegistro} className={`w-full py-3 rounded-xl font-bold text-base text-white ${registroEditando ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700'}`}>
                            {registroEditando ? '✓ Salvar alterações' : '💾 Salvar Registro'}
                        </button>
                    </>
                ) : (
                    <>
                        {/* Botão voltar */}
                        <button onClick={()=>setVerRegistros(false)} className="flex items-center gap-1.5 text-amber-600 font-bold text-sm active:opacity-60 mb-1">
                            ← Novo registro
                        </button>

                        {/* Busca textual */}
                        {planoParaRegistro.registrosPosAula?.length > 0 && (
                            <div className="relative mb-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                                <input type="text" value={buscaRegistros} onChange={e=>setBuscaRegistros(e.target.value)}
                                    className="w-full pl-7 pr-8 py-2 border rounded-xl text-sm focus:border-amber-400 outline-none"
                                    placeholder="Buscar nos registros (ostinato, ritmo, turma...)"/>
                                {buscaRegistros && <button onClick={()=>setBuscaRegistros('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold">✕</button>}
                            </div>
                        )}

                        {/* Filtros — 4 níveis */}
                        {planoParaRegistro.registrosPosAula?.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                                <select value={filtroRegAno} onChange={e=>{setFiltroRegAno(e.target.value);setFiltroRegEscola('');setFiltroRegSegmento('');setFiltroRegTurma('');}} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                    <option value="">Todos os anos</option>
                                    {anosLetivos.map(a=><option key={a.id} value={a.id}>{a.ano}</option>)}
                                </select>
                                {filtroRegAno && (() => {
                                    const ano = anosLetivos.find(a=>a.id==filtroRegAno);
                                    return ano?.escolas.length > 0 ? (
                                        <select value={filtroRegEscola} onChange={e=>{setFiltroRegEscola(e.target.value);setFiltroRegSegmento('');setFiltroRegTurma('');}} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                            <option value="">Todas escolas</option>
                                            {ano.escolas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
                                        </select>
                                    ) : null;
                                })()}
                                {filtroRegEscola && (() => {
                                    const ano = anosLetivos.find(a=>a.id==filtroRegAno);
                                    const esc = ano?.escolas.find(e=>e.id==filtroRegEscola);
                                    return esc?.segmentos.length > 0 ? (
                                        <select value={filtroRegSegmento} onChange={e=>{setFiltroRegSegmento(e.target.value);setFiltroRegTurma('');}} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                            <option value="">Todos segmentos</option>
                                            {esc.segmentos.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}
                                        </select>
                                    ) : null;
                                })()}
                                {filtroRegSegmento && (() => {
                                    const ano = anosLetivos.find(a=>a.id==filtroRegAno);
                                    const esc = ano?.escolas.find(e=>e.id==filtroRegEscola);
                                    const seg = esc?.segmentos.find(s=>s.id==filtroRegSegmento);
                                    return seg?.turmas.length > 0 ? (
                                        <select value={filtroRegTurma} onChange={e=>setFiltroRegTurma(e.target.value)} className="flex-1 min-w-0 px-2 py-1.5 border rounded-lg text-xs bg-white">
                                            <option value="">Todas turmas</option>
                                            {seg.turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}
                                        </select>
                                    ) : null;
                                })()}
                            </div>
                        )}

                        {/* Lista de registros filtrados */}
                        {(() => {
                            const regs = (planoParaRegistro.registrosPosAula || []).filter(r => {
                                if (filtroRegAno && r.anoLetivo != filtroRegAno) return false;
                                if (filtroRegEscola && r.escola != filtroRegEscola) return false;
                                if (filtroRegSegmento && (r.segmento || r.serie) != filtroRegSegmento) return false;
                                if (filtroRegTurma && r.turma != filtroRegTurma) return false;
                                if (buscaRegistros.trim()) {
                                    const t = buscaRegistros.toLowerCase();
                                    const campos = [r.resumoAula, r.funcionouBem, r.naoFuncionou, r.poderiaMelhorar, r.proximaAula, r.comportamento];
                                    if (!campos.some(c => (c||'').toLowerCase().includes(t))) return false;
                                }
                                return true;
                            });
                            if (regs.length === 0) return (
                                <div className="text-center text-gray-400 py-8">
                                    <p className="text-4xl mb-2">📋</p>
                                    <p className="text-sm">{planoParaRegistro.registrosPosAula?.length > 0 ? 'Nenhum registro para este filtro.' : 'Nenhum registro ainda.'}</p>
                                    <button onClick={()=>setVerRegistros(false)} className="mt-3 text-amber-600 font-bold underline text-sm">Fazer registro</button>
                                </div>
                            );
                            return [...regs].reverse().map(reg => {
                                let label = '';
                                let ano = anosLetivos.find(a => a.id == reg.anoLetivo);
                                let esc = ano?.escolas.find(e => e.id == reg.escola);
                                let seg = esc?.segmentos.find(s => s.id == (reg.segmento || reg.serie));
                                let tur = seg?.turmas.find(t => t.id == reg.turma);

                                if (!ano && reg.escola) {
                                    for (const a of anosLetivos) {
                                        const e = a.escolas.find(e => e.id == reg.escola);
                                        if (e) {
                                            const s = e.segmentos.find(s => s.id == (reg.segmento || reg.serie));
                                            if (s) {
                                                const t = s.turmas.find(t => t.id == reg.turma);
                                                label = [a.ano, e.nome, s.nome, t?.nome].filter(Boolean).join(' › ');
                                                break;
                                            }
                                        }
                                    }
                                } else {
                                    label = [ano?.ano, esc?.nome, seg?.nome, tur?.nome].filter(Boolean).join(' › ');
                                }

                                return (
                                    <div key={reg.id} className={`border rounded-xl p-3 ${registroEditando?.id === reg.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                {label && <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full block mb-1">{label}</span>}
                                                <span className="text-xs font-bold text-amber-700">📅 {new Date(reg.data+'T12:00:00').toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit'})}</span>
                                                {reg.dataRegistro && reg.dataRegistro !== reg.data && <span className="text-xs text-gray-400 ml-2">(registrado em {new Date(reg.dataRegistro+'T12:00:00').toLocaleDateString('pt-BR')})</span>}
                                                {reg.dataEdicao && <span className="text-xs text-blue-400 ml-2">· editado</span>}
                                            </div>
                                            <div className="flex items-center gap-2 ml-2 shrink-0">
                                                <button onClick={()=>editarRegistro(reg)} className="text-xs font-bold text-blue-500 hover:text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-lg">✏️</button>
                                                <button onClick={()=>excluirRegistro(reg.id)} className="text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">🗑️</button>
                                            </div>
                                        </div>
                                        {reg.resumoAula && <div className="mb-2 bg-white border border-gray-200 rounded-lg px-3 py-2"><span className="text-xs font-bold text-gray-500 uppercase tracking-wide">📋 Realizado</span><p className="text-sm font-medium text-gray-800 mt-0.5">{reg.resumoAula}</p></div>}
                                        {reg.funcionouBem && <div className="mb-1.5"><span className="text-xs font-bold text-green-700">✅ </span><span className="text-sm text-gray-700">{reg.funcionouBem}</span></div>}
                                        {reg.naoFuncionou && <div className="mb-1.5"><span className="text-xs font-bold text-red-600">❌ </span><span className="text-sm text-gray-700">{reg.naoFuncionou}</span></div>}
                                        {reg.poderiaMelhorar && <div className="mb-1.5"><span className="text-xs font-bold text-orange-600">🔧 </span><span className="text-sm text-gray-700">{reg.poderiaMelhorar}</span></div>}
                                        {reg.proximaAula && <div className="mb-1.5"><span className="text-xs font-bold text-blue-600">💡 </span><span className="text-sm text-gray-700">{reg.proximaAula}</span></div>}
                                        {reg.comportamento && <div><span className="text-xs font-bold text-purple-600">👥 </span><span className="text-sm text-gray-700">{reg.comportamento}</span></div>}
                                    </div>
                                );
                            });
                        })()}
                    </>
                )}
                </div>
            </div>
        </div>
    )
}
