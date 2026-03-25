#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera PDF legível do arquivo HISTORICO-POSÁULA.md
"""

import re
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Preformatted, KeepTogether
)
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# --- Fontes ---
try:
    pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-Italic', 'C:/Windows/Fonts/ariali.ttf'))
    pdfmetrics.registerFont(TTFont('Arial-BoldItalic', 'C:/Windows/Fonts/arialbi.ttf'))
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    registerFontFamily('Arial', normal='Arial', bold='Arial-Bold',
                       italic='Arial-Italic', boldItalic='Arial-BoldItalic')
    FONT = 'Arial'
    FONT_BOLD = 'Arial-Bold'
    FONT_ITALIC = 'Arial-Italic'
    print('Fonte Arial registrada.')
except Exception as e:
    print(f'Arial nao encontrado, usando Helvetica: {e}')
    FONT = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'
    FONT_ITALIC = 'Helvetica-Oblique'

# --- Paleta ---
C_ACCENT   = colors.HexColor('#5B5FEA')
C_GREEN    = colors.HexColor('#6aab8a')
C_AMBER    = colors.HexColor('#908e50')
C_CORAL    = colors.HexColor('#c4844a')
C_TEXT     = colors.HexColor('#1E293B')
C_MUTED    = colors.HexColor('#64748B')
C_HR       = colors.HexColor('#CBD5E1')
C_HR_DARK  = colors.HexColor('#94A3B8')
C_CODE_BG  = colors.HexColor('#F1F5F9')
C_CODE_BD  = colors.HexColor('#CBD5E1')
C_TABLE_HD = colors.HexColor('#1E2A4A')
C_ROW_ALT  = colors.HexColor('#F8FAFC')
C_PHASE1_BG = colors.HexColor('#F0FDF4')
C_PHASE1_BD = colors.HexColor('#6aab8a')
C_PHASE2_BG = colors.HexColor('#EEF2FF')
C_PHASE2_BD = colors.HexColor('#5B5FEA')
C_PHASE3_BG = colors.HexColor('#FFFBEB')
C_PHASE3_BD = colors.HexColor('#908e50')
C_ARCHIVED_BG = colors.HexColor('#FFF1F2')
C_ARCHIVED_BD = colors.HexColor('#FDA4AF')

PAGE_W = A4[0]
MARGIN = 20 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# --- Substituições para blocos de código (Courier não suporta box drawing) ---
CODE_SUBS = str.maketrans({
    '┌': '+', '┐': '+', '└': '+', '┘': '+',
    '├': '+', '┤': '+', '┬': '+', '┴': '+', '┼': '+',
    '─': '-', '━': '-', '│': '|', '┃': '|',
    '▾': 'v', '▸': '>',
    '←': '<-', '→': '->',
    '▲': '^', '▼': 'v',
    '‹': '<', '›': '>',
    '↻': '[~]', '✓': '[v]',
    '☐': '[ ]', '⭐': '[*]',
    '⚡': '[!]', '👤': '[aluno]', '📉': '[queda]',
    '⚠': '[!]',
    '●': '*',
})

# --- Estilos ---
def make_styles():
    s = {}
    base = dict(fontName=FONT, fontSize=10, textColor=C_TEXT, leading=15,
                spaceBefore=2, spaceAfter=2, wordWrap='LTR')

    s['h1'] = ParagraphStyle('h1', fontName=FONT_BOLD, fontSize=22,
        textColor=C_ACCENT, spaceBefore=0, spaceAfter=6, leading=28)
    s['h1_sub'] = ParagraphStyle('h1_sub', fontName=FONT, fontSize=11,
        textColor=C_MUTED, spaceBefore=0, spaceAfter=10, leading=16)
    s['h2'] = ParagraphStyle('h2', fontName=FONT_BOLD, fontSize=15,
        textColor=C_TEXT, spaceBefore=8, spaceAfter=4, leading=20)
    s['h3'] = ParagraphStyle('h3', fontName=FONT_BOLD, fontSize=12,
        textColor=C_TEXT, spaceBefore=8, spaceAfter=3, leading=17)
    s['h4'] = ParagraphStyle('h4', fontName=FONT_BOLD, fontSize=11,
        textColor=C_ACCENT, spaceBefore=6, spaceAfter=3, leading=16)
    s['body'] = ParagraphStyle('body', **base)
    s['bullet'] = ParagraphStyle('bullet', fontName=FONT, fontSize=10,
        textColor=C_TEXT, leading=15, spaceBefore=2, spaceAfter=2,
        leftIndent=14, firstLineIndent=-10, wordWrap='LTR')
    s['bullet2'] = ParagraphStyle('bullet2', fontName=FONT, fontSize=10,
        textColor=C_TEXT, leading=14, spaceBefore=1, spaceAfter=1,
        leftIndent=26, firstLineIndent=-10, wordWrap='LTR')
    s['num'] = ParagraphStyle('num', fontName=FONT, fontSize=10,
        textColor=C_TEXT, leading=15, spaceBefore=2, spaceAfter=2,
        leftIndent=14, firstLineIndent=-10, wordWrap='LTR')
    s['blockquote'] = ParagraphStyle('blockquote', fontName=FONT_ITALIC,
        fontSize=11, textColor=C_ACCENT, spaceBefore=8, spaceAfter=8,
        leading=17, leftIndent=16, rightIndent=8,
        borderPad=6, wordWrap='LTR')
    s['meta'] = ParagraphStyle('meta', fontName=FONT_ITALIC, fontSize=8.5,
        textColor=C_MUTED, spaceBefore=10, spaceAfter=2, leading=13)
    s['code_inner'] = ParagraphStyle('code_inner', fontName='Courier',
        fontSize=8.5, textColor=C_TEXT, leading=13, wordWrap='LTR',
        leftIndent=0, rightIndent=0, spaceBefore=0, spaceAfter=0)
    s['table_hd'] = ParagraphStyle('table_hd', fontName=FONT_BOLD,
        fontSize=9, textColor=colors.white, leading=13, wordWrap='LTR')
    s['table_cell'] = ParagraphStyle('table_cell', fontName=FONT,
        fontSize=9, textColor=C_TEXT, leading=13, wordWrap='LTR',
        spaceBefore=2, spaceAfter=2)
    s['label_f1'] = ParagraphStyle('label_f1', fontName=FONT_BOLD, fontSize=9,
        textColor=C_PHASE1_BD, spaceBefore=0, spaceAfter=0, leading=12)
    s['label_f2'] = ParagraphStyle('label_f2', fontName=FONT_BOLD, fontSize=9,
        textColor=C_PHASE2_BD, spaceBefore=0, spaceAfter=0, leading=12)
    s['label_f3'] = ParagraphStyle('label_f3', fontName=FONT_BOLD, fontSize=9,
        textColor=C_PHASE3_BD, spaceBefore=0, spaceAfter=0, leading=12)
    return s

# --- Utilitários ---
def escape_xml(text):
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;').replace('>', '&gt;')
    return text

def inline_fmt(text):
    """Markdown inline → ReportLab XML markup."""
    text = escape_xml(text)
    # Bold+italic
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<b><i>\1</i></b>', text)
    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # Italic (cuidado com bullets)
    text = re.sub(r'(?<![*\w])\*([^*\n]+?)\*(?![*\w])', r'<i>\1</i>', text)
    # Inline code
    text = re.sub(r'`([^`]+?)`',
        lambda m: f'<font name="Courier" size="9">{escape_xml(m.group(1))}</font>', text)
    # Emojis e símbolos especiais mantidos (Arial suporta)
    return text

def code_block(lines_list, styles):
    """Cria bloco de código com fundo cinza."""
    raw = '\n'.join(lines_list).translate(CODE_SUBS)
    # Limita largura de linha a 85 chars para caber na página
    safe_lines = []
    for ln in raw.split('\n'):
        if len(ln) > 85:
            safe_lines.append(ln[:84] + '…')
        else:
            safe_lines.append(ln)
    text = '\n'.join(safe_lines)
    pre = Preformatted(text, styles['code_inner'])
    t = Table([[pre]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_CODE_BG),
        ('BOX', (0,0), (-1,-1), 0.5, C_CODE_BD),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    return t

def make_table(table_lines, styles):
    """Converte linhas de tabela markdown em ReportLab Table."""
    rows = []
    for line in table_lines:
        if re.match(r'^\|[\s\-:|]+\|$', line.strip()):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        rows.append(cells)
    if not rows:
        return None
    col_count = max(len(r) for r in rows)
    # Normaliza colunas
    for r in rows:
        while len(r) < col_count:
            r.append('')
    # Define larguras de coluna proporcionalmente
    col_w = CONTENT_W / col_count
    tdata = []
    for ri, row in enumerate(rows):
        st = styles['table_hd'] if ri == 0 else styles['table_cell']
        trow = [Paragraph(inline_fmt(c), st) for c in row]
        tdata.append(trow)
    t = Table(tdata, colWidths=[col_w] * col_count, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), C_TABLE_HD),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, C_ROW_ALT]),
        ('GRID', (0,0), (-1,-1), 0.5, C_HR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('FONTNAME', (0,0), (-1,0), FONT_BOLD),
        ('FONTSIZE', (0,0), (-1,-1), 9),
    ]))
    return t

def phase_banner(label, sub, bg, bd, styles):
    """Faixa colorida indicando a fase."""
    inner = Paragraph(f'<b>{escape_xml(label)}</b>  <font color="{bd}">{escape_xml(sub)}</font>',
                      styles['body'])
    t = Table([[inner]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('BOX', (0,0), (-1,-1), 1.5, bd),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    return t

def h2_with_rule(text, styles):
    """H2 com linha decorativa colorida."""
    return [
        Spacer(1, 5*mm),
        HRFlowable(width='100%', thickness=2, color=C_ACCENT, spaceAfter=3),
        Paragraph(inline_fmt(text), styles['h2']),
    ]

def archived_note(text, styles):
    """Nota de item arquivado."""
    inner = Paragraph(f'<i>{escape_xml(text)}</i>', styles['body'])
    t = Table([[inner]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_ARCHIVED_BG),
        ('BOX', (0,0), (-1,-1), 0.5, C_ARCHIVED_BD),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    return t

# --- Parser principal ---
def parse_md(lines, styles):
    story = []
    i = 0
    in_code = False
    code_lines = []
    table_lines = []
    in_table = False
    bullet_indent = 0

    # Detecta fase atual (para colorir h3/h4)
    current_phase = 0

    def flush_table():
        nonlocal in_table, table_lines
        if table_lines:
            t = make_table(table_lines, styles)
            if t:
                story.append(t)
                story.append(Spacer(1, 3*mm))
        in_table = False
        table_lines = []

    while i < len(lines):
        raw = lines[i].rstrip('\n')
        stripped = raw.strip()

        # --- Bloco de código ---
        if stripped.startswith('```'):
            if in_table:
                flush_table()
            if not in_code:
                in_code = True
                code_lines = []
            else:
                in_code = False
                story.append(Spacer(1, 2*mm))
                story.append(code_block(code_lines, styles))
                story.append(Spacer(1, 2*mm))
                code_lines = []
            i += 1
            continue

        if in_code:
            code_lines.append(raw)
            i += 1
            continue

        # --- Tabela ---
        if stripped.startswith('|'):
            if not in_table:
                in_table = True
                table_lines = []
            table_lines.append(stripped)
            i += 1
            # Verifica se a próxima linha continua tabela
            next_line = lines[i].strip() if i < len(lines) else ''
            if not next_line.startswith('|'):
                flush_table()
            continue
        elif in_table:
            flush_table()

        # --- Headings ---
        if stripped.startswith('#### '):
            text = stripped[5:]
            story.append(Spacer(1, 2*mm))
            story.append(Paragraph(inline_fmt(text), styles['h4']))

        elif stripped.startswith('### '):
            text = stripped[4:]
            # Detecta fase para banner
            if 'FASE 1' in text.upper():
                current_phase = 1
                story.append(Spacer(1, 4*mm))
                story.append(phase_banner('FASE 1 — Fundação legível',
                    'Alto impacto · Baixo esforço · Implementar primeiro',
                    C_PHASE1_BG, C_PHASE1_BD, styles))
            elif 'FASE 2' in text.upper():
                current_phase = 2
                story.append(Spacer(1, 4*mm))
                story.append(phase_banner('FASE 2 — Detecção de padrões',
                    'Alto impacto · Médio esforço · Após Fase 1 estável',
                    C_PHASE2_BG, C_PHASE2_BD, styles))
            elif 'FASE 3' in text.upper():
                current_phase = 3
                story.append(Spacer(1, 4*mm))
                story.append(phase_banner('FASE 3 — Conexão entre aulas e evolução pedagógica',
                    'Impacto alto · Esforço médio-alto · Após módulo Turmas estável',
                    C_PHASE3_BG, C_PHASE3_BD, styles))
            else:
                story.append(Spacer(1, 4*mm))
                story.append(Paragraph(inline_fmt(text), styles['h3']))

        elif stripped.startswith('## '):
            text = stripped[3:]
            for el in h2_with_rule(text, styles):
                story.append(el)

        elif stripped.startswith('# '):
            text = stripped[2:]
            story.append(Paragraph(inline_fmt(text), styles['h1']))

        # --- HR ---
        elif stripped == '---':
            story.append(Spacer(1, 2*mm))
            story.append(HRFlowable(width='100%', thickness=0.5, color=C_HR))
            story.append(Spacer(1, 2*mm))

        # --- Blockquote ---
        elif stripped.startswith('> '):
            text = stripped[2:]
            story.append(Paragraph(f'"{inline_fmt(text)}"', styles['blockquote']))

        # --- Bullets (com suporte a 2 níveis de indentação) ---
        elif re.match(r'^(\s{0,3})[*\-] ', raw):
            indent_spaces = len(raw) - len(raw.lstrip())
            text = re.sub(r'^\s*[*\-] ', '', raw)
            # Pula emojis/separadores de seção que começam com -
            if stripped.startswith('- [x]') or stripped.startswith('- [ ]'):
                # Checkbox
                checked = stripped.startswith('- [x]')
                label = re.sub(r'^- \[.\] ', '', stripped)
                mark = '☑' if checked else '☐'
                story.append(Paragraph(f'{mark}  {inline_fmt(label)}', styles['bullet']))
            else:
                st = styles['bullet2'] if indent_spaces >= 2 else styles['bullet']
                story.append(Paragraph(f'•  {inline_fmt(text)}', st))

        # --- Lista numerada ---
        elif re.match(r'^\d+\. ', stripped):
            text = re.sub(r'^\d+\. ', '', stripped)
            num = re.match(r'^(\d+)\.', stripped).group(1)
            story.append(Paragraph(f'{num}.  {inline_fmt(text)}', styles['num']))

        # --- Linha de metadata (*texto*) ---
        elif re.match(r'^\*[^*].*[^*]\*$', stripped):
            story.append(Paragraph(inline_fmt(stripped), styles['meta']))

        # --- Linha vazia ---
        elif stripped == '':
            story.append(Spacer(1, 2*mm))

        # --- Parágrafo normal ---
        else:
            if stripped:
                story.append(Paragraph(inline_fmt(stripped), styles['body']))

        i += 1

    return story


# --- Cabeçalho/rodapé das páginas ---
def make_page_decorator(total_label=''):
    def decorator(canvas, doc):
        canvas.saveState()
        # Rodapé
        canvas.setFont(FONT, 8)
        canvas.setFillColor(C_MUTED)
        canvas.drawString(MARGIN, 12*mm, 'MusiLab · Módulo Pós-Aula · Plano de Implementação')
        canvas.drawRightString(PAGE_W - MARGIN, 12*mm, f'pág. {doc.page}')
        # Linha rodapé
        canvas.setStrokeColor(C_HR)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 14*mm, PAGE_W - MARGIN, 14*mm)
        canvas.restoreState()
    return decorator


# --- Main ---
def build_pdf(md_path, pdf_path):
    styles = make_styles()

    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    story = parse_md(lines, styles)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=22*mm,
        title='Histórico Pós-Aula — MusiLab',
        author='MusiLab',
        subject='Plano de Implementação — Módulo Histórico',
    )

    decorator = make_page_decorator()
    doc.build(story, onFirstPage=decorator, onLaterPages=decorator)
    print(f'\nPDF gerado com sucesso:\n  {pdf_path}')


if __name__ == '__main__':
    BASE = r'C:\Users\rodri\Documents\MusiLab'
    md_path  = os.path.join(BASE, 'HISTORICO-POSÁULA.md')
    pdf_path = os.path.join(BASE, 'HISTORICO-POSAULA-PLANO.pdf')
    build_pdf(md_path, pdf_path)
