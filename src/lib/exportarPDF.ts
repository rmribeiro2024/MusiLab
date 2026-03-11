// src/lib/exportarPDF.ts
// Geração programática de PDF usando jsPDF.
// Constrói o PDF a partir dos dados — sem depender de html2canvas.

import jsPDF from 'jspdf'
import { formatarData, type RelatorioMensalData, type RelatorioTurmaData, type ItemContagem } from './relatorios'

const MARGIN   = 18
const COL_W    = 174  // 210 - 2*18
const LINE_H   = 7
const PAGE_H   = 297

// ─── Helpers de layout ────────────────────────────────────────────────────────

class PdfWriter {
    doc: jsPDF
    y: number

    constructor() {
        this.doc  = new jsPDF({ unit: 'mm', format: 'a4' })
        this.y    = MARGIN
    }

    novaLinha(extra = 0) { this.y += LINE_H + extra }

    verificarPagina(altura = LINE_H * 3) {
        if (this.y + altura > PAGE_H - MARGIN) {
            this.doc.addPage()
            this.y = MARGIN
        }
    }

    titulo(texto: string) {
        this.verificarPagina(12)
        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(18)
        this.doc.setTextColor(30, 30, 60)
        this.doc.text(texto, MARGIN, this.y)
        this.y += 10
    }

    subtitulo(texto: string) {
        this.verificarPagina(10)
        this.doc.setFont('helvetica', 'normal')
        this.doc.setFontSize(10)
        this.doc.setTextColor(120, 120, 140)
        this.doc.text(texto, MARGIN, this.y)
        this.novaLinha(2)
    }

    secaoTitulo(texto: string) {
        this.verificarPagina(14)
        this.y += 4
        this.doc.setFont('helvetica', 'bold')
        this.doc.setFontSize(9)
        this.doc.setTextColor(100, 100, 120)
        this.doc.text(texto.toUpperCase(), MARGIN, this.y)
        // linha separadora
        this.y += 3
        this.doc.setDrawColor(220, 220, 230)
        this.doc.line(MARGIN, this.y, MARGIN + COL_W, this.y)
        this.y += 5
    }

    cards(items: { label: string; value: number }[]) {
        this.verificarPagina(20)
        const cardW = COL_W / items.length - 2
        items.forEach((item, i) => {
            const x = MARGIN + i * (cardW + 2)
            this.doc.setDrawColor(220, 220, 235)
            this.doc.setFillColor(248, 248, 255)
            this.doc.roundedRect(x, this.y, cardW, 16, 2, 2, 'FD')
            this.doc.setFont('helvetica', 'bold')
            this.doc.setFontSize(14)
            this.doc.setTextColor(60, 60, 140)
            this.doc.text(String(item.value), x + cardW / 2, this.y + 9, { align: 'center' })
            this.doc.setFont('helvetica', 'normal')
            this.doc.setFontSize(7)
            this.doc.setTextColor(120, 120, 140)
            this.doc.text(item.label, x + cardW / 2, this.y + 14, { align: 'center' })
        })
        this.y += 22
    }

    listaOrdenada(items: ItemContagem[], sufixo: string) {
        const max = items[0]?.count ?? 1
        items.forEach((item, i) => {
            this.verificarPagina(8)
            const pct = Math.round((item.count / max) * 100)
            const barW = COL_W * 0.45

            // número e label
            this.doc.setFont('helvetica', 'bold')
            this.doc.setFontSize(8)
            this.doc.setTextColor(80, 80, 100)
            this.doc.text(`${i + 1}.`, MARGIN, this.y)

            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(40, 40, 60)
            const label = item.label.length > 38 ? item.label.slice(0, 36) + '…' : item.label
            this.doc.text(label, MARGIN + 6, this.y)

            // barra de progresso
            const barX = MARGIN + COL_W * 0.5
            this.doc.setFillColor(230, 230, 242)
            this.doc.roundedRect(barX, this.y - 3.5, barW, 4, 1, 1, 'F')
            this.doc.setFillColor(99, 102, 200)
            this.doc.roundedRect(barX, this.y - 3.5, barW * pct / 100, 4, 1, 1, 'F')

            // contagem
            this.doc.setFont('helvetica', 'bold')
            this.doc.setFontSize(7.5)
            this.doc.setTextColor(99, 102, 200)
            this.doc.text(`${item.count} ${sufixo}`, MARGIN + COL_W, this.y, { align: 'right' })

            this.novaLinha(1)
        })
        this.y += 2
    }

    tags(items: ItemContagem[]) {
        let x = MARGIN
        const tagH = 6
        const baseY = this.y

        items.forEach(item => {
            const texto = `${item.label}  ${item.count}x`
            this.doc.setFontSize(7.5)
            const w = this.doc.getTextWidth(texto) + 6

            if (x + w > MARGIN + COL_W) {
                x = MARGIN
                this.y += tagH + 2
                this.verificarPagina(tagH + 4)
            }

            this.doc.setFillColor(238, 240, 255)
            this.doc.setDrawColor(180, 185, 220)
            this.doc.roundedRect(x, this.y - 4, w, tagH, 1.5, 1.5, 'FD')
            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(70, 75, 160)
            this.doc.text(texto, x + 3, this.y)
            x += w + 3
        })
        this.y = Math.max(this.y, baseY) + tagH + 2
    }

    linhaDoTempo(items: { data: string; planoTitulo: string }[]) {
        items.forEach((item, i) => {
            this.verificarPagina(7)
            // alternância de fundo
            if (i % 2 === 0) {
                this.doc.setFillColor(248, 249, 252)
                this.doc.rect(MARGIN, this.y - 4, COL_W, 6, 'F')
            }
            this.doc.setFont('helvetica', 'bold')
            this.doc.setFontSize(7.5)
            this.doc.setTextColor(130, 130, 150)
            this.doc.text(formatarData(item.data), MARGIN + 1, this.y)
            this.doc.setFont('helvetica', 'normal')
            this.doc.setTextColor(40, 40, 60)
            const titulo = item.planoTitulo.length > 55 ? item.planoTitulo.slice(0, 53) + '…' : item.planoTitulo
            this.doc.text(titulo, MARGIN + 26, this.y)
            this.novaLinha(0.5)
        })
        this.y += 2
    }

    textoIA(texto: string) {
        this.verificarPagina(20)
        // caixa de destaque
        this.doc.setFillColor(245, 248, 255)
        this.doc.setDrawColor(180, 190, 230)
        const linhas = this.doc.splitTextToSize(texto, COL_W - 8)
        const alturaBox = linhas.length * 5 + 8
        this.verificarPagina(alturaBox)
        this.doc.roundedRect(MARGIN, this.y - 2, COL_W, alturaBox, 2, 2, 'FD')
        this.doc.setFont('helvetica', 'normal')
        this.doc.setFontSize(8.5)
        this.doc.setTextColor(60, 70, 130)
        linhas.forEach((linha: string) => {
            this.doc.text(linha, MARGIN + 4, this.y + 4)
            this.y += 5
        })
        this.y += 8
    }

    rodape() {
        const total = this.doc.getNumberOfPages()
        for (let i = 1; i <= total; i++) {
            this.doc.setPage(i)
            this.doc.setFont('helvetica', 'normal')
            this.doc.setFontSize(7)
            this.doc.setTextColor(180, 180, 190)
            this.doc.text(`MusiLab — gerado em ${new Date().toLocaleDateString('pt-BR')}`, MARGIN, PAGE_H - 8)
            this.doc.text(`${i} / ${total}`, MARGIN + COL_W, PAGE_H - 8, { align: 'right' })
        }
    }

    salvar(nomeArquivo: string) {
        this.rodape()
        this.doc.save(nomeArquivo)
    }
}

// ─── Exportação pública ───────────────────────────────────────────────────────

export function exportarRelatorioMensalPDF(
    data: RelatorioMensalData,
    filtros: { inicio: string; fim: string; turmaNome?: string },
    sinteseIA?: string,
) {
    const w = new PdfWriter()

    w.titulo('Relatorio Mensal Geral')
    w.subtitulo(`Periodo: ${formatarData(filtros.inicio)} a ${formatarData(filtros.fim)}`)
    if (filtros.turmaNome) w.subtitulo(`Turma: ${filtros.turmaNome}`)

    w.secaoTitulo('Resumo')
    w.cards([
        { label: 'Aulas realizadas',   value: data.totalAulas },
        { label: 'Turmas atendidas',   value: data.totalTurmas },
        { label: 'Planos utilizados',  value: data.totalPlanos },
        { label: 'Registros pos-aula', value: data.totalRegistros },
    ])

    if (data.planosUsados.length > 0) {
        w.secaoTitulo('Planos mais usados')
        w.listaOrdenada(data.planosUsados, 'aplicacao')
    }
    if (data.conceitos.length > 0) {
        w.secaoTitulo('Conceitos musicais trabalhados')
        w.tags(data.conceitos)
    }
    if (data.repertorio.length > 0) {
        w.secaoTitulo('Repertorio utilizado')
        w.listaOrdenada(data.repertorio, 'vez')
    }
    if (data.turmas.length > 0) {
        w.secaoTitulo('Turmas atendidas')
        w.listaOrdenada(data.turmas, 'aula')
    }
    if (sinteseIA) {
        w.secaoTitulo('Sintese pedagogica (sugerida por IA)')
        w.textoIA(sinteseIA)
    }

    w.salvar(`relatorio-mensal-${filtros.inicio}.pdf`)
}

export function exportarRelatorioTurmaPDF(
    data: RelatorioTurmaData,
    filtros: { inicio: string; fim: string },
    sinteseIA?: string,
) {
    const w = new PdfWriter()

    w.titulo('Relatorio por Turma')
    w.subtitulo(`Turma: ${data.turmaNome}`)
    w.subtitulo(`Periodo: ${formatarData(filtros.inicio)} a ${formatarData(filtros.fim)}`)

    w.secaoTitulo('Resumo')
    w.cards([{ label: 'Aulas realizadas', value: data.totalAulas }])

    if (data.linhaDoTempo.length > 0) {
        w.secaoTitulo('Linha do tempo')
        w.linhaDoTempo(data.linhaDoTempo)
    }
    if (data.conceitos.length > 0) {
        w.secaoTitulo('Conceitos musicais trabalhados')
        w.tags(data.conceitos)
    }
    if (data.repertorio.length > 0) {
        w.secaoTitulo('Repertorio utilizado')
        w.listaOrdenada(data.repertorio, 'vez')
    }
    if (data.planos.length > 0) {
        w.secaoTitulo('Planos aplicados')
        w.listaOrdenada(data.planos, 'vez')
    }
    if (sinteseIA) {
        w.secaoTitulo('Sintese pedagogica (sugerida por IA)')
        w.textoIA(sinteseIA)
    }

    w.salvar(`relatorio-turma-${data.turmaNome.split(' ')[0].toLowerCase()}-${filtros.inicio}.pdf`)
}
