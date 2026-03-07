// src/contexts/EstrategiasContext.tsx
// Estado e lógica do módulo de Estratégias Pedagógicas, extraído de BancoPlanos.tsx.
// Gerencia: 12 useState, sync IndexedDB/Supabase, 5 funções CRUD.

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { dbGet, dbSet } from '../lib/db'
import { syncToSupabase, loadFromSupabase, gerarIdSeguro } from '../lib/utils'
import { useModalContext } from './ModalContext'
import type { Estrategia } from '../types'

// ─── VALORES PADRÃO ───────────────────────────────────────────────────────────

const CATEGORIAS_PADRAO = [
  'Escuta', 'Vocal', 'Corporal', 'Rítmica', 'Instrumental',
  'Improvisação', 'Criação', 'Jogo Musical', 'Análise Musical',
]
const FUNCOES_PADRAO = [
  'Foco inicial', 'Aquecimento corporal', 'Aquecimento vocal',
  'Desenvolvimento', 'Consolidação', 'Transição', 'Encerramento',
]
const OBJETIVOS_PADRAO = [
  'Desenvolver percepção auditiva', 'Consolidar consciência rítmica',
  'Desenvolver coordenação motora', 'Trabalhar afinação',
  'Estimular criatividade musical', 'Desenvolver improvisação',
  'Ampliar escuta ativa', 'Desenvolver memória musical',
  'Desenvolver expressão musical', 'Desenvolver autonomia musical',
]

// ─── INTERFACE DO CONTEXTO ────────────────────────────────────────────────────

export interface EstrategiasContextValue {
  // Dados
  estrategias: Estrategia[]
  setEstrategias: React.Dispatch<React.SetStateAction<Estrategia[]>>
  estrategiaEditando: Estrategia | null
  setEstrategiaEditando: React.Dispatch<React.SetStateAction<Estrategia | null>>
  // Filtros/busca
  buscaEstrategia: string
  setBuscaEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroCategoriaEstrategia: string
  setFiltroCategoriaEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroFuncaoEstrategia: string
  setFiltroFuncaoEstrategia: React.Dispatch<React.SetStateAction<string>>
  filtroObjetivoEstrategia: string
  setFiltroObjetivoEstrategia: React.Dispatch<React.SetStateAction<string>>
  mostrarArquivadasEstrategia: boolean
  setMostrarArquivadasEstrategia: React.Dispatch<React.SetStateAction<boolean>>
  // Listas customizáveis
  categoriasEstrategia: string[]
  setCategoriasEstrategia: React.Dispatch<React.SetStateAction<string[]>>
  funcoesEstrategia: string[]
  setFuncoesEstrategia: React.Dispatch<React.SetStateAction<string[]>>
  objetivosEstrategia: string[]
  setObjetivosEstrategia: React.Dispatch<React.SetStateAction<string[]>>
  // Inputs temporários (formulário de edição de listas)
  novaCategoriaEstr: string
  setNovaCategoriaEstr: React.Dispatch<React.SetStateAction<string>>
  novaFuncaoEstr: string
  setNovaFuncaoEstr: React.Dispatch<React.SetStateAction<string>>
  novoObjetivoEstr: string
  setNovoObjetivoEstr: React.Dispatch<React.SetStateAction<string>>
  // CRUD
  novaEstrategia: () => void
  salvarEstrategia: () => void
  excluirEstrategia: (id: string) => void
  arquivarEstrategia: (id: string) => void
  restaurarEstrategia: (id: string) => void
}

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────

const EstrategiasContext = createContext<EstrategiasContextValue | null>(null)

export function useEstrategiasContext(): EstrategiasContextValue {
  const ctx = useContext(EstrategiasContext)
  if (!ctx) throw new Error('useEstrategiasContext deve ser usado dentro de EstrategiasProvider')
  return ctx
}

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

interface EstrategiasProviderProps {
  children: React.ReactNode
  userId?: string
}

export function EstrategiasProvider({ children, userId }: EstrategiasProviderProps) {
  const { setModalConfirm } = useModalContext()

  // ── 12 useState (copiados de BancoPlanos.tsx linhas ~318–342) ─────────────
  const [estrategias, setEstrategias] = useState<Estrategia[]>(() => {
    const saved = dbGet('estrategias')
    return saved ? JSON.parse(saved) : []
  })
  const [estrategiaEditando, setEstrategiaEditando] = useState<Estrategia | null>(null)
  const [buscaEstrategia, setBuscaEstrategia] = useState('')
  const [filtroCategoriaEstrategia, setFiltroCategoriaEstrategia] = useState('Todas')
  const [filtroFuncaoEstrategia, setFiltroFuncaoEstrategia] = useState('Todas')
  const [filtroObjetivoEstrategia, setFiltroObjetivoEstrategia] = useState('Todos')
  const [mostrarArquivadasEstrategia, setMostrarArquivadasEstrategia] = useState(false)
  const [categoriasEstrategia, setCategoriasEstrategia] = useState<string[]>(() => {
    const saved = dbGet('categoriasEstrategia')
    return saved ? JSON.parse(saved) : CATEGORIAS_PADRAO
  })
  const [funcoesEstrategia, setFuncoesEstrategia] = useState<string[]>(() => {
    const saved = dbGet('funcoesEstrategia')
    return saved ? JSON.parse(saved) : FUNCOES_PADRAO
  })
  const [objetivosEstrategia, setObjetivosEstrategia] = useState<string[]>(() => {
    const saved = dbGet('objetivosEstrategia')
    return saved ? JSON.parse(saved) : OBJETIVOS_PADRAO
  })
  const [novaCategoriaEstr, setNovaCategoriaEstr] = useState('')
  const [novaFuncaoEstr, setNovaFuncaoEstr] = useState('')
  const [novoObjetivoEstr, setNovoObjetivoEstr] = useState('')

  // ── Carregar do Supabase quando userId disponível ─────────────────────────
  const [carregado, setCarregado] = useState(false)
  useEffect(() => {
    if (!userId) { setCarregado(true); return }
    loadFromSupabase('estrategias', userId)
      .then(data => {
        if (data !== null && data.length > 0) setEstrategias(data as Estrategia[])
      })
      .catch(e => console.error('[EstrategiasContext] Erro ao carregar do Supabase:', e))
      .finally(() => setCarregado(true))
  }, [userId])

  // ── Salvar no IndexedDB quando state muda ────────────────────────────────
  useEffect(() => { dbSet('estrategias', JSON.stringify(estrategias)) }, [estrategias])
  useEffect(() => { dbSet('categoriasEstrategia', JSON.stringify(categoriasEstrategia)) }, [categoriasEstrategia])
  useEffect(() => { dbSet('funcoesEstrategia', JSON.stringify(funcoesEstrategia)) }, [funcoesEstrategia])
  useEffect(() => { dbSet('objetivosEstrategia', JSON.stringify(objetivosEstrategia)) }, [objetivosEstrategia])

  // ── Sync para Supabase (debounce 2s, igual ao padrão do BancoPlanos) ──────
  const _prevEstrategias = useRef<Estrategia[] | null>(null)
  const _syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!userId || !carregado) return
    const prev = _prevEstrategias.current
    _prevEstrategias.current = estrategias
    if (prev === null) return // primeira execução após carga — não regravar
    if (estrategias === prev) return
    if (_syncTimeout.current) clearTimeout(_syncTimeout.current)
    _syncTimeout.current = setTimeout(() => {
      syncToSupabase('estrategias', estrategias as unknown as Record<string, unknown>[], userId)
        .catch(e => console.error('[EstrategiasContext] Erro ao sincronizar:', e))
    }, 2000)
  }, [estrategias, userId, carregado])

  // Cleanup timeout no unmount
  useEffect(() => {
    return () => { if (_syncTimeout.current) clearTimeout(_syncTimeout.current) }
  }, [])

  // ── CRUD (copiado de BancoPlanos.tsx linhas ~1905–1946) ───────────────────

  function novaEstrategia() {
    setEstrategiaEditando({
      id: gerarIdSeguro(),
      nome: '', descricao: '', categoria: '', funcao: '',
      objetivos: [], faixaEtaria: '', ativo: true,
      _criadoEm: new Date().toISOString(),
    })
  }

  function salvarEstrategia() {
    if (!estrategiaEditando?.nome?.trim()) {
      setModalConfirm({ conteudo: '⚠️ Preencha o nome da estratégia!', somenteOk: true, labelConfirm: 'OK' })
      return
    }
    const agora = new Date().toISOString()
    const item: Estrategia = { ...estrategiaEditando, _ultimaEdicao: agora }
    const existe = estrategias.find(e => e.id === item.id)
    if (existe) {
      setEstrategias(estrategias.map(e => e.id === item.id ? item : e))
    } else {
      setEstrategias([...estrategias, item])
    }
    setEstrategiaEditando(null)
  }

  function excluirEstrategia(id: string) {
    setModalConfirm({
      titulo: 'Excluir estratégia?',
      conteudo: 'Esta ação não pode ser desfeita.',
      labelConfirm: 'Excluir',
      perigo: true,
      onConfirm: () => setEstrategias(prev => prev.filter(e => e.id !== id)),
    })
  }

  function arquivarEstrategia(id: string) {
    setEstrategias(estrategias.map(e =>
      e.id === id ? { ...e, ativo: false, _ultimaEdicao: new Date().toISOString() } : e
    ))
  }

  function restaurarEstrategia(id: string) {
    setEstrategias(estrategias.map(e =>
      e.id === id ? { ...e, ativo: true, _ultimaEdicao: new Date().toISOString() } : e
    ))
  }

  // ── VALUE ─────────────────────────────────────────────────────────────────

  const value: EstrategiasContextValue = {
    estrategias, setEstrategias,
    estrategiaEditando, setEstrategiaEditando,
    buscaEstrategia, setBuscaEstrategia,
    filtroCategoriaEstrategia, setFiltroCategoriaEstrategia,
    filtroFuncaoEstrategia, setFiltroFuncaoEstrategia,
    filtroObjetivoEstrategia, setFiltroObjetivoEstrategia,
    mostrarArquivadasEstrategia, setMostrarArquivadasEstrategia,
    categoriasEstrategia, setCategoriasEstrategia,
    funcoesEstrategia, setFuncoesEstrategia,
    objetivosEstrategia, setObjetivosEstrategia,
    novaCategoriaEstr, setNovaCategoriaEstr,
    novaFuncaoEstr, setNovaFuncaoEstr,
    novoObjetivoEstr, setNovoObjetivoEstr,
    novaEstrategia, salvarEstrategia, excluirEstrategia,
    arquivarEstrategia, restaurarEstrategia,
  }

  return (
    <EstrategiasContext.Provider value={value}>
      {children}
    </EstrategiasContext.Provider>
  )
}
