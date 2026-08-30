// Extrait les tables de l'ODS : pour chaque cellule non vide, une ligne
// `R.<row>.C.<col>  <formule>  <valeur>`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const xml = readFileSync('/tmp/opencode/ods/content.xml', 'utf8')
const MAX_ROWS = 4000
const MAX_COLS = 200

function decode(s) {
  return s
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

function innerText(block) {
  const parts = []
  const re = /<text:p[^>]*>([\s\S]*?)<\/text:p>/g
  let m
  while ((m = re.exec(block))) {
    const s = decode(m[1])
    parts.push(s.replace(/<[^>]+>/g, ''))
  }
  return parts.join(' ').trim()
}

function cellValue(block) {
  const f = /table:formula="([^"]*)"/.exec(block)
  const formula = f ? decode(f[1]) : ''
  const dateM = /office:date-value="([^"]*)"/.exec(block)
  const numM = /office:value="([^"]*)"/.exec(block)
  const txt = innerText(block)
  let value = txt
  if (dateM) value = `(date ${dateM[1]})`
  else if (numM && txt === '') value = `(num ${numM[1]})`
  return { formula, value }
}

function cellsOf(rowBlock) {
  const cells = []
  const re = /<table:table-cell[^>]*(\/>|>[\s\S]*?<\/table:table-cell>)/g
  let m
  let col = 0
  while ((m = re.exec(rowBlock))) {
    const head = m[0]
    const repeatM = /table:number-columns-repeated="(\d+)"/.exec(head)
    const repeat = repeatM ? Math.min(Number(repeatM[1]), MAX_COLS - col) : 1
    const isCovered = /table:covered-table-cell/.test(head)
    const content = /\/>$/.test(head) ? '' : m[0].slice(head.indexOf('>') + 1, head.lastIndexOf('<'))
    const { formula, value } = isCovered ? { formula: '', value: '' } : cellValue(content)
    if (formula || value) cells.push({ col, repeat, formula, value })
    col += repeat
    if (col >= MAX_COLS) break
  }
  return cells
}

function rowsOf(tableBlock) {
  const rows = []
  const re = /<table:table-row[^>]*(\/>|>[\s\S]*?<\/table:table-row>)/g
  let m
  let r = 0
  while ((m = re.exec(tableBlock))) {
    const repeatM = /table:number-rows-repeated="(\d+)"/.exec(m[0])
    const repeat = repeatM ? Math.min(Number(repeatM[1]), MAX_ROWS - r) : 1
    const content = /\/>$/.test(m[0]) ? '' : m[0].slice(m[0].indexOf('>') + 1, m[0].lastIndexOf('<'))
    rows.push({ r, repeat, cells: cellsOf(content) })
    r += repeat
    if (r >= MAX_ROWS) break
  }
  return rows
}

const tableRe = /<table:table(?=\b)[^>]*table:name="([^"]*)"([\s\S]*?)<\/table:table>|<table:table[^>]*table:name="([^"]*)"[^>]*\/>/g
const names = new Map()
let tm
while ((tm = tableRe.exec(xml))) {
  const name = tm[1] ?? tm[3]
  const block = tm[2] ?? ''
  names.set(name, block)
}

const target = process.argv[2]
const wanted = target
  ? target.split(',').map((s) => s.trim())
  : [...names.keys()]

mkdirSync('/tmp/opencode/ods-dumps', { recursive: true })
for (const [name, block] of names) {
  if (!wanted.includes(name)) continue
  const lines = []
  for (const row of rowsOf(block)) {
    for (const cell of row.cells) {
      const tag = `R${row.r + 1}.C${cell.col + 1}`
      lines.push(`${tag}\t${cell.formula}\t${cell.value}`)
    }
  }
  writeFileSync(`/tmp/opencode/ods-dumps/${name}.tsv`, lines.join('\n'))
  console.log(`${name}: ${lines.length} cellules`)
}