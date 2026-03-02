// ============================================================
// MusiLab — Tipos TypeScript principais
// Fase 1 da migração incremental para TypeScript
// ============================================================

// ─── STATUS DE SINCRONIZAÇÃO ─────────────────────────────────
export type SyncStatus = 'idle' | 'salvando' | 'salvo' | 'erro'

// ─── PLANO DE AULA ───────────────────────────────────────────
export interface AtividadeRoteiro {
  id: string | number
  nome: string
  duracao: string
  descricao?: string
  musicaVinculada?: string | null
}

export interface RegistroPosAula {
  id: string | number
  data: string
  resumo: string
  participacao: string
  observacoes?: string
  humor?: string
}

export interface Plano {
  id: string
  titulo: string
  tema?: string
  nivel: string
  duracao: string
  escola?: string
  data?: string
  objetivoGeral?: string
  objetivosEspecificos: string[]
  conceitos: string[]
  tags: string[]
  unidades: string[]
  faixaEtaria: string[]
  materiais: string[]
  habilidadesBNCC: string[]
  recursos: string[]
  historicoDatas: string[]
  atividadesRoteiro: AtividadeRoteiro[]
  registrosPosAula: RegistroPosAula[]
  destaque: boolean
  favorito?: boolean
  statusPlanejamento: 'A Fazer' | 'Em Progresso' | 'Concluído'
  arquivado?: boolean
  cor?: string
  createdAt?: string
  updatedAt?: string
}

// ─── ATIVIDADE PEDAGÓGICA ─────────────────────────────────────
export interface Atividade {
  id: string
  nome: string
  descricao?: string
  categoria?: string
  faixaEtaria: string[]
  tags: string[]
  recursos: string[]
  musicasVinculadas?: string[]
  arquivada?: boolean
  createdAt?: string
}

// ─── REPERTÓRIO / MÚSICA ──────────────────────────────────────
export interface Musica {
  id: string
  titulo: string
  autor?: string
  origem?: string
  estilo?: string
  tonalidade?: string
  escala?: string
  compasso?: string
  andamento?: string
  estrutura?: string
  energia?: string
  instrumentacao?: string
  dinamica?: string
  tags?: string[]
  observacoes?: string
  arquivada?: boolean
  faixaEtaria?: string[]
  createdAt?: string
}

// ─── SEQUÊNCIA DIDÁTICA ───────────────────────────────────────
export interface SlotSequencia {
  id: string | number
  ordem: number
  planoVinculado?: string | null
  rascunho?: {
    titulo?: string
    setlist?: string[]
    observacoes?: string
  } | null
}

export interface Sequencia {
  id: string
  titulo: string
  anoLetivoId?: string
  escolaId?: string
  segmentos?: string[]
  turmaEspecifica?: string | null
  unidadePredominante?: string
  duracao?: 'mensal' | 'bimestral' | 'semestral' | 'manual'
  numeroSlots?: number
  dataInicio?: string
  dataFim?: string
  slots: SlotSequencia[]
  createdAt?: string
}

// ─── ESTRATÉGIA PEDAGÓGICA ────────────────────────────────────
export interface Estrategia {
  id: string
  nome: string
  categoria?: string
  funcao?: string
  objetivo?: string
  descricao?: string
  arquivada?: boolean
  tags?: string[]
  createdAt?: string
}

// ─── ANO LETIVO / ESCOLA ──────────────────────────────────────
export interface Turma {
  id: string
  nome: string
}

export interface Segmento {
  id: string
  nome: string
  turmas: Turma[]
}

export interface Escola {
  id: string
  nome: string
  segmentos: Segmento[]
}

export interface AnoLetivo {
  id: string
  nome: string
  ano?: string | number
  dataInicio?: string
  dataFim?: string
  escolas: Escola[]
}

// ─── EVENTO ESCOLAR ───────────────────────────────────────────
export interface EventoEscolar {
  id?: string
  data: string
  nome: string
  descricao?: string
  tipo?: string
}

// ─── GRADE SEMANAL ───────────────────────────────────────────
export interface SlotGrade {
  dia: string
  hora: string
  turma?: string
  escola?: string
  segmento?: string
}

export interface GradeSemanal {
  id: string
  slots: SlotGrade[]
}

// ─── MODAIS ─────────────────────────────────────────────────
export interface ModalConfirmState {
  titulo?: string
  conteudo: string
  onConfirm?: () => void
  onCancel?: () => void
  labelConfirm?: string
  labelCancelar?: string
  somenteOk?: boolean
  perigo?: boolean
}

// ─── CONFIGURAÇÕES ───────────────────────────────────────────
export interface Configuracoes {
  tema?: string
  idioma?: string
  notificacoes?: boolean
  [key: string]: unknown
}

// ─── SUPABASE ROW ────────────────────────────────────────────
export interface SupabaseRow<T = unknown> {
  user_id: string
  item_id: string
  data: T
}

// ─── CONTEXTO PRINCIPAL ──────────────────────────────────────
// Tipagem parcial do contexto — será expandida conforme arquivos
// forem convertidos para TypeScript nas fases seguintes.
// Por ora serve como documentação e guia para os componentes.
export interface BancoPlanosContextValue {
  // Dados principais
  planos: Plano[]
  setPlanos: React.Dispatch<React.SetStateAction<Plano[]>>
  atividades: Atividade[]
  setAtividades: React.Dispatch<React.SetStateAction<Atividade[]>>
  repertorio: Musica[]
  setRepertorio: React.Dispatch<React.SetStateAction<Musica[]>>
  sequencias: Sequencia[]
  setSequencias: React.Dispatch<React.SetStateAction<Sequencia[]>>
  estrategias: Estrategia[]
  setEstrategias: React.Dispatch<React.SetStateAction<Estrategia[]>>
  eventosEscolares: EventoEscolar[]
  setEventosEscolares: React.Dispatch<React.SetStateAction<EventoEscolar[]>>
  anosLetivos: AnoLetivo[]
  setAnosLetivos: React.Dispatch<React.SetStateAction<AnoLetivo[]>>

  // Status de salvamento
  statusSalvamento: SyncStatus

  // Modal de confirmação
  modalConfirm: ModalConfirmState | null
  setModalConfirm: React.Dispatch<React.SetStateAction<ModalConfirmState | null>>

  // Filtros gerais de planos
  busca: string
  setBusca: React.Dispatch<React.SetStateAction<string>>
  filtroTag: string
  setFiltroTag: React.Dispatch<React.SetStateAction<string>>
  filtroStatus: string
  setFiltroStatus: React.Dispatch<React.SetStateAction<string>>
  filtroNivel: string
  setFiltroNivel: React.Dispatch<React.SetStateAction<string>>
  filtroFaixa: string
  setFiltroFaixa: React.Dispatch<React.SetStateAction<string>>
  filtroEscola: string
  setFiltroEscola: React.Dispatch<React.SetStateAction<string>>
  filtroUnidade: string
  setFiltroUnidade: React.Dispatch<React.SetStateAction<string>>
  filtroConceito: string
  setFiltroConceito: React.Dispatch<React.SetStateAction<string>>
  filtroFavorito: boolean
  setFiltroFavorito: React.Dispatch<React.SetStateAction<boolean>>

  // Filtros de repertório
  filtroAndamento: string
  setFiltroAndamento: React.Dispatch<React.SetStateAction<string>>
  filtroTonalidade: string
  setFiltroTonalidade: React.Dispatch<React.SetStateAction<string>>
  filtroEscala: string
  setFiltroEscala: React.Dispatch<React.SetStateAction<string>>
  filtroCompasso: string
  setFiltroCompasso: React.Dispatch<React.SetStateAction<string>>
  filtroEstrutura: string
  setFiltroEstrutura: React.Dispatch<React.SetStateAction<string>>
  filtroEnergia: string
  setFiltroEnergia: React.Dispatch<React.SetStateAction<string>>
  filtroInstrumentacao: string
  setFiltroInstrumentacao: React.Dispatch<React.SetStateAction<string>>
  filtroDinamica: string
  setFiltroDinamica: React.Dispatch<React.SetStateAction<string>>
  filtroOrigem: string
  setFiltroOrigem: React.Dispatch<React.SetStateAction<string>>
  filtroEstilo: string
  setFiltroEstilo: React.Dispatch<React.SetStateAction<string>>

  // Filtros de sequências
  filtroEscolaSequencias: string
  setFiltroEscolaSequencias: React.Dispatch<React.SetStateAction<string>>
  filtroUnidadeSequencias: string
  setFiltroUnidadeSequencias: React.Dispatch<React.SetStateAction<string>>
  filtroPeriodoSequencias: string
  setFiltroPeriodoSequencias: React.Dispatch<React.SetStateAction<string>>
  buscaProfundaSequencias: string
  setBuscaProfundaSequencias: React.Dispatch<React.SetStateAction<string>>

  // Filtros de estratégias
  filtroCategoriaEstrategia: string
  setFiltroCategoriaEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroFuncaoEstrategia: string
  setFiltroFuncaoEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroObjetivoEstrategia: string
  setFiltroObjetivoEstrategia: React.Dispatch<React.SetStateAction<string>>

  // Constantes de domínio
  faixas: string[]
  unidades: string[]
  escolas: string[]
  conceitos: string[]

  // Funções CRUD de planos
  editarPlano: (plano: Plano) => void
  excluirPlano: (id: string) => void
  toggleFavorito: (id: string) => void

  // Funções de sequência
  novaSequencia: () => void
  excluirSequencia: (id: string) => void
  salvarSequencia: () => void
  atualizarRascunhoSlot: (sequenciaId: string, slotIndex: number, campo: string, valor: unknown) => void
  desvincularPlano: (sequenciaId: string, slotIndex: number) => void
  vincularPlanoAoSlot: (planoId: string) => void

  // Modais de sequência
  sequenciaEditando: Sequencia | null
  setSequenciaEditando: React.Dispatch<React.SetStateAction<Sequencia | null>>
  sequenciaDetalhe: Sequencia | null
  setSequenciaDetalhe: React.Dispatch<React.SetStateAction<Sequencia | null>>
  modalVincularPlano: { sequenciaId: string; slotIndex: number } | null
  setModalVincularPlano: React.Dispatch<React.SetStateAction<{ sequenciaId: string; slotIndex: number } | null>>
  buscaPlanoVinculo: string
  setBuscaPlanoVinculo: React.Dispatch<React.SetStateAction<string>>

  // Outros campos — indexados para compatibilidade com JS existente
  [key: string]: unknown
}
