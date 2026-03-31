// src/lib/navigation.ts
// Fonte única de verdade para navegação do MusiLab.
// Contém: tipos, constantes de seção, mapeamento viewMode→seção, tabs por seção.

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type ViewMode =
  | 'agenda' | 'posAula' | 'posAulaHistorico' | 'calendario'
  | 'visaoSemana' | 'lista' | 'nova' | 'porTurmas' | 'sequencias' | 'relatorios'
  | 'turmas' | 'historicoMusical'
  | 'repertorio' | 'atividades' | 'estrategias'
  | 'anoLetivo'

export type SectionId = 'hoje' | 'planejamento' | 'turmas' | 'biblioteca' | 'configuracoes'

export interface NavSection {
    id: SectionId
    label: string
    shortLabel: string
    defaultMode: ViewMode
}

// ─── SEÇÕES PRIMÁRIAS ─────────────────────────────────────────────────────────

export const NAV_SECTIONS: NavSection[] = [
    { id: 'hoje',          label: 'Início',        shortLabel: 'Início', defaultMode: 'agenda' },
    { id: 'planejamento',  label: 'Planejamento',   shortLabel: 'Planos', defaultMode: 'visaoSemana' },
    { id: 'turmas',        label: 'Turmas',         shortLabel: 'Turmas', defaultMode: 'turmas' },
    { id: 'biblioteca',    label: 'Biblioteca',     shortLabel: 'Bib.',   defaultMode: 'repertorio' },
    { id: 'configuracoes', label: 'Configurações',  shortLabel: 'Config', defaultMode: 'anoLetivo' },
]

// ─── MAPEAMENTO viewMode → SEÇÃO ──────────────────────────────────────────────
// ViewModes fantasma (posAula, posAulaHistorico, calendario, nova, porTurmas)
// são estados internos de tela — não aparecem nas SectionTabs, mas
// mantêm o item correto da sidebar destacado.

export const VIEWMODE_TO_SECTION: Record<ViewMode, SectionId> = {
    // Hoje
    agenda:            'hoje',
    posAula:           'hoje',
    posAulaHistorico:  'hoje',
    calendario:        'hoje',
    // Planejamento
    visaoSemana:  'planejamento',
    lista:        'planejamento',
    nova:         'planejamento',
    porTurmas:    'planejamento',
    sequencias:   'planejamento',
    relatorios:   'planejamento',
    // Turmas
    turmas:           'turmas',
    historicoMusical: 'turmas',
    // Biblioteca
    repertorio:  'biblioteca',
    atividades:  'biblioteca',
    estrategias: 'biblioteca',
    // Configurações
    anoLetivo: 'configuracoes',
}

export function getActiveSection(viewMode: ViewMode): SectionId {
    return VIEWMODE_TO_SECTION[viewMode] ?? 'hoje'
}

// ─── SUBITENS DA SIDEBAR ──────────────────────────────────────────────────────
// Seções com subitens na sidebar mostram hierarquia expandível dentro do AppSidebar.
// Ao expandir, a navegação horizontal (SectionTabs) é dispensada para essa seção.

export const SIDEBAR_SUBITEMS: Partial<Record<SectionId, { label: string; mode: ViewMode }[]>> = {
    planejamento: [
        { label: 'Semana',     mode: 'visaoSemana' },
        { label: 'Banco',      mode: 'lista' },
        { label: 'Sequências', mode: 'sequencias' },
    ],
    turmas: [
        { label: 'Painel',    mode: 'turmas' },
        { label: 'Histórico', mode: 'historicoMusical' },
    ],
    biblioteca: [
        { label: 'Repertório',  mode: 'repertorio' },
        { label: 'Atividades',  mode: 'atividades' },
        { label: 'Estratégias', mode: 'estrategias' },
    ],
}

// ─── TABS POR SEÇÃO ───────────────────────────────────────────────────────────
// Usado pelo SectionTabs (mobile only, sm:hidden) para expor os subitens de cada
// seção no topo do conteúdo. Deve espelhar SIDEBAR_SUBITEMS.

export const SECTION_TABS: Partial<Record<SectionId, { label: string; mode: ViewMode }[]>> = {
    planejamento: [
        { label: 'Semana',     mode: 'visaoSemana' },
        { label: 'Banco',      mode: 'lista' },
        { label: 'Sequências', mode: 'sequencias' },
    ],
    turmas: [
        { label: 'Painel',    mode: 'turmas' },
        { label: 'Histórico', mode: 'historicoMusical' },
    ],
    biblioteca: [
        { label: 'Repertório',  mode: 'repertorio' },
        { label: 'Atividades',  mode: 'atividades' },
        { label: 'Estratégias', mode: 'estrategias' },
    ],
}
