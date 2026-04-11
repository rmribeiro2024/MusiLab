import React, { useState } from 'react'
import { useAtividadesContext } from '../../contexts'
import { useRepertorioContext } from '../../contexts'
import { usePlanosContext } from '../../contexts'
import { showToast } from '../../lib/toast'

interface InfoMusica {
    compositor?: string
    periodo?: string
    genero?: string
    contexto?: string
    curiosidade?: string
}

export default function ModalNovaMusicaInline() {
    const { modalNovaMusicaInline, setModalNovaMusicaInline, novaMusicaInline, setNovaMusicaInline, pendingAtividadeId, setPendingAtividadeId, setAtividadeVinculandoMusica } = useAtividadesContext()
    const { setRepertorio } = useRepertorioContext()
    const { planoEditando, setPlanoEditando } = usePlanosContext()
    const [buscandoIA, setBuscandoIA] = useState(false)
    const [infoIA, setInfoIA] = useState<InfoMusica | null>(null)

    async function buscarInfoMusica() {
        const titulo = novaMusicaInline.titulo.trim()
        if (!titulo) return
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
        if (!apiKey) { showToast('Chave Gemini não configurada.', 'error'); return }
        setBuscandoIA(true)
        setInfoIA(null)
        try {
            const compositor = novaMusicaInline.autor.trim()
            const prompt = `Você é um musicólogo. Sobre a música "${titulo}"${compositor ? ` de ${compositor}` : ''}, forneça informações pedagógicas para um professor de música. Responda APENAS com JSON válido:
{"compositor": "nome completo do compositor", "periodo": "ex: Século XIX, Anos 1960, Contemporâneo", "genero": "ex: Erudita/Barroco, MPB, Folclórica Brasileira", "contexto": "1-2 frases sobre o contexto histórico/cultural da obra", "curiosidade": "1 curiosidade pedagógica interessante sobre esta música"}
Se não reconhecer a música, responda: {"compositor": "", "periodo": "", "genero": "", "contexto": "Música não encontrada na base de dados.", "curiosidade": ""}`
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
            )
            if (!res.ok) throw new Error('HTTP ' + res.status)
            const json = await res.json()
            const raw: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
            const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/)
            if (!match) throw new Error('sem JSON')
            const result: InfoMusica = JSON.parse(match[1] || match[0])
            setInfoIA(result)
        } catch {
            showToast('Não foi possível buscar informações. Tente novamente.', 'error')
        } finally {
            setBuscandoIA(false)
        }
    }

    if (!modalNovaMusicaInline) return null

    return (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[110]">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto overscroll-y-contain">
                <div className="bg-green-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">🎵 Nova Música</h2>
                        <p className="text-green-200 text-sm mt-0.5">Será salva no Repertório e vinculada à atividade</p>
                    </div>
                    <button onClick={()=>setModalNovaMusicaInline(false)} className="text-white/70 hover:text-white text-2xl font-bold">×</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Título *</label>
                        <input type="text" autoFocus
                            value={novaMusicaInline.titulo}
                            onChange={e => { setNovaMusicaInline({...novaMusicaInline, titulo: e.target.value}); setInfoIA(null) }}
                            placeholder="Nome da música"
                            className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-500 rounded-xl outline-none"/>
                        {novaMusicaInline.titulo.trim().length >= 3 && !infoIA && (
                            <button
                                type="button"
                                onClick={buscarInfoMusica}
                                disabled={buscandoIA}
                                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                            >
                                {buscandoIA ? (
                                    <>
                                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                        Buscando...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                                        Pesquisar informações com IA
                                    </>
                                )}
                            </button>
                        )}
                        {infoIA && (
                            <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200 space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 flex-1">
                                        {infoIA.compositor && (
                                            <div className="flex items-start gap-1.5">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">Compositor</span>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs text-slate-700">{infoIA.compositor}</span>
                                                    {!novaMusicaInline.autor.trim() && (
                                                        <button type="button" onClick={() => setNovaMusicaInline({...novaMusicaInline, autor: infoIA.compositor!})}
                                                            className="text-[10px] text-indigo-600 font-semibold hover:underline">usar</button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {infoIA.periodo && (
                                            <div className="flex items-start gap-1.5">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">Período</span>
                                                <span className="text-xs text-slate-700">{infoIA.periodo}</span>
                                            </div>
                                        )}
                                        {infoIA.genero && (
                                            <div className="flex items-start gap-1.5">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">Gênero</span>
                                                <span className="text-xs text-slate-700">{infoIA.genero}</span>
                                            </div>
                                        )}
                                        {infoIA.contexto && (
                                            <div className="flex items-start gap-1.5">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">Contexto</span>
                                                <span className="text-xs text-slate-600 leading-relaxed">{infoIA.contexto}</span>
                                            </div>
                                        )}
                                        {infoIA.curiosidade && (
                                            <div className="flex items-start gap-1.5 pt-1 border-t border-indigo-200">
                                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide w-16 shrink-0 mt-0.5">Dica</span>
                                                <span className="text-xs text-slate-600 italic leading-relaxed">{infoIA.curiosidade}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setInfoIA(null)} className="text-indigo-300 hover:text-indigo-500 text-sm shrink-0">×</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Compositor / Autor</label>
                        <input type="text"
                            value={novaMusicaInline.autor}
                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, autor: e.target.value})}
                            placeholder="Opcional"
                            className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-500 rounded-xl outline-none"/>
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Origem</label>
                        <select value={novaMusicaInline.origem}
                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, origem: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl">
                            <option value="">— Selecione —</option>
                            <option>Brasileira</option>
                            <option>Estrangeira</option>
                            <option>Folclórica</option>
                            <option>Infantil</option>
                            <option>Erudita</option>
                            <option>Popular</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-bold text-gray-700 mb-1">Observações</label>
                        <textarea value={novaMusicaInline.observacoes}
                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, observacoes: e.target.value})}
                            rows={2} placeholder="Opcional"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl outline-none resize-none"/>
                    </div>
                </div>
                <div className="p-6 pt-0 flex gap-3">
                    <button onClick={()=>setModalNovaMusicaInline(false)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">
                        Cancelar
                    </button>
                    <button onClick={()=>{
                        const titulo = novaMusicaInline.titulo.trim();
                        if (!titulo) { showToast('Título é obrigatório!', 'error'); return; }
                        // Cria a música
                        const novaMusica = {
                            id: Date.now(),
                            titulo,
                            autor: novaMusicaInline.autor.trim(),
                            origem: novaMusicaInline.origem,
                            observacoes: novaMusicaInline.observacoes,
                            estilos: [], compassos: [], tonalidades: [],
                            andamentos: [], escalas: [], estruturas: [], energias: [],
                            dinamicas: [], instrumentacao: [], instrumentoDestaque: '',
                            links: [], pdfs: [], audios: [],
                            planosVinculados: (pendingAtividadeId && planoEditando) ? [planoEditando.id] : []
                        };
                        // Salva no repertório (useEffect persiste automaticamente)
                        setRepertorio(prev => [...prev, novaMusica]);
                        // Vincula à atividade pendente
                        if (pendingAtividadeId && planoEditando) {
                            const atualizado = [...(planoEditando.atividadesRoteiro || [])];
                            const idx = atualizado.findIndex(a => a.id === pendingAtividadeId);
                            if (idx !== -1) {
                                atualizado[idx] = {
                                    ...atualizado[idx],
                                    musicasVinculadas: [...(atualizado[idx].musicasVinculadas || []),
                                        { id: novaMusica.id, titulo: novaMusica.titulo, autor: novaMusica.autor }]
                                };
                                setPlanoEditando({...planoEditando, atividadesRoteiro: atualizado});
                            }
                        }
                        setPendingAtividadeId(null);
                        setModalNovaMusicaInline(false);
                        setAtividadeVinculandoMusica(null);
                        showToast(`Música "${titulo}" salva e vinculada!`, 'success');
                    }} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold">
                        🎵 Salvar e Vincular
                    </button>
                </div>
            </div>
        </div>
    )
}
