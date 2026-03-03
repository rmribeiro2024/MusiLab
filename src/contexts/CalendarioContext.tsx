// src/contexts/CalendarioContext.tsx
// Estado e lógica de calendário, grade semanal e registro pós-aula.
// Extraído de BancoPlanos.tsx — Parte 7 da refatoração de contextos.

import React, { createContext, useContext, useState, useEffect } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { useModalContext } from './ModalContext'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diasExpandidos: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDiasExpandidos: React.Dispatch<React.SetStateAction<Record<string, any>>>
  // Grade semanal
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gradesSemanas: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setGradesSemanas: React.Dispatch<React.SetStateAction<any[]>>
  modalGradeSemanal: boolean
  setModalGradeSemanal: React.Dispatch<React.SetStateAction<boolean>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gradeEditando: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setGradeEditando: React.Dispatch<React.SetStateAction<any>>
  // Período de visualização
  periodoDias: number
  setPeriodoDias: React.Dispatch<React.SetStateAction<number>>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rrPlanosSegmento: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRrPlanosSegmento: React.Dispatch<React.SetStateAction<Record<string, any>>>
  rrTextos: Record<string, string>
  setRrTextos: React.Dispatch<React.SetStateAction<Record<string, string>>>
  // Registro pós-aula
  modalRegistro: boolean
  setModalRegistro: React.Dispatch<React.SetStateAction<boolean>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planoParaRegistro: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPlanoParaRegistro: React.Dispatch<React.SetStateAction<any>>
  novoRegistro: { dataAula: string; resumoAula: string; funcionouBem: string; naoFuncionou: string; proximaAula: string; comportamento: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNovoRegistro: React.Dispatch<React.SetStateAction<any>>
  verRegistros: boolean
  setVerRegistros: React.Dispatch<React.SetStateAction<boolean>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registroEditando: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRegistroEditando: React.Dispatch<React.SetStateAction<any>>
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
  buscaRegistros: string
  setBuscaRegistros: React.Dispatch<React.SetStateAction<string>>
  ytPreviewId: string | null
  setYtPreviewId: React.Dispatch<React.SetStateAction<string | null>>
  // Funções de grade semanal
  novaGradeSemanal: () => void
  salvarGradeSemanal: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  excluirGradeSemanal: (id: any) => void
  adicionarAulaGrade: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removerAulaGrade: (aulaId: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  duplicarAulaGrade: (aula: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  atualizarAulaGrade: (aulaId: any, campo: string, valor: any) => void
  // Helper
  obterTurmasDoDia: (data: string) => any[] // eslint-disable-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gradesSemanas, setGradesSemanas] = useState<any[]>(() => {
    try {
      const saved = dbGet('gradesSemanas')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [modalGradeSemanal, setModalGradeSemanal] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gradeEditando, setGradeEditando] = useState<any>(null)

  // ── Período de visualização ────────────────────────────────────────────────
  const [periodoDias, setPeriodoDias] = useState(30)
  const [dataInicioCustom, setDataInicioCustom] = useState('')
  const [dataFimCustom, setDataFimCustom] = useState('')

  // ── Registro rápido ────────────────────────────────────────────────────────
  const [modalRegistroRapido, setModalRegistroRapido] = useState(false)
  const [rrData, setRrData] = useState(() => new Date().toISOString().split('T')[0])
  const [rrAnoSel, setRrAnoSel] = useState('')
  const [rrEscolaSel, setRrEscolaSel] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rrPlanosSegmento, setRrPlanosSegmento] = useState<Record<string, any>>({})
  const [rrTextos, setRrTextos] = useState<Record<string, string>>({})

  // ── Registro pós-aula ──────────────────────────────────────────────────────
  const [modalRegistro, setModalRegistro] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [planoParaRegistro, setPlanoParaRegistro] = useState<any>(null)
  const [novoRegistro, setNovoRegistro] = useState({
    dataAula: new Date().toISOString().split('T')[0],
    resumoAula: '',
    funcionouBem: '',
    naoFuncionou: '',
    proximaAula: '',
    comportamento: ''
  })
  const [verRegistros, setVerRegistros] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [registroEditando, setRegistroEditando] = useState<any>(null)

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
    if (!gradeEditando.anoLetivoId || !gradeEditando.escolaId || !gradeEditando.dataInicio || !gradeEditando.dataFim) {
      setModalConfirm({ conteudo: '⚠️ Preencha ano letivo, escola e período!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    if (gradeEditando.aulas.length === 0) {
      setModalConfirm({ conteudo: '⚠️ Adicione pelo menos uma aula!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    const existe = gradesSemanas.find((g: { id: number }) => g.id === gradeEditando.id)
    if (existe) {
      setGradesSemanas(gradesSemanas.map((g: { id: number }) => g.id === gradeEditando.id ? gradeEditando : g))
    } else {
      setGradesSemanas([...gradesSemanas, gradeEditando])
    }
    setGradeEditando(null)
    setModalConfirm({ conteudo: '✅ Grade salva!', somenteOk: true, labelConfirm: 'OK' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function excluirGradeSemanal(id: any) {
    setModalConfirm({
      titulo: 'Excluir grade semanal?',
      conteudo: 'Esta ação não pode ser desfeita.',
      labelConfirm: 'Excluir',
      perigo: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onConfirm: () => setGradesSemanas(gradesSemanas.filter((g: any) => g.id !== id))
    })
  }

  function adicionarAulaGrade() {
    const novaAula = {
      id: Date.now(),
      diaSemana: 'Segunda',
      horario: '08:00',
      segmentoId: '',
      turmaId: '',
      observacao: ''
    }
    setGradeEditando({
      ...gradeEditando,
      aulas: [...gradeEditando.aulas, novaAula]
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function removerAulaGrade(aulaId: any) {
    setGradeEditando({
      ...gradeEditando,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aulas: gradeEditando.aulas.filter((a: any) => a.id !== aulaId)
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function duplicarAulaGrade(aula: any) {
    const duplicada = { ...aula, id: Date.now() }
    setGradeEditando({
      ...gradeEditando,
      aulas: [...gradeEditando.aulas, duplicada]
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function atualizarAulaGrade(aulaId: any, campo: string, valor: any) {
    setGradeEditando((prev: any) => ({
      ...prev,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aulas: prev.aulas.map((a: any) =>
        a.id === aulaId ? { ...a, [campo]: valor } : a
      )
    }))
  }

  // ── Helper: obter turmas do dia ────────────────────────────────────────────
  function obterTurmasDoDia(data: string) {
    const diaDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date(data + 'T12:00:00').getDay()]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const turmasDoDia: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gradesSemanas.forEach((grade: any) => {
      if (data < grade.dataInicio || data > grade.dataFim) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      grade.aulas.forEach((aula: any) => {
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
    buscaRegistros, setBuscaRegistros,
    ytPreviewId, setYtPreviewId,
    novaGradeSemanal,
    salvarGradeSemanal,
    excluirGradeSemanal,
    adicionarAulaGrade,
    removerAulaGrade,
    duplicarAulaGrade,
    atualizarAulaGrade,
    obterTurmasDoDia,
  }

  return <CalendarioContext.Provider value={value}>{children}</CalendarioContext.Provider>
}
