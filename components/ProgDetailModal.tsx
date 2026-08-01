// ================================================
// MODAL DÉTAIL RYAN-PROG — RyanTask's
// Voir + modifier + gérer liens + supprimer
// ================================================

import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  Alert, Linking,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors } from '../constants/colors'
import { ProgItem, LinkPlatform, ProgLink, ProgImage } from '../types'
import { progService } from '../lib/supabase'
import ImageGallery from './ImageGallery'
import { buildWhatsAppUrl, detectPlatform, normalizeLinkUrl } from '../lib/linkDetector'

interface ProgDetailModalProps {
  visible: boolean
  item: ProgItem | null
  onClose: () => void
  onUpdate: (itemId: string, updates: Partial<ProgItem>) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  onRefresh: () => Promise<void>
}

const PLATFORM_OPTIONS: { key: LinkPlatform; label: string; color: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { key: 'instagram', label: 'Instagram', color: '#F472B6' },
  { key: 'facebook', label: 'Facebook', color: '#60A5FA' },
  { key: 'tiktok', label: 'TikTok', color: Colors.cyan },
  { key: 'web', label: 'Lien web', color: Colors.text2 },
]

export default function ProgDetailModal({
  visible, item, onClose, onUpdate, onDelete, onRefresh,
}: ProgDetailModalProps) {
  const insets = useSafeAreaInsets()
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('FCFA')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [links, setLinks] = useState<ProgLink[]>([])
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [images, setImages] = useState<ProgImage[]>([])

  // Synchronise le formulaire ET recharge les liens fraîchement depuis la BDD
  useEffect(() => {
    if (item) {
      setName(item.name)
      setPrice(item.price ? String(item.price) : '')
      setCurrency(item.currency)
      setPhone(item.phone || '')
      setAddress(item.address || '')
      setNote(item.note || '')
      setLinks(item.links || [])
      setImages(item.images || [])
      setEditMode(false)
      refreshLinksFromDb(item.id)
    }
  }, [item?.id, visible])

  const refreshLinksFromDb = async (itemId: string) => {
    setLoadingLinks(true)
    const freshItems = await progService.getProgItems(item!.user_id)
    const freshItem = freshItems.find(p => p.id === itemId)
    if (freshItem) {
      setLinks(freshItem.links || [])
    }
    setLoadingLinks(false)
  }

  if (!item) return null

  const isAchete = item.status === 'achete'

  // ----------------
  // Toggle statut
  // ----------------
  const handleToggleStatus = async () => {
    const newStatus = isAchete ? 'en_attente' : 'achete'
    await onUpdate(item.id, { status: newStatus })
    await onRefresh()
  }

  // ----------------
  // Ajouter un lien (détection auto plateforme)
  // ----------------
  const handleAddLink = async () => {
    if (!newLinkUrl.trim()) return
    const normalizedUrl = normalizeLinkUrl(newLinkUrl)
    const detectedPlatform = detectPlatform(normalizedUrl)
    const newLink = await progService.addLink(item.id, normalizedUrl, detectedPlatform, links.length)
    if (newLink) {
      setLinks([...links, newLink])
      setNewLinkUrl('')
    }
  }

  // ----------------
  // Supprimer un lien
  // ----------------
  const handleRemoveLink = async (linkId: string) => {
    await progService.deleteLink(linkId)
    setLinks(links.filter(l => l.id !== linkId))
  }

  // ----------------
  // Ouvrir un lien
  // ----------------
  const handleOpenLink = (link: ProgLink) => {
    Linking.openURL(normalizeLinkUrl(link.url)).catch(() => { })
  }

  // ----------------
  // Sauvegarder les modifications
  // ----------------
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire.')
      return
    }

    const parsedPrice = price.trim() ? parseFloat(price.replace(/[^\d.]/g, '')) : null
    if (price.trim() && (isNaN(parsedPrice!) || parsedPrice! < 0)) {
      Alert.alert('Erreur', 'Le prix doit être un nombre valide.')
      return
    }

    setSaving(true)
    await onUpdate(item.id, {
      name: name.trim(),
      price: parsedPrice,
      currency,
      phone: phone.trim() || null,
      address: address.trim() || null,
      note: note.trim() || null,
    })
    setSaving(false)
    setEditMode(false)
    await onRefresh()
  }

  // ----------------
  // Supprimer le mémo
  // ----------------
  const handleDelete = () => {
    Alert.alert(
      'Supprimer le mémo',
      'Cette action est irréversible. Confirmer la suppression ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await onDelete(item.id)
            onClose()
          },
        },
      ]
    )
  }

  // ----------------
  // Section liens réutilisable (lecture ET édition)
  // ----------------
  const renderLinksSection = () => (
    <View style={styles.linksSection}>
      <Text style={styles.label}>
        Liens {links.length > 0 ? `(${links.length})` : ''}
      </Text>

      {links.length === 0 && !loadingLinks && (
        <Text style={styles.noLinksText}>Aucun lien ajouté pour le moment.</Text>
      )}

      {links.map(link => {
        const cfg = PLATFORM_OPTIONS.find(p => p.key === link.platform) || PLATFORM_OPTIONS[4]
        return (
          <View key={link.id} style={styles.linkRow}>
            <TouchableOpacity
              style={styles.linkRowMain}
              onPress={() => handleOpenLink(link)}
            >
              <View style={[styles.linkDot, { backgroundColor: cfg.color }]} />
              <Text style={styles.linkPlatformText}>{cfg.label}</Text>
              <Text style={styles.linkUrlText} numberOfLines={1}>{link.url}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRemoveLink(link.id)}>
              <Text style={styles.linkRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        )
      })}

      <View style={styles.addLinkRow}>
        <TextInput
          style={[styles.input, styles.linkInput]}
          placeholder="Colle un lien ou un numéro WhatsApp"
          placeholderTextColor={Colors.muted}
          value={newLinkUrl}
          onChangeText={setNewLinkUrl}
          autoCapitalize="none"
          onSubmitEditing={handleAddLink}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddLink}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {newLinkUrl.trim().length > 3 && (
        <Text style={styles.detectedHint}>
          Détecté : {PLATFORM_OPTIONS.find(p => p.key === detectPlatform(newLinkUrl))?.label}
        </Text>
      )}
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editMode ? '✏️ Modifier le mémo' : 'Détail du mémo'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={[
              styles.bodyContent,
              { paddingBottom: Math.max(insets.bottom + 30, 52) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {!editMode ? (
              // ============ MODE LECTURE ============
              <>
                <View style={styles.titleRow}>
                  <Text style={styles.viewTitle}>{item.name}</Text>
                  <TouchableOpacity
                    style={[
                      styles.statusBadge,
                      isAchete ? styles.statusBadgeDone : styles.statusBadgeWait,
                    ]}
                    onPress={handleToggleStatus}
                  >
                    <Text style={[
                      styles.statusText,
                      isAchete ? styles.statusTextDone : styles.statusTextWait,
                    ]}>
                      {isAchete ? 'ACHETÉ ✅' : 'EN ATTENTE'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.viewPrice}>
                  {item.price ? `${item.price.toLocaleString('fr-FR')} ` : '— '}
                  <Text style={styles.viewCurrency}>{item.currency}</Text>
                </Text>

                {item.phone && (
                  <TouchableOpacity
                    style={styles.infoRow}
                    onPress={() => Linking.openURL(buildWhatsAppUrl(item.phone!))}
                  >
                    <Text style={styles.infoLabel}>📞 Téléphone</Text>
                    <Text style={[styles.infoValue, { color: Colors.cyan }]}>{item.phone}</Text>
                  </TouchableOpacity>
                )}

                {item.address && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>📍 Adresse</Text>
                    <Text style={styles.infoValue}>{item.address}</Text>
                  </View>
                )}

                {item.note && (
                  <View style={styles.noteBox}>
                    <Text style={styles.infoLabel}>📝 Note</Text>
                    <Text style={styles.noteText}>{item.note}</Text>
                  </View>
                )}

                <ImageGallery
                  progItemId={item.id}
                  images={images}
                  onImagesChange={setImages}
                />

                {renderLinksSection()}

                {/* Modifier / Supprimer */}
                <View style={styles.bottomActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
                    <Text style={styles.editBtnText}>✏️ Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                    <Text style={styles.deleteBtnText}>🗑️ Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              // ============ MODE ÉDITION ============
              <>
                <View style={styles.field}>
                  <Text style={styles.label}>Nom *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Prix</Text>
                  <View style={styles.priceRow}>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                      placeholderTextColor={Colors.muted}
                    />
                    <TextInput
                      style={[styles.input, styles.currencyInput]}
                      value={currency}
                      onChangeText={setCurrency}
                      placeholderTextColor={Colors.muted}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Adresse</Text>
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Note</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={note}
                    onChangeText={setNote}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={Colors.muted}
                  />
                </View>

                <ImageGallery
                  progItemId={item.id}
                  images={images}
                  onImagesChange={setImages}
                />

                {/* Gestion des liens, disponible aussi en édition */}
                {renderLinksSection()}

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditMode(false)}
                  >
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text style={styles.saveBtnText}>
                      {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
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
  sheet: { backgroundColor: Colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingTop: 8 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  closeBtn: { fontSize: 20, color: Colors.muted },

  body: { paddingHorizontal: 20, paddingTop: 16 },
  bodyContent: { paddingBottom: 52 },

  // Mode lecture
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  viewTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 10 },
  viewPrice: { fontSize: 22, fontWeight: '800', color: Colors.cyan, marginBottom: 16 },
  viewCurrency: { fontSize: 13, fontWeight: '500', color: Colors.muted },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusBadgeWait: { backgroundColor: 'rgba(250,204,21,0.15)', borderColor: 'rgba(250,204,21,0.25)' },
  statusBadgeDone: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.25)' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextWait: { color: '#FDE68A' },
  statusTextDone: { color: '#86EFAC' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 12, color: Colors.muted },
  infoValue: { fontSize: 13, color: Colors.text, fontWeight: '600' },

  noteBox: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  noteText: { fontSize: 13, color: Colors.text2, marginTop: 4, lineHeight: 19 },

  // Liens
  linksSection: { marginTop: 16 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.text2, marginBottom: 8 },
  noLinksText: { fontSize: 12, color: Colors.muted, fontStyle: 'italic', marginBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  linkRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkDot: { width: 8, height: 8, borderRadius: 4 },
  linkPlatformText: { fontSize: 11, fontWeight: '700', color: Colors.text, width: 65 },
  linkUrlText: { fontSize: 11, color: Colors.muted, flex: 1 },
  linkRemove: { fontSize: 13, color: Colors.urgent, paddingLeft: 8 },

  addLinkRow: { flexDirection: 'row', gap: 8 },
  linkInput: { flex: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.cyan, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 20, color: '#fff', fontWeight: '300' },
  detectedHint: { fontSize: 10, color: Colors.cyan, marginTop: 6, fontStyle: 'italic' },

  // Modifier/Supprimer
  bottomActions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  editBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  editBtnText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  deleteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: Colors.muted },

  // Mode édition
  field: { marginBottom: 16 },
  input: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceInput: { flex: 2 },
  currencyInput: { flex: 1, textAlign: 'center' },

  editActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text2 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.cyan, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: Colors.bg },
})
