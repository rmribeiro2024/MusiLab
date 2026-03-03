// src/contexts/AnoLetivoContext.tsx
// Estado e lógica de anos letivos, planejamento anual, currículo e turmas.
// Extraído de BancoPlanos.tsx — Parte 6 da refatoração de contextos.

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, syncConfiguracoes, loadFromSupabase, loadConfiguracoes, gerarIdSeguro } from '../lib/utils'
import { useModalContext } from './ModalContext'
import type { AnoLetivo, EventoEscolar } from '../types'

// ─── VALORES INICIAIS (mantidos localmente para evitar importações circulares) ─

const conceitosIniciais = ['Ritmo','Melodia','Harmonia','Timbre','Dinâmica','Forma','Textura','Andamento','Altura','Duração','Compasso','Tonalidade','Escala','Expressão','Improvisação','Criação','Apreciação'];
const unidadesIniciais = ['Unidade 1','Unidade 2','Unidade 3','Unidade 4'];

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface AnoLetivoContextValue {
  // Anos letivos
  anosLetivos: AnoLetivo[]
  setAnosLetivos: React.Dispatch<React.SetStateAction<AnoLetivo[]>>
  // Eventos escolares
  eventosEscolares: EventoEscolar[]
  setEventosEscolares: React.Dispatch<React.SetStateAction<EventoEscolar[]>>
  // Planejamento anual
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  planejamentoAnual: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPlanejamentoAnual: React.Dispatch<React.SetStateAction<any[]>>
  anoPlanoAtivoId: string | null
  setAnoPlanoAtivoId: React.Dispatch<React.SetStateAction<string | null>>
  // Formulário novo ano
  mostrandoFormNovoAno: boolean
  setMostrandoFormNovoAno: React.Dispatch<React.SetStateAction<boolean>>
  formNovoAno: { nome: string; dataInicio: string; dataFim: string }
  setFormNovoAno: React.Dispatch<React.SetStateAction<{ nome: string; dataInicio: string; dataFim: string }>>
  // Períodos
  periodoExpId: string | null
  setPeriodoExpId: React.Dispatch<React.SetStateAction<string | null>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  periodoEditForm: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPeriodoEditForm: React.Dispatch<React.SetStateAction<any>>
  adicionandoPeriodoAno: boolean
  setAdicionandoPeriodoAno: React.Dispatch<React.SetStateAction<boolean>>
  formNovoPeriodo: { nome: string; dataInicio: string; dataFim: string; tema: string; foco: string }
  setFormNovoPeriodo: React.Dispatch<React.SetStateAction<{ nome: string; dataInicio: string; dataFim: string; tema: string; foco: string }>>
  // Currículo
  conceitos: string[]
  setConceitos: React.Dispatch<React.SetStateAction<string[]>>
  unidades: string[]
  setUnidades: React.Dispatch<React.SetStateAction<string[]>>
  faixas: string[]
  setFaixas: React.Dispatch<React.SetStateAction<string[]>>
  tagsGlobais: string[]
  setTagsGlobais: React.Dispatch<React.SetStateAction<string[]>>
  // Gestão de turmas
  modalTurmas: boolean
  setModalTurmas: React.Dispatch<React.SetStateAction<boolean>>
  anoLetivoSelecionadoModal: string
  setAnoLetivoSelecionadoModal: React.Dispatch<React.SetStateAction<string>>
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
  mostrarArquivados: boolean
  setMostrarArquivados: React.Dispatch<React.SetStateAction<boolean>>
  // Nova escola
  modalNovaEscola: boolean | string
  setModalNovaEscola: React.Dispatch<React.SetStateAction<boolean | string>>
  novaEscolaNome: string
  setNovaEscolaNome: React.Dispatch<React.SetStateAction<string>>
  novaEscolaAnoId: string
  setNovaEscolaAnoId: React.Dispatch<React.SetStateAction<string>>
  // Nova faixa
  modalNovaFaixa: boolean
  setModalNovaFaixa: React.Dispatch<React.SetStateAction<boolean>>
  novaFaixaNome: string
  setNovaFaixaNome: React.Dispatch<React.SetStateAction<string>>
  // CRUD planejamento
  criarAnoLetivoPainel: () => void
  excluirAnoPlano: (anoId: string | number) => void
  adicionarPeriodoNoAno: (anoId: string | number) => void
  salvarEdicaoPeriodo: (anoId: string | number, periodoId: string | number) => void
  excluirPeriodoDoAno: (anoId: string | number, periodoId: string | number) => void
  adicionarMetaNoAno: (anoId: string | number, descricao: string, tipo: string) => void
  excluirMetaDoAno: (anoId: string | number, metaId: string | number) => void
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const AnoLetivoContext = createContext<AnoLetivoContextValue | null>(null)

export function useAnoLetivoContext(): AnoLetivoContextValue {
  const ctx = useContext(AnoLetivoContext)
  if (!ctx) throw new Error('useAnoLetivoContext deve ser usado dentro de AnoLetivoProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface AnoLetivoProviderProps {
  children: React.ReactNode
  userId?: string
}

export function AnoLetivoProvider({ children, userId }: AnoLetivoProviderProps) {
  const { setModalConfirm } = useModalContext()

  // ── Anos letivos ──────────────────────────────────────────────────────────
  const [anosLetivos, setAnosLetivos] = useState<AnoLetivo[]>(() => {
    try {
      const saved = dbGet('anosLetivos')
      if (saved) return JSON.parse(saved)
      // Migração automática de dados antigos
      const old = dbGet('escolasTurmas')
      if (old) {
        const escolasAntigas = JSON.parse(old)
        const anoAtual = new Date().getFullYear().toString()
        return [{
          id: String(Date.now()),
          nome: anoAtual,
          ano: anoAtual,
          status: 'ativo',
          escolas: escolasAntigas.map((esc: { id: string; nome: string; series?: { id: string; nome: string; turmas?: { id: string; nome: string }[] }[] }) => ({
            id: esc.id,
            nome: esc.nome,
            segmentos: (esc.series || []).map(s => ({
              id: s.id,
              nome: s.nome,
              turmas: s.turmas || []
            }))
          }))
        }]
      }
      return []
    } catch { return [] }
  })

  // ── Eventos escolares ──────────────────────────────────────────────────────
  const [eventosEscolares, setEventosEscolares] = useState<EventoEscolar[]>(() => {
    try {
      const saved = dbGet('eventosEscolares')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // ── Planejamento anual ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [planejamentoAnual, setPlanejamentoAnual] = useState<any[]>(() => {
    try {
      const saved = dbGet('planejamentoAnual')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [anoPlanoAtivoId, setAnoPlanoAtivoId] = useState<string | null>(() => dbGet('anoPlanoAtivoId') || null)

  // ── Formulário novo ano ───────────────────────────────────────────────────
  const [mostrandoFormNovoAno, setMostrandoFormNovoAno] = useState(false)
  const [formNovoAno, setFormNovoAno] = useState({ nome: String(new Date().getFullYear()), dataInicio: '', dataFim: '' })
  const [periodoExpId, setPeriodoExpId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [periodoEditForm, setPeriodoEditForm] = useState<any>(null)
  const [adicionandoPeriodoAno, setAdicionandoPeriodoAno] = useState(false)
  const [formNovoPeriodo, setFormNovoPeriodo] = useState({ nome: '', dataInicio: '', dataFim: '', tema: '', foco: '' })

  // ── Currículo ─────────────────────────────────────────────────────────────
  const [conceitos, setConceitos] = useState<string[]>(() => {
    try {
      const saved = dbGet('conceitosPersonalizados')
      return saved ? JSON.parse(saved) : conceitosIniciais
    } catch { return conceitosIniciais }
  })
  const [unidades, setUnidades] = useState<string[]>(() => {
    try {
      const saved = dbGet('unidadesPersonalizadas')
      return saved ? JSON.parse(saved) : unidadesIniciais
    } catch { return unidadesIniciais }
  })
  const [faixas, setFaixas] = useState<string[]>(() => {
    try {
      const saved = dbGet('faixasEtarias')
      return saved ? JSON.parse(saved) : ['Todos', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano']
    } catch { return ['Todos', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano'] }
  })
  const [tagsGlobais, setTagsGlobais] = useState<string[]>(() => {
    try {
      const saved = dbGet('tagsGlobais')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  // ── Gestão de turmas ──────────────────────────────────────────────────────
  const [modalTurmas, setModalTurmas] = useState(false)
  const [anoLetivoSelecionadoModal, setAnoLetivoSelecionadoModal] = useState<string>(() => {
    const anoAtivo = anosLetivos.find(a => (a as { status?: string }).status === 'ativo')
    return anoAtivo ? String(anoAtivo.id) : (anosLetivos[0] ? String(anosLetivos[0].id) : '')
  })
  const [gtAnoNovo, setGtAnoNovo] = useState('')
  const [gtAnoSel, setGtAnoSel] = useState('')
  const [gtEscolaNome, setGtEscolaNome] = useState('')
  const [gtEscolaSel, setGtEscolaSel] = useState('')
  const [gtSegmentoNome, setGtSegmentoNome] = useState('')
  const [gtSegmentoSel, setGtSegmentoSel] = useState('')
  const [gtTurmaNome, setGtTurmaNome] = useState('')
  const [mostrarArquivados, setMostrarArquivados] = useState(false)

  // ── Nova escola ───────────────────────────────────────────────────────────
  const [modalNovaEscola, setModalNovaEscola] = useState<boolean | string>(false)
  const [novaEscolaNome, setNovaEscolaNome] = useState('')
  const [novaEscolaAnoId, setNovaEscolaAnoId] = useState('')

  // ── Nova faixa ────────────────────────────────────────────────────────────
  const [modalNovaFaixa, setModalNovaFaixa] = useState(false)
  const [novaFaixaNome, setNovaFaixaNome] = useState('')

  // ── Carregar dados do Supabase ────────────────────────────────────────────
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    Promise.all([
      loadFromSupabase('anos_letivos', userId),
      loadFromSupabase('eventos_escolares', userId),
      loadFromSupabase('planejamento_anual', userId),
      loadConfiguracoes(userId),
    ])
      .then(([anosC, eventosC, planejamentoC, cfg]) => {
        if (anosC !== null) setAnosLetivos(anosC.length > 0 ? anosC as AnoLetivo[] : [])
        if (eventosC !== null) setEventosEscolares(eventosC.length > 0 ? eventosC as EventoEscolar[] : [])
        if (planejamentoC !== null) setPlanejamentoAnual(planejamentoC.length > 0 ? planejamentoC : [])
        if (cfg) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const c = cfg as any
          if (c.conceitos) setConceitos(c.conceitos as string[])
          if (c.unidades) setUnidades(c.unidades as string[])
          if (c.faixas) setFaixas(c.faixas as string[])
          if (c.tagsGlobais) setTagsGlobais(c.tagsGlobais as string[])
        }
      })
      .catch(e => console.error('[AnoLetivoContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Salvar no IndexedDB ───────────────────────────────────────────────────
  useEffect(() => { dbSet('anosLetivos', JSON.stringify(anosLetivos)) }, [anosLetivos])
  useEffect(() => { dbSet('eventosEscolares', JSON.stringify(eventosEscolares)) }, [eventosEscolares])
  useEffect(() => { dbSet('planejamentoAnual', JSON.stringify(planejamentoAnual)) }, [planejamentoAnual])
  useEffect(() => { if (anoPlanoAtivoId) dbSet('anoPlanoAtivoId', anoPlanoAtivoId) }, [anoPlanoAtivoId])
  useEffect(() => { dbSet('conceitosPersonalizados', JSON.stringify(conceitos)) }, [conceitos])
  useEffect(() => { dbSet('unidadesPersonalizadas', JSON.stringify(unidades)) }, [unidades])
  useEffect(() => { dbSet('faixasEtarias', JSON.stringify(faixas)) }, [faixas])
  useEffect(() => { dbSet('tagsGlobais', JSON.stringify(tagsGlobais)) }, [tagsGlobais])

  // ── Sync para Supabase (debounce 2s) — dados principais ──────────────────
  const _prevAnosLetivos = useRef<AnoLetivo[] | null>(null)
  const _prevEventos = useRef<EventoEscolar[] | null>(null)
  const _prevPlanejamento = useRef<unknown[] | null>(null)
  const _syncTimeout = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({})

  function syncDelay(key: string, fn: () => void) {
    if (_syncTimeout.current[key]) clearTimeout(_syncTimeout.current[key])
    _syncTimeout.current[key] = setTimeout(fn, 2000)
  }

  useEffect(() => {
    if (!userId || !carregado) return
    if (_prevAnosLetivos.current !== null && anosLetivos !== _prevAnosLetivos.current) {
      syncDelay('anos_letivos', () =>
        syncToSupabase('anos_letivos', anosLetivos as unknown as Record<string, unknown>[], userId)
          .catch(e => console.error('[AnoLetivoContext] Erro ao sincronizar anos:', e))
      )
    }
    _prevAnosLetivos.current = anosLetivos
  }, [anosLetivos, userId, carregado])

  useEffect(() => {
    if (!userId || !carregado) return
    if (_prevEventos.current !== null && eventosEscolares !== _prevEventos.current) {
      syncDelay('eventos_escolares', () =>
        syncToSupabase('eventos_escolares', eventosEscolares as unknown as Record<string, unknown>[], userId)
          .catch(e => console.error('[AnoLetivoContext] Erro ao sincronizar eventos:', e))
      )
    }
    _prevEventos.current = eventosEscolares
  }, [eventosEscolares, userId, carregado])

  useEffect(() => {
    if (!userId || !carregado) return
    if (_prevPlanejamento.current !== null && planejamentoAnual !== _prevPlanejamento.current) {
      syncDelay('planejamento_anual', () =>
        syncToSupabase('planejamento_anual', planejamentoAnual as unknown as Record<string, unknown>[], userId)
          .catch(e => console.error('[AnoLetivoContext] Erro ao sincronizar planejamento:', e))
      )
    }
    _prevPlanejamento.current = planejamentoAnual
  }, [planejamentoAnual, userId, carregado])

  // ── Sync configurações curriculares ───────────────────────────────────────
  useEffect(() => {
    if (!userId || !carregado) return
    syncDelay('cfg-ano', () =>
      syncConfiguracoes({ conceitos, unidades, faixas, tagsGlobais }, userId)
        .catch(e => console.error('[AnoLetivoContext] Erro ao sincronizar cfg:', e))
    )
  }, [conceitos, unidades, faixas, tagsGlobais, userId, carregado])

  useEffect(() => {
    return () => { Object.values(_syncTimeout.current).forEach(id => clearTimeout(id)) }
  }, [])

  // ── CRUD planejamento ─────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function _atualizarAnoPlano(anoId: string | number, campos: Record<string, any>) {
    setPlanejamentoAnual(prev => prev.map(a =>
      a.id === anoId ? { ...a, ...campos, _ultimaEdicao: new Date().toISOString() } : a
    ))
  }

  function criarAnoLetivoPainel() {
    if (!formNovoAno.nome.trim()) {
      setModalConfirm({ conteudo: '⚠️ Defina um nome para o ano letivo!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    const novo = {
      id: gerarIdSeguro(),
      nome: formNovoAno.nome.trim(),
      dataInicio: formNovoAno.dataInicio,
      dataFim: formNovoAno.dataFim,
      periodos: [], metas: [],
      _criadoEm: new Date().toISOString()
    }
    setPlanejamentoAnual(prev => [...prev, novo])
    setAnoPlanoAtivoId(String(novo.id))
    setMostrandoFormNovoAno(false)
    setFormNovoAno({ nome: String(new Date().getFullYear()), dataInicio: '', dataFim: '' })
  }

  function excluirAnoPlano(anoId: string | number) {
    setModalConfirm({
      titulo: 'Excluir este ano letivo?',
      conteudo: 'Todos os períodos e metas serão excluídos permanentemente.',
      labelConfirm: 'Excluir', perigo: true,
      onConfirm: () => {
        setPlanejamentoAnual(prev => {
          const novos = prev.filter(a => a.id !== anoId)
          if (String(anoPlanoAtivoId) === String(anoId)) setAnoPlanoAtivoId(novos[0]?.id || null)
          return novos
        })
      }
    })
  }

  function adicionarPeriodoNoAno(anoId: string | number) {
    if (!formNovoPeriodo.nome.trim()) {
      setModalConfirm({ conteudo: '⚠️ Defina um nome para o período!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    const periodo = { id: gerarIdSeguro(), ...formNovoPeriodo, reflexao: '', _criadoEm: new Date().toISOString() }
    const ano = planejamentoAnual.find(a => a.id === anoId)
    _atualizarAnoPlano(anoId, { periodos: [...(ano?.periodos || []), periodo] })
    setFormNovoPeriodo({ nome: '', dataInicio: '', dataFim: '', tema: '', foco: '' })
    setAdicionandoPeriodoAno(false)
  }

  function salvarEdicaoPeriodo(anoId: string | number, periodoId: string | number) {
    if (!periodoEditForm?.nome?.trim()) return
    const ano = planejamentoAnual.find(a => a.id === anoId)
    if (!ano) return
    _atualizarAnoPlano(anoId, { periodos: ano.periodos.map((p: { id: string | number }) => p.id === periodoId ? { ...p, ...periodoEditForm } : p) })
    setPeriodoExpId(null)
    setPeriodoEditForm(null)
  }

  function excluirPeriodoDoAno(anoId: string | number, periodoId: string | number) {
    setModalConfirm({
      titulo: 'Excluir período?', conteudo: 'Esta ação não pode ser desfeita.',
      labelConfirm: 'Excluir', perigo: true,
      onConfirm: () => {
        const ano = planejamentoAnual.find(a => a.id === anoId)
        if (!ano) return
        _atualizarAnoPlano(anoId, { periodos: ano.periodos.filter((p: { id: string | number }) => p.id !== periodoId) })
        if (periodoExpId === String(periodoId)) { setPeriodoExpId(null); setPeriodoEditForm(null) }
      }
    })
  }

  function adicionarMetaNoAno(anoId: string | number, descricao: string, tipo: string) {
    if (!descricao?.trim()) return
    const meta = { id: gerarIdSeguro(), descricao: descricao.trim(), tipo, _criadoEm: new Date().toISOString() }
    const ano = planejamentoAnual.find(a => a.id === anoId)
    _atualizarAnoPlano(anoId, { metas: [...(ano?.metas || []), meta] })
  }

  function excluirMetaDoAno(anoId: string | number, metaId: string | number) {
    const ano = planejamentoAnual.find(a => a.id === anoId)
    if (!ano) return
    _atualizarAnoPlano(anoId, { metas: ano.metas.filter((m: { id: string | number }) => m.id !== metaId) })
  }

  // ── VALUE ──────────────────────────────────────────────────────────────────
  const value: AnoLetivoContextValue = {
    anosLetivos, setAnosLetivos,
    eventosEscolares, setEventosEscolares,
    planejamentoAnual, setPlanejamentoAnual,
    anoPlanoAtivoId, setAnoPlanoAtivoId,
    mostrandoFormNovoAno, setMostrandoFormNovoAno,
    formNovoAno, setFormNovoAno,
    periodoExpId, setPeriodoExpId,
    periodoEditForm, setPeriodoEditForm,
    adicionandoPeriodoAno, setAdicionandoPeriodoAno,
    formNovoPeriodo, setFormNovoPeriodo,
    conceitos, setConceitos,
    unidades, setUnidades,
    faixas, setFaixas,
    tagsGlobais, setTagsGlobais,
    modalTurmas, setModalTurmas,
    anoLetivoSelecionadoModal, setAnoLetivoSelecionadoModal,
    gtAnoNovo, setGtAnoNovo,
    gtAnoSel, setGtAnoSel,
    gtEscolaNome, setGtEscolaNome,
    gtEscolaSel, setGtEscolaSel,
    gtSegmentoNome, setGtSegmentoNome,
    gtSegmentoSel, setGtSegmentoSel,
    gtTurmaNome, setGtTurmaNome,
    mostrarArquivados, setMostrarArquivados,
    modalNovaEscola, setModalNovaEscola,
    novaEscolaNome, setNovaEscolaNome,
    novaEscolaAnoId, setNovaEscolaAnoId,
    modalNovaFaixa, setModalNovaFaixa,
    novaFaixaNome, setNovaFaixaNome,
    criarAnoLetivoPainel, excluirAnoPlano, adicionarPeriodoNoAno,
    salvarEdicaoPeriodo, excluirPeriodoDoAno,
    adicionarMetaNoAno, excluirMetaDoAno,
  }

  return (
    <AnoLetivoContext.Provider value={value}>
      {children}
    </AnoLetivoContext.Provider>
  )
}
