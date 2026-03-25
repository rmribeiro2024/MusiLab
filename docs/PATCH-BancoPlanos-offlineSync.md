# Patch — BancoPlanos.tsx
# Mudanças cirúrgicas para ativar o merge offline-first.
# Tudo marcado com // [offlineSync]

# ─────────────────────────────────────────────────────────
# 1. IMPORTAR as funções do novo arquivo (topo do arquivo)
# ─────────────────────────────────────────────────────────

# ADICIONAR junto dos outros imports (ex: logo após import { dbGet, dbSet, dbDel }):

  import {
      mergeOffline,
      marcarPendente,
      carimbарTimestamp,
      useVoltouOnline,
      totalPendentes,
  } from '../lib/offlineSync'                               // [offlineSync]


# ─────────────────────────────────────────────────────────
# 2. DETECTAR reconexão (dentro do componente BancoPlanos)
# ─────────────────────────────────────────────────────────

# ADICIONAR logo após a declaração dos estados (ex: após useState(false) de dadosCarregados):

  const voltouOnline = useVoltouOnline()                   // [offlineSync]


# ─────────────────────────────────────────────────────────
# 3. MERGE AO CARREGAR DA NUVEM
# ─────────────────────────────────────────────────────────

# LOCALIZAR este bloco (linha ~658-660):

      // Supabase sempre prevalece sobre localStorage quando retorna dados
      if (planosC !== null) setPlanos(planosC.length > 0 ? planosC.map(normalizePlano) : []);
      if (gradesC !== null) setGradesSemanas(gradesC.length > 0 ? gradesC as GradeEditando[] : []);

# SUBSTITUIR POR:

      // [offlineSync] — merge: nuvem + itens criados/editados offline
      const planosLocais = (() => { try { const r = dbGet('planosAula'); return r ? JSON.parse(r).map(normalizePlano) : [] } catch { return [] } })()
      const gradesLocais = (() => { try { const r = dbGet('gradesSemanas'); return r ? JSON.parse(r) : [] } catch { return [] } })()

      const planosMergeados = mergeOffline('planos', planosC, planosLocais)
      const gradesMergeadas = mergeOffline('grades_semanas', gradesC, gradesLocais)

      setPlanos(planosMergeados)
      setGradesSemanas(gradesMergeadas as GradeEditando[])

      // Se houve merge, sobe itens offline imediatamente para a nuvem
      if (totalPendentes() > 0) {
          syncToSupabase('planos', planosMergeados, userId, onSyncStatus)           // [offlineSync]
          syncToSupabase('grades_semanas', gradesMergeadas, userId, onSyncStatus)   // [offlineSync]
          showToast('Dados criados offline foram sincronizados com a nuvem ✓', 'success') // [offlineSync]
      }


# ─────────────────────────────────────────────────────────
# 4. SYNC AO RECONECTAR (após detectar voltouOnline)
# ─────────────────────────────────────────────────────────

# ADICIONAR um novo useEffect logo após o useEffect de sync automático:

  // [offlineSync] — ao voltar online, sobe imediatamente o que ficou pendente
  useEffect(() => {
      if (!voltouOnline || !userId || !dadosCarregados) return
      const pendentes = totalPendentes()
      if (pendentes === 0) return
      console.info(`[offlineSync] Reconectado — sincronizando ${pendentes} item(s) pendente(s)`)
      syncToSupabase('planos', planos, userId, onSyncStatus)
      syncToSupabase('grades_semanas', gradesSemanas, userId, onSyncStatus)
      showToast(`Reconectado — ${pendentes} item(s) offline sincronizado(s) ✓`, 'success')
  }, [voltouOnline])                                                               // [offlineSync]


# ─────────────────────────────────────────────────────────
# 5. CARIMBAR TIMESTAMP AO SALVAR PLANO
#    (em PlanosContext ou onde quer que setPlanos seja chamado ao criar/editar)
# ─────────────────────────────────────────────────────────

# LOCALIZAR onde um plano novo é criado ou editado. Exemplo típico:
#   setPlanos([...planos, novoPlano])
#   setPlanos(planos.map(p => p.id === id ? planoEditado : p))

# SUBSTITUIR POR:
#   setPlanos([...planos, carimbарTimestamp(novoPlano)])
#   setPlanos(planos.map(p => p.id === id ? carimbарTimestamp(planoEditado) : p))

# E SE ESTIVER OFFLINE (sem userId), marcar como pendente:
#   if (!userId) marcarPendente('planos', String(novoPlano.id))


# ─────────────────────────────────────────────────────────
# RESUMO DO FLUXO APÓS A MUDANÇA
# ─────────────────────────────────────────────────────────
#
#  OFFLINE (sem userId ou sem conexão):
#    → Item salvo normalmente no IndexedDB com _updatedAt
#    → ID registrado na offlineQueue
#
#  AO CONECTAR / FAZER LOGIN:
#    → loadFromSupabase carrega dados da nuvem
#    → mergeOffline() compara timestamps
#    → Itens offline mais novos são preservados
#    → Array mergeado é enviado ao Supabase e aplicado no estado
#    → Toast confirma quantos itens foram sincronizados
#
#  RECONEXÃO (estava logado, perdeu Wi-Fi, voltou):
#    → useVoltouOnline() detecta evento 'online'
#    → Sync imediato dos pendentes
#    → Toast de confirmação
