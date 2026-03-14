// ModuleSidebar.tsx
// Sidebar lateral colapsável para subnavegação de módulos.
// Desktop: fixa à esquerda, colapsável (ícones / ícone + texto).
// Mobile: drawer temporário com backdrop.

import React from 'react'

interface NavSubItem {
    label: string
    short: string
    icon: string
    mode: string
    accent?: boolean
    action: () => void
}

interface Props {
    items: NavSubItem[]
    collapsed: boolean
    onToggle: () => void
    activeMode: string       // viewMode atual — para destacar o item ativo
    mobileOpen: boolean
    onMobileClose: () => void
    sectionLabel?: string    // rótulo do grupo ativo (ex: "Planejamento")
}

function SidebarItem({ item, isActive, collapsed, onMobileClose }: {
    item: NavSubItem
    isActive: boolean
    collapsed: boolean
    onMobileClose: () => void
}) {
    return (
        <button
            type="button"
            onClick={() => { item.action(); onMobileClose() }}
            title={collapsed ? item.label : undefined}
            className={`relative w-full flex items-center gap-2.5 rounded-lg transition-all duration-[120ms] text-left
                ${collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-[7px]'}
                ${isActive
                    ? 'bg-[#5B5FEA]/[0.09] dark:bg-[#5B5FEA]/[0.16] text-[#3730a3] dark:text-indigo-200 font-semibold'
                    : item.accent
                        ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-400/[0.09] font-semibold'
                        : 'text-slate-500 dark:text-[#9CA3AF] hover:bg-[#E8EDF4] dark:hover:bg-white/[0.05] hover:text-slate-800 dark:hover:text-[#E5E7EB] font-medium'}`}
        >
            {/* Barra ativa à esquerda — flush na borda da sidebar */}
            {isActive && (
                <span className="absolute left-0 top-[5px] bottom-[5px] w-[3px] bg-[#5B5FEA] dark:bg-[#818cf8] rounded-r-full" />
            )}
            <span className="text-[15px] leading-none shrink-0">{item.icon}</span>
            {!collapsed && (
                <span className="text-[13px] tracking-[-0.01em] truncate">{item.label}</span>
            )}
        </button>
    )
}

export default function ModuleSidebar({
    items,
    collapsed,
    onToggle,
    activeMode,
    mobileOpen,
    onMobileClose,
    sectionLabel,
}: Props) {
    return (
        <>
            {/* ── Desktop sidebar ── */}
            <aside
                className="v2-side hidden sm:flex flex-col border-r border-[#E6EAF0] dark:border-[#1f2937] flex-none overflow-hidden transition-all duration-200"
                style={{ width: collapsed ? 64 : 220 }}
            >
                {/* Section label */}
                {!collapsed && sectionLabel && (
                    <div className="px-4 pt-4 pb-1">
                        <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-slate-400 dark:text-[#4b5563]">
                            {sectionLabel}
                        </span>
                    </div>
                )}

                {/* Items */}
                <nav className={`flex-1 overflow-y-auto px-2 space-y-0.5 ${!collapsed && sectionLabel ? 'pt-1' : 'pt-3'}`}>
                    {items.map(item => (
                        <SidebarItem
                            key={item.mode}
                            item={item}
                            isActive={activeMode === item.mode}
                            collapsed={collapsed}
                            onMobileClose={onMobileClose}
                        />
                    ))}
                </nav>

                {/* Collapse toggle */}
                <div className="border-t border-[#E6EAF0] dark:border-[#1f2937] p-2 flex-none">
                    <button
                        type="button"
                        onClick={onToggle}
                        title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-400 dark:text-[#6b7280] hover:text-slate-600 dark:hover:text-[#9CA3AF] rounded-lg hover:bg-[#E8EDF4] dark:hover:bg-white/[0.05] transition duration-[120ms]"
                    >
                        {collapsed ? (
                            <span className="text-base">›</span>
                        ) : (
                            <>
                                <span className="text-base">‹</span>
                                <span>Recolher</span>
                            </>
                        )}
                    </button>
                </div>
            </aside>

            {/* ── Mobile drawer ── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-50 sm:hidden"
                    onClick={onMobileClose}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Drawer */}
                    <aside
                        className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#1F2937] shadow-xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-[#E6EAF0] dark:border-[#374151] flex-none">
                            <span className="text-sm font-bold text-slate-700 dark:text-[#E5E7EB]">Seções</span>
                            <button
                                type="button"
                                onClick={onMobileClose}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none transition"
                            >
                                ×
                            </button>
                        </div>

                        {/* Items — sempre expandidos no drawer */}
                        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                            {items.map(item => (
                                <SidebarItem
                                    key={item.mode}
                                    item={item}
                                    isActive={activeMode === item.mode}
                                    collapsed={false}
                                    onMobileClose={onMobileClose}
                                />
                            ))}
                        </nav>
                    </aside>
                </div>
            )}
        </>
    )
}
