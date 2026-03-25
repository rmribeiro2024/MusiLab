import sys

path = r'C:\Users\rodri\Documents\MusiLab\src\components\modals\ModalRegistroPosAula.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

errors = []

# ── 1. Adicionar botão 📋 no header (antes dos botões de janela) ──
old1 = (
    '                        <div style={{ display: \'flex\', alignItems: \'center\', gap: 6, marginTop: 2, flexShrink: 0 }}>\n'
    '                            {[\n'
    '                                { title: minimizado ? \'Restaurar\' : \'Minimizar\', label: \'—\', onClick: () => { setMinimizado(m => !m); setMaximizado(false) }, active: minimizado },'
)
new1 = (
    '                        <div style={{ display: \'flex\', alignItems: \'center\', gap: 6, marginTop: 2, flexShrink: 0 }}>\n'
    '                            {planoParaRegistro && (() => {\n'
    '                                const stripHtml = (s: string) => s.replace(/<[^>]+>/g, \'\').trim()\n'
    '                                const temPlano = (\n'
    '                                    stripHtml((planoParaRegistro as any).objetivoGeral || \'\') ||\n'
    '                                    ((planoParaRegistro as any).atividadesRoteiro?.length > 0) ||\n'
    '                                    stripHtml((planoParaRegistro as any).avaliacaoEvidencia || \'\')\n'
    '                                )\n'
    '                                if (!temPlano) return null\n'
    '                                return (\n'
    '                                    <button title="Ver o que foi planejado"\n'
    '                                        onClick={e => { e.stopPropagation(); setPlanejadoAberto(v => !v) }}\n'
    '                                        style={{ width: 28, height: 28, borderRadius: 8, background: planejadoAberto ? \'rgba(255,255,255,.22)\' : \'rgba(255,255,255,.1)\', border: \'none\', color: planejadoAberto ? \'#fff\' : \'#94a3b8\', fontSize: 13, display: \'flex\', alignItems: \'center\', justifyContent: \'center\', cursor: \'pointer\', transition: \'background .15s\' }}\n'
    '                                        onMouseOver={e => (e.currentTarget.style.background = \'rgba(255,255,255,.22)\')}\n'
    '                                        onMouseOut={e  => (e.currentTarget.style.background = planejadoAberto ? \'rgba(255,255,255,.22)\' : \'rgba(255,255,255,.1)\')}\n'
    '                                    >\U0001f4cb</button>\n'
    '                                )\n'
    '                            })()}\n'
    '                            {[\n'
    '                                { title: minimizado ? \'Restaurar\' : \'Minimizar\', label: \'—\', onClick: () => { setMinimizado(m => !m); setMaximizado(false) }, active: minimizado },'
)
if old1 in src:
    src = src.replace(old1, new1, 1)
    print('1 OK: botao planejado adicionado ao header')
else:
    errors.append('ERRO 1: header buttons nao encontrado')

# ── 2. Adicionar painel planejado entre header e tabs ──
old2 = (
    '                {/* ── CONTEÚDO ── */}\n'
    '                {!minimizado && (\n'
    '                    <div style={{ flex: 1, display: \'flex\', flexDirection: \'column\', overflow: \'hidden\' }}>\n'
    '\n'
    '                        {/* Tabs */}'
)
new2 = (
    '                {/* ── CONTEÚDO ── */}\n'
    '                {!minimizado && (\n'
    '                    <div style={{ flex: 1, display: \'flex\', flexDirection: \'column\', overflow: \'hidden\' }}>\n'
    '\n'
    '                        {/* Painel planejado — abre via ícone no header */}\n'
    '                        {planejadoAberto && planoParaRegistro && (() => {\n'
    '                            const stripHtml = (s: string) => s.replace(/<[^>]+>/g, \'\').trim()\n'
    '                            const roteiro: any[] = (planoParaRegistro as any).atividadesRoteiro || []\n'
    '                            const objetivo = stripHtml((planoParaRegistro as any).objetivoGeral || \'\')\n'
    '                            const criterio = stripHtml((planoParaRegistro as any).avaliacaoEvidencia || \'\')\n'
    '                            return (\n'
    '                                <div style={{ background: \'#f8fafc\', borderBottom: \'1px solid #e2e8f0\', padding: \'12px 16px\', display: \'flex\', flexDirection: \'column\', gap: 8, flexShrink: 0 }}>\n'
    '                                    {objetivo && (\n'
    '                                        <div>\n'
    '                                            <p style={{ fontSize: 9, fontWeight: 700, color: \'#94a3b8\', textTransform: \'uppercase\', letterSpacing: \'.07em\', marginBottom: 2 }}>Objetivo</p>\n'
    '                                            <p style={{ fontSize: 12, color: \'#475569\', lineHeight: 1.4 }}>{objetivo}</p>\n'
    '                                        </div>\n'
    '                                    )}\n'
    '                                    {roteiro.length > 0 && (\n'
    '                                        <div>\n'
    '                                            <p style={{ fontSize: 9, fontWeight: 700, color: \'#94a3b8\', textTransform: \'uppercase\', letterSpacing: \'.07em\', marginBottom: 4 }}>Roteiro</p>\n'
    '                                            <div style={{ display: \'flex\', flexDirection: \'column\', gap: 2 }}>\n'
    '                                                {roteiro.map((at: any, i: number) => (\n'
    '                                                    <div key={at.id ?? i} style={{ display: \'flex\', alignItems: \'baseline\', gap: 6 }}>\n'
    '                                                        <span style={{ fontSize: 10, color: \'#cbd5e1\', fontWeight: 700, flexShrink: 0, minWidth: 14, textAlign: \'right\' as const }}>{i + 1}.</span>\n'
    '                                                        <span style={{ fontSize: 12, color: \'#475569\', flex: 1 }}>{at.nome}</span>\n'
    '                                                        {at.duracao ? <span style={{ fontSize: 10, color: \'#94a3b8\', flexShrink: 0 }}>{String(at.duracao).replace(/min$/i, \'\')}min</span> : null}\n'
    '                                                    </div>\n'
    '                                                ))}\n'
    '                                            </div>\n'
    '                                        </div>\n'
    '                                    )}\n'
    '                                    {criterio && (\n'
    '                                        <div>\n'
    '                                            <p style={{ fontSize: 9, fontWeight: 700, color: \'#94a3b8\', textTransform: \'uppercase\', letterSpacing: \'.07em\', marginBottom: 2 }}>Crit\xe9rio de sucesso</p>\n'
    '                                            <p style={{ fontSize: 12, color: \'#475569\', lineHeight: 1.4, fontStyle: \'italic\' }}>{criterio}</p>\n'
    '                                        </div>\n'
    '                                    )}\n'
    '                                </div>\n'
    '                            )\n'
    '                        })()}\n'
    '\n'
    '                        {/* Tabs */}'
)
if old2 in src:
    src = src.replace(old2, new2, 1)
    print('2 OK: painel planejado inserido entre header e tabs')
else:
    errors.append('ERRO 2: posicao entre header e tabs nao encontrada')

# ── 3. Remover bloco "Opcao A" do meio do form ──
marker_start = '                                    {/* Opcao A — Contexto do planejado (botao discreto) */}'
marker_end   = '\n\n{/* Chips de anotação */}'
idx_s = src.find(marker_start)
idx_e = src.find(marker_end)
if idx_s >= 0 and idx_e >= 0:
    src = src[:idx_s] + src[idx_e + 2:]
    print('3 OK: bloco Opcao A removido do form')
else:
    errors.append(f'ERRO 3: Opcao A block nao encontrado (start={idx_s}, end={idx_e})')

if errors:
    for e in errors: print(e)
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('\nArquivo salvo com sucesso.')
