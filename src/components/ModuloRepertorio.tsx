import { dbSet } from '../lib/db'
import React from 'react'
import { useBancoPlanos } from './BancoPlanosContext'
import { useRepertorioContext } from '../contexts'

// ── OPÇÕES DE ELEMENTOS MUSICAIS ──
const ESTILOS_OPCOES = ['Canção Infantil', 'Cantiga de Roda', 'Folclórica Brasileira', 'MPB', 'Samba', 'Bossa Nova', 'Forró', 'Pop', 'Rock', 'Música Erudita', 'Coral', 'Instrumental', 'Percussão Corporal', 'Jogo Musical', 'Música Temática', 'Música Clássica']
const COMPASSOS_OPCOES = ['2/4', '3/4', '4/4', '6/8']
const TONALIDADES_OPCOES = ['Maior', 'Menor', 'Pentatônica', 'Modal']
const ANDAMENTOS_OPCOES = ['Lento', 'Moderado', 'Rápido']
const ESCALAS_OPCOES = ['Maior', 'Menor', 'Pentatônica', 'Blues']
const ESTRUTURAS_OPCOES = ['A', 'AB', 'ABA', 'Rondó', 'Ostinato']
const DINAMICAS_OPCOES = ['Pianíssimo', 'Piano', 'Meio-Piano', 'Meio-Forte', 'Forte', 'Fortíssimo', 'Crescendo', 'Decrescendo', 'Legato', 'Staccato']
const ENERGIAS_OPCOES = ['Calma', 'Relaxante', 'Animada', 'Dançante', 'Alegre', 'Triste', 'Meditativa', 'Enérgica', 'Misteriosa', 'Brincalhona', 'Épica', 'Romântica']
const INSTRUMENTACAO_OPCOES = ['🥁 Percussão','🎹 Piano/Teclado','🎸 Violão/Guitarra','🎻 Violino','🎺 Trompete','🎷 Saxofone','🪗 Acordeão','🪘 Zabumba','🎙️ Voz Solo','🎤 Coro/Coral','🪈 Flauta','🎵 Orff (xilofone/metalofone)','🎚️ A Cappella','🎶 Orquestra','🤸 Percussão Corporal','🔇 Sem acompanhamento']

// ── HELPER: chips de seleção múltipla ──
    const chips = (lista, selecionados, onToggle) => (
        <div className="flex flex-wrap gap-2">
            {lista.map(item => {
                const sel = (selecionados||[]).includes(item);
                return <button key={item} type="button" onClick={() => onToggle(item)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${sel ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>{item}</button>;
            })}
        </div>
    );

// ── HELPER: linha de label com ações ──
    const labelRow = (texto, onAdd, onDel) => (
        <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{texto}</label>
            <div className="flex gap-3">
                {onAdd && <button type="button" onClick={onAdd} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition">+ personalizar</button>}
                {onDel && <button type="button" onClick={onDel} className="text-xs text-slate-400 hover:text-red-500 font-semibold transition">🗑️ excluir</button>}
            </div>
        </div>
    );

// ── SUBCOMPONENTE: painel accordion ──
    function Acc({ id, titulo, subtitulo, badge }) {
    const { accordionAberto, setAccordionAberto } = useRepertorioContext()
        const aberto = accordionAberto === id;
        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button type="button"
                    onClick={() => setAccordionAberto(aberto ? null : id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                    <div>
                        <span className="text-sm font-semibold text-slate-700">{titulo}</span>
                        {subtitulo && <span className="text-xs text-slate-400 ml-2">{subtitulo}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {badge > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badge}</span>}
                        <span className={`text-slate-300 text-xs transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>▼</span>
                    </div>
                </button>
                {aberto && <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5" id={`acc-${id}`}></div>}
            </div>
        );
    }

export default function ModuloRepertorio() {
    // ── Contexto de Repertório (Parte 3) ──────────────────────────────────────
    const {
        accordionAberto, setAccordionAberto,
        andamentosCustomizados, setAndamentosCustomizados,
        buscaEstilo, setBuscaEstilo,
        buscaRepertorio, setBuscaRepertorio,
        compassosCustomizados, setCompassosCustomizados,
        dinamicasCustomizadas, setDinamicasCustomizadas,
        editandoElemento, setEditandoElemento,
        energiasCustomizadas, setEnergiasCustomizadas,
        escalasCustomizadas, setEscalasCustomizadas,
        estruturasCustomizadas, setEstruturasCustomizadas,
        filtroAndamento, setFiltroAndamento,
        filtroCompasso, setFiltroCompasso,
        filtroDinamica, setFiltroDinamica,
        filtroEnergia, setFiltroEnergia,
        filtroEscala, setFiltroEscala,
        filtroEstilo, setFiltroEstilo,
        filtroEstrutura, setFiltroEstrutura,
        filtroInstrumentacao, setFiltroInstrumentacao,
        filtroOrigem, setFiltroOrigem,
        filtroTonalidade, setFiltroTonalidade,
        instrumentacaoCustomizada, setInstrumentacaoCustomizada,
        musicaEditando, setMusicaEditando,
        repertorio, setRepertorio,
        tonalidadesCustomizadas, setTonalidadesCustomizadas,
        setViewMode,
    } = useRepertorioContext()

    // ── Contexto global (campos ainda não migrados) ───────────────────────────
    const {
        atividades,
        pendingAtividadeId, setPendingAtividadeId,
        planoEditando, setPlanoEditando,
        planos,
        setModalConfirm,
        setPlanoSelecionado,
        ytIdFromUrl,
        ytPreviewId, setYtPreviewId,
    } = useBancoPlanos()

    // Filtrar músicas
    const musicasFiltradas = repertorio.filter(m => {
        const buscaMatch = !buscaRepertorio || 
            m.titulo.toLowerCase().includes(buscaRepertorio.toLowerCase()) ||
            (m.autor||'').toLowerCase().includes(buscaRepertorio.toLowerCase());
        const origemMatch = filtroOrigem === 'Todas' || m.origem === filtroOrigem;
        const estiloMatch = filtroEstilo === 'Todos' || (m.estilos||[]).includes(filtroEstilo);
        const tonalidadeMatch = filtroTonalidade === 'Todas' || (m.tonalidades||[]).includes(filtroTonalidade);
        const escalaMatch = filtroEscala === 'Todas' || (m.escalas||[]).includes(filtroEscala);
        const compassoMatch = filtroCompasso === 'Todos' || (m.compassos||[]).includes(filtroCompasso);
        const andamentoMatch = filtroAndamento === 'Todos' || (m.andamentos||[]).includes(filtroAndamento);
        const estruturaMatch = filtroEstrutura === 'Todas' || (m.estruturas||[]).includes(filtroEstrutura);
        const energiaMatch = filtroEnergia === 'Todas' || (m.energias||[]).includes(filtroEnergia);
        const instrumentacaoMatch = filtroInstrumentacao === 'Todas' || (m.instrumentacao||[]).includes(filtroInstrumentacao) || m.instrumentoDestaque === filtroInstrumentacao;
        const dinamicaMatch = filtroDinamica === 'Todas' || (m.dinamicas||[]).includes(filtroDinamica);
        return buscaMatch && origemMatch && estiloMatch && tonalidadeMatch && escalaMatch && compassoMatch && andamentoMatch && estruturaMatch && energiaMatch && instrumentacaoMatch && dinamicaMatch;
    });

    return (
    <div className="max-w-5xl mx-auto space-y-4">
        {!musicaEditando ? (
            <>
                {/* Cabeçalho */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">🎼 Repertório Inteligente</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Gerencie seu catálogo de músicas e obras</p>
                    </div>
                    <button
                        onClick={() => setMusicaEditando({
                            id: Date.now(),
                            titulo: '',
                            autor: '',
                            origem: '',
                            estilos: [],
                            compassos: [],
                            tonalidades: [],
                            andamentos: [],
                            escalas: [],
                            estruturas: [],
                            dinamicas: [],
                            instrumentacao: [],
                            instrumentoDestaque: '',
                            energias: [],
                            observacoes: '',
                            links: [],
                            pdfs: [],
                            audios: [],
                            planosVinculados: [],
                            atividadesVinculadas: []
                        })}
                        className="shrink-0 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
                    >
                        ➕ Adicionar Música
                    </button>
                </div>

                {/* Painel de Filtros */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filtros</p>
                        <button
                            onClick={() => {
                                setBuscaRepertorio('');
                                setFiltroOrigem('Todas');
                                setFiltroEstilo('Todos');
                                setFiltroTonalidade('Todas');
                                setFiltroEscala('Todas');
                                setFiltroCompasso('Todos');
                                setFiltroAndamento('Todos');
                                setFiltroEstrutura('Todas');
                                setFiltroEnergia('Todas');
                                setFiltroInstrumentacao('Todas');
                                setFiltroDinamica('Todas');
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >✕ Limpar filtros</button>
                    </div>

                    {/* Linha 1: Busca + Origem + Escala */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
                        <input type="text" placeholder="🔍 Buscar por título ou autor..." value={buscaRepertorio} onChange={e=>setBuscaRepertorio(e.target.value)}
                            className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Origem</label>
                            <select value={filtroOrigem} onChange={e=>setFiltroOrigem(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todas</option>
                                <option>Folclórica</option>
                                <option>Autoral</option>
                                <option>Tradicional</option>
                                <option>Popular</option>
                                <option>Erudita</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Escala</label>
                            <select value={filtroEscala} onChange={e=>setFiltroEscala(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todas</option>
                                <option>Maior</option>
                                <option>Menor</option>
                                <option>Pentatônica</option>
                                <option>Cromática</option>
                                <option>Modal</option>
                            </select>
                        </div>
                    </div>

                    {/* Linha 2: Estilo + Tonalidade + Compasso + Andamento + Estrutura */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Estilo</label>
                            <select value={filtroEstilo} onChange={e=>setFiltroEstilo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todos</option>
                                {ESTILOS_OPCOES.map(e => <option key={e}>{e}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tonalidade</label>
                            <select value={filtroTonalidade} onChange={e=>setFiltroTonalidade(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todas</option>
                                {TONALIDADES_OPCOES.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Compasso</label>
                            <select value={filtroCompasso} onChange={e=>setFiltroCompasso(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todos</option>
                                {COMPASSOS_OPCOES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Andamento</label>
                            <select value={filtroAndamento} onChange={e=>setFiltroAndamento(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todos</option>
                                {ANDAMENTOS_OPCOES.map(a => <option key={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Estrutura</label>
                            <select value={filtroEstrutura} onChange={e=>setFiltroEstrutura(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todas</option>
                                {ESTRUTURAS_OPCOES.map(e => <option key={e}>{e}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Linha 3: Energia + Instrumentação + Dinâmica (NOVOS) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">⚡ Energia</label>
                            <select value={filtroEnergia} onChange={e=>setFiltroEnergia(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todas</option>
                                {ENERGIAS_OPCOES.map(e => <option key={e}>{e}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">🎻 Instrumentação</label>
                            <select value={filtroInstrumentacao} onChange={e=>setFiltroInstrumentacao(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todas</option>
                                {INSTRUMENTACAO_OPCOES.map(i => <option key={i}>{i}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">🔊 Dinâmica</label>
                            <select value={filtroDinamica} onChange={e=>setFiltroDinamica(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option>Todas</option>
                                {DINAMICAS_OPCOES.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Lista de músicas */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">{musicasFiltradas.length} música(s) encontrada(s)</p>
                    {musicasFiltradas.map(m => (
                        <React.Fragment key={m.id}>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 flex-wrap min-w-0">
                                <div className="min-w-[180px]">
                                    <h3 className="font-bold text-slate-800 text-sm">{m.titulo}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{m.autor || '—'}</p>
                                </div>

                                {/* Energias */}
                                {(m.energias||[]).length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {(m.energias||[]).map(e=>(
                                            <span key={e} className="bg-pink-100 text-pink-700 border border-pink-200 text-xs px-2 py-0.5 rounded-full font-medium">⚡{e}</span>
                                        ))}
                                    </div>
                                )}
                                {/* Dinâmicas */}
                                {(m.dinamicas||[]).length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {(m.dinamicas||[]).map(d=>(
                                            <span key={d} className="bg-amber-100 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-medium">🔊{d}</span>
                                        ))}
                                    </div>
                                )}
                                {/* Instrumentação destaque */}
                                {m.instrumentoDestaque && (
                                    <span className="bg-violet-100 text-violet-700 border border-violet-200 text-xs px-2 py-0.5 rounded-full font-medium">🎻{m.instrumentoDestaque}</span>
                                )}

                                <div className="flex items-center gap-3 text-xs">
                                    {/* Contador Aulas */}
                                    <div className="relative group">
                                        <p className="text-blue-500 cursor-pointer hover:text-blue-700">
                                            🔗 {(m.planosVinculados||[]).length} aula(s)
                                        </p>

                                        {(m.planosVinculados||[]).length > 0 && (
                                            <div className="absolute hidden group-hover:block bg-white border-2 border-blue-200 rounded-lg shadow-lg p-3 z-10 min-w-[250px] left-0 top-6">
                                                <p className="text-xs font-bold text-gray-700 mb-2">Aulas vinculadas:</p>
                                                <div className="space-y-1">
                                                    {(m.planosVinculados||[]).map(planoId => {
                                                        const plano = planos.find(p => p.id === planoId);
                                                        if(!plano) return null;
                                                        return (
                                                            <button 
                                                                key={planoId}
                                                                onClick={() => {
                                                                    setPlanoSelecionado(plano);
                                                                    setMusicaEditando(null);
                                                                }}
                                                                className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 text-xs text-blue-600 hover:text-blue-800"
                                                            >
                                                                📋 {plano.titulo || 'Sem título'} - {plano.turma || ''}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contador Atividades */}
                                    <div className="relative group">
                                        <p className="text-green-500 cursor-pointer hover:text-green-700">
                                            🎯 {(m.atividadesVinculadas||[]).length} atividade(s)
                                        </p>

                                        {(m.atividadesVinculadas||[]).length > 0 && (
                                            <div className="absolute hidden group-hover:block bg-white border-2 border-green-200 rounded-lg shadow-lg p-3 z-10 min-w-[250px] left-0 top-6">
                                                <p className="text-xs font-bold text-gray-700 mb-2">Atividades vinculadas:</p>
                                                <div className="space-y-1">
                                                    {(m.atividadesVinculadas||[]).map((ativ, idx) => (
                                                        <div key={idx} className="px-2 py-1 bg-green-50 rounded text-xs text-green-700">
                                                            🎁 {ativ.nome}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* #9: Botão play YouTube */}
                            {(() => {
                                const ytLink = (m.links||[]).find(l => ytIdFromUrl(l));
                                const ytId = ytLink ? ytIdFromUrl(ytLink) : null;
                                if (!ytId) return null;
                                return (
                                    <button onClick={(e)=>{e.stopPropagation(); setYtPreviewId(ytPreviewId===m.id ? null : m.id);}}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition mr-1 ${ytPreviewId===m.id ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                                        title="Prévia YouTube">
                                        {ytPreviewId===m.id ? '■ Fechar' : '▶ Play'}
                                    </button>
                                );
                            })()}
                            <button onClick={() => setMusicaEditando(m)} className="text-xs bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition mr-1">✏️ Editar</button>
                            <button onClick={() => { setModalConfirm({ titulo: `Excluir "${m.titulo}"?`, conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => { setRepertorio(repertorio.filter(r => r.id !== m.id)); } }); }} className="text-xs bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-200 transition">🗑️</button>
                        </div>
                        {/* #9: Player embutido */}
                        {ytPreviewId===m.id && (() => {
                            const ytId = (m.links||[]).map(l=>ytIdFromUrl(l)).find(Boolean);
                            if (!ytId) return null;
                            return (
                                <div className="mt-2 rounded-xl overflow-hidden border border-red-200 bg-black">
                                    <iframe
                                        width="100%" height="200"
                                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                        allow="autoplay; encrypted-media"
                                        allowFullScreen
                                        className="block"
                                    />
                                </div>
                            );
                        })()}
                        </React.Fragment>
                    ))}
                </div>
            </>
        ) : (
            <div className="max-w-2xl mx-auto space-y-4">
                {/* Cabeçalho do formulário */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">🎼 {musicaEditando.id === Date.now() ? 'Nova Música' : 'Editar Música'}</h2>
                        <p className="text-sm text-slate-400 mt-0.5">Preencha os dados da música no repertório</p>
                    </div>
                    <button onClick={() => setMusicaEditando(null)} className="text-slate-400 hover:text-slate-600 text-xl font-light transition">✕</button>
                </div>

                {/* Identificação */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Identificação</p>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Título *</label>
                            <input type="text" value={musicaEditando.titulo} onChange={e => setMusicaEditando({...musicaEditando, titulo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" placeholder="Nome da música" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Autor</label>
                            <input type="text" value={musicaEditando.autor} onChange={e => setMusicaEditando({...musicaEditando, autor: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" placeholder="Compositor/Autor" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-1">Origem</label>
                            <select value={musicaEditando.origem} onChange={e => setMusicaEditando({...musicaEditando, origem: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400">
                                <option value="">Selecione...</option>
                                <option>Folclórica</option>
                                <option>Autoral</option>
                                <option>Tradicional</option>
                                <option>Popular</option>
                                <option>Erudita</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── ACCORDION: Elementos Musicais, Recursos, Vínculos ── */}
                {(() => {
                    // Badge counts
                    const badgeForma = [(musicaEditando.estilos||[]).length, (musicaEditando.compassos||[]).length, (musicaEditando.estruturas||[]).length].reduce((a,b)=>a+b,0);
                    const badgeTom = [(musicaEditando.tonalidades||[]).length, (musicaEditando.andamentos||[]).length, (musicaEditando.escalas||[]).length].reduce((a,b)=>a+b,0);
                    const badgeExp = [(musicaEditando.dinamicas||[]).length, (musicaEditando.energias||[]).length, (musicaEditando.instrumentacao||[]).length].reduce((a,b)=>a+b,0);
                    const badgeRec = [(musicaEditando.links||[]).length, (musicaEditando.pdfs||[]).length, (musicaEditando.audios||[]).length].reduce((a,b)=>a+b,0);
                    const badgeVinc = [(musicaEditando.planosVinculados||[]).length, (musicaEditando.atividadesVinculadas||[]).length].reduce((a,b)=>a+b,0);

                    return (<>

                    {/* ACCORDION 1 — Forma e Estrutura */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'forma' ? null : 'forma')}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                            <div>
                                <span className="text-sm font-semibold text-slate-700">🎵 Forma e Estrutura</span>
                                <span className="text-xs text-slate-400 ml-2">Estilo · Compasso · Estrutura</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {badgeForma > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeForma}</span>}
                                <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'forma' ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                        </button>
                        {accordionAberto === 'forma' && (
                            <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                {/* Estilo */}
                                <div>
                                    {labelRow('Estilo',
                                        () => { const novo = prompt('Novo estilo:'); if(novo && !ESTILOS_OPCOES.includes(novo)) setMusicaEditando({...musicaEditando, estilos: [...(musicaEditando.estilos||[]), novo]}); },
                                        null
                                    )}
                                    {/* Selecionados */}
                                    {(musicaEditando.estilos||[]).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {(musicaEditando.estilos||[]).map((est,i) => (
                                                <span key={i} className="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                                                    {est}
                                                    <button type="button" onClick={() => setMusicaEditando({...musicaEditando, estilos: musicaEditando.estilos.filter((_,idx)=>idx!==i)})} className="hover:text-red-300 ml-0.5">×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="relative">
                                        <input type="text" value={buscaEstilo} onChange={e => setBuscaEstilo(e.target.value)}
                                            placeholder="Buscar estilos..."
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                        {buscaEstilo && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {ESTILOS_OPCOES.filter(e => e.toLowerCase().includes(buscaEstilo.toLowerCase())).map(est => (
                                                    <button key={est} type="button" onClick={() => { const l=musicaEditando.estilos||[]; if(!l.includes(est)) setMusicaEditando({...musicaEditando, estilos:[...l,est]}); setBuscaEstilo(''); }}
                                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm text-slate-700">{est}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Compasso */}
                                <div>
                                    {labelRow('Compasso',
                                        () => { const novo = prompt('Novo compasso:'); if(novo && !COMPASSOS_OPCOES.includes(novo) && !compassosCustomizados.includes(novo)) { const novos=[...compassosCustomizados,novo]; setCompassosCustomizados(novos); dbSet('compassosCustomizados',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, compassos:[...(musicaEditando.compassos||[]),novo]}); }},
                                        () => setEditandoElemento('compasso')
                                    )}
                                    {chips([...COMPASSOS_OPCOES,...compassosCustomizados], musicaEditando.compassos, comp => { const l=musicaEditando.compassos||[]; setMusicaEditando({...musicaEditando, compassos: l.includes(comp)?l.filter(c=>c!==comp):[...l,comp]}); })}
                                </div>
                                {/* Estrutura */}
                                <div>
                                    {labelRow('Estrutura',
                                        () => { const novo = prompt('Nova estrutura:'); if(novo && !ESTRUTURAS_OPCOES.includes(novo) && !estruturasCustomizadas.includes(novo)) { const novos=[...estruturasCustomizadas,novo]; setEstruturasCustomizadas(novos); dbSet('estruturasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, estruturas:[...(musicaEditando.estruturas||[]),novo]}); }},
                                        () => setEditandoElemento('estrutura')
                                    )}
                                    {chips([...ESTRUTURAS_OPCOES,...estruturasCustomizadas], musicaEditando.estruturas, est => { const l=musicaEditando.estruturas||[]; setMusicaEditando({...musicaEditando, estruturas: l.includes(est)?l.filter(e=>e!==est):[...l,est]}); })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACCORDION 2 — Tom e Ritmo */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'tom' ? null : 'tom')}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                            <div>
                                <span className="text-sm font-semibold text-slate-700">🎼 Tom e Ritmo</span>
                                <span className="text-xs text-slate-400 ml-2">Tonalidade · Escala · Andamento</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {badgeTom > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeTom}</span>}
                                <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'tom' ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                        </button>
                        {accordionAberto === 'tom' && (
                            <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                {/* Tonalidade */}
                                <div>
                                    {labelRow('Tonalidade / Modo',
                                        () => { const novo = prompt('Nova tonalidade:'); if(novo && !TONALIDADES_OPCOES.includes(novo) && !tonalidadesCustomizadas.includes(novo)) { const novos=[...tonalidadesCustomizadas,novo]; setTonalidadesCustomizadas(novos); dbSet('tonalidadesCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, tonalidades:[...(musicaEditando.tonalidades||[]),novo]}); }},
                                        () => setEditandoElemento('tonalidade')
                                    )}
                                    {chips([...TONALIDADES_OPCOES,...tonalidadesCustomizadas], musicaEditando.tonalidades, ton => { const l=musicaEditando.tonalidades||[]; setMusicaEditando({...musicaEditando, tonalidades: l.includes(ton)?l.filter(t=>t!==ton):[...l,ton]}); })}
                                </div>
                                {/* Escala */}
                                <div>
                                    {labelRow('Escala',
                                        () => { const novo = prompt('Nova escala:'); if(novo && !ESCALAS_OPCOES.includes(novo) && !escalasCustomizadas.includes(novo)) { const novos=[...escalasCustomizadas,novo]; setEscalasCustomizadas(novos); dbSet('escalasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, escalas:[...(musicaEditando.escalas||[]),novo]}); }},
                                        () => setEditandoElemento('escala')
                                    )}
                                    {chips([...ESCALAS_OPCOES,...escalasCustomizadas], musicaEditando.escalas, esc => { const l=musicaEditando.escalas||[]; setMusicaEditando({...musicaEditando, escalas: l.includes(esc)?l.filter(e=>e!==esc):[...l,esc]}); })}
                                </div>
                                {/* Andamento */}
                                <div>
                                    {labelRow('Andamento',
                                        () => { const novo = prompt('Novo andamento:'); if(novo && !ANDAMENTOS_OPCOES.includes(novo) && !andamentosCustomizados.includes(novo)) { const novos=[...andamentosCustomizados,novo]; setAndamentosCustomizados(novos); dbSet('andamentosCustomizados',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, andamentos:[...(musicaEditando.andamentos||[]),novo]}); }},
                                        () => setEditandoElemento('andamento')
                                    )}
                                    {chips([...ANDAMENTOS_OPCOES,...andamentosCustomizados], musicaEditando.andamentos, and => { const l=musicaEditando.andamentos||[]; setMusicaEditando({...musicaEditando, andamentos: l.includes(and)?l.filter(a=>a!==and):[...l,and]}); })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACCORDION 3 — Expressão */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'expressao' ? null : 'expressao')}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                            <div>
                                <span className="text-sm font-semibold text-slate-700">⚡ Expressão</span>
                                <span className="text-xs text-slate-400 ml-2">Dinâmica · Energia · Instrumentação</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {badgeExp > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeExp}</span>}
                                <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'expressao' ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                        </button>
                        {accordionAberto === 'expressao' && (
                            <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                {/* Dinâmica */}
                                <div>
                                    {labelRow('Dinâmica',
                                        () => { const novo = prompt('Nova dinâmica:'); if(novo && !DINAMICAS_OPCOES.includes(novo) && !dinamicasCustomizadas.includes(novo)) { const novos=[...dinamicasCustomizadas,novo]; setDinamicasCustomizadas(novos); dbSet('dinamicasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, dinamicas:[...(musicaEditando.dinamicas||[]),novo]}); }},
                                        () => setEditandoElemento('dinamica')
                                    )}
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            {val:'Pianíssimo', label:'pp Pianíssimo'},
                                            {val:'Piano', label:'p Piano'},
                                            {val:'Meio-Piano', label:'mp Meio-Piano'},
                                            {val:'Meio-Forte', label:'mf Meio-Forte'},
                                            {val:'Forte', label:'f Forte'},
                                            {val:'Fortíssimo', label:'ff Fortíssimo'},
                                            {val:'Crescendo', label:'↗ Crescendo'},
                                            {val:'Decrescendo', label:'↘ Decrescendo'},
                                            {val:'Legato', label:'⌢ Legato'},
                                            {val:'Staccato', label:'• Staccato'},
                                            ...dinamicasCustomizadas.map(d => ({val:d, label:d}))
                                        ].map(({val, label}) => {
                                            const sel = (musicaEditando.dinamicas||[]).includes(val);
                                            return <button key={val} type="button"
                                                onClick={() => { const l=musicaEditando.dinamicas||[]; setMusicaEditando({...musicaEditando, dinamicas: sel?l.filter(x=>x!==val):[...l,val]}); }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${sel ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>
                                                {label}
                                            </button>;
                                        })}
                                    </div>
                                </div>
                                {/* Energia */}
                                <div>
                                    {labelRow('Energia',
                                        () => { const novo = prompt('Nova energia:'); if(novo && !ENERGIAS_OPCOES.includes(novo) && !energiasCustomizadas.includes(novo)) { const novos=[...energiasCustomizadas,novo]; setEnergiasCustomizadas(novos); dbSet('energiasCustomizadas',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, energias:[...(musicaEditando.energias||[]),novo]}); }},
                                        () => setEditandoElemento('energia')
                                    )}
                                    {chips([...ENERGIAS_OPCOES,...energiasCustomizadas], musicaEditando.energias, e => { const l=musicaEditando.energias||[]; setMusicaEditando({...musicaEditando, energias: l.includes(e)?l.filter(x=>x!==e):[...l,e]}); })}
                                </div>
                                {/* Instrumentação */}
                                <div>
                                    {labelRow('Instrumentação',
                                        () => { const novo = prompt('Novo instrumento:'); if(novo && !INSTRUMENTACAO_OPCOES.includes(novo) && !instrumentacaoCustomizada.includes(novo)) { const novos=[...instrumentacaoCustomizada,novo]; setInstrumentacaoCustomizada(novos); dbSet('instrumentacaoCustomizada',JSON.stringify(novos)); setMusicaEditando({...musicaEditando, instrumentacao:[...(musicaEditando.instrumentacao||[]),novo]}); }},
                                        () => setEditandoElemento('instrumentacao')
                                    )}
                                    {chips([...INSTRUMENTACAO_OPCOES,...instrumentacaoCustomizada], musicaEditando.instrumentacao, inst => { const l=musicaEditando.instrumentacao||[]; setMusicaEditando({...musicaEditando, instrumentacao: l.includes(inst)?l.filter(x=>x!==inst):[...l,inst]}); })}
                                    <div className="mt-3">
                                        <label className="block text-xs text-slate-400 mb-1">Instrumento em destaque (solo/protagonista):</label>
                                        <input type="text" value={musicaEditando.instrumentoDestaque||''} onChange={e=>setMusicaEditando({...musicaEditando, instrumentoDestaque: e.target.value})}
                                            placeholder="Ex: violino solo, flauta doce..."
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACCORDION 4 — Observações e Recursos */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'recursos' ? null : 'recursos')}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                            <div>
                                <span className="text-sm font-semibold text-slate-700">📎 Observações e Recursos</span>
                                <span className="text-xs text-slate-400 ml-2">Notas · Links · PDFs · Áudios</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {badgeRec > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeRec}</span>}
                                <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'recursos' ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                        </button>
                        {accordionAberto === 'recursos' && (
                            <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-4">
                                <textarea value={musicaEditando.observacoes||''} onChange={e => setMusicaEditando({...musicaEditando, observacoes: e.target.value})}
                                    placeholder="Anotações sobre a música..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 resize-none" rows={3} />
                                <div className="flex gap-2">
                                    <button onClick={() => { const url=prompt('Cole o link:'); if(url) setMusicaEditando({...musicaEditando, links:[...(musicaEditando.links||[]),url]}); }}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold transition">🔗 Link</button>
                                    <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold text-center cursor-pointer transition">
                                        📄 PDF
                                        <input type="file" accept=".pdf" className="hidden" onChange={e => { const file=e.target.files[0]; if(file){ const r=new FileReader(); r.onload=()=>setMusicaEditando({...musicaEditando, pdfs:[...(musicaEditando.pdfs||[]),{nome:file.name,data:r.result}]}); r.readAsDataURL(file); } e.target.value=''; }} />
                                    </label>
                                    <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold text-center cursor-pointer transition">
                                        🎧 Áudio
                                        <input type="file" accept="audio/*,video/*" className="hidden" onChange={e => { const file=e.target.files[0]; if(file){ const r=new FileReader(); r.onload=()=>setMusicaEditando({...musicaEditando, audios:[...(musicaEditando.audios||[]),{nome:file.name,data:r.result}]}); r.readAsDataURL(file); } e.target.value=''; }} />
                                    </label>
                                </div>
                                <div className="space-y-1.5">
                                    {(musicaEditando.links||[]).map((l,i) => <div key={i} className="flex gap-2 items-center bg-slate-50 px-3 py-2 rounded-lg"><a href={l} target="_blank" className="flex-1 truncate text-indigo-600 hover:underline text-xs">🔗 {l}</a><button onClick={()=>setMusicaEditando({...musicaEditando,links:musicaEditando.links.filter((_,idx)=>idx!==i)})} className="text-slate-400 hover:text-red-500 font-bold">✕</button></div>)}
                                    {(musicaEditando.pdfs||[]).map((p,i) => <div key={i} className="flex gap-2 items-center bg-slate-50 px-3 py-2 rounded-lg"><a href={typeof p==='string'?p:p.data} target="_blank" className="flex-1 truncate text-slate-600 hover:underline text-xs">📄 {typeof p==='string'?p:p.nome}</a><button onClick={()=>setMusicaEditando({...musicaEditando,pdfs:musicaEditando.pdfs.filter((_,idx)=>idx!==i)})} className="text-slate-400 hover:text-red-500 font-bold">✕</button></div>)}
                                    {(musicaEditando.audios||[]).map((a,i) => <div key={i} className="flex gap-2 items-center bg-slate-50 px-3 py-2 rounded-lg"><a href={typeof a==='string'?a:a.data} target="_blank" className="flex-1 truncate text-slate-600 hover:underline text-xs">🎧 {typeof a==='string'?a:a.nome}</a><button onClick={()=>setMusicaEditando({...musicaEditando,audios:musicaEditando.audios.filter((_,idx)=>idx!==i)})} className="text-slate-400 hover:text-red-500 font-bold">✕</button></div>)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ACCORDION 5 — Vínculos */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button type="button" onClick={() => setAccordionAberto(accordionAberto === 'vinculos' ? null : 'vinculos')}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left">
                            <div>
                                <span className="text-sm font-semibold text-slate-700">🔗 Vínculos</span>
                                <span className="text-xs text-slate-400 ml-2">Aulas · Atividades</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {badgeVinc > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{badgeVinc}</span>}
                                <span className={`text-slate-300 text-xs transition-transform duration-200 ${accordionAberto === 'vinculos' ? 'rotate-180' : ''}`}>▼</span>
                            </div>
                        </button>
                        {accordionAberto === 'vinculos' && (
                            <div className="bg-slate-50 border-t border-slate-100 px-5 py-5 space-y-5">
                                {/* Aulas */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">📋 Aulas (Planos de Aula)</label>
                                    <input type="text" placeholder="Buscar aula pelo título..." id="inputBuscaAulaVincular"
                                        onChange={e => { const el=document.getElementById('listaAulasVincular'); if(el) el.style.display=e.target.value?'block':'none'; }}
                                        onFocus={() => { const el=document.getElementById('listaAulasVincular'); if(el) el.style.display='block'; }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 mb-1" />
                                    <div id="listaAulasVincular" style={{display:'none'}} className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                                        {planos.filter(p => { const b=(document.getElementById('inputBuscaAulaVincular') as HTMLInputElement)?.value?.toLowerCase()||''; return !b||(p.titulo||'').toLowerCase().includes(b); }).map(p => {
                                            const jaVinc=(musicaEditando.planosVinculados||[]).includes(p.id);
                                            return <div key={p.id} className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 ${jaVinc?'bg-indigo-50':''}`}
                                                onClick={() => { const l=musicaEditando.planosVinculados||[]; setMusicaEditando({...musicaEditando, planosVinculados: jaVinc?l.filter(id=>id!==p.id):[...l,p.id]}); }}>
                                                <span className="text-sm text-slate-700">{p.titulo||'Sem título'}</span>
                                                {jaVinc && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">✓</span>}
                                            </div>;
                                        })}
                                    </div>
                                    {(musicaEditando.planosVinculados||[]).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {(musicaEditando.planosVinculados||[]).map(id => { const p=planos.find(pl=>pl.id===id); return p?<span key={id} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">📋 {p.titulo} <button type="button" onClick={()=>setMusicaEditando({...musicaEditando,planosVinculados:(musicaEditando.planosVinculados||[]).filter(x=>x!==id)})} className="hover:text-red-600 font-bold">×</button></span>:null; })}
                                        </div>
                                    )}
                                </div>
                                {/* Atividades */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-600 mb-2">🎯 Atividades do Banco</label>
                                    <input type="text" placeholder="Buscar atividade pelo nome..." id="inputBuscaAtivVincular"
                                        onChange={e => { const el=document.getElementById('listaAtivVincular'); if(el) el.style.display=e.target.value?'block':'none'; }}
                                        onFocus={() => { const el=document.getElementById('listaAtivVincular'); if(el) el.style.display='block'; }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 mb-1" />
                                    <div id="listaAtivVincular" style={{display:'none'}} className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                                        {atividades.filter(a => { const b=(document.getElementById('inputBuscaAtivVincular') as HTMLInputElement)?.value?.toLowerCase()||''; return !b||(a.nome||'').toLowerCase().includes(b); }).map(a => {
                                            const jaVinc=(musicaEditando.atividadesVinculadas||[]).find(x=>x.id===a.id);
                                            return <div key={a.id} className={`flex items-center justify-between px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 ${jaVinc?'bg-slate-50':''}`}
                                                onClick={() => { const l=musicaEditando.atividadesVinculadas||[]; setMusicaEditando({...musicaEditando, atividadesVinculadas: jaVinc?l.filter(x=>x.id!==a.id):[...l,{id:a.id,nome:a.nome}]}); }}>
                                                <span className="text-sm text-slate-700">{a.nome||'Sem nome'}</span>
                                                {jaVinc && <span className="text-xs bg-slate-700 text-white px-2 py-0.5 rounded-full">✓</span>}
                                            </div>;
                                        })}
                                        {atividades.length===0 && <p className="text-center text-slate-400 py-4 text-sm">Nenhuma atividade no banco</p>}
                                    </div>
                                    {(musicaEditando.atividadesVinculadas||[]).length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {(musicaEditando.atividadesVinculadas||[]).map(a => <span key={a.id} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">🎯 {a.nome} <button type="button" onClick={()=>setMusicaEditando({...musicaEditando,atividadesVinculadas:(musicaEditando.atividadesVinculadas||[]).filter(x=>x.id!==a.id)})} className="hover:text-red-600 font-bold">×</button></span>)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Excluir Opções */}
                    {editandoElemento && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditandoElemento(null)}>
                            <div className="bg-white p-6 rounded-xl max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Excluir Opções Personalizadas</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {(editandoElemento === 'compasso' ? [...COMPASSOS_OPCOES,...compassosCustomizados] :
                                      editandoElemento === 'tonalidade' ? [...TONALIDADES_OPCOES,...tonalidadesCustomizadas] :
                                      editandoElemento === 'andamento' ? [...ANDAMENTOS_OPCOES,...andamentosCustomizados] :
                                      editandoElemento === 'escala' ? [...ESCALAS_OPCOES,...escalasCustomizadas] :
                                      editandoElemento === 'dinamica' ? [...DINAMICAS_OPCOES,...dinamicasCustomizadas] :
                                      editandoElemento === 'energia' ? [...ENERGIAS_OPCOES,...energiasCustomizadas] :
                                      editandoElemento === 'instrumentacao' ? [...INSTRUMENTACAO_OPCOES,...instrumentacaoCustomizada] :
                                      [...ESTRUTURAS_OPCOES,...estruturasCustomizadas]).map(item => {
                                        const isPadrao = (editandoElemento==='compasso'&&COMPASSOS_OPCOES.includes(item))||(editandoElemento==='tonalidade'&&TONALIDADES_OPCOES.includes(item))||(editandoElemento==='andamento'&&ANDAMENTOS_OPCOES.includes(item))||(editandoElemento==='escala'&&ESCALAS_OPCOES.includes(item))||(editandoElemento==='dinamica'&&DINAMICAS_OPCOES.includes(item))||(editandoElemento==='energia'&&ENERGIAS_OPCOES.includes(item))||(editandoElemento==='instrumentacao'&&INSTRUMENTACAO_OPCOES.includes(item))||(editandoElemento==='estrutura'&&ESTRUTURAS_OPCOES.includes(item));
                                        return <div key={item} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                                            <span className="text-sm text-slate-700">{item} {isPadrao && <span className="text-xs text-slate-400">(padrão)</span>}</span>
                                            {!isPadrao && <button type="button" onClick={() => {
                                                if(editandoElemento==='compasso'){const n=compassosCustomizados.filter(c=>c!==item);setCompassosCustomizados(n);dbSet('compassosCustomizados',JSON.stringify(n));setMusicaEditando({...musicaEditando,compassos:(musicaEditando.compassos||[]).filter(c=>c!==item)});}
                                                else if(editandoElemento==='tonalidade'){const n=tonalidadesCustomizadas.filter(t=>t!==item);setTonalidadesCustomizadas(n);dbSet('tonalidadesCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,tonalidades:(musicaEditando.tonalidades||[]).filter(t=>t!==item)});}
                                                else if(editandoElemento==='andamento'){const n=andamentosCustomizados.filter(a=>a!==item);setAndamentosCustomizados(n);dbSet('andamentosCustomizados',JSON.stringify(n));setMusicaEditando({...musicaEditando,andamentos:(musicaEditando.andamentos||[]).filter(a=>a!==item)});}
                                                else if(editandoElemento==='escala'){const n=escalasCustomizadas.filter(e=>e!==item);setEscalasCustomizadas(n);dbSet('escalasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,escalas:(musicaEditando.escalas||[]).filter(e=>e!==item)});}
                                                else if(editandoElemento==='estrutura'){const n=estruturasCustomizadas.filter(e=>e!==item);setEstruturasCustomizadas(n);dbSet('estruturasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,estruturas:(musicaEditando.estruturas||[]).filter(e=>e!==item)});}
                                                else if(editandoElemento==='dinamica'){const n=dinamicasCustomizadas.filter(d=>d!==item);setDinamicasCustomizadas(n);dbSet('dinamicasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,dinamicas:(musicaEditando.dinamicas||[]).filter(d=>d!==item)});}
                                                else if(editandoElemento==='energia'){const n=energiasCustomizadas.filter(e=>e!==item);setEnergiasCustomizadas(n);dbSet('energiasCustomizadas',JSON.stringify(n));setMusicaEditando({...musicaEditando,energias:(musicaEditando.energias||[]).filter(e=>e!==item)});}
                                                else if(editandoElemento==='instrumentacao'){const n=instrumentacaoCustomizada.filter(i=>i!==item);setInstrumentacaoCustomizada(n);dbSet('instrumentacaoCustomizada',JSON.stringify(n));setMusicaEditando({...musicaEditando,instrumentacao:(musicaEditando.instrumentacao||[]).filter(i=>i!==item)});}
                                            }} className="text-red-500 hover:text-red-700 font-bold text-sm">🗑️</button>}
                                        </div>;
                                    })}
                                </div>
                                <button onClick={() => setEditandoElemento(null)} className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg font-semibold text-sm transition">Fechar</button>
                            </div>
                        </div>
                    )}

                    </>);
                })()}

                {/* Botão Salvar */}
                <div className="flex gap-3 pb-4">
                    <button
                        onClick={() => {
                            if(!musicaEditando.titulo.trim()) {
                                setModalConfirm({ conteudo: '⚠️ Título é obrigatório!', somenteOk: true, labelConfirm: 'OK' });
                                return;
                            }
                            const _salvarMusica = () => {
                                const novoRepertorio = repertorio.find(r => r.id === musicaEditando.id)
                                    ? repertorio.map(r => r.id === musicaEditando.id ? musicaEditando : r)
                                    : [...repertorio, musicaEditando];
                                setRepertorio(novoRepertorio);
                                dbSet('repertorio', JSON.stringify(novoRepertorio));
                                if (pendingAtividadeId && planoEditando) {
                                    const atualizado = [...(planoEditando.atividadesRoteiro || [])];
                                    const idx = atualizado.findIndex(a => a.id === pendingAtividadeId);
                                    if (idx !== -1) {
                                        const jaVinculada = (atualizado[idx].musicasVinculadas || []).find(m => m.id === musicaEditando.id);
                                        if (!jaVinculada) {
                                            atualizado[idx] = {
                                                ...atualizado[idx],
                                                musicasVinculadas: [...(atualizado[idx].musicasVinculadas || []), {
                                                    id: musicaEditando.id,
                                                    titulo: musicaEditando.titulo,
                                                    autor: musicaEditando.autor
                                                }]
                                            };
                                            setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                                        }
                                    }
                                    setPendingAtividadeId(null);
                                    setViewMode('planos');
                                    setModalConfirm({ conteudo: '✅ Música salva e vinculada à atividade!', somenteOk: true, labelConfirm: 'OK' });
                                } else {
                                    setModalConfirm({ conteudo: '✅ Música salva!', somenteOk: true, labelConfirm: 'OK' });
                                }
                                setMusicaEditando(null);
                            };
                            setModalConfirm({ titulo: 'Salvar música?', conteudo: 'Deseja confirmar o salvamento desta música?', labelConfirm: 'Salvar', onConfirm: _salvarMusica });
                        }}
                        className="flex-1 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 px-6 py-3 rounded-xl font-bold text-sm transition shadow-sm"
                    >
                        💾 Salvar Música
                    </button>
                    <button onClick={() => setMusicaEditando(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-sm transition">Cancelar</button>
                </div>
            </div>
        )}
    </div>
);
}
