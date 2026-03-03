import React, { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { sanitizar, gerarIdSeguro } from '../lib/utils'
import { useBancoPlanos } from './BancoPlanosContext'
import { useSequenciasContext } from '../contexts'
import { exportarSequenciaPDF } from '../utils/pdf'

export default function ModuloSequencias() {
    const ctx = useBancoPlanos()
    // ── Campos de domínio — vêm do SequenciasContext (Parte 5) ──
    const {
        atualizarRascunhoSlot,
        buscaPlanoVinculo,
        buscaProfundaSequencias,
        desvincularPlano,
        excluirSequencia,
        filtroEscolaSequencias,
        filtroPeriodoSequencias,
        filtroUnidadeSequencias,
        modalVincularPlano,
        salvarSequencia,
        sequenciaDetalhe,
        sequenciaEditando,
        sequencias,
        setBuscaPlanoVinculo,
        setBuscaProfundaSequencias,
        setFiltroEscolaSequencias,
        setFiltroPeriodoSequencias,
        setFiltroUnidadeSequencias,
        setModalVincularPlano,
        setSequenciaDetalhe,
        setSequenciaEditando,
        setSequencias,
        vincularPlanoAoSlot,
    } = useSequenciasContext()
    // ── Campos cross-domain — ainda vêm do BancoPlanosContext (bridge) ──
    const {
        anosLetivos,
        atividades,
        bold,
        escolas,
        h,
        novaSequencia,  // wrapper que passa anosLetivos — permanece no bridge
        planos,
        setModalConfirm,
        unidades,
    } = ctx

    // ── Drag & drop para reordenar slots ──
    const dragSlotIdx = useRef<number | null>(null)
    const reordenarSlots = (seqId: string, fromIdx: number, toIdx: number) => {
        const novas = sequencias.map(s => {
            if (s.id !== seqId) return s
            const slots = [...s.slots]
            const [removed] = slots.splice(fromIdx, 1)
            slots.splice(toIdx, 0, removed)
            return { ...s, slots: slots.map((sl, i) => ({ ...sl, ordem: i + 1 })) }
        })
        setSequencias(novas)
        setSequenciaDetalhe(novas.find(s => s.id === seqId) || null)
    }

    const escolasComSequencias = [...new Set(sequencias.map(s => {
        const ano = anosLetivos.find(a => a.id == s.anoLetivoId);
        const escola = ano?.escolas?.find(e => e.id == s.escolaId);
        return escola?.nome || 'Sem escola';
    }))];

    const unidadesComSequencias = [...new Set(sequencias.map(s => s.unidadePredominante).filter(Boolean))]

    const sequenciasFiltradas = sequencias.filter(s => {
        const ano = anosLetivos.find(a => a.id == s.anoLetivoId)
        const escola = ano?.escolas?.find(e => e.id == s.escolaId)
        const nomeEscola = escola?.nome || 'Sem escola'
        if (filtroEscolaSequencias !== 'Todas' && nomeEscola !== filtroEscolaSequencias) return false
        if (filtroUnidadeSequencias !== 'Todas' && s.unidadePredominante !== filtroUnidadeSequencias) return false
        if (filtroPeriodoSequencias !== 'Todos' && s.duracao !== filtroPeriodoSequencias) return false
        if (buscaProfundaSequencias) {
            const busca = buscaProfundaSequencias.toLowerCase()
            const emTitulo = s.titulo?.toLowerCase().includes(busca)
            const emSlots = (s.slots || []).some(slot => {
                const plano = planos.find(p => p.id == slot.planoVinculado)
                return plano?.titulo?.toLowerCase().includes(busca) || slot.rascunho?.titulo?.toLowerCase().includes(busca)
            })
            if (!emTitulo && !emSlots) return false
        }
        return true
    })

    const obterInfoSequencia = (seq) => {
        const ano = anosLetivos.find(a => a.id == seq.anoLetivoId);
        if (!ano) return null;
        const escola = ano.escolas.find(e => e.id == seq.escolaId);
        if (!escola) return null;
        const nomesSegmentos = (seq.segmentos || []).map(segId => {
            const seg = escola.segmentos.find(s => s.id == segId);
            return seg ? seg.nome : null;
        }).filter(Boolean);
        return { ano: ano.nome, escola: escola.nome, segmentos: nomesSegmentos, turmaEspecifica: seq.turmaEspecifica || null };
    };

    // Modo Detalhe - Visualizar slots de uma sequência específica
    const seq = sequenciaDetalhe;
    const infoSeq = sequenciaDetalhe ? obterInfoSequencia(sequenciaDetalhe) : null;

    return (
        <>
            {/* ════ VISTA PRINCIPAL ════ */}
            {sequenciaDetalhe ? (
            <>
                {/* Cabeçalho com botão Voltar */}
                <div className="mb-6 flex items-center gap-4">
                    <button 
                        onClick={() => setSequenciaDetalhe(null)}
                        className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg font-bold"
                    >
                        ⬅ Voltar
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800">{seq.titulo}</h2>
                        {infoSeq && (
                            <p className="text-gray-600">
                                {infoSeq.escola} • {infoSeq.segmentos.join(', ')}
                                {infoSeq.turmaEspecifica && <span className="text-rose-600"> • (Turma {infoSeq.turmaEspecifica})</span>}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={()=>setSequenciaEditando(seq)} className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold">🗑️ Excluir</button>
                        <button onClick={()=>{
                            // Salvar alterações
                            setSequencias([...sequencias]);
                            setModalConfirm({ conteudo: '✅ Alterações salvas!', somenteOk: true, labelConfirm: 'OK' });
                        }} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold">💾 Salvar</button>
                        <button onClick={()=>exportarSequenciaPDF(seq)} className="bg-purple-500 text-white px-4 py-2 rounded-lg font-bold">📄 PDF</button>
                        <button onClick={()=>{ setModalConfirm({ titulo: 'Excluir sequência?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: ()=>{ excluirSequencia(seq.id); setSequenciaDetalhe(null); } }); }} className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold">🗑️</button>
                    </div>
                </div>

                {/* Lista Vertical de Slots */}
                <div className="space-y-4">
                    {(seq.slots || []).map((slot, index) => {
                        const planoVinc = slot.planoVinculado ? planos.find(p => p.id == slot.planoVinculado) : null;
                        const temConteudo = planoVinc || slot.rascunho?.titulo;

                        return (
                            <div
                                key={slot.id}
                                draggable
                                onDragStart={() => { dragSlotIdx.current = index }}
                                onDragOver={e => e.preventDefault()}
                                onDrop={() => {
                                    if (dragSlotIdx.current !== null && dragSlotIdx.current !== index) {
                                        reordenarSlots(seq.id, dragSlotIdx.current, index)
                                        dragSlotIdx.current = null
                                    }
                                }}
                                className={`border-2 rounded-xl p-5 cursor-grab active:cursor-grabbing ${temConteudo ? 'border-rose-300 bg-white' : 'border-gray-200 bg-gray-50'}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-300 text-lg select-none" title="Arraste para reordenar">⠿</span>
                                        <h3 className="text-lg font-bold text-rose-700">Aula {slot.ordem}</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        {planoVinc && (
                                            <button onClick={() => desvincularPlano(seq.id, index)} className="text-red-500 text-sm hover:text-red-700" title="Desvincular">✕ Desvincular</button>
                                        )}
                                    </div>
                                </div>

                                {planoVinc ? (
                                    /* Plano Vinculado */
                                    <div>
                                        {/* Título */}
                                        <h4 className="font-bold text-xl text-gray-800 mb-3">{planoVinc.titulo}</h4>

                                        {/* Objetivo (fundo igual, no topo) */}
                                        {planoVinc.objetivoGeral && (
                                            <div className="bg-rose-50 rounded-lg p-3 mb-3 border border-rose-200">
                                                <p className="text-sm font-bold text-rose-700 mb-1">🎯 Objetivo</p>
                                                <p className="text-sm text-gray-700 line-clamp-2">{planoVinc.objetivoGeral}</p>
                                            </div>
                                        )}

                                        {/* Setlist */}
                                        {planoVinc.atividadesRoteiro?.length > 0 && (
                                            <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                                                <p className="text-sm font-bold text-rose-700 mb-2">📋 Setlist</p>
                                                <ul className="text-sm text-gray-700 space-y-1">
                                                    {planoVinc.atividadesRoteiro.map(ativ => (
                                                        <li key={ativ.id} className="flex items-start gap-2">
                                                            <span>•</span>
                                                            <span>
                                                                {ativ.nome || 'Atividade'}
                                                                {ativ.duracao && <span className="text-xs text-gray-500"> ({ativ.duracao})</span>}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : slot.rascunho?.titulo ? (
                                    /* Rascunho Manual */
                                    <div className="space-y-2">
                                        <input type="text" value={slot.rascunho.titulo} onChange={(e) => atualizarRascunhoSlot(seq.id, index, 'titulo', e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg font-bold" placeholder="Título..." />
                                        <textarea value={slot.rascunho.setlist?.join('\n') || ''} onChange={(e) => atualizarRascunhoSlot(seq.id, index, 'setlist', e.target.value.split('\n'))} className="w-full px-3 py-2 border-2 rounded-lg text-sm" rows={4} placeholder="Setlist (uma por linha)..." />
                                    </div>
                                ) : (
                                    /* Slot Vazio */
                                    <div className="text-center py-6">
                                        <p className="text-gray-400 mb-4">Slot vazio</p>
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => setModalVincularPlano({sequenciaId: seq.id, slotIndex: index})} className="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-600">🔗 Vincular Plano</button>
                                            <button onClick={() => atualizarRascunhoSlot(seq.id, index, 'titulo', 'Nova Aula')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">✏️ Rascunho</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </>

            ) : (
        <>
            {/* Cabeçalho Dashboard */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">📚 Minhas Sequências</h2>
                    <button onClick={novaSequencia} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">➕ Nova Sequência</button>
                </div>

                {/* Busca Profunda */}
                {sequencias.length > 0 && (
                    <div className="mb-4">
                        <input 
                            type="text"
                            value={buscaProfundaSequencias}
                            onChange={e=>setBuscaProfundaSequencias(e.target.value)}
                            className="w-full px-4 py-3 border-2 rounded-xl"
                            placeholder="🔍 Buscar conteúdo nas aulas (título, atividades...)..."
                        />
                    </div>
                )}

                {/* Filtros Avançados (3 Dropdowns) */}
                {sequencias.length > 0 && (
                    <div className="bg-gray-100 p-4 rounded-xl">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">🏫 Escola</label>
                                <select value={filtroEscolaSequencias} onChange={e=>setFiltroEscolaSequencias(e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                    <option value="Todas">Todas as escolas</option>
                                    {escolasComSequencias.map(escola => (
                                        <option key={escola} value={escola}>{escola}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">🎵 Unidade</label>
                                <select value={filtroUnidadeSequencias} onChange={e=>setFiltroUnidadeSequencias(e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                    <option value="Todas">Todas as unidades</option>
                                    {unidadesComSequencias.map(unid => (
                                        <option key={unid} value={unid}>{unid}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">📅 Período Letivo</label>
                                <select value={filtroPeriodoSequencias} onChange={e=>setFiltroPeriodoSequencias(e.target.value)} className="w-full px-3 py-2 border-2 rounded-lg bg-white">
                                    <option value="Todos">Todos os períodos</option>
                                    <option value="1trim">1° Trimestre</option>
                                    <option value="2trim">2° Trimestre</option>
                                    <option value="3trim">3° Trimestre</option>
                                    <option value="4trim">4° Trimestre</option>
                                </select>
                            </div>
                        </div>
                        {/* Contagem + Limpar filtros */}
                        <div className="flex items-center justify-between mt-3">
                            <p className="text-sm text-gray-500">
                                {sequenciasFiltradas.length} sequência{sequenciasFiltradas.length !== 1 ? 's' : ''} encontrada{sequenciasFiltradas.length !== 1 ? 's' : ''}
                            </p>
                            {(filtroEscolaSequencias !== 'Todas' || filtroUnidadeSequencias !== 'Todas' || filtroPeriodoSequencias !== 'Todos' || buscaProfundaSequencias) && (
                                <button
                                    onClick={() => { setFiltroEscolaSequencias('Todas'); setFiltroUnidadeSequencias('Todas'); setFiltroPeriodoSequencias('Todos'); setBuscaProfundaSequencias(''); }}
                                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                                >
                                    ✕ Limpar filtros
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Grid de Cards */}
            {sequenciasFiltradas.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-gray-400 text-lg mb-4">Nenhuma sequência encontrada com os filtros selecionados</p>
                    <button onClick={novaSequencia} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold">➕ Criar Primeira Sequência</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sequenciasFiltradas.map(seq => {
                        const infoSeq = obterInfoSequencia(seq);
                        const totalSlots = seq.slots?.length || 0;
                        const slotsPreenchidos = seq.slots?.filter(s => s.planoVinculado || s.rascunho?.titulo).length || 0;
                        const progresso = totalSlots > 0 ? (slotsPreenchidos / totalSlots) * 100 : 0;

                        return (
                            <div key={seq.id} onClick={() => setSequenciaDetalhe(seq)} className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-rose-500 hover:shadow-2xl transition cursor-pointer active:scale-[0.98]">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-gray-800">{seq.titulo}</h3>
                                    {seq.unidadePredominante && (
                                        <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded text-xs font-bold">{seq.unidadePredominante}</span>
                                    )}
                                </div>
                                {infoSeq && (
                                    <p className="text-sm text-gray-600 mb-2">
                                        {infoSeq.escola} • {infoSeq.segmentos.join(', ')}
                                        {infoSeq.turmaEspecifica && <span className="text-rose-600"> • ({infoSeq.turmaEspecifica})</span>}
                                    </p>
                                )}
                                {(seq.dataInicio || seq.dataFim) && (
                                    <p className="text-xs text-gray-500 mb-3">
                                        📅 {seq.dataInicio && new Date(seq.dataInicio).toLocaleDateString('pt-BR')}
                                        {seq.dataInicio && seq.dataFim && ' — '}
                                        {seq.dataFim && new Date(seq.dataFim).toLocaleDateString('pt-BR')}
                                    </p>
                                )}

                                {/* Barra de Progresso */}
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>{slotsPreenchidos} de {totalSlots} aulas</span>
                                        <span>{Math.round(progresso)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-rose-500 h-2 rounded-full transition-all" style={{width: `${progresso}%`}}></div>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <button onClick={(e) => {e.stopPropagation(); setSequenciaEditando(seq);}} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200">✏️</button>
                                    <button onClick={(e) => {e.stopPropagation(); excluirSequencia(seq.id);}} className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded font-bold hover:bg-red-200">🗑️</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>

            )}

{/* ═══════════ MODAL EDITAR SEQUÊNCIA ═══════════ */}
{sequenciaEditando && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>setSequenciaEditando(null)}>
        <div className="bg-white rounded-2xl w-full max-w-2xl p-6" onClick={e=>e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-rose-700 mb-6">✏️ {sequenciaEditando.id && sequencias.find(s=>s.id===sequenciaEditando.id) ? 'Editar' : 'Nova'} Sequência</h2>

            <div className="space-y-4">
                <div>
                    <label className="block font-bold mb-2">Título da Sequência *</label>
                    <input 
                        type="text"
                        value={sequenciaEditando.titulo}
                        onChange={e=>setSequenciaEditando({...sequenciaEditando, titulo: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg"
                        placeholder="Ex: Projeto Folclore, Música Brasileira..."
                    />
                </div>

                {/* Ano Letivo */}
                <div>
                    <label className="block font-bold mb-2">Ano Letivo *</label>
                    <select 
                        value={sequenciaEditando.anoLetivoId}
                        onChange={e=>setSequenciaEditando({...sequenciaEditando, anoLetivoId: e.target.value, escolaId: '', segmentos: []})}
                        className="w-full px-4 py-2 border-2 rounded-lg"
                    >
                        <option value="">Selecione...</option>
                        {anosLetivos.map(ano => (
                            <option key={ano.id} value={ano.id}>{ano.nome}</option>
                        ))}
                    </select>
                </div>

                {/* Escola */}
                {sequenciaEditando.anoLetivoId && (
                    <div>
                        <label className="block font-bold mb-2">Escola *</label>
                        <select 
                            value={sequenciaEditando.escolaId}
                            onChange={e=>setSequenciaEditando({...sequenciaEditando, escolaId: e.target.value, segmentos: []})}
                            className="w-full px-4 py-2 border-2 rounded-lg"
                        >
                            <option value="">Selecione...</option>
                            {anosLetivos.find(a=>a.id==sequenciaEditando.anoLetivoId)?.escolas.map(escola => (
                                <option key={escola.id} value={escola.id}>{escola.nome}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Segmentos (Seleção Múltipla) */}
                {sequenciaEditando.escolaId && (() => {
                    const ano = anosLetivos.find(a=>a.id==sequenciaEditando.anoLetivoId);
                    const escola = ano?.escolas.find(e=>e.id==sequenciaEditando.escolaId);
                    const segmentos = escola?.segmentos || [];

                    const toggleSegmento = (segId) => {
                        const atual = sequenciaEditando.segmentos || [];
                        const novos = atual.includes(segId) 
                            ? atual.filter(s => s !== segId)
                            : [...atual, segId];
                        setSequenciaEditando({...sequenciaEditando, segmentos: novos});
                    };

                    return (
                        <div>
                            <label className="block font-bold mb-2">Segmentos * (selecione um ou mais)</label>
                            <div className="flex flex-wrap gap-2">
                                {segmentos.map(seg => (
                                    <button
                                        key={seg.id}
                                        type="button"
                                        onClick={() => toggleSegmento(seg.id)}
                                        className={`px-4 py-2 rounded-lg font-bold transition ${
                                            (sequenciaEditando.segmentos || []).includes(seg.id)
                                                ? 'bg-rose-500 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {seg.nome}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Turma Específica (Opcional) - Dropdown */}
                {sequenciaEditando.escolaId && sequenciaEditando.segmentos?.length > 0 && (() => {
                    const ano = anosLetivos.find(a=>a.id==sequenciaEditando.anoLetivoId);
                    const escola = ano?.escolas.find(e=>e.id==sequenciaEditando.escolaId);

                    // Pegar turmas dos segmentos selecionados
                    const turmasDisponiveis = [];
                    (sequenciaEditando.segmentos || []).forEach(segId => {
                        const seg = escola?.segmentos.find(s => s.id == segId);
                        if (seg?.turmas) {
                            seg.turmas.forEach(t => {
                                if (!turmasDisponiveis.find(td => td.id == t.id)) {
                                    turmasDisponiveis.push({...t, segmentoNome: seg.nome});
                                }
                            });
                        }
                    });

                    return (
                        <div>
                            <label className="block font-bold mb-2">Turma Específica (opcional)</label>
                            <select 
                                value={sequenciaEditando.turmaEspecifica || ''}
                                onChange={e=>setSequenciaEditando({...sequenciaEditando, turmaEspecifica: e.target.value})}
                                className="w-full px-4 py-2 border-2 rounded-lg"
                            >
                                <option value="">Todas as turmas dos segmentos</option>
                                {turmasDisponiveis.map(t => (
                                    <option key={t.id} value={t.nome}>{t.segmentoNome} - {t.nome}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Se não selecionar, vale para todas as turmas dos segmentos escolhidos</p>
                        </div>
                    );
                })()}

                {/* Unidade Pedagógica Predominante */}
                <div>
                    <label className="block font-bold mb-2">Unidade Pedagógica Predominante</label>
                    <select 
                        value={sequenciaEditando.unidadePredominante || ''}
                        onChange={e=>setSequenciaEditando({...sequenciaEditando, unidadePredominante: e.target.value})}
                        className="w-full px-4 py-2 border-2 rounded-lg"
                    >
                        <option value="">Selecione...</option>
                        {unidades.map(u => (
                            <option key={u} value={u}>{u}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block font-bold mb-2">Duração / Período</label>
                    <select 
                        value={sequenciaEditando.duracao}
                        onChange={e=>{
                            const d = e.target.value;
                            let num = 4;
                            if (d === 'bimestral') num = 8;
                            else if (d === 'semestral') num = 20;
                            setSequenciaEditando({...sequenciaEditando, duracao: d, numeroSlots: num});
                        }}
                        className="w-full px-4 py-2 border-2 rounded-lg"
                    >
                        <option value="mensal">Mensal (4 aulas)</option>
                        <option value="bimestral">Bimestral (8 aulas)</option>
                        <option value="semestral">Semestral (20 aulas)</option>
                        <option value="manual">Manual</option>
                    </select>
                </div>

                {sequenciaEditando.duracao === 'manual' && (
                    <div>
                        <label className="block font-bold mb-2">Número de Aulas</label>
                        <input 
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max="50"
                            value={sequenciaEditando.numeroSlots}
                            onChange={e=>setSequenciaEditando({...sequenciaEditando, numeroSlots: Number(e.target.value)})}
                            className="w-full px-4 py-2 border-2 rounded-lg"
                        />
                    </div>
                )}

                {/* Datas (para calendário) */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block font-bold mb-2">📅 Data Início</label>
                        <input 
                            type="date"
                            value={sequenciaEditando.dataInicio || ''}
                            onChange={e=>setSequenciaEditando({...sequenciaEditando, dataInicio: e.target.value})}
                            className="w-full px-4 py-2 border-2 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block font-bold mb-2">📅 Data Fim</label>
                        <input 
                            type="date"
                            value={sequenciaEditando.dataFim || ''}
                            onChange={e=>setSequenciaEditando({...sequenciaEditando, dataFim: e.target.value})}
                            className="w-full px-4 py-2 border-2 rounded-lg"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button onClick={()=>setSequenciaEditando(null)} className="flex-1 bg-gray-300 py-3 rounded-xl font-bold">Cancelar</button>
                    <button onClick={salvarSequencia} className="flex-1 bg-rose-500 text-white py-3 rounded-xl font-bold">Salvar</button>
                </div>
            </div>
        </div>
    </div>
)}


{/* ═══════════ MODAL VINCULAR PLANO ═══════════ */}
{modalVincularPlano && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={()=>{setModalVincularPlano(null);setBuscaPlanoVinculo('');}}>
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6" onClick={e=>e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-rose-700 mb-4">🔗 Vincular Plano Existente</h2>

            <input 
                type="text"
                value={buscaPlanoVinculo}
                onChange={e=>setBuscaPlanoVinculo(e.target.value)}
                className="w-full px-4 py-2 border-2 rounded-lg mb-4"
                placeholder="🔍 Buscar plano..."
            />

            <div className="space-y-2">
                {planos
                    .filter(p => !buscaPlanoVinculo || p.titulo.toLowerCase().includes(buscaPlanoVinculo.toLowerCase()))
                    .slice(0, 20)
                    .map(p => (
                        <div 
                            key={p.id}
                            onClick={() => vincularPlanoAoSlot(p.id)}
                            className="border-2 border-rose-200 rounded-lg p-3 hover:border-rose-400 hover:bg-rose-50 cursor-pointer transition active:scale-[0.98]"
                        >
                            <h4 className="font-bold text-gray-800">{p.titulo}</h4>
                            <p className="text-sm text-gray-600">{p.escola} • {p.faixaEtaria?.join(', ')}</p>
                            {p.atividadesRoteiro?.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    📋 {p.atividadesRoteiro.length} atividade(s)
                                </p>
                            )}
                        </div>
                    ))
                }
                {planos.filter(p => !buscaPlanoVinculo || p.titulo.toLowerCase().includes(buscaPlanoVinculo.toLowerCase())).length === 0 && (
                    <p className="text-center text-gray-400 py-8">Nenhum plano encontrado</p>
                )}
            </div>
        </div>
    </div>
)}

        </>
    )
}
