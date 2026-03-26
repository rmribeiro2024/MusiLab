// @ts-nocheck
// ── FONTE UTF-8 PARA PDF (Roboto via GitHub, cache Cache Storage API) ──
// jsPDF é carregado sob demanda (lazy) via import() dinâmico — não entra no bundle inicial
async function carregarFontePDF(doc) {
    const BASE = 'https://raw.githubusercontent.com/googlefonts/roboto/main/fonts/ttf/';
    const VARIANTES = [
        { url: BASE + 'Roboto-Regular.ttf', estilo: 'normal' },
        { url: BASE + 'Roboto-Bold.ttf',    estilo: 'bold'   },
        { url: BASE + 'Roboto-Italic.ttf',  estilo: 'italic' },
    ];
    function uint8ToBase64(arr) {
        let s = '', chunk = 0x8000;
        for (let i = 0; i < arr.length; i += chunk)
            s += String.fromCharCode(...arr.subarray(i, i + chunk));
        return btoa(s);
    }
    async function buscarFonte(url) {
        if (typeof caches !== 'undefined') {
            const cache = await caches.open('musilab-fonts-v1');
            let resp = await cache.match(url);
            if (!resp) { await cache.add(url); resp = await cache.match(url); }
            return new Uint8Array(await resp.arrayBuffer());
        }
        // fallback: file:// ou contexto sem Cache API (busca sem cache)
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return new Uint8Array(await resp.arrayBuffer());
    }
    try {
        for (const v of VARIANTES) {
            const bytes = await buscarFonte(v.url);
            const fname = 'Roboto-' + v.estilo + '.ttf';
            doc.addFileToVFS(fname, uint8ToBase64(bytes));
            doc.addFont(fname, 'Roboto', v.estilo);
        }
        return 'Roboto';
    } catch(e) {
        console.warn('[MusiLab] Fonte Roboto indisponivel, usando Helvetica:', e.message);
        return 'helvetica';
    }
}


// ── PLANO DE AULA ──
export async function exportarPlanoPDF(plano) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF();
    const FONTE_PDF = await carregarFontePDF(doc);

    // ── Paleta ──
    const W = 210, H = 297;
    const mL = 22, mR = 22, mB = 28;  // mB aumentado de 20→28: mais espaço antes do rodapé
    const cW = W - mL - mR;
    const ACCENT = [55, 65, 81];      // cinza escuro elegante
    const DARK   = [17, 24, 39];       // quase preto — corpo do texto
    const LABEL  = [100, 110, 125];    // cinza médio — apenas labels de seção
    const RULE   = [220, 224, 230];    // linha divisória
    const LS     = 6.2;               // espaçamento entre linhas (mm)

    // safe(): quando Roboto não carregou, Helvetica só suporta Latin-1 (U+0000–U+00FF).
    // Substitui símbolos comuns por equivalentes ASCII antes de descartar o resto.
    const safe = (s: string): string => {
        if (FONTE_PDF !== 'helvetica') return s;
        return s
            .replace(/→/g, '->').replace(/←/g, '<-').replace(/↑/g, '^').replace(/↓/g, 'v')
            .replace(/[•·◦]/g, '-').replace(/[—–]/g, '-')
            .replace(/[""]/g, '"').replace(/['']/g, "'")
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\x00-\xFF]/g, '')
            .replace(/ {2,}/g, ' ');
    };

    // ── Conversor HTML → texto limpo ──
    const decodeEntities = (str: string): string => {
        try {
            const txt = document.createElement('textarea')
            txt.innerHTML = str
            return txt.value
        } catch { return str }
    }
    // Trunca URL para exibição: mantém domínio + path curto
    const truncUrl = (url: string, max = 60) => url.length > max ? url.slice(0, max) + '...' : url;

    const htmlToText = (html) => {
        if (!html) return '';
        // Iframes de YouTube/Spotify → texto descritivo
        let result = html
            .replace(/<iframe[^>]*src="([^"]*youtube[^"]*)"[^>]*>(<\/iframe>)?/gi, '[YouTube: $1]')
            .replace(/<iframe[^>]*src="([^"]*spotify[^"]*)"[^>]*>(<\/iframe>)?/gi, '[Spotify: $1]');
        const stripped = result
            .replace(/<\/p>\s*<p>/gi, '\n')
            .replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<li[^>]*>/gi, '- ')
            .replace(/<\/?(ul|ol|strong|em|b|i|span|div|h[1-6])[^>]*>/gi, '')
            // links: se texto == href, não duplicar; senão "Texto (url)"
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (_m, href, text) => {
                const t = text.replace(/<[^>]*>/g, '').trim()
                return (t === href || !t) ? truncUrl(href) : `${t} (${truncUrl(href)})`
            })
            .replace(/<[^>]*>/g, '')
        const decoded = decodeEntities(stripped)
            // Remove marcadores de parágrafo TipTap (pilcrow U+00B6 e variantes)
            .replace(/[%\s]*[\u00B6\u204B\u2761\uFFFD\u2029\u2028]\s*/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim()
        return FONTE_PDF === 'helvetica' ? safe(decoded) : decoded;
    };

    let y = 0;

    // ── Helpers ──
    const chk = (space) => {
        if (y + space > H - mB) { doc.addPage(); y = 22; return true; }
        return false;
    };
    const rule = (before, after) => {
        y += (before || 4);
        doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
        doc.line(mL, y, W - mR, y);
        y += (after || 4);
    };
    const sectionTitle = (label) => {
        chk(16);
        y += 5;
        doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(8.5);
        doc.setTextColor(...LABEL);
        doc.text(label.toUpperCase(), mL, y);
        y += 5;
        doc.setFont(FONTE_PDF, "normal"); doc.setTextColor(...DARK);
    };
    // Escreve bloco de texto com quebra de linha automática
    const para = (text, indent, size, bold) => {
        if (!text || !String(text).trim()) return;
        doc.setFontSize(size || 11);
        doc.setFont(FONTE_PDF, bold ? "bold" : "normal");
        doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(safe(String(text).trim()), cW - (indent || 0));
        lines.forEach(l => { chk(LS); doc.text(l, mL + (indent || 0), y); y += LS; });
    };

    // ════════════════════════════════
    // CABECALHO
    // ════════════════════════════════
    doc.setFillColor(...ACCENT); doc.rect(0, 0, W, 4.5, 'F');

    y = 19;
    doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(19); doc.setTextColor(...DARK);
    const titleLines = doc.splitTextToSize(safe(plano.titulo || "Plano de Aula"), cW);
    titleLines.forEach(l => { chk(9); doc.text(l, mL, y); y += 9; });

    // Metadados — sem status, sem nivel (campo legado — não exposto no formulário atual)
    const meta = [
        plano.escola,
        plano.numeroAula ? 'Aula ' + plano.numeroAula : null,
        plano.duracao || null,
        // Deduplicar faixaEtaria normalizando espaços e símbolos de grau (° / º)
        [...new Set((plano.faixaEtaria||[]).map(s => String(s).trim().replace(/[°º]/g, 'º')))].join(', ') || null,
    ].filter(Boolean).join('  |  ');
    if (meta) {
        y += 1;
        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(10.5); doc.setTextColor(...LABEL);
        const mLines = doc.splitTextToSize(safe(meta), cW);
        mLines.forEach(l => { doc.text(l, mL, y); y += 5.5; });
    }

    rule(5, 3);

    // ════════════════════════════════
    // BNCC
    // ════════════════════════════════
    const bncc = (plano.habilidadesBNCC||[]).filter(h => h && h.trim());
    if (bncc.length > 0) {
        sectionTitle("Habilidades BNCC");
        bncc.forEach(h => {
            // cW - 2: folga extra para evitar overflow na margem direita
            const ls = doc.splitTextToSize(safe(h.trim()), cW - 2);
            doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
            ls.forEach(l => { chk(LS); doc.text(l, mL, y); y += LS; });
        });
        y += 3;
    }

    // ════════════════════════════════
    // OBJETIVOS
    // ════════════════════════════════
    const objGeral = htmlToText(plano.objetivoGeral);
    const objEsp = (plano.objetivosEspecificos||[]).map(o => htmlToText(o)).filter(o => o.trim() && o.trim() !== '-');
    if (objGeral || objEsp.length > 0) {
        sectionTitle("Objetivos de Aprendizagem");
        if (objGeral) {
            objGeral.split('\n').filter(l => l.trim()).forEach(linha => para(linha.trim(), 0, 11));
            y += 3;
        }
        if (objEsp.length > 0) {
            chk(8);
            doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(9); doc.setTextColor(...LABEL);
            doc.text("ESPECIFICOS", mL, y); y += 6;
            objEsp.forEach(o => {
                o.split('\n').filter(l => l.trim() && l.trim() !== '-').forEach(linha => {
                    const txt = (linha.startsWith('-') ? '' : '- ') + linha.trim();
                    // cW - 11: desconta indentação (4mm 1ª linha / 7mm cont.) + 2mm folga margem
                    const ls = doc.splitTextToSize(txt, cW - 11);
                    doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
                    ls.forEach((l, i) => { chk(LS); doc.text(l, mL + (i > 0 ? 7 : 4), y); y += LS; });
                });
            });
        }
        y += 3;
    }

    // ════════════════════════════════
    // ROTEIRO DE ATIVIDADES
    // ════════════════════════════════
    if (plano.atividadesRoteiro && plano.atividadesRoteiro.length > 0) {
        sectionTitle("Roteiro de Atividades");
        plano.atividadesRoteiro.forEach((ativ) => {
            chk(22);
            // Título + duração inline: "Nome da etapa (20 min)"
            const durStr = ativ.duracao ? ' (' + ativ.duracao + ')' : '';
            const header = safe((ativ.nome || 'Atividade') + durStr);
            doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(12); doc.setTextColor(...DARK);
            const hLines = doc.splitTextToSize(header, cW);
            hLines.forEach(l => { chk(7); doc.text(l, mL, y); y += 7; });
            // Linha divisória fina sob o título da atividade
            doc.setDrawColor(...RULE); doc.setLineWidth(0.18);
            doc.line(mL, y - 1, mL + cW, y - 1);
            y += 2;
            // Descricao — bullets de htmlToText, sub-itens com indentação extra
            if (ativ.descricao) {
                const desc = htmlToText(ativ.descricao);
                if (desc.trim()) {
                    desc.split('\n').filter(l => l.trim() && l.trim() !== '-').forEach(linha => {
                        const txt = linha.trim();
                        // Detecta sub-item: começa com letra maiúscula+) ou número+) tipo "A)", "B)", "1)"
                        const isSubItem = /^[A-Za-z0-9]\)/.test(txt);
                        const isBullet = txt.startsWith('-');
                        const indent = isSubItem ? 10 : isBullet ? 5 : 5;
                        const wrapW = cW - indent - 4;
                        const ls = doc.splitTextToSize(txt, wrapW);
                        const color = isSubItem ? LABEL : DARK;
                        doc.setFont(FONTE_PDF, isSubItem ? "italic" : "normal");
                        doc.setFontSize(isSubItem ? 10 : 11);
                        doc.setTextColor(...color);
                        ls.forEach((l, i) => { chk(LS); doc.text(l, mL + indent + (i > 0 ? 4 : 0), y); y += LS; });
                    });
                }
            }
            // Links dentro da descrição já foram tratados pelo htmlToText (truncUrl).
            // Recursos externos — deduplica: ignora se a URL já aparece na descrição renderizada
            if (ativ.recursos && ativ.recursos.length > 0) {
                const descText = htmlToText(ativ.descricao || '')
                ativ.recursos.slice(0, 2).forEach(rec => {
                    const url = typeof rec === 'string' ? rec : (rec.url || '');
                    if (!url || descText.includes(url.slice(0, 30))) return;
                    chk(LS);
                    doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(9); doc.setTextColor(59, 130, 246);
                    const ls = doc.splitTextToSize('Link: ' + truncUrl(url, 70), cW - 5);
                    ls.forEach(l => { chk(LS); doc.text(l, mL + 5, y); y += LS; });
                });
            }
            y += 6;
        });
    }

    // Metodologia legado
    if (plano.metodologia && (!plano.atividadesRoteiro || plano.atividadesRoteiro.length === 0)) {
        sectionTitle("Metodologia");
        para(htmlToText(plano.metodologia), 0, 11);
        y += 3;
    }

    // ════════════════════════════════
    // MATERIAIS
    // ════════════════════════════════
    if (plano.materiais && plano.materiais.length > 0) {
        sectionTitle("Materiais");
        plano.materiais.forEach(m => {
            const ls = doc.splitTextToSize(safe('- ' + m), cW - 4);
            doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
            ls.forEach((l, i) => { chk(LS); doc.text(l, mL + (i > 0 ? 6 : 4), y); y += LS; });
        });
        y += 3;
    }

    // ════════════════════════════════
    // RODAPE em todas as paginas
    // ════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
        doc.line(mL, H - 14, W - mR, H - 14);
        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(8.5); doc.setTextColor(...LABEL);
        doc.text(safe("MusiLab \u2022 Planejamento inteligente de aulas de musica"), mL, H - 9);
        doc.text(p + ' / ' + totalPages, W - mR, H - 9, { align: 'right' });
    }

    doc.save('Plano - ' + plano.titulo + '.pdf');
}

// Retorna blob URL para pré-visualização (sem baixar)
export async function previewPlanoPDF(plano): Promise<string> {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF();
    await carregarFontePDF(doc);
    // Reutiliza a mesma lógica — copia o conteúdo chamando exportarPlanoPDF em modo "bloburl"
    // Estratégia: duplicamos só o output, o doc é gerado via exportarPlanoPDF mas capturamos via blob
    // Solução mais simples: exportarPlanoPDF retorna o doc internamente aqui não é possível sem refactor.
    // Alternativa: gerar o PDF direto como blob. Chamamos exportarPlanoPDF numa versão que retorna blob.
    // Por ora, geramos novamente e retornamos bloburl.
    const { jsPDF: jsPDF2 } = await import('jspdf')
    const docPreview = new jsPDF2()
    // Preenche o docPreview com o mesmo conteúdo de exportarPlanoPDF
    // Para evitar duplicar 300 linhas, usamos um truque: save interceptado via output
    const blobUrl = await _gerarDocPlano(plano, docPreview)
    return blobUrl
}

async function _gerarDocPlano(plano, doc): Promise<string> {
    await carregarFontePDF(doc);
    const W = 210, H = 297;
    const mL = 22, mR = 22, mB = 28;
    const cW = W - mL - mR;
    const ACCENT = [55, 65, 81];
    const DARK   = [17, 24, 39];
    const LABEL  = [100, 110, 125];
    let y = 0;
    const LS = 6.5;
    const totalPages = 1; // aproximado — não afeta preview

    function chk(needed: number) {
        if (y + needed > H - mB) { doc.addPage(); y = 19; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...DARK); }
    }
    function sectionTitle(title: string) {
        chk(12);
        doc.setFillColor(238, 240, 255);
        doc.roundedRect(mL - 2, y - 4, cW + 4, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ACCENT);
        doc.text(title.toUpperCase(), mL, y + 1); y += 8;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...DARK);
    }
    function addLine(text: string, bold = false, indent = 0) {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(String(text).trim(), cW - (indent || 0));
        lines.forEach((l: string) => { chk(LS); doc.text(l, mL + indent, y); y += LS; });
    }

    y = 19;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(...DARK);
    const titleLines = doc.splitTextToSize(plano.titulo || 'Plano de Aula', cW);
    titleLines.forEach((l: string) => { doc.text(l, mL, y); y += 9; });
    y += 2;

    const meta: string[] = [];
    if (plano.duracao) meta.push(`Duração: ${plano.duracao}`);
    if ((plano.faixaEtaria || []).length) meta.push(`Nível: ${plano.faixaEtaria.join(', ')}`);
    if (plano.data) meta.push(`Data: ${plano.data}`);
    if (meta.length) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...LABEL);
        doc.text(meta.join('   ·   '), mL, y); y += 7;
    }
    doc.setDrawColor(200, 200, 220); doc.setLineWidth(0.3); doc.line(mL, y, W - mR, y); y += 7;

    if (plano.continuacaoAnterior?.trim()) { sectionTitle('Contexto'); addLine(plano.continuacaoAnterior.trim()); y += 3; }
    if (plano.objetivoGeral?.trim()) { sectionTitle('Objetivo Geral'); addLine(plano.objetivoGeral.trim()); y += 3; }
    const especificos = (plano.objetivosEspecificos || []).filter((s: string) => s.trim());
    if (especificos.length) { sectionTitle('Objetivos Específicos'); especificos.forEach((o: string) => { addLine(`• ${o}`); }); y += 3; }

    const ativs = plano.atividadesRoteiro || [];
    if (ativs.length) {
        sectionTitle('Roteiro de Atividades');
        ativs.forEach((a: any, i: number) => {
            chk(10);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...DARK);
            const header = `${i + 1}. ${a.nome || 'Atividade'}${a.duracao ? `  (${a.duracao} min)` : ''}`;
            doc.text(header, mL, y); y += LS;
            if (a.descricao?.trim()) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...DARK); const ls2 = doc.splitTextToSize(a.descricao.trim(), cW - 4); ls2.forEach((l: string) => { chk(LS); doc.text(l, mL + 4, y); y += LS; }); }
            y += 2;
        });
        y += 1;
    }

    const temAvaliacao = plano.avaliacaoEvidencia?.trim() || plano.avaliacaoFechamento?.trim() || plano.avaliacaoContingencia?.trim() || plano.avaliacaoObservacoes?.trim()
    if (temAvaliacao) {
        sectionTitle('Avaliação');
        if (plano.avaliacaoEvidencia?.trim()) { addLine('O que observarei:', true); addLine(plano.avaliacaoEvidencia.trim(), false, 4); y += 2; }
        if (plano.avaliacaoFechamento?.trim()) { addLine('Pergunta de fechamento:', true); addLine(plano.avaliacaoFechamento.trim(), false, 4); y += 2; }
        if (plano.avaliacaoContingencia?.trim()) { addLine('Se não funcionar:', true); addLine(plano.avaliacaoContingencia.trim(), false, 4); y += 2; }
        if (!plano.avaliacaoEvidencia && !plano.avaliacaoFechamento && plano.avaliacaoObservacoes?.trim()) addLine(plano.avaliacaoObservacoes.trim());
        y += 1;
    }

    // Rodapé
    const totalPgs = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= totalPgs; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...LABEL);
        doc.text('MusiLab - Plano de Aula', mL, H - 9);
        doc.text(`${p} / ${totalPgs}`, W - mR, H - 9, { align: 'right' });
    }

    return doc.output('bloburl') as string;
}

// ── SEQUÊNCIA DIDÁTICA ──
export async function exportarSequenciaPDF(sequencia, anosLetivos = []) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF();
    const FONTE_PDF = await carregarFontePDF(doc);
    
    // Buscar informações da sequência
    const ano = anosLetivos.find(a => a.id == sequencia.anoLetivoId);
    const escola = ano?.escolas.find(e => e.id == sequencia.escolaId);
    const nomesSegmentos = (sequencia.segmentos || []).map(segId => {
        const seg = escola?.segmentos.find(s => s.id == segId);
        return seg ? seg.nome : null;
    }).filter(Boolean);
    
    let y = 0;
    const pageHeight = doc.internal.pageSize.height;
    const checkPageBreak = (space) => { 
        if (y + space > pageHeight - 20) { 
            doc.addPage(); 
            y = 20; 
            return true; 
        } 
        return false; 
    };

    // Cabeçalho
    doc.setFillColor(236, 72, 153); // Rosa
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(FONTE_PDF, "bold");
    doc.setFontSize(20);
    doc.text("SEQUENCIA DIDATICA", 15, 20);
    doc.setFontSize(16);
    doc.text(sequencia.titulo || "Sem título", 15, 30);
    doc.setFont(FONTE_PDF, "normal");
    doc.setFontSize(10);
    doc.text(`${escola?.nome || ''} - ${nomesSegmentos.join(', ')}`, 15, 40);
    if (sequencia.turmaEspecifica) {
        doc.text(`Turma: ${sequencia.turmaEspecifica}`, 15, 45);
    }
    y = 60;

    // Informações Gerais
    doc.setDrawColor(200);
    doc.setFillColor(250);
    doc.roundedRect(15, y, 180, 30, 2, 2, 'FD');
    doc.setTextColor(0);
    doc.setFont(FONTE_PDF, "bold");
    doc.setFontSize(10);
    doc.text("INFORMACOES", 20, y + 7);
    doc.setFont(FONTE_PDF, "normal");
    doc.text(`Periodo: ${sequencia.duracao || '-'}`, 20, y + 14);
    doc.text(`Total de aulas: ${sequencia.slots?.length || 0}`, 20, y + 20);
    if (sequencia.unidadePredominante) {
        doc.text(`Unidade: ${sequencia.unidadePredominante}`, 20, y + 26);
    }
    y += 38;

    // Datas
    if (sequencia.dataInicio || sequencia.dataFim) {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
        doc.roundedRect(15, y, 180, 12, 2, 2, 'FD');
        doc.setFont(FONTE_PDF, "bold");
        doc.text("DATAS", 20, y + 7);
        doc.setFont(FONTE_PDF, "normal");
        let dataTexto = '';
        if (sequencia.dataInicio) dataTexto += new Date(sequencia.dataInicio).toLocaleDateString('pt-BR');
        if (sequencia.dataFim) dataTexto += ` ate ${new Date(sequencia.dataFim).toLocaleDateString('pt-BR')}`;
        doc.text(dataTexto, 60, y + 7);
        y += 18;
    }

    // Lista de Aulas
    doc.setFillColor(224, 242, 254);
    doc.rect(15, y, 180, 8, 'F');
    doc.setDrawColor(147, 197, 253);
    doc.rect(15, y, 180, 8);
    doc.setFont(FONTE_PDF, "bold");
    doc.setTextColor(29, 78, 216);
    doc.text("PLANO DE AULAS", 20, y + 5.5);
    y += 12;

    (sequencia.slots || []).forEach((slot, index) => {
        checkPageBreak(40);
        
        // Número da aula
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.roundedRect(15, y, 180, 8, 1, 1, 'FD');
        doc.setFont(FONTE_PDF, "bold");
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Aula ${index + 1}`, 20, y + 5.5);
        y += 12;

        // Conteúdo da aula
        if (slot.planoVinculado) {
            const plano = planos.find(p => p.id == slot.planoVinculado);
            if (plano) {
                doc.setFont(FONTE_PDF, "bold");
                doc.text(plano.titulo, 20, y);
                y += 6;
                
                // Objetivo
                if (plano.objetivoGeral) {
                    doc.setFont(FONTE_PDF, "italic");
                    doc.setFontSize(9);
                    const objLines = doc.splitTextToSize(`Objetivo: ${plano.objetivoGeral}`, 170);
                    objLines.forEach(line => {
                        checkPageBreak(5);
                        doc.text(line, 20, y);
                        y += 4;
                    });
                    y += 2;
                }
                
                // Setlist
                if (plano.atividadesRoteiro && plano.atividadesRoteiro.length > 0) {
                    doc.setFont(FONTE_PDF, "normal");
                    doc.setFontSize(9);
                    doc.text("Atividades:", 20, y);
                    y += 4;
                    plano.atividadesRoteiro.forEach(ativ => {
                        checkPageBreak(4);
                        const atividadeTexto = `- ${ativ.nome}${ativ.duracao ? ' (' + ativ.duracao + ')' : ''}`;
                        doc.text(atividadeTexto, 25, y);
                        y += 4;
                    });
                }
            }
        } else {
            doc.setFont(FONTE_PDF, "italic");
            doc.setTextColor(150);
            doc.text("(Aula nao planejada)", 20, y);
            doc.setTextColor(0);
            y += 6;
        }
        
        y += 4;
    });

    doc.save(`Sequencia - ${sequencia.titulo}.pdf`);
}

// ── ATIVIDADE ──
export async function exportarAtividadePDF(ativ) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF();
    const FONTE_PDF = await carregarFontePDF(doc);

    const W = 210, H = 297;
    const mL = 22, mR = 22, mB = 28;
    const cW = W - mL - mR;
    const ACCENT = [55, 65, 81];
    const DARK   = [17, 24, 39];
    const LABEL  = [100, 110, 125];
    const RULE   = [220, 224, 230];

    const decodeEntities2 = (str: string): string => {
        try { const t = document.createElement('textarea'); t.innerHTML = str; return t.value } catch { return str }
    }
    const htmlToText = (html) => {
        if (!html) return '';
        let result = html
            .replace(/<iframe[^>]*src="([^"]*youtube[^"]*)"[^>]*>(<\/iframe>)?/gi, '[YouTube: $1]')
            .replace(/<iframe[^>]*src="([^"]*spotify[^"]*)"[^>]*>(<\/iframe>)?/gi, '[Spotify: $1]');
        const stripped = result
            .replace(/<\/p>\s*<p>/gi, '\n').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '- ')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
            .replace(/<\/?(ul|ol|strong|em|b|i|span|div|h[1-6])[^>]*>/gi, '').replace(/<[^>]*>/g, '')
        return decodeEntities2(stripped).replace(/\n{3,}/g, '\n\n').trim();
    };

    let y = 0;

    const chk = (space) => { if (y + space > H - mB) { doc.addPage(); y = 22; } };
    const rule = (before?, after?) => {
        y += (before || 4);
        doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
        doc.line(mL, y, W - mR, y);
        y += (after || 4);
    };
    const sectionTitle = (label) => {
        chk(16); rule(6, 0); y += 6;
        doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(8.5); doc.setTextColor(...LABEL);
        doc.text(label.toUpperCase(), mL, y);
        y += 6; doc.setFont(FONTE_PDF, "normal"); doc.setTextColor(...DARK);
    };
    const para = (text, indent?, size?, bold?) => {
        if (!text || !String(text).trim()) return;
        doc.setFontSize(size || 11); doc.setFont(FONTE_PDF, bold ? "bold" : "normal");
        doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(String(text), cW - (indent || 0));
        lines.forEach(line => {
            chk(7); doc.text(line, mL + (indent || 0), y); y += 6.2;
        });
    };

    // ── Cabeçalho ──
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, W, 42, 'F');
    y = 18;
    doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(7); doc.setTextColor(...LABEL);
    doc.text("ATIVIDADE MUSICAL", mL, y); y += 7;
    doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(18); doc.setTextColor(...ACCENT);
    const titleLines = doc.splitTextToSize(ativ.nome || 'Sem título', cW);
    titleLines.forEach(l => { doc.text(l, mL, y); y += 9; });

    // meta tags (duração, faixa etária, categoria) — sem emojis (jsPDF não suporta)
    y = Math.max(y, 34);
    const metas = [
        ativ.duracao || null,
        ...(ativ.faixaEtaria || []),
        ativ.categoria || null,
    ].filter(Boolean);
    if (metas.length) {
        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(9); doc.setTextColor(...LABEL);
        const metaLines = doc.splitTextToSize(metas.join('  |  '), cW);
        metaLines.forEach((l: string) => { doc.text(l, mL, y); y += 5.5; });
    }
    y = Math.max(y + 2, 46);

    // ── Descrição ──
    if (ativ.descricao) {
        sectionTitle('Descrição');
        para(htmlToText(ativ.descricao));
    }

    // ── Conceitos ──
    if ((ativ.conceitos || []).length) {
        sectionTitle('Conceitos trabalhados');
        para((ativ.conceitos || []).map(c => `• ${c}`).join('\n'));
    }

    // ── Materiais ──
    if ((ativ.materiais || []).length) {
        sectionTitle('Materiais necessários');
        (ativ.materiais || []).forEach(m => { if (m?.trim()) para(`• ${m}`); });
    }

    // ── Músicas vinculadas ──
    if ((ativ.musicasVinculadas || []).length) {
        sectionTitle('Músicas vinculadas');
        (ativ.musicasVinculadas || []).forEach(m => {
            const nome = typeof m === 'string' ? m : (m.titulo || '');
            const autor = typeof m === 'object' ? m.autor || '' : '';
            para(`• ${nome}${autor ? ' — ' + autor : ''}`);
        });
    }

    // ── Observações ──
    if (ativ.observacao) {
        sectionTitle('Observações');
        para(htmlToText(ativ.observacao));
    }

    // ── Tags ──
    if ((ativ.tags || []).length) {
        sectionTitle('Tags');
        para((ativ.tags || []).map(t => `#${t}`).join('  '));
    }

    // ── Recursos ──
    if ((ativ.recursos || []).length) {
        sectionTitle('Recursos');
        (ativ.recursos || []).forEach(r => {
            const url = typeof r === 'string' ? r : (r.url || '');
            const titulo = typeof r === 'object' ? r.titulo || '' : '';
            para(`• ${titulo ? titulo + ': ' : ''}${url}`, 0, 9);
        });
    }

    // ── Rodapé ──
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
        doc.line(mL, H - 14, W - mR, H - 14);
        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(8.5); doc.setTextColor(...LABEL);
        doc.text("MusiLab - Atividade Musical", mL, H - 9);
        doc.text(p + ' / ' + totalPages, W - mR, H - 9, { align: 'right' });
    }

    doc.save(`Atividade - ${(ativ.nome || 'sem-titulo').replace(/[^a-z0-9\s\-]/gi, '')}.pdf`);
}

// ── LINK COMPARTILHÁVEL (atividade ou plano) ──
export function gerarLinkCompartilhavel(tipo: 'atividade' | 'plano', dados: Record<string, unknown>): string {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '')
    try {
        const encoded = btoa(encodeURIComponent(JSON.stringify({ tipo, dados })))
        return `${base}#share=${encoded}`
    } catch {
        return base
    }
}

export function decodificarLinkCompartilhavel(hash: string): { tipo: string; dados: Record<string, unknown> } | null {
    try {
        const encoded = hash.startsWith('#share=') ? hash.slice(7) : hash
        return JSON.parse(decodeURIComponent(atob(encoded)))
    } catch {
        return null
    }
}
