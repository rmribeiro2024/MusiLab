// src/lib/feriados.ts
// Dados e funções de feriados nacionais (extraídos de BancoPlanos.tsx)

export const feriadosNacionais = {
    fixos: [
        { mes: 1,  dia: 1,  nome: 'Ano Novo' },
        { mes: 4,  dia: 21, nome: 'Tiradentes' },
        { mes: 5,  dia: 1,  nome: 'Dia do Trabalho' },
        { mes: 9,  dia: 7,  nome: 'Independência do Brasil' },
        { mes: 10, dia: 12, nome: 'Nossa Senhora Aparecida' },
        { mes: 11, dia: 2,  nome: 'Finados' },
        { mes: 11, dia: 15, nome: 'Proclamação da República' },
        { mes: 11, dia: 20, nome: 'Consciência Negra' },
        { mes: 12, dia: 25, nome: 'Natal' },
    ],
    moveis: {
        2024: [
            { data: '2024-02-13', nome: 'Carnaval' },
            { data: '2024-03-29', nome: 'Sexta-feira Santa' },
            { data: '2024-03-31', nome: 'Páscoa' },
            { data: '2024-05-30', nome: 'Corpus Christi' },
        ],
        2025: [
            { data: '2025-03-04', nome: 'Carnaval' },
            { data: '2025-04-18', nome: 'Sexta-feira Santa' },
            { data: '2025-04-20', nome: 'Páscoa' },
            { data: '2025-06-19', nome: 'Corpus Christi' },
        ],
        2026: [
            { data: '2026-02-17', nome: 'Carnaval' },
            { data: '2026-04-03', nome: 'Sexta-feira Santa' },
            { data: '2026-04-05', nome: 'Páscoa' },
            { data: '2026-06-04', nome: 'Corpus Christi' },
        ],
        2027: [
            { data: '2027-02-09', nome: 'Carnaval' },
            { data: '2027-03-26', nome: 'Sexta-feira Santa' },
            { data: '2027-03-28', nome: 'Páscoa' },
            { data: '2027-05-27', nome: 'Corpus Christi' },
        ],
        2028: [
            { data: '2028-02-29', nome: 'Carnaval' },
            { data: '2028-04-14', nome: 'Sexta-feira Santa' },
            { data: '2028-04-16', nome: 'Páscoa' },
            { data: '2028-06-15', nome: 'Corpus Christi' },
        ],
        2029: [
            { data: '2029-02-13', nome: 'Carnaval' },
            { data: '2029-03-30', nome: 'Sexta-feira Santa' },
            { data: '2029-04-01', nome: 'Páscoa' },
            { data: '2029-05-31', nome: 'Corpus Christi' },
        ],
        2030: [
            { data: '2030-03-05', nome: 'Carnaval' },
            { data: '2030-04-19', nome: 'Sexta-feira Santa' },
            { data: '2030-04-21', nome: 'Páscoa' },
            { data: '2030-06-20', nome: 'Corpus Christi' },
        ],
    } as Record<number, { data: string; nome: string }[]>,
}

export function calcularPascoa(ano: number): Date {
    const a = ano % 19
    const b = Math.floor(ano / 100)
    const c = ano % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const mes = Math.floor((h + l - 7 * m + 114) / 31)
    const dia = ((h + l - 7 * m + 114) % 31) + 1
    return new Date(ano, mes - 1, dia)
}

export function feriadosMoveisDinamicos(ano: number): { data: string; nome: string }[] {
    if (feriadosNacionais.moveis[ano]) return feriadosNacionais.moveis[ano]
    const pascoa = calcularPascoa(ano)
    const toISO = (d: Date) => d.toISOString().split('T')[0]
    const addDias = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
    return [
        { data: toISO(addDias(pascoa, -47)), nome: 'Carnaval' },
        { data: toISO(addDias(pascoa,  -2)), nome: 'Sexta-feira Santa' },
        { data: toISO(pascoa),               nome: 'Páscoa' },
        { data: toISO(addDias(pascoa,  60)), nome: 'Corpus Christi' },
    ]
}

export function verificarFeriado(dataStr: string): string | null {
    const [ano, mes, dia] = dataStr.split('-').map(Number)
    const feriadoFixo = feriadosNacionais.fixos.find(f => f.mes === mes && f.dia === dia)
    if (feriadoFixo) return feriadoFixo.nome
    const feriadoMovel = feriadosMoveisDinamicos(ano).find(f => f.data === dataStr)
    if (feriadoMovel) return feriadoMovel.nome
    return null
}
