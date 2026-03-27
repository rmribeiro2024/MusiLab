// src/components/AppSidebar.tsx
// Sidebar principal do MusiLab — substituiu TopNav + ModuleSidebar.
// Desktop: fixa à esquerda, colapsável (220px / 56px).
// Mobile: hidden — navegação pelo BottomNav.

import React from 'react'
import { NAV_SECTIONS } from '../lib/navigation'
import type { SectionId } from '../lib/navigation'

// ── Ícones SVG inline ─────────────────────────────────────────────────────────

function IconHome({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    )
}

function IconCalendar({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    )
}

function IconUsers({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}

function IconBook({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    )
}

function IconSettings({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    )
}

const SECTION_ICONS: Record<SectionId, React.FC<{ size?: number }>> = {
    hoje:          IconHome,
    planejamento:  IconCalendar,
    turmas:        IconUsers,
    biblioteca:    IconBook,
    configuracoes: IconSettings,
}

// ── Componente item ───────────────────────────────────────────────────────────

interface ItemProps {
    section: typeof NAV_SECTIONS[number]
    isActive: boolean
    collapsed: boolean
    onClick: () => void
}

function SidebarNavItem({ section, isActive, collapsed, onClick }: ItemProps) {
    const Icon = SECTION_ICONS[section.id]
    return (
        <button
            type="button"
            onClick={onClick}
            title={collapsed ? section.label : undefined}
            className={`relative w-full flex items-center gap-3 rounded-lg transition-all duration-[120ms] text-left
                ${collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-[9px]'}
                ${isActive
                    ? 'bg-[#5B5FEA]/[0.09] dark:bg-[#5B5FEA]/[0.16] text-[#3730a3] dark:text-indigo-200 font-semibold'
                    : 'text-slate-500 dark:text-[#9CA3AF] hover:bg-[#E8EDF4] dark:hover:bg-white/[0.05] hover:text-slate-800 dark:hover:text-[#E5E7EB] font-medium'}`}
        >
            {isActive && (
                <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] bg-[#5B5FEA] dark:bg-[#818cf8] rounded-r-full" />
            )}
            <span className="shrink-0 flex items-center justify-center">
                <Icon size={17} />
            </span>
            {!collapsed && (
                <span className="text-[14px] tracking-[-0.01em] truncate leading-none">{section.label}</span>
            )}
        </button>
    )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    activeSection: SectionId
    onNavigate: (section: SectionId) => void
    collapsed: boolean
    onToggle: () => void
    statusSalvamento: '' | 'salvando' | 'salvo' | 'erro'
    darkMode: boolean
    onThemeToggle: () => void
    onBackupClick?: () => void
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AppSidebar({
    activeSection,
    onNavigate,
    collapsed,
    onToggle,
    statusSalvamento,
    darkMode,
    onThemeToggle,
    onBackupClick,
}: Props) {
    const mainSections = NAV_SECTIONS.filter(s => s.id !== 'configuracoes')
    const configSection = NAV_SECTIONS.find(s => s.id === 'configuracoes')!

    return (
        <aside
            className="v2-side hidden sm:flex flex-col border-r border-[#E6EAF0] dark:border-[#1f2937] flex-none overflow-hidden transition-all duration-200 h-screen sticky top-0"
            style={{ width: collapsed ? 56 : 220 }}
        >
            {/* ── Logo ── */}
            <div className={`flex items-center flex-none border-b border-[#E6EAF0] dark:border-[#1f2937] h-12 ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}>
                <span className="text-[17px] leading-none shrink-0">🎵</span>
                {!collapsed && (
                    <span className="text-[15px] font-bold tracking-[-0.03em] text-[#0f172a] dark:text-[#f1f5f9] leading-none truncate">MusiLab</span>
                )}
            </div>

            {/* ── Nav principal ── */}
            <nav className="flex-1 overflow-y-auto px-2 pt-3 pb-1 space-y-0.5">
                {mainSections.map(section => (
                    <SidebarNavItem
                        key={section.id}
                        section={section}
                        isActive={activeSection === section.id}
                        collapsed={collapsed}
                        onClick={() => onNavigate(section.id)}
                    />
                ))}
            </nav>

            {/* ── Configurações — sempre no rodapé, separada ── */}
            <div className="px-2 pb-1 border-t border-[#E6EAF0] dark:border-[#1f2937] pt-2">
                <SidebarNavItem
                    section={configSection}
                    isActive={activeSection === 'configuracoes'}
                    collapsed={collapsed}
                    onClick={() => onNavigate('configuracoes')}
                />
            </div>

            {/* ── Footer: status + theme + collapse ── */}
            <div className="border-t border-[#E6EAF0] dark:border-[#1f2937] px-2 py-2 flex-none space-y-1.5">

                {/* Status de salvamento */}
                {!collapsed && statusSalvamento !== '' && (
                    <div className="px-1">
                        {statusSalvamento === 'salvando' && (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-[#fbbf24]">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" opacity="0.75" />
                                </svg>
                                Salvando…
                            </span>
                        )}
                        {statusSalvamento === 'salvo' && (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-[#34d399]">
                                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                                Salvo
                            </span>
                        )}
                        {statusSalvamento === 'erro' && (
                            <button
                                onClick={onBackupClick}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-red-600 dark:text-[#f87171] hover:underline"
                            >
                                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                                Erro — backup
                            </button>
                        )}
                    </div>
                )}

                {/* Theme toggle + collapse */}
                <div className={`flex items-center ${collapsed ? 'flex-col gap-1.5' : 'justify-between'}`}>
                    <button
                        onClick={onThemeToggle}
                        title={darkMode ? 'Modo escuro — clique para claro' : 'Modo claro — clique para escuro'}
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-[#E6EAF0] dark:border-[#374151] text-slate-500 dark:text-[#9CA3AF] hover:bg-[#E8EDF4] dark:hover:bg-white/[0.05] hover:text-slate-700 dark:hover:text-[#E5E7EB] transition duration-[120ms] text-[13px]"
                    >
                        {darkMode ? '🌙' : '☀️'}
                    </button>

                    <button
                        type="button"
                        onClick={onToggle}
                        title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                        className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] hover:bg-[#E8EDF4] dark:hover:bg-white/[0.05] transition duration-[120ms]"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {collapsed
                                ? <><polyline points="9 18 15 12 9 6" /></>
                                : <><polyline points="15 18 9 12 15 6" /></>
                            }
                        </svg>
                    </button>
                </div>
            </div>
        </aside>
    )
}
