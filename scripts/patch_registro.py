import sys

path = r'C:\Users\rodri\Documents\MusiLab\src\components\modals\ModalRegistroPosAula.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

errors = []

# ── 1. Adicionar estado planejadoAberto + useEffect + toggle ──
old1 = '    const [mostrarAvancados, setMostrarAvancados] = React.useState(false)'
new1 = (
    '    const [mostrarAvancados, setMostrarAvancados] = React.useState(false)\n'
    '    // Opcao A — painel "O que foi planejado"\n'
    '    const [planejadoAberto, setPlanejadoAberto] = React.useState(true)\n'
    '    React.useEffect(() => {\n'
    '        if (!planoParaRegistro?.id) return\n'
    '        const salvo = localStorage.getItem(`planejado-aberto-${planoParaRegistro.id}`)\n'
    '        if (salvo !== null) { setPlanejadoAberto(salvo === \'true\'); return }\n'
    '        const temConteudo = ((planoParaRegistro as any)?.atividadesRoteiro?.length ?? 0) > 0 || !!((planoParaRegistro as any)?.avaliacaoEvidencia)\n'
    '        setPlanejadoAberto(temConteudo)\n'
    '    }, [planoParaRegistro?.id]) // eslint-disable-line\n'
    '    function togglePlanejadoAberto() {\n'
    '        setPlanejadoAberto(v => {\n'
    '            const novo = !v\n'
    '            if (planoParaRegistro?.id) localStorage.setItem(`planejado-aberto-${planoParaRegistro.id}`, String(novo))\n'
    '            return novo\n'
    '        })\n'
    '    }'
)
if old1 in src:
    src = src.replace(old1, new1, 1)
    print('1 OK: estado planejadoAberto adicionado')
else:
    errors.append('ERRO 1: old1 nao encontrado')

# ── 2. Remover bloco resumoAula ──
old2_start = '                                    {/* O que foi realizado */}\n'
old2_end   = '                                    {/* Chips de anotacao */}'
# Localizar e substituir o bloco inteiro
import re
pattern2 = re.compile(
    r'\s*\{/\* O que foi realizado \*/\}\s*<div[^>]*>\s*<p[^>]*>[\s\S]*?</div>\s*\n(\s*\{/\* Chips)',
    re.MULTILINE
)
m2 = pattern2.search(src)
if m2:
    # Abordagem mais simples: procurar pelo bloco exato
    pass

# Abordagem direta: encontrar o bloco entre os comentarios
marker_start = '                                    {/* O que foi realizado */}'
marker_end   = '\n\n                                    {/* Chips de anotacao */'
idx_start = src.find(marker_start)
idx_end   = src.find('{/* Chips de anotação */}')
if idx_start >= 0 and idx_end >= 0:
    # Pegar tudo entre marker_start e o comentario chips
    bloco = src[idx_start:idx_end]
    src = src[:idx_start] + src[idx_end:]
    print('2 OK: bloco resumoAula removido')
else:
    errors.append(f'ERRO 2: marcadores nao encontrados (start={idx_start}, end={idx_end})')

# ── 3. Adicionar painel Opcao A antes do campo Data ──
old3 = '                                    {/* Data */}\n                                    <div className="flex items-center gap-2" style={{ background: \'#f8fafc\', border: \'1px solid #e2e8f0\', borderRadius: 10, padding: \'10px 12px\' }}>'

painel = (
    '                                    {/* Opcao A — O que foi planejado */}\n'
    '                                    {planoParaRegistro && (() => {\n'
    '                                        const roteiro: any[] = (planoParaRegistro as any).atividadesRoteiro || []\n'
    '                                        const objetivo: string = (planoParaRegistro as any).objetivoGeral || \'\'\n'
    '                                        const criterio: string = (planoParaRegistro as any).avaliacaoEvidencia || \'\'\n'
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
    '                                                                            {at.duracao ? <span style={{ fontSize: 10, color: \'#a5b4fc\', flexShrink: 0 }}>{at.duracao}min</span> : null}\n'
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
    '                                    })()}\n\n'
    '                                    {/* Data */}\n'
    '                                    <div className="flex items-center gap-2" style={{ background: \'#f8fafc\', border: \'1px solid #e2e8f0\', borderRadius: 10, padding: \'10px 12px\' }}>'
)
if old3 in src:
    src = src.replace(old3, painel, 1)
    print('3 OK: painel Opcao A adicionado')
else:
    errors.append('ERRO 3: old3 nao encontrado')

# ── 4. Atualizar algumCampo — remover resumoAula ──
old4 = 'const algumCampo = !!(novoRegistro.resumoAula || novoRegistro.funcionouBem || novoRegistro.naoFuncionou || novoRegistro.proximaAula || novoRegistro.comportamento)'
new4 = 'const algumCampo = !!(novoRegistro.funcionouBem || novoRegistro.naoFuncionou || novoRegistro.proximaAula || novoRegistro.comportamento)'
if old4 in src:
    src = src.replace(old4, new4, 1)
    print('4 OK: algumCampo atualizado')
else:
    errors.append('ERRO 4: old4 nao encontrado')

if errors:
    for e in errors:
        print(e)
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print('Arquivo salvo com sucesso.')
