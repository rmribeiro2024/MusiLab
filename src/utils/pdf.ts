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

    // ── Conversor HTML → texto limpo (apenas ASCII safe) ──
    const htmlToText = (html) => {
        if (!html) return '';
        // Iframes de YouTube/Spotify → texto descritivo
        let result = html
            .replace(/<iframe[^>]*src="([^"]*youtube[^"]*)"[^>]*>(<\/iframe>)?/gi, '[YouTube: $1]')
            .replace(/<iframe[^>]*src="([^"]*spotify[^"]*)"[^>]*>(<\/iframe>)?/gi, '[Spotify: $1]');
        return result
            .replace(/<\/p>\s*<p>/gi, '\n')
            .replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<li[^>]*>/gi, '- ')
            .replace(/<\/?(ul|ol|strong|em|b|i|span|div|h[1-6])[^>]*>/gi, '')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\n{3,}/g, '\n\n').trim();
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
        rule(6, 0);
        y += 6;
        doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(8.5);
        doc.setTextColor(...LABEL);
        doc.text(label.toUpperCase(), mL, y);
        y += 6;
        doc.setFont(FONTE_PDF, "normal"); doc.setTextColor(...DARK);
    };
    // Escreve bloco de texto com quebra de linha automática
    const para = (text, indent, size, bold) => {
        if (!text || !String(text).trim()) return;
        doc.setFontSize(size || 11);
        doc.setFont(FONTE_PDF, bold ? "bold" : "normal");
        doc.setTextColor(...DARK);
        const lines = doc.splitTextToSize(String(text).trim(), cW - (indent || 0));
        lines.forEach(l => { chk(LS); doc.text(l, mL + (indent || 0), y); y += LS; });
    };

    // ════════════════════════════════
    // CABECALHO
    // ════════════════════════════════
    doc.setFillColor(...ACCENT); doc.rect(0, 0, W, 4.5, 'F');

    y = 19;
    doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(19); doc.setTextColor(...DARK);
    const titleLines = doc.splitTextToSize(plano.titulo || "Plano de Aula", cW);
    titleLines.forEach(l => { chk(9); doc.text(l, mL, y); y += 9; });

    if (plano.destaque) {
        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(9); doc.setTextColor(...LABEL);
        doc.text("Favorito", W - mR, 20, { align: 'right' });
    }

    // Metadados — sem status
    const meta = [
        plano.escola,
        plano.numeroAula ? 'Aula ' + plano.numeroAula : null,
        plano.nivel,
        plano.duracao || null,
        // Deduplicar faixaEtaria normalizando espaços e símbolos de grau (° / º)
        [...new Set((plano.faixaEtaria||[]).map(s => String(s).trim().replace(/[°º]/g, 'º')))].join(', ') || null,
    ].filter(Boolean).join('  |  ');
    if (meta) {
        y += 1;
        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(10.5); doc.setTextColor(...LABEL);
        const mLines = doc.splitTextToSize(meta, cW);
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
            const ls = doc.splitTextToSize(h.trim(), cW - 2);
            doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
            ls.forEach(l => { chk(LS); doc.text(l, mL, y); y += LS; });
        });
        y += 3;
    }

    // ════════════════════════════════
    // OBJETIVOS
    // ════════════════════════════════
    const objGeral = htmlToText(plano.objetivoGeral);
    const objEsp = (plano.objetivosEspecificos||[]).map(o => htmlToText(o)).filter(o => o.trim());
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
                o.split('\n').filter(l => l.trim()).forEach(linha => {
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
    // CONCEITOS E UNIDADES
    // ════════════════════════════════
    if (plano.conceitos && plano.conceitos.length > 0) {
        sectionTitle("Conceitos Musicais");
        para(plano.conceitos.join('  |  '), 0, 11);
        y += 3;
    }
    if (plano.unidades && plano.unidades.length > 0) {
        sectionTitle("Unidades");
        para(plano.unidades.join('  |  '), 0, 11);
        y += 3;
    }

    // ════════════════════════════════
    // ROTEIRO DE ATIVIDADES
    // ════════════════════════════════
    if (plano.atividadesRoteiro && plano.atividadesRoteiro.length > 0) {
        sectionTitle("Roteiro de Atividades");
        plano.atividadesRoteiro.forEach((ativ, idx) => {
            chk(22);
            // Nome da atividade
            const header = (idx + 1) + '. ' + (ativ.nome || 'Atividade');
            doc.setFont(FONTE_PDF, "bold"); doc.setFontSize(12); doc.setTextColor(...DARK);
            const hLines = doc.splitTextToSize(header, cW - 28);
            hLines.forEach(l => { chk(7); doc.text(l, mL, y); y += 7; });
            // Duração alinhada à direita
            if (ativ.duracao) {
                doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(10); doc.setTextColor(...LABEL);
                doc.text(ativ.duracao, W - mR, y - 7, { align: 'right' });
            }
            // Descricao
            if (ativ.descricao) {
                const desc = htmlToText(ativ.descricao);
                if (desc.trim()) {
                    desc.split('\n').filter(l => l.trim()).forEach(linha => {
                        const ls = doc.splitTextToSize(linha.trim(), cW - 5);
                        doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
                        ls.forEach(l => { chk(LS); doc.text(l, mL + 5, y); y += LS; });
                    });
                }
            }
            // Objetivo da atividade
            if (ativ.objetivo && ativ.objetivo.trim()) {
                chk(LS);
                doc.setFont(FONTE_PDF, "italic"); doc.setFontSize(10); doc.setTextColor(...LABEL);
                const ls = doc.splitTextToSize('Objetivo: ' + ativ.objetivo.trim(), cW - 5);
                ls.forEach(l => { chk(LS); doc.text(l, mL + 5, y); y += LS; });
            }
            // Links/recursos — sem Unicode, apenas ASCII
            if (ativ.recursos && ativ.recursos.length > 0) {
                ativ.recursos.forEach(rec => {
                    const url = typeof rec === 'string' ? rec : (rec.url || '');
                    if (!url) return;
                    chk(LS);
                    doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(9.5); doc.setTextColor(59, 130, 246);
                    const label = 'Link: ' + url;
                    const ls = doc.splitTextToSize(label, cW - 5);
                    ls.forEach(l => { chk(LS); doc.text(l, mL + 5, y); y += LS; });
                });
            }
            y += 5;
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
            const ls = doc.splitTextToSize('- ' + m, cW - 4);
            doc.setFont(FONTE_PDF, "normal"); doc.setFontSize(11); doc.setTextColor(...DARK);
            ls.forEach((l, i) => { chk(LS); doc.text(l, mL + (i > 0 ? 6 : 4), y); y += LS; });
        });
        y += 3;
    }

    // ════════════════════════════════
    // AVALIACAO / OBSERVACOES
    // ════════════════════════════════
    if (plano.avaliacaoObservacoes && plano.avaliacaoObservacoes.trim()) {
        sectionTitle("Avaliacao / Observacoes");
        doc.setFont(FONTE_PDF, "italic"); doc.setFontSize(11); doc.setTextColor(...DARK);
        const ls = doc.splitTextToSize(plano.avaliacaoObservacoes.trim(), cW);
        ls.forEach(l => { chk(LS); doc.text(l, mL, y); y += LS; });
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
        doc.text("MusiLab - Plano de Aula", mL, H - 9);
        doc.text(p + ' / ' + totalPages, W - mR, H - 9, { align: 'right' });
    }

    doc.save('Plano - ' + plano.titulo + '.pdf');
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

    const htmlToText = (html) => {
        if (!html) return '';
        let result = html
            .replace(/<iframe[^>]*src="([^"]*youtube[^"]*)"[^>]*>(<\/iframe>)?/gi, '[YouTube: $1]')
            .replace(/<iframe[^>]*src="([^"]*spotify[^"]*)"[^>]*>(<\/iframe>)?/gi, '[Spotify: $1]');
        return result
            .replace(/<\/p>\s*<p>/gi, '\n').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/gi, '\n').replace(/<li[^>]*>/gi, '- ')
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
            .replace(/<\/?(ul|ol|strong|em|b|i|span|div|h[1-6])[^>]*>/gi, '').replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
            .replace(/\n{3,}/g, '\n\n').trim();
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
        doc.text(metas.join('  |  '), mL, y); y += 6;
    }
    y = 46;

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
