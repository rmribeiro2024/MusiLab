import React from 'react'
import { useBancoPlanos } from '../BancoPlanosContext'
import { gerarIdSeguro } from '../../lib/utils'

export default function ModalTemplatesRoteiro() {
    const {
        modalTemplates,
        setModalTemplates,
        templatesRoteiro,
        setTemplatesRoteiro,
        nomeNovoTemplate,
        setNomeNovoTemplate,
        planoEditando,
        setPlanoEditando,
        setModalConfirm,
    } = useBancoPlanos()

    if (!modalTemplates) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalTemplates(false)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="bg-purple-600 text-white p-5 flex justify-between items-center rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold">📐 Templates de Roteiro</h2>
                        <p className="text-purple-200 text-sm mt-0.5">Salve e reutilize estruturas de aula</p>
                    </div>
                    <button onClick={() => setModalTemplates(false)} className="text-white text-2xl font-bold">✕</button>
                </div>
                <div className="p-5 space-y-4">
                    {planoEditando && (planoEditando.atividadesRoteiro || []).length > 0 && (
                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                            <p className="font-bold text-purple-800 mb-2">💾 Salvar roteiro atual como template</p>
                            <p className="text-xs text-purple-600 mb-3">{(planoEditando.atividadesRoteiro || []).length} atividade(s) serão salvas</p>
                            <div className="flex gap-2">
                                <input type="text" value={nomeNovoTemplate} onChange={e => setNomeNovoTemplate(e.target.value)}
                                    placeholder="Nome do template (ex: Aula padrão 80min)..."
                                    className="flex-1 px-3 py-2 border-2 border-purple-300 rounded-lg text-sm focus:border-purple-500 outline-none" />
                                <button onClick={() => {
                                    if (!nomeNovoTemplate.trim()) return;
                                    setTemplatesRoteiro(prev => [...prev, {
                                        id: Date.now(), nome: nomeNovoTemplate.trim(),
                                        criadoEm: new Date().toLocaleDateString('pt-BR'),
                                        atividades: (planoEditando.atividadesRoteiro || []).map(a => ({nome:a.nome, duracao:a.duracao, descricao:a.descricao}))
                                    }]);
                                    setNomeNovoTemplate('');
                                }} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm">Salvar</button>
                            </div>
                        </div>
                    )}
                    {templatesRoteiro.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <p className="text-4xl mb-2">📐</p>
                            <p className="font-bold">Nenhum template salvo ainda</p>
                            <p className="text-sm mt-1">Monte um roteiro e salve como template para reutilizar</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="font-bold text-gray-700">{templatesRoteiro.length} template(s) salvo(s)</p>
                            {templatesRoteiro.map(tmpl => (
                                <div key={tmpl.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-purple-300 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-800">{tmpl.nome}</p>
                                            <p className="text-xs text-gray-400">{tmpl.atividades.length} atividade(s) · Criado em {tmpl.criadoEm}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                setModalConfirm({ titulo: `Aplicar template "${tmpl.nome}"?`, conteudo: 'Isso substituirá o roteiro atual.', labelConfirm: 'Aplicar', onConfirm: () => {
                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: tmpl.atividades.map(a=>({...a, id:gerarIdSeguro()}))});
                                                    setModalTemplates(false);
                                                } });
                                            }} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold">▶ Aplicar</button>
                                            <button onClick={() => { setModalConfirm({ titulo: `Excluir template "${tmpl.nome}"?`, conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => setTemplatesRoteiro(prev=>prev.filter(t=>t.id!==tmpl.id)) }); }}
                                                className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold">🗑️</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 mt-2">
                                        {tmpl.atividades.map((a, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                                <span className="bg-purple-200 text-purple-800 font-bold px-1.5 py-0.5 rounded-full">{i+1}</span>
                                                <span className="font-medium">{a.nome || '(sem nome)'}</span>
                                                {a.duracao && <span className="text-gray-400">· {a.duracao} min</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
