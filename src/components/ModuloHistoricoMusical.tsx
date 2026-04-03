import React, { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { sanitizar, gerarIdSeguro } from '../lib/utils'
import { useHistoricoContext, useAnoLetivoContext, useAtividadesContext, usePlanosContext, useRepertorioContext } from '../contexts'

interface ModuloHistoricoMusicalProps {
    ocultarSeletorTurma?: boolean
    turmaForcada?: string
}

export default function ModuloHistoricoMusical({ ocultarSeletorTurma, turmaForcada }: ModuloHistoricoMusicalProps = {}) {
    const { hmFiltroBusca, setHmFiltroBusca, hmFiltroFim, setHmFiltroFim, hmFiltroInicio, setHmFiltroInicio, hmFiltroTurma, setHmFiltroTurma, hmModalMusica, setHmModalMusica } = useHistoricoContext()
    const { anosLetivos, faixas } = useAnoLetivoContext()
    const { atividades } = useAtividadesContext()
    const { planos, escolas, setModalConfiguracoes, setPlanoSelecionado } = usePlanosContext()
    const { repertorio, setViewMode } = useRepertorioContext()

    // ── Estados locais via useState (fora do IIFE via refs de closure) ──
    // Usamos estados já existentes no componente pai para filtros
    // Precisamos de estados próprios: declarados no início do componente (veja abaixo no JSX)

    // Pre-set turma filter when embedded inside a turma view
    useEffect(() => {
        if (turmaForcada) setHmFiltroTurma(turmaForcada)
    }, [turmaForcada]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── COLETA DE DADOS ──
    // Percorre todos os planos e coleta usos de músicas por data + turma
    // Um "uso" = música vinculada em atividade do plano + uma historicaData desse plano

    // ── POPULAR TURMAS DIRETO DA ESTRUTURA anosLetivos ──
    // Inclui escolas sem turmas cadastradas (exibidas com aviso)
    const todasTurmasHistorico = [];
    anosLetivos.forEach(ano => {
        (ano.escolas || []).forEach(esc => {
            const totalTurmas = (esc.segmentos || []).reduce((acc, s) => acc + (s.turmas || []).length, 0);
            if (totalTurmas === 0) {
                // Escola sem turmas: adicionar entrada própria
                const id = 'escola-' + String(esc.id);
                if (!todasTurmasHistorico.find(t => t.id === id)) {
                    todasTurmasHistorico.push({ id, label: ano.ano + ' › ' + esc.nome + ' (sem turmas)', escolaId: esc.id, escolaNome: esc.nome, segmentoNome: '', semTurmas: true, anoLetivoId: ano.id });
                }
            } else {
                (esc.segmentos || []).forEach(seg => {
                    (seg.turmas || []).forEach(tur => {
                        const id = String(tur.id) + '-' + String(esc.id);
                        if (!todasTurmasHistorico.find(t => t.id === id)) {
                            const label = [ano.ano, esc.nome, seg.nome, tur.nome].filter(Boolean).join(' › ');
                            todasTurmasHistorico.push({ id, label, turmaId: tur.id, escolaId: esc.id, escolaNome: esc.nome, segmentoId: seg.id, segmentoNome: seg.nome, anoLetivoId: ano.id });
                        }
                    });
                });
            }
        });
    });

    const hmTurmaFiltro = hmFiltroTurma;
    const hmInicio = hmFiltroInicio;
    const hmFim = hmFiltroFim;
    const hmBusca = hmFiltroBusca;

    // ── HELPER: resolve turmaChave → info da turma ──
    const infoTurmaFiltrada = hmTurmaFiltro
        ? todasTurmasHistorico.find(t => t.id === hmTurmaFiltro)
        : null;

    // ── HELPER: verifica se um plano pertence à turma filtrada ──
    // Estratégia 1: tem registro pós-aula com turmaId+escolaId (mais confiável)
    // Estratégia 2: escola do plano bate com escola da turma (quando escola preenchida)
    //   + segmento da turma bate com faixaEtaria do plano
    // Estratégia 3: escola vazia mas faixaEtaria bate → inclui (plano genérico)
    const chaveDoRegistro = (r) => String(r.turma) + '-' + String(r.escola);
    const normalizar = (s) => (s || '').trim().toLowerCase();

    const planoBelongsTurma = (p) => {
        if (!hmTurmaFiltro || !infoTurmaFiltrada) return true;

        // Estratégia 1: via registros pós-aula
        if ((p.registrosPosAula || []).some(r => chaveDoRegistro(r) === hmTurmaFiltro)) return true;

        const tEsc = normalizar(infoTurmaFiltrada.escolaNome);
        const tSeg = normalizar(infoTurmaFiltrada.segmentoNome);
        const pEsc = normalizar(p.escola);
        const faixas = (p.faixaEtaria || []).map(f => normalizar(f));

        // Escola sem turmas: filtra só pela escola
        if (infoTurmaFiltrada.semTurmas) {
            return pEsc && (pEsc === tEsc || pEsc.includes(tEsc) || tEsc.includes(pEsc));
        }

        // Checar se segmento da turma bate com alguma faixaEtaria do plano
        const segmentoOk = !tSeg || faixas.length === 0 ||
            faixas.some(f => f === tSeg || f.includes(tSeg) || tSeg.includes(f));

        // Estratégia 2: escola preenchida e bate + segmento bate
        if (pEsc) {
            const escolaOk = pEsc === tEsc || pEsc.includes(tEsc) || tEsc.includes(pEsc);
            if (escolaOk && segmentoOk) return true;
        }

        return false;
    };

    // ── COMPUTAR MÉTRICAS ──
    const usosMusica: Record<string, { id?: any; titulo: string; autor?: string; datas: Set<string>; aulas: any[]; [key: string]: any }> = {};
    const aulasDaTurma = new Set();

    planos.forEach(p => {
        // Verificar se plano pertence à turma filtrada
        if (!planoBelongsTurma(p)) return;

        // Registros pós-aula desta turma/período
        const regsDoPlano = (p.registrosPosAula || []).filter(r => {
            if (hmTurmaFiltro && chaveDoRegistro(r) !== hmTurmaFiltro) return false;
            if (hmInicio && r.data < hmInicio) return false;
            if (hmFim && r.data > hmFim) return false;
            return true;
        });
        regsDoPlano.forEach(r => { if (r.data) aulasDaTurma.add(r.data); });

        // historicoDatas filtradas por período
        const histFiltrado = (p.historicoDatas || []).filter(d => {
            if (hmInicio && d < hmInicio) return false;
            if (hmFim && d > hmFim) return false;
            return true;
        });
        histFiltrado.forEach(d => aulasDaTurma.add(d));

        // ── Coleta músicas do plano via atividadesRoteiro ──
        const musicasDoPlano = [];
        (p.atividadesRoteiro || []).forEach(atv => {
            (atv.musicasVinculadas || []).forEach(mv => {
                if (mv && mv.id && !musicasDoPlano.find(m => String(m.id) === String(mv.id))) {
                    musicasDoPlano.push(mv);
                }
            });
        });

        if (musicasDoPlano.length === 0) return;

        // ── Determinar datas de uso ──
        let datasDeUso = [];
        if (regsDoPlano.length > 0) {
            datasDeUso = [...new Set(regsDoPlano.map(r => r.data).filter(Boolean))];
        } else if (histFiltrado.length > 0) {
            datasDeUso = histFiltrado;
        } else {
            // Plano vinculado mas sem datas: mostrar mesmo assim
            datasDeUso = [''];
        }

        musicasDoPlano.forEach(mv => {
            const chaveMusica = String(mv.id);
            if (!usosMusica[chaveMusica]) {
                const rep = repertorio.find(r => String(r.id) === chaveMusica);
                usosMusica[chaveMusica] = {
                    id: mv.id,
                    titulo: mv.titulo || rep?.titulo || '(sem título)',
                    autor: mv.autor || rep?.autor || '',
                    datas: new Set(),
                    aulas: []
                };
            }
            datasDeUso.forEach(d => {
                if (d) usosMusica[chaveMusica].datas.add(d);
                const jaExiste = usosMusica[chaveMusica].aulas.find(a => a.data === d && a.planoId === p.id);
                if (!jaExiste) {
                    usosMusica[chaveMusica].aulas.push({
                        data: d,
                        planoTitulo: p.titulo || 'Sem título',
                        planoId: p.id
                    });
                }
            });
        });
    });

    // Converter para array e calcular stats
    let musicasArray = Object.values(usosMusica).map(m => {
        const datasOrdenadas = Array.from(m.datas).filter(Boolean).sort();
        return {
            ...m,
            datas: datasOrdenadas,
            vezesUsada: datasOrdenadas.length || m.aulas.length, // fallback para planos sem data
            primeiraData: datasOrdenadas[0] || '',
            ultimaData: datasOrdenadas[datasOrdenadas.length - 1] || ''
        };
    });

    // Filtro de busca
    if (hmBusca.trim()) {
        const t = hmBusca.toLowerCase();
        musicasArray = musicasArray.filter(m => m.titulo.toLowerCase().includes(t) || (m.autor || '').toLowerCase().includes(t));
    }

    // Ordenar por vezes usada (desc) por padrão
    musicasArray.sort((a, b) => b.vezesUsada - a.vezesUsada);

    // Métricas
    const totalAulasRealizadas = aulasDaTurma.size;
    const totalMusicasUnicas = musicasArray.length;
    const totalUsos = musicasArray.reduce((acc, m) => acc + m.vezesUsada, 0);
    const mediaPorAula = totalAulasRealizadas > 0 ? (totalUsos / totalAulasRealizadas).toFixed(1) : '—';

    const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—';

    return (
        <div className="space-y-5">
            {/* Cabeçalho */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">📊 Histórico Musical da Turma</h1>
                <p className="text-sm text-slate-400 mt-0.5">Repertório trabalhado e frequência de uso</p>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Turma */}
                    {!ocultarSeletorTurma && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Turma</label>
                        <select value={hmFiltroTurma} onChange={e => setHmFiltroTurma(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                            <option value="">— Todas as turmas —</option>
                            {todasTurmasHistorico.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    )}
                    {/* Período início */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">De</label>
                        <input type="date" value={hmFiltroInicio} onChange={e => setHmFiltroInicio(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"/>
                    </div>
                    {/* Período fim */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Até</label>
                        <input type="date" value={hmFiltroFim} onChange={e => setHmFiltroFim(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"/>
                    </div>
                    {/* Busca por música */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Buscar música</label>
                        <input type="text" inputMode="search" placeholder="🔍 Título ou autor..." value={hmFiltroBusca} onChange={e => setHmFiltroBusca(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"/>
                    </div>
                </div>
                {infoTurmaFiltrada?.semTurmas && (
                    <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                        <span className="shrink-0">💡</span>
                        <span>Filtrando só pela escola. Para precisão por turma, <button onClick={()=>setModalConfiguracoes(true)} className="font-bold underline hover:text-blue-900">cadastre as turmas em Configurações</button>.</span>
                    </div>
                )}
                {(hmFiltroTurma || hmFiltroInicio || hmFiltroFim || hmFiltroBusca) && (
                    <div className="mt-3 flex justify-end">
                        <button onClick={() => { setHmFiltroTurma(''); setHmFiltroInicio(''); setHmFiltroFim(''); setHmFiltroBusca(''); }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">✕ Limpar filtros</button>
                    </div>
                )}
            </div>

            {/* Aviso: músicas em planos sem escola */}
            {(() => {
                const semEscola = musicasArray.filter(m =>
                    m.aulas.some(a => {
                        const p = planos.find(pl => pl.id === a.planoId);
                        return p && (!p.escola || !p.escola.trim());
                    })
                );
                if (semEscola.length === 0) return null;
                return (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        <span className="text-lg shrink-0">⚠️</span>
                        <span>
                            <strong>{semEscola.length} música(s)</strong> encontrada(s) em planos sem escola atribuída — o dado pode estar incompleto ao filtrar por turma.
                        </span>
                    </div>
                );
            })()}

            {/* Cards de métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Aulas Realizadas</p>
                    <p className="text-3xl font-bold text-indigo-600">{totalAulasRealizadas}</p>
                    <p className="text-xs text-slate-400 mt-2">no período selecionado</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Músicas Únicas</p>
                    <p className="text-3xl font-bold text-emerald-600">{totalMusicasUnicas}</p>
                    <p className="text-xs text-slate-400 mt-2">diferentes trabalhadas</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Total de Usos</p>
                    <p className="text-3xl font-bold text-amber-600">{totalUsos}</p>
                    <p className="text-xs text-slate-400 mt-2">contando repetições</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Média por Aula</p>
                    <p className="text-3xl font-bold text-purple-600">{mediaPorAula}</p>
                    <p className="text-xs text-slate-400 mt-2">músicas por aula</p>
                </div>
            </div>

            {/* Tabela principal */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-800">🎵 Músicas Trabalhadas</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{musicasArray.length} música(s) — ordenado por frequência de uso</p>
                    </div>
                    {musicasArray.length > 0 && (
                        <button onClick={() => {
                            const linhas = [['Música','Autor','Vezes usada','Primeira vez','Última vez'].join(',')];
                            musicasArray.forEach(m => {
                                linhas.push([
                                    `"${m.titulo}"`,
                                    `"${m.autor || ''}"`,
                                    m.vezesUsada,
                                    m.primeiraData ? new Date(m.primeiraData+'T12:00:00').toLocaleDateString('pt-BR') : '',
                                    m.ultimaData ? new Date(m.ultimaData+'T12:00:00').toLocaleDateString('pt-BR') : ''
                                ].join(','));
                            });
                            const blob = new Blob(['\ufeff' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a'); a.href = url; a.download = 'historico-musical.csv'; a.click();
                            URL.revokeObjectURL(url);
                        }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-3 py-2 rounded-lg border border-indigo-200 transition">
                            ⬇ Exportar CSV
                        </button>
                    )}
                </div>

                {musicasArray.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <p className="text-5xl mb-4">🎼</p>
                        <p className="font-bold text-slate-600 text-lg mb-2">Nenhuma música encontrada</p>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">
                            {hmFiltroTurma || hmFiltroInicio || hmFiltroFim
                                ? 'Tente ajustar os filtros de turma e período.'
                                : 'Vincule músicas às atividades nos seus planos de aula e registre as aulas para que elas apareçam aqui.'}
                        </p>
                        {!hmFiltroTurma && !hmFiltroInicio && !hmFiltroFim && (
                            <button onClick={() => setViewMode('lista')} className="mt-4 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold text-sm px-5 py-2.5 rounded-xl transition">
                                Ir para Planos de Aula
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Vista mobile: cards */}
                        <div className="sm:hidden divide-y divide-slate-100">
                            {musicasArray.map((m, idx) => (
                                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                                    {idx < 3 && <span className="text-lg shrink-0">{['🥇','🥈','🥉'][idx]}</span>}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 truncate">{m.titulo}</p>
                                        {m.autor && <p className="text-xs text-slate-400 truncate">{m.autor}</p>}
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${m.vezesUsada >= 3 ? 'bg-emerald-100 text-emerald-700' : m.vezesUsada === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{m.vezesUsada}×</span>
                                            {m.primeiraData && <span className="text-xs text-slate-400">{fmtData(m.primeiraData)} – {fmtData(m.ultimaData)}</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => setHmModalMusica(m)} className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-semibold">ver</button>
                                </div>
                            ))}
                        </div>
                        {/* Vista desktop: tabela */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Música</th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Usos</th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">1ª vez</th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Última vez</th>
                                        <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Aulas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {musicasArray.map((m, idx) => (
                                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {idx < 3 && (
                                                        <span className="text-base shrink-0">{['🥇','🥈','🥉'][idx]}</span>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{m.titulo}</p>
                                                        {m.autor && <p className="text-xs text-slate-400">{m.autor}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${m.vezesUsada >= 3 ? 'bg-emerald-100 text-emerald-700' : m.vezesUsada === 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {m.vezesUsada}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-slate-500">{fmtData(m.primeiraData)}</td>
                                            <td className="px-4 py-3 text-center text-xs text-slate-500">{fmtData(m.ultimaData)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button onClick={() => setHmModalMusica(m)}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline">
                                                    ver detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Seções secundárias */}
            {musicasArray.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top 5 mais usadas */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <h3 className="font-bold text-slate-700 mb-3">🏆 Top 5 mais usadas</h3>
                        <div className="space-y-2">
                            {musicasArray.slice(0, 5).map((m, i) => (
                                <div key={m.id} className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-400 w-5 text-right">{i+1}.</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{m.titulo}</p>
                                    </div>
                                    <div className="shrink-0">
                                        <div className="flex items-center gap-1">
                                            <div className="h-2 bg-indigo-400 rounded-full" style={{ width: `${Math.max(20, (m.vezesUsada / musicasArray[0].vezesUsada) * 80)}px` }}/>
                                            <span className="text-xs font-bold text-indigo-600 w-6 text-right">{m.vezesUsada}×</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Usadas apenas 1 vez */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <h3 className="font-bold text-slate-700 mb-3">🌱 Introduzidas (usadas 1×)</h3>
                        {musicasArray.filter(m => m.vezesUsada === 1).length === 0 ? (
                            <p className="text-sm text-slate-400">Todas as músicas foram usadas mais de uma vez!</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {musicasArray.filter(m => m.vezesUsada === 1).map(m => (
                                    <span key={m.id} className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:bg-amber-100 transition"
                                        onClick={() => setHmModalMusica(m)}>
                                        {m.titulo}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal detalhe de música */}
            {hmModalMusica && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setHmModalMusica(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="bg-blue-950 text-white p-5 rounded-t-2xl flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold">{hmModalMusica.titulo}</h2>
                                {hmModalMusica.autor && <p className="text-blue-300 text-sm mt-0.5">{hmModalMusica.autor}</p>}
                                <p className="text-blue-200 text-sm mt-2">Usada <strong>{hmModalMusica.vezesUsada}</strong> vez(es) no período</p>
                            </div>
                            <button onClick={() => setHmModalMusica(null)} className="text-white/70 hover:text-white text-2xl font-bold ml-4">×</button>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex gap-4 text-sm">
                                <div className="bg-slate-50 rounded-lg px-3 py-2 flex-1 text-center">
                                    <p className="text-xs text-slate-400 font-semibold uppercase">1ª vez</p>
                                    <p className="font-bold text-slate-700">{hmModalMusica.primeiraData ? fmtData(hmModalMusica.primeiraData) : '—'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg px-3 py-2 flex-1 text-center">
                                    <p className="text-xs text-slate-400 font-semibold uppercase">Última vez</p>
                                    <p className="font-bold text-slate-700">{hmModalMusica.ultimaData ? fmtData(hmModalMusica.ultimaData) : '—'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Aulas em que foi usada:</p>
                                <div className="space-y-2">
                                    {[...hmModalMusica.aulas].sort((a,b) => (a.data||'').localeCompare(b.data||'')).map((aula, i) => {
                                        const planoRef = planos.find(p => p.id === aula.planoId);
                                        return (
                                            <button key={i}
                                                onClick={() => { if (planoRef) { setHmModalMusica(null); setPlanoSelecionado(planoRef); } }}
                                                className={`w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-left transition ${planoRef ? 'hover:bg-blue-50 hover:border-blue-200 cursor-pointer group' : 'cursor-default'}`}>
                                                <span className="text-xs font-bold text-blue-800 shrink-0">
                                                    {aula.data ? `📅 ${fmtData(aula.data)}` : '📋 sem data registrada'}
                                                </span>
                                                <span className="text-sm text-slate-600 truncate flex-1">{aula.planoTitulo}</span>
                                                {planoRef && <span className="text-xs text-blue-400 group-hover:text-blue-600 shrink-0 font-semibold">→ abrir</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
