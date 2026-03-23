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
import { useEstrategiasContext } from './EstrategiasContext'
import { useAplicacoesContext } from './AplicacoesContext'
import { dbGet, dbSet, dbDel } from '../lib/db'
import { sanitizeUrl, gerarIdSeguro, validarBackup } from '../lib/utils'
import { carimbарTimestamp, marcarPendente } from '../lib/offlineSync' // [offlineSync]
import { useDebounce } from '../lib/hooks'
import { showToast } from '../lib/toast'
import { verificarFeriado } from '../lib/feriados'
import { detectarMusicasNoPlano, type MusicaDetectada } from '../lib/detectarMusicas'
import type { Plano, Musica, Atividade, RegistroPosAula, VinculoMusicaPlano, Sequencia, AplicacaoAulaSlot } from '../types'

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
        faixaEtaria:          [...new Set(p.faixaEtaria || [])],
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
    filtroSegmento: string
    filtroFavorito: boolean
    filtroStatus: string
    modoVisualizacao: string
    ordenacaoCards: string
}
const FILTROS_INITIAL: FiltrosState = {
    busca: '', filtroConceito: 'Todos', filtroUnidade: 'Todos', filtroFaixa: 'Todos',
    filtroNivel: 'Todos', filtroEscola: 'Todas', filtroTag: 'Todas', filtroSegmento: 'Todos',
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
    filtroSegmento: string; setFiltroSegmento: React.Dispatch<React.SetStateAction<string>>
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
    segmentosPlanos: string[]
    duracoesSugestao: string[]
    planosFiltrados: Plano[]
    // funções
    normalizePlano: (p: Record<string, unknown>) => Plano
    buscaAvancada: (plano: Plano, termoBusca: string) => boolean
    sugerirBNCC: () => Promise<void>
    gerandoBNCC: boolean
    sugerirObjetivosIA: () => Promise<void>
    gerandoObjetivos: boolean
    novoPlano: () => void
    editarPlano: (plano: Plano) => void
    salvarPlano: (ignorarAvisoEscola?: boolean) => void
    novaAulaSlots: AplicacaoAulaSlot[] | null
    setNovaAulaSlots: (s: AplicacaoAulaSlot[] | null) => void
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
    // detecção de músicas no plano
    musicasDetectadas: MusicaDetectada[]
    setMusicasDetectadas: React.Dispatch<React.SetStateAction<MusicaDetectada[]>>
    limparMusicasDetectadas: () => void
    showModalMusicas: boolean
    setShowModalMusicas: React.Dispatch<React.SetStateAction<boolean>>
    vincularMusicaAoPlano: (planoId: string | number, vinculo: VinculoMusicaPlano) => void
    desvincularMusicaDoPlano: (planoId: string | number, musicaId: string | number) => void
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
    atualizarKanbanStatus: (id: string | number, status: Plano['kanbanStatus']) => void
    criarPlanosDeSequencia: (sequencia: Sequencia, opts: { turma?: string; escola?: string; nivel?: string; dataInicio: string; diasSemana: number[] }) => number
    salvarNotaAdaptacao: (planoId: string | number, dados: { turmaId: string; turmaNome: string; texto: string }) => void
    removerNotaAdaptacao: (planoId: string | number, notaId: string) => void
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
    const { aplicacoes } = useAplicacoesContext()
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
        setFiltroRegData,
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
    const { estrategias, registrarUsoEstrategia } = useEstrategiasContext()

    // ── ESTADOS ──────────────────────────────────────────────────────────
    const [planos, setPlanos] = useState<Plano[]>(() => {
        const saved = dbGet('planosAula')
        const parsed = saved ? JSON.parse(saved) : []
        return parsed.map(normalizePlano)
    })
    // Slots pré-selecionados para auto-aplicar após salvar nova aula
    const [novaAulaSlots, setNovaAulaSlots] = useState<AplicacaoAulaSlot[] | null>(null)
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
    const { busca, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel, filtroEscola, filtroTag, filtroSegmento, filtroFavorito, filtroStatus, modoVisualizacao, ordenacaoCards } = filtros
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
    const setFiltroSegmento: React.Dispatch<React.SetStateAction<string>> = (v) =>
        filtrosDispatch({ type: 'SET', payload: { filtroSegmento: typeof v === 'function' ? v(filtrosRef.current.filtroSegmento) : v } })
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

    // ── AUTOSAVE DE RASCUNHO (30s) ──────────────────────────────────────
    const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
        if (!modoEdicao || !planoEditando) {
            // Ao fechar o editor, cancelar timer pendente
            if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
            return
        }
        // Só salvar rascunho se houver título ou ao menos uma atividade
        const temConteudo = !!planoEditando.titulo?.trim() ||
            (planoEditando.atividadesRoteiro || []).length > 0
        if (!temConteudo) return
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
        autosaveTimer.current = setTimeout(() => {
            dbSet('rascunho_plano', JSON.stringify(planoEditando))
        }, 30_000)
        return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
    }, [planoEditando, modoEdicao])

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
        // Inclui escolas configuradas no AnoLetivo (mesmo sem planos com campo escola explícito)
        anosLetivos.forEach((a: any) => {
            ;(a.escolas ?? []).forEach((e: any) => {
                if (e.nome?.trim()) s.add(e.nome.trim())
            })
        })
        return ['Todas', ...Array.from(s).sort()]
    }, [planos, anosLetivos])

    const segmentosPlanos = useMemo(() => {
        const s = new Set<string>()
        planos.forEach(p => (p.segmentos ?? []).forEach(seg => s.add(seg)))
        return ['Todos', ...Array.from(s).sort()]
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
            const matchUnidade  = filtroUnidade  === 'Todos'  || (plano.unidade && plano.unidade.trim() === filtroUnidade.trim())
            const matchFaixa    = filtroFaixa    === 'Todos'  || (plano.faixaEtaria && plano.faixaEtaria.includes(filtroFaixa))
            const matchNivel    = filtroNivel    === 'Todos'  || plano.nivel === filtroNivel
            const matchEscola   = filtroEscola === 'Todas'
                || plano.escola?.trim() === filtroEscola
                || (plano.registrosPosAula ?? []).some((r: any) => {
                    // r.escola armazena o ID da escola — resolver para nome
                    for (const ano of anosLetivos) {
                        const esc = (ano.escolas ?? []).find((e: any) => String(e.id) === String(r.escola))
                        if (esc?.nome?.trim() === filtroEscola) return true
                    }
                    return false
                })
                // Agendamentos via "Agendar" no banco — verificar escolaId das aplicações
                || aplicacoes.some(a => {
                    if (String(a.planoId) !== String(plano.id)) return false
                    for (const ano of anosLetivos) {
                        const esc = (ano.escolas ?? []).find((e: any) => String(e.id) === String(a.escolaId))
                        if (esc?.nome?.trim() === filtroEscola) return true
                    }
                    return false
                })
            const matchTag      = filtroTag      === 'Todas'  || (plano.tags && plano.tags.includes(filtroTag))
            const matchSegmento = filtroSegmento === 'Todos'  || (plano.segmentos ?? []).includes(filtroSegmento)
            const matchFavorito = !filtroFavorito || plano.destaque
            const matchStatus   = filtroStatus   === 'Todos'  || (plano.statusPlanejamento || 'A Fazer') === filtroStatus
            return matchBusca && matchConceito && matchUnidade && matchFaixa && matchNivel && matchEscola && matchTag && matchSegmento && matchFavorito && matchStatus
        }).sort((a: any, b: any) => {
            if (ordenacaoCards === 'az')        return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR')
            if (ordenacaoCards === 'status') {
                const ord: Record<string, number> = { 'Em Andamento': 0, 'A Fazer': 1, 'Concluído': 2 }
                return (ord[a.statusPlanejamento || 'A Fazer'] || 1) - (ord[b.statusPlanejamento || 'A Fazer'] || 1)
            }
            if (ordenacaoCards === 'favoritos') return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0)
            return b.id - a.id
        })
    }, [planos, buscaDebounced, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel, filtroEscola, filtroTag, filtroSegmento, filtroFavorito, filtroStatus, ordenacaoCards, anosLetivos, aplicacoes])

    // ── FUNÇÕES: PLANOS ───────────────────────────────────────────────────
    const _abrirNovoPlano = () => {
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
    const novoPlano = () => {
        try {
            const rascunho = dbGet('rascunho_plano')
            if (rascunho) {
                const draft = JSON.parse(rascunho) as Plano
                const temConteudo = !!draft.titulo?.trim() || (draft.atividadesRoteiro || []).length > 0
                if (temConteudo) {
                    setModalConfirm({
                        titulo: '📝 Rascunho encontrado',
                        conteudo: `Você tem um rascunho não salvo${draft.titulo ? ` — "${draft.titulo}"` : ''}.\n\nDeseja restaurá-lo?`,
                        labelConfirm: 'Restaurar rascunho',
                        labelCancelar: 'Novo plano em branco',
                        onConfirm: () => {
                            dbDel('rascunho_plano')
                            edicaoDispatch({ type: 'NOVO_PLANO', plano: { ...draft, id: String(Date.now()) } })
                            setViewMode('lista')
                        },
                        onCancel: () => { dbDel('rascunho_plano'); _abrirNovoPlano() },
                    })
                    return
                }
            }
        } catch { /* fallback silencioso */ }
        _abrirNovoPlano()
    }

    const editarPlano = useCallback((plano: any) => {
        edicaoDispatch({ type: 'EDITAR_PLANO', plano: normalizePlano(plano) })
        setViewMode('lista')
    }, [setViewMode])

    const salvarPlano = (ignorarAvisoEscola = false) => {
        if (!planoEditando.titulo || !planoEditando.titulo.trim()) {
            showToast('Preencha o título do plano antes de salvar.', 'error'); return
        }
        if (!planoEditando.objetivoGeral || !planoEditando.objetivoGeral.trim()) {
            showToast('Preencha o objetivo geral antes de salvar.', 'error'); return
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
        // Preservar notasAdaptacao do estado atual — são salvas diretamente em planos
        // via salvarNotaAdaptacao, não refletem em planoEditando (snapshot do form)
        const planoNoState = planos.find((p: any) => String(p.id) === String(planoEditando.id))
        const planoParaSalvar = carimbарTimestamp({ // [offlineSync]
            ...planoEditando,
            notasAdaptacao: planoNoState?.notasAdaptacao ?? planoEditando.notasAdaptacao ?? [],
            objetivosEspecificos: planoEditando.objetivosEspecificos.filter((i: string) => i.trim() !== ''),
            habilidadesBNCC: (planoEditando.habilidadesBNCC || []).filter((i: string) => i.trim() !== ''),
            materiais: planoEditando.materiais.filter((i: string) => i.trim() !== ''),
            faixaEtaria: [...new Set(planoEditando.faixaEtaria || [])], // evita duplicatas
            _ultimaEdicao: new Date().toISOString(),
        }) // [offlineSync]
        const existe = planos.find((p: any) => p.id === planoParaSalvar.id)
        if (existe) {
            // _historicoVersoes: depreciado — não salvar novas versões (sem UI de restauração)
            setPlanos(planos.map((p: any) => p.id === planoParaSalvar.id ? planoParaSalvar : p))
            if (!userId) marcarPendente('planos', String(planoParaSalvar.id)) // [offlineSync]
        } else {
            setPlanos([...planos, planoParaSalvar])
            if (!userId) marcarPendente('planos', String(planoParaSalvar.id)) // [offlineSync]
        }
        dbDel('rascunho_plano') // limpar rascunho após salvar com sucesso
        // Auto-agendar se o professor pré-selecionou turma(s) no modal de contexto
        if (novaAulaSlots && novaAulaSlots.length > 0) {
            window.dispatchEvent(new CustomEvent('musilab:agendar-nova-aula', {
                detail: { planoId: String(planoParaSalvar.id), slots: novaAulaSlots }
            }))
            setNovaAulaSlots(null)
        }
        edicaoDispatch({ type: 'SET', payload: { modoEdicao: false, planoEditando: null } })

        // ── Registrar uso de estratégias vinculadas nas atividades do roteiro ─
        // Coleta todos os nomes únicos de estratégias usadas nas atividades
        const nomesEstrategias = new Set<string>()
        ;(planoParaSalvar.atividadesRoteiro || []).forEach((ativ: any) => {
            ;(ativ.estrategiasVinculadas || []).forEach((nome: string) => nomesEstrategias.add(nome))
        })
        nomesEstrategias.forEach(idOrNome => {
            // Suporte a dados novos (ID) e legados (nome direto)
            const nomeNorm = idOrNome.trim().toLowerCase()
            const estr = estrategias.find(e =>
                e.id === idOrNome ||
                e.nome.trim().toLowerCase() === nomeNorm
            )
            if (estr) registrarUsoEstrategia(estr.id, planoParaSalvar.id, planoParaSalvar.titulo || 'Plano sem título')
        })

        // ── Detectar músicas do repertório citadas no plano ──────────────────
        const detectadas = detectarMusicasNoPlano(planoParaSalvar, repertorio)
        // Auto-vincular "encontradas" com alta confiança (match único + não vinculada)
        const autoVinculos: VinculoMusicaPlano[] = detectadas
            .filter(d => d.classificacao === 'encontrada' && !d.jaVinculada && d.musica)
            .map(d => ({
                musicaId: d.musica!.id ?? d.musica!.titulo,
                titulo: d.musica!.titulo,
                autor: d.musica!.autor,
                origemDeteccao: 'encontrada' as const,
                confirmadoPor: 'auto' as const,
                confirmadoEm: new Date().toISOString(),
            }))
        if (autoVinculos.length > 0) {
            const jaVinculadosIds = new Set(
                (planoParaSalvar.musicasVinculadasPlano || []).map(v => String(v.musicaId))
            )
            const novos = autoVinculos.filter(v => !jaVinculadosIds.has(String(v.musicaId)))
            if (novos.length > 0) {
                const planoAtualizado = {
                    ...planoParaSalvar,
                    musicasVinculadasPlano: [
                        ...(planoParaSalvar.musicasVinculadasPlano || []),
                        ...novos,
                    ],
                }
                // Re-salvar com os auto-vínculos
                setPlanos(prev => prev.map((p: any) =>
                    p.id === planoAtualizado.id ? planoAtualizado : p
                ))
                // Sincronizar música → planos (relação bidirecional)
                const planoId = planoParaSalvar.id
                setRepertorio(prev => prev.map((m: any) => {
                    const vinculo = novos.find(v => String(v.musicaId) === String(m.id ?? m.titulo))
                    if (!vinculo) return m
                    const jaTemPlano = (m.planosVinculados || []).some(
                        (pId: any) => String(pId) === String(planoId)
                    )
                    if (jaTemPlano) return m
                    return { ...m, planosVinculados: [...(m.planosVinculados || []), planoId] }
                }))
            }
        }
        // Abrir modal somente se há músicas para mostrar
        if (detectadas.length > 0) {
            setMusicasDetectadas(detectadas)
            setShowModalMusicas(true)
        }

        // ── Prompt 1: Atualizar métricas de uso das atividades da biblioteca ──
        // Atividades adicionadas ao roteiro com origemAtividadeId têm contadorUso/ultimoUso atualizados
        const agora = new Date().toISOString()
        const ativsUsadas = new Map<string | number, boolean>()
        ;(planoParaSalvar.atividadesRoteiro || []).forEach((atv: any) => {
            if (atv.origemAtividadeId != null) ativsUsadas.set(atv.origemAtividadeId, true)
        })
        if (ativsUsadas.size > 0) {
            setAtividades((prev: any[]) => prev.map(a => {
                if (!ativsUsadas.has(a.id)) return a
                const jaTemPlano = (a.planosVinculados || []).some(
                    (v: any) => String(v.planoId) === String(planoParaSalvar.id)
                )
                const novoRegistro = { planoId: planoParaSalvar.id, planoTitulo: planoParaSalvar.titulo || 'Plano sem título', usadoEm: agora }
                return {
                    ...a,
                    contadorUso: (a.contadorUso || 0) + 1,
                    ultimoUso: agora,
                    planosVinculados: jaTemPlano
                        ? (a.planosVinculados || [])
                        : [...(a.planosVinculados || []), novoRegistro],
                }
            }))
        }

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
                showToast('Versão restaurada!', 'success')
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
                    showToast('Música já vinculada a esta atividade!', 'error'); return
                }
                atualizado[idx].musicasVinculadas = [...musicasVinculadas, { id: musica.id, titulo: musica.titulo, autor: musica.autor }]
                setPlanoEditando({ ...planoEditando, atividadesRoteiro: atualizado })
                const musicaAtualizada = { ...musica, planosVinculados: [...(musica.planosVinculados || []), planoEditando.id] }
                const novoRepertorio = repertorio.map((m: any) => m.id === musica.id ? musicaAtualizada : m)
                setRepertorio(novoRepertorio); dbSet('repertorio', JSON.stringify(novoRepertorio))
                setAtividadeVinculandoMusica(null)
                showToast('Música vinculada!', 'success'); return
            }
        }
        if (atividadeEditando && atividadeEditando.id === atividadeVinculandoMusica) {
            const musicasVinculadas = atividadeEditando.musicasVinculadas || []
            if (musicasVinculadas.find((m: any) => (typeof m === 'string' ? m : m.id) === musica.id)) {
                showToast('Música já vinculada a esta atividade!', 'error'); return
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
            id: gerarIdSeguro(), nome: musica.titulo, duracao: '', descricao: musica.observacoes || '',
            conceitos: [...(planoEditando?.conceitos || [])], tags: [...(planoEditando?.tags || [])],
            recursos: [...(musica.links || []).map((l: string) => ({ url: l, tipo: 'link' }))], musicaId: musica.id,
        }
        setPlanoEditando({ ...planoEditando, atividadesRoteiro: [...(planoEditando?.atividadesRoteiro || []), novaAtividade] })
        const musicaAtualizada = { ...musica, planosVinculados: [...(musica.planosVinculados || []), planoEditando?.id] }
        const novoRepertorio = repertorio.map((m: any) => m.id === musica.id ? musicaAtualizada : m)
        setRepertorio(novoRepertorio); dbSet('repertorio', JSON.stringify(novoRepertorio))
        setModalImportarMusica(false)
        showToast('Música importada!', 'success')
    }, [planoEditando, repertorio, setRepertorio, setModalConfirm])

    const importarAtividadeParaPlano = useCallback((atividade: Atividade) => {
        const musicasDaAtiv = atividade.musicasVinculadas || []
        const novaAtividade = {
            id: gerarIdSeguro(), nome: atividade.nome, duracao: atividade.duracao || '',
            descricao: atividade.descricao || '', conceitos: [...(atividade.conceitos || [])],
            tags: [...(atividade.tags || [])], recursos: [...(atividade.recursos || [])],
            musicasVinculadas: [...musicasDaAtiv],
        }
        // Vincular músicas da atividade ao plano (sem duplicar)
        const vinculadasAtuais = planoEditando?.musicasVinculadasPlano || []
        const idsExistentes = new Set(vinculadasAtuais.map(v => String(v.musicaId)))
        const novasVinculadas = musicasDaAtiv
            .filter(mv => mv.id && !idsExistentes.has(String(mv.id)))
            .map(mv => ({
                musicaId: mv.id ?? mv.titulo ?? String(Date.now()),
                titulo: mv.titulo ?? '',
                autor: mv.autor,
                confirmadoPor: 'professor' as const,
                confirmadoEm: new Date().toISOString(),
            }))
        setPlanoEditando({
            ...planoEditando,
            atividadesRoteiro: [...(planoEditando?.atividadesRoteiro || []), novaAtividade],
            musicasVinculadasPlano: [...vinculadasAtuais, ...novasVinculadas],
        })
        setModalImportarAtividade(false)
        const msg = novasVinculadas.length > 0
            ? `Atividade importada com ${novasVinculadas.length} música${novasVinculadas.length > 1 ? 's' : ''} vinculada${novasVinculadas.length > 1 ? 's' : ''}!`
            : 'Atividade importada!'
        showToast(msg, 'success')
    }, [planoEditando, setModalConfirm])

    const adicionarAtividadeAoPlano = useCallback((atividadeId: string | number, planoId: string | number) => {
        const atividade = atividades.find((a: any) => a.id === atividadeId)
        const plano = planos.find((p: any) => p.id === planoId)
        if (!atividade || !plano) return
        const novaAtivRoteiro = {
            id: Date.now(),
            nome: atividade.nome,
            duracao: atividade.duracao || '',
            descricao: atividade.descricao || '',
            musicasVinculadas: atividade.musicasVinculadas ? [...atividade.musicasVinculadas] : [],
            origemAtividadeId: atividade.id,
        }
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
        // Vincular músicas da atividade ao plano (sem duplicar)
        const musicasDaAtiv = atividade.musicasVinculadas || []
        const vinculadasAtuais = plano.musicasVinculadasPlano || []
        const idsExistentes = new Set(vinculadasAtuais.map((v: any) => String(v.musicaId)))
        const novasVinculadas = musicasDaAtiv
            .filter((mv: any) => mv.id && !idsExistentes.has(String(mv.id)))
            .map((mv: any) => ({
                musicaId: mv.id ?? mv.titulo ?? String(Date.now()),
                titulo: mv.titulo ?? '',
                autor: mv.autor,
                confirmadoPor: 'professor' as const,
                confirmadoEm: new Date().toISOString(),
            }))
        setPlanos(planos.map((p: any) => p.id === planoId
            ? { ...p, atividadesRoteiro: [...(p.atividadesRoteiro || []), novaAtivRoteiro], conceitos: conceitosMesclados, tags: tagsMescladas, materiais: materiaisMesclados, recursos: recursosUnicos, unidades: unidadesMescladas, musicasVinculadasPlano: [...vinculadasAtuais, ...novasVinculadas] }
            : p
        ))
        setModalAdicionarAoPlano(null)
        const extra = novasVinculadas.length > 0 ? ` (+${novasVinculadas.length} música${novasVinculadas.length > 1 ? 's' : ''})` : ''
        showToast(`Atividade "${atividade.nome}" vinculada ao plano "${plano.titulo}"!${extra}`, 'success')
    }, [atividades, planos, setModalAdicionarAoPlano, setModalConfirm])

    // ── CROSS-DOMAIN: REGISTRO PÓS-AULA ──────────────────────────────────
    const abrirModalRegistro = useCallback((plano: Plano, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setPlanoParaRegistro(plano)
        setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', resultadoAula: '', anotacoesGerais: '', proximaAulaOpcao: '', urlEvidencia: '' })
        setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('')
        setFiltroRegAno('')
        setFiltroRegData('')
        setRegistroEditando(null)
        setVerRegistros(false)
        setModalRegistro(true)
    }, [setPlanoParaRegistro, setNovoRegistro, setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel, setFiltroRegAno, setFiltroRegData, setRegistroEditando, setVerRegistros, setModalRegistro])

    const salvarRegistro = useCallback(() => {
        if (!novoRegistro.resumoAula && !novoRegistro.funcionouBem && !novoRegistro.fariadiferente && !novoRegistro.proximaAula && !novoRegistro.comportamento) {
            showToast('Preencha ao menos um campo!', 'error'); return
        }
        const agora = new Date()
        const { dataAula, ...camposRegistro } = novoRegistro
        if (_regEdit) {
            const atualizado = carimbарTimestamp({
                ...planoParaRegistro!,
                registrosPosAula: planoParaRegistro!.registrosPosAula.map((r: any) =>
                    r.id === _regEdit.id
                        ? { ...r, data: dataAula || r.data, anoLetivo: regAnoSel, escola: regEscolaSel, segmento: regSegmentoSel, turma: regTurmaSel, ...camposRegistro, dataEdicao: agora.toISOString().split('T')[0] }
                        : r
                )
            })
            setPlanos(planos.map((p: any) => p.id === atualizado.id ? atualizado : p))
            marcarPendente('planos', String(atualizado.id)) // [offlineSync] garante sync mesmo se app fechar antes do delay
            if (planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado)
            setPlanoParaRegistro(atualizado)
        } else {
            // Verificar duplicata: mesmo data + turma
            const dataAlvo = dataAula || agora.toISOString().split('T')[0]
            const duplicata = (planoParaRegistro!.registrosPosAula || []).find((r: any) =>
                r.data === dataAlvo &&
                String(r.turma) === String(regTurmaSel) &&
                String(r.segmento || r.serie || '') === String(regSegmentoSel)
            )
            if (duplicata) {
                setModalConfirm({
                    titulo: '⚠️ Registro duplicado',
                    conteudo: `Já existe um registro de pós-aula para esta turma em ${dataAlvo}. Deseja substituir o registro existente?`,
                    labelConfirm: 'Substituir',
                    labelCancelar: 'Cancelar',
                    onConfirm: () => {
                        // Substitui o registro existente
                        const registroSubstituto: RegistroPosAula = {
                            ...duplicata,
                            dataRegistro: agora.toISOString().split('T')[0], hora: agora.toTimeString().slice(0, 5),
                            ...camposRegistro
                        }
                        const atualizado = carimbарTimestamp({ ...planoParaRegistro!, registrosPosAula: planoParaRegistro!.registrosPosAula.map((r: any) => r.id === duplicata.id ? registroSubstituto : r) })
                        setPlanos(planos.map((p: any) => p.id === atualizado.id ? atualizado : p))
                        marcarPendente('planos', String(atualizado.id))
                        if (planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado)
                        setPlanoParaRegistro(atualizado)
                        setRegistroEditando(null); setVerRegistros(true)
                        setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', resultadoAula: '', anotacoesGerais: '', proximaAulaOpcao: '', urlEvidencia: '' })
                        setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('')
                    }
                })
                return
            }
            const registro: RegistroPosAula = {
                id: Date.now(), data: dataAula || agora.toISOString().split('T')[0],
                dataRegistro: agora.toISOString().split('T')[0], hora: agora.toTimeString().slice(0, 5),
                anoLetivo: regAnoSel, escola: regEscolaSel, segmento: regSegmentoSel, turma: regTurmaSel,
                ...camposRegistro
            }
            const atualizado = carimbарTimestamp({ ...planoParaRegistro!, registrosPosAula: [...(planoParaRegistro!.registrosPosAula || []), registro] })
            setPlanos(planos.map((p: any) => p.id === atualizado.id ? atualizado : p))
            marcarPendente('planos', String(atualizado.id)) // [offlineSync] garante sync mesmo se app fechar antes do delay
            if (planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado)
            setPlanoParaRegistro(atualizado)
        }
        setRegistroEditando(null); setVerRegistros(true)
        setNovoRegistro({ dataAula: new Date().toISOString().split('T')[0], resumoAula: '', funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '', poderiaMelhorar: '', resultadoAula: '', anotacoesGerais: '', proximaAulaOpcao: '', urlEvidencia: '' })
        setRegAnoSel(''); setRegEscolaSel(''); setRegSegmentoSel(''); setRegTurmaSel('')
    }, [novoRegistro, _regEdit, planoParaRegistro, regAnoSel, regEscolaSel, regSegmentoSel, regTurmaSel, planos, planoSelecionado, setModalConfirm, setPlanoParaRegistro, setRegistroEditando, setVerRegistros, setNovoRegistro, setRegAnoSel, setRegEscolaSel, setRegSegmentoSel, setRegTurmaSel])

    const excluirRegistro = useCallback((registroId: string | number) => {
        setModalConfirm({ titulo: 'Excluir registro?', conteudo: 'Esta ação não pode ser desfeita.', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
            const atualizado = carimbарTimestamp({ ...planoParaRegistro!, registrosPosAula: planoParaRegistro!.registrosPosAula.filter((r: any) => r.id !== registroId) })
            setPlanos(planos.map((p: any) => p.id === atualizado.id ? atualizado : p))
            marcarPendente('planos', String(atualizado.id)) // [offlineSync]
            if (planoSelecionado && planoSelecionado.id === atualizado.id) setPlanoSelecionado(atualizado)
            setPlanoParaRegistro(atualizado)
        } })
    }, [planoParaRegistro, planos, planoSelecionado, setModalConfirm, setPlanoParaRegistro])

    const editarRegistro = useCallback((reg: RegistroPosAula) => {
        setRegistroEditando(reg)
        setNovoRegistro({
            dataAula: reg.data || new Date().toISOString().split('T')[0],
            resumoAula: reg.resumoAula || '', funcionouBem: reg.funcionouBem || '',
            fariadiferente: reg.fariadiferente || '', proximaAula: reg.proximaAula || '',
            comportamento: reg.comportamento || '', poderiaMelhorar: reg.poderiaMelhorar || '',
            resultadoAula: reg.resultadoAula || '', anotacoesGerais: reg.anotacoesGerais || '',
            proximaAulaOpcao: reg.proximaAulaOpcao || '',
            urlEvidencia: (reg as any).urlEvidencia || '',
            // campos novos (B1, B2, A2) — incluídos na edição para não perdê-los ao salvar
            ...(reg.chamada        ? { chamada: reg.chamada }               : {}),
            ...(reg.encaminhamentos ? { encaminhamentos: reg.encaminhamentos } : {}),
            ...(reg.rubrica        ? { rubrica: reg.rubrica }               : {}),
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
                        novosRegistros.push({ id: gerarIdSeguro() as unknown as number, data: rrData, dataRegistro: agora.toISOString().split('T')[0], hora: agora.toTimeString().slice(0, 5), anoLetivo: rrAnoSel, escola: rrEscolaSel, segmento: segmentoId!, turma: turmaId, resumoAula: texto, funcionouBem: '', fariadiferente: '', proximaAula: '', comportamento: '' })
                        planoModificado = true; totalNovos++
                    }
                })
                if (planoModificado) return carimbарTimestamp({ ...plano, registrosPosAula: [...(plano.registrosPosAula || []), ...novosRegistros] })
                return plano
            })
            if (totalNovos > 0 || totalAtualizados > 0) {
                setPlanos(planosAtualizados)
                planosAtualizados.forEach((p: any, i: number) => { if (p !== planos[i]) marcarPendente('planos', String(p.id)) }) // [offlineSync]
                let msg = '✅ '; if (totalNovos > 0) msg += `${totalNovos} novo(s)`; if (totalNovos > 0 && totalAtualizados > 0) msg += ' + '; if (totalAtualizados > 0) msg += `${totalAtualizados} atualizado(s)`; msg += '!'
                showToast(msg, 'success')
                setModalRegistroRapido(false)
                setRrTextos({}); setRrPlanosSegmento({})
            } else {
                showToast('Preencha pelo menos uma turma e selecione um plano.', 'error')
            }
        }
        if (feriado) { setModalConfirm({ titulo: '⚠️ Feriado', conteudo: `Hoje é feriado: ${feriado}\n\nDeseja registrar aula mesmo assim?`, labelConfirm: 'Registrar mesmo assim', onConfirm: _executar }) }
        else { _executar() }
    }, [rrData, rrTextos, rrAnoSel, rrEscolaSel, rrPlanosSegmento, planos, anosLetivos, setPlanos, setModalConfirm, setModalRegistroRapido, setRrTextos, setRrPlanosSegmento])

    // ── KANBAN STATUS ────────────────────────────────────────────────────────
    const atualizarKanbanStatus = useCallback((id: string | number, status: Plano['kanbanStatus']) => {
        setPlanos(prev => prev.map(p => String(p.id) === String(id) ? { ...p, kanbanStatus: status } : p))
    }, [setPlanos])

    // ── NOTAS DE ADAPTAÇÃO POR TURMA ─────────────────────────────────────────
    // Regra: máximo uma nota por turmaId por plano (upsert).
    const salvarNotaAdaptacao = useCallback((
        planoId: string | number,
        dados: { turmaId: string; turmaNome: string; texto: string }
    ) => {
        setPlanos(prev => prev.map(p => {
            if (String(p.id) !== String(planoId)) return p
            const notas = p.notasAdaptacao ?? []
            const existente = notas.find(n => n.turmaId === dados.turmaId)
            const agora = new Date().toISOString()
            if (existente) {
                // Atualiza nota existente da turma
                return {
                    ...p,
                    notasAdaptacao: notas.map(n =>
                        n.turmaId === dados.turmaId
                            ? { ...n, texto: dados.texto, turmaNome: dados.turmaNome, atualizadaEm: agora }
                            : n
                    )
                }
            }
            // Cria nova nota
            const nova: import('../types').NotaAdaptacaoTurma = {
                id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                turmaId: dados.turmaId,
                turmaNome: dados.turmaNome,
                texto: dados.texto,
                criadaEm: agora,
                atualizadaEm: agora,
            }
            return { ...p, notasAdaptacao: [...notas, nova] }
        }))
    }, [setPlanos])

    const removerNotaAdaptacao = useCallback((planoId: string | number, notaId: string) => {
        setPlanos(prev => prev.map(p =>
            String(p.id) !== String(planoId) ? p : {
                ...p,
                notasAdaptacao: (p.notasAdaptacao ?? []).filter(n => n.id !== notaId)
            }
        ))
    }, [setPlanos])

    // ── SEQUENTIAL UNIT PLANNING (C4) ────────────────────────────────────────
    /** Gera N planos rascunho a partir dos slots de uma sequência didática.
     *  Calcula automaticamente as datas com base em dataInicio + diasSemana.
     *  Retorna a quantidade de planos criados. */
    const criarPlanosDeSequencia = useCallback((
        sequencia: Sequencia,
        opts: { turma?: string; escola?: string; nivel?: string; dataInicio: string; diasSemana: number[] }
    ): number => {
        const { turma = '', escola = '', nivel = 'Geral', dataInicio, diasSemana } = opts
        if (!sequencia.slots || sequencia.slots.length === 0) return 0
        if (diasSemana.length === 0) return 0

        // Gera datas sequenciais respeitando os dias da semana escolhidos
        function proximasDatas(inicio: string, qtd: number, dias: number[]): string[] {
            const resultado: string[] = []
            const d = new Date(inicio + 'T12:00:00')
            while (resultado.length < qtd) {
                if (dias.includes(d.getDay())) resultado.push(d.toISOString().split('T')[0])
                d.setDate(d.getDate() + 1)
            }
            return resultado
        }

        const datas = proximasDatas(dataInicio, sequencia.slots.length, diasSemana)
        const base = Date.now()
        const novos: Plano[] = sequencia.slots.map((slot, i) => ({
            id: base + i,
            titulo: `${sequencia.titulo} — Aula ${slot.ordem ?? i + 1}`,
            tema: '',
            nivel,
            duracao: '50',
            escola,
            turma,
            data: datas[i],
            historicoDatas: [datas[i]],
            objetivoGeral: '',
            objetivosEspecificos: [],
            conceitos: [],
            tags: [],
            unidades: [],
            faixaEtaria: [],
            materiais: [],
            habilidadesBNCC: [],
            recursos: [],
            atividadesRoteiro: [],
            registrosPosAula: [],
            destaque: false,
            statusPlanejamento: 'A Fazer',
            kanbanStatus: 'rascunho' as const,
            origemSequenciaId: sequencia.id,
            origemSlotOrdem: slot.ordem ?? i + 1,
            createdAt: new Date().toISOString(),
        }))
        setPlanos(prev => [...prev, ...novos])
        return novos.length
    }, [setPlanos])

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
                    showToast(validacao.erro || 'Arquivo inválido.', 'error')
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
                        showToast(`Backup restaurado! ${backup.planos.length} planos · ${backup.repertorio?.length||0} músicas · ${backup.atividades?.length||0} atividades`, 'success')
                    }
                })
            } catch { showToast('Não foi possível ler o arquivo. Ele pode estar corrompido.', 'error') }
        }
        reader.readAsText(file); event.target.value = ''
    }

    // ── Detecção de músicas no plano ──────────────────────────────────────
    const [musicasDetectadas, setMusicasDetectadas] = useState<MusicaDetectada[]>([])
    const limparMusicasDetectadas = () => setMusicasDetectadas([])
    const [showModalMusicas, setShowModalMusicas] = useState(false)

    // ── Detecção de estratégia no roteiro (IA) ────────────────────────────

    /** Adiciona um vínculo música↔plano e persiste. */
    const vincularMusicaAoPlano = useCallback((planoId: string | number, vinculo: VinculoMusicaPlano) => {
        // Atualiza plano → músicas
        setPlanos(prev => prev.map((p: any) => {
            if (p.id !== planoId) return p
            const jaExiste = (p.musicasVinculadasPlano || []).some(
                (v: VinculoMusicaPlano) => String(v.musicaId) === String(vinculo.musicaId)
            )
            if (jaExiste) return p
            return { ...p, musicasVinculadasPlano: [...(p.musicasVinculadasPlano || []), vinculo] }
        }))
        // Atualiza música → planos (relação bidirecional para usos futuros:
        // relatórios, histórico de turma, busca por música, sugestões IA)
        setRepertorio(prev => prev.map((m: any) => {
            if (String(m.id ?? m.titulo) !== String(vinculo.musicaId)) return m
            const jaTemPlano = (m.planosVinculados || []).some(
                (pId: any) => String(pId) === String(planoId)
            )
            if (jaTemPlano) return m
            return { ...m, planosVinculados: [...(m.planosVinculados || []), planoId] }
        }))
    }, [setPlanos, setRepertorio])

    /** Remove um vínculo música↔plano e persiste (ambas as direções). */
    const desvincularMusicaDoPlano = useCallback((planoId: string | number, musicaId: string | number) => {
        // Atualiza plano → músicas
        setPlanos(prev => prev.map((p: any) => {
            if (p.id !== planoId) return p
            return {
                ...p,
                musicasVinculadasPlano: (p.musicasVinculadasPlano || []).filter(
                    (v: VinculoMusicaPlano) => String(v.musicaId) !== String(musicaId)
                ),
            }
        }))
        // Atualiza música → planos
        setRepertorio(prev => prev.map((m: any) => {
            if (String(m.id ?? m.titulo) !== String(musicaId)) return m
            return {
                ...m,
                planosVinculados: (m.planosVinculados || []).filter(
                    (pId: any) => String(pId) !== String(planoId)
                ),
            }
        }))
    }, [setPlanos, setRepertorio])

    // ── OBJETIVOS COM IA (Gemini) ──────────────────────────────────────────
    const [gerandoObjetivos, setGerandoObjetivos] = React.useState(false)

    const sugerirObjetivosIA = async () => {
        const atividades = planoEditando.atividadesRoteiro || []
        if (atividades.length === 0) {
            showToast('Adicione pelo menos uma atividade no roteiro antes de gerar objetivos.', 'error')
            return
        }
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
        if (!apiKey) {
            showToast('Chave VITE_GEMINI_API_KEY não encontrada no .env.', 'error')
            return
        }
        const listaAtividades = atividades.map((a, i) => {
            const partes = [`${i + 1}. ${a.nome || 'Atividade'}`]
            if (a.duracao) partes.push(`(${a.duracao} min)`)
            if ((a.conceitos || []).length > 0) partes.push(`— conceitos: ${a.conceitos.join(', ')}`)
            return partes.join(' ')
        }).join('\n')
        const faixa = (planoEditando.faixaEtaria || []).join(', ')
        const prompt = `Você é um professor de música. Com base nas atividades abaixo, gere objetivos de aula curtos e diretos.

Faixa etária: ${faixa || 'não informada'}
Atividades:
${listaAtividades}

Responda APENAS no formato JSON:
{
  "geral": "objetivo geral — 1 frase ampla descrevendo a intenção principal da aula",
  "especificos": ["objetivo específico mensurável 1", "objetivo específico mensurável 2"]
}

Regras: máx. 15 palavras por objetivo, começar com verbo no infinitivo, ser práticos e pedagógicos. O campo "geral" é obrigatório.`

        setGerandoObjetivos(true)
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                }
            )
            if (!res.ok) {
                const errText = await res.text()
                console.error('Gemini error:', res.status, errText)
                throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            // Pega o texto ignorando thinking parts (parts com thought:true)
            const parts = data?.candidates?.[0]?.content?.parts || []
            const textPart = parts.find((p: any) => !p.thought) || parts[0]
            const texto = textPart?.text || ''
            const jsonMatch = texto.match(/\{[\s\S]*?\}(?=\s*$|\s*```)/s) || texto.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('Resposta inválida')
            const obj = JSON.parse(jsonMatch[0])
            if (!obj.geral && !obj.especificos?.length) throw new Error('Resposta sem objetivos')
            setPlanoEditando(prev => ({
                ...(prev!),
                objetivoGeral: obj.geral || prev?.objetivoGeral || '',
                objetivosEspecificos: obj.especificos?.length
                    ? obj.especificos
                    : (prev?.objetivosEspecificos || [])
            }))
            showToast('Objetivos gerados com IA!', 'success')
        } catch (err) {
            console.error('Gemini objetivos:', err)
            showToast(`Erro: ${err instanceof Error ? err.message : 'Falha na conexão'}`, 'error')
        } finally {
            setGerandoObjetivos(false)
        }
    }

    // ── BNCC COM IA (Gemini) ───────────────────────────────────────────────
    const [gerandoBNCC, setGerandoBNCC] = React.useState(false)

    const sugerirBNCC = async () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
        if (!apiKey) {
            showToast('Chave VITE_GEMINI_API_KEY não encontrada no .env.', 'error')
            return
        }
        const atividades = (planoEditando.atividadesRoteiro || []).map(a => a.nome).filter(Boolean).join(', ')
        const conceitos = (planoEditando.conceitos || []).join(', ')
        const faixa = (planoEditando.faixaEtaria || []).join(', ')
        const titulo = planoEditando.titulo || ''
        const objetivo = planoEditando.objetivoGeral?.replace(/<[^>]*>/g, '') || ''

        if (!titulo && !atividades && !conceitos) {
            showToast('Preencha pelo menos o título ou as atividades antes de sugerir habilidades BNCC.', 'error')
            return
        }

        const prompt = `Você é especialista em educação musical e na Base Nacional Comum Curricular (BNCC) do Brasil.

Com base nos dados abaixo, sugira as habilidades BNCC mais adequadas para esta aula de música:

Título: ${titulo}
Faixa etária: ${faixa || 'não informada'}
Objetivo: ${objetivo}
Atividades: ${atividades || 'não informadas'}
Conceitos musicais: ${conceitos || 'não informados'}

Responda APENAS no formato JSON:
{
  "habilidades": [
    "EF01AR14 - Descrição curta da habilidade",
    "EF02AR15 - Descrição curta da habilidade"
  ]
}

Retorne entre 2 e 4 habilidades reais da BNCC de Artes/Música. Use os códigos corretos (ex: EF01AR14, EF69AR15). Seja preciso.`

        setGerandoBNCC(true)
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                }
            )
            if (!res.ok) {
                const errText = await res.text()
                console.error('Gemini BNCC error:', res.status, errText)
                throw new Error(`HTTP ${res.status}`)
            }
            const data = await res.json()
            const parts = data?.candidates?.[0]?.content?.parts || []
            const textPart = parts.find((p: any) => !p.thought) || parts[0]
            const texto = textPart?.text || ''
            const jsonMatch = texto.match(/\{[\s\S]*\}/)
            if (!jsonMatch) throw new Error('Resposta inválida')
            const obj = JSON.parse(jsonMatch[0])
            const novas: string[] = obj.habilidades || []
            if (novas.length === 0) throw new Error('Nenhuma habilidade retornada')
            setPlanoEditando(prev => {
                const atuais = prev?.habilidadesBNCC || []
                return { ...(prev!), habilidadesBNCC: [...new Set([...atuais, ...novas])] }
            })
            showToast(`${novas.length} habilidade(s) BNCC sugeridas pela IA!`, 'success')
        } catch (err) {
            console.error('Gemini BNCC:', err)
            showToast(`Erro: ${err instanceof Error ? err.message : 'Falha na conexão'}`, 'error')
        } finally {
            setGerandoBNCC(false)
        }
    }

    // ── CONTEXT VALUE ─────────────────────────────────────────────────────
    const value = useMemo<PlanosContextValue>(() => ({
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
        filtroSegmento, setFiltroSegmento,
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
        escolas, segmentosPlanos, duracoesSugestao, planosFiltrados,
        normalizePlano, buscaAvancada, sugerirBNCC, gerandoBNCC, sugerirObjetivosIA, gerandoObjetivos,
        novoPlano, editarPlano, salvarPlano, excluirPlano, fecharModal, restaurarVersao,
        novaAulaSlots, setNovaAulaSlots,
        toggleConceito, toggleFaixa, toggleUnidade,
        adicionarRecurso, removerRecurso,
        adicionarDataEdicao, removerDataEdicao, adicionarDataAulaVisualizacao, removerDataAulaVisualizacao,
        adicionarConceitoNovo, adicionarTagNova, removerTag, adicionarUnidadeNova,
        adicionarAtividadeRoteiro, removerAtividadeRoteiro, atualizarAtividadeRoteiro,
        toggleFavorito, handleDragStart, handleDragEnter, handleDragEnd, toggleRecursosAtiv,
        templatesRoteiro, setTemplatesRoteiro, modalTemplates, setModalTemplates, nomeNovoTemplate, setNomeNovoTemplate,
        modalConfiguracoes, setModalConfiguracoes,
        musicasDetectadas, setMusicasDetectadas, limparMusicasDetectadas,
        showModalMusicas, setShowModalMusicas,
        vincularMusicaAoPlano, desvincularMusicaDoPlano,
        vincularMusicaAtividade, importarMusicaParaPlano, importarAtividadeParaPlano,
        abrirModalRegistro, salvarRegistro, editarRegistro, excluirRegistro,
        adicionarAtividadeAoPlano, sugerirPlanoParaTurma, salvarRegistroRapido, atualizarKanbanStatus, criarPlanosDeSequencia,
        salvarNotaAdaptacao, removerNotaAdaptacao,
        baixarBackup, restaurarBackup,
        userId,
    }), [planos, planoSelecionado, modoEdicao, planoEditando, formExpandido, materiaisBloqueados, novoConceito, adicionandoConceito, novaUnidade, adicionandoUnidade, novoRecursoUrl, novoRecursoTipo, novaDataAula, dataEdicao, busca, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel, filtroEscola, filtroTag, filtroSegmento, filtroFavorito, filtroStatus, modoVisualizacao, ordenacaoCards, limparFiltros, statusDropdownId, recursosExpandidos, modalImportarMusica, modalImportarAtividade, dragActiveIndex, dragOverIndex, escolas, segmentosPlanos, duracoesSugestao, planosFiltrados, buscaAvancada, sugerirBNCC, gerandoBNCC, sugerirObjetivosIA, gerandoObjetivos, novoPlano, editarPlano, salvarPlano, excluirPlano, fecharModal, restaurarVersao, toggleConceito, toggleFaixa, toggleUnidade, adicionarRecurso, removerRecurso, adicionarDataEdicao, removerDataEdicao, adicionarDataAulaVisualizacao, removerDataAulaVisualizacao, adicionarConceitoNovo, adicionarTagNova, removerTag, adicionarUnidadeNova, adicionarAtividadeRoteiro, removerAtividadeRoteiro, atualizarAtividadeRoteiro, toggleFavorito, handleDragStart, handleDragEnter, handleDragEnd, toggleRecursosAtiv, templatesRoteiro, modalTemplates, nomeNovoTemplate, modalConfiguracoes, musicasDetectadas, setMusicasDetectadas, limparMusicasDetectadas, showModalMusicas, vincularMusicaAoPlano, desvincularMusicaDoPlano, vincularMusicaAtividade, importarMusicaParaPlano, importarAtividadeParaPlano, abrirModalRegistro, salvarRegistro, editarRegistro, excluirRegistro, adicionarAtividadeAoPlano, sugerirPlanoParaTurma, salvarRegistroRapido, atualizarKanbanStatus, criarPlanosDeSequencia, baixarBackup, restaurarBackup, userId])

    return <PlanosContext.Provider value={value}>{children}</PlanosContext.Provider>
}
