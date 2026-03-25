import sys

path = r'C:\Users\rodri\Documents\MusiLab\src\components\modals\ModalRegistroPosAula.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

errors = []

# ── 1. planejadoAberto default → false (sempre fechado) ──
old1 = '    const [planejadoAberto, setPlanejadoAberto] = React.useState(true)'
new1 = '    const [planejadoAberto, setPlanejadoAberto] = React.useState(false)'
if old1 in src:
    src = src.replace(old1, new1, 1)
    print('1 OK: planejadoAberto → false')
else:
    errors.append('ERRO 1: planejadoAberto not found')

# ── 2. mostrarAvancados auto-expand: adicionar comportamento e audioNotaDeVoz ──
old2 = (
    '        if ((r.chamada?.length > 0) || (r.rubrica?.some((x: any) => x.valor > 0)) ||\n'
    '            r.urlEvidencia) {'
)
new2 = (
    '        if ((r.chamada?.length > 0) || (r.rubrica?.some((x: any) => x.valor > 0)) ||\n'
    '            r.urlEvidencia || r.comportamento || r.audioNotaDeVoz) {'
)
if old2 in src:
    src = src.replace(old2, new2, 1)
    print('2 OK: mostrarAvancados auto-expand atualizado')
else:
    errors.append('ERRO 2: auto-expand trecho nao encontrado')

# ── 3. camposConfig: remover funcionouBem, renomear naoFuncionou ──
old3 = (
    "    const camposConfig = [\n"
    "        { id: 'reg-funcionou', icon: '✅', label: 'O que funcionou bem', field: 'funcionouBem', placeholder: 'Ex: A atividade rítmica em grupo engajou muito...' },\n"
    "        { id: 'reg-mudar',     icon: '⚠️', label: 'O que mudar',         field: 'naoFuncionou', placeholder: 'O que eu faria diferente sabendo o que sei agora?' },\n"
    "    ] as const"
)
new3 = (
    "    const camposConfig = [\n"
    "        { id: 'reg-mudar', icon: '💭', label: 'O que faria diferente', field: 'naoFuncionou', placeholder: 'Se você pudesse dar esta aula de novo sabendo o que sabe agora — o que faria diferente?' },\n"
    "    ] as const"
)
if old3 in src:
    src = src.replace(old3, new3, 1)
    print('3 OK: camposConfig atualizado')
else:
    errors.append('ERRO 3: camposConfig nao encontrado')

# ── 4. Remover banner "Última aula" ──
marker_banner_start = '                                    {/* Banner última aula */}'
marker_banner_end   = '\n\n                                    {/* Opcao A'
idx_bs = src.find(marker_banner_start)
idx_be = src.find(marker_banner_end)
if idx_bs >= 0 and idx_be >= 0:
    src = src[:idx_bs] + src[idx_be + 2:]  # +2 to skip the \n\n
    print('4 OK: banner ultima aula removido')
else:
    errors.append(f'ERRO 4: banner marcadores nao encontrados (start={idx_bs}, end={idx_be})')

# ── 5. Mudar Opcao A: remover criterio do painel, adicionar como prompt visível separado ──
old5 = (
    '                                    {/* Opcao A — O que foi planejado */}\n'
    '                                    {planoParaRegistro && (() => {\n'
    '                                        const roteiro: any[] = (planoParaRegistro as any).atividadesRoteiro || []\n'
    '                                        const stripHtml = (s: string) => s.replace(/<[^>]+>/g, \'\').trim()\n'
    '                                        const objetivo: string = stripHtml((planoParaRegistro as any).objetivoGeral || \'\')\n'
    '                                        const criterio: string = stripHtml((planoParaRegistro as any).avaliacaoEvidencia || \'\')\n'
    '                                        if (!objetivo && roteiro.length === 0 && !criterio) return null\n'
    '                                        return (\n'
    '                                            <div style={{ border: \'1px solid #e0e7ff\', borderRadius: 12, overflow: \'hidden\', background: \'#f5f3ff\' }}>\n'
    '                                                <button\n'
    '                                                    type="button"\n'
    '                                                    onClick={togglePlanejadoAberto}\n'
    '                                                    style={{ width: \'100%\', display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\', padding: \'9px 12px\', background: \'transparent\', border: \'none\', cursor: \'pointer\', gap: 8 }}>\n'
    '                                                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: \'.06em\', textTransform: \'uppercase\' as const, color: \'#6366f1\' }}>\n'
    '                                                        \U0001f4cb O que foi planejado\n'
    '                                                    </span>\n'
    '                                                    <span style={{ fontSize: 9, color: \'#a5b4fc\', transform: planejadoAberto ? \'rotate(180deg)\' : \'rotate(0deg)\', transition: \'transform .2s\', display: \'inline-block\' }}>\u25bc</span>\n'
    '                                                </button>\n'
    '                                                {planejadoAberto && (\n'
    '                                                    <div style={{ padding: \'0 12px 12px\', display: \'flex\', flexDirection: \'column\', gap: 8 }}>\n'
    '                                                        {objetivo ? (\n'
    '                                                            <div>\n'
    '                                                                <p style={{ fontSize: 10, fontWeight: 700, color: \'#6366f1\', textTransform: \'uppercase\' as const, letterSpacing: \'.06em\', marginBottom: 3 }}>Objetivo</p>\n'
    '                                                                <p style={{ fontSize: 12, color: \'#3730a3\', lineHeight: 1.4 }}>{objetivo}</p>\n'
    '                                                            </div>\n'
    '                                                        ) : null}\n'
    '                                                        {roteiro.length > 0 ? (\n'
    '                                                            <div>\n'
    '                                                                <p style={{ fontSize: 10, fontWeight: 700, color: \'#6366f1\', textTransform: \'uppercase\' as const, letterSpacing: \'.06em\', marginBottom: 4 }}>Roteiro</p>\n'
    '                                                                <div style={{ display: \'flex\', flexDirection: \'column\', gap: 2 }}>\n'
    '                                                                    {roteiro.map((at: any, i: number) => (\n'
    '                                                                        <div key={at.id ?? i} style={{ display: \'flex\', alignItems: \'baseline\', gap: 6 }}>\n'
    '                                                                            <span style={{ fontSize: 10, color: \'#a5b4fc\', fontWeight: 700, flexShrink: 0, minWidth: 16, textAlign: \'right\' as const }}>{i + 1}.</span>\n'
    '                                                                            <span style={{ fontSize: 12, color: \'#3730a3\', flex: 1 }}>{at.nome}</span>\n'
    '                                                                            {at.duracao ? <span style={{ fontSize: 10, color: \'#a5b4fc\', flexShrink: 0 }}>{String(at.duracao).replace(/min$/i, \'\')}min</span> : null}\n'
    '                                                                        </div>\n'
    '                                                                    ))}\n'
    '                                                                </div>\n'
    '                                                            </div>\n'
    '                                                        ) : null}\n'
    '                                                        {criterio ? (\n'
    '                                                            <div style={{ background: \'#ede9fe\', borderRadius: 8, padding: \'7px 10px\' }}>\n'
    '                                                                <p style={{ fontSize: 10, fontWeight: 700, color: \'#6366f1\', textTransform: \'uppercase\' as const, letterSpacing: \'.06em\', marginBottom: 3 }}>Crit\xe9rio de sucesso</p>\n'
    '                                                                <p style={{ fontSize: 12, color: \'#3730a3\', lineHeight: 1.4, fontStyle: \'italic\' }}>{criterio}</p>\n'
    '                                                            </div>\n'
    '                                                        ) : null}\n'
    '                                                    </div>\n'
    '                                                )}\n'
    '                                            </div>\n'
    '                                        )\n'
    '                                    })()}'
)
new5 = (
    '                                    {/* Opcao A — Contexto do planejado (botao discreto) */}\n'
    '                                    {planoParaRegistro && (() => {\n'
    '                                        const roteiro: any[] = (planoParaRegistro as any).atividadesRoteiro || []\n'
    '                                        const stripHtml = (s: string) => s.replace(/<[^>]+>/g, \'\').trim()\n'
    '                                        const objetivo: string = stripHtml((planoParaRegistro as any).objetivoGeral || \'\')\n'
    '                                        const criterio: string = stripHtml((planoParaRegistro as any).avaliacaoEvidencia || \'\')\n'
    '                                        if (!objetivo && roteiro.length === 0 && !criterio) return null\n'
    '                                        return (\n'
    '                                            <>\n'
    '                                                {(objetivo || roteiro.length > 0) && (\n'
    '                                                    <div style={{ border: \'1px solid #e0e7ff\', borderRadius: 10, overflow: \'hidden\', background: \'#f5f3ff\' }}>\n'
    '                                                        <button\n'
    '                                                            type="button"\n'
    '                                                            onClick={togglePlanejadoAberto}\n'
    '                                                            style={{ width: \'100%\', display: \'flex\', alignItems: \'center\', justifyContent: \'space-between\', padding: \'8px 12px\', background: \'transparent\', border: \'none\', cursor: \'pointer\', gap: 8 }}>\n'
    '                                                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: \'.07em\', textTransform: \'uppercase\' as const, color: \'#818cf8\' }}>\n'
    '                                                                \U0001f4cb O que foi planejado\n'
    '                                                            </span>\n'
    '                                                            <span style={{ fontSize: 9, color: \'#a5b4fc\', transform: planejadoAberto ? \'rotate(180deg)\' : \'rotate(0deg)\', transition: \'transform .2s\', display: \'inline-block\' }}>\u25bc</span>\n'
    '                                                        </button>\n'
    '                                                        {planejadoAberto && (\n'
    '                                                            <div style={{ padding: \'0 12px 12px\', display: \'flex\', flexDirection: \'column\', gap: 8 }}>\n'
    '                                                                {objetivo ? (\n'
    '                                                                    <div>\n'
    '                                                                        <p style={{ fontSize: 10, fontWeight: 700, color: \'#6366f1\', textTransform: \'uppercase\' as const, letterSpacing: \'.06em\', marginBottom: 3 }}>Objetivo</p>\n'
    '                                                                        <p style={{ fontSize: 12, color: \'#3730a3\', lineHeight: 1.4 }}>{objetivo}</p>\n'
    '                                                                    </div>\n'
    '                                                                ) : null}\n'
    '                                                                {roteiro.length > 0 ? (\n'
    '                                                                    <div>\n'
    '                                                                        <p style={{ fontSize: 10, fontWeight: 700, color: \'#6366f1\', textTransform: \'uppercase\' as const, letterSpacing: \'.06em\', marginBottom: 4 }}>Roteiro</p>\n'
    '                                                                        <div style={{ display: \'flex\', flexDirection: \'column\', gap: 2 }}>\n'
    '                                                                            {roteiro.map((at: any, i: number) => (\n'
    '                                                                                <div key={at.id ?? i} style={{ display: \'flex\', alignItems: \'baseline\', gap: 6 }}>\n'
    '                                                                                    <span style={{ fontSize: 10, color: \'#a5b4fc\', fontWeight: 700, flexShrink: 0, minWidth: 16, textAlign: \'right\' as const }}>{i + 1}.</span>\n'
    '                                                                                    <span style={{ fontSize: 12, color: \'#3730a3\', flex: 1 }}>{at.nome}</span>\n'
    '                                                                                    {at.duracao ? <span style={{ fontSize: 10, color: \'#a5b4fc\', flexShrink: 0 }}>{String(at.duracao).replace(/min$/i, \'\')}min</span> : null}\n'
    '                                                                                </div>\n'
    '                                                                            ))}\n'
    '                                                                        </div>\n'
    '                                                                    </div>\n'
    '                                                                ) : null}\n'
    '                                                            </div>\n'
    '                                                        )}\n'
    '                                                    </div>\n'
    '                                                )}\n'
    '                                                {criterio && (\n'
    '                                                    <div style={{ background: \'#ede9fe\', borderRadius: 10, padding: \'9px 12px\', border: \'1px solid #c4b5fd\' }}>\n'
    '                                                        <p style={{ fontSize: 10, fontWeight: 700, color: \'#6366f1\', textTransform: \'uppercase\' as const, letterSpacing: \'.06em\', marginBottom: 3 }}>Crit\xe9rio de sucesso planejado</p>\n'
    '                                                        <p style={{ fontSize: 12, color: \'#3730a3\', lineHeight: 1.4, fontStyle: \'italic\' }}>{criterio}</p>\n'
    '                                                    </div>\n'
    '                                                )}\n'
    '                                            </>\n'
    '                                        )\n'
    '                                    })()}'
)
if old5 in src:
    src = src.replace(old5, new5, 1)
    print('5 OK: Opcao A virou botao discreto + criterio como prompt visivel')
else:
    errors.append('ERRO 5: Opcao A panel nao encontrado')

# ── 6. Remover StatusAulaSelector do posição antes dos chips ──
old6 = (
    '                                    {/* Como foi a aula? (campo unificado) */}\n'
    '                                    <StatusAulaSelector\n'
    '                                        value={(inferStatusLegado((novoRegistro as any).resultadoAula, (novoRegistro as any).proximaAulaOpcao, (novoRegistro as any).statusAula) || (novoRegistro as any).statusAula || \'\') as StatusAula}\n'
    '                                        onChange={v => setNovoRegistro({ ...novoRegistro, statusAula: v || undefined } as any)}\n'
    '                                        onDone={() => salvarBtnRef.current?.focus()}\n'
    '                                        firstRef={statusAulaFirstRef}\n'
    '                                    />\n'
    '\n'
    '{/* Chips de anotação */}'
)
new6 = '{/* Chips de anotação */}'
if old6 in src:
    src = src.replace(old6, new6, 1)
    print('6 OK: StatusAulaSelector removido do topo')
else:
    errors.append('ERRO 6: StatusAulaSelector nao encontrado')

# ── 7. Atualizar chips: remover BehaviorChip, adicionar 2-chip status após ──
old7 = (
    '{/* Chips de anotação */}\n'
    '                                    <div style={{ display: \'flex\', flexDirection: \'column\', gap: 6 }}>\n'
    '                                        {camposConfig.map(({ id, icon, label, field, placeholder }, idx) => {\n'
    '                                            const valor = (novoRegistro as any)[field] || \'\'\n'
    '                                            return (\n'
    '                                                <AccordionChip key={id} id={id} icon={icon} label={label} placeholder={placeholder}\n'
    '                                                    value={valor} filled={valor.trim().length > 0}\n'
    '                                                    onChange={v => setNovoRegistro({ ...novoRegistro, [field]: v })}\n'
    '                                                    onTabNext={() => { const next = chipOpenRefs.current[idx + 1]; if (next) next(); else salvarBtnRef.current?.focus() }}\n'
    '                                                    ref={(fn: (() => void) | null) => { chipOpenRefs.current[idx] = fn }}\n'
    '                                                />\n'
    '                                            )\n'
    '                                        })}\n'
    '\n'
    '                                        {/* Comportamento — chip especial com tags */}\n'
    '                                        <BehaviorChip\n'
    '                                            value={(novoRegistro as any).comportamento || \'\'}\n'
    '                                            filled={!!((novoRegistro as any).comportamento?.trim())}\n'
    '                                            onChange={v => setNovoRegistro({ ...novoRegistro, comportamento: v })}\n'
    '                                            onTabNext={() => salvarBtnRef.current?.focus()}\n'
    '                                            ref={(fn: (() => void) | null) => { chipOpenRefs.current[camposConfig.length] = fn }}\n'
    '                                        />\n'
    '\n'
    '\n'
    '                                    </div>'
)
new7 = (
    '{/* Chips de anotação */}\n'
    '                                    <div style={{ display: \'flex\', flexDirection: \'column\', gap: 6 }}>\n'
    '                                        {camposConfig.map(({ id, icon, label, field, placeholder }, idx) => {\n'
    '                                            const valor = (novoRegistro as any)[field] || \'\'\n'
    '                                            return (\n'
    '                                                <AccordionChip key={id} id={id} icon={icon} label={label} placeholder={placeholder}\n'
    '                                                    value={valor} filled={valor.trim().length > 0}\n'
    '                                                    onChange={v => setNovoRegistro({ ...novoRegistro, [field]: v })}\n'
    '                                                    onTabNext={() => { const next = chipOpenRefs.current[idx + 1]; if (next) next(); else salvarBtnRef.current?.focus() }}\n'
    '                                                    ref={(fn: (() => void) | null) => { chipOpenRefs.current[idx] = fn }}\n'
    '                                                />\n'
    '                                            )\n'
    '                                        })}\n'
    '                                    </div>\n'
    '\n'
    '                                    {/* Como foi a aula? — 2 chips */}\n'
    '                                    {(() => {\n'
    '                                        const statusVal = ((novoRegistro as any).statusAula || inferStatusLegado((novoRegistro as any).resultadoAula, (novoRegistro as any).proximaAulaOpcao, (novoRegistro as any).statusAula)) as StatusAula\n'
    '                                        const ops: { value: StatusAula; label: string; color: string; bg: string; border: string }[] = [\n'
    '                                            { value: \'concluida\', label: \'✓  Avançar\',              color: \'#16a34a\', bg: \'#f0fdf4\', border: \'#86efac\' },\n'
    '                                            { value: \'revisao\',   label: \'↻  Retomar ou revisar\', color: \'#d97706\', bg: \'#fffbeb\', border: \'#fde68a\' },\n'
    '                                        ]\n'
    '                                        return (\n'
    '                                            <div style={{ display: \'flex\', gap: 8 }}>\n'
    '                                                {ops.map(op => {\n'
    '                                                    const sel = statusVal === op.value\n'
    '                                                    return (\n'
    '                                                        <button key={op.value} type="button"\n'
    '                                                            onClick={() => setNovoRegistro({ ...novoRegistro, statusAula: sel ? undefined : op.value } as any)}\n'
    '                                                            style={{\n'
    '                                                                flex: 1, padding: \'9px 8px\', borderRadius: 10,\n'
    '                                                                border: `1.5px solid ${sel ? op.border : \'#e2e8f0\'}`,\n'
    '                                                                background: sel ? op.bg : \'#f8fafc\',\n'
    '                                                                color: sel ? op.color : \'#64748b\',\n'
    '                                                                fontSize: 12, fontWeight: sel ? 700 : 500,\n'
    '                                                                cursor: \'pointer\', transition: \'all .15s\',\n'
    '                                                                outline: \'none\',\n'
    '                                                            }}>\n'
    '                                                            {op.label}\n'
    '                                                        </button>\n'
    '                                                    )\n'
    '                                                })}\n'
    '                                            </div>\n'
    '                                        )\n'
    '                                    })()}'
)
if old7 in src:
    src = src.replace(old7, new7, 1)
    print('7 OK: chips atualizados + 2-chip status adicionado')
else:
    errors.append('ERRO 7: chips section nao encontrada')

# ── 8. Label dinâmico para encaminhamentos ──
old8 = (
    '                                                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: \'.06em\', textTransform: \'uppercase\' as const, color: encaminhamentos.length > 0 ? \'#334155\' : \'#64748b\', flex: 1 }}>\n'
    '                                                        Para a próxima aula\n'
    '                                                    </span>'
)
new8 = (
    '                                                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: \'.06em\', textTransform: \'uppercase\' as const, color: encaminhamentos.length > 0 ? \'#334155\' : \'#64748b\', flex: 1 }}>\n'
    '                                                        {(novoRegistro as any).statusAula === \'revisao\' ? \'O que fazer na pr\xf3xima aula?\' : \'Algum lembrete para a pr\xf3xima aula?\'}\n'
    '                                                    </span>'
)
if old8 in src:
    src = src.replace(old8, new8, 1)
    print('8 OK: label encaminhamentos dinamico')
else:
    errors.append('ERRO 8: label encaminhamentos nao encontrado')

# ── 9. Mover nota de voz para Avançados ──
marker_nv_start = '                                    {/* ── Nota de voz (visível por padrão) ── */}'
marker_nv_end   = '\n                                    {/* ── Campos avançados ── */}'
idx_nv_s = src.find(marker_nv_start)
idx_nv_e = src.find(marker_nv_end)
if idx_nv_s >= 0 and idx_nv_e >= 0:
    nota_de_voz_block = src[idx_nv_s:idx_nv_e].replace(
        '{/* ── Nota de voz (visível por padrão) ── */',
        '{/* ── Nota de voz ── */'
    )
    # Reindent (remove 4 leading spaces from each line, add 4)
    nota_de_voz_reindented = '\n'.join(
        ('    ' + line[4:]) if line.startswith('    ') else line
        for line in nota_de_voz_block.split('\n')
    )
    src = src[:idx_nv_s] + src[idx_nv_e + 1:]  # Remove block + skip first \n
    print('9a OK: nota de voz removida do local original')
else:
    nota_de_voz_reindented = ''
    errors.append(f'ERRO 9a: nota de voz markers nao encontrados (start={idx_nv_s}, end={idx_nv_e})')

# ── 9b. Adicionar BehaviorChip + nota de voz no início dos Avançados ──
old9b = (
    '                                    {mostrarAvancados && (\n'
    '                                        <div className="space-y-3">\n'
    '                                            {/* Chamada rápida */}'
)
behavior_chip = (
    '\n'
    '                                            {/* Comportamento da turma — chip com tags */}\n'
    '                                            <BehaviorChip\n'
    '                                                value={(novoRegistro as any).comportamento || \'\'}\n'
    '                                                filled={!!((novoRegistro as any).comportamento?.trim())}\n'
    '                                                onChange={v => setNovoRegistro({ ...novoRegistro, comportamento: v })}\n'
    '                                                onTabNext={() => {}}\n'
    '                                                ref={(fn: (() => void) | null) => { chipOpenRefs.current[camposConfig.length] = fn }}\n'
    '                                            />\n'
)
new9b = (
    '                                    {mostrarAvancados && (\n'
    '                                        <div className="space-y-3">\n'
    + behavior_chip
    + (nota_de_voz_reindented + '\n' if nota_de_voz_reindented else '')
    + '                                            {/* Chamada rápida */}'
)
if old9b in src:
    src = src.replace(old9b, new9b, 1)
    print('9b OK: BehaviorChip + nota de voz adicionados a Avancados')
else:
    errors.append('ERRO 9b: Avancados start nao encontrado')

# ── 10. Label do toggle Avançados ──
old10 = "                                        {mostrarAvancados ? 'Ocultar campos extras' : 'Chamada · Rubrica · Estratégias'}"
new10 = "                                        {mostrarAvancados ? 'Ocultar campos extras' : 'Comportamento · Nota de voz · Chamada · Rubrica'}"
if old10 in src:
    src = src.replace(old10, new10, 1)
    print('10 OK: toggle Avancados label atualizado')
else:
    errors.append('ERRO 10: toggle label nao encontrado')

# ── 11. algumCampo: remover funcionouBem ──
old11 = 'const algumCampo = !!(novoRegistro.funcionouBem || novoRegistro.naoFuncionou || novoRegistro.proximaAula || novoRegistro.comportamento)'
new11 = 'const algumCampo = !!(novoRegistro.naoFuncionou || novoRegistro.proximaAula || (novoRegistro as any).comportamento || (novoRegistro as any).audioNotaDeVoz)'
if old11 in src:
    src = src.replace(old11, new11, 1)
    print('11 OK: algumCampo atualizado')
else:
    errors.append('ERRO 11: algumCampo nao encontrado')

# ─── Resultado ───
if errors:
    for e in errors:
        print(e)
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print('\nArquivo salvo com sucesso.')
