import React from 'react'
import { useAnoLetivoContext, useCalendarioContext } from '../../contexts'
import { useBancoPlanos } from '../BancoPlanosContext'

export default function ModalConfiguracoes() {
    const { modalConfiguracoes, setModalConfiguracoes, baixarBackup, restaurarBackup } = useBancoPlanos()
    const { anosLetivos, setModalTurmas } = useAnoLetivoContext()
    const { setModalGradeSemanal } = useCalendarioContext()

    if (!modalConfiguracoes) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={()=>setModalConfiguracoes(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto overscroll-y-contain" onClick={e=>e.stopPropagation()}>
                <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-5 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">⚙️ Configurações</h2>
                        <p className="text-slate-300 text-sm mt-0.5">Gestão do ano letivo e dados do sistema</p>
                    </div>
                    <button onClick={()=>setModalConfiguracoes(false)} className="text-white/60 hover:text-white text-2xl font-bold">×</button>
                </div>
                <div className="p-5 space-y-3">

                    {/* Ano Letivo / Escola */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">📅</span>
                            <div>
                                <div className="font-bold text-gray-800">Ano Letivo & Escolas</div>
                                <div className="text-xs text-gray-500">Cadastre anos, escolas e eventos</div>
                            </div>
                        </div>
                        <div className="text-xs text-indigo-600 mb-2">{anosLetivos.length} ano(s) cadastrado(s)</div>
                        <button onClick={()=>{ setModalConfiguracoes(false); setModalTurmas(true); }}
                            className="w-full border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-2 rounded-lg text-sm font-bold">
                            Gerenciar Anos Letivos
                        </button>
                    </div>

                    {/* Turmas */}
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">🏫</span>
                            <div>
                                <div className="font-bold text-gray-800">Turmas & Horários</div>
                                <div className="text-xs text-gray-500">Configure suas turmas por escola</div>
                            </div>
                        </div>
                        <button onClick={()=>{ setModalConfiguracoes(false); setModalTurmas(true); }}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg text-sm font-bold">
                            Gerenciar Turmas
                        </button>
                    </div>

                    {/* Grade Semanal */}
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-2xl">📆</span>
                            <div>
                                <div className="font-bold text-gray-800">Grade Semanal</div>
                                <div className="text-xs text-gray-500">Horários fixos por escola e semana</div>
                            </div>
                        </div>
                        <button onClick={()=>{ setModalConfiguracoes(false); setModalGradeSemanal(true); }}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-bold">
                            Gerenciar Grade Semanal
                        </button>
                    </div>

                    {/* Backup */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">💾</span>
                            <div>
                                <div className="font-bold text-gray-800">Backup & Restauração</div>
                                <div className="text-xs text-gray-500">Salve ou recupere todos os dados</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={()=>{ baixarBackup(); setModalConfiguracoes(false); }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold">
                                💾 Baixar Backup
                            </button>
                            <label className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold text-center cursor-pointer">
                                📥 Restaurar
                                <input type="file" accept=".json" onChange={(e)=>{ restaurarBackup(e); setModalConfiguracoes(false); }} className="hidden"/>
                            </label>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
