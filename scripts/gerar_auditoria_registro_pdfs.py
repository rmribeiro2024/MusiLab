# -*- coding: utf-8 -*-
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)

OUT = r"C:\Users\rodri\Documents\MusiLab"

SLATE_900 = colors.HexColor("#0f172a")
SLATE_700 = colors.HexColor("#334155")
SLATE_500 = colors.HexColor("#64748b")
SLATE_300 = colors.HexColor("#cbd5e1")
SLATE_100 = colors.HexColor("#f1f5f9")
SLATE_50  = colors.HexColor("#f8fafc")
INDIGO    = colors.HexColor("#6366f1")
EMERALD   = colors.HexColor("#10b981")
AMBER     = colors.HexColor("#f59e0b")
RED       = colors.HexColor("#ef4444")
WHITE     = colors.white

def make_styles():
    s = getSampleStyleSheet()
    return {
        'cover_title': ParagraphStyle('cover_title', fontName='Helvetica-Bold',
            fontSize=26, textColor=SLATE_900, leading=32, spaceAfter=8),
        'cover_sub':   ParagraphStyle('cover_sub', fontName='Helvetica',
            fontSize=13, textColor=SLATE_500, leading=18, spaceAfter=4),
        'cover_label': ParagraphStyle('cover_label', fontName='Helvetica-Bold',
            fontSize=9, textColor=INDIGO, leading=12, spaceAfter=2),
        'h1': ParagraphStyle('h1', fontName='Helvetica-Bold',
            fontSize=17, textColor=SLATE_900, leading=22, spaceBefore=20, spaceAfter=6),
        'h2': ParagraphStyle('h2', fontName='Helvetica-Bold',
            fontSize=13, textColor=INDIGO, leading=18, spaceBefore=14, spaceAfter=4),
        'h3': ParagraphStyle('h3', fontName='Helvetica-Bold',
            fontSize=11, textColor=SLATE_700, leading=15, spaceBefore=10, spaceAfter=3),
        'body': ParagraphStyle('body', fontName='Helvetica',
            fontSize=10, textColor=SLATE_700, leading=15, spaceAfter=6, alignment=TA_JUSTIFY),
        'quote': ParagraphStyle('quote', fontName='Helvetica-Oblique',
            fontSize=10, textColor=SLATE_500, leading=15,
            leftIndent=16, rightIndent=16, spaceAfter=8),
        'small': ParagraphStyle('small', fontName='Helvetica',
            fontSize=8.5, textColor=SLATE_500, leading=12, spaceAfter=3),
        'footer': ParagraphStyle('footer', fontName='Helvetica',
            fontSize=8, textColor=SLATE_300, leading=10, alignment=TA_CENTER),
        'wh': ParagraphStyle('wh', fontName='Helvetica-Bold',
            fontSize=9, textColor=WHITE, leading=13),
        'td': ParagraphStyle('td', fontName='Helvetica',
            fontSize=9, textColor=SLATE_700, leading=13),
        'tdb': ParagraphStyle('tdb', fontName='Helvetica-Bold',
            fontSize=9, textColor=SLATE_700, leading=13),
    }

def hr(color=SLATE_300, thickness=0.5):
    return HRFlowable(width='100%', thickness=thickness, color=color,
                      spaceAfter=8, spaceBefore=8)

def info_box(story, text, bg=SLATE_50, border=SLATE_300, S=None):
    S = S or make_styles()
    p = Paragraph(text, ParagraphStyle('ib', fontName='Helvetica',
        fontSize=9.5, textColor=SLATE_700, leading=14))
    tbl = Table([[p]], colWidths=[15.5*cm])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('BOX', (0,0), (-1,-1), 0.5, border),
        ('TOPPADDING', (0,0), (-1,-1), 9),
        ('BOTTOMPADDING', (0,0), (-1,-1), 9),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 6))

def make_table(rows, col_widths, header_color=INDIGO):
    S = make_styles()
    fmt_rows = []
    for i, row in enumerate(rows):
        fmt_row = []
        for cell in row:
            style = S['wh'] if i == 0 else S['td']
            fmt_row.append(Paragraph(str(cell), style))
        fmt_rows.append(fmt_row)
    t = Table(fmt_rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), header_color),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, SLATE_50]),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.25, SLATE_300),
    ]))
    return t


# ════════════════════════════════════════════════════════════════
# PDF 1 — PESQUISA FUNDAMENTADA
# ════════════════════════════════════════════════════════════════
def gerar_pdf1(path):
    S = make_styles()
    doc = SimpleDocTemplate(path, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm)
    story = []

    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph("MUSILAB", S['cover_label']))
    story.append(Paragraph("Registro Pos-Aula", S['cover_title']))
    story.append(Paragraph("Pesquisa Fundamentada", S['cover_sub']))
    story.append(Paragraph("Bases teoricas para o redesenho do modulo", S['cover_sub']))
    story.append(Spacer(1, 0.4*cm))
    story.append(hr(INDIGO, 1.5))
    story.append(Paragraph("Marco 2026  |  Versao 1.0", S['small']))
    story.append(Spacer(1, 0.8*cm))

    sumario_rows = [
        ["#", "Topico"],
        ["1", "Reflexao docente — o que a teoria realmente diz"],
        ["2", "O que professores realmente fazem apos a aula"],
        ["3", "Avaliacao formativa e o ciclo de feedback"],
        ["4", "Tempo real disponivel e o problema do abandono"],
        ["5", "O que torna um registro util e acionavel"],
        ["6", "Tensoes criticas: ideal x realidade"],
    ]
    story.append(make_table(sumario_rows, [1*cm, 14.5*cm], SLATE_900))
    story.append(PageBreak())

    # Secao 1
    story.append(Paragraph("1. Reflexao Docente — O Que a Teoria Realmente Diz", S['h1']))
    story.append(hr())

    story.append(Paragraph("1.1 Donald Schon e a Distincao que o Mercado Ignora", S['h2']))
    story.append(Paragraph(
        "A obra central de Donald Schon — <i>The Reflective Practitioner</i> (MIT, 1983) — "
        "estabelece dois conceitos que instrumentos digitais frequentemente confundem:", S['body']))
    story.append(make_table([
        ["Conceito", "Quando ocorre", "O que exige do instrumento"],
        ["Reflection-in-action\n(pensar enquanto age)", "Durante a aula, em tempo real",
         "Nao pode ser capturado por formulario. E adaptacao tacita no momento."],
        ["Reflection-on-action\n(analise retrospectiva)", "Apos a aula, deliberadamente",
         "Este e o dominio do formulario pos-aula. Exige prompts que gerem reencadramento, nao apenas descricao."],
    ], [4.5*cm, 4*cm, 7*cm]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "A 'conversa reflexiva com a situacao' que Schon descreve e dialogicamente estruturada: "
        "o profissional retoma o que aconteceu, identifica o que o surpreendeu, reencadra o "
        "problema e constroi hipoteses. Isso e diferente de descrever eventos — e questionar pressupostos.", S['body']))
    info_box(story,
        "<b>Implicacao direta para produto:</b> Um campo como 'O que nao funcionou' orienta para "
        "descricao. Um campo como 'O que eu faria diferente sabendo o que sei agora?' orienta para "
        "reencadramento. A segunda pergunta e analiticamente superior — e esse e o nivel que um "
        "instrumento reflexivo de qualidade precisa atingir.",
        bg=colors.HexColor("#eef2ff"), border=INDIGO, S=S)

    story.append(Paragraph("1.2 Libâneo e o Vazio Brasileiro", S['h2']))
    story.append(Paragraph(
        "Jose Carlos Libâneo, em 'Reflexividade e formacao de professores: outra oscilacao do "
        "pensamento pedagogico brasileiro?' (Cortez, 2002), documenta como o conceito de "
        "<i>professor reflexivo</i> chegou ao Brasil nos anos 1990, foi incorporado aos PCNs e "
        "criou um <b>discurso sem substancia</b>. A palavra 'reflexao' esta em toda parte; "
        "a pratica sistematica, em lugar nenhum.", S['body']))
    story.append(Paragraph(
        "O motivo e estrutural: as condicoes necessarias (tempo protegido, apoio institucional, "
        "turmas menores, pares de reflexao) nao existem na maioria das escolas brasileiras.", S['body']))
    info_box(story,
        "<b>Aplicacao pratica critica:</b> Qualquer instrumento para professor brasileiro precisa "
        "ser radicalmente rapido (2-3 minutos maximo), ancorado em eventos concretos, e jamais "
        "parecer burocracia. A historia de instrumentos de reflexao no Brasil e uma historia de abandono.",
        bg=colors.HexColor("#fff7ed"), border=AMBER, S=S)

    story.append(Paragraph("1.3 Hattie e o Know Thy Impact", S['h2']))
    story.append(Paragraph(
        "<i>Visible Learning</i> (Routledge, 2009) sintetiza 800+ meta-analises. O Mind Frame 1: "
        "<b>'Minha tarefa fundamental e avaliar o efeito do meu ensino na aprendizagem dos alunos.'</b>", S['body']))
    story.append(make_table([
        ["Fator", "Effect size (d)", "Relevancia para pos-aula"],
        ["Eficacia coletiva docente", "d = 1.57", "Professores que refletem coletivamente"],
        ["Feedback", "d = 0.73", "Feedback do aluno para o professor sobre seu impacto"],
        ["Avaliacao formativa de programas", "d = 0.68", "Professores usando evidencia sobre impacto propria"],
        ["Clareza do professor", "d = 0.75", "Objetivos claros conectados a evidencia de aprendizagem"],
    ], [6*cm, 3.5*cm, 6*cm]))
    story.append(Spacer(1, 8))
    info_box(story,
        "<b>Implicacao:</b> 'Os alunos conseguiram tocar o ostinato em 3/4 com precisao ritmica' e "
        "dado. 'A aula foi boa' nao e nada. O instrumento deve empurrar para evidencia, nao impressao.",
        bg=colors.HexColor("#f0fdf4"), border=EMERALD, S=S)

    story.append(PageBreak())

    # Secao 2
    story.append(Paragraph("2. O Que Professores Realmente Fazem Apos a Aula", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "A literatura empirica sobre pratica reflexiva real e muito mais sombria do que a normativa. "
        "Quatro achados sao consistentes em multiplos contextos:", S['body']))

    story.append(Paragraph("Achado 1 — A janela de memoria e muito curta", S['h2']))
    story.append(Paragraph(
        "Reflexoes feitas imediatamente apos a aula sao significativamente mais especificas do que "
        "as feitas no dia seguinte. Professores que esperam tendem a generalizar ('a turma estava "
        "dificil') em vez de especificar ('o Joao nao entendeu a mudanca de andamento na barra 8').", S['body']))

    story.append(Paragraph("Achado 2 — O que realmente influencia o proximo plano", S['h2']))
    story.append(make_table([
        ["Forca", "Fator", "Fonte"],
        ["1 (maior)", "Confusao ou dificuldade tecnica observada durante a aula", "Wyatt-Smith et al., BERJ 2024"],
        ["2", "Analise de exit ticket quando existe", "Black & Wiliam, 1998"],
        ["3", "Nivel de engajamento e energia da turma", "Livingston & Shiach, 2014"],
        ["4", "Conhecimento previo de alunos especificos", "Frontiers in Education, 2023"],
        ["5", "Memoria de aulas similares em anos anteriores", "Apenas professores experientes"],
        ["6 (menor)", "Sequencia curricular obrigatoria — frequentemente sobrepoe tudo", "McShane, ERIC 2021"],
    ], [1.5*cm, 9.5*cm, 4.5*cm]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Achado 3 — Reflexoes sem scaffolding ficam no nivel descritivo", S['h2']))
    story.append(Paragraph(
        "Boud & Walker documentaram que reflexoes sem scaffolding sao 'difusas e disparates — "
        "conclusoes raramente emergem'. Sem prompts estruturados que empurrem para analise, "
        "o professor descreve o que aconteceu, nao por que aconteceu.", S['body']))

    story.append(Paragraph("Achado 4 — Instrumentos complexos sao abandonados em 2-4 semanas", S['h2']))
    story.append(make_table([
        ["Pesquisa", "N", "Principal barreira", "Timeline"],
        ["Kis & Kartal (2019, Turquia)", "60 prof. em formacao", "Tempo e esforco requeridos", "2-3 semanas"],
        ["Chong (2009, Singapore)", "Enfermeiros em educacao", "Restricao de tempo (77,5%)", "Apos o curso terminar"],
        ["Cole (1997)", "Multiplos contextos", "Vigilancia institucional", "Reflexao vira performance"],
    ], [4.5*cm, 3*cm, 4.5*cm, 3.5*cm]))
    story.append(Spacer(1, 8))
    info_box(story,
        "<b>Achado especifico para educacao musical (Frontiers in Education, 2022):</b> "
        "A cultura mestre-aprendiz dominante no ensino instrumental suprime a reflexao. "
        "Professores raramente convidam feedback dos alunos e raramente questionam suas proprias "
        "escolhas pedagogicas. O padrao 'eu decido, voce toca' e obstaculoo estrutural.",
        bg=colors.HexColor("#faf5ff"), border=colors.HexColor("#a78bfa"), S=S)

    story.append(PageBreak())

    # Secao 3
    story.append(Paragraph("3. Avaliacao Formativa e o Ciclo de Feedback", S['h1']))
    story.append(hr())

    story.append(Paragraph("3.1 Black & Wiliam — O Feedback que Falta", S['h2']))
    story.append(Paragraph(
        "<i>Inside the Black Box</i> (Phi Delta Kappan, 1998) — revisao de 250+ estudos — "
        "estabelece que avaliacao formativa produz effect sizes de 0.4-0.7, maior do que quase "
        "qualquer outra intervencao. O ponto frequentemente ignorado:", S['body']))
    info_box(story,
        "Wiliam e explicito: 'formative assessments are not just for students — teachers must have "
        "continual feedback to guide their instruction.' O professor precisa de feedback sobre o "
        "proprio impacto. Esse feedback raramente flui na direcao certa.",
        bg=colors.HexColor("#eef2ff"), border=INDIGO, S=S)

    story.append(Paragraph("3.2 Wiggins & McTighe — Backward Design e Evidencia", S['h2']))
    story.append(Paragraph(
        "O <i>Understanding by Design</i> (ASCD, 1998) inverte o planejamento: primeiro define-se "
        "o que o aluno precisa evidenciar. Na logica do pos-aula: 'qual evidencia de aprendizagem "
        "eu vi hoje?' deve preceder 'o que vou fazer na proxima aula?'. Instrumentos que coletam "
        "reflexoes narrativas sem ancorar em evidencia de aprendizagem sao arquivo, nao avaliacao formativa.", S['body']))

    # Secao 4
    story.append(Paragraph("4. Tempo Real e o Problema do Abandono", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Dados do NCTQ (EUA): professores tem em media 47 minutos/dia de preparacao distribuidos "
        "entre planejamento, correcoes e administracao. Tempo dedicado exclusivamente a reflexao "
        "pos-aula: praticamento nao existe como categoria separada.", S['body']))
    story.append(make_table([
        ["Contexto", "Horas ensinando/semana", "Reflexao estruturada", "Observacao"],
        ["EUA (media)", "30-32h", "Quase zero fora de programas formais", "NCTQ 2023"],
        ["Shanghai", "Significativamente menor", "35% do tempo em equipes de melhoria", "Estruturalmente possivel"],
        ["Brasil", "Varia por contrato", "Ad hoc, nao institucionalizado", "Libâneo, 2002"],
    ], [3.5*cm, 3.5*cm, 4.5*cm, 4*cm]))
    story.append(Spacer(1, 8))
    info_box(story,
        "<b>Conclusao critica:</b> Qualquer instrumento que exija mais de 3-5 minutos enfrentara "
        "abandono sistematico por professores com multiplas turmas. O MVP precisa ser completado "
        "em 90 segundos.",
        bg=colors.HexColor("#fff7ed"), border=AMBER, S=S)

    # Secao 5
    story.append(Paragraph("5. O Que Torna um Registro Util e Acionavel", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Kim (2023, Review of Education, Wiley) — levantamento sobre documentacao pedagogica: "
        "<i>'Documentacao que nao esta vinculada a uma decisao e desperdicio. A maioria da "
        "documentacao docente e arquival (prova que algo aconteceu) em vez de generativa "
        "(muda o que acontece depois).'</i>", S['quote']))
    story.append(make_table([
        ["Criterio", "O que significa", "Impacto no uso"],
        ["Imediato", "Registrado em minutos apos o evento", "Especificidade critica para acionabilidade"],
        ["Especifico", "Nomeia alunos, momentos, atividades concretas", "Permite acao direcionada"],
        ["Acionavel", "Cada entrada gera pelo menos um proximo passo", "Fecha o ciclo registrar-decidir"],
        ["Breve", "Menos de 3 minutos para completar", "Determinante para sustentabilidade"],
        ["Conectado", "Vive onde o planejamento acontece", "Sem conexao, vira arquivo orfao"],
    ], [3*cm, 6.5*cm, 6*cm]))
    story.append(Spacer(1, 8))

    # Secao 6
    story.append(Paragraph("6. Tensoes Criticas: Ideal x Realidade", S['h1']))
    story.append(hr())
    story.append(make_table([
        ["Dimensao", "O que a teoria pede", "O que a realidade permite"],
        ["Tempo", "Reflexao profunda e dialogada", "2-3 minutos entre turmas"],
        ["Profundidade", "Reencadramento de pressupostos", "Descricao de eventos"],
        ["Regularidade", "Apos cada aula, sistematicamente", "Quando ha tempo e vontade"],
        ["Estrutura", "Scaffolding que promova analise", "Campos que o professor consiga preencher"],
        ["Uso futuro", "Conectado ao proximo plano", "Arquivado e esquecido"],
        ["Avaliacao", "Evidencia de aprendizagem observada", "Impressao subjetiva do professor"],
    ], [3.5*cm, 6*cm, 6*cm]))
    story.append(Spacer(1, 8))
    info_box(story,
        "<b>A resolucao dessa tensao e o desafio central do design:</b> o instrumento precisa ser "
        "rapido por padrao e profundo por opcao. O modo rapido cobre o essencial em 90 segundos. "
        "O modo profundo esta disponivel sem ser obrigatorio — e nunca parece avaliacao de desempenho.",
        bg=colors.HexColor("#f0fdf4"), border=EMERALD, S=S)

    story.append(Spacer(1, 1*cm))
    story.append(hr(SLATE_300))
    story.append(Paragraph(
        "MusiLab — Analise Pedagogica Interna  |  Marco 2026  |  PDF 1 de 3: Pesquisa Fundamentada",
        S['footer']))

    doc.build(story)
    print(f"PDF 1 gerado: {path}")


# ════════════════════════════════════════════════════════════════
# PDF 2 — PLANO DE MELHORIAS
# ════════════════════════════════════════════════════════════════
def gerar_pdf2(path):
    S = make_styles()
    doc = SimpleDocTemplate(path, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm)
    story = []

    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph("MUSILAB", S['cover_label']))
    story.append(Paragraph("Registro Pos-Aula", S['cover_title']))
    story.append(Paragraph("Plano de Melhorias", S['cover_sub']))
    story.append(Paragraph("Diagnostico critico + proposta de redesenho + implementacao", S['cover_sub']))
    story.append(Spacer(1, 0.4*cm))
    story.append(hr(INDIGO, 1.5))
    story.append(Paragraph("Marco 2026  |  Versao 1.0", S['small']))
    story.append(Spacer(1, 0.8*cm))
    info_box(story,
        "<b>Resumo executivo:</b> O modulo tem boas decisoes pontuais mas problemas arquiteturais "
        "significativos. O diagnostico identifica 3 problemas estruturais, 4 redundancias criticas "
        "e 1 erro de hierarquia grave (encaminhamentos enterrados em 'avancados'). A proposta mantem "
        "o que funciona, funde redundancias, corrige a hierarquia e move o modulo para onde o professor "
        "naturalmente ja esta — Aula por Turma.",
        bg=colors.HexColor("#eef2ff"), border=INDIGO, S=S)
    story.append(PageBreak())

    # Parte 1
    story.append(Paragraph("PARTE 1 — Diagnostico Critico", S['h1']))
    story.append(hr())

    story.append(Paragraph("1.1 Problemas Arquiteturais", S['h2']))
    story.append(Paragraph(
        "<b>Problema #1 — O modulo nao tem casa na navegacao.</b><br/>"
        "O sidebar tem: Banco de Aulas, Nova Aula, Aula por Turma, Sequencia de Aulas. Nao existe "
        "'Registros' como destino. O modulo existe como dois modals flutuantes sem home propria. "
        "Nao ha conceito de 'vou fazer meu registro' — e sempre uma interrupcao ou um desvio.", S['body']))
    story.append(Paragraph(
        "<b>Problema #2 — O registro completo abre pelo lugar errado.</b><br/>"
        "O ModalRegistroPosAula e ativado a partir de um plano no Banco de Aulas. Mas professores "
        "pensam por turma e por data, nao por plano. A entrada correta seria: Aula por Turma "
        "→ data → registro. O ModalRegistroRapido ja implementa essa logica — e a direcao certa.", S['body']))
    story.append(Paragraph(
        "<b>Problema #3 — Janela flutuante redimensionavel e anti-padrao mobile.</b><br/>"
        "O professor termina a aula — possivelmente no celular — e vai registrar. O padrao de "
        "janela com handles de resize nao tem sentido nesse contexto de uso real.", S['body']))

    story.append(Paragraph("1.2 Inventario Critico dos Campos", S['h2']))
    story.append(make_table([
        ["Campo", "Local atual", "Avaliacao", "Decisao"],
        ["Status da aula (4 opcoes)", "Visivel", "Excelente", "MANTER como esta"],
        ["O que funcionou bem", "Accordion chip", "Bom", "MANTER"],
        ["O que nao funcionou", "Accordion chip", "Redundante", "FUNDIR com proximo"],
        ["O que poderia ter sido melhor", "Accordion chip", "Redundante", "FUNDIR -> 'O que mudar'"],
        ["Comportamento da turma", "BehaviorChip com tags", "Muito bom", "MANTER exatamente"],
        ["Anotacoes gerais", "Accordion chip", "Superfluo", "REMOVER"],
        ["Ideias / estrategias", "Accordion chip (proxima aula)", "Nomenclatura confusa", "FUNDIR com encaminhamentos"],
        ["Encaminhamentos -> proxima aula", "AVANCADOS — oculto", "CRITICO: lugar errado", "MOVER PARA VISIVEL"],
        ["Chamada", "Avancados", "Valido, lugar correto", "MANTER em avancados"],
        ["Rubrica de avaliacao", "Avancados", "Valido, lugar correto", "MANTER em avancados"],
        ["Estrategias que funcionaram", "Avancados", "Bom conceito", "MANTER em avancados"],
        ["Nota de voz", "Avancados — oculta", "Excelente, lugar errado", "MOVER PARA VISIVEL"],
        ["URL evidencia", "Avancados", "Quase nunca usado", "MANTER profundamente opcional"],
        ["4 selects de turma", "Visivel, no topo", "Alta friccao", "COLAPSAR quando contexto conhecido"],
        ["Janela flutuante/resize", "Modal completo", "Anti-padrao mobile", "SIMPLIFICAR para bottom-sheet"],
    ], [4.5*cm, 3*cm, 2.8*cm, 5.2*cm]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("1.3 O Erro Mais Grave", S['h2']))
    info_box(story,
        "<b>Encaminhamentos em 'Avancados' e o erro mais grave do modulo.</b><br/><br/>"
        "Schon, Wiliam, Hattie e qualquer framework de reflexao convergem: reflexao sem "
        "encaminhamento acionavel e arquivo morto — catarse, nao pratica reflexiva. "
        "O campo 'O que fazer na proxima aula' esta enterrado em campos avancados, colapsado por padrao. "
        "E o campo mais importante do modulo e o menos visivel. Isso e o inverso do que deveria ser.",
        bg=colors.HexColor("#fef2f2"), border=RED, S=S)

    story.append(PageBreak())

    # Parte 2
    story.append(Paragraph("PARTE 2 — Redesenho Proposto", S['h1']))
    story.append(hr())

    story.append(Paragraph("2.1 Decisao Arquitetural: Arquitetura em Tres Camadas", S['h2']))
    story.append(make_table([
        ["Camada", "Interface", "Quando usar", "Status"],
        ["1 — Registro Rapido", "ModalRegistroRapido (bottom sheet)", "Apos cada aula, transicao rapida entre turmas", "JA EXISTE — melhorar"],
        ["2 — Registro Contextual", "Secao integrada no ModuloPlanejamentoTurma", "Ao visualizar data passada com planejamento", "CRIAR — mais natural"],
        ["3 — Historico e Analise", "Aba 'Registros' no ModuloPlanejamentoTurma", "Consultar padrao ao longo do tempo", "FUTURO"],
    ], [3*cm, 4.5*cm, 4*cm, 4*cm]))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Racional:</b> O professor ja navega para Aula por Turma para planejar. E natural que ao "
        "selecionar uma data passada, o sistema mostre o planejamento feito E um espaco para registrar. "
        "Planejei aqui — registro aqui. O ModalRegistroPosAula flutuante deve ser simplificado.", S['body']))

    story.append(Paragraph("2.2 Nova Estrutura de Campos", S['h2']))
    info_box(story,
        "<b>Principio central: REGISTRAR → ENTENDER → DECIDIR</b><br/>"
        "Cada campo serve a uma dessas tres funcoes. Campos que nao se encaixam em nenhuma sao removidos.",
        bg=colors.HexColor("#eef2ff"), border=INDIGO, S=S)
    story.append(make_table([
        ["Bloco", "Campo", "UI", "Obrig.?", "Funcao"],
        ["BLOCO 1\nO que foi?\n(~10s)", "Status + Data + Turma", "4 chips + auto-fill", "SIM", "REGISTRAR"],
        ["BLOCO 2\nO que entendi?\n(~60s)", "O que funcionou", "Accordion chip", "NAO", "ENTENDER"],
        ["BLOCO 2", "O que mudar (FUSAO)", "Accordion + prompt reencadramento", "NAO", "ENTENDER"],
        ["BLOCO 2", "Turma hoje", "BehaviorChip com tags", "NAO", "ENTENDER"],
        ["BLOCO 3\nO que faco?\n(~30s)", "Para a proxima aula", "Input + Enter + lista visivel", "NAO, mas visivel", "DECIDIR"],
        ["BLOCO 3", "Nota de voz", "Botao mic visivel", "NAO", "REGISTRAR"],
        ["EXTRAS\n(colapsado)", "Chamada, Rubrica, Estrategias, URL", "Acordeao '+Mais'", "NAO", "Todos"],
    ], [2.5*cm, 3.5*cm, 3*cm, 2.5*cm, 4*cm]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("2.3 O Que Remover", S['h2']))
    story.append(make_table([
        ["Campo/elemento", "Motivo"],
        ["'Anotacoes gerais' como campo independente", "Absorvido por outros campos. Terceiro campo aberto consecutivo sem valor adicional."],
        ["'O que poderia ter sido melhor' como campo separado", "Fusao com 'O que nao funcionou' → 'O que mudar'. Mais claro, menos redundante."],
        ["Janela flutuante redimensionavel", "Anti-padrao para mobile. Simplificar para bottom-sheet sem perda funcional."],
        ["4 selects de turma visiveis quando contexto conhecido", "Alta friccao percebida. Pre-preencher e colapsar, mostrar apenas o resultado."],
    ], [5.5*cm, 10*cm]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("2.4 O Que Automatizar", S['h2']))
    story.append(make_table([
        ["O que", "Como", "Beneficio"],
        ["Data da aula", "Hoje por padrao, editavel", "Remove campo obrigatorio"],
        ["Turma", "Do contexto de abertura", "Elimina os 4 selects em cascata"],
        ["Chips de atividades", "Se o planejamento tem atividades, oferecer como chips em 'O que funcionou'", "Professor nao precisa digitar o nome"],
        ["Sugestao IA (Gemini)", "Botao opcional: gera encaminhamento baseado nos campos preenchidos", "Reduz esforco cognitivo no pos-aula"],
        ["Contexto ultima aula", "Banner automatico com resumo anterior (ja existe, manter)", "Continuidade pedagogica visivel"],
    ], [3.5*cm, 6.5*cm, 5.5*cm]))

    story.append(PageBreak())

    # Parte 3
    story.append(Paragraph("PARTE 3 — Plano de Implementacao", S['h1']))
    story.append(hr())

    story.append(Paragraph("3.1 Fases Sugeridas", S['h2']))
    story.append(make_table([
        ["Fase", "O que fazer", "Complexidade", "Impacto"],
        ["Fase 1\nQuick wins",
         "1. Mover encaminhamentos para visivel no ModalRegistroRapido\n"
         "2. Mover nota de voz para visivel\n"
         "3. Pre-preencher turma quando contexto conhecido\n"
         "4. Fundir 'nao funcionou' + 'poderia melhorar'",
         "Baixa", "Alto"],
        ["Fase 2\nRedesign",
         "1. Remover 'Anotacoes gerais' standalone\n"
         "2. Simplificar modal completo (remover drag/resize)\n"
         "3. Atualizar prompt de reflexao para reencadramento\n"
         "4. Chips de atividades do plano disponivel",
         "Media", "Alto"],
        ["Fase 3\nArquitetura",
         "1. Criar secao pos-aula no ModuloPlanejamentoTurma\n"
         "2. Quando data passada com planejamento, mostrar botao 'Registrar aula'\n"
         "3. Aba 'Registros' no ModuloPlanejamentoTurma",
         "Alta", "Muito alto"],
    ], [2.5*cm, 8*cm, 2.5*cm, 2.5*cm]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("3.2 O Que Seria Realmente Usado", S['h2']))
    story.append(make_table([
        ["Frequencia prevista", "Campo", "Por que"],
        ["Alta — todo registro", "Status da aula (4 chips)", "Rapido, claro, acionavel. Informa o proximo plano automaticamente."],
        ["Alta — se visivel", "Encaminhamentos para proxima aula", "Se visivel, sera usado. Se em avancados, nao sera."],
        ["Alta — professores de musica", "Nota de voz", "Mais rapido que digitar. Canal natural para quem trabalha com som."],
        ["Media", "O que funcionou", "Usado quando a aula foi excepcionalmente boa ou ruim."],
        ["Media", "O que mudar (campo fundido)", "Usado quando houve dificuldade concreta."],
        ["Media", "BehaviorChip com tags", "1-2 toques. Muito bom tal como esta."],
        ["Baixa", "Rubrica, Chamada, Estrategias", "Validos para usuarios avancados. Manter em extras."],
        ["Muito baixa", "URL evidencia", "Manter como opcao profunda — remover de qualquer lugar proeminente."],
    ], [3.5*cm, 4.5*cm, 7.5*cm]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("3.3 MVP Ideal", S['h2']))
    info_box(story,
        "<b>MVP do modulo pos-aula:</b><br/><br/>"
        "Status  +  Encaminhamento (visivel)  +  Nota de voz  +  Salvar<br/><br/>"
        "Tudo em uma tela, sem scroll, sem accordions, em 60 segundos. "
        "Tudo o mais e progressivo e nunca obrigatorio.",
        bg=colors.HexColor("#f0fdf4"), border=EMERALD, S=S)

    story.append(Spacer(1, 1*cm))
    story.append(hr(SLATE_300))
    story.append(Paragraph(
        "MusiLab — Analise Pedagogica Interna  |  Marco 2026  |  PDF 2 de 3: Plano de Melhorias",
        S['footer']))
    doc.build(story)
    print(f"PDF 2 gerado: {path}")


# ════════════════════════════════════════════════════════════════
# PDF 3 — MATERIAL DE ESTUDO PARA PROFESSOR
# ════════════════════════════════════════════════════════════════
def gerar_pdf3(path):
    S = make_styles()
    doc = SimpleDocTemplate(path, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm)
    story = []

    story.append(Spacer(1, 1.5*cm))
    story.append(Paragraph("MUSILAB", S['cover_label']))
    story.append(Paragraph("Como Refletir Apos a Aula", S['cover_title']))
    story.append(Paragraph("Material de Estudo para o Professor", S['cover_sub']))
    story.append(Paragraph("Da observacao a decisao pedagogica: um guia pratico", S['cover_sub']))
    story.append(Spacer(1, 0.4*cm))
    story.append(hr(EMERALD, 1.5))
    story.append(Paragraph("Marco 2026  |  Para uso em formacao continuada", S['small']))
    story.append(Spacer(1, 0.8*cm))
    info_box(story,
        "<b>Para que serve este material:</b> Ajuda o professor a entender o que e avaliacao "
        "formativa na pratica, como transformar o que observou em sala em decisoes concretas para "
        "a proxima aula, e por que o registro rapido e mais poderoso do que o registro longo.",
        bg=colors.HexColor("#f0fdf4"), border=EMERALD, S=S)
    story.append(PageBreak())

    story.append(Paragraph("1. O Que E Avaliacao Formativa de Verdade", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Avaliacao formativa nao e prova. Nao e nota. E qualquer informacao que voce coleta "
        "durante ou logo apos a aula que <b>muda o que voce vai fazer na proxima</b>.", S['body']))
    story.append(Paragraph(
        "Dylan Wiliam — um dos maiores pesquisadores de avaliacao do mundo — sintetizou assim: "
        "<i>'O unico proposito de qualquer avaliacao em sala de aula e ajudar o professor a "
        "decidir o que fazer a seguir.'</i>", S['quote']))
    story.append(Paragraph(
        "Isso significa que voce esta avaliando formativamente o tempo todo, mesmo sem saber: "
        "quando voce percebe que a turma esta quieta demais e muda a atividade. Quando voce "
        "nota que tres alunos ainda nao pegaram o pulso e decide retornar ao exercicio. "
        "Isso e avaliacao formativa em acao.", S['body']))

    story.append(Paragraph("A diferenca entre dado e impressao", S['h2']))
    story.append(make_table([
        ["Impressao (menos util)", "Dado (mais util)"],
        ["'A aula foi boa'", "'Os alunos conseguiram tocar o ostinato em 3/4 sem parar'"],
        ["'A turma estava agitada'", "'A turma perdeu o foco depois de 20 minutos de atividade estatica'"],
        ["'Nao funcionou'", "'A leitura de partitura foi abstrata demais — precisam de mais contexto auditivo antes'"],
        ["'Ele nao presta atencao'", "'Pedro perde atencao apos 10 minutos de atividade sem movimento'"],
    ], [7.5*cm, 8*cm], header_color=EMERALD))
    story.append(Spacer(1, 8))
    info_box(story,
        "<b>Exercicio pratico:</b> Na proxima aula, tente completar esta frase ao terminar: "
        "'Ao final desta aula, os alunos conseguiram ___ que antes nao conseguiam.' "
        "Se voce conseguir completar, voce tem um dado.",
        bg=colors.HexColor("#f0fdf4"), border=EMERALD, S=S)

    story.append(PageBreak())

    story.append(Paragraph("2. O Ciclo Reflexivo: Tres Perguntas que Bastam", S['h1']))
    story.append(hr())
    story.append(Paragraph(
        "Donald Schon (MIT) estudou como profissionais de alta performance refletem sobre "
        "o proprio trabalho. Ele descobriu que os melhores nao fazem reflexoes longas — "
        "eles fazem perguntas muito especificas que geram insights acionaveis.", S['body']))
    story.append(make_table([
        ["Pergunta", "O que ela faz", "Exemplo para musica"],
        ["O que aconteceu de fato?", "Ancora a reflexao em eventos concretos — evita generalizacao",
         "'Os alunos tocaram a peca do inicio ao fim sem parar. Exceto o compasso 12.'"],
        ["O que isso me diz sobre o aprendizado?", "Move da descricao para a analise — o que o evento revela?",
         "'O compasso 12 tem mudanca de compasso. Eles nao internalizaram mudancas de compasso em tempo real.'"],
        ["O que eu faco na proxima aula?", "Converte analise em acao — fecha o ciclo",
         "'Proxima aula: exercicio especifico de transicao de compasso antes de tocar a peca inteira.'"],
    ], [3.5*cm, 5*cm, 7*cm], header_color=SLATE_900))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Quando voce passa pelas tres perguntas — mesmo mentalmente, em 2 minutos — voce esta "
        "fazendo reflexao real. E quando voce anota a terceira pergunta (o que farei?), voce usa "
        "o registro para o que ele existe: informar o proximo passo.", S['body']))

    story.append(Paragraph("3. Por Que o Registro Rapido E Mais Poderoso", S['h1']))
    story.append(hr())
    story.append(make_table([
        ["Sobre o registro...", "O que a pesquisa mostra"],
        ["Tamanho ideal", "Registros de 2-3 minutos feitos logo apos a aula sao mais uteis do que registros longos feitos depois"],
        ["Timing critico", "Apos 24 horas, a memoria de eventos especificos cai muito. O que sobra sao generalizacoes."],
        ["Frequencia x profundidade", "E melhor registrar brevemente apos cada aula do que reflexao profunda uma vez por semana"],
        ["O que nao funciona", "Fichas longas, muitos campos, formularios burocraticos — abandonados em 2-4 semanas"],
        ["O que funciona", "Uma pergunta especifica, respondida brevemente, toda vez. Consistencia supera profundidade."],
    ], [4*cm, 11.5*cm], header_color=INDIGO))
    story.append(Spacer(1, 8))
    info_box(story,
        "<b>Regra pratica:</b> Se voce nao consegue registrar em 2 minutos, o instrumento esta "
        "errado — nao voce. Um bom instrumento pos-aula e projetado para o professor real, cansado, "
        "em transicao entre turmas.",
        bg=colors.HexColor("#fff7ed"), border=AMBER, S=S)

    story.append(PageBreak())

    story.append(Paragraph("4. Da Observacao a Decisao: O Fluxo Completo", S['h1']))
    story.append(hr())
    story.append(make_table([
        ["Etapa", "O que voce faz", "Tempo", "Ferramenta"],
        ["1. OBSERVAR", "Durante a aula: note o que surpreende, o que nao sai como planejado, o que funciona muito bem",
         "0 minutos extras", "Sua percepcao ativa"],
        ["2. REGISTRAR", "Logo apos a aula: status + 1-2 observacoes especificas + nota de voz se preferir",
         "60-90 segundos", "MusiLab — Registro Rapido"],
        ["3. DECIDIR", "Ainda no registro: anote 1 encaminhamento concreto para a proxima aula",
         "30 segundos extras", "Campo 'Para a proxima aula'"],
        ["4. PLANEJAR", "No planejamento: o encaminhamento aparece — use como ponto de partida",
         "Integrado ao planejamento", "MusiLab — Aula por Turma"],
        ["5. REVISAR", "A cada 4-6 semanas: olhe os registros de uma turma — que padroes aparecem?",
         "15-20 min mensais", "Historico de registros"],
    ], [2.5*cm, 5*cm, 3.5*cm, 4.5*cm], header_color=SLATE_900))
    story.append(Spacer(1, 8))

    story.append(Paragraph("5. Armadilhas Comuns — O Que Evitar", S['h1']))
    story.append(hr())
    story.append(make_table([
        ["Armadilha", "Por que acontece", "Como evitar"],
        ["Registrar so quando a aula foi ruim", "Motivacao maior quando algo deu errado", "Registrar status mesmo nas aulas normais — padroes aparecem ao longo do tempo"],
        ["Escrever sem usar", "Registro sem conexao com o proximo plano vira arquivo morto", "Sempre terminar com 1 encaminhamento concreto"],
        ["Ser muito duro consigo mesmo", "Pode se tornar lista de fracassos", "Focar em 'o que eu faria diferente?' em vez de 'o que fiz errado?'"],
        ["Desistir apos 2 semanas", "Habito novo e dificil", "Comecar com apenas status + 1 encaminhamento. Por 30 dias. Nada mais."],
        ["Copiar registro de uma turma para outra", "Economiza tempo mas perde especificidade", "Cada turma e diferente — o que funciona com uma pode nao funcionar com outra"],
    ], [4*cm, 4.5*cm, 7*cm], header_color=RED))
    story.append(Spacer(1, 8))

    story.append(Paragraph("6. Exemplos Reais — Da Observacao a Decisao", S['h1']))
    story.append(hr())
    story.append(Paragraph("Exemplo 1: Aula de ritmo com turma iniciante", S['h2']))
    story.append(make_table([
        ["Nivel", "O que o professor registra"],
        ["Descritivo (pouco util)", "'A atividade de ritmo nao funcionou muito bem'"],
        ["Analitico", "'Alunos repetem o padrao individualmente mas perdem o tempo ao tocar juntos'"],
        ["Acionavel (o que vale)", "'Proxima aula: comecar com ostinato corporal antes dos instrumentos. Sincronizar com palmas antes de tocar.'"],
    ], [3*cm, 12.5*cm], header_color=EMERALD))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Exemplo 2: Aluno especifico com dificuldade de foco", S['h2']))
    story.append(make_table([
        ["Nivel", "O que o professor registra"],
        ["Descritivo", "'O Marcos nao prestou atencao'"],
        ["Analitico", "'Marcos perde foco quando a atividade nao tem desafio tecnico claro — a musica esta muito facil para ele'"],
        ["Acionavel", "'Dar ao Marcos uma voz ou parte de contraponto adicional. Ele precisa de desafio — nao de restricao.'"],
    ], [3*cm, 12.5*cm], header_color=EMERALD))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Exemplo 3: Apreciacao musical que funcionou", S['h2']))
    story.append(make_table([
        ["Nivel", "O que o professor registra"],
        ["Descritivo", "'A turma gostou da musica'"],
        ["Analitico", "'A turma se engajou quando pedi que descrevessem o que a musica parecia visualmente — a linguagem metaforica desbloqueou a conversa'"],
        ["Acionavel", "'Usar imagens visuais como porta de entrada para apreciacao nas proximas aulas. Testar com generos diferentes.'"],
    ], [3*cm, 12.5*cm], header_color=EMERALD))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Em Resumo: O Minimo Que Funciona", S['h1']))
    story.append(hr())
    info_box(story,
        "<b>Se voce so fizer uma coisa pos-aula, que seja esta:</b><br/><br/>"
        "Abra o MusiLab. Marque como foi a aula. Anote uma coisa que voce quer fazer diferente "
        "na proxima aula com esta turma.<br/><br/>"
        "60 segundos. Toda aula. Por 30 dias.<br/><br/>"
        "Ao final desse periodo, voce tera um mapa real do que funciona e do que nao funciona "
        "para cada turma — algo que nao existe em nenhum livro de pedagogia.",
        bg=colors.HexColor("#f0fdf4"), border=EMERALD, S=S)

    story.append(Spacer(1, 1*cm))
    story.append(hr(SLATE_300))
    story.append(Paragraph(
        "MusiLab — Material de Estudo  |  Marco 2026  |  PDF 3 de 3: Guia para o Professor",
        S['footer']))
    doc.build(story)
    print(f"PDF 3 gerado: {path}")


if __name__ == '__main__':
    gerar_pdf1(os.path.join(OUT, "AUDITORIA-REGISTRO-POS-AULA-PESQUISA.pdf"))
    gerar_pdf2(os.path.join(OUT, "AUDITORIA-REGISTRO-POS-AULA-MELHORIAS.pdf"))
    gerar_pdf3(os.path.join(OUT, "AUDITORIA-REGISTRO-POS-AULA-GUIA-PROFESSOR.pdf"))
    print("Todos os PDFs gerados com sucesso.")
