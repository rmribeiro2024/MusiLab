// src/contexts/PlanosContext.tsx
// Parte 8 da refatoração: estados e funções de Planos de Aula

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react'
import { useModalContext } from './ModalContext'
import { useAnoLetivoContext } from './AnoLetivoContext'
import { useRepertorioContext } from './RepertorioContext'
import { useCalendarioContext } from './CalendarioContext'
import { useAtividadesContext } from './AtividadesContext'
import { useSequenciasContext } from './SequenciasContext'
import { dbGet, dbSet } from '../lib/db'
import { sanitizeUrl, gerarIdSeguro, validarBackup } from '../lib/utils'
import { carimbарTimestamp, marcarPendente } from '../lib/offlineSync' // [offlineSync]
import { useDebounce } from '../lib/hooks'
import { verificarFeriado } from '../lib/feriados'
import type { Plano, Musica, Atividade, RegistroPosAula } from '../types'

// ── bancoBNCC ── base de habilidades BNCC (copiada de BancoPlanos.tsx)
export const bancoBNCC = [
    // ── EDUCAÇÃO INFANTIL ── Campos de Experiências (música)
    { codigo: "EI02EO01", segmento: "Infantil", desc: "Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.", keywords: ["convivência", "interação", "cuidado", "música coletiva"] },
    { codigo: "EI03EO01", segmento: "Infantil", desc: "Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos, necessidades e maneiras de pensar e agir.", keywords: ["empatia", "sentimentos", "expressão musical"] },
    { codigo: "EI02CG01", segmento: "Infantil", desc: "Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos e brincadeiras.", keywords: ["movimento", "gesto", "dança", "corpo", "brincadeira"] },
    { codigo: "EI03CG01", segmento: "Infantil", desc: "Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções, tanto nas situações do cotidiano quanto em brincadeiras, dança, teatro, música.", keywords: ["expressão corporal", "dança", "movimento", "emoção", "sentimento"] },
    { codigo: "EI02CG03", segmento: "Infantil", desc: "Explorar formas de deslocamento no espaço (pular, saltar, dançar), combinando movimentos e seguindo orientações.", keywords: ["dança", "movimento", "deslocamento", "ritmo corporal"] },
    { codigo: "EI01TS01", segmento: "Infantil", desc: "Explorar sons produzidos com o próprio corpo e com objetos do ambiente.", keywords: ["sons", "corpo", "percussão corporal", "objetos sonoros", "exploração"] },
    { codigo: "EI02TS01", segmento: "Infantil", desc: "Criar sons com materiais, objetos e instrumentos musicais, para acompanhar diversos ritmos de música.", keywords: ["ritmo", "instrumentos", "criação", "sons", "acompanhamento"] },
    { codigo: "EI03TS01", segmento: "Infantil", desc: "Utilizar sons produzidos por materiais, objetos e instrumentos musicais durante brincadeiras de faz de conta, encenações, criações musicais, festas.", keywords: ["criação musical", "instrumentos", "brincadeira", "encenação", "festa"] },
    { codigo: "EI02TS02", segmento: "Infantil", desc: "Utilizar materiais variados com possibilidades de manipulação (argila, massa de modelar), explorando cores, formas, texturas, e sons.", keywords: ["exploração", "sons", "texturas", "sensorial"] },
    { codigo: "EI01EF06", segmento: "Infantil", desc: "Comunicar-se com outras pessoas usando movimentos, gestos, balbucios, fala e outras formas de expressão.", keywords: ["comunicação", "expressão", "voz", "canto"] },
    { codigo: "EI02EF06", segmento: "Infantil", desc: "Criar e contar histórias oralmente, com base em imagens ou temas sugeridos.", keywords: ["história", "sonorização", "narrativa", "voz"] },
    { codigo: "EI03EF06", segmento: "Infantil", desc: "Produzir suas próprias histórias orais e escritas (escrita espontânea), em situações com função social significativa.", keywords: ["criação", "narrativa", "sonorização de história"] },
    { codigo: "EI03EF09", segmento: "Infantil", desc: "Levantar hipóteses em relação à linguagem escrita, realizando registros de palavras e textos, por meio de representações gráficas.", keywords: ["registro", "grafia musical", "notação"] },
    // ── EF 1º AO 5º ANO ──
    { codigo: "EF15AR13", segmento: "EF1-5", desc: "Identificar e apreciar criticamente diversas formas e gêneros de expressão musical.", keywords: ["apreciar", "gêneros", "contextos", "escuta", "identificar"] },
    { codigo: "EF15AR14", segmento: "EF1-5", desc: "Perceber e explorar os elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo e duração).", keywords: ["altura", "intensidade", "timbre", "melodia", "ritmo", "duração", "elementos", "jogo"] },
    { codigo: "EF15AR15", segmento: "EF1-5", desc: "Explorar fontes sonoras diversas (corpo, natureza, objetos e instrumentos).", keywords: ["fontes sonoras", "corpo", "percussão corporal", "voz", "cotidiano", "instrumentos"] },
    { codigo: "EF15AR16", segmento: "EF1-5", desc: "Explorar diferentes formas de registro musical não convencional e convencional.", keywords: ["registro", "grafia", "partitura", "desenho", "gravação"] },
    { codigo: "EF15AR17", segmento: "EF1-5", desc: "Experimentar improvisações, composições e sonorização de histórias.", keywords: ["improvisação", "criação", "composição", "história", "sonorização", "criar"] },
    { codigo: "EF15AR18", segmento: "EF1-5", desc: "Reconhecer e apreciar o papel de músicos e grupos brasileiros e estrangeiros.", keywords: ["cultura", "brasileira", "artista", "compositor", "grupo"] },
    { codigo: "EF15AR19", segmento: "EF1-5", desc: "Descobrir e experimentar sonoridades e ritmos de diferentes matrizes estéticas e culturais.", keywords: ["cultura", "indígena", "africana", "matrizes", "folclore"] },
    { codigo: "EF15AR23", segmento: "EF1-5", desc: "Reconhecer e experimentar, em projetos temáticos, as relações entre linguagens artísticas.", keywords: ["integrada", "dança", "teatro", "artes visuais"] },
    { codigo: "EF15AR24", segmento: "EF1-5", desc: "Caracterizar e experimentar brinquedos, brincadeiras, jogos, danças e canções.", keywords: ["brincadeira", "roda", "dança", "jogo"] },
    { codigo: "EF15AR25", segmento: "EF1-5", desc: "Conhecer e valorizar o patrimônio cultural, material e imaterial.", keywords: ["patrimônio", "cultura", "popular"] },
    // ── EF 6º AO 9º ANO ──
    { codigo: "EF69AR16", segmento: "EF6-9", desc: "Analisar criticamente, por meio da apreciação musical, usos e funções da música em seus contextos de produção e circulação.", keywords: ["apreciação", "análise", "contexto", "função", "crítica"] },
    { codigo: "EF69AR17", segmento: "EF6-9", desc: "Explorar e analisar, criticamente, diferentes meios e equipamentos culturais de acesso à produção e à apreciação artística.", keywords: ["mídia", "tecnologia", "acesso", "digital", "streaming"] },
    { codigo: "EF69AR18", segmento: "EF6-9", desc: "Reconhecer e apreciar o papel de músicos e grupos de música brasileira e mundial, em diferentes épocas, contextos e estilos musicais.", keywords: ["história da música", "artistas", "estilos", "época", "mundo"] },
    { codigo: "EF69AR19", segmento: "EF6-9", desc: "Identificar e analisar diferentes estilos musicais, contextualizando-os no tempo e no espaço, de modo a aprimorar a capacidade de apreciação da estética musical.", keywords: ["estilos musicais", "contextualização", "história", "estética"] },
    { codigo: "EF69AR20", segmento: "EF6-9", desc: "Explorar e analisar elementos constitutivos da música (altura, intensidade, timbre, melodia, ritmo, harmonia, textura, forma, entre outros), por meio de recursos tecnológicos.", keywords: ["harmonia", "textura", "forma", "altura", "timbre", "ritmo", "melodia", "elementos"] },
    { codigo: "EF69AR21", segmento: "EF6-9", desc: "Explorar e criar improvisações, composições, arranjos, jingles, trilhas sonoras, entre outros, utilizando vozes, sons corporais e/ou instrumentos acústicos ou eletrônicos.", keywords: ["composição", "arranjo", "improvisação", "trilha sonora", "jingle", "criação", "eletrônico"] },
    { codigo: "EF69AR22", segmento: "EF6-9", desc: "Explorar e identificar diferentes formas de registro musical (notação musical tradicional, formas alternativas de notação musical e registro em áudio e vídeo).", keywords: ["notação", "partitura", "registro", "gravação", "áudio", "vídeo"] },
    { codigo: "EF69AR23", segmento: "EF6-9", desc: "Explorar e criar experimentações sonoras e músicas com tecnologias digitais.", keywords: ["tecnologia", "digital", "experimentação", "eletrônico", "computador"] },
    { codigo: "EF69AR24", segmento: "EF6-9", desc: "Explorar e analisar formas distintas de manifestações do movimento (de pessoas e grupos) presentes em diferentes contextos.", keywords: ["movimento", "dança", "corpo", "performance"] },
    { codigo: "EF69AR31", segmento: "EF6-9", desc: "Relacionar as práticas artísticas às diferentes dimensões da vida social, cultural, política, histórica, econômica, estética e ética.", keywords: ["sociedade", "política", "cultura", "história", "interdisciplinar"] },
    { codigo: "EF69AR32", segmento: "EF6-9", desc: "Analisar e explorar, em projetos temáticos, as relações processuais entre diversas linguagens artísticas.", keywords: ["projeto", "interdisciplinar", "linguagens", "integrado"] },
    { codigo: "EF69AR33", segmento: "EF6-9", desc: "Analisar aspectos históricos, sociais e políticos da produção artística, problematizando as narrativas eurocêntricas e as outras representações hegemônicas.", keywords: ["história", "africana", "indígena", "diversidade", "cultura popular", "patrimônio"] },
    { codigo: "EF69AR34", segmento: "EF6-9", desc: "Analisar e valorizar o patrimônio cultural, material e imaterial, de culturas diversas.", keywords: ["patrimônio", "cultura", "popular", "folclore", "diversidade"] },
    { codigo: "EF69AR35", segmento: "EF6-9", desc: "Identificar e manipular diferentes tecnologias e recursos digitais para acessar, apreciar, produzir, registrar e compartilhar práticas e repertórios musicais.", keywords: ["tecnologia", "digital", "compartilhar", "produção", "registro"] },
]

// ── normalizePlano ── garante defaults em todos os campos
export function normalizePlano(p: any): Plano {
    let atividadesRoteiro = p.atividadesRoteiro || []
    if (!p.atividadesRoteiro && p.metodologia && p.metodologia.trim()) {
        atividadesRoteiro = [{ id: Date.now(), nome: '', duracao: '', descricao: p.metodologia }]
    }
    return {
        ...p,
        conceitos:            p.conceitos            || [],
        tags:                 p.tags                 || [],
        unidades:             p.unidades             || [],
        faixaEtaria:          p.faixaEtaria          || [],
        objetivosEspecificos: p.objetivosEspecificos || [],
        materiais:            p.materiais            || [],
        habilidadesBNCC:      p.habilidadesBNCC      || [],
        recursos:             p.recursos             || [],
        historicoDatas:       p.historicoDatas       || [],
        registrosPosAula:     p.registrosPosAula     || [],
        atividadesRoteiro:    atividadesRoteiro,
        destaque:             p.destaque             || false,
        statusPlanejamento:   p.statusPlanejamento   || 'A Fazer',
    }
}

// ── Reducer: Filtros ──────────────────────────────────────────────────────
interface FiltrosState {
    busca: string
    filtroConceito: string
    filtroUnidade: string
    filtroFaixa: string
    filtroNivel: string
    filtroEscola: string
    filtroTag: string
    filtroFavorito: boolean
    filtroStatus: string
    modoVisualizacao: string
    ordenacaoCards: string
}
const FILTROS_INITIAL: FiltrosState = {
    busca: '', filtroConceito: 'Todos', filtroUnidade: 'Todos', filtroFaixa: 'Todos',
    filtroNivel: 'Todos', filtroEscola: 'Todas', filtroTag: 'Todas',
    filtroFavorito: false, filtroStatus: 'Todos', modoVisualizacao: 'grade', ordenacaoCards: 'recente',
}
type FiltrosAction = { type: 'SET'; payload: Partial<FiltrosState> } | { type: 'RESET' }
function filtrosReducer(state: FiltrosState, action: FiltrosAction): FiltrosState {
    switch (action.type) {
        case 'SET': return { ...state, ...action.payload }
        case 'RESET': return FILTROS_INITIAL
    }
}

// ── Reducer: Edição ───────────────────────────────────────────────────────
interface EdicaoState {
    planoSelecionado: Plano | null
    modoEdicao: boolean
    planoEditando: Plano | null
    formExpandido: boolean
}
const EDICAO_INITIAL: EdicaoState = { planoSelecionado: null, modoEdicao: false, planoEditando: null, formExpandido: false }
type EdicaoAction =
    | { type: 'NOVO_PLANO'; plano: Plano }
    | { type: 'EDITAR_PLANO'; plano: Plano }
    | { type: 'FECHAR' }
    | { type: 'SET'; payload: Partial<EdicaoState> }
function edicaoReducer(state: EdicaoState, action: EdicaoAction): EdicaoState {
    switch (action.type) {
        case 'NOVO_PLANO':   return { planoSelecionado: null, modoEdicao: true, planoEditando: action.plano, formExpandido: false }
        case 'EDITAR_PLANO': return { ...state, planoSelecionado: null, modoEdicao: true, planoEditando: action.plano }
        case 'FECHAR':       return EDICAO_INITIAL
        case 'SET':          return { ...state, ...action.payload }
    }
}

// ── Interface ────────────────────────────────────────────────────────────
export interface PlanosContextValue {
    // estados
    planos: Plano[]; setPlanos: React.Dispatch<React.SetStateAction<Plano[]>>
    planoSelecionado: Plano | null; setPlanoSelecionado: React.Dispatch<React.SetStateAction<Plano | null>>
    modoEdicao: boolean; setModoEdicao: React.Dispatch<React.SetStateAction<boolean>>
    planoEditando: Plano | null; setPlanoEditando: React.Dispatch<React.SetStateAction<Plano | null>>
    formExpandido: boolean; setFormExpandido: React.Dispatch<React.SetStateAction<boolean>>
    materiaisBloqueados: string[]; setMateriaisBloqueados: React.Dispatch<React.SetStateAction<string[]>>
    novoConceito: string; setNovoConceito: React.Dispatch<React.SetStateAction<string>>
    adicionandoConceito: boolean | 'editar'; setAdicionandoConceito: React.Dispatch<React.SetStateAction<boolean | 'editar'>>
    novaUnidade: string; setNovaUnidade: React.Dispatch<React.SetStateAction<string>>
    adicionandoUnidade: boolean; setAdicionandoUnidade: React.Dispatch<React.SetStateAction<boolean>>
    novoRecursoUrl: string; setNovoRecursoUrl: React.Dispatch<React.SetStateAction<string>>
    novoRecursoTipo: string; setNovoRecursoTipo: React.Dispatch<React.SetStateAction<string>>
    novaDataAula: string; setNovaDataAula: React.Dispatch<React.SetStateAction<string>>
    dataEdicao: string; setDataEdicao: React.Dispatch<React.SetStateAction<string>>
    busca: string; setBusca: React.Dispatch<React.SetStateAction<string>>
    filtroConceito: string; setFiltroConceito: React.Dispatch<React.SetStateAction<string>>
    filtroUnidade: string; setFiltroUnidade: React.Dispatch<React.SetStateAction<string>>
    filtroFaixa: string; setFiltroFaixa: React.Dispatch<React.SetStateAction<string>>
    filtroNivel: string; setFiltroNivel: React.Dispatch<React.SetStateAction<string>>
    filtroEscola: string; setFiltroEscola: React.Dispatch<React.SetStateAction<string>>
    filtroTag: string; setFiltroTag: React.Dispatch<React.SetStateAction<string>>
    recursosExpandidos: Record<string, boolean>; setRecursosExpandidos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    modalImportarMusica: boolean; setModalImportarMusica: React.Dispatch<React.SetStateAction<boolean>>
    modalImportarAtividade: boolean; setModalImportarAtividade: React.Dispatch<React.SetStateAction<boolean>>
    filtroFavorito: boolean; setFiltroFavorito: React.Dispatch<React.SetStateAction<boolean>>
    filtroStatus: string; setFiltroStatus: React.Dispatch<React.SetStateAction<string>>
    modoVisualizacao: string; setModoVisualizacao: React.Dispatch<React.SetStateAction<string>>
    ordenacaoCards: string; setOrdenacaoCards: React.Dispatch<React.SetStateAction<string>>
    limparFiltros: () => void
    statusDropdownId: string | number | null; setStatusDropdownId: React.Dispatch<React.SetStateAction<string | number | null>>
    dragActiveIndex: number | null; setDragActiveIndex: React.Dispatch<React.SetStateAction<number | null>>
    dragOverIndex: number | null; setDragOverIndex: React.Dispatch<React.SetStateAction<number | null>>
    // computed
    escolas: string[]
    duracoesSugestao: string[]
    planosFiltrados: Plano[]
    // funções
    normalizePlano: (p: Record<string, unknown>) => Plano
    buscaAvancada: (plano: Plano, termoBusca: string) => boolean
    sugerirBNCC: () => void
    novoPlano: () => void
    editarPlano: (plano: Plano) => void
    salvarPlano: (ignorarAvisoEscola?: boolean) => void
    excluirPlano: (id: string | number) => void
    fecharModal: () => void
    restaurarVersao: (plano: Plano, versao: Plano & { _versaoSalvaEm: string }) => void
    toggleConceito: (c: string) => void
    toggleFaixa: (f: string) => void
    toggleUnidade: (u: string) => void
    adicionarRecurso: () => void
    removerRecurso: (idx: number) => void
    adicionarDataEdicao: () => void
    removerDataEdicao: (d: string) => void
    adicionarDataAulaVisualizacao: () => void
    removerDataAulaVisualizacao: (d: string) => void
    adicionarConceitoNovo: () => void
    adicionarTagNova: (tag: string) => void
    removerTag: (tag: string) => void
    adicionarUnidadeNova: () => void
    adicionarAtividadeRoteiro: () => void
    removerAtividadeRoteiro: (id: string | number) => void
    atualizarAtividadeRoteiro: (id: string | number, campo: string, valor: unknown) => void
    toggleFavorito: (plano: Plano, e?: React.MouseEvent) => void
    handleDragStart: (index: number) => void
    handleDragEnter: (index: number) => void
    handleDragEnd: () => void
    toggleRecursosAtiv: (idx: number | string) => void
    // templates de roteiro
    templatesRoteiro: { id: string | number; nome: string; criadoEm?: string; atividades: { nome: string; duracao: string; descricao?: string }[] }[]
    setTemplatesRoteiro: React.Dispatch<React.SetStateAction<{ id: string | number; nome: string; criadoEm?: string; atividades: { nome: string; duracao: string; descricao?: string }[] }[]>>
    modalTemplates: boolean; setModalTemplates: React.Dispatch<React.SetStateAction<boolean>>
    nomeNovoTemplate: string; setNomeNovoTemplate: React.Dispatch<React.SetStateAction<string>>
    modalConfiguracoes: boolean; setModalConfiguracoes: React.Dispatch<React.SetStateAction<boolean>>
    // funções cross-domain
    vincularMusicaAtividade: (musica: Musica) => void
    importarMusicaParaPlano: (musica: Musica) => void
    importarAtividadeParaPlano: (atividade: Atividade) => void
    abrirModalRegistro: (plano: Plano, e?: React.MouseEvent) => void
    salvarRegistro: () => void
    editarRegistro: (reg: RegistroPosAula) => void
    excluirRegistro: (registroId: string | number) => void
    adicionarAtividadeAoPlano: (atividadeId: string | number, planoId: string | number) => void
    sugerirPlanoParaTurma: (anoId: string, escolaId: string, segmentoId: string, turmaId: string) => string | null
    salvarRegistroRapido: () => void
    // backup
    baixarBackup: () => void
    restaurarBackup: (event: React.ChangeEvent<HTMLInputElement>) => void
    // userId
    userId: string | null
}

const PlanosContext = React.createContext<PlanosContextValue | null>(null)

export function usePlanosContext(): PlanosContextValue {
    const ctx = React.useContext(PlanosContext)
    if (!ctx) throw new Error('usePlanosContext deve ser usado dentro de PlanosProvider')
    return ctx
}

// ── Provider ─────────────────────────────────────────────────────────────
interface PlanosProviderProps {
    userId: string | null
    children: React.ReactNode
}

export function PlanosProvider({ userId, children }: PlanosProviderProps) {
    const { setModalConfirm } = useModalContext()
    const {
        setViewMode, repertorio, setRepertorio,
        compassosCustomizados, setCompassosCustomizados,
        tonalidadesCustomizadas, setTonalidadesCustomizadas,
        andamentosCustomizados, setAndamentosCustomizados,
        escalasCustomizadas, setEscalasCustomizadas,
        estruturasCustomizadas, setEstruturasCustomizadas,
        dinamicasCustomizadas, setDinamicasCustomizadas,
        energiasCustomizadas, setEnergiasCustomizadas,
        instrumentacaoCustomizada, setInstrumentacaoCustomizada,
    } = useRepertorioContext()
    const {
        anosLetivos, setAnosLetivos, setModalTurmas,
        conceitos, setConceitos, unidades, setUnidades,
        faixas, setFaixas, tagsGlobais, setTagsGlobais,
        eventosEscolares, setEventosEscolares,
    } = useAnoLetivoContext()
    const {
        modalRegistro, setModalRegistro,
        planoParaRegistro, setPlanoParaRegistro,
        novoRegistro, setNovoRegistro,
        verRegistros: _verRegistros, setVerRegistros,
        registroEditando: _regEdit, setRegistroEditando,
        regAnoSel, setRegAnoSel,
        regEscolaSel, setRegEscolaSel,
        regSegmentoSel, setRegSegmentoSel,
        regTurmaSel, setRegTurmaSel,
        filtroRegAno: _filtroRegAno, setFiltroRegAno,
        modalRegistroRapido: _modalRR, setModalRegistroRapido,
        rrData, rrAnoSel, rrEscolaSel, rrPlanosSegmento, rrTextos,
        setRrTextos, setRrPlanosSegmento,
        gradesSemanas, setGradesSemanas,
    } = useCalendarioContext()
    const {
        atividades, setAtividades,
        atividadeEditando, setAtividadeEditando,
        atividadeVinculandoMusica, setAtividadeVinculandoMusica,
        setModalAdicionarAoPlano,
    } = useAtividadesContext()
    const { sequencias, setSequencias } = useSequenciasContext()

    // ── ESTADOS ──────────────────────────────────────────────────────────
    const [planos, setPlanos] = useState<Plano[]>(() => {
        const saved = dbGet('planosAula')
        const parsed = saved ? JSON.parse(saved) : []
        return parsed.map(normalizePlano)
    })
    // useReducer: edição do plano (planoSelecionado + modoEdicao + planoEditando + formExpandido)
    const [edicao, edicaoDispatch] = useReducer(edicaoReducer, EDICAO_INITIAL)
    const { planoSelecionado, modoEdicao, planoEditando, formExpandido } = edicao
    const edicaoRef = useRef(edicao); edicaoRef.current = edicao
    const setPlanoSelecionado: React.Dispatch<React.SetStateAction<Plano | null>> = (v) =>
        edicaoDispatch({ type: 'SET', payload: { planoSelecionado: typeof v === 'function' ? v(edicaoRef.current.planoSelecionado) : v } })
    const setModoEdicao: React.Dispatch<React.SetStateAction<boolean>> = (v) =>
        edicaoDispatch({ type: 'SET', payload: { modoEdicao: typeof v === 'function' ? v(edicaoRef.current.modoEdicao) : v } })
    const setPlanoEditando: React.Dispatch<React.SetStateAction<Plano | null>> = (v) =>
        edicaoDispatch({ type: 'SET', payload: { planoEditando: typeof v === 'function' ? v(edicaoRef.current.planoEditando) : v } })
    const setFormExpandido: React.Dispatch<React.SetStateAction<boolean>> = (v) =>
        edicaoDispatch({ type: 'SET', payload: { formExpandido: typeof v === 'function' ? v(edicaoRef.current.formExpandido) : v } })
    const [materiaisBloqueados, setMateriaisBloqueados] = useState<string[]>(() => {
        const saved = dbGet('materiaisBloqueados')
        return saved ? JSON.parse(saved) : []
    })
    // inputs temporários
    const [novoConceito, setNovoConceito] = useState('')
    const [adicionandoConceito, setAdicionandoConceito] = useState<boolean | 'editar'>(false)
    const [novaUnidade, setNovaUnidade] = useState('')
    const [adicionandoUnidade, setAdicionandoUnidade] = useState(false)
    const [novoRecursoUrl, setNovoRecursoUrl] = useState('')
    const [novoRecursoTipo, setNovoRecursoTipo] = useState('link')
    const [novaDataAula, setNovaDataAula] = useState('')
    const [dataEdicao, setDataEdicao] = useState('')
    // useReducer: filtros e visualização (busca + 8 filtros + modoVisualizacao + ordenacaoCards)
    const [filtros, filtrosDispatch] = useReducer(filtrosReducer, FILTROS_INITIAL)
    const { busca, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel, filtroEscola, filtroTag, filtroFavorito, filtroStatus, modoVisualizacao, ordenacaoCards } = filtros
    const filtrosRef = useRef(filtros); filtrosRef.current = filtros
    const buscaDebounced = useDebounce(busca, 300)
    const setBusca: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { busca: typeof v === 'function' ? v(filtrosRef.current.busca) : v } })
    const setFiltroConceito: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroConceito: typeof v === 'function' ? v(filtrosRef.current.filtroConceito) : v } })
    const setFiltroUnidade: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroUnidade: typeof v === 'function' ? v(filtrosRef.current.filtroUnidade) : v } })
    const setFiltroFaixa: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroFaixa: typeof v === 'function' ? v(filtrosRef.current.filtroFaixa) : v } })
    const setFiltroNivel: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroNivel: typeof v === 'function' ? v(filtrosRef.current.filtroNivel) : v } })
    const setFiltroEscola: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroEscola: typeof v === 'function' ? v(filtrosRef.current.filtroEscola) : v } })
    const setFiltroTag: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroTag: typeof v === 'function' ? v(filtrosRef.current.filtroTag) : v } })
    const setFiltroFavorito: React.Dispatch<React.SetStateAction<boolean>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroFavorito: typeof v === 'function' ? v(filtrosRef.current.filtroFavorito) : v } })
    const setFiltroStatus: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroStatus: typeof v === 'function' ? v(filtrosRef.current.filtroStatus) : v } })
    const setModoVisualizacao: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { modoVisualizacao: typeof v === 'function' ? v(filtrosRef.current.modoVisualizacao) : v } })
    const setOrdenacaoCards: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { ordenacaoCards: typeof v === 'function' ? v(filtrosRef.current.ordenacaoCards) : v } })
    const limparFiltros = () => filtrosDispatch({ type: 'RESET' })
    const [statusDropdownId, setStatusDropdownId] = useState<string | number | null>(null)
    const [recursosExpandidos, setRecursosExpandidos] = useState<Record<string, boolean>>({})
    const [modalImportarMusica, setModalImportarMusica] = useState(false)
    const [modalImportarAtividade, setModalImportarAtividade] = useState(false)
    // drag and drop
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)
    const [dragActiveIndex, setDragActiveIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    // templates e configurações
    const [templatesRoteiro, setTemplatesRoteiro] = useState<{ id: string | number; nome: string; criadoEm?: string; atividades: { nome: string; duracao: string; descricao?: string }[] }[]>(() => {
        const saved = dbGet('templatesRoteiro')
        return saved ? JSON.parse(saved) : []
    })
    const [modalTemplates, setModalTemplates] = useState(false)
    const [nomeNovoTemplate, setNomeNovoTemplate] = useState('')
    const [modalConfiguracoes, setModalConfiguracoes] = useState(false)

    // ── EFEITOS ───────────────────────────────────────────────────────────
    useEffect(() => { dbSet('planosAula', JSON.stringify(planos)) }, [planos])
    useEffect(() => { dbSet('materiaisBloqueados', JSON.stringify(materiaisBloqueados)) }, [materiaisBloqueados])
    useEffect(() => { dbSet('templatesRoteiro', JSON.stringify(templatesRoteiro)) }, [templatesRoteiro])

    // Fechar dropdown de status ao clicar fora
    useEffect(() => {
        if (!statusDropdownId) return
        const handler = () => setStatusDropdownId(null)
        document.addEventListener('click', handler)
        return () => document.removeEventListener('click', handler)
    }, [statusDropdownId])

    // Proteção contra fechar aba com edição não salva
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (modoEdicao && planoEditando) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handler)
        return () => window.removeEventListener('beforeunload', handler)
    }, [modoEdicao, planoEditando])

    // ── COMPUTED ──────────────────────────────────────────────────────────
    const escolas = useMemo(() => {
        const s = new Set<string>()
        planos.forEach(p => { if (p.escola && p.escola.trim()) s.add(p.escola.trim()) })
        return ['Todas', ...Array.from(s).sort()]
    }, [planos])

    const duracoesSugestao = useMemo(() => {
        const d = new Set<string>()
        planos.forEach(p => { if (p.duracao) d.add(p.duracao) })
        return Array.from(d).sort()
    }, [planos])

    const buscaAvancada = (plano: any, termoBusca: string) => {
        if (!termoBusca) return true
        const termo = termoBusca.toLowerCase()
        const check = (val: any) => val && val.toLowerCase().includes(termo)
        const objMatch = (plano.objetivosEspecificos || []).some((obj: any) => check(obj))
        const atividadeMatch = (plano.atividadesRoteiro || []).some((a: any) => check(a.nome) || check(a.descricao))
        return check(plano.titulo) || check(plano.tema) || check(plano.metodologia) ||
            check(plano.objetivoGeral) || check(plano.escola) || objMatch || atividadeMatch ||
            (plano.habilidadesBNCC || []).some((h: any) => check(h))
    }

    const planosFiltrados = useMemo(() => {
        return planos.filter(plano => {
            const matchBusca    = buscaAvancada(plano, buscaDebounced)
            const matchConceito = filtroConceito === 'Todos'  || (plano.conceitos && plano.conceitos.includes(filtroConceito))
            const matchUnidade  = filtroUnidade  === 'Todos'  || (plano.unidades  && plano.unidades.includes(filtroUnidade))
            const matchFaixa    = filtroFaixa    === 'Todos'  || (plano.faixaEtaria && plano.faixaEtaria.includes(filtroFaixa))
            const matchNivel    = filtroNivel    === 'Todos'  || plano.nivel === filtroNivel
            const matchEscola   = filtroEscola   === 'Todas'  || plano.escola === filtroEscola
            const matchTag      = filtroTag      === 'Todas'  || (plano.tags && plano.tags.includes(filtroTag))
            const matchFavorito = !filtroFavorito || plano.destaque
            const matchStatus   = filtroStatus   === 'Todos'  || (plano.statusPlanejamento || 'A Fazer') === filtroStatus
            return matchBusca && matchConceito && matchUnidade && matchFaixa && matchNivel && matchEscola && matchTag && matchFavorito && matchStatus
        }).sort((a: any, b: any) => {
            if (ordenacaoCards === 'az')        return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR')
            if (ordenacaoCards === 'status') {
                const ord: Record<string, number> = { 'Em Andamento': 0, 'A Fazer': 1, 'Concluído': 2 }
                return (ord[a.statusPlanejamento || 'A Fazer'] || 1) - (ord[b.statusPlanejamento || 'A Fazer'] || 1)
            }
            if (ordenacaoCards === 'favoritos') return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0)
            return b.id - a.id
        })
    }, [planos, buscaDebounced, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel, filtroEscola, filtroTag, filtroFavorito, filtroStatus, ordenacaoCards])

    // ── FUNÇÕES: PLANOS ───────────────────────────────────────────────────
    const novoPlano = () => {
        edicaoDispatch({ type: 'NOVO_PLANO', plano: {
            id: String(Date.now()), titulo: '', tema: '', conceitos: [], tags: [],
            faixaEtaria: ['1° ano'], nivel: 'Iniciante', duracao: '',
            objetivoGeral: '', objetivosEspecificos: [], habilidadesBNCC: [],
            metodologia: '', materiais: [], recursos: [], historicoDatas: [],
            avaliacaoObservacoes: '', numeroAula: '', escola: '', destaque: false,
            statusPlanejamento: 'A Fazer',
            unidades: [], atividadesRoteiro: [], registrosPosAula: [],
        } as Plano })
        setViewMode('lista')
    }

    const editarPlano = useCallback((plano: any) => {
        edicaoDispatch({ type: 'EDITAR_PLANO', plano: normalizePlano(plano) })
        setViewMode('lista')
    }, [setViewMode])

    const salvarPlano = (ignorarAvisoEscola = false) => {
        if (!planoEditando.titulo || !planoEditando.titulo.trim()) {
            setModalConfirm({ conteudo: '⚠️ Preencha o título do plano antes de salvar.', somenteOk: true, labelConfirm: 'OK' }); return
        }
        if (!planoEditando.objetivoGeral || !planoEditando.objetivoGeral.trim()) {
            setModalConfirm({ conteudo: '⚠️ Preencha o objetivo geral antes de salvar.', somenteOk: true, labelConfirm: 'OK' }); return
        }
        if (!ignorarAvisoEscola && (!planoEditando.escola || !planoEditando.escola.trim())) {
            setModalConfirm({
                titulo: '🏫 Escola não preenchida',
                conteudo: 'Sem escola definida, o Histórico Musical por turma não funcionará de forma precisa. Salvar assim mesmo?',
                labelConfirm: 'Salvar assim mesmo', labelCancelar: 'Voltar e preencher',
                onConfirm: () => salvarPlano(true),
            }); return
        }
        if (!ignorarAvisoEscola && planoEditando.escola && planoEditando.escola.trim()) {
            const escolaNorm = planoEditando.escola.trim().toLowerCase()
            const semTurmas = anosLetivos.some((a: any) => a.escolas.some((e: any) => {
                const totalTurmas = (e.segmentos || []).reduce((acc: number, s: any) => acc + (s.turmas || []).length, 0)
                return e.nome.trim().toLowerCase() === escolaNorm && totalTurmas === 0
            }))
            if (semTurmas) {
                setModalConfirm({
                    titulo: '🏫 Escola sem turmas',
                    conteudo: 'A escola selecionada ainda não tem turmas cadastradas. O filtro por turma no Histórico Musical será impreciso. Deseja cadastrar as turmas agora?',
                    labelConfirm: 'Cadastrar turmas', labelCancelar: 'Salvar assim mesmo',
                    onConfirm: () => { salvarPlano(true); edicaoDispatch({ type: 'FECHAR' }); setModalTurmas(true) },
                    onCancel: () => salvarPlano(true),
                }); return
            }
        }
        const planoParaSalvar = carimbарTimestamp({ // [offlineSync]
            ...planoEditando,
            objetivosEspecificos: planoEditando.objetivosEspecificos.filter((i: string) => i.trim() !== ''),
            habilidadesBNCC: (planoEditando.habilidadesBNCC || []).filter((i: string) => i.trim() !== ''),
            materiais: planoEditando.materiais.filter((i: string) => i.trim() !== ''),
            _ultimaEdicao: new Date().toISOString(),
        }) // [offlineSync]
        const existe = planos.find((p: any) => p.id === planoParaSalvar.id)
        if (existe) {
            const versaoAnterior = { ...existe, _versaoSalvaEm: new Date().toISOString() }
            const historicoAtual = existe._historicoVersoes || []
            const novoHistorico = [versaoAnterior, ...historicoAtual].slice(0, 3)
            setPlanos(planos.map((p: any) => p.id === planoParaSalvar.id ? { ...planoParaSalvar, _historicoVersoes: novoHistorico } : p))
            if (!userId) marcarPendente('planos', String(planoParaSalvar.id)) // [offlineSync]
        } else {
            setPlanos([...planos, planoParaSalvar])
            if (!userId) marcarPendente('planos', String(planoParaSalvar.id)) // [offlineSync]
        }
        edicaoDispatch({ type: 'SET', payload: { modoEdicao: false, planoEditando: null } })
    }

    const excluirPlano = useCallback((id: any) => {
        setModalConfirm({
            titulo: 'Excluir plano?', conteudo: 'Esta ação não pode ser desfeita.',
            labelConfirm: 'Excluir', perigo: true,
            onConfirm: () => { setPlanos(prev => prev.filter((p: any) => p.id !== id)); setPlanoSelecionado(null) }
        })
    }, [setModalConfirm])

    const fecharModal = () => {
        edicaoDispatch({ type: 'FECHAR' })
        setNovoRecursoUrl('')
    }

    const restaurarVersao = (plano: any, versao: any) => {
        setModalConfirm({
            titulo: 'Restaurar versão?',
            conteudo: `Restaurar versão de ${new Date(versao._versaoSalvaEm).toLocaleString('pt-BR')}?\n\nA versão atual será substituída.`,
            labelConfirm: 'Restaurar', perigo: true,
            onConfirm: () => {
                const historicoAtual = plano._historicoVersoes || []
                const versaoRestaurada = { ...versao, _historicoVersoes: historicoAtual, _versaoSalvaEm: undefined }
                delete versaoRestaurada._versaoSalvaEm
                setPlanos(planos.map((p: any) => p.id === plano.id ? versaoRestaurada : p))
                setModalConfirm({ conteudo: '✅ Versão restaurada!', somenteOk: true, labelConfirm: 'OK' })
            }
        })
    }

    // ── FUNÇÕES: EDIÇÃO DE CAMPOS ─────────────────────────────────────────
    const toggleConceito = (c: string) => {
        const atual = planoEditando.conceitos || []
        setPlanoEditando({ ...planoEditando, conceitos: atual.includes(c) ? atual.filter((x: string) => x !== c) : [...atual, c] })
    }
    const toggleFaixa = (f: string) => {
        const atual = planoEditando.faixaEtaria || []
        setPlanoEditando({ ...planoEditando, faixaEtaria: atual.includes(f) ? atual.filter((x: string) => x !== f) : [...atual, f] })
    }
    const toggleUnidade = (u: string) => {
        const atual = planoEditando.unidades || []
        setPlanoEditando({ ...planoEditando, unidades: atual.includes(u) ? atual.filter((x: string) => x !== u) : [...atual, u] })
    }
    const adicionarRecurso = () => {
        if (novoRecursoUrl.trim()) {
            setPlanoEditando({ ...planoEditando, recursos: [...(planoEditando.recursos || []), { url: sanitizeUrl(novoRecursoUrl.trim()), tipo: novoRecursoTipo }] })
            setNovoRecursoUrl('')
        }
    }
    const removerRecurso = (idx: number) => {
        const n = [...planoEditando.recursos]; n.splice(idx, 1)
        setPlanoEditando({ ...planoEditando, recursos: n })
    }
    const adicionarDataEdicao = () => {
        if (dataEdicao && !(planoEditando.historicoDatas || []).includes(dataEdicao))
            setPlanoEditando({ ...planoEditando, historicoDatas: [...(planoEditando.historicoDatas || []), dataEdicao].sort() })
        setDataEdicao('')
    }
    const removerDataEdicao = (d: string) => {
        setPlanoEditando({ ...planoEditando, historicoDatas: planoEditando.historicoDatas.filter((x: string) => x !== d) })
    }
    const adicionarDataAulaVisualizacao = () => {
        if (novaDataAula && !(planoSelecionado.historicoDatas || []).includes(novaDataAula)) {
            const n = { ...planoSelecionado, historicoDatas: [...(planoSelecionado.historicoDatas || []), novaDataAula].sort() }
            setPlanos(planos.map((p: any) => p.id === n.id ? n : p))
            setPlanoSelecionado(n)
        }
        setNovaDataAula('')
    }
    const removerDataAulaVisualizacao = (d: string) => {
        setModalConfirm({
            titulo: 'Remover data?', conteudo: 'Remover esta data do histórico?', labelConfirm: 'Remover', perigo: true,
            onConfirm: () => {
                const n = { ...planoSelecionado, historicoDatas: planoSelecionado.historicoDatas.filter((x: string) => x !== d) }
                setPlanos(planos.map((p: any) => p.id === n.id ? n : p))
                setPlanoSelecionado(n)
            }
        })
    }
    const adicionarConceitoNovo = () => {
        if (novoConceito.trim()) {
            const c = novoConceito.trim()
            if (!(planoEditando.conceitos || []).includes(c))
                setPlanoEditando({ ...planoEditando, conceitos: [...(planoEditando.conceitos || []), c] })
            if (!conceitos.includes(c)) setConceitos([...conceitos, c].sort())
            setNovoConceito(''); setAdicionandoConceito(false)
        }
    }
    const adicionarTagNova = (novaTag: string) => {
        if (!novaTag || !novaTag.trim()) return
        const tag = novaTag.trim().replace(/^#/, '')
        if (!(planoEditando.tags || []).includes(tag))
            setPlanoEditando({ ...planoEditando, tags: [...(planoEditando.tags || []), tag] })
    }
    const removerTag = (tagParaRemover: string) => {
        setPlanoEditando({ ...planoEditando, tags: (planoEditando.tags || []).filter((t: string) => t !== tagParaRemover) })
    }
    const adicionarUnidadeNova = () => {
        if (novaUnidade.trim()) {
            const u = novaUnidade.trim()
            if (!(planoEditando.unidades || []).includes(u))
                setPlanoEditando({ ...planoEditando, unidades: [...(planoEditando.unidades || []), u] })
            if (!unidades.includes(u)) setUnidades([...unidades, u].sort())
            setNovaUnidade(''); setAdicionandoUnidade(false)
        }
    }

    // ── FUNÇÕES: ROTEIRO DE ATIVIDADES ────────────────────────────────────
    const adicionarAtividadeRoteiro = () => {
        const novaAtividade = {
            id: Date.now(), nome: '', duracao: '', descricao: '',
            conceitos: [...(planoEditando.conceitos || [])],
            tags: [...(planoEditando.tags || [])],
            recursos: [], musicasVinculadas: [],
        }
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: [...(planoEditando.atividadesRoteiro || []), novaAtividade] })
    }
    const removerAtividadeRoteiro = (id: any) => {
        const atividadeRemovida = (planoEditando.atividadesRoteiro || []).find((a: any) => a.id === id)
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: (planoEditando.atividadesRoteiro || []).filter((a: any) => a.id !== id) })
        if (atividadeRemovida?.musicaId) {
            const musicaVinculada = repertorio.find((m: any) => m.id === atividadeRemovida.musicaId)
            if (musicaVinculada) {
                const musicaAtualizada = { ...musicaVinculada, planosVinculados: (musicaVinculada.planosVinculados || []).filter((pId: any) => pId !== planoEditando.id) }
                const novoRepertorio = repertorio.map((m: any) => m.id === musicaVinculada.id ? musicaAtualizada : m)
                setRepertorio(novoRepertorio)
                dbSet('repertorio', JSON.stringify(novoRepertorio))
            }
        }
    }
    const atualizarAtividadeRoteiro = (id: any, campo: string, valor: any) => {
        setPlanoEditando({
            ...planoEditando,
            atividadesRoteiro: (planoEditando.atividadesRoteiro || []).map((a: any) => a.id === id ? { ...a, [campo]: valor } : a)
        })
    }

    // ── FUNÇÕES: FAVORITO E DRAG ──────────────────────────────────────────
    const toggleFavorito = useCallback((plano: any, e?: any) => {
        if (e) e.stopPropagation()
        const atualizado = { ...plano, destaque: !plano.destaque }
        setPlanos(prev => prev.map((p: any) => p.id === plano.id ? atualizado : p))
        if (edicaoRef.current.planoSelecionado?.id === plano.id)
            edicaoDispatch({ type: 'SET', payload: { planoSelecionado: atualizado } })
        if (edicaoRef.current.planoEditando?.id === plano.id)
            edicaoDispatch({ type: 'SET', payload: { planoEditando: atualizado } })
    }, [])

    const handleDragStart = useCallback((index: any) => { dragItem.current = index; setDragActiveIndex(index) }, [])
    const handleDragEnter = useCallback((index: any) => { dragOverItem.current = index; setDragOverIndex(index) }, [])
    const handleDragEnd = () => {
        const roteiro = [...(planoEditando.atividadesRoteiro || [])]
        const draggedItem = roteiro.splice(dragItem.current, 1)[0]
        roteiro.splice(dragOverItem.current, 0, draggedItem)
        dragItem.current = null; dragOverItem.current = null
        setDragActiveIndex(null); setDragOverIndex(null)
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: roteiro })
    }
    const toggleRecursosAtiv = (idx: any) => {
        setRecursosExpandidos({ ...recursosExpandidos, [idx]: !recursosExpandidos[idx] })
    }

    // ── CROSS-DOMAIN: VINCULAR/IMPORTAR ──────────────────────────────────
    const vincularMusicaAtividade = useCallback((musica: Musica) => {
        if (planoEditando && planoEditando.atividadesRoteiro) {
            const idx = planoEditando.atividadesRoteiro.findIndex((a: any) => a.id === atividadeVinculandoMusica)
            if (idx !== -1) {
                const atualizado = [...planoEditando.atividadesRoteiro]
                const musicasVinculadas = atualizado[idx].musicasVinculadas || []
                if (musicasVinculadas.find((m: any) => (typeof m === 'string' ? m : m.id) === musica.id)) {
                    setModalConfirm({ conteudo: '⚠️ Música já vinculada a esta atividade!', somenteOk: true, labelConfirm: 'OK' }); return
                }
                atualizado[idx].musicasVinculadas = [...musicasVinculadas, { id: musica.id, titulo: musica.titulo, autor: musica.autor }]
                setPlanoEditando({ ...planoEditando, atividadesRoteiro: atualizado })
                const musicaAtualizada = { ...musica, planosVinculados: [...(musica.planosVinculados || []), planoEditando.id] }
                const novoRepertorio = repertorio.map((m: any) => m.id === musica.id ? musicaAtualizada : m)
                setRepertorio(novoRepertorio); dbSet('repertorio', JSON.stringify(novoRepertorio))
                setAtividadeVinculandoMusica(null)
                setModalConfirm({ conteudo: '✅ Música vinculada!', somenteOk: true, labelConfirm: 'OK' }); return
            }
        }
        if (atividadeEditando && atividadeEditando.id === atividadeVinculandoMusica) {
            const musicasVinculadas = atividadeEditando.musicasVinculadas || []
            if (musicasVinculadas.find((m: any) => (typeof m === 'string' ? m : m.id) === musica.id)) {
                setModalConfirm({ conteudo: '⚠️ Música já vinculada a esta atividade!', somenteOk: true, labelConfirm: 'OK' }); return
            }
            setAtividadeEditando({ ...atividadeEditando, musicasVinculadas: [...musicasVinculadas, { id: musica.id, titulo: musica.titulo, autor: musica.autor }] })
            const musicaAtualizada = { ...musica, atividadesVinculadas: [...(musica.atividadesVinculadas || []), { id: atividadeEditando.id, nome: atividadeEditando.nome }] }
            const novoRepertorio = repertorio.map((m: any) => m.id === musica.id ? musicaAtualizada : m)
            setRepertorio(novoRepertorio); dbSet('repertorio', JSON.stringify(novoRepertorio))
            setAtividadeVinculandoMusica(null)
        }
    }, [planoEditando, atividadeVinculandoMusica, atividadeEditando, repertorio, setRepertorio, setAtividadeVinculandoMusica, setAtividadeEditando, setModalConfirm])

    const importarMusicaParaPlano = useCallback((musica: Musica) => {
        const novaAtividade = {
            id: Date.now(), nome: musica.titulo, duracao: '', descricao: musica.observacoes || '',
            conceitos: [...(planoEditando?.conceitos || [])], tags: [...(planoEditando?.tags || [])],
            recursos: [...(musica.links || []).map((l: string) => ({ url: l, tipo: 'link' }))], musicaId: musica.id,
        }
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: [...(planoEditando?.atividadesRoteiro || []), novaAtividade] })
        const musicaAtualizada = { ...musica, planosVinculados: [...(musica.planosVinculados || []), planoEditando?.id] }
        const novoRepertorio = repertorio.map((m: any) => m.id === musica.id ? musicaAtualizada : m)
        setRepertorio(novoRepertorio); dbSet('repertorio', JSON.stringify(novoRepertorio))
        setModalImportarMusica(false)
        setModalConfirm({ conteudo: '✅ Música importada!', somenteOk: true, labelConfirm: 'OK' })
    }, [planoEditando, repertorio, setRepertorio, setModalConfirm])

    const importarAtividadeParaPlano = useCallback((atividade: Atividade) => {
        const novaAtividade = {
            id: Date.now(), nome: atividade.nome, duracao: atividade.duracao || '',
            descricao: atividade.descricao || '', conceitos: [...(atividade.conceitos || [])],
            tags: [...(atividade.tags || [])], recursos: [...(atividade.recursos || [])], musicasVinculadas: [],
        }
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: [...(planoEditando?.atividadesRoteiro || []), novaAtividade] })
        setModalImportarAtividade(false)
        setModalConfirm({ conteudo: '✅ Atividade importada!', somenteOk: true, labelConfirm: 'OK' })
    }, [planoEditando, setModalConfirm])

    const adicionarAtividadeAoPlano = useCallback((atividadeId: string | number, planoId: string | number) => {
        const atividade = atividades.find((a: any) => a.id === atividadeId)
        const plano = planos.find((p: any) => p.id === planoId)
        if (!atividade || !plano) return
        const novaAtivRoteiro = { id: Date.now(), nome: atividade.nome, duracao: atividade.duracao || '', descricao: atividade.descricao || '' }
        const conceitosMesclados = [...new Set([...(plano.conceitos || []), ...(atividade.conceitos || [])])]
        const tagsMescladas = [...new Set([...(plano.tags || []), ...(atividade.tags || [])])]
        const materiaisMesclados = [...new Set([...(plano.materiais || []), ...(atividade.materiais || [])])]
        const recursosAtuais = plano.recursos || []; const novosRecursos = atividade.recursos || []
        const recursosUnicos = [...recursosAtuais]
        novosRecursos.forEach((rec: any) => {
            const recUrl = typeof rec === 'string' ? rec : rec.url
            if (!recursosUnicos.find((r: any) => (typeof r === 'string' ? r : r.url) === recUrl)) recursosUnicos.push(rec)
        })
        let unidadesMescladas = [...(plano.unidades || [])]
        if ((atividade as any).unidade && (atividade as any).unidade.trim() && !unidadesMescladas.includes((atividade as any).unidade)) {
            unidadesMescladas.push((atividade as any).unidade)
        }
        setPlanos(planos.map((p: any) => p.id === planoId
            ? { ...p, atividadesRoteiro: [...(p.atividadesRoteiro || []), novaAtivRoteiro], conceitos: conceitosMesclados, tags: tagsMescladas, materiais: materiaisMesclados, recursos: recursosUnicos, unidades: unidadesMescladas }
            : p
        ))
        setModalAdicionarAoPlano(null)
        setModalConfirm({ conteudo: `✅ Atividade "${atividade.nome}" vinculada ao plano "${plano.titulo}"!`, somenteOk: true, labelConfirm: 'OK' })
    }, [atividades, planos, setModalAdicionarAoPlano, setModalConfirm])

    // ── CROSS-DOMAIN: REGISTRO PÓS-AULA ──────────────────────────────────
    const abrirModalRegistro = useCallback((plano: Plano, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setPlanoParaRegistro(plano)
        setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', resultadoAula: '', anotacoesGerais: '', proximaAulaOpcao: '' })
        setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('')
        setFiltroRegAno('')
        setRegistroEditando(null)
        setVerRegistros(false)
        setModalRegistro(true)
    }, [setPlanoParaRegistro, setNovoRegistro, setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel, setFiltroRegAno, setRegistroEditando, setVerRegistros, setModalRegistro])

    const salvarRegistro = useCallback(() => {
        if (!novoRegistro.resumoAula && !novoRegistro.funcionouBem && !novoRegistro.naoFuncionou && !novoRegistro.proximaAula && !novoRegistro.comportamento) {
            setModalConfirm({ conteudo: 'Preencha ao menos um campo!', somenteOk: true, labelConfirm: 'OK' }); return
        }
        const agora = new Date()
        const { dataAula, ...camposRegistro } = novoRegistro
        if (_regEdit) {
            const atualizado = {
                ...planoParaRegistro!,
                registrosPosAula: planoParaRegistro!.registrosPosAula.map((r: any) =>
                    r.id === _regEdit.id
                        ? { ...r, data: dataAula || r.data, anoLetivo: regAnoSel, escola: regEscolaSel, segmento: regSegmentoSel, turma: regTurmaSel, ...camposRegistro, dataEdicao: agora.toISOString().split('T')[0] }
                        : r
                )
            }
            setPlanos(planos.map((p: any) => p.id === atualizado.id ? atualizado : p))
            if (planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado)
            setPlanoParaRegistro(atualizado)
        } else {
            const registro: RegistroPosAula = {
                id: Date.now(), data: dataAula || agora.toISOString().split('T')[0],
                dataRegistro: agora.toISOString().split('T')[0], hora: agora.toTimeString().slice(0, 5),
                anoLetivo: regAnoSel, escola: regEscolaSel, segmento: regSegmentoSel, turma: regTurmaSel,
                ...camposRegistro
            }
            const atualizado = { ...planoParaRegistro!, registrosPosAula: [...(planoParaRegistro!.registrosPosAula || []), registro] }
            setPlanos(planos.map((p: any) => p.id === atualizado.id ? atualizado : p))
            if (planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado)
            setPlanoParaRegistro(atualizado)
        }
        setRegistroEditando(null); setVerRegistros(true)
        setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', resultadoAula: '', anotacoesGerais: '', proximaAulaOpcao: '' })
        setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('')
    }, [novoRegistro, _regEdit, planoParaRegistro, regAnoSel, regEscolaSel, regSegmentoSel, regTurmaSel, planos, planoSelecionado, setModalConfirm, setPlanoParaRegistro, setRegistroEditando, setVerRegistros, setNovoRegistro, setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel])

    const excluirRegistro = useCallback((registroId: string | number) => {
        setModalConfirm({ titulo: 'Excluir registro?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
            const atualizado = { ...planoParaRegistro!, registrosPosAula: planoParaRegistro!.registrosPosAula.filter((r: any) => r.id !== registroId) }
            setPlanos(planos.map((p: any) => p.id === atualizado.id ? atualizado : p))
            if (planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado)
            setPlanoParaRegistro(atualizado)
        } })
    }, [planoParaRegistro, planos, planoSelecionado, setModalConfirm, setPlanoParaRegistro])

    const editarRegistro = useCallback((reg: RegistroPosAula) => {
        setRegistroEditando(reg)
        setNovoRegistro({
            dataAula: reg.data || new Date().toISOString().split('T')[0],
            resumoAula: reg.resumoAula || '', funcionouBem: reg.funcionouBem || '',
            naoFuncionou: reg.naoFuncionou || '', proximaAula: reg.proximaAula || '',
            comportamento: reg.comportamento || '', poderiaMelhorar: reg.poderiaMelhorar || '',
            resultadoAula: reg.resultadoAula || '', anotacoesGerais: reg.anotacoesGerais || '',
            proximaAulaOpcao: reg.proximaAulaOpcao || ''
        })
        setRegAnoSel(String(reg.anoLetivo || '')); setRegEscolaSel(String(reg.escola || ''))
        setRegSegmentoSel(String(reg.segmento || reg.serie || '')); setRegTurmaSel(String(reg.turma || ''))
        setVerRegistros(false)
    }, [setRegistroEditando, setNovoRegistro, setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel, setVerRegistros])

    // ── CROSS-DOMAIN: SUGERIR/SALVAR REGISTRO RÁPIDO ─────────────────────
    const sugerirPlanoParaTurma = useCallback((anoId: string, escolaId: string, segmentoId: string, turmaId: string): string | null => {
        const planosComRegistros = planos.filter((p: any) =>
            (p.registrosPosAula || []).some((r: any) => r.anoLetivo == anoId && r.escola == escolaId && (r.segmento || r.serie) == segmentoId && r.turma == turmaId)
        ).sort((a: any, b: any) => {
            const lastA = Math.max(...(a.registrosPosAula || []).map((r: any) => Number(r.id) || 0))
            const lastB = Math.max(...(b.registrosPosAula || []).map((r: any) => Number(r.id) || 0))
            return lastB - lastA
        })
        if (planosComRegistros.length > 0) return String(planosComRegistros[0].id)
        const emAndamento = planos.filter((p: any) =>
            p.statusPlanejamento === 'Em Andamento' && (p.faixaEtaria || []).some((f: string) => {
                const ano = anosLetivos.find((a: any) => a.id == anoId)
                const esc = ano?.escolas.find((e: any) => e.id == escolaId)
                const seg = esc?.segmentos.find((s: any) => s.id == segmentoId)
                return seg && seg.nome.includes(f)
            })
        )
        if (emAndamento.length > 0) return String(emAndamento[0].id)
        const ano = anosLetivos.find((a: any) => a.id == anoId)
        const esc = ano?.escolas.find((e: any) => e.id == escolaId)
        if (esc) {
            const recentes = planos.filter((p: any) => p.escola === esc.nome).sort((a: any, b: any) => Number(b.id) - Number(a.id))
            if (recentes.length > 0) return String(recentes[0].id)
        }
        return null
    }, [planos, anosLetivos])

    const salvarRegistroRapido = useCallback(() => {
        const feriado = verificarFeriado(rrData)
        const _executar = () => {
            const agora = new Date(); let totalNovos = 0; let totalAtualizados = 0
            const planosAtualizados = planos.map((plano: any) => {
                let planoModificado = false
                const novosRegistros: RegistroPosAula[] = []
                Object.keys(rrTextos).forEach(turmaId => {
                    const texto = (rrTextos as Record<string, string>)[turmaId]?.trim()
                    if (!texto) return
                    const ano = anosLetivos.find((a: any) => a.id == rrAnoSel)
                    const esc = ano?.escolas.find((e: any) => e.id == rrEscolaSel)
                    let segmentoId: string | null = null
                    for (const seg of esc?.segmentos || []) {
                        if (seg.turmas.find((t: any) => t.id == turmaId)) { segmentoId = seg.id; break }
                    }
                    const planoId = (rrPlanosSegmento as Record<string, unknown>)[segmentoId!]
                    if (planoId != plano.id) return
                    const registroExistente = (plano.registrosPosAula || []).find((r: any) => r.data === rrData && r.turma == turmaId)
                    if (registroExistente) {
                        const resumoAtual = registroExistente.resumoAula || ''
                        registroExistente.resumoAula = resumoAtual + (resumoAtual ? '\n' : '') + texto
                        registroExistente.dataEdicao = agora.toISOString().split('T')[0]
                        planoModificado = true; totalAtualizados++
                    } else {
                        novosRegistros.push({ id: gerarIdSeguro() as unknown as number, data: rrData, dataRegistro: agora.toISOString().split('T')[0], hora: agora.toTimeString().slice(0, 5), anoLetivo: rrAnoSel, escola: rrEscolaSel, segmento: segmentoId!, turma: turmaId, resumoAula: texto, funcionouBem: '', naoFuncionou: '', proximaAula: '', comportamento: '' })
                        planoModificado = true; totalNovos++
                    }
                })
                if (planoModificado) return { ...plano, registrosPosAula: [...(plano.registrosPosAula || []), ...novosRegistros] }
                return plano
            })
            if (totalNovos > 0 || totalAtualizados > 0) {
                setPlanos(planosAtualizados)
                let msg = '✅ '; if (totalNovos > 0) msg += `${totalNovos} novo(s)`; if (totalNovos > 0 && totalAtualizados > 0) msg += ' + '; if (totalAtualizados > 0) msg += `${totalAtualizados} atualizado(s)`; msg += '!'
                setModalConfirm({ conteudo: msg, somenteOk: true, labelConfirm: 'OK' })
                setModalRegistroRapido(false)
                setRrTextos({}); setRrPlanosSegmento({})
            } else {
                setModalConfirm({ conteudo: '⚠️ Preencha pelo menos uma turma e selecione um plano.', somenteOk: true, labelConfirm: 'OK' })
            }
        }
        if (feriado) { setModalConfirm({ titulo: '⚠️ Feriado', conteudo: `Hoje é feriado: ${feriado}\n\nDeseja registrar aula mesmo assim?`, labelConfirm: 'Registrar mesmo assim', onConfirm: _executar }) }
        else { _executar() }
    }, [rrData, rrTextos, rrAnoSel, rrEscolaSel, rrPlanosSegmento, planos, anosLetivos, setPlanos, setModalConfirm, setModalRegistroRapido, setRrTextos, setRrPlanosSegmento])

    // ── BACKUP ──────────────────────────────────────────────────────────────
    const baixarBackup = () => {
        const backup = {
            versao: '2.0', timestamp: new Date().toISOString(),
            planos, conceitos, unidades, faixas, anosLetivos, gradesSemanas, atividades,
            eventosEscolares, sequencias, repertorio, tagsGlobais, templatesRoteiro,
            compassosCustomizados, tonalidadesCustomizadas, andamentosCustomizados,
            escalasCustomizadas, estruturasCustomizadas, dinamicasCustomizadas,
            energiasCustomizadas, instrumentacaoCustomizada,
        }
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url; link.download = `musilab-backup-${new Date().toISOString().split('T')[0]}.json`
        link.click(); URL.revokeObjectURL(url)
    }

    const restaurarBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]; if (!file) return
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target!.result as string)
                const validacao = validarBackup(backup)
                if (!validacao.valido) {
                    setModalConfirm({ titulo: 'Arquivo inválido', conteudo: validacao.erro || 'Este arquivo não é um backup válido do MusiLab.', somenteOk: true, labelConfirm: 'OK' })
                    return
                }
                const resumo = `📦 Backup de ${backup.timestamp ? new Date(backup.timestamp).toLocaleString('pt-BR') : 'data desconhecida'}\n\n• ${backup.planos?.length||0} planos\n• ${backup.atividades?.length||0} atividades\n• ${backup.sequencias?.length||0} sequências\n• ${backup.repertorio?.length||0} músicas\n\n⚠️ Os dados atuais serão substituídos.`
                setModalConfirm({
                    titulo: 'Restaurar Backup?', conteudo: resumo,
                    labelConfirm: 'Restaurar', labelCancelar: 'Cancelar', perigo: true,
                    onConfirm: () => {
                        setPlanos(backup.planos)
                        if (backup.conceitos) setConceitos(backup.conceitos)
                        if (backup.unidades) setUnidades(backup.unidades)
                        if (backup.faixas) setFaixas(backup.faixas)
                        if (backup.anosLetivos) setAnosLetivos(backup.anosLetivos)
                        if (backup.gradesSemanas) setGradesSemanas(backup.gradesSemanas)
                        if (backup.atividades) setAtividades(backup.atividades)
                        if (backup.eventosEscolares) setEventosEscolares(backup.eventosEscolares)
                        if (backup.sequencias) setSequencias(backup.sequencias)
                        if (backup.repertorio) setRepertorio(backup.repertorio)
                        if (backup.tagsGlobais) setTagsGlobais(backup.tagsGlobais)
                        if (backup.templatesRoteiro) setTemplatesRoteiro(backup.templatesRoteiro)
                        if (backup.compassosCustomizados) setCompassosCustomizados(backup.compassosCustomizados)
                        if (backup.tonalidadesCustomizadas) setTonalidadesCustomizadas(backup.tonalidadesCustomizadas)
                        if (backup.andamentosCustomizados) setAndamentosCustomizados(backup.andamentosCustomizados)
                        if (backup.escalasCustomizadas) setEscalasCustomizadas(backup.escalasCustomizadas)
                        if (backup.estruturasCustomizadas) setEstruturasCustomizadas(backup.estruturasCustomizadas)
                        if (backup.dinamicasCustomizadas) setDinamicasCustomizadas(backup.dinamicasCustomizadas)
                        if (backup.energiasCustomizadas) setEnergiasCustomizadas(backup.energiasCustomizadas)
                        if (backup.instrumentacaoCustomizada) setInstrumentacaoCustomizada(backup.instrumentacaoCustomizada)
                        setModalConfirm({ titulo: 'Backup restaurado!', conteudo: `${backup.planos.length} planos · ${backup.repertorio?.length||0} músicas · ${backup.atividades?.length||0} atividades`, somenteOk: true, labelConfirm: 'OK' })
                    }
                })
            } catch { setModalConfirm({ titulo: 'Arquivo inválido', conteudo: 'Não foi possível ler o arquivo. Ele pode estar corrompido.', somenteOk: true, labelConfirm: 'OK' }) }
        }
        reader.readAsText(file); event.target.value = ''
    }

    // ── BNCC ──────────────────────────────────────────────────────────────
    const sugerirBNCC = () => {
        const textoAnalise = (
            (planoEditando.titulo || '') + ' ' + (planoEditando.tema || '') + ' ' +
            (planoEditando.objetivoGeral || '') + ' ' +
            (planoEditando.objetivosEspecificos || []).join(' ') + ' ' +
            (planoEditando.conceitos || []).join(' ')
        ).toLowerCase()
        const fxs = planoEditando.faixaEtaria || []
        const fl = fxs.map((f: string) => f.toLowerCase())
        const ehInfantil = fl.some((f: string) => ['infantil', 'berçário', 'maternal', 'bercario', 'creche', 'jardim', 'pré', 'pre-'].some(s => f.includes(s)))
        const ehEF69 = fl.some((f: string) => ['6°', '7°', '8°', '9°', '6º', '7º', '8º', '9º', '6 ano', '7 ano', '8 ano', '9 ano'].some(s => f.includes(s)))
        const ehEJA = fl.some((f: string) => f.includes('eja') || f.includes('jovens e adultos') || f.includes('adult') || f.includes('ead'))
        const sugestoes = bancoBNCC.filter(item => {
            const keyMatch = item.keywords.some(key => textoAnalise.includes(key))
            if (!keyMatch) return false
            if (ehEJA) return true
            if (ehInfantil && item.segmento === 'Infantil') return true
            if (ehEF69    && item.segmento === 'EF6-9')    return true
            if (!ehInfantil && !ehEF69 && item.segmento === 'EF1-5') return true
            if (!item.segmento) return true
            return false
        })
        if (sugestoes.length === 0) {
            const todas = bancoBNCC.filter(item => item.keywords.some(key => textoAnalise.includes(key)))
            if (todas.length === 0) { setModalConfirm({ conteudo: 'Adicione mais texto (título, objetivos) para receber sugestões.', somenteOk: true, labelConfirm: 'OK' }); return }
            const formatadas = todas.map(s => `[${s.segmento || 'BNCC'}] ${s.codigo} - ${s.desc}`)
            const atuais = planoEditando.habilidadesBNCC || []
            setPlanoEditando({ ...planoEditando, habilidadesBNCC: [...new Set([...atuais, ...formatadas])] })
            setModalConfirm({ conteudo: `✨ ${todas.length} sugestões encontradas!`, somenteOk: true, labelConfirm: 'OK' })
            return
        }
        const formatadas = sugestoes.map(s => `[${s.segmento}] ${s.codigo} - ${s.desc}`)
        const atuais = planoEditando.habilidadesBNCC || []
        setPlanoEditando({ ...planoEditando, habilidadesBNCC: [...new Set([...atuais, ...formatadas])] })
        const segLabel = ehEJA ? 'EJA/Adultos' : ehInfantil ? 'Ed. Infantil' : ehEF69 ? 'EF 6-9' : 'EF 1-5'
        setModalConfirm({ conteudo: `✨ ${sugestoes.length} sugestão(ões) encontrada(s) para ${segLabel}!`, somenteOk: true, labelConfirm: 'OK' })
    }

    // ── CONTEXT VALUE ─────────────────────────────────────────────────────
    const value: PlanosContextValue = {
        planos, setPlanos,
        planoSelecionado, setPlanoSelecionado,
        modoEdicao, setModoEdicao,
        planoEditando, setPlanoEditando,
        formExpandido, setFormExpandido,
        materiaisBloqueados, setMateriaisBloqueados,
        novoConceito, setNovoConceito,
        adicionandoConceito, setAdicionandoConceito,
        novaUnidade, setNovaUnidade,
        adicionandoUnidade, setAdicionandoUnidade,
        novoRecursoUrl, setNovoRecursoUrl,
        novoRecursoTipo, setNovoRecursoTipo,
        novaDataAula, setNovaDataAula,
        dataEdicao, setDataEdicao,
        busca, setBusca,
        filtroConceito, setFiltroConceito,
        filtroUnidade, setFiltroUnidade,
        filtroFaixa, setFiltroFaixa,
        filtroNivel, setFiltroNivel,
        filtroEscola, setFiltroEscola,
        filtroTag, setFiltroTag,
        filtroFavorito, setFiltroFavorito,
        filtroStatus, setFiltroStatus,
        modoVisualizacao, setModoVisualizacao,
        ordenacaoCards, setOrdenacaoCards,
        limparFiltros,
        statusDropdownId, setStatusDropdownId,
        recursosExpandidos, setRecursosExpandidos,
        modalImportarMusica, setModalImportarMusica,
        modalImportarAtividade, setModalImportarAtividade,
        dragActiveIndex, setDragActiveIndex,
        dragOverIndex, setDragOverIndex,
        escolas, duracoesSugestao, planosFiltrados,
        normalizePlano, buscaAvancada, sugerirBNCC,
        novoPlano, editarPlano, salvarPlano, excluirPlano, fecharModal, restaurarVersao,
        toggleConceito, toggleFaixa, toggleUnidade,
        adicionarRecurso, removerRecurso,
        adicionarDataEdicao, removerDataEdicao, adicionarDataAulaVisualizacao, removerDataAulaVisualizacao,
        adicionarConceitoNovo, adicionarTagNova, removerTag, adicionarUnidadeNova,
        adicionarAtividadeRoteiro, removerAtividadeRoteiro, atualizarAtividadeRoteiro,
        toggleFavorito, handleDragStart, handleDragEnter, handleDragEnd, toggleRecursosAtiv,
        templatesRoteiro, setTemplatesRoteiro, modalTemplates, setModalTemplates, nomeNovoTemplate, setNomeNovoTemplate,
        modalConfiguracoes, setModalConfiguracoes,
        vincularMusicaAtividade, importarMusicaParaPlano, importarAtividadeParaPlano,
        abrirModalRegistro, salvarRegistro, editarRegistro, excluirRegistro,
        adicionarAtividadeAoPlano, sugerirPlanoParaTurma, salvarRegistroRapido,
        baixarBackup, restaurarBackup,
        userId,
    }

    return <PlanosContext.Provider value={value}>{children}</PlanosContext.Provider>
}
