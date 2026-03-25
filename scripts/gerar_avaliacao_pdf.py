# -*- coding: utf-8 -*-
"""
Gerar PDF: Avaliação Estruturada na Prática Docente
Uso: python gerar_avaliacao_pdf.py
Saída: AVALIACAO-ESTRUTURADA-PROFESSOR.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.platypus.flowables import Flowable
import os

# ---------------------------------------------------------------------------
# Cores
# ---------------------------------------------------------------------------
INDIGO       = colors.Color(91/255,  95/255, 234/255)   # brand primary
INDIGO_LIGHT = colors.Color(238/255, 240/255, 255/255)  # section header bg
INDIGO_DARK  = colors.Color(60/255,  64/255, 180/255)   # table header
WHITE        = colors.white
BLACK        = colors.black
GRAY_ROW     = colors.Color(248/255, 248/255, 252/255)  # alternating row
GRAY_BORDER  = colors.Color(200/255, 200/255, 220/255)
TEXT_DARK    = colors.Color(30/255,  30/255,  50/255)
TEXT_MUTED   = colors.Color(100/255, 100/255, 120/255)
RED_SOFT     = colors.Color(255/255, 240/255, 240/255)
RED_ACCENT   = colors.Color(220/255, 50/255,  50/255)

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "AVALIACAO-ESTRUTURADA-PROFESSOR.pdf")

# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------
base = getSampleStyleSheet()

def S(name, **kw):
    """Cria ParagraphStyle herdando de 'Normal'."""
    return ParagraphStyle(name, parent=base["Normal"], **kw)

sty = {
    # título principal
    "title": S("title",
        fontName="Helvetica-Bold", fontSize=26, leading=32,
        textColor=INDIGO, alignment=TA_CENTER, spaceAfter=8),

    "subtitle": S("subtitle",
        fontName="Helvetica", fontSize=14, leading=20,
        textColor=TEXT_DARK, alignment=TA_CENTER, spaceAfter=6),

    "author": S("author",
        fontName="Helvetica-Oblique", fontSize=10, leading=14,
        textColor=TEXT_MUTED, alignment=TA_CENTER, spaceAfter=20),

    "intro_text": S("intro_text",
        fontName="Helvetica", fontSize=11, leading=17,
        textColor=TEXT_DARK, alignment=TA_JUSTIFY, spaceAfter=10),

    # cabeçalho de seção (ex: INTRODUÇÃO)
    "section_header": S("section_header",
        fontName="Helvetica-Bold", fontSize=13, leading=18,
        textColor=INDIGO, spaceBefore=18, spaceAfter=8),

    # texto normal do corpo
    "body": S("body",
        fontName="Helvetica", fontSize=10.5, leading=16,
        textColor=TEXT_DARK, alignment=TA_JUSTIFY, spaceAfter=8),

    # bullet list
    "bullet": S("bullet",
        fontName="Helvetica", fontSize=10.5, leading=16,
        textColor=TEXT_DARK, leftIndent=16, bulletIndent=6,
        spaceBefore=2, spaceAfter=2),

    # numbered list
    "numbered": S("numbered",
        fontName="Helvetica", fontSize=10.5, leading=16,
        textColor=TEXT_DARK, leftIndent=22, spaceBefore=2, spaceAfter=2),

    # texto em destaque / citação
    "quote": S("quote",
        fontName="Helvetica-Oblique", fontSize=10, leading=15,
        textColor=TEXT_DARK, leftIndent=20, rightIndent=20,
        spaceBefore=6, spaceAfter=6),

    # referências bibliográficas
    "ref": S("ref",
        fontName="Helvetica", fontSize=9, leading=13,
        textColor=TEXT_DARK, leftIndent=18, firstLineIndent=-18,
        spaceBefore=3, spaceAfter=3),

    # células de tabela — header
    "th": S("th",
        fontName="Helvetica-Bold", fontSize=9.5, leading=13,
        textColor=WHITE, alignment=TA_CENTER),

    # células de tabela — body
    "td": S("td",
        fontName="Helvetica", fontSize=9.5, leading=13,
        textColor=TEXT_DARK, alignment=TA_LEFT),

    "td_center": S("td_center",
        fontName="Helvetica", fontSize=9.5, leading=13,
        textColor=TEXT_DARK, alignment=TA_CENTER),

    # rodapé de página
    "footer": S("footer",
        fontName="Helvetica", fontSize=8, leading=10,
        textColor=TEXT_MUTED, alignment=TA_CENTER),

    # parte título (dentro da caixa colorida)
    "part_label": S("part_label",
        fontName="Helvetica-Bold", fontSize=11, leading=14,
        textColor=WHITE, spaceAfter=0),

    "part_title": S("part_title",
        fontName="Helvetica-Bold", fontSize=15, leading=20,
        textColor=WHITE),

    "callout_text": S("callout_text",
        fontName="Helvetica", fontSize=10, leading=14,
        textColor=TEXT_DARK, alignment=TA_JUSTIFY),

    "small_bold": S("small_bold",
        fontName="Helvetica-Bold", fontSize=10, leading=14,
        textColor=TEXT_DARK, spaceBefore=6, spaceAfter=4),
}

# ---------------------------------------------------------------------------
# Flowables customizados
# ---------------------------------------------------------------------------

class PartBox(Flowable):
    """Caixa colorida para título de cada Parte."""
    def __init__(self, label, title, width=None):
        super().__init__()
        self.label = label
        self.title = title
        self._w = width or (A4[0] - 5*cm)
        self.height = 58

    def wrap(self, availW, availH):
        self._w = availW
        return (availW, self.height)

    def draw(self):
        c = self.canv
        w, h = self._w, self.height
        # fundo
        c.setFillColor(INDIGO)
        c.roundRect(0, 0, w, h, 6, fill=1, stroke=0)
        # label pequeno
        c.setFillColor(colors.Color(1, 1, 1, alpha=0.7))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(14, h - 18, self.label)
        # título
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 14)
        # quebra longa
        max_w = w - 28
        words = self.title.split()
        line1, line2 = [], []
        c.setFont("Helvetica-Bold", 14)
        current = []
        for word in words:
            test = " ".join(current + [word])
            if c.stringWidth(test, "Helvetica-Bold", 14) < max_w:
                current.append(word)
            else:
                line1 = current[:]
                current = [word]
        if current:
            if line1:
                line2 = current
            else:
                line1 = current
        if line2:
            c.drawString(14, h - 34, " ".join(line1))
            c.drawString(14, h - 50, " ".join(line2))
        else:
            c.drawString(14, h - 38, " ".join(line1))


class SectionHeader(Flowable):
    """Cabeçalho de seção com fundo indigo-light."""
    def __init__(self, text, width=None):
        super().__init__()
        self.text = text
        self._w = width
        self.height = 30

    def wrap(self, availW, availH):
        self._w = availW
        return (availW, self.height)

    def draw(self):
        c = self.canv
        w = self._w
        # fundo
        c.setFillColor(INDIGO_LIGHT)
        c.roundRect(0, 0, w, self.height, 4, fill=1, stroke=0)
        # borda esquerda
        c.setFillColor(INDIGO)
        c.rect(0, 0, 4, self.height, fill=1, stroke=0)
        # texto
        c.setFillColor(INDIGO)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(12, 9, self.text)


class CalloutBox(Flowable):
    """Caixa de destaque com borda colorida."""
    def __init__(self, text, color=None, bg=None, width=None):
        super().__init__()
        self.text = text
        self.color = color or INDIGO
        self.bg = bg or INDIGO_LIGHT
        self._w = width
        # calculate height based on text
        self._text_height = 0

    def wrap(self, availW, availH):
        self._w = availW
        # estimate height
        chars_per_line = int(availW / 6)
        lines = max(2, len(self.text) // chars_per_line + 1)
        self._text_height = lines * 14 + 20
        return (availW, self._text_height)

    def draw(self):
        c = self.canv
        w, h = self._w, self._text_height
        c.setFillColor(self.bg)
        c.roundRect(0, 0, w, h, 5, fill=1, stroke=0)
        c.setFillColor(self.color)
        c.setLineWidth(1.5)
        c.roundRect(0, 0, w, h, 5, fill=0, stroke=1)
        # text
        c.setFillColor(TEXT_DARK)
        c.setFont("Helvetica-Oblique", 10)
        # simple word wrap
        words = self.text.split()
        lines = []
        current = ""
        for word in words:
            test = current + (" " if current else "") + word
            if c.stringWidth(test, "Helvetica-Oblique", 10) < w - 24:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        y = h - 14
        for line in lines:
            c.drawString(12, y, line)
            y -= 14


# ---------------------------------------------------------------------------
# Helpers de tabela
# ---------------------------------------------------------------------------

def alt_rows(data, start_row, colors_cycle):
    """Gera comandos BACKGROUND alternados para linhas de dados."""
    cmds = []
    for i in range(start_row, len(data)):
        bg = colors_cycle[(i - start_row) % len(colors_cycle)]
        cmds.append(("BACKGROUND", (0, i), (-1, i), bg))
    return cmds


def make_table(data, col_widths, style_extra=None, header_rows=1):
    """Cria Table com estilo padrão."""
    t = Table(data, colWidths=col_widths)
    style = [
        # Header
        ("BACKGROUND", (0, 0), (-1, header_rows - 1), INDIGO_DARK),
        ("TEXTCOLOR",  (0, 0), (-1, header_rows - 1), WHITE),
        ("FONTNAME",   (0, 0), (-1, header_rows - 1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, header_rows - 1), 9.5),
        ("ALIGN",      (0, 0), (-1, header_rows - 1), "CENTER"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("GRID",       (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ("FONTNAME",   (0, header_rows), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, header_rows), (-1, -1), 9.5),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]
    style.extend(alt_rows(data, header_rows, [WHITE, GRAY_ROW]))
    if style_extra:
        style.extend(style_extra)
    t.setStyle(TableStyle(style))
    return t


def rubric_table(data, col_widths):
    """Tabela de rubricas com células centralizadas nas colunas de check."""
    t = Table(data, colWidths=col_widths)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO_DARK),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 9),
        ("ALIGN",      (0, 0), (-1, 0), "CENTER"),
        ("ALIGN",      (1, 1), (-1, -1), "CENTER"),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("GRID",       (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, -1), 9),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ]
    style.extend(alt_rows(data, 1, [WHITE, GRAY_ROW]))
    t.setStyle(TableStyle(style))
    return t


# ---------------------------------------------------------------------------
# Numeração de páginas
# ---------------------------------------------------------------------------

class NumberedCanvas:
    """Adiciona rodapé com número de página."""
    def __init__(self, filename, **kwargs):
        from reportlab.pdfgen import canvas as pdfcanvas
        self._doc = None

    @staticmethod
    def later_pages(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(TEXT_MUTED)
        page_num = canvas.getPageNumber()
        text = f"Avaliação Estruturada na Prática Docente  —  MusiLab  —  Página {page_num}"
        canvas.drawCentredString(A4[0] / 2, 1.2*cm, text)
        # linha separadora
        canvas.setStrokeColor(INDIGO_LIGHT)
        canvas.setLineWidth(0.5)
        canvas.line(2.5*cm, 1.5*cm, A4[0] - 2.5*cm, 1.5*cm)
        canvas.restoreState()

    @staticmethod
    def first_page(canvas, doc):
        NumberedCanvas.later_pages(canvas, doc)


# ---------------------------------------------------------------------------
# Construção do conteúdo
# ---------------------------------------------------------------------------

def P(text, style="body"):
    return Paragraph(text, sty[style])


def build_content():
    story = []
    W = A4[0] - 5*cm   # largura útil (margens 2.5cm cada lado)

    # -----------------------------------------------------------------------
    # CAPA / TÍTULO
    # -----------------------------------------------------------------------
    story.append(Spacer(1, 1.5*cm))
    story.append(P("Avaliação Estruturada na Prática Docente", "title"))
    story.append(Spacer(1, 0.3*cm))
    story.append(P("As Três Perguntas que Transformam o Planejamento de Aula", "subtitle"))
    story.append(Spacer(1, 0.4*cm))
    story.append(P("MusiLab — Material de Estudo para Professores", "author"))
    story.append(HRFlowable(width="100%", thickness=2, color=INDIGO, spaceAfter=20))
    story.append(Spacer(1, 0.3*cm))

    # -----------------------------------------------------------------------
    # INTRODUÇÃO
    # -----------------------------------------------------------------------
    story.append(SectionHeader("INTRODUÇÃO"))
    story.append(Spacer(1, 0.3*cm))

    story.append(P(
        "A pergunta mais comum ao final de uma aula de música é: <i>Entenderam?</i>. "
        "Os alunos respondem que sim. O professor segue em frente. E na aula seguinte, "
        "tudo precisa ser refeito — como se nada tivesse sido aprendido. Esse ciclo "
        "frustrante não acontece por falta de esforço do professor, mas por ausência "
        "de uma estrutura avaliativa integrada ao próprio planejamento da aula."
    ))
    story.append(P(
        "A <b>avaliação somativa</b> — aquela que mede o resultado ao final de um período "
        "(prova, recital, apresentação) — tem seu lugar. Mas ela chega tarde demais para "
        "orientar o que acontece <i>dentro</i> da aula. É a <b>avaliação formativa</b> — contínua, "
        "integrada e responsiva — que transforma o processo de aprender e ensinar. "
        "A diferença não é apenas conceitual: pesquisas mostram que a avaliação formativa "
        "é a intervenção com maior impacto no aprendizado escolar (BLACK; WILIAM, 1998)."
    ))
    story.append(P(
        "Este material apresenta três perguntas práticas que todo professor pode incorporar "
        "ao planejamento de qualquer aula, independente do conteúdo ou nível da turma. "
        "As perguntas são simples. A teoria por trás delas é sólida. E a mudança que "
        "produzem — quando usadas com consistência — é profunda."
    ))

    story.append(Spacer(1, 0.2*cm))

    # Caixa com as três perguntas
    questions_data = [
        [P("<b>As Três Perguntas do Planejamento Avaliativo</b>", "th")],
        [P("1. O que observarei para saber se funcionou?", "td")],
        [P("2. Qual pergunta farei no fechamento da aula?", "td")],
        [P("3. Se não funcionar, o que farei?", "td")],
    ]
    qt = Table(questions_data, colWidths=[W])
    qt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO),
        ("BACKGROUND", (0, 1), (-1, -1), INDIGO_LIGHT),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 11),
        ("ALIGN",      (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, -1), 10.5),
        ("LEFTPADDING",  (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("GRID",       (0, 0), (-1, -1), 0.5, GRAY_BORDER),
    ]))
    story.append(qt)
    story.append(Spacer(1, 0.5*cm))

    # -----------------------------------------------------------------------
    # PARTE 1
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(PartBox("PARTE 1", "Avaliação Formativa: O Fundamento Teórico"))
    story.append(Spacer(1, 0.4*cm))

    story.append(P(
        "Em 1998, os pesquisadores Paul Black e Dylan Wiliam publicaram <b><i>Inside the Black Box</i></b>, "
        "uma revisão sistemática de mais de 250 estudos sobre avaliação em sala de aula. "
        "A conclusão foi inequívoca: a avaliação formativa — aplicada de forma consistente e "
        "integrada ao ensino — produz ganhos de aprendizagem superiores a qualquer outra "
        "intervenção escolar. A <i>\"black box\"</i> do título é a sala de aula: um espaço opaco "
        "para administradores e políticas educacionais, mas o único lugar onde o aprendizado "
        "de fato acontece ou não acontece."
    ))
    story.append(P(
        "Uma década depois, John Hattie (2009) sintetizou mais de 800 meta-análises "
        "cobrindo 50.000 estudos e 80 milhões de estudantes. O feedback — elemento central "
        "da avaliação formativa — apareceu com effect size de <b>0,73</b>, entre os mais altos "
        "de todos os fatores analisados. Para referência: um effect size acima de 0,40 já é "
        "considerado educacionalmente significativo."
    ))

    story.append(SectionHeader("As 5 Estratégias-Chave de Dylan Wiliam (2011)"))
    story.append(Spacer(1, 0.2*cm))

    wiliam_data = [
        [P("<b>#</b>", "th"), P("<b>Estratégia</b>", "th"), P("<b>O que significa na prática</b>", "th")],
        [P("1", "td_center"),
         P("Esclarecer objetivos e critérios de sucesso", "td"),
         P("O aluno sabe o que deve conseguir fazer ao final da aula", "td")],
        [P("2", "td_center"),
         P("Criar evidências do aprendizado durante a aula", "td"),
         P("O professor observa o que acontece, não apenas o que foi dito", "td")],
        [P("3", "td_center"),
         P("Dar feedback que faz avançar", "td"),
         P("Feedback específico sobre o próximo passo, não sobre o erro passado", "td")],
        [P("4", "td_center"),
         P("Ativar os alunos como recursos uns dos outros", "td"),
         P("Pares avaliam e corrigem mutuamente com critérios claros", "td")],
        [P("5", "td_center"),
         P("Ativar os alunos como donos do próprio aprendizado", "td"),
         P("Metacognição: o aluno monitora o próprio progresso", "td")],
    ]
    story.append(make_table(wiliam_data, [1.2*cm, 5.8*cm, 7.5*cm]))
    story.append(Spacer(1, 0.4*cm))

    story.append(SectionHeader("Backward Design: Começar pela Evidência (Wiggins & McTighe, 2005)"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "Grant Wiggins e Jay McTighe, no influente <b><i>Understanding by Design</i></b> (2005), "
        "propõem inverter a lógica do planejamento. Em vez de planejar <i>primeiro as atividades</i> "
        "e avaliar <i>depois</i>, o professor deve:"
    ))
    for item in [
        "<b>Estágio 1:</b> Definir os resultados desejados — o que o aluno deve saber, entender e conseguir fazer.",
        "<b>Estágio 2:</b> Determinar a evidência aceitável — como saberemos que o aluno alcançou os resultados?",
        "<b>Estágio 3:</b> Planejar as experiências de aprendizagem — só então decidir as atividades.",
    ]:
        story.append(P(f"• {item}", "bullet"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "Essa inversão é radical. A maioria dos professores vai direto para o Estágio 3. "
        "As três perguntas deste material forçam o professor a passar pelos Estágios 1 e 2 "
        "<i>antes</i> de entrar na sala de aula."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(SectionHeader("BNCC e Competências Observáveis"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "A Base Nacional Comum Curricular (BRASIL, 2018) estrutura seus objetivos em termos de "
        "<b>competências observáveis</b> — não conteúdos, mas capacidades demonstráveis. "
        "Isso alinha diretamente com a lógica da avaliação formativa: competência só existe "
        "quando pode ser observada em ação. Para a educação musical, isso significa que "
        "o professor precisa criar situações em que os alunos <i>fazem música</i> — e observar o "
        "que acontece nesse fazer."
    ))

    # -----------------------------------------------------------------------
    # PARTE 2
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(PartBox("PARTE 2 — PERGUNTA 1", "O que observarei para saber se funcionou?"))
    story.append(Spacer(1, 0.15*cm))
    story.append(SectionHeader("A Evidência de Aprendizagem"))
    story.append(Spacer(1, 0.3*cm))

    story.append(P(
        "Esta é a pergunta mais difícil — e a mais transformadora. Dylan Wiliam (2011) chama "
        "isso de <b><i>success criteria</i></b> (critérios de sucesso): a definição antecipada, "
        "pelo professor, do que ele observará durante ou ao final da aula para saber se o "
        "aprendizado aconteceu. Não é uma nota. Não é uma prova. É um comportamento observável."
    ))
    story.append(P(
        "Wiggins e McTighe (2005) colocam isso no Estágio 2 do <i>Backward Design</i>: "
        "a evidência precisa ser identificada <i>antes</i> da atividade ser planejada, porque "
        "ela é o que guia a escolha das atividades — não o contrário."
    ))
    story.append(P(
        "Na educação musical, isso tem raízes teóricas profundas. Keith Swanwick (1979), "
        "no modelo CLASP, e David Elliott (1995), em <i>Music Matters</i>, convergem num ponto "
        "essencial: o aprendizado musical existe na <i>práxis</i> — no fazer musical em contexto. "
        "Não há como avaliar aprendizagem musical por meio de texto escrito ou resposta verbal: "
        "a evidência é o próprio ato de tocar, cantar, improvisar ou escutar ativamente."
    ))
    story.append(P(
        "Madeline Hunter (1982), no modelo de <i>Mastery Teaching</i>, propõe que o professor "
        "realize <i>\"checking for understanding\"</i> — verificação de compreensão — durante a "
        "instrução, e não apenas no final. Isso requer que a evidência seja definida com "
        "precisão suficiente para ser verificada rapidamente, em tempo real, enquanto a aula acontece."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(SectionHeader("Evidência Vaga vs. Evidência Específica"))
    story.append(Spacer(1, 0.2*cm))

    ev_data = [
        [P("<b>Objetivo da aula</b>", "th"),
         P("<b>Evidência vaga</b>", "th"),
         P("<b>Evidência específica (observável)</b>", "th")],
        [P("Aprender ritmo", "td"),
         P("Alunos entenderam o ritmo", "td"),
         P("Pelo menos 80% executa a célula sem apoio visual por 2 compassos seguidos", "td")],
        [P("Improvisar", "td"),
         P("Alunos improvisaram", "td"),
         P("Cada aluno tenta pelo menos uma frase de 2 compassos sem interromper a base", "td")],
        [P("Cantar afinado", "td"),
         P('Cantaram "bem"', "td"),
         P("Grupo mantém a terça harmônica nas 3 primeiras frases da canção", "td")],
    ]
    story.append(make_table(ev_data, [3.5*cm, 4.5*cm, 6*cm]))
    story.append(Spacer(1, 0.4*cm))

    story.append(SectionHeader("Como Escrever um Bom Critério de Evidência"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "Um critério de evidência eficaz tem três componentes:"
    ))
    for item in [
        "<b>Verbo de ação concreto:</b> toca, canta, identifica, escolhe, demonstra, executa. "
        "Evitar: entende, aprecia, sabe, compreende — esses verbos não são observáveis.",
        "<b>Condição:</b> o contexto em que o comportamento deve ocorrer. "
        "Exemplos: <i>sem apoio visual</i>, <i>em grupo</i>, <i>ao primeiro pedido</i>, "
        "<i>dentro do tempo do metrônomo</i>.",
        "<b>Limiar (quando possível):</b> o nível mínimo aceitável. "
        "Exemplos: <i>a maioria da turma</i>, <i>pelo menos 3 de 5 alunos</i>, "
        "<i>por 2 compassos consecutivos</i>, <i>sem pausa</i>.",
    ]:
        story.append(P(f"• {item}", "bullet"))
    story.append(Spacer(1, 0.3*cm))

    story.append(P(
        "<b>Atenção:</b> o critério não precisa ser perfeito. Ele precisa ser <i>suficientemente específico</i> "
        "para que o professor saiba, durante a aula, se está sendo alcançado. "
        "A prática de escrevê-lo antes da aula já transforma o olhar do professor — "
        "de um olhar difuso para um olhar focado."
    ))

    # -----------------------------------------------------------------------
    # PARTE 3
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(PartBox("PARTE 3 — PERGUNTA 2", "Qual pergunta farei no fechamento?"))
    story.append(Spacer(1, 0.15*cm))
    story.append(SectionHeader("O Fechamento Pedagógico"))
    story.append(Spacer(1, 0.3*cm))

    story.append(P(
        "O <b>fechamento pedagógico</b> (<i>closure</i>) é um dos elementos centrais do modelo de "
        "Madeline Hunter (1982): um momento intencional e estruturado ao final da aula em que "
        "os alunos <i>processam e articulam</i> o que foi aprendido. Não é uma despedida. "
        "Não é uma revisão pelo professor. É uma oportunidade para o aluno consolidar, "
        "em linguagem própria, o que aconteceu na aula."
    ))
    story.append(P(
        "Lev Vygotsky (1978) mostrou que o aprendizado é internalizado por meio da linguagem "
        "e da interação social. A pergunta de fechamento dá ao aluno a chance de <i>verbalizar</i> "
        "o aprendizado — um ato que não é apenas comunicativo, mas cognitivo: ao articular, "
        "o aluno consolida. Sem esse momento, o aprendizado permanece implícito e frágil."
    ))
    story.append(P(
        "Paulo Freire (1970), em <i>Pedagogia do Oprimido</i>, coloca o diálogo como o método "
        "fundamental da educação transformadora. O professor que apenas \"deposita\" conteúdo "
        "sem convidar o aluno a responder, questionar e refletir não educa — reproduz. "
        "A pergunta de fechamento é, nesse sentido, um ato pedagógico e político: "
        "ela reconhece o aluno como sujeito do próprio aprendizado."
    ))
    story.append(P(
        "John Hattie e Gregory Yates (2014) identificaram a metacognição — a capacidade do aluno "
        "de pensar sobre o próprio aprendizado — como uma das estratégias com maior impacto "
        "(effect size 0,69). A pergunta de fechamento, quando bem formulada, ativa exatamente essa "
        "capacidade: convida o aluno a observar o próprio processo, identificar o que mudou "
        "e reconhecer o que ainda precisa de atenção."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(SectionHeader("Tipos de Pergunta de Fechamento"))
    story.append(Spacer(1, 0.2*cm))

    tipos_data = [
        [P("<b>Tipo</b>", "th"), P("<b>Exemplo</b>", "th"), P("<b>Nível Bloom</b>", "th")],
        [P("Reflexão sobre o processo", "td"),
         P('O que foi mais difícil: a entrada ou manter o tempo?', "td"),
         P("Análise", "td_center")],
        [P("Conexão com o vivido", "td"),
         P('Quando o grupo tocou junto, o que ficou diferente do solo?', "td"),
         P("Síntese", "td_center")],
        [P("Transferência", "td"),
         P('Onde vocês já ouviram esse ritmo fora da escola?', "td"),
         P("Aplicação", "td_center")],
        [P("Metacognição", "td"),
         P('O que vocês fariam diferente se tivessem mais 10 minutos?', "td"),
         P("Avaliação", "td_center")],
        [P("Surpresa musical", "td"),
         P('Por que achamos que ficou mais fácil na segunda vez?', "td"),
         P("Análise", "td_center")],
    ]
    story.append(make_table(tipos_data, [4*cm, 7.5*cm, 2.5*cm]))
    story.append(Spacer(1, 0.3*cm))

    story.append(SectionHeader("O Que NÃO Perguntar"))
    story.append(Spacer(1, 0.2*cm))

    nao_data = [
        [P("<b>Pergunta</b>", "th"), P("<b>Por que não funciona</b>", "th")],
        [P('Gostaram?', "td"),
         P("Avalia prazer, não aprendizagem — e o prazer não é o objetivo da aula", "td")],
        [P('Entenderam?', "td"),
         P("Os alunos respondem sim por reflex — o silêncio não é compreensão", "td")],
        [P('Alguma dúvida?', "td"),
         P("Poucos alunos se expõem; silêncio não significa entendimento", "td")],
        [P('Foi bom?', "td"),
         P("Vaga demais para gerar qualquer informação útil ao professor", "td")],
    ]
    nao_t = Table(nao_data, colWidths=[4*cm, 10*cm])
    nao_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), RED_ACCENT),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 9.5),
        ("ALIGN",      (0, 0), (-1, 0), "CENTER"),
        ("BACKGROUND", (0, 1), (-1, 1), RED_SOFT),
        ("BACKGROUND", (0, 2), (-1, 2), WHITE),
        ("BACKGROUND", (0, 3), (-1, 3), RED_SOFT),
        ("BACKGROUND", (0, 4), (-1, 4), WHITE),
        ("FONTNAME",   (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 1), (-1, -1), 9.5),
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.Color(220/255, 180/255, 180/255)),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(nao_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(SectionHeader("Educação Musical: O Fechamento como Reflexão sobre o Fazer"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "Em educação musical, as melhores perguntas de fechamento convidam os alunos a "
        "descrever a própria <b>experiência musical</b> — não o conteúdo explicado, mas o que "
        "foi vivido no fazer. David Elliott (1995) chama isso de <i>\"musical knowing\"</i>: "
        "um tipo de conhecimento que só existe no ato de performar e refletir coletivamente. "
        "Perguntas como <i>\"O que seu corpo sentiu quando o grupo entrou no tempo?\"</i> ou "
        "<i>\"Como você sabia que estava afinado?\"</i> acessam esse saber de dentro — e "
        "o tornam consciente, transferível e educativo."
    ))

    # -----------------------------------------------------------------------
    # PARTE 4
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(PartBox("PARTE 4 — PERGUNTA 3", "Se não funcionar, o que farei?"))
    story.append(Spacer(1, 0.15*cm))
    story.append(SectionHeader("O Plano de Contingência"))
    story.append(Spacer(1, 0.3*cm))

    story.append(P(
        "A terceira pergunta distingue o professor em formação do professor experiente. "
        "Carol Ann Tomlinson (2001) descreve o <i>ensino responsivo</i> como a capacidade "
        "de planejar para múltiplos resultados possíveis — incluindo o fracasso de uma atividade. "
        "Isso não é pessimismo: é profissionalismo."
    ))
    story.append(P(
        "Vygotsky (1978) oferece o conceito de <b>Zona de Desenvolvimento Proximal (ZDP)</b>: "
        "a distância entre o que o aluno consegue fazer sozinho e o que consegue fazer com apoio. "
        "O plano de contingência é, essencialmente, um <i>andaime</i> (<i>scaffold</i>) preparado "
        "para quando a atividade ultrapassa a ZDP dos alunos. Em vez de improvisar na hora — "
        "o que aumenta o estresse e compromete a qualidade do ensino — o professor já sabe o que fazer."
    ))
    story.append(P(
        "Donald Schön (1983), em <i>The Reflective Practitioner</i>, distingue dois tipos de "
        "reflexão docente: a <i>reflection-in-action</i> (reflexão durante a aula, em tempo real) "
        "e a <i>reflection-on-action</i> (reflexão após a aula). O plano de contingência "
        "acelera a <i>reflection-in-action</i>: em vez de gastar energia cognitiva pensando "
        "em alternativas no meio da aula, o professor já as tem disponíveis — e pode "
        "dedicar sua atenção aos alunos."
    ))
    story.append(P(
        "David Berliner (1994) demonstrou, em pesquisas sobre expertise docente, que professores "
        "experientes <i>simulam mentalmente múltiplos cenários de aula</i> durante o planejamento — "
        "incluindo cenários de falha. Esse hábito reduz ansiedade, melhora a tomada de decisão "
        "em tempo real e aumenta a qualidade do ensino. John Sweller (1988), com a Teoria da "
        "Carga Cognitiva, explica por quê: quando o professor tem que pensar em alternativas "
        "<i>enquanto</i> conduz a aula, a carga cognitiva aumenta e a qualidade das decisões cai."
    ))
    story.append(Spacer(1, 0.3*cm))

    story.append(SectionHeader("Três Tipos de Contingência"))
    story.append(Spacer(1, 0.2*cm))

    cont_data = [
        [P("<b>Tipo</b>", "th"), P("<b>Quando usar</b>", "th"), P("<b>Exemplo prático</b>", "th")],
        [P("1. Simplificação", "td"),
         P("A atividade tem demanda motora ou cognitiva acima do que os alunos conseguem", "td"),
         P("Dividir um ritmo complexo em 2 elementos separados, ensinados em sequência", "td")],
        [P("2. Substituição", "td"),
         P("A atividade em si não está funcionando para nenhum subgrupo da turma", "td"),
         P("Se a improvisação em grupo trava, voltar para imitação em eco — terreno seguro", "td")],
        [P("3. Redução de Escopo", "td"),
         P("A atividade funciona, mas o tempo está acabando antes do planejado", "td"),
         P("Pular a segunda repetição e ir direto para o fechamento com o que já foi feito", "td")],
    ]
    story.append(make_table(cont_data, [3.5*cm, 5*cm, 5.5*cm]))
    story.append(Spacer(1, 0.4*cm))

    story.append(SectionHeader("Por Que os Professores Não Planejam Contingências — e Deveriam"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "A razão mais comum é simples: planejar o fracasso parece derrotista. "
        "Professores novatos tendem a planejar o cenário ideal — e ficam paralisados "
        "quando ele não se concretiza. A pesquisa de Berliner (1994) mostra que essa é "
        "exatamente a diferença entre novato e especialista: o especialista planeja "
        "para o melhor cenário <i>e</i> para os cenários alternativos."
    ))
    story.append(P(
        "Linda Darling-Hammond (2006) aponta que a resiliência e adaptabilidade do professor "
        "são marcas centrais do ensino eficaz — e que essas capacidades são treináveis. "
        "O hábito de escrever um plano de contingência antes de cada aula é um treino "
        "direto dessas capacidades."
    ))

    # -----------------------------------------------------------------------
    # PARTE 5 — EXEMPLO PRÁTICO
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(PartBox("PARTE 5", "As Três Perguntas Juntas: Um Exemplo Prático"))
    story.append(Spacer(1, 0.4*cm))

    story.append(P(
        "Para ilustrar como as três perguntas funcionam juntas, vejamos um planejamento "
        "completo para uma aula de percussão em escola de educação básica."
    ))
    story.append(Spacer(1, 0.2*cm))

    # Cabeçalho da aula
    aula_header_data = [
        [P("<b>Aula:</b> Introdução ao ritmo de samba no pandeiro — 5ª série, 50 minutos", "th")],
    ]
    ah = Table(aula_header_data, colWidths=[W])
    ah.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INDIGO),
        ("TEXTCOLOR",  (0, 0), (-1, -1), WHITE),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 11),
        ("ALIGN",      (0, 0), (-1, -1), "LEFT"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 14),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
    ]))
    story.append(ah)
    story.append(Spacer(1, 0.2*cm))

    exemplo_data = [
        [P("<b>Pergunta</b>", "th"), P("<b>Resposta planejada</b>", "th")],
        [P("O que observarei\npara saber se\nfuncionou?", "td"),
         P('Ao menos 70% dos alunos executa o padrão básico (bumbo-caixa-bumbo-caixa) '
           'por 4 compassos sem perder o tempo com o metrônomo a 60bpm, '
           'sem que eu precise marcar externamente"', "td")],
        [P("Pergunta do\nfechamento?", "td"),
         P('Qual parte do corpo ficou mais tensa quando você tocou? '
           'O que isso diz sobre como segurar o pandeiro?"', "td")],
        [P("Se não funcionar\n— o que farei?", "td"),
         P('Reduzir para apenas bumbo alternado (sem caixa) por 2 compassos. '
           'Se ainda difícil, fazer vocalmente antes de tocar '
           '(boca: TUM-ká-TUM-ká) e só depois passar para o instrumento"', "td")],
    ]
    ex_t = Table(exemplo_data, colWidths=[3.5*cm, 10.5*cm])
    ex_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INDIGO_DARK),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 10),
        ("ALIGN",      (0, 0), (-1, 0), "CENTER"),
        ("BACKGROUND", (0, 1), (0, -1), INDIGO_LIGHT),
        ("FONTNAME",   (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 1), (0, -1), 9.5),
        ("BACKGROUND", (1, 1), (1, 1), WHITE),
        ("BACKGROUND", (1, 2), (1, 2), GRAY_ROW),
        ("BACKGROUND", (1, 3), (1, 3), WHITE),
        ("FONTNAME",   (1, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (1, 1), (-1, -1), 9.5),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("GRID",       (0, 0), (-1, -1), 0.5, GRAY_BORDER),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",   (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 10),
        ("TEXTCOLOR",  (0, 1), (0, -1), INDIGO),
        ("ALIGN",      (0, 1), (0, -1), "CENTER"),
    ]))
    story.append(ex_t)
    story.append(Spacer(1, 0.4*cm))

    story.append(SectionHeader("Análise do Exemplo"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "Observe os três elementos do critério de evidência: "
        "verbo de ação (<i>executa</i>), condição (<i>sem que eu precise marcar externamente</i>) "
        "e limiar (<i>ao menos 70% dos alunos, por 4 compassos</i>). "
        "O professor sabe exatamente o que procurar — e pode verificar isso "
        "<i>durante</i> a atividade, não apenas ao final."
    ))
    story.append(P(
        "A pergunta de fechamento é específica e convida reflexão corporal — "
        "algo que só faz sentido em educação musical. Ela não pergunta <i>\"entenderam\"</i>, "
        "mas convida o aluno a conectar sensação física e técnica instrumental. "
        "Esse é o nível de análise que Bloom identifica como superior ao simples recordar."
    ))
    story.append(P(
        "O plano de contingência é gradual: primeiro reduz a complexidade (sem caixa), "
        "depois recua para um recurso mais elementar (vocalização antes de tocar). "
        "Isso segue a lógica do andaime de Vygotsky — recuar até encontrar a ZDP dos alunos "
        "e construir a partir daí."
    ))

    # -----------------------------------------------------------------------
    # PARTE 6 — GUIA DE IMPLEMENTAÇÃO
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(PartBox("PARTE 6", "Como Usar na Prática: Guia de Implementação"))
    story.append(Spacer(1, 0.4*cm))

    story.append(P(
        "A mudança de hábito requer progressividade. Tentar implementar as três perguntas "
        "de uma vez, em todas as aulas, frequentemente resulta em abandono. "
        "O roteiro a seguir foi desenhado para uma adoção gradual e sustentável."
    ))
    story.append(Spacer(1, 0.2*cm))

    semanas_data = [
        [P("<b>Período</b>", "th"), P("<b>Foco</b>", "th"), P("<b>Instrução</b>", "th")],
        [P("Semanas 1–2", "td_center"),
         P("Apenas Pergunta 1", "td"),
         P("Defina a evidência observável antes de cada aula. Não mude a estrutura da aula. "
           "Apenas escreva: \"Observarei...\" no planejamento.", "td")],
        [P("Semanas 3–4", "td_center"),
         P("Adicione a Pergunta 2", "td"),
         P("Prepare uma pergunta de fechamento por aula. Pode ser simples. "
           "Observe as reações dos alunos — o silêncio também é informação.", "td")],
        [P("Semanas 5–6", "td_center"),
         P("Adicione a Pergunta 3", "td"),
         P("Para pelo menos 2 aulas por semana, escreva um plano de contingência. "
           "Não precisa ser elaborado — uma frase já transforma.", "td")],
        [P("A partir da\nSemana 7", "td_center"),
         P("As 3 perguntas em\ntoda aula", "td"),
         P("A estrutura já estará internalizada. Leva menos de 5 minutos no planejamento. "
           "O retorno em qualidade de ensino será visível.", "td")],
    ]
    story.append(make_table(semanas_data, [3*cm, 4*cm, 7*cm]))
    story.append(Spacer(1, 0.4*cm))

    story.append(SectionHeader("Rubrica de Autoavaliação do Professor"))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "Use esta rubrica semanalmente para monitorar sua própria implementação:"
    ))
    story.append(Spacer(1, 0.2*cm))

    rub_data = [
        [P("<b>Critério</b>", "th"),
         P("<b>Ainda não\nfaço</b>", "th"),
         P("<b>Faço às\nvezes</b>", "th"),
         P("<b>Faço\nsempre</b>", "th")],
        [P("Defino evidência observável antes da aula", "td"), P("", "td_center"), P("", "td_center"), P("", "td_center")],
        [P("A evidência usa verbo de ação concreto", "td"), P("", "td_center"), P("", "td_center"), P("", "td_center")],
        [P("Tenho pergunta de fechamento preparada", "td"), P("", "td_center"), P("", "td_center"), P("", "td_center")],
        [P('A pergunta convida reflexão (não só "entendeu?")', "td"), P("", "td_center"), P("", "td_center"), P("", "td_center")],
        [P("Tenho pelo menos 1 plano de contingência", "td"), P("", "td_center"), P("", "td_center"), P("", "td_center")],
        [P("Uso o que observo para ajustar a PRÓXIMA aula", "td"), P("", "td_center"), P("", "td_center"), P("", "td_center")],
    ]
    story.append(rubric_table(rub_data, [9*cm, 2.5*cm, 2.5*cm, 2*cm]))
    story.append(Spacer(1, 0.4*cm))

    story.append(P(
        "O último critério — <i>\"Uso o que observo para ajustar a PRÓXIMA aula\"</i> — "
        "é o fechamento do ciclo formativo. A avaliação formativa só é completa quando "
        "a evidência coletada alimenta o planejamento seguinte. "
        "É isso que distingue observação casual de avaliação profissional."
    ))

    # -----------------------------------------------------------------------
    # REFERÊNCIAS
    # -----------------------------------------------------------------------
    story.append(PageBreak())
    story.append(SectionHeader("REFERÊNCIAS BIBLIOGRÁFICAS"))
    story.append(Spacer(1, 0.3*cm))

    refs = [
        "ANDERSON, Lorin W.; KRATHWOHL, David R. (Eds.). <b>A Taxonomy for Learning, "
        "Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives</b>. "
        "New York: Longman, 2001.",

        "BERLINER, David C. The nature of expertise in teaching. In: OSER, Fritz K.; "
        "DICK, Andreas; PATRY, Jean-Luc (Eds.). <b>Effective and Responsible Teaching</b>. "
        "San Francisco: Jossey-Bass, 1994. p. 227–248.",

        "BLACK, Paul; WILIAM, Dylan. <b>Inside the Black Box: Raising Standards Through "
        "Classroom Assessment</b>. London: King's College London School of Education, 1998.",

        "BLOOM, Benjamin S. et al. <b>Taxonomy of Educational Objectives: The Classification "
        "of Educational Goals</b>. New York: Longmans, Green, 1956.",

        "DARLING-HAMMOND, Linda. <b>Powerful Teacher Education: Lessons from Exemplary "
        "Programs</b>. San Francisco: Jossey-Bass, 2006.",

        "ELLIOTT, David J. <b>Music Matters: A New Philosophy of Music Education</b>. "
        "New York: Oxford University Press, 1995.",

        "FREIRE, Paulo. <b>Pedagogia do Oprimido</b>. Rio de Janeiro: Paz e Terra, 1970.",

        "HATTIE, John. <b>Visible Learning: A Synthesis of Over 800 Meta-Analyses Relating "
        "to Achievement</b>. London: Routledge, 2009.",

        "HATTIE, John; YATES, Gregory. <b>Visible Learning and the Science of How We Learn</b>. "
        "London: Routledge, 2014.",

        "HUNTER, Madeline. <b>Mastery Teaching</b>. El Segundo: TIP Publications, 1982.",

        "SCHON, Donald A. <b>The Reflective Practitioner: How Professionals Think in "
        "Action</b>. New York: Basic Books, 1983.",

        "SWANWICK, Keith. <b>A Basis for Music Education</b>. London: Routledge, 1979.",

        "SWELLER, John. Cognitive load during problem solving: Effects on learning. "
        "<b>Cognitive Science</b>, v. 12, n. 2, p. 257–285, 1988.",

        "TOMLINSON, Carol Ann. <b>How to Differentiate Instruction in Mixed-Ability "
        "Classrooms</b>. 2. ed. Alexandria: ASCD, 2001.",

        "VYGOTSKY, Lev S. <b>Mind in Society: The Development of Higher Psychological "
        "Processes</b>. Cambridge: Harvard University Press, 1978.",

        "WIGGINS, Grant; McTIGHE, Jay. <b>Understanding by Design</b>. 2. ed. "
        "Alexandria: ASCD, 2005.",

        "WILIAM, Dylan. <b>Embedded Formative Assessment</b>. Bloomington: Solution Tree "
        "Press, 2011.",
    ]

    for ref in refs:
        story.append(Paragraph(ref, sty["ref"]))

    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=INDIGO_LIGHT))
    story.append(Spacer(1, 0.2*cm))
    story.append(P(
        "MusiLab — Plataforma de Planejamento Musical para Educadores  |  2026",
        "footer"
    ))

    return story


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2.5*cm,
        rightMargin=2.5*cm,
        topMargin=2.5*cm,
        bottomMargin=2.5*cm,
        title="Avaliação Estruturada na Prática Docente",
        author="MusiLab",
        subject="As Três Perguntas que Transformam o Planejamento de Aula",
        creator="MusiLab — gerar_avaliacao_pdf.py",
    )

    story = build_content()

    doc.build(
        story,
        onFirstPage=NumberedCanvas.first_page,
        onLaterPages=NumberedCanvas.later_pages,
    )

    size_kb = os.path.getsize(OUTPUT) / 1024
    print(f"PDF gerado com sucesso: {OUTPUT}")
    print(f"Tamanho: {size_kb:.1f} KB")


if __name__ == "__main__":
    main()
