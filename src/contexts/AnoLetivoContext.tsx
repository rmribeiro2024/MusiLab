// src/contexts/AnoLetivoContext.tsx
// Estado e lógica de anos letivos, planejamento anual, currículo e turmas.
// Extraído de BancoPlanos.tsx — Parte 6 da refatoração de contextos.

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, syncConfiguracoes, loadFromSupabase, loadConfiguracoes, gerarIdSeguro } from '../lib/utils'
import { mergeOffline, marcarPendente, carimbарTimestamp } from '../lib/offlineSync'
import { useModalContext } from './ModalContext'
import type { AnoLetivo, EventoEscolar, PlanejamentoAnualItem, PeriodoAnual, Plano } from '../types'

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
  planejamentoAnual: PlanejamentoAnualItem[]
  setPlanejamentoAnual: React.Dispatch<React.SetStateAction<PlanejamentoAnualItem[]>>
  anoPlanoAtivoId: string | null
  setAnoPlanoAtivoId: React.Dispatch<React.SetStateAction<string | null>>
  // Formulário novo ano
  mostrandoFormNovoAno: boolean
  setMostrandoFormNovoAno: React.Dispatch<React.SetStateAction<boolean>>
  formNovoAno: { nome: string; dataInicio: string; dataFim: string }
  setFormNovoAno: React.Dispatch<React.SetStateAction<{ nome: string; dataInicio: string; dataFim: string }>>
  // Períodos
  periodoExpId: string | number | null
  setPeriodoExpId: React.Dispatch<React.SetStateAction<string | number | null>>
  periodoEditForm: PeriodoAnual | null
  setPeriodoEditForm: React.Dispatch<React.SetStateAction<PeriodoAnual | null>>
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
  // Eventos escolares
  eventoEditando: EventoEscolar | null
  setEventoEditando: React.Dispatch<React.SetStateAction<EventoEscolar | null>>
  modalEventos: boolean
  setModalEventos: React.Dispatch<React.SetStateAction<boolean>>
  novoEvento: () => void
  salvarEvento: () => void
  excluirEvento: (id: string | number) => void
  // Gestão de turmas — funções
  gtAddAno: () => void
  gtRemoveAno: (anoId: string) => void
  gtAddEscola: () => void
  gtRemoveEscola: (anoId: string, escolaId: string) => void
  gtAddSegmento: () => void
  gtRemoveSegmento: (anoId: string, escolaId: string, segmentoId: string) => void
  gtAddTurma: () => void
  gtRemoveTurma: (anoId: string, escolaId: string, segmentoId: string, turmaId: string) => void
  gtMudarStatusAno: (anoId: string, novoStatus: string) => void
  // Alunos em destaque
  alunosAddOrUpdate: (anoId: string, escolaId: string, segmentoId: string, turmaId: string, aluno: import('../types').AlunoDestaque) => void
  alunosRemove: (anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string) => void
  alunosGetByTurma: (anoId: string, escolaId: string, segmentoId: string, turmaId: string) => import('../types').AlunoDestaque[]
  alunoAddAnotacao: (anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, anotacao: import('../types').AnotacaoAluno) => void
  alunoRemoveAnotacao: (anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, anotacaoId: string) => void
  alunoAddMarco: (anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, marco: import('../types').MarcoAluno) => void
  alunoRemoveMarco: (anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, marcoId: string) => void
  // Faixas e escolas — funções
  salvarNovaFaixa: () => void
  salvarNovaEscola: (planoEditando?: Plano | null, setPlanoEditando?: React.Dispatch<React.SetStateAction<Plano | null>>) => void
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
  const [planejamentoAnual, setPlanejamentoAnual] = useState<PlanejamentoAnualItem[]>(() => {
    try {
      const saved = dbGet('planejamentoAnual')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [anoPlanoAtivoId, setAnoPlanoAtivoId] = useState<string | null>(() => dbGet('anoPlanoAtivoId') || null)

  // ── Formulário novo ano ───────────────────────────────────────────────────
  const [mostrandoFormNovoAno, setMostrandoFormNovoAno] = useState(false)
  const [formNovoAno, setFormNovoAno] = useState({ nome: String(new Date().getFullYear()), dataInicio: '', dataFim: '' })
  const [periodoExpId, setPeriodoExpId] = useState<string | number | null>(null)
  const [periodoEditForm, setPeriodoEditForm] = useState<PeriodoAnual | null>(null)
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

  // ── Eventos escolares - modal state ───────────────────────────────────────
  const [eventoEditando, setEventoEditando] = useState<EventoEscolar | null>(null)
  const [modalEventos, setModalEventos] = useState(false)

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
        {
          const anosLocais = (() => { try { const r = dbGet('anosLetivos'); return r ? JSON.parse(r) : [] } catch { return [] } })()
          const merged = mergeOffline('anos_letivos', anosC as ({ id: string; _updatedAt?: string; [key: string]: unknown })[] | null, anosLocais)
          if (merged.length > 0) setAnosLetivos(merged as unknown as AnoLetivo[])
        }
        if (eventosC !== null && eventosC.length > 0) setEventosEscolares(eventosC as EventoEscolar[])
        if (planejamentoC !== null && planejamentoC.length > 0) setPlanejamentoAnual(planejamentoC as PlanejamentoAnualItem[])
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
  useEffect(() => {
    // Stamp _updatedAt e marcar como pendente quando offline (sem userId)
    const toSave = !userId
      ? anosLetivos.map(a => carimbарTimestamp(a as unknown as { id: string; _updatedAt?: string; [key: string]: unknown }))
      : anosLetivos
    dbSet('anosLetivos', JSON.stringify(toSave))
    if (!userId && carregado) {
      anosLetivos.forEach(a => marcarPendente('anos_letivos', String(a.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anosLetivos])
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
          if (String(anoPlanoAtivoId) === String(anoId)) setAnoPlanoAtivoId(novos[0] ? String(novos[0].id) : null)
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
    _atualizarAnoPlano(anoId, { periodos: ano.periodos.map((p) => p.id === periodoId ? { ...p, ...periodoEditForm } : p) })
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
        _atualizarAnoPlano(anoId, { periodos: ano.periodos.filter((p) => p.id !== periodoId) })
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

  // ── Funções de eventos escolares ──────────────────────────────────────────

  function novoEvento() {
    setEventoEditando({
      id: Date.now(),
      nome: '',
      data: new Date().toISOString().split('T')[0],
      escolaId: '',
      anoLetivoId: anosLetivos.find(a => (a as AnoLetivo & { anoAtual?: boolean }).anoAtual)?.id || anosLetivos[0]?.id || ''
    })
  }

  function salvarEvento() {
    if (!eventoEditando?.nome.trim()) {
      setModalConfirm({ conteudo: '⚠️ Preencha o nome do evento!', somenteOk: true, labelConfirm: 'OK' }); return
    }
    if (!eventoEditando.data) {
      setModalConfirm({ conteudo: '⚠️ Preencha a data!', somenteOk: true, labelConfirm: 'OK' }); return
    }
    const existe = eventosEscolares.find(e => e.id === eventoEditando.id)
    if (existe) {
      setEventosEscolares(eventosEscolares.map(e => e.id === eventoEditando.id ? eventoEditando : e))
    } else {
      setEventosEscolares([...eventosEscolares, eventoEditando])
    }
    setEventoEditando(null)
    setModalConfirm({ conteudo: '✅ Evento salvo!', somenteOk: true, labelConfirm: 'OK' })
  }

  function excluirEvento(id: string | number) {
    setModalConfirm({ titulo: 'Excluir evento?', conteudo: '', labelConfirm: 'Excluir', perigo: true, onConfirm: () => {
      setEventosEscolares(eventosEscolares.filter(e => e.id !== id))
    }})
  }

  // ── Funções de gestão de turmas ───────────────────────────────────────────

  function gtAddAno() {
    const ano = gtAnoNovo.trim()
    if (!ano) return
    if (anosLetivos.find(a => a.ano === ano)) { setModalConfirm({ conteudo: 'Ano letivo já existe!', somenteOk: true, labelConfirm: 'OK' }); return }
    setAnosLetivos([...anosLetivos, { id: String(Date.now()), nome: ano, ano, status: 'ativo', escolas: [] }])
    setGtAnoNovo('')
  }

  function gtMudarStatusAno(anoId: string, novoStatus: string) {
    setAnosLetivos(anosLetivos.map(a => a.id === anoId ? { ...a, status: novoStatus } : a))
  }

  function gtRemoveAno(anoId: string) {
    setModalConfirm({ titulo: 'Remover ano letivo?', conteudo: 'Todas as escolas e turmas vinculadas serão removidas.', labelConfirm: 'Remover', perigo: true, onConfirm: () => {
      setAnosLetivos(anosLetivos.filter(a => a.id !== anoId))
      if (gtAnoSel === anoId) { setGtAnoSel(''); setGtEscolaSel(''); setGtSegmentoSel('') }
    }})
  }

  function gtAddEscola() {
    const nome = gtEscolaNome.trim()
    if (!nome || !gtAnoSel) return
    setAnosLetivos(anosLetivos.map(a => {
      if (a.id !== gtAnoSel) return a
      if (a.escolas.find(e => e.nome === nome)) { setModalConfirm({ conteudo: 'Escola já existe neste ano!', somenteOk: true, labelConfirm: 'OK' }); return a }
      return { ...a, escolas: [...a.escolas, { id: String(Date.now()), nome, segmentos: [] }] }
    }))
    setGtEscolaNome('')
  }

  function gtRemoveEscola(anoId: string, escolaId: string) {
    setModalConfirm({ titulo: 'Remover escola?', conteudo: 'Todos os segmentos e turmas vinculados serão removidos.', labelConfirm: 'Remover', perigo: true, onConfirm: () => {
      setAnosLetivos(anosLetivos.map(a => a.id !== anoId ? a : { ...a, escolas: a.escolas.filter(e => e.id !== escolaId) }))
      if (gtEscolaSel === escolaId) { setGtEscolaSel(''); setGtSegmentoSel('') }
    }})
  }

  function gtAddSegmento() {
    const nome = gtSegmentoNome.trim()
    if (!nome || !gtAnoSel || !gtEscolaSel) return
    setAnosLetivos(anosLetivos.map(a => {
      if (a.id !== gtAnoSel) return a
      return { ...a, escolas: a.escolas.map(e => {
        if (e.id !== gtEscolaSel) return e
        if (e.segmentos.find(s => s.nome === nome)) { setModalConfirm({ conteudo: 'Segmento já existe!', somenteOk: true, labelConfirm: 'OK' }); return e }
        return { ...e, segmentos: [...e.segmentos, { id: String(Date.now()), nome, turmas: [] }] }
      })}
    }))
    setGtSegmentoNome('')
  }

  function gtRemoveSegmento(anoId: string, escolaId: string, segmentoId: string) {
    setAnosLetivos(anosLetivos.map(a => {
      if (a.id !== anoId) return a
      return { ...a, escolas: a.escolas.map(e => {
        if (e.id !== escolaId) return e
        return { ...e, segmentos: e.segmentos.filter(s => s.id !== segmentoId) }
      })}
    }))
    if (gtSegmentoSel === segmentoId) setGtSegmentoSel('')
  }

  function gtAddTurma() {
    const nome = gtTurmaNome.trim()
    if (!nome || !gtAnoSel || !gtEscolaSel || !gtSegmentoSel) return
    setAnosLetivos(anosLetivos.map(a => {
      if (a.id !== gtAnoSel) return a
      return { ...a, escolas: a.escolas.map(e => {
        if (e.id !== gtEscolaSel) return e
        return { ...e, segmentos: e.segmentos.map(s => {
          if (s.id !== gtSegmentoSel) return s
          if (s.turmas.find(t => t.nome === nome)) { setModalConfirm({ conteudo: 'Turma já existe!', somenteOk: true, labelConfirm: 'OK' }); return s }
          return { ...s, turmas: [...s.turmas, { id: String(Date.now()), nome }] }
        })}
      })}
    }))
    setGtTurmaNome('')
  }

  function gtRemoveTurma(anoId: string, escolaId: string, segmentoId: string, turmaId: string) {
    setAnosLetivos(anosLetivos.map(a => {
      if (a.id !== anoId) return a
      return { ...a, escolas: a.escolas.map(e => {
        if (e.id !== escolaId) return e
        return { ...e, segmentos: e.segmentos.map(s => {
          if (s.id !== segmentoId) return s
          return { ...s, turmas: s.turmas.filter(t => t.id !== turmaId) }
        })}
      })}
    }))
  }

  // ── Alunos em destaque ────────────────────────────────────────────────────
  function alunosAddOrUpdate(anoId: string, escolaId: string, segmentoId: string, turmaId: string, aluno: import('../types').AlunoDestaque) {
    setAnosLetivos(prev => prev.map(a => {
      if (a.id !== anoId) return a
      return { ...a, escolas: a.escolas.map(e => {
        if (e.id !== escolaId) return e
        return { ...e, segmentos: e.segmentos.map(s => {
          if (s.id !== segmentoId) return s
          return { ...s, turmas: s.turmas.map(t => {
            if (t.id !== turmaId) return t
            const alunos = t.alunos || []
            const existe = alunos.findIndex(al => al.id === aluno.id)
            return { ...t, alunos: existe >= 0
              ? alunos.map(al => al.id === aluno.id ? aluno : al)
              : [...alunos, aluno]
            }
          })}
        })}
      })}
    }))
  }

  function alunosRemove(anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string) {
    setAnosLetivos(prev => prev.map(a => {
      if (a.id !== anoId) return a
      return { ...a, escolas: a.escolas.map(e => {
        if (e.id !== escolaId) return e
        return { ...e, segmentos: e.segmentos.map(s => {
          if (s.id !== segmentoId) return s
          return { ...s, turmas: s.turmas.map(t => {
            if (t.id !== turmaId) return t
            return { ...t, alunos: (t.alunos || []).filter(al => al.id !== alunoId) }
          })}
        })}
      })}
    }))
  }

  function alunosGetByTurma(anoId: string, escolaId: string, segmentoId: string, turmaId: string): import('../types').AlunoDestaque[] {
    const ano = anosLetivos.find(a => a.id === anoId)
    const escola = ano?.escolas.find(e => e.id === escolaId)
    const seg = escola?.segmentos.find(s => s.id === segmentoId)
    const turma = seg?.turmas.find(t => t.id === turmaId)
    return turma?.alunos || []
  }

  function _updateAluno(anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, updater: (al: import('../types').AlunoDestaque) => import('../types').AlunoDestaque) {
    setAnosLetivos(prev => prev.map(a => {
      if (a.id !== anoId) return a
      return { ...a, escolas: a.escolas.map(e => {
        if (e.id !== escolaId) return e
        return { ...e, segmentos: e.segmentos.map(s => {
          if (s.id !== segmentoId) return s
          return { ...s, turmas: s.turmas.map(t => {
            if (t.id !== turmaId) return t
            return { ...t, alunos: (t.alunos || []).map(al => al.id === alunoId ? updater(al) : al) }
          })}
        })}
      })}
    }))
  }

  function alunoAddAnotacao(anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, anotacao: import('../types').AnotacaoAluno) {
    _updateAluno(anoId, escolaId, segmentoId, turmaId, alunoId, al => ({
      ...al, anotacoes: [...(al.anotacoes || []), anotacao]
    }))
  }

  function alunoRemoveAnotacao(anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, anotacaoId: string) {
    _updateAluno(anoId, escolaId, segmentoId, turmaId, alunoId, al => ({
      ...al, anotacoes: (al.anotacoes || []).filter(x => x.id !== anotacaoId)
    }))
  }

  function alunoAddMarco(anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, marco: import('../types').MarcoAluno) {
    _updateAluno(anoId, escolaId, segmentoId, turmaId, alunoId, al => ({
      ...al, marcos: [...(al.marcos || []), marco]
    }))
  }

  function alunoRemoveMarco(anoId: string, escolaId: string, segmentoId: string, turmaId: string, alunoId: string, marcoId: string) {
    _updateAluno(anoId, escolaId, segmentoId, turmaId, alunoId, al => ({
      ...al, marcos: (al.marcos || []).filter(x => x.id !== marcoId)
    }))
  }

  // ── salvarNovaFaixa ───────────────────────────────────────────────────────

  function salvarNovaFaixa() {
    const nome = novaFaixaNome.trim()
    if (!nome) { setModalConfirm({ conteudo: 'Digite o nome da faixa etária!', somenteOk: true, labelConfirm: 'OK' }); return }
    if (faixas.includes(nome)) { setModalConfirm({ conteudo: 'Essa faixa já existe!', somenteOk: true, labelConfirm: 'OK' }); return }
    setFaixas([...faixas, nome])
    setNovaFaixaNome('')
    setModalNovaFaixa(false)
  }

  // ── salvarNovaEscola ──────────────────────────────────────────────────────

  function salvarNovaEscola(
    planoEditando?: Plano | null,
    setPlanoEditando?: React.Dispatch<React.SetStateAction<Plano | null>>
  ) {
    const nome = novaEscolaNome.trim()
    if (!nome) { setModalConfirm({ conteudo: 'Digite o nome da escola!', somenteOk: true, labelConfirm: 'OK' }); return }
    const anoId = novaEscolaAnoId || anosLetivos.find(a => a.status === 'ativo')?.id || anosLetivos[0]?.id
    if (anoId) {
      const ano = anosLetivos.find(a => a.id === anoId)
      if (!(ano && ano.escolas.find(e => e.nome.toLowerCase() === nome.toLowerCase()))) {
        setAnosLetivos(anosLetivos.map(a => {
          if (a.id !== anoId) return a
          return { ...a, escolas: [...a.escolas, { id: String(Date.now()), nome, segmentos: [] }] }
        }))
      }
    }
    if (modalNovaEscola === 'plano' && planoEditando && setPlanoEditando) {
      setPlanoEditando({ ...planoEditando, escola: nome })
    }
    setNovaEscolaNome('')
    setNovaEscolaAnoId('')
    setModalNovaEscola(false)
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
    eventoEditando, setEventoEditando,
    modalEventos, setModalEventos,
    novoEvento, salvarEvento, excluirEvento,
    gtAddAno, gtRemoveAno, gtMudarStatusAno,
    gtAddEscola, gtRemoveEscola,
    gtAddSegmento, gtRemoveSegmento,
    gtAddTurma, gtRemoveTurma,
    alunosAddOrUpdate, alunosRemove, alunosGetByTurma,
    alunoAddAnotacao, alunoRemoveAnotacao, alunoAddMarco, alunoRemoveMarco,
    salvarNovaFaixa,
    salvarNovaEscola,
  }

  return (
    <AnoLetivoContext.Provider value={value}>
      {children}
    </AnoLetivoContext.Provider>
  )
}
