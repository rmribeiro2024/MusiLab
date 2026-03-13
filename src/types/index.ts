// ============================================================
// MusiLab — Tipos TypeScript principais
// Fase 1 da migração incremental para TypeScript
// ============================================================

// ─── STATUS DE SINCRONIZAÇÃO ─────────────────────────────────
export type SyncStatus = 'idle' | 'salvando' | 'salvo' | 'erro'

// ─── TIPOS AUXILIARES ────────────────────────────────────────
export interface RecursoItem { url: string; tipo?: string; titulo?: string; observacao?: string }
export interface MusicaVinculo { id?: string | number; titulo?: string; autor?: string }
export type ArquivoMidia = string | { nome: string; data?: string; url?: string }

// ─── GRADE SEMANAL (calendário) ──────────────────────────────
export interface AulaGrade {
  id: number
  diaSemana: string
  horario: string
  segmentoId: string
  turmaId: string
  observacao?: string
  anoLetivoId?: string
  escolaId?: string
}

export interface GradeEditando {
  id: number
  anoLetivoId: string
  escolaId: string
  dataInicio: string
  dataFim: string
  aulas: AulaGrade[]
}

// ─── APLICAÇÃO DE AULA ────────────────────────────────────────
// Representa a aplicação operacional de uma aula-base (Plano) para uma
// turma específica em uma data específica. Não altera o plano base.
export interface AplicacaoAula {
  id: string
  planoId: string | number        // referência à aula-base (Plano.id)
  anoLetivoId: string
  escolaId: string
  segmentoId: string
  turmaId: string
  data: string                    // YYYY-MM-DD
  horario?: string                // "08:00" — herdado da AulaGrade
  status: 'planejada' | 'realizada' | 'cancelada'
  adaptacaoTexto?: string         // anotações locais — nunca afeta o plano base
  atividadesOcultas?: string[]    // IDs de AtividadeRoteiro a pular nesta turma
  _updatedAt?: string
}

// Helper para criar aplicações em lote a partir de slots da grade semanal
export interface AplicacaoAulaSlot {
  anoLetivoId: string
  escolaId: string
  segmentoId: string
  turmaId: string
  data: string
  horario?: string
}

// ─── PLANEJAMENTO ANUAL ───────────────────────────────────────
export interface PeriodoAnual {
  id?: string | number
  nome: string
  dataInicio?: string
  dataFim?: string
  tema?: string
  foco?: string
  reflexao?: string
  _criadoEm?: string
}

export interface PlanejamentoAnualItem {
  id: string | number
  nome?: string
  dataInicio?: string
  dataFim?: string
  periodos?: PeriodoAnual[]
  metas?: Array<{ id: string | number; descricao: string; tipo: string; _criadoEm?: string }>
  _criadoEm?: string
  _ultimaEdicao?: string
}

// ─── PLANO DE AULA ───────────────────────────────────────────
export interface AtividadeRoteiro {
  id: string | number
  nome: string
  duracao: string
  descricao?: string
  musicaVinculada?: string | null
  musicasVinculadas?: MusicaVinculo[]
  conceitos?: string[]
  tags?: string[]
  recursos?: RecursoItem[]
  musicaId?: string | number
  estrategiasVinculadas?: string[]
  origemAtividadeId?: string | number // referência à atividade da biblioteca
}

export interface RegistroPosAula {
  id: string | number
  data: string
  resumo?: string
  participacao?: string
  observacoes?: string
  humor?: string
  // Campos do formulário de registro pós-aula
  turma?: string | number
  dataAula?: string
  resumoAula?: string
  funcionouBem?: string
  naoFuncionou?: string
  proximaAula?: string
  comportamento?: string
  anoLetivo?: string
  escola?: string
  segmento?: string
  serie?: string
  dataEdicao?: string
  dataRegistro?: string
  hora?: string
  poderiaMelhorar?: string
  resultadoAula?: string
  anotacoesGerais?: string
  proximaAulaOpcao?: string
  urlEvidencia?: string
  chamada?: { alunoId: string; presente: boolean }[]
  encaminhamentos?: { id: string; texto: string; concluido: boolean }[]
  rubrica?: ItemRubrica[]
  audioNotaDeVoz?: string   // base64 do blob de áudio (sem prefixo data:...)
  audioDuracao?: number     // segundos gravados
  audioMime?: string        // mime type (ex: 'audio/webm')
}

export interface Plano {
  id: string | number
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
  recursos: RecursoItem[]
  historicoDatas: string[]
  atividadesRoteiro: AtividadeRoteiro[]
  registrosPosAula: RegistroPosAula[]
  destaque: boolean
  favorito?: boolean
  statusPlanejamento: string
  turma?: string
  numeroAula?: number | string
  arquivado?: boolean
  cor?: string
  metodologia?: string
  avaliacaoObservacoes?: string
  unidade?: string
  segmento?: string
  segmentos?: string[]   // auto-catalogado ao aplicar em turmas
  musicasVinculadasPlano?: VinculoMusicaPlano[]  // vínculo plano ↔ repertório
  createdAt?: string
  updatedAt?: string
  _ultimaEdicao?: string
  /** @deprecated Sem UI de restauração exposta — não salvar novas versões. Campo preservado para leitura de dados antigos. */
  _historicoVersoes?: Array<Plano & { _versaoSalvaEm: string }>
  kanbanStatus?: 'rascunho' | 'pronto' | 'aplicado' | 'revisado'
  origemSequenciaId?: string   // C4: preenchido quando criado via sequential planning
  origemSlotOrdem?: number     // C4: posição do slot que originou este plano
}

// ─── VÍNCULO MÚSICA ↔ PLANO ──────────────────────────────────
// Separa a entidade Música (Repertório) da relação de uso (Plano ↔ Música).
// Permite responder: em quais planos uma música foi usada, quantas vezes,
// por quais turmas. Campo atividadeIdx reservado para vínculo por atividade
// específica — implementação futura.
export interface VinculoMusicaPlano {
  musicaId: string | number
  titulo: string
  autor?: string
  atividadeIdx?: number                             // futuro: atividade específica
  origemDeteccao?: 'encontrada' | 'nova' | 'manual'
  confirmadoPor?: 'auto' | 'professor'
  confirmadoEm?: string                             // ISO timestamp
}

// ─── ATIVIDADE PEDAGÓGICA ─────────────────────────────────────
export interface Atividade {
  id: string | number
  nome: string
  descricao?: string
  duracao?: string
  categoria?: string
  faixaEtaria: string[]
  tags: string[]
  recursos: RecursoItem[]  // string (url) ou { url, tipo }
  musicasVinculadas?: MusicaVinculo[]  // string ou { id, titulo, autor }
  materiais?: string[]
  unidade?: string
  observacao?: string
  conceitos?: string[]
  arquivada?: boolean
  createdAt?: string
  // Métricas de uso (Prompt 1 / Analytics)
  contadorUso?: number
  ultimoUso?: string // ISO date
  planosVinculados?: Array<{ planoId: string | number; planoTitulo: string; usadoEm: string }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// ─── REPERTÓRIO / MÚSICA ──────────────────────────────────────
export interface Musica {
  id?: string | number
  titulo: string
  autor?: string
  origem?: string
  // Campos individuais (legado — mantidos para compatibilidade)
  estilo?: string
  tonalidade?: string
  escala?: string
  compasso?: string
  andamento?: string
  estrutura?: string
  energia?: string
  dinamica?: string
  // Campos em array (novo formato)
  estilos?: string[]
  tonalidades?: string[]
  escalas?: string[]
  compassos?: string[]
  andamentos?: string[]
  estruturas?: string[]
  energias?: string[]
  dinamicas?: string[]
  instrumentacao?: string[]
  instrumentoDestaque?: string
  // Vínculos
  planosVinculados?: Array<string | number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atividadesVinculadas?: any[]
  links?: string[]
  // pdfs e audios podem ser string (url) ou objeto {nome, data} (arquivo carregado)
  pdfs?: ArquivoMidia[]
  audios?: ArquivoMidia[]
  tags?: string[]
  observacoes?: string
  arquivada?: boolean
  faixaEtaria?: string[]
  createdAt?: string
  // Campos computados pelo módulo de histórico musical
  vezesUsada?: number
  primeiraData?: string
  ultimaData?: string
  datas?: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aulas?: any[]
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
    materiais?: string[]
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
  duracao?: string
  numeroSlots?: number
  dataInicio?: string
  dataFim?: string
  slots: SlotSequencia[]
  createdAt?: string
  // Prompt 6: campos analytics
  contadorUso?: number
  ultimoUso?: string // ISO date — quando o último slot foi preenchido
}

// ─── ESTRATÉGIA PEDAGÓGICA ────────────────────────────────────
export interface HistoricoUsoEstrategia {
  planoId: string | number
  planoTitulo: string
  data: string
}

export interface Estrategia {
  id: string
  nome: string
  // Campos originais — preservados
  categoria?: string
  funcao?: string
  objetivo?: string
  descricao?: string
  ativo?: boolean
  objetivos?: string[]
  faixaEtaria?: string | string[]
  arquivada?: boolean
  tags?: string[]
  createdAt?: string
  _criadoEm?: string
  _ultimaEdicao?: string
  // Campos pedagógicos novos
  dimensoes?: string[]                    // ['Musical', 'Condução', 'Cultura de Sala de Aula']
  origem?: string                         // Referência: 'Kodály, RCPPM...'
  variacoes?: string                      // Campo separado da descrição
  tempoEstimado?: string                  // '5 min', '10-15 min'
  // Mielinização pedagógica
  contadorUso?: number                    // Quantas vezes foi usada em planos
  historicoUso?: HistoricoUsoEstrategia[] // Registro completo de uso
}

// ─── ANO LETIVO / ESCOLA ──────────────────────────────────────

export interface AnotacaoAluno {
  id: string
  data: string           // ISO date
  texto: string
  tipo?: string          // livre ou de lista configurável da turma
  planoId?: string       // vínculo opcional com o plano da aula
}

export interface MarcoAluno {
  id: string
  data: string           // ISO date
  descricao: string      // ex: "Tocou a peça completa sem partitura"
}

export interface AlunoDestaque {
  id: string
  nome: string
  flag: boolean          // ⚠️ atenção especial
  nota?: string          // observação rápida (1 linha)
  instrumento?: string   // ex: "flauta", "violão", "voz"
  anotacoes?: AnotacaoAluno[]
  marcos?: MarcoAluno[]
}

export interface CriterioRubrica {
  id: string
  nome: string
  escala: 3 | 5       // pontos na escala (1-3 ou 1-5)
}

export interface ItemRubrica {
  criterioId: string
  valor: number       // pontuação obtida
}

export interface Turma {
  id: string
  nome: string
  alunos?: AlunoDestaque[]
  rubricas?: CriterioRubrica[]   // critérios configurados para esta turma
  tiposAnotacao?: string[]       // ex: ["dominou peça", "esqueceu instrumento", "liderou grupo"]
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
  anoAtual?: boolean
  dataInicio?: string
  dataFim?: string
  status?: string
  escolas: Escola[]
}

// ─── EVENTO ESCOLAR ───────────────────────────────────────────
export interface EventoEscolar {
  id?: string | number
  data: string
  nome: string
  descricao?: string
  tipo?: string
  anoLetivoId?: string | number
  escolaId?: string | number
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// ─── PLANEJAMENTO POR TURMA ──────────────────────────────────
export interface PlanejamentoTurma {
  id: string
  // Chave composta da turma
  anoLetivoId: string
  escolaId: string
  segmentoId: string
  turmaId: string
  // Campos do planejamento
  dataPrevista?: string                  // YYYY-MM-DD
  origemAula?: 'banco' | 'adaptacao' | 'livre'
  planosRelacionadosIds?: string[]       // IDs de planos do banco — múltiplos
  oQuePretendoFazer: string             // campo principal obrigatório
  objetivo?: string                     // opcional, secundário
  materiais?: string[]
  observacoes?: string
  // Metadados
  criadoEm: string
  atualizadoEm: string
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
  toggleFavorito: (plano: Plano, e?: React.MouseEvent) => void

  // Funções de sequência
  novaSequencia: () => void
  excluirSequencia: (id: string) => void
  salvarSequencia: () => void
  atualizarRascunhoSlot: (sequenciaId: string, slotIndex: number, campo: string, valor: unknown) => void
  desvincularPlano: (sequenciaId: string, slotIndex: number) => void
  vincularPlanoAoSlot: (planoId: string | number) => void

  // Modais de sequência
  sequenciaEditando: Sequencia | null
  setSequenciaEditando: React.Dispatch<React.SetStateAction<Sequencia | null>>
  sequenciaDetalhe: Sequencia | null
  setSequenciaDetalhe: React.Dispatch<React.SetStateAction<Sequencia | null>>
  modalVincularPlano: { sequenciaId: string; slotIndex: number } | null
  setModalVincularPlano: React.Dispatch<React.SetStateAction<{ sequenciaId: string; slotIndex: number } | null>>
  buscaPlanoVinculo: string
  setBuscaPlanoVinculo: React.Dispatch<React.SetStateAction<string>>

  // Identificação do usuário
  userId?: string

  // Funções de modal de registro
  abrirModalRegistro: (plano: Plano, e: React.MouseEvent) => void

  // Backup
  baixarBackup: () => void
  restaurarBackup: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoBackupAtivo: boolean
  configurarAutoBackup: () => Promise<void>
  desativarAutoBackup: () => void
  salvarAutoBackupAgora: () => void
  sincronizarAgora: () => void

  // Aplicações de aula
  aplicacoes: AplicacaoAula[]
  aplicacoesPorData: Record<string, AplicacaoAula[]>
  criarAplicacoes: (planoId: string | number, slots: AplicacaoAulaSlot[]) => void
  atualizarStatusAplicacao: (id: string, status: AplicacaoAula['status']) => void
  salvarAdaptacao: (id: string, adaptacaoTexto: string) => void
  excluirAplicacao: (id: string) => void
  getAplicacoesDoDia: (data: string) => AplicacaoAula[]
  getAplicacoesDaSemana: (inicio: string, fim: string) => AplicacaoAula[]

  // Calendário / período
  dataFimCustom: string
  setDataFimCustom: React.Dispatch<React.SetStateAction<string>>
  dataInicioCustom: string
  setDataInicioCustom: React.Dispatch<React.SetStateAction<string>>
  periodoDias: number | string
  setPeriodoDias: React.Dispatch<React.SetStateAction<number | string>>

  // Modal adicionar atividade ao plano
  modalAdicionarAoPlano: Atividade | null
  setModalAdicionarAoPlano: React.Dispatch<React.SetStateAction<Atividade | null>>
  adicionarAtividadeAoPlano: (atividadeId: string | number, planoId: string | number) => void

  // Modal configurações
  modalConfiguracoes: boolean
  setModalConfiguracoes: React.Dispatch<React.SetStateAction<boolean>>
  setModalTurmas: React.Dispatch<React.SetStateAction<boolean>>
  setModalGradeSemanal: React.Dispatch<React.SetStateAction<boolean>>

  // Modal eventos
  modalEventos: boolean
  setModalEventos: React.Dispatch<React.SetStateAction<boolean>>
  eventoEditando: EventoEscolar | null
  setEventoEditando: React.Dispatch<React.SetStateAction<EventoEscolar | null>>
  novoEvento: () => void
  salvarEvento: () => void
  excluirEvento: (id: string | number | undefined) => void

  // Modal gestão de turmas
  modalTurmas: boolean
  mostrarArquivados: boolean
  setMostrarArquivados: React.Dispatch<React.SetStateAction<boolean>>
  gtAnoNovo: string
  setGtAnoNovo: React.Dispatch<React.SetStateAction<string>>
  gtAnoSel: string
  setGtAnoSel: React.Dispatch<React.SetStateAction<string>>
  gtEscolaNome: string
  setGtEscolaNome: React.Dispatch<React.SetStateAction<string>>
  gtEscolaSel: string
  setGtEscolaSel: React.Dispatch<React.SetStateAction<string>>
  gtSegmentoNome: string
  setGtSegmentoNome: React.Dispatch<React.SetStateAction<string>>
  gtSegmentoSel: string
  setGtSegmentoSel: React.Dispatch<React.SetStateAction<string>>
  gtTurmaNome: string
  setGtTurmaNome: React.Dispatch<React.SetStateAction<string>>
  gtAddAno: () => void
  gtRemoveAno: (anoId: string) => void
  gtAddEscola: () => void
  gtRemoveEscola: (anoId: string, escolaId: string) => void
  gtAddSegmento: () => void
  gtRemoveSegmento: (anoId: string, escolaId: string, segmentoId: string) => void
  gtAddTurma: () => void
  gtRemoveTurma: (anoId: string, escolaId: string, segmentoId: string, turmaId: string) => void
  gtMudarStatusAno: (anoId: string, novoStatus: string) => void

  // Outros campos — indexados para compatibilidade com bridge dinâmico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}
