-- ══════════════════════════════════════════════════════════════
-- MusiLab — Row Level Security (RLS) para todas as tabelas
-- Execute este SQL no Supabase Dashboard:
--   Database → SQL Editor → New query → Cole tudo → Run
-- ══════════════════════════════════════════════════════════════

-- ── 1. ATIVAR RLS EM TODAS AS TABELAS ──────────────────────────
ALTER TABLE planos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequencias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertorio          ENABLE ROW LEVEL SECURITY;
ALTER TABLE anos_letivos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_escolares   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades_semanas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes       ENABLE ROW LEVEL SECURITY;

-- ── 2. POLICIES — cada usuário só vê e edita seus próprios dados ──

-- planos
CREATE POLICY "planos: leitura própria"    ON planos    FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "planos: inserção própria"   ON planos    FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "planos: update próprio"     ON planos    FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "planos: delete próprio"     ON planos    FOR DELETE USING (auth.uid()::text = user_id);

-- atividades
CREATE POLICY "atividades: leitura própria"  ON atividades  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "atividades: inserção própria" ON atividades  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "atividades: update próprio"   ON atividades  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "atividades: delete próprio"   ON atividades  FOR DELETE USING (auth.uid()::text = user_id);

-- sequencias
CREATE POLICY "sequencias: leitura própria"  ON sequencias  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "sequencias: inserção própria" ON sequencias  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "sequencias: update próprio"   ON sequencias  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "sequencias: delete próprio"   ON sequencias  FOR DELETE USING (auth.uid()::text = user_id);

-- repertorio
CREATE POLICY "repertorio: leitura própria"  ON repertorio  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "repertorio: inserção própria" ON repertorio  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "repertorio: update próprio"   ON repertorio  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "repertorio: delete próprio"   ON repertorio  FOR DELETE USING (auth.uid()::text = user_id);

-- anos_letivos
CREATE POLICY "anos_letivos: leitura própria"  ON anos_letivos  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "anos_letivos: inserção própria" ON anos_letivos  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "anos_letivos: update próprio"   ON anos_letivos  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "anos_letivos: delete próprio"   ON anos_letivos  FOR DELETE USING (auth.uid()::text = user_id);

-- eventos_escolares
CREATE POLICY "eventos_escolares: leitura própria"  ON eventos_escolares  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "eventos_escolares: inserção própria" ON eventos_escolares  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "eventos_escolares: update próprio"   ON eventos_escolares  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "eventos_escolares: delete próprio"   ON eventos_escolares  FOR DELETE USING (auth.uid()::text = user_id);

-- grades_semanas
CREATE POLICY "grades_semanas: leitura própria"  ON grades_semanas  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "grades_semanas: inserção própria" ON grades_semanas  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "grades_semanas: update próprio"   ON grades_semanas  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "grades_semanas: delete próprio"   ON grades_semanas  FOR DELETE USING (auth.uid()::text = user_id);

-- configuracoes (1 row por user_id, sem item_id)
CREATE POLICY "configuracoes: leitura própria"  ON configuracoes  FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "configuracoes: inserção própria" ON configuracoes  FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "configuracoes: update próprio"   ON configuracoes  FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "configuracoes: delete próprio"   ON configuracoes  FOR DELETE USING (auth.uid()::text = user_id);

-- ══════════════════════════════════════════════════════════════
-- Para verificar se RLS está ativo:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- ══════════════════════════════════════════════════════════════
