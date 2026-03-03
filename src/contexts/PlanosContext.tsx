// src/contexts/PlanosContext.tsx
// Parte 8 da refatoração: estados e funções de Planos de Aula

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useModalContext } from './ModalContext'
import { useAnoLetivoContext } from './AnoLetivoContext'
import { useRepertorioContext } from './RepertorioContext'
import { dbGet, dbSet } from '../lib/db'
import { sanitizeUrl } from '../lib/utils'

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
export function normalizePlano(p: any): any {
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

// ── Interface ────────────────────────────────────────────────────────────
export interface PlanosContextValue {
    // estados
    planos: any[]; setPlanos: React.Dispatch<React.SetStateAction<any[]>>
    planoSelecionado: any; setPlanoSelecionado: React.Dispatch<React.SetStateAction<any>>
    modoEdicao: boolean; setModoEdicao: React.Dispatch<React.SetStateAction<boolean>>
    planoEditando: any; setPlanoEditando: React.Dispatch<React.SetStateAction<any>>
    formExpandido: boolean; setFormExpandido: React.Dispatch<React.SetStateAction<boolean>>
    materiaisBloqueados: any[]; setMateriaisBloqueados: React.Dispatch<React.SetStateAction<any[]>>
    novoConceito: string; setNovoConceito: React.Dispatch<React.SetStateAction<string>>
    adicionandoConceito: boolean; setAdicionandoConceito: React.Dispatch<React.SetStateAction<boolean>>
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
    recursosExpandidos: Record<string, any>; setRecursosExpandidos: React.Dispatch<React.SetStateAction<Record<string, any>>>
    modalImportarMusica: boolean; setModalImportarMusica: React.Dispatch<React.SetStateAction<boolean>>
    modalImportarAtividade: boolean; setModalImportarAtividade: React.Dispatch<React.SetStateAction<boolean>>
    filtroFavorito: boolean; setFiltroFavorito: React.Dispatch<React.SetStateAction<boolean>>
    filtroStatus: string; setFiltroStatus: React.Dispatch<React.SetStateAction<string>>
    modoVisualizacao: string; setModoVisualizacao: React.Dispatch<React.SetStateAction<string>>
    ordenacaoCards: string; setOrdenacaoCards: React.Dispatch<React.SetStateAction<string>>
    statusDropdownId: any; setStatusDropdownId: React.Dispatch<React.SetStateAction<any>>
    dragActiveIndex: any; setDragActiveIndex: React.Dispatch<React.SetStateAction<any>>
    dragOverIndex: any; setDragOverIndex: React.Dispatch<React.SetStateAction<any>>
    // computed
    escolas: string[]
    duracoesSugestao: string[]
    planosFiltrados: any[]
    // funções
    normalizePlano: (p: any) => any
    buscaAvancada: (plano: any, termoBusca: string) => boolean
    sugerirBNCC: () => void
    novoPlano: () => void
    editarPlano: (plano: any) => void
    salvarPlano: (ignorarAvisoEscola?: boolean) => void
    excluirPlano: (id: any) => void
    fecharModal: () => void
    restaurarVersao: (plano: any, versao: any) => void
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
    removerAtividadeRoteiro: (id: any) => void
    atualizarAtividadeRoteiro: (id: any, campo: string, valor: any) => void
    toggleFavorito: (plano: any, e?: any) => void
    handleDragStart: (index: any) => void
    handleDragEnter: (index: any) => void
    handleDragEnd: () => void
    toggleRecursosAtiv: (idx: any) => void
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
    const { setViewMode, repertorio, setRepertorio } = useRepertorioContext()
    const { anosLetivos, setModalTurmas, conceitos, setConceitos, unidades, setUnidades } = useAnoLetivoContext()

    // ── ESTADOS ──────────────────────────────────────────────────────────
    const [planos, setPlanos] = useState<any[]>(() => {
        const saved = dbGet('planosAula')
        const parsed = saved ? JSON.parse(saved) : []
        return parsed.map(normalizePlano)
    })
    const [planoSelecionado, setPlanoSelecionado] = useState<any>(null)
    const [modoEdicao, setModoEdicao] = useState(false)
    const [planoEditando, setPlanoEditando] = useState<any>(null)
    const [formExpandido, setFormExpandido] = useState(false)
    const [materiaisBloqueados, setMateriaisBloqueados] = useState<any[]>(() => {
        const saved = dbGet('materiaisBloqueados')
        return saved ? JSON.parse(saved) : []
    })
    // inputs temporários
    const [novoConceito, setNovoConceito] = useState('')
    const [adicionandoConceito, setAdicionandoConceito] = useState(false)
    const [novaUnidade, setNovaUnidade] = useState('')
    const [adicionandoUnidade, setAdicionandoUnidade] = useState(false)
    const [novoRecursoUrl, setNovoRecursoUrl] = useState('')
    const [novoRecursoTipo, setNovoRecursoTipo] = useState('link')
    const [novaDataAula, setNovaDataAula] = useState('')
    const [dataEdicao, setDataEdicao] = useState('')
    // busca e filtros
    const [busca, setBusca] = useState('')
    const [filtroConceito, setFiltroConceito] = useState('Todos')
    const [filtroUnidade, setFiltroUnidade] = useState('Todos')
    const [filtroFaixa, setFiltroFaixa] = useState('Todos')
    const [filtroNivel, setFiltroNivel] = useState('Todos')
    const [filtroEscola, setFiltroEscola] = useState('Todas')
    const [filtroTag, setFiltroTag] = useState('Todas')
    const [filtroFavorito, setFiltroFavorito] = useState(false)
    const [filtroStatus, setFiltroStatus] = useState('Todos')
    const [modoVisualizacao, setModoVisualizacao] = useState('grade')
    const [ordenacaoCards, setOrdenacaoCards] = useState('recente')
    const [statusDropdownId, setStatusDropdownId] = useState<any>(null)
    const [recursosExpandidos, setRecursosExpandidos] = useState<Record<string, any>>({})
    const [modalImportarMusica, setModalImportarMusica] = useState(false)
    const [modalImportarAtividade, setModalImportarAtividade] = useState(false)
    // drag and drop
    const dragItem = useRef<any>(null)
    const dragOverItem = useRef<any>(null)
    const [dragActiveIndex, setDragActiveIndex] = useState<any>(null)
    const [dragOverIndex, setDragOverIndex] = useState<any>(null)

    // ── EFEITOS ───────────────────────────────────────────────────────────
    useEffect(() => { dbSet('planosAula', JSON.stringify(planos)) }, [planos])
    useEffect(() => { dbSet('materiaisBloqueados', JSON.stringify(materiaisBloqueados)) }, [materiaisBloqueados])

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
        return check(plano.titulo) || check(plano.tema) || check(plano.metodologia) ||
            check(plano.objetivoGeral) || check(plano.escola) || objMatch ||
            (plano.habilidadesBNCC || []).some((h: any) => check(h))
    }

    const planosFiltrados = useMemo(() => {
        return planos.filter(plano => {
            const matchBusca    = buscaAvancada(plano, busca)
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
    }, [planos, busca, filtroConceito, filtroUnidade, filtroFaixa, filtroNivel, filtroEscola, filtroTag, filtroFavorito, filtroStatus, ordenacaoCards])

    // ── FUNÇÕES: PLANOS ───────────────────────────────────────────────────
    const novoPlano = () => {
        setPlanoEditando({
            id: Date.now(), titulo: '', tema: '', conceitos: [], tags: [],
            faixaEtaria: ['1° ano'], nivel: 'Iniciante', duracao: '',
            objetivoGeral: '', objetivosEspecificos: [], habilidadesBNCC: [],
            metodologia: '', materiais: [], recursos: [], historicoDatas: [],
            avaliacaoObservacoes: '', numeroAula: '', escola: '', destaque: false,
            statusPlanejamento: 'A Fazer',
        })
        setPlanoSelecionado(null); setModoEdicao(true); setViewMode('lista')
    }

    const editarPlano = useCallback((plano: any) => {
        setPlanoEditando(normalizePlano(plano))
        setPlanoSelecionado(null)
        setModoEdicao(true)
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
                    onConfirm: () => { salvarPlano(true); setModoEdicao(false); setPlanoEditando(null); setModalTurmas(true) },
                    onCancel: () => salvarPlano(true),
                }); return
            }
        }
        const planoParaSalvar = {
            ...planoEditando,
            objetivosEspecificos: planoEditando.objetivosEspecificos.filter((i: string) => i.trim() !== ''),
            habilidadesBNCC: (planoEditando.habilidadesBNCC || []).filter((i: string) => i.trim() !== ''),
            materiais: planoEditando.materiais.filter((i: string) => i.trim() !== ''),
            _ultimaEdicao: new Date().toISOString(),
        }
        const existe = planos.find((p: any) => p.id === planoParaSalvar.id)
        if (existe) {
            const versaoAnterior = { ...existe, _versaoSalvaEm: new Date().toISOString() }
            const historicoAtual = existe._historicoVersoes || []
            const novoHistorico = [versaoAnterior, ...historicoAtual].slice(0, 3)
            setPlanos(planos.map((p: any) => p.id === planoParaSalvar.id ? { ...planoParaSalvar, _historicoVersoes: novoHistorico } : p))
        } else {
            setPlanos([...planos, planoParaSalvar])
        }
        setModoEdicao(false); setPlanoEditando(null)
    }

    const excluirPlano = useCallback((id: any) => {
        setModalConfirm({
            titulo: 'Excluir plano?', conteudo: 'Esta ação não pode ser desfeita.',
            labelConfirm: 'Excluir', perigo: true,
            onConfirm: () => { setPlanos(prev => prev.filter((p: any) => p.id !== id)); setPlanoSelecionado(null) }
        })
    }, [setModalConfirm])

    const fecharModal = () => {
        setPlanoSelecionado(null); setModoEdicao(false); setPlanoEditando(null)
        setNovoRecursoUrl(''); setFormExpandido(false)
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
        setPlanoSelecionado((prev: any) => prev && prev.id === plano.id ? atualizado : prev)
        setPlanoEditando((prev: any) => prev && prev.id === plano.id ? atualizado : prev)
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
    }

    return <PlanosContext.Provider value={value}>{children}</PlanosContext.Provider>
}
