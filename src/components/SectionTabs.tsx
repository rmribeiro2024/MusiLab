// src/components/SectionTabs.tsx
// Tabs horizontais no topo do conteúdo para seções com sub-navegação.
// Renderiza apenas quando a seção ativa tem tabs definidas em SECTION_TABS.
// Substitui o papel do ModuleSidebar para sub-views.

import React from 'react'
import { SECTION_TABS } from '../lib/navigation'
import type { SectionId, ViewMode } from '../lib/navigation'

interface Props {
    activeSection: SectionId
    viewMode: ViewMode
    onNavigate: (mode: ViewMode) => void
    darkMode: boolean
}

export default function SectionTabs({ activeSection, viewMode, onNavigate, darkMode }: Props) {
    const tabs = SECTION_TABS[activeSection]
    if (!tabs) return null

    return (
        <div
            className="flex-none flex items-end border-b border-[#E6EAF0] dark:border-[#374151] bg-white dark:bg-[#1F2937] px-6"
            style={{ height: 41 }}
        >
            {tabs.map(tab => {
                const isActive = viewMode === tab.mode
                return (
                    <button
                        key={tab.mode}
                        type="button"
                        onClick={() => onNavigate(tab.mode)}
                        className={`relative pb-[10px] px-1 mr-5 text-[13px] transition-colors duration-[120ms] border-b-2 whitespace-nowrap
                            ${isActive
                                ? 'border-[#5B5FEA] text-[#5B5FEA] dark:text-indigo-300 font-semibold'
                                : 'border-transparent text-slate-500 dark:text-[#9CA3AF] hover:text-slate-700 dark:hover:text-[#E5E7EB] font-medium'}`}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
