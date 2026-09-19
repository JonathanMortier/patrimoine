import type { ChartOptions, TooltipItem } from 'chart.js'
import { fmtEuro } from '../utils/format'

/** Couleurs catégorielles (distinctes du vert/rouge réservés aux gains/pertes). */
export const CATEGORY_COLORS = {
  bourse: '#6366f1',
  assuranceVie: '#0ea5e9',
  crowdlending: '#f59e0b',
  crypto: '#a855f7',
  comptes: '#14b8a6',
  total: '#e2e8f0',
} as const

/** Séries des courbes de projection. */
export const SERIES_COLORS = {
  objectif: '#6366f1',
  reel: '#0ea5e9',
  evolution: '#f59e0b',
} as const

export const AXIS = '#98a2b3'
export const GRID = '#2e3a4d'
export const SURFACE = '#1d2939'

const compactEuro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const fmtAxisEuro = (v: number | string): string => compactEuro.format(Number(v))

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const legendLabels = { color: AXIS, boxWidth: 12, padding: 8 }

/** Options communes des courbes : axes en euros compacts, infobulles en euros. */
export function lineOptions(): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : undefined,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: legendLabels },
      tooltip: {
        callbacks: {
          label: (i: TooltipItem<'line'>) =>
            `${i.dataset.label} : ${i.parsed.y === null ? '—' : fmtEuro(i.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: AXIS }, grid: { color: GRID } },
      y: { ticks: { color: AXIS, callback: fmtAxisEuro }, grid: { color: GRID } },
    },
  }
}

export function donutOptions(): ChartOptions<'doughnut'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : undefined,
    plugins: {
      legend: { position: 'bottom', labels: legendLabels },
      tooltip: {
        callbacks: { label: (i: TooltipItem<'doughnut'>) => `${i.label} : ${fmtEuro(i.parsed)}` },
      },
    },
  }
}

export function lineDataset(label: string, color: string, data: (number | null)[], width = 2, dashed = false) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: width,
    tension: 0.3,
    pointRadius: 2,
    ...(dashed ? { borderDash: [6, 4] } : {}),
  }
}
