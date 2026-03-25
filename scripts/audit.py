import re, sys
sys.stdout.reconfigure(encoding='utf-8')

# Get ctx keys from BancoPlanos.jsx
with open('src/components/BancoPlanos.jsx', 'r', encoding='utf-8') as f:
    bp = f.read()

ctx_start = bp.find('const ctx = {')
depth = 0; ctx_end = ctx_start
for i, c in enumerate(bp[ctx_start:], ctx_start):
    if c == '{': depth += 1
    elif c == '}':
        depth -= 1
        if depth == 0: ctx_end = i+1; break

ctx_keys = set(re.findall(r'^\s{6,10}(\w+)[,:]', bp[ctx_start:ctx_end], re.MULTILINE))
print(f"ctx has {len(ctx_keys)} keys")

JS_BUILTINS = {
    'React','useState','useEffect','useCallback','useMemo','useRef','useContext','lazy','Suspense',
    'console','window','document','Math','Date','Set','Map','Array','Object','JSON','Promise',
    'Error','TypeError','null','undefined','true','false','NaN','Infinity',
    'parseInt','parseFloat','setTimeout','clearTimeout','setInterval','clearInterval',
    'isNaN','isFinite','encodeURIComponent','decodeURIComponent','fetch',
    'Boolean','Number','String','RegExp','Symbol',
    'e','i','j','k','a','s','t','d','n','p','v','c','f','g','w','x','y','z','m','r','b','o','q','u',
    'el','fn','id','key','ref','idx','val','err','res','obj','arr','str','num','max','min',
    'props','children','type','name','value','checked','disabled','placeholder','style',
    'event','target','currentTarget','preventDefault','stopPropagation',
    'return','typeof','instanceof','await','async','yield','new','delete','void','throw',
    'if','else','for','while','switch','case','break','continue','try','catch','finally',
    'class','extends','super','import','export','default','from','as','in','of','with',
    'const','let','var','function','this','arguments',
    'dbSize','dbGet','dbSet',
}

def collect_defined(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    defined = set()
    # imports
    for m in re.finditer(r'import\s+(?:(\w+)\s*,\s*)?\{?([^};\n]+)\}?\s+from', content):
        for n in re.findall(r'\b([A-Za-z_]\w+)\b', m.group(0)):
            defined.add(n)
    for m in re.finditer(r'import\s+(\w+)\s+from', content):
        defined.add(m.group(1))
    # ctx destructuring
    ctx_end_pos = content.find('} = ctx')
    if ctx_end_pos != -1:
        depth2 = 0
        for i in range(ctx_end_pos, -1, -1):
            if content[i] == '}': depth2 += 1
            elif content[i] == '{':
                depth2 -= 1
                if depth2 == 0:
                    block = content[i:ctx_end_pos+7]
                    for n in re.findall(r'\b(\w+)\b', block): defined.add(n)
                    break
    defined |= ctx_keys
    # local declarations
    for m in re.finditer(r'\b(?:const|let|var)\s+(\w+)', content): defined.add(m.group(1))
    for m in re.finditer(r'const\s*\[(\w+)\s*,\s*(\w+)\]', content):
        defined.add(m.group(1)); defined.add(m.group(2))
    for m in re.finditer(r'\bfunction\s+(\w+)', content): defined.add(m.group(1))
    # destructuring parameters
    for m in re.finditer(r'\(\s*\{([^}]{1,400})\}', content):
        for n in re.findall(r'\b(\w+)\b', m.group(1)): defined.add(n)
    defined |= JS_BUILTINS
    return defined, content

for filepath in [
    'src/components/TelaPrincipal.jsx',
    'src/components/ModuloSequencias.jsx',
]:
    defined, content = collect_defined(filepath)
    lines = content.split('\n')
    
    # Find identifiers used as function calls: name( where name is not defined
    undefined_calls = {}
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'): continue
        # Remove string literals first
        clean = re.sub(r'"[^"]*"', 'STR', line)
        clean = re.sub(r"'[^']*'", 'STR', clean)
        # Find identifiers used as functions: word(
        for m in re.finditer(r'\b([a-z][a-zA-Z0-9]{2,})\b\s*\(', clean):
            name = m.group(1)
            if name not in defined:
                if name not in undefined_calls:
                    undefined_calls[name] = []
                undefined_calls[name].append(i)
        # Find identifiers in JSX expression context: {name} or {name.
        for m in re.finditer(r'\{([a-z][a-zA-Z0-9]{2,})\s*[\.}]', clean):
            name = m.group(1)
            if name not in defined:
                if name not in undefined_calls:
                    undefined_calls[name] = []
                if i not in undefined_calls.get(name, []):
                    undefined_calls.setdefault(name, []).append(i)
    
    name = filepath.split('/')[-1]
    print(f"\n=== {name}: Potentially undefined identifiers ===")
    for varname, linenos in sorted(undefined_calls.items()):
        print(f"  '{varname}' at lines: {linenos[:5]}")
