import sys

path = r'C:\Users\rodri\Documents\MusiLab\src\components\modals\ModalRegistroPosAula.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

errors = []

# Corrigir: objetivo pode ter HTML (TipTap) — strippar tags antes de exibir
# Corrigir: duracao pode ja ter 'min' ou nao — normalizar display

old = (
    '                                        const objetivo: string = (planoParaRegistro as any).objetivoGeral || \'\'\n'
    '                                        const criterio: string = (planoParaRegistro as any).avaliacaoEvidencia || \'\''
)
new = (
    '                                        const stripHtml = (s: string) => s.replace(/<[^>]+>/g, \'\').trim()\n'
    '                                        const objetivo: string = stripHtml((planoParaRegistro as any).objetivoGeral || \'\')\n'
    '                                        const criterio: string = stripHtml((planoParaRegistro as any).avaliacaoEvidencia || \'\')'
)
if old in src:
    src = src.replace(old, new, 1)
    print('1 OK: stripHtml adicionado para objetivo e criterio')
else:
    errors.append('ERRO 1: trecho objetivo/criterio nao encontrado')

# Corrigir display da duracao — nao adicionar 'min' se ja vier com texto
old2 = (
    '                                                                            {at.duracao ? <span style={{ fontSize: 10, color: \'#a5b4fc\', flexShrink: 0 }}>{at.duracao}min</span> : null}'
)
new2 = (
    '                                                                            {at.duracao ? <span style={{ fontSize: 10, color: \'#a5b4fc\', flexShrink: 0 }}>{String(at.duracao).replace(/min$/i, \'\')}min</span> : null}'
)
if old2 in src:
    src = src.replace(old2, new2, 1)
    print('2 OK: duracao normalizada')
else:
    errors.append('ERRO 2: trecho duracao nao encontrado')

if errors:
    for e in errors: print(e)
    sys.exit(1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)

print('Arquivo salvo.')
