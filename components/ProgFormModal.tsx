// ================================================
// MODAL CRÉATION RYAN-PROG — RyanTask's
// CDC §5 — Mémos d'achats + liens plateformes
// ================================================

import { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../constants/colors'
import { LinkPlatform } from '../types'
import { detectPlatform, normalizeLinkUrl } from '../lib/linkDetector'

interface ProgFormModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    price: number | null
    currency: string
    phone: string | null
    address: string | null
    note: string | null
    links: { url: string; platform: LinkPlatform }[]
  }) => Promise<void>
}

const PLATFORM_OPTIONS: { key: LinkPlatform; label: string; color: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { key: 'instagram', label: 'Instagram', color: '#F472B6' },
  { key: 'facebook', label: 'Facebook', color: '#60A5FA' },
  { key: 'tiktok', label: 'TikTok', color: Colors.cyan },
  { key: 'web', label: 'Lien web', color: Colors.text2 },
]

export default function ProgFormModal({ visible, onClose, onSubmit }: ProgFormModalProps) {
  const insets = useSafeAreaInsets()
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('FCFA')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [links, setLinks] = useState<{ url: string; platform: LinkPlatform }[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setName('')
    setPrice('')
    setCurrency('FCFA')
    setPhone('')
    setAddress('')
    setNote('')
    setLinks([])
    setNewLinkUrl('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const addLink = () => {
    if (!newLinkUrl.trim()) return
    const normalizedUrl = normalizeLinkUrl(newLinkUrl)
    const detectedPlatform = detectPlatform(normalizedUrl)
    setLinks([...links, { url: normalizedUrl, platform: detectedPlatform }])
    setNewLinkUrl('')
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'article est obligatoire.')
      return
    }

    const parsedPrice = price.trim() ? parseFloat(price.replace(/[^\d.]/g, '')) : null
    if (price.trim() && (isNaN(parsedPrice!) || parsedPrice! < 0)) {
      Alert.alert('Erreur', 'Le prix doit être un nombre valide.')
      return
    }

    setSubmitting(true)
    await onSubmit({
      name: name.trim(),
      price: parsedPrice,
      currency,
      phone: phone.trim() || null,
      address: address.trim() || null,
      note: note.trim() || null,
      links,
    })
    setSubmitting(false)
    resetForm()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nouveau mémo d'achat</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.form}
            contentContainerStyle={[
              styles.formContent,
              { paddingBottom: Math.max(insets.bottom + 28, 48) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* Nom */}
            <View style={styles.field}>
              <Text style={styles.label}>Nom de l'article *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Chaussures Nike Air Max"
                placeholderTextColor={Colors.muted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Prix + devise */}
            <View style={styles.field}>
              <Text style={styles.label}>Prix (optionnel)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="35000"
                  placeholderTextColor={Colors.muted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.currencyInput]}
                  placeholder="FCFA"
                  placeholderTextColor={Colors.muted}
                  value={currency}
                  onChangeText={setCurrency}
                />
              </View>
            </View>

            {/* Téléphone */}
            <View style={styles.field}>
              <Text style={styles.label}>Téléphone du vendeur (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="+229 99 88 77 66"
                placeholderTextColor={Colors.muted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Adresse */}
            <View style={styles.field}>
              <Text style={styles.label}>Adresse / Lieu (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Boutique Centrale, Cotonou"
                placeholderTextColor={Colors.muted}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            {/* Note */}
            <View style={styles.field}>
              <Text style={styles.label}>Note (optionnel)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Prendre la pointure 42 EU"
                placeholderTextColor={Colors.muted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Liens */}
            <View style={styles.field}>
              <Text style={styles.label}>Liens (WhatsApp, Instagram, etc.)</Text>

              {links.map((link, index) => {
                const cfg = PLATFORM_OPTIONS.find(p => p.key === link.platform)!
                return (
                  <View key={index} style={styles.linkItem}>
                    <View style={[styles.linkDot, { backgroundColor: cfg.color }]} />
                    <Text style={styles.linkPlatformText}>{cfg.label}</Text>
                    <Text style={styles.linkUrlText} numberOfLines={1}>{link.url}</Text>
                    <TouchableOpacity onPress={() => removeLink(index)}>
                      <Text style={styles.linkRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}

              <View style={styles.checklistAddRow}>
                <TextInput
                  style={[styles.input, styles.linkInput]}
                  placeholder="Colle un lien ou un numéro WhatsApp"
                  placeholderTextColor={Colors.muted}
                  value={newLinkUrl}
                  onChangeText={setNewLinkUrl}
                  autoCapitalize="none"
                  onSubmitEditing={addLink}
                />
                <TouchableOpacity style={styles.addBtn} onPress={addLink}>
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {newLinkUrl.trim().length > 3 && (
                <Text style={styles.detectedHint}>
                  Détecté : {PLATFORM_OPTIONS.find(p => p.key === detectPlatform(newLinkUrl))?.label}
                </Text>
              )}
            </View>
          </ScrollView>

          {/* Bouton submit */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Création...' : '🛒 Ajouter le mémo'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ------------------------------------------------
// STYLES
// ------------------------------------------------
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingTop: 8 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.muted },

  form: { paddingHorizontal: 20, paddingTop: 16 },
  formContent: { paddingBottom: 48 },
  field: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 70, textAlignVertical: 'top' },

  priceRow: { flexDirection: 'row', gap: 8 },
  priceInput: { flex: 2 },
  currencyInput: { flex: 1, textAlign: 'center' },

  // Liens
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  linkDot: { width: 8, height: 8, borderRadius: 4 },
  linkPlatformText: { fontSize: 11, fontWeight: '700', color: Colors.text, width: 65 },
  linkUrlText: { fontSize: 11, color: Colors.muted, flex: 1 },
  linkRemove: { fontSize: 13, color: Colors.urgent, paddingLeft: 6 },

  checklistAddRow: { flexDirection: 'row', gap: 8 },
  linkInput: { flex: 1 },
  addBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, color: '#fff', fontWeight: '300' },
  detectedHint: { fontSize: 10, color: Colors.cyan, marginTop: 6, fontStyle: 'italic' },

  footer: { paddingHorizontal: 20, paddingTop: 10, backgroundColor: Colors.bg },
  submitBtn: { backgroundColor: Colors.cyan, padding: 16, alignItems: 'center', borderRadius: 14, shadowColor: Colors.cyan, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: Colors.bg },
})
