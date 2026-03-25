/**
 * MusiLab — Script de Build
 * Extrai o JSX do index.html, compila com Babel e gera dist/index.html otimizado
 * Uso: node build.js
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const INPUT  = path.join(__dirname, 'index.html');
const OUTDIR = path.join(__dirname, 'dist');
const OUTPUT = path.join(OUTDIR, 'index.html');

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

console.log('🎵 MusiLab Build iniciado...');

const html = fs.readFileSync(INPUT, 'utf8');

// Extrair conteúdo do <script type="text/babel">
const babelMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!babelMatch) {
    console.error('❌ Não encontrei <script type="text/babel"> no index.html');
    process.exit(1);
}

const jsxCode = babelMatch[1];
console.log('📦 Compilando JSX...');

let compiled;
try {
    const result = babel.transformSync(jsxCode, {
        presets: [
            ['@babel/preset-env', { targets: { browsers: ['last 2 versions', 'not dead'] } }],
            ['@babel/preset-react', { runtime: 'classic' }]
        ],
        compact: true,
        minified: false,
    });
    compiled = result.code;
} catch (e) {
    console.error('❌ Erro de compilação:', e.message);
    process.exit(1);
}

// Substituir o bloco babel por script JS puro + remover import do Babel standalone
let newHtml = html
    // Remover a tag do Babel standalone (não precisa mais)
    .replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone\/babel\.min\.js"><\/script>\n?/, '')
    // Substituir o bloco text/babel pelo JS compilado
    .replace(
        /<script type="text\/babel">[\s\S]*?<\/script>/,
        `<script>\n${compiled}\n</script>`
    );

fs.writeFileSync(OUTPUT, newHtml, 'utf8');

const inputSize  = (fs.statSync(INPUT).size  / 1024).toFixed(1);
const outputSize = (fs.statSync(OUTPUT).size / 1024).toFixed(1);

console.log(`✅ Build concluído!`);
console.log(`   Input:  ${inputSize} KB`);
console.log(`   Output: ${outputSize} KB`);
console.log(`   Arquivo gerado: dist/index.html`);
console.log('');
console.log('📤 Próximo passo: publique o arquivo dist/index.html no GitHub');
