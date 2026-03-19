import React from 'react'
import { usePlanosContext } from '../../contexts'
import { useModalContext } from '../../contexts'
import { useBancoPlanos } from '../BancoPlanosContext'
import { gerarIdSeguro } from '../../lib/utils'

export default function ModalTemplatesRoteiro() {
    const { planoEditando, setPlanoEditando } = usePlanosContext()
    const { modalTemplates, setModalTemplates, templatesRoteiro, setTemplatesRoteiro, nomeNovoTemplate, setNomeNovoTemplate } = useBancoPlanos()
    const { setModalConfirm } = useModalContext()

    if (!modalTemplates) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={() => setModalTemplates(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overscroll-y-contain shadow-xl" onClick={e => e.stopPropagation()}>

                {/* Header — padrão do design system */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">📐 Templates de Roteiro</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Salve e reutilize estruturas de aula</p>
                    </div>
                    <button onClick={() => setModalTemplates(false)}
                        className="text-slate-300 hover:text-slate-500 text-xl leading-none transition">×</button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Salvar roteiro atual */}
                    {planoEditando && (planoEditando.atividadesRoteiro || []).length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <p className="font-semibold text-slate-700 text-sm mb-1">💾 Salvar roteiro atual como template</p>
                            <p className="text-xs text-slate-400 mb-3">{(planoEditando.atividadesRoteiro || []).length} atividade(s) serão salvas</p>
                            <div className="flex gap-2">
                                <input type="text" value={nomeNovoTemplate} onChange={e => setNomeNovoTemplate(e.target.value)}
                                    placeholder="Nome do template (ex: Aula padrão 80min)..."
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                                <button onClick={() => {
                                    if (!nomeNovoTemplate.trim()) return;
                                    setTemplatesRoteiro(prev => [...prev, {
                                        id: Date.now(), nome: nomeNovoTemplate.trim(),
                                        criadoEm: new Date().toLocaleDateString('pt-BR'),
                                        atividades: (planoEditando.atividadesRoteiro || []).map(a => ({nome:a.nome, duracao:a.duracao, descricao:a.descricao}))
                                    }]);
                                    setNomeNovoTemplate('');
                                }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors shrink-0">Salvar</button>
                            </div>
                        </div>
                    )}

                    {/* Lista de templates */}
                    {templatesRoteiro.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p className="text-4xl mb-3">📐</p>
                            <p className="font-semibold text-slate-500">Nenhum template salvo ainda</p>
                            <p className="text-sm mt-1">Monte um roteiro e salve como template para reutilizar</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{templatesRoteiro.length} template(s) salvo(s)</p>
                            {templatesRoteiro.map(tmpl => (
                                <div key={tmpl.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm">{tmpl.nome}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{(tmpl.atividades || []).length} atividade(s) · Criado em {tmpl.criadoEm}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => {
                                                setModalConfirm({ titulo: `Aplicar template "${tmpl.nome}"?`, conteudo: 'Isso substituirá o roteiro atual.', labelConfirm: 'Aplicar', onConfirm: () => {
                                                    setPlanoEditando({...planoEditando, atividadesRoteiro: (tmpl.atividades || []).map(a=>({...a, id:gerarIdSeguro()}))});
                                                    setModalTemplates(false);
                                                } });
                                            }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">▶ Aplicar</button>
                                            <button onClick={() => { setModalConfirm({ titulo: `Excluir template "${tmpl.nome}"?`, conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => setTemplatesRoteiro(prev=>prev.filter(t=>t.id!==tmpl.id)) }); }}
                                                className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {(tmpl.atividades || []).map((a, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">
                                                <span className="bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full text-[10px]">{i+1}</span>
                                                <span className="font-medium">{a.nome || '(sem nome)'}</span>
                                                {a.duracao && <span className="text-slate-400">· {a.duracao} min</span>}
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
