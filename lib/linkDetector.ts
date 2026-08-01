// ================================================
// DÉTECTEUR DE PLATEFORME — RyanTask's
// Détecte automatiquement la plateforme depuis une URL
// ================================================

import { LinkPlatform } from '../types'

const DEFAULT_WHATSAPP_COUNTRY_CODE = '229'

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function isPhoneNumberInput(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || /[a-z]/i.test(trimmed)) return false
  const digitCount = digitsOnly(trimmed).length

  return digitCount >= 8 && digitCount <= 15 && /^[+\d\s().-]+$/.test(trimmed)
}

export function buildWhatsAppUrl(phoneInput: string): string {
  const trimmed = phoneInput.trim()
  let phone = digitsOnly(trimmed)

  if (trimmed.startsWith('00')) {
    phone = phone.slice(2)
  } else if (!trimmed.startsWith('+') && !phone.startsWith(DEFAULT_WHATSAPP_COUNTRY_CODE)) {
    phone = `${DEFAULT_WHATSAPP_COUNTRY_CODE}${phone}`
  }

  return `https://wa.me/${phone}`
}

export function normalizeLinkUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed

  if (isPhoneNumberInput(trimmed)) {
    return buildWhatsAppUrl(trimmed)
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

export function detectPlatform(url: string): LinkPlatform {
  const lower = url.toLowerCase().trim()

  if (isPhoneNumberInput(lower)) {
    return 'whatsapp'
  }
  if (lower.includes('wa.me') || lower.includes('whatsapp.com') || lower.includes('api.whatsapp')) {
    return 'whatsapp'
  }
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    return 'instagram'
  }
  if (lower.includes('facebook.com') || lower.includes('fb.com') || lower.includes('fb.watch') || lower.includes('m.me')) {
    return 'facebook'
  }
  if (lower.includes('tiktok.com') || lower.includes('vt.tiktok')) {
    return 'tiktok'
  }

  return 'web'
}
