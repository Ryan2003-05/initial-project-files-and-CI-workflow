// ================================================
// DESIGN SYSTEM — RyanTask's
// CDC §1.3 — Charte graphique Dark Premium
// ================================================

export const Colors = {
  // Fonds
  bg: '#0F172A',
  bg2: '#111827',
  surface: '#1E293B',
  surface2: '#243447',

  // Accents
  accent: '#3B82F6',
  cyan: '#06B6D4',

  // Priorités tâches
  urgent: '#DC2626',
  urgentBg: 'rgba(220, 38, 38, 0.15)',
  urgentBorder: 'rgba(220, 38, 38, 0.3)',

  medium: '#FACC15',
  mediumBg: 'rgba(250, 204, 21, 0.15)',
  mediumBorder: 'rgba(250, 204, 21, 0.25)',

  low: '#22C55E',
  lowBg: 'rgba(34, 197, 94, 0.15)',
  lowBorder: 'rgba(34, 197, 94, 0.25)',

  // Statuts
  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.15)',
  fail: '#DC2626',
  failBg: 'rgba(220, 38, 38, 0.15)',
  warning: '#FACC15',
  warningBg: 'rgba(250, 204, 21, 0.15)',

  // Textes
  text: '#E2E8F0',
  text2: '#94A3B8',
  muted: '#64748B',

  // Bordures
  border: 'rgba(255, 255, 255, 0.08)',
  borderCyan: 'rgba(6, 182, 212, 0.3)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',

  // FAB
  fabShadow: 'rgba(6, 182, 212, 0.4)',
} as const

// Types utilitaires
export type ColorKey = keyof typeof Colors

// Helpers priorité
export const PriorityColors = {
  urgente: {
    text: Colors.urgent,
    bg: Colors.urgentBg,
    border: Colors.urgentBorder,
    bar: Colors.urgent,
  },
  moyenne: {
    text: Colors.medium,
    bg: Colors.mediumBg,
    border: Colors.mediumBorder,
    bar: Colors.medium,
  },
  basse: {
    text: Colors.low,
    bg: Colors.lowBg,
    border: Colors.lowBorder,
    bar: Colors.low,
  },
} as const

// Helpers statut Ryan-End
export const StatusColors = {
  reussi: {
    text: Colors.success,
    bg: Colors.successBg,
  },
  echec: {
    text: Colors.fail,
    bg: Colors.failBg,
  },
  en_attente: {
    text: Colors.warning,
    bg: Colors.warningBg,
  },
} as const