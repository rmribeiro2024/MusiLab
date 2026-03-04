import React from 'react'
import { useAtividadesContext } from '../../contexts'
import { useRepertorioContext } from '../../contexts'
import { usePlanosContext } from '../../contexts'
import { useModalContext } from '../../contexts'

export default function ModalNovaMusicaInline() {
    const { modalNovaMusicaInline, setModalNovaMusicaInline, novaMusicaInline, setNovaMusicaInline, pendingAtividadeId, setPendingAtividadeId, setAtividadeVinculandoMusica } = useAtividadesContext()
    const { setRepertorio } = useRepertorioContext()
    const { planoEditando, setPlanoEditando } = usePlanosContext()
    const { setModalConfirm } = useModalContext()

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
                            onChange={e=>setNovaMusicaInline({...novaMusicaInline, titulo: e.target.value})}
                            placeholder="Nome da música"
                            className="w-full px-4 py-3 border-2 border-gray-200 focus:border-green-500 rounded-xl outline-none"/>
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
                        if (!titulo) { setModalConfirm({ conteudo: '⚠️ Título é obrigatório!', somenteOk: true, labelConfirm: 'OK' }); return; }
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
                        setModalConfirm({ conteudo: `✅ Música "${titulo}" salva e vinculada! Complete os detalhes depois em Repertório Inteligente.`, somenteOk: true, labelConfirm: 'OK' });
                    }} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold">
                        🎵 Salvar e Vincular
                    </button>
                </div>
            </div>
        </div>
    )
}
