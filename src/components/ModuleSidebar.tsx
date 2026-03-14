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
            className={`relative w-full flex items-center gap-3 rounded-lg transition-all text-left
                ${collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'}
                ${isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : item.accent
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
        >
            {/* Barra ativa à esquerda */}
            {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-500 rounded-full" />
            )}
            <span className="text-base leading-none shrink-0">{item.icon}</span>
            {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
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
}: Props) {
    return (
        <>
            {/* ── Desktop sidebar ── */}
            <aside
                className="hidden sm:flex flex-col bg-white border-r border-slate-100 flex-none overflow-hidden transition-all duration-200"
                style={{ width: collapsed ? 64 : 224 }}
            >
                {/* Items */}
                <nav className="flex-1 overflow-y-auto pt-4 px-2 space-y-0.5">
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
                <div className="border-t border-slate-100 p-2 flex-none">
                    <button
                        type="button"
                        onClick={onToggle}
                        title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
                        className="w-full flex items-center justify-center gap-1 py-2 text-xs text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
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
                        className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-slate-100 flex-none">
                            <span className="text-sm font-bold text-slate-700">Seções</span>
                            <button
                                type="button"
                                onClick={onMobileClose}
                                className="text-slate-400 hover:text-slate-600 text-xl leading-none transition"
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
