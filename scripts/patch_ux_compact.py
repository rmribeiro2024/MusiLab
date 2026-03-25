import sys

path = r'C:\Users\rodri\Documents\MusiLab\src\components\modals\ModalRegistroPosAula.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

errors = []

# ── 1. Adicionar estado editandoTurma ──
old1 = '    const [mostrarAvancados, setMostrarAvancados] = React.useState(false)'
new1 = (
    '    const [mostrarAvancados, setMostrarAvancados] = React.useState(false)\n'
    '    const [editandoTurma, setEditandoTurma] = React.useState(false)'
)
if old1 in src:
    src = src.replace(old1, new1, 1)
    print('1 OK: estado editandoTurma adicionado')
else:
    errors.append('ERRO 1: mostrarAvancados nao encontrado')

# ── 2. Auto-fechar seletor ao selecionar turma ──
# Quando o usuário clica numa turma, fecha o expandido automaticamente
old2 = "onClick={() => setRegTurmaSel(t.id == regTurmaSel ? '' : t.id)}"
new2 = "onClick={() => { setRegTurmaSel(t.id == regTurmaSel ? '' : t.id); if (t.id != regTurmaSel) setEditandoTurma(false) }}"
if old2 in src:
    src = src.replace(old2, new2, 1)
    print('2 OK: auto-fechar ao selecionar turma')
else:
    errors.append('ERRO 2: onClick turma nao encontrado')

# ── 3. Substituir bloco turma por versão compacta/expandida ──
old3 = (
    '                                    {/* Seleção de turma */}\n'
    '                                    <div style={{ border: \'1px solid #e2e8f0\', borderRadius: 12, padding: 12 }} className="space-y-2">\n'
    '                                        <p style={{ fontSize: 10, fontWeight: 700, color: \'#64748b\', letterSpacing: \'.1em\', textTransform: \'uppercase\', marginBottom: 4 }}>Identificar turma</p>\n'
    '                                        <select value={regAnoSel} onChange={e => { setRegAnoSel(e.target.value); setRegEscolaSel(\'\'); setRegSegmentoSel(\'\'); setRegTurmaSel(\'\') }}\n'
    '                                            style={{ width: \'100%\', padding: \'8px 10px\', border: \'1px solid #e2e8f0\', borderRadius: 8, fontSize: 13, color: \'#0f172a\', background: \'#fff\' }}\n'
    '                                            className="focus:outline-none focus:border-slate-400">\n'
    '                                            <option value="">— Ano Letivo —</option>\n'
    '                                            {anosLetivos.filter(a => a.status !== \'arquivado\').map(a => <option key={a.id} value={a.id}>{a.ano}</option>)}\n'
    '                                        </select>\n'
    '                                        {regAnoSel && (() => {\n'
    '                                            const ano = anosLetivos.find(a => a.id == regAnoSel)\n'
    '                                            return ano && ano.escolas.length > 0 ? (\n'
    '                                                <select value={regEscolaSel} onChange={e => { setRegEscolaSel(e.target.value); setRegSegmentoSel(\'\'); setRegTurmaSel(\'\') }}\n'
    '                                                    style={{ width: \'100%\', padding: \'8px 10px\', border: \'1px solid #e2e8f0\', borderRadius: 8, fontSize: 13, color: \'#0f172a\', background: \'#fff\' }}\n'
    '                                                    className="focus:outline-none focus:border-slate-400">\n'
    '                                                    <option value="">— Escola —</option>\n'
    '                                                    {ano.escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}\n'
    '                                                </select>\n'
    '                                            ) : <p className="text-xs text-slate-400 italic">Nenhuma escola cadastrada neste ano.</p>\n'
    '                                        })()}\n'
    '                                        {regEscolaSel && (() => {\n'
    '                                            const ano = anosLetivos.find(a => a.id == regAnoSel)\n'
    '                                            const esc = ano?.escolas.find(e => e.id == regEscolaSel)\n'
    '                                            return esc && esc.segmentos.length > 0 ? (\n'
    '                                                <select value={regSegmentoSel} onChange={e => { setRegSegmentoSel(e.target.value); setRegTurmaSel(\'\') }}\n'
    '                                                    style={{ width: \'100%\', padding: \'8px 10px\', border: \'1px solid #e2e8f0\', borderRadius: 8, fontSize: 13, color: \'#0f172a\', background: \'#fff\' }}\n'
    '                                                    className="focus:outline-none focus:border-slate-400">\n'
    '                                                    <option value="">— Segmento —</option>\n'
    '                                                    {esc.segmentos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}\n'
    '                                                </select>\n'
    '                                            ) : <p className="text-xs text-slate-400 italic">Nenhum segmento cadastrado.</p>\n'
    '                                        })()}\n'
    '                                        {regSegmentoSel && (() => {\n'
    '                                            const ano = anosLetivos.find(a => a.id == regAnoSel)\n'
    '                                            const esc = ano?.escolas.find(e => e.id == regEscolaSel)\n'
    '                                            const seg = esc?.segmentos.find(s => s.id == regSegmentoSel)\n'
    '                                            return seg && seg.turmas.length > 0 ? (\n'
    '                                                <div className="flex flex-wrap gap-2 mt-1">\n'
    '                                                    {seg.turmas.map(t => (\n'
    '                                                        <button key={t.id} type="button" onClick={() => { setRegTurmaSel(t.id == regTurmaSel ? \'\' : t.id); if (t.id != regTurmaSel) setEditandoTurma(false) }}\n'
    '                                                            style={{ padding: \'6px 12px\', borderRadius: 8, fontSize: 12, fontWeight: regTurmaSel == t.id ? 700 : 500, background: regTurmaSel == t.id ? \'#475569\' : \'#f8fafc\', color: regTurmaSel == t.id ? \'#fff\' : \'#64748b\', border: regTurmaSel == t.id ? \'1px solid #475569\' : \'1px solid #e2e8f0\', transition: \'all .15s\' }}>\n'
    '                                                            {t.nome}\n'
    '                                                        </button>\n'
    '                                                    ))}\n'
    '                                                </div>\n'
    '                                            ) : <p className="text-xs text-slate-400 italic">Nenhuma turma cadastrada.</p>\n'
    '                                        })()}\n'
    '                                        {!regAnoSel && <p className="text-xs text-slate-400">Cadastre anos letivos, escolas e turmas em <strong>\U0001f3eb Turmas</strong>.</p>}\n'
    '                                    </div>'
)
new3 = (
    '                                    {/* Turma + Data — compacto quando selecionado */}\n'
    '                                    {regTurmaSel && !editandoTurma ? (\n'
    '                                        <div style={{ display: \'flex\', alignItems: \'center\', gap: 8, padding: \'9px 12px\', background: \'#f8fafc\', border: \'1px solid #e2e8f0\', borderRadius: 10 }}>\n'
    '                                            {(() => {\n'
    '                                                const ano = anosLetivos.find(a => a.id == regAnoSel)\n'
    '                                                const esc = ano?.escolas.find(e => e.id == regEscolaSel)\n'
    '                                                const seg = esc?.segmentos.find(s => s.id == regSegmentoSel)\n'
    '                                                const tur = seg?.turmas.find(t => t.id == regTurmaSel)\n'
    '                                                return (\n'
    '                                                    <span style={{ fontSize: 13, fontWeight: 700, color: \'#1e293b\', flex: 1, minWidth: 0, overflow: \'hidden\', textOverflow: \'ellipsis\', whiteSpace: \'nowrap\' }}>\n'
    '                                                        {tur?.nome || \'Turma\'}\n'
    '                                                        {esc && <span style={{ fontSize: 12, fontWeight: 400, color: \'#94a3b8\' }}> \xb7 {esc.nome}</span>}\n'
    '                                                    </span>\n'
    '                                                )\n'
    '                                            })()}\n'
    '                                            <input type="date" value={novoRegistro.dataAula} onChange={e => setNovoRegistro({ ...novoRegistro, dataAula: e.target.value })}\n'
    '                                                style={{ fontSize: 12, fontWeight: 600, color: \'#475569\', background: \'transparent\', border: \'none\', outline: \'none\', flexShrink: 0 }} />\n'
    '                                            <button type="button" onClick={() => setEditandoTurma(true)} title="Trocar turma ou data"\n'
    '                                                style={{ fontSize: 11, color: \'#94a3b8\', background: \'none\', border: \'none\', cursor: \'pointer\', padding: \'2px 4px\', flexShrink: 0 }}>\n'
    '                                                \u270e\n'
    '                                            </button>\n'
    '                                        </div>\n'
    '                                    ) : (\n'
    '                                        <div style={{ border: \'1px solid #e2e8f0\', borderRadius: 12, padding: 12 }} className="space-y-2">\n'
    '                                            <p style={{ fontSize: 10, fontWeight: 700, color: \'#64748b\', letterSpacing: \'.1em\', textTransform: \'uppercase\', marginBottom: 4 }}>Identificar turma</p>\n'
    '                                            <select value={regAnoSel} onChange={e => { setRegAnoSel(e.target.value); setRegEscolaSel(\'\'); setRegSegmentoSel(\'\'); setRegTurmaSel(\'\') }}\n'
    '                                                style={{ width: \'100%\', padding: \'8px 10px\', border: \'1px solid #e2e8f0\', borderRadius: 8, fontSize: 13, color: \'#0f172a\', background: \'#fff\' }}\n'
    '                                                className="focus:outline-none focus:border-slate-400">\n'
    '                                                <option value="">— Ano Letivo —</option>\n'
    '                                                {anosLetivos.filter(a => a.status !== \'arquivado\').map(a => <option key={a.id} value={a.id}>{a.ano}</option>)}\n'
    '                                            </select>\n'
    '                                            {regAnoSel && (() => {\n'
    '                                                const ano = anosLetivos.find(a => a.id == regAnoSel)\n'
    '                                                return ano && ano.escolas.length > 0 ? (\n'
    '                                                    <select value={regEscolaSel} onChange={e => { setRegEscolaSel(e.target.value); setRegSegmentoSel(\'\'); setRegTurmaSel(\'\') }}\n'
    '                                                        style={{ width: \'100%\', padding: \'8px 10px\', border: \'1px solid #e2e8f0\', borderRadius: 8, fontSize: 13, color: \'#0f172a\', background: \'#fff\' }}\n'
    '                                                        className="focus:outline-none focus:border-slate-400">\n'
    '                                                        <option value="">— Escola —</option>\n'
    '                                                        {ano.escolas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}\n'
    '                                                    </select>\n'
    '                                                ) : <p className="text-xs text-slate-400 italic">Nenhuma escola cadastrada neste ano.</p>\n'
    '                                            })()}\n'
    '                                            {regEscolaSel && (() => {\n'
    '                                                const ano = anosLetivos.find(a => a.id == regAnoSel)\n'
    '                                                const esc = ano?.escolas.find(e => e.id == regEscolaSel)\n'
    '                                                return esc && esc.segmentos.length > 0 ? (\n'
    '                                                    <select value={regSegmentoSel} onChange={e => { setRegSegmentoSel(e.target.value); setRegTurmaSel(\'\') }}\n'
    '                                                        style={{ width: \'100%\', padding: \'8px 10px\', border: \'1px solid #e2e8f0\', borderRadius: 8, fontSize: 13, color: \'#0f172a\', background: \'#fff\' }}\n'
    '                                                        className="focus:outline-none focus:border-slate-400">\n'
    '                                                        <option value="">— Segmento —</option>\n'
    '                                                        {esc.segmentos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}\n'
    '                                                    </select>\n'
    '                                                ) : <p className="text-xs text-slate-400 italic">Nenhum segmento cadastrado.</p>\n'
    '                                            })()}\n'
    '                                            {regSegmentoSel && (() => {\n'
    '                                                const ano = anosLetivos.find(a => a.id == regAnoSel)\n'
    '                                                const esc = ano?.escolas.find(e => e.id == regEscolaSel)\n'
    '                                                const seg = esc?.segmentos.find(s => s.id == regSegmentoSel)\n'
    '                                                return seg && seg.turmas.length > 0 ? (\n'
    '                                                    <div className="flex flex-wrap gap-2 mt-1">\n'
    '                                                        {seg.turmas.map(t => (\n'
    '                                                            <button key={t.id} type="button" onClick={() => { setRegTurmaSel(t.id == regTurmaSel ? \'\' : t.id); if (t.id != regTurmaSel) setEditandoTurma(false) }}\n'
    '                                                                style={{ padding: \'6px 12px\', borderRadius: 8, fontSize: 12, fontWeight: regTurmaSel == t.id ? 700 : 500, background: regTurmaSel == t.id ? \'#475569\' : \'#f8fafc\', color: regTurmaSel == t.id ? \'#fff\' : \'#64748b\', border: regTurmaSel == t.id ? \'1px solid #475569\' : \'1px solid #e2e8f0\', transition: \'all .15s\' }}>\n'
    '                                                                {t.nome}\n'
    '                                                            </button>\n'
    '                                                        ))}\n'
    '                                                    </div>\n'
    '                                                ) : <p className="text-xs text-slate-400 italic">Nenhuma turma cadastrada.</p>\n'
    '                                            })()}\n'
    '                                            {!regAnoSel && <p className="text-xs text-slate-400">Cadastre anos letivos, escolas e turmas em <strong>\U0001f3eb Turmas</strong>.</p>}\n'
    '                                            <div className="flex items-center gap-2 pt-1" style={{ borderTop: \'1px solid #f1f5f9\', marginTop: 4 }}>\n'
    '                                                <span style={{ fontSize: 11, fontWeight: 600, color: \'#94a3b8\', textTransform: \'uppercase\', letterSpacing: \'.08em\', flex: 1 }}>Data da aula</span>\n'
    '                                                <input type="date" value={novoRegistro.dataAula} onChange={e => setNovoRegistro({ ...novoRegistro, dataAula: e.target.value })}\n'
    '                                                    className="bg-transparent outline-none border-none text-right" style={{ fontSize: 13, fontWeight: 600, color: \'#1e293b\' }} />\n'
    '                                            </div>\n'
    '                                        </div>\n'
    '                                    )}'
)
if old3 in src:
    src = src.replace(old3, new3, 1)
    print('3 OK: bloco turma compactado')
else:
    errors.append('ERRO 3: bloco turma nao encontrado')

# ── 4. Remover bloco Data separado (agora está dentro do seletor) ──
old4 = (
    '                                    {/* Data */}\n'
    '                                    <div className="flex items-center gap-2" style={{ background: \'#f8fafc\', border: \'1px solid #e2e8f0\', borderRadius: 10, padding: \'10px 12px\' }}>\n'
    '                                        <span style={{ fontSize: 11, fontWeight: 600, color: \'#94a3b8\', textTransform: \'uppercase\', letterSpacing: \'.08em\' }}>Data da aula</span>\n'
    '                                        <input type="date" autoFocus value={novoRegistro.dataAula} onChange={e => setNovoRegistro({ ...novoRegistro, dataAula: e.target.value })}\n'
    '                                            className="flex-1 bg-transparent outline-none border-none text-right min-w-0" style={{ fontSize: 13, fontWeight: 600, color: \'#1e293b\' }} />\n'
    '                                    </div>\n'
    '\n'
)
new4 = ''
if old4 in src:
    src = src.replace(old4, new4, 1)
    print('4 OK: bloco Data removido do local antigo')
else:
    errors.append('ERRO 4: bloco Data nao encontrado')

# ── 5. AccordionChip — campo "O que faria diferente" abre por padrão ──
old5 = (
    '                                                <AccordionChip key={id} id={id} icon={icon} label={label} placeholder={placeholder}\n'
    '                                                    value={valor} filled={valor.trim().length > 0}\n'
    '                                                    onChange={v => setNovoRegistro({ ...novoRegistro, [field]: v })}\n'
    '                                                    onTabNext={() => { const next = chipOpenRefs.current[idx + 1]; if (next) next(); else salvarBtnRef.current?.focus() }}\n'
    '                                                    ref={(fn: (() => void) | null) => { chipOpenRefs.current[idx] = fn }}\n'
    '                                                />'
)
new5 = (
    '                                                <AccordionChip key={id} id={id} icon={icon} label={label} placeholder={placeholder}\n'
    '                                                    value={valor} filled={valor.trim().length > 0}\n'
    '                                                    defaultOpen={!registroEditando || valor.trim().length > 0}\n'
    '                                                    onChange={v => setNovoRegistro({ ...novoRegistro, [field]: v })}\n'
    '                                                    onTabNext={() => { const next = chipOpenRefs.current[idx + 1]; if (next) next(); else salvarBtnRef.current?.focus() }}\n'
    '                                                    ref={(fn: (() => void) | null) => { chipOpenRefs.current[idx] = fn }}\n'
    '                                                />'
)
if old5 in src:
    src = src.replace(old5, new5, 1)
    print('5 OK: AccordionChip abre por padrao')
else:
    errors.append('ERRO 5: AccordionChip nao encontrado')

# ── 6. Adicionar label "Como foi a aula?" acima dos 2 chips ──
old6 = '                                    {/* Como foi a aula? — 2 chips */}\n                                    {(() => {'
new6 = (
    '                                    {/* Como foi a aula? — 2 chips */}\n'
    '                                    <p style={{ fontSize: 10, fontWeight: 700, color: \'#94a3b8\', letterSpacing: \'.08em\', textTransform: \'uppercase\', marginBottom: -4 }}>Como foi a aula?</p>\n'
    '                                    {(() => {'
)
if old6 in src:
    src = src.replace(old6, new6, 1)
    print('6 OK: label "Como foi a aula?" adicionado')
else:
    errors.append('ERRO 6: 2-chip block nao encontrado')

if errors:
    for e in errors: print(e)
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print('\nArquivo salvo com sucesso.')
