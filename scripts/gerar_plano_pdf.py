#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera PDF do PLANO-MELHORIAS-NOVA-AULA.md"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import re

OUTPUT = r"C:\Users\rodri\Documents\MusiLab\PLANO-MELHORIAS-NOVA-AULA.pdf"

# ── Cores ────────────────────────────────────────────────────────────────────
AZUL      = colors.HexColor("#2563EB")
AZUL_CLARO = colors.HexColor("#DBEAFE")
VERDE     = colors.HexColor("#16A34A")
VERDE_CLARO = colors.HexColor("#DCFCE7")
ROXO      = colors.HexColor("#7C3AED")
ROXO_CLARO = colors.HexColor("#EDE9FE")
CINZA     = colors.HexColor("#F1F5F9")
CINZA_MED = colors.HexColor("#94A3B8")
CINZA_ESC = colors.HexColor("#334155")
LARANJA   = colors.HexColor("#EA580C")
LARANJA_CL = colors.HexColor("#FFF7ED")
PRETO     = colors.HexColor("#0F172A")
BRANCO    = colors.white

# ── Estilos ───────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

sTitle = S('sTitle',
    fontSize=26, leading=32, textColor=AZUL,
    fontName='Helvetica-Bold', alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=6)

sSubtitle = S('sSubtitle',
    fontSize=11, leading=14, textColor=CINZA_MED,
    fontName='Helvetica', alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=4)

sMeta = S('sMeta',
    fontSize=9, leading=12, textColor=CINZA_MED,
    fontName='Helvetica-Oblique', alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=2)

sH1 = S('sH1',
    fontSize=16, leading=20, textColor=BRANCO,
    fontName='Helvetica-Bold', alignment=TA_LEFT,
    spaceBefore=18, spaceAfter=4)

sH2 = S('sH2',
    fontSize=13, leading=17, textColor=AZUL,
    fontName='Helvetica-Bold', alignment=TA_LEFT,
    spaceBefore=14, spaceAfter=4)

sH3 = S('sH3',
    fontSize=11, leading=14, textColor=CINZA_ESC,
    fontName='Helvetica-Bold', alignment=TA_LEFT,
    spaceBefore=10, spaceAfter=3)

sH3w = S('sH3w',
    fontSize=11, leading=14, textColor=BRANCO,
    fontName='Helvetica-Bold', alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=0)

sBody = S('sBody',
    fontSize=9.5, leading=14, textColor=PRETO,
    fontName='Helvetica', alignment=TA_JUSTIFY,
    spaceBefore=2, spaceAfter=4)

sBodySmall = S('sBodySmall',
    fontSize=8.5, leading=12, textColor=CINZA_ESC,
    fontName='Helvetica', alignment=TA_LEFT,
    spaceBefore=1, spaceAfter=2)

sBold = S('sBold',
    fontSize=9.5, leading=14, textColor=PRETO,
    fontName='Helvetica-Bold', alignment=TA_LEFT,
    spaceBefore=2, spaceAfter=2)

sLabel = S('sLabel',
    fontSize=8, leading=10, textColor=CINZA_MED,
    fontName='Helvetica-Bold', alignment=TA_LEFT,
    spaceBefore=0, spaceAfter=0)

sCode = S('sCode',
    fontSize=8.5, leading=12, textColor=CINZA_ESC,
    fontName='Courier', alignment=TA_LEFT,
    spaceBefore=2, spaceAfter=2,
    leftIndent=12, borderPad=6,
    backColor=CINZA)

sBullet = S('sBullet',
    fontSize=9.5, leading=14, textColor=PRETO,
    fontName='Helvetica', alignment=TA_LEFT,
    spaceBefore=1, spaceAfter=1,
    leftIndent=14, bulletIndent=4)

sCentro = S('sCentro',
    fontSize=9, leading=12, textColor=CINZA_MED,
    fontName='Helvetica', alignment=TA_CENTER)

# ── Helpers ───────────────────────────────────────────────────────────────────

def hr(color=CINZA_MED, thickness=0.5):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceAfter=6, spaceBefore=6)

def spacer(h=6):
    return Spacer(1, h)

def h1_block(text):
    """Cabeçalho de parte com fundo azul."""
    tbl = Table([[Paragraph(text, sH1)]], colWidths=[16.5*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), AZUL),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('ROUNDEDCORNERS', [4,4,4,4]),
    ]))
    return tbl

def h3_block(text, bg=CINZA, fc=CINZA_ESC):
    style = S('_h3b', fontSize=10, leading=13, textColor=fc,
              fontName='Helvetica-Bold')
    tbl = Table([[Paragraph(text, style)]], colWidths=[16.5*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    return tbl

def pill(text, bg=AZUL_CLARO, fc=AZUL):
    style = S('_pill', fontSize=7.5, leading=9, textColor=fc,
              fontName='Helvetica-Bold')
    tbl = Table([[Paragraph(text, style)]])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    return tbl

def info_box(text, bg=AZUL_CLARO, fc=AZUL):
    style = S('_ib', fontSize=9, leading=13, textColor=fc, fontName='Helvetica')
    tbl = Table([[Paragraph(text, style)]], colWidths=[16.5*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEAFTER', (0,0), (0,-1), 3, fc),
    ]))
    return tbl

def make_table(headers, rows, col_widths=None):
    if col_widths is None:
        w = 16.5 * cm / len(headers)
        col_widths = [w] * len(headers)
    hrow = [Paragraph(f'<b>{h}</b>', sBodySmall) for h in headers]
    data = [hrow]
    for row in rows:
        data.append([Paragraph(str(c), sBodySmall) for c in row])
    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), AZUL),
        ('TEXTCOLOR', (0,0), (-1,0), BRANCO),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [BRANCO, CINZA]),
        ('GRID', (0,0), (-1,-1), 0.3, CINZA_MED),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('TEXTCOLOR', (0,1), (-1,-1), PRETO),
        ('FONTSIZE', (0,1), (-1,-1), 8),
    ]))
    return tbl

def stars_color(text):
    """Converte ★★★★☆ em texto colorido."""
    return text  # mantém como texto simples para compatibilidade

# ── Conteúdo ─────────────────────────────────────────────────────────────────

def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="Plano de Melhorias — Nova Aula (MusiLab)",
        author="Claude Sonnet 4.6",
        subject="Planejamento pedagógico musical",
    )
    story = []

    # ── CAPA ────────────────────────────────────────────────────────────────
    story.append(spacer(20))
    story.append(Paragraph("PLANO DE MELHORIAS", sTitle))
    story.append(Paragraph('Módulo <b>"Nova Aula"</b> — MusiLab', S('_cov',
        fontSize=18, leading=22, textColor=CINZA_ESC, fontName='Helvetica',
        spaceBefore=0, spaceAfter=8)))
    story.append(hr(AZUL, 2))
    story.append(spacer(4))
    story.append(Paragraph("Baseado em: Auditoria Pedagógica Consolidada (2026-03-17 + 2026-03-18)", sMeta))
    story.append(Paragraph("Autoria: Claude Sonnet 4.6 | Data: 2026-03-18", sMeta))
    story.append(Paragraph("Objetivo: Transformar análise pedagógica em decisões práticas de produto", sMeta))
    story.append(spacer(16))

    # Sumário visual
    story.append(info_box(
        "<b>Este documento contém:</b><br/>"
        "• Parte 1 — 7 Princípios Norteadores (filtros de redesign)<br/>"
        "• Parte 2 — Nova Arquitetura do Formulário (8 blocos)<br/>"
        "• Parte 3 — Melhorias Campo a Campo (7 campos detalhados)<br/>"
        "• Parte 4 — Melhorias de UX e Cognição<br/>"
        "• Parte 5 — Roadmap de Implementação (17 features em 3 fases)",
        AZUL_CLARO, AZUL))
    story.append(spacer(8))

    # Top 3 quick wins
    story.append(info_box(
        "<b>Por onde começar esta semana (top 3):</b><br/>"
        "1. Mover Músicas para o topo — 1h, máximo impacto pedagógico<br/>"
        "2. Substituir textarea Avaliação por 3 campos estruturados — 2-3h<br/>"
        "3. Campo Fase da Atividade — 1 dia, estrutura toda a lógica interna da aula",
        VERDE_CLARO, VERDE))

    story.append(PageBreak())

    # ── PARTE 1 — PRINCÍPIOS ────────────────────────────────────────────────
    story.append(h1_block("PARTE 1 — PRINCÍPIOS NORTEADORES"))
    story.append(spacer(6))
    story.append(Paragraph(
        "Estes 7 princípios funcionam como filtro de cada decisão de redesign. "
        "Se uma mudança contradiz um deles, não entra.", sBody))
    story.append(spacer(8))

    principios = [
        ("P1", "Atividade é a unidade central de pensamento do professor",
         "Professores reais pensam primeiro em \"o que faremos\" e só depois em \"por quê\". "
         "O roteiro de atividades permanece como coração do formulário. Campos de objetivos "
         "e avaliação vêm depois, não antes.",
         "Yinger (1980), Clark & Peterson (1986), Elliott (1995)", AZUL, AZUL_CLARO),
        ("P2", "Repertório é ponto de partida na educação musical",
         "Para o professor de música, a pergunta inicial é \"qual música vou usar?\", não "
         "\"qual objetivo vou alcançar?\". Músicas sobem para o topo do formulário — são "
         "identidade da aula, não apêndice.",
         "Elliott (1995), Green (2008), Reimer (1970)", VERDE, VERDE_CLARO),
        ("P3", "Um campo, uma função. Sem duplicações.",
         "Cada informação existe em um único lugar. Materiais duplicados, conceitos em dois "
         "lugares, dois tipos de tags confusos — tudo isso gera carga cognitiva sem valor pedagógico.",
         "Sweller (1988), Nielsen (1995)", ROXO, ROXO_CLARO),
        ("P4", "O formulário deve promover reflexão, não documentação",
         "Campos vazios sem scaffolding não produzem reflexão — produzem blank stare ou "
         "planejamento performativo. Cada campo obriga a uma decisão pedagógica real. "
         "Se não obriga, ou tem template ou sai.",
         "Schön (1983), Vasconcellos (2000), Perrenoud (1999)", LARANJA, LARANJA_CL),
        ("P5", "Três camadas, não duas",
         "Modo Rápido → Modo Profissional → Modo Documentação. A camada do meio (profissional) "
         "é a mais usada e estava ausente. O salto de \"só título+roteiro\" para \"tudo\" era abrupto demais.",
         "Nielsen (1995) — progressive disclosure em 3 camadas", AZUL, AZUL_CLARO),
        ("P6", "Avaliação é planejada antes, não preenchida depois",
         "Avaliação é a segunda coisa a definir numa aula (o que observarei para saber se "
         "funcionou?), não a última. Campo reestruturado com 3 linhas orientadas, não um "
         "textarea vazio ao final.",
         "Wiliam (2011), Wiggins & McTighe (1998), Black & Wiliam (1998)", VERDE, VERDE_CLARO),
        ("P7", "Burocracia separada de planejamento",
         "BNCC, status administrativo, tags globais e unidades didáticas são documentação — "
         "úteis, mas não planejamento. Ficam num bloco isolado, colapsado por padrão, "
         "chamado explicitamente \"Documentação\".",
         "Saviani (neotecnicismo), Tardif (2002), Vasconcellos (2000)", CINZA_MED, CINZA),
    ]

    for code, title, body, base, fc, bg in principios:
        data = [[
            Paragraph(f'<b>{code}</b>', S('_pc', fontSize=11, leading=14,
                textColor=fc, fontName='Helvetica-Bold')),
            [Paragraph(f'<b>{title}</b>', S('_pt', fontSize=9.5, leading=13,
                textColor=PRETO, fontName='Helvetica-Bold', spaceAfter=3)),
             Paragraph(body, S('_pb', fontSize=8.5, leading=12, textColor=CINZA_ESC,
                fontName='Helvetica', spaceAfter=3)),
             Paragraph(f'<i>Base: {base}</i>', S('_pbase', fontSize=7.5, leading=10,
                textColor=fc, fontName='Helvetica-Oblique'))],
        ]]
        tbl = Table(data, colWidths=[1.2*cm, 15.3*cm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LINEAFTER', (0,0), (0,-1), 3, fc),
        ]))
        story.append(KeepTogether([tbl, spacer(5)]))

    story.append(PageBreak())

    # ── PARTE 2 — ARQUITETURA ───────────────────────────────────────────────
    story.append(h1_block("PARTE 2 — NOVA ARQUITETURA DO FORMULÁRIO"))
    story.append(spacer(8))

    story.append(Paragraph("2.1 — Visão Geral: 3 Camadas", sH2))
    story.append(make_table(
        ["Camada", "Nome", "Tempo", "Para quem"],
        [
            ["1", "Modo Rápido ⚡", "2–3 minutos", "Professor experiente, aula rotineira"],
            ["2", "Modo Profissional", "10–15 minutos", "Plano completo, reflexão pedagógica real"],
            ["3", "Modo Documentação", "+ 5–10 minutos", "Registro formal, portfólio, escola exige"],
        ],
        [1.2*cm, 4*cm, 4*cm, 7.3*cm]
    ))
    story.append(spacer(10))

    story.append(Paragraph("2.2 — Estrutura Completa: Bloco a Bloco", sH2))
    story.append(spacer(4))

    blocos = [
        ("HEADER FIXO", "Todas as camadas — sempre visível",
         "Identidade mínima da aula: o que e quanto tempo.",
         [["Título", "Input texto", 'Placeholder: "Ex: Explorando pulsação — 2° ano"'],
          ["Duração", "Input numérico + selector (min/h)", "Validado — alimenta o contador do roteiro"],
          ["Toggle de camada", "3 estados: Rápido / Profissional / Documentação", "Substitui o toggle binário atual"],
          ["Favorito", "Ícone toggle", "Mantém"]],
         CINZA_ESC, CINZA),
        ("BLOCO A — Contexto", "Todas as camadas — colapsado por padrão",
         "Conectar esta aula com a anterior. Implementa continuidade pedagógica.",
         [["Resumo do último pós-aula", "Readonly", "Manter"],
          ["O que funcionou / não funcionou", "Readonly", "Manter"],
          ["NOVO: 'Como esta aula continua a anterior?'", "Input 1 linha", 'Placeholder orientador']],
         AZUL, AZUL_CLARO),
        ("BLOCO B — Músicas da Aula", "Rápido+ — aberto por padrão",
         "Ponto de partida musical. Repertório como identidade, não como apêndice. SOBE DO FINAL.",
         [["Músicas vinculadas", "Cards com preview (já existe)", "Sobe do final para cá"],
          ["Picker de repertório", "Input busca + dropdown (já existe)", "Manter"],
          ["Músicas detectadas via embed", "Automático (já existe)", "Manter"]],
         VERDE, VERDE_CLARO),
        ("BLOCO C — Roteiro de Atividades", "Rápido+ — aberto",
         "O que professor e alunos farão. Unidade central do planejamento.",
         [["Nome da atividade", "Input inline", "Manter"],
          ["Duração", "Input numérico (VALIDADO)", "Resolver falha do contador"],
          ["NOVO: Fase da atividade", "Select compacto", "Aquecimento / Desenvolvimento / Prática / Criação / Fechamento"],
          ["Descrição", "TipTap rich text", "Manter"]],
         ROXO, ROXO_CLARO),
        ("BLOCO D — Objetivos", "Profissional+ — aberto no modo Profissional",
         "Nomear a intenção pedagógica APÓS definir o que se fará.",
         [["Objetivo principal", "1 linha com template", '"Os alunos serão capazes de [verbo] [conteúdo]"'],
          ["Objetivos específicos", "Lista dinâmica", "Máximo 3 — botão '+ Adicionar objetivo'"],
          ["Botão IA", "Só ativa com roteiro preenchido", '"Gerar a partir do roteiro"']],
         AZUL, AZUL_CLARO),
        ("BLOCO E — Como Saberei Que Aprenderam", "Profissional+ — colapsado",
         "Substituí o textarea vazio. 3 campos curtos e orientados.",
         [["O que observarei?", "1–2 linhas", '"Ex: Conseguem manter pulsação por 8 compassos"'],
          ["Qual pergunta no fechamento?", "1 linha", '"Ex: O que vocês percebem de diferente?"'],
          ["Se não funcionar, o que farei?", "1 linha (opcional)", '"Ex: Simplificar para 4 compassos"']],
         VERDE, VERDE_CLARO),
        ("BLOCO F — Recursos + Materiais", "Profissional+ — colapsado",
         "Fusão de dois accordions em um. Tudo que o professor precisa preparar.",
         [["Links digitais", "Cards com preview", "Manter"],
          ["Materiais físicos", "Lista com chips (UNIFICADO)", "Elimina accordion separado 'Materiais'"]],
         LARANJA, LARANJA_CL),
        ("BLOCO G — Adaptações por Turma", "Profissional+ — colapsado",
         "Como adaptar este plano para cada turma específica.",
         [["Accordion por turma + textarea", "MVP — manter", "—"],
          ["nivelRelativo", "Select contextual (Fase 2)", "Campo já existe no tipo, sem UI ainda"]],
         CINZA_MED, CINZA),
        ("BLOCO H — Documentação", "Modo Documentação — sempre colapsado",
         "Metadados para organização e exigências institucionais. SEPARADO do planejamento.",
         [["Status do plano", "Select", "Rascunho / Pronto / Aplicado / Revisado"],
          ["Conceitos musicais", "Chips (IA detecta)", "Manter"],
          ["Unidades didáticas", "Chips — renomear", '"Projeto / Tema do Bimestre"'],
          ["BNCC", "Picker com busca (Fase 3)", "Substituir textarea por seletor pesquisável"],
          ["Botão IA BNCC", "Caminho principal", "Manter"]],
         CINZA_ESC, CINZA),
    ]

    for titulo, subtitulo, objetivo, campos, fc, bg in blocos:
        elements = []
        # Cabeçalho do bloco
        tbl_head = Table([
            [Paragraph(f'<b>{titulo}</b>', S('_bh', fontSize=10, leading=13,
                textColor=fc, fontName='Helvetica-Bold')),
             Paragraph(subtitulo, S('_bs', fontSize=8, leading=10,
                textColor=fc, fontName='Helvetica-Oblique'))],
        ], colWidths=[8*cm, 8.5*cm])
        tbl_head.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(tbl_head)

        # Objetivo
        tbl_obj = Table([[Paragraph(f'<i>Objetivo: {objetivo}</i>',
            S('_bo', fontSize=8.5, leading=11, textColor=CINZA_ESC,
              fontName='Helvetica-Oblique'))]], colWidths=[16.5*cm])
        tbl_obj.setStyle(TableStyle([
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('BACKGROUND', (0,0), (-1,-1), CINZA),
        ]))
        elements.append(tbl_obj)

        # Tabela de campos
        data_campos = [[
            Paragraph('<b>Campo</b>', S('_ch', fontSize=7.5, textColor=BRANCO, fontName='Helvetica-Bold')),
            Paragraph('<b>UI</b>', S('_ch2', fontSize=7.5, textColor=BRANCO, fontName='Helvetica-Bold')),
            Paragraph('<b>Notas</b>', S('_ch3', fontSize=7.5, textColor=BRANCO, fontName='Helvetica-Bold')),
        ]]
        for c in campos:
            data_campos.append([
                Paragraph(c[0], S('_cr', fontSize=7.5, leading=10, textColor=PRETO, fontName='Helvetica')),
                Paragraph(c[1], S('_cr2', fontSize=7.5, leading=10, textColor=PRETO, fontName='Helvetica')),
                Paragraph(c[2], S('_cr3', fontSize=7.5, leading=10, textColor=PRETO, fontName='Helvetica')),
            ])
        tbl_campos = Table(data_campos, colWidths=[5.5*cm, 5.5*cm, 5.5*cm])
        tbl_campos.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), fc),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [BRANCO, CINZA]),
            ('GRID', (0,0), (-1,-1), 0.3, CINZA_MED),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(tbl_campos)
        elements.append(spacer(8))
        story.append(KeepTogether(elements))

    # Comparação antes/depois
    story.append(Paragraph("2.4 — Comparação Visual: Antes e Depois", sH2))
    story.append(make_table(
        ["Pos.", "ANTES", "DEPOIS"],
        [
            ["1", "Título / Duração / Nível", "Header: Título / Duração / Toggle camada"],
            ["2", "Contexto (condicional)", "Bloco A: Contexto + campo continuidade"],
            ["3", "Roteiro de Atividades", "Bloco B: Músicas da Aula (SUBIU DO FINAL)"],
            ["4", "Materiais", "Bloco C: Roteiro (com campo Fase por atividade)"],
            ["5", "Objetivos", "Bloco D: Objetivos (template + lista dinâmica)"],
            ["6", "Classificação Pedagógica", "Bloco E: Como Saberei Que Aprenderam (NOVO)"],
            ["7", "BNCC", "Bloco F: Recursos + Materiais (fusão)"],
            ["8", "Recursos da Aula", "Bloco G: Adaptações por Turma"],
            ["9", "Avaliação / Observações", "Bloco H: Documentação (BNCC + meta)"],
            ["10", "Músicas Vinculadas (final)", "— (subiu para Bloco B)"],
        ],
        [1*cm, 7*cm, 8.5*cm]
    ))
    story.append(spacer(6))

    # O que sai
    story.append(Paragraph("2.3 — O que Sai Completamente do Formulário", sH2))
    story.append(make_table(
        ["Campo / Elemento", "Motivo"],
        [
            ["Accordion 'Materiais' (separado)", "Duplicado — absorvido pelo Bloco F"],
            ["Textarea 'Avaliação / Observações' (vazio)", "Substituído pelo Bloco E estruturado"],
            ["Campo `escola` no tipo Plano", "Sem UI ativa, sem uso no plano individual"],
            ["Campo `metodologia` no tipo Plano", "Campo fantasma — nunca implementado"],
            ["Objetivo Geral + Específicos como dois rich text editors", "Substituídos por 1 linha + lista dinâmica"],
            ["BNCC como textarea livre", "Substituído por picker com busca (Fase 3)"],
            ["Label 'Classificação Pedagógica'", "Renomeado para 'Documentação'"],
        ],
        [7*cm, 9.5*cm]
    ))

    story.append(PageBreak())

    # ── PARTE 3 — CAMPOS ────────────────────────────────────────────────────
    story.append(h1_block("PARTE 3 — MELHORIAS CAMPO A CAMPO"))
    story.append(spacer(8))

    # 3.1 Fase da Atividade
    story.append(Paragraph("3.1 — Campo: FASE DA ATIVIDADE (novo)", sH2))
    story.append(info_box(
        "<b>Select compacto por atividade.</b> "
        "Opções: Aquecimento · Desenvolvimento · Prática Guiada · Criação · Fechamento<br/>"
        "UI: Dropdown ou botões pill no header do card, ao lado de nome e duração.",
        ROXO_CLARO, ROXO))
    story.append(spacer(4))
    story.append(Paragraph("<b>Alertas automáticos sugeridos:</b>", sBold))
    story.append(Paragraph("• Roteiro ≥ 3 atividades sem 'Fechamento' → alerta amarelo: 'Sua aula não tem fechamento planejado'", sBullet))
    story.append(Paragraph("• Todas as atividades são 'Desenvolvimento' → dica: 'Considere adicionar aquecimento ou fechamento'", sBullet))
    story.append(Paragraph("• Alertas são sugestões — NÃO bloqueiam o professor", sBullet))
    story.append(spacer(4))
    story.append(Paragraph(
        "<i>Base teórica: Hunter (7 passos), Saviani (momentos didáticos), 5E model, Libâneo "
        "(estrutura da aula). Todos os frameworks exigem distinção de fases — o formulário atual "
        "trata todas as atividades como equivalentes.</i>", sBodySmall))
    story.append(spacer(10))

    # 3.2 Objetivo
    story.append(Paragraph("3.2 — Campo: OBJETIVO DA AULA (reformulado)", sH2))
    story.append(make_table(
        ["Antes", "Depois"],
        [["Dois rich text editors (Objetivo Geral + Específicos)",
          "1 linha com template + lista dinâmica (máx. 3)"],
         ["Placeholder vago 'Descreva o objetivo...'",
          "Template: 'Os alunos serão capazes de [verbo] [conteúdo musical]'"],
         ["Botão IA sempre ativo",
          "Botão IA só ativa quando roteiro tem ≥1 atividade"]],
        [7*cm, 9.5*cm]
    ))
    story.append(spacer(4))
    story.append(Paragraph(
        "<i>Base: Bloom (verbos de ação), Libâneo (objetivos como componente obrigatório). "
        "Limite de 3 objetivos: objetivos demais raramente são todos atingidos (Sweller — carga cognitiva).</i>",
        sBodySmall))
    story.append(spacer(10))

    # 3.3 Avaliação
    story.append(Paragraph("3.3 — Campo: COMO SABEREI QUE APRENDERAM (novo)", sH2))
    story.append(info_box(
        "<b>Substitui o textarea vazio de 'Avaliação / Observações'.</b><br/><br/>"
        "Campo 1: O que observarei para saber se funcionou?<br/>"
        '&nbsp;&nbsp;&nbsp;→ Ex: "Conseguem manter pulsação constante por 8 compassos"<br/><br/>'
        "Campo 2: Qual pergunta farei no fechamento?<br/>"
        '&nbsp;&nbsp;&nbsp;→ Ex: "O que vocês percebem de diferente ao ouvir agora?"<br/><br/>'
        "Campo 3: Se não funcionar, o que farei? (opcional)<br/>"
        '&nbsp;&nbsp;&nbsp;→ Ex: "Simplificar para 4 compassos, usar batida corporal"',
        VERDE_CLARO, VERDE))
    story.append(spacer(4))
    story.append(Paragraph(
        "<i>Base: Wiliam (2011) — evidência formativa deve ser planejada antes. "
        "Wiggins & McTighe — avaliação antes das atividades (backward design). "
        "3 campos = evidência observável + verificação oral + contingência pedagógica.</i>",
        sBodySmall))
    story.append(spacer(10))

    # 3.4 BNCC
    story.append(Paragraph("3.4 — Campo: BNCC (reformulado — Fase 3)", sH2))
    story.append(make_table(
        ["Antes", "Depois"],
        [["Textarea livre — professor digita código de memória",
          "Picker com busca por código (EF15AR17) ou palavra-chave"],
         ["Professor precisa conhecer a BNCC de cor",
          "IA sugere habilidades → professor confirma/rejeita chips"],
         ["Posição: no meio do formulário",
          "Posição: último bloco (Documentação), colapsado por padrão"]],
        [7*cm, 9.5*cm]
    ))
    story.append(spacer(4))
    story.append(Paragraph(
        "<i>Base: Sweller — campo que exige conhecimento especializado externo gera carga "
        "extrínseca máxima. A IA elimina essa fricção; o picker permite correção manual.</i>",
        sBodySmall))
    story.append(spacer(10))

    # 3.5 Contexto
    story.append(Paragraph("3.5 — Campo: CONTEXTO (melhorado)", sH2))
    story.append(Paragraph(
        "Mantém exibição readonly do último pós-aula + adiciona 1 campo ativo novo:",
        sBody))
    story.append(info_box(
        '<b>"Como esta aula continua a anterior?"</b><br/>'
        'Ex: "Aprofundamos a pulsação trabalhada com a turma 5A semana passada"<br/><br/>'
        "Aparece SEMPRE — com texto 'Nenhum registro anterior ainda' quando vazio.",
        AZUL_CLARO, AZUL))
    story.append(spacer(4))
    story.append(Paragraph(
        "<i>Base: Ausubel — ativar conhecimento prévio é o fator mais importante da aprendizagem. "
        "Gandin — diagnóstico é etapa do planejamento. Yinger — planejamento está sempre dentro de contexto maior.</i>",
        sBodySmall))
    story.append(spacer(10))

    # 3.6 Nível
    story.append(Paragraph("3.6 — Campo: NÍVEL / FAIXA ETÁRIA (reformulado)", sH2))
    story.append(make_table(
        ["Antes", "Depois"],
        [["1 campo que mistura nível musical com faixa etária",
          "2 campos distintos no Header"],
         ["Faixa etária confundida com nível pedagógico",
          "Faixa etária: dado demográfico fixo (Infantil / Fund. I / Fund. II / Médio / Adulto)"],
         ["Sem distinção por contexto",
          "Nível musical: contextual à aula (Iniciando / Desenvolvendo / Consolidando / Expandindo)"]],
        [7*cm, 9.5*cm]
    ))
    story.append(spacer(4))
    story.append(Paragraph(
        "<i>Base: Vygotsky — ZDP é dinâmica e contextual. Um aluno de 10 anos pode estar "
        "'Consolidando' em rítmica e 'Iniciando' em harmonia.</i>",
        sBodySmall))
    story.append(spacer(10))

    # 3.7 Recursos
    story.append(Paragraph("3.7 — Campo: RECURSOS + MATERIAIS (fusão)", sH2))
    story.append(info_box(
        "<b>Fusão de dois campos separados em um único bloco:</b><br/><br/>"
        "Links e recursos digitais → Cards com preview (já existe)<br/>"
        "O que preciso levar → Lista com chips (pandeiros × | papel × | ...)<br/><br/>"
        "<b>Migration:</b> `materiais` e `materiaisNecessarios` unificados — union dos dois arrays, dedup automático.",
        LARANJA_CL, LARANJA))
    story.append(spacer(10))

    story.append(PageBreak())

    # ── PARTE 4 — UX ────────────────────────────────────────────────────────
    story.append(h1_block("PARTE 4 — MELHORIAS DE UX E COGNIÇÃO"))
    story.append(spacer(8))

    story.append(Paragraph("4.1 — Progressive Disclosure: 3 Camadas Reais", sH2))
    story.append(make_table(
        ["Modo", "Campos visíveis", "Blocos"],
        [
            ["Rápido", "Título, Duração, Músicas, Roteiro (com Fase)", "Header + B + C"],
            ["Profissional (padrão)", "+ Contexto, Objetivos, Avaliação, Recursos", "Header + A + B + C + D + E + F + G"],
            ["Documentação", "+ BNCC, Conceitos, Unidades, Tags", "Todos os blocos"],
        ],
        [3.5*cm, 8.5*cm, 4.5*cm]
    ))
    story.append(spacer(4))
    story.append(info_box(
        "<b>Padrão ao criar novo plano: Modo Profissional</b> — o professor médio planeja no "
        "nível intermediário. Modo Rápido para aulas rotineiras; Documentação apenas quando exigido.",
        AZUL_CLARO, AZUL))
    story.append(spacer(10))

    story.append(Paragraph("4.2 — Redução de Carga Cognitiva", sH2))
    story.append(make_table(
        ["Problema atual (carga extrínseca)", "Solução"],
        [
            ["35+ campos visíveis", "3 camadas: Rápido exibe ≤ 8 campos"],
            ["Dois campos de materiais", "1 campo unificado"],
            ["Placeholder vago 'Descreva o objetivo...'", "Template com verbo de ação (Bloom)"],
            ["BNCC textarea livre", "Picker com busca + IA"],
            ["Textarea de avaliação vazio", "3 campos curtos estruturados"],
            ["'Classificação Pedagógica' como label", "Renomear para 'Documentação'"],
            ["Toggle binário Rápido/Completo", "Toggle 3 estados"],
        ],
        [8*cm, 8.5*cm]
    ))
    story.append(spacer(10))

    story.append(Paragraph("4.3 — Defaults Inteligentes", sH2))
    story.append(make_table(
        ["Campo", "Default sugerido"],
        [
            ["Duração", "Última duração usada para esta turma"],
            ["Nível musical", "Último nível registrado para a turma"],
            ["Fase da 1ª atividade", "Aquecimento (automático)"],
            ["Fase da última atividade", "Fechamento (automático)"],
            ["Músicas", "Sugerir repertório mais usado com esta turma"],
            ["Modo de exibição", "Modo Profissional (não Rápido)"],
        ],
        [6*cm, 10.5*cm]
    ))
    story.append(spacer(10))

    story.append(Paragraph("4.4 — IA: Uso Estratégico, não Decorativo", sH2))
    story.append(info_box(
        "<b>Princípio:</b> IA deve reduzir trabalho mecânico, nunca substituir decisão pedagógica.",
        AZUL_CLARO, AZUL))
    story.append(spacer(4))
    story.append(make_table(
        ["Função de IA", "Trigger certo", "Problema a resolver"],
        [
            ["Gerar objetivos", "Após roteiro preenchido (≥1 atividade)", "Professor novato em branco no campo"],
            ["Detectar conceitos", "Ao salvar o plano", "Classificação manual demorada"],
            ["Detectar músicas", "Ao salvar o plano", "Músicas embutidas no TipTap não registradas"],
            ["Sugerir BNCC", "Após objetivos + roteiro preenchidos", "BNCC impossível de preencher manualmente"],
            ["Alertar desequilíbrio", "Ao adicionar atividades", "Roteiro sem fechamento ou só 'Desenvolvimento'"],
        ],
        [4.5*cm, 5*cm, 7*cm]
    ))
    story.append(spacer(6))
    story.append(Paragraph("<b>IA que NÃO deve existir:</b>", sBold))
    story.append(Paragraph("• IA que preenche campo automaticamente sem revisão do professor", sBullet))
    story.append(Paragraph("• IA que bloqueia salvar enquanto 'processa'", sBullet))
    story.append(Paragraph("• IA como feature decorativa sem função real", sBullet))
    story.append(spacer(10))

    story.append(Paragraph("4.5 — Feedback Visual e Alertas Pedagógicos", sH2))
    story.append(make_table(
        ["Situação", "Feedback", "Tipo"],
        [
            ["Soma de durações > duração da aula", "'Roteiro excede 10min a duração prevista'", "⚠️ Alerta amarelo (já existe)"],
            ["Nenhuma atividade com fase 'Fechamento'", "'Sua aula não tem fechamento planejado'", "💡 Dica azul (novo)"],
            ["Objetivos preenchidos mas roteiro vazio", "'Adicione atividades para concretizar o objetivo'", "💡 Dica azul (novo)"],
            ["Avaliação não preenchida (Modo Profissional)", "Badge discreto no accordion", "Indicador passivo (novo)"],
            ["Aula sem músicas vinculadas", "'Esta aula não tem músicas vinculadas'", "💡 Dica azul (novo)"],
        ],
        [5.5*cm, 6.5*cm, 4.5*cm]
    ))

    story.append(PageBreak())

    # ── PARTE 5 — ROADMAP ───────────────────────────────────────────────────
    story.append(h1_block("PARTE 5 — ROADMAP DE IMPLEMENTAÇÃO"))
    story.append(spacer(8))

    # FASE 1
    fase1_bg = VERDE_CLARO
    fase1_fc = VERDE
    story.append(h3_block("FASE 1 — Ajustes de alto impacto, baixa complexidade", fase1_bg, fase1_fc))
    story.append(Paragraph(
        "Implementável sem refatoração arquitetural. Mudanças cirúrgicas.", sBodySmall))
    story.append(spacer(4))

    f1 = [
        ("F1.1", "Mover Músicas para o Bloco 2",
         "Mover o componente SecaoMusicasVinculadas do final do formulário para logo após o Header.",
         "★★★★★", "★★★★☆", "★☆☆☆☆"),
        ("F1.2", "Fundir os dois campos de Materiais",
         "Unificar `materiais` e `materiaisNecessarios`. Migration: union dos dois arrays ao carregar.",
         "★★★☆☆", "★★★★☆", "★★☆☆☆"),
        ("F1.3", "Substituir textarea Avaliação pelos 3 campos estruturados",
         "Substituir textarea único por 3 inputs de linha com placeholders orientadores.",
         "★★★★★", "★★★★☆", "★★☆☆☆"),
        ("F1.4", "Mover BNCC para o último accordion",
         "Reposicionar accordion BNCC após Avaliação. Renomear para 'Documentação Institucional'.",
         "★★★☆☆", "★★★☆☆", "★☆☆☆☆"),
        ("F1.5", "Renomear 'Classificação Pedagógica' para 'Documentação'",
         "Mudar label do accordion. Professor entende que esta seção é para o sistema, não para ele.",
         "★★☆☆☆", "★★★☆☆", "★☆☆☆☆"),
        ("F1.6", "Adicionar campo de continuidade no Contexto",
         "1 input de linha: 'Como esta aula continua a anterior?'. Salvar em `Plano.continuidade`.",
         "★★★★☆", "★★☆☆☆", "★☆☆☆☆"),
    ]
    for code, title, desc, ped, ux, dif in f1:
        data = [[
            Paragraph(f'<b>{code}</b>', S('_fc', fontSize=9, textColor=fase1_fc, fontName='Helvetica-Bold')),
            [Paragraph(f'<b>{title}</b>', S('_ft', fontSize=9, leading=12, textColor=PRETO, fontName='Helvetica-Bold', spaceAfter=2)),
             Paragraph(desc, S('_fd', fontSize=8, leading=11, textColor=CINZA_ESC, fontName='Helvetica')),
             Paragraph(f'Ped: {ped} | UX: {ux} | Dif: {dif}',
                S('_fs', fontSize=7.5, leading=10, textColor=fase1_fc, fontName='Helvetica-Oblique'))],
        ]]
        tbl = Table(data, colWidths=[1.2*cm, 15.3*cm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), fase1_bg),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LINEAFTER', (0,0), (0,-1), 3, fase1_fc),
        ]))
        story.append(KeepTogether([tbl, spacer(4)]))

    story.append(spacer(6))

    # FASE 2
    fase2_bg = AZUL_CLARO
    fase2_fc = AZUL
    story.append(h3_block("FASE 2 — Reestruturação média (1–2 semanas)", fase2_bg, fase2_fc))
    story.append(Paragraph(
        "Requer ajustes em componentes. Impacto maior.", sBodySmall))
    story.append(spacer(4))

    f2 = [
        ("F2.1", "Campo 'Fase da Atividade' no CardAtividadeRoteiro",
         "Adicionar `tipoFase` ao tipo AtividadeRoteiro. Botões pill compactos + alertas automáticos.",
         "★★★★★", "★★★★☆", "★★★☆☆"),
        ("F2.2", "Reformular campo Objetivos",
         "Substituir RichTextEditor por input 1 linha com template + lista dinâmica (máx. 3). Melhorar trigger de IA.",
         "★★★★☆", "★★★★☆", "★★★☆☆"),
        ("F2.3", "Toggle de 3 camadas",
         "Substituir toggle binário por seletor 3 estados. Padrão: Modo Profissional.",
         "★★★☆☆", "★★★★★", "★★★☆☆"),
        ("F2.4", "Validar duração das atividades como número",
         "Input numérico. Resolver falha silenciosa do contador quando professor digita texto.",
         "★★☆☆☆", "★★★☆☆", "★★☆☆☆"),
        ("F2.5", "Separar Nível Musical de Faixa Etária",
         "Dois campos distintos. Faixa etária no Header. Nível musical: select contextual.",
         "★★★☆☆", "★★★☆☆", "★★★☆☆"),
        ("F2.6", "Alertas pedagógicos automáticos",
         "Lógica: sem fechamento, sem músicas, objetivos sem roteiro, avaliação vazia no modo profissional.",
         "★★★★☆", "★★★★☆", "★★★☆☆"),
    ]
    for code, title, desc, ped, ux, dif in f2:
        data = [[
            Paragraph(f'<b>{code}</b>', S('_fc2', fontSize=9, textColor=fase2_fc, fontName='Helvetica-Bold')),
            [Paragraph(f'<b>{title}</b>', S('_ft2', fontSize=9, leading=12, textColor=PRETO, fontName='Helvetica-Bold', spaceAfter=2)),
             Paragraph(desc, S('_fd2', fontSize=8, leading=11, textColor=CINZA_ESC, fontName='Helvetica')),
             Paragraph(f'Ped: {ped} | UX: {ux} | Dif: {dif}',
                S('_fs2', fontSize=7.5, leading=10, textColor=fase2_fc, fontName='Helvetica-Oblique'))],
        ]]
        tbl = Table(data, colWidths=[1.2*cm, 15.3*cm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), fase2_bg),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LINEAFTER', (0,0), (0,-1), 3, fase2_fc),
        ]))
        story.append(KeepTogether([tbl, spacer(4)]))

    story.append(spacer(6))

    # FASE 3
    fase3_bg = ROXO_CLARO
    fase3_fc = ROXO
    story.append(h3_block("FASE 3 — Evolução Avançada (features diferenciadoras)", fase3_bg, fase3_fc))
    story.append(Paragraph(
        "Requerem desenvolvimento mais longo ou integrações novas.", sBodySmall))
    story.append(spacer(4))

    f3 = [
        ("F3.1", "BNCC com picker e busca",
         "Base de dados EF01AR–EF09AR. Busca por código ou palavra-chave. IA como caminho principal.",
         "★★★★☆", "★★★★★", "★★★★☆"),
        ("F3.2", "'Diagnóstico da Turma' como campo persistente",
         "Campo associado à turma (não ao plano). Atualizado após cada pós-aula. Exibido no Bloco de Contexto.",
         "★★★★★", "★★★★☆", "★★★★☆"),
        ("F3.3", "Dimensão CLASP por atividade (opcional)",
         "Campo opcional: [Composição | Literatura | Audição | Habilidades | Performance] — espiral Swanwick.",
         "★★★★☆", "★★★☆☆", "★★★☆☆"),
        ("F3.4", "'Fase de responsabilidade' por atividade (GRR)",
         "Campo opcional: [Professor modela | Juntos | Alunos independentes] — gradual release of responsibility.",
         "★★★★☆", "★★★☆☆", "★★★☆☆"),
        ("F3.5", "Relatório pedagógico da aula / da turma",
         "Análise automática de conceitos, fases e músicas. Gráfico de equilíbrio. Histórico por turma.",
         "★★★★★", "★★★★★", "★★★★★"),
    ]
    for code, title, desc, ped, ux, dif in f3:
        data = [[
            Paragraph(f'<b>{code}</b>', S('_fc3', fontSize=9, textColor=fase3_fc, fontName='Helvetica-Bold')),
            [Paragraph(f'<b>{title}</b>', S('_ft3', fontSize=9, leading=12, textColor=PRETO, fontName='Helvetica-Bold', spaceAfter=2)),
             Paragraph(desc, S('_fd3', fontSize=8, leading=11, textColor=CINZA_ESC, fontName='Helvetica')),
             Paragraph(f'Ped: {ped} | UX: {ux} | Dif: {dif}',
                S('_fs3', fontSize=7.5, leading=10, textColor=fase3_fc, fontName='Helvetica-Oblique'))],
        ]]
        tbl = Table(data, colWidths=[1.2*cm, 15.3*cm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), fase3_bg),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LINEAFTER', (0,0), (0,-1), 3, fase3_fc),
        ]))
        story.append(KeepTogether([tbl, spacer(4)]))

    story.append(spacer(8))

    # Tabela resumo roadmap
    story.append(Paragraph("5.1 — Tabela-Resumo do Roadmap", sH2))
    story.append(make_table(
        ["#", "Mudança", "Fase", "Ped.", "UX", "Dif."],
        [
            ["F1.1", "Mover Músicas para topo", "1", "★★★★★", "★★★★☆", "★☆☆☆☆"],
            ["F1.2", "Fundir Materiais", "1", "★★★☆☆", "★★★★☆", "★★☆☆☆"],
            ["F1.3", "Substituir textarea Avaliação", "1", "★★★★★", "★★★★☆", "★★☆☆☆"],
            ["F1.4", "Mover BNCC para o final", "1", "★★★☆☆", "★★★☆☆", "★☆☆☆☆"],
            ["F1.5", "Renomear 'Documentação'", "1", "★★☆☆☆", "★★★☆☆", "★☆☆☆☆"],
            ["F1.6", "Campo continuidade", "1", "★★★★☆", "★★☆☆☆", "★☆☆☆☆"],
            ["F2.1", "Fase da atividade", "2", "★★★★★", "★★★★☆", "★★★☆☆"],
            ["F2.2", "Reformular Objetivos", "2", "★★★★☆", "★★★★☆", "★★★☆☆"],
            ["F2.3", "Toggle 3 camadas", "2", "★★★☆☆", "★★★★★", "★★★☆☆"],
            ["F2.4", "Validar duração", "2", "★★☆☆☆", "★★★☆☆", "★★☆☆☆"],
            ["F2.5", "Separar Nível/Faixa etária", "2", "★★★☆☆", "★★★☆☆", "★★★☆☆"],
            ["F2.6", "Alertas pedagógicos", "2", "★★★★☆", "★★★★☆", "★★★☆☆"],
            ["F3.1", "BNCC picker", "3", "★★★★☆", "★★★★★", "★★★★☆"],
            ["F3.2", "Diagnóstico da turma", "3", "★★★★★", "★★★★☆", "★★★★☆"],
            ["F3.3", "CLASP por atividade", "3", "★★★★☆", "★★★☆☆", "★★★☆☆"],
            ["F3.4", "Fase de responsabilidade", "3", "★★★★☆", "★★★☆☆", "★★★☆☆"],
            ["F3.5", "Relatório pedagógico", "3", "★★★★★", "★★★★★", "★★★★★"],
        ],
        [1.2*cm, 6.5*cm, 1.2*cm, 2.5*cm, 2.5*cm, 2.6*cm]
    ))
    story.append(spacer(10))

    # Por onde começar
    story.append(info_box(
        "<b>5.2 — Por onde começar esta semana</b><br/><br/>"
        "Se pudesse implementar apenas 3 mudanças:<br/><br/>"
        "<b>1. Mover Músicas para o topo</b> — 1 hora de trabalho, máximo impacto pedagógico e visual<br/>"
        "<b>2. Substituir textarea Avaliação por 3 campos estruturados</b> — 2–3 horas, transforma "
        "o campo mais fraco em um dos mais fortes<br/>"
        "<b>3. Campo Fase da Atividade</b> — 1 dia, estrutura toda a lógica interna da aula<br/><br/>"
        "Essas 3 mudanças sozinhas já tornam o formulário substancialmente mais sólido "
        "pedagogicamente — sem reescrever a arquitetura.",
        VERDE_CLARO, VERDE))

    story.append(spacer(10))
    story.append(hr(CINZA_MED))
    story.append(Paragraph(
        "Plano gerado em 2026-03-18 | Baseado em: AUDITORIA-NOVA-AULA-CONSOLIDADA.md",
        sCentro))

    # ── BUILD ────────────────────────────────────────────────────────────────
    doc.build(story)
    print(f"PDF gerado: {OUTPUT}")

if __name__ == "__main__":
    build()
