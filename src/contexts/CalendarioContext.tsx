// src/contexts/CalendarioContext.tsx
// Estado e lógica de calendário, grade semanal e registro pós-aula.
// Extraído de BancoPlanos.tsx — Parte 7 da refatoração de contextos.

import React, { createContext, useContext, useState, useEffect } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { useModalContext } from './ModalContext'
import { useAnoLetivoContext } from './AnoLetivoContext'
import type { Plano, RegistroPosAula, GradeEditando, AulaGrade, EventoEscolar } from '../types'

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface CalendarioContextValue {
  // Navegação do calendário mensal
  dataCalendario: Date
  setDataCalendario: React.Dispatch<React.SetStateAction<Date>>
  // Resumo semana/dia
  semanaResumo: Date
  setSemanaResumo: React.Dispatch<React.SetStateAction<Date>>
  modoResumo: string
  setModoResumo: React.Dispatch<React.SetStateAction<string>>
  dataDia: string
  setDataDia: React.Dispatch<React.SetStateAction<string>>
  diasExpandidos: Record<string, boolean>
  setDiasExpandidos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  // Grade semanal
  gradesSemanas: GradeEditando[]
  setGradesSemanas: React.Dispatch<React.SetStateAction<GradeEditando[]>>
  modalGradeSemanal: boolean
  setModalGradeSemanal: React.Dispatch<React.SetStateAction<boolean>>
  gradeEditando: GradeEditando | null
  setGradeEditando: React.Dispatch<React.SetStateAction<GradeEditando | null>>
  // Período de visualização
  periodoDias: number | string
  setPeriodoDias: React.Dispatch<React.SetStateAction<number | string>>
  dataInicioCustom: string
  setDataInicioCustom: React.Dispatch<React.SetStateAction<string>>
  dataFimCustom: string
  setDataFimCustom: React.Dispatch<React.SetStateAction<string>>
  // Registro rápido
  modalRegistroRapido: boolean
  setModalRegistroRapido: React.Dispatch<React.SetStateAction<boolean>>
  rrData: string
  setRrData: React.Dispatch<React.SetStateAction<string>>
  rrAnoSel: string
  setRrAnoSel: React.Dispatch<React.SetStateAction<string>>
  rrEscolaSel: string
  setRrEscolaSel: React.Dispatch<React.SetStateAction<string>>
  rrPlanosSegmento: Record<string, unknown>
  setRrPlanosSegmento: React.Dispatch<React.SetStateAction<Record<string, unknown>>>
  rrTextos: Record<string, string>
  setRrTextos: React.Dispatch<React.SetStateAction<Record<string, string>>>
  // Registro pós-aula
  modalRegistro: boolean
  setModalRegistro: React.Dispatch<React.SetStateAction<boolean>>
  planoParaRegistro: Plano | null
  setPlanoParaRegistro: React.Dispatch<React.SetStateAction<Plano | null>>
  novoRegistro: { dataAula: string; resumoAula: string; funcionouBem: string; naoFuncionou: string; proximaAula: string; comportamento: string; poderiaMelhorar: string; resultadoAula: string; anotacoesGerais: string; proximaAulaOpcao: string; urlEvidencia: string }
  setNovoRegistro: React.Dispatch<React.SetStateAction<{ dataAula: string; resumoAula: string; funcionouBem: string; naoFuncionou: string; proximaAula: string; comportamento: string; poderiaMelhorar: string; resultadoAula: string; anotacoesGerais: string; proximaAulaOpcao: string; urlEvidencia: string }>>
  verRegistros: boolean
  setVerRegistros: React.Dispatch<React.SetStateAction<boolean>>
  registroEditando: RegistroPosAula | null
  setRegistroEditando: React.Dispatch<React.SetStateAction<RegistroPosAula | null>>
  // Seleção de turma (4 níveis)
  regAnoSel: string
  setRegAnoSel: React.Dispatch<React.SetStateAction<string>>
  regEscolaSel: string
  setRegEscolaSel: React.Dispatch<React.SetStateAction<string>>
  regSegmentoSel: string
  setRegSegmentoSel: React.Dispatch<React.SetStateAction<string>>
  regTurmaSel: string
  setRegTurmaSel: React.Dispatch<React.SetStateAction<string>>
  // Filtros de registros
  filtroRegAno: string
  setFiltroRegAno: React.Dispatch<React.SetStateAction<string>>
  filtroRegEscola: string
  setFiltroRegEscola: React.Dispatch<React.SetStateAction<string>>
  filtroRegSegmento: string
  setFiltroRegSegmento: React.Dispatch<React.SetStateAction<string>>
  filtroRegTurma: string
  setFiltroRegTurma: React.Dispatch<React.SetStateAction<string>>
  filtroRegData: string
  setFiltroRegData: React.Dispatch<React.SetStateAction<string>>
  buscaRegistros: string
  setBuscaRegistros: React.Dispatch<React.SetStateAction<string>>
  ytPreviewId: string | null
  setYtPreviewId: React.Dispatch<React.SetStateAction<string | null>>
  // Funções de grade semanal
  novaGradeSemanal: () => void
  salvarGradeSemanal: () => void
  excluirGradeSemanal: (id: number | string) => void
  adicionarAulaGrade: () => void
  removerAulaGrade: (aulaId: number | string) => void
  duplicarAulaGrade: (aula: AulaGrade) => void
  atualizarAulaGrade: (aulaId: number | string, campo: string, valor: unknown) => void
  // Preferências de visualização do calendário
  ocultarFeriados: boolean
  setOcultarFeriados: React.Dispatch<React.SetStateAction<boolean>>
  // Helper
  obterTurmasDoDia: (data: string) => AulaGrade[]
  verificarEvento: (dataStr: string) => EventoEscolar | undefined
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const CalendarioContext = createContext<CalendarioContextValue | null>(null)

export function useCalendarioContext(): CalendarioContextValue {
  const ctx = useContext(CalendarioContext)
  if (!ctx) throw new Error('useCalendarioContext deve ser usado dentro de CalendarioProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface CalendarioProviderProps {
  children: React.ReactNode
}

export function CalendarioProvider({ children }: CalendarioProviderProps) {
  const { setModalConfirm } = useModalContext()
  const { eventosEscolares } = useAnoLetivoContext()

  // ── Navegação do calendário mensal ─────────────────────────────────────────
  const [dataCalendario, setDataCalendario] = useState<Date>(new Date())

  // ── Resumo semana/dia ──────────────────────────────────────────────────────
  const [semanaResumo, setSemanaResumo] = useState<Date>(() => {
    const hoje = new Date()
    const dia = hoje.getDay()
    const diff = dia === 0 ? -6 : 1 - dia
    const seg = new Date(hoje); seg.setDate(hoje.getDate() + diff); seg.setHours(0, 0, 0, 0)
    return seg
  })
  const [modoResumo, setModoResumo] = useState('semana')
  const [dataDia, setDataDia] = useState(() => new Date().toISOString().split('T')[0])
  const [diasExpandidos, setDiasExpandidos] = useState<Record<string, boolean>>(() => ({
    [new Date().toISOString().split('T')[0]]: true
  }))

  // ── Grade semanal ──────────────────────────────────────────────────────────
  const [gradesSemanas, setGradesSemanas] = useState<GradeEditando[]>(() => {
    try {
      const saved = dbGet('gradesSemanas')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [modalGradeSemanal, setModalGradeSemanal] = useState(false)
  const [gradeEditando, setGradeEditando] = useState<GradeEditando | null>(null)

  // ── Período de visualização ────────────────────────────────────────────────
  const [periodoDias, setPeriodoDias] = useState<number | string>(30)
  const [dataInicioCustom, setDataInicioCustom] = useState('')
  const [dataFimCustom, setDataFimCustom] = useState('')

  // ── Registro rápido ────────────────────────────────────────────────────────
  const [modalRegistroRapido, setModalRegistroRapido] = useState(false)
  const [rrData, setRrData] = useState(() => new Date().toISOString().split('T')[0])
  const [rrAnoSel, setRrAnoSel] = useState('')
  const [rrEscolaSel, setRrEscolaSel] = useState('')
  const [rrPlanosSegmento, setRrPlanosSegmento] = useState<Record<string, unknown>>({})
  const [rrTextos, setRrTextos] = useState<Record<string, string>>({})

  // ── Registro pós-aula ──────────────────────────────────────────────────────
  const [modalRegistro, setModalRegistro] = useState(false)
  const [planoParaRegistro, setPlanoParaRegistro] = useState<Plano | null>(null)
  const [novoRegistro, setNovoRegistro] = useState({
    dataAula: new Date().toISOString().split('T')[0],
    resumoAula: '',
    funcionouBem: '',
    naoFuncionou: '',
    proximaAula: '',
    comportamento: '',
    poderiaMelhorar: '',
    resultadoAula: '',
    anotacoesGerais: '',
    proximaAulaOpcao: '',
    urlEvidencia: ''
  })
  const [verRegistros, setVerRegistros] = useState(false)
  const [registroEditando, setRegistroEditando] = useState<RegistroPosAula | null>(null)

  // ── Seleção de turma (4 níveis) ────────────────────────────────────────────
  const [regAnoSel, setRegAnoSel] = useState('')
  const [regEscolaSel, setRegEscolaSel] = useState('')
  const [regSegmentoSel, setRegSegmentoSel] = useState('')
  const [regTurmaSel, setRegTurmaSel] = useState('')

  // ── Filtros de registros ───────────────────────────────────────────────────
  const [filtroRegAno, setFiltroRegAno] = useState('')
  const [filtroRegEscola, setFiltroRegEscola] = useState('')
  const [filtroRegSegmento, setFiltroRegSegmento] = useState('')
  const [filtroRegTurma, setFiltroRegTurma] = useState('')
  const [filtroRegData, setFiltroRegData] = useState('')
  const [buscaRegistros, setBuscaRegistros] = useState('')
  const [ytPreviewId, setYtPreviewId] = useState<string | null>(null)

  // ── Persistência ───────────────────────────────────────────────────────────
  useEffect(() => {
    dbSet('gradesSemanas', JSON.stringify(gradesSemanas))
  }, [gradesSemanas])

  // ── Funções de grade semanal ───────────────────────────────────────────────

  function novaGradeSemanal() {
    setGradeEditando({
      id: Date.now(),
      anoLetivoId: '',
      escolaId: '',
      dataInicio: '',
      dataFim: '',
      aulas: []
    })
  }

  function salvarGradeSemanal() {
    if (!gradeEditando || !gradeEditando.anoLetivoId || !gradeEditando.escolaId || !gradeEditando.dataInicio || !gradeEditando.dataFim) {
      setModalConfirm({ conteudo: '⚠️ Preencha ano letivo, escola e período!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    if (gradeEditando.aulas.length === 0) {
      setModalConfirm({ conteudo: '⚠️ Adicione pelo menos uma aula!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    const existe = gradesSemanas.find(g => g.id === gradeEditando.id)
    if (existe) {
      setGradesSemanas(gradesSemanas.map(g => g.id === gradeEditando.id ? gradeEditando : g))
    } else {
      setGradesSemanas([...gradesSemanas, gradeEditando])
    }
    setGradeEditando(null)
    setModalConfirm({ conteudo: '✅ Grade salva!', somenteOk: true, labelConfirm: 'OK' })
  }

  function excluirGradeSemanal(id: number | string) {
    setModalConfirm({
      titulo: 'Excluir grade semanal?',
      conteudo: 'Esta ação não pode ser desfeita.',
      labelConfirm: 'Excluir',
      perigo: true,
      onConfirm: () => setGradesSemanas(prev => prev.filter(g => g.id !== id))
    })
  }

  function adicionarAulaGrade() {
    const novaAula: AulaGrade = {
      id: Date.now(),
      diaSemana: 'Segunda',
      horario: '08:00',
      segmentoId: '',
      turmaId: '',
      observacao: ''
    }
    setGradeEditando(prev => prev && ({
      ...prev,
      aulas: [...prev.aulas, novaAula]
    }))
  }

  function removerAulaGrade(aulaId: number | string) {
    setGradeEditando(prev => prev && ({
      ...prev,
      aulas: prev.aulas.filter(a => a.id !== aulaId)
    }))
  }

  function duplicarAulaGrade(aula: AulaGrade) {
    const duplicada = { ...aula, id: Date.now() }
    setGradeEditando(prev => prev && ({
      ...prev,
      aulas: [...prev.aulas, duplicada]
    }))
  }

  function atualizarAulaGrade(aulaId: number | string, campo: string, valor: unknown) {
    setGradeEditando(prev => prev && ({
      ...prev,
      aulas: prev.aulas.map(a =>
        a.id === aulaId ? { ...a, [campo]: valor } : a
      )
    }))
  }

  // ── Helper: obter turmas do dia ────────────────────────────────────────────
  function obterTurmasDoDia(data: string): AulaGrade[] {
    const diaDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(data + 'T12:00:00').getDay()]
    const turmasDoDia: AulaGrade[] = []
    gradesSemanas.forEach(grade => {
      if (data < grade.dataInicio || data > grade.dataFim) return
      grade.aulas.forEach(aula => {
        if (aula.diaSemana === diaDaSemana && aula.turmaId) {
          turmasDoDia.push({
            ...aula,
            anoLetivoId: grade.anoLetivoId,
            escolaId: grade.escolaId
          })
        }
      })
    })
    return turmasDoDia
  }

  // ── Preferências de visualização do calendário ─────────────────────────────
  const [ocultarFeriados, setOcultarFeriados] = useState(() => {
    const saved = dbGet('ocultarFeriados')
    return saved === 'true'
  })
  useEffect(() => { dbSet('ocultarFeriados', String(ocultarFeriados)) }, [ocultarFeriados])

  const verificarEvento = (dataStr: string): EventoEscolar | undefined => {
    return eventosEscolares.find(e => e.data === dataStr)
  }

  // ── Value ──────────────────────────────────────────────────────────────────
  const value: CalendarioContextValue = {
    dataCalendario, setDataCalendario,
    semanaResumo, setSemanaResumo,
    modoResumo, setModoResumo,
    dataDia, setDataDia,
    diasExpandidos, setDiasExpandidos,
    gradesSemanas, setGradesSemanas,
    modalGradeSemanal, setModalGradeSemanal,
    gradeEditando, setGradeEditando,
    periodoDias, setPeriodoDias,
    dataInicioCustom, setDataInicioCustom,
    dataFimCustom, setDataFimCustom,
    modalRegistroRapido, setModalRegistroRapido,
    rrData, setRrData,
    rrAnoSel, setRrAnoSel,
    rrEscolaSel, setRrEscolaSel,
    rrPlanosSegmento, setRrPlanosSegmento,
    rrTextos, setRrTextos,
    modalRegistro, setModalRegistro,
    planoParaRegistro, setPlanoParaRegistro,
    novoRegistro, setNovoRegistro,
    verRegistros, setVerRegistros,
    registroEditando, setRegistroEditando,
    regAnoSel, setRegAnoSel,
    regEscolaSel, setRegEscolaSel,
    regSegmentoSel, setRegSegmentoSel,
    regTurmaSel, setRegTurmaSel,
    filtroRegAno, setFiltroRegAno,
    filtroRegEscola, setFiltroRegEscola,
    filtroRegSegmento, setFiltroRegSegmento,
    filtroRegTurma, setFiltroRegTurma,
    filtroRegData, setFiltroRegData,
    buscaRegistros, setBuscaRegistros,
    ytPreviewId, setYtPreviewId,
    novaGradeSemanal,
    salvarGradeSemanal,
    excluirGradeSemanal,
    adicionarAulaGrade,
    removerAulaGrade,
    duplicarAulaGrade,
    atualizarAulaGrade,
    ocultarFeriados, setOcultarFeriados,
    obterTurmasDoDia,
    verificarEvento,
  }

  return <CalendarioContext.Provider value={value}>{children}</CalendarioContext.Provider>
}
