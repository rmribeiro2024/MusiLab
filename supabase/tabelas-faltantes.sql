-- ══════════════════════════════════════════════════════════════
-- MusiLab — Tabelas que faltam no Supabase
-- Execute no Supabase Dashboard → SQL Editor → Run
-- ══════════════════════════════════════════════════════════════

-- ── estrategias ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.estrategias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     text NOT NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);
ALTER TABLE public.estrategias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "estrategias: leitura própria"  ON public.estrategias;
DROP POLICY IF EXISTS "estrategias: inserção própria" ON public.estrategias;
DROP POLICY IF EXISTS "estrategias: update próprio"   ON public.estrategias;
DROP POLICY IF EXISTS "estrategias: delete próprio"   ON public.estrategias;
CREATE POLICY "estrategias: leitura própria"  ON public.estrategias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "estrategias: inserção própria" ON public.estrategias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "estrategias: update próprio"   ON public.estrategias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "estrategias: delete próprio"   ON public.estrategias FOR DELETE USING (auth.uid() = user_id);

-- ── planejamento_turma ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planejamento_turma (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     text NOT NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);
ALTER TABLE public.planejamento_turma ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planejamento_turma: leitura própria"  ON public.planejamento_turma;
DROP POLICY IF EXISTS "planejamento_turma: inserção própria" ON public.planejamento_turma;
DROP POLICY IF EXISTS "planejamento_turma: update próprio"   ON public.planejamento_turma;
DROP POLICY IF EXISTS "planejamento_turma: delete próprio"   ON public.planejamento_turma;
CREATE POLICY "planejamento_turma: leitura própria"  ON public.planejamento_turma FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "planejamento_turma: inserção própria" ON public.planejamento_turma FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "planejamento_turma: update próprio"   ON public.planejamento_turma FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "planejamento_turma: delete próprio"   ON public.planejamento_turma FOR DELETE USING (auth.uid() = user_id);

-- ── planejamento_anual (se não existir) ────────────────────────
CREATE TABLE IF NOT EXISTS public.planejamento_anual (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id     text NOT NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);
ALTER TABLE public.planejamento_anual ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "planejamento_anual: leitura própria"  ON public.planejamento_anual;
DROP POLICY IF EXISTS "planejamento_anual: inserção própria" ON public.planejamento_anual;
DROP POLICY IF EXISTS "planejamento_anual: update próprio"   ON public.planejamento_anual;
DROP POLICY IF EXISTS "planejamento_anual: delete próprio"   ON public.planejamento_anual;
CREATE POLICY "planejamento_anual: leitura própria"  ON public.planejamento_anual FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "planejamento_anual: inserção própria" ON public.planejamento_anual FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "planejamento_anual: update próprio"   ON public.planejamento_anual FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "planejamento_anual: delete próprio"   ON public.planejamento_anual FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- Verificação: todas as tabelas devem aparecer com rowsecurity = true
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- ══════════════════════════════════════════════════════════════
